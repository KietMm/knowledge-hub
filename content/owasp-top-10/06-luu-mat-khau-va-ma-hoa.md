---
title: Lưu mật khẩu và mã hoá dữ liệu
slug: luu-mat-khau-va-ma-hoa
summary: Hash chậm có salt cho mật khẩu, mã hoá cho dữ liệu cần đọc lại — hai việc khác nhau hoàn toàn.
level: trung-cap
tags: [owasp, mat-khau, hashing, ma-hoa]
---

> **Sau bài này bạn sẽ:** chọn đúng thuật toán cho mật khẩu, và phân biệt được ba việc thường bị gộp làm một: hash, mã hoá, mã hoá base64.

## Ba khái niệm khác nhau

| | Mục đích | Đảo ngược được? | Dùng cho |
|---|---|---|---|
| **Encoding** (base64, hex) | Đổi định dạng | Có, ai cũng làm được | Truyền dữ liệu nhị phân |
| **Hashing** | Dấu vân tay một chiều | Không | Mật khẩu, kiểm tra toàn vẹn |
| **Encryption** | Giấu nội dung | Có, nếu có khoá | Dữ liệu cần đọc lại |

Base64 **không phải** bảo mật. Nó chỉ là cách viết lại dữ liệu.

## Mật khẩu: hash chậm, có salt

Không bao giờ lưu mật khẩu ở dạng đọc được. Cũng không dùng MD5/SHA-1/SHA-256 — chúng được thiết kế để **nhanh**, mà nhanh nghĩa là GPU thử được hàng tỷ mật khẩu mỗi giây.

Dùng thuật toán thiết kế riêng cho mật khẩu:

```ts
import argon2 from 'argon2'

// Khi đăng ký
const hash = await argon2.hash(matKhau, { type: argon2.argon2id })

// Khi đăng nhập
const dung = await argon2.verify(hash, matKhauNhap)
```

| Thuật toán | Ghi chú |
|---|---|
| **Argon2id** | Lựa chọn tốt nhất hiện nay, chống cả GPU lẫn ASIC |
| **bcrypt** | Vẫn ổn, phổ biến rộng; giới hạn 72 byte đầu vào |
| **scrypt** | Tốt, có sẵn trong Node `crypto` |
| PBKDF2 | Chấp nhận được khi bị ràng buộc bởi tiêu chuẩn |
| SHA-256, MD5 | **Không bao giờ** cho mật khẩu |

Các thư viện này tự sinh **salt** ngẫu nhiên cho từng mật khẩu và nhúng vào chuỗi kết quả. Salt khiến hai người dùng cùng mật khẩu có hash khác nhau, và làm bảng tra sẵn (rainbow table) vô dụng.

Chúng cũng nhúng luôn tham số chi phí, nên nâng chi phí về sau vẫn xác minh được hash cũ.

## Chống dò mật khẩu

Hash mạnh không cứu được nếu cho phép thử vô hạn:

- Giới hạn số lần thử theo **tài khoản** và theo **IP**.
- Tăng dần độ trễ sau mỗi lần sai.
- Bắt buộc 2FA cho tài khoản quan trọng.
- Kiểm tra mật khẩu mới với danh sách đã rò rỉ (Have I Been Pwned có API k-anonymity).

Về chính sách mật khẩu, khuyến nghị hiện tại (NIST) đã đổi: **độ dài tối thiểu 8–12 ký tự, không bắt buộc ký tự đặc biệt, không bắt đổi định kỳ**. Các quy tắc phức tạp khiến người dùng chọn `Password1!` và dán lên màn hình. Bắt đổi định kỳ khiến họ đổi thành `Password2!`.

## Thông báo lỗi không được tiết lộ

```ts
// SAI: cho biết email nào có tài khoản
if (nguoiDung === null) return { loi: 'Email không tồn tại' }
if (!dung) return { loi: 'Sai mật khẩu' }

// ĐÚNG
return { loi: 'Email hoặc mật khẩu không đúng' }
```

Cũng cần để ý **thời gian phản hồi**: nếu email không tồn tại thì trả về ngay, còn email tồn tại thì mất 200ms để hash — chênh lệch đó cũng tiết lộ thông tin. Cách xử lý: luôn chạy một phép verify giả khi không tìm thấy người dùng.

## Đặt lại mật khẩu

```ts
const token = crypto.randomBytes(32).toString('hex')       // ngẫu nhiên mật mã học
const hashToken = crypto.createHash('sha256').update(token).digest('hex')

await db.tokenDatLai.create({
  data: { hash: hashToken, nguoiDungId, hetHan: new Date(Date.now() + 30 * 60_000) },
})
// Gửi `token` thô qua email; DB chỉ lưu hash của nó
```

Bốn yêu cầu: token ngẫu nhiên đủ mạnh, chỉ lưu hash trong DB, hết hạn ngắn (15–60 phút), dùng một lần rồi xoá. Và sau khi đổi mật khẩu thành công, **huỷ mọi phiên đang mở**.

## Mã hoá dữ liệu cần đọc lại

Với dữ liệu nhạy cảm phải khôi phục được (số CMND, khoá API của khách hàng), dùng mã hoá đối xứng có xác thực:

```ts
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

function maHoa(vanBan: string, khoa: Buffer) {
  const iv = randomBytes(12)                       // IV mới cho MỖI lần mã hoá
  const cipher = createCipheriv('aes-256-gcm', khoa, iv)
  const daMa = Buffer.concat([cipher.update(vanBan, 'utf8'), cipher.final()])
  return { iv, daMa, tag: cipher.getAuthTag() }    // tag chống sửa đổi
}
```

Quy tắc: dùng **AEAD** (AES-GCM, ChaCha20-Poly1305) — chúng vừa giấu nội dung vừa phát hiện sửa đổi. Không tự thiết kế giao thức mã hoá; không tái sử dụng IV.

Khoá mã hoá phải nằm trong dịch vụ quản lý khoá (AWS KMS, Vault), không nằm trong mã nguồn hay cùng chỗ với dữ liệu — khoá cất cạnh két thì két không còn tác dụng.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| SHA-256 cho mật khẩu | Bẻ được hàng loạt bằng GPU | Argon2id / bcrypt |
| Salt dùng chung | Rainbow table hoạt động lại | Salt riêng từng mật khẩu (thư viện tự lo) |
| Thông báo "email không tồn tại" | Dò được danh sách tài khoản | Thông báo chung |
| Lưu token đặt lại dạng thô | Rò DB là chiếm được tài khoản | Lưu hash |
| Khoá mã hoá trong repo | Mã hoá vô nghĩa | KMS / Vault |

## Ghi nhớ

- Mật khẩu: hash chậm có salt (Argon2id), không bao giờ SHA/MD5.
- Base64 là encoding, không phải bảo mật.
- Thông báo đăng nhập không được phân biệt "sai email" với "sai mật khẩu".
- Mã hoá dùng AEAD, khoá cất ở nơi khác dữ liệu.

## Tự kiểm tra

1. Vì sao thuật toán hash **nhanh** lại là điểm yếu với mật khẩu?
2. Salt giải quyết vấn đề gì, và vì sao không cần lưu riêng?
3. Luồng đặt lại mật khẩu cần những kiểm soát nào?
