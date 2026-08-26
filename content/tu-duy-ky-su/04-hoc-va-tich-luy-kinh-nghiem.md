---
title: Học và tích luỹ kinh nghiệm
slug: hoc-va-tich-luy-kinh-nghiem
summary: Vì sao mười năm kinh nghiệm có thể là một năm lặp mười lần — và cách tránh điều đó.
level: trung-cap
tags: [tu-duy, phuong-phap, dan-dat]
khung: v2
---

> **Sau bài này bạn sẽ:** biết ba điều kiện để kinh nghiệm thành năng lực, và cách học thứ sâu thay vì thứ bề mặt.

## Ý tưởng chính

Làm nhiều năm **không tự động** thành giỏi. Kinh nghiệm chỉ thành năng lực khi có ba thứ: **vòng phản hồi**, **suy ngẫm**, và **việc đủ khó**.

Thiếu một trong ba, bạn lặp lại cùng một năm — và mỗi lần lặp làm bạn tự tin hơn mà không giỏi hơn.

## Mental model

Hãy nghĩ tới **hai người chơi cờ mười năm**.

> **Người thứ nhất**: chơi mỗi tuần với cùng nhóm bạn, cùng mức. Thắng nhiều, vui. Sau mười năm, trình độ gần như năm đầu.
>
> **Người thứ hai**: chơi với người mạnh hơn, **xem lại các nước sai** sau mỗi ván, và học từ những ván thua.
>
> Cùng mười năm, cùng số ván. Khác biệt: **có phản hồi** và **có suy ngẫm**.
>
> Và người thứ nhất **không biết** mình không tiến bộ — vì họ vẫn thắng trong vòng của họ.

Vế cuối là điều đáng chú ý: thiếu vòng phản hồi thì bạn cũng thiếu tín hiệu cho biết mình đang thiếu nó.

## Ví dụ nhỏ

```text
Không có phản hồi:
  Viết mã → không ai review kỹ → không có test → không đo
  ⇒ Bạn không biết mã của mình tốt hay tệ.

Có phản hồi:
  Review kỹ, test, đo, và ĐỌC LẠI sự cố
  ⇒ Mỗi lần sai là một lần học.
```

## Code chạy thế nào

**Ba điều kiện, và cách tạo ra chúng:**

```text
① VÒNG PHẢN HỒI — biết mình đúng hay sai
   □ Review code có người đọc kỹ và nói thật
   □ Test — nó nói cho bạn biết ngay
   □ Đo — hiệu năng, chỉ số sản phẩm
   □ Hậu kiểm sự cố ([[su-co-va-hau-kiem]])
   ⇒ Thiếu ⇒ bạn không biết mình đang sai ở đâu.

② SUY NGẪM — rút ra bài học
   Sau một việc khó, tự hỏi: cái gì hiệu quả, cái gì không,
   lần sau làm khác thế nào.
   ⇒ Không suy ngẫm ⇒ trải nghiệm không thành bài học.
   ⇒ Đây là bước hay bị bỏ nhất, vì nó không cảm giác như
     đang làm việc.

③ VIỆC ĐỦ KHÓ
   Làm mãi việc trong tầm ⇒ không mở rộng được gì.
   ⇒ Nhưng quá khó thì không hoàn thành được và không học được gì.
   ⇒ Điểm đúng: khó tới mức bạn phải học một thứ mới, nhưng
     vẫn làm xong được.
```

**Học thứ sâu thay vì thứ bề mặt:**

```text
BỀ MẶT     cú pháp, tên hàm, cấu hình của một công cụ
           ⇒ Hết hạn nhanh. Tra được khi cần.
SÂU        vì sao thứ này tồn tại, nó giải vấn đề gì,
           đánh đổi của nó là gì
           ⇒ Chuyển được sang công cụ khác, sang bài toán khác.

⇒ Học một framework mới: đừng học API. Học nó GIẢI VẤN ĐỀ GÌ
  và tại sao nó chọn cách đó.
⇒ Cùng nguyên tắc với việc học một khái niệm: hiểu mental model
  thì suy lại được cú pháp; nhớ cú pháp thì không suy lại được
  mental model.
```

```text
Phép thử: bạn giải thích được VÌ SAO thứ này tồn tại, cho một
người chưa biết nó, không dùng thuật ngữ của nó?
⇒ Được ⇒ bạn hiểu sâu.
⇒ Không ⇒ bạn đang biết cách dùng, chưa hiểu.
```

## Cú pháp

**Bốn nguồn học, theo giá trị:**

```text
① SỬA BUG THẬT, ở hệ thống thật
   Buộc bạn hiểu hệ thống, không chỉ đọc về nó.
   ⇒ Và mỗi bug là một lỗ trong mental model của bạn được chỉ ra
     ([[phong-ngua-va-hoc-tu-bug]]).

② ĐỌC MÃ NGƯỜI KHÁC
   Nhất là mã giải cùng vấn đề bạn đang giải, theo cách khác.
   ⇒ Nguồn bị đánh giá thấp nhất. Đọc một thư viện tốt dạy
     nhiều hơn đọc mười bài viết về nó.

③ GIẢI THÍCH CHO NGƯỜI KHÁC
   Buộc bạn nói rõ giả định. Chỗ mơ hồ lộ ra ngay.
   ⇒ Và nó cho bạn biết mình đang ở mức nào.

④ ĐỌC/XEM
   Rẻ nhất, và dễ tạo cảm giác đã học mà chưa học.
   ⇒ Chỉ thành kiến thức khi bạn ÁP DỤNG hoặc GIẢI THÍCH LẠI.
```

**Suy ngẫm — làm sao cho nó xảy ra thật:**

```text
Sau mỗi việc đáng kể (hoặc mỗi tuần), viết 5 dòng:
  □ Việc gì mất nhiều thời gian hơn dự tính, vì sao?
  □ Cái gì mình đã đoán sai?
  □ Có bài học nào áp dụng được lần sau?

⇒ Năm dòng, năm phút. Và nó là khác biệt giữa mười năm kinh
  nghiệm và một năm lặp mười lần.
⇒ Viết ra quan trọng hơn viết hay: suy nghĩ trong đầu không
  buộc bạn nói rõ như viết.
```

**Ba dấu hiệu bạn đang lặp lại một năm:**

```text
□ Không nhớ lần cuối học một thứ thật sự mới là khi nào
□ Không ai nói cho bạn biết bạn sai — hoặc bạn không tin họ
□ Mọi việc đều nằm trong tầm, không có việc nào làm bạn phải
  đọc thêm

⇒ Ba dấu hiệu này dễ chịu, nên chúng không tự báo động.
⇒ Phải chủ động kiểm.
```

## Tại sao cần nó

Vì trong nghề này, thứ hết hạn nhanh và thứ không hết hạn rất khác nhau:

```text
HẾT HẠN NHANH:  API của một framework, cấu hình một công cụ,
                cú pháp một ngôn ngữ
KHÔNG HẾT HẠN:  cách gỡ lỗi, cách đọc đánh đổi, cách chia vấn đề,
                cách viết mã người khác đọc được, cách giao tiếp

⇒ Học nhóm thứ hai thì mười năm tích luỹ.
⇒ Chỉ học nhóm thứ nhất thì cứ vài năm lại bắt đầu lại.
```

**Và một điều về việc dùng AI khi học:**

```text
AI trả lời rất nhanh, nên nó dễ dùng để BỎ QUA giai đoạn hiểu.
⇒ Giải quyết được việc hôm nay, và không tích luỹ gì.
⇒ Và bạn không nhận ra khi nó đưa ra đáp án sai.

Cách dùng giữ được phần học:
  ① Tự thử trước
  ② Hỏi AI xem cách của mình sai ở đâu
  ③ So với cách nó đề xuất, và hỏi VÌ SAO khác
⇒ Nhanh hơn tự mò, và vẫn tạo ra mental model
  ([[ai-lam-duoc-gi-va-khong]]).
```

**Ba việc rẻ mà tác động lớn:**

```text
□ Xin review kỹ từ một người giỏi hơn, và hỏi họ nói thật
□ Đọc mã của một thư viện bạn dùng hằng ngày
□ Viết năm dòng suy ngẫm mỗi tuần
```

## So sánh

| Nguồn | Giá trị | Chi phí | Rủi ro |
|---|---|---|---|
| Sửa bug thật | **cao nhất** | thời gian | — |
| Đọc mã người khác | cao | thời gian | bị đánh giá thấp |
| Giải thích cho người khác | cao | thấp | — |
| Đọc/xem | thấp nếu không áp dụng | thấp | cảm giác đã học |

## Dễ nhầm

**1. Nghĩ số năm tự động thành năng lực.**

**2. Không có vòng phản hồi.** Không biết mình sai ở đâu.

**3. Không suy ngẫm.** Trải nghiệm không thành bài học.

**4. Làm mãi việc trong tầm.**

**5. Học API thay vì học vì sao thứ đó tồn tại.**

**6. Đọc/xem rồi coi là đã học.**

**7. Không đọc mã người khác.**

**8. Không xin review thật.**

**9. Dùng AI để bỏ qua giai đoạn hiểu.**

**10. Không kiểm ba dấu hiệu lặp lại một năm.** Chúng dễ chịu.

## Mẹo nhớ

> **Ba điều kiện: VÒNG PHẢN HỒI, SUY NGẪM, VIỆC ĐỦ KHÓ. Thiếu một là lặp lại một năm.**
>
> **Học VÌ SAO thứ này tồn tại, không học API của nó.**
>
> **Phép thử hiểu sâu: giải thích được cho người chưa biết, không dùng thuật ngữ của nó.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba điều kiện để kinh nghiệm thành năng lực?
2. Học sâu khác học bề mặt thế nào? Phép thử là gì?
3. Bốn nguồn học, nguồn nào bị đánh giá thấp nhất?
4. Ba dấu hiệu đang lặp lại một năm?
5. Cách dùng AI khi học mà vẫn tích luỹ được?

## Tự viết lại

Không nhìn lại, tự đánh giá:

```text
① ba vòng phản hồi bạn đang có, và cái nào yếu nhất
② lần cuối bạn học một thứ thật sự mới là khi nào
③ một thứ bạn "biết cách dùng" nhưng chưa giải thích được
   VÌ SAO nó tồn tại
④ ba việc cụ thể bạn làm trong tháng tới
```

Tự kiểm: ở ③, thử giải thích nó ngay bây giờ, không dùng thuật ngữ của nó — bạn làm được không?

## Thử sức

Một đồng nghiệp có bảy năm kinh nghiệm nhưng mã của họ giống mã của người hai năm: cùng những vấn đề, cùng những chỗ sai, và họ không nhận ra.

Ba câu để trả lời: bạn nghi thiếu điều kiện nào trong ba điều kiện; bạn giúp họ thế nào mà không làm họ tự ái; và bạn tạo ra vòng phản hồi cho họ bằng cách nào. Câu khó nhất: nếu họ không thấy vấn đề — vì mọi việc họ làm đều "chạy được" — bạn dùng dữ kiện gì để cuộc nói chuyện này không thành một cuộc tranh luận về ý kiến?
