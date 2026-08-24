---
title: Transaction và ACID
slug: transaction-va-acid
summary: Nhóm nhiều lệnh thành một đơn vị không thể chia cắt, và bốn mức cô lập với cái giá của từng mức.
level: trung-cap
tags: [sql, transaction, acid, isolation]
---

> **Sau bài này bạn sẽ:** viết được luồng chuyển tiền không bao giờ mất tiền giữa chừng, và chọn đúng mức cô lập cho từng nghiệp vụ.

## Vấn đề

```sql
UPDATE tai_khoan SET so_du = so_du - 100 WHERE id = 1;
-- máy chủ mất điện ở đúng đây
UPDATE tai_khoan SET so_du = so_du + 100 WHERE id = 2;
```

100 đơn vị tiền biến mất. Transaction đảm bảo: hoặc cả hai lệnh cùng có hiệu lực, hoặc không lệnh nào.

```sql
BEGIN;
  UPDATE tai_khoan SET so_du = so_du - 100 WHERE id = 1;
  UPDATE tai_khoan SET so_du = so_du + 100 WHERE id = 2;
COMMIT;      -- hoặc ROLLBACK để huỷ toàn bộ
```

## ACID

| Chữ | Nghĩa | Bảo đảm gì |
|---|---|---|
| **A**tomicity | Nguyên tử | Tất cả hoặc không gì cả |
| **C**onsistency | Nhất quán | Ràng buộc (khoá ngoại, CHECK) luôn đúng trước và sau |
| **I**solation | Cô lập | Transaction song song không thấy trạng thái dở dang của nhau |
| **D**urability | Bền vững | Đã COMMIT là còn, kể cả mất điện |

## Bốn mức cô lập

Cô lập càng cao càng an toàn, càng dễ xung đột và chậm:

| Mức | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| READ UNCOMMITTED | Có | Có | Có |
| READ COMMITTED | Không | Có | Có |
| REPEATABLE READ | Không | Không | Có¹ |
| SERIALIZABLE | Không | Không | Không |

¹ Postgres chặn luôn phantom read ở mức REPEATABLE READ.

Ba hiện tượng, giải thích ngắn:

- **Dirty read** — đọc được dữ liệu mà transaction khác chưa commit (rồi nó rollback).
- **Non-repeatable read** — đọc cùng một dòng hai lần trong một transaction, giá trị khác nhau.
- **Phantom read** — chạy cùng một truy vấn hai lần, lần sau có thêm dòng mới.

Mặc định: PostgreSQL và Oracle dùng `READ COMMITTED`; MySQL InnoDB dùng `REPEATABLE READ`.

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
  ...
COMMIT;
```

## Điều kiện đua kinh điển

```sql
-- Hai người cùng đặt vé cuối cùng
SELECT ton_kho FROM ve WHERE id = 1;          -- cả hai đọc: 1
-- cả hai đều thấy còn vé
UPDATE ve SET ton_kho = ton_kho - 1 WHERE id = 1;   -- ton_kho = -1
```

Ba cách xử lý:

**1. Khoá bi quan** — khoá dòng, người sau phải chờ:
```sql
BEGIN;
  SELECT ton_kho FROM ve WHERE id = 1 FOR UPDATE;   -- khoá dòng này
  UPDATE ve SET ton_kho = ton_kho - 1 WHERE id = 1;
COMMIT;
```

**2. Khoá lạc quan** — không khoá, kiểm tra lúc ghi:
```sql
UPDATE ve SET ton_kho = ton_kho - 1, phien_ban = phien_ban + 1
WHERE id = 1 AND phien_ban = 5;
-- 0 dòng bị ảnh hưởng nghĩa là có người khác đã sửa -> báo lỗi hoặc thử lại
```

**3. Để cơ sở dữ liệu tự đảm bảo** — cách đơn giản nhất và thường là tốt nhất:
```sql
UPDATE ve SET ton_kho = ton_kho - 1 WHERE id = 1 AND ton_kho > 0;
-- Cộng trừ ngay trong SQL là nguyên tử; ràng buộc CHECK (ton_kho >= 0) chốt lại
```

## Deadlock

Hai transaction chờ khoá của nhau:

```
T1: khoá dòng A, xin dòng B
T2: khoá dòng B, xin dòng A
```

Cơ sở dữ liệu phát hiện và huỷ một transaction. Cách phòng: **luôn khoá các dòng theo cùng một thứ tự** (ví dụ theo id tăng dần) trong mọi đoạn code.

```sql
-- Chuyển tiền: khoá theo id nhỏ trước, bất kể chiều chuyển
SELECT * FROM tai_khoan WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
```

## Nguyên tắc thực dụng

- Transaction **ngắn**: mở muộn, đóng sớm. Mọi khoá đều tồn tại tới lúc COMMIT.
- **Không** gọi API bên ngoài bên trong transaction. Một request 30 giây giữ khoá 30 giây.
- Đọc thuần tuý thì không cần transaction.
- Ở tầng ứng dụng, dùng cơ chế transaction của thư viện để `ROLLBACK` tự động khi có exception.

```ts
await db.transaction(async (tx) => {
  await tx.taiKhoan.update({ where: { id: 1 }, data: { soDu: { decrement: 100 } } })
  await tx.taiKhoan.update({ where: { id: 2 }, data: { soDu: { increment: 100 } } })
})   // ném lỗi ở bất kỳ đâu -> tự rollback
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đọc-rồi-ghi không khoá | Mất cập nhật khi có đồng thời | `FOR UPDATE` hoặc cộng trừ trong SQL |
| Transaction dài, gọi API bên trong | Giữ khoá lâu, nghẽn hệ thống | Gọi API ngoài transaction |
| Khoá dòng theo thứ tự khác nhau | Deadlock | Luôn khoá theo id tăng dần |
| Quên COMMIT/ROLLBACK | Kết nối treo, khoá không nhả | Dùng API transaction của thư viện |
| Mặc định SERIALIZABLE cho mọi thứ | Nhiều lỗi xung đột, chậm | Chọn theo nghiệp vụ |

## Ghi nhớ

- Transaction là "tất cả hoặc không gì cả".
- Mức cô lập càng cao càng an toàn và càng dễ xung đột.
- Cộng trừ ngay trong SQL loại bỏ phần lớn điều kiện đua.
- Deadlock phòng bằng thứ tự khoá nhất quán.

## Tự kiểm tra

1. Giải thích dirty read, non-repeatable read, phantom read bằng ví dụ thật.
2. Viết ba cách xử lý "hai người cùng đặt vé cuối cùng", nêu ưu nhược từng cách.
3. Vì sao không nên gọi API thanh toán bên trong một transaction database?
