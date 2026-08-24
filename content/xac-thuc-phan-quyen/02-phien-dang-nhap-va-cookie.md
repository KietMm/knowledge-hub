---
title: Phiên đăng nhập và cookie
slug: phien-dang-nhap-va-cookie
summary: Phiên lưu ở server, cookie chỉ mang mã tham chiếu — và mọi thuộc tính cookie đều có lý do tồn tại.
level: trung-cap
tags: [auth, session, cookie]
---

> **Sau bài này bạn sẽ:** cấu hình được cookie phiên đúng, và biết vì sao "đăng xuất mọi thiết bị" khó với JWT nhưng dễ với session.

## Session dựa trên server

```
1. Đăng nhập thành công
2. Server sinh token ngẫu nhiên, lưu vào DB/Redis kèm userId và thời hạn
3. Gửi token về trong cookie HttpOnly
4. Mỗi request: đọc cookie -> tra trong store -> biết người dùng là ai
```

```ts
const token = crypto.randomBytes(32).toString('base64url')

await redis.set(`phien:${token}`, JSON.stringify({ userId, taoLuc: Date.now() }), {
  EX: 60 * 60 * 24 * 7,
})

;(await cookies()).set('phien', token, {
  httpOnly: true,      // JavaScript không đọc được -> XSS không lấy được token
  secure: true,        // chỉ gửi qua HTTPS
  sameSite: 'lax',     // chặn CSRF cho request ghi từ site khác
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
})
```

Bốn thuộc tính trên đều bắt buộc, mỗi cái chặn một loại tấn công khác nhau.

**Ưu điểm lớn nhất:** thu hồi được ngay. Xoá bản ghi trong store là phiên chết lập tức — cần thiết cho "đăng xuất mọi thiết bị", khoá tài khoản, hay xử lý sự cố.

## JWT — token tự chứa

```
header.payload.signature
```

Server không lưu gì; nó xác minh chữ ký và tin nội dung bên trong.

```ts
const token = jwt.sign({ sub: userId, vaiTro: 'thanh-vien' }, env.JWT_SECRET, {
  expiresIn: '15m',
})
```

**Ưu:** không cần tra store, dễ mở rộng ngang, dùng được giữa nhiều dịch vụ.
**Nhược nghiêm trọng:** không thu hồi được. Token đã phát hành sẽ hợp lệ tới lúc hết hạn, dù bạn đã khoá tài khoản.

Cách xử lý thông thường: access token **rất ngắn** (5–15 phút) + refresh token dài lưu ở server (thu hồi được).

### Bẫy JWT

```ts
// LỖ HỔNG: chấp nhận alg=none hoặc để người gửi chọn thuật toán
jwt.verify(token, secret)

// ĐÚNG: ghim thuật toán
jwt.verify(token, secret, { algorithms: ['HS256'] })
```

Payload JWT chỉ được **mã hoá base64**, ai cũng đọc được. Không bao giờ đặt dữ liệu nhạy cảm trong đó.

## Chọn cái nào

| Tình huống | Nên dùng |
|---|---|
| Ứng dụng web một khối | Session + cookie |
| Cần đăng xuất từ xa ngay lập tức | Session |
| Nhiều dịch vụ, không chia sẻ store | JWT ngắn hạn + refresh |
| Mobile app | JWT hoặc token lưu ở keychain |

Với ứng dụng web thông thường, **session + cookie đơn giản hơn và an toàn hơn**. JWT thường được chọn vì nghe hiện đại chứ không vì có nhu cầu thật.

## Vòng đời phiên

```ts
// Gia hạn trượt: mỗi lần hoạt động thì đẩy hạn ra xa
if (conLai < NGUONG_GIA_HAN) await redis.expire(`phien:${token}`, THOI_HAN)

// Nhưng vẫn có hạn tuyệt đối, không gia hạn vô tận
if (Date.now() - phien.taoLuc > HAN_TUYET_DOI) await huyPhien(token)
```

Kết hợp cả hai: người dùng không bị đăng xuất khi đang làm việc, nhưng phiên bị bỏ quên vẫn chết sau vài ngày.

Bắt buộc huỷ **mọi phiên** khi: đổi mật khẩu, đổi email, phát hiện đăng nhập bất thường.

## Đăng xuất đúng cách

```ts
export async function dangXuatAction() {
  'use server'
  const store = await cookies()
  const token = store.get('phien')?.value
  if (token !== undefined) await redis.del(`phien:${token}`)   // huỷ ở SERVER
  store.delete('phien')
  redirect('/dang-nhap')
}
```

Chỉ xoá cookie ở trình duyệt là chưa đủ: ai đã sao chép được token vẫn dùng tiếp được. Phải huỷ ở phía server.

## "Ghi nhớ đăng nhập"

Dùng token riêng, thời hạn dài, **xoay vòng mỗi lần sử dụng**:

```
1. Cookie ghi-nho chứa: selector + validator
2. Server lưu: selector + hash(validator) + userId
3. Dùng: tra theo selector, so hash validator
4. Hợp lệ: cấp phiên mới VÀ sinh validator mới, xoá cái cũ
5. Validator cũ được dùng lại -> dấu hiệu token bị đánh cắp -> huỷ toàn bộ phiên
```

Bước 5 là điểm hay nhất của mẫu này: nó **phát hiện được** việc token bị đánh cắp.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Token trong `localStorage` | XSS lấy được | Cookie `HttpOnly` |
| Thiếu `SameSite` | Dính CSRF | `SameSite=Lax` |
| JWT dài hạn không refresh | Không đăng xuất được | Access ngắn + refresh |
| Đăng xuất chỉ xoá cookie | Token vẫn sống ở server | Huỷ ở store |
| Không huỷ phiên khi đổi mật khẩu | Kẻ xâm nhập vẫn còn quyền | Huỷ toàn bộ phiên |

## Ghi nhớ

- Cookie phiên: `HttpOnly`, `Secure`, `SameSite`, `path`, `maxAge` — đủ cả năm.
- Session thu hồi được ngay; JWT thì không.
- Đăng xuất phải huỷ ở server, không chỉ xoá cookie.
- Gia hạn trượt kèm hạn tuyệt đối.

## Tự kiểm tra

1. Bốn thuộc tính cookie phiên, mỗi cái chặn tấn công gì?
2. Vì sao "đăng xuất mọi thiết bị" khó với JWT?
3. Mẫu ghi-nhớ có xoay vòng phát hiện được token bị đánh cắp bằng cách nào?
