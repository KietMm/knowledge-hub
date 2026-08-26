---
title: OAuth 2.0 và đăng nhập bằng tài khoản bên thứ ba
slug: oauth-va-dang-nhap-mang-xa-hoi
summary: Authorization Code Flow với PKCE, phân biệt OAuth với OpenID Connect, và những bước không được bỏ.
level: nang-cao
tags: [auth, oauth, oidc]
khung: v2
---

> **Sau bài này bạn sẽ:** kể lại được Authorization Code Flow từ trí nhớ, và nói rõ `state` với PKCE chặn tấn công gì.

## Ý tưởng chính

OAuth 2.0 là giao thức **uỷ quyền**: cho phép ứng dụng của bạn làm một việc thay người dùng ở một dịch vụ khác — mà **không cần biết mật khẩu** của họ ở dịch vụ đó.

Nó **không** phải giao thức đăng nhập. Phần đăng nhập nằm ở một lớp mỏng đặt lên trên: **OpenID Connect**.

## Mental model

Hãy nghĩ tới **vé gửi xe có ghi rõ quyền**.

> Bạn tới khách sạn, đưa xe cho nhân viên đỗ hộ. Bạn **không đưa toàn bộ chùm chìa khoá nhà**.
>
> Bạn đưa một chìa riêng chỉ nổ được máy, không mở được cốp. Chìa đó **hết hiệu lực khi bạn rời khách sạn**.

- Chùm chìa khoá nhà = mật khẩu Google của người dùng — ứng dụng bạn **không bao giờ thấy**.
- Chìa riêng = access token.
- "Chỉ nổ máy, không mở cốp" = **scope**.
- "Hết hiệu lực khi rời đi" = thời hạn của token.

Mọi bước rườm rà của OAuth đều để đảm bảo: chìa riêng đó tới đúng tay ứng dụng đã yêu cầu, chứ không rơi vào tay ai khác trên đường.

## Ví dụ nhỏ

```text
Bước 1 — đẩy người dùng sang Google:
GET https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=...
  &redirect_uri=https://app.cua-ban.com/callback
  &response_type=code
  &scope=openid email profile
  &state=<ngẫu nhiên, lưu vào phiên>
  &code_challenge=<SHA256(code_verifier)>
  &code_challenge_method=S256
```

## Code chạy thế nào

**Authorization Code Flow + PKCE, từng bước:**

```text
① App sinh code_verifier (ngẫu nhiên) và state (ngẫu nhiên)
   → LƯU cả hai vào phiên phía server
② App tính code_challenge = SHA256(code_verifier)
③ Chuyển hướng người dùng sang Google, kèm state + code_challenge
   ...
④ Người dùng đăng nhập Google, đồng ý cấp quyền
   (mật khẩu chỉ đi giữa NGƯỜI DÙNG và GOOGLE — app không thấy)
⑤ Google chuyển hướng ngược lại: /callback?code=...&state=...
⑥ App KIỂM TRA state khớp với cái đã lưu   ← bỏ bước này là lỗ hổng
⑦ App gọi Google từ SERVER (không qua trình duyệt):
      POST /token  { code, code_verifier, client_id, client_secret }
⑧ Google kiểm: SHA256(code_verifier) == code_challenge đã nhận ở ③?
⑨ Trả về access_token (+ id_token nếu có scope openid)
⑩ App TỰ TẠO PHIÊN CỦA MÌNH cho người dùng   ← không dùng access_token làm phiên
```

**Vì sao có bước ⑦ — vì sao không trả token thẳng ở ⑤:**

```text
Nếu token đi qua URL chuyển hướng:
  → nằm trong thanh địa chỉ, trong lịch sử trình duyệt,
    trong log máy chủ, trong header Referer.

Với code:
  → code lộ ra cũng vô dụng nếu không có client_secret (server giữ)
    và code_verifier (chỉ app biết).
  → code chỉ dùng ĐƯỢC MỘT LẦN, sống vài chục giây.
```

Đây là lý do **Implicit Flow đã bị khai tử**: nó trả access token thẳng trong URL.

## Cú pháp

**`state` chặn cái gì:**

```text
Kẻ tấn công tự bắt đầu luồng OAuth bằng tài khoản Google CỦA HẮN,
lấy được code, rồi lừa nạn nhân bấm vào:
    https://app.cua-ban.com/callback?code=<code của kẻ tấn công>

⇒ Nếu app không kiểm state: tài khoản của NẠN NHÂN trên app
  bị gắn với tài khoản Google của KẺ TẤN CÔNG.
⇒ Kẻ tấn công đăng nhập Google của hắn ⇒ vào được tài khoản nạn nhân.
```

Đây là **CSRF trên luồng OAuth**. `state` là token ngẫu nhiên lưu ở phiên, so lại ở bước ⑥ — cùng nguyên lý với CSRF token thường ([[csrf-va-clickjacking]]).

**PKCE chặn cái gì:**

```text
Trên mobile/SPA, không có nơi giấu client_secret.
Ứng dụng độc hại trên cùng máy có thể chặn được redirect và cướp `code`.

Có PKCE: cướp được code cũng vô dụng — thiếu code_verifier,
Google từ chối đổi token.
```

Ngày nay PKCE được khuyến nghị cho **mọi loại client**, kể cả web server có secret.

## So sánh

| | OAuth 2.0 | OpenID Connect (OIDC) |
|---|---|---|
| Trả lời câu hỏi | "App được phép làm gì?" | "**Người này là ai?**" |
| Kết quả | `access_token` (chuỗi mờ) | thêm `id_token` (**JWT** có thông tin người dùng) |
| Dùng để | Gọi API thay người dùng | Đăng nhập |
| Scope kích hoạt | — | `openid` |

Sai lầm kinh điển: **dùng access_token để xác định danh tính**. Access token chỉ nói "người cầm token này được phép gọi các API sau" — nó **không** khẳng định token được cấp cho ứng dụng của bạn. Một token do app khác lấy được vẫn gọi được `/userinfo` và trả về đúng người dùng đó ⇒ app bạn tưởng người đó vừa đăng nhập.

`id_token` thì có trường `aud` (audience) = `client_id` của bạn, nên **bắt buộc phải kiểm**:

```text
Kiểm id_token: chữ ký đúng khoá công khai của nhà cung cấp?
               iss đúng nhà cung cấp?
               aud == client_id của mình?     ← chống dùng token của app khác
               exp chưa hết hạn?
               nonce khớp với cái đã gửi?
```

## Tại sao cần nó

Vì việc bạn thực sự cần OAuth cho — **đăng nhập** — kết thúc ở bước ⑩, không phải ở bước ⑨.

```text
❌ Lưu access_token của Google vào cookie và dùng nó làm phiên
   → Token hết hạn sau 1 giờ ⇒ người dùng bị đá ra.
   → Mọi request phải hỏi Google ⇒ chậm và phụ thuộc.
   → Không huỷ được phiên riêng lẻ.

✅ Xác minh id_token một lần → tìm/tạo user trong CSDL của mình
   → phát cookie phiên CỦA MÌNH ([[phien-dang-nhap-va-cookie]]).
   → access_token chỉ giữ khi bạn thực sự cần gọi API của Google.
```

**Khớp tài khoản theo email — cẩn thận:**

```text
Người dùng đã có tài khoản email+mật khẩu: an@vd.com
Giờ họ đăng nhập bằng Google với cùng email.

Gộp hai tài khoản?  → Chỉ khi nhà cung cấp khẳng định email_verified = true.
                       Nếu không, ai đó tạo tài khoản Google với email
                       chưa xác minh trùng email nạn nhân ⇒ chiếm tài khoản.
```

## Dễ nhầm

**1. Không kiểm `state`.** CSRF trên luồng đăng nhập — tài khoản nạn nhân bị gắn với Google của kẻ tấn công.

**2. Dùng Implicit Flow.** Token lộ ra trong URL. Đã lỗi thời.

**3. Dùng access_token để xác định danh tính** thay vì id_token. Thiếu `aud` ⇒ token của app khác dùng được.

**4. Không kiểm chữ ký / `aud` / `exp` của id_token.** JWT không kiểm là chuỗi ai cũng tự viết được.

**5. Dùng access_token của Google làm phiên** thay vì phát phiên của mình.

**6. `redirect_uri` khớp lỏng** (khớp tiền tố, hoặc cho phép wildcard). Mở đường cho open redirect ⇒ code bị chuyển sang máy chủ kẻ tấn công. Phải khớp **chính xác** và khai báo trước ở nhà cung cấp.

**7. Gộp tài khoản theo email mà không kiểm `email_verified`.**

**8. `client_secret` nằm trong mã client** (SPA/mobile). Nó không phải bí mật ở đó — dùng PKCE thay vì cố giấu.

## Mẹo nhớ

> **OAuth = uỷ quyền. OIDC = danh tính. Đăng nhập cần OIDC.**
>
> **`state` chặn CSRF. PKCE chặn cướp `code`.**
>
> **Đổi code lấy token PHẢI làm ở server. Xong rồi phát phiên CỦA MÌNH.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Kể lại Authorization Code Flow theo trình tự. Bước nào bắt buộc chạy ở server, và vì sao?
2. `state` chặn tấn công gì? Mô tả kịch bản cụ thể.
3. PKCE chặn tấn công gì, và vì sao nó cần thiết khi không có `client_secret`?
4. Vì sao không được dùng `access_token` để xác định người dùng là ai?
5. Sau khi có id_token hợp lệ, bước tiếp theo của bạn là gì — và **không** phải là gì?

## Tự viết lại

Không nhìn lại, vẽ sơ đồ ba bên (Trình duyệt — App của bạn — Google) với các mũi tên theo đúng thứ tự, và đánh dấu:

```text
[?] mũi tên nào mang mật khẩu người dùng
[?] mũi tên nào mang `code`
[?] mũi tên nào mang `access_token`
[?] chỗ nào kiểm `state`
```

Tự kiểm: mũi tên mang mật khẩu có bao giờ chạm vào "App của bạn" không?

## Thử sức

Bạn nhận review một PR triển khai "Đăng nhập bằng Google". Người viết dùng Implicit Flow, không kiểm `state`, và lưu thẳng `access_token` của Google vào cookie làm phiên.

Viết ba nhận xét review — mỗi cái nêu **lỗ hổng cụ thể** (không chỉ "không đúng chuẩn"), và một câu sửa. Câu khó: trong ba lỗi đó, cái nào có thể khai thác **mà không cần** kẻ tấn công đứng giữa đường truyền?
