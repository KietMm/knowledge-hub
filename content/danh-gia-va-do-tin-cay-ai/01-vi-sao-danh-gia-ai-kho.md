---
title: Vì sao đánh giá AI khó
slug: vi-sao-danh-gia-ai-kho
summary: Không có một đáp án đúng, đầu ra không tất định, và chất lượng là nhiều chiều — ba lý do và cách xử lý.
level: co-ban
tags: [ai, danh-gia, do-tin-cay, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** biết ba lý do đánh giá AI khó, và cách chuyển từng cái thành thứ đo được.

## Ý tưởng chính

Test phần mềm thường dựa vào ba giả định: có **một đáp án đúng**, cùng đầu vào cho **cùng đầu ra**, và "đúng/sai" là **một chiều**.

Với đầu ra của mô hình, **cả ba giả định đều sai**. Nên không thể dùng cách test thường — nhưng cũng không có nghĩa là không đo được.

## Mental model

Hãy nghĩ tới **chấm một bài luận so với chấm một bài toán**.

> **Bài toán**: có đáp án. Đúng hoặc sai. Chấm bằng máy được. Hai người chấm cho cùng kết quả.
>
> **Bài luận**: có nhiều bài tốt khác nhau. Hai giáo viên cho điểm khác nhau. Và "tốt" gồm nhiều chiều: đúng nội dung, mạch lạc, đúng độ dài, đúng giọng điệu.
>
> Nhưng bài luận **vẫn chấm được** — bằng một **thang tiêu chí** rõ ràng, và bằng cách **nhiều người chấm rồi so**.

Chuyển từ "không chấm được" sang "chấm được bằng thang tiêu chí" là toàn bộ nội dung của bài này.

## Ví dụ nhỏ

```text
❌ expect(traLoi).toBe('Chính sách đổi trả là 7 ngày.')
   ⇒ Mô hình nói "Bạn có 7 ngày để đổi hàng nhé" — đúng, và test đỏ.

✅ Kiểm các TIÊU CHÍ:
   □ có nhắc con số 7 ngày
   □ không nhắc thông tin ngoài tài liệu
   □ dưới 100 từ
   □ có trích dẫn nguồn
```

## Code chạy thế nào

**Ba lý do khó, và cách xử lý từng cái:**

```text
① KHÔNG CÓ MỘT ĐÁP ÁN ĐÚNG
   Nhiều câu trả lời đều đúng, diễn đạt khác nhau.
   ⇒ Xử lý: kiểm TIÊU CHÍ, không so khớp chuỗi.
     "có chứa con số đúng" thay vì "bằng đúng câu này".

② ĐẦU RA KHÔNG TẤT ĐỊNH
   Cùng đầu vào, hai lần khác nhau — kể cả temperature 0
   ([[tham-so-sinh-van-ban]]).
   ⇒ Xử lý: chạy NHIỀU LẦN, đo TỈ LỆ, không đo một lần.
     "8/10 lần đúng" là một số có nghĩa; "lần này đúng" thì không.

③ CHẤT LƯỢNG LÀ NHIỀU CHIỀU
   Một câu trả lời có thể đúng nội dung nhưng quá dài, hoặc
   đúng mà giọng điệu lệch, hoặc hay mà bịa một chi tiết.
   ⇒ Xử lý: đo từng chiều RIÊNG, không gộp thành một điểm.
     Gộp lại thì bạn không biết chiều nào đang xấu đi.
```

**Từ "khó đo" sang "đo được" — bốn cách, theo độ tin cậy:**

```text
① KIỂM ĐƯỢC BẰNG MÃ           ← ưu tiên cao nhất
   Có chứa con số đúng? Đúng schema? Trích dẫn tồn tại?
   Dưới N từ? Không nhắc từ cấm?
   ⇒ Tất định, rẻ, chạy trong CI.
   ⇒ Thiết kế bài toán để dùng được cách này càng nhiều càng tốt.

② SO KHỚP CHÍNH XÁC cho bài toán có đáp án đóng
   Phân loại, trích xuất trường, chọn một trong N.
   ⇒ Đây là lý do nên TÁCH phần có đáp án đóng ra khỏi phần mở.

③ MÔ HÌNH CHẤM theo thang tiêu chí
   ⇒ Cần hiệu chỉnh với người ([[llm-lam-trong-tai]]).

④ NGƯỜI CHẤM
   Chuẩn vàng. Đắt. Dùng để hiệu chỉnh ①–③, không dùng
   cho mọi lần chạy.
```

```text
Cách ② đáng nhấn: rất nhiều bài toán "mở" có thể chia thành
một phần ĐÓNG (trích xuất, phân loại) và một phần MỞ (diễn đạt).
⇒ Đo phần đóng bằng so khớp chính xác, phần mở bằng tiêu chí.
⇒ Đây là cách biến một bài toán khó đo thành hai bài toán đo được.
```

## Cú pháp

**Thang tiêu chí — thay cho một điểm tổng:**

```text
Với mỗi câu trả lời, đo riêng:
  □ ĐÚNG SỰ THẬT      có sai thông tin nào không
  □ BÁM NGUỒN         có khẳng định nào ngoài ngữ cảnh không
  □ TRẢ LỜI ĐÚNG CÂU  có đúng ý câu hỏi không
  □ ĐẦY ĐỦ            có bỏ sót phần nào không
  □ ĐỘ DÀI            trong khoảng cho phép
  □ GIỌNG ĐIỆU        đúng phong cách

⇒ Sáu chiều, sáu con số. Xấu đi ở chiều nào thì biết ngay.
⇒ Gộp thành "điểm chất lượng 7,4" thì bạn mất hết thông tin đó.
```

**Đo tỉ lệ, không đo một lần:**

```text
Mỗi ca chạy 3–5 lần.

Ba tình huống rất khác nhau:
  5/5 đúng          → ổn định, tin được
  3/5 đúng          → không ổn định ⇒ có vấn đề, dù "thường đúng"
  5/5 đúng nhưng    → đáng nghi: nó đang mò, và may
  cách trả lời rất
  khác nhau mỗi lần

⇒ Tình huống thứ ba hay bị bỏ qua: đúng mà không nhất quán
  là dấu hiệu bài toán chưa được định nghĩa rõ trong prompt.
```

**Ba mức đo, dùng cùng nhau:**

```text
① BỘ EVAL — chạy trước khi deploy, phát hiện hồi quy
   ([[xay-bo-eval]])
② SỐ LIỆU PRODUCTION — hành vi người dùng, phản hồi
   ([[do-trong-production]])
③ NGƯỜI ĐỌC MẪU — bắt vấn đề chưa nghĩ tới

⇒ Ba mức bắt ba loại vấn đề khác nhau. Bỏ một mức là bỏ
  một loại vấn đề.
```

## Tại sao cần nó

Vì không có cách đo, việc cải thiện trở thành đoán — và đó là tình trạng phổ biến:

```text
Không đo:
  Sửa prompt → "thấy tốt hơn" → deploy
  ⇒ Không biết có tốt hơn thật không
  ⇒ Không biết đã làm hỏng ca nào
  ⇒ Và sáu tháng sau không biết hệ thống tốt hơn hay xấu hơn
    lúc mới ra mắt

Có đo:
  Sửa prompt → chạy bộ eval → "76% → 84%, và không ca nào
  từ đúng thành sai" → deploy
```

**Và một cạm bẫy về mục tiêu:**

```text
Đo một chỉ số ⇒ người ta tối ưu chỉ số đó.

  Đo "tỉ lệ trả lời được"  ⇒ hệ thống ngừng nói "không biết"
                             ⇒ nó bắt đầu bịa
  Đo "độ dài câu trả lời"  ⇒ câu trả lời dài dòng
  Đo "điểm mô hình chấm"   ⇒ tối ưu cho cách chấm của mô hình

⇒ Nên luôn đo ÍT NHẤT MỘT CHỈ SỐ ĐỐI TRỌNG:
  cùng với "tỉ lệ trả lời được", đo "tỉ lệ bịa".
```

**Bắt đầu từ đâu — thực tế:**

```text
① Thu 20 ca thật từ log (hoặc từ những gì bạn định làm)
② Với mỗi ca, viết ra cái gì là "đúng" — bằng TIÊU CHÍ
③ Chạy, đếm, ghi lại con số cơ sở
④ Từ đó mọi thay đổi đều so được với con số đó

⇒ Bước ② tốn công nhất và không bỏ được. Nhưng 20 ca là đủ
  để bắt đầu, và bộ sẽ lớn dần từ những ca bị báo sai.
```

## So sánh

| Cách đo | Tất định | Chi phí | Đo được chiều nào |
|---|---|---|---|
| Kiểm bằng mã | ✅ | rất thấp | định dạng, sự thật kiểm được |
| So khớp chính xác | ✅ | rất thấp | phần có đáp án đóng |
| Mô hình chấm | gần đúng | vừa | chất lượng chủ quan |
| Người chấm | ✅ | **cao** | mọi chiều |

## Dễ nhầm

**1. So khớp chuỗi cho đầu ra tự do.** Đúng mà test đỏ.

**2. Chạy mỗi ca một lần.** Đầu ra không tất định.

**3. Gộp mọi chiều thành một điểm.** Mất thông tin về chiều nào xấu.

**4. Không tách phần có đáp án đóng ra.** Bỏ mất cách đo rẻ nhất.

**5. Bỏ qua ca "đúng mà không nhất quán".**

**6. Chỉ đo một chỉ số.** Người ta sẽ tối ưu đúng chỉ số đó.

**7. Không có chỉ số đối trọng.** "Tỉ lệ trả lời được" cao vì nó bịa.

**8. Chỉ có bộ eval, không đo production.**

**9. Không ai đọc mẫu.**

**10. Không có con số cơ sở.** Không so được gì.

## Mẹo nhớ

> **Ba lý do khó: không MỘT đáp án, không TẤT ĐỊNH, chất lượng NHIỀU CHIỀU.**
>
> **Kiểm TIÊU CHÍ, không so khớp chuỗi. Đo TỈ LỆ, không đo một lần.**
>
> **Mọi chỉ số cần một CHỈ SỐ ĐỐI TRỌNG — nếu không, người ta tối ưu sai.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba giả định của test thường, và vì sao cả ba sai với LLM?
2. Cách xử lý cho từng lý do?
3. Bốn cách đo, xếp theo độ tin cậy?
4. Vì sao nên tách phần có đáp án đóng ra khỏi phần mở?
5. Cạm bẫy của việc chỉ đo một chỉ số, và cách chống?

## Tự viết lại

Không nhìn lại, thiết kế cách đo cho trợ lý trả lời câu hỏi về sản phẩm:

```text
① tách phần có đáp án đóng và phần mở
② tiêu chí đo cho phần mở, kèm cách kiểm
③ chạy mỗi ca bao nhiêu lần
④ hai chỉ số và chỉ số đối trọng của chúng
```

Tự kiểm: trong các tiêu chí ở ②, có bao nhiêu cái kiểm được bằng **mã** — và bạn thiết kế lại để tăng con số đó thế nào?

## Thử sức

Đội bạn đã sửa prompt tám lần trong hai tháng. Mỗi lần "thấy tốt hơn". Hiện tại không ai biết hệ thống tốt hơn hay xấu hơn so với hai tháng trước.

Ba câu để trả lời: bạn dựng cách đo thế nào từ tình trạng hiện tại; bạn lấy ca kiểm ở đâu; và bạn xác định "con số cơ sở" là gì khi không có dữ liệu quá khứ. Câu khó nhất: nếu bây giờ bạn dựng bộ eval và đo được 74%, con số đó **không** so được với hai tháng trước — vậy nó còn giá trị gì, và giá trị đó bắt đầu từ lúc nào?
