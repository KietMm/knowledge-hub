---
title: Truy cập đồng thời và khoá
slug: truy-cap-dong-thoi-va-khoa
summary: Lost update, khoá lạc quan và bi quan, và vì sao đọc-rồi-ghi luôn là một cuộc đua.
level: nang-cao
tags: [database, dong-thoi, khoa, transaction]
---

> **Sau bài này bạn sẽ:** nhận ra mẫu code tạo ra race condition ở tầng dữ liệu, và chọn được cơ chế khoá phù hợp.

## Lost update: bug kinh điển

Hai người mua cùng lúc, kho còn 1 sản phẩm:

```
Thời điểm  Giao dịch A                  Giao dịch B
   t1      SELECT so_luong → 1
   t2                                   SELECT so_luong → 1
   t3      còn hàng ✅                   còn hàng ✅
   t4      UPDATE ... SET so_luong = 0
   t5                                   UPDATE ... SET so_luong = 0
```

Bán hai lần một sản phẩm. Kho về 0 chứ không phải -1, nên **không có lỗi nào được ghi lại** — bạn chỉ phát hiện khi khách phàn nàn.

Nguồn của bug: mẫu **đọc → quyết định → ghi** trong khi giá trị có thể đổi giữa bước đọc và bước ghi.

Quan trọng: bọc trong `BEGIN`/`COMMIT` **không cứu được**. Ở mức cô lập mặc định của PostgreSQL (`READ COMMITTED`), cả hai giao dịch đọc đều hợp lệ và cả hai ghi đều thành công.

## Cách 1 — ghi bằng biểu thức, đừng đọc rồi ghi

Cách rẻ nhất và tốt nhất: để database tự tính, và đặt điều kiện ngay trong `WHERE`.

```sql
-- ❌ Đọc rồi ghi: có khoảng trống cho cuộc đua
SELECT so_luong FROM kho WHERE id = 'p-1';       -- 1
UPDATE kho SET so_luong = 0 WHERE id = 'p-1';

-- ✅ Một câu duy nhất, nguyên tử
UPDATE kho
SET so_luong = so_luong - 1
WHERE id = 'p-1' AND so_luong >= 1;
```

Điểm mấu chốt là kiểm tra `số dòng bị ảnh hưởng`:

```ts
const { rowCount } = await db.query(
  'UPDATE kho SET so_luong = so_luong - 1 WHERE id = $1 AND so_luong >= 1',
  [productId],
)
// 0 dòng = hết hàng HOẶC có người vừa lấy trước. Cả hai đều là "không bán được".
if (rowCount === 0) throw new HetHang()
```

Database đảm bảo `UPDATE` này nguyên tử: dòng bị khoá trong lúc ghi, giao dịch thứ hai chờ rồi đọc lại giá trị mới và điều kiện `>= 1` thất bại. Không mất update nào.

Áp dụng được cho hầu hết bộ đếm: số lượng kho, số ghế còn, hạn mức, số lần thử.

## Cách 2 — khoá lạc quan (optimistic)

Khi thao tác không gói được vào một câu — ví dụ người dùng mở form, sửa 10 phút, rồi lưu:

```sql
ALTER TABLE bai_viet ADD COLUMN version INT NOT NULL DEFAULT 1;
```

```sql
UPDATE bai_viet
SET tieu_de = $1, noi_dung = $2, version = version + 1
WHERE id = $3 AND version = $4;      -- $4 = version lúc người dùng MỞ form
```

`rowCount = 0` nghĩa là có người đã lưu trước bạn. Lúc này báo cho người dùng — **đừng âm thầm ghi đè**:

```ts
if (rowCount === 0) {
  throw new XungDot('Người khác đã sửa bài này. Tải lại để xem thay đổi mới nhất.')
}
```

Gọi là "lạc quan" vì nó cho rằng xung đột **hiếm**: không khoá gì, chỉ phát hiện lúc ghi. Đúng cho hầu hết ứng dụng web. Đây cũng là hình dạng của `409 Conflict` ở [[loi-versioning-va-tai-lieu]].

## Cách 3 — khoá bi quan (pessimistic)

Khi xung đột thường xuyên và việc làm lại thì đắt:

```sql
BEGIN;
SELECT so_du FROM tai_khoan WHERE id = 'a-1' FOR UPDATE;   -- khoá dòng này
-- Mọi giao dịch khác chạm 'a-1' phải CHỜ tới khi COMMIT
UPDATE tai_khoan SET so_du = so_du - 100 WHERE id = 'a-1';
COMMIT;
```

`FOR UPDATE` khoá dòng cho tới hết giao dịch. Chắc chắn nhưng đắt: các giao dịch khác **xếp hàng**, và đây là chỗ sinh ra deadlock.

Không muốn chờ:

```sql
SELECT ... FOR UPDATE NOWAIT;         -- lỗi ngay nếu đang bị khoá
SELECT ... FOR UPDATE SKIP LOCKED;    -- bỏ qua dòng đang bị khoá
```

`SKIP LOCKED` là cách chuẩn để làm hàng đợi công việc trong database: nhiều worker cùng `SELECT ... LIMIT 1 FOR UPDATE SKIP LOCKED`, mỗi worker lấy được một việc khác nhau mà không cái nào phải chờ.

## Deadlock và cách tránh

```
Giao dịch A: khoá dòng 1 → xin khoá dòng 2
Giao dịch B: khoá dòng 2 → xin khoá dòng 1
                → cả hai chờ nhau vĩnh viễn
```

PostgreSQL tự phát hiện và **giết một trong hai** với `deadlock detected`.

Cách tránh hiệu quả nhất là **luôn khoá theo cùng một thứ tự**:

```ts
// Chuyển tiền giữa hai tài khoản: sắp id trước khi khoá.
// Không sắp thì A→B và B→A chạy đồng thời là deadlock chắc chắn.
const [dau, sau] = [tuId, denId].sort()
await tx.query('SELECT 1 FROM tai_khoan WHERE id IN ($1,$2) ORDER BY id FOR UPDATE', [dau, sau])
```

Và giữ giao dịch **ngắn**: không gọi API bên ngoài, không gửi email, không chờ người dùng bên trong một transaction đang giữ khoá.

## Ràng buộc UNIQUE là công cụ chống đua

Đừng kiểm tra tồn tại bằng `SELECT` rồi `INSERT`:

```ts
// ❌ Hai request đồng thời đều thấy "chưa có" và đều insert
const co = await db.users.findUnique({ where: { email } })
if (co !== null) throw new TrungEmail()
await db.users.create({ data: { email } })

// ✅ Để database phán quyết
try {
  await db.users.create({ data: { email } })
} catch (loi) {
  if (laLoiUnique(loi)) throw new TrungEmail()
  throw loi
}
```

Chỉ ràng buộc `UNIQUE` mới đảm bảo được điều này — xem [[rang-buoc-va-toan-ven-du-lieu]]. Kiểm tra ở tầng ứng dụng luôn có khoảng trống giữa lúc đọc và lúc ghi.

## Chọn cái nào

| Tình huống | Dùng |
|---|---|
| Bộ đếm, kho, hạn mức | `UPDATE` có biểu thức + `WHERE` điều kiện |
| Người dùng sửa form rồi lưu | Khoá lạc quan (cột `version`) |
| Chuyển tiền, đặt ghế | `FOR UPDATE` |
| Hàng đợi công việc nhiều worker | `FOR UPDATE SKIP LOCKED` |
| Chống trùng khi tạo mới | Ràng buộc `UNIQUE` + bắt lỗi |

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đọc rồi ghi ngoài khoá | Lost update, không có lỗi nào báo | `UPDATE` có biểu thức |
| Tin rằng `BEGIN/COMMIT` là đủ | `READ COMMITTED` vẫn cho cả hai ghi | Cần khoá hoặc điều kiện |
| Không kiểm tra `rowCount` | Không biết update đã trượt | Luôn kiểm tra |
| `SELECT` kiểm tra tồn tại rồi `INSERT` | Trùng khi có hai request đồng thời | `UNIQUE` + bắt lỗi |
| Khoá theo thứ tự khác nhau | Deadlock | Sắp id trước khi khoá |
| Gọi API bên ngoài trong transaction | Giữ khoá hàng giây, mọi thứ xếp hàng | Ra ngoài transaction |
| Khoá lạc quan mà âm thầm ghi đè khi trượt | Mất công sức của người kia | Báo xung đột cho người dùng |

## Ghi nhớ

- Đọc → quyết định → ghi luôn là một cuộc đua nếu không có khoá.
- Rẻ nhất và tốt nhất: `UPDATE ... SET x = x - 1 WHERE ... AND x >= 1`, rồi kiểm tra `rowCount`.
- Lạc quan cho xung đột hiếm, `FOR UPDATE` cho xung đột thường.
- Deadlock tránh được bằng cách luôn khoá theo cùng thứ tự.

## Tự kiểm tra

1. Vì sao bọc `BEGIN/COMMIT` quanh `SELECT` rồi `UPDATE` không chặn được lost update?
2. `rowCount = 0` với khoá lạc quan nghĩa là gì, và nên phản hồi người dùng thế nào?
3. Hai luồng chuyển tiền A→B và B→A cùng lúc. Vì sao deadlock, và sửa ra sao?
