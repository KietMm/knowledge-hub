---
title: Index trong PostgreSQL
slug: index-trong-postgresql
summary: Năm loại index, index từng phần, index trên biểu thức, và cách tìm index thừa.
level: trung-cap
tags: [postgresql, index, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng loại index cho từng kiểu truy vấn, và tìm ra những index đang chỉ làm chậm việc ghi.

## Ý tưởng chính

Postgres có **năm loại index**, mỗi loại tối ưu cho một kiểu câu hỏi khác nhau. Dùng nhầm loại thì index tồn tại nhưng không bao giờ được dùng.

Và có hai kỹ thuật ít người biết nhưng giá trị rất cao: **index từng phần** và **index trên biểu thức** — chúng biến những truy vấn tưởng không tối ưu được thành nhanh.

## Mental model

Hãy nghĩ tới **các cách sắp xếp một hiệu sách**.

> **B-tree** là xếp theo **thứ tự bảng chữ cái**. Tìm "Kiếm hiệp" nhanh, tìm khoảng "K đến M" cũng nhanh, và duyệt theo thứ tự thì đọc thẳng.
>
> **GIN** là **mục lục chủ đề ở cuối sách**: một từ khoá → danh sách nhiều trang chứa nó. Đúng cho *"những cuốn nào NÓI VỀ Hà Nội"*.
>
> **BRIN** là **biển ghi ở đầu mỗi kệ**: *"kệ này: sách xuất bản 2020–2021"*. Không chính xác từng cuốn, nhưng cực nhẹ và đủ để loại bỏ 90% số kệ.

Chọn loại index là chọn **cách sắp xếp phù hợp với câu hỏi bạn hay hỏi nhất**.

## Ví dụ nhỏ

```sql
CREATE INDEX ON don_hang (khach_id);                    -- B-tree (mặc định)
CREATE INDEX ON san_pham USING GIN (thuoc_tinh);        -- JSONB
CREATE INDEX ON log USING BRIN (tao_luc);               -- bảng rất lớn, ghi tuần tự
```

## Code chạy thế nào

Năm loại và chỗ dùng:

```text
B-TREE   mặc định — =, <, >, BETWEEN, ORDER BY, LIKE 'x%'
         ⇒ 95% trường hợp

GIN      nhiều giá trị trong một ô: JSONB, mảng, tsvector
         WHERE thuoc_tinh @> '{"mau":"đỏ"}'
         WHERE the @> ARRAY['sale']
         ⇒ tra nhanh, nhưng GHI CHẬM hơn đáng kể

GiST     dữ liệu hình học, khoảng, tìm gần đúng
         PostGIS, ràng buộc EXCLUDE (chống trùng lịch)

BRIN     bảng RẤT lớn, dữ liệu sắp sẵn theo thứ tự vật lý (log theo thời gian)
         ⇒ index chỉ vài chục KB cho bảng 100 GB

HASH     chỉ cho phép so sánh =
         ⇒ hầu như không cần: B-tree làm được và làm nhiều hơn
```

Quy tắc: **mặc định B-tree**; đổi sang loại khác khi câu hỏi của bạn không phải kiểu "so sánh và sắp thứ tự".

## Cú pháp

**Index từng phần** — chỉ index phần dữ liệu bạn thật sự truy vấn:

```sql
-- 95% đơn đã hoàn tất, bạn chỉ truy vấn đơn đang xử lý
CREATE INDEX ON don_hang (tao_luc)
WHERE trang_thai IN ('moi', 'dang_giao');
```

```text
Index đầy đủ:   10 triệu dòng  → ~300 MB, khó nằm gọn trong RAM
Index từng phần: 500 nghìn dòng → ~15 MB, luôn nằm trong RAM

⇒ nhanh hơn, ghi rẻ hơn, và tốn ít bộ nhớ đệm hơn
```

Đây là kỹ thuật giá trị cao mà ít người dùng. Điều kiện: truy vấn của bạn phải chứa **cùng điều kiện** với `WHERE` của index, để bộ tối ưu biết dùng nó.

**Index trên biểu thức** — cứu những truy vấn bọc cột trong hàm:

```sql
-- Truy vấn: WHERE lower(email) = 'a@x.com'  → index thường KHÔNG dùng được
CREATE INDEX ON nguoi_dung (lower(email));    -- ✅ giờ dùng được
```

```sql
CREATE INDEX ON don_hang (date_trunc('day', tao_luc));
CREATE INDEX ON san_pham ((thuoc_tinh->>'mau'));    -- một trường trong JSONB
```

**Ràng buộc duy nhất có điều kiện** — giải bài toán xoá mềm:

```sql
CREATE UNIQUE INDEX ON nguoi_dung (email) WHERE xoa_luc IS NULL;
```

Chi tiết vì sao cần nó ở [[xoa-mem-va-vong-doi-ban-ghi]].

**Ràng buộc `EXCLUDE`** — thứ chỉ Postgres có, và nó giải một bài toán khó:

```sql
CREATE EXTENSION btree_gist;
ALTER TABLE dat_phong ADD CONSTRAINT khong_trung_lich
EXCLUDE USING gist (
  phong_id WITH =,
  tsrange(nhan_luc, tra_luc) WITH &&      -- && = hai khoảng GIAO NHAU
);
```

Ràng buộc này chặn **hai lượt đặt cùng phòng trùng khoảng thời gian** — điều mà `UNIQUE` không làm được, và tự kiểm ở ứng dụng thì luôn có điều kiện đua.

## Tại sao cần nó

Vì **tạo index trên bảng lớn sẽ khoá bảng**, và đó là sự cố production kinh điển:

```sql
CREATE INDEX ON don_hang (khach_id);              -- ❌ khoá GHI suốt thời gian tạo
CREATE INDEX CONCURRENTLY ON don_hang (khach_id); -- ✅ không khoá
```

`CONCURRENTLY` đánh đổi: chậm hơn khoảng hai lần, không chạy được trong transaction, và **có thể để lại index hỏng** nếu bị lỗi giữa chừng:

```sql
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;   -- tìm index hỏng
DROP INDEX CONCURRENTLY ten_index_hong;                            -- xoá rồi tạo lại
```

**Tìm index thừa** — việc nên làm định kỳ:

```sql
-- Index chưa bao giờ được dùng
SELECT schemaname, relname, indexrelname, idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS kich_thuoc
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

Index có `idx_scan = 0` sau vài tuần chạy production là index **chỉ làm chậm mọi lệnh ghi và chiếm RAM**. Xoá nó là cải thiện thuần.

Lưu ý khi đọc: đừng xoá ngay sau khi vừa restart máy chủ (bộ đếm về 0), và giữ lại index phục vụ ràng buộc `UNIQUE`.

## So sánh

| Câu hỏi của bạn | Loại index |
|---|---|
| `WHERE cot = ?`, khoảng, `ORDER BY` | B-tree |
| `WHERE jsonb @> ?`, mảng chứa | GIN |
| Tìm kiếm toàn văn | GIN trên `tsvector` |
| `LIKE '%giữa%'` | GIN + `pg_trgm` |
| Khoảng thời gian giao nhau | GiST |
| Bảng log khổng lồ, lọc theo thời gian | BRIN |

Và ba câu hỏi trước khi tạo bất kỳ index nào:

```text
① Truy vấn này có thật sự chậm không?  → EXPLAIN ANALYZE trước
② Đã có index nào phục vụ được chưa?    → index (a,b) đã phục vụ WHERE a
③ Bảng này ghi nhiều hay đọc nhiều?     → ghi nhiều thì mỗi index là một cái giá
```

## Dễ nhầm

**1. Tạo index không có `CONCURRENTLY` trên production.** Khoá ghi, gây sự cố.

**2. Dùng B-tree cho JSONB.** Nó index **cả object** như một giá trị, nên `@>` không dùng được. Cần GIN.

**3. Bỏ qua index từng phần.** Bạn tạo index đầy đủ 300 MB trong khi 15 MB là đủ.

**4. Quên index trên biểu thức khi truy vấn bọc hàm.** `lower(email)`, `date_trunc(...)` — index cột thường vô dụng ở đây.

**5. Tạo index cho mọi cột "cho chắc".** Mỗi index làm `INSERT`/`UPDATE` chậm hơn; bảng 10 index có thể chậm gấp đôi bảng 2 index khi ghi.

**6. Không bao giờ kiểm index thừa.** Dự án ba năm tuổi thường có vài index không ai dùng.

**7. Quên `ANALYZE` sau khi nạp dữ liệu lớn.** Bộ tối ưu dựa vào thống kê; thống kê cũ thì nó chọn kế hoạch sai dù index đã có — xem [[doc-explain-analyze]].

## Mẹo nhớ

> **B-tree là xếp theo bảng chữ cái; GIN là mục lục chủ đề; BRIN là biển ghi ở đầu kệ.**
>
> **Index từng phần: chỉ index phần bạn thật sự truy vấn.**
>
> **Production luôn `CREATE INDEX CONCURRENTLY`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm loại index và câu hỏi mà mỗi loại phục vụ?
2. Index từng phần tiết kiệm những gì, và điều kiện để nó được dùng?
3. Khi nào cần index trên biểu thức?
4. `CONCURRENTLY` đánh đổi gì, và rủi ro của nó là gì?
5. Làm sao tìm ra index thừa, và cần lưu ý gì khi đọc kết quả?

## Tự viết lại

Không nhìn lại phần trên, đề xuất index cho từng truy vấn (nêu **loại** và **lý do**):

```sql
WHERE email = ?                                   -- 5 triệu người dùng
WHERE lower(ten) LIKE 'nguyen%'
WHERE thuoc_tinh @> '{"thuong_hieu": "Apple"}'
WHERE trang_thai = 'cho_duyet' ORDER BY tao_luc    -- 2% số dòng ở trạng thái này
WHERE tao_luc >= ? AND tao_luc < ?                 -- bảng log 200 GB
```

Tự kiểm: câu thứ tư — bạn tạo index đầy đủ hay index từng phần, và tiết kiệm được bao nhiêu?

## Thử sức

Bạn tạo `CREATE INDEX CONCURRENTLY` trên bảng 80 triệu dòng. Sau 40 phút nó báo lỗi vì hết dung lượng đĩa tạm.

Ba câu để trả lời: hiện trạng cơ sở dữ liệu bây giờ ra sao (có index không, index đó dùng được không), bạn **kiểm tra** bằng lệnh gì, và **dọn dẹp** thế nào trước khi thử lại?
