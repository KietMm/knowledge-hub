---
title: Sắp xếp và tìm kiếm nhị phân
slug: sap-xep-va-tim-kiem-nhi-phan
summary: Khi nào sắp xếp là bước mở đầu đúng, viết tìm kiếm nhị phân không lỗi lệch một, và mẫu "nhị phân trên đáp án".
level: trung-cap
tags: [thuat-toan, sap-xep, tim-kiem-nhi-phan, do-phuc-tap]
---

> **Sau bài này bạn sẽ:** viết được tìm kiếm nhị phân đúng ngay lần đầu, và nhận ra lớp bài giải bằng "nhị phân trên đáp án" — mẫu mạnh nhất mà tên gọi không gợi ra được.

## Sắp xếp như một bước mở đầu

Sắp xếp tốn `O(n log n)`. Rất nhiều bài trở nên đơn giản sau khi sắp xếp, và `n log n` vẫn rẻ hơn nhiều so với `O(n²)` của cách vét cạn.

Dấu hiệu nên sắp xếp trước:

- Bài nói về **cặp/bộ ba** thoả một điều kiện về giá trị.
- Bài về **khoảng** (gộp khoảng, giao khoảng, xếp lịch).
- Bài cần **`k` phần tử lớn nhất/nhỏ nhất** (tuy heap thường tốt hơn).
- Bài cần phát hiện **trùng lặp** mà không được dùng bộ nhớ phụ.

Dấu hiệu KHÔNG nên: đề đòi giữ nguyên **thứ tự gốc** hoặc trả về **chỉ số gốc** — lúc đó sắp xếp làm mất thông tin, trừ khi bạn sắp trên cặp `[giá trị, chỉ số]`.

Trong JavaScript có một bẫy phải nhớ: `sort()` không tham số so sánh theo **chuỗi**.

```js
[10, 9, 1].sort()                 // [1, 10, 9]  ← gần như không bao giờ là ý bạn
[10, 9, 1].sort((a, b) => a - b)  // [1, 9, 10]
```

## Tìm kiếm nhị phân không lỗi lệch một

Ý tưởng thì ai cũng biết; viết đúng mới là chuyện khác. Dùng một khuôn mẫu duy nhất và luôn viết đúng nó:

```js
function timKiemNhiPhan(nums, target) {
  let trai = 0
  let phai = nums.length - 1 // khoảng ĐÓNG [trai, phai]

  while (trai <= phai) {
    // Viết thế này thay vì (trai + phai) / 2 để không tràn số ở ngôn ngữ số nguyên
    // 32-bit; ở JS thì không tràn, nhưng giữ một thói quen đúng ở mọi ngôn ngữ.
    const giua = trai + Math.floor((phai - trai) / 2)

    if (nums[giua] === target) return giua
    if (nums[giua] < target) trai = giua + 1
    else phai = giua - 1
  }
  return -1
}
```

Ba chi tiết quyết định tính đúng, và chúng phải **nhất quán** với nhau:

1. `phai = nums.length - 1` (khoảng đóng) đi cùng `while (trai <= phai)` và `phai = giua - 1`.
2. Nếu dùng khoảng nửa mở `phai = nums.length`, thì phải là `while (trai < phai)` và `phai = giua`.
3. Luôn `+1`/`-1` khi đã loại `giua` — quên là vòng lặp vô hạn.

Trộn hai kiểu là nguyên nhân của gần như mọi lỗi tìm kiếm nhị phân. Chọn một, viết mãi kiểu đó.

**Biến thể hay cần hơn cả bản gốc:** tìm vị trí chèn (phần tử đầu tiên ≥ target).

```js
function viTriChen(nums, target) {
  let trai = 0
  let phai = nums.length // nửa mở [trai, phai)

  while (trai < phai) {
    const giua = trai + Math.floor((phai - trai) / 2)
    if (nums[giua] < target) trai = giua + 1
    else phai = giua
  }
  return trai // luôn nằm trong [0, nums.length]
}
```

Hàm này trả lời được nhiều câu hỏi hơn bản tìm-đúng-giá-trị: chèn vào đâu, có bao nhiêu phần tử nhỏ hơn `target`, biên trái/phải của một dãy giá trị bằng nhau.

## Nhị phân trên đáp án

Đây là mẫu đáng giá nhất trong bài này. Nhiều bài **không hề nhắc tới mảng đã sắp xếp**, nhưng vẫn giải được bằng tìm kiếm nhị phân — vì thứ được sắp xếp là **không gian đáp án**.

Điều kiện áp dụng: đáp án là một con số trong một khoảng biết trước, và có một hàm kiểm tra **đơn điệu** — nếu `x` khả thi thì mọi giá trị lớn hơn (hoặc nhỏ hơn) cũng khả thi.

```js
// "Chia mảng thành k đoạn sao cho tổng đoạn lớn nhất là nhỏ nhất"
function tongDoanNhoNhat(nums, k) {
  const chiaDuoc = (tran) => {
    // Với trần này, cần ít nhất bao nhiêu đoạn?
    let doan = 1
    let tong = 0
    for (const x of nums) {
      if (tong + x > tran) {
        doan += 1
        tong = 0
      }
      tong += x
    }
    return doan <= k
  }

  let trai = Math.max(...nums) // trần không thể nhỏ hơn phần tử lớn nhất
  let phai = nums.reduce((a, b) => a + b, 0) // trần lớn nhất cần thiết: gộp tất cả

  while (trai < phai) {
    const giua = trai + Math.floor((phai - trai) / 2)
    if (chiaDuoc(giua)) phai = giua // vẫn được ⇒ thử trần nhỏ hơn
    else trai = giua + 1
  }
  return trai
}
```

Nhận ra mẫu này qua cách đề được phát biểu: **"nhỏ nhất của lớn nhất"**, **"lớn nhất của nhỏ nhất"**, "tốc độ tối thiểu để hoàn thành trong `h` giờ", "số ngày ít nhất để…". Ba cách nói đó gần như luôn là nhị phân trên đáp án.

Cấu trúc lời giải luôn gồm hai phần: một hàm kiểm tra `khaThi(x)` viết theo cách tham lam, và một vòng nhị phân đi tìm `x` biên. Phần khó là viết `khaThi`, không phải phần nhị phân.

## Cái giá

| Thao tác | Chưa sắp xếp | Đã sắp xếp |
|---|---|---|
| Tìm một giá trị | `O(n)` | `O(log n)` |
| Tìm cặp có tổng cho trước | `O(n²)` | `O(n)` (hai con trỏ) |
| Tìm nhỏ nhất/lớn nhất | `O(n)` | `O(1)` |
| Chèn một phần tử | `O(1)` | `O(n)` |

Dòng cuối là lý do: nếu dữ liệu thay đổi liên tục, sắp xếp lại mỗi lần sẽ đắt hơn tất cả những gì bạn tiết kiệm được. Lúc đó cần cấu trúc giữ thứ tự sẵn (cây cân bằng, heap).

## Ghi nhớ

- `n log n` để sắp xếp thường là cái giá đáng trả để bỏ đi một vòng lặp lồng.
- Chọn một khuôn mẫu nhị phân (đóng hoặc nửa mở) và giữ nhất quán ba chi tiết của nó.
- `viTriChen` dùng được nhiều hơn bản tìm-đúng-giá-trị.
- "Nhỏ nhất của lớn nhất" ⇒ nghĩ ngay tới nhị phân trên đáp án.
- Trong JS, `sort()` không tham số là so sánh chuỗi.

## Tự kiểm tra

1. Vì sao trộn `while (trai < phai)` với `phai = giua - 1` gây lỗi?
2. `viTriChen([1, 3, 5], 4)` trả về gì, và con số đó nghĩa là gì?
3. Đề: "tốc độ ăn tối thiểu để ăn hết `n` đống chuối trong `h` giờ". Vì sao đây là nhị phân trên đáp án, và hàm `khaThi(x)` kiểm cái gì?
