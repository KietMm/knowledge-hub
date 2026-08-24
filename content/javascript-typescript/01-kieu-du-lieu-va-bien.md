---
title: Kiểu dữ liệu và cách khai báo biến
slug: kieu-du-lieu-va-bien
summary: Bảy kiểu nguyên thuỷ, sự khác nhau giữa var/let/const, và vì sao so sánh bằng == lại gây lỗi.
level: co-ban
tags: [javascript, co-ban, kieu-du-lieu]
---

> **Sau bài này bạn sẽ:** đọc được một đoạn JavaScript bất kỳ mà không phải đoán biến ở đâu ra, và biết vì sao `0 == '0'` là `true` còn `0 === '0'` là `false`.

## Bảy kiểu nguyên thuỷ

JavaScript có đúng bảy kiểu **nguyên thuỷ** (primitive) — giá trị bất biến, so sánh theo giá trị:

| Kiểu | Ví dụ | Ghi chú |
|---|---|---|
| `string` | `'xin chào'` | Không có kiểu ký tự riêng |
| `number` | `42`, `3.14` | Số thực 64-bit, không phân biệt int/float |
| `boolean` | `true` | |
| `undefined` | `undefined` | Biến đã khai báo nhưng chưa gán |
| `null` | `null` | Chủ động gán "không có gì" |
| `symbol` | `Symbol('id')` | Khoá duy nhất, hiếm dùng |
| `bigint` | `9007199254740993n` | Số nguyên vượt giới hạn `number` |

Mọi thứ còn lại — mảng, object, hàm, `Date`, `Map` — đều là **object**, so sánh theo tham chiếu:

```js
'abc' === 'abc'        // true  — hai chuỗi cùng giá trị
[1, 2] === [1, 2]      // false — hai mảng khác nhau trong bộ nhớ

const a = [1, 2]
const b = a
b.push(3)
console.log(a)         // [1, 2, 3] — a và b là cùng một mảng
```

### `number` chỉ chính xác tới 2^53

```js
0.1 + 0.2                    // 0.30000000000000004
9007199254740992 + 1         // 9007199254740992 — cộng thêm 1 mà không đổi
```

Vì vậy **không bao giờ dùng `number` để lưu tiền**. Lưu số nguyên đơn vị nhỏ nhất (đồng, xu) hoặc dùng `bigint` / thư viện decimal.

## var, let, const

```js
function demo() {
  if (true) {
    var x = 1     // phạm vi: cả hàm
    let y = 2     // phạm vi: chỉ trong khối { }
  }
  console.log(x)  // 1
  console.log(y)  // ReferenceError: y is not defined
}
```

- `var` — phạm vi **hàm**, bị "kéo lên" (hoisting) và khởi tạo bằng `undefined`. Đừng dùng nữa.
- `let` — phạm vi **khối**, gán lại được.
- `const` — phạm vi **khối**, không gán lại được.

`const` khoá **liên kết**, không khoá **nội dung**:

```js
const user = { name: 'An' }
user.name = 'Bình'    // hợp lệ — vẫn là cùng một object
user = { name: 'C' }  // TypeError: Assignment to constant variable
```

Muốn khoá cả nội dung thì `Object.freeze(user)` (chỉ một tầng).

**Quy tắc thực dụng:** mặc định dùng `const`. Chỉ đổi sang `let` khi trình soạn thảo báo bạn thật sự cần gán lại. Không dùng `var`.

## Vùng chết tạm thời (TDZ)

`let`/`const` cũng được hoisting, nhưng chưa khởi tạo — chạm vào trước dòng khai báo là lỗi ngay, thay vì âm thầm ra `undefined`:

```js
console.log(a)   // undefined — var, khó phát hiện sai
var a = 1

console.log(b)   // ReferenceError — let, sai là báo ngay
let b = 1
```

Đây là lý do `let`/`const` an toàn hơn: lỗi hiện ra ở đúng chỗ gây ra nó.

## So sánh: dùng `===`, không dùng `==`

`==` ép kiểu trước khi so sánh, theo một bảng quy tắc dài và không trực giác:

```js
0 == '0'          // true
0 == ''           // true
'' == '0'         // false  — mất tính bắc cầu!
null == undefined // true
null == 0         // false
NaN == NaN        // false
```

`===` không ép kiểu, kết quả luôn đoán được. Ngoại lệ duy nhất đáng dùng `==` là `x == null` — bắt gọn cả `null` lẫn `undefined`.

Kiểm tra `NaN` phải dùng `Number.isNaN(x)`; `x === NaN` luôn `false` theo chuẩn IEEE 754.

## Giá trị "giả" (falsy)

Chỉ tám giá trị là falsy: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. Mọi thứ khác — kể cả `[]` và `{}` — đều truthy.

```js
if ([]) console.log('chạy')       // có chạy: mảng rỗng vẫn truthy
if ([].length) console.log('không') // không chạy
```

Bẫy hay gặp nhất là dùng `||` để đặt giá trị mặc định:

```js
function taoTrang(soLuong) {
  const n = soLuong || 10   // truyền 0 -> ra 10, sai!
  const m = soLuong ?? 10   // ?? chỉ thay khi null/undefined -> đúng
}
```

## Lỗi hay gặp

| Lỗi | Vì sao sai | Sửa thế nào |
|---|---|---|
| `if (x == 1)` | Ép kiểu ngầm, `'1'` cũng lọt | Dùng `===` |
| `const total = price * 0.1` cho tiền | Số thực nhị phân làm tròn sai | Tính bằng số nguyên đơn vị nhỏ nhất |
| `const opts = options \|\| {}` | `0`, `''`, `false` bị nuốt mất | Dùng `??` |
| `arr === []` để kiểm tra rỗng | So sánh tham chiếu, luôn `false` | `arr.length === 0` |
| Dùng `var` trong vòng lặp có callback | Mọi callback thấy cùng một biến | Dùng `let` |

## Ghi nhớ

- Bảy nguyên thuỷ so sánh theo giá trị; mọi thứ khác so sánh theo tham chiếu.
- `const` mặc định, `let` khi cần, không bao giờ `var`.
- Luôn `===`; ngoại lệ duy nhất là `== null`.
- `??` cho giá trị mặc định, `||` chỉ khi bạn thật sự muốn nuốt mọi falsy.

## Tự kiểm tra

1. `const a = [1]; const b = [1]; a === b` cho ra gì? Vì sao?
2. Vì sao `'' == '0'` là `false` trong khi cả hai đều `== 0`?
3. Hàm nhận `soTrang` và cần mặc định là `1`. Viết bằng `??` và giải thích vì sao `||` sai.
