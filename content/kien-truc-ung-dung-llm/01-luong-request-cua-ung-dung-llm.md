---
title: Luồng request của một ứng dụng LLM
slug: luong-request-cua-ung-dung-llm
summary: Từ câu hỏi tới câu trả lời — bảy chặng, và ba chặng quyết định chất lượng.
level: co-ban
tags: [ai, llm, kien-truc, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** vẽ được luồng đầy đủ của một request LLM, và biết chặng nào quyết định chất lượng.

## Ý tưởng chính

Một ứng dụng LLM **không phải** một lời gọi mô hình. Nó là một chuỗi chặng, trong đó lời gọi mô hình chỉ là một chặng.

Và điều đáng chú ý: phần lớn chất lượng quyết định ở **những chặng trước và sau** lời gọi đó — không ở bản thân lời gọi.

## Mental model

Hãy nghĩ tới **quy trình xử lý một đơn xin việc ở công ty**.

> Người phỏng vấn (mô hình) là một chặng. Nhưng trước đó có: lễ tân nhận đơn, bộ phận nhân sự sàng lọc, người chuẩn bị hồ sơ cho buổi phỏng vấn. Sau đó có: người ghi biên bản, người kiểm tra tính hợp lệ của quyết định.
>
> Nếu hồ sơ đưa vào buổi phỏng vấn **thiếu thông tin quan trọng**, người phỏng vấn giỏi cũng ra quyết định kém.
>
> Và nếu **không ai kiểm** quyết định đó, một sai sót sẽ đi thẳng ra ngoài.

Hai vế cuối là hai chặng quan trọng nhất: **chuẩn bị ngữ cảnh** và **kiểm đầu ra**.

## Ví dụ nhỏ

```text
① nhận request  ② xác thực + rate limit  ③ chuẩn bị ngữ cảnh
④ gọi mô hình   ⑤ kiểm đầu ra            ⑥ hành động / trả về
⑦ ghi log + số liệu
```

## Code chạy thế nào

**Bảy chặng, và mỗi chặng làm gì:**

```text
① NHẬN REQUEST
   Xác thực người dùng, lấy danh tính. Danh tính này đi theo
   suốt luồng — mọi truy hồi và mọi công cụ dùng nó.

② KIỂM SOÁT ĐẦU VÀO
   Rate limit theo người dùng, giới hạn độ dài đầu vào,
   kiểm nội dung nếu cần.
   ⇒ Đây là chặng chống lạm dụng, và nó rẻ.

③ CHUẨN BỊ NGỮ CẢNH          ← quyết định chất lượng nhiều nhất
   Chỉ dẫn hệ thống + lịch sử + dữ liệu truy hồi + câu hỏi
   ⇒ Đây là nơi RAG, bộ nhớ, và ngân sách token gặp nhau.

④ GỌI MÔ HÌNH
   Chọn mô hình, tham số, công cụ. Xử lý lỗi và retry.

⑤ KIỂM ĐẦU RA                ← quyết định độ tin cậy
   Parse, xác thực schema, kiểm trích dẫn, kiểm ràng buộc
   nghiệp vụ.

⑥ HÀNH ĐỘNG hoặc TRẢ VỀ
   Hiển thị, hoặc thực hiện hành động (cần lan can).

⑦ LOG và SỐ LIỆU
   Token, chi phí, độ trễ, và đủ dữ liệu để tái hiện.
```

**Vì sao chặng ③ và ⑤ quyết định nhiều nhất:**

```text
Chặng ③: mô hình chỉ biết những gì trong ngữ cảnh.
  Thiếu thông tin ⇒ nó suy đoán. Thừa thông tin ⇒ loãng.
  ⇒ Cải thiện ③ thường cho kết quả tốt hơn đổi mô hình
    ([[cung-cap-ngu-canh]]).

Chặng ⑤: đây là lớp duy nhất giữa đầu ra không xác định
  và người dùng (hoặc hành động).
  ⇒ Không có nó thì mọi lỗi của mô hình đi thẳng ra ngoài.
```

## Cú pháp

**Chặng ③ — ngân sách token cho từng phần:**

```text
chỉ dẫn hệ thống    ≤ 500 token    ← không bao giờ cắt
dữ liệu truy hồi    ≤ 4.000        ← cắt được, theo điểm
lịch sử hội thoại   ≤ 2.000        ← cắt được, giữ gần nhất
câu hỏi hiện tại    ≤ 500
đầu ra dự kiến      ≤ 1.000
────────────────────────────
tổng                ≈ 8.000

⇒ Có ngân sách rõ thì việc cắt là một quyết định, không phải
  một tai nạn ([[token-va-context-window]]).
```

**Chặng ⑤ — bốn lớp kiểm, từ rẻ tới đắt:**

```text
① PARSE và XÁC THỰC SCHEMA
   Rẻ nhất, bắt được lỗi định dạng.
② KIỂM RÀNG BUỘC NGHIỆP VỤ bằng mã
   "số tiền hoàn không vượt giá trị đơn"
   "mã sản phẩm phải tồn tại"
   ⇒ Lớp có giá trị cao nhất trên mỗi dòng mã.
③ KIỂM TRÍCH DẪN
   Trích dẫn có tồn tại? Có đúng nội dung?
   ([[tao-cau-tra-loi-va-trich-dan]])
④ MÔ HÌNH KIỂM
   Đắt nhất, dùng cho đầu ra quan trọng.
```

```text
Lớp ② hay bị bỏ và là lớp đáng làm nhất: nó bắt được những lỗi
mà không lớp nào khác bắt được, và nó là mã thường —
tất định, rẻ, test được.
```

**Đường đi nhanh — không phải mọi request cần mọi chặng:**

```text
Câu hỏi trùng lặp                → cache, bỏ qua ③–⑥
Câu hỏi ngoài phạm vi            → phân loại rẻ, trả lời mẫu
Câu hỏi đơn giản                 → mô hình nhỏ, không truy hồi
Câu hỏi phức tạp                 → luồng đầy đủ

⇒ Một bước phân loại rẻ ở đầu tiết kiệm đáng kể — và nó cũng
  giảm độ trễ cho phần lớn request ([[chon-mo-hinh]]).
```

**Xử lý lỗi ở mỗi chặng:**

```text
Chặng ③ truy hồi lỗi   → trả lời "không tìm thấy", KHÔNG để
                          mô hình đoán ([[rag-trong-thuc-te]])
Chặng ④ mô hình lỗi    → retry có backoff; hết retry thì
                          thông báo rõ ([[xu-ly-loi-va-du-phong-llm]])
Chặng ⑤ kiểm thất bại  → thử lại MỘT lần với chỉ dẫn rõ hơn,
                          rồi từ chối
Chặng ⑥ hành động lỗi  → không được im lặng; báo cho người dùng
```

## Tại sao cần nó

Vì nhìn hệ thống như "một lời gọi API" dẫn tới ba lỗi kiến trúc:

```text
① Không có chặng kiểm đầu ra
   ⇒ Mọi lỗi của mô hình đi thẳng ra ngoài.

② Không có ngân sách ngữ cảnh
   ⇒ Ngữ cảnh phình ra theo thời gian, chi phí tăng, chất lượng
     giảm, và không ai biết vì sao.

③ Không có đường đi nhanh
   ⇒ Mọi request trả giá của request phức tạp nhất.
```

**Và nó cho một cách gỡ lỗi có hệ thống:**

```text
"Câu trả lời này sai" ⇒ sai ở chặng nào?

  ③ Ngữ cảnh có đủ thông tin không?     → xem log ngữ cảnh
  ④ Mô hình trả về gì?                   → xem đầu ra thô
  ⑤ Có lỗi nào bị bỏ qua?                → xem kết quả kiểm

⇒ Không có log của từng chặng thì mọi báo cáo lỗi đều
  không điều tra được ([[quan-sat-ung-dung-llm]]).
```

**Bốn thứ log ở mỗi request:**

```text
□ Đầu vào và danh tính người dùng
□ Ngữ cảnh cuối cùng gửi đi (hoặc hash + các thành phần)
□ Đầu ra thô của mô hình, TRƯỚC khi xử lý
□ Kết quả các lớp kiểm, và quyết định cuối
```

Điểm thứ ba đáng nhấn: log đầu ra **sau** khi xử lý thì bạn không biết mô hình thật sự trả về gì.

## So sánh

| Chặng | Ảnh hưởng | Chi phí thêm |
|---|---|---|
| Kiểm soát đầu vào | chống lạm dụng | rất thấp |
| Chuẩn bị ngữ cảnh | **chất lượng** | vừa |
| Gọi mô hình | — | cao nhất |
| Kiểm đầu ra | **độ tin cậy** | thấp |
| Log và số liệu | khả năng cải thiện | thấp |

## Dễ nhầm

**1. Coi ứng dụng LLM là một lời gọi API.**

**2. Không có chặng kiểm đầu ra.**

**3. Không có ngân sách token cho từng phần.**

**4. Bỏ lớp kiểm ràng buộc nghiệp vụ.** Lớp đáng làm nhất.

**5. Không có đường đi nhanh cho câu hỏi đơn giản.**

**6. Không rate limit.** Mỗi request là một lời gọi mô hình.

**7. Truy hồi lỗi mà vẫn để mô hình trả lời.**

**8. Log đầu ra sau khi xử lý.** Mất bản gốc.

**9. Không log ngữ cảnh cuối cùng.** Không tái hiện được.

**10. Danh tính không đi theo suốt luồng.**

## Mẹo nhớ

> **Ứng dụng LLM là BẢY CHẶNG, không phải một lời gọi API.**
>
> **Chặng ③ (ngữ cảnh) quyết định CHẤT LƯỢNG. Chặng ⑤ (kiểm) quyết định ĐỘ TIN CẬY.**
>
> **Log ĐẦU RA THÔ, trước khi xử lý — nếu không bạn không biết mô hình trả về gì.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bảy chặng của một request?
2. Vì sao chặng ③ và ⑤ quyết định nhiều nhất?
3. Bốn lớp kiểm đầu ra, lớp nào đáng làm nhất?
4. Đường đi nhanh giải quyết gì?
5. Bốn thứ phải log mỗi request?

## Tự viết lại

Không nhìn lại, thiết kế luồng cho trợ lý trả lời câu hỏi về sản phẩm:

```text
① bảy chặng, với nội dung cụ thể ở mỗi chặng
② ngân sách token cho từng phần
③ ba lớp kiểm đầu ra
④ đường đi nhanh cho loại câu hỏi nào
⑤ bốn thứ log
```

Tự kiểm: ở ③, có lớp nào kiểm **ràng buộc nghiệp vụ** không — hay bạn chỉ kiểm định dạng?

## Thử sức

Trợ lý của bạn trả lời sai giá của một sản phẩm — nó nói 450.000đ trong khi giá thật là 540.000đ. Người dùng đã đặt hàng theo giá đó.

Ba câu để trả lời: sai có thể ở chặng nào, và bạn xác định bằng log gì; lớp kiểm nào đáng lẽ bắt được nó; và ba thay đổi theo thứ tự ưu tiên. Câu khó nhất: nếu giá 450.000đ **có** trong ngữ cảnh (từ một tài liệu cũ chưa cập nhật), thì lỗi nằm ở chặng nào — và điều đó đổi cách sửa của bạn ra sao?
