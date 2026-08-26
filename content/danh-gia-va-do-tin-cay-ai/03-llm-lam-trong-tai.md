---
title: LLM làm trọng tài
slug: llm-lam-trong-tai
summary: Dùng mô hình để chấm đầu ra của mô hình — khi nào tin được, và bốn thiên lệch phải biết.
level: trung-cap
tags: [ai, danh-gia, do-tin-cay, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** dùng mô hình làm trọng tài đúng cách, và biết bốn thiên lệch của nó.

## Ý tưởng chính

Với chất lượng chủ quan — câu trả lời có hữu ích không, có đúng giọng điệu không — không kiểm được bằng mã và người chấm thì quá đắt.

**Mô hình chấm** là lựa chọn giữa. Nó rẻ, chạy tự động, và tương quan khá tốt với đánh giá của người — **nếu** bạn cho nó thang tiêu chí rõ và **đã hiệu chỉnh** với người.

Không hiệu chỉnh thì bạn đang tin một con số không biết nó đo gì.

## Mental model

Hãy nghĩ tới **nhờ một đồng nghiệp chấm bài thay bạn**.

> Nhờ họ chấm 200 bài. Họ chấm được, và nhanh hơn bạn nhiều.
>
> Nhưng trước đó bạn phải làm hai việc: **đưa thang điểm rõ ràng**, và **cùng chấm 20 bài để so** — xem họ có chấm giống bạn không.
>
> Nếu họ chấm lệch hệ thống (luôn cao hơn bạn một điểm), bạn biết và điều chỉnh. Nếu bạn không kiểm, bạn dùng một con số mà không biết nó nghĩa gì.
>
> Và có một điều nữa: đừng nhờ họ chấm **bài của chính họ**.

Vế cuối là một thiên lệch thật của mô hình: nó có xu hướng chấm cao hơn cho đầu ra của chính nó.

## Ví dụ nhỏ

```text
Chấm câu trả lời theo tiêu chí sau, mỗi tiêu chí Có/Không:
  ① Mọi khẳng định có trong tài liệu tham chiếu?
  ② Trả lời đúng câu hỏi được hỏi?
  ③ Không có thông tin ngoài tài liệu?
  ④ Dưới 100 từ?
Trả về JSON: { "①": true/false, ..., "lyDo": "..." }
```

## Code chạy thế nào

**Bốn nguyên tắc để mô hình chấm đáng tin:**

```text
① TIÊU CHÍ CỤ THỂ, KIỂM ĐƯỢC — không hỏi chung chung
   ❌ "Câu trả lời này tốt không? Cho điểm 1–10."
   ✅ "Mọi khẳng định có trong tài liệu không? Có/Không."

② CÓ/KHÔNG thay vì THANG ĐIỂM
   Mô hình chấm thang 1–10 rất không ổn định: cùng câu trả lời
   lúc 7 lúc 8.
   ⇒ Nhiều câu Có/Không rồi cộng lại ổn định hơn hẳn.

③ YÊU CẦU LÝ DO TRƯỚC KẾT LUẬN
   Bắt nó nói vì sao rồi mới kết luận.
   ⇒ Đảo thứ tự thì lý do thành biện hộ
     ([[lap-luan-va-chia-buoc]]).
   ⇒ Và lý do là thứ bạn đọc khi hiệu chỉnh.

④ CUNG CẤP ĐỦ NGỮ CẢNH
   Trọng tài cần: câu hỏi, câu trả lời, VÀ tài liệu tham chiếu.
   ⇒ Thiếu tài liệu thì nó không kiểm được "có bịa không" —
     nó chỉ đoán.
```

**Bốn thiên lệch phải biết:**

```text
① THIÊN VỀ ĐẦU RA CỦA CHÍNH NÓ
   Mô hình chấm cao hơn cho văn bản do chính nó (hoặc cùng họ)
   sinh ra.
   ⇒ Cân nhắc dùng mô hình KHÁC làm trọng tài.

② THIÊN VỀ ĐỘ DÀI
   Câu trả lời dài hơn thường được chấm cao hơn, dù không tốt hơn.
   ⇒ Chống bằng: có tiêu chí độ dài riêng, và kiểm nó bằng MÃ.

③ THIÊN VỀ THỨ TỰ (khi so hai câu trả lời)
   Câu trả lời đưa trước có xu hướng được chọn.
   ⇒ Chống bằng: chạy hai lần, đảo thứ tự, chỉ tin khi cả hai
     lần cùng kết quả.

④ THIÊN VỀ SỰ TỰ TIN
   Câu trả lời viết dứt khoát được chấm cao hơn câu trả lời
   có dè dặt hợp lý.
   ⇒ Nguy hiểm: nó thưởng cho việc bịa một cách tự tin.
   ⇒ Chống bằng: tiêu chí "bám nguồn" phải kiểm được bằng
     trích dẫn, không dựa vào cảm nhận của trọng tài.
```

Thiên lệch ④ đáng lo nhất: nó đi **ngược lại** đúng thứ bạn muốn đo.

## Cú pháp

**Hiệu chỉnh — bước không được bỏ:**

```text
① Chọn 30 ca đa dạng
② NGƯỜI chấm 30 ca đó theo cùng thang tiêu chí
③ MÔ HÌNH chấm 30 ca đó
④ So: khớp bao nhiêu phần trăm? Lệch theo hướng nào?
⑤ Lệch nhiều ⇒ sửa TIÊU CHÍ (thường tiêu chí chưa rõ),
  rồi làm lại từ ③

⇒ Khớp trên ~85% thì dùng được cho việc so sánh tương đối.
⇒ Dưới đó thì con số của trọng tài chưa có nghĩa.
```

```text
Và hiệu chỉnh LẠI khi:
  □ Đổi mô hình trọng tài
  □ Đổi tiêu chí
  □ Định kỳ — nhà cung cấp cập nhật mô hình
```

**Dùng cho việc gì và KHÔNG dùng cho việc gì:**

```text
✅ SO SÁNH TƯƠNG ĐỐI
   "Prompt mới tốt hơn prompt cũ không?"
   ⇒ Thiên lệch ảnh hưởng cả hai bên như nhau ⇒ so sánh vẫn có nghĩa.
   ⇒ Đây là công dụng chính và đáng tin nhất.

✅ PHÁT HIỆN HỒI QUY
   "Điểm có tụt so với lần trước không?"

⚠️ ĐO TUYỆT ĐỐI
   "Hệ thống đạt 87% chất lượng" ⇒ con số này nghĩa gì?
   ⇒ Chỉ có nghĩa nếu đã hiệu chỉnh, và ngay cả thế thì
     nên hiểu là "87% theo thang của chúng tôi".

❌ QUYẾT ĐỊNH CÓ HẬU QUẢ
   "Câu trả lời này đủ tốt để gửi cho khách chưa?"
   ⇒ Đừng để trọng tài quyết định điều này một mình.
     Dùng nó để CHỌN ra ca cần người xem, không để thay người.
```

**Kết hợp với kiểm bằng mã — thứ tự đúng:**

```text
① Kiểm bằng MÃ trước — rẻ, tất định
   định dạng, độ dài, trích dẫn tồn tại, từ cấm
   ⇒ Không pass ⇒ loại luôn, không cần trọng tài.
② Trọng tài chỉ chấm phần MÃ KHÔNG KIỂM ĐƯỢC
   ⇒ Tiết kiệm, và tránh dùng trọng tài cho thứ đã đo chắc chắn được.

⇒ Sai lầm phổ biến: dùng trọng tài để kiểm độ dài, trong khi
  đếm từ là một dòng mã.
```

## Tại sao cần nó

Vì nó là cách duy nhất đo được chất lượng chủ quan **ở quy mô**:

```text
Người chấm:   đáng tin nhất, ~2 phút/ca ⇒ 200 ca = 7 giờ
Mô hình chấm: ~2 giây/ca ⇒ 200 ca = 7 phút, chi phí nhỏ

⇒ Nên nó cho phép chạy bộ eval lớn ở mỗi lần đổi prompt —
  thứ không khả thi với người chấm.
```

**Nhưng nó không thay được người:**

```text
Người vẫn cần cho ba việc:
  ① HIỆU CHỈNH trọng tài
  ② Đọc mẫu định kỳ — bắt vấn đề chưa có tiêu chí nào đo
  ③ Quyết định những ca có hậu quả

⇒ Mô hình trọng tài mở rộng năng lực của người, không thay thế.
```

**Và một cách dùng hiệu quả ít ai nghĩ tới:**

```text
Dùng trọng tài để LỌC, không để chấm điểm.

  Chạy trọng tài trên 1.000 câu trả lời production
  ⇒ Lấy ra 50 ca nó cho là có vấn đề
  ⇒ NGƯỜI đọc 50 ca đó

⇒ Bạn có độ tin cậy của người chấm, với chi phí của một
  lần lọc tự động.
⇒ Và những ca người xác nhận là sai trở thành ca mới cho
  bộ eval ([[xay-bo-eval]]).
```

## So sánh

| | Kiểm bằng mã | Mô hình chấm | Người chấm |
|---|---|---|---|
| Tất định | ✅ | ❌ | gần đúng |
| Chi phí | rất thấp | thấp | **cao** |
| Đo chất lượng chủ quan | ❌ | ✅ | ✅ |
| Có thiên lệch | ❌ | **✅ bốn loại** | có (khác) |
| Dùng cho | định dạng, sự thật kiểm được | so sánh tương đối | hiệu chỉnh, ca quan trọng |

## Dễ nhầm

**1. Hỏi "câu này tốt không, cho điểm 1–10".** Không ổn định.

**2. Không hiệu chỉnh với người.** Con số không biết đo gì.

**3. Dùng thang điểm thay vì nhiều câu Có/Không.**

**4. Không cung cấp tài liệu tham chiếu cho trọng tài.**

**5. Yêu cầu kết luận trước lý do.**

**6. Dùng cùng mô hình làm trọng tài cho đầu ra của nó.**

**7. Không đảo thứ tự khi so hai câu trả lời.**

**8. Bỏ qua thiên lệch về độ dài và sự tự tin.**

**9. Dùng trọng tài kiểm những gì mã kiểm được.**

**10. Để trọng tài quyết định ca có hậu quả.**

## Mẹo nhớ

> **Nhiều câu CÓ/KHÔNG ổn định hơn một thang điểm 1–10.**
>
> **PHẢI hiệu chỉnh với người — không hiệu chỉnh thì con số không có nghĩa.**
>
> **Dùng trọng tài để LỌC ra ca cần người xem, không để thay người.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn nguyên tắc để mô hình chấm đáng tin?
2. Bốn thiên lệch, cái nào đáng lo nhất và vì sao?
3. Năm bước hiệu chỉnh, ngưỡng khớp bao nhiêu là dùng được?
4. Dùng trọng tài cho việc gì, không dùng cho việc gì?
5. Thứ tự đúng khi kết hợp với kiểm bằng mã?

## Tự viết lại

Không nhìn lại, viết prompt trọng tài cho trợ lý RAG:

```text
① bốn tiêu chí Có/Không
② ngữ cảnh bạn cung cấp cho trọng tài
③ định dạng đầu ra
④ quy trình hiệu chỉnh
⑤ tiêu chí nào bạn kiểm bằng mã thay vì bằng trọng tài
```

Tự kiểm: ở ⑤, có tiêu chí nào bạn định để trọng tài chấm mà thật ra đếm bằng mã được không?

## Thử sức

Đội dùng mô hình chấm điểm 1–10 cho câu trả lời của trợ lý. Điểm trung bình 8,2 và ổn định qua các tuần. Nhưng người dùng vẫn báo sai nhiều.

Ba câu để trả lời: ba lý do con số 8,2 có thể không phản ánh chất lượng thật; bạn thiết kế lại cách chấm thế nào; và bạn hiệu chỉnh bằng cách nào. Câu khó nhất: nếu sau khi đổi sang tiêu chí Có/Không và hiệu chỉnh, điểm tụt xuống 61% — con số nào đúng hơn, và bạn giải thích sự thay đổi này với đội thế nào?
