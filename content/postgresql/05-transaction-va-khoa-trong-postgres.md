---
title: Transaction và khoá trong Postgres
slug: transaction-va-khoa-trong-postgres
summary: MVCC, các loại khoá, SKIP LOCKED cho hàng đợi, và cách tìm nguyên nhân nghẽn.
level: nang-cao
tags: [postgresql, transaction, khoa, mvcc]
khung: v2
---

> **Sau bài này bạn sẽ:** hiểu vì sao "đọc không bao giờ chặn ghi" trong Postgres, và tìm được thủ phạm khi hệ thống nghẽn vì khoá.

## Ý tưởng chính

Postgres không dùng khoá cho việc **đọc**. Nó dùng **MVCC** — mỗi transaction nhìn thấy một *ảnh chụp* của dữ liệu tại thời điểm nó bắt đầu.

Từ đó ra một tính chất định hình toàn bộ cách Postgres hành xử: **đọc không bao giờ chặn ghi, ghi không bao giờ chặn đọc**.

## Mental model

Hãy nghĩ tới **một cuốn sổ mà mỗi lần sửa là viết thêm dòng mới, không xoá dòng cũ**.

```text
Sửa số dư từ 100 → 70:

dòng cũ:  so_du = 100   [hiệu lực: từ giao dịch #5 đến #12]   ← vẫn còn đó
dòng mới: so_du =  70   [hiệu lực: từ giao dịch #12 trở đi]
```

> Ai bắt đầu đọc **trước** giao dịch #12 vẫn thấy 100 — họ đọc dòng cũ, và **không phải chờ ai cả**.
>
> Đổi lại: cuốn sổ **phình ra**, đầy dòng không ai còn đọc nữa. Phải có người đi gạch bỏ chúng — đó là `VACUUM`.

Hai hệ quả quan trọng của mô hình này: **đọc không chờ**, và **`UPDATE` thực chất là ghi dòng mới** — nên nó tốn chỗ hơn bạn tưởng.

## Ví dụ nhỏ

```sql
-- Phiên A                          -- Phiên B
BEGIN;
SELECT so_du FROM tk WHERE id=1;    -- 100
                                    UPDATE tk SET so_du=70 WHERE id=1;
                                    COMMIT;
SELECT so_du FROM tk WHERE id=1;    -- vẫn 100 nếu REPEATABLE READ
                                    -- 70 nếu READ COMMITTED (mặc định)
COMMIT;
```

## Code chạy thế nào

**Các loại khoá dòng**, từ nhẹ tới nặng:

```sql
SELECT ... FOR KEY SHARE     -- nhẹ nhất: chặn xoá và đổi khoá
SELECT ... FOR SHARE         -- chặn mọi thay đổi, cho phép người khác cùng đọc-khoá
SELECT ... FOR NO KEY UPDATE -- khoá tự động khi UPDATE cột thường
SELECT ... FOR UPDATE        -- nặng nhất: độc quyền dòng
```

```sql
SELECT ... FOR UPDATE NOWAIT;        -- lỗi NGAY nếu dòng đang bị khoá
SELECT ... FOR UPDATE SKIP LOCKED;   -- BỎ QUA dòng đang bị khoá
```

**`SKIP LOCKED` cho hàng đợi công việc** — đây là ứng dụng giá trị nhất:

```sql
BEGIN;
  SELECT * FROM cong_viec
  WHERE trang_thai = 'cho'
  ORDER BY tao_luc
  LIMIT 10
  FOR UPDATE SKIP LOCKED;        -- ← worker khác lấy 10 việc KHÁC, không ai chờ

  UPDATE cong_viec SET trang_thai = 'dang_xu_ly' WHERE id = ANY($1);
COMMIT;
```

```text
Không có SKIP LOCKED:
  worker 1 khoá 10 việc đầu
  worker 2..5 CHỜ           ← toàn bộ hệ thống thành tuần tự

Có SKIP LOCKED:
  worker 1 lấy việc 1-10
  worker 2 lấy việc 11-20   ← bỏ qua dòng đang bị khoá
  ⇒ 5 worker chạy song song thật
```

Đây là lý do Postgres thay được RabbitMQ cho hàng đợi vừa và nhỏ: bạn có hàng đợi **trong cùng transaction với dữ liệu nghiệp vụ** — không có bài toán đồng bộ giữa hai hệ thống.

## Cú pháp

**Advisory lock** — khoá theo một con số bạn tự đặt, không gắn với dòng nào:

```sql
SELECT pg_advisory_lock(12345);        -- giữ tới khi nhả hoặc hết phiên
SELECT pg_try_advisory_lock(12345);    -- trả false ngay nếu không lấy được
SELECT pg_advisory_unlock(12345);

-- Tự nhả khi kết thúc transaction — thường an toàn hơn
SELECT pg_advisory_xact_lock(12345);
```

Dùng cho: **bảo đảm chỉ một instance chạy một job**.

```ts
// Chỉ một instance chạy job dọn dẹp, dù có 6 instance đang chạy
const { rows } = await db.query('SELECT pg_try_advisory_lock($1) AS co', [90001])
if (rows[0].co) { await donDep() }
```

Không có nó, sáu instance cùng chạy job đêm, và bạn có sáu bản email gửi cho mỗi khách.

## Tại sao cần nó

Vì khi hệ thống nghẽn vì khoá, bạn cần **tìm ra thủ phạm trong vài phút**, không phải vài giờ:

```sql
-- Ai đang chờ ai
SELECT
  bi_chan.pid        AS pid_bi_chan,
  bi_chan.query      AS truy_van_bi_chan,
  chan.pid           AS pid_gay_chan,
  chan.query         AS truy_van_gay_chan,
  now() - chan.query_start AS chan_bao_lau
FROM pg_stat_activity bi_chan
JOIN pg_stat_activity chan ON chan.pid = ANY(pg_blocking_pids(bi_chan.pid))
WHERE cardinality(pg_blocking_pids(bi_chan.pid)) > 0;
```

```sql
-- Transaction mở lâu bất thường — thủ phạm phổ biến nhất
SELECT pid, state, now() - xact_start AS mo_bao_lau, query
FROM pg_stat_activity
WHERE state <> 'idle' AND xact_start < now() - interval '1 minute'
ORDER BY xact_start;

-- Dừng khẩn cấp
SELECT pg_cancel_backend(pid);     -- huỷ truy vấn, lịch sự
SELECT pg_terminate_backend(pid);  -- ngắt cả kết nối
```

Trạng thái `idle in transaction` là dấu hiệu nguy hiểm nhất: ứng dụng đã `BEGIN` rồi **quên `COMMIT`** — nó giữ khoá và chặn `VACUUM` vô thời hạn.

**Timeout — nên đặt ở mọi nơi:**

```sql
-- Ở cấp cơ sở dữ liệu
ALTER DATABASE app SET statement_timeout = '30s';
ALTER DATABASE app SET lock_timeout = '5s';
ALTER DATABASE app SET idle_in_transaction_session_timeout = '60s';
```

Ba tham số này là **lưới an toàn**: chúng biến một truy vấn treo vô hạn thành một lỗi nhanh mà bạn nhìn thấy trong log. Không có chúng, một truy vấn hỏng có thể giữ khoá cả tiếng.

## So sánh

| Tình huống | Công cụ |
|---|---|
| Trừ tồn kho | `UPDATE ... WHERE ton >= n` — [[truy-cap-dong-thoi-va-khoa]] |
| Đặt chỗ, tranh chấp cao | `FOR UPDATE` |
| Hàng đợi nhiều worker | `FOR UPDATE SKIP LOCKED` |
| Chỉ một instance chạy job | `pg_try_advisory_lock` |
| Chặn trùng lịch đặt phòng | Ràng buộc `EXCLUDE` — [[index-trong-postgresql]] |

**Nguyên tắc:**

```text
· Transaction NGẮN — không gọi API, không chờ I/O bên trong
· Khoá theo THỨ TỰ CỐ ĐỊNH (id tăng dần) — chống deadlock
· Đặt timeout ở mọi cấp
· Đọc thuần thì không cần transaction
```

## Dễ nhầm

**1. `idle in transaction` do quên `COMMIT`.** Giữ khoá, chặn `VACUUM`, và làm bảng phình ra.

**2. Gọi API bên ngoài trong transaction.** Khoá dòng suốt thời gian chờ mạng.

**3. Không đặt `statement_timeout`.** Một truy vấn hỏng chạy mãi và kéo cả hệ thống.

**4. Tưởng `UPDATE` sửa tại chỗ.** Nó ghi **dòng mới** và đánh dấu dòng cũ là chết — nên cập nhật hàng loạt làm bảng phình gấp đôi cho tới khi `VACUUM` chạy.

**5. Dùng advisory lock mà quên nhả.** `pg_advisory_lock` giữ tới hết **phiên**; dùng `pg_advisory_xact_lock` an toàn hơn vì nó tự nhả khi transaction kết thúc.

**6. Khoá theo thứ tự khác nhau ở các chỗ khác nhau.** Deadlock ngẫu nhiên.

**7. Dùng `LOCK TABLE`.** Gần như không bao giờ cần, và nó chặn toàn bộ bảng.

## Mẹo nhớ

> **MVCC là cuốn sổ chỉ viết thêm — đọc không chờ, nhưng sổ phình ra và cần `VACUUM`.**
>
> **`SKIP LOCKED` biến Postgres thành hàng đợi công việc thật.**
>
> **`idle in transaction` là dấu hiệu nguy hiểm nhất trong `pg_stat_activity`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. MVCC làm gì, và hai hệ quả của nó là gì?
2. Vì sao `UPDATE` trong Postgres tốn chỗ hơn bạn tưởng?
3. `SKIP LOCKED` giải quyết vấn đề gì cho hàng đợi nhiều worker?
4. Advisory lock dùng cho tình huống nào mà khoá dòng không giải được?
5. `idle in transaction` nghĩa là gì, và vì sao nguy hiểm?

## Tự viết lại

Không nhìn lại phần trên, viết SQL cho:

```text
a) 5 worker cùng lấy việc từ bảng cong_viec, không ai chờ ai
b) Bảo đảm chỉ một instance chạy job gửi báo cáo hằng đêm
c) Tìm truy vấn đang chặn các truy vấn khác trên production
```

Tự kiểm: câu (b) — bạn dùng `pg_advisory_lock` hay `pg_advisory_xact_lock`, và vì sao?

## Thử sức

Lúc 9 giờ sáng, mọi request tới hệ thống của bạn treo. `pg_stat_activity` cho thấy **40 truy vấn ở trạng thái chờ**, tất cả đều chờ cùng một `pid`.

`pid` đó đang ở trạng thái `idle in transaction`, mở từ 8 giờ 47.

Mô tả **chuyện gì đã xảy ra**, cách xử lý ngay lập tức, và — câu quan trọng nhất — **hai** thay đổi để tình huống này không thể kéo dài 13 phút lần sau.
