---
title: Mảng, object và tư duy bất biến
slug: mang-object-va-bat-bien
summary: Destructuring, spread, và bộ ba map/filter/reduce — cách xử lý dữ liệu mà không sửa dữ liệu gốc.
level: co-ban
tags: [javascript, mang, object, bat-bien]
---

> **Sau bài này bạn sẽ:** biến gần như mọi vòng `for` xử lý dữ liệu thành một chuỗi `filter → map → reduce` đọc được, và hiểu vì sao React yêu cầu không sửa state tại chỗ.

## Destructuring: lấy đúng thứ mình cần

```js
const nguoiDung = { id: 1, ten: 'An', diaChi: { thanhPho: 'Hà Nội' } }

const { ten, diaChi: { thanhPho } } = nguoiDung
const { email = 'chưa có' } = nguoiDung        // giá trị mặc định
const { id, ...phanConLai } = nguoiDung        // rest: mọi thứ trừ id

const [dau, thuHai, ...duoi] = [10, 20, 30, 40]
```

Dùng nhiều nhất ở tham số hàm — người đọc thấy ngay hàm cần gì:

```js
// Khó đọc: phải mở định nghĩa mới biết opts có gì
function taoNut(opts) { ... }

// Rõ ràng: nhìn chữ ký là biết
function taoNut({ nhan, kieu = 'chinh', tatCa = false }) { ... }
```

## Spread: sao chép rồi sửa

```js
const goc = { ten: 'An', tuoi: 30 }
const moi = { ...goc, tuoi: 31 }        // goc không đổi

const ds = [1, 2, 3]
const dsMoi = [...ds, 4]                // ds không đổi
const chen = [...ds.slice(0, 1), 99, ...ds.slice(1)]
```

Spread chỉ sao chép **một tầng**. Object lồng bên trong vẫn dùng chung:

```js
const a = { cauHinh: { theme: 'dark' } }
const b = { ...a }
b.cauHinh.theme = 'light'
a.cauHinh.theme       // 'light' — a bị sửa theo!

const c = structuredClone(a)   // sao chép sâu, có sẵn trong Node 17+ và trình duyệt hiện đại
```

## map, filter, reduce

```js
const donHang = [
  { id: 1, tien: 120_000, trangThai: 'xong' },
  { id: 2, tien: 80_000, trangThai: 'huy' },
  { id: 3, tien: 250_000, trangThai: 'xong' },
]

// filter: giữ lại phần tử thoả điều kiện — số phần tử giảm, kiểu giữ nguyên
const daXong = donHang.filter((d) => d.trangThai === 'xong')

// map: biến đổi từng phần tử — số phần tử giữ nguyên, kiểu đổi
const cacSoTien = daXong.map((d) => d.tien)

// reduce: gộp cả mảng về một giá trị
const tong = cacSoTien.reduce((tong, tien) => tong + tien, 0)   // 370000
```

Viết liền một mạch, đọc từ trên xuống như câu văn:

```js
const tongDoanhThu = donHang
  .filter((d) => d.trangThai === 'xong')
  .reduce((tong, d) => tong + d.tien, 0)
```

### reduce để nhóm dữ liệu

`reduce` mạnh nhất khi kết quả không phải là số:

```js
const theoTrangThai = donHang.reduce((nhom, don) => {
  ;(nhom[don.trangThai] ??= []).push(don)
  return nhom
}, {})
// { xong: [...], huy: [...] }
```

Từ Node 21 / trình duyệt mới có sẵn `Object.groupBy(donHang, (d) => d.trangThai)` làm đúng việc này.

### Chọn đúng phương thức

| Cần gì | Dùng | Trả về |
|---|---|---|
| Tìm một phần tử | `find` | phần tử hoặc `undefined` |
| Tìm vị trí | `findIndex` | số hoặc `-1` |
| Có ít nhất một thoả? | `some` | boolean |
| Tất cả đều thoả? | `every` | boolean |
| Có chứa giá trị? | `includes` | boolean |
| Làm phẳng mảng lồng | `flat` / `flatMap` | mảng mới |
| Sắp xếp | `toSorted` | **mảng mới** (`sort` sửa tại chỗ!) |

## Sửa tại chỗ vs tạo mới

Nhóm sửa tại chỗ (thay đổi mảng gốc): `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`.
Nhóm tạo mới: `concat`, `slice`, `map`, `filter`, `toSorted`, `toReversed`, `toSpliced`, `with`.

```js
const diem = [3, 1, 2]
diem.sort()              // diem bị sắp xếp luôn — nguồn của nhiều bug khó tìm
const daSap = [...diem].sort()   // cách cũ, an toàn
const daSap2 = diem.toSorted()   // Node 20+, rõ nghĩa hơn
```

`sort()` mặc định so sánh theo **chuỗi**: `[10, 9, 1].sort()` cho `[1, 10, 9]`. Số phải truyền hàm so sánh: `.sort((a, b) => a - b)`.

## Vì sao bất biến lại quan trọng

React, Redux và mọi thứ dùng so sánh nông (`prevState === nextState`) đều dựa vào việc **object mới ⇒ tham chiếu mới**:

```js
// React sẽ KHÔNG render lại: vẫn cùng một mảng, tham chiếu không đổi
setItems((cu) => { cu.push(moi); return cu })

// Đúng: mảng mới, tham chiếu mới
setItems((cu) => [...cu, moi])
```

## Lỗi hay gặp

| Lỗi | Vì sao sai | Sửa thế nào |
|---|---|---|
| `arr.sort()` trên state | Sửa mảng gốc tại chỗ | `[...arr].sort()` hoặc `toSorted()` |
| `[10, 9, 1].sort()` | So sánh theo chuỗi | `.sort((a, b) => a - b)` |
| `{ ...a }` cho object lồng nhau | Chỉ sao chép một tầng | `structuredClone(a)` |
| `map` khi không dùng kết quả | Tạo mảng thừa, ý định không rõ | Dùng `forEach` hoặc `for...of` |
| `reduce` để làm việc `map` làm được | Khó đọc hơn hẳn | Chọn phương thức đúng ý định |

## Ghi nhớ

- Destructuring ở tham số hàm làm chữ ký tự mô tả chính nó.
- Spread sao chép **một tầng**; sâu hơn thì `structuredClone`.
- `filter` lọc, `map` biến đổi, `reduce` gộp. Ba cái ghép lại thay được hầu hết vòng `for`.
- Nhớ nhóm phương thức sửa tại chỗ — đặc biệt là `sort` và `reverse`.

## Tự kiểm tra

1. Cho danh sách sản phẩm, viết một biểu thức trả về `{ [danhMuc]: tongTien }`.
2. Vì sao `setItems(cu => { cu.push(x); return cu })` không làm React render lại?
3. `[...a]` và `structuredClone(a)` khác nhau ở đâu? Khi nào bắt buộc dùng cái sau?
