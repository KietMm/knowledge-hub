---
title: Giới hạn tần suất và chống lạm dụng
slug: gioi-han-tan-suat-va-chong-lam-dung
summary: Thuật toán rate limit, chọn khoá đếm, và những endpoint luôn cần bảo vệ.
level: trung-cap
tags: [auth, rate-limit, bao-mat]
---

> **Sau bài này bạn sẽ:** chọn được thuật toán và ngưỡng phù hợp, và biết vì sao đếm theo IP thôi là chưa đủ.

## Vì sao cần

Không có giới hạn tần suất thì: mật khẩu bị dò tự động, API bị vét dữ liệu, email/SMS bị lạm dụng gửi hàng loạt (và bạn trả tiền), tài nguyên bị chiếm khiến người dùng thật không vào được.

Đây là biện pháp rẻ nhất chặn được nhiều loại lạm dụng nhất.

## Bốn thuật toán

| Thuật toán | Cách hoạt động | Đánh giá |
|---|---|---|
| Fixed window | Đếm trong mỗi khung thời gian cố định | Đơn giản; dồn cục ở ranh giới khung |
| Sliding window | Khung trượt theo thời gian thật | Chính xác; tốn bộ nhớ hơn |
| Token bucket | Token hồi đều, mỗi request tiêu một | Cho phép burst — thường phù hợp nhất |
| Leaky bucket | Xử lý với tốc độ cố định | Làm mượt lưu lượng |

Vấn đề của fixed window: giới hạn 100/phút cho phép 100 request lúc 0:59 và 100 nữa lúc 1:00 — tức 200 request trong hai giây.

Token bucket thường là lựa chọn tốt: nó chấp nhận một đợt ngắn (hành vi bình thường của người dùng thật) nhưng vẫn giới hạn tốc độ trung bình.

## Chọn khoá đếm

Đây là quyết định quan trọng hơn cả việc chọn thuật toán:

```ts
// Chỉ theo IP: NAT công ty, mạng di động, trường học dùng chung IP -> chặn oan
`rate:${ip}`

// Theo tài khoản: người tấn công đổi IP không thoát được
`rate:dangnhap:${email}`

// Kết hợp — phổ biến nhất cho đăng nhập
`rate:dangnhap:${email}:${ip}`

// Theo khoá API cho endpoint máy gọi máy
`rate:api:${apiKey}`
```

Với đăng nhập, đếm theo **cả hai**: theo email (chặn dò một tài khoản từ nhiều IP) và theo IP (chặn dò nhiều tài khoản từ một máy).

Cẩn thận với `X-Forwarded-For`: header này giả mạo được. Chỉ tin phần do proxy tin cậy của bạn thêm vào, và cấu hình đúng số lượng proxy phía trước.

## Triển khai với Redis

```ts
async function choPhep(khoa: string, gioiHan: number, cuaSoGiay: number) {
  const soLan = await redis.incr(khoa)
  if (soLan === 1) await redis.expire(khoa, cuaSoGiay)   // đặt hạn ở lần đầu
  return { choPhep: soLan <= gioiHan, conLai: Math.max(0, gioiHan - soLan) }
}
```

Redis cần thiết khi chạy nhiều instance — bộ đếm trong bộ nhớ mỗi instance nghĩa là giới hạn thật bằng N lần giới hạn bạn đặt.

## Trả lời đúng chuẩn

```ts
return new Response('Quá nhiều yêu cầu', {
  status: 429,
  headers: {
    'Retry-After': '60',
    'RateLimit-Limit': '100',
    'RateLimit-Remaining': '0',
    'RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
  },
})
```

Client biết chờ bao lâu thì retry đúng cách thay vì dội liên tục.

## Ngưỡng gợi ý

| Endpoint | Ngưỡng | Lý do |
|---|---|---|
| Đăng nhập | 5–10 lần / 15 phút / tài khoản | Chặn dò mật khẩu |
| Đăng ký | 3–5 / giờ / IP | Chặn tạo tài khoản hàng loạt |
| Quên mật khẩu | 3 / giờ / email | Chặn lạm dụng gửi mail |
| Gửi OTP | 3 / 10 phút / số điện thoại | SMS tốn tiền thật |
| API đọc | 100–1000 / phút / khoá | Theo hạn mức gói |
| Tìm kiếm | 30 / phút / IP | Truy vấn tốn tài nguyên |
| Upload | 10 / giờ / tài khoản | Dung lượng lưu trữ |

## Các lớp bảo vệ khác

- **Tăng độ trễ dần** sau mỗi lần thất bại (1s, 2s, 4s...) — người dùng thật gần như không nhận ra, bot thì chậm hẳn lại.
- **CAPTCHA** sau vài lần sai; đừng bật ngay từ lần đầu.
- **Khoá tài khoản tạm thời** — nhưng cẩn thận: nó tạo ra khả năng tấn công từ chối dịch vụ nhắm vào một người cụ thể.
- **Cảnh báo qua email** khi có nhiều lần đăng nhập thất bại.
- **CDN/WAF** chặn ở tầng biên trước khi tới ứng dụng.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đếm trong bộ nhớ khi chạy nhiều instance | Giới hạn thật gấp N lần | Redis dùng chung |
| Chỉ đếm theo IP | Chặn oan người dùng chung NAT | Kết hợp theo tài khoản |
| Tin `X-Forwarded-For` | Giả mạo IP để né | Chỉ tin proxy của mình |
| Không có `Retry-After` | Client retry dồn dập | Trả header chuẩn |
| Khoá tài khoản vĩnh viễn | Bị lợi dụng để khoá người khác | Khoá tạm, tăng dần |

## Ghi nhớ

- Token bucket cho phép burst — thường hợp với người dùng thật nhất.
- Chọn khoá đếm quan trọng hơn chọn thuật toán.
- Đăng nhập: đếm theo cả email lẫn IP.
- Trả `429` kèm `Retry-After` để client cư xử đúng.

## Tự kiểm tra

1. Fixed window bị "dồn cục ở ranh giới" như thế nào? Cho ví dụ số.
2. Vì sao đếm theo IP thôi là không đủ cho endpoint đăng nhập?
3. Khoá tài khoản sau 5 lần sai có thể bị lợi dụng ra sao?
