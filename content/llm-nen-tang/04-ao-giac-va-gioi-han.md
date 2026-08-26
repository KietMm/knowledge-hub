---
title: Ảo giác và giới hạn của mô hình
slug: ao-giac-va-gioi-han
summary: Vì sao mô hình bịa ra thứ nghe rất hợp lý, khi nào nó hay bịa nhất, và bốn cách giảm.
level: trung-cap
tags: [ai, llm, do-tin-cay, chat-luong]
khung: v2
---

> **Sau bài này bạn sẽ:** dự đoán được khi nào mô hình hay bịa, và biết bốn biện pháp giảm theo thứ tự hiệu quả.

## Ý tưởng chính

**Ảo giác** không phải một lỗi mà nhà cung cấp quên sửa. Nó là hệ quả trực tiếp của cơ chế: mô hình sinh **chuỗi có khả năng cao**, và một chuỗi có khả năng cao không nhất thiết là một chuỗi đúng.

Nên câu hỏi thực dụng không phải "làm sao hết ảo giác" mà **"làm sao giảm nó, và làm sao phát hiện khi nó xảy ra"**.

## Mental model

Hãy nghĩ tới **một người kể chuyện rất trôi chảy, được yêu cầu không bao giờ nói "tôi không nhớ"**.

> Hỏi họ về một sự kiện họ biết rõ: kể chính xác.
>
> Hỏi về một sự kiện họ chỉ nhớ mang máng: họ **lấp đầy khoảng trống** bằng những chi tiết nghe hợp lý — tên nghe đúng kiểu, ngày tháng nghe hợp lý, con số nghe vừa phải.
>
> Và họ kể phần bịa **với đúng giọng tự tin** như phần thật. Không có dấu hiệu nào phân biệt.

Điểm cuối là toàn bộ vấn đề: nếu ảo giác nghe khác thường, nó đã dễ phát hiện. Vấn đề là nó **nghe giống hệt phần đúng**.

## Ví dụ nhỏ

```text
Hỏi:     "Hàm nào trong lodash làm việc X?"
Trả lời: "_.chunkBy(arr, fn) — chia mảng theo hàm phân nhóm."

Nghe hoàn toàn hợp lý: đúng quy ước đặt tên, đúng chữ ký,
đúng phong cách tài liệu. Và hàm đó không tồn tại.
```

## Code chạy thế nào

**Năm hoàn cảnh mô hình hay bịa nhất:**

```text
① SỰ THẬT CỤ THỂ, ÍT PHỔ BIẾN
   Số liệu, ngày tháng, tên hàm ít dùng, điều khoản của một
   thư viện nhỏ
   ⇒ Ít mẫu trong dữ liệu ⇒ phân phối phẳng ⇒ dễ chệch.

② KHI CÂU HỎI GIẢ ĐỊNH MỘT ĐIỀU SAI
   "Giải thích tại sao hàm X hoạt động thế này"
   ⇒ Câu hỏi đã khẳng định X tồn tại. Mô hình tiếp tục chuỗi
     đó — nó hiếm khi phản bác tiền đề.

③ KHI BỊ ÉP ĐƯA RA CÂU TRẢ LỜI
   "Chỉ trả lời bằng một câu, không giải thích"
   ⇒ Không còn chỗ để nói "không chắc".

④ Ở CUỐI MỘT CHUỖI LẬP LUẬN DÀI
   Sai một bước ở giữa ⇒ mọi bước sau bị điều kiện hoá trên
   cái sai, và vẫn nhất quán với nó.

⑤ THÔNG TIN SAU MỐC HUẤN LUYỆN
   Nó không biết mình không biết ⇒ nó suy ra từ những gì đã có.
```

Hoàn cảnh ② đáng nhấn vì nó nằm trong tay bạn: **cách bạn đặt câu hỏi quyết định một phần đáng kể tỉ lệ ảo giác**.

**Vì sao không có tín hiệu "tôi không chắc":**

```text
Mô hình có xác suất cho từng token, nhưng:
  □ Xác suất cao KHÔNG có nghĩa là đúng — nó có nghĩa là
    "chuỗi này khớp với mẫu đã học"
  □ Một câu bịa hoàn toàn có thể gồm toàn token xác suất cao,
    vì nó đúng NGỮ PHÁP và đúng PHONG CÁCH

⇒ Đây là lý do "hỏi mô hình xem nó có chắc không" không đáng tin:
  câu trả lời "tôi chắc chắn" cũng chỉ là một chuỗi có khả năng cao.
```

## Cú pháp

**Bốn cách giảm, theo thứ tự hiệu quả:**

```text
① ĐƯA SỰ THẬT VÀO NGỮ CẢNH  ← hiệu quả nhất
   Đừng hỏi "chính sách hoàn tiền của chúng tôi là gì".
   Hãy dán chính sách vào rồi hỏi "theo tài liệu này, ...".
   ⇒ Chuyển bài toán từ NHỚ sang ĐỌC HIỂU — thứ mô hình giỏi
     hơn nhiều ([[rag-la-gi-va-khi-nao-dung]]).

② CHO PHÉP NÓI "KHÔNG BIẾT" — và nói rõ trong chỉ dẫn
   "Nếu tài liệu không có thông tin, trả lời 'không tìm thấy
    trong tài liệu'. Đừng suy đoán."
   ⇒ Không nói ra thì mô hình mặc định là phải trả lời.

③ YÊU CẦU TRÍCH DẪN
   "Với mỗi khẳng định, ghi rõ lấy từ đoạn nào."
   ⇒ Hai lợi ích: bạn kiểm được, và bản thân việc phải trích dẫn
     làm mô hình bám vào ngữ cảnh hơn.

④ DÙNG CÔNG CỤ cho việc nó không giỏi
   Tính toán → máy tính. Tra dữ liệu → truy vấn CSDL.
   Ngày giờ → hàm hệ thống.
   ⇒ Đừng để mô hình "nhớ" thứ có thể tra
     ([[function-calling-co-ban]]).
```

**Ba cách phát hiện trong hệ thống thật:**

```text
□ KIỂM ĐƯỢC BẰNG MÁY thì kiểm
  Tên hàm, tên gói, URL, mã sản phẩm, id bản ghi
  ⇒ Đối chiếu với nguồn thật trước khi hiển thị.

□ TRÍCH DẪN PHẢI TỒN TẠI
  Nếu mô hình nói "theo đoạn 3", kiểm đoạn 3 có thật chứa
  điều đó không. Đây là loại kiểm tự động hoá được.

□ HAI LẦN GỌI ĐỘC LẬP, SO KẾT QUẢ
  Khác nhau đáng kể ⇒ mô hình đang không chắc.
  Đắt hơn, nhưng dùng được cho những câu trả lời quan trọng.
```

**Và một điều KHÔNG hiệu quả như người ta tưởng:**

```text
"Đừng bịa" trong chỉ dẫn hệ thống
  ⇒ Có tác dụng nhẹ, nhưng không giải quyết vấn đề gốc:
    mô hình không biết đâu là bịa.

"Hãy suy nghĩ từng bước" cho câu hỏi sự thật
  ⇒ Giúp cho LẬP LUẬN, không giúp cho TRÍ NHỚ.
    Suy nghĩ kỹ hơn về một sự thật bạn không biết vẫn không
    làm bạn biết nó.
```

## Tại sao cần nó

Vì mức độ nguy hiểm phụ thuộc vào **hậu quả**, và điều đó quyết định thiết kế:

```text
Rủi ro THẤP — sai thì thấy ngay:
  Gợi ý tên biến, nháp một đoạn văn, gợi ý cách tiếp cận
  ⇒ Người dùng tự lọc. Không cần lớp bảo vệ nặng.

Rủi ro CAO — sai mà không thấy:
  Số liệu trong báo cáo, tư vấn theo chính sách công ty,
  thông tin y tế/pháp lý, mã chạy trên dữ liệu thật
  ⇒ Bắt buộc: đưa sự thật vào ngữ cảnh, trích dẫn, kiểm chứng
    bằng máy, và NGƯỜI DUYỆT trước khi hành động.
```

**Thiết kế theo mức rủi ro, không theo mức tin tưởng:**

```text
Câu hỏi thiết kế đúng không phải "mô hình có đáng tin không"
mà "nếu câu trả lời này SAI thì chuyện gì xảy ra, và ai phát hiện?"

  Người dùng phát hiện ngay      → rủi ro thấp
  Phát hiện sau vài tuần         → cần kiểm chứng
  Không ai phát hiện             → không được tự động hoá
```

**Và nói thật với người dùng:**

```text
□ Hiển thị nguồn, cho bấm vào xem đoạn gốc
□ Nói rõ đây là câu trả lời do AI sinh
□ Cho cách báo sai — và THEO DÕI các báo cáo đó
  ⇒ Đây là nguồn dữ liệu tốt nhất để cải thiện,
    và nó là bộ eval miễn phí ([[vi-sao-danh-gia-ai-kho]])
```

## So sánh

| Cách giảm | Hiệu quả | Chi phí |
|---|---|---|
| Đưa sự thật vào ngữ cảnh | **cao nhất** | vừa (cần truy hồi) |
| Cho phép nói "không biết" | cao | gần như 0 |
| Yêu cầu trích dẫn | cao | thấp |
| Dùng công cụ | cao (cho việc phù hợp) | vừa |
| "Đừng bịa" trong chỉ dẫn | thấp | 0 |
| Gọi hai lần, so kết quả | vừa | **gấp đôi** |

## Dễ nhầm

**1. Coi ảo giác là lỗi sẽ được sửa.** Nó là hệ quả của cơ chế.

**2. Hỏi mô hình xem nó có chắc không.** Câu trả lời cũng là chuỗi sinh ra.

**3. Đặt câu hỏi có tiền đề sai.** Mô hình hiếm khi phản bác.

**4. Ép trả lời ngắn gọn cho câu hỏi sự thật.** Không còn chỗ nói "không chắc".

**5. Chỉ viết "đừng bịa" rồi coi là đã xử lý.**

**6. Dùng "suy nghĩ từng bước" để chữa vấn đề trí nhớ.**

**7. Không kiểm những thứ kiểm được bằng máy.**

**8. Không kiểm trích dẫn có thật không.**

**9. Trông cậy trí nhớ mô hình cho dữ liệu của bạn.**

**10. Tự động hoá hành động dựa trên đầu ra không ai kiểm được.**

## Mẹo nhớ

> **Ảo giác nghe GIỐNG HỆT phần đúng — đó là toàn bộ vấn đề.**
>
> **Cách giảm hiệu quả nhất: ĐƯA SỰ THẬT VÀO ngữ cảnh, đừng lấy ra từ trí nhớ mô hình.**
>
> **Câu hỏi thiết kế: "nếu sai thì ai phát hiện?" — không phải "nó có đáng tin không".**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao ảo giác là hệ quả của cơ chế chứ không phải một bug?
2. Năm hoàn cảnh mô hình hay bịa nhất, cái nào nằm trong tay bạn?
3. Vì sao không có tín hiệu "tôi không chắc" đáng tin?
4. Bốn cách giảm, theo thứ tự hiệu quả?
5. Hai cách nghe hợp lý nhưng không hiệu quả?

## Tự viết lại

Bạn xây trợ lý trả lời câu hỏi về chính sách nhân sự của công ty. Không nhìn lại, viết:

```text
① chỉ dẫn hệ thống, có xử lý trường hợp không tìm thấy
② cách đưa sự thật vào ngữ cảnh
③ hai cách kiểm chứng tự động
④ giao diện hiển thị gì cho người dùng
```

Tự kiểm: chỉ dẫn ở ① của bạn có nói rõ **phải làm gì** khi không tìm thấy, hay chỉ nói "đừng bịa"?

## Thử sức

Trợ lý nội bộ trả lời sai một câu hỏi về chính sách nghỉ phép. Nhân viên làm theo và bị trừ lương. Câu trả lời trông rất thuyết phục, có cả trích dẫn "theo mục 4.2" — mục đó tồn tại nhưng nói điều khác.

Ba câu để trả lời: hai lớp bảo vệ đã thiếu; ba thay đổi theo thứ tự ưu tiên; và bạn quyết định thế nào về việc có nên tiếp tục cho trợ lý trả lời loại câu hỏi này không. Câu khó nhất: trích dẫn "mục 4.2" có thật nhưng nội dung sai — vì sao đây là kiểu ảo giác **nguy hiểm nhất**, và biện pháp nào bắt được nó?
