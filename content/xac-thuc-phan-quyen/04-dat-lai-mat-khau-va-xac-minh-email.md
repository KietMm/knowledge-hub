---
title: Đặt lại mật khẩu và xác minh email
slug: dat-lai-mat-khau-va-xac-minh-email
summary: Luồng token dùng một lần, và bốn lỗi làm nó thành cửa hậu vào tài khoản.
level: trung-cap
tags: [bao-mat, mat-khau, token, email]
---

> **Sau bài này bạn sẽ:** cài được luồng đặt lại mật khẩu không biến thành lỗ hổng, và biết vì sao phản hồi phải giống nhau dù email có tồn tại hay không.

## Luồng đúng, từng bước

```
1. Người dùng nhập email, bấm "Quên mật khẩu"
2. Server sinh token NGẪU NHIÊN MẬT MÃ, lưu BẢN HASH của nó + hạn dùng
3. Gửi email chứa token BẢN GỐC trong đường link
4. Người dùng bấm link → nhập mật khẩu mới
5. Server hash token nhận được, tra trong DB, kiểm tra hạn và chưa dùng
6. Đổi mật khẩu, ĐÁNH DẤU TOKEN ĐÃ DÙNG, HUỶ MỌI PHIÊN đang đăng nhập
7. Gửi email thông báo "mật khẩu vừa bị đổi"
```

```sql
CREATE TABLE password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,          -- hash, KHÔNG phải token gốc
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,               -- NULL = chưa dùng
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```ts
import { createHash, randomBytes } from 'node:crypto'

export async function yeuCauDatLai(email: string): Promise<void> {
  const user = await usersRepo.findByEmail(email)

  // Không tồn tại thì im lặng thoát — KHÔNG báo lỗi ra ngoài (xem phần dưới)
  if (user === null) return

  // 32 byte ngẫu nhiên mật mã. Math.random() ở đây là lỗ hổng nghiêm trọng:
  // nó đoán được, nên token của người khác đoán được.
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  await db.passwordResetTokens.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),   // 15 phút
    },
  })

  await guiEmail(email, `${BASE_URL}/dat-lai?token=${token}`)   // gửi bản GỐC
}
```

## Bốn lỗi biến luồng này thành cửa hậu

**1. Lưu token dạng thô.** Ai đọc được database — qua SQL injection, bản backup bị lộ, một nhân viên có quyền đọc — là đổi được mật khẩu **mọi tài khoản**. Token là chứng chỉ tương đương mật khẩu, nên lưu nó cùng cách lưu mật khẩu: chỉ giữ hash.

Khác một điểm với mật khẩu: token dài 32 byte ngẫu nhiên nên `sha256` là đủ, không cần bcrypt. Bcrypt chậm có tác dụng chống dò mật khẩu người ta tự đặt (entropy thấp); token ngẫu nhiên 256 bit thì không có gì để dò.

**2. Dùng `Math.random()`.** Nó không phải nguồn ngẫu nhiên mật mã — trạng thái bên trong suy ra được từ vài giá trị đã thấy. Luôn `crypto.randomBytes`.

**3. Token không hết hạn hoặc dùng lại được.** Link nằm trong hộp thư mãi mãi; hộp thư bị chiếm sáu tháng sau là tài khoản mất. Hạn 15–60 phút, và `used_at` đảm bảo mỗi token đúng một lần.

**4. Không huỷ phiên cũ.** Người tấn công đã đăng nhập được vào tài khoản; nạn nhân đổi mật khẩu để lấy lại quyền, nhưng phiên của kẻ tấn công **vẫn sống**. Đổi mật khẩu phải huỷ mọi phiên khác — xem [[phien-dang-nhap-va-cookie]].

```ts
export async function datLaiMatKhau(token: string, matKhauMoi: string): Promise<void> {
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const ban = await db.passwordResetTokens.findUnique({ where: { tokenHash } })
  if (ban === null || ban.usedAt !== null || ban.expiresAt < new Date()) {
    throw new TokenKhongHopLe()      // một thông điệp chung cho cả ba trường hợp
  }

  await db.$transaction([
    db.users.update({
      where: { id: ban.userId },
      data: { passwordHash: await bcrypt.hash(matKhauMoi, 12) },
    }),
    db.passwordResetTokens.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    }),
    // Huỷ mọi phiên: kẻ tấn công đang đăng nhập bị đá ra
    db.sessions.deleteMany({ where: { userId: ban.userId } }),
    // Huỷ luôn các token đặt lại khác chưa dùng
    db.passwordResetTokens.deleteMany({
      where: { userId: ban.userId, usedAt: null },
    }),
  ])

  await guiEmail(user.email, 'Mật khẩu của bạn vừa được đổi')
}
```

Cả bốn việc trong **một transaction**: hỏng giữa đường mà mật khẩu đã đổi còn token chưa đánh dấu dùng thì token vẫn dùng lại được.

## Phản hồi phải giống nhau dù email có tồn tại hay không

```ts
// ❌ Biến form quên mật khẩu thành máy dò danh sách người dùng
if (user === null) return Response.json({ error: 'Email không tồn tại' }, { status: 404 })

// ✅ Cùng một câu trả lời cho mọi email
return Response.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn.' })
```

Đây gọi là **user enumeration**. Kẻ tấn công thử 10.000 email và biết chính xác cái nào có tài khoản — danh sách đó dùng cho tấn công dò mật khẩu, cho lừa đảo nhắm đích, hoặc bán.

Rò rỉ còn có thể đến từ **thời gian phản hồi**: email tồn tại thì server hash token và gửi mail (chậm), không tồn tại thì trả về ngay (nhanh). Chênh lệch đó đo được. Đẩy việc gửi mail sang hàng đợi để cả hai nhánh mất thời gian tương đương.

## Rate limit là bắt buộc

Không có nó, form này thành công cụ spam hộp thư người khác:

```ts
// Giới hạn theo CẢ email và IP: chỉ theo IP thì đổi IP là lách được,
// chỉ theo email thì một IP vẫn dội được nhiều email khác nhau.
await rateLimit(`reset:email:${email}`, { soLan: 3, trong: '1h' })
await rateLimit(`reset:ip:${ip}`, { soLan: 10, trong: '1h' })
```

Xem [[gioi-han-tan-suat-va-chong-lam-dung]].

## Xác minh email: cùng khuôn, khác một điểm

Luồng giống hệt, chỉ khác:

- Hạn dài hơn được (24–48 giờ) vì rủi ro thấp hơn
- **Đổi email phải xác minh địa chỉ mới trước khi thay** — đổi thẳng rồi mới gửi xác minh thì gõ sai email là mất tài khoản vĩnh viễn:

```ts
// Lưu vào cột chờ, chỉ chuyển sang email chính khi đã xác minh
await db.users.update({
  where: { id },
  data: { emailChoXacMinh: emailMoi },
})
```

- Gửi thông báo về **địa chỉ cũ** khi có yêu cầu đổi email, để chủ tài khoản biết nếu không phải mình làm.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Lưu token dạng thô | Đọc được DB là chiếm mọi tài khoản | Lưu `sha256` hash |
| `Math.random()` sinh token | Token đoán được | `crypto.randomBytes(32)` |
| Token không hết hạn | Link cũ trong hộp thư vẫn dùng được | Hạn 15–60 phút |
| Token dùng nhiều lần | Chuyển tiếp email là mất tài khoản | Cột `used_at` |
| Không huỷ phiên sau khi đổi | Kẻ tấn công vẫn đăng nhập | `deleteMany` sessions |
| Báo "email không tồn tại" | Lộ danh sách người dùng | Cùng một phản hồi |
| Không rate limit | Spam hộp thư người khác | Giới hạn theo email **và** IP |
| Đổi email trước khi xác minh | Gõ sai là mất tài khoản | Cột `email_cho_xac_minh` |
| Token đặt lại đặt trong URL có `Referer` rời trang | Token lọt vào log bên thứ ba | `Referrer-Policy: no-referrer` |

## Ghi nhớ

- Token là chứng chỉ tương đương mật khẩu: sinh bằng `randomBytes`, lưu bản hash.
- Hết hạn ngắn và dùng đúng một lần.
- Đổi mật khẩu phải huỷ mọi phiên — nếu không, kẻ tấn công vẫn ở trong.
- Phản hồi giống nhau cho mọi email, kể cả về thời gian.

## Tự kiểm tra

1. Vì sao lưu hash của token thay vì token gốc, và vì sao `sha256` là đủ ở đây?
2. Không huỷ phiên sau khi đổi mật khẩu thì tấn công nào vẫn thành công?
3. Form quên mật khẩu báo "email không tồn tại" gây ra rủi ro gì?
