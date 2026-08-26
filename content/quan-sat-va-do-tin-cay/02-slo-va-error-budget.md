---
title: SLO và error budget
slug: slo-va-error-budget
summary: Đặt mục tiêu độ tin cậy bằng số, và dùng nó để quyết định khi nào ngừng làm tính năng.
level: trung-cap
tags: [van-hanh, slo, sli, error-budget, bao-dong]
khung: v2
---

> **Sau bài này bạn sẽ:** đặt được SLO có ý nghĩa, và dùng error budget để biến "ổn định hay tính năng" thành một quyết định có số.

## Ý tưởng chính

"Hệ thống phải ổn định" là một mong muốn, không phải một mục tiêu — vì không ai biết khi nào đã đạt.

**SLO** biến nó thành số. Và số đó cho ra một thứ hữu ích hơn nhiều: một **ngân sách lỗi** để tiêu.

## Mental model

Hãy nghĩ tới **ngân sách chi tiêu hằng tháng**.

> "Tiêu ít thôi" không dẫn tới quyết định nào cả.
>
> "Tháng này có 10 triệu, đã tiêu 7" thì khác hẳn — bạn biết còn 3 triệu, và **biết mình được phép tiêu**. Không ai đặt ngân sách để rồi không tiêu đồng nào.
>
> Và khi hết tiền, quyết định tự đến: dừng chi tiêu không thiết yếu cho tới đầu tháng sau.

Error budget hoạt động y hệt. Điểm khiến nhiều người bất ngờ: **budget còn dư nhiều nghĩa là bạn đang quá thận trọng** — bạn đang trả giá bằng tốc độ để mua một mức ổn định không ai yêu cầu.

## Ví dụ nhỏ

```text
SLO: 99,9% request thành công trong 30 ngày.

Error budget = 0,1% × 30 ngày
             = 43 phút 12 giây downtime
```

## Code chạy thế nào

**SLI, SLO, SLA — ba thứ hay bị lẫn:**

```text
SLI  chỉ số ĐO ĐƯỢC
     "% request trả về < 500ms"

SLO  MỤC TIÊU nội bộ cho SLI đó
     "99,9% trong 30 ngày"

SLA  CAM KẾT với khách hàng, có hậu quả pháp lý/tài chính
     "99,5%, không đạt thì hoàn tiền"

⇒ SLO luôn CHẶT HƠN SLA. Khoảng cách đó là chỗ bạn kịp phản ứng
  trước khi phải đền.
```

**Error budget theo từng mức — con số làm rõ mọi thứ:**

```text
SLO       Downtime cho phép/tháng   Ghi chú
99%       7 giờ 18 phút             dễ đạt
99,9%     43 phút                   mục tiêu hợp lý cho phần lớn hệ thống
99,99%    4 phút 19 giây            cần dự phòng đa vùng, on-call nghiêm túc
99,999%   26 giây                   rất ít hệ thống thực sự cần

Mỗi số 9 thêm vào thường NHÂN chi phí lên nhiều lần.
```

Cách dùng bảng này khi thương lượng: hỏi ngược lại *"99,99% nghĩa là mỗi tháng chỉ được sập 4 phút — và cần chừng này đầu tư. Nghiệp vụ có thật sự cần không?"* Thường câu trả lời là không.

**Dùng error budget để ra quyết định:**

```text
Còn nhiều budget  → deploy nhanh hơn, thử nghiệm nhiều hơn,
                    chấp nhận rủi ro. Budget sinh ra để tiêu.

Sắp hết           → chậm lại: tăng kiểm thử, canary lâu hơn,
                    hoãn thay đổi rủi ro.

Hết               → ĐÓNG BĂNG tính năng. Cả đội chuyển sang
                    ổn định hoá cho tới khi budget hồi lại.
```

Giá trị lớn nhất không phải kỹ thuật mà là **chính trị**: nó biến cuộc tranh luận "ổn định hay tính năng" — vốn dựa vào ai nói to hơn — thành một quy tắc thoả thuận trước, áp dụng bằng số.

## Cú pháp

**Đặt SLO đúng cách:**

```text
① Đo cái NGƯỜI DÙNG cảm nhận, không đo cái dễ đo
   ❌ "CPU < 80%"           ← người dùng không quan tâm
   ✅ "99,9% request đăng nhập thành công < 1 giây"

② SLO khác nhau cho luồng khác nhau
   Thanh toán:  99,95%   ← hỏng là mất tiền
   Trang chủ:   99,9%
   Gợi ý:       99%      ← hỏng thì chỉ thiếu một khối
   ⇒ Một SLO cho cả hệ thống nghĩa là bạn bảo vệ thứ ít quan trọng
     bằng chi phí của thứ quan trọng.

③ ĐỪNG đặt 100%
   Không đạt được, và nó xoá bỏ chính khái niệm budget.
   Không có budget ⇒ mọi thay đổi đều là rủi ro không được phép
   ⇒ hệ thống đóng băng.

④ Đo từ phía NGƯỜI DÙNG khi có thể
   Server báo 200 mà JS lỗi ⇒ người dùng vẫn không dùng được.
```

**Cảnh báo theo tốc độ tiêu budget** — thay vì theo ngưỡng tĩnh:

```text
Ngưỡng tĩnh:  "5xx > 1%"
  → kêu cả khi có một cú nhảy 2 phút rồi tự hết ⇒ nhiễu.

Tốc độ tiêu:
  Nhanh:  tiêu 2% budget trong 1 giờ   → gọi người NGAY
  Chậm:   tiêu 10% budget trong 3 ngày → tạo ticket, xử lý trong giờ làm

⇒ Cảnh báo tỉ lệ với mức độ NGƯỜI DÙNG bị ảnh hưởng,
  không tỉ lệ với độ ồn của biểu đồ.
```

Đây là cách hiệu quả nhất để giảm cảnh báo giả mà không giảm độ nhạy ([[su-co-va-hau-kiem]]).

## Tại sao cần nó

Vì không có SLO thì mọi cuộc tranh luận về độ tin cậy đều là tranh luận về cảm giác:

```text
Không có SLO:
  "Hệ thống hay lỗi quá!"  "Đâu có, tôi thấy ổn mà."
  → ai to tiếng hơn thì thắng.

Có SLO:
  "Tháng này đã tiêu 80% error budget."
  → dữ liệu chung, quy tắc thoả thuận trước, quyết định tự đến.
```

**Cửa sổ trượt, không phải theo lịch tháng:**

```text
Tính theo 30 ngày TRƯỢT, không phải "từ ngày 1 tới ngày 30".
Nếu không, một sự cố ngày 28 sẽ được "xoá nợ" vào ngày 1
— trong khi người dùng vẫn nhớ nó.
```

**Bắt đầu nhẹ nhàng:**

```text
① Chọn MỘT luồng quan trọng nhất (đăng nhập, đặt hàng)
② Định nghĩa SLI đo được
③ Đặt SLO thấp hơn hiện trạng một chút — để nó có ý nghĩa ngay
④ Đo một tháng, không ra quyết định gì vội
⑤ Điều chỉnh, rồi mới áp dụng quy tắc budget
```

Bước ③ quan trọng: SLO đặt cao hơn thực tế nhiều sẽ luôn đỏ, và một chỉ số luôn đỏ sẽ bị bỏ qua — cùng cơ chế với test chập chờn ([[kiem-thu-tu-dong-trong-ci]]).

## So sánh

| | SLI | SLO | SLA |
|---|---|---|---|
| Là gì | chỉ số đo được | mục tiêu nội bộ | cam kết với khách |
| Ai quan tâm | kỹ thuật | đội + sản phẩm | pháp lý, khách hàng |
| Không đạt thì | — | đóng băng tính năng | hoàn tiền |
| Mức | — | chặt hơn SLA | lỏng hơn SLO |

## Dễ nhầm

**1. Đặt SLO 100%.** Không có budget, hệ thống đóng băng.

**2. Đo cái dễ đo thay vì cái người dùng cảm nhận.**

**3. Một SLO cho cả hệ thống.** Bảo vệ nhầm chỗ.

**4. Không dùng budget khi còn dư.** Đang trả giá bằng tốc độ mà không ai yêu cầu.

**5. Đặt SLO cao hơn thực tế nhiều.** Luôn đỏ ⇒ bị bỏ qua.

**6. SLO chặt bằng SLA.** Không còn khoảng đệm để phản ứng.

**7. Cảnh báo theo ngưỡng tĩnh.** Nhiều cảnh báo giả.

**8. Tính theo tháng lịch.** Sự cố được xoá nợ một cách giả tạo.

**9. Không có quy tắc rõ khi hết budget.** Có số mà không có hành động.

**10. Đo ở server thay vì phía người dùng.** Bỏ sót lỗi phía client.

## Mẹo nhớ

> **SLI đo — SLO nhắm — SLA cam kết. SLO luôn chặt hơn SLA.**
>
> **Error budget sinh ra để TIÊU. Dư nhiều = quá thận trọng.**
>
> **Cảnh báo theo TỐC ĐỘ TIÊU budget, không theo ngưỡng tĩnh.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. SLI, SLO, SLA khác nhau thế nào?
2. 99,9% cho phép sập bao lâu mỗi tháng? 99,99%?
3. Vì sao SLO 100% là sai?
4. Error budget dùng để ra quyết định gì?
5. Vì sao cảnh báo theo tốc độ tiêu tốt hơn theo ngưỡng tĩnh?

## Tự viết lại

Sàn thương mại điện tử có: duyệt sản phẩm, tìm kiếm, giỏ hàng, thanh toán, gợi ý. Không nhìn lại:

```text
① SLI và SLO cho từng luồng, kèm lý do mức đó
② error budget tương ứng, tính ra phút
③ hai cảnh báo theo tốc độ tiêu
④ quy tắc khi hết budget
```

Tự kiểm: luồng nào bạn đặt SLO cao nhất, và bạn giải thích chi phí của nó cho sếp thế nào?

## Thử sức

Đội bạn tranh cãi mỗi tuần: sản phẩm muốn tính năng nhanh, vận hành muốn ổn định. Không ai có số.

Ba câu để trả lời: bạn đề xuất **quy trình** nào để chấm dứt tranh cãi này; các bước triển khai trong tháng đầu; và bạn xử lý thế nào khi hết budget mà sản phẩm có một deadline không dời được. Câu khó nhất: nếu sau ba tháng error budget **chưa bao giờ** tiêu quá 20%, điều đó nói lên gì — và bạn đề xuất gì?
