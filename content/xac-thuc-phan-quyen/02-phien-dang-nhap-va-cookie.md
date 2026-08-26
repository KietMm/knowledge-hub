---
title: Phiên đăng nhập và cookie
slug: phien-dang-nhap-va-cookie
summary: Phiên lưu ở server, cookie chỉ mang mã tham chiếu — và mọi thuộc tính cookie đều có lý do tồn tại.
level: trung-cap
tags: [auth, session, cookie]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được giữa session và JWT bằng một câu hỏi, và biết vì sao "đăng xuất" với JWT khó hơn bạn tưởng.

## Ý tưởng chính

HTTP không nhớ gì cả ([[vong-doi-mot-lan-goi-http]]). Nên sau khi đăng nhập, client phải **mang theo bằng chứng** ở mỗi request.

Có đúng hai cách làm điều đó, và chúng đánh đổi ngược nhau:

```text
Session  →  cookie chỉ mang MÃ THAM CHIẾU; dữ liệu nằm ở server
JWT      →  token TỰ CHỨA mọi thông tin; server không lưu gì
```

## Mental model

Hãy nghĩ tới hai loại vé.

> **Session là số thứ tự ở tiệm sửa xe.** Tờ giấy chỉ ghi "**#4271**". Mọi thông tin nằm trong sổ của tiệm.
> Muốn huỷ? Gạch số đó khỏi sổ — **lập tức vô hiệu**.
>
> **JWT là vé xem phim đã in sẵn**: ghi rõ tên phim, số ghế, suất chiếu, và có **dấu mộc chống giả**.
> Người soát vé không cần gọi về trung tâm — nhìn dấu mộc là biết vé thật.
> Muốn huỷ vé đã phát? **Không huỷ được** — nó vẫn hợp lệ tới giờ chiếu.

Câu cuối là toàn bộ đánh đổi: JWT nhanh vì không phải hỏi ai, nhưng **thu hồi rất khó**.

## Ví dụ nhỏ

```ts
// Session
res.cookie('sid', 'a7f3...', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7*24*3600*1000 })
// server: sessions[a7f3...] = { userId, vaiTro, taoLuc }

// JWT
const token = jwt.sign({ sub: user.id, vaiTro: user.vaiTro }, SECRET, { expiresIn: '15m' })
```

## Code chạy thế nào

**Mỗi thuộc tính cookie đều có lý do tồn tại:**

```text
HttpOnly   JavaScript KHÔNG đọc được
           ⇒ XSS xảy ra cũng không đánh cắp được phiên  ← quan trọng nhất

Secure     chỉ gửi qua HTTPS
           ⇒ không rò rỉ khi người dùng vô tình vào http://

SameSite   Lax: không gửi kèm POST từ trang khác
           ⇒ chặn CSRF ([[csrf-va-clickjacking]])

Path       giới hạn phạm vi gửi
Domain     cẩn thận: đặt .example.com thì MỌI subdomain đọc được
Max-Age    thời gian sống
```

`HttpOnly` là dòng đáng giá nhất: nó biến hậu quả của một lỗ hổng XSS từ *"mất tài khoản"* thành *"khó chịu"*.

**Vì sao đăng xuất với JWT khó:**

```text
Session:
  DELETE FROM sessions WHERE id = 'a7f3...'
  ⇒ request tiếp theo mang mã đó → không tìm thấy → 401. XONG.

JWT:
  Token nằm ở client, server không lưu gì.
  Xoá cookie ở trình duyệt? → token vẫn hợp lệ nếu ai đó đã sao chép nó.
  ⇒ Phải có DANH SÁCH ĐEN ở server — nhưng thế thì bạn đã quay lại lưu trạng thái,
    tức là mất đúng ưu điểm khiến bạn chọn JWT.
```

Đây là nghịch lý cốt lõi của JWT, và nó dẫn tới giải pháp thực dụng ở phần dưới.

## Cú pháp

**Mẫu access + refresh token** — cách dung hoà:

```text
Access token   JWT, sống NGẮN (5-15 phút)
               ⇒ dùng cho mọi request, không cần tra cơ sở dữ liệu
               ⇒ thu hồi chậm nhất 15 phút — chấp nhận được

Refresh token  chuỗi ngẫu nhiên, LƯU Ở SERVER, sống dài (7-30 ngày)
               ⇒ dùng để lấy access token mới
               ⇒ thu hồi được NGAY (xoá khỏi bảng)
```

```ts
// Xoay refresh token mỗi lần dùng — chống trộm token
async function lamMoi(refreshToken: string) {
  const luu = await db.refreshToken.findByHash(bam(refreshToken))
  if (!luu || luu.hetHan < new Date()) throw new Error('Không hợp lệ')

  if (luu.daDung) {                              // ← token đã dùng lại
    await db.refreshToken.xoaTatCaCua(luu.userId) // ⇒ nghi bị trộm, huỷ MỌI phiên
    throw new Error('Phát hiện dùng lại token')
  }

  await db.refreshToken.danhDauDaDung(luu.id)
  return { access: taoAccess(luu.userId), refresh: await taoRefreshMoi(luu.userId) }
}
```

Cơ chế phát hiện dùng lại là phần thông minh: nếu kẻ trộm dùng token trước, người dùng thật sẽ kích hoạt cảnh báo — và ngược lại. Dù ai dùng trước, hệ thống cũng biết có vấn đề.

## Tại sao cần nó

Vì **vòng đời phiên** cần ba loại thời gian, và thiếu loại nào cũng có hậu quả:

```text
① Thời hạn tuyệt đối     30 ngày — sau đó bắt buộc đăng nhập lại, không gia hạn
② Thời hạn không hoạt động  2 giờ — không dùng thì hết hạn
③ Thời điểm nhạy cảm     đổi mật khẩu, đổi email, thanh toán ⇒ yêu cầu nhập lại mật khẩu
```

Loại ③ ít hệ thống làm, nhưng nó chặn được kịch bản rất thực: ai đó mượn máy tính chưa khoá màn hình và đổi email khôi phục.

**Đăng xuất đúng cách:**

```ts
async function dangXuat(req, res) {
  await db.session.xoa(req.sessionId)                    // ① xoá ở server
  res.clearCookie('sid', { path: '/' })                  // ② xoá cookie
  // ③ nếu có refresh token: xoá luôn
}

// Đổi mật khẩu ⇒ huỷ MỌI phiên khác
await db.session.xoaTatCaCua(userId, { tru: req.sessionId })
```

Bước cuối là thứ hay bị quên: nếu tài khoản đã bị chiếm, đổi mật khẩu mà không huỷ phiên cũ thì kẻ tấn công **vẫn còn quyền truy cập**.

**"Ghi nhớ đăng nhập"** — không phải là kéo dài phiên chính:

```text
❌ Đặt maxAge = 1 năm cho session cookie
   ⇒ một phiên duy nhất sống một năm, thu hồi khó, rủi ro cao

✅ Refresh token riêng, sống dài, LƯU Ở SERVER
   ⇒ hiện được danh sách "thiết bị đang đăng nhập" cho người dùng
   ⇒ thu hồi từng thiết bị
```

## So sánh

| | Session | JWT |
|---|---|---|
| Lưu ở | Server | Client |
| Thu hồi ngay | ✅ | ❌ (cần danh sách đen) |
| Cần tra CSDL mỗi request | ✅ (hoặc cache) | ❌ |
| Kích thước | Nhỏ (chỉ id) | Lớn hơn, gửi mỗi request |
| Hợp với | Web app cùng tên miền | Microservices, API cho mobile |

Câu hỏi để chọn:

> **"Tôi có cần thu hồi quyền ngay lập tức không?"**
>
> Có ⇒ session (hoặc access token rất ngắn + refresh token).
> Không, và tôi cần không phụ thuộc trạng thái ⇒ JWT.

Với web app thông thường, **session là lựa chọn mặc định đúng** — và nó đơn giản hơn nhiều.

## Dễ nhầm

**1. Lưu JWT trong `localStorage`.** JavaScript đọc được ⇒ XSS đánh cắp được. Cookie `HttpOnly` an toàn hơn.

**2. Quên `HttpOnly`, `Secure`, `SameSite`.** Ba dòng cấu hình chặn ba loại tấn công.

**3. JWT sống quá lâu.** Token 30 ngày không thu hồi được là 30 ngày rủi ro.

**4. Không xoá phiên ở server khi đăng xuất.** Xoá cookie chỉ làm trình duyệt quên; phiên vẫn hợp lệ với ai đã sao chép nó.

**5. Không huỷ phiên khác khi đổi mật khẩu.** Kẻ tấn công vẫn còn quyền.

**6. Đặt `Domain=.example.com` không cần thiết.** Mọi subdomain đọc được cookie — kể cả subdomain do người dùng tạo.

**7. Tin dữ liệu trong JWT mà không xác minh chữ ký.** Payload chỉ là base64 — ai cũng đọc và sửa được.

**8. Dùng thuật toán `none` hoặc để thư viện tự chọn.** Luôn khai rõ `algorithms: ['HS256']` khi xác minh, nếu không kẻ tấn công có thể tự chọn thuật toán yếu.

## Mẹo nhớ

> **Session là số thứ tự (gạch khỏi sổ là xong); JWT là vé in sẵn (không thu hồi được).**
>
> **`HttpOnly` biến XSS từ "mất tài khoản" thành "khó chịu".**
>
> **Câu hỏi để chọn: có cần thu hồi ngay lập tức không?**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Session và JWT khác nhau ở chỗ nào về **nơi lưu trạng thái**?
2. Vì sao đăng xuất với JWT khó, và giải pháp thực dụng là gì?
3. Ba thuộc tính cookie quan trọng nhất, và mỗi cái chặn gì?
4. Cơ chế phát hiện dùng lại refresh token hoạt động thế nào?
5. Vì sao phải huỷ mọi phiên khác khi người dùng đổi mật khẩu?

## Tự viết lại

Không nhìn lại phần trên, thiết kế cơ chế phiên cho:

```text
Ứng dụng ngân hàng: web + app di động, cần "ghi nhớ đăng nhập" trên app,
cần hiện danh sách thiết bị đang đăng nhập, và thu hồi được ngay khi
người dùng báo mất điện thoại.
```

Tự kiểm: bạn dùng session, JWT, hay kết hợp? Và "danh sách thiết bị" của bạn lấy dữ liệu từ đâu?

## Thử sức

Hệ thống của bạn dùng JWT sống 24 giờ, lưu trong `localStorage`. Một lỗ hổng XSS được phát hiện và đã bị khai thác.

Ba câu để trả lời: thiệt hại **tối đa** kéo dài bao lâu và vì sao; bạn **phản ứng** thế nào ngay lập tức (nhớ rằng bạn không thu hồi được JWT); và bạn đổi thiết kế thế nào để lần sau thiệt hại được giới hạn?
