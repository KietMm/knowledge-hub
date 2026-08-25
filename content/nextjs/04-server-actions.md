---
title: Server Actions
slug: server-actions
summary: Hàm chạy ở server gọi được thẳng từ form và nút bấm — kèm những ràng buộc an toàn không được quên.
level: trung-cap
tags: [nextjs, server-actions, form]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được Server Action đúng cả về cách dùng lẫn về an toàn, và biết ba quy tắc không bao giờ được bỏ qua.

## Ý tưởng chính

Server Action là **một hàm chạy ở server mà bạn gọi được thẳng từ giao diện** — không viết endpoint, không `fetch`, không tự tay tuần tự hoá dữ liệu.

Nhưng chính vì tiện, nó dễ khiến người ta quên một sự thật: **mỗi Server Action là một endpoint HTTP công khai**. Ai cũng gọi được, với dữ liệu bất kỳ.

## Mental model

Hãy nghĩ tới **chuông cửa nhà bạn**.

> Bạn gắn chuông và nối dây vào bếp cho tiện. Rất gọn — nhưng **cái chuông nằm ngoài đường**, và ai đi qua cũng bấm được.
>
> Nên câu hỏi không phải *"ai sẽ bấm chuông"*, mà là *"khi có người lạ bấm thì chuyện gì xảy ra?"*

`fetch` viết tay bắt bạn nghĩ tới HTTP nên bạn tự nhớ kiểm tra. Server Action **giấu HTTP đi**, và cái bẫy nằm đúng ở chỗ đó: code trông như một lời gọi hàm nội bộ, nhưng nó không phải.

## Ví dụ nhỏ

```tsx
// app/actions.ts
'use server'

export async function themViec(formData: FormData) {
  const ten = formData.get('ten') as string
  await db.viec.create({ data: { ten } })
  revalidatePath('/viec')
}
```

```tsx
// Dùng thẳng trong form — chạy được cả khi JavaScript chưa tải xong
<form action={themViec}>
  <input name="ten" />
  <button>Thêm</button>
</form>
```

## Code chạy thế nào

```text
Người dùng bấm Gửi
  → trình duyệt gói form thành FormData
  → gửi POST tới một endpoint Next TỰ SINH (id của action nằm trong bundle)
  → server tìm hàm theo id, chạy nó
  → revalidatePath làm mới cache
  → server trả về phần giao diện đã cập nhật
  → React vá vào cây, KHÔNG tải lại trang
```

Điểm mấu chốt: **bước hai là một request HTTP thật**, và không có gì ngăn ai đó tự gửi request đó bằng `curl` với dữ liệu tuỳ ý. Ba quy tắc dưới đây tồn tại vì lý do đó.

## Cú pháp

**Ba quy tắc bắt buộc**, không có ngoại lệ:

```ts
'use server'

export async function xoaBaiViet(id: string) {
  // ① XÁC THỰC — ai đang gọi?
  const phien = await layPhien()
  if (!phien) throw new Error('Chưa đăng nhập')

  // ② PHÂN QUYỀN — người này có được làm việc này với BẢN GHI NÀY không?
  const bai = await db.baiViet.findUnique({ where: { id } })
  if (bai?.tacGiaId !== phien.userId) throw new Error('Không có quyền')

  // ③ KIỂM TRA DỮ LIỆU — không tin bất cứ thứ gì gửi lên
  const kq = XoaSchema.safeParse({ id })
  if (!kq.success) throw new Error('Dữ liệu không hợp lệ')

  await db.baiViet.delete({ where: { id } })
  revalidatePath('/bai-viet')
}
```

Quy tắc ② là quy tắc bị quên nhiều nhất: nhiều người kiểm "đã đăng nhập chưa" rồi dừng, và thế là **người dùng A xoá được bài của người dùng B** chỉ bằng cách đổi id. Đây chính là lỗ hổng IDOR — xem [[phan-quyen-theo-ban-ghi]].

Gọi từ Client Component với trạng thái:

```tsx
'use client'
import { useActionState } from 'react'

export function Form() {
  const [state, action, dangCho] = useActionState(themViec, { loi: null })
  return (
    <form action={action}>
      <input name="ten" />
      <button disabled={dangCho}>{dangCho ? 'Đang lưu…' : 'Thêm'}</button>
      {state.loi && <p>{state.loi}</p>}
    </form>
  )
}
```

## Tại sao cần nó

Vì so với cách cũ, nó bỏ đi rất nhiều việc lặp:

```text
Cách cũ:  viết route handler → viết fetch ở client → tự quản loading/error
          → tự parse JSON → tự làm mới dữ liệu sau khi ghi

Server Action:  viết hàm → gắn vào form
```

Và có một lợi ích ít người để ý: **form hoạt động cả khi JavaScript chưa tải xong**. `<form action={serverAction}>` là form HTML thật — mạng chậm, JS lỗi, người dùng vẫn gửi được.

Hai thứ đi kèm hay dùng:

**Cập nhật lạc quan** — hiện kết quả ngay, sửa lại nếu server từ chối:

```tsx
const [dsLacQuan, themLacQuan] = useOptimistic(ds, (cu, moi) => [...cu, moi])
```

**Làm mới cache sau khi ghi** — bắt buộc, nếu không màn hình vẫn hiện dữ liệu cũ:

```ts
revalidatePath('/viec')          // làm mới một đường dẫn
revalidateTag('danh-sach-viec')  // làm mới mọi fetch gắn thẻ này
redirect('/viec')                // chuyển trang (gọi NGOÀI try/catch)
```

## So sánh

| | Server Action | Route Handler |
|---|---|---|
| Gọi từ | Form, component của chính app | Bất kỳ ai: mobile, webhook, bên thứ ba |
| Kiểu dữ liệu | Có kiểu đầu–cuối | Tự định nghĩa |
| Chạy khi chưa có JS | ✅ (qua `<form>`) | ❌ |
| Trả về không phải JSON (file, ảnh) | ❌ | ✅ |
| Dùng cho | Ghi dữ liệu từ giao diện của bạn | API công khai, webhook, tải file |

Xem thêm [[route-handler-va-middleware]] cho phía còn lại.

## Dễ nhầm

**1. Quên rằng đây là endpoint công khai.** Ba quy tắc ở trên. Đây là mục quan trọng nhất của bài.

**2. Chỉ kiểm "đã đăng nhập".** Xác thực trả lời *"anh là ai"*; phân quyền trả lời *"anh có được làm việc này với bản ghi này không"*. Thiếu vế hai là lỗ hổng.

**3. Truyền dữ liệu nhạy cảm qua tham số ẩn.**

```tsx
<input type="hidden" name="gia" value={sp.gia} />   // ❌ người dùng sửa được thành 0
```

Giá, quyền, id chủ sở hữu phải **lấy lại từ cơ sở dữ liệu ở phía server**, không tin giá trị gửi lên.

**4. Gọi `redirect()` bên trong `try/catch`.** `redirect` hoạt động bằng cách **ném một lỗi đặc biệt**, nên `catch` của bạn sẽ nuốt mất nó. Đặt nó sau khối `try`.

**5. Quên `revalidatePath` sau khi ghi.** Ghi thành công nhưng màn hình vẫn hiện dữ liệu cũ — và người dùng bấm lại lần nữa, tạo bản ghi trùng.

**6. Ném lỗi thô ra người dùng.** Thông báo lỗi của cơ sở dữ liệu có thể lộ tên bảng và cấu trúc. Trả về thông báo thân thiện, ghi chi tiết vào log.

## Mẹo nhớ

> **Server Action là cái chuông cửa nối vào bếp — nó nằm ngoài đường.**
>
> **Xác thực → phân quyền → kiểm tra dữ liệu. Mỗi action, mỗi lần.**
>
> **Ghi xong phải `revalidate`, nếu không màn hình nói dối.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao Server Action là endpoint công khai dù bạn không viết route nào?
2. Ba quy tắc bắt buộc, và quy tắc nào hay bị quên nhất?
3. Vì sao không được tin `<input type="hidden" name="gia">`?
4. Vì sao `redirect()` không được đặt trong `try/catch`?
5. Điều gì xảy ra nếu quên `revalidatePath` sau khi ghi?

## Tự viết lại

Không nhìn lại phần trên, sửa action này cho an toàn:

```ts
'use server'
export async function capNhatGia(formData: FormData) {
  const id = formData.get('id') as string
  const gia = Number(formData.get('gia'))
  await db.sanPham.update({ where: { id }, data: { gia } })
}
```

Tự kiểm: bạn thêm mấy lớp kiểm tra, và câu hỏi khó — **ai** được phép đổi giá, và bạn xác định điều đó từ đâu?

## Thử sức

Một Server Action `thanhToan(formData)` nhận `soTien` từ form. Bạn đã kiểm tra đăng nhập và validate `soTien` là số dương.

Vẫn còn một lỗ hổng nghiêm trọng. Chỉ ra nó, mô tả cách khai thác bằng `curl`, và nói **nguyên tắc chung** rút ra được — nguyên tắc đó áp dụng cho mọi action, không riêng bài này.
