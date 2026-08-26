---
title: Đọc đánh đổi
slug: doc-danh-doi
summary: Không có lựa chọn tốt nhất, chỉ có lựa chọn phù hợp với ràng buộc — và cách nói ra ràng buộc đó.
level: trung-cap
tags: [tu-duy, danh-doi, dan-dat, kien-truc]
khung: v2
---

> **Sau bài này bạn sẽ:** phân tích một lựa chọn bằng đánh đổi thay vì bằng "tốt hơn", và biết đánh đổi nào là giả.

## Ý tưởng chính

Gần như mọi lựa chọn kỹ thuật đều là **đánh đổi**: được cái này, mất cái kia.

Nên câu "cách nào tốt hơn" thường không có câu trả lời. Câu có câu trả lời là: **"với ràng buộc của chúng ta, cách nào phù hợp hơn"** — và điều đó đòi bạn nói ra ràng buộc.

## Mental model

Hãy nghĩ tới **chọn phương tiện đi làm**.

> Xe máy: nhanh trong phố, rẻ, đỗ dễ. Mưa thì ướt, đi xa thì mệt, chở nhiều không được.
>
> Xe hơi: thoải mái, chở được, mưa không sao. Đắt, tắc đường, đỗ khó.
>
> **Không có câu trả lời "cái nào tốt hơn."** Chỉ có: bạn đi bao xa, chở mấy người, có chỗ đỗ không, ngân sách bao nhiêu.
>
> Và nếu ai đó nói "xe hơi tốt hơn xe máy", họ đang **giả định ràng buộc của họ là ràng buộc của bạn**.

Đó là lỗi phổ biến nhất trong tranh luận kỹ thuật: hai người bàn về hai bộ ràng buộc khác nhau mà không ai nói ra.

## Ví dụ nhỏ

```text
❌ "Microservices tốt hơn monolith."
✅ "Với đội 30 người, nhiều nhóm triển khai độc lập, microservices
    phù hợp hơn. Với đội 6 người, monolith mô-đun phù hợp hơn —
    vì chi phí vận hành không đáng."
```

## Code chạy thế nào

**Ba bước phân tích một đánh đổi:**

```text
① NÓI RA RÀNG BUỘC
   Đội mấy người, tải bao nhiêu, thời gian bao lâu, ai vận hành
   được gì, cái gì không được hỏng.
   ⇒ Không nói ra ⇒ mọi người bàn theo ràng buộc tưởng tượng
     của riêng mình.

② VỚI MỖI LỰA CHỌN: ĐƯỢC GÌ, MẤT GÌ
   Cụ thể. Không phải "linh hoạt hơn" mà "thêm một loại
   khuyến mãi mất một ngày thay vì một tuần".

③ ĐỐI CHIẾU với ràng buộc ở ①
   Cái mất có chấp nhận được với ràng buộc này không?
```

**Bốn trục đánh đổi hay gặp:**

```text
① ĐƠN GIẢN ↔ LINH HOẠT
   Linh hoạt hơn gần như luôn phức tạp hơn.
   ⇒ Và phức tạp bạn trả NGAY, linh hoạt bạn dùng CÓ THỂ.

② NHANH BÂY GIỜ ↔ RẺ VỀ SAU
   Đi tắt tiết kiệm hôm nay, trả lãi sau
   ([[no-ky-thuat-va-refactor]]).

③ HIỆU NĂNG ↔ DỄ ĐỌC
   Mã tối ưu thường khó đọc hơn.
   ⇒ Chỉ đánh đổi ở chỗ ĐÃ ĐO là điểm nghẽn
     ([[hieu-nang-va-do-luong]]).

④ NHẤT QUÁN ↔ SẴN SÀNG
   Đánh đổi cơ bản của hệ phân tán
   ([[du-lieu-o-quy-mo]]).
```

**Trục ① đáng nhìn kỹ vì nó hay bị đọc sai:**

```text
"Cách này linh hoạt hơn" nghe như một điểm cộng thuần.
Nhưng linh hoạt luôn có giá:
  □ nhiều khái niệm hơn để hiểu
  □ nhiều đường đi hơn để test
  □ nhiều chỗ hơn để sai

⇒ Câu hỏi đúng: "chúng ta CÓ CẦN linh hoạt ở chiều này không,
  và khi nào?"
⇒ Không trả lời được ⇒ đang trả giá cho một lợi ích chưa có
  ([[kien-truc-la-gi-va-khi-nao-can]]).
```

## Cú pháp

**Ba loại "đánh đổi giả" — nhận ra để không tranh luận vô ích:**

```text
① MỘT BÊN ĐƠN GIẢN LÀ TỐT HƠN
   "Viết test hay không viết test" — không phải đánh đổi ở phần
   quan trọng. Nó là chuyện làm đúng hay không.
   ⇒ Có những thứ không thương lượng: tính đúng đắn, bảo mật.

② ĐÁNH ĐỔI KHÔNG TỒN TẠI Ở QUY MÔ NÀY
   "Postgres hay Cassandra" với 10.000 bản ghi — không có đánh đổi
   nào có ý nghĩa. Cả hai đều chạy được, và một cái đơn giản hơn.

③ CHƯA ĐO
   "Cách này nhanh hơn" — nhanh hơn bao nhiêu? Có phải điểm nghẽn?
   ⇒ Đánh đổi hiệu năng chưa đo là đánh đổi tưởng tượng.
```

**Ràng buộc thật — bốn loại hay bị bỏ:**

```text
□ NĂNG LỰC ĐỘI: ai vận hành được thứ này lúc 3 giờ sáng?
  ⇒ Ràng buộc thật nhất và ít được nói ra nhất.
□ THỜI GIAN: có bao lâu, và hạn có thật không?
□ CÁI GÌ KHÔNG ĐƯỢC HỎNG: luồng nào là luồng ra tiền?
□ CÁI GÌ SẼ ĐỔI: bạn biết gì về sáu tháng tới?
```

```text
Ràng buộc "năng lực đội" đáng nhấn: một giải pháp tốt về mặt
kỹ thuật mà không ai trong đội vận hành được là một giải pháp tệ.
⇒ Và nói ra nó không phải hạ thấp ai — nó là một dữ kiện.
```

**Ghi lại đánh đổi — để không tranh luận lại:**

```text
Mọi quyết định đáng kể nên ghi:
  □ ràng buộc lúc đó
  □ các lựa chọn đã cân nhắc
  □ chọn cái nào, mất gì
  □ ĐIỀU KIỆN XEM LẠI: khi nào đánh đổi này không còn đúng

⇒ Sáu tháng sau, người mới hỏi "sao không dùng X?" ⇒ đọc,
  không tranh luận lại từ đầu ([[ra-quyet-dinh-ky-thuat]]).
⇒ Và điều kiện xem lại là phần có giá trị nhất, không phải
  kết luận.
```

## Tại sao cần nó

Vì tranh luận không nói ra ràng buộc thì không kết thúc được:

```text
A: "Nên tách service."
B: "Không, monolith đơn giản hơn."
⇒ Cả hai đều đúng — với ràng buộc khác nhau.
⇒ Tranh luận này chạy vòng mãi cho tới khi có người hỏi:
  "chúng ta đang có mấy người, tải bao nhiêu, và cái gì đang đau?"

⇒ Nói ra ràng buộc thường kết thúc tranh luận trong năm phút.
```

**Và một cách nhìn về việc học:**

```text
Đọc một bài viết nói "X tốt hơn Y" ⇒ câu hỏi đầu tiên:
  "Ràng buộc của họ là gì?"

Công ty có 500 kỹ sư và 100 triệu người dùng có ràng buộc
khác bạn hoàn toàn.
⇒ Lời khuyên của họ đúng với họ, và có thể sai với bạn.
⇒ Đây là lý do "best practice" cần được đọc kèm bối cảnh,
  không áp dụng trực tiếp.
```

**Ba câu hỏi khi ai đó nói "X tốt hơn Y":**

```text
① Tốt hơn ở CHIỀU NÀO?
② MẤT gì?
③ Với ràng buộc NÀO?
```

## So sánh

| Câu nói | Có dùng được | Vì sao |
|---|---|---|
| "X tốt hơn Y" | ❌ | không nói ràng buộc |
| "X nhanh hơn" | ❌ | chưa đo, chưa biết có phải điểm nghẽn |
| "X linh hoạt hơn" | ❌ | chưa nói cần linh hoạt gì |
| "Với đội 6 người và tải 500 req/s, X phù hợp hơn vì..." | ✅ | có ràng buộc, có lý do |

## Dễ nhầm

**1. Hỏi "cách nào tốt hơn".** Thiếu ràng buộc.

**2. Không nói ra ràng buộc trước khi bàn.**

**3. Coi "linh hoạt hơn" là điểm cộng thuần.**

**4. Tranh luận đánh đổi hiệu năng chưa đo.**

**5. Tranh luận đánh đổi không tồn tại ở quy mô của mình.**

**6. Coi tính đúng đắn và bảo mật là đánh đổi.**

**7. Bỏ qua ràng buộc năng lực đội.**

**8. Không ghi lại điều kiện xem lại.**

**9. Áp dụng lời khuyên của công ty có ràng buộc rất khác.**

**10. Không hỏi "mất gì" khi nghe một đề xuất.**

## Mẹo nhớ

> **Không có "tốt hơn", chỉ có "phù hợp hơn với ràng buộc NÀO".**
>
> **Linh hoạt luôn có giá: phức tạp trả NGAY, lợi ích dùng CÓ THỂ.**
>
> **Ba câu khi nghe "X tốt hơn Y": tốt hơn ở CHIỀU nào, MẤT gì, ràng buộc NÀO?**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba bước phân tích một đánh đổi?
2. Bốn trục đánh đổi hay gặp?
3. Ba loại đánh đổi giả?
4. Bốn ràng buộc hay bị bỏ, cái nào ít được nói ra nhất?
5. Ba câu hỏi khi ai đó nói "X tốt hơn Y"?

## Tự viết lại

Không nhìn lại, phân tích đánh đổi cho từng lựa chọn, kèm ràng buộc:

```text
① Dùng ORM hay viết SQL trực tiếp
② Cache hay không cache một truy vấn 80ms
③ Monolith hay tách service (đội 8 người, 1.000 req/s)
④ Tự vận hành CSDL hay dùng dịch vụ quản lý sẵn
```

Tự kiểm: ở ②, đánh đổi này có tồn tại không — hay 80ms đã đủ nhanh?

## Thử sức

Hai người trong đội tranh luận ba tuần về việc có nên chuyển sang một framework khác. Mỗi bên có lý, và không ai thuyết phục được ai.

Ba câu để trả lời: bạn can thiệp thế nào để kết thúc tranh luận này; bạn hỏi những gì; và bạn giúp họ ra quyết định ra sao. Câu khó nhất: nếu sau khi nói ra ràng buộc, cả hai lựa chọn đều **hợp lý như nhau**, bạn quyết định thế nào — và tiêu chí nào dùng được lúc đó?
