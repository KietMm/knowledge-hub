---
title: Đủ tốt và hoàn hảo
slug: du-tot-va-hoan-hao
summary: Định nghĩa "xong" trước khi bắt đầu, và ba chỗ hoàn hảo là cần thiết.
level: trung-cap
tags: [tu-duy, chat-luong, dan-dat, danh-doi]
khung: v2
---

> **Sau bài này bạn sẽ:** định nghĩa "đủ tốt" trước khi bắt đầu, và biết ba chỗ không được thoả hiệp.

## Ý tưởng chính

Không có tiêu chí "xong", bạn sẽ **tối ưu mãi** — hoặc dừng ở một chỗ ngẫu nhiên.

Và "đủ tốt" không phải "kém". Nó là một **quyết định có chủ đích** về mức chất lượng phù hợp với việc này, ở chỗ này.

Điểm khó: mức đó **khác nhau theo từng phần của hệ thống** — và người ta thường áp một mức cho tất cả.

## Mental model

Hãy nghĩ tới **hoàn thiện một căn nhà**.

> **Móng và hệ thống điện**: làm đúng chuẩn, không thoả hiệp. Sai thì đập ra làm lại, hoặc gây tai nạn.
>
> **Tường phòng khách**: sơn cẩn thận, khách sẽ nhìn.
>
> **Bên trong tủ quần áo**: sơn một lớp là đủ. Không ai nhìn, và sơn ba lớp không mang lại gì.
>
> Người thợ giỏi không sơn mọi bề mặt như nhau. Họ biết chỗ nào quan trọng.

Và điểm quan trọng: **họ biết trước khi bắt đầu**, không phải quyết định giữa lúc sơn.

## Ví dụ nhỏ

```text
Cùng một hệ thống, ba mức khác nhau:
  luồng thanh toán       → không thoả hiệp
  trang danh sách        → đúng, đủ nhanh, test ca chính
  script chạy một lần    → chạy được là xong, không cần test
```

## Code chạy thế nào

**Định nghĩa "xong" — bốn câu trả lời trước khi bắt đầu:**

```text
① CHỨC NĂNG: những ca nào phải chạy đúng?
   Và ca nào KHÔNG cần xử lý ở phiên bản này?

② CHẤT LƯỢNG: test tới mức nào, xử lý lỗi tới mức nào?

③ HIỆU NĂNG: có yêu cầu bằng số không? Nếu không, "đủ nhanh"
   nghĩa là gì?

④ CÁI GÌ KHÔNG LÀM: ghi ra rõ ràng.
   ⇒ Câu này quan trọng nhất và hay bị bỏ: nó ngăn phạm vi
     phình ra trong lúc làm.
```

**Ba chỗ không thoả hiệp:**

```text
① TÍNH ĐÚNG ĐẮN ở chỗ dữ liệu quan trọng
   Tính sai tiền, mất dữ liệu, sai số lượng tồn kho.
   ⇒ Đây không phải "chất lượng cao", nó là yêu cầu tối thiểu.

② BẢO MẬT VÀ PHÂN QUYỀN
   Không có "phiên bản đầu chưa kiểm quyền"
   ([[phan-quyen-theo-ban-ghi]]).

③ THỨ KHÓ SỬA SAU
   Mô hình dữ liệu, định dạng API công khai, ranh giới module.
   ⇒ Cắt vào đây không phải tiết kiệm — nó là tạo ra một dự án
     di chuyển ([[ra-quyet-dinh-ky-thuat]]).
```

```text
Ngoài ba chỗ này, gần như mọi thứ đều thương lượng được:
  giao diện, hiệu năng chưa là vấn đề, ca biên hiếm,
  tự động hoá phần vận hành, độ phủ test ở phần ít rủi ro.
```

## Cú pháp

**Ba dấu hiệu bạn đang tối ưu quá mức:**

```text
① Tối ưu thứ chưa đo là điểm nghẽn
   ⇒ "Cái này có thể chậm" ⇒ đo trước
     ([[hieu-nang-va-do-luong]])

② Xử lý ca chưa bao giờ xảy ra và không có lý do sẽ xảy ra
   ⇒ "Nếu người dùng nhập 10.000 dòng thì sao?" — có ai làm thế
     không? Có giới hạn nào chặn chưa?

③ Trừu tượng hoá cho nhu cầu tương lai
   ⇒ Nhu cầu tương lai khi đến thường có hình dạng khác
     ([[truu-tuong-hoa-khi-nao-tach]])
```

**Ba dấu hiệu bạn đang làm quá sơ sài:**

```text
① Không biết ca nào chưa xử lý
   ⇒ "Chắc ổn" khác "tôi đã xét và quyết định không xử lý ca X".
   ⇒ Khác biệt là: cái sau bạn ghi lại được, và người sau biết.

② Bỏ qua ba chỗ không thoả hiệp

③ Không nói ra những gì đã cắt
   ⇒ Cắt có chủ đích và nói ra ≠ cắt vì quên.
```

**"Đủ tốt" phải nói ra, không để ngầm hiểu:**

```text
❌ Làm xong, không ai biết bạn đã cắt gì.
   ⇒ Người sau gặp ca không xử lý ⇒ coi là bug ⇒ mất thời gian
     điều tra một thứ vốn là quyết định.

✅ Ghi rõ trong PR hoặc trong mã:
   "Phiên bản này chỉ hỗ trợ một loại khuyến mãi. Kết hợp nhiều
    loại chưa xử lý — xem #1234."

⇒ Một dòng này tiết kiệm nhiều giờ cho người sau, và nó biến
  một khoảng trống thành một quyết định đã biết.
```

**Chất lượng theo vùng — cách áp dụng thực tế:**

```text
Chia hệ thống thành ba vùng, quyết định MỘT LẦN:

  LÕI      luồng ra tiền, dữ liệu quan trọng, bảo mật
           ⇒ test kỹ, review kỹ, không thoả hiệp
  THƯỜNG   phần lớn tính năng
           ⇒ test ca chính và ca biên quan trọng
  NGOẠI VI công cụ nội bộ, script, trang quản trị ít dùng
           ⇒ chạy được, test tối thiểu

⇒ Quyết định một lần rồi áp dụng, thay vì cân nhắc lại mỗi lần.
⇒ Và nó cho người mới biết nên cẩn thận ở đâu.
```

## Tại sao cần nó

Vì cả hai hướng sai đều tốn kém, và chúng tốn theo cách khác nhau:

```text
QUÁ HOÀN HẢO:
  Việc một tuần thành ba tuần.
  Mã phức tạp hơn cần thiết ⇒ người sau khó đọc.
  Và những thứ bạn chuẩn bị cho tương lai thường không dùng.
  ⇒ Chi phí thấy được ngay, nhưng ít ai gọi nó là vấn đề.

QUÁ SƠ SÀI:
  Sự cố, mất dữ liệu, hoặc nợ phải trả với lãi cao.
  ⇒ Chi phí đến sau, và thường lớn hơn.
```

**Và một điều về việc nhận ra mình đang ở đâu:**

```text
Người mới thường sơ sài vì chưa biết cái gì quan trọng.
Người có kinh nghiệm thường hoàn hảo quá mức vì ĐÃ TỪNG bị
lỗi ở đâu đó — và họ mang bài học đó áp vào mọi chỗ.

⇒ Bài học đúng nhưng phạm vi sai.
⇒ Cách chữa: chia vùng chất lượng, và áp bài học vào đúng vùng.
```

**Câu hỏi tự kiểm khi thấy mình đang tinh chỉnh:**

```text
"Việc tôi đang làm bây giờ có ai để ý không, và nếu bỏ nó thì
 chuyện gì xảy ra?"

  Không ai để ý, không có gì xảy ra ⇒ dừng.
  Có người để ý, hoặc có rủi ro thật ⇒ tiếp.

⇒ Câu này đơn giản nhưng nó cắt được phần lớn việc tối ưu
  quá mức.
```

## So sánh

| Vùng | Mức chất lượng | Test | Review |
|---|---|---|---|
| Lõi (tiền, dữ liệu, bảo mật) | không thoả hiệp | kỹ, có ca biên | kỹ |
| Thường | đúng, đủ nhanh | ca chính + ca biên quan trọng | bình thường |
| Ngoại vi | chạy được | tối thiểu | nhẹ |

## Dễ nhầm

**1. Không định nghĩa "xong" trước khi bắt đầu.**

**2. Không ghi ra "cái gì không làm".** Phạm vi phình trong lúc làm.

**3. Áp một mức chất lượng cho cả hệ thống.**

**4. Cắt vào ba chỗ không thoả hiệp.**

**5. Tối ưu thứ chưa đo là điểm nghẽn.**

**6. Xử lý ca chưa bao giờ xảy ra.**

**7. Trừu tượng hoá cho nhu cầu tương lai.**

**8. Không nói ra những gì đã cắt.** Người sau coi là bug.

**9. "Chắc ổn" thay vì "tôi đã xét và quyết định".**

**10. Mang một bài học cũ áp vào mọi chỗ.**

## Mẹo nhớ

> **Định nghĩa "XONG" trước khi bắt đầu — gồm cả "CÁI GÌ KHÔNG LÀM".**
>
> **Ba chỗ không thoả hiệp: TÍNH ĐÚNG ĐẮN, BẢO MẬT, THỨ KHÓ SỬA SAU.**
>
> **Cắt có chủ đích và NÓI RA ≠ cắt vì quên.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn câu trả lời trước khi bắt đầu, câu nào hay bị bỏ?
2. Ba chỗ không thoả hiệp?
3. Ba dấu hiệu tối ưu quá mức, ba dấu hiệu quá sơ sài?
4. Ba vùng chất lượng và mức tương ứng?
5. Câu hỏi tự kiểm khi đang tinh chỉnh?

## Tự viết lại

Việc: *"Trang quản trị nội bộ cho phép admin sửa thông tin khách hàng."* Dùng bởi 3 người, vài lần mỗi tuần.

Không nhìn lại, viết:

```text
① định nghĩa "xong", đủ bốn câu
② vùng chất lượng bạn xếp nó vào
③ ba thứ bạn KHÔNG làm, và ghi lại thế nào
④ ba thứ bạn KHÔNG cắt dù nó là trang nội bộ
```

Tự kiểm: ở ④, "trang nội bộ, chỉ 3 người dùng" có phải lý do để bỏ kiểm quyền không — và vì sao?

## Thử sức

Đồng nghiệp làm một việc ước lượng hai ngày, đã sang ngày thứ sáu. Mã rất kỹ: có ba lớp trừu tượng, xử lý mọi ca biên, và một hệ thống cấu hình cho những thứ có thể đổi.

Ba câu để trả lời: bạn nói chuyện với họ thế nào mà không làm họ cảm thấy công sức bị coi nhẹ; bạn giúp họ quyết định giữ gì bỏ gì bằng tiêu chí nào; và bạn ngăn tình huống này lặp lại ra sao. Câu khó nhất: nếu phần "xử lý mọi ca biên" của họ hoá ra bắt được một ca **thật sự có thể xảy ra** và gây mất dữ liệu, điều đó đổi đánh giá của bạn ra sao?
