---
title: Đánh giá agent
slug: danh-gia-agent
summary: Đo kết quả cuối hay đo từng bước — và vì sao "chạy tốt trong demo" không nói gì.
level: nang-cao
tags: [ai, agent, danh-gia, do-tin-cay]
khung: v2
---

> **Sau bài này bạn sẽ:** đo được agent bằng số, và biết bốn chỉ số nói cho bạn phải sửa ở đâu.

## Ý tưởng chính

Agent khó đánh giá vì hai lý do: **không có đầu ra tất định** (mỗi lần một đường đi), và **một nhiệm vụ có nhiều cách làm đúng**.

Nên không đo được bằng so khớp chính xác. Phải đo bằng **kết quả cuối cùng có đạt mục tiêu không** — và bằng **chi phí để đạt được nó**.

## Mental model

Hãy nghĩ tới **đánh giá một người giao hàng**.

> Bạn không chấm điểm bằng cách so đường họ đi với một tuyến đường mẫu. Họ có thể rẽ khác bạn và vẫn tới đúng.
>
> Bạn đo: **hàng có tới đúng địa chỉ không**, **mất bao lâu**, **tốn bao nhiêu xăng**, và **có gây chuyện gì trên đường không**.
>
> Và nếu có ba người cùng tới đích nhưng một người mất gấp ba thời gian — đó vẫn là một vấn đề, dù kết quả cuối đúng.

Bốn thứ đó là bốn chỉ số: **tỉ lệ hoàn thành**, **số bước**, **chi phí**, và **hành động sai**. Đo kết quả cuối mà bỏ ba cái sau là bỏ mất phần lớn thông tin.

## Ví dụ nhỏ

```text
30 nhiệm vụ kiểm tra:
  Hoàn thành đúng:        22/30  (73%)
  Số bước trung bình:     6,4
  Chi phí trung bình:     0,18 USD
  Hành động sai:          2 ca    ← nghiêm trọng nhất
  Chạm trần:              4 ca
```

## Code chạy thế nào

**Bốn chỉ số, và mỗi cái nói gì:**

```text
① TỈ LỆ HOÀN THÀNH ĐÚNG
   Kết quả cuối có đạt mục tiêu không.
   ⇒ Chỉ số chính. Nhưng một mình nó không nói sửa ở đâu.

② SỐ BƯỚC TRUNG BÌNH và PHÂN PHỐI
   Trung bình 6 nhưng có ca 18 ⇒ có loại nhiệm vụ đang lạc đường.
   ⇒ Nhìn PHÂN PHỐI, không chỉ trung bình.

③ CHI PHÍ mỗi nhiệm vụ
   ⇒ Quyết định agent có khả thi về kinh tế không.

④ SỐ HÀNH ĐỘNG SAI
   Gọi công cụ ghi không nên gọi, gửi thứ không nên gửi.
   ⇒ NGHIÊM TRỌNG NHẤT. Một ca ở đây đáng lo hơn mười ca
     không hoàn thành.
   ⇒ Không hoàn thành thì người dùng biết. Hành động sai thì không.
```

**Định nghĩa "hoàn thành đúng" — bước khó nhất:**

```text
① KIỂM TRẠNG THÁI CUỐI bằng mã   ← ưu tiên
   "Ticket đã được tạo với đúng nguyên nhân?"
   "File đã được sửa và test xanh?"
   ⇒ Tất định, rẻ, chạy tự động được.
   ⇒ Thiết kế nhiệm vụ sao cho kiểm được bằng cách này.

② MÔ HÌNH CHẤM theo tiêu chí
   Đưa mục tiêu, kết quả, tiêu chí ⇒ chấm.
   ⇒ Cần hiệu chỉnh với người ([[llm-lam-trong-tai]]).

③ NGƯỜI CHẤM
   Chuẩn vàng, đắt. Dùng để hiệu chỉnh ①–②.
```

```text
Cách ① là lý do vì sao agent hợp với những việc có KẾT QUẢ
KIỂM CHỨNG ĐƯỢC: viết mã (test xanh), sửa dữ liệu (truy vấn
kiểm được), tạo bản ghi (bản ghi tồn tại).
⇒ Việc không kiểm chứng được thì cũng không đánh giá được —
  và đó là dấu hiệu bài toán chưa phù hợp với agent.
```

## Cú pháp

**Bộ nhiệm vụ kiểm tra — bốn loại:**

```text
□ NHIỆM VỤ ĐIỂN HÌNH, giải được          (~50%)
□ NHIỆM VỤ CẦN NHIỀU BƯỚC, phức tạp      (~20%)
□ NHIỆM VỤ KHÔNG GIẢI ĐƯỢC              (~20%)
  công cụ thiếu, dữ liệu không tồn tại
  ⇒ Đo xem agent có NHẬN RA và DỪNG, hay cứ thử tới chạm trần
□ NHIỆM VỤ CÓ CÁM DỖ LÀM SAI            (~10%)
  "xoá hết đơn cũ đi cho gọn" — agent có dừng lại hỏi không?
  ⇒ Đo chỉ số ④
```

Loại thứ ba đáng chú ý: **biết dừng khi không giải được** là một năng lực riêng, và nó không xuất hiện trong bộ chỉ có nhiệm vụ giải được.

**Chạy nhiều lần cùng một nhiệm vụ:**

```text
Agent không tất định ⇒ chạy MỘT lần không nói được gì.

⇒ Chạy mỗi nhiệm vụ 3–5 lần, đo:
  □ Tỉ lệ thành công (2/5 hay 5/5?)
  □ ĐỘ ỔN ĐỊNH — số bước có dao động lớn không?

⇒ Một nhiệm vụ thành công 5/5 với 4–6 bước là ổn.
  Thành công 5/5 nhưng số bước dao động 3–17 là dấu hiệu
  agent đang mò.
```

**Đọc log để tìm nguyên nhân — bốn mẫu hay gặp:**

```text
□ Gọi lặp cùng công cụ         → mô tả công cụ chưa rõ,
                                  hoặc kết quả không dùng được
□ Chạm trần thường xuyên       → thiếu công cụ, hoặc mục tiêu
                                  không có tiêu chí dừng
□ Đi lan sang việc khác        → mục tiêu bị cắt khỏi ngữ cảnh
                                  ([[bo-nho-cua-agent]])
□ Dừng quá sớm                 → tiêu chí hoàn thành quá lỏng
```

Bốn mẫu này ánh xạ trực tiếp sang bốn chỗ sửa, nên phân loại được ca sai theo chúng là bước quan trọng nhất khi cải thiện.

**Đo trong production:**

```text
□ Tỉ lệ hoàn thành thật (theo phản hồi người dùng, hoặc theo
  việc họ có phải làm lại bằng tay không)
□ Phân phối số bước và chi phí
□ Tỉ lệ chạm trần
□ Tỉ lệ bị người dùng DỪNG giữa chừng
  ⇒ Chỉ số này rất giá trị: người dùng thấy nó đi sai hướng
    trước cả bạn
□ Số hành động ĐỎ được xác nhận / bị từ chối
  ⇒ Tỉ lệ từ chối cao ⇒ agent đang đề nghị sai
```

Hai chỉ số cuối là hai chỉ số đặc thù của agent, và chúng cho tín hiệu sớm nhất về chất lượng quyết định.

## Tại sao cần nó

Vì đánh giá agent bằng cảm nhận dẫn tới kết luận sai theo cả hai hướng:

```text
"Demo chạy rất tốt" ⇒ đưa lên production
  ⇒ Ba ca demo là ba ca dễ. Ca thật đa dạng hơn nhiều.

"Nó hay sai" ⇒ bỏ agent
  ⇒ Có thể chỉ một loại nhiệm vụ đang sai, và sửa được bằng
    một công cụ hoặc một câu trong mục tiêu.

⇒ Cả hai kết luận đều cần SỐ, và số phải phân loại được
  theo loại nhiệm vụ.
```

**Ngân sách — câu hỏi khả thi về kinh tế:**

```text
Agent giải được nhiệm vụ với chi phí 0,40 USD và 45 giây.
Người làm mất 15 phút.

⇒ Đáng nếu công việc đó thực sự tốn 15 phút của người.
⇒ Không đáng nếu người làm mất 2 phút, hoặc nếu 27% ca vẫn
  phải làm lại bằng tay.

⇒ Chỉ số quyết định: TỈ LỆ HOÀN THÀNH × TIẾT KIỆM,
  trừ đi CHI PHÍ và trừ đi công KIỂM TRA kết quả.
⇒ Công kiểm tra hay bị bỏ khỏi phép tính, và nó thường lớn.
```

Vế cuối là điểm đáng nhớ: **nếu người vẫn phải đọc kỹ mọi kết quả, phần lớn tiết kiệm đã mất**.

## So sánh

| Cách đánh giá | Bắt được gì | Chi phí |
|---|---|---|
| Chạy thử vài ca | gần như không gì | rất thấp |
| Bộ nhiệm vụ + kiểm bằng mã | tỉ lệ hoàn thành, ổn định | vừa |
| + chạy nhiều lần | độ ổn định thật | cao hơn |
| + đọc log phân loại | **nguyên nhân** | công người |
| Đo trong production | thực tế | thấp, cần chuẩn bị |

## Dễ nhầm

**1. Đánh giá bằng vài ca demo.**

**2. Chỉ đo tỉ lệ hoàn thành.** Không biết sửa ở đâu.

**3. Bỏ qua số hành động sai.** Nghiêm trọng nhất.

**4. Chạy mỗi nhiệm vụ một lần.** Agent không tất định.

**5. Chỉ nhìn số bước trung bình.** Phân phối mới nói lên vấn đề.

**6. Bộ kiểm không có nhiệm vụ không giải được.**

**7. Bộ kiểm không có nhiệm vụ cám dỗ làm sai.**

**8. Không phân loại ca sai theo bốn mẫu.**

**9. Không theo dõi tỉ lệ bị người dùng dừng.**

**10. Bỏ công kiểm tra kết quả khỏi phép tính kinh tế.**

## Mẹo nhớ

> **Đo KẾT QUẢ CUỐI, không đo đường đi — nhiều đường cùng đúng.**
>
> **HÀNH ĐỘNG SAI nghiêm trọng hơn KHÔNG HOÀN THÀNH: cái sau người dùng biết, cái trước thì không.**
>
> **Chạy MỖI nhiệm vụ nhiều lần — một lần không nói được gì.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn chỉ số, cái nào nghiêm trọng nhất và vì sao?
2. Ba cách định nghĩa "hoàn thành đúng", cách nào ưu tiên?
3. Bốn loại nhiệm vụ trong bộ kiểm, loại nào đo được năng lực "biết dừng"?
4. Bốn mẫu trong log và chỗ sửa tương ứng?
5. Phép tính kinh tế gồm những gì, và cái gì hay bị bỏ?

## Tự viết lại

Không nhìn lại, thiết kế đánh giá cho agent hỗ trợ khách hàng:

```text
① bộ 25 nhiệm vụ, tỉ lệ từng loại
② cách định nghĩa "hoàn thành đúng"
③ bốn chỉ số và ngưỡng chấp nhận
④ ba chỉ số theo dõi trong production
⑤ phép tính xem có khả thi về kinh tế không
```

Tự kiểm: ở ⑤, bạn có tính công **kiểm tra kết quả** của người không — và nếu tính, kết luận có đổi không?

## Thử sức

Agent viết mã của đội có tỉ lệ hoàn thành 68%. Đội muốn cải thiện nhưng không biết bắt đầu từ đâu.

Ba câu để trả lời: bạn phân tích 32% thất bại thế nào để tìm hướng; ba dữ liệu bạn cần từ log; và bạn ưu tiên sửa gì trước. Câu khó nhất: nếu trong 68% "hoàn thành", có 5% thực ra đã làm một thay đổi không ai yêu cầu mà test vẫn xanh — chỉ số nào bắt được điều đó, và vì sao nó đáng lo hơn 32% thất bại?
