---
title: Vì sao chọn PostgreSQL
slug: vi-sao-chon-postgresql
summary: Những tính năng riêng khiến Postgres thay được nhiều hệ thống chuyên dụng, và cách kết nối cho đúng.
level: co-ban
tags: [postgresql, tong-quan]
khung: v2
---

> **Sau bài này bạn sẽ:** biết Postgres thay được những hệ thống nào, và cấu hình connection pool đúng cách — chỗ sai phổ biến nhất khi đưa lên production.

## Ý tưởng chính

Điểm mạnh lớn nhất của Postgres không phải "nhanh hơn". Nó là: **một hệ thống thay được nhiều hệ thống chuyên dụng**.

Với đội nhỏ và hệ vừa, *"đủ tốt và chỉ một thứ để vận hành"* thường thắng *"tốt nhất nhưng ba hệ thống phải giám sát, sao lưu, nâng cấp"*.

## Mental model

Hãy nghĩ tới **con dao đa năng của thợ mộc** so với **bộ đồ nghề chuyên dụng**.

> Đục chuyên dụng đục đẹp hơn. Cưa chuyên dụng cưa nhanh hơn. Nhưng bạn phải **mang cả bộ**, bảo dưỡng cả bộ, và nhớ cái nào để ở đâu.
>
> Con dao đa năng làm mọi việc ở mức 80%. Với thợ làm đồ nhỏ, 80% là đủ — và họ chỉ phải mài **một** lưỡi.

Câu hỏi không phải *"Postgres có tốt bằng Elasticsearch trong tìm kiếm không"* (không), mà là ***"nhu cầu tìm kiếm của tôi có vượt quá mức Postgres làm được không"*** — và với phần lớn hệ thống, câu trả lời là chưa.

## Ví dụ nhỏ

| Nhu cầu | Hệ thống riêng | Postgres làm được |
|---|---|---|
| Tài liệu JSON | MongoDB | `JSONB` + index GIN |
| Tìm kiếm toàn văn | Elasticsearch | `tsvector` + GIN |
| Hàng đợi công việc | RabbitMQ | `SELECT ... FOR UPDATE SKIP LOCKED` |
| Dữ liệu địa lý | Hệ GIS riêng | PostGIS |
| Chuỗi thời gian | InfluxDB | TimescaleDB |
| Tìm kiếm vector (AI) | Pinecone | pgvector |
| Cache | Redis | `UNLOGGED TABLE` |

## Code chạy thế nào

**Connection pool** là chỗ sai nhiều nhất khi đưa Postgres lên production, và lý do nằm ở kiến trúc của nó:

```text
Mỗi kết nối Postgres = MỘT TIẾN TRÌNH riêng ở phía máy chủ
                      ≈ 5-10 MB RAM mỗi kết nối

⇒ 500 kết nối = 2,5-5 GB RAM chỉ để GIỮ kết nối, chưa làm gì cả
⇒ mở nhiều kết nối KHÔNG làm hệ thống nhanh hơn — nó làm máy chủ hết RAM
```

Đây là khác biệt quan trọng so với các cơ sở dữ liệu dùng luồng (thread): ở đó thêm kết nối rẻ, ở Postgres thì không.

```ts
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,                          // số kết nối tối đa
  idleTimeoutMillis: 30_000,        // đóng kết nối rảnh sau 30s
  connectionTimeoutMillis: 5_000,   // chờ tối đa 5s để lấy được kết nối
})
```

Công thức tham khảo cho `max`: **(số nhân CPU × 2) + số ổ đĩa**. Máy 4 nhân ⇒ khoảng 10–20 — **nhỏ hơn nhiều so với trực giác**.

Và phép tính hay bị quên:

```text
5 instance ứng dụng × max 20 = 100 kết nối
max_connections mặc định của Postgres = 100
⇒ instance thứ 6 không kết nối được
```

Khi số instance nhiều, đặt **PgBouncer** ở giữa: nó gom hàng nghìn kết nối từ ứng dụng thành vài chục kết nối thật tới Postgres.

Với môi trường **serverless**, pool trong ứng dụng gần như vô dụng — mỗi lần gọi hàm là một tiến trình mới với pool mới. Bắt buộc phải có PgBouncer hoặc dịch vụ pool của nhà cung cấp.

## Cú pháp

```bash
psql "$DATABASE_URL"

\l              # danh sách database
\c ten_db       # chuyển database
\dt             # danh sách bảng
\d ten_bang     # cấu trúc bảng, index, ràng buộc, khoá ngoại  ← dùng nhiều nhất
\di             # danh sách index
\x              # bật/tắt hiển thị dọc — cứu tinh cho bảng nhiều cột
\timing         # hiện thời gian mỗi truy vấn
\q
```

```
postgresql://nguoidung:matkhau@may-chu:5432/ten_db?sslmode=require
```

`sslmode=require` nên có ở **mọi** kết nối production — không có nó, mật khẩu và dữ liệu đi qua mạng ở dạng rõ.

## Tại sao cần nó

Vì hai tính năng dưới đây tổ chức lại toàn bộ cách bạn quản lý một cơ sở dữ liệu lớn:

**Schema — không gian tên bên trong một database:**

```sql
CREATE SCHEMA ung_dung;
SET search_path TO ung_dung, public;
CREATE TABLE ung_dung.nguoi_dung (...);
```

Hữu ích cho: tách module trong hệ lớn, tách dữ liệu theo khách hàng ([[mo-hinh-hoa-cac-tinh-huong-thuc-te]]), và tách bảng ứng dụng khỏi bảng của extension.

**Extension — thêm năng lực mà không đổi hệ thống:**

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";          -- sinh UUID
CREATE EXTENSION IF NOT EXISTS pg_trgm;              -- tìm gần đúng, tăng tốc LIKE '%x%'
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;   -- thống kê truy vấn
CREATE EXTENSION IF NOT EXISTS vector;               -- pgvector

SELECT * FROM pg_available_extensions ORDER BY name;
```

`pg_stat_statements` nên **bật ở mọi môi trường production** ngay từ ngày đầu. Nó là công cụ tìm truy vấn chậm hữu ích nhất, và nếu chỉ bật khi đã có sự cố thì bạn không có dữ liệu của giai đoạn trước đó để so sánh.

## So sánh

Khi nào Postgres **không** phải lựa chọn đúng:

```text
· Tìm kiếm là nghiệp vụ chính, cần xếp hạng phức tạp   → Elasticsearch
· Ghi hàng triệu điểm dữ liệu mỗi giây                  → hệ chuỗi thời gian chuyên dụng
· Cache cần độ trễ dưới 1ms và cấu trúc dữ liệu phong phú → Redis
· Cần mở rộng ghi ngang trên hàng chục máy               → hệ phân tán
```

Nguyên tắc: **bắt đầu bằng Postgres, tách ra khi có số đo chứng minh cần tách.** Thêm một hệ thống là thêm một thứ phải giám sát, sao lưu, nâng cấp và đồng bộ — chi phí đó thường lớn hơn người ta ước lượng.

## Dễ nhầm

**1. Pool `max` quá lớn.** 200 kết nối làm máy chủ hết RAM và **chậm hơn** 20 kết nối.

**2. Không tính tổng kết nối của nhiều instance.** Xem phép tính ở trên.

**3. Dùng pool trong môi trường serverless.** Kết nối cạn kiệt sau vài phút tải cao.

**4. Thiếu `sslmode=require`.** Dữ liệu và mật khẩu truyền dạng rõ.

**5. Không bật `pg_stat_statements`.** Khi hệ thống chậm, bạn không biết truy vấn nào là thủ phạm.

**6. Thêm Redis/Elasticsearch quá sớm.** Bạn nhận thêm một hệ thống phải vận hành, thêm một nguồn dữ liệu phải giữ đồng bộ, để giải một vấn đề chưa xảy ra.

**7. Không đặt `connectionTimeoutMillis`.** Khi pool cạn, request treo vô hạn thay vì lỗi nhanh — và bạn không biết nguyên nhân nghẽn nằm ở đâu.

## Mẹo nhớ

> **Dao đa năng ở mức 80% — đủ cho hầu hết việc, và chỉ phải mài một lưỡi.**
>
> **Mỗi kết nối là một TIẾN TRÌNH: pool nhỏ hơn bạn nghĩ.**
>
> **Nhiều instance ⇒ cần PgBouncer.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Điểm mạnh lớn nhất của Postgres — và nó **không** phải điều gì?
2. Vì sao tăng pool `max` lên 200 thường làm hệ thống chậm đi?
3. Phép tính nào hay bị quên khi có nhiều instance ứng dụng?
4. Vì sao pool trong ứng dụng vô dụng ở môi trường serverless?
5. Ba tình huống nên tách ra khỏi Postgres sang hệ chuyên dụng?

## Tự viết lại

Không nhìn lại phần trên, tính toán và đề xuất cấu hình:

```text
Ứng dụng chạy 6 instance trên máy 4 nhân, Postgres có max_connections = 100.
Mỗi request cần khoảng 15ms thời gian truy vấn.
```

Tự kiểm: `max` của bạn là bao nhiêu, tổng kết nối là bao nhiêu, và bạn có cần PgBouncer không?

## Thử sức

Ứng dụng của bạn báo lỗi `remaining connection slots are reserved` vào giờ cao điểm. Bạn tăng `max_connections` từ 100 lên 500, và hệ thống **chậm hơn**.

Giải thích vì sao. Rồi nêu **ba** cách sửa đúng, xếp theo thứ tự nên thử — và nói rõ cách nào không cần đổi một dòng code nào.
