---
title: JSONB và tìm kiếm toàn văn
slug: jsonb-va-tim-kiem-toan-van
summary: Lưu dữ liệu bán cấu trúc và làm tìm kiếm tiếng Việt mà không cần thêm hệ thống nào.
level: nang-cao
tags: [postgresql, jsonb, full-text-search]
khung: v2
---

> **Sau bài này bạn sẽ:** dùng JSONB đúng chỗ (và biết chỗ nào không nên), và làm được tìm kiếm tiếng Việt có dấu mà không cần Elasticsearch.

## Ý tưởng chính

Hai tính năng này cho phép Postgres thay hai hệ thống chuyên dụng — MongoDB và Elasticsearch — ở mức đủ tốt cho phần lớn hệ thống.

Nhưng cả hai đều dễ bị lạm dụng. Câu hỏi quan trọng nhất trong bài: **cái gì nên là cột thật, cái gì nên nằm trong JSON?**

## Mental model

Hãy nghĩ tới **tủ hồ sơ có ngăn kéo dán nhãn** và **một cái hộp "linh tinh"**.

> Ngăn dán nhãn (**cột thật**): mỗi hồ sơ có đúng chỗ, tìm nhanh, và không ai bỏ nhầm thứ vào.
>
> Hộp linh tinh (**JSONB**): tiện, bỏ gì vào cũng được — nhưng tìm thì phải bới, và không ai bảo đảm bên trong có gì.
>
> Sai lầm phổ biến: **bỏ cả những thứ có ngăn riêng vào hộp linh tinh** vì lười mở ngăn.

Ranh giới thực dụng: **trường nào bạn lọc, sắp xếp hoặc ràng buộc theo — trường đó phải là cột thật.**

## Ví dụ nhỏ

```sql
-- ✅ Cột thật cho thứ luôn có và luôn dùng; JSONB cho phần thay đổi theo ngành hàng
CREATE TABLE san_pham (
  id         UUID PRIMARY KEY,
  ten        TEXT NOT NULL,
  gia        BIGINT NOT NULL,
  thuoc_tinh JSONB NOT NULL DEFAULT '{}'   -- {"ram":"8GB"} hoặc {"size":"XL","mau":"đỏ"}
);
```

## Code chạy thế nào

**Luôn dùng `JSONB`, không dùng `JSON`:**

```text
JSON   lưu nguyên văn bản   → giữ khoảng trắng, giữ thứ tự khoá, KHÔNG index được
JSONB  lưu dạng nhị phân     → parse sẵn, tra nhanh, index được  ← luôn chọn cái này
```

**Toán tử — phần cần thuộc:**

```sql
thuoc_tinh -> 'ram'          -- trả về JSONB   ("8GB" kèm dấu nháy)
thuoc_tinh ->> 'ram'         -- trả về TEXT    (8GB)
thuoc_tinh #> '{a,b}'        -- đi sâu nhiều tầng
thuoc_tinh @> '{"mau":"đỏ"}' -- CHỨA  ← toán tử dùng index GIN
thuoc_tinh ? 'ram'           -- có khoá này không
```

Phân biệt `->` và `->>` là chỗ vấp đầu tiên: so sánh chuỗi thì luôn dùng `->>`.

```sql
WHERE thuoc_tinh->>'mau' = 'đỏ'      -- ✅
WHERE thuoc_tinh->'mau' = 'đỏ'       -- ❌ so JSONB với text
```

**Index cho JSONB:**

```sql
-- Index toàn bộ: phục vụ @> và ?
CREATE INDEX ON san_pham USING GIN (thuoc_tinh);

-- Index MỘT trường: nhỏ hơn nhiều, nhanh hơn cho truy vấn cụ thể
CREATE INDEX ON san_pham ((thuoc_tinh->>'thuong_hieu'));
```

Quan trọng: **index GIN chỉ phục vụ `@>`, không phục vụ `->>` với `=`**. Nếu truy vấn của bạn viết `thuoc_tinh->>'mau' = 'đỏ'` thì index GIN vô dụng — bạn cần index trên biểu thức, hoặc viết lại thành `@> '{"mau":"đỏ"}'`.

## Cú pháp

**Tìm kiếm toàn văn** — ba khái niệm:

```text
tsvector   văn bản đã "băm" thành các từ gốc, có vị trí
tsquery    câu truy vấn tìm kiếm
@@         toán tử "khớp"
```

```sql
SELECT to_tsvector('simple', 'Áo thun nam màu đỏ');
-- 'màu':4 'nam':3 'thun':2 'áo':1 'đỏ':5
```

Với tiếng Việt, dùng cấu hình `'simple'`: các cấu hình ngôn ngữ khác (english, french) sẽ cắt gốc từ sai và loại bỏ nhầm từ.

**Cách làm đúng — cột sinh sẵn + index:**

```sql
ALTER TABLE san_pham ADD COLUMN tim_kiem tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(ten, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(mo_ta, '')), 'B')
) STORED;

CREATE INDEX ON san_pham USING GIN (tim_kiem);
```

```sql
SELECT ten, ts_rank(tim_kiem, query) AS diem
FROM san_pham, websearch_to_tsquery('simple', 'áo thun nam') query
WHERE tim_kiem @@ query
ORDER BY diem DESC
LIMIT 20;
```

Hai chi tiết đáng chú ý:

```text
setweight(..., 'A')  → từ khoá trong TÊN được tính điểm cao hơn trong MÔ TẢ
websearch_to_tsquery → hiểu cú pháp người dùng quen: "áo thun" -nam or đỏ
GENERATED ... STORED → cột tự cập nhật khi ten/mo_ta đổi, không cần trigger
```

**Tìm gần đúng (gõ sai chính tả):**

```sql
CREATE EXTENSION pg_trgm;
CREATE INDEX ON san_pham USING GIN (ten gin_trgm_ops);

SELECT ten, similarity(ten, 'ao thn') AS diem
FROM san_pham
WHERE ten % 'ao thn'          -- % = "đủ giống"
ORDER BY diem DESC;
```

`pg_trgm` còn có tác dụng phụ rất giá trị: nó làm `LIKE '%giữa%'` **dùng được index** — điều mà B-tree không làm được.

## Tại sao cần nó

Vì với bỏ dấu tiếng Việt (người dùng gõ "ao thun" muốn tìm "áo thun"), bạn cần thêm một bước:

```sql
CREATE EXTENSION unaccent;

-- Index trên phiên bản đã bỏ dấu
ALTER TABLE san_pham ADD COLUMN tim_kiem_khong_dau tsvector
GENERATED ALWAYS AS (to_tsvector('simple', unaccent(coalesce(ten, '')))) STORED;
```

Và câu hỏi cuối: **khi nào thì cần Elasticsearch thật?**

```text
Postgres đủ khi:
  · Dưới ~10 triệu tài liệu
  · Tìm kiếm không phải nghiệp vụ CHÍNH
  · Không cần gợi ý gõ, sửa lỗi chính tả nâng cao, phân tích ngôn ngữ sâu

Cần Elasticsearch khi:
  · Tìm kiếm LÀ sản phẩm (trang thương mại điện tử lớn)
  · Cần xếp hạng phức tạp, cá nhân hoá, học từ hành vi
  · Khối lượng rất lớn và cần mở rộng ngang riêng cho tìm kiếm
```

Cái giá của Elasticsearch: **một hệ thống nữa phải vận hành, và dữ liệu phải đồng bộ hai chiều** — đồng bộ lệch là nguồn lỗi thường trực.

## So sánh

| Nhu cầu | Công cụ Postgres |
|---|---|
| Thuộc tính thay đổi theo loại bản ghi | `JSONB` + GIN |
| Tìm theo từ khoá trong văn bản | `tsvector` + GIN |
| Gõ sai chính tả, tìm gần đúng | `pg_trgm` |
| `LIKE '%giữa%'` cần nhanh | `pg_trgm` |
| Bỏ dấu tiếng Việt | `unaccent` |

## Dễ nhầm

**1. Dùng `JSON` thay vì `JSONB`.** Mất khả năng index.

**2. Nhồi trường luôn có vào JSONB.** `gia` nằm trong JSON thì bạn mất `CHECK (gia >= 0)`, mất index B-tree cho sắp xếp theo giá, và mọi truy vấn thành chuỗi khó đọc.

**3. Tưởng index GIN phục vụ mọi truy vấn JSONB.** Nó phục vụ `@>` và `?`, **không** phục vụ `->>` với `=`.

**4. Nhầm `->` với `->>`.** So sánh chuỗi luôn dùng `->>`.

**5. Dùng cấu hình `'english'` cho tiếng Việt.** Nó cắt gốc từ sai và loại bỏ nhầm những từ nó tưởng là stop-word.

**6. Tính `to_tsvector` ngay trong `WHERE`.**

```sql
WHERE to_tsvector('simple', ten) @@ query   -- ❌ tính lại cho MỖI dòng, không dùng index
WHERE tim_kiem @@ query                      -- ✅ cột đã lưu sẵn, có index
```

**7. Thêm Elasticsearch quá sớm.** Bạn nhận thêm một hệ thống phải giám sát và một bài toán đồng bộ, để giải một vấn đề chưa xảy ra — xem [[vi-sao-chon-postgresql]].

## Mẹo nhớ

> **Ngăn dán nhãn (cột thật) vs hộp linh tinh (JSONB) — trường nào bạn LỌC theo thì phải có ngăn riêng.**
>
> **JSONB luôn, không bao giờ JSON. `@>` dùng index, `->>` thì không.**
>
> **Tiếng Việt dùng cấu hình `'simple'`, và cột `tsvector` phải LƯU SẴN.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `JSON` và `JSONB` khác nhau ở đâu, và vì sao luôn chọn cái sau?
2. `->` và `->>` khác nhau thế nào?
3. Index GIN trên JSONB phục vụ toán tử nào, không phục vụ toán tử nào?
4. Vì sao cột `tsvector` phải lưu sẵn thay vì tính trong `WHERE`?
5. Hai điều kiện để biết bạn thật sự cần Elasticsearch?

## Tự viết lại

Không nhìn lại phần trên, thiết kế bảng và index cho:

```text
Sàn thương mại nhiều ngành hàng: điện thoại có RAM/bộ nhớ, quần áo có size/màu,
sách có tác giả/nhà xuất bản. Cần: lọc theo giá, sắp xếp theo giá, lọc theo
thuộc tính riêng của ngành, và tìm kiếm theo tên sản phẩm (có dấu và không dấu).
```

Tự kiểm: `gia` của bạn là cột thật hay nằm trong JSONB, và **vì sao**? Bạn cần mấy index?

## Thử sức

Tìm kiếm của bạn dùng `WHERE ten ILIKE '%' || $1 || '%'`. Với 3 triệu sản phẩm, mỗi truy vấn mất 4 giây.

Nêu **ba** cách cải thiện, xếp theo công sức bỏ ra. Câu khó nhất: cách đơn giản nhất (`pg_trgm`) cải thiện được bao nhiêu, và **khi nào** nó vẫn không đủ — dấu hiệu để biết phải chuyển sang tìm kiếm toàn văn thật?
