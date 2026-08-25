---
title: Hai tổng
slug: hai-tong
do_kho: de
chu_de: [mang, bang-bam]
ham: haiTong
bai_hoc: bang-bam
so_sanh: chinh-xac
---

Cho mảng số nguyên `nums` và một số `target`. Trả về **chỉ số của hai phần tử** có tổng bằng `target`.

Mỗi bộ dữ liệu bảo đảm có đúng một đáp án, và không được dùng cùng một phần tử hai lần. Trả về mảng hai chỉ số theo thứ tự tăng dần.

```
nums = [2, 7, 11, 15], target = 9   →  [0, 1]   (vì nums[0] + nums[1] = 9)
nums = [3, 2, 4],      target = 6   →  [1, 2]
```

**Ràng buộc:** `2 ≤ nums.length ≤ 10⁴`, mảng có thể chứa số âm.

> Cách hiển nhiên là hai vòng lặp lồng nhau — `O(n²)`. Nộp thử cách đó trước cho quen bộ chấm, rồi tìm cách `O(n)`. Gợi ý: khi đang đứng ở phần tử `x`, bạn cần biết *đã từng gặp* `target - x` chưa.

```js starter
function haiTong(nums, target) {
  // Viết lời giải ở đây
}
```

```py starter
def hai_tong(nums, target):
    # Viết lời giải ở đây
    pass
```

```json test
[
  { "vao": [[2, 7, 11, 15], 9], "ra": [0, 1] },
  { "vao": [[3, 2, 4], 6], "ra": [1, 2] },
  { "vao": [[3, 3], 6], "ra": [0, 1] },
  { "vao": [[-1, -2, -3, -4, -5], -8], "ra": [2, 4] },
  { "vao": [[0, 4, 3, 0], 0], "ra": [0, 3] },
  { "vao": [[1, 5, 9, 13, 17, 21], 34], "ra": [3, 5], "mo_ta": "mảng dài hơn" },
  { "vao": [[2, 1, 9, 4, 4, 56, 90, 3], 8], "ra": [3, 4], "an": true }
]
```

## Lời giải

Ý tưởng: đổi câu hỏi "có cặp nào cộng lại bằng target không" thành "số bù của phần tử này đã từng xuất hiện chưa". Câu hỏi thứ hai là một phép **tra cứu**, và tra cứu là việc của bảng băm.

```js
function haiTong(nums, target) {
  const daGap = new Map() // giá trị -> chỉ số

  for (let i = 0; i < nums.length; i += 1) {
    const bu = target - nums[i]
    if (daGap.has(bu)) return [daGap.get(bu), i]
    daGap.set(nums[i], i)
  }
  return []
}
```

Điểm tinh tế: **tra cứu trước rồi mới ghi vào bảng**. Làm ngược lại thì với `nums = [3, 3]` và `target = 6`, phần tử đầu sẽ tự khớp với chính nó.

Vì luôn tra trước khi ghi, chỉ số tìm được luôn nhỏ hơn `i` — nên `[daGap.get(bu), i]` đã tăng dần sẵn, không cần sắp xếp.

Cùng ý tưởng bằng Python — `enumerate` cho cả chỉ số lẫn giá trị, nên không cần `range(len(...))`:

```py
def hai_tong(nums, target):
    da_gap = {}  # giá trị -> chỉ số

    for i, x in enumerate(nums):
        bu = target - x
        if bu in da_gap:
            return [da_gap[bu], i]
        da_gap[x] = i
    return []
```

| | Hai vòng lặp | Bảng băm |
|---|---|---|
| Thời gian | `O(n²)` | `O(n)` |
| Bộ nhớ | `O(1)` | `O(n)` |

Với `n = 10⁴`, hai vòng lặp là 100 triệu phép so sánh; bảng băm là 10 nghìn. Đây chính là đánh đổi bộ nhớ lấy thời gian nói ở [[danh-doi-bo-nho-va-thoi-gian]].
