---
title: Đảo ngược chuỗi tại chỗ
slug: dao-nguoc-chuoi
do_kho: de
chu_de: [mang, hai-con-tro]
ham: daoNguoc
so_sanh: chinh-xac
---

Cho một mảng ký tự `s`, đảo ngược thứ tự các phần tử và trả về chính mảng đó.

Yêu cầu: dùng bộ nhớ phụ `O(1)` — nghĩa là **không** tạo mảng mới, phải hoán đổi ngay trên mảng đầu vào.

```
["h", "e", "l", "l", "o"]  →  ["o", "l", "l", "e", "h"]
```

> Đây là bài để làm quen với kỹ thuật **hai con trỏ**: một chạy từ đầu, một chạy từ cuối, gặp nhau ở giữa. `s.reverse()` giải xong trong một dòng nhưng bạn sẽ không học được gì — hãy viết vòng lặp.

```js starter
function daoNguoc(s) {
  // Hoán đổi tại chỗ rồi trả về s
}
```

```py starter
def dao_nguoc(s):
    # Hoán đổi tại chỗ rồi trả về s
    pass
```

```json test
[
  { "vao": [["h", "e", "l", "l", "o"]], "ra": ["o", "l", "l", "e", "h"] },
  { "vao": [["H", "a", "n", "n", "a", "h"]], "ra": ["h", "a", "n", "n", "a", "H"] },
  { "vao": [["a"]], "ra": ["a"], "mo_ta": "một phần tử" },
  { "vao": [[]], "ra": [], "mo_ta": "mảng rỗng" },
  { "vao": [["a", "b"]], "ra": ["b", "a"], "mo_ta": "số chẵn phần tử" },
  { "vao": [["1", "2", "3"]], "ra": ["3", "2", "1"], "mo_ta": "số lẻ phần tử" }
]
```

## Lời giải

```js
function daoNguoc(s) {
  let trai = 0
  let phai = s.length - 1

  while (trai < phai) {
    ;[s[trai], s[phai]] = [s[phai], s[trai]]
    trai += 1
    phai -= 1
  }
  return s
}
```

```py
def dao_nguoc(s):
    trai, phai = 0, len(s) - 1

    while trai < phai:
        s[trai], s[phai] = s[phai], s[trai]
        trai += 1
        phai -= 1
    return s
```

Điều kiện dừng là `trai < phai`, không phải `trai <= phai`. Với số lẻ phần tử, phần tử giữa không cần đổi chỗ với chính nó; viết `<=` thì nó vẫn chạy đúng nhưng thừa một lượt.

Vòng lặp chạy `n/2` lần ⇒ `O(n)` thời gian, `O(1)` bộ nhớ. Không có cách nào nhanh hơn: muốn đảo thì phải chạm vào mọi phần tử ít nhất một lần.

Hai con trỏ chạy ngược chiều là mẫu dùng lại được cho: kiểm tra chuỗi đối xứng, tìm cặp có tổng cho trước trong **mảng đã sắp xếp**, và bài chứa nước.
