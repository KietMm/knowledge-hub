---
title: Xác thực và phân quyền khác nhau thế nào
slug: xac-thuc-va-phan-quyen-khac-nhau
summary: Hai câu hỏi, hai cơ chế, hai chỗ kiểm tra — nhầm lẫn giữa chúng là gốc của nhiều lỗ hổng.
level: co-ban
tags: [auth, bao-mat, co-ban]
---

> **Sau bài này bạn sẽ:** thiết kế được luồng đăng nhập đầy đủ, và biết đặt mỗi loại kiểm tra ở đúng tầng.

## Hai khái niệm

- **Authentication (AuthN)** — *Bạn là ai?* Xác minh danh tính bằng mật khẩu, mã OTP, khoá bảo mật.
- **Authorization (AuthZ)** — *Bạn được làm gì?* Quyết định dựa trên vai trò, quyền sở hữu, chính sách.

Mã HTTP tương ứng cũng khác nhau:
- `401 Unauthorized` — chưa xác thực (tên gọi này của chuẩn HTTP vốn đã gây nhầm lẫn).
- `403 Forbidden` — đã xác thực nhưng không đủ quyền.

## Ba yếu tố xác thực

| Yếu tố | Là gì | Ví dụ |
|---|---|---|
| Biết | Điều bạn nhớ | Mật khẩu, mã PIN |
| Có | Vật bạn giữ | Điện thoại, khoá USB |
| Là | Đặc điểm cơ thể | Vân tay, khuôn mặt |

Xác thực hai yếu tố (2FA) là dùng **hai loại khác nhau**. Mật khẩu + câu hỏi bảo mật vẫn chỉ là một yếu tố ("biết"), nên không phải 2FA.

Về độ mạnh: khoá bảo mật (WebAuthn/passkey) > ứng dụng TOTP > SMS. SMS bị tấn công SIM swap và không nên dùng cho tài khoản quan trọng, dù vẫn hơn không có gì.

## Luồng đăng nhập đầy đủ

```ts
export async function dangNhapAction(input: unknown) {
  'use server'

  const parsed = DangNhapSchema.safeParse(input)
  if (!parsed.success) return { ok: false, loi: 'Dữ liệu không hợp lệ' }
  const { email, matKhau } = parsed.data

  // 1. Giới hạn tần suất TRƯỚC khi chạm vào CSDL
  if (!(await choPhepThu(email, ip))) {
    return { ok: false, loi: 'Thử lại sau ít phút' }
  }

  const nguoiDung = await db.nguoiDung.findUnique({ where: { email } })

  // 2. Luôn chạy verify, kể cả khi không tìm thấy — để thời gian phản hồi
  //    không tiết lộ email nào có tài khoản
  const hash = nguoiDung?.matKhauHash ?? HASH_GIA
  const dung = await argon2.verify(hash, matKhau)

  if (nguoiDung === null || !dung) {
    await ghiNhanThatBai(email, ip)
    return { ok: false, loi: 'Email hoặc mật khẩu không đúng' }   // thông báo chung
  }

  // 3. Tạo phiên MỚI sau khi đăng nhập (chống session fixation)
  const phien = await taoPhien(nguoiDung.id)
  ;(await cookies()).set('phien', phien.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  await ghiLogDangNhap(nguoiDung.id, ip)
  return { ok: true }
}
```

Năm điểm đáng chú ý trong đoạn trên: giới hạn tần suất, thời gian phản hồi không đổi, thông báo lỗi chung, tạo phiên mới, và ghi log.

## Chỗ đặt mỗi loại kiểm tra

| Tầng | Kiểm tra gì | Lưu ý |
|---|---|---|
| Middleware | Có cookie phiên không | Chỉ để chuyển hướng, **không phải bảo mật** |
| Page / Layout | Đã đăng nhập chưa, vai trò gì | Quyết định hiển thị |
| Server Action / API | Đăng nhập + quyền trên bản ghi | **Bắt buộc** — đây là ranh giới thật |
| Cơ sở dữ liệu | Row Level Security | Chốt cuối cho hệ nhiều khách hàng |

Điểm quan trọng: middleware chỉ thấy cookie, không truy cập được database ở edge runtime. Nó **không** xác minh được phiên còn hiệu lực hay người dùng còn quyền. Mọi kiểm tra thật phải lặp lại ở nơi truy cập dữ liệu.

## Mô hình phân quyền

**RBAC — theo vai trò.** Đơn giản, đủ cho phần lớn hệ thống:

```ts
type VaiTro = 'khach' | 'thanh-vien' | 'bien-tap' | 'quan-tri'

const QUYEN: Record<VaiTro, string[]> = {
  khach: ['bai-viet:doc'],
  'thanh-vien': ['bai-viet:doc', 'binh-luan:viet'],
  'bien-tap': ['bai-viet:doc', 'bai-viet:viet', 'bai-viet:xoa'],
  'quan-tri': ['*'],
}
```

**ABAC — theo thuộc tính.** Cần khi quyền phụ thuộc quan hệ giữa người và tài nguyên:

```ts
function coQuyenSua(phien: Phien, bai: BaiViet): boolean {
  if (phien.vaiTro === 'quan-tri') return true
  if (phien.vaiTro === 'bien-tap' && bai.trangThai !== 'da_xuat_ban') return true
  return bai.tacGiaId === phien.userId          // chủ sở hữu
}
```

Thực tế phần lớn hệ thống dùng lai: vai trò cho quyền chung, kiểm tra chủ sở hữu cho từng bản ghi.

Dù chọn mô hình nào, hãy đặt logic quyền vào **một chỗ** — rải `if (vaiTro === 'admin')` khắp codebase là cách chắc chắn để có một chỗ bị quên.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Chỉ kiểm tra ở middleware | Gọi thẳng API là qua mặt | Kiểm tra lại ở action/handler |
| Không tạo phiên mới sau đăng nhập | Session fixation | Sinh token mới |
| Thông báo "email không tồn tại" | Dò được tài khoản | Thông báo chung |
| Coi mật khẩu + câu hỏi bí mật là 2FA | Vẫn một yếu tố | Dùng TOTP hoặc passkey |
| Logic quyền rải khắp nơi | Một chỗ quên là lỗ hổng | Tập trung một module |

## Ghi nhớ

- AuthN = bạn là ai; AuthZ = bạn được làm gì. `401` khác `403`.
- 2FA phải là hai **loại** yếu tố khác nhau.
- Middleware là trải nghiệm; kiểm tra thật nằm ở nơi truy cập dữ liệu.
- Tập trung logic phân quyền vào một chỗ duy nhất.

## Tự kiểm tra

1. Người dùng đã đăng nhập cố xoá bài của người khác — trả `401` hay `403`?
2. Vì sao phải sinh token phiên mới sau khi đăng nhập thành công?
3. Khi nào RBAC không đủ và cần tới ABAC?
