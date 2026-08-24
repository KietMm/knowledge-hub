---
title: Thu hẹp kiểu, unknown và type guard
slug: thu-hep-kieu-va-unknown
summary: Cách xử lý dữ liệu chưa biết kiểu mà không dùng any, và cách viết hàm giúp TypeScript tự hiểu.
level: nang-cao
tags: [typescript, type-guard, unknown, zod]
---

> **Sau bài này bạn sẽ:** xử lý được `catch (error: unknown)` đúng cách, và thay mọi chỗ `as` bằng kiểm tra thật.

## `any` và `unknown`

Cả hai đều nhận mọi giá trị. Khác biệt nằm ở chiều ngược lại:

```ts
let a: any = layDuLieu()
a.bat_ky_cai_gi.sau_do()      // TS im lặng — sập lúc chạy

let u: unknown = layDuLieu()
u.gi_do                        // Lỗi biên dịch — phải kiểm tra trước
if (typeof u === 'string') u.toUpperCase()   // OK sau khi thu hẹp
```

`any` **tắt** kiểm tra kiểu và lây lan sang mọi biểu thức chạm vào nó. `unknown` giữ kiểm tra nhưng bắt bạn chứng minh trước khi dùng. Với dữ liệu từ bên ngoài, `unknown` luôn là lựa chọn đúng.

## Các cách thu hẹp kiểu

```ts
function xuLy(v: string | number | Date | null | undefined) {
  if (v == null) return 'trống'                 // loại cả null và undefined
  if (typeof v === 'string') return v.trim()    // typeof cho nguyên thuỷ
  if (v instanceof Date) return v.toISOString()  // instanceof cho class
  return v.toFixed(2)                            // còn lại chắc chắn là number
}
```

Với object, dùng `in` hoặc trường phân biệt:

```ts
type Chim = { bay: () => void }
type Ca = { boi: () => void }

function diChuyen(con: Chim | Ca) {
  if ('bay' in con) con.bay()
  else con.boi()
}
```

TypeScript còn hiểu cả **thu hẹp theo phép gán** và **thu hẹp qua `Array.isArray`**, `switch` trên literal, và điều kiện `&&`/`||`.

## Type guard tự viết

Khi kiểm tra phức tạp hơn `typeof`, viết hàm trả về `x is T` để TypeScript hiểu:

```ts
type NguoiDung = { id: string; ten: string }

function laNguoiDung(v: unknown): v is NguoiDung {
  return (
    typeof v === 'object' && v !== null &&
    'id' in v && typeof v.id === 'string' &&
    'ten' in v && typeof v.ten === 'string'
  )
}

const data: unknown = JSON.parse(chuoi)
if (laNguoiDung(data)) {
  data.ten           // TS biết là string
}
```

Cảnh báo quan trọng: `v is T` là **lời hứa của bạn**, TypeScript không kiểm tra thân hàm có đúng không. Guard viết ẩu nguy hiểm ngang `as`.

## Bắt lỗi trong catch

Từ TS 4.4, `catch (e)` có kiểu `unknown` (khi bật `useUnknownInCatchVariables`, đi kèm `strict`). Đúng, vì `throw` ném được bất cứ thứ gì:

```ts
try {
  await luu()
} catch (error) {
  const thongBao =
    error instanceof Error ? error.message : 'Lỗi không xác định'
  ghiLog(thongBao)
}
```

Mẫu này lặp lại nhiều nên đáng tách thành một hàm nhỏ dùng chung.

## Assert function

```ts
function assertLaChuoi(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new TypeError('Cần một chuỗi')
}

const x: unknown = layGiaTri()
assertLaChuoi(x)
x.toUpperCase()      // TS biết x là string từ dòng này trở đi
```

Khác type guard ở chỗ: guard trả về boolean để bạn rẽ nhánh, assert thì ném lỗi và thu hẹp kiểu cho **phần còn lại** của hàm.

## Cách thực dụng nhất: zod ở ranh giới

Viết type guard tay cho mọi hình dạng dữ liệu là việc tẻ nhạt và dễ sót. Ở ranh giới (HTTP response, file JSON, `localStorage`, biến môi trường), dùng schema:

```ts
import { z } from 'zod'

const NguoiDungSchema = z.object({
  id: z.string(),
  ten: z.string(),
  email: z.string().email(),
})
type NguoiDung = z.infer<typeof NguoiDungSchema>   // kiểu suy ra từ schema

const res = await fetch('/api/me')
const kq = NguoiDungSchema.safeParse(await res.json())
if (!kq.success) {
  return { ok: false, loi: 'Dữ liệu trả về không đúng định dạng' }
}
kq.data.email    // vừa đúng kiểu, vừa đã kiểm tra thật lúc chạy
```

Một schema cho **cả hai** việc — kiểm tra lúc chạy và sinh kiểu lúc biên dịch — nên hai thứ không bao giờ lệch nhau.

## Kiểm tra vét cạn với `never`

```ts
type TrangThai = 'cho' | 'chay' | 'xong'

function nhan(tt: TrangThai): string {
  switch (tt) {
    case 'cho': return 'Đang chờ'
    case 'chay': return 'Đang chạy'
    case 'xong': return 'Xong'
    default: {
      const chuaXuLy: never = tt      // thêm trạng thái mới -> lỗi ở đây
      throw new Error(`Trạng thái lạ: ${String(chuaXuLy)}`)
    }
  }
}
```

Mẹo này biến việc "quên cập nhật một chỗ" từ bug lúc chạy thành lỗi lúc build.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `const d = await res.json() as User` | Không ai kiểm tra, sập ở chỗ khác | `safeParse` bằng zod |
| `catch (e: any)` | Mất kiểm tra, che lỗi thật | `unknown` + `instanceof Error` |
| Type guard viết ẩu | Nói dối trình biên dịch | Kiểm tra đủ mọi trường |
| `as unknown as T` | Ép hai bước để lách kiểm tra | Sửa mô hình kiểu |
| Không có `default: never` | Thêm case mới lặng lẽ rơi ra ngoài | Thêm kiểm tra vét cạn |

## Ghi nhớ

- `unknown` cho dữ liệu bên ngoài, không bao giờ `any`.
- `x is T` là lời hứa không được kiểm chứng — viết cẩn thận hoặc dùng zod.
- Một schema zod thay cho cả kiểu lẫn validation.
- `const _: never = x` trong `default` bắt được mọi case thiếu lúc build.

## Tự kiểm tra

1. Vì sao `unknown` an toàn hơn `any` khi nhận dữ liệu từ `res.json()`?
2. Viết type guard cho `{ kieu: 'anh', url: string } | { kieu: 'chu', noiDung: string }`.
3. Thêm một giá trị vào union `TrangThai`. Chỗ nào trong code sẽ báo lỗi, và vì sao đó là điều tốt?
