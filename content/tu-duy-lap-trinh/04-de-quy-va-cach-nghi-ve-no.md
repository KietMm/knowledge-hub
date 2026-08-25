---
title: Đệ quy và cách nghĩ về nó
slug: de-quy-va-cach-nghi-ve-no
summary: Đừng lần theo từng lời gọi trong đầu. Tin vào giả định quy nạp, chốt điều kiện dừng, và biết lúc nào vòng lặp tốt hơn.
level: trung-cap
tags: [nen-tang, tu-duy, de-quy, thuat-toan]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được hàm đệ quy mà không cần lần theo cây gọi trong đầu, và biết khi nào nên dùng vòng lặp thay vì đệ quy.

## Ý tưởng chính

Đệ quy khó không phải vì nó phức tạp, mà vì **người ta cố lần theo nó bằng đầu**: gọi cái này, cái này gọi cái kia, cái kia lại gọi... tới tầng thứ ba là lạc.

Cái khó đó là **ảo**, và bài này chỉ có một việc: thay cách nghĩ ấy bằng cách nghĩ đúng.

## Mental model

Hãy tưởng tượng bạn là **một nhân viên trong một dãy phòng giống hệt nhau**, và bạn chỉ biết làm **đúng một bước**.

> Sếp đưa bạn chồng 100 hồ sơ và bảo: "đếm đi".
>
> Bạn **không đếm cả chồng**. Bạn lấy ra một tờ, đưa 99 tờ còn lại sang phòng bên — nơi có một người **y hệt bạn** — rồi nói: *"đếm hộ, xong báo số."*
>
> Người bên kia làm y như vậy với phòng kế tiếp. Tới phòng cuối cùng, ai đó nhận **chồng rỗng** và trả lời ngay: "**không**".
>
> Con số chạy ngược về: 0 → 1 → 2 → … → 100.

Ba điều rút ra, và chúng chính là ba phần của mọi hàm đệ quy:

1. Bạn chỉ làm **một bước** (lấy ra một tờ).
2. Bạn **tin** người phòng bên làm đúng phần còn lại — không đi kiểm tra.
3. Phải có **một phòng không gọi tiếp** (chồng rỗng), nếu không dãy phòng kéo dài vô tận.

Điểm 2 là điểm khó chấp nhận nhất, và cũng là điểm quan trọng nhất. **Đừng lần theo cây gọi.** Chỉ hỏi: *"nếu người phòng bên trả về đúng, tôi ghép thế nào để phần của tôi cũng đúng?"*

## Ví dụ nhỏ

```ts
function giaiThua(n) {
  if (n <= 1) return 1        // phòng cuối: không gọi tiếp
  return n * giaiThua(n - 1)  // một bước, phần còn lại giao phòng bên
}
```

Đọc dòng cuối theo mental model: *"lấy ra số n, giao `n-1` cho người bên cạnh, rồi nhân kết quả của họ với n."*

## Code chạy thế nào

Với `giaiThua(4)` — chú ý hai chiều: **đi xuống** (giao việc) rồi **quay lên** (ghép kết quả):

```text
đi xuống                          quay lên
giaiThua(4) = 4 * giaiThua(3)     ← 4 * 6  = 24
  giaiThua(3) = 3 * giaiThua(2)   ← 3 * 2  = 6
    giaiThua(2) = 2 * giaiThua(1) ← 2 * 1  = 2
      giaiThua(1) = 1  ✋ dừng    → 1
```

Việc thật sự chỉ xảy ra ở **chiều quay lên**. Đây là lý do đệ quy tốn bộ nhớ: bốn lời gọi phải **cùng nằm chờ** trong ngăn xếp, mỗi cái giữ lại con số của mình để nhân khi kết quả về.

Nhưng bạn không cần vẽ sơ đồ này để viết được hàm. Bạn chỉ cần trả lời ba câu ở phần dưới.

## Cú pháp

Không có cú pháp riêng cho đệ quy — chỉ là một hàm gọi chính nó. Cái cần nhớ là **khung ba phần**:

```ts
function giai(baiToan) {
  if (đủNhỏ(baiToan)) return đápÁnHiểnNhiên   // 1. điều kiện dừng
  const nhoHon = thuNho(baiToan)               // 2. thu nhỏ MỘT bước
  return ghep(giai(nhoHon))                    // 3. ghép kết quả
}
```

Ba câu hỏi để viết bất kỳ hàm đệ quy nào:

```text
1. Trường hợp nhỏ nhất là gì, và đáp án của nó?
2. Làm sao thu nhỏ bài toán MỘT bước?
3. Có kết quả của bài nhỏ rồi thì ghép thế nào?
```

## Tại sao cần nó

Với giai thừa, đệ quy chỉ là một cách viết khác — vòng lặp làm được, còn nhanh hơn. Đệ quy thật sự thắng ở **dữ liệu phân nhánh**, nơi vòng lặp trở nên xấu xí:

```ts
// Đếm tất cả file trong một thư mục, kể cả thư mục con
function demFile(thuMuc) {
  let tong = 0
  for (const muc of thuMuc.noiDung) {
    tong += muc.laThuMuc ? demFile(muc) : 1   // ← thư mục con: giao cho "người bên cạnh"
  }
  return tong
}
```

Viết đoạn này bằng vòng lặp thuần thì bạn phải **tự quản một ngăn xếp** những thư mục chưa duyệt — tức là tự tay làm lại đúng việc mà đệ quy làm miễn phí.

Cùng lý do đó, đệ quy là cách tự nhiên để duyệt cây thư mục, cây DOM, cây danh mục nhiều cấp, và mọi thứ có hình dạng "thứ này chứa những thứ cùng loại với nó". SQL cũng có công cụ riêng cho hình dạng đó — xem [[subquery-va-cte]].

## Dễ nhầm

**1. Thiếu điều kiện dừng, hoặc dừng sai.**

```ts
function dem(n) {
  return n + dem(n - 1)   // ❌ không bao giờ dừng → RangeError: Maximum call stack size exceeded
}
```

Lỗi này luôn hiện dưới dạng **tràn ngăn xếp**. Thấy nó thì hỏi đúng hai câu: *có điều kiện dừng không*, và *mỗi lời gọi có thật sự tiến về phía nó không*.

```ts
function dem(n) {
  if (n <= 0) return 0      // ✅ có dừng
  return n + dem(n - 1)     //    và n giảm dần → chắc chắn tới 0
}
```

**2. Thu nhỏ nhưng không tiến về điều kiện dừng.**

```ts
function xau(n) {
  if (n === 0) return 0
  return xau(n - 2)   // ❌ n lẻ sẽ nhảy qua 0: 5 → 3 → 1 → -1 → -3 → ...
}
```

Điều kiện dừng phải **chặn được mọi đường đi tới**, không chỉ đường đẹp nhất. Đổi thành `n <= 0` là xong.

**3. Cố lần theo cây gọi trong đầu.** Đây là "lỗi" phổ biến nhất và nó không nằm trong code — nó nằm trong cách bạn nghĩ. Với bài phân nhánh, cây gọi có hàng trăm nhánh; không ai giữ nổi trong đầu. **Tin vào lời gọi con** và chỉ kiểm ba câu hỏi ở trên.

**4. Đệ quy tính lại cùng một thứ rất nhiều lần.**

```ts
function fib(n) {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)   // ❌ fib(30) gọi fib(10) hàng nghìn lần
}
```

Đây không phải lỗi của đệ quy mà là lỗi thiếu ghi nhớ. Cách chữa — lưu lại kết quả đã tính — chính là quy hoạch động, xem [[quy-hoach-dong]]. Cách đo mức độ tệ nằm ở [[big-o-doc-va-uoc-luong]].

**5. Dùng đệ quy cho việc tuyến tính, đơn giản.** Duyệt một mảng phẳng thì `for` rõ hơn, nhanh hơn, và không tràn ngăn xếp. JavaScript tràn ở khoảng 10.000 tầng — với dữ liệu tuyến tính lớn, đệ quy là lựa chọn sai.

## Mẹo nhớ

> **Làm một bước, giao phần còn lại cho người phòng bên, và nhớ chừa một phòng không gọi tiếp.**
>
> **Đừng lần theo cây gọi — hãy tin nó.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba phần bắt buộc của một hàm đệ quy là gì?
2. Vì sao "tin vào lời gọi con" lại là cách nghĩ đúng, thay vì lần theo từng tầng?
3. `RangeError: Maximum call stack size exceeded` nói lên điều gì? Bạn kiểm hai chỗ nào?
4. Vì sao `if (n === 0)` là điều kiện dừng nguy hiểm khi mỗi bước trừ 2?
5. Khi nào bạn nên chọn vòng lặp thay vì đệ quy?

## Tự viết lại

Không nhìn lại phần trên, viết hàm `tongDayLongNhau(ds)` cộng tất cả số trong một mảng có thể lồng nhau:

```ts
tongDayLongNhau([1, [2, [3, 4]], 5])   // → 15
```

Trước khi chạy, tự trả lời ba câu: trường hợp nhỏ nhất là gì, bạn thu nhỏ thế nào, và ghép ra sao?

## Thử sức

Hàm dưới đây có dừng không? Nếu có, nó trả về gì với `n = 10`?

```ts
function bian(n) {
  if (n === 1) return 0
  return 1 + bian(n % 2 === 0 ? n / 2 : n * 3 + 1)
}
```

Gợi ý: thử `n = 10` bằng tay, ghi lại dãy số. Câu hỏi thật sự là — bạn có **chứng minh được** nó luôn dừng với mọi `n` không? (Đây là một bài toán chưa ai giải được, và nó cho thấy "điều kiện dừng" không phải lúc nào cũng hiển nhiên.)
