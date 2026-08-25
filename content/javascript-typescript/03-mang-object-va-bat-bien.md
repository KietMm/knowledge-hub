---
title: Mảng, object và tư duy bất biến
slug: mang-object-va-bat-bien
summary: Destructuring, spread, và bộ ba map/filter/reduce — cách xử lý dữ liệu mà không sửa dữ liệu gốc.
level: co-ban
tags: [javascript, mang, object, bat-bien]
khung: v2
---

> **Sau bài này bạn sẽ:** biết chắc thao tác nào **sửa** dữ liệu gốc và thao tác nào **tạo bản mới**, và viết được chuỗi biến đổi dữ liệu đọc như một câu tiếng Việt.

## Ý tưởng chính

Mọi thao tác trên mảng và object rơi vào đúng hai nhóm: **sửa tại chỗ** (mutating) và **tạo cái mới** (non-mutating).

Nhóm thứ nhất nhanh hơn và tốn ít bộ nhớ hơn. Nhóm thứ hai **an toàn hơn nhiều**, vì nó không bao giờ làm hỏng dữ liệu của người khác. Biết mỗi hàm thuộc nhóm nào là kỹ năng nền của toàn bộ JavaScript hiện đại.

## Mental model

Hãy nghĩ tới **sửa ảnh**.

> **Sửa tại chỗ** là vẽ thẳng lên bức ảnh gốc. Nhanh, không tốn giấy — nhưng ảnh gốc mất vĩnh viễn, và ai đang cầm bản in cũ sẽ thấy nó khác đi.
>
> **Tạo bản mới** là photocopy rồi vẽ lên bản sao. Tốn giấy hơn, nhưng **bản gốc còn nguyên**, và bạn so được trước–sau.

React, Redux, và mọi hệ thống "phát hiện thay đổi" đều dựa vào cách thứ hai: chúng nhận ra dữ liệu đã đổi bằng cách kiểm tra *"còn là đúng bức ảnh cũ không?"* — nếu bạn vẽ đè lên ảnh gốc, chúng không thấy gì thay đổi cả.

## Ví dụ nhỏ

```js
const ds = [3, 1, 2]

const daSap = [...ds].sort()   // photocopy rồi sắp → [1,2,3]
console.log(ds)                // [3,1,2] — bản gốc còn nguyên ✅

ds.sort()                      // vẽ thẳng lên bản gốc
console.log(ds)                // [1,2,3] — đã bị đổi ❌
```

## Code chạy thế nào

Chuỗi `filter → map → reduce` xử lý dữ liệu theo từng khâu, mỗi khâu **sinh ra dữ liệu mới**:

```text
donHang = [ {tien:50, xong:true}, {tien:30, xong:false}, {tien:20, xong:true} ]

.filter(d => d.xong)          →  [ {50,true}, {20,true} ]        (mảng MỚI)
.map(d => d.tien)             →  [ 50, 20 ]                       (mảng MỚI)
.reduce((s, x) => s + x, 0)   →  0 → 50 → 70                      (một giá trị)
```

`reduce` là cái khó nhất trong ba, nên lần tay nó:

```text
khởi tạo s = 0
bước 1:  s=0,  x=50  →  s = 0 + 50 = 50
bước 2:  s=50, x=20  →  s = 50 + 20 = 70
kết quả: 70
```

`reduce` không chỉ để cộng. Nó là **hàm gộp tổng quát**: gộp mảng về một số, một chuỗi, một object, thậm chí một `Map`.

## Cú pháp

```js
// Destructuring — lấy đúng thứ mình cần
const { ten, tuoi = 0 } = nguoi          // kèm giá trị mặc định
const [dau, ...conLai] = ds
const { dia: { thanhPho } } = nguoi      // lồng nhau

// Spread — sao chép rồi sửa
const moi = { ...cu, tuoi: 31 }          // object mới, tuoi bị ghi đè
const themVao = [...ds, 4]               // mảng mới
```

Nhóm **sửa tại chỗ** so với nhóm **tạo mới** — bảng này nên thuộc:

| Sửa tại chỗ ⚠️ | Tạo cái mới ✅ |
|---|---|
| `push`, `pop`, `shift`, `unshift` | `[...ds, x]`, `ds.slice(1)` |
| `splice` | `slice`, `filter` |
| `sort`, `reverse` | `[...ds].sort()`, `[...ds].reverse()` |
| `obj.x = 1`, `delete obj.x` | `{ ...obj, x: 1 }` |

Hai cái bẫy nhất là `sort` và `reverse`: chúng trả về mảng nên **trông như** tạo mới, nhưng thật ra vừa sửa bản gốc vừa trả về chính nó.

## Tại sao cần nó

Vì sửa dữ liệu của người khác gây ra loại lỗi **không có dòng đỏ nào**:

```js
function sapXep(ds) {
  return ds.sort((a, b) => a - b)   // ❌ sửa mảng của người gọi
}

const goc = [3, 1, 2]
const kq = sapXep(goc)
console.log(goc)   // [1,2,3] — người gọi không hề yêu cầu điều này
```

Người viết `sapXep` nghĩ mình đang trả về bản đã sắp. Người gọi nghĩ mảng của mình còn nguyên. Cả hai đều hợp lý, và lỗi hiện ra ở một chỗ thứ ba, muộn hơn nhiều. Đây chính là "tác dụng phụ trá hình" ở [[ham-dau-vao-dau-ra-va-tac-dung-phu]].

Với React, hậu quả còn cụ thể hơn: sửa state tại chỗ thì **giao diện không cập nhật**, vì React so sánh tham chiếu chứ không so từng phần tử.

## So sánh

Khi nào chọn `for` thay vì `map/filter/reduce`:

| Tình huống | Dùng |
|---|---|
| Biến đổi mỗi phần tử thành một phần tử | `map` |
| Giữ lại một số phần tử | `filter` |
| Gộp cả mảng về một giá trị | `reduce` |
| Cần **dừng giữa chừng** | `for...of` + `break` (map/filter không dừng được) |
| Mảng rất lớn, cần tối ưu bộ nhớ | `for` — chuỗi `map().filter()` sinh mảng trung gian |
| Có tác dụng phụ (gọi API, ghi log) | `for...of` — `map` mà không dùng kết quả là dấu hiệu sai |

## Dễ nhầm

**1. Tưởng spread sao chép sâu.**

```js
const a = { ten: 'A', dia: { tp: 'HN' } }
const b = { ...a }
b.dia.tp = 'HCM'
console.log(a.dia.tp)   // 'HCM' ❌ — dia là CÙNG MỘT object
```

`...` chỉ chép **một tầng**. Tầng sâu hơn vẫn dùng chung — đây chính là chuyện "chép địa chỉ nhà" ở [[kieu-du-lieu-va-bien]]. Cần sao chép sâu thật thì dùng `structuredClone(a)`.

**2. Dùng `map` khi ý là `forEach`.**

```js
ds.map((x) => console.log(x))   // ❌ tạo một mảng [undefined,...] rồi vứt đi
ds.forEach((x) => console.log(x))  // ✅
```

**3. Quên giá trị khởi tạo của `reduce`.**

```js
[].reduce((s, x) => s + x)      // ❌ TypeError với mảng rỗng
[].reduce((s, x) => s + x, 0)   // ✅ trả 0
```

**4. Lồng `find` trong `map`.**

```js
don.map((d) => ({ ...d, khach: khach.find((k) => k.id === d.khachId) }))   // ❌ O(n×m)
```

Dựng `Map` trước rồi tra — cùng vấn đề đã nói ở [[chon-sai-cau-truc-du-lieu-la-dat]].

**5. Destructuring giá trị có thể `undefined`.**

```js
const { ten } = layNguoiDung()        // ❌ nổ nếu hàm trả về undefined
const { ten } = layNguoiDung() ?? {}  // ✅
```

## Mẹo nhớ

> **Photocopy rồi vẽ, đừng vẽ lên bản gốc.**
>
> **`sort` và `reverse` trông như tạo mới nhưng SỬA tại chỗ.**
>
> **Spread chép một tầng, không chép sâu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Kể bốn hàm mảng **sửa tại chỗ** và cách viết bất biến tương ứng.
2. Vì sao `[...a]` không đủ khi object có tầng lồng nhau?
3. `reduce` khác `map` ở chỗ nào — không phải cú pháp, mà về **kết quả**?
4. Vì sao sửa state tại chỗ làm React không cập nhật giao diện?
5. Khi nào `for...of` là lựa chọn đúng thay vì `map/filter`?

## Tự viết lại

Không nhìn lại phần trên, viết hàm gộp danh sách đơn hàng thành tổng tiền **theo từng khách**, không sửa dữ liệu gốc:

```js
tongTheoKhach([
  { khach: 'A', tien: 50 },
  { khach: 'B', tien: 30 },
  { khach: 'A', tien: 20 },
])
// → { A: 70, B: 30 }
```

Tự kiểm: bạn dùng `reduce` với giá trị khởi tạo là gì, và bên trong bạn **tạo object mới** hay sửa accumulator? Cả hai đều chạy — nêu lý do cho lựa chọn của bạn.

## Thử sức

Đoạn này in ra gì?

```js
const goc = [{ n: 1 }, { n: 2 }]
const sao = goc.map((x) => x)
sao[0].n = 99
sao.push({ n: 3 })

console.log(goc.length, goc[0].n)
```

Gợi ý: `map` tạo mảng mới — nhưng nó chép **cái gì** vào mảng mới đó?
