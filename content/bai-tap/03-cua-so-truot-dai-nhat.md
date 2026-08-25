---
title: Chuỗi con không lặp dài nhất
slug: cua-so-truot-dai-nhat
do_kho: trung-binh
chu_de: [chuoi, cua-so-truot, bang-bam]
ham: doDaiKhongLap
bai_hoc: bang-bam
so_sanh: chinh-xac
---

Cho một chuỗi `s`, tìm **độ dài** của chuỗi con dài nhất không chứa ký tự lặp lại.

Chuỗi con phải **liên tiếp** — `"abc"` là chuỗi con của `"abcde"`, còn `"ace"` thì không.

```
"abcabcbb"  →  3   ("abc")
"bbbbb"     →  1   ("b")
"pwwkew"    →  3   ("wke", không phải "pwke" vì nó không liên tiếp)
```

**Ràng buộc:** `0 ≤ s.length ≤ 5·10⁴`.

> Cách vét cạn là thử mọi chuỗi con — `O(n²)` hoặc tệ hơn. Kỹ thuật đúng là **cửa sổ trượt**: giữ một cửa sổ luôn hợp lệ, mở rộng bên phải, và khi gặp ký tự trùng thì kéo mép trái lên.

```js starter
function doDaiKhongLap(s) {
  // Viết lời giải ở đây
}
```

```py starter
def do_dai_khong_lap(s):
    # Viết lời giải ở đây
    pass
```

```json test
[
  { "vao": ["abcabcbb"], "ra": 3 },
  { "vao": ["bbbbb"], "ra": 1 },
  { "vao": ["pwwkew"], "ra": 3 },
  { "vao": [""], "ra": 0, "mo_ta": "chuỗi rỗng" },
  { "vao": [" "], "ra": 1, "mo_ta": "một khoảng trắng" },
  { "vao": ["dvdf"], "ra": 3, "mo_ta": "mép trái không được lùi" },
  { "vao": ["abba"], "ra": 2, "mo_ta": "bẫy: mép trái phải tiến, không lùi" },
  { "vao": ["tmmzuxt"], "ra": 5, "an": true }
]
```

## Lời giải

Giữ hai chỉ số `trai` và `phai` làm hai mép cửa sổ, và một bảng ghi lần cuối mỗi ký tự xuất hiện ở đâu.

```js
function doDaiKhongLap(s) {
  const lanCuoi = new Map() // ký tự -> chỉ số gần nhất
  let trai = 0
  let daiNhat = 0

  for (let phai = 0; phai < s.length; phai += 1) {
    const c = s[phai]
    // Chỉ kéo mép trái khi ký tự trùng nằm TRONG cửa sổ hiện tại.
    if (lanCuoi.has(c) && lanCuoi.get(c) >= trai) {
      trai = lanCuoi.get(c) + 1
    }
    lanCuoi.set(c, phai)
    daiNhat = Math.max(daiNhat, phai - trai + 1)
  }
  return daiNhat
}
```

```py
def do_dai_khong_lap(s):
    lan_cuoi = {}  # ký tự -> chỉ số gần nhất
    trai = 0
    dai_nhat = 0

    for phai, c in enumerate(s):
        # Chỉ kéo mép trái khi ký tự trùng nằm TRONG cửa sổ hiện tại.
        if c in lan_cuoi and lan_cuoi[c] >= trai:
            trai = lan_cuoi[c] + 1
        lan_cuoi[c] = phai
        dai_nhat = max(dai_nhat, phai - trai + 1)
    return dai_nhat
```

Cả bài nằm ở điều kiện `lanCuoi.get(c) >= trai`. Bỏ nó đi thì `"abba"` cho kết quả sai: khi `phai` tới `'a'` cuối, bảng nói `'a'` từng ở chỉ số 0, và mép trái bị **kéo lùi** về 1 trong khi nó đã ở 2. Mép trái chỉ được tiến, không bao giờ lùi — đó là bất biến của kỹ thuật cửa sổ trượt.

`O(n)` thời gian: mỗi mép đi qua chuỗi đúng một lần. Bộ nhớ `O(k)` với `k` là số ký tự phân biệt.
