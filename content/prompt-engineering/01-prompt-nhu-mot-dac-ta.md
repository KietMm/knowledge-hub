---
title: Prompt như một đặc tả
slug: prompt-nhu-mot-dac-ta
summary: Prompt tốt không phải câu chữ khéo — nó là một đặc tả rõ ràng về vai trò, việc cần làm, ràng buộc và định dạng.
level: co-ban
tags: [ai, prompt, phuong-phap, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** viết prompt theo một cấu trúc cố định, và biết vì sao mơ hồ là nguyên nhân chính của kết quả kém.

## Ý tưởng chính

Prompt hiệu quả không đến từ "câu thần chú" hay cách diễn đạt khéo. Nó đến từ **sự rõ ràng**: nói đúng những gì bạn muốn, những gì không muốn, và đầu ra trông ra sao.

Phần lớn kết quả kém không phải vì mô hình yếu. Nó vì **yêu cầu có nhiều cách hiểu**, và mô hình chọn cách hiểu phổ biến nhất — thường không phải cách của bạn.

## Mental model

Hãy nghĩ tới **giao việc cho một người rất giỏi nhưng mới vào hôm nay**.

> "Làm cái báo cáo cho tôi" — họ sẽ làm **một** báo cáo. Có thể dài 20 trang trong khi bạn cần một đoạn; có thể bằng tiếng Anh trong khi bạn cần tiếng Việt; có thể theo mẫu công ty cũ của họ.
>
> Họ không hỏi lại, vì họ **có thể đoán được một phương án hợp lý** — và họ làm theo phương án đó.
>
> Người giao việc giỏi nói: mục đích, người đọc là ai, dài bao nhiêu, gồm những mục nào, và cho xem một bản mẫu.

Điểm khác biệt duy nhất so với đồng nghiệp thật: **mô hình không hỏi lại khi mơ hồ**. Nó lấp khoảng trống bằng cách phổ biến nhất.

## Ví dụ nhỏ

```text
❌ "Tóm tắt cái này"
✅ "Tóm tắt văn bản dưới đây thành 3 gạch đầu dòng, mỗi dòng
    tối đa 20 từ, cho người đọc là quản lý không chuyên kỹ thuật.
    Chỉ trả về 3 dòng, không thêm lời dẫn."
```

## Code chạy thế nào

**Năm phần của một prompt tốt:**

```text
① VAI TRÒ và BỐI CẢNH   ai đang trả lời, cho ai đọc
② VIỆC CẦN LÀM          một việc, động từ cụ thể
③ NGỮ CẢNH / DỮ LIỆU    thứ cần để làm việc đó
④ RÀNG BUỘC             độ dài, phong cách, cái gì không được làm
⑤ ĐỊNH DẠNG ĐẦU RA      cấu trúc chính xác bạn muốn nhận
```

```text
Trong năm phần, ⑤ hay bị bỏ nhất và gây nhiều việc phụ nhất:
không nói rõ thì mô hình thêm lời dẫn ("Đây là tóm tắt của bạn:"),
thêm giải thích ở cuối, hoặc bọc JSON trong khối mã.
⇒ Mọi thứ đó bạn phải xử lý ở phía nhận.
```

**Vì sao mơ hồ là nguyên nhân chính:**

```text
"Viết một hàm kiểm tra email hợp lệ"

Mơ hồ ở đâu:
  □ Ngôn ngữ nào?
  □ Dùng regex hay thư viện?
  □ "Hợp lệ" theo chuẩn nào — RFC đầy đủ hay đủ dùng?
  □ Trả về boolean hay ném lỗi?
  □ Có cần test không?

⇒ Mô hình chọn mặc định cho cả năm. Bạn có thể không đồng ý với
  cái nào, và phải làm lại từ đầu.
⇒ Nói rõ năm điều đó mất 30 giây và tiết kiệm hai vòng lặp.
```

Cách kiểm tra prompt của mình: **đọc lại và tự hỏi "có bao nhiêu cách hiểu câu này?"** Mỗi chỗ có hai cách hiểu là một chỗ có thể sai.

## Cú pháp

**Nói CÁI GÌ CẦN, không chỉ cái không cần:**

```text
❌ "Đừng viết dài dòng"
   ⇒ Bao nhiêu là dài? Mô hình vẫn phải đoán.

✅ "Tối đa 100 từ"

❌ "Đừng dùng thuật ngữ kỹ thuật"
✅ "Viết cho người đọc không biết lập trình. Thuật ngữ nào
    bắt buộc phải dùng thì giải thích ngắn trong ngoặc."
```

```text
Phủ định khó thực hiện hơn khẳng định: "đừng nghĩ tới con voi"
buộc phải nghĩ tới con voi trước. Với mô hình cũng vậy —
nói ra thứ cần làm hiệu quả hơn liệt kê thứ cấm.
```

**Cấu trúc bằng dấu phân cách rõ ràng:**

```text
Bạn là trợ lý hỗ trợ khách hàng của công ty X.

## Việc cần làm
Trả lời câu hỏi của khách dựa DUY NHẤT trên tài liệu dưới đây.

## Tài liệu
<tai_lieu>
...
</tai_lieu>

## Ràng buộc
- Nếu tài liệu không có thông tin: trả lời "Tôi không tìm thấy
  thông tin này, bạn liên hệ hotline 1900xxxx nhé."
- Không suy đoán. Không dùng kiến thức ngoài tài liệu.
- Xưng "mình", gọi khách là "bạn".

## Định dạng
2–4 câu. Không gạch đầu dòng. Không lời dẫn.

## Câu hỏi
<cau_hoi>...</cau_hoi>
```

```text
Ba lý do dấu phân cách quan trọng:
  ① Mô hình phân biệt được CHỈ DẪN với DỮ LIỆU
  ② Giảm rủi ro prompt injection: dữ liệu người dùng nằm gọn
    trong thẻ, khó giả làm chỉ dẫn hơn ([[prompt-injection]])
  ③ Bạn sửa từng phần được mà không phá phần khác
```

**Đặt thứ quan trọng ở ĐẦU và CUỐI:**

```text
Với prompt dài, phần giữa được dùng kém hơn.
⇒ Chỉ dẫn quan trọng nhất: đặt ở đầu.
⇒ Câu hỏi thật và nhắc lại ràng buộc then chốt: đặt ở cuối,
  ngay trước chỗ mô hình bắt đầu sinh.
⇒ Tài liệu tham khảo dài: kẹp ở giữa ([[token-va-context-window]]).
```

## Tại sao cần nó

Vì prompt là **mã**, và nó nên được đối xử như mã:

```text
□ Nó quyết định hành vi hệ thống ⇒ đổi nó là một thay đổi hành vi
□ Nó cần được review ⇒ một dòng thêm vào có thể đổi kết quả
□ Nó cần lịch sử ⇒ "vì sao có dòng này?" là câu hỏi sẽ xuất hiện
□ Nó cần test ⇒ đổi prompt có thể làm hỏng ca đang chạy đúng

⇒ Hệ quả: prompt nằm trong git, không nằm trong một ô nhập
  trên giao diện quản trị mà ai cũng sửa được.
```

**Ba thứ khiến prompt xuống cấp theo thời gian:**

```text
① Vá lỗi bằng cách thêm dòng
   Mỗi ca sai thêm một câu "chú ý không được...".
   Sau ba tháng: prompt 2.000 token, nhiều dòng mâu thuẫn nhau,
   và không ai dám xoá dòng nào.

② Không ghi lý do
   "Không dùng dấu chấm than" — vì sao? Ai thêm? Còn cần không?

③ Không có bộ ca kiểm tra
   Sửa prompt cho ca A, làm hỏng ca B, không ai biết
   ([[vi-sao-danh-gia-ai-kho]]).
```

**Cách chống lại:**

```text
□ Prompt trong file riêng, có phiên bản, ở git
□ Comment ghi VÌ SAO cho mỗi ràng buộc không hiển nhiên
□ Bộ 20–50 ca kiểm chạy trước khi merge thay đổi prompt
□ Định kỳ đọc lại và XOÁ dòng không còn cần
  ⇒ Prompt cũng có nợ kỹ thuật ([[no-ky-thuat-va-refactor]])
```

## So sánh

| Prompt mơ hồ | Prompt như đặc tả |
|---|---|
| "Tóm tắt cái này" | vai trò + việc + ràng buộc + định dạng |
| Kết quả thay đổi mỗi lần | ổn định |
| Phải xử lý nhiều ở phía nhận | nhận đúng thứ cần |
| Sửa bằng cách thử lại | sửa bằng cách nói rõ hơn |

## Dễ nhầm

**1. Nghĩ prompt tốt là câu chữ khéo.** Nó là sự rõ ràng.

**2. Không nói định dạng đầu ra.** Nhận thêm lời dẫn và giải thích.

**3. Chỉ nói cái không được làm.** Nói cái cần làm.

**4. Không dùng dấu phân cách.** Lẫn chỉ dẫn với dữ liệu.

**5. Đặt chỉ dẫn quan trọng ở giữa prompt dài.**

**6. Yêu cầu nhiều việc trong một prompt.** Tách ra.

**7. Prompt nằm ngoài git.** Không review, không lịch sử.

**8. Vá lỗi bằng cách thêm dòng mãi.**

**9. Không ghi lý do cho ràng buộc.**

**10. Đổi prompt mà không chạy bộ ca kiểm.**

## Mẹo nhớ

> **Prompt là một ĐẶC TẢ: vai trò, việc, ngữ cảnh, ràng buộc, định dạng.**
>
> **Mô hình KHÔNG hỏi lại khi mơ hồ — nó chọn cách hiểu phổ biến nhất.**
>
> **Prompt là MÃ: vào git, có review, có test, và có nợ kỹ thuật.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm phần của một prompt tốt, phần nào hay bị bỏ nhất?
2. Vì sao mơ hồ là nguyên nhân chính của kết quả kém?
3. Vì sao nói "cái cần làm" hiệu quả hơn "cái không được làm"?
4. Ba lý do dùng dấu phân cách?
5. Ba thứ khiến prompt xuống cấp theo thời gian?

## Tự viết lại

Không nhìn lại, viết prompt đầy đủ cho: *"trích xuất thông tin từ email đơn hàng của khách và trả về JSON"*.

```text
① đủ năm phần
② dấu phân cách rõ ràng
③ xử lý trường hợp thiếu thông tin
④ ba ca kiểm bạn sẽ chạy
```

Tự kiểm: prompt của bạn có nói rõ **phải làm gì** khi email không phải đơn hàng không?

## Thử sức

Prompt của hệ thống hỗ trợ khách hàng đã dài 2.400 token sau sáu tháng vá lỗi. Có ba dòng mâu thuẫn nhau, và không ai dám xoá dòng nào.

Ba câu để trả lời: bạn dọn nó thế nào **mà không làm hỏng ca đang chạy đúng**; thứ tự các bước; và bạn ngăn nó phình lại ra sao. Câu khó nhất: nếu chưa có bộ ca kiểm nào, bạn xây nó từ đâu — và nguồn dữ liệu nào cho bạn những ca **quan trọng nhất**?
