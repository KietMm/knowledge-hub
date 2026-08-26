---
title: Lập luận và chia bước
slug: lap-luan-va-chia-buoc
summary: Chain-of-thought giúp ở đâu, không giúp ở đâu, và vì sao chia nhiều lời gọi thường thắng một prompt lớn.
level: trung-cap
tags: [ai, prompt, phuong-phap, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** biết khi nào yêu cầu lập luận có tác dụng thật, và khi nào nên tách thành nhiều lời gọi.

## Ý tưởng chính

Mô hình sinh token tuần tự. Nên nó **không có chỗ để "nghĩ thầm"** — mọi bước suy luận phải được **viết ra** thì mới tồn tại.

Yêu cầu "suy nghĩ từng bước" chính là cấp cho mô hình chỗ để làm điều đó. Nhưng nó chỉ giúp cho **bài toán cần nhiều bước**, và không giúp gì cho **bài toán cần biết một sự thật**.

## Mental model

Hãy nghĩ tới **làm toán trong đầu so với làm ra giấy nháp**.

> Hỏi "17 × 24 bằng bao nhiêu?" và bắt trả lời ngay: nhiều người sẽ đưa một con số gần đúng.
>
> Cho giấy nháp: 17 × 20 = 340, 17 × 4 = 68, cộng lại 408. Đúng.
>
> **Cùng một người, cùng năng lực.** Khác biệt là có chỗ để đặt các bước trung gian.
>
> Nhưng hỏi "thủ đô của Burkina Faso là gì?" thì giấy nháp không giúp gì. Bạn hoặc biết hoặc không.

Đó là ranh giới: **giấy nháp giúp cho TÍNH TOÁN, không giúp cho TRÍ NHỚ**.

## Ví dụ nhỏ

```text
❌ "Đơn này có được miễn phí ship không? Trả lời có/không."

✅ "Kiểm tra theo thứ tự rồi kết luận:
    ① Tổng đơn bao nhiêu?
    ② Có ≥ 500.000đ không?
    ③ Địa chỉ có thuộc vùng hỗ trợ không?
    ④ Kết luận: có/không, kèm lý do."
```

## Code chạy thế nào

**Vì sao viết ra các bước lại giúp:**

```text
Mô hình sinh token tuần tự, mỗi token dựa trên toàn bộ chuỗi trước.

Bắt trả lời ngay:
  Nó phải "nhảy" từ câu hỏi thẳng tới đáp án trong một bước.
  ⇒ Đáp án là token có khả năng cao nhất — có thể là con số
    trông hợp lý, không phải kết quả tính toán.

Cho viết các bước:
  Mỗi bước trung gian trở thành một phần của ngữ cảnh.
  ⇒ Bước sau được điều kiện hoá trên kết quả bước trước.
  ⇒ Đây thật sự là tính toán, không phải đoán.
```

**Ba loại bài toán và tác dụng:**

```text
✅ GIÚP NHIỀU
   Nhiều bước phụ thuộc nhau: tính toán, suy luận theo điều kiện,
   so sánh nhiều tiêu chí, kiểm tra theo quy trình

⚠️ GIÚP ÍT
   Phân loại đơn giản, trích xuất, đổi định dạng
   ⇒ Chỉ tốn token và độ trễ.

❌ KHÔNG GIÚP
   Câu hỏi về SỰ THẬT mô hình không biết
   ⇒ Suy nghĩ kỹ hơn về một điều bạn không biết vẫn không
     làm bạn biết nó. Vấn đề này cần RAG hoặc công cụ, không
     cần lập luận ([[ao-giac-va-gioi-han]]).
```

Phân biệt được ba loại này tránh được lãng phí phổ biến: bật "suy nghĩ từng bước" cho mọi lời gọi.

## Cú pháp

**Ba cách yêu cầu lập luận, theo mức kiểm soát:**

```text
① MỞ — "Hãy suy nghĩ từng bước trước khi trả lời."
   Đơn giản nhất. Mô hình tự chọn các bước.
   ⇒ Kém ổn định: mỗi lần một kiểu.

② CÓ KHUNG — nêu rõ các bước phải đi qua
   "① Liệt kê điều kiện áp dụng ② Kiểm từng điều kiện
    ③ Kết luận"
   ⇒ Ổn định hơn nhiều, và bạn kiểm được từng bước.

③ TÁCH LỜI GỌI — mỗi bước một lời gọi riêng
   ⇒ Kiểm soát cao nhất. Xem chi tiết bên dưới.
```

```text
Cách ② thường là điểm cân bằng tốt: nó cho phần lớn lợi ích
của việc lập luận với một lời gọi duy nhất.
```

**Đưa lập luận vào một trường của đầu ra:**

```json
{
  "cac_buoc": ["Tổng đơn: 620.000đ", "≥ 500.000đ: có", "Vùng: Hà Nội, được hỗ trợ"],
  "ket_luan": true,
  "ly_do": "Đơn trên 500.000đ và giao trong vùng hỗ trợ"
}
```

```text
Thứ tự trường quan trọng: `cac_buoc` phải nằm TRƯỚC `ket_luan`.
Mô hình sinh tuần tự ⇒ đặt kết luận trước thì các bước sau đó
chỉ là biện hộ cho một kết luận đã sinh ra
([[vi-du-va-dinh-dang-dau-ra]]).
```

**Khi nào tách thành nhiều lời gọi:**

```text
TÁCH khi:
  □ Các bước cần công cụ khác nhau (một bước cần truy vấn CSDL)
  □ Cần kiểm tra giữa chừng bằng mã của bạn
  □ Một bước cần mô hình mạnh, các bước khác dùng mô hình nhỏ được
  □ Prompt gộp đã quá dài và khó test

GIỮ MỘT LỜI GỌI khi:
  □ Các bước chỉ là suy luận thuần trên cùng dữ liệu
  □ Độ trễ quan trọng — mỗi lời gọi thêm một round-trip
  □ Bài toán đủ đơn giản
```

```text
Cái giá của việc tách:
  □ Độ trễ cộng dồn
  □ Chi phí có thể cao hơn (ngữ cảnh lặp lại ở mỗi bước)
  □ Nhiều chỗ có thể hỏng hơn
Lợi ích:
  □ Test được từng bước
  □ Biết chính xác bước nào sai khi kết quả sai
  □ Dùng mô hình phù hợp cho từng bước ([[chon-mo-hinh]])
```

**Tự kiểm tra — có tác dụng, có giới hạn:**

```text
Gọi lần hai: "Đây là câu trả lời trước. Kiểm xem có sai sót gì
theo các tiêu chí sau: ..."

✅ Hiệu quả khi có TIÊU CHÍ CỤ THỂ để kiểm
   "Kiểm xem mọi số liệu có xuất hiện trong tài liệu gốc không"
❌ Ít hiệu quả khi hỏi chung chung
   "Câu trả lời này có đúng không?" ⇒ nó thường nói "có"

⇒ Và tự kiểm KHÔNG phát hiện được lỗi mà mô hình không biết
  là lỗi. Kiểm bằng MÃ hoặc bằng đối chiếu nguồn đáng tin hơn.
```

## Tại sao cần nó

Vì lập luận đổi cả ba trục cùng lúc, nên nó phải là một quyết định có chủ đích:

```text
Bật lập luận:
  chất lượng ↑ (cho bài toán phù hợp)
  token đầu ra ↑↑  ⇒ chi phí ↑, và token đầu ra đắt hơn đầu vào
  độ trễ ↑↑        ⇒ người dùng chờ lâu hơn

⇒ Bật cho mọi lời gọi là trả giá ở những chỗ không nhận được gì.
```

**Ba cách giảm cái giá:**

```text
① Chỉ bật cho những loại câu hỏi thật sự cần
   ⇒ Phân loại trước, rồi định tuyến.
② Với giao diện streaming: ẩn phần lập luận, chỉ hiện kết luận
   ⇒ Người dùng không phải đọc phần nháp.
   ⇒ Nhưng họ vẫn CHỜ nó sinh ra — độ trễ không giảm.
③ Giới hạn độ dài phần lập luận
   "Tối đa 5 bước, mỗi bước một câu ngắn."
```

**Và một lưu ý về việc đọc phần lập luận:**

```text
Phần lập luận mô hình viết ra KHÔNG nhất thiết là quá trình
thật dẫn tới kết luận. Nó là một chuỗi văn bản, cũng được sinh
ra như mọi chuỗi khác.

⇒ Nó rất hữu ích để GỠ LỖI (bạn thấy nó hiểu sai ở đâu).
⇒ Nhưng đừng coi nó là bằng chứng rằng kết luận đúng.
⇒ Một lập luận trôi chảy dẫn tới kết luận sai là chuyện xảy ra.
```

## So sánh

| | Trả lời thẳng | Lập luận trong một lời gọi | Tách nhiều lời gọi |
|---|---|---|---|
| Chất lượng (bài toán nhiều bước) | thấp | cao | cao |
| Độ trễ | thấp | vừa | **cao** |
| Chi phí | thấp | vừa | vừa–cao |
| Test từng bước | ❌ | một phần | ✅ |
| Dùng công cụ giữa chừng | ❌ | ❌ | ✅ |

## Dễ nhầm

**1. Bật lập luận cho mọi lời gọi.** Trả giá ở chỗ không nhận được gì.

**2. Dùng lập luận để chữa vấn đề thiếu kiến thức.**

**3. Đặt kết luận trước các bước.** Các bước thành biện hộ.

**4. Yêu cầu lập luận mở khi cần ổn định.** Dùng khung.

**5. Tách nhiều lời gọi khi độ trễ quan trọng.**

**6. Không giới hạn độ dài phần lập luận.**

**7. Tự kiểm bằng câu hỏi chung chung.**

**8. Coi phần lập luận là bằng chứng kết luận đúng.**

**9. Hiện phần lập luận cho người dùng cuối.**

**10. Không đo xem lập luận có thật sự cải thiện không.**

## Mẹo nhớ

> **Mô hình không nghĩ thầm được — bước nào không viết ra thì không tồn tại.**
>
> **Lập luận giúp cho TÍNH TOÁN, không giúp cho TRÍ NHỚ.**
>
> **Các bước phải đứng TRƯỚC kết luận, không phải sau.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao viết ra các bước lại cải thiện kết quả?
2. Ba loại bài toán và tác dụng của lập luận với mỗi loại?
3. Ba cách yêu cầu lập luận, cái nào là điểm cân bằng?
4. Khi nào tách nhiều lời gọi, khi nào giữ một?
5. Vì sao không nên coi phần lập luận là bằng chứng?

## Tự viết lại

Không nhìn lại, thiết kế cho bài toán: *"Từ mô tả sự cố của khách, quyết định có đủ điều kiện bảo hành không"* — có 5 điều kiện, một trong đó cần tra ngày mua trong CSDL.

```text
① một lời gọi hay nhiều, vì sao
② khung các bước
③ định dạng đầu ra
④ bước nào cần công cụ
```

Tự kiểm: bước tra ngày mua — bạn để mô hình "nhớ" hay để nó gọi CSDL, và vì sao?

## Thử sức

Đội bật "suy nghĩ từng bước" cho toàn bộ hệ thống. Kết quả: chất lượng tăng ở phần trả lời phức tạp, nhưng chi phí tăng 3 lần và p95 độ trễ từ 1,2 giây lên 4 giây. Người dùng phàn nàn chậm.

Ba câu để trả lời: bạn phân tích tình hình bằng dữ liệu nào; giải pháp của bạn; và bạn chứng minh chất lượng không giảm ở phần bỏ lập luận. Câu khó nhất: nếu 70% câu hỏi là loại đơn giản, việc thêm một bước phân loại có làm tổng độ trễ **tăng** cho nhóm đó không — và bạn cân nhắc điều đó ra sao?
