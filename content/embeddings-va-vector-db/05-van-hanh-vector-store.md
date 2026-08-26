---
title: Vận hành vector store
slug: van-hanh-vector-store
summary: Nạp dữ liệu theo lô, đồng bộ, sao lưu, và bốn chỉ số phải theo dõi.
level: nang-cao
tags: [ai, vector-database, van-hanh, du-lieu]
khung: v2
---

> **Sau bài này bạn sẽ:** thiết kế đường nạp dữ liệu chịu được lỗi, và biết bốn chỉ số phải theo dõi.

## Ý tưởng chính

Vector store là **một CSDL nữa** trong hệ thống của bạn. Nó cần đúng những gì mọi CSDL cần: nạp dữ liệu chịu lỗi, đồng bộ với nguồn, sao lưu, và giám sát.

Và nó có một tính chất riêng làm mọi thứ khó hơn: **dữ liệu trong nó là dẫn xuất**. Nó phải được giữ đồng bộ với một nguồn khác — và khi lệch, không có lỗi nào báo cho bạn.

## Mental model

Hãy nghĩ tới **một mục lục thẻ của thư viện**.

> Mục lục không phải sách. Nó là **bản dẫn xuất** từ sách.
>
> Sách mới vào ⇒ phải thêm thẻ. Sách bị rút ra ⇒ phải bỏ thẻ.
>
> Và nếu ai đó bỏ sách khỏi kệ mà quên bỏ thẻ: **mục lục vẫn hoạt động bình thường**. Người đọc tra ra thẻ, đi tới kệ, và không thấy sách. Không có báo động nào.
>
> Cách duy nhất phát hiện: **định kỳ đối chiếu mục lục với kệ**.

Bước đối chiếu định kỳ đó là thứ hay bị bỏ, và là thứ duy nhất bắt được loại lệch này.

## Ví dụ nhỏ

```text
Đường nạp dữ liệu:
  nguồn → tách văn bản → chia đoạn → tính embedding (theo lô)
        → ghi vào store (có id nguồn) → đánh dấu đã đồng bộ
```

## Code chạy thế nào

**Nạp dữ liệu theo lô — bốn thứ bắt buộc:**

```text
① THEO LÔ, không từng đoạn một
   Tính embedding cho 100–500 đoạn mỗi lời gọi.
   ⇒ Từng đoạn một: một triệu lời gọi API. Rất chậm và rất đắt.

② TIẾN ĐỘ GHI LẠI ĐƯỢC
   Ghi lại đã xử lý tới đâu. Đứt giữa đường ⇒ tiếp tục,
   không làm lại từ đầu.
   ⇒ Nạp một triệu đoạn SẼ đứt giữa đường.

③ RETRY CÓ BACKOFF
   API embedding sẽ trả lỗi tạm thời và giới hạn tần suất.
   ⇒ Retry với backoff và jitter ([[thiet-ke-cho-that-bai]]).

④ IDEMPOTENT
   Chạy lại phải cho cùng kết quả, không tạo bản trùng.
   ⇒ Khoá theo (id nguồn, chỉ số đoạn), dùng upsert.
```

```text
Bốn điều này giống hệt yêu cầu của mọi job xử lý dữ liệu lớn
([[job-nen-va-tac-vu-dinh-ky]]). Vector store không đặc biệt —
nó chỉ hay bị làm bằng một script dùng một lần rồi để đó.
```

**Bỏ qua đoạn không đổi — tối kiệm đáng kể:**

```ts
const hash = sha256(noiDungDoan)
// Đã có đoạn với cùng (nguonId, chiSo, hash) ⇒ bỏ qua, không tính lại
```

```text
Tài liệu sửa một câu ⇒ chỉ 1 trong 40 đoạn thay đổi.
⇒ Không có hash: tính lại 40 embedding.
⇒ Có hash: tính lại 1.
⇒ Với đồng bộ hằng ngày trên hàng nghìn tài liệu, đây là khác
  biệt giữa vài phút và vài giờ.
```

## Cú pháp

**Đồng bộ với nguồn — ba cơ chế:**

```text
① ĐỒNG BỘ ĐẦY ĐỦ ĐỊNH KỲ
   Quét lại toàn bộ nguồn, so hash, cập nhật phần khác.
   + Đơn giản, tự sửa được mọi lệch
   − Chậm với dữ liệu lớn
   ⇒ Chạy hằng đêm là hợp lý cho phần lớn hệ thống.

② SỰ KIỆN THEO THAY ĐỔI
   Tài liệu sửa ⇒ phát sự kiện ⇒ worker cập nhật đoạn.
   + Gần thời gian thực
   − Mất một sự kiện ⇒ lệch âm thầm

③ CẢ HAI  ← thường là câu trả lời đúng
   Sự kiện để cập nhật nhanh, đồng bộ đầy đủ định kỳ để SỬA LỆCH.
   ⇒ Cách ② một mình không đủ vì không tự phục hồi được.
```

**Đối chiếu định kỳ — bắt loại lệch không báo lỗi:**

```text
Kiểm mỗi tuần:
  □ Số tài liệu ở nguồn so với số id nguồn trong store
  □ Có id nguồn nào trong store mà nguồn ĐÃ XOÁ?     ← nghiêm trọng
  □ Có tài liệu nào ở nguồn mà chưa có đoạn nào?
  □ Có đoạn nào thiếu embedding (null)?

⇒ Trường hợp thứ hai là loại lỗi tệ nhất: hệ thống trả lời
  theo tài liệu đã bị thu hồi, và mọi thứ trông bình thường
  ([[rag-trong-thuc-te]]).
```

**Sao lưu — và một câu hỏi trước đó:**

```text
Câu hỏi đầu tiên: có cần sao lưu vector store không?

  Nếu dựng lại được TỪ NGUỒN ⇒ có thể KHÔNG cần sao lưu.
  Chỉ cần biết: dựng lại mất bao lâu và tốn bao nhiêu?
    1 triệu đoạn, tính lại embedding: vài giờ và một khoản chi phí.
  ⇒ Nếu con số đó chấp nhận được, "sao lưu" của bạn chính là
    nguồn dữ liệu gốc.

  Nếu KHÔNG dựng lại được (nguồn đã mất, hoặc quá đắt)
  ⇒ phải sao lưu thật, và phải THỬ khôi phục
    ([[giam-sat-va-sao-luu]]).
```

Đây là một điểm khác biệt hữu ích so với CSDL thường: vector store thường là dữ liệu **dẫn xuất**, nên chiến lược đúng có thể là "dựng lại được" thay vì "sao lưu".

**Bốn chỉ số phải theo dõi:**

```text
① Số đoạn trong store — tăng đột ngột hoặc giảm đột ngột đều đáng nghi
② Độ trễ p95 của truy vấn vector
③ Bộ nhớ chỉ mục — HNSW tăng theo số đoạn
④ Thời điểm đồng bộ thành công gần nhất
   ⇒ Chỉ số này bắt được hỏng im lặng: job đồng bộ chết ba tuần
     mà mọi thứ vẫn "hoạt động"
```

## Tại sao cần nó

Vì vector store hỏng theo cách khác với CSDL thường:

```text
CSDL thường hỏng:      truy vấn lỗi, ứng dụng báo lỗi, bạn biết ngay.
Vector store hỏng:     nó VẪN TRẢ VỀ kết quả — chỉ là kết quả
                       của dữ liệu cũ, thiếu, hoặc đã bị thu hồi.

⇒ Không có lỗi nào để cảnh báo.
⇒ Nên phải canh bằng ĐỐI CHIẾU và ĐO CHẤT LƯỢNG, không phải
  bằng tỉ lệ lỗi.
```

**Ba việc nên tự động hoá ngay từ đầu:**

```text
□ Job đồng bộ đầy đủ hằng đêm, có cảnh báo khi THẤT BẠI
  và khi KHÔNG CHẠY
□ Đối chiếu hằng tuần, báo cáo số lệch
□ Bộ ca kiểm recall@k chạy định kỳ
  ⇒ Chất lượng tụt là dấu hiệu sớm nhất của dữ liệu lệch
    ([[danh-gia-he-thong-rag]])
```

**Và một lời khuyên về quy mô:** với dưới vài trăm nghìn đoạn, một bảng trong Postgres cùng một job đồng bộ hằng đêm là đủ cho rất lâu. Phần lớn phức tạp vận hành ở bài này đến từ việc chọn một hệ thống riêng quá sớm ([[vector-database-va-chi-muc]]).

## So sánh

| | Đồng bộ đầy đủ định kỳ | Sự kiện theo thay đổi | Cả hai |
|---|---|---|---|
| Độ mới | chậm (giờ) | gần thời gian thực | gần thời gian thực |
| Tự sửa lệch | ✅ | ❌ | ✅ |
| Chi phí | cao mỗi lần chạy | thấp | vừa |
| Độ phức tạp | thấp | vừa | vừa |

## Dễ nhầm

**1. Tính embedding từng đoạn một.** Rất chậm và đắt.

**2. Không ghi lại tiến độ.** Đứt giữa đường là làm lại từ đầu.

**3. Không retry.** Nạp dữ liệu lớn sẽ gặp lỗi tạm thời.

**4. Không idempotent.** Chạy lại tạo bản trùng.

**5. Không dùng hash để bỏ qua đoạn không đổi.**

**6. Chỉ dùng sự kiện, không có đồng bộ đầy đủ.** Không tự sửa lệch.

**7. Không đối chiếu định kỳ.** Không bắt được lệch im lặng.

**8. Không cảnh báo khi job đồng bộ **không chạy**.**

**9. Sao lưu vector store mà chưa hỏi có dựng lại được không.**

**10. Chọn vector database riêng khi Postgres là đủ.**

## Mẹo nhớ

> **Vector store là dữ liệu DẪN XUẤT — nó lệch với nguồn mà KHÔNG báo lỗi.**
>
> **Chỉ có ĐỐI CHIẾU ĐỊNH KỲ bắt được loại lệch đó.**
>
> **Dựng lại được từ nguồn ⇒ "sao lưu" của bạn chính là nguồn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn thứ bắt buộc của một đường nạp dữ liệu?
2. Hash nội dung đoạn tiết kiệm gì?
3. Ba cơ chế đồng bộ, vì sao chỉ dùng sự kiện là không đủ?
4. Bốn thứ kiểm khi đối chiếu định kỳ, cái nào nghiêm trọng nhất?
5. Bốn chỉ số phải theo dõi?

## Tự viết lại

Không nhìn lại, thiết kế đường dữ liệu cho: 50.000 tài liệu, mỗi ngày sửa khoảng 200 tài liệu, xoá khoảng 10.

```text
① kiến trúc nạp dữ liệu, đủ bốn yêu cầu
② cơ chế đồng bộ
③ đối chiếu định kỳ: kiểm gì, tần suất
④ chiến lược sao lưu, kèm lý do
⑤ bốn cảnh báo
```

Tự kiểm: ở ②, khi một tài liệu bị xoá, bao lâu sau trợ lý ngừng dẫn nó — và bạn có cảnh báo nếu bước đó thất bại không?

## Thử sức

Sau bốn tháng chạy, đội phát hiện vector store có 12.000 đoạn thuộc các tài liệu đã bị xoá khỏi hệ thống gốc, và thiếu đoạn của 300 tài liệu mới. Job đồng bộ báo "thành công" mỗi đêm.

Ba câu để trả lời: hai loại lệch này có nguyên nhân gì, và vì sao job vẫn báo thành công; bạn sửa dữ liệu hiện tại thế nào; và ba biện pháp để lần sau phát hiện trong vài ngày thay vì bốn tháng. Câu khó nhất: job "báo thành công" nhưng dữ liệu lệch — điều đó nói gì về **cái mà job đang kiểm**, và bạn định nghĩa lại "thành công" ra sao?
