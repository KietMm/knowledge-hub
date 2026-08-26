---
title: Kiểm duyệt nội dung và chống lạm dụng
slug: kiem-duyet-va-lam-dung
summary: Chặn nội dung có hại, chống lạm dụng tài nguyên, và cân bằng để không chặn nhầm người dùng thật.
level: trung-cap
tags: [ai, bao-mat, van-hanh, chi-phi]
khung: v2
---

> **Sau bài này bạn sẽ:** đặt được lớp kiểm duyệt và chống lạm dụng, và biết cân bằng để không chặn nhầm.

## Ý tưởng chính

Một ứng dụng AI mở cho người dùng có hai loại rủi ro rất khác nhau:

**Nội dung** — người dùng đưa vào hoặc hệ thống sinh ra thứ có hại.
**Tài nguyên** — người dùng (hoặc script) tiêu hết ngân sách của bạn.

Cả hai đều cần lớp bảo vệ, và cả hai đều có cùng cạm bẫy: **chặn quá tay thì người dùng thật bị ảnh hưởng**.

## Mental model

Hãy nghĩ tới **bảo vệ ở cửa một quán bar**.

> Việc của họ: không cho vào những người sẽ gây chuyện, và không để một nhóm chiếm hết chỗ.
>
> Kiểm quá lỏng: có người gây chuyện bên trong.
>
> Kiểm quá chặt: khách bình thường bị chặn ở cửa, và họ đi quán khác.
>
> Và có một chi tiết: bảo vệ giỏi không chỉ kiểm ở cửa. Họ **nhìn cả bên trong** — vì có người vào bình thường rồi mới gây chuyện.

Ba điều đó ánh xạ đúng: kiểm đầu vào, kiểm đầu ra, và **cân bằng giữa chặn sai và bỏ sót**.

## Ví dụ nhỏ

```text
Hai chiều kiểm:
  ĐẦU VÀO   người dùng gửi nội dung có hại, hoặc cố khai thác
  ĐẦU RA    mô hình sinh ra nội dung không phù hợp
            (kể cả khi đầu vào bình thường)
```

## Code chạy thế nào

**Kiểm hai chiều — vì sao cần cả hai:**

```text
ĐẦU VÀO
  Chặn nội dung rõ ràng có hại trước khi tốn một lời gọi mô hình.
  ⇒ Rẻ, và tiết kiệm chi phí.
  ⇒ Nhưng không bắt được thứ có hại xuất hiện ở đầu ra.

ĐẦU RA
  Mô hình có thể sinh ra nội dung không phù hợp từ một câu hỏi
  hoàn toàn bình thường.
  ⇒ Đây là chiều hay bị bỏ, và nó là chiều duy nhất bảo vệ
    người dùng khỏi thứ HỆ THỐNG CỦA BẠN nói.
```

**Ba lớp kiểm, theo chi phí:**

```text
① QUY TẮC — danh sách từ, mẫu, độ dài
   Rẻ nhất, tất định.
   ⇒ Bắt được ca rõ ràng. Dễ vượt qua nếu người ta muốn.

② API KIỂM DUYỆT của nhà cung cấp
   Nhiều nhà cung cấp có endpoint phân loại nội dung, thường rẻ
   hơn nhiều so với một lời gọi sinh văn bản.
   ⇒ Lớp mặc định nên dùng.

③ MÔ HÌNH KIỂM theo tiêu chí của bạn
   Cho những thứ đặc thù: ngoài phạm vi nghiệp vụ, giọng điệu
   không phù hợp, cam kết không được phép.
   ⇒ Đắt hơn, dùng cho luồng quan trọng.
```

```text
Và một lớp riêng cho phạm vi nghiệp vụ:
  "Câu hỏi này có thuộc phạm vi trợ lý không?"
  ⇒ Không phải kiểm duyệt an toàn, mà là kiểm phạm vi.
  ⇒ Rẻ, và nó chặn phần lớn việc lạm dụng hệ thống làm
    trợ lý đa dụng miễn phí.
```

## Cú pháp

**Chống lạm dụng tài nguyên — bốn lớp:**

```text
① RATE LIMIT theo người dùng
   Số request mỗi phút và mỗi ngày.
   ⇒ Lớp cơ bản nhất, và nó phải có.

② TRẦN TOKEN theo người dùng mỗi ngày
   ⇒ Rate limit không đủ: 10 request với ngữ cảnh khổng lồ
     đắt hơn 1.000 request nhỏ ([[cache-va-chi-phi-llm]]).

③ GIỚI HẠN ĐỘ DÀI ĐẦU VÀO
   ⇒ Không giới hạn thì một request có thể nhồi hết context window.

④ TRẦN TOÀN HỆ THỐNG
   Lưới an toàn cuối. Chạm trần ⇒ suy giảm có kiểm soát
   (mô hình nhỏ hơn, hoặc từ chối lịch sự), KHÔNG phải sập.
```

```text
Thiếu lớp ② là nguyên nhân phổ biến nhất của hoá đơn bất ngờ:
rate limit trông như đã bảo vệ, nhưng nó đo sai đơn vị.
```

**Cân bằng chặn sai và bỏ sót:**

```text
Chặn quá tay:
  Người dùng thật bị từ chối. Họ không biết vì sao, và họ rời đi.
  ⇒ Và bạn KHÔNG BIẾT điều này xảy ra, trừ khi đo.

Chặn quá lỏng:
  Nội dung có hại đi qua, hoặc tài nguyên bị tiêu.

⇒ Phải ĐO cả hai:
  □ Tỉ lệ bị chặn (theo lớp nào)
  □ Mẫu các ca bị chặn — đọc định kỳ, tìm ca chặn sai
  □ Ca có hại lọt qua (từ báo cáo người dùng)
```

**Thông báo khi từ chối — thiết kế cho người dùng thật:**

```text
❌ "Yêu cầu bị từ chối." — người dùng không biết làm gì tiếp
❌ Giải thích quá chi tiết luật chặn — chỉ dẫn cho người muốn vượt

✅ "Mình chỉ hỗ trợ về sản phẩm và đơn hàng. Bạn cần giúp gì
    về hai việc này không?"
✅ "Bạn đã dùng hết lượt hỏi hôm nay. Lượt mới sẽ có lúc 0h."

⇒ Rõ ràng, có hướng đi tiếp, và không tiết lộ cơ chế.
```

**Ba thứ hay bị bỏ:**

```text
□ KIỂM ĐẦU RA — chỉ kiểm đầu vào là bỏ nửa vấn đề
□ TRẦN TOKEN — không chỉ trần số request
□ ĐO TỈ LỆ CHẶN SAI — không đo thì bạn đang mất người dùng
  mà không biết
```

## Tại sao cần nó

Vì ứng dụng AI mở có ba đặc điểm làm nó dễ bị lạm dụng hơn API thường:

```text
① Mỗi request TỐN TIỀN THẬT, không chỉ tốn CPU
   ⇒ Lạm dụng có chi phí trực tiếp và tuyến tính.

② Đầu vào là văn bản tự do
   ⇒ Không có schema để chặn; người ta gửi được bất cứ gì.

③ Hệ thống của bạn NÓI THAY công ty
   ⇒ Nội dung nó sinh ra là phát ngôn của bạn, không phải của
     nhà cung cấp mô hình.
```

**Điểm ③ đáng nhấn:**

```text
Mô hình nói một câu không phù hợp ⇒ người dùng thấy đó là
công ty bạn nói.

⇒ Nên "nhà cung cấp mô hình có bộ lọc riêng" không phải câu
  trả lời đủ. Bạn cần lớp kiểm của mình cho những thứ đặc thù:
  cam kết giảm giá, phát ngôn về đối thủ, tư vấn ngoài chuyên môn
  ([[chi-dan-he-thong-va-vai]]).
```

**Danh sách kiểm cho ứng dụng mở:**

```text
□ Rate limit theo người dùng và theo IP
□ Trần token theo người dùng mỗi ngày
□ Giới hạn độ dài đầu vào
□ Trần toàn hệ thống, có suy giảm có kiểm soát
□ Kiểm đầu vào: quy tắc + API kiểm duyệt
□ Kiểm đầu ra: ít nhất cho ràng buộc nghiệp vụ quan trọng
□ Kiểm phạm vi: câu hỏi có thuộc phạm vi không
□ Đo tỉ lệ chặn, và đọc mẫu ca bị chặn định kỳ
□ Thông báo từ chối rõ ràng, không tiết lộ cơ chế
□ Log đủ để điều tra ca lạm dụng
```

## So sánh

| Lớp | Chi phí | Bắt được | Dễ vượt |
|---|---|---|---|
| Quy tắc (từ, mẫu) | rất thấp | ca rõ ràng | ✅ |
| API kiểm duyệt | thấp | nội dung có hại | khó hơn |
| Mô hình kiểm | vừa | thứ đặc thù | khó |
| Kiểm phạm vi | thấp | lạm dụng ngoài phạm vi | vừa |

## Dễ nhầm

**1. Chỉ kiểm đầu vào.** Bỏ nửa vấn đề.

**2. Chỉ rate limit theo số request.** Trần token mới đúng đơn vị.

**3. Không giới hạn độ dài đầu vào.**

**4. Chạm trần hệ thống thì sập.** Nên suy giảm có kiểm soát.

**5. Không đo tỉ lệ chặn sai.** Mất người dùng mà không biết.

**6. Thông báo từ chối không nói gì.**

**7. Giải thích chi tiết cơ chế chặn.** Chỉ dẫn cho người muốn vượt.

**8. Tin bộ lọc của nhà cung cấp là đủ.** Ràng buộc nghiệp vụ là của bạn.

**9. Không kiểm phạm vi.** Hệ thống thành trợ lý đa dụng miễn phí.

**10. Không đọc mẫu ca bị chặn.**

## Mẹo nhớ

> **Kiểm CẢ HAI CHIỀU. Đầu ra là chiều duy nhất bảo vệ người dùng khỏi thứ HỆ THỐNG BẠN nói.**
>
> **Rate limit theo REQUEST không đủ — phải có trần TOKEN.**
>
> **Đo tỉ lệ CHẶN SAI. Không đo thì bạn mất người dùng mà không biết.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Hai loại rủi ro của ứng dụng AI mở?
2. Vì sao cần kiểm cả đầu vào và đầu ra?
3. Bốn lớp chống lạm dụng tài nguyên, thiếu lớp nào gây hoá đơn bất ngờ?
4. Vì sao phải đo tỉ lệ chặn sai?
5. Vì sao bộ lọc của nhà cung cấp không đủ?

## Tự viết lại

Không nhìn lại, thiết kế bảo vệ cho một trợ lý mở cho khách hàng:

```text
① bốn lớp chống lạm dụng, kèm con số
② kiểm đầu vào: dùng lớp nào
③ kiểm đầu ra: kiểm gì
④ thông báo từ chối cho ba trường hợp
⑤ ba chỉ số theo dõi
```

Tự kiểm: ở ①, trần token mỗi người dùng của bạn là bao nhiêu — và bạn tính con số đó từ đâu?

## Thử sức

Trợ lý công khai của bạn nhận 40.000 request trong một đêm, hoá đơn 3.000 USD. Điều tra cho thấy một người dùng chạy script gọi API liên tục. Hệ thống có rate limit 60 request/phút mỗi người dùng.

Ba câu để trả lời: vì sao rate limit không chặn được; bốn lớp bạn thêm, kèm con số cụ thể; và bạn phát hiện sớm hơn bằng cảnh báo nào. Câu khó nhất: nếu người đó dùng nhiều tài khoản, rate limit theo người dùng không đủ — bạn thêm gì, và làm sao không chặn nhầm người dùng thật ở cùng một mạng công ty?
