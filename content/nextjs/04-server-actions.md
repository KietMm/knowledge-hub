---
title: Server Actions
slug: server-actions
summary: Hàm chạy ở server gọi được thẳng từ form và nút bấm — kèm những ràng buộc an toàn không được quên.
level: trung-cap
tags: [nextjs, server-actions, form]
---

> **Sau bài này bạn sẽ:** viết được luồng tạo/sửa/xoá không cần API route, và biết vì sao mỗi Server Action phải tự kiểm tra quyền.

## Ý tưởng

`'use server'` biến một hàm thành điểm cuối HTTP mà Next tự sinh. Client gọi nó như gọi hàm thường; thực chất là một POST request:

```ts
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TaoBaiSchema = z.object({
  tieuDe: z.string().trim().min(1, 'Tiêu đề không được để trống'),
  noiDung: z.string().default(''),
})

export async function taoBai(input: unknown) {
  const parsed = TaoBaiSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, loi: 'Dữ liệu chưa hợp lệ',
             loiTheoTruong: parsed.error.flatten().fieldErrors }
  }

  const phien = await layPhien()
  if (phien === null) return { ok: false as const, loi: 'Bạn cần đăng nhập' }

  const bai = await db.baiViet.create({ data: { ...parsed.data, tacGiaId: phien.userId } })
  revalidatePath('/bai-viet')
  return { ok: true as const, data: { slug: bai.slug } }
}
```

## Ba quy tắc bắt buộc

### 1. Mỗi action là một endpoint công khai

Bất kỳ ai cũng gọi được, với bất kỳ dữ liệu nào. Việc người dùng không thấy nút trên giao diện **không** ngăn được họ gọi action.

Vì vậy mỗi action phải tự làm đủ ba việc: **kiểm tra đăng nhập**, **kiểm tra quyền trên đúng bản ghi đó**, và **validate dữ liệu**. Không có ngoại lệ.

```ts
const bai = await db.baiViet.findUnique({ where: { id } })
if (bai === null) return { ok: false, loi: 'Không tìm thấy' }
if (bai.tacGiaId !== phien.userId) return { ok: false, loi: 'Không có quyền' }
```

### 2. File `'use server'` chỉ được export async function

Export một giá trị (schema zod, hằng số) từ file `'use server'` rồi import vào Client Component là sai ranh giới. Đặt schema ở file riêng **không** có `'use server'` để cả hai phía import được.

### 3. Trả về kết quả, đừng ném lỗi ra UI

```ts
type KetQua<T> = { ok: true; data: T } | { ok: false; loi: string; loiTheoTruong?: Record<string, string[]> }
```

Kiểu này buộc nơi gọi phải xử lý nhánh lỗi. Ném exception qua ranh giới server/client sẽ mất chi tiết ở production (Next che thông báo lỗi thật để tránh lộ thông tin).

## Gọi từ form — chạy được cả khi không có JS

```tsx
// Server Component, không cần 'use client'
export default function Form() {
  async function xuLy(formData: FormData) {
    'use server'
    await taoBai({ tieuDe: formData.get('tieuDe'), noiDung: formData.get('noiDung') })
  }
  return (
    <form action={xuLy}>
      <input name="tieuDe" />
      <button type="submit">Lưu</button>
    </form>
  )
}
```

Đây là progressive enhancement thật sự: form hoạt động ngay cả khi JavaScript chưa tải xong.

## Gọi từ Client Component

```tsx
'use client'
import { useTransition } from 'react'

export function NutXoa({ id }: { id: string }) {
  const [dangChay, batDau] = useTransition()

  return (
    <button
      disabled={dangChay}
      onClick={() =>
        batDau(async () => {
          const kq = await xoaBai(id)
          if (!kq.ok) toast.error(kq.loi)
        })
      }
    >
      {dangChay ? 'Đang xoá...' : 'Xoá'}
    </button>
  )
}
```

`useTransition` cho biết action đang chạy mà không cần thêm state — và giữ giao diện phản hồi trong lúc chờ.

## Cập nhật lạc quan

```tsx
'use client'
import { useOptimistic } from 'react'

const [danhSachHienThi, themLacQuan] = useOptimistic(
  danhSach,
  (hienTai, moi: Item) => [...hienTai, moi],
)

async function them(item: Item) {
  themLacQuan(item)          // hiện ngay
  await themAction(item)     // nếu hỏng, React tự quay về trạng thái thật
}
```

## Làm mới cache sau khi ghi

Ghi dữ liệu xong mà không làm mới cache thì người dùng vẫn thấy dữ liệu cũ:

```ts
revalidatePath('/bai-viet')              // một đường dẫn cụ thể
revalidatePath('/bai-viet/[slug]', 'page')  // mọi trang khớp mẫu
revalidateTag('bai-viet')                // theo tag đã gắn lúc fetch
```

Bẫy hay gặp: khi người dùng **đổi danh mục** của một bản ghi, phải revalidate cả đường dẫn **cũ** lẫn **mới**. Đọc bản ghi trước khi sửa để biết đường dẫn cũ là gì.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không kiểm tra quyền trong action | Ai cũng sửa được dữ liệu người khác | Kiểm tra phiên + quyền trên bản ghi |
| Tin dữ liệu từ client | Ghi rác vào DB | `safeParse` mọi input |
| Export schema từ file `'use server'` | Lỗi build khó hiểu | Tách schema ra file riêng |
| Quên `revalidatePath` | Giao diện hiện dữ liệu cũ | Revalidate sau mọi lần ghi |
| Chỉ revalidate đường dẫn mới | Trang cũ vẫn cache bản ghi đã chuyển đi | Revalidate cả hai |

## Ghi nhớ

- Server Action là endpoint công khai — luôn kiểm tra quyền và validate.
- File `'use server'` chỉ export async function.
- Trả `{ok, ...}` thay vì ném lỗi.
- Ghi xong phải revalidate, kể cả đường dẫn cũ.

## Tự kiểm tra

1. Vì sao ẩn nút "Xoá" trên giao diện không đủ để bảo vệ action xoá?
2. Viết action đổi mật khẩu, liệt kê mọi kiểm tra cần có trước khi ghi.
3. Bài viết chuyển từ chuyên mục A sang B. Cần revalidate những đường dẫn nào?
