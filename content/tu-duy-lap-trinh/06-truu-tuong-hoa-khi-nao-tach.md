---
title: Trừu tượng hoá — khi nào tách, khi nào đừng
slug: truu-tuong-hoa-khi-nao-tach
summary: Trừu tượng sai đắt hơn code lặp. Quy tắc ba lần, chi phí của một lớp gián tiếp, và cách nhận ra trừu tượng đang rò rỉ.
level: nang-cao
tags: [nen-tang, tu-duy, truu-tuong, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** biết dừng tay khi chưa đủ dữ kiện để tách, và nhận ra một trừu tượng đang hỏng trước khi nó kéo cả module theo.

## Ý tưởng chính

Trừu tượng hoá là **giấu chi tiết đi và chỉ để lộ ra thứ người dùng cần biết**. Một hàm là trừu tượng. Một class là trừu tượng. Một API là trừu tượng.

Điều ít ai nói: **mỗi trừu tượng đều có giá**, và trừu tượng sai đắt hơn code lặp rất nhiều. Câu hỏi thật sự không phải "tách hay không tách", mà là **"tôi đã biết đủ để tách chưa?"**

## Mental model

Hãy nghĩ tới cái **điều khiển TV**.

> Nút "tăng âm" giấu đi hàng nghìn thứ: tín hiệu hồng ngoại, mạch khuếch đại, loa. Bạn không cần biết gì trong số đó — và đó chính là giá trị của nó.
>
> Nhưng khi TV không lên tiếng, bạn buộc phải biết: pin điều khiển, hướng chỉ, cáp loa. **Lúc đó cái trừu tượng bị "rò rỉ"** — nó không giấu được nữa, và bạn phải hiểu cả hai tầng cùng lúc.

Trừu tượng tốt là cái điều khiển bạn dùng cả năm mà không cần mở ra. Trừu tượng tồi là cái điều khiển mà lần nào dùng cũng phải nhớ "bấm hơi mạnh và chỉ đúng góc" — nó bắt bạn gánh cả chi tiết *lẫn* lớp vỏ.

## Ví dụ nhỏ

```ts
// Ba chỗ trong dự án làm gần giống nhau
gui('a@x.com', 'Chào mừng', dungMauChaoMung(ten))
gui('b@x.com', 'Đặt lại mật khẩu', dungMauDatLai(token))
gui('c@x.com', 'Hoá đơn tháng 5', dungMauHoaDon(don))
```

Bạn nhìn thấy ba dòng giống nhau và tay ngứa muốn gộp thành `guiMail(loai, nguoiNhan, duLieu)`. Câu hỏi trước khi gộp: **ba dòng này giống nhau vì cùng bản chất, hay chỉ tình cờ trông giống?**

## Tại sao cần nó

Vì cái giá của trừu tượng sai không hiện ra ngay. Nó hiện ra ba tháng sau, dưới dạng thế này:

```ts
// Trừu tượng gộp vội, rồi bị vá dần theo từng ngoại lệ
function guiMail(loai, nguoiNhan, duLieu, opts = {}) {
  if (loai === 'hoa-don' && opts.kemPdf) { ... }
  if (loai === 'dat-lai' && !opts.boQuaHanChe) { ... }
  if (loai === 'chao-mung' && duLieu.laKhachVip) { ... }
}
```

Hàm này giờ **khó hơn** ba dòng gốc: muốn sửa mail hoá đơn, bạn phải đọc cả logic của hai loại mail không liên quan, và mỗi lần sửa đều có nguy cơ làm hỏng loại khác. Đây là dấu hiệu kinh điển: **trừu tượng gộp những thứ chỉ tình cờ giống nhau**.

Cái giá cụ thể của mỗi lớp trừu tượng, để cân nhắc cho tỉnh táo:

- **Một chỗ nữa phải nhảy tới** khi đọc code.
- **Một cái tên nữa phải đặt đúng** — đặt sai thì nó nói dối người đọc.
- **Một biên giới nữa phải giữ đúng** khi yêu cầu thay đổi.

Đổi lại bạn được: sửa một chỗ thay vì ba, và một cái tên diễn đạt được ý định. Đáng giá — **khi bạn đã biết cái gì thật sự chung**.

## So sánh

Hai kiểu "giống nhau", và phân biệt được chúng là toàn bộ kỹ năng ở bài này:

| | Giống bản chất | Giống ngẫu nhiên |
|---|---|---|
| Bản chất | Cùng một quy tắc nghiệp vụ | Tình cờ code trông giống |
| Khi yêu cầu đổi | **Cùng nhau** đổi | Đổi **rời nhau** |
| Ví dụ | Ba chỗ cùng tính thuế VAT | Ba form đều có "họ tên, email" |
| Nên | Tách thành một chỗ | **Để yên**, dù lặp |

Phép thử duy nhất đáng tin: **"nếu yêu cầu nghiệp vụ đổi, ba chỗ này có phải đổi cùng nhau không?"**

Cùng đổi ⇒ chúng thật sự là một thứ ⇒ tách. Đổi rời nhau ⇒ chúng là ba thứ khác nhau tình cờ trông giống ⇒ gộp lại là tự trói mình.

Form "họ tên, email" là ví dụ rõ nhất: chúng trông giống hệt nhau hôm nay, nhưng form đăng ký rồi sẽ cần xác minh email, còn form liên hệ thì không. Gộp sớm là chuẩn bị sẵn một mớ `if`.

## Dễ nhầm

**1. Áp DRY một cách máy móc.** "Đừng lặp lại chính mình" nói về **tri thức**, không phải về **ký tự**. Hai đoạn code giống hệt nhau nhưng thể hiện hai quy tắc nghiệp vụ khác nhau thì **không** vi phạm DRY.

**2. Tách ngay lần thứ hai.** Dùng **quy tắc ba lần**:

```text
Lần 1: viết thẳng
Lần 2: chép, và CHỊU ĐỰNG sự lặp
Lần 3: giờ mới tách
```

Lý do không nằm ở con số ba, mà ở dữ kiện: sau lần thứ ba bạn đã thấy **ba biến thể thật**, nên biết cái gì thật sự chung và cái gì chỉ là chi tiết. Tách ở lần hai là tách dựa trên một mẫu duy nhất — đoán mò.

**3. Tưởng trừu tượng rò rỉ là hiếm.** Nó ở khắp nơi, và bạn chỉ có thể *chọn* rò rỉ ít hay nhiều:

```ts
const ds = await db.nguoiDung.findMany({ include: { donHang: true } })
```

ORM hứa rằng bạn không cần biết SQL. Rồi trang chậm, và bạn phải biết truy vấn này sinh ra N+1 câu lệnh — tức phải hiểu cả tầng bên dưới. Đó là rò rỉ, và nó không tránh được: hiệu năng luôn rò qua mọi lớp vỏ. Xem [[index-va-hieu-nang-truy-van]].

Kết luận đúng không phải "đừng dùng ORM", mà là: **chọn trừu tượng có chỗ thoát hiểm** — cho phép viết SQL thô khi cần. Trừu tượng tệ nhất là loại không cho bạn xuống tầng dưới lúc bí.

**4. Bỏ qua các dấu hiệu trừu tượng đang hỏng.** Bốn dấu hiệu, gặp là phải xem lại:

- Hàm nhận **cờ boolean điều khiển luồng**: `xuLy(don, true)` — chữ `true` không nói gì, và nó thường có nghĩa hàm đang làm hai việc.
- Danh sách tham số **dài ra theo từng ngoại lệ**.
- Tên chung chung tới mức vô nghĩa: `Manager`, `Helper`, `Utils`, `xuLyDuLieu`.
- Sửa một chỗ dùng, **các chỗ dùng khác vỡ**.

Dấu hiệu cuối là nghiêm trọng nhất: nó nói rằng những chỗ dùng đó **không thật sự chung nhau** — chúng chỉ đang chia sẻ code.

**5. Tưởng gỡ bỏ trừu tượng là thất bại.** Khi phát hiện tách sai, cách sửa rẻ nhất thường là **nội tuyến lại** — chép code về từng chỗ dùng, rồi mới tách lại cho đúng. Nghe như lùi một bước, nhưng nó rẻ hơn nhiều so với vá tiếp. Chủ đề này ở [[no-ky-thuat-va-refactor]].

## Mẹo nhớ

> **Tách khi chúng phải đổi CÙNG NHAU, không phải khi chúng TRÔNG giống nhau.**
>
> **Code lặp rẻ hơn trừu tượng sai.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba cái giá phải trả cho mỗi lớp trừu tượng là gì?
2. Phép thử để phân biệt "giống bản chất" và "giống ngẫu nhiên"?
3. Vì sao quy tắc ba lần dùng số ba, chứ không phải hai?
4. "Trừu tượng rò rỉ" nghĩa là gì? Cho một ví dụ bạn từng gặp.
5. Vì sao "sửa một chỗ dùng làm chỗ khác vỡ" là dấu hiệu nghiêm trọng?

## Tự viết lại

Không nhìn lại phần trên, xét ba đoạn code sau và quyết định **tách hay để yên**, kèm lý do:

```text
a) Ba màn hình đều có đoạn kiểm tra "người dùng đã đăng nhập chưa"
b) Ba báo cáo đều bắt đầu bằng "lấy dữ liệu 30 ngày gần nhất"
c) Ba form đều có ô "họ tên" và "số điện thoại" với cùng kiểu kiểm tra
```

Với mỗi đoạn, đặt đúng một câu hỏi trước khi trả lời — câu hỏi nào?

## Thử sức

Bạn thấy đoạn này trong dự án:

```ts
function xuLy(duLieu, laXuatFile = false, boQuaLoi = false, dinhDang = 'json') {
  ...
}
```

Có bao nhiêu dấu hiệu hỏng trong đúng một dòng chữ ký này? Và nếu phải sửa, bạn tách nó thành mấy hàm — dựa trên tiêu chí nào chứ không phải cảm giác?
