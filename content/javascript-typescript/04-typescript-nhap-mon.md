---
title: TypeScript nhập môn — type, interface và suy luận kiểu
slug: typescript-nhap-mon
summary: Khi nào dùng type, khi nào dùng interface, và vì sao khai báo kiểu thừa lại làm code tệ đi.
level: co-ban
tags: [typescript, type-system, interface]
---

> **Sau bài này bạn sẽ:** viết được kiểu cho một API response mà không cần `any`, và hiểu vì sao trình soạn thảo tự biết kiểu ở phần lớn chỗ bạn định gõ tay.

## TypeScript làm gì

TypeScript kiểm tra kiểu **lúc biên dịch** rồi xoá sạch kiểu đi. Lúc chạy chỉ còn JavaScript thuần — nghĩa là:

- Kiểu **không** kiểm tra dữ liệu từ mạng, file, `localStorage`. Đó là việc của zod hoặc một hàm validate viết tay.
- Kiểu **không** làm chương trình chạy nhanh hơn.
- Kiểu bắt được sai sót trước khi chạy, và làm trình soạn thảo gợi ý được.

```ts
const data = await res.json()   // kiểu là any — TypeScript hết cách kiểm tra
const user = UserSchema.parse(data)  // zod kiểm tra thật lúc chạy, rồi mới có kiểu chắc chắn
```

## Để TypeScript tự suy luận

Đây là thói quen quan trọng nhất của người mới:

```ts
// Thừa: TypeScript đã biết
const ten: string = 'An'
const so: number = 42

// Đủ
const ten = 'An'
const so = 42
```

Chỗ **nên** ghi kiểu rõ là **ranh giới**: tham số hàm, kiểu trả về của hàm export, và hình dạng dữ liệu từ bên ngoài. Bên trong thân hàm, để nó tự suy luận — code ngắn hơn và tự cập nhật khi bạn đổi cấu trúc.

```ts
export function tinhTong(gioHang: Item[]): number {
  const daChon = gioHang.filter((i) => i.chon)   // Item[] — tự suy ra
  return daChon.reduce((t, i) => t + i.gia, 0)
}
```

## type và interface

```ts
interface NguoiDung {
  id: string
  ten: string
  email?: string          // tuỳ chọn
  readonly taoLuc: Date   // không gán lại được sau khi tạo
}

type NguoiDung2 = {
  id: string
  ten: string
}
```

Với object thuần, hai cách gần như tương đương. Khác biệt thật sự:

| | `interface` | `type` |
|---|---|---|
| Union (`A \| B`) | Không | Có |
| Kiểu nguyên thuỷ, tuple | Không | Có |
| Kế thừa | `extends` | `&` (intersection) |
| Khai báo trùng tên | **Gộp lại** (declaration merging) | Lỗi |
| Mapped/conditional type | Không | Có |

**Quy tắc thực dụng:** dùng `type` mặc định vì nó làm được mọi thứ; dùng `interface` khi viết thư viện cần cho người khác mở rộng, hoặc khi cần merge với kiểu của bên thứ ba.

Điểm dễ bỏ sót: declaration merging cắt cả hai chiều — tiện khi mở rộng `Window`, nhưng cũng nghĩa là hai `interface` trùng tên ở hai file sẽ **âm thầm gộp** thay vì báo lỗi.

## Union và literal type

Đây là chỗ TypeScript mạnh hơn hẳn các ngôn ngữ có kiểu khác:

```ts
type TrangThai = 'cho' | 'dang-chay' | 'xong' | 'loi'

function hienThi(tt: TrangThai) {
  switch (tt) {
    case 'cho': return 'Đang chờ'
    case 'dang-chay': return 'Đang chạy'
    case 'xong': return 'Hoàn tất'
    case 'loi': return 'Có lỗi'
  }
}
```

Thêm một trạng thái mới vào union, mọi `switch` thiếu nhánh sẽ báo lỗi ngay — kiểu bắt giúp bạn tìm hết chỗ cần sửa.

### Discriminated union: mô hình hoá trạng thái đúng cách

```ts
type KetQua =
  | { trangThai: 'dang-tai' }
  | { trangThai: 'thanh-cong'; data: NguoiDung[] }
  | { trangThai: 'loi'; loi: string }

function render(kq: KetQua) {
  if (kq.trangThai === 'thanh-cong') {
    return kq.data.length          // TS biết chắc có data ở nhánh này
  }
  // kq.data ở đây là lỗi biên dịch — đúng, vì chưa tải xong thì làm gì có data
}
```

So với `{ dangTai: boolean; data?: X[]; loi?: string }`, cách này loại bỏ hẳn các tổ hợp vô nghĩa như "vừa đang tải vừa có lỗi".

## Mảng, tuple, và Record

```ts
const ten: string[] = []
const cap: [number, number] = [10, 20]           // tuple: đúng 2 phần tử
const nhan: Record<string, string> = { vi: 'Xin chào' }
const daDoc: Set<string> = new Set()
```

## `strict` và `noUncheckedIndexedAccess`

Luôn bật `"strict": true`. Ngoài ra bật thêm `noUncheckedIndexedAccess` — nó khiến việc truy cập theo chỉ số trả về `T | undefined`, đúng với thực tế:

```ts
const items = ['a', 'b']
const x = items[10]     // với cờ này: string | undefined -> buộc bạn xử lý
console.log(x.length)   // lỗi biên dịch, thay vì sập lúc chạy
```

## Lỗi hay gặp

| Lỗi | Vì sao tệ | Thay bằng |
|---|---|---|
| `any` để "cho nó chạy" | Tắt kiểm tra và lan sang chỗ khác | `unknown` rồi thu hẹp |
| `as` để dập lỗi | Nói dối trình biên dịch, sập lúc chạy | Sửa kiểu, hoặc validate bằng zod |
| Ghi kiểu cho mọi biến cục bộ | Ồn, và không tự cập nhật | Để TS suy luận |
| `{ dangTai, data?, loi? }` | Sinh tổ hợp trạng thái vô nghĩa | Discriminated union |
| Tin kiểu của `res.json()` | Lúc chạy không ai kiểm tra | Parse bằng zod |

## Ghi nhớ

- Kiểu biến mất lúc chạy: dữ liệu bên ngoài vẫn phải validate.
- Ghi kiểu ở ranh giới, để suy luận ở bên trong.
- `type` mặc định, `interface` khi cần mở rộng.
- Discriminated union diễn tả trạng thái chính xác hơn nhiều cờ boolean rời rạc.

## Tự kiểm tra

1. Viết kiểu cho một ô tìm kiếm có bốn trạng thái: chưa gõ, đang tìm, có kết quả, không có kết quả.
2. Vì sao `const x: string = 'a'` là thừa còn `function f(x: string)` thì không?
3. `as unknown as Foo` sai ở chỗ nào? Khi nào chấp nhận được?
