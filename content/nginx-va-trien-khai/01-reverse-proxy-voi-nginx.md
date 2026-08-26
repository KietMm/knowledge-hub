---
title: Reverse proxy với Nginx
slug: reverse-proxy-voi-nginx
summary: Nginx đứng trước ứng dụng để làm gì, và cấu hình tối thiểu cần có.
level: trung-cap
tags: [nginx, deploy, proxy]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được năm việc Nginx làm thay ứng dụng, và viết được cấu hình proxy tối thiểu đúng.

## Ý tưởng chính

Ứng dụng của bạn giỏi một việc: xử lý nghiệp vụ. Nó **không** giỏi nhận hàng nghìn kết nối, giải mã TLS, phục vụ file tĩnh, hay nén phản hồi.

Reverse proxy đứng trước, làm hết những việc đó, rồi chuyển tiếp phần còn lại vào trong.

## Mental model

Hãy nghĩ tới **lễ tân của một công ty**.

> Khách vào toà nhà không đi thẳng tới bàn của kỹ sư. Họ gặp lễ tân, và lễ tân:
>
> - kiểm tra ai được vào (TLS, chặn IP xấu),
> - trả lời ngay những câu hỏi đơn giản — "nhà vệ sinh ở đâu" (file tĩnh),
> - **giữ khách chờ** khi bên trong đang bận (đệm, xếp hàng),
> - dẫn khách tới đúng phòng ban (định tuyến),
> - và ghi sổ ai đã đến (log).

Kỹ sư bên trong chỉ nhận đúng những việc cần tới chuyên môn của họ. Nginx là lễ tân đó.

## Ví dụ nhỏ

```nginx
server {
  listen 80;
  server_name app.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Code chạy thế nào

**Bốn dòng `proxy_set_header` — vì sao chúng bắt buộc:**

```text
Không có chúng, ứng dụng của bạn nhìn thấy:
    Host:      127.0.0.1        ← không biết tên miền thật
    IP client: 127.0.0.1        ← MỌI người dùng trông như một

Hậu quả cụ thể:
  → Sinh URL tuyệt đối sai (email xác nhận trỏ về 127.0.0.1)
  → Rate limit theo IP vô dụng — cả thế giới là một IP
  → Log không truy được ai làm gì
  → Redirect http/https sai vì không biết scheme gốc
```

Đó là lý do chúng nằm trong **mọi** cấu hình proxy, không phải tuỳ chọn.

**Và ứng dụng phải được cấu hình để TIN các header đó:**

```js
app.set('trust proxy', 1)     // Express: tin đúng 1 lớp proxy phía trước
```

```text
Vì sao không tin mặc định:
  X-Forwarded-For là header do CLIENT gửi được.
  Không có proxy đứng trước, kẻ tấn công tự đặt header này
  ⇒ giả mạo IP ⇒ vượt rate limit, làm bẩn log.

⇒ Chỉ tin khi CHẮC CHẮN có proxy, và tin đúng số lớp.
```

**`proxy_pass` — một dấu `/` đổi hết ý nghĩa:**

```nginx
location /api/ {
  proxy_pass http://backend;     # KHÔNG có / cuối
  # /api/users → backend nhận /api/users
}

location /api/ {
  proxy_pass http://backend/;    # CÓ / cuối
  # /api/users → backend nhận /users      ← cắt mất tiền tố
}
```

Đây là một trong những chi tiết gây mất thời gian nhất khi cấu hình Nginx lần đầu.

## Cú pháp

**WebSocket cần khai thêm:**

```nginx
location /ws {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade    $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 3600s;              # mặc định 60s sẽ cắt kết nối
}
```

Không có ba dòng cuối, WebSocket bắt tay xong rồi bị ngắt sau 60 giây — triệu chứng "kết nối cứ rớt mỗi phút".

**Phục vụ file tĩnh — để Nginx làm, đừng để ứng dụng làm:**

```nginx
location /static/ {
  alias /var/www/app/static/;
  expires 1y;
  add_header Cache-Control "public, immutable";
  access_log off;
}
```

Nginx đọc file từ đĩa và gửi đi ở tầng nhân, nhanh hơn nhiều lần so với việc ứng dụng đọc file rồi ghi ra socket — và quan trọng hơn, nó **không chiếm mất worker** của ứng dụng.

**Nén, giới hạn, timeout:**

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1024;             # file nhỏ nén không đáng

client_max_body_size 10M;         # mặc định 1M — nguyên nhân của "413" khi upload
proxy_connect_timeout 5s;
proxy_read_timeout 60s;
```

`client_max_body_size` mặc định 1MB là nguồn của lỗi upload phổ biến nhất, và thông báo `413 Request Entity Too Large` không nói rõ giới hạn nằm ở Nginx chứ không ở ứng dụng.

**Cân bằng tải và kiểm tra cấu hình:**

```nginx
upstream backend {
  server 127.0.0.1:3000;
  server 127.0.0.1:3001;
  keepalive 32;                   # giữ kết nối, tránh bắt tay lại mỗi request
}
```

```bash
nginx -t                    # KIỂM TRA cú pháp — luôn chạy trước
systemctl reload nginx      # nạp lại KHÔNG ngắt kết nối đang có
```

`reload` khác `restart`: nó khởi động worker mới với cấu hình mới, và để worker cũ phục vụ nốt các request đang dở. Không có downtime.

## Tại sao cần nó

Vì năm việc Nginx làm đều là việc ứng dụng làm kém:

```text
① TLS         giải mã một lần ở biên, bên trong chạy HTTP thuần
② File tĩnh   nhanh hơn nhiều lần, và không chiếm worker
③ Nén         gzip/brotli cho mọi phản hồi
④ Đệm         client mạng chậm không giữ worker của ứng dụng ← quan trọng
⑤ Định tuyến  nhiều ứng dụng, nhiều tên miền, một cổng 443
```

Điểm ④ ít được nói tới nhưng có tác động lớn nhất khi có tải:

```text
Không có proxy đệm:
  Client 3G tải phản hồi 2MB trong 30 giây
  ⇒ worker của ứng dụng bị GIỮ suốt 30 giây đó.
  ⇒ Vài trăm client chậm là hết worker, dù CPU rảnh.

Có Nginx:
  Nginx nhận trọn phản hồi từ ứng dụng trong 50ms, GIẢI PHÓNG worker,
  rồi tự nhả dữ liệu cho client chậm.
```

**Bảo mật cơ bản:**

```nginx
server_tokens off;                                    # ẩn phiên bản Nginx
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options SAMEORIGIN always;
```

Chú ý `always`: không có nó, header sẽ không được thêm vào các phản hồi lỗi (4xx/5xx) — đúng những chỗ cũng cần bảo vệ ([[csrf-va-clickjacking]]).

## So sánh

| | Không có proxy | Có Nginx |
|---|---|---|
| TLS | ứng dụng tự làm | Nginx |
| File tĩnh | ứng dụng đọc và gửi | Nginx (nhanh hơn nhiều) |
| Client mạng chậm | giữ worker | Nginx đệm |
| Nhiều ứng dụng, một cổng | không được | ✅ |
| Đổi phiên bản không ngắt | khó | `reload` |

## Dễ nhầm

**1. Thiếu `proxy_set_header`.** Ứng dụng thấy mọi người là 127.0.0.1.

**2. Không bật `trust proxy` phía ứng dụng.** Header có mà không được dùng.

**3. Bật `trust proxy` khi **không** có proxy.** Cho phép giả mạo IP.

**4. Nhầm dấu `/` cuối trong `proxy_pass`.** Đường dẫn bị cắt hoặc thừa.

**5. Quên cấu hình WebSocket.** Kết nối rớt sau 60 giây.

**6. Quên `client_max_body_size`.** Upload lớn hơn 1MB báo 413.

**7. Để ứng dụng phục vụ file tĩnh.** Lãng phí worker.

**8. `restart` thay vì `reload`.** Ngắt kết nối không cần thiết.

**9. Sửa cấu hình mà không `nginx -t`.** Cú pháp sai ⇒ Nginx không khởi động lại được.

**10. Quên `always` ở `add_header`.** Header biến mất ở phản hồi lỗi.

## Mẹo nhớ

> **Bốn dòng `proxy_set_header` là bắt buộc — thiếu là mọi người dùng thành 127.0.0.1.**
>
> **`nginx -t` trước, `reload` sau — không bao giờ `restart` khi không cần.**
>
> **Nginx đệm phản hồi ⇒ client chậm không giữ worker của bạn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm việc Nginx làm thay ứng dụng?
2. Thiếu `proxy_set_header` thì hỏng những gì, cụ thể?
3. Vì sao không nên tin `X-Forwarded-For` theo mặc định?
4. `proxy_pass http://backend` khác `http://backend/` thế nào?
5. Vì sao đệm phản hồi lại quan trọng khi có nhiều client mạng chậm?

## Tự viết lại

Không nhìn lại, viết cấu hình Nginx cho:

```text
① app.example.com → ứng dụng ở cổng 3000
② /static/ phục vụ trực tiếp từ đĩa, cache 1 năm
③ /ws hỗ trợ WebSocket
④ Upload tối đa 20MB
⑤ Bật gzip
```

Tự kiểm: cấu hình của bạn có đủ bốn header proxy không, và ứng dụng phía sau cần đổi gì để dùng được chúng?

## Thử sức

Sau khi đặt Nginx trước ứng dụng, hai chuyện xảy ra: rate limit theo IP chặn nhầm **tất cả** người dùng cùng lúc, và WebSocket rớt mỗi 60 giây.

Ba câu để trả lời: nguyên nhân của từng vấn đề; cấu hình sửa cho từng cái; và bạn **kiểm chứng** đã sửa đúng bằng cách nào. Câu khó nhất: sau khi thêm `X-Forwarded-For` và bật `trust proxy`, điều gì có thể **vẫn** sai nếu bạn có thêm một CDN đứng trước Nginx?
