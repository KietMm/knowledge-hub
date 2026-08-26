---
title: Chọn mô hình embedding
slug: chon-mo-hinh-embedding
summary: Bốn tiêu chí, vì sao phải đo bằng dữ liệu của mình, và cái giá thật của việc đổi mô hình.
level: trung-cap
tags: [ai, embedding, danh-gia, chi-phi]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn mô hình embedding bằng phép đo, và biết vì sao đây là quyết định khó đảo.

## Ý tưởng chính

Chọn mô hình embedding là một quyết định **gần như không đảo được cho miễn phí**: đổi nó nghĩa là **tính lại toàn bộ kho vector**.

Nên nó xứng đáng được đo trước, bằng dữ liệu thật của bạn — không bằng bảng xếp hạng chung.

## Mental model

Hãy nghĩ tới **chọn hệ thống phân loại cho một thư viện**.

> Bạn chọn một hệ thống mã hoá và dán mã lên **mọi cuốn sách**. Việc đó mất hàng tháng.
>
> Sau đó phát hiện hệ thống khác phù hợp hơn với bộ sưu tập của bạn. Đổi nghĩa là **dán lại mã cho toàn bộ thư viện**.
>
> Nên người ta thử trên **một kệ sách** trước: dán mã theo hai hệ thống cho 200 cuốn, xem hệ nào giúp tìm nhanh hơn với đúng loại câu hỏi người đọc thường hỏi.

Thử trên một kệ trước là toàn bộ nội dung của bài này. Nó mất một ngày và tiết kiệm hàng tháng.

## Ví dụ nhỏ

```text
Thử nghiệm trên 2.000 đoạn và 50 câu hỏi thật:
  Mô hình A: recall@5 = 0,74   độ trễ 40ms   1.536 chiều
  Mô hình B: recall@5 = 0,86   độ trễ 90ms   1.024 chiều
  Mô hình C: recall@5 = 0,71   độ trễ 15ms     384 chiều
```

## Code chạy thế nào

**Bốn tiêu chí:**

```text
① CHẤT LƯỢNG TRÊN DỮ LIỆU CỦA BẠN
   Đo bằng recall@k trên bộ câu hỏi thật.
   ⇒ Đây là tiêu chí quyết định, và nó KHÔNG suy ra được
     từ bảng xếp hạng chung.

② SỐ CHIỀU
   Quyết định bộ nhớ và tốc độ tìm.
   1 triệu đoạn × 1.536 chiều × 4 byte ≈ 6 GB (chưa tính chỉ mục)
   ⇒ Số chiều lớn hơn không luôn tốt hơn cho bài toán của bạn.

③ ĐỘ DÀI ĐẦU VÀO TỐI ĐA
   Mô hình chỉ nhận 512 token thì đoạn dài hơn bị CẮT — âm thầm.
   ⇒ Phải khớp với kích thước đoạn bạn chọn
     ([[chia-doan-tai-lieu]]).

④ CHI PHÍ và CÁCH TRIỂN KHAI
   API của nhà cung cấp: dễ, trả theo token, dữ liệu ra ngoài
   Mô hình tự chạy: kiểm soát, không phí theo lần dùng,
     phải vận hành
```

**Tiêu chí ③ đáng nhấn vì nó hỏng im lặng:**

```text
Mô hình giới hạn 512 token, bạn đưa đoạn 900 token.
⇒ Nhiều thư viện CẮT phần thừa mà không báo.
⇒ Embedding chỉ đại diện cho nửa đầu đoạn.
⇒ Truy hồi kém, và không có lỗi nào để lần theo.

⇒ Kiểm: đếm token của đoạn dài nhất trong kho, so với giới hạn
  của mô hình.
```

## Cú pháp

**Quy trình thử — làm trên một tập nhỏ:**

```text
① Lấy 1.000–5.000 đoạn ĐẠI DIỆN cho kho thật
   ⇒ Đủ đa dạng: có bảng, có mã, có văn xuôi, có tiếng Anh lẫn Việt

② Lấy 30–50 câu hỏi THẬT, kèm đoạn đúng cho mỗi câu
   ⇒ Đây là phần tốn công nhất và không thể bỏ

③ Tính embedding của cả kho nhỏ bằng 2–4 mô hình ứng viên

④ Chạy 50 câu hỏi qua từng mô hình, đo:
     recall@5, recall@20, MRR, độ trễ, chi phí

⑤ Chọn theo yêu cầu thật, không theo điểm cao nhất
```

```text
Bước ④ nên đo cả recall@5 VÀ recall@20:
  recall@20 cao ở mọi mô hình ⇒ mô hình nào cũng "tìm được",
    khác biệt nằm ở XẾP HẠNG ⇒ thêm bước xếp hạng lại có thể
    quan trọng hơn việc chọn mô hình
    ([[truy-hoi-va-xep-hang-lai]])
```

**Tiếng Việt — ba điều cần kiểm riêng:**

```text
□ Mô hình có được huấn luyện trên tiếng Việt đáng kể không?
  ⇒ Mô hình chủ yếu tiếng Anh có thể kém hẳn với thuật ngữ
    và cách diễn đạt tiếng Việt.
□ Có xử lý dấu và chuẩn hoá Unicode không?
  ⇒ "quyết định" ở dạng NFD và NFC nên cho embedding gần nhau.
    Chuẩn hoá về NFC trước khi tính là an toàn hơn
    ([[unicode-va-encoding]]).
□ Có tìm chéo ngôn ngữ không?
  ⇒ Nếu tài liệu kỹ thuật là tiếng Anh mà người dùng hỏi
    tiếng Việt, đây là yêu cầu bắt buộc.
```

**Cái giá thật của việc đổi mô hình sau này:**

```text
□ Tính lại embedding cho TOÀN BỘ kho — chi phí và thời gian
□ Hiệu chỉnh lại NGƯỠNG điểm ([[do-tuong-dong-va-khoang-cach]])
□ Xây lại chỉ mục
□ Nếu số chiều đổi ⇒ đổi cả schema bảng
□ Trong lúc chuyển: hai kho song song, hoặc chấp nhận downtime

⇒ Cách giảm đau: thiết kế để chạy hai mô hình song song được
  (cột embedding thứ hai, hoặc bảng thứ hai) ⇒ chuyển dần và
  so sánh được, thay vì đổi một nhát.
```

## Tại sao cần nó

Vì đây là quyết định có tính chất **kiến trúc**, không phải một dòng cấu hình:

```text
Quyết định đảo được dễ: prompt, k, ngưỡng, mô hình sinh câu trả lời
Quyết định khó đảo:     mô hình embedding, cách chia đoạn

⇒ Nhóm thứ hai xứng đáng đo trước ([[ra-quyet-dinh-ky-thuat]]).
```

**Và một điều cần cân nhắc trước khi bỏ nhiều công vào việc này:**

```text
Trong thứ tự cải thiện một hệ thống RAG, đổi mô hình embedding
thường cho cải thiện NHỎ NHẤT:

  ① chia đoạn                    ← lớn nhất
  ② thêm tìm từ khoá
  ③ thêm xếp hạng lại
  ④ viết lại câu hỏi
  ⑤ đổi mô hình embedding        ← nhỏ nhất

⇒ Nên chọn một mô hình đủ tốt, đo để chắc nó không tệ,
  rồi chuyển sang bốn việc kia.
⇒ Đừng dành hai tuần so sánh sáu mô hình embedding khi chia đoạn
  còn đang cắt giữa bảng.
```

**Ba lưu ý vận hành:**

```text
□ Ghim PHIÊN BẢN mô hình. Nhà cung cấp cập nhật mô hình mà giữ
  tên ⇒ embedding mới không tương thích với embedding cũ trong kho.
□ Lưu tên và phiên bản mô hình trong siêu dữ liệu của mỗi đoạn
  ⇒ biết đoạn nào cần tính lại.
□ Tính embedding theo lô, có retry — nạp một triệu đoạn sẽ
  gặp lỗi mạng giữa đường.
```

Điểm đầu là một cái bẫy thật: hai vector từ hai phiên bản của cùng một mô hình có thể không so sánh được, và triệu chứng là chất lượng tụt dần mà không ai chạm vào mã.

## So sánh

| Tiêu chí | Đo bằng gì | Bỏ qua thì |
|---|---|---|
| Chất lượng | recall@k trên dữ liệu của bạn | chọn theo cảm giác |
| Số chiều | ước lượng RAM | hết bộ nhớ ở quy mô thật |
| Độ dài đầu vào | đếm token đoạn dài nhất | đoạn bị cắt âm thầm |
| Chi phí | token nạp + token truy vấn | hoá đơn bất ngờ |

## Dễ nhầm

**1. Chọn theo bảng xếp hạng chung.**

**2. Không có bộ câu hỏi kèm đoạn đúng.** Không đo được.

**3. Bỏ qua giới hạn độ dài đầu vào.** Đoạn bị cắt, không có lỗi.

**4. Không tính RAM theo số chiều.**

**5. Không ghim phiên bản mô hình.**

**6. Không lưu tên mô hình trong siêu dữ liệu.**

**7. Dùng mô hình khác cho câu hỏi và tài liệu.**

**8. Không chuẩn hoá Unicode trước khi tính.**

**9. Dành hai tuần so mô hình khi chia đoạn còn tệ.**

**10. Không thiết kế để chuyển dần.** Đổi mô hình thành một nhát downtime.

## Mẹo nhớ

> **Đổi mô hình embedding = TÍNH LẠI TOÀN BỘ KHO. Đo trước, trên một kệ sách.**
>
> **Giới hạn độ dài đầu vào hỏng IM LẶNG: đoạn dài bị cắt, không báo gì.**
>
> **Trong thứ tự cải thiện RAG, đổi mô hình embedding cho cải thiện NHỎ NHẤT.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn tiêu chí chọn mô hình embedding?
2. Vì sao giới hạn độ dài đầu vào là cái bẫy im lặng?
3. Năm bước quy trình thử?
4. Ba điều cần kiểm riêng cho tiếng Việt?
5. Cái giá thật của việc đổi mô hình sau này?

## Tự viết lại

Không nhìn lại, viết kế hoạch chọn mô hình embedding cho: 300.000 đoạn tài liệu kỹ thuật, nửa tiếng Việt nửa tiếng Anh, có nhiều mã sản phẩm.

```text
① tập thử: bao nhiêu đoạn, chọn thế nào
② bộ câu hỏi: bao nhiêu, lấy từ đâu
③ chỉ số đo
④ ước lượng RAM cho từng lựa chọn số chiều
⑤ chuẩn bị gì để đổi mô hình dễ hơn sau này
```

Tự kiểm: với nhiều mã sản phẩm, mô hình embedding tốt nhất có giải quyết được vấn đề đó không — hay bạn cần thứ khác?

## Thử sức

Đội đã nạp 2 triệu đoạn với một mô hình embedding. Sau ba tháng, phát hiện chất lượng truy hồi kém với tài liệu tiếng Việt, và có mô hình khác tốt hơn rõ rệt.

Ba câu để trả lời: bạn đánh giá có nên đổi không, dựa vào gì; nếu đổi, kế hoạch chuyển đổi từng bước; và bạn giữ hệ thống chạy trong lúc chuyển thế nào. Câu khó nhất: trước khi quyết định đổi, có hai việc rẻ hơn nhiều có thể cải thiện đáng kể — đó là gì, và vì sao nên thử chúng trước?
