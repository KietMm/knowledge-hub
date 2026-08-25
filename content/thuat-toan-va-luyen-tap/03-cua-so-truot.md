---
title: Cửa sổ trượt
slug: cua-so-truot
summary: Cửa sổ cố định và cửa sổ co giãn, bất biến phải giữ, và cách nhận ra bài toán đoạn con liên tiếp.
level: co-ban
tags: [thuat-toan, cua-so-truot, mang, chuoi]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được cả hai kiểu cửa sổ trượt, và biết bất biến nào phải giữ để không rơi vào lỗi kinh điển "mép trái bị kéo lùi".

## Ý tưởng chính

Cửa sổ trượt dành cho câu hỏi về **đoạn con liên tiếp**: tổng lớn nhất của `k` phần tử liền nhau, đoạn ngắn nhất có tổng ≥ target, chuỗi con dài nhất không lặp ký tự.

Từ khoá phải để ý trong đề: **"liên tiếp"**. Nếu đoạn được phép nhảy cách thì đó là bài khác hẳn — thường thuộc về [[quy-hoach-dong]].

## Mental model

Hãy tưởng tượng bạn **đọc một cuốn sách qua một khe hở trên tấm bìa**.

> Khe hở chỉ cho bạn thấy vài chữ. Muốn xem đoạn tiếp theo, bạn **trượt tấm bìa sang phải** — chữ mới lộ ra bên phải, chữ cũ khuất đi bên trái.
>
> Bạn **không đọc lại từ đầu trang** mỗi lần trượt. Bạn chỉ cần biết: *thêm chữ nào vào, bỏ chữ nào ra*.

Đó là toàn bộ kỹ thuật. Cách vét cạn là mỗi lần lại đọc lại cả đoạn; cửa sổ trượt nhận ra hai đoạn liền nhau **chỉ khác nhau hai đầu**.

## Ví dụ nhỏ

```ts
nums = [2, 1, 5, 1, 3]
k = 3
// cửa sổ đầu: [2,1,5] = 8
// trượt sang: [1,5,1] = 8 - 2 + 1 = 5     ← không cộng lại từ đầu
// trượt sang: [5,1,3] = 5 - 1 + 3 = 7
// lớn nhất = 8
```

## Code chạy thế nào

**Kiểu 1 — cửa sổ cố định.** Kích thước `k` cho trước:

```ts
function tongLonNhatKPhanTu(nums, k) {
  if (nums.length < k) return null

  let tong = 0
  for (let i = 0; i < k; i += 1) tong += nums[i]
  let lonNhat = tong

  for (let i = k; i < nums.length; i += 1) {
    tong += nums[i] - nums[i - k]        // ← thêm cái mới, bỏ cái cũ
    lonNhat = Math.max(lonNhat, tong)
  }
  return lonNhat
}
```

Vét cạn là `O(n × k)` vì mỗi vị trí lại cộng lại `k` phần tử. Cửa sổ trượt là `O(n)` vì mỗi bước chỉ làm **hai phép tính**, bất kể `k` lớn cỡ nào.

**Kiểu 2 — cửa sổ co giãn.** Kích thước không cho trước; nó tự lớn lên và co lại theo một điều kiện:

```ts
function doanNganNhatCoTong(nums, target) {
  let trai = 0
  let tong = 0
  let nganNhat = Infinity

  for (let phai = 0; phai < nums.length; phai += 1) {
    tong += nums[phai]                                  // 1. mở rộng bên phải

    while (tong >= target) {                            // 2. đang hợp lệ → ghi nhận rồi co
      nganNhat = Math.min(nganNhat, phai - trai + 1)
      tong -= nums[trai]
      trai += 1
    }
  }
  return nganNhat === Infinity ? 0 : nganNhat
}
```

Ba câu hỏi phải trả lời cho mỗi bài, trả lời xong là code tự hiện ra:

```text
1. Mở rộng thì cập nhật trạng thái gì?   (tổng, bảng đếm, số ký tự phân biệt…)
2. Khi nào phải co lại?                  (vượt ngưỡng, có ký tự lặp, quá k loại…)
3. Ghi nhận đáp án ở đâu?
     tìm NGẮN NHẤT → ghi nhận TRONG vòng co
     tìm DÀI NHẤT  → ghi nhận SAU vòng co
```

Điểm 3 là chỗ nhầm nhiều nhất. Cửa sổ ngắn nhất chỉ hợp lệ **ngay trước khi bị co quá tay**; cửa sổ dài nhất chỉ hợp lệ **sau khi vi phạm đã được sửa**.

## Tại sao cần nó

Vì nó là ranh giới giữa lời giải chạy được và lời giải quá hạn ở đúng lớp bài rất hay gặp:

| Bài | Vét cạn | Cửa sổ trượt |
|---|---|---|
| Tổng lớn nhất `k` phần tử liền nhau | `O(n·k)` | `O(n)` |
| Đoạn ngắn nhất có tổng ≥ target | `O(n²)` | `O(n)` |
| Chuỗi con dài nhất không lặp ký tự | `O(n²)` hoặc tệ hơn | `O(n)` |

Và điều làm nó `O(n)` không hiển nhiên: vòng `while` **lồng trong** vòng `for` trông như `O(n²)`, nhưng cả hai mép **chỉ tiến, mỗi mép đi qua mảng đúng một lần** ⇒ tổng `2n` bước.

## So sánh

Cửa sổ trượt **là** một dạng hai con trỏ cùng chiều, nhưng cách nghĩ khác:

| | Hai con trỏ (nhanh–chậm) | Cửa sổ trượt |
|---|---|---|
| Quan tâm | Hai **vị trí** | **Đoạn** giữa hai vị trí |
| Trạng thái mang theo | Thường không có | Tổng, bảng đếm… của cả đoạn |
| Câu hỏi điển hình | "Ghi phần tử này vào đâu?" | "Đoạn hiện tại có hợp lệ không?" |

Chi tiết về hai con trỏ ở [[hai-con-tro]].

## Dễ nhầm

**1. Kéo mép trái LÙI.** Đây là lỗi kinh điển, gặp ở bài chuỗi con không lặp:

```ts
// ❌ SAI: mép trái có thể bị kéo về phía sau
if (lanCuoi.has(c)) trai = lanCuoi.get(c) + 1

// ✅ ĐÚNG: chỉ nhảy khi ký tự trùng còn nằm TRONG cửa sổ
if (lanCuoi.has(c) && lanCuoi.get(c) >= trai) trai = lanCuoi.get(c) + 1
```

Với `"abba"`: khi `phai` tới `'a'` cuối, bảng nói `'a'` từng ở chỉ số 0, nhưng cửa sổ hiện tại đã bắt đầu ở 2. Bản sai kéo `trai` về 1 và cho ra 3 thay vì 2. Không có gì báo lỗi — chỉ có đáp án sai.

Quy tắc để không mắc lại: **sau mỗi lần gán `trai`, tự hỏi "giá trị mới có chắc chắn ≥ giá trị cũ không?"**

**2. Ghi nhận đáp án sai chỗ.** Bài dài nhất mà ghi nhận trong vòng co sẽ đo cửa sổ **đang vi phạm**.

**3. Dùng cửa sổ trượt cho bài không liên tiếp.** "Dãy con" (được nhảy cách) khác "đoạn con" (phải liền nhau). Đọc nhầm hai chữ này là đi sai hướng ngay từ đầu.

**4. Quên cập nhật trạng thái khi co.** Mở rộng thì `tong += nums[phai]`; co lại **phải** có `tong -= nums[trai]` đối xứng. Thiếu một vế là trạng thái lệch và mọi kết quả sau đó sai.

**5. Tưởng mọi bài "đoạn con" đều dùng được.** Cửa sổ trượt cần tính **đơn điệu**: mở rộng làm điều kiện "tệ đi" theo một hướng, co lại làm nó "tốt lên". Mảng có số âm phá tính đơn điệu đó — bài "đoạn con có tổng bằng k" với số âm phải dùng bảng băm cộng dồn, không dùng cửa sổ trượt.

## Mẹo nhớ

> **Đọc qua khe hở: thêm bên phải, bỏ bên trái — đừng đọc lại từ đầu.**
>
> **Mép trái chỉ tiến, không bao giờ lùi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Từ khoá nào trong đề cho biết có thể dùng cửa sổ trượt?
2. Vì sao vòng `while` lồng trong `for` vẫn cho tổng `O(n)`?
3. Bài tìm **dài nhất** thì ghi nhận đáp án trước hay sau vòng co? Vì sao?
4. Điều gì xảy ra với `"abba"` nếu bỏ điều kiện `lanCuoi.get(c) >= trai`?
5. Vì sao mảng có **số âm** làm hỏng kỹ thuật này ở bài tổng?

## Tự viết lại

Không nhìn lại phần trên, viết hàm tìm **độ dài đoạn con dài nhất chứa nhiều nhất `k` số 0**:

```ts
daiNhatVoiKSoKhong([1,1,0,0,1,1,1,0], 2)   // → 7
```

Tự kiểm ba câu: mở rộng thì bạn cập nhật gì, khi nào phải co, và ghi nhận đáp án ở đâu?

## Thử sức

Bài "chuỗi con nhỏ nhất chứa đủ mọi ký tự của T":

```ts
nhoNhatChuaDu('ADOBECODEBANC', 'ABC')   // → 'BANC'
```

Ba câu hỏi để tự lần ra: trạng thái bạn mang theo là gì (không phải một con số nữa)? Điều kiện "hợp lệ" kiểm thế nào cho rẻ — mỗi lần so cả bảng đếm là `O(k)`, làm sao đưa về `O(1)`?
