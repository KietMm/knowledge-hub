---
title: Gộp các khoảng chồng nhau
slug: gop-khoang
do_kho: trung-binh
chu_de: [mang, sap-xep]
ham: gopKhoang
so_sanh: chinh-xac
---

Cho danh sách các khoảng `[[bat_dau, ket_thuc], ...]`, gộp mọi khoảng chồng lấn và trả về danh sách khoảng không chồng nhau, **sắp xếp tăng dần theo điểm bắt đầu**.

Hai khoảng chạm nhau ở đúng một điểm cũng được coi là chồng: `[1,4]` và `[4,5]` gộp thành `[1,5]`.

```
[[1,3], [2,6], [8,10], [15,18]]  →  [[1,6], [8,10], [15,18]]
[[1,4], [4,5]]                   →  [[1,5]]
```

Đầu vào **không** bảo đảm đã sắp xếp.

> Bài này là ví dụ đẹp của "sắp xếp trước thì phần còn lại thành hiển nhiên". Chưa sắp xếp thì phải so mọi khoảng với mọi khoảng; sắp xếp rồi thì chỉ cần so với khoảng liền trước.

```js starter
function gopKhoang(khoang) {
  // Viết lời giải ở đây
}
```

```py starter
def gop_khoang(khoang):
    # Viết lời giải ở đây
    pass
```

```json test
[
  { "vao": [[[1, 3], [2, 6], [8, 10], [15, 18]]], "ra": [[1, 6], [8, 10], [15, 18]] },
  { "vao": [[[1, 4], [4, 5]]], "ra": [[1, 5]], "mo_ta": "chạm nhau một điểm" },
  { "vao": [[[1, 4], [2, 3]]], "ra": [[1, 4]], "mo_ta": "khoảng nằm trọn bên trong" },
  { "vao": [[[5, 6], [1, 3]]], "ra": [[1, 3], [5, 6]], "mo_ta": "đầu vào chưa sắp xếp" },
  { "vao": [[[1, 4]]], "ra": [[1, 4]], "mo_ta": "một khoảng" },
  { "vao": [[]], "ra": [], "mo_ta": "danh sách rỗng" },
  { "vao": [[[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]]], "ra": [[1, 10]], "an": true }
]
```

## Lời giải

```js
function gopKhoang(khoang) {
  if (khoang.length === 0) return []

  // Sao chép trước khi sắp xếp: sửa mảng của người gọi là tác dụng phụ không ai mong đợi.
  const daSap = [...khoang].sort((a, b) => a[0] - b[0])
  const ketQua = [daSap[0]]

  for (const [bat, ket] of daSap.slice(1)) {
    const cuoi = ketQua[ketQua.length - 1]
    if (bat <= cuoi[1]) {
      // Chồng nhau: nới mép phải. Phải lấy max — khoảng mới có thể nằm TRỌN bên trong.
      cuoi[1] = Math.max(cuoi[1], ket)
    } else {
      ketQua.push([bat, ket])
    }
  }
  return ketQua
}
```

Hai chỗ dễ sai:

1. **`Math.max` ở bước nới mép phải.** Gán thẳng `cuoi[1] = ket` thì `[[1,4], [2,3]]` cho ra `[1,3]` — khoảng bị co lại.
2. **`sort((a, b) => a[0] - b[0])`, không phải `sort()`.** `sort()` mặc định so sánh theo chuỗi, nên `[10, ...]` đứng trước `[9, ...]`.

Sắp xếp là `O(n log n)`, một lượt quét là `O(n)` ⇒ tổng `O(n log n)`, và đây là chặn dưới: không sắp xếp thì không biết khoảng nào kề khoảng nào.
