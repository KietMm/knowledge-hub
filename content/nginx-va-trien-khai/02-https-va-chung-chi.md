---
title: HTTPS và chứng chỉ
slug: https-va-chung-chi
summary: TLS bảo vệ cái gì, cách lấy chứng chỉ miễn phí tự gia hạn, và những cấu hình cần chỉnh.
level: trung-cap
tags: [nginx, https, tls, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** nói được TLS bảo vệ gì và **không** bảo vệ gì, và cấu hình HTTPS tự gia hạn.

## Ý tưởng chính

TLS cho ba đảm bảo, và chỉ ba:

**Bí mật** — người trên đường không đọc được. **Toàn vẹn** — không sửa được giữa đường. **Danh tính** — bạn đang nói chuyện với đúng máy chủ của tên miền đó.

Nó **không** làm ứng dụng của bạn an toàn. Một ứng dụng có SQL injection thì có HTTPS vẫn có SQL injection — chỉ là kẻ tấn công gửi nó qua đường đã mã hoá.

## Mental model

Hãy nghĩ tới **thư bảo đảm có niêm phong**.

> **Phong bì kín** — người đưa thư không đọc được nội dung. (Bí mật)
>
> **Niêm phong** — nếu ai đó bóc ra sửa rồi dán lại, bạn nhận ra. (Toàn vẹn)
>
> **Con dấu của cơ quan có thẩm quyền** — bạn tin thư này đúng là từ nơi nó nói. (Danh tính)
>
> Nhưng: **nội dung bên trong có thể vẫn là một lá thư lừa đảo.** Phong bì không kiểm duyệt nội dung.

Vế cuối là điều hay bị quên: khoá xanh trên thanh địa chỉ nói về **đường truyền**, không nói gì về **trang web**.

## Ví dụ nhỏ

```bash
sudo certbot --nginx -d app.example.com
# → xin chứng chỉ, tự sửa cấu hình Nginx, tự đặt lịch gia hạn
```

## Code chạy thế nào

**Bắt tay TLS, rút gọn:**

```text
① Client: "tôi hỗ trợ các bộ mã hoá sau"
② Server: gửi CHỨNG CHỈ (chứa khoá công khai + tên miền + chữ ký của CA)
③ Client kiểm:
     - Chữ ký có đúng của một CA mà tôi tin không?
     - Tên miền trong chứng chỉ có khớp cái tôi đang gọi không?
     - Còn hạn không?
     - Có bị thu hồi không?
④ Hai bên trao đổi để thống nhất một KHOÁ ĐỐI XỨNG
⑤ Từ đây trở đi mã hoá bằng khoá đối xứng — nhanh hơn nhiều
```

Chi tiết đáng nhớ ở bước ④–⑤: khoá bất đối xứng (chậm) chỉ dùng để **thống nhất** khoá đối xứng (nhanh), rồi thôi. Đó là lý do TLS không làm chậm đáng kể sau lần bắt tay đầu.

**Vì sao chứng chỉ đáng tin: chuỗi tin cậy:**

```text
Chứng chỉ của app.example.com
      ↑ được ký bởi
Chứng chỉ trung gian (R11)
      ↑ được ký bởi
CA gốc (ISRG Root X1)
      ↑
Nằm sẵn trong hệ điều hành / trình duyệt của bạn.
```

Nếu bạn quên cài **chứng chỉ trung gian**, trình duyệt vẫn chạy (nó thường tự tải được) nhưng nhiều client khác — `curl`, ứng dụng di động, thư viện HTTP — sẽ **từ chối**. Đây là triệu chứng "trình duyệt vào được mà app báo lỗi SSL".

## Cú pháp

**Cấu hình Nginx tối thiểu và đúng:**

```nginx
server {                       # chuyển hết HTTP sang HTTPS
  listen 80;
  server_name app.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  http2 on;
  server_name app.example.com;

  ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

  ssl_protocols TLSv1.2 TLSv1.3;        # bỏ TLS 1.0/1.1 — đã lỗi thời
  ssl_prefer_server_ciphers off;         # TLS 1.3: để client chọn
  ssl_session_cache shared:SSL:10m;      # đỡ bắt tay lại

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

Dùng **`fullchain.pem`** chứ không `cert.pem`: `fullchain` gồm cả chứng chỉ trung gian. Đây chính là lỗi ở mục trên.

**HSTS — mạnh và không quay lại được:**

```text
Strict-Transport-Security: max-age=31536000

Trình duyệt ghi nhớ: "tên miền này CHỈ dùng HTTPS, trong 1 năm".
⇒ Người dùng gõ http:// → trình duyệt tự đổi sang https TRƯỚC KHI gửi
⇒ Chặn được tấn công hạ cấp ở lần truy cập đầu... của các lần sau.

⚠️ Không quay lại được trong thời gian max-age.
   Chứng chỉ hết hạn ⇒ người dùng KHÔNG THỂ bỏ qua cảnh báo.
   ⇒ Thử max-age ngắn (300) trước, tăng dần khi đã chắc.
```

**Tự gia hạn — phần quan trọng nhất:**

```bash
certbot renew --dry-run      # thử, không thật sự gia hạn
systemctl status certbot.timer
```

Chứng chỉ Let's Encrypt sống **90 ngày**. Ngắn cố ý: nó buộc việc gia hạn phải tự động, vì không ai làm tay được mỗi ba tháng.

Và phải kiểm tra: `certbot renew` gia hạn xong **có nạp lại Nginx không**? Không có bước đó, Nginx vẫn giữ chứng chỉ cũ trong bộ nhớ cho tới lần khởi động lại:

```bash
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#!/usr/bin/env bash
systemctl reload nginx
```

**Cảnh báo trước khi hết hạn** — đặt ở mức 21 ngày. Chứng chỉ hết hạn là sự cố toàn phần: **mọi** người dùng mất truy cập cùng lúc, và với HSTS thì họ không bỏ qua được ([[giam-sat-va-sao-luu]]).

## Tại sao cần nó

Vì TLS bảo vệ **đường truyền**, và các loại tấn công khác đi qua đường đó không hề bị ảnh hưởng:

```text
TLS CHẶN:
  Nghe lén trên Wi-Fi công cộng
  Sửa nội dung giữa đường (chèn quảng cáo, chèn mã độc)
  Giả mạo máy chủ

TLS KHÔNG CHẶN:
  SQL injection, XSS, CSRF     ([[tong-quan-owasp-top-10]])
  Mật khẩu yếu, phân quyền sai
  Rò rỉ dữ liệu từ chính máy chủ
  Trang web lừa đảo — kẻ lừa đảo cũng xin được chứng chỉ miễn phí
```

Điểm cuối đáng nhấn: khoá xanh **không** có nghĩa "trang này đáng tin". Nó chỉ có nghĩa "bạn đang thực sự nói chuyện với tên miền hiện trên thanh địa chỉ".

**Nội dung hỗn hợp — lỗi hay gặp sau khi bật HTTPS:**

```html
<img src="http://cdn.com/logo.png">   <!-- ❌ trình duyệt chặn -->
<img src="https://cdn.com/logo.png">  <!-- ✅ -->
```

Chỉ cần một tài nguyên qua HTTP là trình duyệt bỏ khoá xanh hoặc chặn thẳng. Kiểm bằng console của trình duyệt sau khi chuyển sang HTTPS.

## So sánh

| | HTTP | HTTPS |
|---|---|---|
| Đọc trộm được trên đường | ✅ | ❌ |
| Sửa được giữa đường | ✅ | ❌ |
| Xác minh danh tính máy chủ | ❌ | ✅ |
| Bảo vệ khỏi lỗi ứng dụng | ❌ | ❌ |
| HTTP/2, HTTP/3 | không | ✅ |

## Dễ nhầm

**1. Dùng `cert.pem` thay `fullchain.pem`.** Trình duyệt vào được, app di động báo lỗi.

**2. Nghĩ HTTPS làm ứng dụng an toàn.** Nó chỉ bảo vệ đường truyền.

**3. Bật HSTS `max-age` dài ngay.** Không quay lại được nếu có sự cố.

**4. Gia hạn xong không reload Nginx.** Chứng chỉ mới nằm trên đĩa, Nginx vẫn dùng cái cũ.

**5. Không cảnh báo trước hạn.** Sự cố toàn phần, không báo trước.

**6. Còn bật TLS 1.0/1.1.**

**7. Không chuyển hướng HTTP sang HTTPS.**

**8. Nội dung hỗn hợp.** Mất khoá xanh hoặc bị chặn.

**9. Khoá riêng quyền quá rộng.** Phải `600` ([[quyen-va-nguoi-dung]]).

**10. Commit khoá riêng vào git.** Coi như đã lộ — phải cấp lại chứng chỉ mới.

## Mẹo nhớ

> **TLS bảo vệ ĐƯỜNG TRUYỀN, không bảo vệ ứng dụng.**
>
> **Dùng `fullchain.pem` — thiếu chứng chỉ trung gian là hỏng với client không phải trình duyệt.**
>
> **Gia hạn tự động PHẢI kèm reload — và phải có cảnh báo trước hạn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba đảm bảo của TLS?
2. TLS **không** bảo vệ khỏi những gì?
3. Vì sao dùng `fullchain.pem` chứ không `cert.pem`?
4. HSTS làm gì, và rủi ro của nó?
5. Vì sao chứng chỉ Let's Encrypt chỉ sống 90 ngày?

## Tự viết lại

Không nhìn lại, viết cấu hình HTTPS đầy đủ cho `app.example.com`:

```text
① Chuyển hết HTTP sang HTTPS
② TLS 1.2 và 1.3, HTTP/2
③ HSTS
④ Proxy vào ứng dụng ở cổng 3000
```

Rồi viết ba việc bạn đặt lịch: gia hạn, reload sau gia hạn, cảnh báo trước hạn.

Tự kiểm: nếu chứng chỉ hết hạn lúc 2 giờ sáng, cái gì trong hệ thống của bạn báo cho bạn biết — và trước đó bao lâu?

## Thử sức

Sáng thứ Hai, mọi người dùng thấy **"Kết nối không riêng tư"**. Chứng chỉ hết hạn đêm qua. Cron gia hạn có chạy — log nói "renewed successfully".

Ba câu để trả lời: chuyện gì đã xảy ra dù gia hạn thành công; bạn **khôi phục ngay** bằng lệnh nào; và hai thay đổi ngăn nó lặp lại. Câu khó nhất: nếu bạn đã bật HSTS với `max-age` một năm, người dùng có cách nào **tạm** truy cập trong lúc bạn sửa không — và điều đó nói gì về việc nên bật HSTS lúc nào?
