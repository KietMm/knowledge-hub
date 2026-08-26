---
title: CSRF và clickjacking
slug: csrf-va-clickjacking
summary: Lừa trình duyệt nạn nhân gửi request thay họ — và cách SameSite cùng token chặn lại.
level: trung-cap
tags: [owasp, csrf, cookie]
khung: v2
---

> **Sau bài này bạn sẽ:** hiểu vì sao CSRF tồn tại (nó là hệ quả của cách cookie hoạt động), và biết khi nào bạn **không** cần lo về nó.

## Ý tưởng chính

CSRF khai thác một hành vi rất hợp lý của trình duyệt: **cookie được tự động đính kèm vào mọi request tới tên miền đó** — bất kể request được gửi từ trang nào.

Nghĩa là một trang web độc hại có thể khiến trình duyệt của bạn gửi request tới ngân hàng của bạn, **kèm cookie đăng nhập của bạn**.

## Mental model

Hãy nghĩ tới **một tờ séc đã ký sẵn để trong ví**.

> Cookie đăng nhập giống tờ séc đã ký: bất kỳ ai cầm được nó đều dùng được.
>
> Kẻ tấn công **không lấy tờ séc**. Hắn chỉ **nhờ bạn ký vào một tờ giấy** — và tay bạn tự động ký, vì đó là phản xạ.
>
> Trình duyệt là bàn tay đó: nó tự động đính kèm cookie mà không hỏi *"request này xuất phát từ đâu?"*

Toàn bộ các biện pháp chống CSRF đều làm một việc: **buộc phải chứng minh request thật sự đến từ trang của bạn**.

## Ví dụ nhỏ

```html
<!-- Trang độc hại của kẻ tấn công -->
<form action="https://ngan-hang.com/chuyen-tien" method="POST" id="f">
  <input type="hidden" name="den" value="tai-khoan-ke-tan-cong">
  <input type="hidden" name="so_tien" value="10000000">
</form>
<script>document.getElementById('f').submit()</script>
```

Nạn nhân đang đăng nhập ngân hàng ở tab khác, ghé thăm trang này — và request được gửi đi **kèm cookie phiên của họ**.

## Code chạy thế nào

```text
① Nạn nhân đăng nhập ngan-hang.com → nhận cookie phiên
② Nạn nhân (vẫn còn phiên) mở trang-doc-hai.com
③ Trang đó tự động submit form tới ngan-hang.com
④ Trình duyệt thấy request tới ngan-hang.com
   → tự động đính kèm cookie của ngan-hang.com
⑤ Server thấy cookie hợp lệ → thực hiện lệnh chuyển tiền

Kẻ tấn công KHÔNG đọc được cookie, KHÔNG đọc được phản hồi.
Hắn chỉ cần lệnh được THỰC HIỆN.
```

Điểm cuối quan trọng: CSRF là tấn công **"gửi mù"**. Kẻ tấn công không thấy kết quả — nên nó chỉ nguy hiểm với các thao tác **thay đổi dữ liệu**, không phải với việc đọc.

## Cú pháp

**Phòng thủ 1 — `SameSite` cookie** (đơn giản nhất, hiệu quả nhất):

```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax
```

```text
SameSite=Strict  cookie KHÔNG bao giờ gửi kèm request từ trang khác
                 ⇒ an toàn nhất, nhưng: bấm link từ email vào trang bạn cũng
                   bị coi là chưa đăng nhập → trải nghiệm tệ

SameSite=Lax     ✅ mặc định hợp lý của các trình duyệt hiện đại
                 · GET điều hướng từ trang khác:  CÓ gửi cookie
                 · POST/PUT/DELETE từ trang khác: KHÔNG gửi
                 ⇒ chặn được kịch bản CSRF điển hình

SameSite=None    luôn gửi — BẮT BUỘC phải kèm Secure
                 ⇒ chỉ dùng khi thật sự cần cross-site (widget nhúng, SSO)
```

`SameSite=Lax` chặn được phần lớn CSRF, và nó chỉ là một dòng cấu hình. Đây là biện pháp có tỉ lệ lợi ích trên công sức cao nhất trong toàn bộ bài.

**Phòng thủ 2 — token CSRF** (lớp thứ hai):

```text
① Server sinh token ngẫu nhiên, gắn với phiên
② Nhúng token vào form (hoặc gửi qua header)
③ Server kiểm token khớp với phiên mới thực hiện

Vì sao chặn được: trang độc hại KHÔNG ĐỌC ĐƯỢC token
(same-origin policy chặn nó đọc nội dung trang của bạn).
```

```ts
// Kiểm ở server
if (req.headers['x-csrf-token'] !== req.session.csrfToken) {
  return res.status(403).end()
}
```

Với Next.js Server Actions, framework đã tự kiểm nguồn gốc request — nhưng vẫn phải tự kiểm **quyền** ([[server-actions]]).

## Tại sao cần nó

Vì có **hai tình huống bạn không cần lo CSRF**, và biết chúng giúp bạn không thêm phức tạp vô ích:

```text
① API dùng Bearer token trong header Authorization
   → Trình duyệt KHÔNG tự đính kèm header
   → Trang độc hại không đặt được header đó
   ⇒ Không có CSRF

② API chỉ dùng bởi ứng dụng di động
   → Không có trình duyệt, không có cookie tự động
   ⇒ Không có CSRF
```

Nhưng chú ý: **lưu token trong `localStorage` đổi CSRF lấy XSS**. Cookie `HttpOnly` chống được XSS đánh cắp phiên nhưng cần chống CSRF; `localStorage` ngược lại. Không có lựa chọn miễn phí — chọn theo mối đe doạ nào lớn hơn với hệ của bạn ([[phien-dang-nhap-va-cookie]]).

**Nguyên tắc nền: GET không được thay đổi dữ liệu.**

```text
❌ GET /xoa-bai-viet?id=42
   · Bot Google quét trang, đi theo mọi link ⇒ xoá sạch dữ liệu
   · Trình duyệt tải trước (prefetch) khi rê chuột
   · SameSite=Lax KHÔNG chặn GET từ trang khác
```

Đây là lý do thực dụng nhất để tôn trọng ngữ nghĩa HTTP ([[phuong-thuc-va-ma-trang-thai]]): nó không chỉ là chuyện "cho đúng chuẩn".

## So sánh

**Clickjacking** — họ hàng của CSRF, cơ chế khác:

```text
Kẻ tấn công nhúng trang CỦA BẠN vào iframe trong suốt,
đặt chồng lên một trang mồi ("Bấm để nhận quà").

Nạn nhân tưởng đang bấm nút "Nhận quà",
thực ra đang bấm nút "Xoá tài khoản" trên trang của bạn.
```

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

`frame-ancestors` là cách hiện đại; `X-Frame-Options` giữ lại cho trình duyệt cũ. Đặt cả hai, và nếu cần cho phép nhúng thì liệt kê tên miền cụ thể — không dùng `*`.

| | CSRF | Clickjacking |
|---|---|---|
| Cơ chế | Gửi request thay nạn nhân | Lừa nạn nhân tự bấm |
| Nạn nhân biết? | Không | Không |
| Chặn bằng | `SameSite`, token CSRF | `frame-ancestors`, `X-Frame-Options` |

## Dễ nhầm

**1. Nghĩ CSRF là lỗi thời.** `SameSite=Lax` là mặc định ở trình duyệt hiện đại, nhưng: người dùng có thể dùng trình duyệt cũ, và `SameSite=None` (cần cho một số tích hợp) mở lại cửa.

**2. Dùng GET cho thao tác thay đổi dữ liệu.** `SameSite=Lax` không chặn GET.

**3. Chỉ kiểm header `Referer`.** Nó có thể bị bỏ trống bởi cấu hình riêng tư, và bạn buộc phải chọn: từ chối request hợp lệ, hay cho qua request đáng ngờ.

**4. Token CSRF không gắn với phiên.** Token dùng chung cho mọi người thì kẻ tấn công tự lấy một cái rồi dùng.

**5. Chuyển sang `localStorage` để "khỏi lo CSRF".** Bạn đổi lấy rủi ro XSS đánh cắp token.

**6. Quên `frame-ancestors`.** Trang của bạn nhúng được vào iframe của bất kỳ ai.

**7. Đặt `SameSite=None` mà không có `Secure`.** Trình duyệt hiện đại **từ chối** cookie đó — và bạn mất phiên đăng nhập mà không hiểu vì sao.

## Mẹo nhớ

> **Cookie là tờ séc đã ký; kẻ tấn công không lấy séc, hắn nhờ tay bạn ký.**
>
> **`SameSite=Lax` chặn phần lớn CSRF bằng MỘT dòng cấu hình.**
>
> **GET không bao giờ được thay đổi dữ liệu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. CSRF khai thác hành vi nào của trình duyệt?
2. Vì sao kẻ tấn công không cần đọc được phản hồi?
3. `SameSite=Lax` chặn gì và **không** chặn gì?
4. Vì sao token CSRF hoạt động — điều gì ngăn trang độc hại đọc nó?
5. Hai tình huống không cần lo CSRF, và đánh đổi của lựa chọn `localStorage`?

## Tự viết lại

Không nhìn lại phần trên, thiết kế phòng thủ cho ba hệ thống:

```text
a) Web app truyền thống, dùng cookie phiên, form HTML
b) SPA gọi API cùng tên miền, dùng cookie
c) API công khai cho app di động và đối tác, dùng Bearer token
```

Tự kiểm: hệ nào **không** cần token CSRF, và vì sao?

## Thử sức

Sau khi bật `SameSite=Strict`, người dùng báo: bấm link trong email xác nhận đơn hàng thì vào trang và **bị hỏi đăng nhập lại**, dù họ vừa đăng nhập 5 phút trước.

Giải thích chính xác vì sao. Rồi đề xuất cách sửa **giữ được bảo mật** — câu khó: có cách nào dùng `Strict` cho thao tác nhạy cảm và `Lax` cho điều hướng thường không, và bạn làm điều đó như thế nào?
