---
title: Mở rộng và cân bằng tải
slug: mo-rong-va-can-bang-tai
summary: Stateless nghĩa là gì trong thực tế, giới hạn của việc thêm máy, và vì sao connection pool là chỗ vỡ trước tiên.
level: trung-cap
tags: [kien-truc, mo-rong, load-balancer, stateless]
khung: v2
---

> **Sau bài này bạn sẽ:** biết chính xác cái gì làm ứng dụng không mở rộng được, và vì sao thêm máy đôi khi làm mọi thứ tệ hơn.

## Ý tưởng chính

**Mở rộng dọc** = máy to hơn. Đơn giản, nhanh, và có trần cứng.

**Mở rộng ngang** = nhiều máy hơn. Không có trần, nhưng chỉ hoạt động khi ứng dụng **phi trạng thái**.

Và "phi trạng thái" có một định nghĩa kiểm tra được: bất kỳ request nào cũng đi tới bất kỳ máy nào và cho kết quả như nhau.

## Mental model

Hãy nghĩ tới **quầy phục vụ ở một cửa hàng**.

> **Mở rộng dọc**: thuê một nhân viên làm nhanh gấp đôi. Có giới hạn — không ai nhanh gấp mười.
>
> **Mở rộng ngang**: mở thêm quầy. Không giới hạn... **nếu** mọi quầy phục vụ được mọi khách.
>
> Nhưng nếu mỗi nhân viên **ghi đơn của khách vào sổ tay riêng**, thì khách quay lại phải gặp đúng người đó. Mở thêm quầy không giúp gì — hàng vẫn dài trước mặt một người.

Cái sổ tay riêng đó là **trạng thái trong bộ nhớ tiến trình**: session lưu trong RAM, cache cục bộ, file người dùng vừa upload nằm trên đĩa của máy đó.

## Ví dụ nhỏ

```ts
// ❌ Trạng thái trong tiến trình — máy khác không thấy
const sessions = new Map<string, User>()

// ✅ Trạng thái ở kho dùng chung — mọi máy đều thấy
await redis.set(`session:${id}`, JSON.stringify(user), 'EX', 3600)
```

## Code chạy thế nào

**Bốn loại trạng thái phá vỡ mở rộng ngang, và chỗ đúng của chúng:**

```text
① Session trong RAM        → Redis, hoặc JWT
② Upload lưu trên đĩa máy  → object storage (S3/R2)
③ Cache cục bộ trong tiến trình → Redis dùng chung
                             (hoặc chấp nhận không nhất quán giữa các máy)
④ Cron/job chạy trong ứng dụng → 3 máy = job chạy 3 LẦN
                             → tách ra worker riêng, hoặc dùng khoá phân tán
```

Loại ④ hay bị bỏ sót nhất, và hậu quả rất cụ thể: email gửi ba lần, hoá đơn tính ba lần.

**Sticky session — vì sao đó là giải pháp tồi:**

```text
"Cho load balancer luôn gửi cùng một người tới cùng một máy."

Nghe hợp lý, nhưng:
  → Máy đó chết ⇒ mất session của mọi người trên nó
  → Tải phân bổ lệch (người dùng nặng dồn vào một máy)
  → Không tự mở rộng được: máy mới thêm vào không nhận traffic cũ
  → Deploy nào cũng đá hết người dùng ra

⇒ Đó là cách TRÌ HOÃN việc phi trạng thái hoá, không phải cách giải quyết.
```

**Vì sao thêm máy đôi khi làm mọi thứ tệ hơn:**

```text
1 máy ứng dụng, pool 20 kết nối → CSDL thấy 20 kết nối.
Thêm thành 10 máy, mỗi máy pool 20 → CSDL thấy 200 kết nối.

Postgres mặc định max_connections = 100.
⇒ Kết nối bị từ chối.
⇒ Và mỗi kết nối Postgres tốn vài MB RAM cùng chi phí chuyển ngữ cảnh
  ⇒ CSDL CHẬM HƠN dù có nhiều máy hơn.
```

Đây là điểm vỡ phổ biến nhất khi mở rộng ngang lần đầu, và nó gây bất ngờ vì triệu chứng — "thêm máy mà chậm hơn" — đi ngược trực giác.

Cách xử lý: **connection pooler** đứng giữa.

```text
10 máy × 20   →  PgBouncer  →  20 kết nối thật tới Postgres
                 (ghép nhiều kết nối ứng dụng vào ít kết nối thật)
```

## Cú pháp

**Thuật toán cân bằng tải:**

```text
Round-robin           lần lượt. Đơn giản, đủ dùng cho phần lớn trường hợp.
Least connections     gửi tới máy đang rảnh nhất.
                      Tốt khi request có thời gian xử lý rất khác nhau.
IP hash               cùng IP → cùng máy. (Sticky — hạn chế dùng.)
Weighted              máy mạnh nhận nhiều hơn. Khi các máy không đồng nhất.
```

**Health check — phần quan trọng hơn thuật toán:**

```nginx
upstream backend {
  server 10.0.0.1:3000 max_fails=3 fail_timeout=30s;
  server 10.0.0.2:3000 max_fails=3 fail_timeout=30s;
}
```

Không có nó, load balancer vẫn gửi traffic tới máy đã chết — và người dùng thấy lỗi ở đúng 1/N số request ([[giam-sat-va-sao-luu]]).

**Mở rộng CSDL — thứ tự đúng:**

```text
① Index và sửa truy vấn      ← LUÔN làm trước, thường đủ
② Cache                       ← giảm tải đọc
③ Replica đọc                 ← ghi vào primary, đọc từ replica
④ Sharding                    ← chia dữ liệu ra nhiều máy. RẤT phức tạp.
```

Đừng nhảy cóc: một index thiếu có thể chiếm 90% tải CSDL, và không có lượng máy nào bù được cho một truy vấn quét toàn bảng ([[index-va-hieu-nang-truy-van]]).

**Replica đọc có một cái bẫy — độ trễ sao chép:**

```text
① Người dùng cập nhật hồ sơ  → ghi vào primary
② Chuyển hướng sang trang hồ sơ → đọc từ replica
③ Replica chậm 200ms         → hiện DỮ LIỆU CŨ
⇒ "Tôi vừa sửa mà, sao không thấy?"

Cách xử lý: sau khi ghi, đọc từ primary trong một khoảng ngắn.
```

## Tại sao cần nó

Vì mở rộng dọc là câu trả lời đúng lâu hơn nhiều người nghĩ:

```text
Một máy hiện đại: 64 CPU, 512 GB RAM.
Với ứng dụng bình thường, nó phục vụ được hàng chục nghìn req/s.

Mở rộng ngang mang lại: không giới hạn, và chịu lỗi tốt hơn.
Nó cũng mang theo: trạng thái phải ra ngoài, connection pool,
                   triển khai phức tạp hơn, gỡ lỗi khó hơn.
```

**Quy tắc chọn:**

```text
< 1.000 req/s      → một máy. Mở rộng dọc khi cần.
1.000–10.000 req/s → 2–3 máy + load balancer + Redis.
> 10.000 req/s     → mở rộng ngang thật sự, và đo kỹ.
```

**Nhưng có một lý do khác để chạy hai máy dù tải nhỏ:** một máy nghĩa là mọi lần bảo trì đều là downtime, và mọi sự cố phần cứng đều là sự cố toàn phần. Hai máy đổi vấn đề "tải" thành vấn đề "sẵn sàng" — và thường lý do thứ hai mới là lý do thật.

**Định luật Amdahl, phát biểu gọn:** phần **tuần tự** của hệ thống đặt trần cho toàn bộ. Nếu 5% công việc phải đi qua một tài nguyên dùng chung (một bảng khoá, một hàng đợi đơn, một CSDL ghi), thì dù thêm bao nhiêu máy bạn cũng không nhanh hơn 20 lần.

## So sánh

| | Dọc (máy to hơn) | Ngang (nhiều máy) |
|---|---|---|
| Độ phức tạp | thấp | cao |
| Trần | có | không |
| Chịu lỗi | ❌ một điểm chết | ✅ |
| Cần phi trạng thái | không | **có** |
| Chi phí | tăng phi tuyến | tuyến tính |

## Dễ nhầm

**1. Session trong RAM tiến trình.** Đăng nhập rồi lại bị đăng xuất ngẫu nhiên.

**2. File upload lưu trên đĩa máy.** Máy khác không thấy.

**3. Cron chạy trong ứng dụng.** N máy = chạy N lần.

**4. Dùng sticky session để né việc phi trạng thái hoá.**

**5. Không tính tổng kết nối CSDL.** Thêm máy làm CSDL chậm hơn.

**6. Sharding trước khi thử index và cache.**

**7. Đọc từ replica ngay sau khi ghi.** Người dùng thấy dữ liệu cũ.

**8. Không có health check.** Traffic vẫn tới máy đã chết.

**9. Mở rộng ngang khi mở rộng dọc còn dư.** Trả phức tạp mà không cần.

**10. Quên phần tuần tự.** Điểm nghẽn dùng chung đặt trần cho tất cả.

## Mẹo nhớ

> **Phi trạng thái = request nào tới máy nào cũng cho kết quả như nhau.**
>
> **Thêm máy = nhân số kết nối CSDL. Nhớ pooler.**
>
> **Index và cache trước, sharding sau cùng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. "Phi trạng thái" nghĩa là gì, kiểm tra bằng câu hỏi nào?
2. Bốn loại trạng thái phá vỡ mở rộng ngang, và chỗ đúng của chúng?
3. Vì sao thêm máy có thể làm CSDL chậm hơn?
4. Vì sao sticky session là giải pháp tồi?
5. Thứ tự đúng khi mở rộng CSDL?

## Tự viết lại

Ứng dụng một máy: session trong RAM, upload lưu `/uploads`, cron gửi email hằng ngày trong tiến trình. Không nhìn lại, viết kế hoạch đưa lên ba máy:

```text
① mỗi loại trạng thái chuyển đi đâu
② cấu hình connection pool
③ xử lý cron
④ thứ tự thực hiện
```

Tự kiểm: nếu làm bước ③ sau cùng, chuyện gì xảy ra trong khoảng thời gian đó?

## Thử sức

Sau khi mở rộng từ 1 lên 5 máy, hai chuyện xảy ra: người dùng **bị đăng xuất ngẫu nhiên**, và CSDL báo **"too many connections"**.

Ba câu để trả lời: nguyên nhân của từng vấn đề; cách sửa từng cái; và bạn **kiểm chứng** đã sửa đúng bằng cách nào. Câu khó nhất: nếu sau khi sửa cả hai mà hệ thống vẫn không nhanh hơn đáng kể so với một máy, bạn nghi ngờ điều gì?
