---
title: Chặn hồi quy trong hệ thống AI
slug: chan-hoi-quy-ai
summary: Bốn nguồn hồi quy, ba nguồn không do bạn gây ra — và cách canh chúng.
level: nang-cao
tags: [ai, danh-gia, van-hanh, chat-luong]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bốn nguồn hồi quy, và ba trong bốn nguồn đó xảy ra mà không ai chạm vào mã.

## Ý tưởng chính

Trong phần mềm thường, hồi quy đến từ **thay đổi mã**. Bạn chặn nó bằng test trong CI.

Trong hệ thống AI, chỉ **một trong bốn** nguồn hồi quy là thay đổi mã. Ba nguồn còn lại xảy ra **mà không ai làm gì cả** — nên CI một mình không đủ.

## Mental model

Hãy nghĩ tới **một công thức nấu ăn ngon dần trở nên dở**.

> Bạn không đổi công thức. Nhưng:
> - **Nhà cung cấp đổi loại gia vị** (cùng nhãn, khác vị) — mô hình được cập nhật.
> - **Nguyên liệu trong kho hết hạn hoặc lẫn** — dữ liệu lệch.
> - **Khách hàng mới có khẩu vị khác** — phân bố câu hỏi đổi.
>
> Ba thứ đó xảy ra mà bạn không làm gì. Và bạn chỉ biết khi có người phàn nàn — trừ khi bạn **nếm thử định kỳ**.

"Nếm thử định kỳ" là chạy bộ eval theo lịch, không chỉ khi deploy. Đó là điểm khác biệt cốt lõi so với CI thường.

## Ví dụ nhỏ

```text
Bốn nguồn hồi quy:
  ① bạn đổi prompt, mô hình, hoặc mã       → CI chặn được
  ② nhà cung cấp cập nhật mô hình           → CI không thấy
  ③ dữ liệu lệch với nguồn                  → CI không thấy
  ④ phân bố câu hỏi của người dùng đổi      → CI không thấy
```

## Code chạy thế nào

**Bốn nguồn và cách canh từng cái:**

```text
① THAY ĐỔI CỦA BẠN
   Prompt, mô hình, tham số, cách chia đoạn, công cụ.
   ⇒ Canh bằng: bộ eval trong CI, chặn merge nếu điểm giảm
     hoặc có ca từ đúng thành sai ([[xay-bo-eval]]).

② NHÀ CUNG CẤP CẬP NHẬT MÔ HÌNH
   Cùng tên mô hình, hành vi khác.
   ⇒ Canh bằng: chạy bộ eval ĐỊNH KỲ (hằng ngày hoặc hằng tuần).
   ⇒ Giảm rủi ro: ghim phiên bản mô hình nếu nhà cung cấp cho phép.

③ DỮ LIỆU LỆCH VỚI NGUỒN
   Tài liệu xoá mà đoạn còn; tài liệu mới chưa nạp.
   ⇒ Canh bằng: đối chiếu định kỳ, và tỉ lệ "không tìm thấy"
     ([[van-hanh-vector-store]]).

④ PHÂN BỐ CÂU HỎI ĐỔI
   Người dùng mới, tính năng mới, mùa vụ.
   ⇒ Canh bằng: theo dõi phân bố loại câu hỏi, và cập nhật
     bộ eval theo phân bố thật.
   ⇒ Đây là nguồn khó nhất: hệ thống không xấu đi, nhưng nó
     đang được dùng cho việc khác.
```

**Vì sao nguồn ② khó chịu nhất:**

```text
Không có commit nào. Không có deploy nào. Không có ai để hỏi.
Và nó có thể xảy ra vào ban đêm.

⇒ Triệu chứng: một sáng thứ Ba, người dùng bắt đầu phàn nàn,
  và log không có gì thay đổi.
⇒ Cách duy nhất phát hiện sớm: bộ eval chạy theo lịch, có
  cảnh báo khi điểm tụt.
```

## Cú pháp

**Hai bộ eval, hai nhịp chạy:**

```text
BỘ NHANH (20–40 ca, vài phút)
  Chạy khi: mỗi PR đổi prompt/mô hình/truy hồi
  Chặn merge nếu: điểm giảm, hoặc có ca từ đúng thành sai

BỘ ĐẦY ĐỦ (100–200 ca)
  Chạy khi: trước phát hành, VÀ theo lịch hằng ngày
  Cảnh báo nếu: điểm tụt quá ngưỡng so với 7 ngày trước
```

```text
Nhịp chạy theo lịch là điểm khác biệt quan trọng nhất so với
CI của phần mềm thường. Test thường chỉ cần chạy khi có thay đổi;
bộ eval phải chạy cả khi KHÔNG có thay đổi.
```

**Ghim phiên bản — làm được tới đâu:**

```text
Nếu nhà cung cấp cho ghim phiên bản cụ thể:
  ✅ Ghim ⇒ hành vi ổn định
  ⚠️ Nhưng phiên bản cũ sẽ ngừng hỗ trợ ⇒ bạn PHẢI nâng cấp
    vào một lúc nào đó
  ⇒ Nên có quy trình nâng cấp: chạy bộ eval trên phiên bản mới,
    so với phiên bản đang dùng, rồi mới chuyển.

Nếu không ghim được:
  ⇒ Bộ eval theo lịch là lớp phòng thủ duy nhất.
```

**Bốn thứ ghi lại ở mỗi lần chạy eval:**

```text
□ Điểm tổng, và điểm theo từng loại ca
□ Danh sách ca ĐỔI KẾT QUẢ so với lần trước (cả hai hướng)
□ Phiên bản: prompt, mô hình, dữ liệu, mã
□ Ngày giờ

⇒ Cột thứ hai là cột quan trọng nhất: điểm tổng có thể giữ
  nguyên trong khi ba ca hỏng và ba ca khác được sửa.
```

**Xử lý khi phát hiện hồi quy:**

```text
① XÁC ĐỊNH NGUỒN — bốn khả năng ở trên
   Có commit nào không? ⇒ nguồn ①
   Không có ⇒ so với phiên bản mô hình, kiểm dữ liệu, xem
   phân bố câu hỏi

② NGUỒN ① ⇒ quay lui, rồi sửa
③ NGUỒN ② ⇒ điều chỉnh prompt cho phiên bản mới; nếu ghim được
   thì quay về phiên bản cũ trong lúc điều chỉnh
④ NGUỒN ③ ⇒ đồng bộ lại dữ liệu
⑤ NGUỒN ④ ⇒ không phải "sửa" — đây là yêu cầu mới,
   cần cập nhật bộ eval và có thể cần tính năng mới
```

Bước ⑤ đáng chú ý: **không phải hồi quy nào cũng là lỗi cần sửa**. Đôi khi nó là dấu hiệu sản phẩm đang được dùng cho việc bạn chưa thiết kế cho.

## Tại sao cần nó

Vì hệ thống AI có thể xấu đi mà **không có tín hiệu nào từ hệ thống**:

```text
Tỉ lệ lỗi:      0%
Độ trễ:         bình thường
Deploy:         không có
Log:            không có gì lạ
Chất lượng:     đã tụt 15%

⇒ Không chỉ số hạ tầng nào thấy điều này
  ([[quan-sat-ung-dung-llm]]).
⇒ Chỉ có bộ eval theo lịch và tín hiệu hành vi người dùng
  bắt được.
```

**Bốn lớp phòng thủ, dùng cùng nhau:**

```text
① Bộ eval trong CI            → chặn thay đổi của bạn
② Bộ eval theo lịch           → bắt thay đổi từ bên ngoài
③ Đối chiếu dữ liệu định kỳ   → bắt lệch dữ liệu
④ Tín hiệu hành vi người dùng → bắt mọi thứ còn lại
                                 ([[do-trong-production]])

⇒ Bốn lớp bắt bốn nguồn. Bỏ một lớp là mở một đường.
```

**Và một điều về ngưỡng cảnh báo:**

```text
Bộ eval không tất định ⇒ điểm dao động tự nhiên vài phần trăm.

⇒ Ngưỡng quá chặt ⇒ cảnh báo giả liên tục ⇒ bị bỏ qua
  ⇒ và lúc đó lớp phòng thủ mất tác dụng
  ([[su-co-va-hau-kiem]])
⇒ Cách làm: chạy bộ eval vài lần với cùng cấu hình để BIẾT
  mức dao động tự nhiên, rồi đặt ngưỡng ngoài mức đó.
```

## So sánh

| Nguồn hồi quy | Do bạn | CI bắt được | Canh bằng |
|---|---|---|---|
| Đổi prompt/mã | ✅ | ✅ | eval trong CI |
| Mô hình cập nhật | ❌ | ❌ | eval theo lịch |
| Dữ liệu lệch | ❌ | ❌ | đối chiếu định kỳ |
| Câu hỏi đổi | ❌ | ❌ | phân bố + hành vi |

## Dễ nhầm

**1. Chỉ chạy bộ eval khi deploy.** Bỏ ba nguồn còn lại.

**2. Không biết mô hình có thể được cập nhật.**

**3. Không ghim phiên bản khi có thể.**

**4. Ghim rồi không có kế hoạch nâng cấp.**

**5. Chỉ nhìn điểm tổng.** Bỏ sót ca đổi kết quả.

**6. Không ghi phiên bản ở mỗi lần chạy eval.**

**7. Ngưỡng cảnh báo quá chặt.** Cảnh báo giả, rồi bị bỏ qua.

**8. Không đo mức dao động tự nhiên trước khi đặt ngưỡng.**

**9. Coi mọi hồi quy là lỗi cần sửa.** Nguồn ④ là yêu cầu mới.

**10. Bỏ một trong bốn lớp phòng thủ.**

## Mẹo nhớ

> **Ba trong bốn nguồn hồi quy xảy ra mà KHÔNG AI chạm vào mã.**
>
> **Bộ eval phải chạy THEO LỊCH, không chỉ khi deploy — đó là khác biệt cốt lõi so với CI thường.**
>
> **Nhìn danh sách ca ĐỔI KẾT QUẢ, không chỉ nhìn điểm tổng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn nguồn hồi quy, nguồn nào CI bắt được?
2. Vì sao nguồn "mô hình cập nhật" khó chịu nhất?
3. Hai bộ eval, hai nhịp chạy?
4. Bốn thứ ghi lại mỗi lần chạy, cột nào quan trọng nhất?
5. Vì sao nguồn thứ tư không phải lỗi cần sửa?

## Tự viết lại

Không nhìn lại, thiết kế hệ thống chặn hồi quy cho một ứng dụng RAG:

```text
① hai bộ eval: kích thước, nội dung, nhịp chạy
② bốn lớp phòng thủ
③ ngưỡng cảnh báo và cách xác định nó
④ quy trình khi phát hiện hồi quy: xác định nguồn thế nào
⑤ kế hoạch nâng cấp phiên bản mô hình
```

Tự kiểm: ở ③, bạn xác định mức dao động tự nhiên bằng cách nào — và nếu chưa đo, ngưỡng của bạn dựa vào gì?

## Thử sức

Một sáng, tỉ lệ báo sai của trợ lý tăng gấp ba. Không có deploy nào trong hai tuần. Bộ eval mới chạy tuần trước, điểm bình thường.

Ba câu để trả lời: bốn khả năng và bạn kiểm từng cái thế nào; bạn làm gì **ngay** để giảm ảnh hưởng trong lúc điều tra; và ba thay đổi để lần sau phát hiện trong vài giờ thay vì chờ người dùng báo. Câu khó nhất: bộ eval chạy tuần trước có điểm bình thường — nếu bạn chạy lại **bây giờ** và nó vẫn bình thường, điều đó loại trừ được nguồn nào và chỉ ra nguồn nào?
