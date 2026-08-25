---
title: Kết dính cao, liên kết lỏng
slug: ket-dinh-cao-lien-ket-long
summary: Hai thước đo nằm dưới gần như mọi lời khuyên thiết kế khác. Hiểu chúng thì SOLID và mẫu thiết kế thành hệ quả, không phải luật cần thuộc.
level: co-ban
tags: [nen-tang, thiet-ke, cohesion, coupling]
khung: v2
---

> **Sau bài này bạn sẽ:** đánh giá được một thiết kế bằng hai câu hỏi thay vì bằng cảm giác, và hiểu vì sao SOLID chỉ là hệ quả của hai câu hỏi đó.

## Ý tưởng chính

Gần như mọi lời khuyên thiết kế bạn từng nghe đều quy về hai thước đo:

```text
Kết dính (cohesion)  →  Những thứ TRONG một module có thuộc về nhau không?
Liên kết (coupling)  →  Module này phụ thuộc bao nhiêu vào module khác?
```

Mục tiêu luôn là **kết dính cao, liên kết lỏng**. Hiểu hai câu này thì SOLID, mẫu thiết kế, kiến trúc nhiều tầng đều trở thành **hệ quả** — không phải luật phải học thuộc.

## Mental model

Hãy nghĩ tới cách sắp xếp một căn bếp.

> **Kết dính cao** là ngăn kéo đựng **toàn đồ làm bánh**: bột, men, khuôn, cân. Mở một ngăn là làm được cả việc.
>
> **Kết dính thấp** là ngăn kéo "linh tinh": kéo, pin, dây sạc, hoá đơn cũ. Ai cũng có ngăn đó, và ai cũng ghét nó.
>
> **Liên kết lỏng** là cái nồi — dùng được trên bếp ga, bếp từ, bếp củi.
>
> **Liên kết chặt** là cái nồi chỉ vừa **đúng một cái bếp**. Đổi bếp là phải mua nồi mới.

Ngăn kéo linh tinh không sai về chức năng — mọi thứ vẫn ở trong đó. Nó chỉ khiến bạn phải lục cả ngăn mỗi lần cần một món.

## Ví dụ nhỏ

```ts
// ❌ Kết dính thấp: một lớp làm bốn việc chẳng liên quan gì nhau
class NguoiDungService {
  taoNguoiDung() {}
  guiEmailChaoMung() {}
  xuatBaoCaoExcel() {}
  saoLuuCoSoDuLieu() {}   // ← cái này làm gì ở đây?
}
```

```ts
// ❌ Liên kết chặt: hàm này dính cứng vào một nhà cung cấp cụ thể
import { SendGrid } from 'sendgrid'
function dangKy(email) {
  new SendGrid(process.env.KEY).send({ to: email, template: 'welcome' })
}
```

Lớp thứ nhất: sửa logic sao lưu thì phải mở file người dùng. Hàm thứ hai: đổi nhà cung cấp email thì phải sửa mọi chỗ gọi, và **không test được** nếu không thật sự gửi mail.

## Code chạy thế nào

Gỡ liên kết chặt không phải là thêm tầng cho sang — nó đổi hẳn thứ mà `dangKy` **phụ thuộc vào**:

```text
TRƯỚC:  dangKy ──phụ thuộc──► SendGrid (một thư viện cụ thể)

        muốn test → phải có API key thật, và mail thật được gửi đi
        đổi nhà cung cấp → sửa dangKy

SAU:    dangKy ──phụ thuộc──► "thứ gì đó có hàm .gui()"
                                      ▲              ▲
                              SendGrid            GiaLapEmail
                              (chạy thật)         (lúc test)

        test → truyền bản giả vào, không gửi gì cả
        đổi nhà cung cấp → viết lớp mới, dangKy không đổi một chữ
```

```ts
function dangKy(email, boGuiMail) {
  boGuiMail.gui(email, 'chao-mung')
}
```

Một tham số thêm vào, và `dangKy` chuyển từ *"tôi biết dùng SendGrid"* sang *"tôi cần ai đó biết gửi mail"*. Đó là toàn bộ nội dung của chữ **D** trong SOLID — xem [[solid-giai-thich-bang-code-that]].

## Tại sao cần nó

Vì hai thước đo này quyết định **chi phí của mọi thay đổi sau này**:

| | Kết dính cao, liên kết lỏng | Kết dính thấp, liên kết chặt |
|---|---|---|
| Sửa một tính năng | Mở một chỗ | Mở năm chỗ, sợ sót |
| Viết test | Truyền bản giả vào là xong | Phải dựng cả hệ thống |
| Người mới vào dự án | Đọc một module là hiểu một việc | Phải hiểu cả cây phụ thuộc |
| Xoá tính năng cũ | Xoá một thư mục | Không ai dám xoá |
| Chia việc cho nhiều người | Mỗi người một module | Ai cũng đụng vào cùng file |

Dòng cuối là chỗ đau nhất trong đội nhiều người: liên kết chặt biến mọi thay đổi thành một cuộc thương lượng.

Và đây cũng là lý do test khó viết là **tín hiệu thiết kế**, không phải vấn đề của test: nếu phải dựng cả cơ sở dữ liệu chỉ để kiểm một phép tính, thứ cần sửa là thiết kế chứ không phải bộ test — xem [[test-double-stub-mock-fake]].

## So sánh

Các mức liên kết, từ tệ nhất tới tốt nhất:

| Mức | Nghĩa là | Ví dụ |
|---|---|---|
| Liên kết nội dung | A thò tay vào ruột B | Sửa thẳng thuộc tính private của object khác |
| Liên kết chung | Cùng dùng một biến toàn cục | Hai module cùng đọc/ghi `global.config` |
| Liên kết điều khiển | A truyền cờ bảo B làm gì | `xuLy(don, true)` |
| Liên kết dữ liệu | A truyền đúng dữ liệu B cần | `tinhThue(gia, thueSuat)` ✅ |
| Liên kết qua giao diện | A chỉ biết một hợp đồng | `dangKy(email, boGuiMail)` ✅ |

Hai mức cuối là chỗ nên tới. Mức "liên kết điều khiển" đáng nhớ vì nó rất hay gặp: một tham số boolean điều khiển luồng gần như luôn có nghĩa là **hàm đang làm hai việc**, và tách ra thì cả hai đều rõ hơn.

## Dễ nhầm

**1. Tưởng liên kết lỏng nghĩa là thêm càng nhiều tầng càng tốt.** Hai thước đo này **kéo ngược nhau**: tách mạnh để giảm liên kết thì bạn có nhiều mảnh nhỏ, mỗi mảnh phải nói chuyện với nhiều mảnh khác — và liên kết tổng thể lại tăng. Điểm cân bằng là **module đủ lớn để tự làm trọn một việc**, đủ nhỏ để nói được nó làm gì bằng một câu.

**2. Tưởng interface là thuốc chữa bách bệnh.** Tạo interface cho thứ **chỉ có một bản cài đặt và sẽ mãi như vậy** là thêm một lớp gián tiếp không mua được gì. Interface đáng giá khi có (hoặc chắc chắn sẽ có) nhiều bản cài đặt, hoặc khi bạn cần thay bằng bản giả lúc test.

**3. Nhầm "cùng chủ đề" với "kết dính".** Một file `utils.ts` chứa mọi hàm liên quan tới chuỗi vẫn là ngăn kéo linh tinh nếu các hàm đó không bao giờ đổi cùng nhau. Phép thử tốt hơn: **những thứ này có thay đổi vì cùng một lý do không?**

**4. Bỏ qua liên kết ẩn.** Hai module không `import` nhau vẫn có thể dính chặt: cùng đọc một bảng cơ sở dữ liệu, cùng phụ thuộc thứ tự chạy, cùng ngầm hiểu một định dạng chuỗi. Loại liên kết này nguy hiểm hơn vì không có mũi tên nào để nhìn thấy.

## Mẹo nhớ

> **Ngăn kéo đồ làm bánh, không phải ngăn kéo linh tinh.**
>
> **Cái nồi dùng được trên mọi bếp.**
>
> **Test khó viết = thiết kế đang kêu cứu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Kết dính và liên kết đo hai thứ khác nhau — mỗi cái đo cái gì?
2. Vì sao "test khó viết" là tín hiệu thiết kế chứ không phải vấn đề của test?
3. Vì sao tham số boolean điều khiển luồng là mùi liên kết xấu?
4. Hai thước đo này kéo ngược nhau ở chỗ nào?
5. Cho một ví dụ về **liên kết ẩn** — hai module dính nhau mà không `import` nhau.

## Tự viết lại

Không nhìn lại phần trên, tách lớp này sao cho mỗi phần có một lý do thay đổi:

```ts
class DonHang {
  tinhTong() {}
  luuVaoDatabase() {}
  xuatHoaDonPDF() {}
  guiMailXacNhan() {}
}
```

Tự kiểm: bạn tách thành mấy phần, và với mỗi phần hãy nói **ai là người yêu cầu thay đổi nó** — kế toán, kỹ thuật, hay marketing?

## Thử sức

Hai module `BaoCao` và `HoaDon` không hề `import` nhau. Nhưng khi bạn đổi định dạng cột `ngay_tao` trong cơ sở dữ liệu từ chuỗi sang timestamp, **cả hai đều vỡ**.

Chúng có liên kết chặt không? Nếu có thì liên kết qua cái gì, và bạn làm thế nào để lần sau đổi kiểu cột chỉ phải sửa **một** chỗ?
