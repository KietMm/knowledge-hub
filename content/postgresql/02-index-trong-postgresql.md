---
title: Index trong PostgreSQL
slug: index-trong-postgresql
summary: Năm loại index, index từng phần, index trên biểu thức, và cách tìm index thừa.
level: trung-cap
tags: [postgresql, index, hieu-nang]
---

> **Sau bài này bạn sẽ:** chọn đúng loại index cho từng kiểu truy vấn, và tìm được index nào đang chỉ tốn chỗ.

## Năm loại index

| Loại | Dùng cho | Ví dụ |
|---|---|---|
| **B-tree** | Mặc định: `=`, `<`, `>`, `BETWEEN`, `ORDER BY` | Gần như mọi trường hợp |
| **GIN** | Nhiều giá trị trong một cột: JSONB, mảng, toàn văn | `@>`, `?`, `@@` |
| **GiST** | Dữ liệu hình học, khoảng, láng giềng gần | `&&`, `<->` |
| **BRIN** | Bảng rất lớn, dữ liệu sắp theo thứ tự tự nhiên | Log theo thời gian |
| **Hash** | Chỉ `=` | Hiếm dùng — B-tree thường tốt hơn |

```sql
CREATE INDEX idx_ten ON bang (cot);                        -- B-tree
CREATE INDEX idx_json ON san_pham USING GIN (thuoc_tinh);  -- JSONB
CREATE INDEX idx_tag ON bai_viet USING GIN (tags);         -- mảng
CREATE INDEX idx_time ON su_kien USING BRIN (thoi_diem);   -- bảng khổng lồ
```

BRIN đáng chú ý: trên bảng một tỷ dòng sắp theo thời gian, index BRIN chỉ vài MB trong khi B-tree tương ứng mất hàng chục GB.

## Index từng phần

Chỉ đánh index cho phần dòng bạn thật sự truy vấn:

```sql
-- Chỉ 2% đơn đang chờ xử lý, nhưng đó là phần được truy vấn liên tục
CREATE INDEX idx_don_cho ON don_hang (ngay_dat)
WHERE trang_thai = 'cho';

-- Bỏ qua dòng đã xoá mềm
CREATE INDEX idx_sp_hien_hanh ON san_pham (ten)
WHERE ngay_xoa IS NULL;
```

Index nhỏ hơn nhiều lần: nhanh hơn khi đọc, rẻ hơn khi ghi, và nằm gọn trong bộ nhớ.

Điều kiện: mệnh đề `WHERE` của truy vấn phải **bao hàm** điều kiện của index thì trình tối ưu mới dùng được.

## Index trên biểu thức

```sql
-- Truy vấn LOWER(email) không dùng được index thường trên email
CREATE INDEX idx_email_thuong ON nguoi_dung (LOWER(email));
SELECT * FROM nguoi_dung WHERE LOWER(email) = 'a@b.com';   -- dùng được index

CREATE INDEX idx_thang ON don_hang (DATE_TRUNC('month', ngay_dat));
```

Biểu thức trong index phải **khớp chính xác** biểu thức trong truy vấn.

## Ràng buộc duy nhất có điều kiện

```sql
-- Mỗi người dùng chỉ một địa chỉ mặc định
CREATE UNIQUE INDEX uq_dia_chi_mac_dinh
ON dia_chi (nguoi_dung_id) WHERE la_mac_dinh;

-- Email duy nhất, nhưng chỉ tính tài khoản chưa xoá
CREATE UNIQUE INDEX uq_email_hoat_dong
ON nguoi_dung (email) WHERE ngay_xoa IS NULL;
```

Đây là cách diễn đạt những quy tắc nghiệp vụ mà `UNIQUE` thường không làm được.

## Index bao phủ

```sql
CREATE INDEX idx_bao_phu ON don_hang (khach_hang_id) INCLUDE (tong_tien, ngay_dat);
```

Cột trong `INCLUDE` được lưu trong index nhưng không tham gia sắp xếp. Truy vấn chỉ cần những cột đó sẽ dùng **Index Only Scan** — không phải đọc bảng chính.

## Tạo index không khoá bảng

```sql
CREATE INDEX CONCURRENTLY idx_ten ON bang (cot);
DROP INDEX CONCURRENTLY idx_cu;
```

Bắt buộc trên production. `CREATE INDEX` thường khoá mọi thao tác ghi cho tới khi xong — trên bảng lớn có thể là hàng chục phút.

Lưu ý: `CONCURRENTLY` không chạy được trong transaction, và nếu thất bại sẽ để lại index `INVALID` cần xoá tay:

```sql
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
```

## Tìm index thừa

Index không dùng vẫn làm chậm mọi lần ghi và chiếm dung lượng:

```sql
-- Index gần như không được dùng
SELECT
  schemaname, relname AS bang, indexrelname AS index_name,
  idx_scan AS so_lan_dung,
  pg_size_pretty(pg_relation_size(indexrelid)) AS kich_thuoc
FROM pg_stat_user_indexes
WHERE idx_scan < 50
ORDER BY pg_relation_size(indexrelid) DESC;
```

Xem cả tổng thể:

```sql
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS tong,
       pg_size_pretty(pg_indexes_size(relid)) AS index
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;
```

Nếu dung lượng index vượt dung lượng dữ liệu nhiều lần, gần như chắc chắn có index thừa.

Lưu ý trước khi xoá: `idx_scan` được tính từ lần reset thống kê gần nhất, và index có thể chỉ dùng cho báo cáo cuối tháng.

## Tìm bảng thiếu index

```sql
SELECT relname, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan AND seq_scan > 1000
ORDER BY seq_tup_read DESC;
```

Bảng lớn có nhiều `seq_scan` là ứng viên cần đánh index.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `CREATE INDEX` trên production | Khoá ghi hàng chục phút | `CONCURRENTLY` |
| Index cho mọi cột | Ghi chậm, tốn dung lượng | Đánh theo truy vấn thật |
| Không dùng index từng phần | Index to hơn cần thiết nhiều lần | `WHERE` trong index |
| Xoá index chỉ dựa vào `idx_scan` | Mất index cho báo cáo định kỳ | Xem thêm chu kỳ sử dụng |
| Bỏ quên index `INVALID` | Chiếm chỗ, không được dùng | Kiểm tra `pg_index` |

## Ghi nhớ

- B-tree cho hầu hết; GIN cho JSONB/mảng/toàn văn; BRIN cho bảng khổng lồ theo thời gian.
- Index từng phần thường nhỏ hơn nhiều lần và hiệu quả hơn hẳn.
- `CONCURRENTLY` là bắt buộc trên production.
- Rà index không dùng định kỳ — chúng làm chậm mọi lần ghi.

## Tự kiểm tra

1. Truy vấn `WHERE LOWER(email) = ?` chậm dù đã có index trên `email` — vì sao?
2. Khi nào BRIN tốt hơn B-tree?
3. Làm sao đảm bảo "mỗi người dùng chỉ một địa chỉ mặc định" ở tầng CSDL?
