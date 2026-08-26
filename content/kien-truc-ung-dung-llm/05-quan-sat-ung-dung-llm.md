---
title: Quan sát ứng dụng LLM
slug: quan-sat-ung-dung-llm
summary: Log gì để tái hiện được, chỉ số nào nói lên chất lượng, và vì sao tỉ lệ lỗi không đủ.
level: nang-cao
tags: [ai, llm, van-hanh, danh-gia]
khung: v2
---

> **Sau bài này bạn sẽ:** log đủ để tái hiện mọi câu trả lời, và biết chỉ số nào bắt được suy giảm chất lượng.

## Ý tưởng chính

Hệ thống thường hỏng theo cách **có tín hiệu**: lỗi tăng, độ trễ tăng. Bạn cảnh báo trên đó.

Ứng dụng LLM có thể hỏng **mà không có tín hiệu nào**: tỉ lệ lỗi 0%, độ trễ bình thường, và câu trả lời sai. Nên bộ chỉ số phải khác.

## Mental model

Hãy nghĩ tới **đánh giá một tổng đài viên**.

> Bạn có thể đo: bao nhiêu cuộc gọi, dài bao lâu, có bị ngắt không. Ba chỉ số đó **đều tốt** ở một người trả lời sai mọi câu.
>
> Muốn biết chất lượng, bạn cần: **nghe lại một số cuộc gọi**, **xem khách có gọi lại không**, và **đếm khiếu nại**.
>
> Và để nghe lại được, bạn phải **ghi âm** — quyết định đó phải có trước, không phải sau khi có vấn đề.

Ba việc đó là: **log đủ để tái hiện**, **đo chỉ số hành vi**, và **thu phản hồi**. Chỉ số hạ tầng một mình không nói gì về chất lượng.

## Ví dụ nhỏ

```text
Mọi chỉ số hạ tầng đều xanh:
  tỉ lệ lỗi 0,1%   p95 1,8s   uptime 99,9%

Và:
  40% người dùng hỏi lại cùng câu ngay sau đó
  ⇒ Câu trả lời không dùng được. Không chỉ số nào ở trên thấy.
```

## Code chạy thế nào

**Log gì để tái hiện được một câu trả lời:**

```text
□ ID request và ID người dùng
□ Đầu vào nguyên văn
□ NGỮ CẢNH CUỐI CÙNG gửi đi — hoặc các thành phần của nó
  (id đoạn truy hồi + điểm, phiên bản prompt, lịch sử đã cắt)
□ Mô hình và THAM SỐ (temperature, max tokens)
□ ĐẦU RA THÔ, trước khi xử lý
□ Kết quả các lớp kiểm, và quyết định cuối
□ Token vào/ra, chi phí, độ trễ (TTFT và tổng)
□ Nếu có công cụ: chuỗi công cụ, tham số, kết quả
```

```text
Hai điểm quan trọng nhất:
  ① ĐẦU RA THÔ — log sau khi xử lý thì bạn không biết mô hình
    thật sự trả về gì.
  ② PHIÊN BẢN PROMPT — không có nó thì "câu này sai" không
    quy được về phiên bản nào ([[lap-va-cai-thien-prompt]]).
```

**Ba nhóm chỉ số:**

```text
① HẠ TẦNG — cần, nhưng KHÔNG nói gì về chất lượng
   tỉ lệ lỗi, TTFT, tổng độ trễ, token, chi phí

② HÀNH VI NGƯỜI DÙNG — nói lên chất lượng, và rẻ để đo
   □ Tỉ lệ hỏi lại ngay sau đó (diễn đạt lại cùng câu)
     ⇒ Chỉ số tốt nhất và ít người đo nhất
   □ Tỉ lệ bỏ giữa dòng (với streaming)
   □ Tỉ lệ chuyển sang người thật (nếu có)
   □ Tỉ lệ bấm vào nguồn trích dẫn
     ⇒ Cao có thể là tốt (họ kiểm) hoặc xấu (họ không tin)

③ CHẤT LƯỢNG TRỰC TIẾP
   □ Nút hài lòng / báo sai
   □ Tỉ lệ "không tìm thấy" (RAG)
   □ Điểm bộ eval chạy định kỳ ([[chan-hoi-quy-ai]])
```

```text
Nhóm ② là nhóm đáng đầu tư nhất: nó phản ánh chất lượng thật,
đo được tự động, và không cần người chấm.
```

## Cú pháp

**Tỉ lệ hỏi lại — chỉ số dẫn hướng tốt nhất:**

```text
Người dùng nhận câu trả lời, rồi hỏi lại cùng ý bằng cách khác
trong vòng 30 giây.

⇒ Đó là tín hiệu rõ ràng rằng câu trả lời không dùng được —
  và người dùng không cần bấm nút gì.
⇒ Đo bằng cách so ngữ nghĩa hai câu hỏi liên tiếp của cùng
  một người ([[embedding-la-gi]]).

⇒ Tăng đột ngột ⇒ có gì đó vừa xấu đi: prompt mới, tài liệu
  bị mất, mô hình được cập nhật.
```

**Ba loại suy giảm âm thầm cần canh:**

```text
① NHÀ CUNG CẤP CẬP NHẬT MÔ HÌNH
   Không ai chạm vào mã, hành vi đổi.
   ⇒ Canh bằng: bộ eval chạy định kỳ, không chỉ khi deploy.

② DỮ LIỆU LỆCH VỚI NGUỒN
   Tài liệu xoá mà đoạn còn, hoặc tài liệu mới chưa được nạp.
   ⇒ Canh bằng: đối chiếu định kỳ, và tỉ lệ "không tìm thấy"
     ([[van-hanh-vector-store]]).

③ PROMPT PHÌNH DẦN
   Mỗi ca sai thêm một dòng ⇒ token tăng, và các dòng bắt đầu
   mâu thuẫn.
   ⇒ Canh bằng: token trung bình mỗi request theo thời gian.
```

Cả ba đều **không** làm tỉ lệ lỗi tăng. Đó là lý do bộ chỉ số hạ tầng bỏ sót chúng hoàn toàn.

**Lấy mẫu để người đọc — bắt buộc:**

```text
Mỗi tuần, đọc 20–30 cuộc trò chuyện thật.
  □ Chọn ngẫu nhiên, cộng thêm những ca bị báo sai
  □ Đánh giá: có đúng không, có hữu ích không, có bịa không

⇒ Không công cụ tự động nào thay được việc này. Nó bắt được
  những vấn đề bạn chưa nghĩ tới, và nó cho bạn ca mới cho
  bộ eval ([[xay-bo-eval]]).
⇒ Đây là công việc định kỳ, không phải việc làm một lần khi ra mắt.
```

**Quyền riêng tư trong log — cân nhắc thật:**

```text
Log ngữ cảnh đầy đủ nghĩa là log cả dữ liệu người dùng.

□ Che dữ liệu không cần thiết trước khi log
□ Thời hạn lưu rõ ràng, và xoá tự động
□ Ai đọc được log đó — phân quyền
□ Người dùng yêu cầu xoá ⇒ phải xoá được cả trong log
  ([[ranh-gioi-va-trach-nhiem]])

⇒ Đánh đổi thật: log ít thì không gỡ lỗi được, log nhiều thì
  là một kho dữ liệu cá nhân phải bảo vệ.
⇒ Cách cân bằng thường dùng: log đầy đủ với thời hạn ngắn
  (7–14 ngày), log tổng hợp với thời hạn dài.
```

## Tại sao cần nó

Vì không có quan sát đúng, bạn không biết hệ thống đang tốt hay xấu:

```text
Câu hỏi bạn PHẢI trả lời được:
  □ Tuần này chất lượng tốt hơn hay xấu hơn tuần trước?
  □ Câu trả lời này sai — vì sao? (tái hiện được không?)
  □ Chi phí mỗi request đang tăng hay giảm?
  □ Có loại câu hỏi nào hệ thống làm kém?

⇒ Không log đủ thì cả bốn câu đều không trả lời được.
⇒ Và bạn chỉ biết có vấn đề khi người dùng phàn nàn đủ nhiều.
```

**Bốn thứ nên có ngay từ ngày đầu:**

```text
□ Log đủ để tái hiện (gồm đầu ra thô và phiên bản prompt)
□ Nút báo sai, và một chỗ đọc các báo cáo đó
□ Tỉ lệ hỏi lại
□ Token và chi phí mỗi request

⇒ Bốn thứ này rẻ để thêm lúc đầu. Thêm sau thì bạn mất toàn bộ
  dữ liệu của giai đoạn trước — đúng giai đoạn có nhiều vấn đề nhất.
```

## So sánh

| Nhóm chỉ số | Nói lên | Đo tự động |
|---|---|---|
| Hạ tầng (lỗi, độ trễ) | hệ thống có chạy | ✅ |
| Hành vi người dùng | **chất lượng thật** | ✅ |
| Phản hồi trực tiếp | chất lượng, có ngữ cảnh | ✅ (cần nút) |
| Bộ eval | hồi quy | ✅ |
| Người đọc mẫu | vấn đề chưa nghĩ tới | ❌ |

## Dễ nhầm

**1. Chỉ đo chỉ số hạ tầng.** Chúng xanh khi chất lượng tệ.

**2. Log đầu ra sau khi xử lý.** Mất bản gốc.

**3. Không log phiên bản prompt.** Không quy được lỗi về đâu.

**4. Không log ngữ cảnh cuối cùng.** Không tái hiện được.

**5. Không đo tỉ lệ hỏi lại.** Chỉ số dẫn hướng tốt nhất.

**6. Chỉ chạy eval khi deploy.** Bỏ sót việc mô hình được cập nhật.

**7. Không theo dõi token trung bình theo thời gian.** Prompt phình dần.

**8. Không có ai đọc mẫu cuộc trò chuyện.**

**9. Log dữ liệu cá nhân không giới hạn thời hạn.**

**10. Thêm quan sát sau khi có vấn đề.** Mất dữ liệu giai đoạn quan trọng nhất.

## Mẹo nhớ

> **Ứng dụng LLM hỏng mà tỉ lệ lỗi vẫn 0%. Chỉ số hạ tầng không nói gì về chất lượng.**
>
> **Log ĐẦU RA THÔ và PHIÊN BẢN PROMPT — thiếu hai thứ này thì không tái hiện được.**
>
> **Tỉ lệ HỎI LẠI là chỉ số chất lượng tốt nhất mà đo tự động được.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Tám thứ phải log để tái hiện một câu trả lời?
2. Ba nhóm chỉ số, nhóm nào đáng đầu tư nhất?
3. Tỉ lệ hỏi lại đo thế nào và nói lên gì?
4. Ba loại suy giảm âm thầm, canh bằng gì?
5. Bốn thứ nên có ngay từ ngày đầu?

## Tự viết lại

Không nhìn lại, thiết kế quan sát cho trợ lý hỗ trợ khách hàng:

```text
① những gì log mỗi request
② năm chỉ số, phân theo ba nhóm
③ ba cảnh báo, kèm ngưỡng
④ quy trình đọc mẫu định kỳ
⑤ chính sách lưu log và quyền riêng tư
```

Tự kiểm: với dữ liệu bạn log, bạn có tái hiện được **chính xác** một câu trả lời của tuần trước không?

## Thử sức

Người dùng báo trợ lý "dạo này trả lời tệ hơn". Mọi chỉ số hạ tầng bình thường. Không ai chạm vào mã trong ba tuần.

Ba câu để trả lời: ba nguyên nhân khả dĩ nhất khi không ai chạm vào mã; bạn kiểm từng cái bằng dữ liệu nào; và nếu không có bộ eval nào, bạn làm gì trước. Câu khó nhất: nếu không có dữ liệu của ba tuần trước để so, bạn xác định "tệ hơn" bằng cách nào — và điều đó nói gì về việc nên thêm quan sát lúc nào?
