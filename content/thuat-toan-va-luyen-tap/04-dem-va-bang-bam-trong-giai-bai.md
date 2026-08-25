---
title: Đếm và bảng băm trong giải bài
slug: dem-va-bang-bam-trong-giai-bai
summary: Ba mẫu dùng bảng băm chiếm phần lớn bài tập — nhớ đã gặp, đếm tần suất, và gom nhóm theo khoá suy ra.
level: trung-cap
tags: [thuat-toan, bang-bam, dem, mang]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra ba mẫu bảng băm chiếm phần lớn bài tập thực tế, và biết chọn khoá gom nhóm cho đúng.

## Ý tưởng chính

Bảng băm đổi câu hỏi *"có tồn tại không"* từ một phép **tìm kiếm** `O(n)` thành một phép **tra cứu** `O(1)`.

Vì câu hỏi đó nằm trong vòng lặp trong của rất nhiều bài, đổi được nó nghĩa là đổi `O(n²)` thành `O(n)`. Cách bảng băm làm được điều đó nằm ở [[bang-bam]]; bài này chỉ nói về cách dùng nó để giải bài.

## Mental model

Hãy nghĩ tới **cuốn sổ ghi tên người đã vào cửa** ở một sự kiện.

> Bảo vệ không nhớ mặt từng người. Anh ta chỉ **ghi tên vào sổ** khi ai đó vào, và **tra sổ** khi cần biết ai đó đã vào chưa.
>
> Sổ dày lên không làm việc tra chậm đi — vì anh ta tra theo tên, không đọc từ đầu.

Ba mẫu dưới đây chỉ là ba cách dùng cuốn sổ đó: **ghi tên đã gặp**, **ghi số lần gặp**, và **ghi theo nhóm**.

## Ví dụ nhỏ

```ts
const daGap = new Set()
for (const x of [3, 7, 3]) {
  if (daGap.has(x)) { console.log('trùng:', x); break }
  daGap.add(x)
}
// → trùng: 3
```

## Code chạy thế nào

**Mẫu 1 — nhớ những gì đã gặp.** Câu hỏi điển hình: *"có cặp nào thoả điều kiện không"*, *"có phần tử trùng không"*.

Chỗ tinh tế của mẫu này luôn là **thứ tự tra cứu và ghi vào**:

```text
Bài Hai tổng, nums = [3, 3], target = 6

TRA TRƯỚC, GHI SAU  ✅
  i=0, x=3: cần 3 — sổ rỗng, chưa có → ghi "3 ở chỉ số 0"
  i=1, x=3: cần 3 — sổ CÓ (chỉ số 0) → trả về [0, 1] ✓

GHI TRƯỚC, TRA SAU  ❌
  i=0, x=3: ghi "3 ở chỉ số 0" → cần 3 — sổ CÓ → trả về [0, 0]
                                              ↑ phần tử tự khớp với chính nó
```

```ts
function haiTong(nums, target) {
  const daGap = new Map()               // giá trị → chỉ số
  for (let i = 0; i < nums.length; i += 1) {
    const bu = target - nums[i]
    if (daGap.has(bu)) return [daGap.get(bu), i]   // TRA trước
    daGap.set(nums[i], i)                          // GHI sau
  }
  return []
}
```

**Mẫu 2 — đếm tần suất.** Câu hỏi điển hình: *"phần tử xuất hiện nhiều nhất"*, *"hai chuỗi có phải hoán vị của nhau"*.

```ts
function demTanSuat(items) {
  const dem = new Map()
  for (const x of items) dem.set(x, (dem.get(x) ?? 0) + 1)
  return dem
}
```

`(dem.get(x) ?? 0) + 1` là thành ngữ nên thuộc — nó xuất hiện trong hầu hết bài đếm. Python có sẵn `collections.Counter`.

**Mẫu 3 — gom nhóm theo khoá suy ra.** Mẫu mạnh nhất và ít người nghĩ ra nhất. Ý tưởng: **hai phần tử thuộc cùng nhóm khi và chỉ khi chúng cho ra cùng một khoá** — việc của bạn là nghĩ ra khoá đó.

```ts
function gomHoanVi(tu) {
  const nhom = new Map()
  for (const t of tu) {
    const khoa = [...t].sort().join('')     // 'listen' và 'silent' → cùng 'eilnst'
    nhom.set(khoa, [...(nhom.get(khoa) ?? []), t])
  }
  return [...nhom.values()]
}
```

## Tại sao cần nó

Cái khó của mẫu 3 không nằm ở code mà ở **chọn khoá**. Vài khoá hay dùng:

| Bài toán | Khoá |
|---|---|
| Gom các từ hoán vị | Chữ cái đã sắp xếp, hoặc vector 26 số đếm |
| Gom điểm thẳng hàng | Hệ số góc rút gọn |
| Gom dòng trùng nhau | Chuỗi nối các trường |
| Đếm đoạn con có tổng bằng `k` | **Tổng cộng dồn** đã gặp |

Cái cuối đáng nói riêng vì nó chiếm nhiều bài trung–khó:

```ts
function demDoanConTongK(nums, k) {
  // Tổng đoạn (i..j) = congDon[j] - congDon[i-1].
  // Cần đếm bao nhiêu i thoả congDon[i-1] === congDon[j] - k ⇒ lại là một phép TRA CỨU.
  const demCongDon = new Map([[0, 1]])   // tổng 0 xuất hiện một lần: đoạn rỗng ở đầu
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

## So sánh

Bảng băm đổi bộ nhớ lấy thời gian — `O(n)` bộ nhớ thêm. Ba trường hợp nên nghĩ lại:

| Tình huống | Dùng gì thay thế | Vì sao |
|---|---|---|
| Dữ liệu đã sắp xếp | Hai con trỏ | Cùng kết quả, `O(1)` bộ nhớ |
| Miền giá trị nhỏ, biết trước (26 chữ cái, 0–100) | Mảng đếm | Nhanh hơn, gọn hơn bảng băm |
| Cần thứ tự (nhỏ nhất, lớn thứ `k`) | Sắp xếp, heap | Bảng băm **không có** thứ tự |

## Dễ nhầm

**1. Ghi vào sổ trước khi tra.** Đã nói ở trên; đây là lỗi số một của bài Hai tổng.

**2. Dùng `Object` thay `Map` trong JavaScript.** Object mang sẵn khoá kế thừa:

```ts
const dem: Record<string, number> = {}
dem['constructor']        // ❌ trả về một hàm, không phải undefined
```

Với bài thuật toán, mặc định dùng `Map`. Khoá của `Object` còn luôn bị ép thành chuỗi, nên `1` và `'1'` lẫn vào nhau.

**3. Quên khởi tạo trường hợp rỗng ở bài cộng dồn.** `[[0, 1]]` — đã nói ở trên.

**4. Dùng mảng/object làm khoá `Map`.** `Map` của JS so khoá theo **danh tính**, nên `m.get([1,2])` không bao giờ thấy thứ đã cất bằng `m.set([1,2], x)`. Khoá phải là chuỗi hoặc số:

```ts
m.set(`${r},${c}`, giaTri)   // ✅ toạ độ thành chuỗi
```

**5. Tưởng bảng băm luôn `O(1)`.** Trung bình thì đúng; trường hợp xấu nhất khi mọi khoá đâm vào cùng một ngăn là `O(n)`. Với bài tập thì hiếm khi thành vấn đề, nhưng với hệ thống thật thì có kẻ tấn công cố tình tạo ra nó.

## Mẹo nhớ

> **Bảng băm biến "đi tìm" thành "tra sổ".**
>
> **Tra trước, ghi sau.**
>
> **Mẫu 3: phần khó là nghĩ ra khoá, không phải viết code.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bảng băm đổi câu hỏi nào thành câu hỏi nào?
2. Vì sao Hai tổng phải tra cứu **trước** rồi mới ghi vào bảng?
3. Nêu hai khoá khác nhau đều gom được các từ hoán vị.
4. Bỏ dòng `[[0, 1]]` trong `demDoanConTongK` thì sai ở trường hợp nào?
5. Khi nào **không** nên dùng bảng băm dù bài có vẻ hợp?

## Tự viết lại

Không nhìn lại phần trên, viết hàm tìm **ký tự đầu tiên không lặp lại** trong một chuỗi:

```ts
dauTienKhongLap('lovelace')   // → 'o'
dauTienKhongLap('aabb')       // → null
```

Tự kiểm: bạn duyệt chuỗi mấy lần, và vì sao **không** thể làm trong một lượt duy nhất?

## Thử sức

Cho một mảng các chuỗi, gom những chuỗi **là hoán vị vòng của nhau** vào cùng nhóm (`'abc'`, `'bca'`, `'cab'` cùng nhóm; `'acb'` thì không).

Câu hỏi duy nhất cần trả lời: **khoá là gì?** Gợi ý — hãy tìm một cách biến đổi mà mọi hoán vị vòng của cùng một chuỗi đều cho ra cùng kết quả.
