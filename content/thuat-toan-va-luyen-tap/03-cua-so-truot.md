---
title: Cửa sổ trượt
slug: cua-so-truot
summary: Cửa sổ cố định và cửa sổ co giãn, bất biến phải giữ, và cách nhận ra bài toán đoạn con liên tiếp.
level: co-ban
tags: [thuat-toan, cua-so-truot, mang, chuoi]
---

> **Sau bài này bạn sẽ:** viết được cả hai kiểu cửa sổ trượt, và biết bất biến nào phải giữ để không rơi vào lỗi kinh điển "mép trái bị kéo lùi".

## Bài toán mà nó giải

Cửa sổ trượt dành cho câu hỏi về **đoạn con liên tiếp**: tổng lớn nhất của `k` phần tử liền nhau, đoạn ngắn nhất có tổng ≥ `target`, chuỗi con dài nhất không lặp ký tự.

Từ khoá phải để ý trong đề: **"liên tiếp"**, "đoạn con", "chuỗi con" (khác "dãy con" — dãy con được phép nhảy cách, và đó là bài toán khác hẳn, thường thuộc về quy hoạch động).

## Kiểu 1: cửa sổ cố định

Kích thước `k` cho trước. Trượt sang phải: thêm phần tử mới vào, bỏ phần tử cũ ra.

```js
function tongLonNhatKPhanTu(nums, k) {
  if (nums.length < k) return null

  let tong = 0
  for (let i = 0; i < k; i += 1) tong += nums[i]
  let lonNhat = tong

  for (let i = k; i < nums.length; i += 1) {
    // Cập nhật theo HIỆU, không tính lại cả cửa sổ — đây chính là chỗ tiết kiệm.
    tong += nums[i] - nums[i - k]
    lonNhat = Math.max(lonNhat, tong)
  }
  return lonNhat
}
```

Cách vét cạn là `O(n × k)` vì mỗi vị trí lại cộng lại `k` phần tử. Cửa sổ trượt là `O(n)` vì nó nhận ra: hai cửa sổ liền nhau chỉ khác nhau **hai phần tử**.

## Kiểu 2: cửa sổ co giãn

Kích thước không cho trước — nó tự lớn lên và co lại theo một điều kiện. Đây là kiểu hay gặp hơn và cũng khó hơn.

Khung chung, gần như bài nào cũng có hình dạng này:

```js
function doanNganNhatCoTong(nums, target) {
  let trai = 0
  let tong = 0
  let nganNhat = Infinity

  for (let phai = 0; phai < nums.length; phai += 1) {
    tong += nums[phai] // 1. mở rộng bên phải

    while (tong >= target) {
      // 2. cửa sổ đang hợp lệ ⇒ ghi nhận, rồi thử co lại cho ngắn hơn
      nganNhat = Math.min(nganNhat, phai - trai + 1)
      tong -= nums[trai]
      trai += 1
    }
  }
  return nganNhat === Infinity ? 0 : nganNhat
}
```

Ba câu hỏi phải trả lời cho mỗi bài, và trả lời xong là code tự hiện ra:

1. **Mở rộng thì cập nhật trạng thái gì?** (tổng, bảng đếm, số ký tự phân biệt…)
2. **Khi nào phải co lại?** (tổng vượt ngưỡng, có ký tự lặp, quá `k` loại phần tử…)
3. **Ghi nhận đáp án ở đâu?** Bài tìm **ngắn nhất** thì ghi nhận *bên trong* vòng co; bài tìm **dài nhất** thì ghi nhận *sau khi* đã co xong.

Điểm 3 là chỗ nhầm nhiều nhất. Cửa sổ ngắn nhất chỉ hợp lệ ngay trước khi bị co quá tay; cửa sổ dài nhất chỉ hợp lệ sau khi vi phạm đã được sửa.

## Bất biến: mép trái không bao giờ lùi

Đây là điều làm cửa sổ trượt chạy `O(n)`: cả `trai` lẫn `phai` **chỉ tiến**, mỗi cái đi qua mảng đúng một lần. Tổng `2n` bước, dù vòng `while` bên trong trông như vòng lặp lồng nhau.

Lỗi kinh điển làm hỏng bất biến này, gặp ở bài chuỗi con không lặp:

```js
// SAI: mép trái bị kéo LÙI
if (lanCuoi.has(c)) trai = lanCuoi.get(c) + 1

// ĐÚNG: chỉ nhảy khi ký tự trùng còn nằm TRONG cửa sổ
if (lanCuoi.has(c) && lanCuoi.get(c) >= trai) trai = lanCuoi.get(c) + 1
```

Với `"abba"`: khi `phai` tới `'a'` cuối, bảng nói `'a'` từng ở chỉ số 0, nhưng cửa sổ hiện tại đã bắt đầu ở 2. Bản sai kéo `trai` về 1 và cho ra kết quả 3 thay vì 2. Không có gì báo lỗi — chỉ có đáp án sai.

Nguyên tắc để không mắc lại: sau mỗi lần gán `trai`, tự hỏi *"giá trị mới có chắc chắn ≥ giá trị cũ không?"*

## So sánh với hai con trỏ

Cửa sổ trượt **là** một dạng hai con trỏ cùng chiều, nhưng cách nghĩ khác:

| | Hai con trỏ (nhanh–chậm) | Cửa sổ trượt |
|---|---|---|
| Quan tâm | Hai **vị trí** | **Đoạn** giữa hai vị trí |
| Trạng thái mang theo | Thường không có | Tổng, bảng đếm… của cả đoạn |
| Câu hỏi điển hình | "Ghi phần tử này vào đâu?" | "Đoạn hiện tại có hợp lệ không?" |

## Ghi nhớ

- Từ khoá kích hoạt: **liên tiếp**. Không liên tiếp thì đây không phải công cụ đúng.
- Cửa sổ cố định cập nhật theo hiệu; cửa sổ co giãn theo khung mở rộng → co lại.
- Ngắn nhất ghi nhận trong vòng co; dài nhất ghi nhận sau vòng co.
- Mép trái chỉ tiến, không bao giờ lùi — đây là bất biến giữ cho thuật toán `O(n)`.

## Tự kiểm tra

1. Vì sao vòng `while` lồng trong vòng `for` vẫn cho tổng `O(n)` chứ không phải `O(n²)`?
2. Bài "đoạn con dài nhất có nhiều nhất `k` số 0" — ghi nhận đáp án trước hay sau vòng co?
3. Điều gì xảy ra với `"abba"` nếu bỏ điều kiện `lanCuoi.get(c) >= trai`?
