---
title: Đọc EXPLAIN ANALYZE
slug: doc-explain-analyze
summary: Kế hoạch thực thi nói cho bạn biết chính xác truy vấn chậm ở đâu — nếu biết đọc.
level: nang-cao
tags: [postgresql, explain, hieu-nang]
---

> **Sau bài này bạn sẽ:** nhìn một kế hoạch thực thi và chỉ ra được nút thắt, thay vì đoán mò.

## Hai lệnh

```sql
EXPLAIN SELECT ...           -- chỉ ước tính, KHÔNG chạy
EXPLAIN ANALYZE SELECT ...   -- CHẠY THẬT rồi báo số liệu thật
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...   -- kèm thông tin đọc đĩa/bộ nhớ
```

Cảnh báo: `EXPLAIN ANALYZE` **thực thi truy vấn**. Với `UPDATE`/`DELETE`, hãy bọc trong transaction rồi rollback:

```sql
BEGIN;
EXPLAIN ANALYZE DELETE FROM don_hang WHERE ngay_dat < '2020-01-01';
ROLLBACK;
```

## Đọc kết quả

```
Nested Loop  (cost=0.29..8.34 rows=1 width=64) (actual time=0.02..0.03 rows=1 loops=1)
  ->  Index Scan using don_hang_pkey on don_hang  (cost=0.29..8.30 rows=1 width=32)
        Index Cond: (id = 123)
  ->  Seq Scan on khach_hang  (cost=0.00..1.05 rows=1 width=32) (actual rows=5000 loops=1)
        Filter: (id = don_hang.khach_hang_id)
Planning Time: 0.15 ms
Execution Time: 0.06 ms
```

Đọc **từ trong ra ngoài, từ dưới lên trên**. Nút sâu nhất chạy trước.

Ba con số cần nhìn:

- `cost=A..B` — chi phí **ước tính** (đơn vị tương đối, không phải mili giây). A là chi phí tới dòng đầu tiên, B là tới dòng cuối.
- `rows=N` — số dòng **ước tính**.
- `actual ... rows=N loops=M` — số **thật**. Tổng thời gian thật = `actual time × loops`.

**Điều quan trọng nhất:** so sánh `rows` ước tính với `actual rows`. Lệch nhiều lần nghĩa là trình tối ưu đang quyết định dựa trên thông tin sai — và mọi lựa chọn của nó đều đáng ngờ.

```sql
ANALYZE ten_bang;      -- cập nhật thống kê
```

## Các kiểu quét

| Kiểu | Nghĩa là | Nhận xét |
|---|---|---|
| `Seq Scan` | Đọc toàn bộ bảng | Tốt cho bảng nhỏ; xấu cho bảng lớn |
| `Index Scan` | Dùng index rồi lấy dòng từ bảng | Tốt khi lọc ra ít dòng |
| `Index Only Scan` | Chỉ đọc index, không đụng bảng | Tốt nhất |
| `Bitmap Heap Scan` | Gom vị trí từ index rồi đọc bảng theo thứ tự đĩa | Tốt khi lọc ra khá nhiều dòng |

`Seq Scan` không phải lúc nào cũng xấu: với bảng 500 dòng, đọc hết còn nhanh hơn đi qua index.

## Các kiểu JOIN

| Kiểu | Phù hợp khi |
|---|---|
| `Nested Loop` | Một bên rất ít dòng, bên kia có index |
| `Hash Join` | Hai bảng lớn, join theo `=` |
| `Merge Join` | Cả hai bên đã sắp xếp sẵn |

`Nested Loop` với `loops=50000` là dấu hiệu xấu điển hình — nó nghĩa là nút bên trong chạy 50.000 lần.

## Các dấu hiệu cần chú ý

```
Seq Scan on don_hang (actual rows=2000000)
```
→ Quét toàn bảng lớn. Thiếu index, hoặc index bị vô hiệu hoá bởi hàm bọc quanh cột.

```
rows=10 ... actual rows=50000
```
→ Ước tính sai 5000 lần. Chạy `ANALYZE`, hoặc tăng `default_statistics_target` cho cột đó.

```
Sort  (actual ...)  Sort Method: external merge  Disk: 52000kB
```
→ Sắp xếp phải tràn ra đĩa. Tăng `work_mem` cho phiên đó, hoặc thêm index phục vụ `ORDER BY`.

```
Rows Removed by Filter: 1990000
```
→ Đọc 2 triệu dòng để giữ lại 10.000. Điều kiện lọc cần được index.

```
Buffers: shared read=150000
```
→ Đọc rất nhiều block từ đĩa (`read`) thay vì từ cache (`hit`). Dữ liệu không nằm trong bộ nhớ.

## Quy trình tối ưu

1. **Tìm truy vấn chậm** bằng `pg_stat_statements`:

```sql
SELECT
  calls, mean_exec_time, total_exec_time,
  left(query, 100) AS truy_van
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

Sắp theo `total_exec_time`, không phải `mean_exec_time`: một truy vấn 5ms chạy một triệu lần tốn nhiều hơn truy vấn 2 giây chạy mười lần — và nó cũng dễ tối ưu hơn.

2. `EXPLAIN (ANALYZE, BUFFERS)` truy vấn đó.
3. Tìm nút tốn nhiều thời gian nhất.
4. Sửa: thêm index, viết lại truy vấn, hoặc chạy `ANALYZE`.
5. **Đo lại** để xác nhận.

## Viết lại truy vấn

```sql
-- Chậm: subquery tương quan chạy một lần cho mỗi dòng
SELECT k.*, (SELECT COUNT(*) FROM don_hang d WHERE d.khach_hang_id = k.id) AS so_don
FROM khach_hang k;

-- Nhanh: gộp một lần rồi join
SELECT k.*, COALESCE(d.so_don, 0) AS so_don
FROM khach_hang k
LEFT JOIN (
  SELECT khach_hang_id, COUNT(*) AS so_don FROM don_hang GROUP BY khach_hang_id
) d ON d.khach_hang_id = k.id;
```

Công cụ hữu ích: dán kế hoạch vào [explain.dalibo.com](https://explain.dalibo.com) để xem dạng cây trực quan có tô màu nút tốn kém.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đọc `cost` như mili giây | Hiểu sai hoàn toàn | `cost` là đơn vị tương đối |
| Bỏ qua chênh lệch rows ước tính/thật | Không thấy nguyên nhân gốc | So sánh hai con số |
| `EXPLAIN ANALYZE` với DELETE | Xoá dữ liệu thật | Bọc trong `BEGIN/ROLLBACK` |
| Sắp `pg_stat_statements` theo `mean` | Bỏ sót truy vấn tốn tổng nhiều nhất | Sắp theo `total_exec_time` |
| Sửa mà không đo lại | Không biết có tốt hơn không | Luôn đo lại |

## Ghi nhớ

- Đọc kế hoạch từ trong ra ngoài, dưới lên trên.
- Chênh lệch giữa `rows` ước tính và thật là manh mối quan trọng nhất.
- `Seq Scan` trên bảng nhỏ là bình thường.
- Ưu tiên theo `total_exec_time`, không phải thời gian trung bình.

## Tự kiểm tra

1. `rows=5` nhưng `actual rows=100000` — nguyên nhân và cách sửa?
2. Vì sao `Seq Scan` không phải lúc nào cũng là vấn đề?
3. Truy vấn A: 3 giây, chạy 10 lần/ngày. Truy vấn B: 8ms, chạy 2 triệu lần/ngày. Tối ưu cái nào trước?
