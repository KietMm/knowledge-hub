---
title: Agent là gì và khi nào cần
slug: agent-la-gi-va-khi-nao-can
summary: Khác biệt duy nhất giữa agent và một luồng có công cụ — và vì sao phần lớn bài toán không cần agent.
level: co-ban
tags: [ai, agent, kien-truc, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** phân biệt được agent với luồng cố định, và nhận ra khi nào bạn chưa cần agent.

## Ý tưởng chính

Một luồng có công cụ: **bạn** quyết định thứ tự các bước.

Một **agent**: **mô hình** quyết định bước tiếp theo, dựa trên kết quả của bước trước, và tự quyết định khi nào xong.

Đó là khác biệt duy nhất — và nó đổi mọi thứ về khả năng, độ trễ, chi phí, và khả năng dự đoán.

## Mental model

Hãy nghĩ tới **hai cách giao việc cho một người giúp việc**.

> **Danh sách việc cố định**: "① mua rau ở chợ ② nấu cơm ③ lau nhà". Bạn biết chính xác họ sẽ làm gì, mất bao lâu, và tốn bao nhiêu.
>
> **Mục tiêu mở**: "làm nhà sạch sẽ và có cơm chiều". Họ tự quyết định làm gì trước, phát hiện hết gas thì đi mua, thấy bếp bẩn thì lau trước.
>
> Cách hai mạnh hơn hẳn cho **những việc bạn không lường trước được**. Nhưng bạn **không biết trước** họ sẽ làm gì, mất bao lâu, và có thể họ lau nhà ba lần mà chưa nấu cơm.

Vế cuối là toàn bộ cái giá của agent: **bạn đổi khả năng dự đoán lấy khả năng thích nghi**.

## Ví dụ nhỏ

```text
LUỒNG CỐ ĐỊNH (mã của bạn quyết định)
  tra đơn → tra chính sách → tính phí → soạn câu trả lời

AGENT (mô hình quyết định)
  mục tiêu: "giải quyết khiếu nại của khách"
  → nó tự chọn: tra đơn, đọc lịch sử chat, tra chính sách,
    tính bồi thường, tạo ticket... theo thứ tự nó thấy hợp lý,
    và tự quyết định khi nào đủ
```

## Code chạy thế nào

**Vòng lặp agent — ba bước lặp lại:**

```text
① QUAN SÁT   trạng thái hiện tại, kết quả các bước trước
② QUYẾT ĐỊNH mô hình chọn: gọi công cụ nào, hay đã xong
③ HÀNH ĐỘNG  bạn chạy công cụ, đưa kết quả về ngữ cảnh
   → lặp lại từ ①

Dừng khi: mô hình nói đã xong, HOẶC chạm trần số bước,
          HOẶC bạn dừng nó.
```

```text
Điều quan trọng: đây KHÔNG phải một kiến trúc mới.
Nó là vòng lặp function calling ([[function-calling-co-ban]])
với một thay đổi: KHÔNG có thứ tự định trước, và mô hình
tự quyết định khi nào dừng.
```

**Từ đó suy ra ba hệ quả:**

```text
① KHÔNG DỰ ĐOÁN ĐƯỢC CHI PHÍ VÀ ĐỘ TRỄ
   Cùng một yêu cầu, lần này 3 bước, lần sau 11 bước.
   ⇒ Không thể hứa với người dùng "mất khoảng 5 giây".

② NGỮ CẢNH LỚN DẦN THEO SỐ BƯỚC
   Mỗi bước thêm đề nghị + kết quả vào ngữ cảnh.
   ⇒ Bước thứ 15 có ngữ cảnh rất lớn ⇒ đắt, chậm, và chất lượng
     giảm ([[token-va-context-window]]).

③ SAI SỐ TÍCH LUỸ
   Mỗi bước quyết định đúng 95% ⇒ 10 bước ≈ 60% đúng cả chuỗi.
   ⇒ Đây là lý do agent nhiều bước khó đáng tin.
```

Hệ quả ③ là con số quan trọng nhất cần nhớ: **agent càng nhiều bước, xác suất thành công càng giảm theo cấp số**.

## Cú pháp

**Khi nào KHÔNG cần agent — và đó là phần lớn trường hợp:**

```text
❌ Luồng có thứ tự CỐ ĐỊNH
   "tra đơn → tính phí → trả lời" luôn theo thứ tự đó
   ⇒ Viết mã. Đúng hơn, nhanh hơn, rẻ hơn, và test được.

❌ Chỉ cần một công cụ
   ⇒ Function calling thường là đủ.

❌ Người dùng đang CHỜ và cần dưới 3 giây
   ⇒ Agent không đảm bảo được độ trễ.

❌ Hành động khó đảo, không có người duyệt
   ⇒ Rủi ro quá cao cho một luồng không dự đoán được.
```

**Khi nào agent là lựa chọn đúng:**

```text
✅ ĐƯỜNG ĐI THẬT SỰ THAY ĐỔI theo tình huống
   Gỡ lỗi một sự cố: bước tiếp theo phụ thuộc vào những gì
   bước trước tìm được. Không có luồng cố định nào đúng.

✅ KHÔNG BIẾT TRƯỚC cần bao nhiêu bước
   "Tìm mọi chỗ trong repo dùng thư viện X và cập nhật chúng"

✅ CẦN THỬ VÀ SỬA
   Viết mã → chạy test → test đỏ → đọc lỗi → sửa → chạy lại
   ⇒ Đây là loại việc agent mạnh nhất: có VÒNG PHẢN HỒI rõ ràng
     và KIỂM CHỨNG ĐƯỢC.

✅ Chạy NỀN, không ai chờ
   ⇒ Độ trễ không quan trọng, và có chỗ cho retry.
```

Điểm chung của bốn trường hợp trên: **kết quả kiểm chứng được**, và **đường đi không đoán trước được**. Thiếu điều kiện thứ nhất thì agent chỉ đang tích luỹ sai số.

**Ba mức, không phải hai:**

```text
① LUỒNG CỐ ĐỊNH        mã quyết định mọi bước
② LUỒNG CÓ NHÁNH       mã quyết định, mô hình chỉ trả lời
                        câu hỏi phân loại ở mỗi nhánh
③ AGENT                mô hình quyết định đường đi

⇒ Mức ② phủ được rất nhiều bài toán mà người ta tưởng cần mức ③.
⇒ Nó giữ được khả năng dự đoán và test, mà vẫn linh hoạt ở
  những chỗ cần suy luận.
```

Mức ② là lựa chọn bị bỏ qua nhiều nhất, và thường là câu trả lời đúng.

## Tại sao cần nó

Vì agent được chọn quá thường xuyên, và cái giá không hiện ra khi thử:

```text
Thử với một ví dụ đơn giản: agent chạy 3 bước, ra kết quả đúng.
Trông rất ấn tượng.

Đưa vào production:
  □ Có request chạy 15 bước, mất 40 giây
  □ Có request lặp vòng, chạm trần, trả về nửa vời
  □ Chi phí gấp 5–10 lần dự tính
  □ Gỡ lỗi rất khó: mỗi lần chạy một đường khác nhau
  □ Không test được theo cách thường: không có đầu ra tất định
```

**Bốn thứ bắt buộc nếu dùng agent:**

```text
① TRẦN SỐ BƯỚC — không có thì có vòng lặp vô hạn
② TRẦN CHI PHÍ mỗi nhiệm vụ
③ LOG TOÀN BỘ đường đi: mỗi bước, mỗi công cụ, mỗi kết quả
   ⇒ Không có nó thì "agent làm sai" là báo cáo không điều tra được
④ ĐIỂM DỪNG cho hành động khó đảo — người xác nhận
   ([[gioi-han-va-lan-can-agent]])
```

**Và một câu hỏi nên hỏi trước:**

```text
"Nếu tôi viết luồng này bằng mã, nó sẽ trông thế nào?"

Viết ra được một luồng rõ ràng ⇒ bạn không cần agent.
Không viết ra được, vì đường đi phụ thuộc quá nhiều vào
kết quả trung gian ⇒ agent có thể đúng.

⇒ Câu hỏi này lọc được phần lớn trường hợp, và nó buộc bạn
  hiểu bài toán trước khi chọn kiến trúc
  ([[kien-truc-la-gi-va-khi-nao-can]]).
```

## So sánh

| | Luồng cố định | Luồng có nhánh | Agent |
|---|---|---|---|
| Ai quyết định đường đi | mã | mã | **mô hình** |
| Dự đoán chi phí, độ trễ | ✅ | ✅ | ❌ |
| Test được | ✅ | ✅ | khó |
| Linh hoạt | thấp | vừa | **cao** |
| Gỡ lỗi | dễ | dễ | khó |
| Phù hợp | phần lớn bài toán | nhiều bài toán | ít bài toán |

## Dễ nhầm

**1. Dùng agent cho luồng có thứ tự cố định.**

**2. Bỏ qua mức "luồng có nhánh".** Nó phủ nhiều bài toán hơn người ta nghĩ.

**3. Không giới hạn số bước.**

**4. Không giới hạn chi phí.**

**5. Không log toàn bộ đường đi.**

**6. Cho agent hành động khó đảo mà không có người duyệt.**

**7. Dùng agent khi người dùng đang chờ và cần nhanh.**

**8. Bỏ qua sai số tích luỹ.** 10 bước × 95% ≈ 60%.

**9. Đánh giá agent bằng một ví dụ chạy tốt.**

**10. Dùng agent cho việc không kiểm chứng được kết quả.**

## Mẹo nhớ

> **Khác biệt duy nhất: MÔ HÌNH quyết định bước tiếp theo, không phải bạn.**
>
> **Bạn đổi KHẢ NĂNG DỰ ĐOÁN lấy KHẢ NĂNG THÍCH NGHI.**
>
> **Hỏi trước: "viết luồng này bằng mã thì trông thế nào?" Viết ra được ⇒ không cần agent.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Khác biệt duy nhất giữa agent và luồng có công cụ?
2. Ba hệ quả suy ra từ việc mô hình quyết định đường đi?
3. Sai số tích luỹ: 10 bước với 95% mỗi bước cho ra bao nhiêu?
4. Bốn trường hợp agent là lựa chọn đúng, điểm chung của chúng?
5. "Luồng có nhánh" là gì và vì sao nó hay bị bỏ qua?

## Tự viết lại

Không nhìn lại, chọn mức (cố định / có nhánh / agent) và giải thích:

```text
① Trả lời câu hỏi từ tài liệu nội bộ
② Xử lý khiếu nại: đọc lịch sử, tra đơn, quyết định bồi thường
③ Trích xuất dữ liệu từ hoá đơn
④ Tìm và sửa mọi chỗ dùng một API đã lỗi thời trong repo
⑤ Định tuyến ticket vào đúng phòng ban
```

Tự kiểm: ở ②, bạn có viết ra được một luồng cố định không — và nếu có, vì sao vẫn có người muốn dùng agent ở đây?

## Thử sức

Đội đề xuất chuyển trợ lý hỗ trợ khách hàng từ luồng cố định sang agent, lý do: "để nó linh hoạt hơn".

Ba câu để trả lời: bạn hỏi lại những gì để xác định vấn đề thật; nếu vấn đề là "luồng cố định không xử lý được một số ca", bạn đề xuất gì trước khi chuyển sang agent; và nếu vẫn chuyển, bốn thứ phải chuẩn bị. Câu khó nhất: người dùng đang chờ câu trả lời — agent làm độ trễ không dự đoán được, bạn xử lý điều đó trong thiết kế giao diện thế nào?
