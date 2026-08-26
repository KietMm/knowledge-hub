---
title: Lặp và cải thiện prompt
slug: lap-va-cai-thien-prompt
summary: Sửa prompt theo dữ liệu thay vì theo cảm giác — bộ ca kiểm, thay đổi một biến, và tránh vá lỗi mãi.
level: nang-cao
tags: [ai, prompt, danh-gia, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** cải thiện prompt bằng một vòng lặp có đo, và tránh vòng xoáy vá lỗi làm prompt phình ra.

## Ý tưởng chính

Cải thiện prompt mà không đo là **thay đổi ngẫu nhiên**: bạn sửa, thấy ca vừa rồi đúng, và không biết mình vừa làm hỏng ba ca khác.

Vòng lặp đúng giống hệt vòng lặp tối ưu hiệu năng: **đo → sửa một thứ → đo lại**. Khác biệt duy nhất là "đo" ở đây khó hơn, vì đầu ra không xác định.

## Mental model

Hãy nghĩ tới **chỉnh công thức một món ăn cho nhà hàng**.

> Một khách chê mặn. Bạn giảm muối. Món hôm sau nhạt — mười khách khác chê.
>
> Đầu bếp có kinh nghiệm không sửa theo phản hồi cuối cùng. Họ **nếm thử một bộ mẫu cố định**, ghi lại, đổi **một** nguyên liệu, nếm lại cùng bộ đó.
>
> Và họ giữ công thức cũ để so — nếu bản mới không hơn, họ quay lại.

Bộ mẫu cố định đó là **bộ ca kiểm**. Không có nó, mọi thay đổi prompt là một cú đánh cược.

## Ví dụ nhỏ

```text
Vòng lặp:
  ① Chạy 30 ca kiểm với prompt hiện tại → 24/30 đúng
  ② Xem 6 ca sai, tìm điểm chung
  ③ Sửa MỘT thứ trong prompt
  ④ Chạy lại 30 ca → 27/30
  ⑤ Kiểm: 3 ca sai mới có phải 3 ca cũ không?
```

## Code chạy thế nào

**Xây bộ ca kiểm — bốn nguồn:**

```text
① CA THẬT từ log production
   ⇒ Nguồn tốt nhất. Ca người dùng thật gửi, không phải ca bạn nghĩ ra.

② CA ĐÃ TỪNG SAI
   ⇒ Mỗi lần phát hiện một câu trả lời sai, THÊM nó vào bộ.
   ⇒ Đây là cách bộ ca kiểm lớn dần một cách tự nhiên, và nó
     đảm bảo lỗi cũ không quay lại.

③ CA BIÊN bạn nghĩ ra
   Đầu vào rỗng, rất dài, nhiều ngôn ngữ, chứa ký tự lạ,
   câu hỏi ngoài phạm vi, câu hỏi mơ hồ

④ CA CỐ TÌNH PHÁ
   Prompt injection, yêu cầu vượt phạm vi
   ⇒ Ít nhất vài ca, để biết hành vi khi bị tấn công
     ([[prompt-injection]])
```

```text
Quy mô hợp lý: 20 ca là đã dùng được. 50–100 là tốt.
Ít hơn 20 thì một ca sai làm tỉ lệ nhảy quá mạnh, không đọc được xu hướng.
```

**Định nghĩa "đúng" — bước khó nhất:**

```text
① SO KHỚP CHÍNH XÁC — cho phân loại, trích xuất
   Rẻ, đáng tin, tự động hoàn toàn.
   ⇒ Ưu tiên thiết kế bài toán để dùng được cách này.

② KIỂM TIÊU CHÍ BẰNG MÃ — cho đầu ra tự do
   "có chứa số tiền đúng", "không quá 100 từ",
   "không nhắc tên đối thủ", "mọi trích dẫn có thật"
   ⇒ Không đo được "hay", nhưng đo được rất nhiều thứ quan trọng.

③ MÔ HÌNH CHẤM — cho chất lượng chủ quan
   Đưa câu hỏi, câu trả lời, tiêu chí ⇒ mô hình chấm điểm.
   ⇒ Cần hiệu chỉnh: chấm thử 20 ca, so với đánh giá của người.
     Lệch nhiều thì tiêu chí chấm chưa rõ
     ([[vi-sao-danh-gia-ai-kho]]).

④ NGƯỜI CHẤM — chuẩn vàng, đắt
   ⇒ Dùng để hiệu chỉnh cách ①–③, không dùng cho mọi lần chạy.
```

## Cú pháp

**Đổi MỘT thứ mỗi lần:**

```text
❌ Sửa cùng lúc: thêm ví dụ, đổi cách diễn đạt, đổi định dạng,
   đổi temperature
   ⇒ Kết quả tốt hơn — nhưng nhờ cái nào?
   ⇒ Và nếu tệ hơn, bạn phải bỏ hết bốn thay đổi.

✅ Một thay đổi, đo, ghi lại, rồi mới thay đổi tiếp.
   ⇒ Chậm hơn cảm giác, nhanh hơn thực tế.
```

**Đọc ca sai để tìm MẪU, không sửa từng ca:**

```text
6 ca sai. Đừng viết 6 dòng "chú ý trường hợp X" vào prompt.

Hỏi: chúng có điểm chung gì?
  □ Đều là câu hỏi mơ hồ    → thêm chỉ dẫn về cách xử lý mơ hồ
  □ Đều thiếu dữ liệu       → vấn đề ở TRUY HỒI, không ở prompt
  □ Đều dài                 → vấn đề ở ngữ cảnh, không ở prompt
  □ Đều cùng một chủ đề     → thêm MỘT ví dụ về chủ đề đó

⇒ Một thay đổi nhắm vào mẫu tốt hơn sáu thay đổi nhắm vào ca.
⇒ Và nó ngăn prompt phình ra.
```

Đây là phần quan trọng nhất của bài: **vá từng ca là cách prompt xuống cấp**.

**Ba dấu hiệu vấn đề KHÔNG nằm ở prompt:**

```text
□ Ca sai đều thiếu thông tin trong ngữ cảnh
  ⇒ Vấn đề ở truy hồi ([[rag-la-gi-va-khi-nao-dung]])
□ Ca sai đều cần tính toán hoặc dữ liệu thời gian thực
  ⇒ Cần công cụ ([[function-calling-co-ban]])
□ Cùng đầu vào cho kết quả khác nhau giữa các lần
  ⇒ Vấn đề ở temperature, không ở nội dung prompt

⇒ Sửa prompt cho ba loại này là tốn công vô ích.
  Chẩn đoán trước khi sửa.
```

**Giữ lịch sử và có đường quay lui:**

```text
□ Prompt trong git, mỗi thay đổi một commit
□ Ghi kết quả bộ ca kiểm vào commit message hoặc một file
  "24/30 → 27/30, thêm ví dụ cho ca mơ hồ"
□ Kết quả tệ hơn ⇒ revert, không "sửa tiếp cho đỡ tệ"
□ Chạy bộ ca kiểm trong CI trước khi merge
  ⇒ Đây là điều biến "prompt là mã" từ một khẩu hiệu
    thành một thực hành
```

## Tại sao cần nó

Vì không có bộ ca kiểm, prompt xuống cấp theo một đường rất dễ đoán:

```text
Tháng 1: prompt 200 token, rõ ràng
Tháng 3: 800 token — mỗi ca sai thêm một dòng "chú ý"
Tháng 6: 2.000 token, vài dòng mâu thuẫn, không ai dám xoá dòng nào
         và không ai biết dòng nào còn cần

⇒ Mỗi dòng thêm vào đều hợp lý tại thời điểm đó.
⇒ Tổng thể thì tệ. Đây chính là nợ kỹ thuật, ở một dạng khác
  ([[no-ky-thuat-va-refactor]]).
```

**Dọn prompt — làm được nhờ có bộ ca kiểm:**

```text
① Chạy bộ ca kiểm, ghi điểm cơ sở
② Xoá một dòng nghi ngờ không còn cần
③ Chạy lại. Điểm không giảm ⇒ dòng đó thật sự thừa, xoá luôn.
④ Lặp

⇒ Không có bộ ca kiểm thì bước ③ không làm được, và đó là
  lý do không ai dám xoá.
```

**Và một điều dễ quên: bộ ca kiểm cũng bảo vệ bạn khỏi thay đổi từ bên ngoài.**

```text
Nhà cung cấp cập nhật mô hình ⇒ hành vi đổi ⇒ prompt của bạn
có thể kém đi mà không ai chạm vào nó.

⇒ Chạy bộ ca kiểm định kỳ, không chỉ khi sửa prompt.
⇒ Đây là cách duy nhất phát hiện loại hồi quy này.
```

## So sánh

| Cách làm | Biết có tốt hơn không | Nguy cơ hồi quy |
|---|---|---|
| Sửa theo phản hồi cuối cùng | ❌ | cao |
| Thử vài ca bằng tay | một phần | cao |
| Bộ ca kiểm 20–50 ca | ✅ | thấp |
| + chạy trong CI | ✅ | rất thấp |

## Dễ nhầm

**1. Sửa prompt theo ca sai gần nhất.** Làm hỏng ca khác.

**2. Không có bộ ca kiểm.** Mọi thay đổi là cú đánh cược.

**3. Đổi nhiều thứ cùng lúc.**

**4. Vá từng ca thay vì tìm mẫu.** Prompt phình ra.

**5. Sửa prompt cho vấn đề nằm ở truy hồi.**

**6. Bộ ca kiểm chỉ có ca dễ.** Không phát hiện được gì.

**7. Không thêm ca đã từng sai vào bộ.**

**8. Không ghi lại kết quả từng phiên bản.**

**9. Không chạy bộ ca kiểm định kỳ.** Bỏ sót hồi quy do mô hình đổi.

**10. Mô hình chấm mà không hiệu chỉnh với người.**

## Mẹo nhớ

> **Không có bộ ca kiểm thì mọi thay đổi prompt là ĐÁNH CƯỢC.**
>
> **Tìm MẪU trong các ca sai — đừng vá từng ca. Vá từng ca là cách prompt phình ra.**
>
> **Ca sai đều thiếu thông tin ⇒ vấn đề ở TRUY HỒI, không ở prompt.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn nguồn để xây bộ ca kiểm, nguồn nào tốt nhất?
2. Bốn cách định nghĩa "đúng", cái nào nên ưu tiên?
3. Vì sao đổi một thứ mỗi lần?
4. Ba dấu hiệu vấn đề không nằm ở prompt?
5. Vì sao có bộ ca kiểm thì mới dọn được prompt?

## Tự viết lại

Prompt phân loại ticket hỗ trợ của bạn đúng 82%. Không nhìn lại, viết:

```text
① cách xây bộ 40 ca kiểm
② cách định nghĩa "đúng" cho bài toán này
③ quy trình một vòng cải thiện
④ khi nào bạn kết luận vấn đề không nằm ở prompt
```

Tự kiểm: ở ①, bao nhiêu ca đến từ log thật và bao nhiêu do bạn nghĩ ra — tỉ lệ đó nói gì về độ tin cậy của bộ?

## Thử sức

Prompt của hệ thống đã 2.400 token sau sáu tháng vá lỗi. Không có bộ ca kiểm. Đội muốn dọn nhưng không ai dám xoá dòng nào.

Ba câu để trả lời: bước đầu tiên của bạn — và vì sao **không** phải là bắt đầu xoá; quy trình dọn; và cách ngăn nó phình lại. Câu khó nhất: xây bộ ca kiểm cho một hệ thống đã chạy sáu tháng — bạn lấy ca từ đâu, và làm sao biết **câu trả lời đúng** là gì cho những ca đó?
