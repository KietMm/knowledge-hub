---
title: Đào sâu và điểm nghẽn
slug: dao-sau-va-diem-nghen
summary: Phần dài nhất của buổi phỏng vấn — chọn đào vào đâu, và nói gì về cái vỡ trước.
level: nang-cao
tags: [phong-van, thiet-ke-he-thong, hieu-nang, kien-truc]
khung: v2
---

> **Sau bài này bạn sẽ:** dùng tốt 15 phút đào sâu, và nói được cái gì vỡ trước cùng cách xử lý.

## Ý tưởng chính

Đào sâu là phần **dài nhất và được đánh giá cao nhất**. Tổng quan cho thấy bạn có cấu trúc; đào sâu cho thấy bạn có **độ sâu kỹ thuật thật**.

Và nó là phần khác biệt rõ nhất giữa "đọc về hệ thống" và "đã làm hệ thống".

## Mental model

Hãy nghĩ tới **khám xe trước chuyến đi dài**.

> Nhìn tổng quan: xe có bốn bánh, có động cơ, có phanh. Đủ để biết đó là một cái xe.
>
> Người thợ giỏi không dừng ở đó. Họ **mở nắp máy**, kiểm đúng vài chỗ: dầu, phanh, lốp — những chỗ **hỏng thì nguy hiểm nhất** và **hay hỏng nhất**.
>
> Họ không kiểm mọi bu lông. Họ biết chỗ nào quan trọng.

Đào sâu cũng vậy: **chọn đúng 1–2 phần**, và chọn theo tiêu chí "hỏng thì đau nhất" hoặc "khó nhất".

## Ví dụ nhỏ

```text
Đề: hệ thống timeline.
Đào sâu vào: cách sinh timeline.
  □ Đọc lúc xem (fan-out on read) hay ghi trước (fan-out on write)?
  □ Người có 10 triệu người theo dõi thì sao?
  □ Mô hình dữ liệu, index nào?
```

## Code chạy thế nào

**Chọn đào vào đâu — ba tiêu chí:**

```text
① NGƯỜI PHỎNG VẤN CHỌN
   Họ thường nói "đào sâu vào X đi". ⇒ Làm theo.
   ⇒ Đây là tín hiệu rõ nhất và bạn không nên bỏ.

② PHẦN KHÓ NHẤT của bài toán
   Với timeline: cách sinh feed. Với chat: đảm bảo tin nhắn tới.
   Với thanh toán: nhất quán và idempotency.

③ PHẦN BẠN HIỂU SÂU NHẤT
   Nếu họ để bạn chọn, chọn phần bạn nói được đánh đổi.
   ⇒ Nhưng nói rõ: "mình sẽ đào vào X vì đây là phần khó nhất.
     Nếu bạn muốn nghe phần khác thì mình chuyển."
```

**Bốn thứ nói ở phần đào sâu:**

```text
① MÔ HÌNH DỮ LIỆU
   Bảng gì, khoá chính, khoá ngoại, index nào và VÌ SAO index đó.
   ⇒ Đây là chỗ độ sâu lộ ra rõ nhất: index đúng đòi hiểu
     truy vấn nào chạy nhiều nhất
     ([[index-va-hieu-nang-truy-van]]).

② API
   Endpoint chính, tham số, phân trang.
   ⇒ Nói về phân trang bằng con trỏ thay vì offset nếu dữ liệu
     lớn ([[phan-trang-loc-va-sap-xep]]).

③ XỬ LÝ ĐỒNG THỜI
   Hai người cùng làm một việc thì sao?
   ⇒ Đây là câu hỏi hay bị bỏ, và nó phân biệt rõ
     ([[dong-bo-hoa-va-race-condition]]).

④ CÁI GÌ CÓ THỂ SAI
   Dịch vụ phụ chết, mạng đứt, ghi thành công mà phản hồi mất.
   ⇒ Nói về timeout, retry, idempotency
     ([[thiet-ke-cho-that-bai]]).
```

## Cú pháp

**Điểm nghẽn — nói theo trình tự "cái gì vỡ trước":**

```text
Với hầu hết hệ thống ở quy mô vừa, thứ tự vỡ:
  ① CSDL (ghi, hoặc truy vấn thiếu index)
  ② Kết nối CSDL (pool cạn khi thêm máy ứng dụng)
  ③ Băng thông / độ trễ mạng
  ④ CPU của ứng dụng

⇒ Nói ra thứ tự này cho thấy bạn có kinh nghiệm thật:
  người mới thường nói về CPU trước.
```

**Thứ tự xử lý khi CSDL là điểm nghẽn:**

```text
① Index và sửa truy vấn        ← luôn trước, và thường đủ
② Cache
③ Replica đọc
④ Phân vùng trong cùng CSDL
⑤ Sharding                     ← cuối cùng, và rất phức tạp

⇒ Nhảy thẳng tới sharding là dấu hiệu rõ nhất của việc
  chưa làm hệ thống thật ([[mo-rong-va-can-bang-tai]]).
⇒ Và với mỗi bước, nói ĐÁNH ĐỔI: cache thì dữ liệu cũ,
  replica thì độ trễ sao chép, sharding thì mất JOIN.
```

**Xử lý "hot key" — câu hỏi kinh điển:**

```text
"Một người có 50 triệu người theo dõi thì sao?"
"Một sản phẩm được 1 triệu người xem cùng lúc thì sao?"

⇒ Câu này gần như luôn được hỏi, và nó kiểm xem bạn có nghĩ
  về PHÂN BỐ KHÔNG ĐỀU hay không.

Hướng trả lời:
  □ Tách riêng ca đặc biệt: xử lý khác cho tài khoản lớn
  □ Cache tầng gần người dùng hơn cho nội dung nóng
  □ Không ghi trước cho tài khoản rất lớn, tính lúc đọc
  □ Chống stampede khi key nóng hết hạn
    ([[cache-voi-redis-trong-thuc-te]])
```

**Khi không biết — cách xử lý tốt nhất:**

```text
❌ Bịa ra một câu trả lời nghe hợp lý
   ⇒ Người phỏng vấn thường biết, và họ sẽ đào tiếp.

✅ "Phần này mình chưa làm trực tiếp. Mình nghĩ hướng sẽ là X
    vì lý do Y, nhưng mình không chắc về Z. Nếu làm thật thì
    mình sẽ đo/thử trước."

⇒ Nói ra giới hạn là một điểm mạnh, không phải điểm yếu.
⇒ Và nó cho thấy bạn biết phân biệt "tôi biết" với "tôi đoán" —
  một tín hiệu quan trọng.
```

## Tại sao cần nó

Vì 15 phút này là chỗ phần lớn quyết định tuyển dụng được đưa ra:

```text
Tổng quan tốt nhưng đào sâu nông:
  ⇒ "Biết các khái niệm nhưng chưa làm sâu."
  ⇒ Đây là kết luận phổ biến nhất với người học từ tài liệu
    mà chưa làm hệ thống thật.

Tổng quan bình thường nhưng đào sâu tốt:
  ⇒ "Có kinh nghiệm thật."
```

**Ba dấu hiệu của độ sâu thật:**

```text
① NÓI ĐƯỢC CON SỐ
   "Truy vấn này với index sẽ dưới 5ms; không index thì quét
    bảng 2 triệu dòng, khoảng một giây."

② NÓI ĐƯỢC CÁI GÌ HỎNG VÀ HỎNG THẾ NÀO
   Không chỉ "cần retry" mà "retry không có backoff sẽ tạo
   cơn bão vào một dịch vụ đang quá tải".

③ NÓI ĐƯỢC ĐÁNH ĐỔI CỦA LỰA CHỌN CỦA CHÍNH MÌNH
   "Mình chọn ghi trước để đọc nhanh. Đổi lại, ghi tốn hơn,
    và tài khoản có nhiều người theo dõi thì ghi rất nặng —
    nên mình xử lý riêng ca đó."
```

**Và một chiến lược về thời gian:**

```text
Thà đào SÂU một phần còn hơn nói NÔNG ba phần.

⇒ Nếu còn 5 phút và bạn đang giữa một phần, đừng nhảy sang
  phần mới. Hoàn thiện phần đang nói.
⇒ Và nói rõ: "còn phần X mình chưa nói, nếu có thời gian mình
  sẽ..." — nó cho thấy bạn biết mình chưa phủ hết
  ([[du-tot-va-hoan-hao]]).
```

## So sánh

| Cách dùng 15 phút | Ấn tượng để lại |
|---|---|
| Nói nông về 4 phần | biết khái niệm, chưa làm sâu |
| Đào sâu 1–2 phần, có con số và đánh đổi | **có kinh nghiệm thật** |
| Nhảy thẳng tới sharding | chưa làm hệ thống thật |
| Nói rõ chỗ không chắc | biết phân biệt biết và đoán |

## Dễ nhầm

**1. Nói nông về nhiều phần.** Thà sâu một phần.

**2. Bỏ qua khi người phỏng vấn đề nghị đào sâu phần cụ thể.**

**3. Không nói về mô hình dữ liệu và index.**

**4. Không nói về xử lý đồng thời.** Câu hay bị bỏ.

**5. Nói về CPU là điểm nghẽn đầu tiên.** Thường là CSDL.

**6. Nhảy thẳng tới sharding.**

**7. Không nói đánh đổi của lựa chọn của chính mình.**

**8. Không nghĩ về phân bố không đều (hot key).**

**9. Bịa câu trả lời khi không biết.**

**10. Nhảy sang phần mới khi còn 5 phút.**

## Mẹo nhớ

> **Thà đào SÂU một phần còn hơn nói NÔNG ba phần.**
>
> **Điểm nghẽn thường là CSDL, không phải CPU. Thứ tự xử lý: index → cache → replica → sharding.**
>
> **Không biết thì nói không biết, kèm hướng bạn sẽ thử — đó là điểm mạnh.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba tiêu chí chọn phần đào sâu?
2. Bốn thứ nói ở phần đào sâu, cái nào hay bị bỏ?
3. Thứ tự vỡ của các thành phần, và thứ tự xử lý khi CSDL nghẽn?
4. Hướng trả lời câu hỏi về hot key?
5. Ba dấu hiệu của độ sâu thật?

## Tự viết lại

Đề: *"Thiết kế hệ thống đếm lượt xem video."* Giả định 100 triệu lượt xem/ngày.

Không nhìn lại, viết:

```text
① phần bạn chọn đào sâu, vì sao
② mô hình dữ liệu và index
③ xử lý đồng thời: nhiều người xem cùng lúc
④ cái gì vỡ trước, và thứ tự xử lý
⑤ hot key: một video viral thì sao
```

Tự kiểm: ở ③, bạn xử lý việc tăng bộ đếm thế nào — và cách của bạn có chịu được 100 triệu lượt/ngày không?

## Thử sức

Bạn đang đào sâu vào phần lưu trữ. Người phỏng vấn hỏi: *"Nếu số bản ghi tăng 100 lần thì sao?"*

Ba câu để trả lời: bạn trả lời theo trình tự nào; bạn nói đánh đổi của mỗi bước ra sao; và ở bước nào bạn nói "cái này mình sẽ đo trước khi làm". Câu khó nhất: nếu họ đẩy tiếp — "giả sử index và cache đều không đủ" — bạn đi tới sharding, và câu hỏi đầu tiên bạn phải trả lời khi shard là gì?
