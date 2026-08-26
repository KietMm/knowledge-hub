---
title: Đánh giá hệ thống RAG
slug: danh-gia-he-thong-rag
summary: Đo riêng truy hồi và sinh câu trả lời — vì nếu gộp lại thì bạn không biết sửa ở đâu.
level: nang-cao
tags: [ai, rag, danh-gia, do-tin-cay]
khung: v2
---

> **Sau bài này bạn sẽ:** đo riêng hai tầng của RAG, và biết chỉ số nào nói cho bạn phải sửa ở đâu.

## Ý tưởng chính

RAG có hai tầng có thể hỏng độc lập: **truy hồi** và **sinh câu trả lời**.

Đo chỉ một con số "tỉ lệ trả lời đúng" cho bạn biết hệ thống có vấn đề, nhưng **không nói sửa ở đâu**. Và hai tầng cần hai cách sửa hoàn toàn khác nhau.

## Mental model

Hãy nghĩ tới **chẩn đoán một dây chuyền hai công đoạn**.

> Sản phẩm cuối bị lỗi 30%. Bạn có thể đứng ở cuối dây chuyền và đếm — nhưng đếm mãi cũng không biết công đoạn nào gây ra.
>
> Cách làm đúng: **đặt một điểm kiểm ở giữa**. Bán thành phẩm ra khỏi công đoạn một có đúng không?
>
> - Bán thành phẩm sai ⇒ sửa công đoạn một.
> - Bán thành phẩm đúng mà sản phẩm cuối sai ⇒ sửa công đoạn hai.
>
> Không có điểm kiểm giữa, bạn sẽ tối ưu công đoạn hai trong khi lỗi nằm ở công đoạn một.

Điểm kiểm giữa đó là **đo truy hồi riêng**. Nó là thứ đầu tiên cần dựng.

## Ví dụ nhỏ

```text
30 câu hỏi kiểm tra:
  Đoạn đúng nằm trong top-5:        24/30  (80%)
  Trong 24 ca đó, trả lời đúng:     20/24  (83%)
  ────────────────────────────────────────
  Tổng đúng:                        20/30  (67%)

⇒ Biết ngay: sửa truy hồi được thêm ~6 ca; sửa sinh câu trả lời
  được thêm ~4 ca. Truy hồi là chỗ đáng làm trước.
```

## Code chạy thế nào

**Bộ dữ liệu đánh giá — ba cột:**

```text
CÂU HỎI              — lấy từ log thật, không tự nghĩ ra
ĐOẠN ĐÚNG (id)       — đoạn nào CHỨA câu trả lời
CÂU TRẢ LỜI ĐÚNG    — bằng lời, để so sánh

Cột thứ hai là cột tốn công nhất và quan trọng nhất:
không có nó thì không đo được truy hồi riêng.
⇒ Cách làm khả thi: lấy 30–50 câu hỏi thật, tự tìm đoạn đúng
  trong kho. Mất một buổi, và dùng lại được mãi.
```

**Chỉ số cho tầng truy hồi:**

```text
RECALL@k  — quan trọng nhất
  Tỉ lệ ca mà đoạn đúng NẰM TRONG top-k.
  ⇒ Đây là TRẦN của toàn hệ thống: đoạn đúng không có trong
    ngữ cảnh thì không cách nào trả lời đúng.

PRECISION@k
  Trong k đoạn trả về, bao nhiêu thật sự liên quan.
  ⇒ Thấp ⇒ ngữ cảnh loãng, tốn token, và mô hình dễ bị nhiễu.

MRR (thứ hạng của đoạn đúng)
  Đoạn đúng ở vị trí 1 hay vị trí 5?
  ⇒ Càng cao càng tốt vì thông tin ở đầu ngữ cảnh được dùng
    tốt hơn ([[token-va-context-window]]).
```

```text
Đo recall@5 và recall@20 cùng lúc rất hữu ích:
  recall@20 cao, recall@5 thấp ⇒ tìm được, nhưng XẾP HẠNG kém
    ⇒ thêm bước xếp hạng lại ([[truy-hoi-va-xep-hang-lai]])
  cả hai đều thấp ⇒ vấn đề ở CHIA ĐOẠN hoặc ở cách tìm
    ⇒ xếp hạng lại sẽ không giúp gì
```

Phân biệt hai trường hợp này tiết kiệm được rất nhiều công đi sai hướng.

## Cú pháp

**Chỉ số cho tầng sinh câu trả lời:**

```text
① BÁM NGUỒN (faithfulness)
   Mọi khẳng định có dựa trên ngữ cảnh không?
   ⇒ Đo được: kiểm trích dẫn tồn tại, và (đắt hơn) kiểm nội dung.
   ⇒ Đây là chỉ số quan trọng nhất của tầng này.

② TRẢ LỜI ĐÚNG CÂU HỎI (relevance)
   Có đúng ý câu hỏi, hay trả lời một câu khác?

③ ĐẦY ĐỦ
   Có bỏ sót phần nào của câu trả lời không?

④ TỈ LỆ TỪ CHỐI ĐÚNG
   Với ca thật sự không có thông tin, nó có nói "không tìm thấy"
   không — hay suy đoán?
   ⇒ Chỉ số này hay bị bỏ, và nó bắt được loại lỗi tệ nhất.
```

**Bộ ca kiểm phải có bốn loại:**

```text
□ Câu hỏi có câu trả lời rõ ràng trong MỘT đoạn      (~50%)
□ Câu hỏi cần TỔNG HỢP nhiều đoạn                    (~20%)
□ Câu hỏi KHÔNG CÓ câu trả lời trong tài liệu        (~20%)
  ⇒ Loại này bắt buộc phải có. Nó đo chỉ số ④.
□ Câu hỏi ngoài phạm vi, hoặc cố tình phá            (~10%)
```

```text
Bộ chỉ có loại thứ nhất là bộ nói với bạn rằng hệ thống rất tốt —
và không phát hiện được vấn đề nghiêm trọng nào.
```

**Đo trong production — thứ bộ ca kiểm không thay thế được:**

```text
① TỈ LỆ "KHÔNG TÌM THẤY"
   Tăng đột ngột ⇒ có tài liệu bị mất, hoặc truy hồi hỏng.
   Giảm về gần 0 ⇒ đáng nghi: mô hình đang suy đoán.

② PHẢN HỒI NGƯỜI DÙNG (nút hài lòng / báo sai)
   ⇒ Nguồn ca kiểm tốt nhất. Mỗi báo sai → thêm vào bộ.

③ CÂU HỎI KHÔNG TÌM ĐƯỢC ĐOẠN NÀO đủ điểm
   ⇒ Danh sách này chỉ ra LỖ HỔNG TÀI LIỆU: người dùng đang hỏi
     những thứ bạn chưa viết ra.
   ⇒ Đây là đầu ra có giá trị nghiệp vụ, không chỉ kỹ thuật.

④ ĐOẠN NÀO ĐƯỢC TRUY HỒI NHIỀU NHẤT
   ⇒ Đoạn xuất hiện ở mọi câu hỏi thường là đoạn quá chung,
     đang chen vào và làm loãng ngữ cảnh.
```

Chỉ số ③ đáng chú ý: nó biến hệ thống RAG thành một công cụ phát hiện thiếu sót trong tài liệu.

## Tại sao cần nó

Vì không đo riêng hai tầng thì việc cải thiện là đoán:

```text
"Trả lời đúng 67%" ⇒ sửa gì?
  Đổi prompt? Đổi mô hình? Đổi embedding? Chia đoạn lại?
  ⇒ Thử từng cái, mỗi lần vài ngày, và không biết cái nào có tác dụng.

"recall@5 = 80%, đúng-khi-truy-hồi-đúng = 83%" ⇒ rõ ràng:
  Trần đang là 80%. Sửa sinh câu trả lời tối đa lên được 80%.
  ⇒ Làm truy hồi trước.
```

**Thứ tự cải thiện, dựa vào số:**

```text
recall@k thấp
  → kiểm chia đoạn ([[chia-doan-tai-lieu]])
  → thêm tìm từ khoá
  → viết lại câu hỏi

recall@20 cao nhưng recall@5 thấp
  → thêm xếp hạng lại

recall tốt nhưng trả lời sai
  → sửa prompt sinh câu trả lời
  → tăng ràng buộc nguồn, yêu cầu trích dẫn

Tỉ lệ từ chối đúng thấp
  → nói rõ trong prompt cách xử lý khi không có
  → thêm ngưỡng điểm ở truy hồi
```

**Và một điều cần đưa vào CI:**

```text
Bộ ca kiểm nên chạy tự động khi:
  □ Đổi prompt
  □ Đổi cách chia đoạn hoặc thêm tài liệu
  □ Đổi mô hình embedding hoặc mô hình sinh
  □ ĐỊNH KỲ — nhà cung cấp cập nhật mô hình mà không đổi tên
    ⇒ hành vi đổi mà không ai chạm vào mã
    ([[lap-va-cai-thien-prompt]])
```

## So sánh

| Chỉ số | Đo tầng nào | Nói lên |
|---|---|---|
| recall@k | truy hồi | trần của hệ thống |
| precision@k | truy hồi | ngữ cảnh có loãng không |
| MRR | truy hồi | xếp hạng có tốt không |
| bám nguồn | sinh | có ảo giác không |
| tỉ lệ từ chối đúng | sinh | có suy đoán không |
| phản hồi người dùng | cả hai | thực tế |

## Dễ nhầm

**1. Chỉ đo một con số "tỉ lệ đúng".** Không biết sửa ở đâu.

**2. Không có cột "đoạn đúng" trong bộ dữ liệu.** Không đo được truy hồi riêng.

**3. Bộ ca kiểm chỉ có câu hỏi dễ.**

**4. Không có ca "không có câu trả lời".** Bỏ mất chỉ số quan trọng.

**5. Không đo recall@k ở nhiều mức k.** Bỏ mất manh mối về xếp hạng.

**6. Cải thiện tầng sinh khi recall đang là trần.**

**7. Không theo dõi tỉ lệ "không tìm thấy" trong production.**

**8. Bỏ qua danh sách câu hỏi không tìm được đoạn nào.**

**9. Không chạy bộ ca kiểm định kỳ.** Bỏ sót hồi quy từ bên ngoài.

**10. Không thêm ca báo sai vào bộ ca kiểm.**

## Mẹo nhớ

> **Đo RIÊNG hai tầng. Một con số tổng không nói được sửa ở đâu.**
>
> **recall@k là TRẦN của toàn hệ thống. Sửa nó trước.**
>
> **recall@20 cao mà recall@5 thấp ⇒ vấn đề XẾP HẠNG, không phải tìm kiếm.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao phải đo riêng hai tầng?
2. Ba chỉ số cho tầng truy hồi, cái nào quan trọng nhất?
3. Bốn loại ca phải có trong bộ ca kiểm?
4. recall@20 cao mà recall@5 thấp nghĩa là gì?
5. Bốn chỉ số đo trong production?

## Tự viết lại

Không nhìn lại, thiết kế bộ đánh giá cho một trợ lý RAG:

```text
① cấu trúc bộ dữ liệu, bao nhiêu ca, tỉ lệ từng loại
② chỉ số cho mỗi tầng
③ ba số liệu theo dõi trong production
④ khi nào chạy bộ ca kiểm
```

Tự kiểm: bộ của bạn có bao nhiêu phần trăm ca "không có câu trả lời" — và nếu là 0%, bạn đang không đo được điều gì?

## Thử sức

Trợ lý RAG có "tỉ lệ hài lòng" 60% theo phản hồi người dùng. Đội đã đổi mô hình embedding và đổi prompt ba lần trong hai tháng, không cải thiện.

Ba câu để trả lời: bạn dựng bộ đánh giá thế nào và mất bao lâu; số liệu đầu tiên bạn muốn biết; và bạn quyết định hướng cải thiện dựa vào đó ra sao. Câu khó nhất: nếu recall@20 là 95% nhưng recall@5 chỉ 55%, bạn làm gì — và vì sao việc đổi mô hình embedding lần thứ tư gần như chắc chắn không giúp?
