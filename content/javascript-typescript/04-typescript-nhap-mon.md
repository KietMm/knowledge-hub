---
title: TypeScript nhập môn — type, interface và suy luận kiểu
slug: typescript-nhap-mon
summary: Khi nào dùng type, khi nào dùng interface, và vì sao khai báo kiểu thừa lại làm code tệ đi.
level: co-ban
tags: [typescript, type-system, interface]
khung: v2
---

> **Sau bài này bạn sẽ:** biết chỗ nào **nên** khai kiểu và chỗ nào nên để TypeScript tự suy, và không còn phân vân giữa `type` và `interface`.

## Ý tưởng chính

TypeScript không đổi cách chương trình chạy. Nó chỉ làm đúng một việc: **kiểm tra trước khi chạy rằng bạn không dùng dữ liệu sai cách**, rồi biến mất hoàn toàn lúc biên dịch.

Nói cách khác: TypeScript là một **bộ kiểm tra**, không phải một ngôn ngữ chạy được. Hiểu điều này giải thích cả điểm mạnh lẫn giới hạn của nó.

## Mental model

Hãy nghĩ tới **người soát vé ở cửa rạp** so với **bảo vệ bên trong rạp**.

> TypeScript là **người soát vé ở cửa**: kiểm tra lúc bạn đi vào, và chỉ có mặt ở đó. Vào được rồi thì anh ta không theo dõi bạn nữa.
>
> Dữ liệu từ API, từ file, từ input người dùng **không đi qua cửa đó** — chúng rơi thẳng vào trong rạp. Với những dữ liệu này, TypeScript chỉ biết những gì **bạn khai**, và nếu bạn khai sai thì nó tin bạn.

Đó là lý do `as SomeType` nguy hiểm: nó là bạn tự ký vào vé cho mình. Và cũng là lý do phải kiểm tra dữ liệu thật ở ranh giới — xem [[thu-hep-kieu-va-unknown]].

## Ví dụ nhỏ

```ts
function chao(ten: string) {
  return `Xin chào ${ten.toUpperCase()}`
}

chao('An')     // ✅
chao(42)       // ❌ lỗi ngay khi gõ, không phải lúc chạy
```

Không có TypeScript, `42.toUpperCase()` mới nổ — và nó nổ ở production, lúc 2 giờ sáng, chứ không phải lúc bạn đang gõ.

## Code chạy thế nào

TypeScript **suy luận** kiểu từ giá trị, nên phần lớn thời gian bạn không cần khai gì:

```text
const ten = 'An'                    → TS suy ra: 'An'  (literal type, vì const)
let tuoi = 30                       → TS suy ra: number
const ds = [1, 2, 3]                → TS suy ra: number[]
const f = (x: number) => x * 2      → TS suy ra kiểu trả về: number
```

Và đây là chỗ người mới hay làm hỏng:

```ts
// ❌ Khai thừa — mất thông tin, thêm chữ
const trangThai: string = 'dang_giao'
// kiểu là string ⇒ gán 'linh tinh' vào cũng được

// ✅ Để TS tự suy
const trangThai = 'dang_giao'
// kiểu là 'dang_giao' ⇒ chặt hơn, và tự thành union khi cần
```

**Quy tắc:** khai kiểu ở **ranh giới** (tham số hàm, kiểu trả về của API, dữ liệu vào), để TS tự suy ở **bên trong**.

## Cú pháp

```ts
type NguoiDung = { id: string; ten: string; tuoi?: number }   // ? = tuỳ chọn

interface Khach { id: string; ten: string }
interface Khach { email: string }        // interface GỘP được khi khai trùng tên

type Trang = 'nhap' | 'cho' | 'xong'      // union of literal — dùng rất nhiều
type Id = string | number

type CoTen = { ten: string }
type CoTuoi = { tuoi: number }
type Ca = CoTen & CoTuoi                  // giao hai kiểu

const ds: string[] = []
const cap: [number, string] = [1, 'a']    // tuple: cố định độ dài và kiểu từng ô
const bang: Record<string, number> = {}
```

## Tại sao cần nó

Ba thứ TypeScript mua cho bạn, xếp theo giá trị thực tế:

**1. Đổi tên và refactor không sợ.** Đổi một trường trong `NguoiDung` thì mọi chỗ dùng sai đều sáng đỏ ngay — thay vì phát hiện bằng cách chạy thử từng màn hình.

**2. Tài liệu luôn đúng.** Chữ ký `function tinhPhi(don: DonHang): number` nói rõ hơn mọi comment, và không bao giờ lỗi thời.

**3. Union type bắt được ca bạn quên xử lý.**

```ts
type Trang = 'nhap' | 'cho' | 'xong'

function nhan(t: Trang) {
  switch (t) {
    case 'nhap': return 'Nháp'
    case 'cho': return 'Đang chờ'
    // ❌ TS báo: thiếu 'xong' — nếu bật kiểm tra vét cạn
  }
}
```

Đây là giá trị lớn nhất mà người mới ít nhận ra: TypeScript không chỉ chặn lỗi, nó **liệt kê giúp bạn những trường hợp cần nghĩ tới**.

## So sánh

`type` và `interface` — khác biệt thực tế nhỏ hơn nhiều so với lượng tranh cãi:

| | `type` | `interface` |
|---|---|---|
| Object shape | ✅ | ✅ |
| Union (`A \| B`) | ✅ | ❌ |
| Tuple, kiểu hàm gọn | ✅ | Vụng hơn |
| Khai trùng tên thì **gộp** | ❌ | ✅ |
| Mở rộng | `&` | `extends` |

Quy ước thực dụng: **mặc định dùng `type`; dùng `interface` khi bạn *muốn* người khác gộp thêm vào** (thường là khi viết thư viện). Quan trọng hơn cả hai: **nhất quán trong một dự án**.

## Dễ nhầm

**1. Dùng `any` để cho qua lỗi.** `any` tắt hoàn toàn kiểm tra — và nó **lây lan**: mọi thứ chạm vào `any` cũng thành `any`. Nếu chưa biết kiểu, dùng `unknown` (buộc phải kiểm tra trước khi dùng).

**2. Tin vào `as`.**

```ts
const u = duLieu as NguoiDung   // ❌ chỉ là lời hứa của bạn, TS không kiểm gì
```

`as` không kiểm tra lúc chạy. Với dữ liệu từ bên ngoài, dùng zod hoặc một type guard thật.

**3. Không bật `strict`.** Không có nó, `null` và `undefined` lọt vào mọi kiểu, và bạn mất phần lớn giá trị của TypeScript. Bật `strict: true` ngay từ file `tsconfig.json` đầu tiên.

**4. Quên rằng truy cập mảng có thể trả `undefined`.**

```ts
const x = ds[10]     // TS nói number, thực tế có thể undefined
```

Bật `noUncheckedIndexedAccess: true` thì TS nói đúng sự thật (`number | undefined`) và buộc bạn xử lý. Phiền hơn, nhưng đây là nguồn lỗi runtime rất phổ biến.

**5. Tưởng TypeScript bảo vệ lúc chạy.** Nó biến mất sau khi biên dịch. Dữ liệu từ API sai hình dạng thì chương trình vẫn nổ như thường — người soát vé chỉ đứng ở cửa.

## Mẹo nhớ

> **TypeScript là người soát vé ở cửa, không phải bảo vệ bên trong.**
>
> **Khai kiểu ở ranh giới, để TS tự suy ở bên trong.**
>
> **`as` là tự ký vé cho mình.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. TypeScript làm gì, và **không** làm gì lúc chương trình chạy?
2. Vì sao `const trangThai: string = 'dang_giao'` là khai thừa và tệ hơn không khai?
3. Chỗ nào **nên** khai kiểu tường minh?
4. `any` và `unknown` khác nhau ở chỗ nào?
5. Vì sao `as NguoiDung` không an toàn với dữ liệu từ API?

## Tự viết lại

Không nhìn lại phần trên, khai kiểu cho một hệ đơn hàng có ba trạng thái (`nhap`, `dang_giao`, `da_huy`), trong đó **chỉ đơn đã huỷ mới có lý do huỷ**:

```ts
// Yêu cầu: TS phải BÁO LỖI khi đọc don.lyDoHuy trên đơn chưa huỷ
```

Tự kiểm: bạn dùng một `type` với trường tuỳ chọn, hay một union của ba kiểu? Cách nào bắt được lỗi ở đề bài?

## Thử sức

Đoạn này biên dịch qua nhưng nổ lúc chạy. Chỉ ra chính xác **chỗ TypeScript bị lừa**, và sửa lại:

```ts
type NguoiDung = { ten: string; tuoi: number }

const res = await fetch('/api/user')
const u = (await res.json()) as NguoiDung
console.log(u.ten.toUpperCase())
```

Sau đó trả lời câu khó hơn: **ranh giới** của hệ thống bạn nằm ở đâu, và bạn đặt việc kiểm tra ở những chỗ nào?
