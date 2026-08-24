---
title: OAuth 2.0 và đăng nhập bằng tài khoản bên thứ ba
slug: oauth-va-dang-nhap-mang-xa-hoi
summary: Authorization Code Flow với PKCE, phân biệt OAuth với OpenID Connect, và những bước không được bỏ.
level: nang-cao
tags: [auth, oauth, oidc]
---

> **Sau bài này bạn sẽ:** đọc hiểu luồng "Đăng nhập với Google", và biết `state` cùng PKCE bảo vệ khỏi cái gì.

## OAuth không phải là xác thực

- **OAuth 2.0** — giao thức **uỷ quyền**: cho phép ứng dụng A truy cập tài nguyên của bạn ở dịch vụ B, không cần bạn đưa mật khẩu.
- **OpenID Connect (OIDC)** — lớp **xác thực** xây trên OAuth, bổ sung `id_token` chứa thông tin danh tính.

"Đăng nhập bằng Google" thực chất là OIDC. Dùng OAuth thuần để xác thực (chỉ dựa vào access token) là một sai lầm thiết kế phổ biến — access token không nói cho bạn biết **ai** đã đăng nhập.

## Authorization Code Flow với PKCE

Đây là luồng đúng cho gần như mọi ứng dụng ngày nay:

```
1. Người dùng bấm "Đăng nhập với Google"
2. App sinh code_verifier (ngẫu nhiên) và code_challenge = SHA256(code_verifier)
   App sinh state (ngẫu nhiên), lưu cả hai vào cookie/session
3. Chuyển hướng tới Google kèm: client_id, redirect_uri, scope, state, code_challenge
4. Người dùng đăng nhập và đồng ý
5. Google chuyển về redirect_uri kèm: code, state
6. App KIỂM TRA state khớp với giá trị đã lưu
7. App đổi code lấy token, gửi kèm code_verifier (POST tới Google, từ server)
8. Google trả: access_token, id_token, refresh_token
9. App xác minh chữ ký id_token, đọc thông tin người dùng, TẠO PHIÊN CỦA RIÊNG MÌNH
```

### `state` chống cái gì

`state` là giá trị ngẫu nhiên đi theo suốt vòng chuyển hướng. Nó chặn CSRF trên chính luồng đăng nhập: không có nó, người tấn công có thể lừa nạn nhân hoàn tất luồng bằng **code của kẻ tấn công**, khiến nạn nhân vô tình đăng nhập vào tài khoản của kẻ tấn công.

Bỏ qua bước 6 là lỗi phổ biến nhất khi tự triển khai OAuth.

### PKCE chống cái gì

`code_challenge`/`code_verifier` chặn việc chặn bắt authorization code. Kẻ tấn công lấy được `code` cũng không đổi được thành token vì thiếu `code_verifier` — thứ chưa bao giờ rời khỏi ứng dụng.

Ban đầu PKCE dành cho mobile/SPA, nhưng hiện nay được khuyến nghị cho **mọi** loại client, kể cả web app có server.

## Bước 9 rất quan trọng

Sau khi xác minh `id_token`, hãy **tạo phiên của riêng bạn**. Đừng dùng token của Google làm phiên đăng nhập của ứng dụng.

Lý do: bạn cần kiểm soát thời hạn, thu hồi, và quyền trong hệ thống của mình — những thứ không phụ thuộc vào Google.

```ts
const claims = await xacMinhIdToken(idToken)   // kiểm tra chữ ký, iss, aud, exp, nonce

const nguoiDung = await db.nguoiDung.upsert({
  where: { googleId: claims.sub },             // khoá theo `sub`, KHÔNG theo email
  create: { googleId: claims.sub, email: claims.email, ten: claims.name },
  update: { ten: claims.name },
})

await taoPhien(nguoiDung.id)
```

Dùng `sub` (định danh ổn định của nhà cung cấp) làm khoá, không dùng email — người dùng đổi email được, và email chưa xác minh có thể bị giả mạo.

Nếu vẫn muốn gộp tài khoản theo email, chỉ làm khi `email_verified === true`.

## Scope tối thiểu

```
scope=openid email profile          ← đủ cho đăng nhập
scope=openid email profile https://www.googleapis.com/auth/drive   ← xin quá nhiều
```

Xin quyền thừa làm người dùng ngần ngại chấp nhận, và biến bạn thành mục tiêu giá trị hơn nếu bị xâm nhập.

## Nên tự triển khai không

Nói chung là **không**. Dùng thư viện đã được kiểm chứng (Auth.js/NextAuth, Lucia, Clerk, Auth0). Chi tiết dễ sai rất nhiều: xác minh chữ ký JWKS, kiểm tra `nonce`, xoay vòng refresh token, khớp `redirect_uri` chính xác.

Hiểu luồng vẫn cần thiết — để cấu hình đúng và để đọc được thông báo lỗi.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không kiểm tra `state` | CSRF trên luồng đăng nhập | Sinh và đối chiếu `state` |
| Bỏ PKCE | Code bị chặn bắt và đổi lấy token | Luôn dùng PKCE |
| Dùng token của Google làm phiên | Mất kiểm soát thời hạn/thu hồi | Tạo phiên riêng |
| Khớp tài khoản theo email chưa xác minh | Chiếm tài khoản | Dùng `sub`, kiểm `email_verified` |
| `redirect_uri` khớp lỏng | Chuyển hướng mở, lộ code | So khớp chính xác |

## Ghi nhớ

- OAuth uỷ quyền; OIDC xác thực. Đăng nhập cần OIDC.
- `state` chặn CSRF; PKCE chặn chặn bắt code.
- Luôn tạo phiên của riêng bạn sau khi xác minh danh tính.
- Dùng thư viện, nhưng phải hiểu luồng.

## Tự kiểm tra

1. Vì sao chỉ có access token là không đủ để biết ai đang đăng nhập?
2. `state` và PKCE chặn hai loại tấn công khác nhau nào?
3. Vì sao khớp tài khoản theo `sub` an toàn hơn theo email?
