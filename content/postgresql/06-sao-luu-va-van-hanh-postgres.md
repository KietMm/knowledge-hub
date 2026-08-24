---
title: Sao lưu và vận hành PostgreSQL
slug: sao-luu-va-van-hanh-postgres
summary: pg_dump và WAL archiving, VACUUM, replica, và các tham số cấu hình nên chỉnh.
level: nang-cao
tags: [postgresql, sao-luu, van-hanh]
---

> **Sau bài này bạn sẽ:** chọn được chiến lược sao lưu theo RPO thực tế, và biết chỉnh những tham số ảnh hưởng nhiều nhất.

## Hai loại sao lưu

**Logic (`pg_dump`)** — xuất ra câu lệnh SQL hoặc file nén:

```bash
pg_dump -Fc "$DATABASE_URL" > sao-luu.dump          # định dạng custom, nén sẵn
pg_dump -Fc --schema-only "$DATABASE_URL" > schema.dump
pg_dump -Fc -t don_hang "$DATABASE_URL" > don_hang.dump

pg_restore -d "$DATABASE_URL" --clean --if-exists sao-luu.dump
pg_restore -d "$DATABASE_URL" -t don_hang sao-luu.dump   # chỉ một bảng
pg_restore --jobs=4 -d "$DATABASE_URL" sao-luu.dump      # song song, nhanh hơn
```

Ưu: nhỏ gọn, khôi phục được từng bảng, chuyển được giữa các phiên bản Postgres khác nhau.
Nhược: chậm với dữ liệu lớn, và chỉ khôi phục được về **thời điểm sao lưu**.

**Vật lý (`pg_basebackup` + WAL)** — sao chép file dữ liệu kèm nhật ký ghi:

```bash
pg_basebackup -D /sao-luu/base -Fp -Xs -P
```

Ưu: khôi phục về **bất kỳ thời điểm** (point-in-time recovery), nhanh với dữ liệu lớn.
Nhược: phụ thuộc phiên bản và kiến trúc, không chọn được từng bảng.

## Chọn theo RPO

| RPO (mất tối đa) | Chiến lược |
|---|---|
| 24 giờ | `pg_dump` hằng ngày |
| 1 giờ | `pg_dump` mỗi giờ, hoặc WAL archiving |
| Vài phút | WAL archiving liên tục |
| Gần như không | Streaming replication đồng bộ |

Công cụ nên dùng cho production: **pgBackRest** hoặc **WAL-G**. Chúng lo nén, mã hoá, sao lưu tăng dần, kiểm tra tính toàn vẹn, và xoá bản cũ theo chính sách — những thứ script tự viết luôn thiếu một vài phần.

## Diễn tập khôi phục

**Bản sao lưu chưa từng thử khôi phục thì chưa phải bản sao lưu.**

Quy trình nên chạy mỗi quý:

1. Tải bản sao lưu mới nhất về môi trường riêng.
2. Khôi phục, đo **thời gian thật** mất bao lâu.
3. Chạy kiểm tra: đếm dòng các bảng chính, kiểm tra vài bản ghi cụ thể.
4. Ghi lại RTO thật và so với mục tiêu.

Những vấn đề chỉ phát hiện được khi diễn tập: thiếu extension trên máy đích, phiên bản không tương thích, khôi phục mất 6 giờ chứ không phải 30 phút, hoặc bản sao lưu thiếu một schema.

## VACUUM

MVCC để lại phiên bản dòng cũ (dead tuple). `VACUUM` dọn chúng.

```sql
VACUUM ANALYZE ten_bang;      -- dọn + cập nhật thống kê
VACUUM FULL ten_bang;         -- viết lại bảng, KHOÁ ĐỘC QUYỀN — tránh ở production
```

`autovacuum` chạy tự động, nhưng ngưỡng mặc định quá cao cho bảng lớn: mặc định chờ tới khi 20% số dòng là dead. Với bảng 100 triệu dòng, đó là 20 triệu dead tuple trước khi bắt đầu dọn.

```sql
-- Bảng cập nhật nhiều: dọn thường xuyên hơn
ALTER TABLE don_hang SET (
  autovacuum_vacuum_scale_factor = 0.02,   -- 2% thay vì 20%
  autovacuum_analyze_scale_factor = 0.01
);
```

Cần viết lại bảng phình mà không khoá? Dùng `pg_repack` thay cho `VACUUM FULL`.

## Replica

```
# Trên máy chính: postgresql.conf
wal_level = replica
max_wal_senders = 10
```

```bash
# Dựng replica
pg_basebackup -h may-chinh -D /var/lib/postgresql/data -U replicator -Fp -Xs -P -R
```

```sql
-- Kiểm tra độ trễ replica
SELECT now() - pg_last_xact_replay_timestamp() AS do_tre;
```

Replica dùng cho: đọc song song (báo cáo, phân tích), dự phòng khi máy chính chết, và sao lưu mà không ảnh hưởng máy chính.

Lưu ý: replica bất đồng bộ **có độ trễ**. Ghi vào máy chính rồi đọc ngay từ replica có thể không thấy dữ liệu mới — luồng "ghi rồi hiển thị lại" phải đọc từ máy chính.

## Tham số nên chỉnh

Mặc định của Postgres rất thận trọng, dành cho máy nhỏ. Với máy 8GB RAM:

```
shared_buffers = 2GB              # ~25% RAM
effective_cache_size = 6GB        # ~75% RAM — chỉ là gợi ý cho trình tối ưu
work_mem = 32MB                   # cho MỖI thao tác sort/hash
maintenance_work_mem = 512MB      # cho VACUUM, CREATE INDEX
max_connections = 100
random_page_cost = 1.1            # SSD: giảm từ 4.0 xuống
effective_io_concurrency = 200    # SSD
wal_compression = on
```

`random_page_cost = 1.1` là một trong những thay đổi có tác động lớn nhất trên SSD: mặc định 4.0 giả định ổ đĩa cơ, khiến trình tối ưu ngại dùng index.

Cẩn thận với `work_mem`: nó áp dụng cho **mỗi thao tác** trong **mỗi kết nối**. `work_mem = 256MB` với 100 kết nối, mỗi truy vấn có 3 thao tác sort là 75GB — máy chủ sẽ hết bộ nhớ.

Dùng [pgtune](https://pgtune.leopard.in.ua) làm điểm khởi đầu, rồi đo và điều chỉnh.

## Theo dõi hằng ngày

```sql
-- Kích thước database và bảng
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Tỷ lệ cache hit — nên trên 99%
SELECT round(sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0), 2) AS ty_le_cache
FROM pg_stat_database;

-- Kết nối theo trạng thái
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

Tỷ lệ cache hit dưới 95% nghĩa là dữ liệu nóng không nằm trong RAM — tăng `shared_buffers` hoặc thêm RAM.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Chưa từng thử khôi phục | Phát hiện vấn đề lúc khủng hoảng | Diễn tập hàng quý |
| `VACUUM FULL` trên production | Khoá bảng độc quyền | `pg_repack` |
| `work_mem` quá lớn | Hết bộ nhớ khi nhiều kết nối | Tính theo số kết nối × số thao tác |
| Ngưỡng autovacuum mặc định cho bảng lớn | Bloat tích tụ, chậm dần | Giảm `scale_factor` |
| Đọc từ replica ngay sau khi ghi | Không thấy dữ liệu mới | Đọc từ máy chính cho luồng đó |

## Ghi nhớ

- `pg_dump` cho linh hoạt; WAL archiving cho RPO ngắn.
- Diễn tập khôi phục là phần bắt buộc của quy trình sao lưu.
- `random_page_cost = 1.1` cho SSD — thay đổi nhỏ, tác động lớn.
- `work_mem` nhân với số kết nối và số thao tác.

## Tự kiểm tra

1. RPO 5 phút — `pg_dump` hằng ngày có đáp ứng được không? Cần gì?
2. Vì sao `work_mem = 256MB` có thể làm máy chủ hết bộ nhớ?
3. Ba vấn đề chỉ phát hiện được khi diễn tập khôi phục?
