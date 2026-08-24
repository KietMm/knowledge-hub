---
title: CSRF và clickjacking
slug: csrf-va-clickjacking
summary: Lừa trình duyệt nạn nhân gửi request thay họ — và cách SameSite cùng token chặn lại.
level: trung-cap
tags: [owasp, csrf, cookie]
---

> **Sau bài này bạn sẽ:** biết vì sao cookie tự động gửi kèm lại là lỗ hổng, và cấu hình được phòng thủ đúng mức.

## CSRF hoạt động thế nào

Nạn nhân đang đăng nhập ở `nganhang.com`. Họ mở một trang khác có đoạn:

```html
<form action="https://nganhang.com/chuyen-tien" method="POST" id="f">
  <input type="hidden" name="den" value="attacker">
  <input type="hidden" name="so_tien" value="10000000">
</form>
<script>document.getElementById('f').submit()</script>
```

Trình duyệt **tự động gửi kèm cookie** của `nganhang.com` theo request đó. Server thấy cookie hợp lệ và thực hiện lệnh chuyển tiền.

Điểm cốt lõi: người tấn công **không đọc được** phản hồi (same-origin policy chặn). Họ chỉ cần request được **thực thi** — nên CSRF chỉ nguy hiểm với thao tác ghi.

## Phòng thủ 1: SameSite cookie

```
Set-Cookie: phien=abc; HttpOnly; Secure; SameSite=Lax; Path=/
```

| Giá trị | Cookie được gửi khi |
|---|---|
| `Strict` | Chỉ khi request xuất phát từ chính site đó |
| `Lax` | Cùng site, **và** điều hướng GET cấp cao từ site khác |
| `None` | Luôn gửi — bắt buộc kèm `Secure` |

`Lax` chặn được form POST từ site khác (chính là kịch bản ở trên) mà vẫn cho phép người dùng bấm link từ email vào site và vẫn đang đăng nhập. Đây là mặc định hợp lý, và cũng là mặc định của trình duyệt hiện đại khi không khai báo.

`Strict` an toàn hơn nhưng gây khó chịu: bấm link từ email vào là thấy mình đã đăng xuất.

## Phòng thủ 2: token CSRF

Mẫu **double submit cookie**:

1. Server sinh token ngẫu nhiên, đặt vào cookie (không `HttpOnly`) và vào form.
2. Khi submit, client gửi token trong body/header.
3. Server so sánh hai giá trị.

Site khác không đọc được cookie của bạn (same-origin policy) nên không điền được token đúng.

Trong Next.js, Server Actions đã có bảo vệ CSRF sẵn: Next kiểm tra header `Origin` khớp với `Host`. Với Route Handler tự viết mà dùng cookie để xác thực, bạn phải tự lo:

```ts
export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  if (origin === null || new URL(origin).host !== req.headers.get('host')) {
    return new Response('CSRF', { status: 403 })
  }
  ...
}
```

## Khi nào KHÔNG cần lo CSRF

Nếu xác thực bằng **header** `Authorization: Bearer ...` thay vì cookie, CSRF không áp dụng — trình duyệt không tự động gắn header đó vào request cross-site.

Đây là lý do API cho mobile app thường dùng bearer token. Đổi lại là bài toán lưu token an toàn ở client (xem bài về XSS).

## Nguyên tắc: GET không được thay đổi dữ liệu

```
GET  /xoa-bai-viet?id=1     ← SAI: chỉ cần một thẻ <img> là đủ kích hoạt
POST /bai-viet/1/xoa        ← ĐÚNG
```

`<img src="https://site.com/xoa-bai-viet?id=1">` trên bất kỳ trang nào cũng gọi được endpoint GET. Trình thu thập dữ liệu và bộ tăng tốc của trình duyệt cũng vậy.

Đây là quy tắc HTTP cơ bản, nhưng vẫn bị vi phạm thường xuyên.

## Clickjacking

Người tấn công nhúng site của bạn trong một `<iframe>` trong suốt, đặt bên dưới nội dung hấp dẫn. Nạn nhân tưởng mình bấm nút "Nhận quà" nhưng thực ra bấm "Xoá tài khoản" trên site của bạn.

```
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

`frame-ancestors` là cách hiện đại; `X-Frame-Options` giữ lại cho trình duyệt cũ. Chỉ định rõ nếu bạn cần cho phép nhúng: `frame-ancestors https://doi-tac.com`.

## Bộ header bảo mật tối thiểu

```ts
// next.config.ts
const headers = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

- `nosniff` — trình duyệt không tự đoán kiểu nội dung (chặn file upload bị hiểu thành script).
- `Referrer-Policy` — không rò rỉ đường dẫn đầy đủ sang site khác.
- `HSTS` — buộc dùng HTTPS ở mọi lần truy cập sau.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| GET thay đổi dữ liệu | Kích hoạt được bằng thẻ `<img>` | Dùng POST/PUT/DELETE |
| `SameSite=None` không cần thiết | Mở cửa CSRF | `Lax` mặc định |
| Không có `frame-ancestors` | Clickjacking | CSP + `X-Frame-Options` |
| Route Handler dùng cookie, không kiểm Origin | CSRF | Kiểm tra Origin/Host |
| Bỏ CSRF vì "có SameSite rồi" | Trình duyệt cũ vẫn dính | Phòng thủ nhiều lớp |

## Ghi nhớ

- CSRF lợi dụng việc cookie tự động gửi kèm; bearer token thì không bị.
- `SameSite=Lax` là mặc định hợp lý và chặn được kịch bản phổ biến nhất.
- GET không bao giờ được thay đổi dữ liệu.
- `frame-ancestors 'none'` chặn clickjacking.

## Tự kiểm tra

1. Vì sao CSRF nguy hiểm dù người tấn công không đọc được phản hồi?
2. `SameSite=Lax` chặn được gì và không chặn được gì?
3. API dùng `Authorization: Bearer` có cần token CSRF không? Vì sao?
