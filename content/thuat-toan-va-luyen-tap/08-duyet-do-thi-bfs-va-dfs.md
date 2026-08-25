---
title: Duyệt đồ thị — BFS và DFS
slug: duyet-do-thi-bfs-va-dfs
summary: Chọn giữa BFS và DFS, biểu diễn đồ thị, mẫu lưới hai chiều, và cách tránh lặp vô hạn.
level: nang-cao
tags: [thuat-toan, do-thi, bfs, dfs, hang-doi]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng giữa BFS và DFS trong ba giây, và viết được mẫu duyệt lưới hai chiều — dạng đồ thị hay gặp nhất trong bài tập.

## Ý tưởng chính

Đồ thị chỉ là "các thứ và mối nối giữa chúng". Rất nhiều bài là bài đồ thị mà đề **không hề dùng chữ đồ thị**.

Và khi đã nhận ra hình dạng đó, chỉ còn đúng một câu hỏi: **duyệt theo lớp hay đi sâu một nhánh?**

## Mental model

Hãy tưởng tượng **lửa lan trên một cánh đồng** so với **một người dò mê cung**.

> **BFS là lửa lan.** Từ điểm cháy, nó lan ra **mọi ô kề cùng lúc**, rồi lớp tiếp theo, rồi lớp tiếp theo. Ô nào cháy ở lớp thứ 5 thì cách điểm bắt đầu đúng 5 bước — **không thể gần hơn**.
>
> **DFS là người dò mê cung.** Chọn một lối, đi tới cùng, cụt thì quay lại ngã ba gần nhất và thử lối khác. Anh ta sẽ đi hết mê cung — nhưng đường anh ta tới một điểm **chưa chắc là đường ngắn nhất**.

Đó là lý do BFS cho đường ngắn nhất còn DFS thì không: lửa lan đều nên lớp thứ k **chính là** khoảng cách k.

## Ví dụ nhỏ

```text
Đồ thị:  A —— B —— D
         |
         C

BFS từ A:  A (lớp 0) → B, C (lớp 1) → D (lớp 2)     ⇒ khoảng cách A→D = 2
DFS từ A:  A → B → D → (quay lại) → C                ⇒ đi hết, nhưng không đo được gì
```

## Code chạy thế nào

```ts
// Cạnh [[0,1],[0,2]] → Map: đỉnh → danh sách hàng xóm
function dungDanhSachKe(soDinh, canh, coHuong = false) {
  const ke = new Map()
  for (let i = 0; i < soDinh; i += 1) ke.set(i, [])
  for (const [a, b] of canh) {
    ke.get(a).push(b)
    if (!coHuong) ke.get(b).push(a)     // vô hướng: nối CẢ HAI chiều
  }
  return ke
}
```

```ts
function bfs(ke, batDau) {
  const daTham = new Set([batDau])
  const hangDoi = [batDau]
  const khoangCach = new Map([[batDau, 0]])

  // Chỉ số đầu thay cho shift(): shift() là O(n) nên cả vòng sẽ thành O(n²).
  for (let dau = 0; dau < hangDoi.length; dau += 1) {
    const dinh = hangDoi[dau]
    for (const hangXom of ke.get(dinh) ?? []) {
      if (daTham.has(hangXom)) continue
      // Đánh dấu NGAY khi đưa vào hàng đợi, không phải lúc lấy ra — nếu không,
      // một đỉnh vào hàng đợi nhiều lần và độ phức tạp hỏng.
      daTham.add(hangXom)
      khoangCach.set(hangXom, khoangCach.get(dinh) + 1)
      hangDoi.push(hangXom)
    }
  }
  return khoangCach
}

function dfs(ke, dinh, daTham = new Set()) {
  daTham.add(dinh)
  for (const hangXom of ke.get(dinh) ?? [])
    if (!daTham.has(hangXom)) dfs(ke, hangXom, daTham)
  return daTham
}
```

Lần tay BFS trên đồ thị ở trên, chú ý **thời điểm đánh dấu**:

```text
hàngĐợi=[A]  đãThăm={A}
  xét A → hàng xóm B: chưa thăm → đánh dấu B, kc=1, đẩy vào
        → hàng xóm C: chưa thăm → đánh dấu C, kc=1, đẩy vào
hàngĐợi=[A,B,C]
  xét B → hàng xóm A: đã thăm, bỏ
        → hàng xóm D: chưa thăm → đánh dấu D, kc=2, đẩy vào
hàngĐợi=[A,B,C,D]
  xét C, D → không còn ai mới
⇒ khoảng cách: A=0, B=1, C=1, D=2
```

## Tại sao cần nó

Vì hình dạng đồ thị ẩn trong rất nhiều đề bài, và nhận ra nó là **toàn bộ phần khó**:

| Đề nói | Đỉnh | Cạnh |
|---|---|---|
| Lưới ô vuông, đảo và biển | Mỗi ô | Bốn ô kề |
| Các khoá học và môn tiên quyết | Môn học | Quan hệ tiên quyết |
| Bạn bè trên mạng xã hội | Người | Quan hệ bạn |
| Đổi một chữ để thành từ khác | Từ | Khác nhau đúng một chữ |
| Trạng thái trò chơi và nước đi | **Trạng thái** | Một nước đi |

Dòng cuối đáng nhớ nhất: **trạng thái cũng là đỉnh**. Bài *"ít nhất bao nhiêu bước để biến X thành Y"* gần như luôn là BFS trên đồ thị trạng thái — dù đề không có chữ "đồ thị" nào.

## So sánh

| | BFS (hàng đợi) | DFS (ngăn xếp / đệ quy) |
|---|---|---|
| Duyệt theo | Từng lớp, gần trước | Sâu một nhánh tới cùng |
| Dùng khi | **Đường đi ngắn nhất** (cạnh không trọng số) | Có tồn tại đường đi, liên thông, phát hiện chu trình |
| Bộ nhớ | `O(chiều rộng)` | `O(chiều sâu)` |
| Cạm bẫy | Hàng đợi phình ở đồ thị rộng | Tràn ngăn xếp ở đồ thị sâu |
| Viết | Dài hơn chút | Ngắn hơn (đệ quy) |

Quy tắc quyết định trong ba giây: **đề có chữ "ngắn nhất", "ít bước nhất", "gần nhất" ⇒ BFS.** Còn lại thường DFS vì viết ngắn hơn.

Một lưu ý quan trọng: BFS chỉ cho đường ngắn nhất khi mọi cạnh có **cùng trọng số**. Cạnh có trọng số khác nhau thì cần Dijkstra — và đó là bài khác.

## Dễ nhầm

**1. Không đánh dấu đã thăm.** Đồ thị có vòng ⇒ **lặp vô hạn**. Đây là khác biệt thực dụng nhất giữa cây và đồ thị: cây không có vòng nên không cần đánh dấu.

**2. Đánh dấu lúc lấy ra khỏi hàng đợi.** Một đỉnh có thể được đẩy vào nhiều lần trước khi tới lượt nó, và độ phức tạp hỏng. Luôn đánh dấu **lúc đưa vào**.

**3. Dùng `shift()` làm hàng đợi.** `O(n)` mỗi lần ⇒ cả BFS thành `O(n²)`. Dùng chỉ số đầu như trong code ở trên.

**4. Quên cạnh chiều ngược ở đồ thị vô hướng.** Thiếu `if (!coHuong)` là mất nửa số cạnh — thuật toán vẫn chạy, kết quả vẫn ra, chỉ là sai. Lỗi im lặng.

**5. Dùng DFS cho bài đường đi ngắn nhất.** Nó tìm ra *một* đường đi, và người ta rất dễ tưởng đó là đường ngắn nhất.

**6. Đệ quy trên lưới lớn.** Lưới 300×300 toàn ô đất có thể sâu 90.000 tầng — vượt giới hạn của cả JavaScript lẫn Python. Khi độ sâu không kiểm soát được, dùng ngăn xếp tường minh — cách nghĩ ở [[de-quy-va-quay-lui]].

## Mẹo nhớ

> **BFS là lửa lan (lớp thứ k = khoảng cách k). DFS là người dò mê cung.**
>
> **"Ngắn nhất" ⇒ BFS. Đánh dấu lúc ĐƯA VÀO hàng đợi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao BFS cho đường đi ngắn nhất còn DFS thì không?
2. Vì sao phải đánh dấu đã thăm lúc **đưa vào** hàng đợi, không phải lúc lấy ra?
3. Vì sao duyệt cây không cần đánh dấu đã thăm, còn đồ thị thì cần?
4. Đề: *"ít nhất bao nhiêu lần đổi chữ để biến từ A thành từ B"* — đỉnh là gì, cạnh là gì, dùng BFS hay DFS?
5. Khi nào BFS **không** cho đường đi ngắn nhất?

## Tự viết lại

Không nhìn lại phần trên, viết hàm đếm số **vùng đất liền** trong lưới `1`/`0` (nối theo bốn hướng):

```ts
demDao([[1,1,0],[0,1,0],[0,0,1]])   // → 2
```

Tự kiểm ba câu: bạn đánh dấu đã thăm bằng cách nào, câu kiểm biên viết gộp hay tách, và độ phức tạp là bao nhiêu — có phải `O((cao×rong)²)` không? Bài này có bản chấm được ở [[dem-dao]].

## Thử sức

Bài "khoá học": cho danh sách môn và môn tiên quyết của từng môn, in ra **một thứ tự học hợp lệ**.

Ba câu để tự lần ra: đồ thị này **có hướng hay vô hướng**? Nếu hai môn tiên quyết lẫn nhau thì chuyện gì xảy ra, và bạn **phát hiện** tình huống đó bằng cách nào trong lúc duyệt?
