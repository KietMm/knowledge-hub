---
title: Vì sao chọn PostgreSQL
slug: vi-sao-chon-postgresql
summary: Những tính năng riêng khiến Postgres thay được nhiều hệ thống chuyên dụng, và cách kết nối cho đúng.
level: co-ban
tags: [postgresql, tong-quan]
---

> **Sau bài này bạn sẽ:** biết Postgres làm được gì mà MySQL không, và cấu hình connection pool đúng cách.

## Postgres làm được gì ngoài SQL

Điểm mạnh lớn nhất của Postgres không phải "nhanh hơn" — mà là nó thay được nhiều hệ thống chuyên dụng, giúp bạn không phải vận hành ba loại CSDL:

| Nhu cầu | Giải pháp riêng | Postgres |
|---|---|---|
| Tài liệu JSON | MongoDB | `JSONB` + index GIN |
| Tìm kiếm toàn văn | Elasticsearch | `tsvector` + `GIN` |
| Hàng đợi công việc | RabbitMQ | `SKIP LOCKED` |
| Dữ liệu địa lý | Hệ GIS riêng | PostGIS |
| Chuỗi thời gian | InfluxDB | TimescaleDB |
| Tìm kiếm vector (AI) | Pinecone | pgvector |
| Cache | Redis | `UNLOGGED TABLE` |

Không phải lúc nào Postgres cũng là lựa chọn tốt nhất cho từng việc riêng lẻ. Nhưng với hệ thống vừa và nhỏ, "đủ tốt và chỉ một thứ để vận hành" thường thắng "tốt nhất nhưng ba hệ thống".

## Kết nối

```
postgresql://nguoidung:matkhau@may-chu:5432/ten_db?sslmode=require
```

`sslmode=require` nên có ở mọi kết nối production — không có nó, mật khẩu và dữ liệu đi qua mạng ở dạng rõ.

```bash
psql "$DATABASE_URL"

\l              # danh sách database
\c ten_db       # chuyển database
\dt             # danh sách bảng
\d ten_bang     # cấu trúc bảng, index, ràng buộc
\di             # danh sách index
\df             # danh sách hàm
\x              # bật/tắt hiển thị dọc — rất hữu ích cho bảng nhiều cột
\timing         # hiện thời gian mỗi truy vấn
\q              # thoát
```

`\d ten_bang` là lệnh dùng nhiều nhất: nó hiện đủ cột, kiểu, ràng buộc, index và khoá ngoại trong một màn hình.

## Connection pool

Mỗi kết nối Postgres là một **tiến trình riêng** ở phía máy chủ, tốn khoảng 5–10MB RAM. Đây là điểm khác biệt quan trọng so với các CSDL dùng luồng.

Hệ quả: mở 500 kết nối không làm hệ thống nhanh hơn — nó làm máy chủ hết RAM.

```ts
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,                        // số kết nối tối đa
  idleTimeoutMillis: 30_000,      // đóng kết nối rảnh sau 30s
  connectionTimeoutMillis: 5_000, // chờ tối đa 5s để lấy được kết nối
})
```

Công thức tham khảo cho `max`: `(số nhân CPU × 2) + số ổ đĩa`. Với máy 4 nhân, khoảng 10–20 là hợp lý — con số nhỏ hơn nhiều người tưởng.

Nhớ tính tổng: 5 instance ứng dụng × `max: 20` = 100 kết nối, trong khi `max_connections` mặc định của Postgres là 100. Khi số instance nhiều, dùng **PgBouncer** ở giữa.

Với môi trường serverless (mỗi request một tiến trình mới), pool trong ứng dụng gần như vô dụng — bắt buộc phải có PgBouncer hoặc dịch vụ pool của nhà cung cấp.

## Schema

```sql
CREATE SCHEMA ung_dung;
SET search_path TO ung_dung, public;

-- Bảng có tiền tố schema
CREATE TABLE ung_dung.nguoi_dung (...);
```

Schema là không gian tên bên trong một database. Hữu ích cho: tách module trong hệ lớn, tách dữ liệu theo khách hàng, hoặc tách bảng ứng dụng khỏi extension.

## Extension

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- sinh UUID
CREATE EXTENSION IF NOT EXISTS pg_trgm;         -- tìm kiếm gần đúng
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;  -- thống kê truy vấn
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector

SELECT * FROM pg_available_extensions ORDER BY name;
```

`pg_stat_statements` nên bật ở mọi môi trường production — nó là công cụ tìm truy vấn chậm hữu ích nhất.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Pool `max` quá lớn | Máy chủ hết RAM, chậm hơn | 10–20 cho máy 4 nhân |
| Không tính tổng kết nối nhiều instance | Vượt `max_connections` | PgBouncer |
| Pool trong môi trường serverless | Kết nối cạn kiệt | Pool bên ngoài |
| Thiếu `sslmode=require` | Dữ liệu truyền dạng rõ | Bật SSL |
| Không bật `pg_stat_statements` | Không biết truy vấn nào chậm | Bật ngay từ đầu |

## Ghi nhớ

- Postgres thay được nhiều hệ thống chuyên dụng — bớt thứ phải vận hành.
- Mỗi kết nối là một tiến trình: pool nhỏ hơn bạn nghĩ.
- Nhiều instance ứng dụng ⇒ cần PgBouncer.
- `\d ten_bang` và `pg_stat_statements` là hai công cụ dùng hằng ngày.

## Tự kiểm tra

1. Vì sao tăng `max` của pool lên 200 thường làm hệ thống chậm đi?
2. Ba việc Postgres làm được mà không cần thêm hệ thống khác?
3. Ứng dụng chạy 10 instance, mỗi cái pool 20 — vấn đề ở đâu?
