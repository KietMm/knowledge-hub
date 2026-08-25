---
title: Kiểu dữ liệu và cách khai báo biến
slug: kieu-du-lieu-va-bien
summary: Bảy kiểu nguyên thuỷ, sự khác nhau giữa var/let/const, và vì sao so sánh bằng == lại gây lỗi.
level: co-ban
tags: [javascript, co-ban, kieu-du-lieu]
khung: v2
---

> **Sau bài này bạn sẽ:** tự suy được vì sao `0 == '0'` là `true` còn `0 === '0'` là `false`, và biết chọn `let` hay `const` mà không phải nghĩ lâu.

## Ý tưởng chính

Mọi giá trị trong JavaScript rơi vào đúng hai nhóm, và **hai nhóm đó hành xử khác nhau khi bạn sao chép hoặc so sánh chúng**. Gần như mọi lỗi khó hiểu của người mới đều bắt nguồn từ việc không phân biệt được hai nhóm này.

Nhóm một là **nguyên thuỷ**: số, chuỗi, `true/false`, `undefined`, `null`, và hai kiểu hiếm gặp (`symbol`, `bigint`). Nhóm hai là **object**: mảng, object, hàm, `Date`, `Map` — tất cả những thứ còn lại.

## Mental model

Hãy nghĩ về hai cách trao đổi thông tin:

> **Nguyên thuỷ giống như đọc số điện thoại cho ai đó chép lại.** Họ có bản chép riêng. Bạn đổi số của mình, bản chép của họ không đổi theo.
>
> **Object giống như đưa cho ai đó địa chỉ nhà bạn.** Cả hai cùng cầm một địa chỉ, nhưng nhà thì chỉ có một. Họ sơn lại tường, bạn về nhà thấy tường đã đổi màu.

Nguyên thuỷ chép **giá trị**. Object chép **địa chỉ**. Cả bài này chỉ là hệ quả của một câu đó.

## Ví dụ nhỏ

```js
let a = 1
let b = a
b = 2
console.log(a)   // 1 — chép số điện thoại

const x = [1]
const y = x
y.push(2)
console.log(x)   // [1, 2] — cùng một cái nhà
```

Bốn dòng đầu và bốn dòng sau trông giống hệt nhau về hình thức. Kết quả ngược nhau.

## Code chạy thế nào

Lần theo từng dòng của nửa dưới:

```text
const x = [1]     → tạo một mảng ở đâu đó trong bộ nhớ, gọi là NHÀ-A
                    x giữ địa chỉ NHÀ-A

const y = x       → chép ĐỊA CHỈ sang y
                    giờ x và y cùng chỉ tới NHÀ-A

y.push(2)         → đi tới NHÀ-A, thêm số 2 vào trong
                    không ai tạo ra nhà mới cả

console.log(x)    → đi tới NHÀ-A, thấy [1, 2]
```

Câu hỏi tự hỏi mỗi khi bối rối: **dòng này đang đổi cái nhà, hay đang đổi địa chỉ ghi trên tờ giấy?** `y.push(2)` đổi cái nhà. `y = [9]` đổi tờ giấy.

## Cú pháp

```js
const TEN = 'Kiệt'    // không cho gán lại TỜ GIẤY
let tuoi = 30         // cho gán lại
var cu = 1            // cách cũ — đừng dùng, xem phần Dễ nhầm

const ds = [1, 2]
ds.push(3)            // ✅ hợp lệ — vẫn đúng cái nhà đó
ds = [9]              // ❌ TypeError — đang đổi tờ giấy
```

Đừng học thuộc bảng `var/let/const`. Nhớ theo pattern:

```text
const  →  tờ giấy dán chặt, ruột nhà vẫn sửa được
let    →  tờ giấy thay được
var    →  di sản, tránh
```

Quy tắc thực dụng cho mọi dòng bạn sẽ viết: **mặc định `const`, đổi sang `let` chỉ khi trình biên dịch bắt bạn đổi.** Không phải vì "an toàn hơn" một cách trừu tượng, mà vì khi đọc lại code, `const` nói ngay rằng biến này không bị gán lại ở đâu đó phía dưới — bớt được một thứ phải theo dõi trong đầu.

## Tại sao cần nó

Không phân biệt hai nhóm thì bạn viết ra những đoạn như thế này và không hiểu vì sao sai:

```js
function themThue(donHang) {
  donHang.tong = donHang.tong * 1.1
  return donHang
}

const goc = { tong: 100 }
const moi = themThue(goc)
console.log(goc.tong)   // 110 — đơn hàng GỐC đã bị sửa!
```

Bạn tưởng mình tạo ra một đơn hàng mới; thật ra bạn vừa sơn lại tường nhà người ta. Loại lỗi này không ném exception, không có dòng đỏ nào — nó chỉ làm số liệu sai ở một chỗ khác, muộn hơn nhiều.

Cách sửa cũng chính là mental model: muốn có nhà mới thì phải **xây nhà mới**.

```js
return { ...donHang, tong: donHang.tong * 1.1 }   // object mới, giữ nguyên bản gốc
```

## So sánh

Hai toán tử so sánh, và lý do chỉ nên dùng một:

| | `==` | `===` |
|---|---|---|
| Cách làm | Ép hai bên về cùng kiểu **rồi** so | So thẳng, khác kiểu là `false` |
| `0 == '0'` | `true` | `false` |
| `'' == 0` | `true` | `false` |
| `null == undefined` | `true` | `false` |
| Đoán được kết quả không? | Phải nhớ bảng quy tắc ép kiểu | Đọc là biết |

```js
0 == '0'      // true  — '0' bị ép thành số 0
0 === '0'     // false — number khác string, hết chuyện
```

`==` không sai về mặt kỹ thuật; nó chỉ buộc bạn phải nhớ một bảng quy tắc ép kiểu để đoán được kết quả. **Luôn dùng `===`.** Ngoại lệ duy nhất đáng biết là `x == null` — bắt gọn cả `null` lẫn `undefined`, và đây là cách viết được dùng có chủ đích.

## Dễ nhầm

**1. `null` và `undefined` không giống nhau.**

```text
undefined  →  chưa từng gán (máy tự đặt)
null       →  chủ động gán "không có gì" (người viết đặt)
```

Thấy `undefined` là dấu hiệu *"tôi quên gán"*; thấy `null` là *"tôi cố ý để trống"*.

**2. `const` không có nghĩa là "không đổi được".** Nó chỉ khoá **tờ giấy**, không khoá **cái nhà**:

```js
const ds = [1, 2]
ds.push(3)     // ✅ chạy được — người mới rất hay bất ngờ chỗ này
```

Muốn khoá cả ruột thì cần `Object.freeze`, và đó là chuyện khác.

**3. Giá trị "giả" nhiều hơn bạn tưởng.** Sáu thứ này bị coi là `false` trong `if`:

```text
false    0    ''    null    undefined    NaN
```

Bẫy thật nằm ở số `0` và chuỗi rỗng:

```js
const soLuong = 0
if (soLuong) { }              // ❌ không chạy — nhưng 0 là giá trị HỢP LỆ
if (soLuong !== undefined) { } // ✅ hỏi đúng câu cần hỏi
```

**4. `var` bị "kéo lên đầu" (hoisting).**

```js
console.log(a)   // undefined — không lỗi, và đó mới là vấn đề
var a = 1

console.log(b)   // ❌ ReferenceError: Cannot access 'b' before initialization
let b = 1
```

`let` và `const` cũng được kéo lên, nhưng nằm trong **vùng chết tạm thời**: chạm vào trước dòng khai báo là lỗi ngay. `var` thì trả về `undefined` và để chương trình đi tiếp với dữ liệu sai. Lỗi ồn ào luôn tốt hơn lỗi im lặng — đó là toàn bộ lý do `var` bị thay thế.

**5. `number` không chính xác như bạn nghĩ.**

```js
0.1 + 0.2                // 0.30000000000000004
9007199254740992 + 1     // 9007199254740992 — cộng 1 mà không đổi
```

Nên **không bao giờ dùng `number` để lưu tiền**. Lưu số nguyên theo đơn vị nhỏ nhất (đồng, xu), hoặc dùng `bigint`. Cùng vấn đề đó ở phía cơ sở dữ liệu nằm ở [[chon-kieu-du-lieu]].

## Mẹo nhớ

> **Nguyên thuỷ chép giá trị, object chép địa chỉ.**
>
> **`const` khoá tờ giấy, không khoá cái nhà.**

Hai câu đó suy ra được: vì sao `[1,2] === [1,2]` là `false`, vì sao `const ds` vẫn `push` được, và vì sao sửa tham số trong hàm lại ảnh hưởng ra ngoài.

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Hai nhóm giá trị của JavaScript khác nhau ở điểm nào khi bạn gán chúng cho một biến mới?
2. Vì sao `const ds = [1]` rồi `ds.push(2)` lại hợp lệ?
3. `0 == '0'` cho `true`, còn `0 === '0'` cho `false` — chuyện gì xảy ra bên trong?
4. Khi nào bạn nên dùng `let` thay vì `const`?
5. Vì sao `if (soLuong)` là cách kiểm tra sai khi `soLuong` có thể bằng 0?

## Tự viết lại

Không nhìn lại phần trên, viết hàm `tangGia(sp, phanTram)` trả về một sản phẩm **mới** với giá đã tăng, và **không được sửa** sản phẩm gốc:

```js
const sp = { ten: 'Áo', gia: 100 }
const moi = tangGia(sp, 10)
// moi.gia phải là 110, và sp.gia vẫn phải là 100
```

Trước khi chạy, tự trả lời: dòng nào trong hàm của bạn là "xây nhà mới"?

## Thử sức

Đoạn code này in ra gì, và vì sao?

```js
const a = { x: 1 }
const b = { ...a }
const ds = [a, b]
const ds2 = [...ds]

ds2[0].x = 99

console.log(a.x, b.x)
```

Gợi ý để tự lần ra: `...` sao chép **một tầng**. Sau `[...ds]`, mảng là mới — nhưng hai phần tử bên trong là địa chỉ hay là nhà mới?
