---
title: Làm việc với người làm sản phẩm
slug: lam-viec-voi-nguoi-lam-san-pham
summary: Bạn có thông tin họ không có, và ngược lại — cách đưa thông tin đó vào cuộc bàn cho hữu ích.
level: nang-cao
tags: [san-pham, giao-tiep, dan-dat, tu-duy]
khung: v2
---

> **Sau bài này bạn sẽ:** đưa thông tin kỹ thuật vào quyết định sản phẩm theo cách hữu ích, và biết ranh giới của mỗi bên.

## Ý tưởng chính

Người làm sản phẩm và người làm kỹ thuật **có hai bộ thông tin không giao nhau**.

Họ biết: khách hàng nói gì, thị trường ra sao, cái gì quan trọng với công ty.
Bạn biết: cái gì đắt, cái gì rẻ, cái gì rủi ro, cái gì sẽ khó sửa sau này.

Quyết định tốt cần cả hai bộ. Nên việc của bạn không phải "làm theo" hay "phản đối" — mà là **đưa bộ thông tin của mình lên bàn**.

## Mental model

Hãy nghĩ tới **kiến trúc sư và chủ nhà**.

> Chủ nhà biết: gia đình mấy người, ngân sách bao nhiêu, thích không gian thế nào, và họ sẽ sống trong đó.
>
> Kiến trúc sư biết: cột này bỏ được không, mở cửa sổ chỗ đó thì mùa hè nóng, và cái ban công kia đắt gấp ba lần chủ nhà nghĩ.
>
> **Kiến trúc sư không quyết định gia đình cần mấy phòng.** Chủ nhà không quyết định cột chịu lực đặt đâu.
>
> Và cách tệ nhất: kiến trúc sư nói "không làm được" mà không giải thích, hoặc chủ nhà vẽ bản thiết kế rồi bảo cứ thế mà xây.

Hai vế cuối là hai kiểu quan hệ không hoạt động. Kiểu hoạt động: mỗi bên đưa thông tin của mình, và người có trách nhiệm quyết định.

## Ví dụ nhỏ

```text
❌ "Cái đó không làm được."
❌ "Cái đó cần ba tháng."          ← đúng nhưng không giúp gì

✅ "Cách bạn mô tả thì khoảng ba tháng, phần lớn là do phải
    đồng bộ với hệ thống kho. Nếu chấp nhận dữ liệu trễ 15 phút
    thì còn hai tuần. Trễ 15 phút có ảnh hưởng gì không?"
```

## Code chạy thế nào

**Bốn loại thông tin chỉ bạn có:**

```text
① CHI PHÍ TƯƠNG ĐỐI
   "Cách A một tuần, cách B ba ngày, và B đáp ứng 90% nhu cầu."
   ⇒ Đây là thông tin có giá trị nhất bạn đưa được, và họ
     KHÔNG CÓ CÁCH NÀO tự biết.

② RỦI RO
   "Việc này chạm vào luồng thanh toán. Nếu hỏng thì hỏng ở
    chỗ ra tiền."

③ CHI PHÍ LÂU DÀI
   "Cách này nhanh hơn hai tuần, nhưng nó khoá chúng ta vào
    một mô hình dữ liệu khó đổi. Nếu năm sau cần đa tiền tệ
    thì phải làm lại."
   ⇒ Loại thông tin hay bị bỏ nhất, và đắt nhất khi bỏ
     ([[ra-quyet-dinh-ky-thuat]]).

④ CÁI GÌ ĐANG CÓ SẴN
   "Chúng ta đã có 80% việc này rồi, chỉ cần thêm một trang."
   ⇒ Thường mở ra những lựa chọn họ không biết là có.
```

**Cách đưa thông tin — ba nguyên tắc:**

```text
① NÓI BẰNG ĐÁNH ĐỔI, không nói bằng phán quyết
   ❌ "Không nên làm."
   ✅ "Làm được, mất X, và đánh đổi là Y. Bạn thấy Y có chấp
       nhận được không?"

② ĐƯA ÍT NHẤT HAI LỰA CHỌN
   Một lựa chọn là một phán quyết. Hai lựa chọn là một cuộc bàn.
   ⇒ Và luôn có lựa chọn "làm phiên bản hẹp trước"
     ([[cat-pham-vi-va-uu-tien]]).

③ NÓI SỚM
   Rủi ro nói ra sau khi đã cam kết với khách hàng thì vô dụng.
   ⇒ Thời điểm quan trọng hơn cách diễn đạt.
```

## Cú pháp

**Ranh giới — ai quyết định gì:**

```text
HỌ quyết định:
  □ Làm gì trước, làm gì sau
  □ Cái gì quan trọng với khách hàng và với công ty
  □ Chấp nhận đánh đổi nào (sau khi biết đánh đổi là gì)

BẠN quyết định:
  □ Làm THẾ NÀO
  □ Kiến trúc, mô hình dữ liệu, công nghệ
  □ Chất lượng tối thiểu không thương lượng
    (tính đúng đắn, bảo mật, khả năng sửa sau)

⇒ Ranh giới rõ thì không có tranh chấp. Mờ thì có.
```

```text
Và điểm quan trọng nhất về ranh giới:
  Họ có thể quyết định LÀM GÌ.
  Họ KHÔNG quyết định được rằng một thứ mất ba tháng sẽ mất
  hai tuần.
⇒ Ước lượng là thông tin, không phải mục tiêu để thương lượng
  ([[uoc-luong-va-pham-vi]]).
```

**Ba tình huống khó và cách xử lý:**

```text
① "Cứ làm nhanh hơn đi"
   ⇒ Chuyển sang phạm vi: "Trong thời gian đó mình làm được
     A và B, chưa có C. Hay bạn muốn C trước và lùi B?"
   ⇒ Đừng nhận một cam kết bạn biết không đạt được.

② Yêu cầu liên tục đổi
   ⇒ Đây có thể là dấu hiệu vấn đề chưa rõ, không phải người
     yêu cầu thiếu kỷ luật.
   ⇒ Đề xuất: bàn về VẤN ĐỀ một lần cho kỹ, thay vì bàn
     giải pháp nhiều lần ([[hieu-vi-sao-truoc-khi-lam-gi]]).

③ Nợ kỹ thuật không được ưu tiên
   ⇒ Đừng xin "thời gian refactor". Nói bằng số:
     "Mỗi tính năng liên quan tới thanh toán mất gấp 6 lần
      bình thường và gây 40% sự cố. Một tuần dọn dẹp hoà vốn
      trong quý này."
   ⇒ Biến nó thành một phép tính, không phải một lời xin phép
     ([[no-ky-thuat-va-refactor]]).
```

**Xây dựng quan hệ dài hạn — ba việc:**

```text
□ GIỮ LỜI về ước lượng
  Ước lượng đúng vài lần ⇒ lần sau họ tin con số của bạn.
  Ước lượng sai nhiều lần ⇒ họ tự nhân đôi mọi con số bạn nói,
  và bạn mất khả năng thương lượng.

□ NÓI KHÔNG SỚM và có lý do
  Nói không muộn tệ hơn nói không sớm.

□ CHỦ ĐỘNG ĐƯA ĐỀ XUẤT, không chỉ phản hồi yêu cầu
  "Mình thấy 30% người dùng bỏ ở bước này. Có thể sửa trong
   hai ngày. Bạn thấy đáng làm không?"
  ⇒ Đây là việc chuyển bạn từ người thực hiện sang người
    tham gia quyết định — và nó cần bạn hiểu người dùng
    ([[nguoi-dung-va-luong-cong-viec]]).
```

## Tại sao cần nó

Vì quyết định sản phẩm thiếu thông tin kỹ thuật dẫn tới hai kiểu sai:

```text
Thiếu thông tin CHI PHÍ:
  Họ chọn cách đắt gấp năm trong khi có cách rẻ hơn đáp ứng
  90% nhu cầu — vì không ai nói với họ.

Thiếu thông tin CHI PHÍ LÂU DÀI:
  Họ chọn cách nhanh, và hai năm sau cả đội trả giá — và lúc đó
  không ai nhớ quyết định nào dẫn tới đây.
```

**Và một điều về vai của bạn:**

```text
Không đưa thông tin lên bàn rồi phàn nàn về quyết định là
cách làm việc tệ nhất.

⇒ Nếu bạn biết một rủi ro và không nói, quyết định sai đó
  một phần là của bạn.
⇒ Nếu bạn nói rõ và họ vẫn chọn khác, đó là quyết định của họ —
  và bạn làm cho nó thành công ([[ra-quyet-dinh-ky-thuat]]).
```

**Ba câu hỏi tự kiểm sau mỗi cuộc bàn:**

```text
① Mình đã nói ra chi phí và đánh đổi chưa?
② Mình đã đưa ít nhất hai lựa chọn chưa?
③ Nếu quyết định này sai sau sáu tháng, mình đã cảnh báo chưa?
```

## So sánh

| | Chỉ làm theo | Chỉ phản đối | Đưa thông tin lên bàn |
|---|---|---|---|
| Quyết định có đủ thông tin | ❌ | ❌ | ✅ |
| Quan hệ | thụ động | đối đầu | cộng tác |
| Bạn ảnh hưởng được | ❌ | ít | ✅ |
| Ai chịu trách nhiệm quyết định | họ | không rõ | họ, có đủ thông tin |

## Dễ nhầm

**1. Nói "không làm được" mà không giải thích.**

**2. Nói ước lượng mà không nói lựa chọn thay thế.**

**3. Đưa một lựa chọn duy nhất.** Đó là phán quyết.

**4. Nói rủi ro sau khi đã cam kết với khách hàng.**

**5. Không nói chi phí lâu dài.** Loại thông tin đắt nhất khi bỏ.

**6. Coi ước lượng là con số để thương lượng.**

**7. Nhận cam kết mình biết không đạt được.**

**8. Xin "thời gian refactor" thay vì nói bằng số.**

**9. Chỉ phản hồi yêu cầu, không chủ động đề xuất.**

**10. Biết rủi ro mà không nói, rồi phàn nàn về quyết định.**

## Mẹo nhớ

> **Họ quyết định LÀM GÌ. Bạn quyết định LÀM THẾ NÀO. Ước lượng là THÔNG TIN, không phải mục tiêu thương lượng.**
>
> **Một lựa chọn là PHÁN QUYẾT. Hai lựa chọn là CUỘC BÀN.**
>
> **Biết rủi ro mà không nói thì quyết định sai đó một phần là của bạn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn loại thông tin chỉ bạn có, loại nào hay bị bỏ nhất?
2. Ba nguyên tắc khi đưa thông tin?
3. Ranh giới: ai quyết định gì?
4. Ba tình huống khó và cách xử lý?
5. Ba câu hỏi tự kiểm sau mỗi cuộc bàn?

## Tự viết lại

Yêu cầu: *"Thêm tính năng đồng bộ dữ liệu với hệ thống của đối tác, cần xong trong ba tuần."* Bạn ước lượng bảy tuần, và cách làm nhanh sẽ khoá vào một mô hình dữ liệu khó đổi.

Không nhìn lại, viết:

```text
① thông tin bạn cần đưa lên bàn
② hai đến ba lựa chọn, kèm chi phí và đánh đổi
③ cách bạn nói về chi phí lâu dài
④ điều gì bạn không thương lượng
```

Tự kiểm: ở ④, bạn nêu được ranh giới nào — và bạn giải thích vì sao nó là ranh giới chứ không phải sở thích?

## Thử sức

Người làm sản phẩm đã cam kết với khách hàng lớn rằng một tính năng sẽ xong trong bốn tuần, **trước khi** hỏi đội. Bạn ước lượng mười tuần.

Ba câu để trả lời: bạn phản ứng thế nào ngay bây giờ; bạn đề xuất gì để cứu tình hình; và bạn làm gì để lần sau việc cam kết trước khi hỏi không xảy ra nữa. Câu khó nhất: cam kết đã đưa ra với khách hàng — trong ba việc bạn có thể làm (cắt phạm vi, thêm người, lùi hạn), cái nào thật sự khả thi và cái nào chỉ nghe khả thi?
