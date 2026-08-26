---
title: Sao lưu và vận hành PostgreSQL
slug: sao-luu-va-van-hanh-postgres
summary: pg_dump và WAL archiving, VACUUM, replica, và các tham số cấu hình nên chỉnh.
level: nang-cao
tags: [postgresql, sao-luu, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bản sao lưu của mình cho phép mất tối đa bao nhiêu dữ liệu, và hiểu vì sao `VACUUM` là việc bắt buộc chứ không phải tuỳ chọn.

## Ý tưởng chính

Có hai câu hỏi định hình mọi quyết định về sao lưu, và bạn phải trả lời chúng **bằng con số**:

```text
RPO  (Recovery Point Objective)   Mất tối đa BAO NHIÊU dữ liệu thì chấp nhận được?
RTO  (Recovery Time Objective)    Khôi phục xong trong BAO LÂU thì chấp nhận được?
```

Không trả lời hai câu này thì bạn không biết bản sao lưu hiện tại có đủ hay không — và bạn chỉ phát hiện ra khi cần dùng tới nó.

## Mental model

Hãy nghĩ tới **ảnh chụp** so với **camera quay liên tục**.

> **`pg_dump` là chụp ảnh**: mỗi đêm một tấm. Nếu hỏng lúc 3 giờ chiều, bạn quay về ảnh 2 giờ sáng — **mất 13 tiếng dữ liệu**.
>
> **WAL archiving là camera quay liên tục**: bạn tua lại tới **đúng giây** trước sự cố. Mất vài giây dữ liệu.
>
> Camera tốn dung lượng và phức tạp hơn nhiều. Nhưng nếu 13 tiếng đơn hàng là không chấp nhận được, bạn không có lựa chọn.

Câu hỏi không phải *"cách nào tốt hơn"* mà là ***"mất bao nhiêu dữ liệu thì doanh nghiệp chịu được"*** — và đó là câu hỏi cho người quản lý, không phải cho kỹ thuật.

## Ví dụ nhỏ

```bash
# Sao lưu logic — di động, chọn được từng bảng
pg_dump -Fc -d app > app.dump
pg_restore -d app_moi app.dump

# Chỉ một bảng
pg_dump -Fc -t don_hang -d app > don_hang.dump
```

## Code chạy thế nào

Hai loại sao lưu và điểm khác nhau cốt lõi:

```text
LOGIC (pg_dump)
  · Xuất ra câu lệnh SQL / định dạng nén
  · Khôi phục sang PHIÊN BẢN KHÁC, MÁY KHÁC, kiến trúc khác  ✅
  · Chọn được từng bảng, từng schema                          ✅
  · CHẬM với cơ sở dữ liệu lớn (hàng giờ cho vài trăm GB)     ❌
  · Chỉ khôi phục về ĐÚNG thời điểm chụp                       ❌

VẬT LÝ (pg_basebackup + WAL)
  · Sao chép file dữ liệu thật + nhật ký thay đổi
  · Khôi phục nhanh, kể cả cơ sở dữ liệu rất lớn              ✅
  · Khôi phục về BẤT KỲ THỜI ĐIỂM nào (point-in-time)         ✅
  · Chỉ dùng được với CÙNG phiên bản Postgres                  ❌
  · Phức tạp hơn để thiết lập                                  ❌
```

```bash
pg_basebackup -D /backup/base -Fp -Xs -P
# postgresql.conf:
#   archive_mode = on
#   archive_command = 'cp %p /backup/wal/%f'
```

Với point-in-time recovery, bạn nói: *"khôi phục về 14:29:30, ngay trước khi ai đó chạy `DELETE` nhầm"* — và đó là thứ `pg_dump` không bao giờ làm được.

## Cú pháp

**`VACUUM` — hệ quả trực tiếp của MVCC:**

```text
UPDATE không sửa tại chỗ — nó ghi dòng MỚI và đánh dấu dòng cũ là "chết"
⇒ bảng phình ra theo số lần cập nhật
⇒ VACUUM đi dọn dòng chết, trả lại chỗ cho dòng mới
```

```sql
VACUUM don_hang;             -- dọn dòng chết, trả chỗ cho chính bảng đó
VACUUM ANALYZE don_hang;     -- dọn + cập nhật thống kê cho bộ tối ưu
VACUUM FULL don_hang;        -- ⚠️ viết lại cả bảng, KHOÁ HOÀN TOÀN — tránh
```

Autovacuum chạy tự động, nhưng với bảng cập nhật rất nhiều, mặc định thường **quá thưa**:

```sql
ALTER TABLE don_hang SET (
  autovacuum_vacuum_scale_factor = 0.05,   -- chạy khi 5% dòng chết (mặc định 20%)
  autovacuum_analyze_scale_factor = 0.02
);
```

Kiểm tra bảng phình:

```sql
SELECT relname,
       n_dead_tup AS dong_chet,
       last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

`n_dead_tup` lớn và `last_autovacuum` cũ là dấu hiệu: hoặc autovacuum chưa đủ mạnh, hoặc có một transaction mở lâu đang **chặn** nó ([[transaction-va-khoa-trong-postgres]]).

## Tại sao cần nó

Vì **replica** giải quyết ba việc cùng lúc, và cấu hình sai một tham số thì bạn mất một trong ba:

```text
① Dự phòng khi máy chính chết
② Chia tải đọc (báo cáo, dashboard)
③ Chạy truy vấn nặng mà không ảnh hưởng người dùng
```

```bash
# Trên máy chính: postgresql.conf
wal_level = replica
max_wal_senders = 10

# Tạo replica
pg_basebackup -h primary -D /var/lib/postgresql/data -U replicator -R
```

```sql
-- Kiểm độ trễ sao chép — chỉ số cần giám sát
SELECT client_addr, state,
       pg_wal_lsn_diff(sent_lsn, replay_lsn) AS tre_byte
FROM pg_stat_replication;
```

Điểm phải nhớ: **sao chép là bất đồng bộ**. Ghi vào máy chính rồi đọc ngay từ replica có thể **chưa thấy dữ liệu mới**. Với luồng đọc-sau-ghi (người dùng lưu xong, trang tải lại), luôn đọc từ máy chính.

**Tham số nên chỉnh** — mặc định của Postgres rất bảo thủ:

```conf
shared_buffers = 25% RAM              # bộ đệm của Postgres
effective_cache_size = 75% RAM        # gợi ý cho bộ tối ưu, không cấp phát thật
work_mem = 16MB                       # cho MỖI thao tác sắp xếp/băm
maintenance_work_mem = 512MB          # cho VACUUM, CREATE INDEX
max_connections = 100                 # nhỏ + PgBouncer
random_page_cost = 1.1                # SSD (mặc định 4.0 là cho ổ cứng quay)
```

`random_page_cost` đáng chú ý: mặc định `4.0` giả định ổ đĩa cơ, nên bộ tối ưu **ngại dùng index**. Trên SSD, để `1.1` là một trong những thay đổi một dòng có tác dụng lớn nhất.

`work_mem` là bẫy: nó áp dụng cho **mỗi thao tác**, không phải mỗi truy vấn. `work_mem = 256MB` với 50 kết nối, mỗi truy vấn 3 thao tác sắp xếp ⇒ có thể tiêu 37 GB RAM.

## So sánh

| RPO cần | Cách sao lưu |
|---|---|
| Mất 24 giờ chấp nhận được | `pg_dump` hằng đêm |
| Mất 1 giờ | `pg_dump` + WAL archiving |
| Mất vài giây | WAL archiving liên tục + replica |
| Không được mất gì | Sao chép đồng bộ (chậm hơn khi ghi) |

**Và điều quan trọng nhất của cả bài:**

> **Một bản sao lưu chưa từng phục hồi thử thì chưa phải bản sao lưu.**

```bash
# Diễn tập định kỳ, ít nhất mỗi quý
pg_restore -d app_test app.dump
psql -d app_test -c "SELECT count(*) FROM don_hang;"
```

Ghi lại **mất bao lâu** — đó chính là RTO thật của bạn, không phải con số trong tài liệu. Rất nhiều đội phát hiện bản sao lưu hỏng, thiếu bảng, hoặc mất 6 tiếng để khôi phục — đúng vào lúc đang có sự cố.

## Dễ nhầm

**1. Không bao giờ thử khôi phục.** Lỗi nghiêm trọng nhất trong bài.

**2. Sao lưu để cùng máy chủ.** Máy chết là mất cả hai. Sao lưu phải ở **nơi khác**.

**3. Không mã hoá bản sao lưu.** File dump chứa toàn bộ dữ liệu người dùng ở dạng rõ.

**4. `VACUUM FULL` trên production.** Khoá bảng hoàn toàn suốt thời gian chạy.

**5. Bỏ qua bảng phình.** Bảng cập nhật nhiều có thể phình gấp 5 lần và mọi truy vấn chậm theo.

**6. Đọc-sau-ghi từ replica.** Người dùng lưu xong, tải lại trang, và thấy dữ liệu cũ.

**7. `work_mem` quá lớn.** Xem phép tính ở trên — hết RAM ở giờ cao điểm.

**8. Giữ mặc định `random_page_cost = 4.0` trên SSD.** Bộ tối ưu bỏ qua index và chọn quét tuần tự.

## Mẹo nhớ

> **`pg_dump` là chụp ảnh; WAL là camera quay liên tục.**
>
> **Bản sao lưu chưa phục hồi thử thì chưa tồn tại.**
>
> **`VACUUM` không phải tuỳ chọn — nó là hệ quả bắt buộc của MVCC.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. RPO và RTO là gì, và ai trả lời hai câu hỏi đó?
2. `pg_dump` và sao lưu vật lý khác nhau ở bốn điểm nào?
3. Vì sao `VACUUM` là bắt buộc trong Postgres?
4. Vì sao không được đọc-sau-ghi từ replica?
5. Vì sao `work_mem` lớn lại nguy hiểm — nêu phép tính?

## Tự viết lại

Không nhìn lại phần trên, thiết kế chiến lược sao lưu cho:

```text
Sàn thương mại điện tử, 200 GB dữ liệu, 5000 đơn/ngày.
Mất một đơn hàng là mất tiền và mất uy tín.
Ngân sách hạ tầng có hạn.
```

Tự kiểm: RPO bạn đặt là bao nhiêu, và bạn **chứng minh** hệ thống đạt được nó bằng cách nào?

## Thử sức

Lúc 14:30, một script chạy nhầm và `DELETE` mất 40.000 dòng của bảng `don_hang`. Bạn có `pg_dump` hằng đêm lúc 2 giờ sáng và WAL archiving đang bật.

Lập kế hoạch khôi phục **chỉ 40.000 dòng đó** mà không mất 12 tiếng dữ liệu còn lại. Gợi ý: bạn không khôi phục đè lên cơ sở dữ liệu đang chạy. Ba bước của bạn là gì?
