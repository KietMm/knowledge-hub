---
title: Generic trong TypeScript
slug: generic-trong-typescript
summary: Viết hàm dùng lại được cho nhiều kiểu mà không mất thông tin kiểu — và biết khi nào generic là thừa.
level: nang-cao
tags: [typescript, generic]
---

> **Sau bài này bạn sẽ:** đọc được chữ ký kiểu `<T extends { id: string }>`, và tự viết được hàm tiện ích giữ nguyên kiểu đầu vào ở đầu ra.

## Vấn đề generic giải quyết

```ts
// Mất kiểu: kết quả là any, trình soạn thảo hết gợi ý
function dauTien(mang: any[]): any {
  return mang[0]
}
const ten = dauTien(['a', 'b'])   // any — .toUpperCase() không được gợi ý

// Generic: kiểu đầu vào chảy thẳng ra đầu ra
function dauTien2<T>(mang: T[]): T | undefined {
  return mang[0]
}
const ten2 = dauTien2(['a', 'b'])   // string | undefined
```

`T` là **tham số kiểu** — chỗ trống được điền vào lúc gọi. Bạn hầu như không cần viết `dauTien2<string>([...])`; TypeScript tự suy ra từ đối số.

## Ràng buộc với `extends`

`T` trần nghĩa là "bất kỳ kiểu nào", nên bên trong hàm bạn gần như không làm gì được với nó. `extends` đặt yêu cầu tối thiểu:

```ts
function timTheoId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id)
}

const users = [{ id: '1', ten: 'An' }]
timTheoId(users, '1')?.ten     // TS vẫn biết có .ten — không bị thu về { id: string }
```

Điểm mấu chốt: hàm chỉ **yêu cầu** có `id`, nhưng **trả lại** đúng kiểu đầy đủ bạn truyền vào.

## `keyof` và truy cập thuộc tính an toàn

```ts
function lay<T, K extends keyof T>(obj: T, khoa: K): T[K] {
  return obj[khoa]
}

const u = { id: '1', tuoi: 30 }
lay(u, 'tuoi')     // number
lay(u, 'email')    // Lỗi biên dịch: 'email' không phải khoá của u
```

Đây là mẫu dùng nhiều nhất khi viết hàm tiện ích cho object.

## Giá trị mặc định và nhiều tham số kiểu

```ts
type KetQuaApi<TData, TLoi = string> = 
  | { ok: true; data: TData }
  | { ok: false; loi: TLoi }

async function goi<T>(url: string): Promise<KetQuaApi<T>> {
  const res = await fetch(url)
  if (!res.ok) return { ok: false, loi: `HTTP ${res.status}` }
  return { ok: true, data: (await res.json()) as T }
}

const kq = await goi<NguoiDung[]>('/api/users')
if (kq.ok) kq.data.length      // TS thu hẹp đúng nhánh
```

## Conditional type và `infer`

Dùng khi kiểu đầu ra phụ thuộc vào hình dạng của kiểu đầu vào:

```ts
type BocRa<T> = T extends Promise<infer U> ? U : T

type A = BocRa<Promise<string>>   // string
type B = BocRa<number>            // number
```

`infer U` nghĩa là "đặt tên cho phần khớp được ở vị trí này". Đây là cơ chế đằng sau `Awaited<T>`, `ReturnType<T>`, `Parameters<T>` có sẵn.

## Kiểu tiện ích có sẵn — dùng thay vì viết lại

```ts
type NguoiDung = { id: string; ten: string; email: string; matKhau: string }

type CongKhai = Omit<NguoiDung, 'matKhau'>            // bỏ trường
type ChiTen = Pick<NguoiDung, 'id' | 'ten'>           // giữ trường
type Nhap = Partial<NguoiDung>                        // mọi trường tuỳ chọn
type DayDu = Required<Nhap>                           // ngược lại
type Khoa = Readonly<NguoiDung>                       // không sửa được
type BangTen = Record<string, NguoiDung>              // từ điển
type TraVe = ReturnType<typeof goi>                   // kiểu trả về của hàm
type CoThe = NonNullable<string | null>               // string
```

`Omit` đặc biệt hữu ích cho ranh giới API: định nghĩa kiểu đầy đủ một lần rồi dẫn xuất kiểu "gửi ra ngoài" từ đó — thêm trường nhạy cảm sau này sẽ tự động không bị lộ.

## Khi nào generic là thừa

Generic chỉ đáng dùng khi kiểu **đi vào** ảnh hưởng kiểu **đi ra**. Nếu không:

```ts
// Thừa: T chỉ xuất hiện một lần
function ghiLog<T>(x: T): void { console.log(x) }
function ghiLog2(x: unknown): void { console.log(x) }   // đơn giản hơn, tương đương
```

Quy tắc: **một tham số kiểu chỉ xuất hiện đúng một lần trong chữ ký thì gần như chắc chắn nên bỏ đi.**

## Lỗi hay gặp

| Lỗi | Vì sao | Sửa thế nào |
|---|---|---|
| `<T>` không ràng buộc rồi truy cập `T.id` | TS không biết `T` có gì | `T extends { id: string }` |
| Viết `f<string>(x)` khắp nơi | Suy luận đã đủ | Bỏ tham số kiểu tường minh |
| Generic có `T` chỉ ở tham số | Không mang lại gì | Dùng `unknown` |
| Tự viết lại `Partial`, `Omit` | Có sẵn, chuẩn hơn | Dùng kiểu tiện ích |
| `any[]` trong hàm dùng chung | Mất kiểu ở mọi nơi gọi | `T[]` |

## Ghi nhớ

- Generic để **giữ** thông tin kiểu, không phải để "cho linh hoạt".
- `extends` là yêu cầu tối thiểu, không phải thu hẹp kết quả.
- `keyof` + `T[K]` là bộ đôi cho hàm tiện ích trên object.
- Tham số kiểu chỉ xuất hiện một lần ⇒ bỏ đi.

## Tự kiểm tra

1. Viết `nhomTheo<T, K extends keyof T>(items: T[], khoa: K)` trả về `Record<string, T[]>`.
2. `Omit<User, 'matKhau'>` an toàn hơn việc gõ tay danh sách trường ở chỗ nào?
3. Vì sao `function f<T>(x: T): void` nên đổi thành `function f(x: unknown): void`?
