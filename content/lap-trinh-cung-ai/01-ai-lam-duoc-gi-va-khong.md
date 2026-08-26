---
title: AI làm được gì và không làm được gì
slug: ai-lam-duoc-gi-va-khong
summary: Bốn loại việc AI giúp nhiều, ba loại nó làm bạn chậm đi, và dấu hiệu bạn đang tin quá mức.
level: co-ban
tags: [ai, lap-trinh-cung-ai, tu-duy, chat-luong]
khung: v2
---

> **Sau bài này bạn sẽ:** biết giao việc gì cho AI, và nhận ra khi nào nó đang làm bạn chậm đi.

## Ý tưởng chính

Trợ lý AI mạnh nhất ở những việc **bạn biết cần gì nhưng gõ mất thời gian**, và yếu nhất ở những việc **cần biết ngữ cảnh mà chỉ bạn có**.

Nên câu hỏi không phải "AI viết code tốt không" mà **"việc này thuộc loại nào"** — và ranh giới đó rõ hơn nhiều người nghĩ.

## Mental model

Hãy nghĩ tới **một thực tập sinh rất đọc nhiều và làm rất nhanh**.

> Họ đã đọc gần như mọi thứ, gõ nhanh gấp mười bạn, và không bao giờ mệt.
>
> Nhưng: họ **mới vào hôm nay**. Không biết vì sao module thanh toán được viết kỳ lạ như vậy, không biết khách hàng lớn nhất có yêu cầu đặc biệt gì, không biết ba tháng trước đội đã thử cách đó và thất bại.
>
> Và điểm quan trọng nhất: khi không biết, họ **không nói "em không biết"** — họ đưa ra một câu trả lời nghe rất tự tin.

Vế cuối là điều làm việc dùng AI khác hẳn dùng một công cụ thường: công cụ hỏng thì báo lỗi, còn AI thì **trả về một đáp án trông đúng**.

## Ví dụ nhỏ

```text
AI mạnh:  "Viết hàm chuyển camelCase sang snake_case, có test"
AI yếu:   "Vì sao đơn hàng của khách A tính sai phí vận chuyển?"
          ← cần dữ liệu thật, cấu hình thật, lịch sử quyết định
```

## Code chạy thế nào

**Bốn loại việc AI giúp nhiều nhất:**

```text
① MÃ KHUÔN MẪU CÓ CẤU TRÚC RÕ
   schema xác thực, DTO, hàm chuyển đổi, cấu hình CI, Dockerfile
   ⇒ Bạn biết chính xác cần gì; việc còn lại là gõ.

② DỊCH GIỮA HAI DẠNG
   JSON → kiểu TypeScript, SQL → ORM, mô tả → biểu thức chính quy
   ⇒ Có đủ thông tin trong đầu vào; không cần ngữ cảnh ngoài.

③ VIỆC BỀ RỘNG, NÔNG
   viết test cho ca biên, thêm log, đổi tên xuyên nhiều file,
   viết tài liệu từ mã
   ⇒ Nhàm, dễ bỏ sót nếu làm tay — đúng chỗ AI thắng.

④ GIẢI THÍCH VÀ ĐỊNH HƯỚNG
   "đoạn mã này làm gì", "có mấy cách giải bài này",
   "thư viện nào cho việc này"
   ⇒ Dùng nó để RÚT NGẮN việc tìm hiểu, rồi tự kiểm chứng.
```

**Ba loại việc AI thường làm bạn chậm đi:**

```text
① CẦN NGỮ CẢNH CHỈ BẠN CÓ
   Quy tắc nghiệp vụ chưa viết ra, lịch sử quyết định, dữ liệu thật
   ⇒ AI sẽ ĐOÁN, và đoán nghe rất hợp lý.

② QUYẾT ĐỊNH KIẾN TRÚC
   Nó không biết ràng buộc thật: đội mấy người, tải bao nhiêu,
   ai vận hành được gì.
   ⇒ Nó cho câu trả lời "đúng sách", thường là quá đà.

③ GỠ LỖI CẦN QUAN SÁT HỆ THỐNG THẬT
   Nó không thấy log của bạn, không chạy được truy vấn của bạn.
   ⇒ Nó gợi ý giả thuyết — hữu ích — nhưng bạn phải kiểm
     ([[go-loi-nhu-mot-quy-trinh]]).
```

Ranh giới gọn lại thành một câu: **AI mạnh khi thông tin cần thiết nằm trong câu hỏi; yếu khi nó nằm trong hệ thống của bạn.**

## Cú pháp

**Bốn dấu hiệu bạn đang tin quá mức:**

```text
□ Merge mã bạn không đọc hết
□ Không giải thích được vì sao đoạn đó đúng
□ Chấp nhận một thư viện bạn chưa từng nghe, không kiểm
□ Sửa bug bằng cách dán lỗi vào AI, lấy bản vá, mà không hiểu nguyên nhân

Dấu hiệu thứ tư là tệ nhất: nó vá triệu chứng và giấu nguyên nhân
⇒ bug quay lại ở chỗ khác ([[phong-ngua-va-hoc-tu-bug]]).
```

**Ba thứ luôn phải tự kiểm:**

```text
① THƯ VIỆN CÓ THẬT KHÔNG, và có được bảo trì không
   Mô hình có thể tạo ra tên gói nghe rất hợp lý mà không tồn tại.
   Và điều này bị lợi dụng: kẻ tấn công đăng ký đúng những tên
   hay bị bịa ra, kèm mã độc.
   ⇒ Kiểm trên registry: có thật, ai bảo trì, cập nhật lần cuối.

② API CÓ ĐÚNG PHIÊN BẢN BẠN DÙNG KHÔNG
   Mô hình học từ dữ liệu tới một thời điểm; API đã đổi từ đó.
   ⇒ Đối chiếu tài liệu chính thức.

③ CÓ LỖ HỔNG BẢO MẬT KHÔNG
   Mã sinh ra thường bỏ qua: giới hạn đầu vào, phân quyền theo
   bản ghi, xử lý lỗi, rate limit
   ⇒ Chúng không làm test đỏ, nên rất dễ lọt.
```

**Và một tác động ít được nói tới: AI làm việc REVIEW nặng hơn.**

```text
Bạn viết 50 dòng   → bạn hiểu từng dòng khi viết
AI viết 300 dòng   → bạn phải ĐỌC HIỂU 300 dòng của người khác

Đọc hiểu mã người khác chậm hơn viết mã của mình.
⇒ Nên "AI viết nhanh gấp năm" KHÔNG có nghĩa là xong nhanh gấp năm.
⇒ Cách xử lý: yêu cầu từng phần NHỎ, đọc và xác nhận từng phần,
  thay vì nhận một khối lớn rồi review sau.
```

## Tại sao cần nó

Vì lợi ích thật đến từ việc **chọn đúng việc để giao**, không từ việc dùng nhiều hơn:

```text
Giao đúng loại việc:
  Thời gian gõ giảm đáng kể ở những việc nhàm.
  Việc mà bạn hay bỏ qua vì tốn công (viết test cho ca biên,
  viết tài liệu, thêm log) giờ làm được.
  ⇒ Chất lượng TĂNG, không chỉ tốc độ.

Giao sai loại việc:
  Bạn nhận một đáp án nghe hợp lý cho một câu hỏi cần ngữ cảnh.
  Kiểm chứng nó tốn nhiều hơn tự làm.
  ⇒ Và nếu không kiểm, bạn vừa đưa một giả định sai vào hệ thống.
```

**Ba nguyên tắc thực dụng:**

```text
① BẠN chịu trách nhiệm cho mọi dòng mã bạn merge.
   "AI viết" không phải một lời giải thích trong hậu kiểm.

② Đọc hiểu trước khi merge. Không hiểu ⇒ hỏi lại hoặc tự viết.

③ Dùng AI để làm nhanh việc bạn ĐÃ BIẾT cách làm,
   không để thay việc bạn CẦN HIỂU.
```

Nguyên tắc ③ đáng suy nghĩ với người mới học: dùng AI để bỏ qua giai đoạn hiểu một khái niệm sẽ tiết kiệm hôm nay và tốn về sau, vì bạn không có mental model để tự suy lại khi gặp biến thể.

## So sánh

| Việc | AI giúp | Vì sao |
|---|---|---|
| Viết schema xác thực | ✅ nhiều | cấu trúc rõ, không cần ngữ cảnh |
| Viết test ca biên | ✅ nhiều | bề rộng, nhàm |
| Chọn kiến trúc | ⚠️ hạn chế | không biết ràng buộc thật |
| Gỡ bug production | ⚠️ hạn chế | không thấy hệ thống của bạn |
| Giải thích mã lạ | ✅ nhiều | thông tin nằm trong đầu vào |
| Quy tắc nghiệp vụ | ❌ | chỉ bạn biết |

## Dễ nhầm

**1. Merge mã không đọc hết.**

**2. Không kiểm thư viện có thật.** Tên bịa ra là một vector tấn công.

**3. Tin API đúng phiên bản bạn dùng.**

**4. Dán lỗi rồi lấy bản vá mà không hiểu nguyên nhân.**

**5. Nhờ AI quyết định kiến trúc.** Nó không biết ràng buộc của bạn.

**6. Nhận một khối 300 dòng rồi review sau.** Chia nhỏ.

**7. Tưởng viết nhanh gấp năm là xong nhanh gấp năm.** Review là phần còn lại.

**8. Bỏ qua kiểm bảo mật.** Mã sinh ra hay thiếu phân quyền và giới hạn.

**9. Dùng AI để bỏ qua giai đoạn hiểu khái niệm.**

**10. Nói "AI viết" như một lời giải thích.**

## Mẹo nhớ

> **AI mạnh khi thông tin cần thiết nằm TRONG CÂU HỎI; yếu khi nó nằm trong HỆ THỐNG của bạn.**
>
> **Nó không nói "tôi không biết" — nó đưa ra một đáp án nghe tự tin.**
>
> **Viết nhanh gấp năm ≠ xong nhanh gấp năm. Review là phần còn lại.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn loại việc AI giúp nhiều nhất, điểm chung của chúng?
2. Ba loại việc nó làm bạn chậm đi, vì sao?
3. Ranh giới gọn trong một câu?
4. Ba thứ luôn phải tự kiểm?
5. Vì sao AI làm việc review nặng hơn?

## Tự viết lại

Không nhìn lại, phân loại và giải thích cho từng việc:

```text
① Viết schema zod cho một form 12 trường
② Quyết định tách service thanh toán ra riêng hay không
③ Viết 20 test cho hàm tính phí vận chuyển
④ Tìm ra vì sao 0,3% giao dịch bị trừ tiền hai lần
⑤ Chuyển 40 file từ JavaScript sang TypeScript
⑥ Chọn giữa Postgres và MongoDB cho dự án mới
```

Tự kiểm: ở ④, AI giúp được **phần nào** — và phần nào bắt buộc là bạn?

## Thử sức

Đồng nghiệp mở một PR 800 dòng, nói "AI viết, mình đọc thấy ổn". Mã chạy, test xanh.

Ba câu để trả lời: bạn review thế nào và tìm những gì **trước tiên**; hai câu hỏi bạn đặt cho người viết; và bạn đề xuất quy ước gì cho đội về mã do AI sinh. Câu khó nhất: test xanh và mã chạy — vậy những **loại lỗi nào** vẫn có thể còn trong 800 dòng đó, và vì sao chúng không làm test đỏ?
