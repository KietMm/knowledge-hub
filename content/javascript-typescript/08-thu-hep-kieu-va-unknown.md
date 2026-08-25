---
title: Thu hẹp kiểu, unknown và type guard
slug: thu-hep-kieu-va-unknown
summary: Cách xử lý dữ liệu chưa biết kiểu mà không dùng any, và cách viết hàm giúp TypeScript tự hiểu.
level: nang-cao
tags: [typescript, type-guard, unknown, zod]
khung: v2
---

> **Sau bài này bạn sẽ:** xử lý được dữ liệu từ bên ngoài mà không cần `any` hay `as`, và biết đặt việc kiểm tra ở đúng một chỗ.

## Ý tưởng chính

TypeScript biến mất lúc chạy. Nên với dữ liệu **từ bên ngoài** — API, file, `localStorage`, input người dùng — nó chỉ biết những gì bạn khai, và **nếu bạn khai sai thì nó tin bạn**.

Có đúng hai cách xử lý tình huống đó: `any` (bỏ kiểm tra, và lỗi hiện ra ở nơi khác) hoặc `unknown` (buộc phải chứng minh trước khi dùng). Bài này về cách thứ hai.

## Mental model

Hãy nghĩ tới **một gói hàng lạ đặt trước cửa**.

> `any` là **xé ra dùng luôn**, cứ tin đó là thứ bạn đặt. Nếu bên trong là thứ khác, bạn phát hiện ra khi đã đổ nó vào nồi.
>
> `unknown` là **gói hàng còn nguyên niêm phong**. TypeScript không cho bạn dùng cho tới khi bạn **kiểm tra và chứng minh** nó là gì.

Việc "chứng minh" đó gọi là **thu hẹp kiểu** (narrowing), và mỗi lần bạn chứng minh được một điều, TypeScript ghi nhớ nó cho những dòng phía sau.

## Ví dụ nhỏ

```ts
function xuLy(x: unknown) {
  x.toUpperCase()          // ❌ TS chặn: chưa biết x là gì

  if (typeof x === 'string') {
    x.toUpperCase()        // ✅ trong khối này, TS biết x là string
  }
}
```

Một câu `if` và TypeScript **tự đổi kiểu của `x`** trong khối đó. Bạn không phải khai gì thêm.

## Code chạy thế nào

Thu hẹp kiểu là TypeScript **theo dõi những gì bạn đã chứng minh**, theo từng nhánh:

```text
function f(x: string | number | null)

vào hàm:              x: string | number | null

if (x === null) {
      trong đây:      x: null
} else {
      trong đây:      x: string | number      ← đã loại null
  if (typeof x === 'string') {
      trong đây:      x: string
  } else {
      trong đây:      x: number               ← chỉ còn một khả năng
  }
}
```

Nhánh `else` cuối cùng đáng chú ý: TypeScript **tự suy** ra `number` mà không cần bạn nói. Đây là lý do union type mạnh hơn nhiều so với `any` — nó cho phép suy luận theo nhánh.

Các cách thu hẹp, xếp theo tần suất dùng:

```ts
typeof x === 'string'          // kiểu nguyên thuỷ
x instanceof Error             // class
'email' in x                   // object có thuộc tính này không
Array.isArray(x)               // mảng
x === null / x !== undefined   // loại null-ish
if (!x) return                 // chặn sớm — cách gọn nhất
```

## Cú pháp

**Type guard tự viết** — dạy TypeScript hiểu một kiểm tra của bạn:

```ts
type NguoiDung = { id: string; ten: string }

function laNguoiDung(x: unknown): x is NguoiDung {     // ← "x is T" là phần quan trọng
  return (
    typeof x === 'object' && x !== null &&
    'id' in x && typeof (x as any).id === 'string' &&
    'ten' in x && typeof (x as any).ten === 'string'
  )
}

if (laNguoiDung(du)) {
  du.ten   // ✅ TS biết là NguoiDung
}
```

**Bắt lỗi trong `catch`** — chỗ ai cũng gặp:

```ts
try { } catch (e) {
  // e là unknown (từ TS 4.4) — vì JS cho phép `throw` bất cứ thứ gì
  const thongDiep = e instanceof Error ? e.message : String(e)
}
```

**Kiểm tra vét cạn với `never`** — bắt lỗi lúc biên dịch khi thêm loại mới:

```ts
type Trang = 'nhap' | 'cho' | 'xong'

function nhan(t: Trang): string {
  switch (t) {
    case 'nhap': return 'Nháp'
    case 'cho': return 'Đang chờ'
    case 'xong': return 'Hoàn tất'
    default: {
      const _het: never = t      // ❌ nếu thêm trạng thái mới mà quên xử lý → lỗi Ở ĐÂY
      return _het
    }
  }
}
```

## Tại sao cần nó

Vì cách thực dụng nhất không phải viết type guard bằng tay cho mọi thứ — mà là **kiểm tra một lần ở ranh giới**:

```ts
import { z } from 'zod'

const NguoiDungSchema = z.object({
  id: z.string(),
  ten: z.string(),
  tuoi: z.number().int().positive().optional(),
})

type NguoiDung = z.infer<typeof NguoiDungSchema>    // ← kiểu SINH RA từ schema

async function layNguoiDung(id: string): Promise<NguoiDung> {
  const res = await fetch(`/api/users/${id}`)
  return NguoiDungSchema.parse(await res.json())     // sai hình dạng → ném lỗi NGAY tại đây
}
```

Ba thứ bạn được cùng lúc:

```text
① Kiểu TypeScript      (z.infer — không phải khai hai lần)
② Kiểm tra lúc chạy    (parse)
③ Lỗi nổ ĐÚNG CHỖ      (tại ranh giới, không phải ở chỗ dùng, ba tầng sau)
```

Điểm ③ là giá trị lớn nhất và ít người nói tới: không có nó, dữ liệu sai hình dạng lặng lẽ đi sâu vào hệ thống và nổ ở một nơi chẳng liên quan gì tới nguyên nhân.

**Ranh giới** của một hệ thống gồm: phản hồi API, tham số URL, form người dùng nhập, `localStorage`, biến môi trường, nội dung file. Kiểm ở đó — bên trong thì tin kiểu.

## So sánh

| | `any` | `unknown` |
|---|---|---|
| Gán từ mọi kiểu vào | ✅ | ✅ |
| Gán ra kiểu khác | ✅ (nguy hiểm) | ❌ phải thu hẹp trước |
| Gọi phương thức trực tiếp | ✅ (nổ lúc chạy) | ❌ TS chặn |
| Lây lan sang chỗ khác | ✅ | ❌ |

Nguyên tắc: **`unknown` ở ranh giới, kiểu cụ thể ở bên trong, không bao giờ `any`.**

## Dễ nhầm

**1. Dùng `as` thay vì kiểm tra.**

```ts
const u = duLieu as NguoiDung   // ❌ không kiểm gì cả, chỉ là lời hứa
```

`as` chỉ nên dùng khi bạn biết điều mà TypeScript không thể biết, và điều đó **hiếm hơn** bạn tưởng.

**2. Type guard sai mà TypeScript vẫn tin.**

```ts
function laSo(x: unknown): x is number {
  return typeof x === 'string'   // ❌ SAI, nhưng TS tin tuyệt đối
}
```

`x is T` chuyển trách nhiệm sang **bạn**. Viết sai thì không ai bắt được — đây là lý do nên ưu tiên zod hơn type guard tự viết.

**3. Quên rằng `typeof null === 'object'`.**

```ts
if (typeof x === 'object') x.ten     // ❌ x có thể là null
if (typeof x === 'object' && x !== null) x.ten   // ✅
```

**4. Kiểm tra ở sai chỗ.** Kiểm ở mọi chỗ dùng thì code đầy `if` trùng lặp; không kiểm ở đâu cả thì lỗi nổ lung tung. Kiểm **đúng một lần, ở ranh giới**.

**5. Bỏ qua mẫu `never`.** Nó là cách duy nhất bắt được "quên xử lý loại mới" **lúc biên dịch**. Không có nó, thêm một trạng thái vào union chỉ lộ ra khi có người dùng thật gặp phải.

## Mẹo nhớ

> **`any` là xé gói ra dùng luôn. `unknown` là còn nguyên niêm phong.**
>
> **Kiểm tra một lần ở ranh giới, tin kiểu ở bên trong.**
>
> **`as` là lời hứa, không phải kiểm tra.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao TypeScript **không** bảo vệ được dữ liệu từ API?
2. `any` và `unknown` khác nhau ở chỗ nào — nêu hậu quả thực tế của mỗi cái?
3. `x is NguoiDung` chuyển trách nhiệm cho ai?
4. Kể ba chỗ là "ranh giới" của một ứng dụng web.
5. Mẫu `const _het: never = t` bắt được lỗi gì, và bắt vào **lúc nào**?

## Tự viết lại

Không nhìn lại phần trên, viết hàm đọc cấu hình từ `localStorage` an toàn:

```ts
function docCauHinh(): { theme: 'sang' | 'toi'; coChu: number } {
  // localStorage có thể: không có key, JSON hỏng, hoặc đúng JSON nhưng sai hình dạng
}
```

Tự kiểm: bạn xử lý **ba** tình huống hỏng đó ở mấy chỗ, và hàm của bạn trả về gì khi dữ liệu sai — ném lỗi hay dùng giá trị mặc định? Nêu lý do.

## Thử sức

Đội bạn có quy ước: *"mọi phản hồi API đều `as` sang kiểu đã khai, cho nhanh"*. Hệ thống chạy ổn hai năm.

Rồi backend đổi `tuoi` từ `number` sang `string`. Hãy mô tả **chính xác** chuyện gì xảy ra: lỗi nổ ở đâu, thông báo lỗi trông thế nào, và mất bao lâu để lần ra nguyên nhân. Sau đó: nếu có zod ở ranh giới thì ba câu trả lời trên đổi thành gì?
