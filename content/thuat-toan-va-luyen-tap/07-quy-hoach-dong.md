---
title: Quy hoạch động
slug: quy-hoach-dong
summary: Nhận ra bài quy hoạch động, viết quan hệ truy hồi, và hai cách cài đặt — ghi nhớ từ trên xuống và bảng từ dưới lên.
level: nang-cao
tags: [thuat-toan, quy-hoach-dong, de-quy, do-phuc-tap]
---

> **Sau bài này bạn sẽ:** nhận ra bài quy hoạch động qua hai dấu hiệu, viết được quan hệ truy hồi trước khi viết code, và chuyển qua lại giữa hai cách cài đặt.

## Quy hoạch động là gì, nói cho gọn

Quy hoạch động là **đệ quy cộng với việc không tính lại thứ đã tính**. Chỉ có thế.

Nghe đơn giản, nhưng nó biến `O(2ⁿ)` thành `O(n)` ở những bài đúng dạng. Fibonacci đệ quy thuần với `n = 45` mất vài giây; thêm một bảng ghi nhớ là còn vài micro giây.

## Hai dấu hiệu nhận ra

Một bài giải được bằng quy hoạch động khi có **cả hai**:

**1. Bài toán con gối nhau.** Cùng một bài toán con xuất hiện nhiều lần trong cây đệ quy. Với Fibonacci, `fib(3)` được tính lại hàng nghìn lần.

**2. Cấu trúc con tối ưu.** Đáp án tối ưu của bài lớn ghép được từ đáp án tối ưu của các bài con. Đường đi ngắn nhất từ A tới C qua B thì đoạn A→B cũng phải là ngắn nhất.

Thiếu dấu hiệu 1 thì đệ quy thường là đủ. Thiếu dấu hiệu 2 thì quy hoạch động cho ra đáp án sai — và đây là chỗ nguy hiểm, vì code vẫn chạy.

Dấu hiệu phụ hay thấy trong cách phát biểu đề: "có bao nhiêu cách…", "giá trị lớn nhất/nhỏ nhất có thể", "có thể đạt được hay không". Kèm theo là ràng buộc `n` cỡ vài nghìn — đủ lớn để vét cạn chết, đủ nhỏ để bảng `O(n²)` sống.

## Quy trình bốn bước

Viết ra giấy trước khi gõ code. Bước 2 là bước thật sự khó; ba bước còn lại là thủ tục.

**1. Định nghĩa trạng thái.** `dp[i]` **nghĩa là gì**? Viết thành một câu tiếng Việt đầy đủ. "`dp[i]` là số cách leo tới bậc `i`". Định nghĩa mơ hồ ở đây là nguồn gốc của mọi bế tắc phía sau.

**2. Viết quan hệ truy hồi.** `dp[i]` tính từ những `dp` nào? Câu hỏi để tự hỏi: *"ở bước cuối cùng, tôi có những lựa chọn nào?"*

**3. Xác định trường hợp cơ sở.** `dp[0]` bằng bao nhiêu, và vì sao.

**4. Xác định thứ tự tính.** Muốn tính `dp[i]` thì `dp[i-1]` phải có sẵn.

Áp vào bài leo cầu thang (mỗi bước leo 1 hoặc 2 bậc, có bao nhiêu cách lên `n` bậc):

```
1. dp[i] = số cách leo tới bậc i
2. Bước cuối cùng chỉ có hai khả năng — từ bậc i-1 leo 1, hoặc từ bậc i-2 leo 2:
   dp[i] = dp[i-1] + dp[i-2]
3. dp[0] = 1 (đứng yên là một cách), dp[1] = 1
4. Tính từ nhỏ tới lớn
```

## Hai cách cài đặt

**Ghi nhớ (từ trên xuống)** — viết hàm đệ quy tự nhiên rồi thêm bộ nhớ đệm:

```js
function leoCauThang(n, nho = new Map()) {
  if (n <= 1) return 1
  const daCo = nho.get(n)
  if (daCo !== undefined) return daCo

  const kq = leoCauThang(n - 1, nho) + leoCauThang(n - 2, nho)
  nho.set(n, kq)
  return kq
}
```

Ưu điểm: gần với cách nghĩ, và **chỉ tính những trạng thái thật sự cần**. Nhược: tốn ngăn xếp, có thể tràn khi `n` lớn.

**Bảng (từ dưới lên)** — điền bảng theo thứ tự:

```js
function leoCauThangBang(n) {
  if (n <= 1) return 1
  const dp = new Array(n + 1)
  dp[0] = 1
  dp[1] = 1
  for (let i = 2; i <= n; i += 1) dp[i] = dp[i - 1] + dp[i - 2]
  return dp[n]
}
```

Ưu điểm: không tràn ngăn xếp, thường nhanh hơn, và mở đường cho tối ưu bộ nhớ:

```js
// Chỉ cần hai giá trị gần nhất ⇒ O(1) bộ nhớ thay vì O(n).
function leoCauThangGon(n) {
  let truoc = 1
  let hienTai = 1
  for (let i = 2; i <= n; i += 1) [truoc, hienTai] = [hienTai, truoc + hienTai]
  return hienTai
}
```

Mẫu "chỉ giữ vài dòng gần nhất" áp dụng được cho rất nhiều bài quy hoạch động một chiều, và cho cả bài hai chiều khi mỗi dòng chỉ phụ thuộc dòng liền trước.

## Ba dạng hay gặp

**Dãy con tăng dài nhất (`O(n²)`)** — `dp[i]` = độ dài dãy tăng dài nhất *kết thúc tại* `i`:

```js
function daySonTangDaiNhat(nums) {
  if (nums.length === 0) return 0
  const dp = new Array(nums.length).fill(1)

  for (let i = 1; i < nums.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1)
    }
  }
  return Math.max(...dp)
}
```

Để ý cụm **"kết thúc tại i"** trong định nghĩa trạng thái. Không có nó, `dp[i]` không đủ thông tin để tính `dp[i+1]`, và bài tắc.

**Cái túi 0/1** — `dp[i][w]` = giá trị lớn nhất khi xét `i` món đầu với sức chứa `w`. Ở mỗi món có đúng hai lựa chọn: lấy hoặc không.

**Đoạn con tổng lớn nhất (Kadane)** — `dp[i]` = tổng lớn nhất của đoạn *kết thúc tại* `i`:

```js
function tongDoanLonNhat(nums) {
  let tot = nums[0]
  let hienTai = nums[0]
  for (let i = 1; i < nums.length; i += 1) {
    // Đoạn trước đó âm thì mang theo chỉ làm hại — bắt đầu lại từ đây.
    hienTai = Math.max(nums[i], hienTai + nums[i])
    tot = Math.max(tot, hienTai)
  }
  return tot
}
```

Kadane trông không giống quy hoạch động vì bảng đã bị nén thành hai biến — nhưng nó chính là dạng gọn của `dp[i] = max(nums[i], dp[i-1] + nums[i])`.

## Bẫy thường gặp

| Bẫy | Dấu hiệu |
|---|---|
| Định nghĩa trạng thái mơ hồ | Viết truy hồi mãi không xong |
| Thiếu "kết thúc tại i" trong định nghĩa | Truy hồi cần thông tin không có trong bảng |
| Trường hợp cơ sở sai | Sai đúng ở `n = 0` hoặc `n = 1` |
| Duyệt sai thứ tự | Đọc ô chưa được tính |
| Dùng QHĐ khi không có cấu trúc con tối ưu | Đáp án sai mà code vẫn chạy |

## Ghi nhớ

- Quy hoạch động = đệ quy + không tính lại. Hai dấu hiệu: bài con gối nhau và cấu trúc con tối ưu.
- Viết định nghĩa trạng thái thành một câu tiếng Việt trước khi gõ code.
- "Ở bước cuối cùng tôi có những lựa chọn nào?" — đó là câu hỏi sinh ra truy hồi.
- Ghi nhớ hợp với cách nghĩ; bảng hợp với `n` lớn và tối ưu bộ nhớ.
- Rất nhiều bài một chiều nén được về `O(1)` bộ nhớ.

## Tự kiểm tra

1. Hai dấu hiệu bắt buộc để một bài giải được bằng quy hoạch động?
2. Vì sao `dp[i]` của bài dãy con tăng phải là "kết thúc tại i" chứ không phải "trong i phần tử đầu"?
3. Kadane liên hệ thế nào với công thức truy hồi `dp[i] = max(nums[i], dp[i-1] + nums[i])`?
