---
title: SELECT, lọc và sắp xếp
slug: select-loc-va-sap-xep
summary: Thứ tự thực thi thật của một câu SQL, và vì sao WHERE không dùng được alias ở SELECT.
level: co-ban
tags: [sql, select, where, co-ban]
---

> **Sau bài này bạn sẽ:** viết được truy vấn lọc và sắp xếp đúng ý, và hiểu vì sao một số alias báo lỗi "column does not exist".

## Thứ tự thực thi

Bạn **viết** SQL theo thứ tự này:

```sql
SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT ...
```

Nhưng cơ sở dữ liệu **thực thi** theo thứ tự khác:

```
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
```

Đây là kiến thức nền quan trọng nhất của bài này, vì nó giải thích hàng loạt hành vi khó hiểu:

```sql
-- LỖI: alias tao_ra_o_SELECT chưa tồn tại khi WHERE chạy
SELECT gia * so_luong AS thanh_tien
FROM don_hang
WHERE thanh_tien > 100000;

-- ĐÚNG: lặp lại biểu thức
SELECT gia * so_luong AS thanh_tien
FROM don_hang
WHERE gia * so_luong > 100000;

-- ĐÚNG: ORDER BY chạy SAU SELECT nên dùng alias được
SELECT gia * so_luong AS thanh_tien
FROM don_hang
ORDER BY thanh_tien DESC;
```

## Lọc với WHERE

```sql
SELECT * FROM san_pham
WHERE gia BETWEEN 100000 AND 500000        -- bao gồm cả hai đầu
  AND danh_muc IN ('ao', 'quan')
  AND ten LIKE 'Áo%'                       -- % = nhiều ký tự, _ = một ký tự
  AND mo_ta IS NOT NULL                    -- KHÔNG dùng != NULL
  AND ngay_tao >= '2026-01-01';
```

### NULL không so sánh được

`NULL` nghĩa là "không biết", nên mọi phép so sánh với nó cho ra `UNKNOWN`, không phải `TRUE` hay `FALSE`:

```sql
WHERE mo_ta = NULL      -- không bao giờ khớp dòng nào
WHERE mo_ta IS NULL     -- đúng
```

Đây là bẫy phổ biến nhất với người mới. Hệ quả tinh vi hơn:

```sql
-- Nếu trang_thai có thể NULL, dòng đó KHÔNG được trả về,
-- dù "NULL khác 'huy'" nghe có vẻ đúng
WHERE trang_thai != 'huy'

-- Muốn lấy cả dòng NULL:
WHERE trang_thai IS DISTINCT FROM 'huy'    -- Postgres
WHERE (trang_thai != 'huy' OR trang_thai IS NULL)  -- chuẩn SQL
```

## Sắp xếp và phân trang

```sql
SELECT * FROM bai_viet
ORDER BY noi_bat DESC, ngay_dang DESC, id DESC   -- id để phá thế hoà, đảm bảo ổn định
LIMIT 20 OFFSET 40;
```

Tiêu chí cuối cùng nên là một cột **duy nhất** (thường là khoá chính). Không có nó, hai dòng cùng `ngay_dang` có thể đổi chỗ giữa các lần chạy — và phân trang sẽ lặp hoặc bỏ sót dòng.

`NULLS FIRST` / `NULLS LAST` điều khiển vị trí của NULL:

```sql
ORDER BY ngay_hoan_thanh DESC NULLS LAST;   -- việc chưa xong xuống cuối
```

### OFFSET chậm dần

`OFFSET 100000` buộc CSDL đọc và bỏ đi 100.000 dòng. Với dữ liệu lớn, dùng **keyset pagination**:

```sql
-- Trang tiếp theo: truyền vào giá trị cuối của trang trước
SELECT * FROM bai_viet
WHERE (ngay_dang, id) < ('2026-05-01', 1234)
ORDER BY ngay_dang DESC, id DESC
LIMIT 20;
```

Cách này giữ tốc độ không đổi dù ở trang thứ mấy.

## DISTINCT và toán tử tập hợp

```sql
SELECT DISTINCT danh_muc FROM san_pham;

SELECT ten FROM khach_hang_2025
UNION      -- loại trùng (tốn kém)
SELECT ten FROM khach_hang_2026;

SELECT ten FROM a UNION ALL SELECT ten FROM b;   -- giữ trùng, nhanh hơn
SELECT ten FROM a EXCEPT SELECT ten FROM b;      -- có ở a, không có ở b
SELECT ten FROM a INTERSECT SELECT ten FROM b;   -- có ở cả hai
```

Mặc định nên là `UNION ALL` — chỉ dùng `UNION` khi bạn thật sự cần khử trùng lặp.

## CASE

```sql
SELECT
  ten,
  CASE
    WHEN diem >= 8 THEN 'Giỏi'
    WHEN diem >= 6.5 THEN 'Khá'
    ELSE 'Trung bình'
  END AS xep_loai
FROM hoc_sinh;
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `WHERE cot = NULL` | Không trả về dòng nào | `IS NULL` |
| `WHERE cot != 'x'` khi cột có NULL | Mất dòng NULL | Thêm `OR cot IS NULL` |
| Dùng alias của SELECT trong WHERE | Lỗi cột không tồn tại | Lặp lại biểu thức |
| `ORDER BY` không có tiêu chí duy nhất | Phân trang lặp/sót dòng | Thêm khoá chính |
| `OFFSET` lớn | Chậm dần theo số trang | Keyset pagination |

## Ghi nhớ

- Thứ tự thực thi: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.
- NULL không so sánh được: luôn `IS NULL` / `IS NOT NULL`.
- `ORDER BY` phải kết thúc bằng cột duy nhất.
- `UNION ALL` là mặc định; `UNION` chỉ khi cần khử trùng.

## Tự kiểm tra

1. Vì sao alias dùng được ở `ORDER BY` mà không dùng được ở `WHERE`?
2. Bảng có 30% dòng `trang_thai` là NULL. `WHERE trang_thai != 'huy'` trả về bao nhiêu phần trăm dòng?
3. Viết truy vấn phân trang không dùng OFFSET cho danh sách sắp theo `ngay_dang DESC`.
