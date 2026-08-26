---
title: Giới hạn tần suất và chống lạm dụng
slug: gioi-han-tan-suat-va-chong-lam-dung
summary: Thuật toán rate limit, chọn khoá đếm, và những endpoint luôn cần bảo vệ.
level: trung-cap
tags: [auth, rate-limit, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng khoá đếm cho từng loại endpoint — phần quyết định hiệu quả — và biết trả lời client đúng chuẩn.

## Ý tưởng chính

Giới hạn tần suất không chỉ để chống tấn công. Nó bảo vệ ba thứ cùng lúc:

```text
· Chống dò mật khẩu và dò dữ liệu
· Chống lạm dụng tài nguyên đắt (gửi mail, gọi API bên thứ ba, tạo file)
· Bảo vệ hệ thống khỏi sập vì một client lỗi gửi 10.000 request/giây
```

Và phần khó nhất **không phải thuật toán** — mà là **đếm theo khoá nào**.

## Mental model

Hãy nghĩ tới **cửa vào một quán bar đông khách**.

> Bảo vệ đếm số người vào. Nhưng đếm **theo gì**?
>
> Đếm theo **xe** — cả nhà đi chung một xe bị tính là một người.
> Đếm theo **người** — công bằng, nhưng phải biết ai là ai.
> Đếm theo **thẻ thành viên** — chính xác nhất, nhưng khách vãng lai không có thẻ.

Cùng bài toán với rate limit: đếm theo **IP** (nhiều người dùng chung), theo **tài khoản** (cần đăng nhập), hay theo cả hai.

Và có một trường hợp đặc biệt phải nhớ: kẻ tấn công thử **một mật khẩu phổ biến trên hàng nghìn tài khoản** — đếm theo tài khoản không bắt được, vì mỗi tài khoản chỉ bị thử một lần.

## Ví dụ nhỏ

```ts
// Đăng nhập: giới hạn theo CẢ HAI
await kiemTra(`login:ip:${req.ip}`, 20, '5m')        // chống dò hàng loạt
await kiemTra(`login:email:${email}`, 5, '15m')      // chống dò một tài khoản
```

## Code chạy thế nào

**Chọn khoá đếm** — bảng này quan trọng hơn phần thuật toán:

| Endpoint | Khoá đếm | Vì sao |
|---|---|---|
| Đăng nhập | IP **+** email | Chống cả dò hàng loạt lẫn dò một tài khoản |
| Đăng ký | IP | Chưa có tài khoản để đếm |
| Quên mật khẩu | IP + email | Chống spam mail tới một người |
| API đã đăng nhập | user id | Công bằng, không phạt người dùng chung IP |
| API công khai | API key | Theo gói dịch vụ |
| Tải file | user id + kích thước | Đếm băng thông, không đếm số request |

Vì sao **không nên chỉ đếm theo IP** cho API đã đăng nhập:

```text
Một văn phòng 200 người dùng chung một IP công cộng.
Giới hạn 100 request/phút theo IP ⇒ cả văn phòng chia nhau 100 request.
⇒ người dùng hợp lệ bị chặn, còn kẻ tấn công đổi IP là thoát.
```

Ngược lại, **chỉ đếm theo tài khoản** thì không chặn được đăng ký hàng loạt (chưa có tài khoản) và không chặn được credential stuffing.

## Cú pháp

**Bốn thuật toán:**

```text
① Fixed window     đếm trong khung thời gian cố định (mỗi phút reset)
                   ✅ đơn giản nhất
                   ❌ BỊ VƯỢT Ở BIÊN: 100 request lúc 10:00:59 + 100 lúc 10:01:00
                      = 200 request trong 1 giây

② Sliding window   cửa sổ trượt theo thời gian thực
                   ✅ chính xác, không có lỗ hổng biên
                   ❌ tốn bộ nhớ hơn

③ Token bucket     "xô" chứa token, đổ đầy dần theo thời gian
                   ✅ CHO PHÉP BURST — người dùng tích luỹ quyền khi không dùng
                   ⇒ hợp với API thật, nơi tải không đều

④ Leaky bucket     xử lý ở tốc độ cố định, dư thì xếp hàng
                   ✅ làm mượt tải cho hệ thống phía sau
```

Với API cho người dùng thật, **token bucket** thường cho trải nghiệm tốt nhất: nó cho phép một đợt ngắn (người dùng mở 10 tab cùng lúc) mà vẫn giữ tốc độ trung bình.

**Triển khai với Redis:**

```ts
// Sliding window bằng sorted set
async function kiemTra(khoa: string, gioiHan: number, cuaSoMs: number) {
  const bayGio = Date.now()
  const pipe = redis.multi()
  pipe.zremrangebyscore(khoa, 0, bayGio - cuaSoMs)   // bỏ bản ghi cũ
  pipe.zadd(khoa, bayGio, `${bayGio}-${Math.random()}`)
  pipe.zcard(khoa)
  pipe.pexpire(khoa, cuaSoMs)
  const [, , soLuong] = await pipe.exec()
  if (soLuong > gioiHan) throw new QuaGioiHan()
}
```

Dùng Redis chứ không phải bộ nhớ trong tiến trình: với 5 instance ứng dụng, đếm trong bộ nhớ nghĩa là giới hạn thật **gấp 5 lần** con số bạn đặt.

## Tại sao cần nó

Vì **trả lời đúng chuẩn** giúp client tự điều chỉnh thay vì thử lại mù quáng:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1735689600
```

```text
Retry-After        client biết chờ bao lâu ⇒ không thử lại ngay lập tức
RateLimit-Remaining client tự giảm tốc TRƯỚC khi bị chặn
```

Thiếu `Retry-After`, client sẽ thử lại ngay và làm mọi thứ tệ hơn — cùng vấn đề với thundering herd ở [[idempotency-va-thu-lai]].

**Ngưỡng gợi ý** để bắt đầu (rồi điều chỉnh theo số liệu thật):

```text
Đăng nhập          5 lần / 15 phút / tài khoản   ·  20 lần / 5 phút / IP
Đăng ký            3 lần / giờ / IP
Quên mật khẩu      3 lần / giờ / email
Gửi mail/SMS       10 lần / giờ / user
API đọc            100-1000 / phút / user
API ghi            10-100 / phút / user
Tìm kiếm           30 / phút / user
```

Nguyên tắc đặt ngưỡng: **bắt đầu rộng rãi, đo phân bố thật, rồi siết dần**. Đặt quá chặt ngay từ đầu thì bạn chặn người dùng thật và không biết.

## So sánh

Rate limit là **một lớp** trong chống lạm dụng, không phải tất cả:

```text
① Rate limit           chặn tần suất
② Tăng dần thời gian chờ  1s, 2s, 4s sau mỗi lần sai
③ CAPTCHA              sau vài lần thất bại
④ Khoá tài khoản tạm    sau nhiều lần sai liên tiếp
⑤ Cảnh báo             email khi đăng nhập từ thiết bị/quốc gia lạ
⑥ Chặn ở tầng biên     WAF, Cloudflare — chặn TRƯỚC khi tới ứng dụng
```

Lớp ⑥ đáng chú ý: rate limit ở tầng ứng dụng vẫn tiêu tài nguyên (kết nối, tiến trình). Với tấn công khối lượng lớn, chặn ở tầng biên là bắt buộc.

## Dễ nhầm

**1. Chỉ đếm theo IP.** Chặn nhầm văn phòng dùng chung IP, và không chặn được kẻ đổi IP.

**2. Chỉ đếm theo tài khoản.** Không chặn được credential stuffing và đăng ký hàng loạt.

**3. Đếm trong bộ nhớ tiến trình.** Với N instance, giới hạn thật gấp N lần.

**4. Fixed window cho endpoint nhạy cảm.** Lỗ hổng biên cho phép gấp đôi giới hạn.

**5. Không trả `Retry-After`.** Client thử lại ngay, làm tệ hơn.

**6. Đặt ngưỡng quá chặt mà không đo.** Người dùng thật bị chặn, và bạn chỉ biết khi có người khiếu nại.

**7. Quên bảo vệ endpoint tốn kém.** Xuất báo cáo, gửi mail, tạo PDF — mỗi request tốn hàng giây CPU. Chúng cần ngưỡng riêng, thấp hơn nhiều.

**8. Rate limit chặn cả nội bộ.** Health check, job nội bộ, webhook từ đối tác tin cậy nên có đường riêng.

## Mẹo nhớ

> **Bảo vệ ở cửa quán: đếm theo XE hay theo NGƯỜI?**
>
> **Đăng nhập phải đếm theo CẢ IP lẫn tài khoản — hai kịch bản tấn công khác nhau.**
>
> **Đếm trong bộ nhớ tiến trình = giới hạn nhân với số instance.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba thứ rate limit bảo vệ?
2. Vì sao đăng nhập cần đếm theo **cả hai** khoá?
3. Lỗ hổng biên của fixed window hoạt động thế nào?
4. Vì sao token bucket cho trải nghiệm tốt hơn với API thật?
5. Hai header nào giúp client tự điều chỉnh?

## Tự viết lại

Không nhìn lại phần trên, thiết kế rate limit cho các endpoint sau — nêu **khoá đếm**, **ngưỡng**, và **lý do**:

```text
a) POST /api/dang-nhap
b) POST /api/quen-mat-khau
c) GET  /api/san-pham        (công khai, không cần đăng nhập)
d) POST /api/xuat-bao-cao    (tạo PDF, mất 8 giây CPU)
```

Tự kiểm: câu (d) — ngưỡng của bạn có khác hẳn ba câu kia không, và vì sao?

## Thử sức

Hệ thống của bạn bị credential stuffing: kẻ tấn công thử **một cặp email–mật khẩu khác nhau** từ **10.000 IP khác nhau**, mỗi IP chỉ thử vài lần.

Rate limit hiện tại (20 lần/5 phút/IP và 5 lần/15 phút/tài khoản) **không bắt được** — vì mỗi IP và mỗi tài khoản đều dưới ngưỡng.

Nêu **ba** cách phát hiện và chặn kiểu tấn công này. Câu khó nhất: dấu hiệu nào trong dữ liệu cho bạn biết đây là tấn công chứ không phải người dùng thật?
