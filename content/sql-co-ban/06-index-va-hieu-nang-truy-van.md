---
title: Index và hiệu năng truy vấn
slug: index-va-hieu-nang-truy-van
summary: Index là gì, khi nào nên đánh, và những cách vô tình làm CSDL bỏ qua index bạn vừa tạo.
level: trung-cap
tags: [sql, index, hieu-nang]
---

> **Sau bài này bạn sẽ:** biết chọn cột nào để đánh index, và nhận ra các câu WHERE tự vô hiệu hoá index.

## Index là gì

Index là một cấu trúc dữ liệu (thường là B-tree) sắp xếp sẵn giá trị của một hoặc vài cột, kèm con trỏ tới dòng thật. Giống mục lục cuối sách: thay vì đọc cả 500 trang, bạn tra chữ cái rồi nhảy tới đúng trang.

```sql
CREATE INDEX idx_don_hang_khach ON don_hang (khach_hang_id);
CREATE UNIQUE INDEX idx_nguoi_dung_email ON nguoi_dung (email);
CREATE INDEX idx_don_hang_kh_ngay ON don_hang (khach_hang_id, ngay_dat DESC);
```

Không miễn phí: mỗi index làm `INSERT`/`UPDATE`/`DELETE` chậm hơn (phải cập nhật cả index) và chiếm thêm dung lượng.

## Khi nào nên đánh index

**Nên:**
- Cột trong `WHERE` chạy thường xuyên.
- Khoá ngoại (nhiều CSDL **không** tự tạo index cho khoá ngoại — Postgres là một trong số đó).
- Cột trong `ORDER BY` của truy vấn có `LIMIT`.
- Cột trong điều kiện `JOIN`.

**Không nên:**
- Bảng nhỏ (dưới vài nghìn dòng) — quét toàn bảng còn nhanh hơn.
- Cột có ít giá trị khác nhau (ví dụ `gioi_tinh`) — index không lọc bớt được bao nhiêu.
- Bảng ghi nhiều đọc ít (bảng log).
- Cột gần như không bao giờ xuất hiện trong `WHERE`.

## Index tổ hợp và quy tắc tiền tố trái

```sql
CREATE INDEX idx ON don_hang (khach_hang_id, trang_thai, ngay_dat);
```

Index này dùng được cho:

```sql
WHERE khach_hang_id = 1                                    -- ✓
WHERE khach_hang_id = 1 AND trang_thai = 'xong'            -- ✓
WHERE khach_hang_id = 1 AND trang_thai = 'xong' AND ngay_dat > '2026-01-01'  -- ✓
```

Nhưng **không** dùng được cho:

```sql
WHERE trang_thai = 'xong'                                  -- ✗ bỏ qua cột đầu
WHERE ngay_dat > '2026-01-01'                              -- ✗
```

Thứ tự cột trong index quan trọng như thứ tự chữ trong từ điển: tra được "abc" nhưng không tra được mọi từ có chữ "b" ở giữa.

Quy tắc đặt thứ tự: cột dùng phép so sánh **bằng** đứng trước, cột dùng **khoảng** (`>`, `<`, `BETWEEN`) đứng sau.

## Những cách vô hiệu hoá index

```sql
-- ✗ Hàm bọc quanh cột
WHERE LOWER(email) = 'a@b.com'
-- ✓ Đánh index trên chính biểu thức đó
CREATE INDEX idx ON nguoi_dung (LOWER(email));

-- ✗ Tính toán trên cột
WHERE gia * 1.1 > 100000
-- ✓ Chuyển vế
WHERE gia > 100000 / 1.1

-- ✗ LIKE có % ở đầu
WHERE ten LIKE '%an'
-- ✓ Chỉ % ở cuối thì index dùng được
WHERE ten LIKE 'an%'

-- ✗ Khác kiểu dữ liệu (cột là int, so với chuỗi)
WHERE id = '123'

-- ✗ OR trên các cột khác nhau thường làm index vô dụng
WHERE email = 'a@b.com' OR dien_thoai = '090...'
-- ✓ Tách thành UNION của hai truy vấn, mỗi cái dùng index riêng
```

Nguyên tắc chung: **để cột đứng một mình ở vế trái**.

## Index bao phủ (covering index)

Nếu index chứa **tất cả** cột truy vấn cần, CSDL không phải đọc bảng gốc nữa:

```sql
CREATE INDEX idx ON don_hang (khach_hang_id) INCLUDE (tong_tien, ngay_dat);

SELECT tong_tien, ngay_dat FROM don_hang WHERE khach_hang_id = 1;
-- EXPLAIN hiện "Index Only Scan" — nhanh hơn nhiều
```

## Đo, đừng đoán

```sql
EXPLAIN ANALYZE
SELECT * FROM don_hang WHERE khach_hang_id = 1;
```

Nhìn hai thứ:
- `Seq Scan` trên bảng lớn ⇒ thiếu index (hoặc index bị vô hiệu hoá).
- `rows` ước tính lệch xa `actual rows` ⇒ thống kê cũ, chạy `ANALYZE ten_bang`.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đánh index mọi cột | Ghi chậm, tốn dung lượng | Chỉ đánh theo truy vấn thật |
| Quên index cho khoá ngoại | JOIN quét toàn bảng | Đánh thủ công |
| `LOWER(cot) = ...` | Bỏ qua index | Index trên biểu thức |
| Sai thứ tự cột index tổ hợp | Index không được dùng | Cột `=` trước, khoảng sau |
| Không chạy `EXPLAIN` | Tối ưu mò mẫm | Luôn đo trước và sau |

## Ghi nhớ

- Index tăng tốc đọc, làm chậm ghi — luôn là đánh đổi.
- Quy tắc tiền tố trái quyết định index tổ hợp có dùng được không.
- Hàm bọc quanh cột trong `WHERE` là cách phổ biến nhất làm mất index.
- `EXPLAIN ANALYZE` trước khi kết luận bất cứ điều gì.

## Tự kiểm tra

1. Index `(a, b, c)` dùng được cho `WHERE b = 1 AND c = 2` không? Vì sao?
2. `WHERE YEAR(ngay_tao) = 2026` chậm. Hai cách sửa?
3. Khi nào đánh index lại làm hệ thống chậm đi?
