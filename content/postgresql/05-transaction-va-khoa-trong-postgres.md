---
title: Transaction và khoá trong Postgres
slug: transaction-va-khoa-trong-postgres
summary: MVCC, các loại khoá, SKIP LOCKED cho hàng đợi, và cách tìm nguyên nhân nghẽn.
level: nang-cao
tags: [postgresql, transaction, khoa, mvcc]
---

> **Sau bài này bạn sẽ:** hiểu vì sao đọc không bao giờ chặn ghi trong Postgres, và dùng `SKIP LOCKED` để làm hàng đợi công việc.

## MVCC

Postgres dùng **Multi-Version Concurrency Control**: mỗi lần `UPDATE` tạo ra một **phiên bản mới** của dòng thay vì sửa tại chỗ. Phiên bản cũ vẫn còn cho các transaction đang đọc.

Hệ quả quan trọng: **đọc không bao giờ chặn ghi, ghi không bao giờ chặn đọc.**

Đổi lại có hai chi phí:

1. **Bloat** — phiên bản cũ chiếm chỗ tới khi `VACUUM` dọn. Bảng cập nhật nhiều có thể phình lớn hơn dữ liệu thật.
2. **Transaction dài giữ phiên bản cũ** — một transaction mở nhiều giờ ngăn `VACUUM` dọn dẹp, làm bảng phình và truy vấn chậm dần.

```sql
-- Xem mức bloat và lần VACUUM/ANALYZE gần nhất
SELECT relname, n_live_tup, n_dead_tup,
       round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS pct_chet,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

## Các loại khoá dòng

```sql
SELECT * FROM ve WHERE id = 1 FOR UPDATE;        -- khoá độc quyền, ai cũng phải chờ
SELECT * FROM ve WHERE id = 1 FOR NO KEY UPDATE; -- nhẹ hơn, cho phép tham chiếu FK
SELECT * FROM ve WHERE id = 1 FOR SHARE;         -- nhiều người đọc-khoá cùng lúc được
SELECT * FROM ve WHERE id = 1 FOR UPDATE NOWAIT; -- lỗi ngay nếu đang bị khoá
SELECT * FROM ve WHERE id = 1 FOR UPDATE SKIP LOCKED;  -- bỏ qua dòng đang bị khoá
```

`NOWAIT` hữu ích cho giao diện tương tác: thà báo "đang có người sửa, thử lại" hơn là để người dùng chờ vô định.

## Hàng đợi công việc bằng SKIP LOCKED

Đây là một trong những tính năng đáng giá nhất của Postgres — nó thay được một hệ thống hàng đợi riêng:

```sql
-- Nhiều worker chạy đồng thời, mỗi cái lấy công việc KHÁC nhau
WITH cong_viec AS (
  SELECT id FROM hang_doi
  WHERE trang_thai = 'cho' AND chay_sau <= now()
  ORDER BY uu_tien DESC, id
  LIMIT 10
  FOR UPDATE SKIP LOCKED          -- bỏ qua dòng worker khác đang giữ
)
UPDATE hang_doi h
SET trang_thai = 'dang_chay', bat_dau_luc = now()
FROM cong_viec c
WHERE h.id = c.id
RETURNING h.*;
```

Không có `SKIP LOCKED`, mọi worker sẽ xếp hàng chờ cùng những dòng đầu tiên và bạn mất hết lợi ích của việc chạy song song.

Bảng hàng đợi nên có: `so_lan_thu`, `loi_cuoi`, `chay_sau` (cho retry có độ trễ tăng dần), và một index từng phần trên `WHERE trang_thai = 'cho'`.

## Advisory lock

Khoá theo một con số bạn tự chọn, không gắn với dòng nào:

```sql
-- Đảm bảo chỉ một tiến trình chạy job này trên toàn hệ thống
SELECT pg_try_advisory_lock(12345);      -- true nếu lấy được
-- ... làm việc ...
SELECT pg_advisory_unlock(12345);

-- Bản tự nhả khi transaction kết thúc — an toàn hơn
SELECT pg_advisory_xact_lock(12345);
```

Dùng cho: chống chạy trùng cron job khi có nhiều instance, migration, và các thao tác cần độc quyền toàn cục.

Ưu tiên bản `_xact_`: nó tự nhả khi transaction kết thúc, nên tiến trình chết đột ngột không để lại khoá treo.

## Tìm nguyên nhân nghẽn

```sql
-- Ai đang chờ ai
SELECT
  cho.pid AS pid_cho, cho.query AS truy_van_cho,
  giu.pid AS pid_giu, giu.query AS truy_van_giu,
  now() - giu.query_start AS giu_bao_lau
FROM pg_stat_activity cho
JOIN pg_stat_activity giu ON giu.pid = ANY(pg_blocking_pids(cho.pid))
WHERE cardinality(pg_blocking_pids(cho.pid)) > 0;

-- Transaction mở lâu — thủ phạm phổ biến nhất
SELECT pid, state, now() - xact_start AS mo_bao_lau, left(query, 80)
FROM pg_stat_activity
WHERE xact_start IS NOT NULL AND now() - xact_start > interval '1 minute'
ORDER BY xact_start;

-- Biện pháp cuối
SELECT pg_cancel_backend(pid);      -- huỷ truy vấn, giữ kết nối
SELECT pg_terminate_backend(pid);   -- ngắt hẳn kết nối
```

`pg_blocking_pids()` là hàm quan trọng nhất trong bài này — nó trả lời trực tiếp câu hỏi "cái gì đang chặn cái gì".

Nhiều dòng `idle in transaction` nghĩa là ứng dụng mở transaction rồi quên `COMMIT` — thường do một lỗi trong xử lý ngoại lệ.

## Timeout — nên đặt ở mọi nơi

```sql
-- Ở cấp phiên hoặc trong chuỗi kết nối
SET statement_timeout = '30s';         -- huỷ truy vấn quá lâu
SET lock_timeout = '5s';               -- không chờ khoá quá 5 giây
SET idle_in_transaction_session_timeout = '60s';  -- ngắt transaction bị bỏ quên
```

Ba tham số này biến những sự cố "hệ thống đứng im" thành những lỗi cụ thể xuất hiện trong log — dễ chẩn đoán hơn rất nhiều.

## Nguyên tắc

- Transaction **ngắn**: mở muộn, đóng sớm.
- **Không** gọi API bên ngoài trong transaction.
- Khoá theo **thứ tự nhất quán** (id tăng dần) để tránh deadlock.
- Thao tác đọc thuần thì không cần transaction.
- Luôn có `statement_timeout` ở production.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Transaction mở dài | Ngăn VACUUM, bảng phình, chậm dần | Giữ transaction ngắn |
| Gọi HTTP trong transaction | Giữ khoá suốt thời gian chờ mạng | Gọi bên ngoài |
| Hàng đợi không `SKIP LOCKED` | Worker xếp hàng, mất tính song song | Thêm `SKIP LOCKED` |
| Không có `statement_timeout` | Một truy vấn treo cả hệ thống | Đặt ở chuỗi kết nối |
| Khoá theo thứ tự khác nhau | Deadlock | Luôn theo id tăng dần |

## Ghi nhớ

- MVCC: đọc không chặn ghi — đổi lại là bloat và VACUUM.
- `SKIP LOCKED` biến một bảng thành hàng đợi công việc dùng được thật.
- `pg_blocking_pids()` trả lời "ai đang chặn ai".
- `statement_timeout` + `lock_timeout` nên có ở mọi production.

## Tự kiểm tra

1. Vì sao transaction mở một giờ lại làm truy vấn trên bảng khác chậm đi?
2. `SKIP LOCKED` giải quyết vấn đề gì với nhiều worker?
3. Vì sao nên dùng `pg_advisory_xact_lock` thay vì `pg_advisory_lock`?
