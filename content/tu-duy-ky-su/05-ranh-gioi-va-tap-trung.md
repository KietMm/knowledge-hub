---
title: Ranh giới và tập trung
slug: ranh-gioi-va-tap-trung
summary: Bảo vệ khối thời gian sâu, nói không có lý do, và ba nguồn gián đoạn tự gây ra.
level: nang-cao
tags: [tu-duy, dan-dat, giao-tiep, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** bảo vệ được thời gian làm việc sâu, và nhận ra ba nguồn gián đoạn do chính mình tạo ra.

## Ý tưởng chính

Công việc kỹ thuật cần **khối thời gian liền mạch**. Một giờ liền không bằng bốn lần mười lăm phút — nó nhiều hơn, vì mỗi lần quay lại bạn phải nạp lại ngữ cảnh.

Và phần lớn gián đoạn **không đến từ người khác**. Nó đến từ những thứ bạn tự tạo ra — và đó là phần bạn kiểm soát được.

## Mental model

Hãy nghĩ tới **nấu một món cần đảo liên tục**.

> Bạn đang đảo. Có người gọi. Bạn tắt bếp, đi trả lời hai phút, quay lại.
>
> Món ăn không "mất hai phút". Nó **nguội, và bạn phải bắt đầu lại phần đó**.
>
> Người nấu có kinh nghiệm biết: có những món **đảo được rồi làm việc khác**, và có những món **không được rời tay**. Họ sắp xếp để hai loại không chồng lên nhau.

Việc kỹ thuật cũng chia hai loại: **việc cần liền mạch** (thiết kế, gỡ lỗi khó, viết phần phức tạp) và **việc chịu được gián đoạn** (review, trả lời, sửa nhỏ). Trộn hai loại là cách mất cả hai.

## Ví dụ nhỏ

```text
Ngày bị băm nhỏ:
  9:00–9:20  viết mã   → họp 9:30
  9:50–10:10 viết mã   → có người hỏi
  10:20–10:40 viết mã  → họp 11:00
⇒ Ba giờ "làm việc", và không lần nào vào được trạng thái sâu.
```

## Code chạy thế nào

**Chi phí nạp lại ngữ cảnh:**

```text
Việc phức tạp cần giữ trong đầu: luồng dữ liệu, các giả định,
những gì đã thử, chỗ đang dở.

Bị gián đoạn ⇒ mất phần lớn cái đó.
Quay lại ⇒ 10–20 phút nạp lại.

⇒ Một gián đoạn 2 phút tốn 15–20 phút thật.
⇒ Và nếu bị gián đoạn ba lần trong một giờ, bạn gần như
  không làm được gì ở mức sâu.
```

**Hai loại việc — sắp xếp riêng:**

```text
CẦN LIỀN MẠCH
  thiết kế, gỡ lỗi khó, viết phần phức tạp, học thứ mới
  ⇒ Cần khối 90 phút trở lên. Dưới đó gần như không vào được.

CHỊU ĐƯỢC GIÁN ĐOẠN
  review code, trả lời tin nhắn, sửa nhỏ, họp, cập nhật tài liệu
  ⇒ Làm được trong khoảng trống 20–30 phút.

⇒ Dồn việc loại hai vào một hoặc hai khoảng trong ngày.
⇒ Giữ ít nhất một khối 90 phút cho loại một.
```

## Cú pháp

**Ba nguồn gián đoạn tự gây ra — phần bạn kiểm soát được:**

```text
① KIỂM TRA TIN NHẮN / EMAIL LIÊN TỤC
   Không ai bắt bạn. Bạn tự làm, vài phút một lần.
   ⇒ Cách chữa: tắt thông báo trong khối sâu, kiểm theo giờ.
   ⇒ Đây là nguồn lớn nhất, và nó dễ chữa nhất.

② TỰ CHUYỂN VIỆC
   Đang khó ⇒ chuyển sang việc dễ hơn ⇒ cảm giác tiến triển.
   ⇒ Nhưng bạn vừa mất ngữ cảnh của việc khó, và nó vẫn còn đó.
   ⇒ Cách chữa: khi muốn chuyển, ghi ra CHỖ ĐANG BẾ TẮC trước.
     Thường viết ra đã phá được bế tắc
     ([[giai-quyet-van-de-co-phuong-phap]]).

③ LÀM NHIỀU VIỆC SONG SONG
   Ba việc cùng lúc ⇒ chuyển ngữ cảnh liên tục ⇒ mỗi việc
   đều chậm hơn làm tuần tự.
   ⇒ Cách chữa: giới hạn số việc đang làm. Xong một cái mới
     nhận cái tiếp.
```

**Nói không — bốn cách, không cái nào là "không":**

```text
① ĐỔI THỜI ĐIỂM
   "Việc này mình làm được, nhưng sau khi xong X — khoảng thứ Năm.
    Có kịp không?"

② ĐỔI PHẠM VI
   "Trong thời gian đó mình làm được phần A. Phần B cần thêm
    một tuần." ([[cat-pham-vi-va-uu-tien]])

③ ĐỔI NGƯỜI
   "Việc này bạn Nam làm nhanh hơn mình, và bạn ấy đang rảnh hơn."

④ ĐỔI THỨ TỰ — chuyển quyết định về cho người yêu cầu
   "Mình đang làm X. Nếu việc mới quan trọng hơn thì mình
    chuyển sang, X lùi lại. Bạn thấy cái nào cần trước?"

⇒ Cách ④ là cách hiệu quả nhất: nó không phải từ chối, nó là
  đặt đánh đổi lên bàn ([[uoc-luong-va-pham-vi]]).
```

**Khi bị hỏi giữa lúc đang sâu:**

```text
❌ Trả lời ngay ⇒ mất ngữ cảnh
❌ Phớt lờ ⇒ người kia bị chặn, và họ sẽ hỏi lại

✅ "Mình đang giữa một việc, 30 phút nữa mình trả lời nhé.
    Có gấp không?"

⇒ Hai phần quan trọng: cho một MỐC cụ thể, và hỏi có gấp không.
⇒ Phần lớn việc không gấp. Và phần gấp thì bạn nên dừng thật.
```

**Giúp người khác giữ ranh giới:**

```text
□ Hỏi qua tin nhắn thay vì gọi ngay, trừ khi gấp
□ Đặt câu hỏi ĐẦY ĐỦ trong một lần, không "bạn rảnh không?"
  rồi chờ ⇒ hai lần gián đoạn thay vì một
□ Ghi lại câu trả lời ở chỗ người sau tìm được, để không phải
  hỏi lại ([[giao-tiep-va-anh-huong]])

⇒ Ranh giới hoạt động khi cả đội cùng giữ. Một người tự giữ
  trong một đội không giữ thì rất khó.
```

## Tại sao cần nó

Vì công việc kỹ thuật có một tính chất khác nhiều loại việc khác:

```text
Nhiều việc: làm 50% thời gian ⇒ ra 50% kết quả.
Việc cần liền mạch: ngày bị băm nhỏ ⇒ có thể ra gần 0%
                    ở phần sâu.

⇒ Nên "có ba giờ trống rải rác" không bằng "có một khối 90 phút".
⇒ Và điều này khó giải thích với người không làm việc kiểu này.
```

**Và một cân bằng cần nói rõ:**

```text
Ranh giới quá chặt cũng có giá:
  □ Người khác bị chặn vì chờ bạn
  □ Bạn mất thông tin đang diễn ra trong đội
  □ Và bạn trở thành người khó làm việc cùng

⇒ Mục tiêu không phải không bị gián đoạn. Là có ĐỦ khối sâu
  cho việc cần nó, và sẵn sàng cho phần còn lại.
⇒ Một khối 90 phút mỗi ngày đã đổi rất nhiều.
```

**Ba việc cụ thể:**

```text
□ Chặn sẵn một khối 90 phút trong lịch, mỗi ngày
□ Tắt thông báo trong khối đó
□ Dồn việc chịu được gián đoạn vào một khoảng cố định
```

## So sánh

| | Ngày bị băm nhỏ | Có khối sâu |
|---|---|---|
| Việc cần liền mạch | gần như không làm được | ✅ |
| Việc nhỏ, review | ✅ | ✅ (dồn lại) |
| Người khác chờ bạn | ít | có, nhưng có mốc |
| Cảm giác bận | cao | thấp hơn |
| Kết quả thật | thấp | cao |

## Dễ nhầm

**1. Nghĩ gián đoạn 2 phút tốn 2 phút.**

**2. Trộn việc cần liền mạch với việc chịu được gián đoạn.**

**3. Kiểm tin nhắn liên tục trong khối sâu.** Nguồn lớn nhất.

**4. Tự chuyển việc khi gặp khó.** Mất ngữ cảnh, việc khó vẫn còn.

**5. Làm ba việc song song.** Chậm hơn làm tuần tự.

**6. Nói "không" thay vì đổi thời điểm/phạm vi/thứ tự.**

**7. Trả lời ngay khi đang giữa việc sâu.**

**8. Phớt lờ mà không cho mốc.** Người kia sẽ hỏi lại.

**9. Hỏi "bạn rảnh không?" rồi chờ.** Hai lần gián đoạn.

**10. Ranh giới quá chặt.** Chặn người khác, mất thông tin.

## Mẹo nhớ

> **Gián đoạn 2 phút tốn 15–20 phút — vì nạp lại ngữ cảnh.**
>
> **Phần lớn gián đoạn do BẠN tự tạo: kiểm tin nhắn, tự chuyển việc, làm song song.**
>
> **Đừng nói "không" — đổi THỜI ĐIỂM, PHẠM VI, NGƯỜI, hoặc THỨ TỰ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao một gián đoạn hai phút tốn nhiều hơn hai phút?
2. Hai loại việc và cách sắp xếp chúng?
3. Ba nguồn gián đoạn tự gây ra, và cách chữa từng cái?
4. Bốn cách "nói không", cách nào hiệu quả nhất?
5. Cái giá của ranh giới quá chặt?

## Tự viết lại

Không nhìn lại, viết lại một ngày làm việc của bạn:

```text
① những việc cần liền mạch và việc chịu được gián đoạn
② khối sâu bạn chặn: khi nào, dài bao lâu
③ ba nguồn gián đoạn tự gây ra của bạn, và cách chữa
④ câu bạn dùng khi bị hỏi giữa lúc đang sâu
```

Tự kiểm: trong ba nguồn ở ③, cái nào bạn làm nhiều nhất — và nó có dễ chữa không?

## Thử sức

Bạn có ba giờ trống mỗi ngày nhưng rải rác thành sáu khoảng 30 phút. Việc chính của bạn là thiết kế lại một module phức tạp, ước lượng hai tuần, và sau một tuần bạn gần như chưa tiến được gì.

Ba câu để trả lời: chuyện gì đang xảy ra; bạn thay đổi thế nào trong tuần tới; và bạn giải thích với đội ra sao để họ hiểu chứ không nghĩ bạn khó làm việc cùng. Câu khó nhất: nếu lịch họp không đổi được, bạn xử lý cách nào — và có cách nào biến sáu khoảng 30 phút thành thứ dùng được cho việc này không?
