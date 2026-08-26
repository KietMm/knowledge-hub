---
title: Chọn mô hình cho bài toán
slug: chon-mo-hinh
summary: Bốn trục đánh đổi, vì sao mô hình mạnh nhất thường không phải lựa chọn đúng, và cách so sánh có căn cứ.
level: trung-cap
tags: [ai, llm, chi-phi, danh-gia]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn mô hình theo bốn trục đánh đổi, và so sánh bằng dữ liệu của mình thay vì bằng bảng xếp hạng.

## Ý tưởng chính

Chọn mô hình là một bài toán **đánh đổi bốn chiều**: chất lượng, chi phí, độ trễ, và khả năng kiểm soát.

Mô hình mạnh nhất thường thắng ở chiều thứ nhất và thua ở ba chiều còn lại. Nên câu hỏi đúng là **"bài toán này cần gì"**, không phải "cái nào tốt nhất".

## Mental model

Hãy nghĩ tới **chọn người cho một công việc**.

> Cần dịch một hợp đồng pháp lý quan trọng: thuê chuyên gia giỏi nhất. Đắt, chậm, và xứng đáng.
>
> Cần phân loại 100.000 email vào ba nhóm: thuê chuyên gia đó là **lãng phí nghiêm trọng**. Một người được hướng dẫn tốt làm được, nhanh hơn và rẻ hơn hàng trăm lần.
>
> Và nếu công việc là "trả lời câu hỏi của khách hàng trong hai giây": người giỏi nhất mà **trả lời sau ba mươi giây** thì không dùng được, dù câu trả lời hay hơn.

Vế cuối là trục hay bị bỏ qua nhất: **độ trễ là một yêu cầu chức năng**, không phải một chỉ số phụ.

## Ví dụ nhỏ

```text
Cùng một hệ thống, ba loại việc, ba mô hình:
  Phân loại ý định câu hỏi   → mô hình nhỏ, nhanh, rẻ
  Trả lời dựa trên tài liệu  → mô hình vừa
  Phân tích và lập kế hoạch  → mô hình mạnh nhất
```

## Code chạy thế nào

**Bốn trục đánh đổi:**

```text
① CHẤT LƯỢNG
   Không phải một con số. Mô hình A giỏi lập luận, mô hình B
   giỏi làm theo định dạng, mô hình C giỏi tiếng Việt.
   ⇒ "Chất lượng" chỉ có nghĩa khi gắn với BÀI TOÁN CỤ THỂ.

② CHI PHÍ
   Chênh lệch giữa mô hình nhỏ và mô hình lớn thường là
   một tới hai bậc độ lớn.
   ⇒ Ở quy mô nhỏ không ai để ý. Ở 10 triệu request/tháng
     nó là quyết định ngân sách.

③ ĐỘ TRỄ
   Mô hình lớn chậm hơn. Và độ trễ có hai phần rất khác nhau:
     thời gian tới TOKEN ĐẦU TIÊN — quyết định cảm nhận
     tốc độ sinh mỗi token — quyết định thời gian tổng
   ⇒ Với giao diện streaming, phần đầu quan trọng hơn nhiều
     ([[luong-request-cua-ung-dung-llm]]).

④ KIỂM SOÁT
   API của nhà cung cấp: nhanh để bắt đầu, không kiểm soát
     việc mô hình được cập nhật, dữ liệu ra ngoài
   Mô hình tự vận hành: kiểm soát hoàn toàn, và trả toàn bộ
     chi phí hạ tầng cùng chuyên môn
```

**Định tuyến theo việc — mẫu thiết kế đáng dùng:**

```text
Một hệ thống KHÔNG cần một mô hình.

  Bước 1: phân loại câu hỏi        → mô hình nhỏ  (rẻ, nhanh)
  Bước 2a: câu đơn giản → trả lời  → mô hình nhỏ
  Bước 2b: câu phức tạp → trả lời  → mô hình mạnh

⇒ Nếu 80% câu hỏi là đơn giản, bạn tiết kiệm phần lớn chi phí
  mà chất lượng ở 20% khó vẫn giữ nguyên.
⇒ Cái giá: thêm một bước, thêm độ trễ cho bước phân loại,
  và một chỗ nữa có thể sai (phân loại sai).
```

## Cú pháp

**Vì sao bảng xếp hạng công khai không đủ:**

```text
Chúng đo trên tập dữ liệu chung, chủ yếu tiếng Anh, chủ yếu
các bài toán học thuật hoặc tổng quát.

Bài toán của bạn có thể rất khác:
  □ Tiếng Việt — không phải mô hình nào cũng đều nhau
  □ Miền hẹp — pháp lý, y tế, tài chính, mã nguồn của bạn
  □ Ràng buộc định dạng — trả JSON đúng schema mọi lần
  □ Chỉ dẫn dài và nhiều điều kiện

⇒ Một mô hình xếp thứ ba trên bảng chung có thể tốt nhất
  cho bạn. Cách duy nhất để biết là ĐO trên dữ liệu của mình.
```

**Cách so sánh có căn cứ:**

```text
① Chuẩn bị 30–100 ca THẬT từ hệ thống của bạn
   ⇒ Không phải ca bạn nghĩ ra. Ca người dùng thật đã gửi.
   ⇒ Nhớ đưa vào cả những ca ĐÃ TỪNG SAI.

② Định nghĩa "đúng" là gì cho từng ca
   ⇒ Đây là bước khó nhất, và nếu bỏ thì mọi so sánh sau đó
     là cảm tính.

③ Chạy cùng bộ đó qua các mô hình, CÙNG prompt
   ⇒ Đổi prompt giữa hai mô hình thì bạn đang so hai thứ.

④ Ghi lại: tỉ lệ đúng, chi phí, độ trễ p95

⑤ Chọn theo yêu cầu THẬT của bài toán, không theo điểm cao nhất
```

Bộ 30–100 ca này là tài sản dùng lại được: nó cũng chính là bộ eval để phát hiện hồi quy khi bạn đổi prompt hoặc khi nhà cung cấp cập nhật mô hình ([[vi-sao-danh-gia-ai-kho]]).

**Prompt phải điều chỉnh theo mô hình:**

```text
Cùng một prompt cho hai mô hình khác nhau có thể cho kết quả
rất khác — không phải vì mô hình dở, mà vì chúng phản ứng
khác nhau với cách diễn đạt.

⇒ Khi so sánh, nếu một mô hình cho kết quả kém, hãy thử
  điều chỉnh prompt cho nó TRƯỚC khi kết luận.
⇒ Và ghi lại: prompt gắn với mô hình. Đổi mô hình thì phải
  chạy lại bộ eval, không chỉ đổi tên trong cấu hình.
```

**Bốn thứ cần chuẩn bị cho việc đổi mô hình:**

```text
□ Bọc lời gọi mô hình sau một interface của mình
  ⇒ đổi nhà cung cấp là đổi một cài đặt ([[layered-va-hexagonal]])
□ Bộ eval sẵn sàng chạy
□ Prompt là cấu hình, không hardcode
□ Ghi log đủ để so sánh trước/sau

Bốn thứ này biến "đổi mô hình" từ một dự án thành một thí nghiệm.
```

## Tại sao cần nó

Vì hai lỗi ngược nhau đều tốn kém:

```text
DÙNG MÔ HÌNH MẠNH NHẤT CHO MỌI VIỆC:
  Hoá đơn cao gấp nhiều lần cần thiết.
  Độ trễ cao ⇒ trải nghiệm kém ở những việc cần nhanh.
  Và bạn không biết mô hình nhỏ có đủ hay không, vì chưa thử.

DÙNG MÔ HÌNH NHỎ NHẤT CHO MỌI VIỆC:
  Chất lượng kém ở đúng những chỗ quan trọng.
  Và bạn tốn nhiều công vào việc tinh chỉnh prompt để bù —
  công đó có thể đắt hơn khoản tiết kiệm.
```

**Ba câu hỏi lọc nhanh:**

```text
① Việc này người dùng có CHỜ không?
   Có ⇒ độ trễ là ràng buộc cứng.
   Không (chạy nền) ⇒ chọn theo chất lượng và chi phí.

② Có bao nhiêu lời gọi mỗi ngày?
   Ít ⇒ chi phí không đáng cân nhắc, chọn chất lượng.
   Rất nhiều ⇒ chênh lệch chi phí thành khoản tiền thật.

③ Sai thì hậu quả gì?
   Người dùng thấy ngay ⇒ mô hình nhỏ chấp nhận được.
   Không ai phát hiện ⇒ cần chất lượng cao và kiểm chứng.
```

**Và một lưu ý về sự thay đổi:** mô hình được cập nhật, giá thay đổi, mô hình mới xuất hiện. Nên quyết định này **không phải quyết định một lần**. Điều đáng đầu tư không phải chọn đúng mô hình hôm nay, mà là **có bộ eval và có lớp bọc** để đánh giá lại mà không tốn kém.

## So sánh

| | Mô hình nhỏ | Mô hình mạnh |
|---|---|---|
| Chất lượng lập luận phức tạp | thấp | cao |
| Chi phí | rất thấp | cao |
| Độ trễ | thấp | cao |
| Việc phù hợp | phân loại, trích xuất, định dạng | phân tích, lập kế hoạch, mã phức tạp |
| Cần prompt kỹ hơn | ✅ | ít hơn |

## Dễ nhầm

**1. Chọn theo bảng xếp hạng công khai.** Bài toán của bạn khác.

**2. Dùng một mô hình cho cả hệ thống.**

**3. Không đo trên dữ liệu của mình.**

**4. So sánh với ca tự nghĩ ra thay vì ca thật.**

**5. Dùng prompt khác nhau khi so hai mô hình.**

**6. Bỏ qua độ trễ.** Nó là yêu cầu chức năng.

**7. Chỉ đo tổng thời gian, không đo thời gian tới token đầu tiên.**

**8. Kết luận mô hình kém mà chưa thử điều chỉnh prompt cho nó.**

**9. Hardcode tên mô hình và prompt trong mã.**

**10. Coi đây là quyết định một lần.**

## Mẹo nhớ

> **Bốn trục: CHẤT LƯỢNG — CHI PHÍ — ĐỘ TRỄ — KIỂM SOÁT. Mô hình mạnh nhất thắng một, thua ba.**
>
> **Một hệ thống không cần một mô hình. Định tuyến theo việc.**
>
> **Đo trên 30–100 ca THẬT của bạn, cùng một prompt.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn trục đánh đổi?
2. Vì sao "chất lượng" không phải một con số?
3. Định tuyến theo việc là gì, lợi ích và cái giá?
4. Năm bước so sánh có căn cứ?
5. Bốn thứ cần chuẩn bị để đổi mô hình dễ dàng?

## Tự viết lại

Bạn xây một hệ thống hỗ trợ khách hàng: phân loại câu hỏi, trả lời câu thường gặp, và chuyển câu phức tạp cho người. Không nhìn lại, viết:

```text
① mô hình cho từng bước, kèm lý do theo bốn trục
② cách so sánh trước khi chọn
③ ràng buộc độ trễ cho từng bước
④ chuẩn bị gì để đổi mô hình sau này
```

Tự kiểm: ở ①, bước phân loại của bạn có dùng mô hình nhỏ không — và nếu phân loại sai thì hậu quả gì?

## Thử sức

Hệ thống của bạn dùng mô hình mạnh nhất cho mọi lời gọi. Hoá đơn 12.000 USD/tháng, p95 độ trễ 4 giây, người dùng phàn nàn chậm.

Ba câu để trả lời: bạn điều tra gì trước khi đổi bất cứ thứ gì; kế hoạch giảm chi phí và độ trễ theo thứ tự; và bạn **chứng minh** chất lượng không giảm bằng cách nào. Câu khó nhất: nếu chưa có bộ eval nào, bước đầu tiên của bạn là gì — và vì sao đổi mô hình trước khi có nó là rủi ro?
