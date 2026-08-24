---
title: JSONB và tìm kiếm toàn văn
slug: jsonb-va-tim-kiem-toan-van
summary: Lưu dữ liệu bán cấu trúc và làm tìm kiếm tiếng Việt mà không cần thêm hệ thống nào.
level: nang-cao
tags: [postgresql, jsonb, full-text-search]
---

> **Sau bài này bạn sẽ:** truy vấn JSONB có dùng index, và dựng chức năng tìm kiếm không cần Elasticsearch.

## JSONB

```sql
CREATE TABLE san_pham (
  id          BIGSERIAL PRIMARY KEY,
  ten         TEXT NOT NULL,
  gia         NUMERIC(12,2) NOT NULL,
  thuoc_tinh  JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO san_pham (ten, gia, thuoc_tinh) VALUES
  ('Áo thun', 200000, '{"mau": ["đỏ","xanh"], "size": ["M","L"], "chat_lieu": "cotton"}');
```

### Toán tử

```sql
thuoc_tinh -> 'mau'                    -- trả về JSONB
thuoc_tinh ->> 'chat_lieu'             -- trả về TEXT
thuoc_tinh #> '{kich_thuoc,cao}'       -- theo đường dẫn, trả JSONB
thuoc_tinh #>> '{kich_thuoc,cao}'      -- theo đường dẫn, trả TEXT

thuoc_tinh @> '{"chat_lieu":"cotton"}' -- CHỨA — dùng được index GIN
thuoc_tinh ? 'mau'                     -- có khoá này không
thuoc_tinh ?| array['mau','size']      -- có ít nhất một trong các khoá
```

Phân biệt `->` và `->>` là thứ hay nhầm: `->>` cho chuỗi dùng ngay được, `->` cho JSONB để tiếp tục đi sâu.

### Index cho JSONB

```sql
-- Index GIN cho toán tử chứa
CREATE INDEX idx_thuoc_tinh ON san_pham USING GIN (thuoc_tinh);
SELECT * FROM san_pham WHERE thuoc_tinh @> '{"chat_lieu":"cotton"}';   -- dùng index

-- Index B-tree cho MỘT khoá cụ thể hay dùng
CREATE INDEX idx_chat_lieu ON san_pham ((thuoc_tinh ->> 'chat_lieu'));
SELECT * FROM san_pham WHERE thuoc_tinh ->> 'chat_lieu' = 'cotton';    -- dùng index
```

Điểm quan trọng: toán tử `@>` dùng được index GIN, còn `->>` **không** — nó cần index riêng trên biểu thức đó. Đây là nguyên nhân phổ biến của "đã đánh index mà vẫn chậm".

### Cập nhật trong JSONB

```sql
UPDATE san_pham SET thuoc_tinh = thuoc_tinh || '{"moi":"gia_tri"}' WHERE id = 1;
UPDATE san_pham SET thuoc_tinh = thuoc_tinh - 'chat_lieu' WHERE id = 1;
UPDATE san_pham SET thuoc_tinh = jsonb_set(thuoc_tinh, '{gia_goc}', '250000') WHERE id = 1;
```

### Mở JSONB thành dòng

```sql
-- Mỗi màu một dòng
SELECT id, ten, jsonb_array_elements_text(thuoc_tinh -> 'mau') AS mau
FROM san_pham;

-- Đếm số sản phẩm theo từng màu
SELECT mau, COUNT(*) FROM san_pham,
  jsonb_array_elements_text(thuoc_tinh -> 'mau') AS mau
GROUP BY mau;
```

### Ranh giới nên nhớ

JSONB tốt cho: thuộc tính khác nhau theo loại sản phẩm, payload webhook, cấu hình tuỳ biến, dữ liệu chưa biết hình dạng.

JSONB **sai** cho: dữ liệu cần khoá ngoại, cần ràng buộc `CHECK` phức tạp, hoặc là điều kiện lọc/join chính. Những thứ đó phải là cột thật.

Dấu hiệu bạn đã đi quá xa: truy vấn nào cũng phải `->>`, và bạn bắt đầu viết `CHECK` để kiểm tra cấu trúc JSON.

## Tìm kiếm toàn văn

```sql
-- Chuyển văn bản thành vector từ đã chuẩn hoá
SELECT to_tsvector('simple', 'Hướng dẫn học PostgreSQL cơ bản');

-- Truy vấn
SELECT * FROM bai_viet
WHERE to_tsvector('simple', tieu_de || ' ' || noi_dung) @@ to_tsquery('simple', 'postgresql & index');
```

Postgres **không có** bộ phân tích tiếng Việt sẵn. Dùng `'simple'` (tách theo khoảng trắng, chuyển chữ thường) — nó không nhận biết từ gốc nhưng hoạt động khá tốt với tiếng Việt vì tiếng Việt không biến đổi hình thái như tiếng Anh.

### Cột tsvector sinh tự động

```sql
ALTER TABLE bai_viet ADD COLUMN tim_kiem tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(tieu_de, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(tom_tat, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(noi_dung, '')), 'C')
) STORED;

CREATE INDEX idx_tim_kiem ON bai_viet USING GIN (tim_kiem);
```

Cột sinh tự động (generated column) luôn đồng bộ với dữ liệu — không cần trigger, không thể quên cập nhật.

`setweight` gán trọng số: khớp ở tiêu đề (A) được xếp cao hơn khớp ở nội dung (C).

### Xếp hạng kết quả

```sql
SELECT tieu_de, ts_rank(tim_kiem, truy_van) AS diem,
       ts_headline('simple', noi_dung, truy_van) AS doan_trich
FROM bai_viet, to_tsquery('simple', 'index & hieu_nang') AS truy_van
WHERE tim_kiem @@ truy_van
ORDER BY diem DESC
LIMIT 20;
```

`ts_headline` trả về đoạn trích có tô đậm từ khoá — chính là thứ hiển thị trong kết quả tìm kiếm.

### Tìm gần đúng với pg_trgm

Cho gõ sai chính tả và tìm theo chuỗi con:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_ten_trgm ON san_pham USING GIN (ten gin_trgm_ops);

-- Tìm gần đúng, sắp theo độ giống
SELECT ten, similarity(ten, 'ao thunn') AS do_giong
FROM san_pham
WHERE ten % 'ao thunn'
ORDER BY do_giong DESC;

-- LIKE '%...%' cũng dùng được index trigram
SELECT * FROM san_pham WHERE ten ILIKE '%thun%';
```

`pg_trgm` là câu trả lời cho `LIKE '%...%'` chậm — index trigram làm được điều mà B-tree không làm được.

## Khi nào cần Elasticsearch

Postgres đủ cho phần lớn nhu cầu tìm kiếm. Cân nhắc hệ thống riêng khi cần: gợi ý khi gõ với độ trễ dưới 50ms trên hàng chục triệu tài liệu, phân tích ngôn ngữ phức tạp, tổng hợp theo nhiều chiều, hoặc tách hoàn toàn tải tìm kiếm khỏi CSDL chính.

Đổi lại là một hệ thống nữa phải vận hành, đồng bộ và giám sát — cái giá thường bị đánh giá thấp.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Index GIN nhưng truy vấn dùng `->>` | Index không được dùng | Index trên biểu thức, hoặc dùng `@>` |
| Nhồi dữ liệu quan hệ vào JSONB | Mất ràng buộc, truy vấn phức tạp | Cột thật |
| Tính `to_tsvector` mỗi lần truy vấn | Chậm, không dùng index | Cột sinh tự động + GIN |
| `LIKE '%x%'` không có trigram | Quét toàn bảng | `pg_trgm` |
| Thêm Elasticsearch quá sớm | Một hệ thống nữa phải vận hành | Thử Postgres trước |

## Ghi nhớ

- `@>` dùng index GIN; `->>` cần index riêng trên biểu thức.
- Cột `tsvector` sinh tự động không bao giờ lệch dữ liệu.
- `setweight` cho tiêu đề trọng số cao hơn nội dung.
- `pg_trgm` giải quyết `LIKE '%...%'` và gõ sai chính tả.

## Tự kiểm tra

1. Vì sao đã có index GIN mà `WHERE thuoc_tinh ->> 'mau' = 'đỏ'` vẫn chậm?
2. Cột `tsvector` sinh tự động hơn gì so với dùng trigger?
3. Khi nào JSONB là lựa chọn sai?
