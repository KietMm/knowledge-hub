---
title: Truy cập đồng thời và khoá
slug: truy-cap-dong-thoi-va-khoa
summary: Lost update, khoá lạc quan và bi quan, và vì sao đọc-rồi-ghi luôn là một cuộc đua.
level: nang-cao
tags: [database, dong-thoi, khoa, transaction]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra mẫu "đọc rồi ghi" là một cuộc đua, và chọn được một trong bốn cách chặn nó.

## Ý tưởng chính

Mọi bug về truy cập đồng thời đều có **cùng một hình dạng**:

```text
① Đọc giá trị
② Tính toán dựa trên giá trị đó
③ Ghi kết quả
```

Giữa ① và ③ có một **khe hở**, và trong khe hở đó người khác có thể đã ghi. Kết quả của họ bị bạn ghi đè — gọi là **lost update**, và nó không bao giờ báo lỗi.

## Mental model

Hãy nghĩ tới **hai người cùng sửa một tấm bảng số dư**.

```text
Bảng ghi: 100

An   đọc "100"  ─────────────────────────► ghi "100 - 30 = 70"
Bình     đọc "100" ────► ghi "100 - 50 = 50"

Kết quả trên bảng: 70
Thực tế đã rút:    80
⇒ 50 nghìn biến mất, và không ai biết
```

> Vấn đề không phải ai đó làm sai. Cả hai đều làm đúng — dựa trên **thông tin đã cũ**.

Bốn cách chữa dưới đây đều chỉ làm một việc: **loại bỏ khe hở**, hoặc **phát hiện ra rằng thông tin đã cũ**.

## Ví dụ nhỏ

```ts
// ❌ Có khe hở giữa đọc và ghi
const tk = await db.query('SELECT so_du FROM tai_khoan WHERE id = $1', [id])
const moi = tk.so_du - 30
await db.query('UPDATE tai_khoan SET so_du = $1 WHERE id = $2', [moi, id])
```

```sql
-- ✅ Không còn khe hở: một lệnh duy nhất
UPDATE tai_khoan SET so_du = so_du - 30 WHERE id = $1 AND so_du >= 30;
```

## Code chạy thế nào

Vì sao cách thứ hai an toàn:

```text
UPDATE ... SET so_du = so_du - 30 WHERE so_du >= 30

Cơ sở dữ liệu tự KHOÁ dòng trong lúc thực hiện lệnh này.
An và Bình không thể cùng chạy nó trên cùng một dòng — một người phải chờ.

An chạy trước:   100 → 70
Bình chạy sau:   đọc lại giá trị MỚI NHẤT (70) → 70 - 50 = 20  ✅

Và nếu số dư không đủ:
Bình:  WHERE so_du >= 50  không khớp  →  0 DÒNG bị ảnh hưởng
```

Điểm mấu chốt: **phải kiểm số dòng bị ảnh hưởng**.

```ts
const kq = await db.query('UPDATE ... WHERE id = $1 AND so_du >= $2', [id, 30])
if (kq.rowCount === 0) throw new Error('Không đủ số dư')
```

`UPDATE` với 0 dòng bị ảnh hưởng **không phải lỗi** — nó chạy thành công. Không kiểm thì bạn tưởng đã trừ tiền.

## Cú pháp

**Khoá lạc quan** — dùng khi tranh chấp hiếm:

```sql
-- Thêm cột version
ALTER TABLE tai_lieu ADD COLUMN version INT NOT NULL DEFAULT 1;

-- Đọc kèm version
SELECT noi_dung, version FROM tai_lieu WHERE id = 1;   -- version = 5

-- Ghi: chỉ thành công nếu KHÔNG AI sửa từ lúc bạn đọc
UPDATE tai_lieu SET noi_dung = $1, version = version + 1
WHERE id = 1 AND version = 5;
-- 0 dòng ⇒ ai đó đã sửa ⇒ báo người dùng, hoặc đọc lại và thử lại
```

Gọi là "lạc quan" vì nó **giả định sẽ không có xung đột** và chỉ kiểm tra lúc ghi. Với tài liệu, form nhiều bước, hồ sơ cá nhân — nơi hai người hiếm khi sửa cùng lúc — đây là lựa chọn tốt: không khoá gì cả, không ai phải chờ.

Ưu điểm quan trọng: khi phát hiện xung đột, bạn **báo cho người dùng** *"tài liệu đã bị người khác sửa"* thay vì âm thầm ghi đè.

**Khoá bi quan** — dùng khi tranh chấp cao:

```sql
BEGIN;
  SELECT * FROM ghe WHERE id = 'A5' FOR UPDATE;   -- ← khoá dòng, người khác PHẢI CHỜ
  -- kiểm tra, xử lý
  UPDATE ghe SET da_dat = true WHERE id = 'A5';
COMMIT;                                            -- ← nhả khoá
```

```sql
SELECT ... FOR UPDATE NOWAIT;         -- lỗi ngay nếu đang bị khoá
SELECT ... FOR UPDATE SKIP LOCKED;    -- BỎ QUA dòng đang bị khoá
```

`SKIP LOCKED` là công cụ tuyệt vời cho **hàng đợi công việc**: nhiều worker cùng lấy việc, mỗi worker nhận việc khác nhau, không ai chờ ai.

```sql
-- Mỗi worker lấy 10 việc chưa ai xử lý
SELECT * FROM cong_viec WHERE trang_thai = 'cho'
ORDER BY tao_luc LIMIT 10 FOR UPDATE SKIP LOCKED;
```

## Tại sao cần nó

Vì **ràng buộc `UNIQUE` cũng là công cụ chống đua**, và đây là cách gọn nhất cho một lớp bài toán:

```ts
// ❌ Kiểm rồi tạo — có khe hở, hai request cùng lọt
if (await db.nguoiDung.findByEmail(email)) throw new Error('Đã tồn tại')
await db.nguoiDung.create({ email })
```

```ts
// ✅ Cứ tạo, để CSDL từ chối
try {
  await db.nguoiDung.create({ email })
} catch (e) {
  if (laLoiTrungKhoa(e)) throw new LoiNghiepVu('Email đã tồn tại')
  throw e
}
```

Mẫu này gọi là *"xin lỗi dễ hơn xin phép"*, và nó đúng vì `UNIQUE` là kiểm tra **nguyên tử** ở tầng thấp nhất — không có khe hở nào.

Cùng cách với idempotency key ([[idempotency-va-thu-lai]]): thay vì kiểm "đã xử lý chưa" rồi mới xử lý, bạn `INSERT ... ON CONFLICT DO NOTHING` và xem có dòng nào được tạo không.

## So sánh

| Cách | Chi phí | Dùng khi |
|---|---|---|
| Ghi bằng biểu thức (`so_du - 30`) | Rẻ nhất | ✅ Mặc định — luôn thử trước |
| Ràng buộc `UNIQUE` | Rẻ | Chống tạo trùng |
| Khoá lạc quan (`version`) | Rẻ, có thể phải thử lại | Tranh chấp **hiếm**, cần báo người dùng |
| Khoá bi quan (`FOR UPDATE`) | Đắt — người khác chờ | Tranh chấp **cao**, thao tác ngắn |
| `SERIALIZABLE` | Đắt nhất | Logic nhiều bảng, khó tự bảo đảm |

Thứ tự nên thử: **từ trên xuống**. Rất nhiều trường hợp dừng ở dòng đầu.

**Deadlock** — hai transaction chờ nhau vòng tròn:

```text
T1: khoá A ──► chờ B
T2: khoá B ──► chờ A
⇒ CSDL phát hiện và HUỶ một cái
```

Cách phòng đơn giản và hiệu quả: **luôn khoá theo cùng một thứ tự** (ví dụ id tăng dần) ở mọi nơi trong code. Nó loại bỏ hẳn khả năng vòng chờ.

```ts
const ids = [idA, idB].sort()      // luôn khoá theo thứ tự này
```

## Dễ nhầm

**1. Đọc rồi ghi thành hai lệnh.** Mẫu gây lost update — luôn có khe hở.

**2. Không kiểm số dòng bị ảnh hưởng.** `UPDATE` 0 dòng vẫn là "thành công".

**3. Giữ khoá quá lâu.** Gọi API, gửi mail bên trong transaction ⇒ khoá dòng suốt thời gian đó, và mọi người xếp hàng.

**4. Khoá theo thứ tự khác nhau ở các chỗ khác nhau.** Deadlock ngẫu nhiên, rất khó tái hiện.

**5. Dùng khoá bi quan khi tranh chấp hiếm.** Bạn trả giá bằng việc mọi người phải chờ, để phòng một chuyện gần như không xảy ra.

**6. Không xử lý xung đột lạc quan.** `version` không khớp thì phải **báo cho người dùng** hoặc thử lại — không được im lặng bỏ qua.

**7. Tin rằng transaction tự chống được lost update.** Ở mức `READ COMMITTED` (mặc định Postgres), **không** — xem [[transaction-va-acid]].

## Mẹo nhớ

> **Đọc rồi ghi = một cuộc đua. Khe hở giữa đọc và ghi là chỗ dữ liệu biến mất.**
>
> **Thử theo thứ tự: biểu thức → UNIQUE → lạc quan → bi quan.**
>
> **`UPDATE` 0 dòng không phải lỗi — bạn PHẢI kiểm.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Hình dạng chung của mọi bug đồng thời?
2. Vì sao `UPDATE ... SET so_du = so_du - 30` an toàn còn đọc-rồi-ghi thì không?
3. Khoá lạc quan và bi quan khác nhau ở **thời điểm** kiểm tra xung đột?
4. `SKIP LOCKED` giải quyết bài toán nào?
5. Cách đơn giản nhất để phòng deadlock?

## Tự viết lại

Không nhìn lại phần trên, viết SQL/mã giả cho từng tình huống, **nêu cách bạn chọn**:

```text
a) Trừ tồn kho khi đặt hàng
b) Hai biên tập viên cùng sửa một bài viết
c) 5 worker cùng lấy việc từ hàng đợi
d) Đăng ký tài khoản, chống trùng email
```

Tự kiểm: câu (b) — khi phát hiện xung đột, bạn **hiện gì** cho người dùng thứ hai?

## Thử sức

Hệ thống bán vé của bạn thỉnh thoảng bán **quá số ghế**. Log cho thấy hai request cách nhau 8 mili giây, cả hai đều "thành công".

Truy nguyên nhân, rồi đưa ra **hai** cách sửa với đánh đổi khác nhau. Câu khó nhất: cách nào giữ được trải nghiệm tốt khi 5000 người cùng bấm mua vé concert trong một giây — và cách kia hỏng thế nào ở quy mô đó?
