---
title: Uỷ quyền và dẫn dắt nhóm
slug: uy-quyen-va-dan-dat-nhom
summary: Uỷ quyền mà không bỏ rơi, onboarding, 1:1, phỏng vấn — và giữ lại thời gian cho việc kỹ thuật.
level: nang-cao
tags: [dan-dat, uy-quyen, onboarding, 1-1, phong-van]
---

> **Sau bài này bạn sẽ:** giao việc theo cách làm người khác giỏi lên, và không trở thành điểm nghẽn của chính nhóm mình.

## Bẫy lớn nhất: tự làm vì nhanh hơn

Bạn làm việc đó trong 2 giờ. Giao cho người khác mất 4 giờ của họ, cộng 1 giờ của bạn để giải thích và review. Lần này tự làm rõ ràng rẻ hơn.

Nhưng phép tính đó chỉ đúng **một lần**. Lần thứ mười:

```
Tự làm:      10 × 2 giờ  = 20 giờ của bạn, và không ai khác làm được
Uỷ quyền:    5 + 4 + 3 + 2,5 + 2 + 2 ... ≈ 20 giờ của họ,
             ~4 giờ của bạn, và từ lần thứ 6 họ nhanh hơn bạn
```

Dấu hiệu bạn đã thành điểm nghẽn, và cả bốn đều dễ nhận ra:

- Bạn review 80% PR — xem [[review-code-va-nang-nguoi]]
- Chỉ bạn deploy được, hoặc chỉ bạn gỡ được sự cố
- Nhóm chờ bạn trả lời mới làm tiếp
- Bạn không nghỉ phép được

Điểm nghẽn không phải huân chương. Nó là **rủi ro cho nhóm** và là trần cho chính bạn.

## Uỷ quyền là giao kết quả, không giao thao tác

```
❌ Giao thao tác — họ không học được gì, và bạn vẫn phải suy nghĩ
   "Thêm index vào bảng orders cột user_id, dùng CONCURRENTLY."

✅ Giao kết quả — họ phải hiểu vấn đề, và lần sau tự làm được
   "Trang đơn hàng chậm 4 giây với khách hàng có nhiều đơn. Tìm nguyên nhân
    và sửa. Gợi ý: bắt đầu từ EXPLAIN ANALYZE. Bàn với mình trước khi deploy."
```

Câu thứ hai giao cả việc **hiểu vấn đề**. Đó là phần làm người ta lớn lên; giao thao tác thì bạn chỉ mượn được tay của họ.

Kèm theo mỗi lần giao, nói rõ bốn thứ — thiếu bất kỳ cái nào là công thức của "uỷ quyền rồi thất vọng":

- **Kết quả** cần đạt (không phải cách làm)
- **Ràng buộc** (hạn, không được sửa API công khai, phải giữ tương thích)
- **Mức tự chủ**: tự quyết? bàn trước khi làm? hay báo lại sau khi làm?
- **Khi nào quay lại tìm mình**

## Bốn mức tự chủ

Nói rõ mức nào, thay vì để người ta đoán:

| Mức | Nghĩa |
|---|---|
| 1 | Làm đúng như tôi nói, hỏi nếu không rõ |
| 2 | Đề xuất phương án, tôi duyệt rồi làm |
| 3 | Tự quyết và làm, báo lại cho tôi |
| 4 | Tự quyết, tự làm, không cần báo |

Sai lầm hay gặp là **giao ở mức 3 nhưng trong đầu đang ở mức 1** — rồi thất vọng vì họ làm khác cách mình nghĩ. Vấn đề nằm ở việc không nói rõ mức, không nằm ở họ.

Nâng mức dần theo từng việc, không theo chức danh. Cùng một người có thể ở mức 4 với frontend và mức 2 với database.

## Onboarding: đo bằng ngày tới commit đầu

Chỉ số tốt nhất cho chất lượng onboarding: **bao lâu để người mới merge được thay đổi đầu tiên lên production**. Nếu mất hai tuần, đó là vấn đề của bạn chứ không phải của họ.

Ba thứ có tác dụng nhất:

**1. Một lệnh để chạy được.** Nếu dựng môi trường mất một ngày và cần hỏi ba người, đó là bug.

```bash
pnpm install && pnpm seed && pnpm dev
```

**2. Một việc nhỏ thật, trong ngày đầu.** Sửa một chuỗi, thêm một test. Đi qua trọn vẹn vòng lặp: sửa → test → PR → review → merge → production. Vòng lặp đó là thứ cần học trước mọi kiến thức kỹ thuật.

**3. Tài liệu "vì sao", không phải tài liệu "cái gì".** Code nói cái gì. Người mới cần biết vì sao — đó là ADR, xem [[ra-quyet-dinh-ky-thuat]].

Và một điều rẻ mà hiệu quả: **để người mới cập nhật tài liệu onboarding** trong tuần đầu. Họ là người duy nhất thấy được chỗ nào thiếu, và một tháng sau thì chính họ cũng không thấy nữa.

## 1:1 là của họ, không phải của bạn

```
❌ Buổi cập nhật tình hình — cái này đã có trong ticket
✅ Buổi nói về những thứ không xuất hiện trong ticket
```

Câu hỏi có tác dụng:

- "Tuần này cái gì làm em mất thời gian nhiều nhất mà lẽ ra không nên?"
- "Có chỗ nào em đang chờ ai không?"
- "Em muốn làm nhiều hơn phần nào, ít hơn phần nào?"
- "Có gì em nghĩ mình nên biết mà chưa ai nói không?"

Ba nguyên tắc: **đừng huỷ** (huỷ nhiều lần là tín hiệu rõ ràng rằng buổi đó không quan trọng), **ghi lại việc cần làm** cho cả hai bên, và **để họ dẫn** phần lớn thời gian.

Góp ý nên ở đúng chỗ: khen thì công khai, sửa thì riêng tư, và **cả hai đều phải kịp thời**. Góp ý gom lại tới kỳ đánh giá là góp ý đã mất giá trị.

## Phỏng vấn: đo cái công việc thật cần

```
❌ Câu đố thuật toán không liên quan việc hằng ngày
❌ Hỏi cú pháp API mà ai cũng tra được trong 5 giây
❌ Bài về nhà 8 tiếng — sàng lọc theo thời gian rảnh, không theo năng lực

✅ Đọc và sửa một đoạn code có bug (giống việc thật nhất)
✅ Thiết kế một hệ thống nhỏ, bàn qua lại về đánh đổi
✅ Hỏi về một quyết định kỹ thuật họ từng làm và hối hận
```

Câu cuối là câu tốt nhất trong danh sách: nó cho thấy họ có **học được từ kinh nghiệm** hay không, và người trả lời được câu đó một cách cụ thể gần như luôn là người đáng tuyển.

Hai điều cần nhớ: **đánh giá theo cùng một thang** đã định trước (không phải theo cảm giác "hợp"), và hỏi cả cái ứng viên **muốn biết** — phỏng vấn là hai chiều, và người giỏi đang đánh giá bạn.

## Giữ thời gian cho việc kỹ thuật

Tech lead mất hoàn toàn tay nghề kỹ thuật sẽ mất luôn khả năng ra quyết định kỹ thuật tốt — bạn không cảm nhận được chỗ nào đau nếu không còn làm.

Nhưng cũng đừng nhận việc **nằm trên đường tới hạn**. Bạn sẽ bị ngắt liên tục và trở thành thứ chặn cả nhóm.

Việc kỹ thuật phù hợp cho tech lead:

- Prototype để trả lời một câu hỏi thiết kế
- Công cụ nội bộ, cải thiện trải nghiệm dev
- Việc gián đoạn được: cải thiện quan sát, dọn nợ nhỏ
- Review code (đây **là** việc kỹ thuật, và là việc có đòn bẩy cao nhất)

Không phù hợp: tính năng lớn có hạn, thứ mà ba người khác đang chờ.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Tự làm vì nhanh hơn | Thành điểm nghẽn, không ai lớn lên | Tính chi phí ở lần thứ mười |
| Giao thao tác thay vì kết quả | Họ không học được gì | Giao vấn đề, không giao lời giải |
| Không nói rõ mức tự chủ | Giao mức 3, kỳ vọng mức 1, rồi thất vọng | Nói rõ mức |
| Uỷ quyền rồi micromanage | Mất niềm tin hai chiều | Thoả thuận điểm kiểm tra trước |
| Uỷ quyền rồi bỏ rơi | Thất bại, họ mất tự tin | Có điểm kiểm tra |
| Onboarding không có việc thật ngày đầu | Người mới trôi nổi cả tuần | Một PR nhỏ ngày đầu |
| Chỉ có tài liệu "cái gì" | Người mới không hiểu vì sao | ADR |
| 1:1 thành buổi cập nhật ticket | Mất kênh nghe vấn đề thật | Để họ dẫn |
| Huỷ 1:1 khi bận | Tín hiệu: em không quan trọng | Đừng huỷ |
| Gom góp ý tới kỳ đánh giá | Góp ý mất giá trị | Kịp thời |
| Nhận tính năng lớn có hạn | Bị ngắt liên tục, chặn cả nhóm | Nhận việc gián đoạn được |

## Ghi nhớ

- Uỷ quyền lỗ ở lần đầu và lãi từ lần thứ sáu — tính theo lần thứ mười.
- Giao **kết quả** kèm ràng buộc và mức tự chủ, không giao thao tác.
- Onboarding đo bằng ngày tới commit đầu tiên lên production.
- Giữ việc kỹ thuật gián đoạn được; đừng nằm trên đường tới hạn.

## Tự kiểm tra

1. Bốn dấu hiệu bạn đã thành điểm nghẽn của nhóm?
2. Bốn thứ phải nói rõ mỗi lần giao việc?
3. Vì sao "một quyết định bạn từng làm và hối hận" là câu phỏng vấn tốt?
