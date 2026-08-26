---
title: Giải quyết vấn đề có phương pháp
slug: giai-quyet-van-de-co-phuong-phap
summary: Định nghĩa vấn đề trước, chia nhỏ, và ba câu hỏi phá bế tắc.
level: co-ban
tags: [tu-duy, phuong-phap, dan-dat]
khung: v2
---

> **Sau bài này bạn sẽ:** có một quy trình cố định khi gặp vấn đề lớn, và ba cách phá bế tắc.

## Ý tưởng chính

Phần lớn thời gian mất khi giải một vấn đề khó không nằm ở việc **giải** — nó nằm ở việc **giải sai vấn đề**.

Nên bước đầu tiên luôn là: **viết ra vấn đề là gì**, cụ thể tới mức bạn biết khi nào đã xong.

## Mental model

Hãy nghĩ tới **hỏi đường khi bị lạc**.

> "Tôi bị lạc, chỉ đường cho tôi với." — không ai giúp được. Lạc từ đâu? Đi tới đâu?
>
> "Tôi đang ở đây, cần tới ga tàu, đi bộ." — giờ thì trả lời được.
>
> Và có một tình huống nữa: bạn tưởng mình cần tới ga tàu, nhưng thật ra bạn cần **về nhà** — và có xe buýt đi thẳng.

Ba thứ: **điểm bắt đầu**, **điểm đến**, và **kiểm lại xem điểm đến có đúng không**. Bỏ bước thứ ba là cách phổ biến nhất để giải rất giỏi một bài toán không cần giải.

## Ví dụ nhỏ

```text
❌ "Hệ thống chậm, cần tối ưu."
✅ "Trang danh sách đơn hàng mất 4,2 giây ở p95. Mục tiêu
    dưới 1 giây. Ảnh hưởng: 200 nhân viên dùng 50 lần/ngày."
```

## Code chạy thế nào

**Năm bước:**

```text
① VIẾT RA VẤN ĐỀ, cụ thể
   Hiện trạng (có số), mục tiêu (có số), ai bị ảnh hưởng.
   ⇒ Không viết ra được bằng số ⇒ bạn chưa hiểu vấn đề.

② KIỂM XEM ĐÂY CÓ PHẢI VẤN ĐỀ ĐÚNG
   "Nếu giải xong cái này, chuyện gì thật sự khác đi?"
   ⇒ Bước hay bị bỏ, và bỏ nó là cách tốn nhiều thời gian nhất
     ([[hieu-vi-sao-truoc-khi-lam-gi]]).

③ CHIA NHỎ
   Vấn đề lớn thành các phần độc lập, mỗi phần giải được riêng.

④ GIẢI PHẦN RỦI RO NHẤT TRƯỚC
   Không phải phần dễ nhất. Phần mà nếu nó không giải được
   thì cả kế hoạch sai.

⑤ KIỂM LẠI BẰNG SỐ Ở ①
```

**Vì sao bước ④ ngược trực giác:**

```text
Bản năng: làm phần dễ trước để có tiến triển.
Vấn đề: nếu phần khó nhất hoá ra không giải được, bạn vừa
        làm xong ba phần vô ích.

⇒ Làm phần rủi ro nhất trước = BIẾT SỚM mình có đi được đường này
  không.
⇒ Và nếu nó không đi được, bạn còn thời gian đổi hướng.
```

**Chia nhỏ — hai cách, và cách nào tốt hơn:**

```text
CHIA THEO BƯỚC (tuần tự)
  Bước 1 → 2 → 3. Phải xong bước trước.
  ⇒ Không giao được gì tới khi xong hết.

CHIA THEO GIÁ TRỊ (song song được)
  Mỗi phần giải một phần vấn đề, dùng được riêng.
  ⇒ Giao được sớm, và học được sớm
    ([[cat-pham-vi-va-uu-tien]]).

⇒ Cố chia theo giá trị. Nếu không được thì mới chia theo bước.
```

## Cú pháp

**Ba câu hỏi phá bế tắc:**

```text
① "Nếu bài toán này dễ hơn thì nó trông thế nào?"
   Bỏ một ràng buộc, giải bài dễ hơn, rồi thêm ràng buộc lại.
   ⇒ "Nếu chỉ có một người dùng thì sao?"
     "Nếu dữ liệu chỉ có 100 dòng thì sao?"
   ⇒ Thường lời giải bài dễ hơn chỉ ra hướng cho bài thật.

② "Ai đã giải bài này rồi?"
   Trong repo của bạn, trong công ty, hoặc ngoài kia.
   ⇒ Phần lớn bài toán không mới. Và bài toán giống nhau
     ở tầng trừu tượng cao hơn thường có lời giải sẵn.

③ "Nếu tôi phải giải trong một giờ thì tôi làm gì?"
   Buộc bỏ mọi thứ không thiết yếu.
   ⇒ Cách này thường ra một lời giải đủ tốt, và nó cho bạn
     một đường cơ sở để so.
```

**Giải thích cho người khác — cách phá bế tắc hiệu quả nhất:**

```text
Nói ra thành lời buộc bạn:
  □ diễn đạt rõ ràng ⇒ chỗ mơ hồ lộ ra
  □ nói ra các GIẢ ĐỊNH ⇒ và một trong chúng thường sai
  □ đi theo thứ tự ⇒ chỗ nhảy bước lộ ra

⇒ Người nghe không cần hiểu vấn đề. Viết cho một tờ giấy
  cũng có tác dụng gần bằng.
⇒ Đây là lý do nó hiệu quả: tác dụng đến từ việc BẠN nói ra,
  không từ việc họ trả lời.
```

**Khi nào dừng lại:**

```text
□ Đã "đủ tốt" theo tiêu chí ở bước ①
  ⇒ Có tiêu chí bằng số thì biết khi nào đủ. Không có thì
    bạn sẽ tối ưu mãi ([[chi-so-va-do-thanh-cong]]).
□ Chi phí giải tiếp lớn hơn giá trị
□ Bế tắc quá lâu ⇒ đổi cách: nghỉ, hỏi người, hoặc đổi hướng
```

## Tại sao cần nó

Vì hai lỗi phổ biến nhất đều nằm ở đầu quy trình:

```text
① GIẢI SAI VẤN ĐỀ
   Tối ưu rất giỏi một thứ không quan trọng.
   ⇒ Bỏ bước ①: không định nghĩa vấn đề bằng số.
   ⇒ Bỏ bước ②: không kiểm đây có phải vấn đề đúng.

② LÀM PHẦN DỄ TRƯỚC
   Ba tuần tiến triển đẹp, rồi gặp phần không giải được.
   ⇒ Bỏ bước ④.
```

**Và một điều về việc "cảm thấy đang làm việc":**

```text
Viết mã cảm giác như đang tiến triển. Ngồi nghĩ về vấn đề thì không.

⇒ Nên người ta nhảy vào viết mã sớm, và đó là lý do bước ①–②
  hay bị bỏ.
⇒ Nhưng một giờ định nghĩa vấn đề thường tiết kiệm nhiều ngày.
  Và điều đó không nhìn thấy được, nên nó dễ bị bỏ qua.
```

**Ba dấu hiệu bạn đang giải sai vấn đề:**

```text
□ Không nói được "xong thì cái gì khác đi"
□ Lời giải càng lúc càng phức tạp mà chưa gần đích
□ Bạn đang giải một bài toán tổng quát hơn bài toán thật
  ⇒ Đây là dấu hiệu phổ biến nhất với người có kinh nghiệm:
    giải bài tổng quát thú vị hơn, và nó không cần thiết
    ([[truu-tuong-hoa-khi-nao-tach]])
```

## So sánh

| | Nhảy vào giải | Có phương pháp |
|---|---|---|
| Cảm giác tiến triển | ngay | chậm hơn lúc đầu |
| Rủi ro giải sai vấn đề | cao | thấp |
| Biết khi nào xong | ❌ | ✅ |
| Phát hiện phần không giải được | muộn | sớm |

## Dễ nhầm

**1. Không định nghĩa vấn đề bằng số.**

**2. Không kiểm đây có phải vấn đề đúng.**

**3. Làm phần dễ trước.** Biết muộn về phần không giải được.

**4. Chia theo bước khi chia theo giá trị được.**

**5. Nhảy vào viết mã vì nó cảm giác như tiến triển.**

**6. Không thử bỏ một ràng buộc để giải bài dễ hơn.**

**7. Không hỏi "ai đã giải bài này rồi".**

**8. Không giải thích cho người khác khi bế tắc.**

**9. Không có tiêu chí "đủ tốt".** Tối ưu mãi.

**10. Giải bài tổng quát hơn bài thật.**

## Mẹo nhớ

> **Viết ra vấn đề BẰNG SỐ. Không viết ra được nghĩa là chưa hiểu.**
>
> **Giải phần RỦI RO NHẤT trước, không phải phần dễ nhất.**
>
> **Bế tắc thì NÓI RA THÀNH LỜI — tác dụng đến từ việc bạn nói, không từ câu trả lời.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm bước, hai bước nào hay bị bỏ nhất?
2. Vì sao giải phần rủi ro nhất trước?
3. Chia theo bước khác chia theo giá trị thế nào?
4. Ba câu hỏi phá bế tắc?
5. Ba dấu hiệu đang giải sai vấn đề?

## Tự viết lại

Vấn đề: *"Đội hỗ trợ nói hệ thống hay lỗi, khách hàng phàn nàn nhiều."*

Không nhìn lại, viết:

```text
① định nghĩa vấn đề cụ thể, bằng số — bạn cần thu thập gì
② kiểm xem đây có phải vấn đề đúng
③ chia nhỏ thành các phần
④ phần nào rủi ro nhất, làm trước
⑤ tiêu chí "đủ tốt"
```

Tự kiểm: ở ①, bạn có đủ dữ liệu để viết ra con số chưa — nếu không, bước đầu tiên thật sự của bạn là gì?

## Thử sức

Sếp nói: *"Cần làm hệ thống nhanh hơn, khách hàng kêu chậm."* Bạn có hai tuần.

Ba câu để trả lời: bạn làm gì trong hai ngày đầu — và vì sao **không** phải là bắt đầu tối ưu; bạn chia vấn đề thế nào; và bạn xác định "đủ tốt" bằng gì. Câu khó nhất: nếu đo ra thấy hệ thống thật sự nhanh (p95 = 300ms) nhưng khách hàng vẫn kêu chậm, vấn đề thật có thể là gì — và điều đó đổi kế hoạch của bạn ra sao?
