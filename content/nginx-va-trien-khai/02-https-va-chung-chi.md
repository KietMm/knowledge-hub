---
title: HTTPS và chứng chỉ
slug: https-va-chung-chi
summary: TLS bảo vệ cái gì, cách lấy chứng chỉ miễn phí tự gia hạn, và những cấu hình cần chỉnh.
level: trung-cap
tags: [nginx, https, tls, bao-mat]
---

> **Sau bài này bạn sẽ:** cài HTTPS tự gia hạn cho một tên miền, và không bao giờ để site sập vì chứng chỉ hết hạn.

## TLS bảo vệ gì

Ba điều, và chỉ ba điều:

1. **Bí mật** — người ở giữa không đọc được nội dung.
2. **Toàn vẹn** — nội dung không bị sửa trên đường truyền.
3. **Xác thực máy chủ** — bạn đang nói chuyện với đúng `example.com`.

TLS **không** bảo vệ bạn khỏi: lỗi trong ứng dụng, XSS, SQL injection, hay một máy chủ đã bị chiếm quyền. Ổ khoá xanh chỉ nói "kết nối được mã hoá", không nói "site này an toàn".

## Let's Encrypt

Chứng chỉ miễn phí, tự động, hạn 90 ngày:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com

# Kiểm tra gia hạn tự động có hoạt động không
sudo certbot renew --dry-run
```

Certbot tự sửa cấu hình Nginx và tạo timer gia hạn. Hạn 90 ngày là **cố ý**: nó buộc việc gia hạn phải tự động, và tự động thì không quên.

Với tên miền đại diện (`*.example.com`) cần xác thực qua DNS:

```bash
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d '*.example.com' -d example.com
```

## Cấu hình TLS

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;          # để client chọn — khuyến nghị hiện tại
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...;

ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP stapling: máy chủ tự đính kèm bằng chứng chứng chỉ còn hiệu lực
ssl_stapling on;
ssl_stapling_verify on;
resolver 1.1.1.1 8.8.8.8 valid=300s;
```

Bỏ hẳn TLS 1.0 và 1.1 — chúng đã lỗi thời và không còn được các trình duyệt hiện đại chấp nhận.

Đừng tự soạn danh sách cipher: dùng bộ cấu hình sinh sẵn ở [ssl-config.mozilla.org](https://ssl-config.mozilla.org).

## HSTS

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

Header này bảo trình duyệt: từ nay chỉ kết nối tới miền này bằng HTTPS, không cần thử HTTP. Nó chặn tấn công hạ cấp giao thức ở lần truy cập thứ hai trở đi.

**Cẩn thận với `includeSubDomains` và `preload`:** trình duyệt sẽ nhớ trong hai năm và không có cách nào rút lại nhanh. Nếu một tên miền con chưa có HTTPS, nó sẽ không truy cập được.

Cách an toàn: bắt đầu với `max-age=300`, chạy vài ngày, rồi tăng dần.

## Chuyển hướng và cookie

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

Và ở phía ứng dụng, mọi cookie phiên phải có `Secure`:

```
Set-Cookie: phien=abc; Secure; HttpOnly; SameSite=Lax
```

`Secure` khiến cookie chỉ được gửi qua HTTPS. Thiếu nó, một request HTTP duy nhất (ví dụ người dùng gõ tay địa chỉ) là đủ để lộ token phiên.

## Nội dung hỗn hợp

Trang HTTPS nhúng tài nguyên HTTP sẽ bị trình duyệt chặn hoặc cảnh báo. Kiểm tra bằng console của trình duyệt, và dùng đường dẫn tương đối hoặc `https://` cho mọi tài nguyên.

## Giám sát hạn chứng chỉ

Dù đã tự động gia hạn, vẫn phải giám sát — gia hạn có thể thất bại vì DNS đổi, cổng 80 bị chặn, hay giới hạn tần suất của Let's Encrypt:

```bash
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \
  | openssl x509 -noout -enddate
```

Đặt cảnh báo trước 14 ngày. "Chứng chỉ hết hạn" là loại sự cố hoàn toàn phòng được nhưng vẫn xảy ra thường xuyên.

## Kiểm tra cấu hình

- [SSL Labs](https://www.ssllabs.com/ssltest/) — chấm điểm chi tiết, mục tiêu là A hoặc A+.
- [Security Headers](https://securityheaders.com) — kiểm tra bộ header.
- `curl -vI https://example.com` — xem quá trình bắt tay.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không kiểm tra gia hạn tự động | Site sập sau 90 ngày | `certbot renew --dry-run` + cảnh báo |
| `preload` HSTS quá sớm | Miền con không HTTPS thành không truy cập được | Tăng `max-age` dần |
| Cookie thiếu `Secure` | Lộ phiên qua HTTP | Thêm `Secure` |
| Còn bật TLS 1.0/1.1 | Điểm bảo mật thấp, có rủi ro | Chỉ 1.2 và 1.3 |
| Tự soạn danh sách cipher | Dễ sai, khó cập nhật | Dùng cấu hình sinh sẵn |

## Ghi nhớ

- TLS bảo vệ đường truyền, không bảo vệ ứng dụng.
- Hạn 90 ngày là để buộc tự động hoá — và vẫn phải giám sát.
- HSTS mạnh nhưng khó rút lại; tăng `max-age` dần.
- Ổ khoá xanh không có nghĩa là site an toàn.

## Tự kiểm tra

1. Ba điều TLS bảo vệ và ba điều nó không bảo vệ?
2. Vì sao `preload` trong HSTS là quyết định khó đảo ngược?
3. Đã tự động gia hạn rồi, vì sao vẫn cần giám sát hạn chứng chỉ?
