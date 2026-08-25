---
title: Ngoặc cân đối
slug: kiem-tra-ngoac-can-doi
do_kho: de
chu_de: [ngan-xep, chuoi]
ham: ngoacCanDoi
bai_hoc: ngan-xep-hang-doi-cay-do-thi
so_sanh: chinh-xac
---

Cho chuỗi `s` chỉ gồm các ký tự `()[]{}`, kiểm tra chuỗi có cân đối không.

Cân đối nghĩa là: mỗi ngoặc mở được đóng bằng đúng loại ngoặc của nó, và đóng theo **đúng thứ tự lồng nhau**.

```
"()"        →  true
"()[]{}"    →  true
"(]"        →  false   (sai loại)
"([)]"      →  false   (sai thứ tự lồng)
"{[]}"      →  true
```

> Đây là bài tập kinh điển của ngăn xếp, và cũng chính là cách trình biên dịch kiểm tra dấu ngoặc trong code của bạn.

```js starter
function ngoacCanDoi(s) {
  // Viết lời giải ở đây
}
```

```py starter
def ngoac_can_doi(s):
    # Viết lời giải ở đây
    pass
```

```json test
[
  { "vao": ["()"], "ra": true },
  { "vao": ["()[]{}"], "ra": true },
  { "vao": ["(]"], "ra": false },
  { "vao": ["([)]"], "ra": false, "mo_ta": "sai thứ tự lồng" },
  { "vao": ["{[]}"], "ra": true },
  { "vao": [""], "ra": true, "mo_ta": "chuỗi rỗng là cân đối" },
  { "vao": ["("], "ra": false, "mo_ta": "mở mà không đóng" },
  { "vao": [")"], "ra": false, "mo_ta": "đóng mà chưa mở" },
  { "vao": ["(((((((((())))))))))"], "ra": true, "an": true },
  { "vao": ["{[(])}"], "ra": false, "an": true }
]
```

## Lời giải

```js
const CAP = { ')': '(', ']': '[', '}': '{' }

function ngoacCanDoi(s) {
  const ngan = []

  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') {
      ngan.push(c)
    } else {
      // Đóng mà ngăn xếp rỗng, hoặc cái trên cùng không phải bạn của nó ⇒ hỏng ngay.
      if (ngan.pop() !== CAP[c]) return false
    }
  }
  // Còn ngoặc chưa đóng thì cũng không cân đối — đây là dòng hay bị quên nhất.
  return ngan.length === 0
}
```

```py
CAP = {")": "(", "]": "[", "}": "{"}

def ngoac_can_doi(s):
    ngan = []

    for c in s:
        if c in "([{":
            ngan.append(c)
        elif not ngan or ngan.pop() != CAP[c]:
            return False
    return not ngan
```

Bản Python phải kiểm `not ngan` TRƯỚC khi `pop()`: khác JavaScript, `pop()` trên list rỗng ném `IndexError` chứ không trả về `None`.

Ba trường hợp sai và ba chỗ bắt chúng:

| Sai kiểu | Ví dụ | Bắt ở đâu |
|---|---|---|
| Đóng khi chưa mở | `")"` | `ngan.pop()` ra `undefined` ≠ `'('` |
| Đóng nhầm loại | `"(]"` | `pop()` ra `'('` ≠ `CAP[']']` |
| Mở mà không đóng | `"("` | `ngan.length === 0` ở cuối |

`O(n)` thời gian, `O(n)` bộ nhớ cho ngăn xếp — trường hợp xấu nhất là chuỗi toàn ngoặc mở.

Vì sao phải là ngăn xếp chứ không phải bộ đếm: chỉ đếm số ngoặc mở/đóng thì `"([)]"` vẫn cân bằng về số lượng. Cái cần nhớ là **thứ tự**, và "lấy ra cái vào sau cùng" chính là định nghĩa của ngăn xếp — xem [[ngan-xep-hang-doi-cay-do-thi]].
