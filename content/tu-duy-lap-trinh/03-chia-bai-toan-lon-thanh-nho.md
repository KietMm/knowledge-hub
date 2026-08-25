---
title: Chia bài toán lớn thành bài toán nhỏ
slug: chia-bai-toan-lon-thanh-nho
summary: "Kỹ năng quyết định nhất và ít được dạy nhất: nhìn một yêu cầu mơ hồ và cắt nó thành những mảnh bạn biết cách làm."
level: co-ban
tags: [nen-tang, tu-duy, phan-ra, giai-quyet-van-de]
khung: v2
---

> **Sau bài này bạn sẽ:** có một quy trình để bám vào khi nhìn một yêu cầu mà không biết bắt đầu từ đâu, thay vì ngồi chờ ý tưởng loé lên.

## Ý tưởng chính

Người mới bí không phải vì thiếu cú pháp. Họ biết `for`, biết `if`, biết hàm — nhưng nhìn yêu cầu *"làm trang quản lý đơn hàng"* thì không biết gõ dòng đầu tiên vào đâu.

Vì bài toán ở dạng đó **không có dòng đầu tiên**. Việc của bạn không phải "nghĩ ra lời giải", mà là **cắt nó thành những mảnh mà bạn đã biết cách làm** — rồi làm từng mảnh.

## Mental model

Hãy nghĩ tới một **cuộn dây rối**.

> Không ai gỡ cả cuộn cùng lúc. Bạn tìm **một đầu dây** — chỉ một — rồi kéo nó ra khỏi đám rối. Xong đầu đó, đám rối nhỏ đi một chút, và đầu dây tiếp theo lộ ra.

Bài toán lớn cũng vậy: bạn không cần thấy toàn bộ lời giải trước khi bắt đầu. Bạn chỉ cần thấy **một mảnh đủ nhỏ để làm ngay**. Làm xong mảnh đó, bài toán còn lại nhỏ hơn — và thường lộ ra mảnh tiếp theo.

Ngồi nhìn cả cuộn dây và chờ nó tự gỡ chính là cảm giác "bí".

## Ví dụ nhỏ

Yêu cầu: *"Cho danh sách đơn hàng, in ra tên khách chi nhiều nhất trong tháng này."*

Nghe như một việc. Thật ra là bốn:

```text
1. Lọc ra đơn trong tháng này
2. Cộng tiền theo từng khách
3. Tìm khách có tổng lớn nhất
4. In tên khách đó
```

Bốn dòng trên, dòng nào bạn cũng biết làm. Đó là dấu hiệu đã cắt đủ nhỏ.

## Code chạy thế nào

Viết bốn dòng ấy thành khung code **trước khi** viết code thật:

```ts
function khachChiNhieuNhat(donHang, thang) {
  const trongThang = locTheoThang(donHang, thang)   // 1
  const tongTheoKhach = congTheoKhach(trongThang)   // 2
  const khach = timLonNhat(tongTheoKhach)           // 3
  return khach.ten                                  // 4
}
```

Chưa hàm nào tồn tại, và đoạn code này **đã có ích**: nó biến một bài toán mơ hồ thành ba bài toán con rõ ràng, mỗi cái có tên, có đầu vào, có đầu ra. Giờ bạn làm từng cái, và mỗi cái đều test được riêng.

Đây cũng là lý do cách này chống được cảm giác chán: sau 5 phút bạn đã có `locTheoThang` chạy đúng, thay vì sau 2 tiếng vẫn chưa có gì chạy.

## Tại sao cần nó

Không cắt, bạn viết một hàm 80 dòng làm cả bốn việc. Nó có thể chạy đúng — nhưng:

- **Sai một chỗ thì phải đọc cả 80 dòng** để tìm, vì không biết lỗi nằm ở khâu nào.
- **Không test được từng phần**, chỉ test được "cả cục ra đúng chưa".
- **Không tái dùng được** `congTheoKhach` cho báo cáo khác, vì nó không tồn tại như một thứ riêng.
- **Không giao được cho ai** — không có mảnh nào để đưa.

Và quan trọng nhất: nó khiến bạn phải **giữ cả bài toán trong đầu cùng lúc**. Đầu người không làm được việc đó lâu, và mọi lỗi khó chịu đều sinh ra ở lúc bạn quá tải.

## Bốn bước khi thật sự bí

**1. Diễn đạt lại bằng lời thường.** Không thuật ngữ, không cú pháp. *"Nhận vào một danh sách, trả về một cái tên."* Nếu bạn không nói được câu đó, bạn chưa hiểu đề — và không ai giải được bài mình chưa hiểu.

**2. Làm tay một ví dụ nhỏ.** Lấy 3 đơn hàng, tự tính trên giấy. **Cách bạn làm tay chính là thuật toán.** Bạn vừa lọc rồi cộng dồn? Đó là bước 1 và 2 ở trên.

**3. Đặt tên cho từng bước.** Mỗi bước bạn làm tay là một hàm. Đặt tên trước, viết ruột sau.

**4. Làm mảnh dễ nhất trước.** Không phải mảnh quan trọng nhất — mảnh **dễ nhất**. Một hàm chạy được cho bạn đà và cho bạn một mốc đúng để đối chiếu.

## Dễ nhầm

**1. Tưởng phải thiết kế xong hết mới được viết code.** Không — bạn chỉ cần cắt đủ để có **mảnh đầu tiên**. Làm xong mảnh đó, hiểu biết của bạn về bài toán tăng lên, và những mảnh sau sẽ cắt chính xác hơn cách bạn cắt lúc chưa biết gì.

**2. Cắt theo *cách máy làm* thay vì theo *việc cần làm*.** Hai cách cắt cho ra hai kết quả rất khác:

```text
Cắt theo việc (tốt):    lọc → cộng → tìm lớn nhất → in
Cắt theo kỹ thuật (tệ): đọc file → parse → vòng lặp → format chuỗi
```

Cách thứ hai nghe kỹ thuật hơn nhưng khó đặt tên, khó test, và khi đề đổi thì phải cắt lại từ đầu.

**3. Cắt quá tay.** Một hàm ba dòng gọi một hàm hai dòng gọi một hàm một dòng cũng khó đọc như hàm 80 dòng — chỉ khó theo kiểu khác: bạn phải nhảy qua sáu file để hiểu một việc. Dấu hiệu dừng: **mỗi hàm nói được nó làm gì bằng một câu, không có chữ "và"**. Chi tiết ở [[truu-tuong-hoa-khi-nao-tach]].

**4. Cắt xong nhưng các mảnh vẫn dính nhau.** Nếu `congTheoKhach` cần biết `locTheoThang` đã chạy chưa, thì bạn chưa cắt — bạn chỉ vừa xuống dòng. Mảnh tốt là mảnh **nhận đầu vào, trả đầu ra**, không cần biết ai gọi nó và gọi lúc nào — xem [[ham-dau-vao-dau-ra-va-tac-dung-phu]].

## Mẹo nhớ

> **Không gỡ cả cuộn dây — tìm một đầu.**
>
> **Cách bạn làm tay chính là thuật toán.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao "bí" thường không phải vấn đề thiếu cú pháp?
2. Bước "làm tay một ví dụ nhỏ" cho bạn thứ gì mà đọc đề không cho?
3. Cắt theo *việc cần làm* khác cắt theo *kỹ thuật* ở chỗ nào?
4. Dấu hiệu nào cho biết bạn đã cắt quá nhỏ?
5. Vì sao nên làm mảnh **dễ nhất** trước chứ không phải mảnh quan trọng nhất?

## Tự viết lại

Không nhìn lại phần trên, cắt yêu cầu sau thành các bước, mỗi bước một dòng tiếng Việt, rồi viết khung hàm rỗng cho chúng:

> *"Cho một file văn bản, in ra 5 từ xuất hiện nhiều nhất, bỏ qua các từ nối như 'và', 'của', 'là'."*

Tự kiểm: mỗi bước của bạn có nói được bằng một câu **không chứa chữ "và"** không?

## Thử sức

Bạn nhận yêu cầu: *"Làm chức năng cho người dùng đổi mật khẩu."*

Nghe như một việc. Thử liệt kê **tất cả** những mảnh nhỏ ẩn trong đó — gợi ý: có ít nhất bảy mảnh, và ít nhất hai trong số đó không liên quan gì tới việc ghi mật khẩu mới vào cơ sở dữ liệu.
