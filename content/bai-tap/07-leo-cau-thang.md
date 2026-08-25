---
title: Leo cầu thang
slug: leo-cau-thang
do_kho: de
chu_de: [quy-hoach-dong, de-quy]
ham: leoCauThang
bai_hoc: quy-hoach-dong
so_sanh: chinh-xac
---

Bạn đang ở chân một cầu thang có `n` bậc. Mỗi bước leo được **1 hoặc 2 bậc**. Có bao nhiêu cách khác nhau để lên tới đỉnh?

```
n = 2  →  2   (1+1, hoặc 2)
n = 3  →  3   (1+1+1, 1+2, 2+1)
n = 5  →  8
```

**Ràng buộc:** `1 ≤ n ≤ 45`.

> Ràng buộc `n ≤ 45` là một gợi ý: đáp án lớn dần rất nhanh (đây là dãy Fibonacci), và đệ quy thuần sẽ mất vài giây ở `n = 45`. Hãy tìm cách không tính lại.

```js starter
function leoCauThang(n) {
  // Viết lời giải ở đây
}
```

```py starter
def leo_cau_thang(n):
    # Viết lời giải ở đây
    pass
```

```json test
[
  { "vao": [1], "ra": 1 },
  { "vao": [2], "ra": 2 },
  { "vao": [3], "ra": 3 },
  { "vao": [5], "ra": 8 },
  { "vao": [10], "ra": 89 },
  { "vao": [30], "ra": 1346269, "mo_ta": "đệ quy thuần bắt đầu chậm ở đây" },
  { "vao": [45], "ra": 1836311903, "an": true }
]
```

## Lời giải

Câu hỏi sinh ra lời giải: **ở bước cuối cùng, tôi có những lựa chọn nào?** Đúng hai — từ bậc `n-1` leo 1 bậc, hoặc từ bậc `n-2` leo 2 bậc. Hai nhóm cách này không giao nhau và phủ hết mọi khả năng, nên:

```
dp[n] = dp[n-1] + dp[n-2],  dp[1] = 1, dp[2] = 2
```

Chỉ cần hai giá trị gần nhất nên không cần bảng — `O(1)` bộ nhớ:

```js
function leoCauThang(n) {
  if (n <= 2) return n

  let truoc = 1 // dp[1]
  let hienTai = 2 // dp[2]
  for (let i = 3; i <= n; i += 1) {
    ;[truoc, hienTai] = [hienTai, truoc + hienTai]
  }
  return hienTai
}
```

```py
def leo_cau_thang(n):
    if n <= 2:
        return n

    truoc, hien_tai = 1, 2
    for _ in range(3, n + 1):
        truoc, hien_tai = hien_tai, truoc + hien_tai
    return hien_tai
```

| Cách | Thời gian | Bộ nhớ | `n = 45` |
|---|---|---|---|
| Đệ quy thuần | `O(2ⁿ)` | `O(n)` ngăn xếp | vài giây |
| Đệ quy + ghi nhớ | `O(n)` | `O(n)` | tức thì |
| Lặp, hai biến | `O(n)` | `O(1)` | tức thì |

Đây là bài quy hoạch động đơn giản nhất, và nó đáng làm kỹ vì cả ba bước — định nghĩa trạng thái, tìm truy hồi, nén bộ nhớ — đều hiện ra rõ ràng ở quy mô nhỏ. Bài tiếp theo cùng khuôn mẫu là [[tong-doan-lon-nhat]].
