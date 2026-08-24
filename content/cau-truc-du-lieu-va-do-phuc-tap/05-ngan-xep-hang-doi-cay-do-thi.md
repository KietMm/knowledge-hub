---
title: Ngăn xếp, hàng đợi, cây, đồ thị — dùng khi nào
slug: ngan-xep-hang-doi-cay-do-thi
summary: Bốn cấu trúc còn lại, nhận diện qua bài toán chứ không qua định nghĩa. Và chỗ chúng đã nằm sẵn trong công việc hằng ngày của bạn.
level: trung-cap
tags: [nen-tang, cau-truc-du-lieu, cay, do-thi, hang-doi]
---

> **Sau bài này bạn sẽ:** nhận ra bài toán nào thuộc về ngăn xếp, hàng đợi, cây hay đồ thị, và thấy chúng đã có mặt ở đâu trong hệ thống bạn đang làm.

## Ngăn xếp — vào sau, ra trước

Chỉ hai phép: thêm vào **đỉnh**, lấy ra từ **đỉnh**.

```ts
const nganXep: string[] = []
nganXep.push('a')       // thêm đỉnh
nganXep.push('b')
nganXep.pop()           // 'b' — cái mới nhất ra trước
```

```python
ngan_xep = []
ngan_xep.append('a')
ngan_xep.pop()
```

Không cần class riêng — mảng có sẵn `push`/`pop` và cả hai đều `O(1)`.

**Nhận diện:** bài toán có chữ *"gần đây nhất"*, *"quay lui"*, *"lồng nhau"*.

Chỗ nó đã nằm sẵn quanh bạn:

| Nơi | Ngăn xếp giữ gì |
|---|---|
| Ngăn xếp lời gọi hàm | Hàm nào gọi hàm nào — chính là stack trace bạn đọc khi có lỗi |
| Ctrl+Z | Các thao tác đã làm, hoàn tác cái mới nhất trước |
| Nút Back của trình duyệt | Các trang đã qua |
| Kiểm tra ngoặc cân bằng | Ngoặc mở đang chờ đóng |
| Duyệt cây theo chiều sâu | Các nhánh còn phải quay lại |

Dòng đầu giải thích luôn chuyện tràn ngăn xếp trong [[de-quy-va-cach-nghi-ve-no]]: mỗi lời gọi đẩy một khung lên, không `pop` ra thì đầy.

## Hàng đợi — vào trước, ra trước

Thêm ở **cuối**, lấy ở **đầu**.

```python
from collections import deque
hang = deque()
hang.append('a')      # vào cuối
hang.popleft()        # 'a' — cái vào đầu tiên ra trước, O(1)
```

```ts
// ⚠️ JS không có hàng đợi dựng sẵn. shift() là O(n) — bẫy hiệu năng.
const hang: string[] = []
hang.push('a')
hang.shift()          // O(n): dịch cả mảng!

// ✅ Với hàng đợi lớn: giữ chỉ số đầu thay vì dịch mảng
class HangDoi<T> {
  private items: T[] = []
  private dau = 0
  vao(x: T) { this.items.push(x) }
  ra(): T | undefined {
    if (this.dau >= this.items.length) return undefined
    return this.items[this.dau++]        // O(1)
  }
}
```

**Nhận diện:** *"ai tới trước phục vụ trước"*, *"xử lý lần lượt"*, *"theo lớp"*.

Chỗ nó đã nằm sẵn: hàng đợi tác vụ nền, hàng đợi tin nhắn, hàng đợi in, giới hạn tần suất, và duyệt cây theo **chiều rộng**. Ở quy mô hệ thống, đây đúng là thứ [[hang-doi-va-xu-ly-bat-dong-bo]] nói tới — cùng một khái niệm, đặt giữa các máy chủ thay vì trong bộ nhớ.

**Hàng đợi ưu tiên (heap)** là biến thể: lấy ra không theo thứ tự vào mà theo **độ ưu tiên cao nhất**, tốn `O(log n)`. Dùng khi có việc gấp phải chen lên trước — lịch chạy tác vụ, tìm đường đi ngắn nhất.

## Cây — dữ liệu có cha con

Mỗi nút có một cha và nhiều con, không có vòng.

```ts
type Nut = { ten: string; con: Nut[] }

// Duyệt sâu (DFS) — dùng ngăn xếp, hoặc đệ quy cho gọn
function duyetSau(n: Nut, tham: (x: Nut) => void) {
  tham(n)
  n.con.forEach((c) => duyetSau(c, tham))
}

// Duyệt rộng (BFS) — dùng hàng đợi, đi theo từng tầng
function duyetRong(goc: Nut, tham: (x: Nut) => void) {
  const hang = [goc]
  while (hang.length) {
    const n = hang.shift()!
    tham(n)
    hang.push(...n.con)
  }
}
```

Điểm đáng nhớ: **DFS dùng ngăn xếp, BFS dùng hàng đợi.** Đổi một cấu trúc là đổi hẳn thứ tự duyệt. Chọn cái nào:

- **BFS** khi cần *"đường ngắn nhất"* hoặc *"gần gốc nhất"* — nó tìm theo tầng nên chạm cái gần trước.
- **DFS** khi cần đi tới tận cùng — kiểm tra tồn tại, tính tổng, tuần tự hoá.

Chỗ cây đã nằm sẵn: cây thư mục, DOM, JSON lồng nhau, danh mục nhiều cấp, sơ đồ tổ chức, cây phân tích cú pháp.

**Cây tìm kiếm có thứ tự** là loại cây đặc biệt quan trọng: nó giữ dữ liệu **luôn sắp xếp** nên làm được hai việc bảng băm chịu thua — duyệt theo thứ tự và **tra theo khoảng** — với chi phí `O(log n)`. Đây đúng là B-tree mà index của database dùng, xem [[index-trong-postgresql]].

| | Bảng băm | Cây có thứ tự |
|---|---|---|
| Tra bằng chính xác | `O(1)` ✅ nhanh hơn | `O(log n)` |
| Tra theo khoảng | ❌ không làm được | `O(log n)` ✅ |
| Lấy theo thứ tự | ❌ | ✅ |
| Nhỏ nhất / lớn nhất | ❌ phải quét | `O(log n)` ✅ |

## Đồ thị — quan hệ nhiều-nhiều, có thể có vòng

Cây là đồ thị có luật. Đồ thị bỏ luật đi: một nút nối tới nút nào cũng được, kể cả tạo vòng.

```ts
// Danh sách kề: mỗi nút → các nút nó nối tới
const g = new Map<string, string[]>([
  ['a', ['b', 'c']],
  ['b', ['d']],
  ['c', ['d']],
  ['d', []],
])
```

**Nhận diện:** *"bạn bè của bạn bè"*, *"phụ thuộc lẫn nhau"*, *"đường đi từ A tới B"*, *"có vòng lặp không"*.

Chỗ nó đã nằm sẵn trong việc hằng ngày:

- Cây phụ thuộc gói (`pnpm-lock.yaml`) — và phát hiện phụ thuộc vòng
- Thứ tự chạy migration
- Mạng xã hội, gợi ý bạn bè
- Bản đồ, tìm đường
- Thứ tự dựng của các job trong CI

Một chuyện **bắt buộc** phải nhớ khi duyệt đồ thị, khác hẳn cây:

```ts
function duyet(g: Map<string, string[]>, dau: string) {
  const daTham = new Set<string>()      // ← BẮT BUỘC, cây thì không cần
  const hang = [dau]
  while (hang.length) {
    const n = hang.shift()!
    if (daTham.has(n)) continue          // ← không có dòng này thì lặp vô hạn
    daTham.add(n)
    hang.push(...(g.get(n) ?? []))
  }
  return daTham
}
```

Cây không có vòng nên duyệt kiểu gì cũng dừng. Đồ thị có vòng, nên **quên tập `daTham` là treo chương trình** — không phải chậm, mà là treo hẳn.

## Bảng chọn nhanh

| Bài toán nghe như | Cấu trúc |
|---|---|
| "hoàn tác", "gần nhất", "lồng nhau" | Ngăn xếp |
| "tới trước xử lý trước", "theo tầng" | Hàng đợi |
| "gấp thì làm trước" | Hàng đợi ưu tiên |
| "cha con", "nhiều cấp", "lồng nhau có gốc" | Cây |
| "sắp xếp sẵn", "trong khoảng từ… tới…" | Cây có thứ tự |
| "ai nối với ai", "đường từ A tới B", "có vòng không" | Đồ thị |

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `array.shift()` làm hàng đợi lớn trong JS | `O(n)` mỗi lần → `O(n²)` tổng | Giữ chỉ số đầu, hoặc `deque` ở Python |
| Duyệt đồ thị không có tập đã thăm | Lặp vô hạn, treo hẳn | Luôn có `Set` đã thăm |
| Dùng DFS khi cần đường ngắn nhất | Ra đường bất kỳ, không phải ngắn nhất | BFS |
| Đệ quy DFS trên cây do người dùng nạp | Tràn ngăn xếp | Giới hạn độ sâu, hoặc vòng lặp |
| Dùng bảng băm cho truy vấn khoảng | Phải quét hết | Cây có thứ tự |
| Coi đồ thị như cây | Bỏ sót vòng, dữ liệu sai | Kiểm tra vòng trước |
| Dựng class Ngăn xếp cho mảng JS | Thừa — `push`/`pop` đã là `O(1)` | Dùng thẳng mảng |

## Ghi nhớ

- Ngăn xếp = vào sau ra trước; hàng đợi = vào trước ra trước. Đổi cấu trúc là đổi thứ tự duyệt.
- **DFS dùng ngăn xếp, BFS dùng hàng đợi.** BFS cho đường ngắn nhất.
- Cây có thứ tự làm được hai việc bảng băm chịu thua: duyệt theo thứ tự và tra theo khoảng.
- Đồ thị có vòng → **bắt buộc** có tập đã thăm, nếu không sẽ treo.
- `shift()` của JS là `O(n)` — bẫy hiệu năng kinh điển khi làm hàng đợi.

## Tự kiểm tra

1. DFS và BFS khác nhau ở cấu trúc nào, và khi nào bắt buộc dùng BFS?
2. Vì sao duyệt đồ thị cần tập "đã thăm" còn duyệt cây thì không?
3. Hai việc cây có thứ tự làm được mà bảng băm không làm được?
