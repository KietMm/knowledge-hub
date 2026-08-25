---
title: Sắp xếp và tìm kiếm nhị phân
slug: sap-xep-va-tim-kiem-nhi-phan
summary: "Khi nào sắp xếp là bước mở đầu đúng, viết tìm kiếm nhị phân không lỗi lệch một, và mẫu nhị phân trên đáp án."
level: trung-cap
tags: [thuat-toan, sap-xep, tim-kiem-nhi-phan, do-phuc-tap]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được tìm kiếm nhị phân đúng ngay lần đầu, và nhận ra lớp bài giải bằng "nhị phân trên đáp án" — mẫu mạnh nhất mà tên gọi không gợi ra được.

## Ý tưởng chính

Sắp xếp tốn `O(n log n)`, nhưng nó **mua cho bạn một thứ rất giá trị**: từ nay mỗi phép so sánh loại được **một nửa** khả năng còn lại, thay vì một khả năng.

Và ý tưởng "loại một nửa mỗi bước" không chỉ dùng cho mảng. Nó dùng được cho **mọi thứ có thứ tự** — kể cả không gian đáp án của một bài toán.

## Mental model

Hãy nhớ **trò đoán số từ 1 đến 100**.

> Bạn đoán 50. Người kia nói "lớn hơn" → bạn vừa **loại 50 số** bằng một câu hỏi.
>
> Đoán 75, "nhỏ hơn" → loại thêm 25 số.
>
> Bảy câu hỏi là ra, dù dải số có 100 hay 128 số.

Điều kiện để trò này chơi được: **câu trả lời phải chia dải thành hai phần rõ ràng** — một phần chắc chắn không chứa đáp án. Đó là toàn bộ yêu cầu của tìm kiếm nhị phân, và nó rộng hơn "mảng đã sắp xếp" rất nhiều.

## Ví dụ nhỏ

```ts
nums = [1, 3, 5, 6]
target = 5
// trai=0 phai=3 → giua=1 (giá trị 3) → 3 < 5 → bỏ nửa trái
// trai=2 phai=3 → giua=2 (giá trị 5) → tìm thấy, chỉ số 2
```

Bốn phần tử, hai bước. Một triệu phần tử cũng chỉ 20 bước.

## Code chạy thế nào

Dùng **một** khuôn mẫu duy nhất và luôn viết đúng nó:

```ts
function timKiemNhiPhan(nums, target) {
  let trai = 0
  let phai = nums.length - 1        // khoảng ĐÓNG [trai, phai]

  while (trai <= phai) {
    // Viết thế này thay vì (trai + phai) / 2 để không tràn số ở ngôn ngữ số nguyên
    // 32-bit. JS không tràn, nhưng giữ thói quen đúng ở mọi ngôn ngữ.
    const giua = trai + Math.floor((phai - trai) / 2)

    if (nums[giua] === target) return giua
    if (nums[giua] < target) trai = giua + 1
    else phai = giua - 1
  }
  return -1
}
```

Ba chi tiết quyết định tính đúng, và chúng phải **nhất quán** với nhau:

```text
Khoảng ĐÓNG    →  phai = length - 1  ·  while (trai <= phai)  ·  phai = giua - 1
Khoảng NỬA MỞ  →  phai = length      ·  while (trai <  phai)  ·  phai = giua
```

Trộn hai kiểu là nguyên nhân của gần như mọi lỗi tìm kiếm nhị phân — hoặc bỏ sót phần tử, hoặc lặp vô hạn. Chọn một, viết mãi kiểu đó.

**Biến thể hay cần hơn cả bản gốc** — tìm vị trí chèn (phần tử đầu tiên ≥ target):

```ts
function viTriChen(nums, target) {
  let trai = 0
  let phai = nums.length            // nửa mở [trai, phai)

  while (trai < phai) {
    const giua = trai + Math.floor((phai - trai) / 2)
    if (nums[giua] < target) trai = giua + 1
    else phai = giua                // giữ giua làm ứng viên
  }
  return trai
}
```

Hàm này trả lời được nhiều câu hơn bản tìm-đúng-giá-trị: chèn vào đâu, có bao nhiêu phần tử nhỏ hơn target, biên trái/phải của một dãy giá trị bằng nhau.

## Tại sao cần nó

**Nhị phân trên đáp án** — mẫu đáng giá nhất trong bài này, và nó không nhắc gì tới mảng đã sắp xếp.

Điều kiện áp dụng: đáp án là **một con số trong khoảng biết trước**, và có một hàm kiểm tra **đơn điệu** — nếu `x` khả thi thì mọi giá trị lớn hơn (hoặc nhỏ hơn) cũng khả thi.

```ts
// "Chia mảng thành k đoạn sao cho tổng đoạn lớn nhất là NHỎ NHẤT"
function tongDoanNhoNhat(nums, k) {
  const chiaDuoc = (tran) => {
    let doan = 1, tong = 0
    for (const x of nums) {
      if (tong + x > tran) { doan += 1; tong = 0 }
      tong += x
    }
    return doan <= k
  }

  let trai = Math.max(...nums)                    // trần không thể nhỏ hơn phần tử lớn nhất
  let phai = nums.reduce((a, b) => a + b, 0)      // trần lớn nhất cần thiết: gộp tất cả

  while (trai < phai) {
    const giua = trai + Math.floor((phai - trai) / 2)
    if (chiaDuoc(giua)) phai = giua               // vẫn được ⇒ thử trần nhỏ hơn
    else trai = giua + 1
  }
  return trai
}
```

Nhận ra mẫu này qua **cách đề được phát biểu**:

```text
"nhỏ nhất của lớn nhất"      →  nhị phân trên đáp án
"lớn nhất của nhỏ nhất"      →  nhị phân trên đáp án
"tốc độ tối thiểu để xong trong h giờ"  →  nhị phân trên đáp án
"số ngày ít nhất để…"        →  nhị phân trên đáp án
```

Cấu trúc lời giải luôn gồm hai phần: hàm `khaThi(x)` viết theo cách tham lam, và vòng nhị phân đi tìm `x` biên. **Phần khó là viết `khaThi`, không phải phần nhị phân.**

## So sánh

| Thao tác | Chưa sắp xếp | Đã sắp xếp |
|---|---|---|
| Tìm một giá trị | `O(n)` | `O(log n)` |
| Tìm cặp có tổng cho trước | `O(n²)` | `O(n)` (hai con trỏ) |
| Tìm nhỏ nhất/lớn nhất | `O(n)` | `O(1)` |
| Chèn một phần tử | `O(1)` | `O(n)` |

Dòng cuối là lý do quan trọng: nếu dữ liệu thay đổi liên tục, sắp xếp lại mỗi lần sẽ đắt hơn tất cả những gì bạn tiết kiệm được. Lúc đó cần cấu trúc giữ thứ tự sẵn.

Dấu hiệu **nên sắp xếp trước**: bài nói về cặp/bộ ba thoả điều kiện giá trị; bài về khoảng (gộp, giao, xếp lịch); bài cần `k` phần tử lớn nhất. Dấu hiệu **không nên**: đề đòi giữ thứ tự gốc hoặc trả về chỉ số gốc — trừ khi bạn sắp trên cặp `[giá trị, chỉ số]`.

## Dễ nhầm

**1. `sort()` không tham số trong JavaScript.**

```ts
[10, 9, 1].sort()                 // [1, 10, 9]  ← so theo CHUỖI
[10, 9, 1].sort((a, b) => a - b)  // [1, 9, 10]
```

**2. Trộn hai khuôn mẫu nhị phân.** Đã nói ở trên — đây là nguồn của gần như mọi lỗi.

**3. Quên `+1` hoặc `-1` khi đã loại `giua`.** Nếu bạn đã kiểm `giua` và nó không phải đáp án mà vẫn gán `trai = giua`, vòng lặp không bao giờ kết thúc.

**4. Dùng nhị phân trên dữ liệu không đơn điệu.** Nhị phân đòi hỏi: khi đi sang phải thì điều kiện **chỉ đổi một lần** từ sai sang đúng (hoặc ngược lại). Dữ liệu lên xuống thất thường thì nhị phân cho kết quả sai chứ không phải chậm.

**5. Bỏ quên chi phí sắp xếp khi so sánh lời giải.** Lời giải "`O(log n)` sau khi sắp" thực chất là `O(n log n)` nếu bạn phải tự sắp — có thể thua một lời giải `O(n)` bằng bảng băm.

## Mẹo nhớ

> **Trò đoán số: mỗi câu hỏi loại một nửa.**
>
> **"Nhỏ nhất của lớn nhất" ⇒ nhị phân trên đáp án.**
>
> **Chọn một khuôn mẫu, giữ nhất quán ba chi tiết của nó.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Điều kiện thật sự để dùng được tìm kiếm nhị phân là gì — có phải "mảng đã sắp xếp" không?
2. Ba chi tiết của khuôn mẫu khoảng đóng, và của khoảng nửa mở?
3. Vì sao trộn `while (trai < phai)` với `phai = giua - 1` lại gây lỗi?
4. `viTriChen([1,3,5], 4)` trả về gì, và con số đó nghĩa là gì?
5. Cách nhận ra một bài thuộc dạng "nhị phân trên đáp án"?

## Tự viết lại

Không nhìn lại phần trên, viết hàm tìm **chỉ số đầu tiên** của một giá trị trong mảng có phần tử trùng:

```ts
dauTien([1, 2, 2, 2, 3], 2)   // → 1  (không phải 2 hay 3)
```

Tự kiểm: khi tìm thấy `target` ở giữa, bạn dừng lại hay tiếp tục thu hẹp về bên trái? Vì sao?

## Thử sức

Đề: *"Có `n` đống chuối, khỉ ăn `k` quả mỗi giờ, mỗi giờ chỉ ăn từ một đống. Tìm `k` nhỏ nhất để ăn hết trong `h` giờ."*

Hai câu để tự lần ra: vì sao đây là bài nhị phân trên đáp án, và hàm `khaThi(k)` của bạn kiểm chính xác điều gì? Sau đó: **biên trái và biên phải** của dải tìm kiếm nên đặt bằng bao nhiêu, và vì sao?
