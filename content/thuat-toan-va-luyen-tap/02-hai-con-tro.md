---
title: Hai con trỏ
slug: hai-con-tro
summary: Ba biến thể của kỹ thuật hai con trỏ, dấu hiệu nhận ra bài dùng được nó, và vì sao nó biến O(n²) thành O(n).
level: co-ban
tags: [thuat-toan, hai-con-tro, mang, chuoi]
---

> **Sau bài này bạn sẽ:** nhận ra bài nào dùng được hai con trỏ, và viết được cả ba biến thể mà không phải nhớ thuộc lòng.

## Ý tưởng

Thay vì hai vòng lặp lồng nhau chạy `n × n` lượt, ta dùng **hai chỉ số cùng chạy trên một mảng** và mỗi chỉ số chỉ đi qua mảng đúng một lần. Tổng cộng `2n` bước ⇒ `O(n)`.

Điều kiện để làm được: **biết chắc con trỏ nào cần dịch, dựa vào thông tin đang có.** Đây gần như luôn đến từ một trong hai chỗ — mảng đã được sắp xếp, hoặc bài toán có tính đối xứng.

## Biến thể 1: hai đầu chạy vào giữa

Dùng cho: đảo ngược, kiểm tra đối xứng, tìm cặp có tổng cho trước **trong mảng đã sắp xếp**, bài chứa nước.

```js
function coCapTong(nums, target) {
  // nums PHẢI đã sắp xếp tăng dần
  let trai = 0
  let phai = nums.length - 1

  while (trai < phai) {
    const tong = nums[trai] + nums[phai]
    if (tong === target) return true
    // Tổng nhỏ quá ⇒ chỉ có thể cứu bằng cách tăng số nhỏ nhất đang có.
    if (tong < target) trai += 1
    else phai -= 1
  }
  return false
}
```

Chỗ đáng hiểu là **vì sao được phép bỏ đi cả một nửa khả năng**. Khi `tong < target`, ta dịch `trai` sang phải và vĩnh viễn loại bỏ mọi cặp có dạng `(trai, x)` với `x ≤ phai`. Điều đó hợp lệ vì `nums[phai]` đang là giá trị lớn nhất còn lại: nếu ghép với nó mà tổng còn chưa đủ, thì ghép `trai` với bất kỳ cái nào nhỏ hơn cũng vô vọng.

Đó chính là điều mà "mảng đã sắp xếp" mua cho bạn: mỗi bước loại được cả một nhóm khả năng thay vì một khả năng.

## Biến thể 2: hai con trỏ cùng chiều (nhanh và chậm)

Dùng cho: xoá phần tử trùng tại chỗ, dồn phần tử về đầu mảng, lọc tại chỗ.

```js
function xoaTrungTaiCho(nums) {
  // nums đã sắp xếp; trả về số phần tử duy nhất, đã dồn về đầu mảng
  if (nums.length === 0) return 0

  let cham = 0 // vị trí ghi tiếp theo
  for (let nhanh = 1; nhanh < nums.length; nhanh += 1) {
    if (nums[nhanh] !== nums[cham]) {
      cham += 1
      nums[cham] = nums[nhanh]
    }
  }
  return cham + 1
}
```

Cách đọc: `nhanh` **duyệt**, `cham` **ghi**. Mọi thứ bên trái `cham` là kết quả đã hoàn thành. Mẫu này thay thế cho việc tạo một mảng mới, nên bộ nhớ phụ là `O(1)`.

## Biến thể 3: hai con trỏ trên hai mảng

Dùng cho: trộn hai mảng đã sắp xếp, tìm phần giao/hợp.

```js
function tronHaiMangDaSap(a, b) {
  const ketQua = []
  let i = 0
  let j = 0

  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) ketQua.push(a[i++])
    else ketQua.push(b[j++])
  }
  // Một trong hai mảng đã hết; phần còn lại của mảng kia vốn đã sắp xếp.
  return [...ketQua, ...a.slice(i), ...b.slice(j)]
}
```

Đây chính là bước trộn của merge sort — xem [[sap-xep-va-tim-kiem-nhi-phan]].

## Dấu hiệu nhận ra

Nghĩ tới hai con trỏ khi đề có một trong các dấu hiệu:

- Nhắc tới **mảng/chuỗi đã sắp xếp**.
- Yêu cầu **bộ nhớ phụ `O(1)`** hoặc "làm tại chỗ".
- Đi tìm một **cặp/bộ ba** thoả điều kiện nào đó.
- Cần **đảo, dồn, lọc** ngay trên mảng đầu vào.

Ngược lại, dấu hiệu KHÔNG dùng được: dữ liệu chưa sắp xếp *và* bài đòi giữ nguyên thứ tự gốc (lúc đó thường là bảng băm), hoặc cần xét đoạn con liên tiếp co giãn (lúc đó là cửa sổ trượt — [[cua-so-truot]], vốn cũng là một dạng hai con trỏ).

## Bẫy thường gặp

| Bẫy | Hậu quả |
|---|---|
| Quên sắp xếp trước ở biến thể 1 | Kết quả sai âm thầm với dữ liệu chưa sắp |
| Viết `trai <= phai` khi cần `trai < phai` | Ghép một phần tử với chính nó |
| Dịch cả hai con trỏ trong một nhánh | Bỏ sót cặp cần xét |
| Trả về `cham` thay vì `cham + 1` | Lệch một — `cham` là chỉ số, không phải số lượng |

Lỗi lệch một ở dòng cuối là lỗi phổ biến nhất của biến thể 2. Cách kiểm nhanh: thử mảng một phần tử. Kết quả phải là `1`.

## Ghi nhớ

- Hai con trỏ đổi `O(n²)` lấy `O(n)` bằng cách mỗi bước loại bỏ cả một nhóm khả năng.
- Điều kiện tiên quyết: phải biết chắc con trỏ nào nên dịch — thường nhờ mảng đã sắp xếp.
- Ba biến thể: hai đầu vào giữa, nhanh–chậm cùng chiều, và trên hai mảng.
- Luôn thử mảng rỗng và mảng một phần tử.

## Tự kiểm tra

1. Vì sao biến thể 1 bắt buộc mảng phải sắp xếp, còn biến thể 2 thì tuỳ bài?
2. Trong `xoaTrungTaiCho`, `cham` mang ý nghĩa gì tại mỗi thời điểm?
3. Bài "tìm cặp có tổng bằng target" trên mảng **chưa** sắp xếp và phải trả về chỉ số gốc — còn dùng hai con trỏ được không? Vì sao?
