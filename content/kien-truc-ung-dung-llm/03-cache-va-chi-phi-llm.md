---
title: Cache và chi phí trong ứng dụng LLM
slug: cache-va-chi-phi-llm
summary: Bốn tầng cache, đâu là khoản chi phí lớn nhất, và cách đặt trần để không có hoá đơn bất ngờ.
level: trung-cap
tags: [ai, llm, chi-phi, cache]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bốn tầng cache cho ứng dụng LLM, và đặt được trần chi phí ở đúng chỗ.

## Ý tưởng chính

Chi phí ứng dụng LLM tính theo **token**, và nó tăng theo lưu lượng một cách tuyến tính — không có kinh tế theo quy mô như hạ tầng thường.

Nên chi phí phải được thiết kế từ đầu, không phải tối ưu sau. Và điểm quan trọng nhất: **token đầu ra đắt hơn token đầu vào**, thường vài lần.

## Mental model

Hãy nghĩ tới **thuê phiên dịch theo giờ**.

> Bạn trả tiền cho **mọi phút** họ làm việc. Không có gói tháng, không có giảm giá theo khối lượng.
>
> Nên có ba cách tiết kiệm:
> - **Đừng nhờ dịch những gì bạn đã có bản dịch** — đó là cache.
> - **Đừng đưa họ đọc cả cuốn sách** khi chỉ cần một trang — đó là chọn lọc ngữ cảnh.
> - **Đừng nhờ người giỏi nhất dịch một câu đơn giản** — đó là chọn mô hình.

Và một điều nữa: bạn phải **biết mình đang tiêu bao nhiêu** trước khi hết tháng — không phải sau.

## Ví dụ nhỏ

```text
Một request điển hình:
  đầu vào  8.000 token
  đầu ra     600 token
⇒ Nếu token đầu ra đắt gấp 4 lần, thì 600 token đầu ra
  tương đương 2.400 token đầu vào — chiếm ~23% chi phí
  dù chỉ là 7% số token.
```

## Code chạy thế nào

**Bốn tầng cache, từ rẻ nhất:**

```text
① CACHE CÂU TRẢ LỜI HOÀN CHỈNH
   Câu hỏi trùng ⇒ trả lại câu trả lời cũ. Không gọi mô hình.
   ⇒ Tiết kiệm 100%. Tầng hiệu quả nhất.
   ⇒ Cần chuẩn hoá câu hỏi trước khi làm khoá:
     bỏ khoảng trắng thừa, hạ chữ, chuẩn hoá Unicode.

② CACHE NGỮ CẢNH (nhà cung cấp hỗ trợ)
   Phần ngữ cảnh CỐ ĐỊNH (chỉ dẫn hệ thống, tài liệu chung)
   được cache ở phía nhà cung cấp.
   ⇒ Giảm đáng kể chi phí phần đó, và cả TTFT.
   ⇒ Điều kiện: phần cố định phải ở ĐẦU prompt và giống hệt nhau
     giữa các lời gọi ⇒ ảnh hưởng cách bạn sắp xếp prompt.

③ CACHE KẾT QUẢ TRUY HỒI
   Cùng câu hỏi ⇒ cùng đoạn. Không cần tính embedding lại.
   ⇒ Rẻ, và giảm độ trễ.

④ CACHE KẾT QUẢ CÔNG CỤ
   Dữ liệu ít đổi (danh mục, chính sách) ⇒ cache ngắn.
```

**Tầng ① — chuẩn hoá khoá là phần khó:**

```text
"Chính sách đổi trả thế nào?"
"chính sách đổi trả thế nào"
"Cho mình hỏi chính sách đổi trả với"

⇒ Ba câu, cùng ý, ba khoá khác nhau ⇒ cache không trúng.

Ba mức chuẩn hoá:
  □ Cú pháp: hạ chữ, bỏ dấu câu, chuẩn hoá Unicode  ← rẻ, làm ngay
  □ Ngữ nghĩa: dùng embedding, coi là trùng nếu rất gần
    ⇒ Trúng nhiều hơn, nhưng có rủi ro trả lời sai câu
    ⇒ Ngưỡng phải cao, và nên chỉ dùng cho câu hỏi chung
  □ Phân cụm câu hỏi thật, viết câu trả lời mẫu cho cụm phổ biến
    ⇒ Tốn công người, nhưng chất lượng cao nhất
```

```text
Và một điều bắt buộc: khoá cache PHẢI gồm cả thứ ảnh hưởng
câu trả lời — người dùng (nếu câu trả lời phụ thuộc quyền),
phiên bản prompt, phiên bản tài liệu.
⇒ Thiếu ⇒ người dùng A nhận câu trả lời của B
  ([[cache-voi-redis-trong-thuc-te]]).
```

## Cú pháp

**Bốn cách giảm chi phí, theo hiệu quả:**

```text
① CHỌN LỌC NGỮ CẢNH — đừng gửi thứ không cần
   Truy hồi 3 đoạn đúng thay vì 10 đoạn thô.
   ⇒ Vừa rẻ hơn vừa CHÍNH XÁC hơn
     ([[truy-hoi-va-xep-hang-lai]]).

② GIỚI HẠN ĐỘ DÀI ĐẦU RA
   Token đầu ra đắt hơn. Và câu trả lời ngắn thường tốt hơn.

③ ĐỊNH TUYẾN THEO ĐỘ PHỨC TẠP
   Mô hình nhỏ cho câu hỏi đơn giản ([[chon-mo-hinh]]).

④ CACHE — bốn tầng ở trên
```

**Đặt trần — ba mức, cần cả ba:**

```text
① TRẦN MỖI REQUEST
   Số token tối đa, số lần gọi công cụ tối đa, số bước tối đa.
   ⇒ Chống một request đắt bất thường.

② TRẦN MỖI NGƯỜI DÙNG mỗi ngày
   ⇒ Chống một người (hoặc một script) tiêu hết ngân sách.
   ⇒ Bắt buộc nếu ứng dụng mở cho người dùng cuối.

③ TRẦN TOÀN HỆ THỐNG mỗi ngày
   ⇒ Lưới an toàn cuối. Chạm trần ⇒ giảm chất lượng có kiểm soát
     (dùng mô hình nhỏ hơn, hoặc từ chối lịch sự), KHÔNG phải sập.
```

```text
Thiếu mức ② là nguyên nhân phổ biến nhất của hoá đơn bất ngờ:
một script vòng lặp, hoặc một người dùng dùng quá mức, và
không có gì chặn.
```

**Theo dõi — bốn chỉ số:**

```text
□ Token đầu vào / đầu ra mỗi request (và phân phối, không chỉ
  trung bình — đuôi mới gây bất ngờ)
□ Chi phí mỗi request, và mỗi người dùng
□ Tỉ lệ trúng cache từng tầng
□ Chi phí mỗi ngày, so với ngân sách
```

```text
Và một chỉ số dẫn hướng: TOKEN TRUNG BÌNH MỖI REQUEST theo thời gian.
Nó tăng dần khi ai đó thêm một dòng vào chỉ dẫn hệ thống, hoặc
tăng số đoạn truy hồi — những thay đổi nhỏ không ai để ý
([[chi-phi-ha-tang]]).
```

## Tại sao cần nó

Vì chi phí LLM có một tính chất khác hạ tầng thường:

```text
Hạ tầng thường:  chi phí gần như cố định theo capacity.
                 Thêm 20% lưu lượng có thể không tốn thêm gì.
LLM:             chi phí TUYẾN TÍNH theo lưu lượng.
                 Thêm 20% lưu lượng = thêm 20% chi phí.

⇒ Nên chi phí mỗi request là một chỉ số sản phẩm, không chỉ
  chỉ số kỹ thuật.
⇒ Và nó phải nằm trong phép tính khả thi ngay từ khi thiết kế.
```

**Phép tính khả thi — làm trước khi xây:**

```text
Chi phí mỗi request × số request/tháng = chi phí/tháng
So với: giá trị mỗi request mang lại

Ví dụ:
  0,03 USD × 500.000 request/tháng = 15.000 USD/tháng
  ⇒ Có đáng không? Phụ thuộc vào mỗi request tạo ra bao nhiêu
    giá trị.

⇒ Nếu con số không hợp lý, sửa THIẾT KẾ (định tuyến, cache,
  ngữ cảnh nhỏ hơn), đừng chờ tối ưu sau.
```

**Ba việc nên làm ngay từ đầu:**

```text
□ Đếm và ghi log token mỗi request
□ Trần mỗi người dùng mỗi ngày
□ Cảnh báo khi chi phí ngày vượt ngưỡng

⇒ Ba thứ này rẻ để thêm lúc đầu và đắt để thêm sau —
  nhất là khi bạn đã có hoá đơn bất ngờ.
```

## So sánh

| Cách | Tiết kiệm | Công sức | Rủi ro |
|---|---|---|---|
| Cache câu trả lời | tới 100% ca trùng | vừa | trả lời cũ / sai người |
| Cache ngữ cảnh nhà cung cấp | đáng kể phần cố định | thấp | không |
| Chọn lọc ngữ cảnh | lớn | vừa | không (còn tốt hơn) |
| Giới hạn đầu ra | vừa | rất thấp | cắt giữa câu |
| Định tuyến mô hình | lớn | vừa | phân loại sai |

## Dễ nhầm

**1. Không đếm token.** Không biết mình tiêu gì.

**2. Không có trần mỗi người dùng.** Nguyên nhân phổ biến nhất của hoá đơn bất ngờ.

**3. Khoá cache thiếu người dùng.** Trả lời của người khác.

**4. Khoá cache thiếu phiên bản prompt.** Trả lời theo prompt cũ.

**5. Không chuẩn hoá câu hỏi trước khi làm khoá.** Cache không trúng.

**6. Cache theo ngữ nghĩa với ngưỡng thấp.** Trả lời sai câu.

**7. Không dùng cache ngữ cảnh của nhà cung cấp.**

**8. Đặt phần cố định ở cuối prompt.** Không cache được.

**9. Chỉ nhìn chi phí trung bình.** Đuôi gây bất ngờ.

**10. Chạm trần hệ thống thì sập.** Nên giảm chất lượng có kiểm soát.

## Mẹo nhớ

> **Token ĐẦU RA đắt hơn đầu vào vài lần. Giới hạn độ dài đầu ra là tối ưu rẻ nhất.**
>
> **Cache ngữ cảnh chỉ hoạt động khi phần CỐ ĐỊNH ở ĐẦU prompt và giống hệt nhau.**
>
> **Ba trần: mỗi REQUEST, mỗi NGƯỜI DÙNG, toàn HỆ THỐNG. Thiếu cái giữa là hoá đơn bất ngờ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn tầng cache, tầng nào hiệu quả nhất?
2. Ba mức chuẩn hoá khoá cache, mỗi mức đánh đổi gì?
3. Khoá cache phải gồm những gì?
4. Ba mức trần, thiếu mức nào gây hoá đơn bất ngờ?
5. Vì sao chi phí LLM khác chi phí hạ tầng thường?

## Tự viết lại

Không nhìn lại, thiết kế quản lý chi phí cho trợ lý hỗ trợ khách hàng, dự kiến 200.000 request/tháng:

```text
① bốn tầng cache: dùng cái nào, TTL bao nhiêu
② khoá cache gồm những gì
③ ba mức trần, kèm con số
④ bốn chỉ số theo dõi
⑤ phép tính khả thi
```

Tự kiểm: ở ⑤, chi phí mỗi request của bạn là bao nhiêu — và nếu nó gấp ba dự tính, thiết kế nào bạn đổi trước?

## Thử sức

Hoá đơn mô hình tháng này 18.000 USD, gấp bốn tháng trước. Lưu lượng chỉ tăng 30%.

Ba câu để trả lời: bạn điều tra thế nào để tìm nguyên nhân; ba nguyên nhân khả dĩ nhất khi lưu lượng chỉ tăng 30%; và bạn ngăn việc này tái diễn bằng gì. Câu khó nhất: nếu nguyên nhân là ai đó tăng số đoạn truy hồi từ 3 lên 10 để cải thiện chất lượng, bạn đánh giá đánh đổi đó thế nào — và bạn cần dữ liệu gì để quyết định?
