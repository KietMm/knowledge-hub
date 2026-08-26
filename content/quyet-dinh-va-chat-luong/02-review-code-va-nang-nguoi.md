---
title: Review code và nâng người
slug: review-code-va-nang-nguoi
summary: Review là hành động dạy, không phải cửa kiểm soát. Cách góp ý, cách nhận góp ý, và chuẩn nào nên do máy giữ.
level: co-ban
tags: [dan-dat, code-review, phan-hoi, chat-luong]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được nhận xét review giúp người khác giỏi lên, và biết chuẩn nào nên giao cho máy.

## Ý tưởng chính

Review có ba mục đích, và chúng **không ngang hàng**:

**① Truyền kiến thức** — cả hai phía cùng học, và nhiều người biết về mã đó.
**② Bắt lỗi** — quan trọng, nhưng công cụ tự động làm phần lớn.
**③ Giữ nhất quán** — nên do máy làm, không nên do người tranh luận.

Đội nào coi ① là chính thì review là chỗ mọi người giỏi lên. Đội nào coi ③ là chính thì review là chỗ mọi người sợ.

## Mental model

Hãy nghĩ tới **hai kiểu chấm bài**.

> **Kiểu một**: gạch đỏ mọi lỗi, ghi điểm, trả lại. Học sinh biết mình sai, không biết vì sao, và học được cách **giấu bài** cho tới khi thật chắc.
>
> **Kiểu hai**: khoanh chỗ chưa ổn và hỏi *"em nghĩ chuyện gì xảy ra nếu danh sách này rỗng?"* Học sinh tự tìm ra, và **nhớ**.
>
> Kiểu một nhanh hơn cho người chấm. Kiểu hai làm người học giỏi lên — và giảm số bài phải chấm về sau.

Điểm quan trọng: một nhận xét dạng câu hỏi cũng chỉ ra đúng lỗi đó, nhưng chuyển việc suy nghĩ sang đúng người cần suy nghĩ.

## Ví dụ nhỏ

```text
❌ "Sai rồi, dùng map đi."
✅ "Chỗ này dùng `map` sẽ gọn hơn vì không cần biến trung gian.
    Bạn thấy sao?"
```

## Code chạy thế nào

**Bốn mức nhận xét — nói rõ mức để người nhận biết phải làm gì:**

```text
[chặn]     Phải sửa trước khi merge. Lỗi, lỗ hổng, mất dữ liệu.
[nên]      Nên sửa, nhưng không chặn.
[nit]      Vụn vặt, tuỳ bạn. (Nếu nhiều nit ⇒ đó là việc của linter.)
[hỏi]      Tôi chưa hiểu, giải thích giúp.

Không gắn nhãn ⇒ người nhận không biết cái nào bắt buộc
⇒ hoặc sửa hết (mất thời gian), hoặc bỏ qua cả cái quan trọng.
```

**Nhận xét tốt có ba phần:**

```text
① CÁI GÌ    chỉ rõ chỗ và vấn đề
② VÌ SAO    hậu quả cụ thể, không phải sở thích
③ GỢI Ý     một hướng đi, không phải mệnh lệnh

❌ "Đoạn này tệ."
❌ "Không nên viết vậy."           ← không nói vì sao
✅ "[chặn] Nếu `items` rỗng thì `items[0]` là undefined và dòng
    dưới sẽ ném lỗi. Thêm kiểm tra ở đầu hàm được không?"
```

Vế "vì sao" là phần làm nên khác biệt: nó biến một mệnh lệnh thành một điều người kia **học được và áp dụng lần sau**.

**Chuẩn nào nên giao cho máy:**

```text
Máy giữ:   định dạng (prettier), quy tắc lint, kiểu (typecheck),
           độ phủ test, kích thước bundle
Người giữ: tính đúng đắn, thiết kế, đặt tên, ranh giới, ca biên,
           bảo mật, khả năng đọc

Tranh luận về dấu phẩy trong review là dấu hiệu THIẾU CÔNG CỤ,
không phải thiếu tiêu chuẩn.
```

Lý do sâu hơn: quy tắc do máy giữ thì không có ai phải nói và không có ai phải nghe. Nó loại bỏ hoàn toàn một loại ma sát giữa người với người.

## Cú pháp

**Nhìn gì khi review — theo thứ tự:**

```text
① ĐÚNG KHÔNG        logic, ca biên, xử lý lỗi
② AN TOÀN KHÔNG     đầu vào, phân quyền, rò rỉ dữ liệu
③ ĐỌC ĐƯỢC KHÔNG    sáu tháng sau người khác hiểu được không
④ THIẾT KẾ          đúng chỗ chưa, có tạo phụ thuộc xấu không
⑤ TEST              có test cho phần quan trọng và ca biên chưa
⑥ VỤN VẶT           chỉ khi năm cái trên đã ổn
```

Lỗi thường gặp là bắt đầu từ ⑥ vì nó dễ thấy nhất — và hết năng lượng trước khi tới ①.

**PR nhỏ — yếu tố ảnh hưởng chất lượng review nhiều nhất:**

```text
PR 50 dòng   → review kỹ, tìm ra lỗi thật
PR 500 dòng  → "LGTM"
PR 2000 dòng → không ai đọc thật

⇒ Chất lượng review giảm rất nhanh theo kích thước.
⇒ Tách PR là việc của người VIẾT, không phải người review.
```

Đây là lý do feature flag hữu ích ngoài mục đích phát hành: nó cho phép merge từng mảnh nhỏ trong khi tính năng chưa hoàn chỉnh ([[trien-khai-an-toan]]).

**Nhận góp ý:**

```text
□ Góp ý về MÃ, không về bạn. Tách hai thứ đó ra là kỹ năng, và học được.
□ Không hiểu ⇒ hỏi lại, đừng đoán ý.
□ Không đồng ý ⇒ nói lý do, đừng im lặng sửa theo.
□ Cùng một loại góp ý lặp lại ⇒ đó là một bài học, ghi lại.
□ Cảm ơn góp ý bắt được lỗi thật — nó tiết kiệm cho bạn một sự cố.
```

**Người mới — review là công cụ đào tạo mạnh nhất:**

```text
□ Giải thích VÌ SAO nhiều hơn bình thường
□ Chỉ ra cả cái ĐÚNG, không chỉ cái sai
□ Với vấn đề lớn: nói chuyện trực tiếp thay vì để 20 nhận xét
   → 20 nhận xét trên một PR đọc như một bản cáo trạng,
     kể cả khi từng cái đều đúng và lịch sự.
□ Một PR không nên là chỗ dạy mọi thứ — chọn 2–3 điểm quan trọng nhất
```

## Tại sao cần nó

Vì review chậm phá hỏng nhịp làm việc:

```text
Review trong 4 giờ  → người viết còn nhớ ngữ cảnh, sửa ngay.
Review sau 2 ngày   → phải nạp lại toàn bộ ngữ cảnh, và họ đã chuyển
                       sang việc khác ⇒ chi phí chuyển ngữ cảnh hai lần.
```

Mốc thực tế: **review trong vòng nửa ngày làm việc**. Nếu không kịp, nói một câu — im lặng là thứ tệ nhất cho người đang chờ.

**Và một điều ít được nói: review cũng là nơi phát hiện vấn đề tổ chức.**

```text
Cùng một loại lỗi xuất hiện ở nhiều PR
  ⇒ không phải vấn đề của từng người
  ⇒ thiếu một quy ước, một lớp trừu tượng, hoặc một quy tắc lint.

Sửa ở đó rẻ hơn nhiều so với nhắc lại mỗi tuần.
```

## So sánh

| | Review như cửa kiểm soát | Review như dạy học |
|---|---|---|
| Mục tiêu | bắt lỗi | truyền kiến thức |
| Giọng | phán xét | hỏi và giải thích |
| Người nhận | phòng thủ, giấu bài | học, hỏi thêm |
| Lâu dài | cùng lỗi lặp lại | ít lỗi dần |

## Dễ nhầm

**1. Tranh luận về định dạng.** Giao cho máy.

**2. Không nói vì sao.** Người nhận sửa mà không học được gì.

**3. Không phân mức nhận xét.** Không biết cái nào bắt buộc.

**4. Review PR quá lớn.** "LGTM" mà chưa đọc.

**5. Review chậm và im lặng.** Người viết mất ngữ cảnh.

**6. Chỉ chỉ ra cái sai.** Người mới mất tự tin.

**7. 20 nhận xét trên một PR của người mới.** Nói chuyện trực tiếp.

**8. Bắt đầu từ chuyện vụn vặt.** Hết năng lượng trước khi xét tính đúng đắn.

**9. Góp ý về người thay vì về mã.** Phá quan hệ và không sửa được gì.

**10. Không nhận ra lỗi lặp lại là vấn đề hệ thống.** Nhắc mãi mà không hết.

## Mẹo nhớ

> **Review là hành động DẠY. Bắt lỗi là tác dụng phụ.**
>
> **Chuẩn máy giữ được thì đừng để người tranh luận.**
>
> **PR nhỏ ⇒ review thật. PR lớn ⇒ "LGTM".**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba mục đích của review, cái nào quan trọng nhất và vì sao?
2. Bốn mức nhận xét, vì sao phải gắn nhãn?
3. Ba phần của một nhận xét tốt?
4. Chuẩn nào nên do máy giữ, chuẩn nào do người?
5. Vì sao kích thước PR ảnh hưởng lớn tới chất lượng review?

## Tự viết lại

Bạn review một PR của người mới, thấy: một lỗi ca biên có thể gây crash, một chỗ đặt tên khó hiểu, ba chỗ sai định dạng, và một chỗ dùng thư viện lạ. Không nhìn lại, viết:

```text
① các nhận xét, có gắn mức
② cái nào bạn KHÔNG viết vào PR, và xử lý ở đâu
③ một câu ghi nhận cái họ làm tốt
```

Tự kiểm: bạn có viết nhận xét nào về định dạng không — nếu có, vì sao linter không bắt được nó?

## Thử sức

Đội bạn có PR trung bình 800 dòng, review mất 2–3 ngày, và nhận xét chủ yếu về định dạng.

Ba câu để trả lời: ba vấn đề bạn nhận ra và cái nào sửa trước; các thay đổi cụ thể; và bạn đo cải thiện bằng gì. Câu khó nhất: nếu PR lớn vì tính năng lớn và "không tách được", bạn đề xuất kỹ thuật nào để tách — và nó đòi hỏi thay đổi gì khác trong cách làm việc?
