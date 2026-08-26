---
title: Sự cố và hậu kiểm
slug: su-co-va-hau-kiem
summary: Ai chỉ huy, nói gì với ai lúc đang cháy, và cách viết hậu kiểm không quy tội mà vẫn có kết quả.
level: trung-cap
tags: [van-hanh, su-co, postmortem, on-call]
khung: v2
---

> **Sau bài này bạn sẽ:** biết ba vai trong một sự cố, và vì sao hậu kiểm quy tội làm hệ thống kém an toàn hơn.

## Ý tưởng chính

Lúc sự cố, thứ hỏng trước hệ thống là **sự phối hợp**: năm người cùng gõ lệnh, không ai biết ai đang làm gì, không ai cập nhật cho bên ngoài.

Nên quy trình sự cố chủ yếu không phải về kỹ thuật. Nó là về **phân vai** và **liên lạc**.

## Mental model

Hãy nghĩ tới **đội chữa cháy**.

> Ở hiện trường không phải ai cũng cầm vòi nước. Có **chỉ huy** — người không cầm vòi, chỉ nhìn toàn cảnh và ra quyết định. Có người **chữa cháy**. Có người **liên lạc** với bên ngoài.
>
> Chỉ huy mà nhảy vào cầm vòi thì không còn ai nhìn toàn cảnh. Và đó chính xác là điều xảy ra khi người giỏi kỹ thuật nhất tự nhận vai chỉ huy rồi lao vào sửa.

Sự tách vai đó là toàn bộ nội dung của quy trình sự cố. Phần còn lại là chi tiết.

## Ví dụ nhỏ

```text
14:32  Cảnh báo: 5xx = 12%
14:33  An nhận vai Chỉ huy sự cố (IC)
14:35  Bình điều tra; Chi thông báo cho bên liên quan
14:41  Quay lui v1.4.2 → 5xx giảm về 0,1%
14:50  Tuyên bố kết thúc; hẹn hậu kiểm thứ Năm
```

## Code chạy thế nào

**Ba vai — với đội nhỏ, một người có thể kiêm, nhưng phải nói rõ:**

```text
CHỈ HUY (IC)
  KHÔNG gõ lệnh sửa.   ← điều quan trọng nhất
  Quyết định, phân công, giữ dòng thời gian, quyết khi nào kết thúc.

NGƯỜI XỬ LÝ
  Điều tra và sửa. Báo cáo cho IC. Không tự ý thay đổi lớn.

NGƯỜI LIÊN LẠC
  Cập nhật bên trong và bên ngoài theo nhịp cố định.
  Giữ cho người xử lý KHÔNG bị hỏi liên tục.
```

Vai thứ ba hay bị bỏ qua và tốn kém nhất khi thiếu: không có nó, người đang sửa phải trả lời câu hỏi mỗi hai phút từ những người đang lo lắng.

**Ưu tiên khi đang cháy — thứ tự này không đổi:**

```text
① KHÔI PHỤC DỊCH VỤ      ← không phải tìm nguyên nhân
② Thu thập bằng chứng     ← TRƯỚC khi restart xoá mất
③ Tìm nguyên nhân gốc     ← sau khi đã yên
```

```text
Quay lui trước, hiểu sau.
  Quay lui: 2 phút, đường đã đi rồi.
  Sửa tới:  30–60 phút, dưới áp lực, dễ sai tiếp.

"Nhưng tôi gần tìm ra rồi" — đây là câu kéo dài sự cố nhiều nhất.
```

**Nói gì với bên ngoài — nhịp cố định quan trọng hơn nội dung:**

```text
Ngay khi xác nhận:
  "Chúng tôi đang gặp sự cố ảnh hưởng tới thanh toán.
   Đang xử lý. Cập nhật sau 30 phút."

Mỗi 30 phút, KỂ CẢ KHI CHƯA CÓ GÌ MỚI:
  "Vẫn đang xử lý, đã xác định được hướng. Cập nhật lúc 15:30."

Khi xong:
  "Đã khắc phục lúc 14:41. Nguyên nhân: ... Chúng tôi sẽ ..."
```

Nguyên tắc: **im lặng tệ hơn tin xấu**. Người dùng không biết gì sẽ tự đoán ra thứ tệ hơn thực tế, và sẽ liên hệ hỗ trợ — làm mọi thứ nặng thêm ([[giao-tiep-va-anh-huong]]).

## Cú pháp

**Hậu kiểm không quy tội — vì sao đó không phải chuyện tử tế:**

```text
❌ Quy tội:
   "An deploy mã chưa test và làm sập production."
   ⇒ An giấu lỗi lần sau.
   ⇒ Mọi người giấu lỗi.
   ⇒ Bạn MẤT NGUỒN THÔNG TIN về những gì suýt hỏng.
   ⇒ Hệ thống KÉM AN TOÀN HƠN.

✅ Không quy tội:
   "Mã chưa test lên được production vì CI không chặn merge,
    và quy trình review không yêu cầu kiểm tra kết quả test."
   ⇒ Sửa được bằng cấu hình. Áp dụng cho MỌI người, không chỉ An.
```

Lập luận nền tảng: **giả định ai cũng đã làm điều hợp lý nhất với thông tin họ có lúc đó**. Nếu một người thông minh và có thiện chí vẫn gây ra sự cố, thì vấn đề nằm ở **hệ thống cho phép điều đó xảy ra**, không ở người đó.

**Mẫu hậu kiểm:**

```text
① TÓM TẮT       chuyện gì, ảnh hưởng ai, bao lâu
② ẢNH HƯỞNG     số: bao nhiêu người dùng, bao nhiêu request,
                doanh thu, và error budget đã tiêu
③ DÒNG THỜI GIAN  giờ nào ai làm gì — sự kiện, không phán xét
④ NGUYÊN NHÂN   hỏi "vì sao" nhiều lần; thường có NHIỀU nguyên nhân
⑤ CÁI GÌ ĐÃ CHẠY TỐT   ← đừng bỏ mục này
⑥ HÀNH ĐỘNG     có người phụ trách, có hạn, có ticket
```

Mục ⑤ không phải để an ủi: nó ghi lại những cơ chế đã hoạt động, để không ai vô tình gỡ bỏ chúng ở lần tối ưu sau.

**Hành động phải cụ thể và đo được:**

```text
❌ "Cẩn thận hơn khi deploy"      → không phải hành động
❌ "Cải thiện quy trình test"     → ai làm? bao giờ? xong là thế nào?

✅ "Bật required status check cho main — An — 25/08 — #1234"
✅ "Thêm cảnh báo 5xx > 1% trong 5 phút — Bình — 27/08 — #1235"
```

Và **theo dõi tới khi xong**: hậu kiểm có hành động không ai làm còn tệ hơn không viết, vì nó tạo cảm giác đã xử lý.

## Tại sao cần nó

Vì phân loại mức độ quyết định ai bị đánh thức:

```text
SEV1  toàn bộ dịch vụ chết, hoặc mất dữ liệu
      → gọi ngay, kể cả 3 giờ sáng, hậu kiểm bắt buộc
SEV2  chức năng chính hỏng với nhiều người dùng
      → gọi trong giờ, hậu kiểm nên có
SEV3  suy giảm nhẹ, có đường vòng
      → xử lý trong giờ làm việc
```

Không có phân loại thì hoặc mọi thứ đều gọi lúc nửa đêm (đội kiệt sức), hoặc chẳng cái gì gọi (SEV1 bị bỏ lỡ).

**On-call bền vững:**

```text
□ Phiên trực có giới hạn, có luân phiên rõ ràng
□ Bị gọi ban đêm ⇒ hôm sau được nghỉ bù
□ Mỗi cảnh báo phải kèm RUNBOOK: triệu chứng, cách kiểm, cách xử lý
□ Cảnh báo không hành động được ⇒ XOÁ hoặc sửa, đừng để đó
□ Đếm số lần bị gọi mỗi phiên — tăng lên là tín hiệu phải sửa hệ thống
```

Dòng cuối biến on-call thành một vòng phản hồi: đội phải chịu hậu quả của hệ thống ồn ào chính là đội có động lực và khả năng sửa nó.

## So sánh

| | Hậu kiểm quy tội | Hậu kiểm không quy tội |
|---|---|---|
| Câu hỏi | "ai làm?" | "hệ thống nào cho phép?" |
| Kết quả | người ta giấu lỗi | thông tin đầy đủ |
| Hành động | "cẩn thận hơn" | thay đổi hệ thống |
| Lần sau | lặp lại | ít khả năng hơn |

## Dễ nhầm

**1. IC vừa chỉ huy vừa gõ lệnh sửa.** Không còn ai nhìn toàn cảnh.

**2. Tìm nguyên nhân trước khi khôi phục.** Kéo dài sự cố.

**3. Restart trước khi thu bằng chứng.** Mất manh mối, sự cố sẽ quay lại.

**4. Im lặng với bên ngoài.** Người dùng đoán ra thứ tệ hơn.

**5. Hậu kiểm quy tội.** Người ta giấu lỗi ⇒ hệ thống kém an toàn hơn.

**6. Hành động chung chung.** "Cẩn thận hơn" không sửa gì.

**7. Không theo dõi hành động tới khi xong.** Cảm giác đã xử lý mà thật ra chưa.

**8. Không phân loại mức độ.** Đội kiệt sức hoặc bỏ lỡ sự cố lớn.

**9. Cảnh báo không có runbook.** Người trực không biết làm gì.

**10. Bỏ mục "cái gì đã chạy tốt".** Vô tình gỡ bỏ cơ chế đang bảo vệ mình.

## Mẹo nhớ

> **IC KHÔNG gõ lệnh sửa. Đó là điều quan trọng nhất.**
>
> **Khôi phục trước, điều tra sau — nhưng thu bằng chứng trước khi restart.**
>
> **Quy tội làm người ta giấu lỗi ⇒ hệ thống KÉM an toàn hơn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba vai trong sự cố, vai nào tuyệt đối không gõ lệnh sửa?
2. Ba ưu tiên khi đang cháy, theo thứ tự?
3. Vì sao hậu kiểm quy tội làm hệ thống kém an toàn hơn?
4. Sáu mục của một hậu kiểm, mục nào hay bị bỏ và vì sao nó quan trọng?
5. Thế nào là một hành động khắc phục **cụ thể**?

## Tự viết lại

Sự cố: deploy lúc 14:00 gây lỗi 40% request thanh toán, phát hiện lúc 14:25 nhờ khiếu nại người dùng, quay lui lúc 14:45. Không nhìn lại, viết hậu kiểm đầy đủ sáu mục, với ít nhất **ba** hành động cụ thể.

Tự kiểm: trong ba hành động của bạn, có cái nào chỉ là "cẩn thận hơn" viết theo cách khác không?

## Thử sức

Sự cố trên có một chi tiết đáng chú ý: **phát hiện nhờ khiếu nại người dùng**, 25 phút sau khi bắt đầu.

Ba câu để trả lời: đó là dấu hiệu của lỗ hổng nào; hai hành động rút thời gian phát hiện xuống dưới 5 phút; và bạn viết nó thế nào trong hậu kiểm để **không** nghe như đổ lỗi cho ai. Câu khó nhất: nếu người deploy là một bạn mới vào và cả đội đang bực, bạn — với vai người viết hậu kiểm — mở đầu cuộc họp bằng câu gì?
