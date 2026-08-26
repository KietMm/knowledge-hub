---
title: Chỉ số và đo thành công
slug: chi-so-va-do-thanh-cong
summary: Chọn chỉ số trước khi làm, chỉ số đối trọng, và vì sao đo cái dễ đo dẫn tới quyết định sai.
level: trung-cap
tags: [san-pham, danh-gia, tu-duy, dan-dat]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn chỉ số trước khi bắt đầu, và biết vì sao mọi chỉ số cần một chỉ số đối trọng.

## Ý tưởng chính

Nếu bạn không nói được **"làm xong thì cái gì khác đi, và đo bằng gì"**, bạn không biết mình thành công hay thất bại.

Và có một cạm bẫy: **cái gì được đo thì được tối ưu**. Chọn sai chỉ số không chỉ làm bạn không biết — nó khiến đội đi sai hướng một cách có hệ thống.

## Mental model

Hãy nghĩ tới **trả lương thợ may theo số áo hoàn thành**.

> Nghe hợp lý: đo được, công bằng, khuyến khích năng suất.
>
> Sau một tháng: số áo tăng 40%. Và tỉ lệ áo bị trả lại tăng 300%.
>
> Không ai gian dối. Họ chỉ **tối ưu đúng cái được đo**.
>
> Cách chữa không phải bỏ chỉ số. Là thêm một chỉ số **đối trọng**: số áo hoàn thành **và** tỉ lệ bị trả lại.

Mọi chỉ số một mình đều dẫn tới một hành vi lệch. Cặp chỉ số đối trọng thì không.

## Ví dụ nhỏ

```text
Chỉ số                        Chỉ số đối trọng
số đơn hàng                   tỉ lệ huỷ đơn
thời gian phản hồi hỗ trợ     tỉ lệ giải quyết được
số tính năng giao mỗi tháng   số sự cố production
tỉ lệ trả lời được của AI     tỉ lệ bịa
```

## Code chạy thế nào

**Chọn chỉ số — ba đặc điểm của một chỉ số tốt:**

```text
① PHẢN ÁNH GIÁ TRỊ THẬT, không phản ánh hoạt động
   ❌ "số lần mở trang báo cáo"     — hoạt động
   ✅ "số quyết định đặt hàng dựa trên báo cáo" — giá trị
   ⇒ Chỉ số hoạt động dễ đo hơn, và đó là lý do nó hay được chọn.

② ĐỔI ĐƯỢC bởi việc bạn làm
   Chỉ số phụ thuộc vào mười thứ khác thì bạn không học được gì
   từ nó.

③ ĐO ĐƯỢC TRƯỚC KHI LÀM
   ⇒ Không có con số cơ sở thì "tăng 20%" không có nghĩa.
   ⇒ Đây là lý do phải chọn chỉ số TRƯỚC, không phải sau.
```

**Bốn loại chỉ số, và loại nào nói được gì:**

```text
CHẤP NHẬN     bao nhiêu người đã dùng lần đầu
              ⇒ nói về việc họ có BIẾT và có THỬ không
GIỮ LẠI       bao nhiêu người dùng lại
              ⇒ nói về việc nó có THẬT SỰ hữu ích không
              ⇒ Đây là chỉ số quan trọng nhất và hay bị bỏ
CƯỜNG ĐỘ      dùng bao nhiêu lần mỗi người
KẾT QUẢ       việc họ cần làm có xong nhanh hơn không

⇒ Chấp nhận cao + giữ lại thấp = họ thử rồi bỏ.
  Đây là mẫu phổ biến nhất, và nó chỉ ra vấn đề khác hẳn
  so với chấp nhận thấp ([[nguoi-dung-va-luong-cong-viec]]).
```

## Cú pháp

**Đo cái dễ đo — cạm bẫy phổ biến nhất:**

```text
Dễ đo:      số lần bấm, thời gian trên trang, số request
Khó đo:     người dùng có giải quyết được việc của họ không

⇒ Người ta chọn cái dễ đo, rồi tối ưu nó.
⇒ Kết quả: "thời gian trên trang tăng 40%" — nghe tốt.
  Nhưng nó cũng có thể nghĩa là người dùng đang loay hoay
  không tìm được thứ cần.

⇒ Với mỗi chỉ số dễ đo, hỏi: "con số này TĂNG vì lý do tệ được không?"
  Được ⇒ cần chỉ số đối trọng.
```

**Chỉ số đối trọng — cách chọn:**

```text
Với mỗi chỉ số, hỏi: "nếu tôi tối ưu điều này bằng mọi giá,
cái gì sẽ xấu đi?"

  Tối ưu "số đơn hàng"        → chất lượng đơn, tỉ lệ huỷ
  Tối ưu "tốc độ phản hồi"    → chất lượng câu trả lời
  Tối ưu "số tính năng"       → chất lượng, số sự cố
  Tối ưu "chi phí hạ tầng"    → độ tin cậy, độ trễ

⇒ Cái xấu đi đó chính là chỉ số đối trọng cần theo dõi.
```

**Ba mức đo, tuỳ quy mô việc:**

```text
VIỆC NHỎ (vài ngày)
  Không cần chỉ số riêng. Đủ khi: người yêu cầu nói "đúng rồi".

VIỆC VỪA (vài tuần)
  Một chỉ số + một đối trọng, đo trước và sau.

VIỆC LỚN (nhiều tháng)
  Một chỉ số chính, vài chỉ số phụ, và các MỐC trung gian
  ⇒ Không chờ tới cuối mới đo. Mỗi phần giao được nên đo được
    ([[cat-pham-vi-va-uu-tien]]).
```

```text
Đặt chỉ số cho mọi việc nhỏ là một cách làm chậm đội và tạo ra
những con số không ai dùng.
⇒ Chọn chỗ để đo, giống như chọn chỗ để đào sâu vào yêu cầu.
```

**Khi chỉ số không đổi — ba khả năng:**

```text
① Tính năng không được dùng
   ⇒ Kiểm chỉ số chấp nhận trước. Có thể chỉ là không ai biết.
② Tính năng được dùng nhưng không giải quyết vấn đề
   ⇒ Vấn đề thật khác với vấn đề bạn nghĩ.
③ Chỉ số sai — nó không phản ánh giá trị của việc này
   ⇒ Khả năng này hay bị bỏ qua, và nó xảy ra thường xuyên.

⇒ Phân biệt ba khả năng này bằng cách xem chỉ số chấp nhận
  và giữ lại trước khi kết luận.
```

## Tại sao cần nó

Vì không đo thì mọi quyết định sau đó là đoán:

```text
Không có chỉ số:
  "Tính năng này có thành công không?" ⇒ ai nói to hơn thì thắng.
  "Nên đầu tư thêm không?"            ⇒ theo cảm giác.
  "Có nên bỏ nó không?"               ⇒ không ai dám bỏ.

Có chỉ số:
  "Chấp nhận 30%, giữ lại 8%" ⇒ người ta thử rồi bỏ
  ⇒ Câu hỏi tiếp theo rõ ràng: vì sao họ bỏ?
```

**Và một điều về việc bỏ tính năng:**

```text
Không có chỉ số thì không ai dám bỏ tính năng nào — vì không
chứng minh được nó không được dùng.
⇒ Hệ thống chỉ phình ra, không bao giờ nhỏ lại.
⇒ Chỉ số cho phép bạn XOÁ, và xoá là một trong những việc
  giá trị nhất mà ít ai làm ([[no-ky-thuat-va-refactor]]).
```

**Bốn thứ nên có cho một tính năng đáng kể:**

```text
□ Chỉ số chính, và con số cơ sở đo TRƯỚC khi làm
□ Chỉ số đối trọng
□ Mốc thời gian đánh giá (2 tuần? 1 tháng?)
□ Ngưỡng để quyết định: đạt thì làm tiếp, không đạt thì làm gì

⇒ Điểm cuối hay bị bỏ, và nó là điểm biến chỉ số thành một
  quyết định thay vì một con số để ngắm.
```

## So sánh

| Loại chỉ số | Dễ đo | Nói lên giá trị |
|---|---|---|
| Số lần bấm, thời gian trên trang | ✅ | thấp |
| Chấp nhận (dùng lần đầu) | ✅ | vừa |
| Giữ lại (dùng lại) | ✅ | **cao** |
| Kết quả (việc xong nhanh hơn) | khó | **cao nhất** |

## Dễ nhầm

**1. Không chọn chỉ số trước khi làm.** Không có con số cơ sở.

**2. Đo hoạt động thay vì giá trị.**

**3. Không có chỉ số đối trọng.** Đội tối ưu theo hướng lệch.

**4. Chọn cái dễ đo vì nó dễ đo.**

**5. Chỉ đo chấp nhận, không đo giữ lại.**

**6. Đặt chỉ số cho mọi việc nhỏ.** Tạo ra số không ai dùng.

**7. Chờ tới cuối dự án lớn mới đo.**

**8. Chỉ số không đổi thì kết luận "tính năng thất bại".** Có ba khả năng.

**9. Không có ngưỡng quyết định.** Con số để ngắm.

**10. Không dùng chỉ số để bỏ tính năng.** Hệ thống chỉ phình.

## Mẹo nhớ

> **Cái gì được ĐO thì được TỐI ƯU. Nên mọi chỉ số cần một CHỈ SỐ ĐỐI TRỌNG.**
>
> **Chọn chỉ số TRƯỚC khi làm — không có con số cơ sở thì "tăng 20%" vô nghĩa.**
>
> **Chấp nhận cao + giữ lại thấp = họ thử rồi bỏ. Hai vấn đề khác nhau.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba đặc điểm của một chỉ số tốt?
2. Bốn loại chỉ số, loại nào quan trọng nhất và hay bị bỏ?
3. Cách tìm chỉ số đối trọng?
4. Ba mức đo tuỳ quy mô việc?
5. Ba khả năng khi chỉ số không đổi?

## Tự viết lại

Không nhìn lại, chọn chỉ số cho từng tính năng:

```text
① Tìm kiếm sản phẩm nhanh hơn
② Trợ lý AI trả lời câu hỏi khách hàng
③ Trang quản lý khuyến mãi cho nhân viên
④ Giảm thời gian tải trang chủ
```

Với mỗi cái: chỉ số chính, chỉ số đối trọng, mốc đánh giá, và ngưỡng quyết định.

Tự kiểm: ở ②, chỉ số đối trọng của bạn là gì — và nếu không có, đội có thể tối ưu theo hướng nào gây hại?

## Thử sức

Đội bạn ra mắt trợ lý AI hỗ trợ khách hàng. Chỉ số theo dõi: "tỉ lệ câu hỏi được trợ lý trả lời" — hiện 78% và đang tăng.

Ba câu để trả lời: con số này có thể tăng vì lý do tệ nào; chỉ số đối trọng bạn thêm; và nếu sau khi thêm, bạn phát hiện 78% đó gồm 15% câu trả lời sai, bạn báo cáo và đề xuất gì. Câu khó nhất: nếu bỏ chỉ số 78% đi và chỉ dùng chỉ số đối trọng, điều đó sẽ dẫn tới hành vi lệch nào khác — và vì sao cần **cả hai**?
