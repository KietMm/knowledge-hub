---
title: Duyệt đồ thị — BFS và DFS
slug: duyet-do-thi-bfs-va-dfs
summary: Chọn giữa BFS và DFS, biểu diễn đồ thị, mẫu lưới hai chiều, và cách tránh lặp vô hạn.
level: nang-cao
tags: [thuat-toan, do-thi, bfs, dfs, hang-doi]
---

> **Sau bài này bạn sẽ:** chọn đúng giữa BFS và DFS trong ba giây, và viết được mẫu duyệt lưới hai chiều — dạng đồ thị hay gặp nhất trong bài tập.

## Rất nhiều bài là bài đồ thị mà không nói ra

Đồ thị chỉ là "các thứ và mối nối giữa chúng". Đề bài thường không dùng chữ "đồ thị":

| Đề nói | Đỉnh | Cạnh |
|---|---|---|
| Lưới ô vuông, đảo và biển | Mỗi ô | Bốn ô kề |
| Các khoá học và môn tiên quyết | Môn học | Quan hệ tiên quyết |
| Bạn bè trên mạng xã hội | Người | Quan hệ bạn |
| Đổi một chữ để thành từ khác | Từ | Khác nhau đúng một chữ |
| Trạng thái trò chơi và nước đi | Trạng thái | Một nước đi |

Dòng cuối đáng nhớ: **trạng thái cũng là đỉnh**. Bài "ít nhất bao nhiêu bước để biến X thành Y" gần như luôn là BFS trên đồ thị trạng thái.

## Chọn cái nào

| | BFS (hàng đợi) | DFS (ngăn xếp / đệ quy) |
|---|---|---|
| Duyệt theo | Từng lớp, gần trước | Đi sâu một nhánh tới cùng |
| Dùng khi | **Đường đi ngắn nhất** (cạnh không trọng số) | Có tồn tại đường đi, liên thông, chu trình |
| Bộ nhớ | `O(chiều rộng)` | `O(chiều sâu)` |
| Cạm bẫy | Hàng đợi phình ở đồ thị rộng | Tràn ngăn xếp ở đồ thị sâu |

Quy tắc quyết định trong ba giây: **đề có chữ "ngắn nhất", "ít bước nhất", "gần nhất" ⇒ BFS.** Còn lại thường DFS vì viết ngắn hơn.

Lưu ý: BFS chỉ cho đường ngắn nhất khi mọi cạnh có **cùng trọng số**. Cạnh có trọng số khác nhau thì cần Dijkstra.

## Biểu diễn đồ thị

Danh sách kề là mặc định — gọn và duyệt hàng xóm nhanh:

```js
// Cạnh [[0,1],[0,2],[1,2]] -> Map: đỉnh -> danh sách hàng xóm
function dungDanhSachKe(soDinh, canh, coHuong = false) {
  const ke = new Map()
  for (let i = 0; i < soDinh; i += 1) ke.set(i, [])
  for (const [a, b] of canh) {
    ke.get(a).push(b)
    if (!coHuong) ke.get(b).push(a) // vô hướng: nối cả hai chiều
  }
  return ke
}
```

Quên dòng `if (!coHuong)` là lỗi im lặng: thuật toán chạy, nhưng nửa số cạnh biến mất.

## Hai khuôn mẫu

```js
function bfs(ke, batDau) {
  const daTham = new Set([batDau])
  const hangDoi = [batDau]
  const khoangCach = new Map([[batDau, 0]])

  // Chỉ số đầu thay cho shift(): shift() là O(n) nên vòng lặp thành O(n²).
  for (let dau = 0; dau < hangDoi.length; dau += 1) {
    const dinh = hangDoi[dau]
    for (const hangXom of ke.get(dinh) ?? []) {
      if (daTham.has(hangXom)) continue
      // Đánh dấu NGAY khi đưa vào hàng đợi, không phải lúc lấy ra — nếu không,
      // một đỉnh có thể vào hàng đợi nhiều lần và độ phức tạp hỏng.
      daTham.add(hangXom)
      khoangCach.set(hangXom, khoangCach.get(dinh) + 1)
      hangDoi.push(hangXom)
    }
  }
  return khoangCach
}

function dfs(ke, dinh, daTham = new Set()) {
  daTham.add(dinh)
  for (const hangXom of ke.get(dinh) ?? []) {
    if (!daTham.has(hangXom)) dfs(ke, hangXom, daTham)
  }
  return daTham
}
```

Hai chi tiết trong BFS là chỗ phân biệt code chạy được với code chạy đúng tốc độ: dùng chỉ số đầu thay cho `shift()`, và đánh dấu đã thăm lúc **đưa vào** hàng đợi.

## Mẫu lưới hai chiều

Dạng hay gặp nhất trong bài tập. Đếm số "đảo" trong lưới `1`/`0`:

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
    // Một câu điều kiện gộp cả biên lẫn ô nước — viết tách ra là mời gọi lỗi.
    if (r < 0 || r >= cao || c < 0 || c >= rong || luoi[r][c] !== 1) return
    luoi[r][c] = 0 // đánh dấu đã thăm bằng cách sửa luôn lưới
    for (const [dr, dc] of HUONG) nhanChim(r + dr, c + dc)
  }

  for (let r = 0; r < cao; r += 1) {
    for (let c = 0; c < rong; c += 1) {
      if (luoi[r][c] === 1) {
        dem += 1
        nhanChim(r, c) // xoá cả hòn đảo này rồi mới đi tiếp
      }
    }
  }
  return dem
}
```

Sửa thẳng vào lưới để đánh dấu là thủ thuật tiết kiệm `O(n×m)` bộ nhớ. Cái giá: **nó phá dữ liệu đầu vào**. Trong bài tập thì chấp nhận được; trong code thật thì phải sao chép lưới hoặc dùng tập `daTham` riêng — sửa dữ liệu của người gọi là tác dụng phụ không ai mong đợi.

Với lưới rất lớn, `nhanChim` đệ quy có thể tràn ngăn xếp; lúc đó viết lại bằng ngăn xếp tường minh hoặc dùng BFS.

## Lỗi hay gặp

| Lỗi | Hậu quả |
|---|---|
| Không đánh dấu đã thăm | Lặp vô hạn ở đồ thị có chu trình |
| Đánh dấu lúc lấy ra khỏi hàng đợi | Đỉnh vào hàng đợi nhiều lần, chậm hẳn |
| Dùng `shift()` làm hàng đợi | `O(n²)` thay vì `O(n)` |
| Quên cạnh chiều ngược ở đồ thị vô hướng | Mất nửa số cạnh, kết quả sai |
| Kiểm biên thiếu ở lưới | Đọc `undefined` rồi lỗi khó hiểu |
| Dùng DFS cho bài đường đi ngắn nhất | Ra một đường đi, nhưng không phải ngắn nhất |

## Ghi nhớ

- Nhiều bài là đồ thị mà đề không nói; trạng thái trò chơi cũng là đỉnh.
- "Ngắn nhất/ít bước nhất" ⇒ BFS. Còn lại thường DFS.
- BFS: hàng đợi bằng chỉ số đầu, đánh dấu lúc đưa vào.
- Lưới hai chiều là dạng đồ thị hay gặp nhất — thuộc mẫu bốn hướng và câu kiểm biên gộp.
- BFS chỉ đúng cho đường ngắn nhất khi các cạnh cùng trọng số.

## Tự kiểm tra

1. Vì sao đánh dấu đã thăm lúc lấy ra khỏi hàng đợi làm BFS chậm đi?
2. Đề: "ít nhất bao nhiêu lần đổi chữ để biến từ A thành từ B". Đỉnh là gì, cạnh là gì, dùng BFS hay DFS?
3. `demDao` sửa thẳng vào lưới đầu vào. Khi nào điều đó không chấp nhận được, và thay bằng gì?
