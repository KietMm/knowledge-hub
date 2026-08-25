---
title: Generic trong TypeScript
slug: generic-trong-typescript
summary: Viết hàm dùng lại được cho nhiều kiểu mà không mất thông tin kiểu — và biết khi nào generic là thừa.
level: nang-cao
tags: [typescript, generic]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được generic khi nó thật sự cần, và nhận ra ngay khi mình đang thêm `<T>` cho một hàm không cần tới nó.

## Ý tưởng chính

Generic giải quyết một tình huống rất cụ thể: **hàm phải hoạt động với nhiều kiểu, nhưng kiểu vào và kiểu ra có liên hệ với nhau.**

Nếu không có liên hệ đó, bạn không cần generic. Đây là câu quan trọng nhất của bài, và cũng là thứ bị bỏ qua nhiều nhất.

## Mental model

Hãy nghĩ tới **cái hộp có dán nhãn** so với **cái hộp không nhãn**.

> `any[]` là **hộp không nhãn**: bỏ gì vào cũng được, nhưng lúc lấy ra bạn không biết trong đó là gì — phải mở ra đoán.
>
> `T[]` là **hộp dán nhãn tự động**: bỏ táo vào thì nhãn ghi "táo", và lúc lấy ra TypeScript biết chắc đó là táo.
>
> `T` chính là **tờ nhãn để trống** — nó được điền lúc bạn dùng hàm, không phải lúc viết hàm.

Generic không phải "kiểu linh hoạt". Nó là **cách giữ lại thông tin kiểu** đi xuyên qua một hàm.

## Ví dụ nhỏ

```ts
function dauTien(ds: any[]) { return ds[0] }
const x = dauTien(['a', 'b'])       // x: any  ❌ mất nhãn, gõ x. không gợi ý gì

function dauTienG<T>(ds: T[]): T | undefined { return ds[0] }
const y = dauTienG(['a', 'b'])      // y: string ✅ nhãn được giữ
```

Chú ý: bạn **không** phải viết `dauTienG<string>(...)`. TypeScript tự suy `T = string` từ đối số — và đó là cách dùng generic đúng nhất.

## Code chạy thế nào

Generic được "điền nhãn" tại **chỗ gọi**, không phải chỗ định nghĩa:

```text
Định nghĩa:  function dauTienG<T>(ds: T[]): T | undefined

Chỗ gọi 1:   dauTienG([1, 2, 3])
             → TS nhìn đối số: number[]
             → điền T = number
             → chữ ký thành: (ds: number[]) => number | undefined

Chỗ gọi 2:   dauTienG(['a'])
             → điền T = string
             → chữ ký thành: (ds: string[]) => string | undefined
```

Và toàn bộ chuyện này **biến mất khi biên dịch**. Code chạy thật chỉ là:

```js
function dauTienG(ds) { return ds[0] }
```

Generic không tồn tại lúc chạy — nó chỉ là chỉ dẫn cho người soát vé ở cửa ([[typescript-nhap-mon]]).

## Cú pháp

```ts
// Ràng buộc: T phải có thuộc tính length
function doDai<T extends { length: number }>(x: T) { return x.length }
doDai('abc')        // ✅ 3
doDai([1, 2])       // ✅ 2
doDai(42)           // ❌ number không có length

// keyof: khoá phải có thật trong object
function lay<T, K extends keyof T>(obj: T, khoa: K): T[K] {
  return obj[khoa]
}
const u = { ten: 'An', tuoi: 30 }
lay(u, 'ten')       // string ✅
lay(u, 'email')     // ❌ lỗi ngay khi gõ

// Nhiều tham số kiểu + mặc định
function ghep<A, B = A>(a: A, b: B): [A, B] { return [a, b] }
```

Kiểu tiện ích có sẵn — **dùng thay vì tự viết**:

```ts
Partial<T>            // mọi trường thành tuỳ chọn
Required<T>           // ngược lại
Pick<T, 'a' | 'b'>    // chỉ giữ vài trường
Omit<T, 'mat-khau'>   // bỏ vài trường
Record<K, V>          // { [k in K]: V }
ReturnType<typeof f>  // kiểu trả về của một hàm
Awaited<T>            // bóc Promise
```

`Omit<NguoiDung, 'matKhau'>` là mẫu hay dùng nhất trong thực tế: kiểu trả về API = kiểu đầy đủ trừ đi trường nhạy cảm.

## Tại sao cần nó

Vì không có generic, bạn chỉ còn hai lựa chọn và **cả hai đều tệ**:

```ts
// Lựa chọn 1: any → mất hết kiểm tra
function dauTien(ds: any[]): any {}

// Lựa chọn 2: viết lại cho từng kiểu → lặp vô tận
function dauTienSo(ds: number[]): number {}
function dauTienChuoi(ds: string[]): string {}
```

Generic là con đường thứ ba: **viết một lần, giữ nguyên kiểu**.

Chỗ nó có giá trị nhất trong code thật là **lớp truy cập dữ liệu**:

```ts
async function goiApi<T>(duongDan: string): Promise<T> {
  const res = await fetch(duongDan)
  return res.json()
}

const u = await goiApi<NguoiDung>('/api/user')   // u: NguoiDung
```

Nhưng chú ý — ví dụ trên cũng là một **cái bẫy**: `res.json()` trả về `any`, nên `T` ở đây chỉ là lời hứa của bạn chứ không được kiểm tra. Xem [[thu-hep-kieu-va-unknown]] để làm cho đúng.

## So sánh

Khi nào generic là **thừa** — bảng này quan trọng hơn phần cú pháp:

| Tình huống | Kết luận |
|---|---|
| `T` chỉ xuất hiện **một lần** trong chữ ký | ❌ thừa — dùng thẳng kiểu đó hoặc `unknown` |
| Kiểu vào và kiểu ra **không liên quan** | ❌ thừa |
| Có `<T>` nhưng bên trong toàn `as` | ❌ đang giả vờ an toàn |
| Kiểu ra **phụ thuộc** kiểu vào | ✅ đúng chỗ |
| Giữ nhãn xuyên qua nhiều tầng gọi | ✅ đúng chỗ |

```ts
// ❌ T chỉ xuất hiện một lần ⇒ không giữ được liên hệ nào
function inRa<T>(x: T): void { console.log(x) }
function inRa(x: unknown): void { console.log(x) }   // ✅ đơn giản hơn, tương đương
```

## Dễ nhầm

**1. Thêm `<T>` cho mọi hàm.** Xem bảng trên. Generic thừa làm chữ ký khó đọc mà không mua được gì.

**2. Đặt tên `T`, `U`, `V` cho mọi thứ.** Với generic đơn giản thì `T` ổn; với hàm nhiều tham số kiểu, tên có nghĩa dễ đọc hơn nhiều: `<TDuLieu, TKetQua>`.

**3. Quên ràng buộc `extends`.**

```ts
function ten<T>(x: T) { return x.ten }        // ❌ TS không biết T có `ten`
function ten<T extends { ten: string }>(x: T) { return x.ten }   // ✅
```

**4. Dùng generic để né việc thiết kế kiểu.** Nếu hàm của bạn nhận `<T>` rồi bên trong toàn `as any`, generic chỉ đang **che** vấn đề. Kiểu thật vẫn chưa được nghĩ ra.

**5. Tự viết lại kiểu tiện ích có sẵn.** Trước khi viết một kiểu phức tạp, kiểm xem `Pick`, `Omit`, `Partial`, `ReturnType` đã làm sẵn chưa. Chúng được cả ngành hiểu, còn kiểu tự chế thì không.

## Mẹo nhớ

> **Generic là tờ nhãn để trống, điền lúc gọi.**
>
> **`T` xuất hiện đúng một lần trong chữ ký ⇒ bạn không cần generic.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Generic giải quyết vấn đề gì mà `any` không giải được?
2. `T` được "điền" ở thời điểm nào, và có tồn tại lúc chạy không?
3. Nêu ba dấu hiệu cho biết một generic là **thừa**.
4. `extends` trong `<T extends { length: number }>` làm gì?
5. `Omit<NguoiDung, 'matKhau'>` dùng để làm gì trong thực tế?

## Tự viết lại

Không nhìn lại phần trên, viết hàm `nhomTheo` gom một mảng thành object theo khoá — **giữ nguyên kiểu phần tử** ở kết quả:

```ts
const ds = [{ loai: 'a', n: 1 }, { loai: 'b', n: 2 }, { loai: 'a', n: 3 }]
const kq = nhomTheo(ds, 'loai')
// kq phải có kiểu Record<string, { loai: string; n: number }[]>
```

Tự kiểm: chữ ký của bạn có mấy tham số kiểu, và bạn ràng buộc khoá bằng `keyof` như thế nào?

## Thử sức

Hàm này biên dịch qua nhưng **không an toàn**:

```ts
async function goiApi<T>(duongDan: string): Promise<T> {
  const res = await fetch(duongDan)
  return res.json()
}
```

Chỉ ra chính xác chỗ TypeScript bị lừa. Rồi trả lời: **generic có phải công cụ đúng** cho bài toán này không, hay bạn cần một thứ khác hẳn — và thứ đó là gì?
