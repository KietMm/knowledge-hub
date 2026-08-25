---
title: Biến, trạng thái và luồng điều khiển
slug: bien-trang-thai-va-luong-dieu-khien
summary: "Mô hình máy tính trong đầu bạn: ô nhớ có tên, thứ tự thực thi, và vì sao gán không phải là bằng."
level: co-ban
tags: [nen-tang, tu-duy, bien, trang-thai]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được một đoạn code lạ bằng cách lần theo trạng thái thay vì đoán, và không còn thấy `x = x + 1` là vô lý.

## Ý tưởng chính

Bỏ hết cú pháp sang một bên, mọi chương trình chỉ làm ba việc: **giữ dữ liệu ở đâu đó**, **đọc và sửa nó**, và **quyết định làm gì tiếp theo**.

Toàn bộ dữ liệu chương trình đang giữ tại một thời điểm gọi là **trạng thái**. Lập trình, nói cho gọn, là điều khiển trạng thái đó thay đổi theo đúng thứ tự bạn muốn.

## Mental model

Hãy tưởng tượng một **người thư ký cực nhanh nhưng cực máy móc**, ngồi trước tấm bảng trắng có các ô được đặt tên.

> Anh ta đọc **từng dòng lệnh theo đúng thứ tự**, không đọc trước, không tự đoán ý bạn.
>
> Mỗi dòng chỉ thuộc một trong hai loại: *"ghi giá trị này vào ô kia"*, hoặc *"tuỳ ô kia đang ghi gì, nhảy tới dòng nào tiếp theo"*.

Tấm bảng là **trạng thái**. Ngón tay anh ta đang chỉ dòng nào là **luồng điều khiển**. Gỡ lỗi, về bản chất, là hỏi: *"tới dòng này thì trên bảng đang ghi gì, và nó lệch khỏi cái tôi tưởng ở chỗ nào?"*

## Ví dụ nhỏ

```ts
let x = 5
x = x + 1
```

Trong toán học, `x = x + 1` là một mệnh đề **sai**. Trong lập trình nó không phải mệnh đề — nó là **mệnh lệnh**.

## Code chạy thế nào

Người thư ký làm đúng thế này:

```text
Dòng 1: let x = 5
        → tạo ô tên x, ghi số 5
        bảng:  x = 5

Dòng 2: x = x + 1
        bước a — đọc ô x, thấy 5
        bước b — tính 5 + 1 = 6
        bước c — ghi 6 đè lên ô x
        bảng:  x = 6
```

Để ý **thứ tự a → b → c**: vế phải tính xong hết rồi mới ghi vào vế trái. Nắm đúng thứ tự đó thì `x = x + 1` hết kỳ lạ, và bạn tự suy được `x = x * 2` hay `i = i - 1` làm gì mà không cần ai dạy.

## Cú pháp

```ts
const TEN = 'Kiệt'   // ô không cho gán lại
let tuoi = 30        // ô gán lại được

if (tuoi >= 18) { }                  // rẽ nhánh: đọc bảng rồi chọn đường
for (let i = 0; i < 3; i += 1) { }   // lặp: mỗi vòng đổi bảng một chút
while (conHang) { }                  // lặp tới khi bảng đổi đủ để điều kiện sai
```

Đừng học thuộc ba dạng vòng lặp. Nhớ theo pattern:

```text
if     →  đi đường nào
for    →  làm N lần, biết trước N
while  →  làm tới khi trạng thái đổi đủ
```

## Tại sao cần nó

Không có mô hình "bảng trắng + ngón tay chỉ dòng", bạn buộc phải **nhớ** code làm gì thay vì **đọc ra** được nó làm gì — và lúc gặp lỗi thì không có chỗ nào để bắt đầu.

```ts
let tong = 0
for (let i = 1; i <= 3; i += 1) {
  tong = tong + i
}
```

Người có mô hình lần ra ngay:

```text
trước vòng:  tong=0
i=1:         tong = 0+1 = 1
i=2:         tong = 1+2 = 3
i=3:         tong = 3+3 = 6
i=4:         4 <= 3 sai → dừng
```

Người không có mô hình sẽ nhìn đoạn code, nghĩ "chắc là tính tổng", rồi đoán. Đoán đúng 90% số lần — và 10% còn lại là những buổi tối ngồi mò không ra lỗi.

## Dễ nhầm

**1. Lẫn `=` với `==`.** Hai việc hoàn toàn khác nhau, chỉ trông giống nhau:

```text
=    →  MỆNH LỆNH: ghi vào ô
==   →  CÂU HỎI: hai bên có bằng nhau không
```

```ts
if (x = 5) { }    // ❌ GHI 5 vào x, rồi coi 5 là "đúng" → luôn chạy
if (x === 5) { }  // ✅ HỎI x có bằng 5 không
```

**2. Tưởng `b = a` làm hai cái tên dính vào nhau.**

```ts
let a = 1
let b = a      // b nhận BẢN SAO của giá trị 1
a = 99
console.log(b) // 1 — b không "theo dõi" a
```

Nếu bạn tưởng `b` thành 99 thì mô hình trong đầu bạn đang là *"b là tên gọi khác của a"*. Không phải: đó là hai ô riêng, và `let b = a` chỉ chép nội dung một lần tại thời điểm đó. Với mảng và object thì câu chuyện khác hẳn — xem [[kieu-du-lieu-va-bien]].

**3. Tưởng biến sống ở mọi nơi.** Mỗi cặp `{}` mở một vùng riêng:

```ts
if (true) {
  let trong = 1
}
console.log(trong)   // ❌ ReferenceError — ô này bị xoá khi ra khỏi ngoặc
```

Người thư ký xoá bảng phụ khi rời khối. Đây là điều tốt: nó giữ tấm bảng chính khỏi phình vô hạn, và cho phép bạn đọc một hàm mà không phải nhớ cả chương trình.

**4. Quên rằng biến đếm cũng là trạng thái.** `i` trong `for` là một ô, và mỗi vòng nó đổi. Lỗi lệch một — chạy thừa hoặc thiếu một vòng — gần như luôn do đọc sai `i` ở vòng cuối. Cách chữa: **lần tay ba vòng đầu và vòng cuối**, đừng đọc lướt.

## Mẹo nhớ

> **Gán là mệnh lệnh, không phải lời khẳng định.**
>
> **Đọc code là lần theo bảng, không phải đoán ý.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. "Trạng thái" của một chương trình nghĩa là gì?
2. Ba bước máy làm khi gặp `x = x + 1` diễn ra theo thứ tự nào?
3. `=` và `==` khác nhau ở chỗ nào — không phải về cú pháp, mà về **việc chúng làm**?
4. Sau `let b = a; a = 99` thì `b` bằng bao nhiêu, và vì sao?
5. Khi nào một cái tên biến biến mất khỏi bảng?

## Tự viết lại

Không nhìn lại phần trên, lần tay đoạn này và ghi ra bảng trạng thái sau mỗi vòng:

```ts
let a = 1
let b = 1
for (let i = 0; i < 3; i += 1) {
  const tam = a + b
  a = b
  b = tam
}
```

`a` và `b` bằng bao nhiêu ở cuối? Ghi xong rồi tự hỏi: **vì sao phải có biến `tam`?** Bỏ nó đi thì hỏng ở đâu?

## Thử sức

Đoạn này in ra gì?

```ts
let x = 1
function f() {
  let x = 2
  x = x + 10
}
f()
console.log(x)
```

Gợi ý để tự lần ra: có **mấy ô** tên `x`, và dòng `x = x + 10` đang ghi vào ô nào?
