---
title: Đo chất lượng trong production
slug: do-trong-production
summary: Bốn tín hiệu người dùng cho bạn miễn phí, và cách biến chúng thành dữ liệu cải thiện.
level: trung-cap
tags: [ai, danh-gia, van-hanh, do-tin-cay]
khung: v2
---

> **Sau bài này bạn sẽ:** đo chất lượng bằng hành vi người dùng, và biến phản hồi thành ca eval mới.

## Ý tưởng chính

Bộ eval đo được **những gì bạn đã nghĩ tới**. Production cho bạn **những gì bạn chưa nghĩ tới** — và đó là phần lớn.

Và người dùng đã cho bạn tín hiệu về chất lượng qua **hành vi của họ**, miễn phí. Việc của bạn là đo nó.

## Mental model

Hãy nghĩ tới **một quán ăn muốn biết món nào ngon**.

> Cách khó: phát phiếu khảo sát. Ít người điền, và người điền là những người đặc biệt hài lòng hoặc đặc biệt tức.
>
> Cách rẻ và chính xác hơn: **nhìn vào đĩa khi dọn bàn**. Đĩa sạch hay còn nửa? Khách có gọi thêm không? Có quay lại không?
>
> Và khi có người phàn nàn, đó là **thông tin quý nhất** — vì nó chỉ đúng chỗ, và những người khác cùng gặp vấn đề đó thì im lặng.

Hành vi là tín hiệu chính. Phản hồi trực tiếp là tín hiệu quý nhưng thưa. Cả hai đều cần.

## Ví dụ nhỏ

```text
Tín hiệu người dùng cho miễn phí:
  hỏi lại cùng ý ngay sau đó   → câu trả lời không dùng được
  bỏ giữa lúc đang stream       → đi sai hướng
  chuyển sang người thật        → không giải quyết được
  bấm vào nguồn trích dẫn       → họ đang kiểm (hoặc không tin)
```

## Code chạy thế nào

**Bốn tín hiệu hành vi, và cách đo:**

```text
① TỈ LỆ HỎI LẠI                ← tín hiệu tốt nhất
   Người dùng hỏi lại cùng ý trong 30–60 giây.
   Đo: so ngữ nghĩa hai câu hỏi liên tiếp của cùng người
       ([[embedding-la-gi]])
   ⇒ Không cần người dùng bấm gì. Đo được trên 100% lưu lượng.

② TỈ LỆ BỎ GIỮA DÒNG
   Với streaming: người dùng đóng hoặc bấm dừng.
   ⇒ Họ thấy nó đi sai hướng trước cả bạn.

③ TỈ LỆ CHUYỂN NGƯỜI THẬT
   Nếu có đường thoát sang hỗ trợ người.
   ⇒ Chỉ số trực tiếp nhất về "hệ thống có giải quyết được không".

④ TỈ LỆ BẤM VÀO NGUỒN
   Cao có thể là tốt (họ kiểm được) hoặc xấu (họ không tin).
   ⇒ Đọc cùng với ① mới có nghĩa: bấm nhiều + hỏi lại nhiều
     = họ không tin và phải tự tra.
```

**Hai tín hiệu trực tiếp:**

```text
NÚT BÁO SAI
  Thưa (thường 1–5% người dùng bấm), nhưng CHÍNH XÁC.
  ⇒ Mỗi báo cáo là một ca eval mới, gần như miễn phí
    ([[xay-bo-eval]]).
  ⇒ Thiết kế: cho họ chọn LOẠI sai (thiếu thông tin / sai thông tin /
    không đúng ý) — nó phân loại luôn cho bạn.

NÚT HÀI LÒNG
  Ít thông tin hơn báo sai. Người hài lòng ít bấm.
  ⇒ Hữu ích để so xu hướng theo thời gian, không để đo mức tuyệt đối.
```

## Cú pháp

**Ba chỉ số hệ thống nói lên chất lượng:**

```text
① TỈ LỆ "KHÔNG TÌM THẤY" (với RAG)
   Tăng ⇒ tài liệu bị mất, hoặc truy hồi hỏng.
   Giảm về gần 0 ⇒ ĐÁNG NGHI: mô hình đang suy đoán
     ([[rag-trong-thuc-te]]).

② CÂU HỎI KHÔNG TÌM ĐƯỢC ĐOẠN NÀO đủ điểm
   ⇒ Danh sách này là LỖ HỔNG TÀI LIỆU: người dùng đang hỏi
     những thứ bạn chưa viết ra.
   ⇒ Đầu ra có giá trị nghiệp vụ, không chỉ kỹ thuật.

③ TOKEN TRUNG BÌNH MỖI REQUEST theo thời gian
   Tăng dần ⇒ prompt phình, hoặc số đoạn truy hồi tăng
     ([[cache-va-chi-phi-llm]]).
```

**Lấy mẫu để người đọc — không thay được:**

```text
Mỗi tuần, đọc 20–30 cuộc trò chuyện:
  □ Chọn NGẪU NHIÊN (không chỉ ca bị báo sai)
  □ Cộng thêm ca bị báo sai
  □ Cộng thêm ca có tín hiệu hành vi xấu (hỏi lại, bỏ giữa dòng)

⇒ Đây là cách duy nhất bắt được vấn đề bạn CHƯA CÓ TIÊU CHÍ NÀO
  để đo. Và nó luôn tìm ra thứ gì đó.
⇒ Mỗi vấn đề tìm được ⇒ một tiêu chí mới hoặc một ca eval mới.
```

**Thử nghiệm A/B — và giới hạn của nó:**

```text
Chia lưu lượng, so hai phiên bản prompt hoặc hai mô hình.

Đo bằng chỉ số HÀNH VI, không bằng cảm nhận:
  □ tỉ lệ hỏi lại
  □ tỉ lệ chuyển người thật
  □ tỉ lệ báo sai
  □ chi phí và độ trễ

Ba điều cần biết:
  □ Cần LƯU LƯỢNG ĐỦ LỚN — với tỉ lệ báo sai 2%, bạn cần
    hàng nghìn request mỗi nhóm để thấy khác biệt
  □ Đừng chạy quá nhiều thử nghiệm cùng lúc — chúng ảnh hưởng nhau
  □ Với thay đổi có rủi ro, mở dần thay vì chia 50/50
```

**Vòng lặp cải thiện đầy đủ:**

```text
① Tín hiệu production chỉ ra vấn đề
② Đọc mẫu để hiểu vấn đề là gì
③ Thêm ca vào bộ eval để nó ĐO ĐƯỢC
④ Sửa (prompt, truy hồi, tài liệu, công cụ)
⑤ Bộ eval xác nhận đã sửa và không làm hỏng ca khác
⑥ Deploy, và tín hiệu production xác nhận lần nữa

⇒ Bước ③ là bước biến một vấn đề thành thứ không quay lại.
  Bỏ nó thì bạn sửa cùng một vấn đề nhiều lần.
```

## Tại sao cần nó

Vì bộ eval và production bắt hai loại vấn đề khác nhau:

```text
BỘ EVAL bắt:
  Hồi quy — thứ trước đúng nay sai
  Vấn đề bạn ĐÃ BIẾT là quan trọng

PRODUCTION bắt:
  Loại câu hỏi bạn không lường trước
  Cách người dùng dùng khác dự đoán
  Suy giảm âm thầm (mô hình cập nhật, dữ liệu lệch)
  Lỗ hổng tài liệu

⇒ Chỉ có bộ eval: điểm cao mà người dùng vẫn không hài lòng.
⇒ Chỉ có production: biết có vấn đề, nhưng mỗi lần sửa lại
  làm hỏng chỗ khác.
```

**Bốn thứ nên có ngay từ ngày ra mắt:**

```text
□ Nút báo sai, có phân loại, và MỘT CHỖ ĐỌC các báo cáo
□ Tỉ lệ hỏi lại
□ Log đủ để tái hiện ([[quan-sat-ung-dung-llm]])
□ Một buổi mỗi tuần dành cho việc đọc mẫu

⇒ Ba thứ đầu là kỹ thuật. Thứ tư là thói quen — và nó là thứ
  hay bị bỏ nhất khi đội bận.
```

**Và một điều về việc đọc phản hồi:**

```text
Có nút báo sai mà không ai đọc thì tệ hơn không có nút:
  Người dùng bấm, không thấy gì thay đổi, và ngừng bấm.
  ⇒ Bạn mất luôn nguồn tín hiệu quý nhất.

⇒ Nên có người phụ trách đọc, và có cách cho người dùng biết
  vấn đề đã được xử lý.
```

## So sánh

| Tín hiệu | Độ phủ | Độ chính xác | Công sức |
|---|---|---|---|
| Tỉ lệ hỏi lại | 100% | cao | vừa (cần đo ngữ nghĩa) |
| Bỏ giữa dòng | 100% | vừa | thấp |
| Chuyển người thật | 100% | cao | thấp |
| Nút báo sai | 1–5% | **rất cao** | thấp |
| Người đọc mẫu | mẫu nhỏ | rất cao | **cao** |

## Dễ nhầm

**1. Chỉ dựa vào bộ eval.** Nó chỉ đo cái bạn đã nghĩ tới.

**2. Chỉ dựa vào production.** Sửa cái này hỏng cái khác.

**3. Không đo tỉ lệ hỏi lại.** Tín hiệu tốt nhất mà miễn phí.

**4. Có nút báo sai mà không ai đọc.** Mất luôn nguồn tín hiệu.

**5. Không phân loại khi người dùng báo sai.**

**6. Không thêm ca báo sai vào bộ eval.** Sửa lại cùng vấn đề.

**7. Bỏ qua danh sách câu hỏi không tìm được đoạn nào.**

**8. Tỉ lệ "không tìm thấy" về 0 mà coi là tốt.**

**9. A/B test với lưu lượng quá nhỏ.**

**10. Không đọc mẫu định kỳ.** Bỏ mất vấn đề chưa có tiêu chí.

## Mẹo nhớ

> **Bộ eval đo cái bạn ĐÃ NGHĨ TỚI. Production cho cái bạn CHƯA nghĩ tới.**
>
> **Tỉ lệ HỎI LẠI là tín hiệu chất lượng tốt nhất — 100% lưu lượng, không cần ai bấm gì.**
>
> **Mỗi báo sai ⇒ một ca eval mới. Bỏ bước đó là sửa cùng vấn đề nhiều lần.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn tín hiệu hành vi, cái nào tốt nhất và vì sao?
2. Nút báo sai khác nút hài lòng thế nào về giá trị?
3. Ba chỉ số hệ thống nói lên chất lượng?
4. Sáu bước của vòng lặp cải thiện, bước nào biến vấn đề thành thứ không quay lại?
5. Vì sao có nút báo sai mà không đọc thì tệ hơn không có?

## Tự viết lại

Không nhìn lại, thiết kế đo chất lượng production cho trợ lý hỗ trợ:

```text
① bốn tín hiệu hành vi, cách đo từng cái
② thiết kế nút báo sai, có phân loại
③ ba chỉ số hệ thống và ngưỡng cảnh báo
④ quy trình đọc mẫu hằng tuần
⑤ cách phản hồi thành ca eval
```

Tự kiểm: ở ⑤, ai làm việc chuyển báo sai thành ca eval — và nếu không ai được phân công, việc đó có xảy ra không?

## Thử sức

Trợ lý của bạn có nút "hài lòng / không hài lòng". Tỉ lệ hài lòng 85% và ổn định sáu tháng. Nhưng số ticket hỗ trợ do người thật xử lý không giảm chút nào so với trước khi có trợ lý.

Ba câu để trả lời: vì sao 85% và ticket không giảm có thể cùng đúng; ba tín hiệu bạn thêm để hiểu chuyện gì đang xảy ra; và bạn xác định trợ lý có mang lại giá trị hay không bằng chỉ số nào. Câu khó nhất: nếu người dùng dùng trợ lý rồi **vẫn** mở ticket, điều đó nói gì về thứ trợ lý đang làm được — và bạn đo nó ra sao?
