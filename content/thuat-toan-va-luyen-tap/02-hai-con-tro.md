---
title: Hai con trỏ
slug: hai-con-tro
summary: Ba biến thể của kỹ thuật hai con trỏ, dấu hiệu nhận ra bài dùng được nó, và vì sao nó biến O(n²) thành O(n).
level: co-ban
tags: [thuat-toan, hai-con-tro, mang, chuoi]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra bài nào dùng được hai con trỏ, và viết được cả ba biến thể mà không phải nhớ thuộc lòng.

## Ý tưởng chính

Thay vì hai vòng lặp lồng nhau chạy `n × n` lượt, ta dùng **hai chỉ số cùng chạy trên một mảng**, mỗi chỉ số chỉ đi qua mảng đúng một lần. Tổng `2n` bước ⇒ `O(n)`.

Điều kiện để làm được: **biết chắc con trỏ nào nên dịch**, dựa vào thông tin đang có. Điều đó gần như luôn đến từ một trong hai chỗ — mảng đã sắp xếp, hoặc bài toán có tính đối xứng.

## Mental model

Hãy tưởng tượng bạn **tìm hai người có tổng tuổi bằng 60 trong một hàng người đã đứng theo thứ tự tuổi tăng dần**.

> Bạn đứng ở **hai đầu hàng**: người trẻ nhất và người già nhất.
>
> Tổng tuổi hai người **nhỏ hơn 60**? Người già nhất đã là lớn nhất rồi, nên muốn tăng tổng chỉ còn cách **bỏ người trẻ nhất** — bước sang phải.
>
> Tổng **lớn hơn 60**? Ngược lại, bỏ người già nhất — bước sang trái.

Mỗi bước bạn **loại vĩnh viễn một người**, và loại có căn cứ chứ không đoán. Hàng có 1000 người thì tối đa 1000 bước, thay vì thử 500.000 cặp.

Cái mà "hàng đã sắp thứ tự" mua cho bạn là: **mỗi bước loại được cả một nhóm khả năng, không phải một khả năng**.

## Ví dụ nhỏ

```ts
const nums = [1, 3, 5, 8]   // đã sắp xếp
const target = 9
// trai=0 (1), phai=3 (8) → tổng 9 → tìm thấy
```

## Code chạy thế nào

```ts
function coCapTong(nums, target) {
  let trai = 0
  let phai = nums.length - 1

  while (trai < phai) {
    const tong = nums[trai] + nums[phai]
    if (tong === target) return true
    if (tong < target) trai += 1     // cần lớn hơn → bỏ số nhỏ nhất
    else phai -= 1                    // cần nhỏ hơn → bỏ số lớn nhất
  }
  return false
}
```

Lần tay với `[1, 3, 5, 8]`, `target = 11`:

```text
trai=0(1) phai=3(8) → 9  < 11 → bỏ 1,  trai→1
trai=1(3) phai=3(8) → 11 = 11 → tìm thấy ✓
```

Và với `target = 4`:

```text
trai=0(1) phai=3(8) → 9  > 4 → bỏ 8,  phai→2
trai=0(1) phai=2(5) → 6  > 4 → bỏ 5,  phai→1
trai=0(1) phai=1(3) → 4  = 4 → tìm thấy ✓
```

Ba bước thay vì sáu cặp. Với `n = 1000` thì chênh lệch là 1000 so với 500.000.

## Tại sao cần nó

Ba biến thể dưới đây phủ phần lớn bài mảng/chuỗi bạn sẽ gặp:

**Biến thể 1 — hai đầu chạy vào giữa.** Vừa xem ở trên. Dùng cho: đảo ngược, kiểm tra đối xứng, tìm cặp có tổng cho trước trong mảng **đã sắp xếp**, bài chứa nước.

**Biến thể 2 — hai con trỏ cùng chiều (nhanh và chậm).** Dùng cho: xoá phần tử trùng tại chỗ, dồn phần tử về đầu, lọc tại chỗ với `O(1)` bộ nhớ.

```ts
function xoaTrungTaiCho(nums) {   // nums đã sắp xếp
  if (nums.length === 0) return 0
  let cham = 0                     // vị trí GHI tiếp theo
  for (let nhanh = 1; nhanh < nums.length; nhanh += 1) {
    if (nums[nhanh] !== nums[cham]) {
      cham += 1
      nums[cham] = nums[nhanh]
    }
  }
  return cham + 1
}
```

Cách đọc: `nhanh` **duyệt**, `cham` **ghi**. Mọi thứ bên trái `cham` là kết quả đã hoàn thành.

**Biến thể 3 — hai con trỏ trên hai mảng.** Dùng cho: trộn hai mảng đã sắp xếp, tìm phần giao/hợp. Đây chính là bước trộn của merge sort — [[sap-xep-va-tim-kiem-nhi-phan]].

```ts
function tronHaiMangDaSap(a, b) {
  const kq = []
  let i = 0, j = 0
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) kq.push(a[i++])
    else kq.push(b[j++])
  }
  return [...kq, ...a.slice(i), ...b.slice(j)]   // một mảng đã hết; phần kia vốn đã sắp
}
```

## So sánh

Nghĩ tới hai con trỏ khi đề có một trong các dấu hiệu:

| Dấu hiệu trong đề | Biến thể |
|---|---|
| Mảng/chuỗi **đã sắp xếp**, tìm cặp/bộ ba | 1 — hai đầu vào giữa |
| Yêu cầu **bộ nhớ phụ `O(1)`** hoặc "làm tại chỗ" | 2 — nhanh–chậm |
| Đảo, dồn, lọc ngay trên mảng đầu vào | 2 — nhanh–chậm |
| Trộn/so hai danh sách đã sắp xếp | 3 — trên hai mảng |

Và dấu hiệu **không** dùng được: dữ liệu chưa sắp xếp *và* phải giữ thứ tự gốc (lúc đó thường là bảng băm), hoặc cần xét đoạn con liên tiếp co giãn (lúc đó là [[cua-so-truot]] — vốn cũng là một dạng hai con trỏ).

## Dễ nhầm

**1. Quên sắp xếp trước ở biến thể 1.** Kết quả sai một cách im lặng: không lỗi, không cảnh báo, chỉ là đáp án sai với một số đầu vào.

**2. Viết `trai <= phai` khi cần `trai < phai`.** Với `<=`, khi hai con trỏ gặp nhau ở cùng một vị trí, bạn đang **ghép một phần tử với chính nó** — bài "tìm cặp" cho ra kết quả sai với mảng như `[4]` và `target = 8`.

**3. Dịch cả hai con trỏ trong cùng một nhánh.** Làm vậy là bỏ sót các cặp chưa xét. Mỗi lượt chỉ dịch **một** con trỏ, trừ khi bạn chứng minh được cặp bị bỏ qua không thể là đáp án.

**4. Trả về `cham` thay vì `cham + 1`.** Lỗi lệch một kinh điển của biến thể 2: `cham` là **chỉ số**, còn đề hỏi **số lượng**. Cách kiểm nhanh: thử mảng một phần tử — kết quả phải là `1`.

**5. Tưởng hai con trỏ luôn nhanh hơn.** Nếu phải sắp xếp trước, tổng chi phí là `O(n log n)` — có thể chậm hơn một lời giải `O(n)` bằng bảng băm. Chọn theo bài, không theo thói quen.

## Mẹo nhớ

> **Hai đầu hàng đi vào giữa; mỗi bước loại hẳn một nhóm, không phải một cái.**
>
> **Nhanh duyệt, chậm ghi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao biến thể 1 bắt buộc mảng phải sắp xếp?
2. Khi tổng nhỏ hơn target, vì sao **chắc chắn** phải dịch con trỏ trái?
3. Trong `xoaTrungTaiCho`, `cham` mang ý nghĩa gì tại mỗi thời điểm?
4. `trai <= phai` gây lỗi gì?
5. Khi nào hai con trỏ **không** phải lựa chọn tốt?

## Tự viết lại

Không nhìn lại phần trên, viết hàm kiểm tra một chuỗi có đối xứng không, chỉ tính chữ và số (bỏ qua dấu câu, không phân biệt hoa thường):

```ts
doiXung('Cà, phê ê hp àc')   // true
doiXung('abc')               // false
```

Tự kiểm: bạn dùng biến thể nào, và điều kiện dừng là `<` hay `<=`?

## Thử sức

Bài "chứa nước": cho mảng chiều cao các cột, chọn **hai cột** sao cho lượng nước chứa giữa chúng lớn nhất. Lượng nước = `min(cao[i], cao[j]) × (j - i)`.

```ts
[1, 8, 6, 2, 5, 4, 8, 3, 7]   // → 49
```

Bắt đầu từ hai đầu. Câu hỏi quyết định: khi hai cột hai đầu **cao thấp khác nhau**, bạn dịch cột nào vào trong — và **chứng minh** vì sao dịch cột kia chắc chắn không bỏ sót đáp án?
