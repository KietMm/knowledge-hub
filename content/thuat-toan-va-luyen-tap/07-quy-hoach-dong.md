---
title: Quy hoạch động
slug: quy-hoach-dong
summary: Nhận ra bài quy hoạch động, viết quan hệ truy hồi, và hai cách cài đặt — ghi nhớ từ trên xuống và bảng từ dưới lên.
level: nang-cao
tags: [thuat-toan, quy-hoach-dong, de-quy, do-phuc-tap]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra bài quy hoạch động qua hai dấu hiệu, và viết được quan hệ truy hồi **trước** khi viết code.

## Ý tưởng chính

Quy hoạch động là **đệ quy cộng với việc không tính lại thứ đã tính**. Chỉ có thế.

Nghe đơn giản, nhưng nó biến `O(2ⁿ)` thành `O(n)` ở những bài đúng dạng. Fibonacci đệ quy thuần với `n = 45` mất vài giây; thêm một bảng ghi nhớ là còn vài micro giây.

## Mental model

Hãy tưởng tượng bạn **leo một cầu thang dài và có người hỏi: "có bao nhiêu cách lên tới bậc 100?"**

> Bạn không thử từng cách. Bạn hỏi ngược: *"để đứng ở bậc 100, bước cuối cùng của tôi xuất phát từ đâu?"*
>
> Chỉ có hai khả năng: từ bậc 99 bước 1 bậc, hoặc từ bậc 98 bước 2 bậc. Vậy:
>
> **số cách tới bậc 100 = số cách tới bậc 99 + số cách tới bậc 98.**
>
> Và bạn ghi từng con số vào giấy để khỏi tính lại.

Hai việc trong hình ảnh đó chính là hai việc của quy hoạch động: **hỏi về bước cuối cùng**, và **ghi lại để khỏi tính lại**.

## Ví dụ nhỏ

```ts
leoCauThang(2)   // → 2   (1+1, hoặc 2)
leoCauThang(3)   // → 3   (1+1+1, 1+2, 2+1)
leoCauThang(5)   // → 8
```

Dãy 1, 2, 3, 5, 8 — chính là Fibonacci, và nó xuất hiện vì công thức truy hồi giống hệt.

## Code chạy thế nào

Không có ghi nhớ, cây gọi phình theo cấp số nhân vì **cùng một bài con bị tính lại nhiều lần**:

```text
KHÔNG ghi nhớ — fib(5)
                fib(5)
            /          \
       fib(4)          fib(3)      ← fib(3) tính LẦN 1
      /     \          /     \
  fib(3)  fib(2)   fib(2)  fib(1)  ← fib(3) tính LẦN 2, fib(2) tính ba lần
  ...
  ⇒ fib(40) gọi khoảng 300 TRIỆU lần

CÓ ghi nhớ — mỗi giá trị tính đúng một lần
  fib(5) cần fib(4), fib(3)
  fib(4) cần fib(3), fib(2)
  fib(3) → tính, GHI SỔ
  fib(3) lần sau → tra sổ, xong ngay
  ⇒ fib(40) gọi 40 lần
```

```ts
// Ghi nhớ (từ trên xuống): viết hàm đệ quy tự nhiên rồi thêm bộ nhớ đệm
function leoCauThang(n, nho = new Map()) {
  if (n <= 2) return n
  const daCo = nho.get(n)
  if (daCo !== undefined) return daCo

  const kq = leoCauThang(n - 1, nho) + leoCauThang(n - 2, nho)
  nho.set(n, kq)
  return kq
}
```

```ts
// Bảng (từ dưới lên): điền theo thứ tự, không đệ quy
function leoCauThangBang(n) {
  if (n <= 2) return n
  const dp = new Array(n + 1)
  dp[1] = 1; dp[2] = 2
  for (let i = 3; i <= n; i += 1) dp[i] = dp[i - 1] + dp[i - 2]
  return dp[n]
}
```

```ts
// Nén bộ nhớ: chỉ cần hai giá trị gần nhất ⇒ O(1) thay vì O(n)
function leoCauThangGon(n) {
  if (n <= 2) return n
  let truoc = 1, hienTai = 2
  for (let i = 3; i <= n; i += 1) [truoc, hienTai] = [hienTai, truoc + hienTai]
  return hienTai
}
```

## Tại sao cần nó

Vì **quy trình bốn bước** dưới đây biến một bài "không biết bắt đầu từ đâu" thành việc điền vào chỗ trống. Viết ra giấy trước khi gõ code:

**1. Định nghĩa trạng thái.** `dp[i]` **nghĩa là gì**? Viết thành một câu tiếng Việt đầy đủ: *"`dp[i]` là số cách leo tới bậc `i`"*. Định nghĩa mơ hồ ở đây là nguồn gốc của mọi bế tắc phía sau.

**2. Viết quan hệ truy hồi.** `dp[i]` tính từ những `dp` nào? Câu hỏi sinh ra nó: ***"ở bước cuối cùng, tôi có những lựa chọn nào?"***

**3. Xác định trường hợp cơ sở.** `dp[0]`, `dp[1]` bằng bao nhiêu, và vì sao.

**4. Xác định thứ tự tính.** Muốn tính `dp[i]` thì `dp[i-1]` phải có sẵn.

Hai dấu hiệu để biết bài có giải được bằng quy hoạch động — cần **cả hai**:

```text
① Bài toán con GỐI NHAU     → cùng một bài con xuất hiện nhiều lần trong cây đệ quy
② Cấu trúc con TỐI ƯU       → đáp án tối ưu của bài lớn ghép được từ đáp án tối ưu bài con
```

Thiếu ① thì đệ quy thường là đủ. Thiếu ② thì quy hoạch động cho ra **đáp án sai** — và đây là chỗ nguy hiểm, vì code vẫn chạy bình thường.

Dấu hiệu phụ trong cách phát biểu đề: *"có bao nhiêu cách…"*, *"giá trị lớn nhất/nhỏ nhất có thể"*, *"có đạt được hay không"*, kèm `n` cỡ vài nghìn.

## So sánh

| | Ghi nhớ (trên xuống) | Bảng (dưới lên) |
|---|---|---|
| Cách viết | Đệ quy tự nhiên + cache | Vòng lặp điền bảng |
| Tính những trạng thái nào | Chỉ những cái **thật sự cần** | **Tất cả**, kể cả cái không dùng |
| Rủi ro | Tràn ngăn xếp khi `n` lớn | Không |
| Nén bộ nhớ | Khó | Dễ — thường về `O(1)` |
| Gần với cách nghĩ | ⭐ | Ít hơn |

Bắt đầu bằng ghi nhớ (dễ viết đúng), rồi chuyển sang bảng khi cần nén bộ nhớ hoặc `n` quá lớn.

## Dễ nhầm

**1. Định nghĩa trạng thái thiếu chữ "kết thúc tại i".** Đây là lỗi tinh vi nhất:

```ts
// Dãy con tăng dài nhất — dp[i] = độ dài dãy tăng dài nhất KẾT THÚC TẠI i
function dayConTangDaiNhat(nums) {
  if (nums.length === 0) return 0
  const dp = new Array(nums.length).fill(1)
  for (let i = 1; i < nums.length; i += 1)
    for (let j = 0; j < i; j += 1)
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1)
  return Math.max(...dp)
}
```

Nếu định nghĩa là *"dãy tăng dài nhất trong `i` phần tử đầu"*, bạn sẽ **không tính được** `dp[i+1]` từ nó — vì không biết dãy đó kết thúc ở đâu để nối tiếp. Bài tắc, và người ta thường tưởng mình dốt trong khi thật ra chỉ định nghĩa sai.

**2. Trường hợp cơ sở sai.** Sai đúng ở `n = 0` hoặc `n = 1` là dấu hiệu điển hình. Luôn thử hai giá trị này bằng tay.

**3. Duyệt sai thứ tự.** Đọc một ô chưa được tính thì bạn nhận `undefined` (JS) hoặc số rác — kết quả sai mà không có lỗi.

**4. Dùng quy hoạch động khi thiếu cấu trúc con tối ưu.** Ví dụ bài "đường đi dài nhất không lặp đỉnh trong đồ thị có vòng": đáp án tối ưu của bài lớn **không** ghép được từ đáp án tối ưu bài con. Áp quy hoạch động vào là ra số sai.

**5. Quên rằng Kadane cũng là quy hoạch động.**

```ts
function tongDoanLonNhat(nums) {
  let tot = nums[0], hienTai = nums[0]
  for (let i = 1; i < nums.length; i += 1) {
    hienTai = Math.max(nums[i], hienTai + nums[i])   // dp[i] = max(nums[i], dp[i-1] + nums[i])
    tot = Math.max(tot, hienTai)
  }
  return tot
}
```

Nó trông không giống vì bảng đã bị nén thành hai biến — nhưng công thức truy hồi vẫn nằm nguyên ở đó. Nhận ra điều này giúp bạn không học nó như một mẹo riêng lẻ.

## Mẹo nhớ

> **Quy hoạch động = đệ quy + không tính lại.**
>
> **Câu hỏi sinh ra truy hồi: "ở bước cuối cùng, tôi có những lựa chọn nào?"**
>
> **Định nghĩa trạng thái phải nói được thành một câu tiếng Việt.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Hai dấu hiệu bắt buộc để một bài giải được bằng quy hoạch động?
2. Câu hỏi nào sinh ra quan hệ truy hồi?
3. Vì sao `dp[i]` của bài dãy con tăng phải là "kết thúc tại i"?
4. Ghi nhớ và bảng khác nhau ở điểm nào — nêu một ưu điểm của mỗi cái?
5. Thiếu "cấu trúc con tối ưu" thì hậu quả là gì — chậm hay sai?

## Tự viết lại

Không nhìn lại phần trên, giải bài đổi tiền: cho các mệnh giá `[1, 5, 10]` và số tiền `n`, tìm **số tờ ít nhất** để đủ `n`.

```ts
soToItNhat([1, 5, 10], 12)   // → 3  (10 + 1 + 1)
```

Viết ra giấy bốn bước **trước khi** gõ: trạng thái là gì, truy hồi thế nào, cơ sở là gì, duyệt theo thứ tự nào? Và tự kiểm: vì sao cách tham lam (lấy tờ lớn nhất trước) **sai** với mệnh giá `[1, 3, 4]` và `n = 6`?

## Thử sức

Bài cái túi 0/1: có `n` món, mỗi món có khối lượng và giá trị, túi chịu được `W` kg. Chọn các món để tổng giá trị lớn nhất.

Hai câu để tự lần ra: trạng thái của bạn cần **mấy chiều** (chỉ `i` có đủ không?), và ở mỗi món bạn có đúng mấy lựa chọn? Sau đó: nếu `W = 10⁹` thì cách này còn dùng được không, và điều đó nói lên giới hạn gì của quy hoạch động?
