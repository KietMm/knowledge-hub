---
title: JOIN các loại
slug: join-cac-loai
summary: INNER, LEFT, RIGHT, FULL và CROSS — chọn sai loại là mất dữ liệu hoặc nhân bản dòng.
level: co-ban
tags: [sql, join]
---

> **Sau bài này bạn sẽ:** biết chính xác dòng nào bị loại khi JOIN, và nhận ra khi nào kết quả bị nhân lên.

## Bốn loại chính

Giả sử `khach_hang` có 100 dòng, trong đó 60 người đã đặt hàng.

| Loại | Giữ dòng nào | Số dòng khách trong kết quả |
|---|---|---|
| `INNER JOIN` | Chỉ dòng khớp cả hai bên | 60 |
| `LEFT JOIN` | Mọi dòng bảng trái + khớp bên phải (thiếu thì NULL) | 100 |
| `RIGHT JOIN` | Ngược lại | tuỳ đơn hàng |
| `FULL OUTER JOIN` | Mọi dòng cả hai bên | ≥ 100 |
| `CROSS JOIN` | Mọi tổ hợp | 100 × số đơn |

```sql
SELECT k.ten, d.tong_tien
FROM khach_hang k
LEFT JOIN don_hang d ON d.khach_hang_id = k.id;
```

`RIGHT JOIN` hiếm dùng trong thực tế — đảo thứ tự bảng và dùng `LEFT JOIN` thì dễ đọc hơn nhiều.

## Bẫy: WHERE làm LEFT JOIN thành INNER JOIN

```sql
-- Sai: điều kiện ở WHERE loại luôn các dòng có d.* = NULL
SELECT k.ten, d.tong_tien
FROM khach_hang k
LEFT JOIN don_hang d ON d.khach_hang_id = k.id
WHERE d.trang_thai = 'xong';        -- khách chưa đặt hàng biến mất!

-- Đúng: điều kiện lọc bảng phải nằm trong ON
SELECT k.ten, d.tong_tien
FROM khach_hang k
LEFT JOIN don_hang d ON d.khach_hang_id = k.id AND d.trang_thai = 'xong';
```

Quy tắc: điều kiện về **bảng bên phải** đặt trong `ON`; điều kiện về **bảng bên trái** đặt ở `WHERE`.

Trường hợp duy nhất nên để điều kiện của bảng phải ở `WHERE` là khi bạn cố ý tìm dòng **không khớp**:

```sql
-- Khách chưa từng đặt hàng
SELECT k.ten
FROM khach_hang k
LEFT JOIN don_hang d ON d.khach_hang_id = k.id
WHERE d.id IS NULL;
```

## Nhân bản dòng

JOIN theo quan hệ một-nhiều làm dòng bên trái **lặp lại**:

```sql
-- Mỗi khách xuất hiện một lần cho MỖI đơn hàng
SELECT k.ten, d.tong_tien FROM khach_hang k JOIN don_hang d ON ...
```

Đây là nguồn của lỗi thống kê kinh điển:

```sql
-- SAI: tong_tien của mỗi đơn bị cộng nhiều lần nếu đơn có nhiều dòng sản phẩm
SELECT k.ten, SUM(d.tong_tien)
FROM khach_hang k
JOIN don_hang d ON d.khach_hang_id = k.id
JOIN chi_tiet_don ct ON ct.don_hang_id = d.id
GROUP BY k.ten;

-- ĐÚNG: gộp trước rồi mới join
SELECT k.ten, t.tong
FROM khach_hang k
JOIN (
  SELECT khach_hang_id, SUM(tong_tien) AS tong
  FROM don_hang GROUP BY khach_hang_id
) t ON t.khach_hang_id = k.id;
```

Dấu hiệu nhận biết: số tiền tổng lớn bất thường, hoặc `COUNT(*)` không khớp với số dòng thật.

## Self join

Bảng nối với chính nó — dùng cho cấu trúc phân cấp:

```sql
SELECT nv.ten AS nhan_vien, sep.ten AS quan_ly
FROM nhan_vien nv
LEFT JOIN nhan_vien sep ON sep.id = nv.quan_ly_id;
```

`LEFT` ở đây quan trọng: giám đốc không có quản lý, dùng `INNER` sẽ mất người đó.

## EXISTS thay cho JOIN khi chỉ cần kiểm tra

```sql
-- Chỉ muốn biết "có hay không", không cần dữ liệu bên kia
SELECT k.ten
FROM khach_hang k
WHERE EXISTS (SELECT 1 FROM don_hang d WHERE d.khach_hang_id = k.id);
```

`EXISTS` dừng ngay khi tìm thấy dòng đầu tiên và **không** nhân bản dòng — thường nhanh hơn `JOIN` + `DISTINCT`.

Ngược lại, `NOT IN` với cột có thể NULL là bẫy nguy hiểm:

```sql
-- Nếu subquery trả về BẤT KỲ NULL nào, kết quả rỗng hoàn toàn
WHERE id NOT IN (SELECT khach_hang_id FROM don_hang)

-- An toàn
WHERE NOT EXISTS (SELECT 1 FROM don_hang d WHERE d.khach_hang_id = k.id)
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Điều kiện bảng phải ở `WHERE` sau LEFT JOIN | Thành INNER JOIN ngầm | Đưa vào `ON` |
| JOIN nhiều bảng rồi `SUM` | Số liệu bị thổi phồng | Gộp trước rồi join |
| `NOT IN` với cột nullable | Kết quả rỗng bí ẩn | `NOT EXISTS` |
| Quên `ON` (cross join ngầm) | Bùng nổ số dòng | Luôn có điều kiện `ON` |
| `INNER JOIN` cho self join phân cấp | Mất dòng gốc | `LEFT JOIN` |

## Ghi nhớ

- `LEFT JOIN` + điều kiện ở `WHERE` = `INNER JOIN`.
- Quan hệ một-nhiều làm dòng nhân lên — gộp trước khi tính tổng.
- `EXISTS` khi chỉ cần kiểm tra sự tồn tại.
- `NOT IN` + NULL = kết quả rỗng.

## Tự kiểm tra

1. Vì sao `LEFT JOIN ... WHERE d.trang_thai = 'xong'` mất các khách chưa đặt hàng?
2. Tổng doanh thu tính ra gấp 3 lần thực tế. Nguyên nhân thường là gì?
3. Viết truy vấn tìm sản phẩm chưa từng được bán, bằng hai cách.
