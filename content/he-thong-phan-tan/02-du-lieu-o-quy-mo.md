---
title: Dữ liệu ở quy mô
slug: du-lieu-o-quy-mo
summary: Replication, sharding, CAP — và cái giá thật của nhất quán cuối cùng mà người ta ít nói tới.
level: nang-cao
tags: [kien-truc, replication, sharding, nhat-quan]
---

> **Sau bài này bạn sẽ:** biết thứ tự đúng để mở rộng tầng dữ liệu, và những bug mà read replica tạo ra ngay ngày đầu.

## Thứ tự đúng, và nó dài hơn bạn tưởng

Mọi bước sau đều đắt hơn bước trước **một bậc** về độ phức tạp. Đừng nhảy bậc:

1. **Index và sửa truy vấn** — xem [[index-va-hieu-nang-truy-van]], [[doc-explain-analyze]]
2. **Cache** — xem [[cache-nhieu-tang]]
3. **Máy to hơn** — một Postgres trên 32 core / 128GB RAM đi rất xa
4. **Read replica** — 90% tải thường là đọc
5. **Tách theo miền nghiệp vụ** — log/analytics ra database riêng
6. **Phân vùng (partition)** trong cùng một database
7. **Sharding** — cuối cùng, và không có đường quay lại

Phần lớn hệ thống người ta tưởng cần sharding thật ra đang thiếu index ở bước 1. Một bảng 500 triệu dòng có index đúng vẫn trả lời trong vài ms.

## Read replica: hai bug ngày đầu tiên

```
Ghi ──> Primary ──replication──> Replica 1, 2, 3 <── Đọc
                    (trễ 10ms–vài giây)
```

### Bug 1 — Read-after-write

```ts
// Người dùng sửa tên rồi được chuyển sang trang cá nhân
await db.primary.users.update({ where: { id }, data: { name: 'Kiệt' } })
redirect(`/users/${id}`)      // trang này đọc từ replica

// Trang hiện tên CŨ. Người dùng bấm lưu lại. Vẫn cũ. Họ báo bug "không lưu được"
// còn bạn mở database thấy dữ liệu đã đúng.
```

Ba cách sửa, chọn theo tình huống:

```ts
// 1. Đọc từ primary trong một khoảng ngắn sau khi ghi — đơn giản, hiệu quả nhất
cookies().set('vua-ghi', '1', { maxAge: 5 })
const db = cookies().get('vua-ghi') ? primary : replica

// 2. Chờ replica bắt kịp LSN của lệnh ghi vừa rồi (Postgres)
const { lsn } = await primary.query('SELECT pg_current_wal_lsn() AS lsn')
await replica.query(`SELECT pg_wal_replay_wait('${lsn}')`)

// 3. Trả về dữ liệu mình vừa ghi, không đọc lại — thường là cách rẻ nhất
const user = await primary.users.update({ ..., select: { id: true, name: true } })
```

Cách 3 đáng thử trước: nhiều trường hợp bạn **đã có** dữ liệu mới trong tay và việc đọc lại là dư thừa.

### Bug 2 — Monotonic read

Hai request liên tiếp vào hai replica có độ trễ khác nhau → dữ liệu **đi lùi**. Người dùng thấy bình luận vừa đăng, F5, nó biến mất, F5 nữa nó lại có. Sửa bằng cách ghim một người dùng vào một replica trong phạm vi phiên (sticky theo hash `user.id`).

Chỉ đưa lên replica những gì **chịu được dữ liệu cũ**: báo cáo, danh sách công khai, tìm kiếm. Mọi lệnh ghi và mọi lệnh đọc-để-quyết-định phải vào primary.

## CAP: cách đọc đúng

CAP nói: khi mạng bị chia (**P**), phải chọn giữa nhất quán (**C**) và khả dụng (**A**). Điểm hay bị hiểu sai: **P không phải lựa chọn** — mạng sẽ chia, đó là thực tế. Nên CAP thực chất là "khi chia thì chọn C hay A".

Nhưng CAP chỉ nói về lúc *đang có sự cố mạng*. Đánh đổi bạn gặp **mỗi ngày** được **PACELC** mô tả tốt hơn: *khi chia (P) thì chọn A hay C; còn lúc bình thường (E - else) thì chọn độ trễ (L) hay nhất quán (C)*.

Đó chính là read replica: bạn đang chọn **L thay vì C** ở mọi request bình thường, không phải chỉ khi có sự cố. Cái giá không nằm ở lúc hỏng — nó nằm ở mọi ngày.

## Sharding: và những gì bạn mất

Chia dữ liệu theo **shard key** sang nhiều database.

```ts
// Theo hash: phân bố đều, nhưng thêm shard = phải chuyển dữ liệu
const shard = shards[hash(userId) % shards.length]

// Theo dải: thêm shard dễ, nhưng dễ lệch tải (khách hàng lớn dồn vào một shard)
const shard = userId < 'm' ? shardA : shardB

// Theo bảng tra: linh hoạt nhất, và cho phép chuyển từng khách hàng lẻ
const shard = await tra.get(tenantId)
```

Bảng tra là lựa chọn thực dụng nhất cho hệ thống nhiều khách hàng: chuyển một khách hàng lớn sang shard riêng chỉ là đổi một dòng trong bảng tra.

**Chọn shard key là quyết định khó đảo nhất của cả hệ thống.** Chọn sai thì đổi nghĩa là chuyển toàn bộ dữ liệu. Tiêu chí:

- Phải xuất hiện trong **gần như mọi truy vấn** — không có nó thì phải hỏi tất cả shard
- Phân bố đều — `country_code` cho hệ thống Việt Nam là một shard key tồi
- Đủ mịn — shard theo `tenant_id` mà một tenant chiếm 60% dữ liệu thì vô nghĩa

Ba thứ bạn **mất** ngay khi shard:

| Mất | Nghĩa là |
|---|---|
| `JOIN` xuyên shard | Phải gộp ở tầng ứng dụng |
| Transaction ACID xuyên shard | Cần saga hoặc 2PC — cả hai đều phức tạp |
| `COUNT`, `ORDER BY` toàn cục | Phải hỏi mọi shard rồi gộp |
| `UNIQUE` toàn cục | Chỉ unique trong shard; email duy nhất cần bảng riêng |

Dòng cuối là cái bẫy hay gặp: sau khi shard, ràng buộc `UNIQUE(email)` **không còn đảm bảo gì trên toàn hệ thống**.

## Phân vùng: thứ nên thử trước sharding

Partition chia một bảng lớn thành nhiều bảng con **trong cùng một database** — giữ được `JOIN`, transaction, và unique:

```sql
CREATE TABLE events (
  id BIGSERIAL,
  created_at TIMESTAMPTZ NOT NULL,
  payload JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_08 PARTITION OF events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

Hai lợi ích lớn:

- Truy vấn có điều kiện thời gian chỉ đọc đúng phân vùng cần (**partition pruning**)
- Xoá dữ liệu cũ là `DROP TABLE events_2026_01` — **tức thì**, thay vì một `DELETE` chạy hàng giờ và làm phình bảng

Với bảng log/event, partition theo thời gian giải quyết được gần hết vấn đề mà không cần shard. Xem [[xoa-mem-va-vong-doi-ban-ghi]].

## Nhất quán cuối cùng: cái giá ít được nói

Không phải "dữ liệu cũ vài giây" — mà là **mọi logic nghiệp vụ đọc dữ liệu đó phải chịu được sự cũ đó**:

```ts
// Đọc từ replica trễ 2 giây. Người dùng vừa nạp tiền 2 giây trước.
const soDu = await replica.wallets.findUnique({ where: { userId } })
if (soDu.amount < giaTien) throw new KhongDuTien()   // ← SAI, họ vừa nạp
```

Bug này không sửa được bằng cách "chờ lâu hơn". Nó sửa bằng cách **phân loại lại**: số dư là dữ liệu để quyết định, nên nó không bao giờ được đọc từ replica.

Quy tắc rút ra: **dữ liệu để hiển thị thì cũ được; dữ liệu để quyết định thì không.** Cùng một bảng, hai đường đọc khác nhau — giống hệt kết luận ở [[cache-nhieu-tang]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Shard trước khi thêm index | Phức tạp gấp mười, vấn đề gốc còn nguyên | Làm đủ 6 bước trước |
| Đọc lại từ replica sau khi ghi | "Không lưu được" mà dữ liệu vẫn đúng | Đọc primary sau khi ghi, hoặc trả về bản vừa ghi |
| Không ghim replica theo phiên | Dữ liệu đi lùi khi F5 | Sticky theo hash user |
| Đọc dữ liệu quyết định từ replica | Trừ tiền/kho sai | Quyết định luôn đọc primary |
| Shard key không có trong truy vấn | Mọi truy vấn phải hỏi tất cả shard | Chọn khoá có trong mọi truy vấn |
| Tin `UNIQUE` sau khi shard | Trùng email trên toàn hệ thống | Bảng tra unique toàn cục |
| `DELETE` dữ liệu cũ trên bảng lớn | Chạy hàng giờ, bảng phình | Partition + `DROP` |
| Coi nhất quán cuối cùng là "chậm vài giây" | Bug nghiệp vụ, không phải bug hiệu năng | Phân loại hiển thị / quyết định |

## Ghi nhớ

- Sáu bước trước sharding — và phần lớn hệ thống dừng ở bước 1 hoặc 3.
- Read replica tạo ra read-after-write và monotonic read ngay ngày đầu.
- PACELC mô tả đúng hơn CAP: bạn đánh đổi độ trễ và nhất quán **mỗi ngày**, không chỉ khi hỏng.
- Shard key là quyết định khó đảo nhất; shard làm mất `JOIN`, transaction và `UNIQUE` toàn cục.

## Tự kiểm tra

1. Người dùng sửa tên, trang sau vẫn hiện tên cũ. Ba cách sửa, và cách nào rẻ nhất?
2. Vì sao `country_code` là shard key tồi cho hệ thống chỉ phục vụ Việt Nam?
3. Sau khi shard, `UNIQUE(email)` còn đảm bảo gì?
