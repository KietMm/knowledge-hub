---
title: Redis và các cấu trúc dữ liệu
slug: redis-cau-truc-du-lieu
summary: Redis không chỉ là key-value — chọn đúng cấu trúc quyết định bạn viết 3 dòng hay 30 dòng.
level: co-ban
tags: [redis, cache, cau-truc-du-lieu, kien-truc]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng cấu trúc Redis cho từng bài toán, và biết vì sao `KEYS *` là lệnh không được gõ ở production.

## Ý tưởng chính

Redis thường được giới thiệu là "key-value trong RAM". Đúng nhưng thiếu: nó là một **bộ sưu tập cấu trúc dữ liệu** với các thao tác nguyên tử sẵn có.

Khác biệt thực tế rất lớn: đúng cấu trúc thì bài toán "top 10 người dùng theo điểm" là **một lệnh**; sai cấu trúc thì nó là đọc hết về, sắp xếp ở ứng dụng, và có race condition.

## Mental model

Hãy nghĩ tới **các loại hộp đựng trong nhà**.

> Bạn có thể nhét mọi thứ vào **thùng carton** — hộp nào cũng đựng được. Đó là dùng Redis như key-value thuần: lưu JSON, đọc ra, sửa, ghi lại.
>
> Nhưng có **hộp đựng bút** (danh sách có thứ tự), **khay chia ô** (hash), **rổ đựng đồ không trùng** (set), và **giá xếp theo chiều cao** (sorted set).
>
> Cùng một món đồ, cất vào hộp đúng loại thì lấy ra tức thì. Cất vào thùng carton thì phải **dốc cả thùng ra tìm**.

"Dốc cả thùng ra" chính là đọc JSON về, sửa một trường, ghi lại — và đó cũng là chỗ sinh ra race condition.

## Ví dụ nhỏ

```bash
SET user:1 '{"ten":"An"}' EX 300     # chuỗi — cache đơn giản
HSET user:1 ten An tuoi 30           # hash — sửa MỘT trường
ZADD diem 1500 an 1200 binh          # sorted set — bảng xếp hạng
INCR luot_xem:bai:42                 # bộ đếm nguyên tử
```

## Code chạy thế nào

**Năm cấu trúc và bài toán tương ứng:**

```text
STRING     cache JSON, cờ, bộ đếm
  SET/GET, INCR/DECR (nguyên tử), SETNX (khoá)

HASH       object có nhiều trường, cần sửa từng trường
  HSET/HGET/HGETALL/HINCRBY
  ⇒ Hơn hẳn lưu JSON: sửa một trường không cần đọc-ghi cả object,
    nên KHÔNG có race condition khi hai request sửa hai trường

LIST       hàng đợi, log gần đây
  LPUSH/RPOP (hàng đợi), LRANGE, BLPOP (chờ có phần tử)

SET        tập hợp không trùng, phép giao/hợp
  SADD/SISMEMBER/SINTER
  ⇒ "bạn chung của A và B" = SINTER, một lệnh

SORTED SET  xếp hạng, hàng đợi ưu tiên, dữ liệu theo thời gian
  ZADD/ZRANGE/ZRANGEBYSCORE
  ⇒ Đây là cấu trúc mạnh nhất và ít được dùng nhất
```

**Sorted set giải ba bài toán rất khác nhau:**

```bash
# ① Bảng xếp hạng — top 10 trong một lệnh, O(log n)
ZADD bang_xep_hang 1500 "an"
ZREVRANGE bang_xep_hang 0 9 WITHSCORES

# ② Rate limit theo cửa sổ trượt — điểm là timestamp
ZADD req:user1 1735000000 "id-1"
ZREMRANGEBYSCORE req:user1 0 1734999940     # xoá cái cũ hơn 60s
ZCARD req:user1                              # còn bao nhiêu trong cửa sổ

# ③ Hàng đợi có hẹn giờ — điểm là thời điểm cần chạy
ZADD job:hen 1735000600 "gui-mail-123"
ZRANGEBYSCORE job:hen 0 <now> LIMIT 0 10     # job nào đã đến hạn
```

Cùng một cấu trúc, ba bài toán — vì "điểm số" có thể là điểm, là thời gian, hay là độ ưu tiên.

## Cú pháp

**Ba lệnh không được gõ ở production:**

```text
KEYS *        Quét TOÀN BỘ không gian khoá. Redis MỘT LUỒNG
              ⇒ nó chặn mọi client khác trong lúc quét.
              ⇒ Với 10 triệu khoá, đó là vài giây cả hệ thống đứng.
              ✅ Dùng SCAN — lặp theo lô, không chặn.

FLUSHALL      Xoá sạch. Không hỏi lại.

DEBUG SLEEP   Chặn server đúng như tên gọi.
```

```text Đây là hệ quả trực tiếp của việc Redis xử lý lệnh trên MỘT luồng:
mọi lệnh chậm đều là lệnh chặn. Cùng lý do đó, hãy cẩn thận với
SMEMBERS trên set lớn, LRANGE 0 -1, và script Lua chạy lâu.
```

**Đặt tên khoá — quy ước quan trọng hơn vẻ ngoài:**

```text
doi-tuong:id:truong        user:1:ten
doi-tuong:id               user:1
tien-to:phien-ban:...      cache:v2:user:1
```

```text
Thêm PHIÊN BẢN vào tiền tố cache là mẹo nhỏ, tác dụng lớn:
đổi cấu trúc dữ liệu ⇒ tăng v2 lên v3 ⇒ mọi khoá cũ tự thành rác
và hết hạn dần. Không cần xoá thủ công, và không có phút nào
phục vụ dữ liệu sai định dạng ([[cache-nhieu-tang]]).
```

**TTL — gần như mọi khoá nên có:**

```bash
SET k v EX 300           # đặt TTL ngay khi ghi
EXPIRE k 300             # đặt sau
TTL k                    # -1 = KHÔNG BAO GIỜ hết hạn ⇒ thường là bug
```

```text
Khoá không TTL tích tụ mãi. Và khi Redis đầy, `maxmemory-policy`
quyết định điều gì xảy ra:
  noeviction      → lệnh ghi bắt đầu BÁO LỖI  ← mặc định, hay gây bất ngờ
  allkeys-lru     → xoá khoá ít dùng nhất     ← hợp khi Redis là CACHE
  volatile-lru    → chỉ xoá khoá CÓ TTL       ← hợp khi lẫn cả dữ liệu bền

⇒ Nếu Redis vừa làm cache vừa giữ session, `allkeys-lru` sẽ
  xoá session của người dùng. Chọn chính sách theo cách bạn dùng nó.
```

## Tại sao cần nó

Vì thao tác nguyên tử của Redis giải quyết được thứ mà đọc-sửa-ghi không giải quyết được:

```text
❌ Đọc-sửa-ghi ở ứng dụng:
   const n = await redis.get('dem')
   await redis.set('dem', Number(n) + 1)
   ⇒ Hai request đồng thời ⇒ mất một lần tăng
     ([[dong-bo-hoa-va-race-condition]])

✅ Một lệnh nguyên tử:
   await redis.incr('dem')
```

**Và Redis không chỉ để cache:**

```text
□ Cache           — công dụng quen thuộc nhất
□ Session         — chia sẻ giữa nhiều máy chủ, làm ứng dụng phi trạng thái
□ Rate limit      — sorted set hoặc INCR + EXPIRE
□ Khoá phân tán   — SET NX EX ([[job-nen-va-tac-vu-dinh-ky]])
□ Hàng đợi        — List hoặc Stream
□ Pub/Sub         — phát sự kiện giữa các máy (cho SSE/WebSocket)
□ Xếp hạng        — sorted set
```

**Nhưng nhớ Redis mặc định là RAM:**

```text
Máy mất điện ⇒ mất dữ liệu chưa kịp ghi xuống đĩa.
  RDB — chụp ảnh định kỳ: mất tối đa khoảng thời gian giữa hai lần chụp
  AOF — ghi từng lệnh: bền hơn, chậm hơn, file lớn hơn

⇒ Dùng Redis làm cache: mất là chấp nhận được, chỉ chậm một lúc.
⇒ Dùng Redis làm nguồn dữ liệu duy nhất: phải hiểu rõ mình đang
  chấp nhận mất bao nhiêu.
```

Và điều quan trọng nhất: **ứng dụng phải chạy được khi Redis chết**. Cache là tối ưu; mất nó thì chậm, không nên là sập ([[thiet-ke-cho-that-bai]]).

## So sánh

| Cấu trúc | Bài toán | Lệnh chính |
|---|---|---|
| String | cache, cờ, bộ đếm | `SET`, `INCR` |
| Hash | object nhiều trường | `HSET`, `HINCRBY` |
| List | hàng đợi, log gần đây | `LPUSH`, `BLPOP` |
| Set | tập không trùng, giao/hợp | `SADD`, `SINTER` |
| Sorted set | xếp hạng, rate limit, hẹn giờ | `ZADD`, `ZRANGEBYSCORE` |

## Dễ nhầm

**1. Dùng `KEYS *`.** Chặn cả server.

**2. Lưu JSON rồi đọc-sửa-ghi** thay vì dùng Hash. Race condition.

**3. Đọc-sửa-ghi ở ứng dụng** thay vì dùng `INCR`.

**4. Khoá không có TTL.** Tích tụ mãi.

**5. Không đặt `maxmemory-policy`.** Ghi bắt đầu báo lỗi khi đầy.

**6. `allkeys-lru` khi Redis giữ cả session.** Xoá session người dùng.

**7. Ứng dụng sập khi Redis chết.** Cache là tối ưu, không phải phụ thuộc thiết yếu.

**8. Dùng Redis làm CSDL chính mà không hiểu mức bền.**

**9. `SMEMBERS`/`LRANGE 0 -1` trên tập lớn.** Cùng vấn đề với `KEYS`.

**10. Không có tiền tố phiên bản cho khoá cache.** Đổi cấu trúc là phải xoá tay.

## Mẹo nhớ

> **Redis là BỘ CẤU TRÚC DỮ LIỆU, không phải chỉ key-value.**
>
> **MỘT LUỒNG ⇒ mọi lệnh chậm là lệnh CHẶN. Không `KEYS *`.**
>
> **Sorted set giải cả xếp hạng, rate limit, và hàng đợi hẹn giờ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm cấu trúc Redis và bài toán của mỗi cái?
2. Vì sao Hash tốt hơn lưu JSON khi cần sửa một trường?
3. Vì sao `KEYS *` nguy hiểm?
4. Ba bài toán sorted set giải được?
5. `maxmemory-policy` ảnh hưởng gì nếu Redis giữ cả session?

## Tự viết lại

Không nhìn lại, chọn cấu trúc và viết lệnh:

```text
① Cache thông tin sản phẩm, TTL 5 phút
② Đếm lượt xem bài viết
③ Top 10 sản phẩm bán chạy
④ Giới hạn 100 request/phút mỗi người dùng
⑤ Danh sách 20 sản phẩm vừa xem của một người
⑥ Kiểm một email đã đăng ký chưa (10 triệu email)
```

Tự kiểm: ở ⑥, nếu dùng Set thì tốn bao nhiêu RAM — và có cấu trúc nào của Redis đánh đổi độ chính xác để tiết kiệm không?

## Thử sức

Redis production đang chiếm 28 GB / 32 GB RAM và tăng đều. Ứng dụng dùng nó cho cache, session, và rate limit.

Ba câu để trả lời: bạn điều tra bằng lệnh nào (nhớ là không được chặn server); ba nguyên nhân khả dĩ nhất; và bạn xử lý ngay thế nào. Câu khó nhất: `maxmemory-policy` nào đúng cho trường hợp này — khi Redis đang giữ **cả** dữ liệu bỏ được (cache) **và** dữ liệu không bỏ được (session)?
