---
title: Đếm và bảng băm trong giải bài
slug: dem-va-bang-bam-trong-giai-bai
summary: Ba mẫu dùng bảng băm chiếm phần lớn bài tập — nhớ đã gặp, đếm tần suất, và gom nhóm theo khoá suy ra.
level: trung-cap
tags: [thuat-toan, bang-bam, dem, mang]
---

> **Sau bài này bạn sẽ:** nhận ra ba mẫu bảng băm chiếm phần lớn bài tập thực tế, và biết chọn khoá gom nhóm cho đúng.

## Vì sao bảng băm xuất hiện ở khắp nơi

Bảng băm đổi câu hỏi *"có tồn tại không"* từ một phép **tìm kiếm** `O(n)` thành một phép **tra cứu** `O(1)`. Vì câu hỏi đó nằm trong vòng lặp trong của rất nhiều bài, đổi được nó nghĩa là đổi `O(n²)` thành `O(n)`.

Cấu trúc bên trong của bảng băm nằm ở [[bang-bam]]; bài này chỉ nói về cách dùng nó để giải bài.

## Mẫu 1: nhớ những gì đã gặp

Câu hỏi điển hình: "có cặp nào thoả điều kiện không", "có phần tử trùng không".

```js
function coTrung(nums) {
  const daGap = new Set()
  for (const x of nums) {
    if (daGap.has(x)) return true
    daGap.add(x)
  }
  return false
}
```

Chỗ tinh tế của mẫu này luôn là **thứ tự tra cứu và ghi vào**: tra trước, ghi sau. Ghi trước thì phần tử tự khớp với chính nó. Bài Hai tổng hỏng đúng ở đây với đầu vào `[3, 3]`.

Biến thể quan trọng — lưu chỉ số thay vì chỉ lưu giá trị, khi đề đòi trả về vị trí:

```js
const daGap = new Map() // giá trị -> chỉ số
```

## Mẫu 2: đếm tần suất

Câu hỏi điển hình: "phần tử xuất hiện nhiều nhất", "hai chuỗi có phải hoán vị của nhau", "phần tử xuất hiện quá `n/2` lần".

```js
function demTanSuat(items) {
  const dem = new Map()
  for (const x of items) dem.set(x, (dem.get(x) ?? 0) + 1)
  return dem
}

function laHoanVi(a, b) {
  if (a.length !== b.length) return false // chặn sớm, rẻ và bắt được nhiều ca
  const dem = demTanSuat(a)
  for (const c of b) {
    const con = dem.get(c)
    if (con === undefined || con === 0) return false
    dem.set(c, con - 1)
  }
  return true
}
```

`(dem.get(x) ?? 0) + 1` là thành ngữ nên thuộc — nó xuất hiện trong hầu hết bài đếm. Ở Python, `collections.Counter` làm sẵn việc này.

So sánh hai cách kiểm hoán vị:

| Cách | Thời gian | Ghi chú |
|---|---|---|
| Sắp xếp cả hai rồi so | `O(n log n)` | Ngắn hơn, đủ dùng khi `n` nhỏ |
| Đếm tần suất | `O(n)` | Nhanh hơn, và mở rộng được cho bài cửa sổ trượt |

## Mẫu 3: gom nhóm theo khoá suy ra

Đây là mẫu mạnh nhất và cũng ít người nghĩ ra nhất. Ý tưởng: **hai phần tử thuộc cùng nhóm khi và chỉ khi chúng cho ra cùng một khoá** — và việc của bạn là nghĩ ra khoá đó.

Bài kinh điển: gom các từ là hoán vị của nhau (`"listen"`, `"silent"`).

```js
function gomHoanVi(tu) {
  const nhom = new Map()
  for (const t of tu) {
    // Khoá: các chữ cái đã sắp xếp. Hai từ là hoán vị của nhau ⇔ cùng khoá này.
    const khoa = [...t].sort().join('')
    nhom.set(khoa, [...(nhom.get(khoa) ?? []), t])
  }
  return [...nhom.values()]
}
```

Cái khó không nằm ở code mà ở **chọn khoá**. Vài khoá hay dùng:

| Bài toán | Khoá |
|---|---|
| Gom các từ hoán vị | Chữ cái đã sắp xếp, hoặc vector 26 số đếm |
| Gom điểm thẳng hàng | Hệ số góc rút gọn |
| Gom các dòng trùng nhau | Chuỗi nối các trường |
| Tìm đoạn con có tổng bằng `k` | **Tổng cộng dồn** đã gặp |

Cái cuối đáng nói riêng, vì nó là mẫu chiếm nhiều bài trung–khó:

```js
function demDoanConTongK(nums, k) {
  // Tổng đoạn (i..j) = congDon[j] - congDon[i-1]. Cần đếm bao nhiêu i thoả
  // congDon[i-1] === congDon[j] - k ⇒ lại là một phép TRA CỨU.
  const demCongDon = new Map([[0, 1]]) // tổng 0 xuất hiện một lần: đoạn rỗng ở đầu
  let congDon = 0
  let ketQua = 0

  for (const x of nums) {
    congDon += x
    ketQua += demCongDon.get(congDon - k) ?? 0
    demCongDon.set(congDon, (demCongDon.get(congDon) ?? 0) + 1)
  }
  return ketQua
}
```

Dòng khởi tạo `[[0, 1]]` là chỗ ai cũng quên: không có nó, những đoạn **bắt đầu từ chỉ số 0** không được đếm.

## Cái giá phải trả

Bảng băm đổi bộ nhớ lấy thời gian — `O(n)` bộ nhớ thêm. Ba trường hợp nên nghĩ lại:

- Dữ liệu đã sắp xếp: hai con trỏ cho cùng kết quả với `O(1)` bộ nhớ.
- Miền giá trị nhỏ và biết trước (26 chữ cái, 0–100): mảng đếm nhanh hơn và gọn hơn bảng băm.
- Cần thứ tự (nhỏ nhất, lớn thứ `k`): bảng băm không có thứ tự — dùng sắp xếp hoặc heap.

Và một điều dễ sai trong JavaScript: **khoá của `Object` luôn là chuỗi**, nên `obj[1]` và `obj["1"]` là cùng một chỗ. `Map` giữ nguyên kiểu khoá và cho phép khoá là object. Với bài thuật toán, mặc định dùng `Map`.

## Ghi nhớ

- Bảng băm biến "tìm kiếm" thành "tra cứu" — đó là toàn bộ giá trị của nó.
- Mẫu nhớ-đã-gặp: luôn **tra trước, ghi sau**.
- Mẫu đếm tần suất: thuộc lòng `(dem.get(x) ?? 0) + 1`.
- Mẫu gom nhóm: phần khó là nghĩ ra khoá, không phải viết code.
- Tổng cộng dồn + bảng băm giải cả lớp bài "đoạn con có tổng bằng k".

## Tự kiểm tra

1. Vì sao Hai tổng phải tra cứu trước rồi mới ghi vào bảng?
2. Khoá nào gom được các từ là hoán vị của nhau, ngoài "chữ cái đã sắp xếp"?
3. Bỏ dòng khởi tạo `[[0, 1]]` trong `demDoanConTongK` thì kết quả sai ở trường hợp nào?
