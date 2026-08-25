---
title: Đoạn con có tổng lớn nhất
slug: tong-doan-lon-nhat
do_kho: trung-binh
chu_de: [quy-hoach-dong, mang]
ham: tongDoanLonNhat
bai_hoc: quy-hoach-dong
so_sanh: chinh-xac
---

Cho mảng số nguyên `nums` (có thể có số âm), tìm **tổng lớn nhất** của một đoạn con liên tiếp không rỗng.

```
[-2, 1, -3, 4, -1, 2, 1, -5, 4]  →  6    (đoạn [4, -1, 2, 1])
[1]                              →  1
[-3, -1, -2]                     →  -1   (buộc phải chọn ít nhất một phần tử)
```

**Ràng buộc:** `1 ≤ nums.length ≤ 10⁵`. Yêu cầu `O(n)`.

> Ca thứ ba là chỗ phần lớn lời giải sai: khởi tạo kết quả bằng `0` thì mảng toàn số âm sẽ cho ra `0` — một đoạn rỗng, mà đề không cho phép.

```js starter
function tongDoanLonNhat(nums) {
  // Viết lời giải ở đây
}
```

```py starter
def tong_doan_lon_nhat(nums):
    # Viết lời giải ở đây
    pass
```

```json test
[
  { "vao": [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], "ra": 6 },
  { "vao": [[1]], "ra": 1, "mo_ta": "một phần tử" },
  { "vao": [[-3, -1, -2]], "ra": -1, "mo_ta": "toàn số âm" },
  { "vao": [[5, 4, -1, 7, 8]], "ra": 23, "mo_ta": "gần như toàn dương" },
  { "vao": [[-1]], "ra": -1, "mo_ta": "một phần tử âm" },
  { "vao": [[-2, -1]], "ra": -1 },
  { "vao": [[8, -19, 5, -4, 20]], "ra": 21, "an": true }
]
```

## Lời giải

Thuật toán Kadane. Định nghĩa trạng thái phải có cụm **"kết thúc tại i"**:

```
dp[i] = tổng lớn nhất của đoạn con KẾT THÚC TẠI i
dp[i] = max(nums[i], dp[i-1] + nums[i])
đáp án = max(dp)
```

Truy hồi đọc thành một câu: ở vị trí `i`, hoặc tôi nối tiếp đoạn trước đó, hoặc tôi vứt nó đi và bắt đầu lại từ đây. Vứt đi có lợi đúng khi `dp[i-1]` âm — mang theo một tổng âm chỉ làm kết quả nhỏ đi.

```js
function tongDoanLonNhat(nums) {
  let tot = nums[0]
  let hienTai = nums[0] // KHÔNG khởi tạo bằng 0: mảng toàn âm sẽ cho ra 0 sai

  for (let i = 1; i < nums.length; i += 1) {
    hienTai = Math.max(nums[i], hienTai + nums[i])
    tot = Math.max(tot, hienTai)
  }
  return tot
}
```

```py
def tong_doan_lon_nhat(nums):
    tot = hien_tai = nums[0]

    for x in nums[1:]:
        hien_tai = max(x, hien_tai + x)
        tot = max(tot, hien_tai)
    return tot
```

Vì sao phải là hai biến chứ không phải một: `hienTai` là đoạn đang mở, `tot` là kỷ lục đã lập. Một đoạn tốt có thể xuất hiện ở giữa mảng rồi bị các số âm phía sau kéo xuống — không giữ `tot` riêng thì kỷ lục đó mất.

`O(n)` thời gian, `O(1)` bộ nhớ, một lượt duyệt. Đây là dạng nén của bảng `dp` — cùng ý tưởng với [[leo-cau-thang]], chỉ khác ở chỗ truy hồi có một phép `max` thay vì phép cộng.
