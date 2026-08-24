---
title: Form, validation và ranh giới lỗi
slug: form-va-xu-ly-loi
summary: Controlled và uncontrolled, validate ở cả hai phía, và cách để một lỗi không làm trắng cả trang.
level: nang-cao
tags: [react, form, validation, error-boundary]
---

> **Sau bài này bạn sẽ:** dựng được form có validate, thông báo lỗi rõ ràng và không mất dữ liệu khi submit hỏng.

## Controlled và uncontrolled

```tsx
// Controlled: React giữ giá trị
const [email, setEmail] = useState('')
<input value={email} onChange={(e) => setEmail(e.target.value)} />

// Uncontrolled: DOM giữ giá trị, React chỉ đọc khi cần
const oEmail = useRef<HTMLInputElement>(null)
<input ref={oEmail} defaultValue="" />
```

Controlled cho phép phản ứng theo từng ký tự (kiểm tra tức thì, định dạng số điện thoại, bật/tắt nút). Đổi lại là mỗi ký tự một lần render — với form 30 trường thì thấy rõ.

Uncontrolled nhanh hơn và ít code hơn, nhưng khó phản ứng theo thời gian thực.

Thực tế: dùng thư viện (react-hook-form) — nó mặc định uncontrolled nên nhanh, mà vẫn cung cấp validate, lỗi theo trường và trạng thái submit.

## Một schema cho cả hai phía

Validate ở client là **trải nghiệm**; validate ở server là **an toàn**. Không bao giờ chỉ có cái đầu — người dùng gửi thẳng request tới API là chuyện bình thường.

Cách gọn nhất là chia sẻ đúng một schema:

```ts
// dungChung/form.schema.ts — không có 'use server', import được cả hai phía
import { z } from 'zod'

export const DangKySchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  matKhau: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  dieuKhoan: z.literal(true, { message: 'Bạn phải đồng ý điều khoản' }),
})
export type DangKyValues = z.infer<typeof DangKySchema>
```

```tsx
// Client
const form = useForm<DangKyValues>({ resolver: zodResolver(DangKySchema) })

// Server
const parsed = DangKySchema.safeParse(input)
if (!parsed.success) {
  return { ok: false, loi: 'Dữ liệu chưa hợp lệ', loiTheoTruong: parsed.error.flatten().fieldErrors }
}
```

Thông báo lỗi viết trong schema xuất hiện giống hệt nhau ở cả hai nơi.

## Trả lỗi server về đúng trường

```tsx
const onSubmit = form.handleSubmit(async (data) => {
  const kq = await dangKyAction(data)
  if (!kq.ok) {
    // Ví dụ: email đã tồn tại — chỉ server mới biết được
    for (const [truong, thongBao] of Object.entries(kq.loiTheoTruong ?? {})) {
      if (thongBao?.[0] !== undefined) form.setError(truong as keyof DangKyValues, { message: thongBao[0] })
    }
    toast.error(kq.loi)
    return
  }
  router.push('/chao-mung')
})
```

Nguyên tắc quan trọng: **submit hỏng thì không xoá dữ liệu người dùng đã nhập.** Giữ nguyên form, chỉ gắn lỗi vào trường tương ứng.

## Khả năng truy cập, làm đúng từ đầu

```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  autoComplete="email"
  aria-invalid={loi !== undefined}
  aria-describedby={loi !== undefined ? 'email-loi' : undefined}
  {...register('email')}
/>
{loi !== undefined && <p id="email-loi" role="alert">{loi}</p>}
```

- `label htmlFor` — bấm vào nhãn là focus vào ô; trình đọc màn hình đọc đúng tên.
- `type` đúng — điện thoại hiện bàn phím phù hợp.
- `autoComplete` — trình duyệt điền hộ.
- `role="alert"` — trình đọc màn hình thông báo lỗi ngay.

Đây là bốn dòng, làm ngay từ đầu thì không tốn gì; thêm sau thì phải sửa cả file.

## Ranh giới lỗi (Error Boundary)

Một lỗi lúc render không được bắt sẽ gỡ **toàn bộ** cây React — người dùng thấy trang trắng. Ranh giới lỗi chặn nó lại ở một nhánh:

```tsx
// Next.js App Router: chỉ cần đặt file error.tsx trong thư mục route
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Có lỗi xảy ra</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Thử lại</button>
    </div>
  )
}
```

Ranh giới lỗi **không** bắt được: lỗi trong event handler, lỗi bất đồng bộ, lỗi ở server rendering. Những chỗ đó phải `try/catch` thủ công.

Đặt ranh giới ở mức đủ nhỏ để phần còn lại của trang vẫn dùng được — một biểu đồ hỏng không nên làm mất luôn thanh điều hướng.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Chỉ validate ở client | API bị gọi thẳng với dữ liệu rác | Validate lại ở server |
| Hai schema client/server | Thông báo lệch nhau, dễ quên đồng bộ | Chia sẻ một schema |
| Reset form khi submit lỗi | Người dùng mất hết dữ liệu đã gõ | Giữ nguyên, chỉ gắn lỗi |
| `<input>` không có `<label>` | Không dùng được bằng bàn phím/trình đọc | `label htmlFor` + `id` |
| Không có error boundary | Một lỗi làm trắng cả app | `error.tsx` cho mỗi nhánh |

## Ghi nhớ

- Validate client cho trải nghiệm, validate server cho an toàn — luôn có cả hai.
- Một schema dùng chung, một bộ thông báo lỗi.
- Submit hỏng thì giữ nguyên dữ liệu đã nhập.
- Error boundary không bắt lỗi trong handler và code bất đồng bộ.

## Tự kiểm tra

1. Vì sao validate ở client không thay được validate ở server?
2. Server báo "email đã tồn tại". Hiển thị lỗi này ở đâu và bằng cách nào?
3. Error boundary không bắt được những loại lỗi nào? Xử lý chúng ra sao?
