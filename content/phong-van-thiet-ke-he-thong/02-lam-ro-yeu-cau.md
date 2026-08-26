---
title: Làm rõ yêu cầu
slug: lam-ro-yeu-cau
summary: Ba nhóm câu hỏi, cách chốt phạm vi, và vì sao câu hỏi phi chức năng phân biệt rõ nhất các mức.
level: trung-cap
tags: [phong-van, thiet-ke-he-thong, giao-tiep, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** hỏi đúng câu trong 8 phút đầu, và chốt phạm vi theo cách giúp bạn kiểm soát buổi phỏng vấn.

## Ý tưởng chính

Đề bài mơ hồ **là cố ý**. Nó tạo ra chỗ để bạn thể hiện điều quan trọng nhất: bạn có biết **hỏi gì** trước khi thiết kế.

Và trong ba nhóm câu hỏi, nhóm **phi chức năng** là nhóm phân biệt rõ nhất giữa các mức — vì nó là nhóm mà chỉ người đã làm hệ thống thật mới nghĩ tới.

## Mental model

Hãy nghĩ tới **bác sĩ khám bệnh**.

> Bệnh nhân nói "tôi đau đầu". Bác sĩ không kê thuốc ngay.
>
> Họ hỏi: đau từ khi nào, đau kiểu gì, đau chỗ nào, có kèm gì khác, đã dùng thuốc gì.
>
> **Chất lượng câu hỏi quyết định chất lượng chẩn đoán.** Và bệnh nhân không biết thông tin nào quan trọng — họ chỉ trả lời khi được hỏi.
>
> Người phỏng vấn cũng vậy: họ có thông tin, và họ **chờ bạn hỏi**.

Điểm khác biệt: bác sĩ hỏi để chẩn đoán; ở đây bạn hỏi để thiết kế, **và** để cho thấy bạn biết hỏi gì.

## Ví dụ nhỏ

```text
"Thiết kế hệ thống chat."

Hỏi: 1-1 hay nhóm? Nhóm bao nhiêu người tối đa?
     Có cần lịch sử tin nhắn? Lưu bao lâu?
     Có cần biết đã đọc chưa? Đang gõ?
     Có gửi ảnh/file không?
     Bao nhiêu người dùng đồng thời?
     Tin nhắn phải tới ngay hay chấp nhận trễ vài giây?
```

## Code chạy thế nào

**Nhóm 1 — chức năng (3 phút):**

```text
Mục tiêu: chốt 3–5 chức năng CỐT LÕI.

Cách hỏi hiệu quả: nêu giả định rồi xác nhận.
  ❌ "Hệ thống cần làm gì?"           — quá mở, mất thời gian
  ✅ "Mình hiểu là cần: gửi tin nhắn, xem lịch sử, tạo nhóm.
      Có cần gọi thoại không?"

⇒ Nêu giả định nhanh hơn hỏi mở, và nó cho thấy bạn đã nghĩ.
⇒ Người phỏng vấn sẽ sửa nếu bạn hiểu sai — và đó là thông tin.
```

**Nhóm 2 — quy mô (2 phút):**

```text
Bốn con số cần:
  □ Số người dùng (tổng và hoạt động hằng ngày)
  □ Số request/giây, hoặc số hành động mỗi người mỗi ngày
  □ TỈ LỆ ĐỌC/GHI          ← quan trọng nhất
  □ Kích thước dữ liệu mỗi bản ghi

⇒ Tỉ lệ đọc/ghi quyết định phần lớn thiết kế: đọc nhiều thì
  cache và replica; ghi nhiều thì bài toán khác hẳn
  ([[uoc-luong-va-tim-diem-nghen]]).
```

**Nhóm 3 — phi chức năng (3 phút, nhóm phân biệt rõ nhất):**

```text
□ ĐỘ TRỄ mong đợi
  "Người dùng chấp nhận chờ bao lâu?" ⇒ 100ms và 2s là hai
  thiết kế khác nhau.

□ NHẤT QUÁN
  "Dữ liệu cũ vài giây có sao không?"
  ⇒ Chấp nhận được ⇒ cache và replica mở ra nhiều lựa chọn.
  ⇒ Không ⇒ thiết kế chặt hơn nhiều ([[du-lieu-o-quy-mo]]).

□ ĐỘ SẴN SÀNG
  "Hệ thống chết 5 phút thì sao?" ⇒ quyết định có cần
  nhiều vùng khả dụng hay không.

□ VÙNG ĐỊA LÝ
  "Người dùng ở một nước hay toàn cầu?" ⇒ ảnh hưởng độ trễ
  và có cần nhiều region không.

□ CÁI GÌ KHÔNG ĐƯỢC MẤT
  "Mất một tin nhắn có sao không?" ⇒ quyết định đảm bảo
  giao hàng ở tầng hàng đợi.
```

```text
Nhóm này ít người hỏi, và nó là nhóm cho thấy bạn đã làm hệ thống
thật — vì đây đúng là những câu bạn phải trả lời khi thiết kế
hệ thống chạy thật.
```

## Cú pháp

**Chốt phạm vi — một câu, và nó cho bạn quyền kiểm soát:**

```text
"Mình sẽ tập trung vào: A, B, C.
 Chưa làm: D, E, F.
 Giả định: 1 triệu người dùng hoạt động, tỉ lệ đọc/ghi 100:1,
 độ trễ dưới 200ms, chấp nhận dữ liệu trễ 5 giây.
 Bạn thấy ổn không?"

⇒ Bốn lợi ích:
  ① Bạn có một bài toán XÁC ĐỊNH để thiết kế
  ② Người phỏng vấn sửa ngay nếu bạn đi sai hướng
  ③ Bạn không bị hỏi về những gì đã tuyên bố ngoài phạm vi
  ④ Nếu hết thời gian, bạn đã nói rõ mình chưa làm gì
```

**Ba lỗi khi làm rõ yêu cầu:**

```text
① HỎI QUÁ NHIỀU, QUÁ CHI TIẾT
   15 câu hỏi về ca biên ⇒ hết 20 phút.
   ⇒ Hỏi những câu ĐỔI THIẾT KẾ. Ca biên để lại phần đào sâu.

② HỎI XONG KHÔNG DÙNG
   Hỏi tỉ lệ đọc/ghi rồi thiết kế như không biết.
   ⇒ Người phỏng vấn để ý điều này. Mỗi con số bạn hỏi nên
     xuất hiện trong một quyết định sau đó.

③ TỰ GIẢ ĐỊNH MÀ KHÔNG NÓI RA
   Bạn giả định 1 triệu người dùng, họ nghĩ 100 triệu.
   ⇒ Cả buổi lệch nhau mà không ai biết.
```

**Câu hỏi nào ĐỔI thiết kế — cách lọc:**

```text
Với mỗi câu định hỏi, tự hỏi: "câu trả lời khác nhau thì thiết
kế của mình khác nhau không?"

  "Tỉ lệ đọc/ghi?"          → CÓ, khác hẳn ⇒ hỏi
  "Có cần đăng nhập Google?" → không đổi kiến trúc ⇒ bỏ qua
  "Tin nhắn có emoji không?" → không ⇒ bỏ qua
  "Nhóm tối đa mấy người?"   → CÓ, 10 và 100.000 khác hẳn ⇒ hỏi

⇒ Bộ lọc này giữ bạn trong 8 phút.
```

## Tại sao cần nó

Vì giai đoạn này quyết định phần còn lại của buổi:

```text
Làm rõ tốt:
  Bạn có bài toán xác định. Mọi quyết định sau đó có căn cứ.
  Và bạn nói được "vì tỉ lệ đọc/ghi là 100:1 nên mình thêm cache".

Làm rõ tệ:
  Bạn thiết kế cho một quy mô tưởng tượng.
  Người phỏng vấn phải liên tục sửa bạn.
  Và mọi lựa chọn của bạn không có lý do gì ngoài "thường người
  ta làm thế".
```

**Và một tín hiệu về kinh nghiệm:**

```text
Người mới hỏi về CHỨC NĂNG.
Người có kinh nghiệm hỏi về QUY MÔ và PHI CHỨC NĂNG.

⇒ Không phải vì chức năng không quan trọng. Mà vì hai nhóm sau
  là nơi quyết định kiến trúc, và chỉ người đã làm hệ thống thật
  biết chúng quan trọng.
```

**Ba câu đáng hỏi mà ít người hỏi:**

```text
□ "Tỉ lệ đọc/ghi khoảng bao nhiêu?"
□ "Dữ liệu cũ vài giây có chấp nhận được không?"
□ "Cái gì trong hệ thống này không được mất?"
```

## So sánh

| Nhóm câu hỏi | Thời gian | Ảnh hưởng thiết kế | Ai thường hỏi |
|---|---|---|---|
| Chức năng | 3 phút | vừa | ai cũng hỏi |
| Quy mô | 2 phút | **cao** | người có kinh nghiệm |
| Phi chức năng | 3 phút | **cao nhất** | ít người hỏi |

## Dễ nhầm

**1. Không hỏi gì, vẽ ngay.**

**2. Hỏi mở "hệ thống cần làm gì".** Nêu giả định rồi xác nhận nhanh hơn.

**3. Bỏ nhóm phi chức năng.** Nhóm phân biệt rõ nhất.

**4. Không hỏi tỉ lệ đọc/ghi.** Con số quan trọng nhất.

**5. Hỏi quá nhiều câu về ca biên.** Để lại phần đào sâu.

**6. Hỏi xong không dùng con số đó.** Người phỏng vấn để ý.

**7. Tự giả định mà không nói ra.** Cả buổi lệch nhau.

**8. Không chốt phạm vi.** Mất quyền kiểm soát buổi.

**9. Không nói ra giả định trong câu chốt phạm vi.**

**10. Hỏi những câu không đổi thiết kế.**

## Mẹo nhớ

> **Đề mơ hồ là CỐ Ý. Người phỏng vấn có thông tin và CHỜ bạn hỏi.**
>
> **Nhóm PHI CHỨC NĂNG phân biệt rõ nhất — và ít người hỏi.**
>
> **Bộ lọc: "câu trả lời khác nhau thì thiết kế của mình khác nhau không?"**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba nhóm câu hỏi và thời gian mỗi nhóm?
2. Năm câu hỏi phi chức năng?
3. Bốn lợi ích của câu chốt phạm vi?
4. Ba lỗi khi làm rõ yêu cầu?
5. Bộ lọc để biết câu nào đáng hỏi?

## Tự viết lại

Đề: *"Thiết kế hệ thống đặt vé xem phim."*

Không nhìn lại, viết:

```text
① ba câu hỏi chức năng, dạng nêu giả định rồi xác nhận
② bốn con số quy mô cần hỏi
③ bốn câu phi chức năng
④ câu chốt phạm vi đầy đủ
```

Tự kiểm: ở ③, có câu nào về "cái gì không được mất" chưa — với đặt vé, đó là câu rất quan trọng.

## Thử sức

Bạn hỏi người phỏng vấn về quy mô. Họ nói: *"Bạn cứ giả định đi."*

Ba câu để trả lời: bạn giả định thế nào và nói ra sao; bạn chọn con số dựa vào gì; và bạn làm gì để giả định đó vẫn phục vụ bạn trong phần còn lại. Câu khó nhất: nếu giữa buổi họ nói "giả sử gấp 100 lần", bạn phản ứng thế nào — và phần nào của thiết kế đổi trước tiên?
