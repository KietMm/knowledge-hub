---
title: Subquery và CTE
slug: subquery-va-cte
summary: Truy vấn lồng nhau, WITH để đặt tên các bước, và đệ quy cho dữ liệu phân cấp.
level: trung-cap
tags: [sql, subquery, cte]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được truy vấn nhiều bước mà người khác đọc hiểu, và dùng CTE đệ quy cho dữ liệu phân cấp.

## Ý tưởng chính

Khi một truy vấn cần nhiều bước, bạn có hai cách viết: **lồng vào nhau** (subquery) hoặc **đặt tên từng bước** (CTE).

Chúng thường cho cùng kết quả và cùng tốc độ. Khác biệt nằm ở chỗ **người đọc hiểu được hay không** — và với truy vấn 40 dòng, đó là khác biệt lớn.

## Mental model

Hãy nghĩ tới **công thức nấu ăn**.

> **Subquery** là viết tất cả vào một câu: *"trộn (nước cốt của (chanh đã vắt sau khi rửa)) với (đường đã rây)"*. Đọc phải bóc từ trong ra ngoài.
>
> **CTE** là viết theo bước: *"Bước 1: rửa chanh. Bước 2: vắt lấy nước cốt. Bước 3: rây đường. Bước 4: trộn bước 2 với bước 3."*

Cùng món ăn. Nhưng công thức thứ hai **sửa được**, **kiểm được từng bước**, và người mới đọc hiểu ngay.

## Ví dụ nhỏ

```sql
-- Subquery: đọc từ trong ra ngoài
SELECT * FROM khach
WHERE id IN (SELECT khach_id FROM don_hang WHERE tien > 1000000);
```

```sql
-- CTE: đọc từ trên xuống
WITH khach_lon AS (
  SELECT DISTINCT khach_id FROM don_hang WHERE tien > 1000000
)
SELECT * FROM khach WHERE id IN (SELECT khach_id FROM khach_lon);
```

## Code chạy thế nào

Subquery đặt được ở **ba vị trí**, mỗi vị trí một vai trò:

```sql
-- ① Trong WHERE — lọc theo kết quả truy vấn khác
WHERE id IN (SELECT khach_id FROM don_hang)

-- ② Trong FROM — coi kết quả như một bảng tạm
SELECT * FROM (SELECT khach_id, SUM(tien) AS t FROM don_hang GROUP BY 1) x
WHERE x.t > 1000000;

-- ③ Trong SELECT — tính một giá trị cho từng dòng (cẩn thận: chạy MỖI DÒNG)
SELECT ten, (SELECT COUNT(*) FROM don_hang WHERE khach_id = k.id) AS so_don
FROM khach k;
```

Vị trí ③ là chỗ dễ gây chậm nhất:

```text
Bảng khach có 10.000 dòng
⇒ subquery trong SELECT chạy 10.000 lần
⇒ nếu don_hang không có index trên khach_id: 10.000 lần quét toàn bảng
```

Với dữ liệu lớn, viết lại bằng `LEFT JOIN` + `GROUP BY` gần như luôn nhanh hơn. Bộ tối ưu của Postgres có thể tự chuyển đổi, nhưng đừng trông chờ.

## Cú pháp

**CTE — đặt tên cho từng bước:**

```sql
WITH don_thang_nay AS (
  SELECT * FROM don_hang WHERE tao_luc >= DATE_TRUNC('month', NOW())
),
tong_theo_khach AS (
  SELECT khach_id, SUM(tien) AS tong FROM don_thang_nay GROUP BY khach_id
)
SELECT k.ten, t.tong
FROM tong_theo_khach t
JOIN khach k ON k.id = t.khach_id
WHERE t.tong > 1000000
ORDER BY t.tong DESC;
```

Bốn bước, mỗi bước một cái tên đọc được. Và bạn **chạy thử từng bước** được bằng cách thay `SELECT` cuối bằng `SELECT * FROM don_thang_nay` — cách gỡ lỗi truy vấn phức tạp hiệu quả nhất.

**CTE đệ quy — dữ liệu phân cấp:**

```sql
WITH RECURSIVE cay AS (
  -- Điểm neo: tầng gốc
  SELECT id, ten, cha_id, 1 AS cap
  FROM danh_muc WHERE cha_id IS NULL

  UNION ALL

  -- Bước đệ quy: nối tầng tiếp theo
  SELECT d.id, d.ten, d.cha_id, c.cap + 1
  FROM danh_muc d
  JOIN cay c ON d.cha_id = c.id
  WHERE c.cap < 10                      -- ← chặn vòng lặp vô hạn
)
SELECT * FROM cay ORDER BY cap;
```

Cấu trúc giống hệt một hàm đệ quy ([[de-quy-va-cach-nghi-ve-no]]): **điểm dừng** (dòng gốc) + **bước thu nhỏ** (nối con của tầng hiện tại). Điều kiện `cap < 10` là lưới an toàn — dữ liệu thật có thể có vòng do lỗi nhập liệu, và không có nó thì truy vấn chạy mãi.

## Tại sao cần nó

Vì CTE đệ quy giải được lớp bài toán mà SQL thường không làm được: **cây danh mục nhiều cấp, cây bình luận, sơ đồ tổ chức, chuỗi phụ thuộc**.

Không có nó, bạn phải gọi cơ sở dữ liệu nhiều lần từ ứng dụng — mỗi tầng một truy vấn, và đó là bài toán N+1 kinh điển.

Hai công cụ nữa đáng biết:

```sql
-- EXISTS: chỉ cần biết "có hay không", dừng ngay khi thấy dòng đầu
WHERE EXISTS (SELECT 1 FROM don_hang WHERE khach_id = k.id)

-- LATERAL: subquery NHÌN THẤY dòng hiện tại của truy vấn ngoài
SELECT k.ten, d.*
FROM khach k
CROSS JOIN LATERAL (
  SELECT * FROM don_hang WHERE khach_id = k.id     -- ← dùng được k.id
  ORDER BY tao_luc DESC LIMIT 3
) d;
```

`LATERAL` là cách sạch nhất cho bài **"lấy N bản ghi mới nhất của mỗi nhóm"** — bài toán rất hay gặp mà `GROUP BY` không giải được.

## So sánh

| | Subquery | CTE |
|---|---|---|
| Đọc | Từ trong ra ngoài | Từ trên xuống |
| Đặt tên bước | ❌ | ✅ |
| Dùng lại kết quả nhiều lần | ❌ phải lặp lại | ✅ tham chiếu bằng tên |
| Đệ quy | ❌ | ✅ |
| Gỡ lỗi từng bước | Khó | ✅ dễ |

Chọn thế nào:

```text
Một bước, ngắn gọn        →  subquery
Nhiều bước, hoặc dùng lại →  CTE
Dữ liệu phân cấp           →  CTE RECURSIVE
```

Lưu ý về hiệu năng: ở Postgres 12+, CTE thường được **gộp vào** truy vấn chính (inline) nên không chậm hơn subquery. Nếu cần buộc nó chạy riêng, dùng `WITH x AS MATERIALIZED (...)`.

## Dễ nhầm

**1. Subquery trong `SELECT` trên bảng lớn.** Chạy mỗi dòng một lần — xem phần trên.

**2. `NOT IN` với subquery có thể trả `NULL`.**

```sql
WHERE id NOT IN (SELECT khach_id FROM don_hang)
-- ❌ chỉ cần MỘT dòng NULL trong subquery → toàn bộ điều kiện thành NULL → 0 dòng
```

Dùng `NOT EXISTS` — nó xử lý NULL đúng như trực giác.

**3. CTE đệ quy không có điều kiện dừng.** Dữ liệu có vòng (A là cha của B, B là cha của A) thì truy vấn chạy tới khi hết bộ nhớ.

**4. Quên `RECURSIVE`.** Postgres báo lỗi ngay, nhưng thông báo không nói rõ nguyên nhân.

**5. Lồng subquery quá sâu.** Ba tầng trở lên thì không ai đọc nổi — chuyển sang CTE.

**6. Tưởng CTE luôn chạy một lần.** Ở Postgres 12+ nó có thể được gộp vào và chạy nhiều lần. Cần chắc chắn chạy một lần thì khai `MATERIALIZED`.

## Mẹo nhớ

> **Subquery là công thức viết liền; CTE là công thức đánh số bước.**
>
> **CTE đệ quy = điểm neo + bước nối tiếp + điều kiện dừng.**
>
> **`NOT IN` với subquery ⇒ dùng `NOT EXISTS`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba vị trí đặt subquery, và vị trí nào dễ gây chậm nhất?
2. Vì sao CTE dễ gỡ lỗi hơn subquery lồng nhau?
3. Ba phần của một CTE đệ quy?
4. Vì sao `NOT IN (subquery)` nguy hiểm, và thay bằng gì?
5. `LATERAL` giải quyết bài toán nào mà `GROUP BY` không giải được?

## Tự viết lại

Không nhìn lại phần trên, viết truy vấn bằng CTE:

```text
Bước 1: lấy đơn trong 30 ngày qua
Bước 2: tính tổng tiền theo khách
Bước 3: chỉ giữ khách chi trên 5 triệu
Bước 4: ghép với bảng khách để lấy tên và email
```

Tự kiểm: bạn đặt tên bốn CTE là gì, và bạn kiểm tra bước 2 chạy đúng bằng cách nào **mà không xoá phần còn lại**?

## Thử sức

Bạn cần lấy **3 bình luận mới nhất của mỗi bài viết**, cho 500 bài.

Cách ngây thơ là gọi 500 truy vấn từ ứng dụng. Nêu **hai** cách làm bằng một truy vấn duy nhất (gợi ý: một dùng window function, một dùng `LATERAL`), và nói cách nào bạn chọn cùng lý do.
