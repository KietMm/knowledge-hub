---
title: Reverse proxy với Nginx
slug: reverse-proxy-voi-nginx
summary: Nginx đứng trước ứng dụng để làm gì, và cấu hình tối thiểu cần có.
level: trung-cap
tags: [nginx, deploy, proxy]
---

> **Sau bài này bạn sẽ:** viết được cấu hình Nginx cho ứng dụng Node, và biết vì sao thiếu vài dòng header lại làm ứng dụng thấy sai IP người dùng.

## Vì sao cần một lớp phía trước

Ứng dụng Node hoàn toàn có thể tự nghe cổng 80. Nhưng Nginx (hoặc Caddy, Traefik) làm giúp những việc mà bạn không nên tự viết:

- Kết thúc TLS (HTTPS) và quản lý chứng chỉ.
- Phục vụ file tĩnh nhanh hơn nhiều.
- Nén gzip/brotli.
- Cân bằng tải giữa nhiều instance.
- Giới hạn tần suất, chặn request quá lớn.
- Đặt header bảo mật ở một chỗ.

## Cấu hình cơ bản

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    # Mọi request HTTP đều chuyển sang HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    client_max_body_size 10M;      # mặc định 1M — quá nhỏ cho tải file lên

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Bốn header này quyết định ứng dụng thấy đúng thông tin request gốc
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cần cho WebSocket
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 60s;
    }
}
```

Thiếu nhóm `X-Forwarded-*`, ứng dụng sẽ thấy mọi request đến từ `127.0.0.1` — làm hỏng ghi log, giới hạn tần suất theo IP, và phát hiện gian lận.

Thiếu `X-Forwarded-Proto`, ứng dụng tưởng đang chạy HTTP và sinh ra link `http://` hoặc từ chối đặt cookie `Secure`.

Ở phía ứng dụng, nhớ bật tin proxy (`trust proxy` trong Express, hoặc cấu hình tương ứng) — nhưng **chỉ tin proxy của mình**, vì `X-Forwarded-For` giả mạo được.

## File tĩnh

```nginx
location /_next/static/ {
    alias /opt/ung-dung/.next/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /uploads/ {
    alias /var/du-lieu/uploads/;
    expires 30d;
}
```

File có tên chứa hash (như của Next.js) đặt `immutable` được: nội dung đổi thì tên đổi, nên trình duyệt không cần kiểm tra lại bao giờ.

## Nén

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript
           text/xml application/xml image/svg+xml;
gzip_min_length 1024;
gzip_comp_level 5;
```

Không nén ảnh JPEG/PNG/WebP — chúng đã nén rồi, nén lại chỉ tốn CPU.

## Cân bằng tải

```nginx
upstream ung_dung {
    least_conn;                     # gửi tới instance ít kết nối nhất
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;                   # giữ kết nối, giảm chi phí bắt tay
}

location / {
    proxy_pass http://ung_dung;
}
```

`max_fails`/`fail_timeout` cho Nginx tự loại instance hỏng ra khỏi vòng luân phiên và thử lại sau.

## Giới hạn tần suất

```nginx
limit_req_zone $binary_remote_addr zone=chung:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=dangnhap:10m rate=1r/s;

location / {
    limit_req zone=chung burst=20 nodelay;
}

location /api/dang-nhap {
    limit_req zone=dangnhap burst=5;
}
```

Chặn ở tầng Nginx rẻ hơn nhiều so với để request đi tới ứng dụng rồi mới từ chối.

## Header bảo mật

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Từ khoá `always` bắt buộc — không có nó, header không được thêm vào các response lỗi (4xx, 5xx).

## Kiểm tra và nạp lại

```bash
sudo nginx -t                  # kiểm tra cú pháp TRƯỚC
sudo systemctl reload nginx    # nạp lại, không ngắt kết nối đang có
```

`reload` khác `restart`: nó khởi động worker mới và để worker cũ xử lý nốt request đang chạy. Luôn `nginx -t` trước — cấu hình sai kèm `restart` nghĩa là site sập.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Thiếu `X-Forwarded-*` | App thấy mọi IP là 127.0.0.1 | Thêm đủ bốn header |
| `client_max_body_size` mặc định | Tải file > 1MB lỗi 413 | Tăng theo nhu cầu |
| Thiếu `always` ở `add_header` | Header vắng trên response lỗi | Thêm `always` |
| `restart` thay vì `reload` | Ngắt kết nối đang xử lý | `nginx -t && reload` |
| Tin `X-Forwarded-For` từ mọi nguồn | Giả mạo IP để né rate limit | Chỉ tin proxy của mình |

## Ghi nhớ

- Bốn header `X-Forwarded-*` quyết định ứng dụng thấy đúng request gốc.
- File có hash trong tên thì cache `immutable`.
- `add_header ... always` để có cả trên response lỗi.
- `nginx -t` trước mọi lần `reload`.

## Tự kiểm tra

1. Vì sao ứng dụng ghi log sai IP khi thiếu `X-Forwarded-For`?
2. Tải file 5MB báo lỗi 413 — sửa ở đâu?
3. `reload` và `restart` khác nhau thế nào với người dùng đang truy cập?
