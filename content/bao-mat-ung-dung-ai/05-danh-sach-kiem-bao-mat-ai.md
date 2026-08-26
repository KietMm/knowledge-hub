---
title: Danh sách kiểm bảo mật cho ứng dụng AI
slug: danh-sach-kiem-bao-mat-ai
summary: Tổng hợp mọi thứ thành một danh sách chạy được, và cách kiểm chứng thay vì hy vọng.
level: nang-cao
tags: [ai, bao-mat, van-hanh, kiem-thu]
khung: v2
---

> **Sau bài này bạn sẽ:** có một danh sách kiểm chạy được trước khi đưa ứng dụng AI lên production, và cách kiểm chứng từng mục.

## Ý tưởng chính

Bảo mật ứng dụng AI không phải một tính năng. Nó là **một tập các quyết định thiết kế**, và phần lớn chúng phải được đưa ra **trước khi** có người dùng.

Nguyên tắc xuyên suốt: **giả định mô hình sẽ bị điều khiển một tỉ lệ nào đó**, và giới hạn thiệt hại của tỉ lệ đó.

## Mental model

Hãy nghĩ tới **kiểm tra trước khi máy bay cất cánh**.

> Phi công không "cảm thấy máy bay ổn". Họ đi qua một **danh sách**, từng mục, mỗi lần bay.
>
> Danh sách đó không phải vì họ không giỏi. Nó vì **con người bỏ sót**, nhất là với những việc lặp lại và những việc đã đúng chín mươi chín lần trước.
>
> Và mỗi mục trong danh sách có một **cách kiểm cụ thể** — không phải "xem có ổn không".

Hai điều đó là toàn bộ giá trị của bài này: **có danh sách**, và **mỗi mục có cách kiểm**.

## Ví dụ nhỏ

```text
❌ "Đã xem xét bảo mật, thấy ổn."
✅ "Đã chạy 12 mục kiểm. Mục 7 (giới hạn miền giá trị công cụ
    gửi email) chưa làm — đang chặn phát hành."
```

## Code chạy thế nào

**Danh sách kiểm — nhóm theo tầng:**

```text
DỮ LIỆU VÀO NGỮ CẢNH
□ Dữ liệu không được phép nói ra thì KHÔNG đưa vào ngữ cảnh
□ Truy hồi lọc TRƯỚC theo quyền người dùng
□ Công cụ chỉ trả về trường cần thiết
□ Dữ liệu nhạy cảm không cần thiết được che
□ Đã kiểm điều khoản gói dịch vụ mô hình
  ([[ro-ri-du-lieu-qua-llm]])

CÔNG CỤ VÀ QUYỀN
□ Danh tính từ phiên đăng nhập, KHÔNG từ tham số
□ Mỗi công cụ dùng tài khoản có đúng quyền nó cần
□ Không có công cụ chạy SQL/lệnh tuỳ ý (hoặc có danh sách
  cho phép + môi trường cách ly)
□ Miền giá trị tham số bị giới hạn (nhất là công cụ gửi ra ngoài)
□ Đã xét TẬP HỢP công cụ, không chỉ từng cái
□ Công cụ ghi là idempotent
□ Công cụ khó đảo cần người xác nhận
  ([[lam-dung-cong-cu-va-quyen]])

CHỐNG LẠM DỤNG
□ Rate limit theo người dùng và theo IP
□ Trần token theo người dùng mỗi ngày
□ Giới hạn độ dài đầu vào
□ Trần hệ thống, có suy giảm có kiểm soát
  ([[kiem-duyet-va-lam-dung]])

KIỂM NỘI DUNG
□ Kiểm đầu vào
□ Kiểm ĐẦU RA cho ràng buộc nghiệp vụ quan trọng
□ Kiểm phạm vi

AGENT (nếu có)
□ Ba trần: bước, chi phí, thời gian
□ Phân loại xanh/vàng/đỏ cho mọi hành động
□ Nút dừng cho người dùng
  ([[gioi-han-va-lan-can-agent]])

QUAN SÁT
□ Log đủ để tái hiện, gồm đầu ra thô
□ Log kiểm toán cho mọi lời gọi công cụ có tác dụng phụ
□ Log có che dữ liệu, có thời hạn, có phân quyền
□ Đường xoá dữ liệu cá nhân khỏi mọi nơi
  ([[quan-sat-ung-dung-llm]])
```

## Cú pháp

**Kiểm chứng — mỗi mục một cách kiểm cụ thể:**

```text
Không đủ: "đã xem, thấy ổn".
Cần: một phép thử cho ra kết quả có/không.

□ "Dữ liệu lọc theo quyền"
  ⇒ TEST: người dùng A hỏi về dữ liệu của B ⇒ không trả về
□ "Danh tính từ phiên"
  ⇒ ĐỌC MÃ: có tham số nào tên userId/tenantId trong schema
    công cụ không? Có ⇒ chưa đạt.
□ "Miền giá trị bị giới hạn"
  ⇒ TEST: gọi công cụ với địa chỉ ngoài danh sách ⇒ bị từ chối
□ "Trần token mỗi người dùng"
  ⇒ TEST: gửi request vượt trần ⇒ bị chặn
□ "Kiểm đầu ra"
  ⇒ TEST: mô hình trả về câu vi phạm ràng buộc ⇒ bị bắt
```

**Ba loại test đặc thù cho ứng dụng AI:**

```text
① TEST PHỦ ĐỊNH THEO VAI
   Người dùng A hỏi dữ liệu của B ⇒ không trả về.
   ⇒ Loại test hay thiếu nhất, và là loại duy nhất bắt được
     lỗi phân quyền một cách hệ thống
     ([[kiem-thu-va-danh-gia-bao-mat]]).

② TEST PROMPT INJECTION
   Một tập ca cố tình phá, chạy như bộ eval:
     - chỉ dẫn trong dữ liệu đầu vào
     - chỉ dẫn trong tài liệu được truy hồi
     - yêu cầu vượt phạm vi
   ⇒ Không kỳ vọng chặn 100%. Kỳ vọng: THIỆT HẠI khi bị lừa
     là chấp nhận được.

③ TEST TRẦN VÀ GIỚI HẠN
   Vượt trần token, vượt số bước, đầu vào rất dài
   ⇒ Kiểm hệ thống suy giảm có kiểm soát, không sập.
```

```text
Loại ② đáng chú ý về cách đọc kết quả: nếu 3/20 ca injection
"thành công" nhưng thiệt hại tối đa chỉ là "mô hình trả lời
ngoài phạm vi", đó là chấp nhận được.
Nếu 1/20 ca dẫn tới dữ liệu ra ngoài, đó là chặn phát hành.
⇒ Đo THIỆT HẠI, không đo tỉ lệ chặn.
```

**Rà soát định kỳ — vì hệ thống thay đổi:**

```text
Mỗi khi thêm công cụ:
  □ Xét lại TẬP HỢP công cụ — cặp mới nào nguy hiểm?
  □ Chạy lại test injection

Mỗi quý:
  □ Rà quyền của các tài khoản dịch vụ
  □ Đọc mẫu log kiểm toán: AI đã làm gì thay mặt ai?
  □ Kiểm dữ liệu trong log có gì không nên còn ở đó

⇒ Danh sách kiểm một lần lúc ra mắt không đủ: mỗi công cụ mới
  có thể mở một đường mới ([[phong-ngua-va-hoc-tu-bug]]).
```

## Tại sao cần nó

Vì các quyết định bảo mật ở đây phần lớn **rất đắt để sửa sau**:

```text
Sửa được dễ:      prompt, ngưỡng, thông báo từ chối
Đắt để sửa sau:   thiết kế công cụ (danh tính từ tham số),
                  quyền của tài khoản dịch vụ,
                  việc đã đưa dữ liệu vào ngữ cảnh và log

⇒ Nhóm thứ hai xứng đáng được quyết định TRƯỚC khi có người dùng.
⇒ Và dữ liệu đã rò thì không thu hồi được.
```

**Ba câu hỏi tóm gọn cả bài:**

```text
① Nếu người ngoài điều khiển được mô hình trong một request,
   họ làm được gì?
② Dữ liệu nào trong ngữ cảnh mà người dùng này không được xem?
③ Hành động nào hệ thống làm được mà không ai kiểm?

⇒ Trả lời được ba câu này bằng danh sách cụ thể là bạn đã làm
  phần lớn công việc.
⇒ Không trả lời được câu nào nghĩa là bạn chưa biết rủi ro
  của hệ thống mình.
```

**Và nguyên tắc kết:**

```text
Đừng thiết kế dựa vào việc mô hình sẽ hành xử đúng.
Thiết kế dựa vào việc nó SẼ sai và SẼ bị lừa một tỉ lệ nào đó.

⇒ Đây không phải sự thiếu tin tưởng vào mô hình. Nó là cùng
  nguyên tắc với đặc quyền tối thiểu, với timeout, với
  circuit breaker: giả định thất bại và giới hạn hậu quả
  ([[thiet-ke-cho-that-bai]]).
```

## So sánh

| Quyết định | Sửa sau | Nên quyết định khi nào |
|---|---|---|
| Prompt, ngưỡng | dễ | bất cứ lúc nào |
| Kiểm đầu ra | vừa | trước khi ra mắt |
| Thiết kế công cụ | **đắt** | khi thiết kế |
| Quyền tài khoản dịch vụ | **đắt** | khi thiết kế |
| Dữ liệu đã vào log | **không sửa được** | trước khi ghi dòng đầu |

## Dễ nhầm

**1. "Đã xem xét, thấy ổn."** Mỗi mục cần một cách kiểm.

**2. Không có test phủ định theo vai.**

**3. Không có bộ test injection.**

**4. Đo tỉ lệ chặn injection thay vì đo thiệt hại.**

**5. Kiểm một lần lúc ra mắt.** Mỗi công cụ mới mở đường mới.

**6. Không xét lại tập hợp công cụ khi thêm cái mới.**

**7. Không rà quyền tài khoản dịch vụ định kỳ.**

**8. Không đọc log kiểm toán.**

**9. Để quyết định về công cụ và quyền tới sau khi ra mắt.**

**10. Thiết kế dựa vào việc mô hình hành xử đúng.**

## Mẹo nhớ

> **Mỗi mục trong danh sách phải có một CÁCH KIỂM cho ra có/không.**
>
> **Với test injection: đo THIỆT HẠI khi bị lừa, không đo tỉ lệ chặn.**
>
> **Ba câu: điều khiển được thì làm gì? — dữ liệu nào không được xem? — hành động nào không ai kiểm?**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Sáu nhóm trong danh sách kiểm?
2. Ba loại test đặc thù cho ứng dụng AI?
3. Vì sao đo thiệt hại thay vì tỉ lệ chặn với test injection?
4. Quyết định nào đắt để sửa sau, nên quyết định khi nào?
5. Ba câu hỏi tóm gọn cả bài?

## Tự viết lại

Không nhìn lại, viết danh sách kiểm cho một hệ thống thật của bạn (hoặc một hệ thống giả định: trợ lý hỗ trợ khách hàng có RAG và ba công cụ):

```text
① danh sách theo sáu nhóm
② với mỗi mục, cách kiểm cụ thể
③ ba test đặc thù, với ca cụ thể
④ lịch rà soát định kỳ
⑤ trả lời ba câu hỏi tóm gọn
```

Tự kiểm: có mục nào bạn viết mà **không nghĩ ra được cách kiểm** — nếu có, viết lại mục đó cho cụ thể hơn.

## Thử sức

Đội bạn sắp ra mắt trợ lý AI cho khách hàng trong hai tuần. Nó có RAG trên tài liệu nội bộ, ba công cụ (tra đơn, tạo ticket, gửi email xác nhận), và mở cho mọi khách hàng.

Ba câu để trả lời: năm mục bạn kiểm **trước tiên** và vì sao chúng đứng đầu; mục nào bạn coi là **chặn phát hành** nếu chưa xong; và bạn dùng hai tuần đó thế nào. Câu khó nhất: nếu chỉ có thời gian làm **ba** biện pháp, bạn chọn ba cái nào — và lập luận của bạn dựa vào tiêu chí gì?
