---
title: Subquery và CTE
slug: subquery-va-cte
summary: Truy vấn lồng nhau, WITH để đặt tên các bước, và đệ quy cho dữ liệu phân cấp.
level: trung-cap
tags: [sql, subquery, cte]
---

> **Sau bài này bạn sẽ:** viết được truy vấn nhiều bước mà người khác đọc hiểu, thay vì một khối lồng năm tầng.

## Ba vị trí đặt subquery

```sql
-- 1. Trong WHERE — lọc theo kết quả truy vấn khác
SELECT * FROM san_pham
WHERE danh_muc_id IN (SELECT id FROM danh_muc WHERE kich_hoat);

-- 2. Trong FROM — coi kết quả như một bảng tạm
SELECT t.danh_muc, t.tong FROM (
  SELECT danh_muc, SUM(gia) AS tong FROM san_pham GROUP BY danh_muc
) t WHERE t.tong > 1000000;

-- 3. Trong SELECT — tính một giá trị cho từng dòng
SELECT k.ten,
       (SELECT COUNT(*) FROM don_hang d WHERE d.khach_hang_id = k.id) AS so_don
FROM khach_hang k;
```

Dạng 3 (**subquery tương quan**) chạy một lần cho **mỗi dòng** — với bảng lớn thì rất chậm. Trình tối ưu hiện đại thường viết lại thành JOIN, nhưng đừng dựa vào đó: viết JOIN hoặc dùng window function cho rõ ràng.

## CTE — đặt tên cho từng bước

```sql
WITH don_da_xong AS (
  SELECT * FROM don_hang WHERE trang_thai = 'xong'
),
doanh_thu_theo_khach AS (
  SELECT khach_hang_id, SUM(tong_tien) AS tong
  FROM don_da_xong
  GROUP BY khach_hang_id
)
SELECT k.ten, d.tong
FROM doanh_thu_theo_khach d
JOIN khach_hang k ON k.id = d.khach_hang_id
WHERE d.tong > 5000000
ORDER BY d.tong DESC;
```

So với subquery lồng nhau, CTE đọc **từ trên xuống** như các bước của một quy trình. Mỗi bước có tên nói lên nó làm gì. Đây là khác biệt lớn nhất về khả năng bảo trì.

Lưu ý hiệu năng: từ Postgres 12, CTE thường được "inline" nên không còn là hàng rào tối ưu hoá. Cần ép vật chất hoá thì dùng `WITH ... AS MATERIALIZED`.

## CTE đệ quy — dữ liệu phân cấp

```sql
WITH RECURSIVE cay_danh_muc AS (
  -- Bước neo: gốc
  SELECT id, ten, cha_id, 1 AS cap
  FROM danh_muc
  WHERE cha_id IS NULL

  UNION ALL

  -- Bước đệ quy: con của những gì đã tìm được
  SELECT d.id, d.ten, d.cha_id, c.cap + 1
  FROM danh_muc d
  JOIN cay_danh_muc c ON d.cha_id = c.id
  WHERE c.cap < 10               -- chặn vòng lặp vô tận
)
SELECT REPEAT('  ', cap - 1) || ten AS cay, cap
FROM cay_danh_muc
ORDER BY cap;
```

Dùng cho: cây danh mục, sơ đồ tổ chức, bình luận lồng nhau, chuỗi phụ thuộc.

**Luôn đặt điều kiện dừng.** Dữ liệu có vòng (A là cha của B, B là cha của A) sẽ làm truy vấn chạy mãi và ngốn hết bộ nhớ.

## ANY, ALL, EXISTS

```sql
WHERE gia > ALL (SELECT gia FROM san_pham WHERE danh_muc = 'ao')   -- đắt hơn TẤT CẢ
WHERE gia > ANY (SELECT gia FROM san_pham WHERE danh_muc = 'ao')   -- đắt hơn ÍT NHẤT MỘT
WHERE EXISTS (SELECT 1 FROM don_hang d WHERE d.san_pham_id = s.id) -- có ít nhất một
```

`EXISTS` dừng ngay khi tìm thấy dòng đầu tiên — thường là lựa chọn nhanh nhất khi chỉ cần biết có hay không.

## LATERAL: subquery nhìn thấy dòng hiện tại

```sql
-- 3 đơn hàng gần nhất của MỖI khách
SELECT k.ten, d.ma_don, d.ngay_dat
FROM khach_hang k
CROSS JOIN LATERAL (
  SELECT ma_don, ngay_dat
  FROM don_hang
  WHERE khach_hang_id = k.id        -- tham chiếu được k của dòng ngoài
  ORDER BY ngay_dat DESC
  LIMIT 3
) d;
```

Không có `LATERAL`, subquery trong `FROM` không nhìn thấy được cột của bảng bên trái.

## Viết CTE hay subquery

| Tình huống | Nên dùng |
|---|---|
| Một điều kiện lọc đơn giản | Subquery trong `WHERE` |
| Nhiều bước biến đổi nối tiếp | CTE |
| Dùng lại cùng một kết quả nhiều lần | CTE |
| Dữ liệu phân cấp | CTE đệ quy |
| Cần N dòng đầu cho mỗi dòng ngoài | `LATERAL` |

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Subquery tương quan trên bảng lớn | Chạy N lần, rất chậm | JOIN hoặc window function |
| CTE đệ quy không có điều kiện dừng | Chạy vô tận | Thêm giới hạn `cap` |
| Lồng subquery 4-5 tầng | Không ai đọc nổi | Tách thành CTE có tên |
| `IN (subquery)` trả về NULL | Kết quả rỗng bí ẩn | `EXISTS` |
| Dùng CTE cho mọi thứ | Đôi khi chậm hơn JOIN thẳng | Đo bằng `EXPLAIN` |

## Ghi nhớ

- CTE biến truy vấn phức tạp thành các bước có tên.
- Subquery tương quan chạy một lần cho mỗi dòng.
- CTE đệ quy cần điều kiện dừng, không có ngoại lệ.
- `LATERAL` khi subquery cần thấy dòng hiện tại.

## Tự kiểm tra

1. Viết lại truy vấn subquery ba tầng thành CTE và so sánh độ dễ đọc.
2. Vì sao subquery trong `SELECT` chậm trên bảng một triệu dòng?
3. Viết CTE đệ quy liệt kê toàn bộ cấp dưới của một nhân viên.
