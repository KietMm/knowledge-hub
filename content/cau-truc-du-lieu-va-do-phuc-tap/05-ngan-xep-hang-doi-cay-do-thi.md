---
title: Ngăn xếp, hàng đợi, cây, đồ thị — dùng khi nào
slug: ngan-xep-hang-doi-cay-do-thi
summary: Bốn cấu trúc còn lại, nhận diện qua bài toán chứ không qua định nghĩa. Và chỗ chúng đã nằm sẵn trong công việc hằng ngày của bạn.
level: trung-cap
tags: [nen-tang, cau-truc-du-lieu, cay, do-thi, hang-doi]
khung: v2
---

> **Sau bài này bạn sẽ:** nghe một yêu cầu là nhận ra ngay nó thuộc hình dạng nào trong bốn cái này, thay vì phải nhớ định nghĩa của chúng.

## Ý tưởng chính

Bốn cấu trúc này không phải bốn thứ để học thuộc. Mỗi cái là **hình dạng tự nhiên của một loại bài toán**, và khi bạn nhận ra hình dạng thì lời giải gần như tự hiện ra.

```text
Ngăn xếp  →  việc lồng nhau, cái mở sau phải đóng trước
Hàng đợi  →  việc xếp hàng, ai tới trước phục vụ trước
Cây       →  quan hệ cha–con, mỗi cái có đúng một cha
Đồ thị    →  quan hệ tự do, có thể vòng lại
```

## Mental model

Bốn hình ảnh, mỗi cái một câu:

> **Ngăn xếp là chồng đĩa.** Đặt lên trên, lấy từ trên xuống. Cái để vào sau cùng là cái lấy ra đầu tiên.
>
> **Hàng đợi là hàng người chờ ở quầy.** Vào cuối hàng, phục vụ từ đầu hàng. Ai tới trước đi trước.
>
> **Cây là gia phả.** Mỗi người có đúng một cha, nhưng có thể nhiều con. Không ai là tổ tiên của chính mình.
>
> **Đồ thị là bản đồ đường xá.** Đường nối tuỳ ý, đi vòng về chỗ cũ được, và giữa hai điểm có thể có nhiều lối.

Điểm khác nhau giữa cây và đồ thị chỉ nằm ở chỗ: **cây không có vòng, đồ thị thì có**. Cây là một trường hợp riêng của đồ thị.

## Ví dụ nhỏ

```ts
// Ngăn xếp: mảng, thêm và lấy cùng một đầu
const ngan = []
ngan.push('a'); ngan.push('b')
ngan.pop()      // 'b' — vào sau, ra trước

// Hàng đợi: thêm một đầu, lấy đầu kia
const hang = []
hang.push('a'); hang.push('b')
hang.shift()    // 'a' — vào trước, ra trước  (nhưng shift() là O(n), xem Dễ nhầm)
```

```ts
// Cây: mỗi nút chứa những nút cùng loại
const thuMuc = { ten: 'src', con: [{ ten: 'app', con: [] }] }

// Đồ thị: danh sách kề — ai nối với ai
const ke = new Map([['A', ['B', 'C']], ['B', ['A']], ['C', ['A']]])
```

## Code chạy thế nào

Cùng một dữ liệu, ngăn xếp và hàng đợi cho **thứ tự duyệt khác hẳn nhau** — đây là chỗ đáng lần tay:

```text
Đưa vào theo thứ tự: 1, 2, 3

NGĂN XẾP                        HÀNG ĐỢI
push 1 → [1]                    push 1 → [1]
push 2 → [1,2]                  push 2 → [1,2]
push 3 → [1,2,3]                push 3 → [1,2,3]
pop    → 3   [1,2]              lấy đầu → 1   [2,3]
pop    → 2   [1]                lấy đầu → 2   [3]
pop    → 1   []                 lấy đầu → 3   []

ra: 3, 2, 1  (ngược lại)        ra: 1, 2, 3  (giữ nguyên)
```

Chỉ khác nhau ở chỗ **lấy ra từ đầu nào**, mà đổi hẳn hành vi. Và chính điều đó quyết định thuật toán duyệt: ngăn xếp cho bạn đi sâu một nhánh tới cùng (DFS), hàng đợi cho bạn lan ra từng lớp (BFS) — xem [[duyet-do-thi-bfs-va-dfs]].

## Tại sao cần nó

Vì bốn hình dạng này **đã nằm sẵn trong công việc hằng ngày của bạn**, chỉ là chưa được gọi tên:

| Bạn đã gặp ở | Thực chất là |
|---|---|
| Nút Back của trình duyệt, Undo | Ngăn xếp |
| Ngăn xếp lời gọi hàm, lỗi "stack overflow" | Ngăn xếp |
| Kiểm tra ngoặc đóng mở trong trình biên dịch | Ngăn xếp |
| Hàng chờ gửi email, xử lý ảnh nền | Hàng đợi |
| Cây thư mục, cây DOM, JSON lồng nhau | Cây |
| Danh mục sản phẩm nhiều cấp, cây bình luận | Cây |
| Index B-tree của cơ sở dữ liệu | Cây |
| Bạn bè trên mạng xã hội, phụ thuộc giữa các gói | Đồ thị |
| Bản đồ chỉ đường | Đồ thị |

Nhận ra hình dạng cho bạn hai thứ ngay lập tức: **thuật toán chuẩn để giải**, và **danh sách bẫy đã biết trước** (đồ thị có vòng thì phải đánh dấu đã thăm; cây quá sâu thì đệ quy tràn ngăn xếp).

Hàng đợi còn là xương sống của kiến trúc bất đồng bộ — chỗ nó xuất hiện ở quy mô hệ thống nằm ở [[hang-doi-va-xu-ly-bat-dong-bo]].

## So sánh

| | Thêm vào | Lấy ra | Câu hỏi nhận diện |
|---|---|---|---|
| Ngăn xếp | một đầu | **cùng** đầu đó | "Cái mở sau có phải đóng trước không?" |
| Hàng đợi | một đầu | **đầu kia** | "Ai tới trước được phục vụ trước?" |
| Cây | nút cha | duyệt từ gốc | "Mỗi cái có đúng một cha không?" |
| Đồ thị | thêm cạnh | duyệt có đánh dấu | "Có thể đi vòng về chỗ cũ không?" |

Câu hỏi ở cột cuối chính là thứ nên dùng khi đọc một yêu cầu mới. Ví dụ *"tính năng hoàn tác"* — cái làm sau phải hoàn tác trước ⇒ ngăn xếp, không cần nghĩ thêm.

## Dễ nhầm

**1. Dùng `shift()` làm hàng đợi.**

```ts
while (q.length) { const x = q.shift() }   // ❌ mỗi shift là O(n) → cả vòng thành O(n²)
```

Cách chữa rẻ nhất là không lấy ra thật, chỉ dịch một chỉ số:

```ts
for (let dau = 0; dau < q.length; dau += 1) { const x = q[dau] }   // ✅ O(n)
```

**2. Quên đánh dấu đã thăm khi duyệt đồ thị.** Đồ thị có vòng, nên không đánh dấu là **lặp vô hạn**. Cây thì không cần — vì cây không có vòng, và đó là khác biệt thực dụng nhất giữa hai thứ.

**3. Nhầm cây với đồ thị vì dữ liệu "trông có cha con".** Phép thử: **một nút có thể có hai cha không?** Danh mục sản phẩm mà một sản phẩm thuộc nhiều danh mục thì đó **không** còn là cây — và mọi thuật toán cây bạn áp vào sẽ sai một cách khó thấy.

**4. Duyệt cây sâu bằng đệ quy mà không tính độ sâu.** Cây thư mục 20 tầng thì không sao; cây 50.000 tầng (danh sách liên kết trá hình) sẽ tràn ngăn xếp. Khi độ sâu không kiểm soát được, dùng ngăn xếp tường minh thay cho đệ quy — cách nghĩ ở [[de-quy-va-cach-nghi-ve-no]].

**5. Tự cài cây tìm kiếm khi cơ sở dữ liệu đã làm sẵn.** Index của Postgres chính là B-tree, và nó đã được tối ưu cho đĩa — xem [[index-trong-postgresql]]. Tự dựng lại trong ứng dụng gần như luôn là lựa chọn tệ hơn.

## Mẹo nhớ

> **Chồng đĩa · Hàng người · Gia phả · Bản đồ.**
>
> **Cây là đồ thị không có vòng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ngăn xếp và hàng đợi khác nhau ở đúng điểm nào?
2. Vì sao duyệt đồ thị bắt buộc phải đánh dấu đã thăm, còn duyệt cây thì không?
3. Phép thử một câu để biết dữ liệu là cây hay đồ thị?
4. Nút Back của trình duyệt là cấu trúc nào, và vì sao?
5. `shift()` sai ở đâu khi làm hàng đợi, và bạn thay bằng gì?

## Tự viết lại

Không nhìn lại phần trên, viết hàm kiểm tra một chuỗi ngoặc `()[]{}` có cân đối không:

```ts
canDoi('({[]})')   // true
canDoi('([)]')     // false
```

Trước khi viết, tự trả lời: vì sao **bộ đếm** không đủ, và cấu trúc nào mới đúng? Bài này có bản chấm được ở [[kiem-tra-ngoac-can-doi]].

## Thử sức

Bạn có danh sách các gói phần mềm, mỗi gói khai những gói nó phụ thuộc. Cần in ra **thứ tự cài đặt** sao cho mọi gói đều được cài sau các gói nó cần.

Ba câu để tự lần ra: dữ liệu này là cây hay đồ thị? Nếu có hai gói phụ thuộc lẫn nhau thì chuyện gì xảy ra, và bạn phát hiện nó bằng cách nào?
