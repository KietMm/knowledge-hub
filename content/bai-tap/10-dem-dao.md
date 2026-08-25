---
title: Đếm số hòn đảo
slug: dem-dao
do_kho: kho
chu_de: [do-thi, dfs, mang]
ham: demDao
bai_hoc: duyet-do-thi-bfs-va-dfs
so_sanh: chinh-xac
---

Cho lưới hai chiều gồm `1` (đất) và `0` (nước), đếm số **hòn đảo**.

Một hòn đảo là nhóm ô đất nối nhau theo **bốn hướng** (trên, dưới, trái, phải — không tính chéo). Rìa lưới coi như bao quanh bởi nước.

```
[[1,1,0,0],        [[1,1,0,0],
 [1,1,0,0],   → 1   [0,0,1,0],   → 3
 [0,0,1,0]]         [0,0,0,1]]
```

**Ràng buộc:** lưới tối đa 300×300.

> Đây là bài đồ thị mà đề không dùng chữ "đồ thị": mỗi ô là một đỉnh, mỗi cặp ô kề nhau là một cạnh. Đếm số hòn đảo chính là đếm số **thành phần liên thông**.

```js starter
function demDao(luoi) {
  // Viết lời giải ở đây
}
```

```py starter
def dem_dao(luoi):
    # Viết lời giải ở đây
    pass
```

```json test
[
  { "vao": [[[1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 1, 0]]], "ra": 2 },
  { "vao": [[[1, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]], "ra": 3 },
  { "vao": [[[0, 0], [0, 0]]], "ra": 0, "mo_ta": "toàn nước" },
  { "vao": [[[1, 1], [1, 1]]], "ra": 1, "mo_ta": "một đảo phủ kín" },
  { "vao": [[]], "ra": 0, "mo_ta": "lưới rỗng" },
  { "vao": [[[1]]], "ra": 1, "mo_ta": "một ô đất" },
  { "vao": [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]], "ra": 5, "mo_ta": "chéo KHÔNG tính là nối" },
  { "vao": [[[1, 1, 1, 1, 0], [1, 1, 0, 1, 0], [1, 1, 0, 0, 0], [0, 0, 0, 0, 1]]], "ra": 2, "an": true }
]
```

## Lời giải

Quét cả lưới. Gặp một ô đất chưa thăm thì tăng bộ đếm lên một, rồi **nhấn chìm cả hòn đảo đó** bằng DFS để nó không bị đếm lại.

```js
const HUONG = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

function demDao(luoi) {
  if (luoi.length === 0) return 0
  const cao = luoi.length
  const rong = luoi[0].length
  let dem = 0

  function nhanChim(r, c) {
    // Gộp kiểm biên và kiểm ô nước vào một câu: tách ra là mời gọi lỗi thiếu nhánh.
    if (r < 0 || r >= cao || c < 0 || c >= rong || luoi[r][c] !== 1) return
    luoi[r][c] = 0 // đánh dấu đã thăm ngay trên lưới
    for (const [dr, dc] of HUONG) nhanChim(r + dr, c + dc)
  }

  for (let r = 0; r < cao; r += 1) {
    for (let c = 0; c < rong; c += 1) {
      if (luoi[r][c] === 1) {
        dem += 1
        nhanChim(r, c)
      }
    }
  }
  return dem
}
```

```py
HUONG = ((-1, 0), (1, 0), (0, -1), (0, 1))

def dem_dao(luoi):
    if not luoi:
        return 0
    cao, rong = len(luoi), len(luoi[0])
    dem = 0

    def nhan_chim(r, c):
        # Lưới 300x300 có thể sâu tới 90.000 tầng đệ quy — vượt giới hạn mặc định của
        # Python. Dùng ngăn xếp tường minh thay vì đệ quy.
        ngan = [(r, c)]
        while ngan:
            y, x = ngan.pop()
            if y < 0 or y >= cao or x < 0 or x >= rong or luoi[y][x] != 1:
                continue
            luoi[y][x] = 0
            for dy, dx in HUONG:
                ngan.append((y + dy, x + dx))

    for r in range(cao):
        for c in range(rong):
            if luoi[r][c] == 1:
                dem += 1
                nhan_chim(r, c)
    return dem
```

Ba điểm đáng chú ý:

**Đánh dấu bằng cách sửa thẳng lưới** tiết kiệm `O(cao × rong)` bộ nhớ cho tập `daTham`. Cái giá là **phá dữ liệu đầu vào** — chấp nhận được ở bài tập, nhưng trong code thật phải sao chép lưới hoặc dùng tập riêng.

**Bản Python dùng ngăn xếp tường minh.** Giới hạn đệ quy mặc định của Python là 1000; một hòn đảo phủ kín lưới 300×300 sẽ vượt xa. JavaScript chịu được sâu hơn nhưng cũng có giới hạn — với lưới lớn hơn nữa thì bản JS cũng nên đổi sang ngăn xếp.

**Độ phức tạp `O(cao × rong)`.** Mỗi ô được thăm nhiều nhất hai lần: một lần bởi vòng quét ngoài, một lần bởi `nhanChim`. Vòng lặp lồng nhau ở đây *không* làm nó thành bậc hai — nhìn tổng số lần chạm vào ô, không nhìn số vòng lặp.

Đổi DFS thành BFS (hàng đợi thay ngăn xếp) cho cùng kết quả: bài này chỉ hỏi *có nối nhau không*, không hỏi khoảng cách — nên cách duyệt không quan trọng.
