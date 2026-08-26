---
title: Hiểu vì sao trước khi hỏi làm gì
slug: hieu-vi-sao-truoc-khi-lam-gi
summary: Yêu cầu là giải pháp người khác đã nghĩ ra — tìm vấn đề đằng sau nó trước khi viết mã.
level: co-ban
tags: [san-pham, tu-duy, dan-dat, giao-tiep]
khung: v2
---

> **Sau bài này bạn sẽ:** tìm ra vấn đề đằng sau một yêu cầu, và biết khi nào việc đó là cần thiết chứ không phải cản đường.

## Ý tưởng chính

Một yêu cầu tính năng thường **không phải vấn đề**. Nó là **giải pháp mà ai đó đã tự nghĩ ra** cho vấn đề của họ.

Và giải pháp họ nghĩ ra dựa trên hiểu biết của họ về hệ thống — thường ít hơn của bạn. Nên đôi khi có cách rẻ hơn, tốt hơn, mà họ không biết là có thể.

## Mental model

Hãy nghĩ tới **khách hàng ở cửa hàng vật liệu**.

> "Cho tôi một cái mũi khoan 8mm."
>
> Họ không cần mũi khoan. Họ cần **một cái lỗ 8mm**. Và thật ra họ cần **treo được cái kệ lên tường**.
>
> Nếu bạn chỉ bán mũi khoan, bạn làm đúng yêu cầu. Nhưng nếu tường là bê tông và họ cần loại khoan khác, hoặc có một cách treo không cần khoan — bạn đã bỏ lỡ việc giúp được họ thật.

Ba tầng: **giải pháp họ nghĩ ra** (mũi khoan) → **kết quả trung gian** (cái lỗ) → **mục tiêu thật** (treo được kệ). Việc của bạn là đi từ tầng một về tầng ba.

## Ví dụ nhỏ

```text
Yêu cầu:      "Thêm nút xuất Excel cho trang báo cáo."
Hỏi vì sao:   "Để gửi cho giám đốc mỗi tuần."
Hỏi tiếp:     "Giám đốc làm gì với nó?"
Trả lời:      "Xem hai con số ở cuối bảng."
⇒ Vấn đề thật: giám đốc cần thấy hai con số hằng tuần.
⇒ Có thể rẻ hơn nhiều: một email tự động có hai con số đó.
```

## Code chạy thế nào

**Ba câu hỏi để đi từ giải pháp về vấn đề:**

```text
① "Việc này giúp giải quyết chuyện gì?"
   ⇒ Đưa từ tầng giải pháp về tầng vấn đề.

② "Hiện tại không có nó thì mọi người làm thế nào?"
   ⇒ Câu quan trọng nhất. Nó cho bạn biết:
     - vấn đề có thật không (nếu không ai làm gì cả, có thể nó
       không đủ đau)
     - cách làm hiện tại tệ ở đâu
     - và thường lộ ra một giải pháp đơn giản hơn

③ "Nếu làm xong, cái gì sẽ khác đi?"
   ⇒ Buộc nói ra kết quả mong đợi. Không nói ra được ⇒ chưa rõ
     vấn đề ([[uoc-luong-va-pham-vi]]).
```

**Vì sao câu ② mạnh nhất:**

```text
"Không có nút xuất Excel thì bạn làm gì?"
  → "Tôi chụp màn hình gửi qua chat."
  ⇒ Vậy vấn đề là CHIA SẺ, không phải XUẤT FILE.

  → "Tôi không làm gì, tôi bỏ qua việc đó."
  ⇒ Vấn đề chưa đủ đau. Có thể chưa cần làm.

  → "Tôi gõ lại tay 40 dòng mỗi tuần, mất 2 tiếng."
  ⇒ Vấn đề rõ, đo được, và đáng làm.
```

Câu trả lời thứ ba cho bạn cả **mức độ** và **cách đo thành công** — hai thứ bạn không có nếu chỉ nhận yêu cầu.

## Cú pháp

**Khi nào đào sâu, khi nào chỉ làm:**

```text
ĐÀO SÂU khi:
  □ Việc lớn (nhiều ngày trở lên)
  □ Có nhiều cách làm với chi phí rất khác nhau
  □ Bạn nghi ngờ có cách đơn giản hơn
  □ Yêu cầu mô tả GIẢI PHÁP kỹ thuật cụ thể
    ("thêm một bảng", "dùng Redis")
    ⇒ Đây là dấu hiệu rõ nhất: người yêu cầu đang thiết kế thay bạn

CHỈ LÀM khi:
  □ Việc nhỏ, rõ ràng
  □ Người yêu cầu đã hiểu vấn đề rõ hơn bạn
  □ Đã bàn rồi, và đây là kết luận
```

```text
Đào sâu MỌI yêu cầu là một cách làm chậm cả đội và làm người
khác không muốn nói chuyện với bạn.
⇒ Chọn chỗ để đào. Việc nhỏ thì làm; việc lớn thì hỏi.
```

**Hỏi mà không nghe như đang phản đối:**

```text
❌ "Vì sao lại cần cái đó?"          → nghe như chất vấn
❌ "Cái đó không giải quyết được gì." → phủ định trước khi hiểu

✅ "Để mình làm đúng ý, bạn kể mình nghe tình huống cụ thể được
    không? Hiện tại bạn đang làm thế nào?"
✅ "Mình hiểu là để giải quyết X. Nếu vậy có một cách nữa,
    mình nói để bạn cân nhắc thêm."
```

```text
Điểm mấu chốt: bạn hỏi để LÀM ĐÚNG, không để tránh làm.
Nói rõ ý định đó ngay từ đầu thì người kia không phòng thủ.
```

**Và khi bạn đã hiểu — đề xuất, đừng quyết:**

```text
"Nếu vấn đề là gửi hai con số cho giám đốc hằng tuần, có ba cách:
  ① Email tự động có hai con số — nửa ngày
  ② Nút xuất Excel như bạn đề xuất — ba ngày
  ③ Trang báo cáo chia sẻ được — một tuần
Mình nghiêng về ① vì nó giải quyết đúng việc đó. Bạn thấy sao?"

⇒ Bạn đưa thông tin họ không có (chi phí), họ đưa thông tin bạn
  không có (bối cảnh nghiệp vụ). Quyết định là của họ
  ([[ra-quyet-dinh-ky-thuat]]).
```

## Tại sao cần nó

Vì cái giá của việc làm đúng yêu cầu nhưng sai vấn đề rất khó thấy:

```text
Bạn làm xong nút xuất Excel. Đúng yêu cầu, chạy tốt.
  ⇒ Ba tháng sau: dùng hai lần rồi không ai dùng nữa.
  ⇒ Nhưng nó vẫn ở đó: phải bảo trì, phải test, phải giữ
    tương thích khi đổi báo cáo.
  ⇒ Và vấn đề thật (giám đốc cần hai con số) vẫn chưa giải quyết.

⇒ Tính năng không ai dùng không phải trung tính. Nó là chi phí
  lặp lại ([[no-ky-thuat-va-refactor]]).
```

**Ba dấu hiệu bạn đang làm sai vấn đề:**

```text
□ Không nói được ai sẽ dùng và dùng để làm gì
□ Không nói được "làm xong thì cái gì khác đi"
□ Yêu cầu mô tả giải pháp kỹ thuật, không mô tả vấn đề
```

**Và một lưu ý cân bằng:**

```text
Đôi khi người yêu cầu ĐÚNG, và bạn chỉ đang làm chậm mọi thứ.
Họ có thể đã nói chuyện với mười khách hàng, đã thử ba cách,
và biết những thứ bạn không biết.

⇒ Hỏi một lần, nghe cho kỹ. Nếu lý do hợp lý thì làm.
⇒ Đừng biến việc "hiểu vấn đề" thành một cửa kiểm soát mà mọi
  yêu cầu phải đi qua ([[giao-tiep-va-anh-huong]]).
```

## So sánh

| | Nhận yêu cầu và làm | Hiểu vấn đề trước |
|---|---|---|
| Nhanh bắt đầu | ✅ | chậm hơn một chút |
| Đúng vấn đề | không chắc | ✅ |
| Tìm được cách rẻ hơn | ❌ | thường có |
| Đo được thành công | ❌ | ✅ |
| Rủi ro | làm thứ không ai dùng | làm chậm nếu đào quá nhiều |

## Dễ nhầm

**1. Coi yêu cầu là vấn đề.** Nó là giải pháp người khác nghĩ ra.

**2. Không hỏi "hiện tại làm thế nào".** Câu mạnh nhất.

**3. Hỏi theo cách nghe như phản đối.**

**4. Đào sâu mọi yêu cầu, kể cả việc nhỏ.**

**5. Không nói rõ mình hỏi để làm đúng.**

**6. Tự quyết định thay người yêu cầu.** Bạn đề xuất, họ quyết.

**7. Không đưa chi phí vào cuộc bàn.** Đó là thông tin chỉ bạn có.

**8. Bỏ qua việc người yêu cầu có thể đúng.**

**9. Không nói được "làm xong thì cái gì khác đi".**

**10. Coi tính năng không ai dùng là trung tính.**

## Mẹo nhớ

> **Yêu cầu là GIẢI PHÁP người khác nghĩ ra, không phải vấn đề.**
>
> **Câu mạnh nhất: "hiện tại không có nó thì mọi người làm thế nào?"**
>
> **Bạn ĐỀ XUẤT kèm chi phí. Họ QUYẾT ĐỊNH.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba tầng từ giải pháp về mục tiêu thật?
2. Ba câu hỏi, câu nào mạnh nhất và vì sao?
3. Khi nào đào sâu, khi nào chỉ làm?
4. Cách hỏi mà không nghe như phản đối?
5. Ba dấu hiệu đang làm sai vấn đề?

## Tự viết lại

Yêu cầu: *"Thêm chức năng cho phép người dùng tự đổi mật khẩu qua chat với bộ phận hỗ trợ."*

Không nhìn lại, viết:

```text
① ba câu hỏi bạn đặt
② hai giả thuyết về vấn đề thật
③ hai giải pháp thay thế, kèm chi phí ước lượng
④ cách bạn trình bày cho người yêu cầu
```

Tự kiểm: yêu cầu này mô tả giải pháp hay vấn đề — và điều đó nói gì về việc có nên đào sâu không?

## Thử sức

Sếp sản phẩm yêu cầu: *"Thêm trường 'ghi chú nội bộ' vào bảng đơn hàng, và cho phép sửa từ trang quản trị."* Việc này khoảng hai ngày.

Ba câu để trả lời: bạn có đào sâu không, và vì sao; nếu có thì hỏi gì; và nếu hoá ra vấn đề thật là "nhân viên hỗ trợ cần ghi lại đã nói gì với khách", bạn đề xuất gì. Câu khó nhất: nếu sếp nói "cứ làm như mình yêu cầu đi, mình đã bàn với đội hỗ trợ rồi", bạn phản ứng thế nào — và điều gì thay đổi trong cách bạn làm?
