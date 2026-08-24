---
title: Mở rộng và cân bằng tải
slug: mo-rong-va-can-bang-tai
summary: Stateless nghĩa là gì trong thực tế, giới hạn của việc thêm máy, và vì sao connection pool là chỗ vỡ trước tiên.
level: trung-cap
tags: [kien-truc, mo-rong, load-balancer, stateless]
---

> **Sau bài này bạn sẽ:** biết cái gì chặn hệ thống của bạn khỏi việc chạy nhiều instance, và tính được số kết nối database mà cụm app cần.

## Hai hướng mở rộng

**Dọc (scale up)** — máy to hơn. Không phải giải pháp kém: nó không đổi kiến trúc, không tạo lỗi phân tán, và một máy 64 core ngày nay phục vụ được lượng tải mà mười năm trước cần cả cụm. Với hầu hết ứng dụng, **scale up là câu trả lời đúng trong thời gian dài hơn bạn tưởng**.

Giới hạn: có trần cứng, giá tăng phi tuyến ở đoạn trên, và **một máy là một điểm chết**.

**Ngang (scale out)** — nhiều máy. Không có trần, chịu được máy chết. Đổi lại: phải stateless, phải có cân bằng tải, và mọi thứ liên quan đến trạng thái trở nên khó.

Thứ tự đúng: **scale up tới khi hết rẻ, đồng thời viết code stateless để scale out được khi cần**.

## Stateless: cụ thể là gì

Stateless không có nghĩa "không có trạng thái" — nghĩa là **không có trạng thái nằm trong bộ nhớ của một instance cụ thể**. Bốn thứ hay vi phạm:

**1. Session trong RAM.**

```ts
// ❌ Instance A nhớ, instance B không biết → đăng nhập rồi vẫn bị hỏi lại
const sessions = new Map<string, User>()

// ✅ Ra ngoài tiến trình
await redis.set(`session:${id}`, JSON.stringify(user), { EX: 3600 })
```

Xem [[phien-dang-nhap-va-cookie]].

**2. File tải lên ghi vào đĩa cục bộ.** Ảnh lên instance A, request sau vào instance B → 404. Dùng object storage (S3/R2).

**3. Cache trong bộ nhớ tiến trình.** Không sai, nhưng phải hiểu: mỗi instance một bản, nên tỉ lệ hit chia cho số instance và **invalidate không đồng bộ được**. Xem [[cache-nhieu-tang]].

**4. Cron chạy trong app.** Ba instance = job chạy ba lần. Cần lock phân tán, hoặc tách hẳn thành một tiến trình scheduler riêng.

```ts
// Lock bằng Redis: SET NX = chỉ đặt nếu chưa tồn tại → đúng một instance thắng.
// EX bắt buộc: thiếu nó, instance chết giữa job sẽ giữ lock vĩnh viễn.
const thang = await redis.set('cron:daily-report', instanceId, { NX: true, EX: 300 })
if (thang !== 'OK') return
```

## Sticky session là mùi, không phải giải pháp

Cân bằng tải có thể "ghim" một người dùng vào một instance để session trong RAM vẫn chạy. Nó khiến ứng dụng có state chạy được ngay mà không phải sửa code — và đó chính là vấn đề: nó **hoãn** việc sửa, đồng thời tạo ra ba vấn đề mới.

- Instance chết → toàn bộ người dùng ghim vào nó **mất session**
- Tải lệch: một instance nhận nhóm người dùng nặng, các instance khác rỗi
- Deploy rolling luôn làm rơi session của người đang dùng

Dùng nó như miếng vá tạm để mua thời gian thì được. Coi nó là kiến trúc thì không.

## Thuật toán cân bằng tải

| Thuật toán | Cách chọn | Dùng khi |
|---|---|---|
| Round-robin | Lần lượt | Request đồng đều |
| Least connections | Máy ít kết nối nhất | Thời gian xử lý chênh nhau nhiều |
| Random two choices | Chọn 2 ngẫu nhiên, lấy cái rỗi hơn | Mặc định tốt; gần tối ưu, rẻ |
| Consistent hashing | Hash khoá → máy | Cần cùng khoá vào cùng máy (cache) |

`least connections` là mặc định tốt hơn round-robin cho ứng dụng thật, vì round-robin gửi request thứ N tới máy đang xử lý một truy vấn 5 giây.

## Health check phải kiểm đúng thứ

```ts
// ❌ Luôn trả 200 kể cả khi database đã sập — cân bằng tải cứ gửi request tới
app.get('/health', () => new Response('ok'))

// ✅ Hai endpoint, hai mục đích khác nhau
app.get('/health/live', () => new Response('ok'))        // tiến trình còn sống?

app.get('/health/ready', async () => {                    // sẵn sàng nhận request?
  try {
    await db.query('SELECT 1')
    return new Response('ok')
  } catch {
    return new Response('db down', { status: 503 })
  }
})
```

Phân biệt **liveness** và **readiness** là điều bắt buộc: trộn hai cái vào một endpoint gây ra một trong hai lỗi. Nếu health check kiểm database và trả `unhealthy` khi database chậm, hệ thống điều phối sẽ **khởi động lại toàn bộ app** — trong khi app không có lỗi gì, và việc restart chỉ làm mọi thứ tệ hơn.

Cũng đừng cho readiness gọi hết mọi phụ thuộc. Một API bên thứ ba chậm không nên khiến cả cụm của bạn rời khỏi vòng phục vụ.

## Chỗ vỡ trước tiên: connection pool

Đây là bài học đắt nhất của việc scale out, và gần như ai cũng gặp một lần.

```
10 instance × pool 20 kết nối = 200 kết nối tới Postgres
Postgres mặc định max_connections = 100
→ "FATAL: sorry, too many clients already"
```

Nghịch lý: **thêm máy làm hệ thống chậm hơn**. Mỗi kết nối Postgres là một process riêng, tốn RAM và chi phí chuyển ngữ cảnh. 500 kết nối trên máy 4 core không cho thông lượng gấp 500 — nó cho ít hơn 50 kết nối.

Cách tính đúng:

```
Số kết nối cần ≈ số core × 2 + số đĩa hiệu dụng
Máy 8 core, SSD → khoảng 20 kết nối là đủ cho TOÀN CỤM
→ pool mỗi instance = 20 / số instance
```

Với hơn vài instance, con số chia ra quá nhỏ → dùng **connection pooler** ngoài (PgBouncer, hoặc Supavisor/RDS Proxy):

```
10 instance × pool 20 → PgBouncer (transaction mode) → 20 kết nối thật tới Postgres
```

Lưu ý quan trọng khi dùng transaction mode: kết nối được trả lại pool **sau mỗi transaction**, nên prepared statement dùng lại và `SET` ở mức session sẽ không hoạt động như mong đợi. Nhiều ORM cần bật cờ tắt prepared statement.

Xem [[transaction-va-khoa-trong-postgres]].

## Cái không mở rộng ngang được

Ghi vào một database chủ. Bạn thêm bao nhiêu app instance cũng không giúp — mọi lệnh ghi vẫn về một chỗ. Đường ra, theo thứ tự nên thử:

1. **Giảm số lệnh ghi** — gộp, ghi theo lô, bỏ những lệnh ghi không ai cần (đếm view mỗi request)
2. **Read replica** cho phần đọc — thường 90% tải là đọc
3. **Tách theo miền nghiệp vụ** — bảng log/analytics ra database riêng
4. **Sharding** — cuối cùng, và đắt. Xem [[du-lieu-o-quy-mo]]

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Session/cache/file trong bộ nhớ instance | Chạy 1 máy thì đúng, nhiều máy thì sai ngẫu nhiên | Đưa ra Redis / object storage |
| Cron chạy trong app nhiều instance | Job chạy N lần | Lock phân tán hoặc scheduler riêng |
| Sticky session coi là giải pháp | Mất session khi deploy, tải lệch | Làm stateless thật |
| Health check luôn trả 200 | Cân bằng tải gửi request vào máy đã chết | Kiểm phụ thuộc ở `/ready` |
| Readiness kiểm cả API bên thứ ba | Bên thứ ba chậm → cả cụm rời vòng phục vụ | Chỉ kiểm phụ thuộc bắt buộc |
| Pool × instance vượt `max_connections` | `too many clients`, thêm máy càng chậm | PgBouncer + tính lại pool |
| Scale out trước khi scale up hết rẻ | Nhận hết lỗi phân tán mà chưa cần | Máy to trước, code stateless sẵn |

## Ghi nhớ

- Scale up là câu trả lời đúng trong thời gian dài hơn bạn tưởng; viết stateless để còn đường scale out.
- Stateless = không có trạng thái trong RAM của một instance cụ thể.
- Liveness và readiness là hai câu hỏi khác nhau, cần hai endpoint.
- `pool × instance` phải nhỏ hơn `max_connections`; quá vài instance thì cần pooler.

## Tự kiểm tra

1. Kể bốn thứ khiến app không chạy được nhiều instance.
2. Vì sao readiness check kiểm database lại có thể làm cả cụm bị restart?
3. 8 instance, pool 25, Postgres `max_connections = 100`. Sai gì và sửa thế nào?
