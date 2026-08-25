---
title: Sinh mọi tập con
slug: sinh-tap-con
do_kho: trung-binh
chu_de: [quay-lui, de-quy, mang]
ham: tapCon
bai_hoc: de-quy-va-quay-lui
so_sanh: tap-hop
---

Cho mảng `nums` gồm các số **phân biệt**, trả về **mọi tập con** của nó (tập lũy thừa).

Thứ tự các tập con và thứ tự phần tử trong mỗi tập **không quan trọng** — bộ chấm so sánh theo tập hợp.

```
[1, 2, 3]  →  [[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]
[]         →  [[]]
```

**Ràng buộc:** `0 ≤ nums.length ≤ 10`.

> Ràng buộc `n ≤ 10` nói thẳng rằng lời giải mũ là chấp nhận được — có `2ⁿ` tập con nên không thể nhanh hơn. Đừng cố tối ưu; hãy viết cho đúng và sạch.

```js starter
function tapCon(nums) {
  // Viết lời giải ở đây
}
```

```py starter
def tap_con(nums):
    # Viết lời giải ở đây
    pass
```

```json test
[
  { "vao": [[1, 2, 3]], "ra": [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]] },
  { "vao": [[]], "ra": [[]], "mo_ta": "mảng rỗng có đúng một tập con" },
  { "vao": [[0]], "ra": [[], [0]], "mo_ta": "một phần tử" },
  { "vao": [[1, 2]], "ra": [[], [1], [2], [1, 2]] },
  { "vao": [[9, 0, 3, 5, 7]], "ra": [[], [9], [0], [3], [5], [7], [9, 0], [9, 3], [9, 5], [9, 7], [0, 3], [0, 5], [0, 7], [3, 5], [3, 7], [5, 7], [9, 0, 3], [9, 0, 5], [9, 0, 7], [9, 3, 5], [9, 3, 7], [9, 5, 7], [0, 3, 5], [0, 3, 7], [0, 5, 7], [3, 5, 7], [9, 0, 3, 5], [9, 0, 3, 7], [9, 0, 5, 7], [9, 3, 5, 7], [0, 3, 5, 7], [9, 0, 3, 5, 7]], "an": true }
]
```

## Lời giải

Khuôn mẫu quay lui: ở mỗi phần tử có đúng hai lựa chọn — lấy hoặc không lấy.

```js
function tapCon(nums) {
  const ketQua = []
  const hienTai = []

  function lui(batDau) {
    // Ghi nhận ở MỌI nút, không chỉ ở lá: mỗi trạng thái của `hienTai` là một tập con.
    ketQua.push([...hienTai]) // sao chép — nếu không, mọi phần tử trỏ chung một mảng

    for (let i = batDau; i < nums.length; i += 1) {
      hienTai.push(nums[i]) // chọn
      lui(i + 1) // đi tiếp, chỉ xét các phần tử PHÍA SAU
      hienTai.pop() // bỏ chọn
    }
  }

  lui(0)
  return ketQua
}
```

```py
def tap_con(nums):
    ket_qua = []
    hien_tai = []

    def lui(bat_dau):
        ket_qua.append(list(hien_tai))  # list(...) là bản sao, giống [...hienTai]

        for i in range(bat_dau, len(nums)):
            hien_tai.append(nums[i])
            lui(i + 1)
            hien_tai.pop()

    lui(0)
    return ket_qua
```

Hai chi tiết quyết định tính đúng:

**`lui(i + 1)` chứ không phải `lui(batDau + 1)`.** Tham số `batDau` giữ cho mỗi phần tử chỉ được xét một lần ở mỗi nhánh — nhờ vậy `[1,2]` và `[2,1]` không cùng xuất hiện. Viết `batDau + 1` sẽ sinh ra tập con lặp.

**Ghi nhận ở mọi nút.** Khác bài sinh hoán vị (chỉ ghi ở lá khi đã đủ độ dài), mọi trạng thái trung gian ở đây đều là một tập con hợp lệ.

Có `2ⁿ` tập con, mỗi cái tốn `O(n)` để sao chép ⇒ `O(n · 2ⁿ)`. Với `n = 10` là khoảng 10.000 thao tác — tức thì.

Cách thứ hai, không đệ quy, đáng biết vì nó ngắn đến bất ngờ: mỗi số từ `0` tới `2ⁿ - 1` là một mặt nạ bit, bit thứ `i` bật nghĩa là lấy `nums[i]`.
