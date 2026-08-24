---
title: Tổng quan OWASP Top 10
slug: tong-quan-owasp-top-10
summary: Mười nhóm rủi ro phổ biến nhất, cách đọc danh sách này, và tư duy nền tảng của bảo mật ứng dụng.
level: co-ban
tags: [owasp, bao-mat, tong-quan]
---

> **Sau bài này bạn sẽ:** biết mười nhóm rủi ro là gì và vì sao thứ tự của chúng lại thay đổi theo thời gian.

## Danh sách là gì

OWASP Top 10 không phải một tiêu chuẩn tuân thủ, cũng không phải danh sách "mười lỗi kỹ thuật". Nó là **mười nhóm rủi ro** được xếp hạng theo dữ liệu thật: tần suất xuất hiện, mức độ khai thác được, và tác động.

| # | Nhóm | Nội dung cốt lõi |
|---|---|---|
| A01 | Broken Access Control | Người dùng làm được việc không thuộc quyền của họ |
| A02 | Cryptographic Failures | Dữ liệu nhạy cảm không được mã hoá đúng cách |
| A03 | Injection | Dữ liệu người dùng bị hiểu thành lệnh (SQL, XSS, command) |
| A04 | Insecure Design | Thiếu kiểm soát ngay từ khâu thiết kế |
| A05 | Security Misconfiguration | Cấu hình mặc định, thông tin lỗi lộ, dịch vụ thừa |
| A06 | Vulnerable Components | Thư viện cũ có lỗ hổng đã công bố |
| A07 | Identification & Auth Failures | Đăng nhập, phiên, mật khẩu yếu |
| A08 | Software & Data Integrity | Chuỗi cung ứng, cập nhật không xác minh |
| A09 | Logging & Monitoring Failures | Bị tấn công mà không ai biết |
| A10 | Server-Side Request Forgery | Máy chủ bị lừa gọi tới nơi không được phép |

Điều đáng chú ý: **Broken Access Control đứng đầu**. Không phải lỗi mã hoá phức tạp nào, mà là "quên kiểm tra người này có được xem cái kia không".

## Ba nguyên tắc nền tảng

### 1. Không bao giờ tin dữ liệu từ client

Mọi thứ đến từ trình duyệt đều có thể bị sửa: query string, body, header, cookie, và cả những trường bạn để `hidden` trong form. Người tấn công không dùng giao diện của bạn — họ gửi request thẳng.

Hệ quả: mọi kiểm tra ở client là **trải nghiệm**, không phải bảo mật. Kiểm tra thật phải ở server.

### 2. Phòng thủ nhiều lớp

Một lớp bảo vệ sẽ có ngày hỏng. Ví dụ với XSS: escape khi render **và** Content Security Policy **và** cookie `HttpOnly`. Ba lớp độc lập, thủng một lớp vẫn còn hai.

### 3. Đặc quyền tối thiểu

Mỗi thành phần chỉ có đúng quyền nó cần: tài khoản DB của ứng dụng không cần `DROP TABLE`, container không cần chạy `root`, API key chỉ nên có phạm vi hẹp nhất.

## Mô hình hoá mối đe doạ

Trước khi viết code cho một tính năng, dành mười phút hỏi bốn câu:

1. Dữ liệu gì đi vào? Từ đâu?
2. Ai được phép làm việc này? Kiểm tra ở đâu?
3. Hỏng thì hậu quả tệ nhất là gì?
4. Nếu bị lạm dụng thì ta có nhìn thấy trong log không?

Mười phút này rẻ hơn nhiều so với vá lỗi sau khi phát hành.

## Những gì nên tự động hoá

```bash
pnpm audit                    # lỗ hổng đã biết trong dependency
npx snyk test                 # phân tích sâu hơn
```

- Dependabot / Renovate: tự mở PR nâng cấp thư viện.
- Secret scanning: chặn commit chứa khoá bí mật.
- SAST trong CI: bắt các mẫu code nguy hiểm.

Tự động hoá quan trọng vì bảo mật là việc **liên tục** — thư viện an toàn hôm nay có thể có CVE vào tháng sau.

## Ghi nhớ

- Broken Access Control là nhóm phổ biến nhất, không phải lỗi mã hoá tinh vi.
- Kiểm tra ở client là trải nghiệm; kiểm tra ở server mới là bảo mật.
- Phòng thủ nhiều lớp: mỗi lớp giả định các lớp khác đã hỏng.
- Đặc quyền tối thiểu cho mọi thành phần.

## Tự kiểm tra

1. Vì sao A01 xếp trên A03 dù injection nghe nguy hiểm hơn?
2. Trường `hidden` trong form có tin được không? Vì sao?
3. Nêu ba lớp phòng thủ độc lập chống XSS.
