---
title: Transaction và ACID
slug: transaction-va-acid
summary: Nhóm nhiều lệnh thành một đơn vị không thể chia cắt, và bốn mức cô lập với cái giá của từng mức.
level: trung-cap
tags: [sql, transaction, acid, isolation]
khung: v2
---

> **Sau bài này bạn sẽ:** biết transaction bảo vệ điều gì, chọn được mức cô lập, và nhận ra ba điều kiện đua kinh điển.

## Ý tưởng chính

Transaction gói nhiều lệnh thành **một đơn vị không thể chia cắt**: hoặc tất cả thành công, hoặc không gì xảy ra cả.

Không có nó, một lỗi giữa chừng để lại hệ thống ở trạng thái **nửa vời** — tiền đã trừ nhưng chưa cộng, đơn đã tạo nhưng chưa trừ kho.

## Mental model

Hãy nghĩ tới **chuyển tiền giữa hai tài khoản**.

```text
Bước 1: trừ 1 triệu ở tài khoản A
        ← server chết ở đây
Bước 2: cộng 1 triệu vào tài khoản B
```

> Một triệu đồng **bốc hơi**. Không ai có nó.
>
> Transaction là lời hứa: *"nếu bước 2 không xong, bước 1 coi như chưa từng xảy ra."*

Và điều quan trọng: lời hứa đó phải đúng **kể cả khi mất điện giữa chừng**. Đó là lý do cơ sở dữ liệu ghi nhật ký trước khi ghi dữ liệu thật.

## Ví dụ nhỏ

```sql
BEGIN;
  UPDATE tai_khoan SET so_du = so_du - 1000000 WHERE id = 'A';
  UPDATE tai_khoan SET so_du = so_du + 1000000 WHERE id = 'B';
COMMIT;      -- cả hai cùng có hiệu lực

-- Nếu có lỗi:
ROLLBACK;    -- cả hai cùng biến mất
```

## Code chạy thế nào

**ACID** — bốn lời hứa, mỗi cái bảo vệ một thứ:

```text
A  Atomicity   Nguyên tử    → tất cả hoặc không gì cả
C  Consistency Nhất quán    → ràng buộc (khoá ngoại, UNIQUE, CHECK) luôn được giữ
I  Isolation   Cô lập       → transaction chạy song song không giẫm chân nhau
D  Durability  Bền vững     → COMMIT xong thì mất điện cũng không mất dữ liệu
```

Ba chữ A, C, D gần như luôn được bảo đảm và bạn ít phải nghĩ tới. **Chữ I là chữ bạn phải chọn** — và mỗi mức cô lập là một đánh đổi giữa an toàn và tốc độ.

## Cú pháp

**Bốn mức cô lập**, và ba hiện tượng chúng ngăn:

```text
Dirty read       đọc dữ liệu của transaction CHƯA commit
Non-repeatable   đọc cùng một dòng hai lần, ra hai giá trị khác nhau
Phantom read     chạy cùng một truy vấn hai lần, lần sau có thêm dòng MỚI
```

| Mức | Dirty | Non-repeat | Phantom | Ghi chú |
|---|---|---|---|---|
| READ UNCOMMITTED | ❌ | ❌ | ❌ | Không nên dùng |
| READ COMMITTED | ✅ | ❌ | ❌ | **Mặc định Postgres** |
| REPEATABLE READ | ✅ | ✅ | ❌* | Mặc định MySQL |
| SERIALIZABLE | ✅ | ✅ | ✅ | An toàn nhất, chậm nhất |

\* Postgres ở mức REPEATABLE READ chặn được cả phantom nhờ MVCC.

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
  -- ...
COMMIT;
```

Mức càng cao càng nhiều khoá và càng nhiều khả năng transaction bị huỷ để tránh xung đột — nên **code phải sẵn sàng thử lại**.

## Tại sao cần nó

Vì mức mặc định `READ COMMITTED` **không** chặn được điều kiện đua kinh điển này:

```sql
-- ❌ Hai người cùng mua sản phẩm cuối cùng
BEGIN;
  SELECT ton_kho FROM san_pham WHERE id = 1;   -- cả hai đọc: 1
  -- (cả hai đều thấy còn hàng)
  UPDATE san_pham SET ton_kho = 0 WHERE id = 1;
COMMIT;
-- ⇒ bán được HAI đơn cho MỘT sản phẩm
```

Ba cách chữa, xếp theo thứ tự nên thử:

```sql
-- ① Đưa điều kiện vào chính lệnh UPDATE — không có khe hở nào giữa đọc và ghi
UPDATE san_pham SET ton_kho = ton_kho - 1
WHERE id = 1 AND ton_kho >= 1;
-- kiểm số dòng bị ảnh hưởng: 0 nghĩa là hết hàng

-- ② Khoá bi quan: giữ dòng lại, người khác phải chờ
SELECT ton_kho FROM san_pham WHERE id = 1 FOR UPDATE;

-- ③ Khoá lạc quan: dùng cột phiên bản
UPDATE san_pham SET ton_kho = 0, version = version + 1
WHERE id = 1 AND version = 5;
-- 0 dòng bị ảnh hưởng ⇒ ai đó đã sửa trước ⇒ đọc lại và thử lại
```

Cách ① là cách gọn nhất và nên thử đầu tiên: nó biến "đọc rồi ghi" thành **một thao tác nguyên tử**, không cần khoá cũng không cần thử lại.

**Deadlock** — hai transaction chờ nhau vòng tròn:

```text
T1: khoá dòng A ─────► chờ dòng B
T2: khoá dòng B ─────► chờ dòng A
⇒ cả hai chờ mãi; cơ sở dữ liệu phát hiện và HUỶ một cái
```

Cách phòng: **luôn khoá các dòng theo cùng một thứ tự** (ví dụ theo id tăng dần) ở mọi nơi trong code. Đơn giản, và nó loại bỏ hẳn khả năng vòng chờ.

## So sánh

| Cách xử lý tranh chấp | Khi nào |
|---|---|
| Điều kiện trong `UPDATE` | ✅ Mặc định — đơn giản nhất, không khoá |
| `FOR UPDATE` (bi quan) | Tranh chấp **cao**, thao tác ngắn |
| Cột `version` (lạc quan) | Tranh chấp **thấp**, chấp nhận thử lại |
| `SERIALIZABLE` | Logic phức tạp, nhiều bảng, khó tự bảo đảm |

Nguyên tắc thực dụng cho mọi transaction:

```text
· NGẮN — không gọi API bên ngoài, không chờ I/O bên trong transaction
· Khoá theo THỨ TỰ CỐ ĐỊNH — chống deadlock
· Sẵn sàng THỬ LẠI — mức cô lập cao có thể huỷ transaction của bạn
· Đọc thuần thì KHÔNG cần transaction
```

Dòng đầu quan trọng nhất: transaction giữ khoá suốt thời gian nó sống. Gọi một API mất 3 giây bên trong transaction nghĩa là **khoá dòng đó 3 giây** — và mọi người khác xếp hàng.

## Dễ nhầm

**1. Transaction quá dài.** Gọi API, gửi mail, xử lý ảnh bên trong `BEGIN...COMMIT`. Khoá bị giữ lâu, hệ thống nghẽn.

**2. Tưởng `READ COMMITTED` chặn mọi điều kiện đua.** Nó chỉ chặn dirty read.

**3. Đọc rồi ghi thành hai lệnh.** Luôn có khe hở giữa chúng — đưa điều kiện vào `UPDATE`.

**4. Không kiểm số dòng bị ảnh hưởng.** `UPDATE ... WHERE ton_kho >= 1` chạy "thành công" với 0 dòng, và bạn tưởng đã bán được.

**5. Khoá theo thứ tự khác nhau ở các chỗ khác nhau.** Sinh deadlock ngẫu nhiên, rất khó tái hiện.

**6. Không xử lý transaction bị huỷ.** Ở mức `SERIALIZABLE`, cơ sở dữ liệu **sẽ** huỷ transaction của bạn khi phát hiện xung đột — code phải bắt lỗi đó và thử lại.

**7. Dùng transaction cho truy vấn chỉ đọc.** Không sai nhưng thừa, và nếu để mở lâu thì nó cản việc dọn dẹp của cơ sở dữ liệu.

## Mẹo nhớ

> **Chuyển tiền: hoặc cả hai bước, hoặc không bước nào.**
>
> **A, C, D thường tự có — chữ I là chữ bạn phải CHỌN.**
>
> **Đọc-rồi-ghi có khe hở ⇒ đưa điều kiện vào chính `UPDATE`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn chữ ACID, và chữ nào bạn phải chủ động chọn?
2. Ba hiện tượng mà mức cô lập ngăn chặn?
3. Vì sao `SELECT` rồi `UPDATE` vẫn bán quá tồn kho ở mức mặc định?
4. Ba cách chữa điều kiện đua, và cách nào nên thử trước?
5. Cách đơn giản nhất để phòng deadlock?

## Tự viết lại

Không nhìn lại phần trên, viết SQL cho tình huống:

```text
Đặt vé xem phim: kiểm ghế A5 còn trống, nếu còn thì đặt cho người dùng này.
Hai người bấm đặt cùng lúc — chỉ MỘT người được ghế.
```

Tự kiểm: bạn dùng cách nào trong ba cách, và bạn biết mình **thắng hay thua** bằng cách kiểm cái gì?

## Thử sức

Hệ thống của bạn thỉnh thoảng báo lỗi *"deadlock detected"* vào giờ cao điểm, khoảng 5 lần mỗi ngày.

Nêu cách **tìm ra** hai transaction đang xung đột (gợi ý: log của cơ sở dữ liệu ghi lại chúng), rồi nêu hai cách sửa: một sửa nhanh và một sửa gốc rễ. Câu khó: cách sửa nhanh có rủi ro gì?
