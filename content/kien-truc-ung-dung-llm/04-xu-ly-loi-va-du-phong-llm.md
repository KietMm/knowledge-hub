---
title: Xử lý lỗi và dự phòng
slug: xu-ly-loi-va-du-phong-llm
summary: Bốn loại lỗi khi gọi mô hình, retry cho loại nào, và suy giảm có kiểm soát thay vì sập.
level: trung-cap
tags: [ai, llm, do-tin-cay, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** phân loại lỗi khi gọi mô hình, và thiết kế suy giảm có kiểm soát.

## Ý tưởng chính

Gọi mô hình là **gọi một dịch vụ bên ngoài**: nó sẽ chậm, sẽ giới hạn tần suất, sẽ lỗi, và đôi khi trả về thứ không dùng được.

Nhưng nó có một loại lỗi mà dịch vụ thường không có: **thành công về mặt HTTP, sai về mặt nội dung**. Và loại đó cần cách xử lý khác hẳn.

## Mental model

Hãy nghĩ tới **gọi cho một chuyên gia tư vấn bên ngoài**.

> **Không liên lạc được** — thử lại sau.
>
> **Họ báo đang quá tải, gọi lại sau 30 phút** — chờ, đúng như họ nói.
>
> **Bạn hỏi sai câu, họ nói "câu này tôi không trả lời được"** — gọi lại y nguyên cũng vô ích.
>
> **Họ trả lời rất trôi chảy, nhưng nội dung sai** — đây là loại tệ nhất: không có tín hiệu gì cho biết có vấn đề.

Bốn tình huống, bốn cách xử lý. Và loại thứ tư là loại duy nhất bạn phải **tự phát hiện**.

## Ví dụ nhỏ

```text
429  quá tải       → retry với backoff, tôn trọng Retry-After
500  lỗi phía họ   → retry với backoff
400  request sai   → KHÔNG retry, sửa mã
200 + JSON hỏng    → retry MỘT lần với chỉ dẫn rõ hơn
200 + nội dung sai → lớp kiểm của bạn phải bắt
```

## Code chạy thế nào

**Bốn loại lỗi và cách xử lý:**

```text
① LỖI TẠM THỜI (429, 500, 502, 503, timeout mạng)
   ⇒ Retry với backoff và jitter, 2–3 lần.
   ⇒ Với 429: TÔN TRỌNG header `Retry-After` nếu có —
     retry sớm hơn chỉ làm tình hình xấu hơn
     ([[thiet-ke-cho-that-bai]]).

② LỖI VĨNH VIỄN (400, 401, 403, ngữ cảnh quá dài)
   ⇒ KHÔNG retry. Retry chỉ tốn tiền và thời gian.
   ⇒ "Ngữ cảnh quá dài" là lỗi của BẠN: phải cắt ngữ cảnh
     rồi gọi lại, không phải retry y nguyên.

③ LỖI ĐỊNH DẠNG (200, nhưng JSON hỏng, thiếu trường)
   ⇒ Retry MỘT lần, kèm chỉ dẫn cụ thể:
     "Phản hồi trước không phải JSON hợp lệ. Chỉ trả về JSON
      theo schema, không thêm gì."
   ⇒ Nhiều hơn một lần thường không giúp — vấn đề ở prompt
     ([[vi-du-va-dinh-dang-dau-ra]]).

④ LỖI NỘI DUNG (200, định dạng đúng, nội dung sai)
   ⇒ Không có tín hiệu từ API. Chỉ lớp KIỂM của bạn bắt được.
   ⇒ Đây là loại quan trọng nhất và không xử lý được bằng retry.
```

**Vì sao loại ④ khác hẳn:**

```text
Ba loại đầu: API cho bạn biết có vấn đề.
Loại ④:      mọi thứ trông bình thường.

⇒ Nên nó không thuộc phạm trù "xử lý lỗi" theo nghĩa thường.
  Nó thuộc phạm trù XÁC THỰC ĐẦU RA
  ([[luong-request-cua-ung-dung-llm]]).
⇒ Và nếu bạn không có lớp kiểm, loại lỗi này đi thẳng ra ngoài
  ở mọi request.
```

## Cú pháp

**Suy giảm có kiểm soát — bốn mức, thay vì sập:**

```text
① MÔ HÌNH DỰ PHÒNG
   Mô hình chính lỗi ⇒ thử mô hình khác (có thể của nhà cung cấp khác).
   ⇒ Cần: prompt hoạt động được với cả hai, và đã ĐO trên cả hai.
   ⇒ Đừng chuyển sang một mô hình bạn chưa từng test.

② TRẢ LỜI KHÔNG CÓ AI
   Câu hỏi thường gặp ⇒ trả câu trả lời mẫu.
   Có kết quả tìm kiếm ⇒ hiện danh sách tài liệu liên quan,
   để người dùng tự đọc.
   ⇒ Kém hơn, nhưng vẫn hữu ích.

③ TỪ CHỐI RÕ RÀNG
   "Hiện chúng tôi không xử lý được yêu cầu này. Bạn thử lại
    sau ít phút, hoặc liên hệ 1900xxxx."
   ⇒ Rõ ràng tốt hơn một câu trả lời sai.

④ XẾP HÀNG
   Không cần trả lời ngay ⇒ nhận yêu cầu, xử lý sau, thông báo.
   ⇒ Chỉ dùng được khi người dùng không đang chờ.
```

```text
Thứ tự này là thứ tự ưu tiên: thử ① trước, xuống dần.
Và mức ③ luôn phải có — nó là mức cuối cùng, và nó phải
KHÔNG BAO GIỜ là một câu trả lời bịa.
```

**Timeout — hai con số, không phải một:**

```text
TIMEOUT TỔNG        toàn bộ lời gọi, ví dụ 30 giây
TIMEOUT GIỮA TOKEN  không nhận được token mới trong 10 giây
                    ⇒ với streaming, đây là con số quan trọng hơn

⇒ Chỉ có timeout tổng: một stream "sống" nhưng dừng sinh token
  sẽ treo tới hết 30 giây.
⇒ Và timeout phải NHỎ HƠN timeout của tầng ngoài, nếu không
  bạn làm việc vô ích.
```

**Circuit breaker cho nhà cung cấp mô hình:**

```text
Nhà cung cấp lỗi liên tục ⇒ mở breaker ⇒ đi thẳng sang dự phòng
hoặc từ chối, không thử nữa.

Hai lợi ích:
  ① Thất bại NHANH thay vì chờ hết timeout mỗi request
  ② Không nện một dịch vụ đang quá tải

⇒ Quan trọng hơn bình thường ở đây, vì mỗi lần thử lại đều
  TỐN TIỀN, không chỉ tốn thời gian.
```

## Tại sao cần nó

Vì mô hình là **phụ thuộc bên ngoài quan trọng nhất** của ứng dụng, và nó có tỉ lệ lỗi cao hơn hạ tầng thường:

```text
Giới hạn tần suất là chuyện HÀNG NGÀY, không phải sự cố.
Nhà cung cấp có sự cố định kỳ.
Và độ trễ dao động rất lớn — p99 có thể gấp năm lần p50.

⇒ Thiết kế phải giả định điều đó, không coi nó là ngoại lệ.
```

**Bốn thứ phải có:**

```text
□ Retry có backoff + jitter cho lỗi tạm thời, tôn trọng Retry-After
□ Timeout tổng VÀ timeout giữa token
□ Ít nhất một mức suy giảm — thường là mức ③, từ chối rõ ràng
□ Lớp kiểm đầu ra cho loại lỗi ④

⇒ Ba thứ đầu là chuẩn của mọi phụ thuộc ngoài.
  Thứ tư là đặc thù của LLM, và là thứ hay thiếu nhất.
```

**Và một lưu ý về idempotency:**

```text
Retry một lời gọi mô hình thường vô hại — nó chỉ tốn tiền.

NHƯNG nếu lời gọi đó có công cụ GHI, retry có thể thực hiện
hành động HAI LẦN:
  lần đầu gọi công cụ thành công, rồi lỗi ở bước sau
  ⇒ retry ⇒ gọi công cụ lần nữa

⇒ Công cụ ghi phải idempotent — và điều này áp dụng cả khi
  bạn nghĩ mình "chỉ retry lời gọi mô hình"
  ([[xac-thuc-va-gioi-han-cong-cu]]).
```

## So sánh

| Loại lỗi | Tín hiệu | Retry | Xử lý |
|---|---|---|---|
| Tạm thời | 429, 5xx, timeout | ✅ backoff | tôn trọng Retry-After |
| Vĩnh viễn | 400, 401, 403 | ❌ | sửa mã hoặc ngữ cảnh |
| Định dạng | 200, parse lỗi | ✅ một lần | sửa prompt nếu lặp lại |
| Nội dung | **không có** | ❌ | lớp kiểm của bạn |

## Dễ nhầm

**1. Retry lỗi 400.** Tốn tiền, cùng kết quả.

**2. Không tôn trọng `Retry-After`.** Làm tình hình xấu hơn.

**3. Retry "ngữ cảnh quá dài" y nguyên.** Phải cắt ngữ cảnh.

**4. Retry lỗi định dạng nhiều lần.** Vấn đề ở prompt.

**5. Không có lớp kiểm cho lỗi nội dung.** Loại tệ nhất, không tín hiệu.

**6. Chỉ có timeout tổng.** Stream treo giữa dòng.

**7. Timeout lớn hơn tầng ngoài.** Làm việc vô ích.

**8. Chuyển sang mô hình dự phòng chưa test.**

**9. Không có mức từ chối rõ ràng.** Hệ thống bịa câu trả lời.

**10. Retry mà công cụ ghi không idempotent.** Hành động hai lần.

## Mẹo nhớ

> **Bốn loại lỗi. Loại thứ tư — nội dung sai — KHÔNG có tín hiệu nào từ API.**
>
> **Suy giảm có kiểm soát: mô hình dự phòng → trả lời không AI → TỪ CHỐI RÕ RÀNG.**
>
> **Với streaming, TIMEOUT GIỮA TOKEN quan trọng hơn timeout tổng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn loại lỗi và cách xử lý mỗi loại?
2. Vì sao loại thứ tư khác hẳn ba loại đầu?
3. Bốn mức suy giảm, mức nào luôn phải có?
4. Hai loại timeout, cái nào quan trọng hơn khi streaming?
5. Vì sao circuit breaker quan trọng hơn bình thường ở đây?

## Tự viết lại

Không nhìn lại, viết xử lý lỗi cho một endpoint gọi mô hình:

```text
① phân loại lỗi và hành động cho từng loại
② chính sách retry cụ thể
③ hai timeout, kèm con số
④ ba mức suy giảm
⑤ lớp kiểm đầu ra
```

Tự kiểm: ở ④, mức cuối cùng của bạn có bao giờ là một câu trả lời do mô hình bịa không?

## Thử sức

Nhà cung cấp mô hình có sự cố 20 phút. Trong thời gian đó, hệ thống của bạn trả về lỗi 500 cho mọi người dùng, và log đầy `429` vì mã retry liên tục không có backoff.

Ba câu để trả lời: hai vấn đề riêng biệt ở đây; bạn sửa gì để lần sau 20 phút đó không thành 20 phút chết hoàn toàn; và bạn kiểm chứng cách sửa bằng cách nào mà không cần chờ sự cố thật. Câu khó nhất: nếu bạn thêm mô hình dự phòng của nhà cung cấp khác, những gì phải chuẩn bị trước để nó thật sự dùng được vào đúng lúc cần?
