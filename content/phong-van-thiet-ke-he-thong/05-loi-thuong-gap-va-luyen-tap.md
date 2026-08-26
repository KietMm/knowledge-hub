---
title: Lỗi thường gặp và cách luyện tập
slug: loi-thuong-gap-va-luyen-tap
summary: Mười lỗi hay gặp, và cách luyện tập thật sự cải thiện thay vì đọc thêm tài liệu.
level: nang-cao
tags: [phong-van, thiet-ke-he-thong, phuong-phap, tu-duy]
khung: v2
---

> **Sau bài này bạn sẽ:** biết mười lỗi hay gặp nhất, và có cách luyện tập tạo ra vòng phản hồi.

## Ý tưởng chính

Phần lớn người thất bại ở phỏng vấn thiết kế **không thiếu kiến thức** — họ thiếu **cách trình bày** và **thói quen làm rõ trước khi thiết kế**.

Nên đọc thêm tài liệu thường không giúp. Thứ giúp là **luyện nói ra** — và có ai đó (hoặc chính bản ghi của bạn) chỉ ra chỗ mơ hồ.

## Mental model

Hãy nghĩ tới **học lái xe**.

> Đọc mười cuốn về luật giao thông và cơ chế động cơ. Bạn biết nhiều.
>
> Rồi ngồi vào xe lần đầu: chân tay không phối hợp, không biết nhìn đâu, và mọi kiến thức kia không giúp gì trong mười phút đầu.
>
> Cách học lái là **lái**, có người ngồi cạnh nói "gương, xi nhan, quá gần lề".
>
> Và điều làm bạn tiến bộ không phải số giờ lái — là **phản hồi** trong lúc lái.

Phỏng vấn thiết kế cũng vậy: đó là một **kỹ năng trình bày dưới áp lực**, không phải một bài kiểm tra kiến thức. Và kỹ năng thì phải luyện, không đọc được.

## Ví dụ nhỏ

```text
Cách luyện kém: đọc 20 bài "thiết kế X" trên mạng
Cách luyện tốt: tự nói to một đề trong 45 phút, GHI ÂM,
                rồi nghe lại và tìm chỗ mơ hồ
```

## Code chạy thế nào

**Mười lỗi hay gặp nhất:**

```text
① VẼ NGAY, KHÔNG HỎI
   Bỏ mất phần được đánh giá cao nhất.

② KHÔNG HỎI CON SỐ QUY MÔ
   ⇒ Thiết kế cho quy mô tưởng tượng.

③ IM LẶNG SUY NGHĨ
   Người phỏng vấn không biết gì về bạn trong ba phút đó.

④ NÓI "CÁI NÀY TỐT HƠN" MÀ KHÔNG NÓI ĐÁNH ĐỔI
   ⇒ Lỗi phân biệt rõ nhất giữa các mức ([[doc-danh-doi]]).

⑤ CHỌN CÔNG NGHỆ CỤ THỂ QUÁ SỚM
   "Dùng Kafka" trước khi biết cần gì.

⑥ NHẢY THẲNG TỚI GIẢI PHÁP PHỨC TẠP
   Sharding, microservices ở quy mô 1.000 req/s.

⑦ NÓI NÔNG VỀ NHIỀU PHẦN
   Thà sâu một phần.

⑧ BỎ QUA XỬ LÝ LỖI VÀ ĐỒNG THỜI
   Hai chủ đề hay bị bỏ và luôn được hỏi.

⑨ BÁM THIẾT KẾ CŨ KHI CÓ THÔNG TIN MỚI
   Họ nói "giả sử gấp 100 lần" là họ đang mời bạn đổi.

⑩ BỊA KHI KHÔNG BIẾT
   Người phỏng vấn thường biết, và họ sẽ đào tiếp.
```

**Ba lỗi nghiêm trọng nhất trong mười:**

```text
④ không nói đánh đổi  — đây là thứ chính họ muốn nghe
③ im lặng             — họ không đánh giá được gì
⑥ nhảy tới phức tạp   — cho thấy chưa làm hệ thống thật

⇒ Sửa ba lỗi này đổi kết quả nhiều hơn học thêm kiến thức.
```

## Cú pháp

**Cách luyện tập tạo ra phản hồi:**

```text
① TỰ NÓI TO, GHI ÂM, NGHE LẠI          ← rẻ nhất, hiệu quả cao
   Chọn một đề, hẹn 45 phút, nói to như đang phỏng vấn thật.
   Nghe lại và tìm:
     □ Chỗ nào mình im lặng quá lâu?
     □ Chỗ nào mình nói mà không nói vì sao?
     □ Mình có dùng con số đã hỏi không?
   ⇒ Nghe lại giọng mình rất khó chịu, và đó là lý do nó hiệu quả:
     bạn nghe ra chỗ mơ hồ mà lúc nói không nhận ra.

② LUYỆN VỚI NGƯỜI KHÁC
   Người kia không cần biết đáp án. Họ chỉ cần hỏi "vì sao"
   ở mọi quyết định.
   ⇒ Câu "vì sao" là toàn bộ giá trị của việc luyện cùng người.

③ ĐỌC THIẾT KẾ THẬT
   Bài viết kỹ thuật của các công ty về hệ thống thật của họ.
   ⇒ Đọc để tìm ĐÁNH ĐỔI họ nói ra, không để nhớ kiến trúc.
   ⇒ Câu hỏi khi đọc: "họ có ràng buộc gì, và ràng buộc đó
     có giống mình không?"

④ THIẾT KẾ LẠI HỆ THỐNG BẠN ĐANG LÀM
   Nguồn luyện tốt nhất và ít ai dùng: bạn biết ràng buộc thật,
   biết cái gì đã hỏng, biết đánh đổi nào đã đúng và sai.
```

**Nguồn ④ đáng nhấn:**

```text
Bạn có một hệ thống thật với ràng buộc thật. Hãy tự trình bày
nó trong 45 phút như một đề phỏng vấn.

⇒ Bạn sẽ phát hiện: có những quyết định bạn không giải thích được.
⇒ Và đó chính là những chỗ bạn cần hiểu — hữu ích cho cả công việc
  lẫn phỏng vấn ([[hoc-va-tich-luy-kinh-nghiem]]).
```

**Danh sách kiểm 30 giây trước khi bắt đầu:**

```text
□ Mình sẽ HỎI trước, không vẽ trước
□ Mình sẽ hỏi con số quy mô và tỉ lệ đọc/ghi
□ Mình sẽ chốt phạm vi thành lời
□ Mình sẽ NÓI TO mọi suy nghĩ
□ Mỗi quyết định mình sẽ nói VÌ SAO và MẤT GÌ
□ Mình sẽ đào sâu 1–2 phần, không phủ hết
□ Không biết thì mình nói không biết
```

**Và về việc học kiến thức:**

```text
Kiến thức nền vẫn cần: cache, hàng đợi, replica, sharding,
index, nhất quán, chịu lỗi.

⇒ Nhưng học chúng theo hướng "nó GIẢI VẤN ĐỀ GÌ và ĐÁNH ĐỔI
  của nó là gì", không theo hướng nhớ tên và cấu hình.
⇒ Vì trong phòng phỏng vấn, bạn cần nói được đánh đổi, không
  cần nói được cách cấu hình.
```

## Tại sao cần nó

Vì đây là một kỹ năng có thể luyện, và phần lớn người không luyện đúng cách:

```text
Cách phổ biến: đọc thêm 20 bài "thiết kế X"
  ⇒ Biết thêm kiến trúc, và vẫn mắc đúng mười lỗi ở trên.
  ⇒ Vì mười lỗi đó là lỗi TRÌNH BÀY, không phải lỗi kiến thức.

Cách hiệu quả: nói to, ghi âm, nghe lại, sửa
  ⇒ Ba lần luyện thường đổi nhiều hơn hai mươi bài đọc.
```

**Và một điều về tâm thế:**

```text
Buổi phỏng vấn thiết kế gần giống một buổi làm việc cùng nhau
hơn là một bài thi.

⇒ Người phỏng vấn thường muốn thấy bạn nghĩ, và họ sẽ giúp
  nếu bạn bế tắc.
⇒ Nên hỏi lại, xin gợi ý, và nói ra chỗ không chắc là bình thường —
  đó là cách người ta làm việc thật.
⇒ Cố tỏ ra biết mọi thứ là chiến lược tệ, và nó dễ bị phát hiện.
```

**Ba việc cụ thể trong tháng tới:**

```text
□ Luyện ba đề, mỗi đề 45 phút, có ghi âm
□ Tự trình bày một hệ thống bạn đang làm như một đề phỏng vấn
□ Đọc hai bài viết kỹ thuật, và với mỗi bài viết ra ba đánh đổi
  họ đã chọn
```

## So sánh

| Cách luyện | Chi phí | Hiệu quả |
|---|---|---|
| Đọc bài "thiết kế X" | thấp | thấp (không sửa lỗi trình bày) |
| Nói to + ghi âm + nghe lại | thấp | **cao** |
| Luyện với người khác | vừa | **cao nhất** |
| Thiết kế lại hệ thống của mình | thấp | cao, và có ích cho công việc |

## Dễ nhầm

**1. Nghĩ thất bại là do thiếu kiến thức.** Thường là lỗi trình bày.

**2. Đọc thêm tài liệu thay vì luyện nói.**

**3. Không ghi âm và nghe lại.** Bạn không nghe ra chỗ mơ hồ lúc nói.

**4. Luyện với người biết đáp án.** Họ chỉ cần hỏi "vì sao".

**5. Đọc thiết kế thật để nhớ kiến trúc.** Nên đọc để tìm đánh đổi.

**6. Không thử trình bày hệ thống mình đang làm.**

**7. Học kiến thức theo hướng nhớ tên và cấu hình.**

**8. Cố tỏ ra biết mọi thứ.**

**9. Không hỏi lại khi bế tắc.**

**10. Không có danh sách kiểm trước khi bắt đầu.**

## Mẹo nhớ

> **Mười lỗi hay gặp phần lớn là lỗi TRÌNH BÀY, không phải lỗi kiến thức.**
>
> **Ba lỗi nặng nhất: không nói đánh đổi, im lặng, nhảy tới giải pháp phức tạp.**
>
> **Luyện bằng cách NÓI TO và NGHE LẠI — ba lần luyện hơn hai mươi bài đọc.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Mười lỗi hay gặp — kể được ít nhất bảy?
2. Ba lỗi nghiêm trọng nhất?
3. Bốn cách luyện tập, cách nào hiệu quả nhất?
4. Vì sao nghe lại bản ghi âm hiệu quả?
5. Danh sách kiểm 30 giây trước khi bắt đầu?

## Tự viết lại

Không nhìn lại:

```text
① mười lỗi, viết bằng lời của bạn
② ba lỗi bạn tự nghĩ mình hay mắc nhất
③ kế hoạch luyện tập bốn tuần, cụ thể
④ danh sách kiểm 30 giây của riêng bạn
```

Tự kiểm: ở ③, kế hoạch của bạn có tạo ra **vòng phản hồi** không — hay nó chỉ là đọc thêm?

## Thử sức

Bạn vừa trượt một buổi phỏng vấn thiết kế. Phản hồi: *"Kiến thức tốt nhưng thiếu chiều sâu."*

Ba câu để trả lời: phản hồi đó có thể nghĩa là gì — nêu ba cách hiểu khác nhau; bạn xác định cách hiểu nào đúng với mình bằng cách nào; và kế hoạch bốn tuần của bạn. Câu khó nhất: nếu "thiếu chiều sâu" thật ra nghĩa là "nói nông về nhiều phần thay vì sâu một phần", đó là lỗi kiến thức hay lỗi chiến lược — và cách sửa khác nhau ra sao?
