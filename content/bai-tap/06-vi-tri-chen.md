---
title: Vị trí chèn trong mảng đã sắp xếp
slug: vi-tri-chen
do_kho: de
chu_de: [tim-kiem-nhi-phan, mang]
ham: viTriChen
bai_hoc: sap-xep-va-tim-kiem-nhi-phan
so_sanh: chinh-xac
---

Cho mảng `nums` **đã sắp xếp tăng dần** (không có phần tử trùng) và một giá trị `target`. Trả về chỉ số của `target` nếu nó có trong mảng; nếu không, trả về chỉ số mà nó **sẽ được chèn vào** để mảng vẫn sắp xếp.

Yêu cầu: `O(log n)`.

```
nums = [1, 3, 5, 6], target = 5   →  2   (đã có, ở chỉ số 2)
nums = [1, 3, 5, 6], target = 2   →  1   (chèn vào giữa 1 và 3)
nums = [1, 3, 5, 6], target = 7   →  4   (chèn vào cuối)
```

> Đây là bài để rèn viết tìm kiếm nhị phân **không lỗi lệch một**. Chọn một khuôn mẫu (khoảng đóng hay nửa mở) và giữ nhất quán cả ba chi tiết của nó.

```js starter
function viTriChen(nums, target) {
  // Viết lời giải ở đây
}
```

```py starter
def vi_tri_chen(nums, target):
    # Viết lời giải ở đây
    pass
```

```json test
[
  { "vao": [[1, 3, 5, 6], 5], "ra": 2 },
  { "vao": [[1, 3, 5, 6], 2], "ra": 1 },
  { "vao": [[1, 3, 5, 6], 7], "ra": 4, "mo_ta": "chèn vào cuối" },
  { "vao": [[1, 3, 5, 6], 0], "ra": 0, "mo_ta": "chèn vào đầu" },
  { "vao": [[], 5], "ra": 0, "mo_ta": "mảng rỗng" },
  { "vao": [[1], 1], "ra": 0, "mo_ta": "một phần tử, khớp" },
  { "vao": [[1], 0], "ra": 0, "mo_ta": "một phần tử, nhỏ hơn" },
  { "vao": [[-5, -2, 0, 3], -3], "ra": 1, "mo_ta": "có số âm" },
  { "vao": [[1, 3, 5, 6, 9, 12, 20, 33, 41], 34], "ra": 8, "an": true }
]
```

## Lời giải

Dùng khuôn mẫu **nửa mở** `[trai, phai)` — nó trả lời được cả hai câu hỏi (tìm thấy và vị trí chèn) bằng cùng một đoạn code.

```js
function viTriChen(nums, target) {
  let trai = 0
  let phai = nums.length // nửa mở: phai KHÔNG phải chỉ số hợp lệ

  while (trai < phai) {
    const giua = trai + Math.floor((phai - trai) / 2)
    // < chứ không phải <=: giữ lại giua làm ứng viên khi nums[giua] === target
    if (nums[giua] < target) trai = giua + 1
    else phai = giua
  }
  return trai
}
```

```py
def vi_tri_chen(nums, target):
    trai, phai = 0, len(nums)

    while trai < phai:
        giua = (trai + phai) // 2
        if nums[giua] < target:
            trai = giua + 1
        else:
            phai = giua
    return trai
```

Vì sao vòng lặp luôn kết thúc: mỗi lượt, khoảng `[trai, phai)` co lại ít nhất một đơn vị — nhánh trái đẩy `trai` vượt qua `giua`, nhánh phải kéo `phai` về đúng `giua` (mà `giua < phai` luôn đúng vì phép chia làm tròn xuống).

Khi thoát vòng lặp, `trai === phai`, và bất biến của thuật toán bảo đảm mọi phần tử bên trái đều `< target`, mọi phần tử từ đó trở đi đều `≥ target`. Đó đúng là định nghĩa của vị trí chèn — nên trả `trai` là xong, không cần xét riêng trường hợp "không tìm thấy".

`O(log n)` thời gian, `O(1)` bộ nhớ. Với `n = 10⁹` thì chỉ khoảng 30 bước.
