---
title: Vận hành trên cloud
slug: van-hanh-tren-cloud
summary: Vùng khả dụng, chuyển đổi dự phòng, sao lưu, và những giả định của cloud mà bạn phải thiết kế theo.
level: nang-cao
tags: [cloud, van-hanh, do-tin-cay, devops]
khung: v2
---

> **Sau bài này bạn sẽ:** thiết kế theo đúng những gì cloud thật sự đảm bảo, và biết bốn thứ phải chuẩn bị trước sự cố.

## Ý tưởng chính

Cloud không làm hệ thống của bạn đáng tin hơn. Nó cho bạn **công cụ** để làm điều đó — và mặc định của nó thì không.

Máy ảo sẽ bị dừng để bảo trì. Đĩa sẽ hỏng. Một vùng khả dụng sẽ mất. Nhà cung cấp **nói trước** rằng những chuyện đó sẽ xảy ra — điều đó nằm trong cam kết dịch vụ của họ.

Nên câu hỏi thiết kế là: *"khi nó xảy ra, hệ thống của tôi làm gì?"*

## Mental model

Hãy nghĩ tới **thuê nhà so với ở nhà mình**.

> Ở nhà mình: ống nước hỏng thì bạn tự sửa, và bạn biết mọi thứ ở đâu.
>
> Thuê nhà: chủ nhà lo phần kết cấu và hệ thống chung. Tiện hơn nhiều.
>
> Nhưng hợp đồng có những dòng bạn phải đọc: **"chủ nhà có thể sửa chữa hệ thống điện với thông báo trước 24 giờ"**. Nghĩa là sẽ có ngày mất điện, và đó **không phải lỗi của ai** — nó nằm trong hợp đồng.
>
> Người thuê chuẩn bị: có đèn pin, không để đồ đông lạnh phụ thuộc hoàn toàn vào tủ, biết số điện thoại cần gọi.

Đèn pin đó là thiết kế chịu lỗi. Và điều quan trọng: **bạn chuẩn bị trước khi mất điện**, không phải trong lúc mất điện.

## Ví dụ nhỏ

```text
Cam kết điển hình:
  Máy ảo đơn lẻ       99,5%   → ~3,6 giờ downtime/tháng
  Nhiều AZ            99,99%  → ~4 phút/tháng
  Lưu trữ đối tượng   99,99%+

⇒ Một máy ảo KHÔNG được cam kết như một dịch vụ.
```

## Code chạy thế nào

**Bốn giả định của cloud mà bạn phải thiết kế theo:**

```text
① MÁY ẢO SẼ BỊ DỪNG
   Bảo trì phần cứng, di chuyển giữa các máy chủ vật lý.
   Có khi báo trước, có khi không.
   ⇒ Ứng dụng phải PHI TRẠNG THÁI và khởi động lại được bất kỳ lúc nào.

② ĐĨA CỤC BỘ LÀ TẠM
   Nhiều loại máy có đĩa mất khi máy dừng.
   ⇒ Dữ liệu phải ở volume bền hoặc lưu trữ đối tượng.

③ MẠNG SẼ CHẬM VÀ ĐỨT
   Giữa các AZ có độ trễ; đôi lúc mất gói.
   ⇒ Timeout, retry có backoff, circuit breaker
     ([[thiet-ke-cho-that-bai]]).

④ MỘT AZ SẼ MẤT
   Không phải "có thể" — đã xảy ra với mọi nhà cung cấp lớn.
   ⇒ Chạy ở ≥ 2 AZ. Chi phí thấp, lợi ích lớn.
```

Bốn điều này không phải rủi ro cần phòng xa — chúng là **hành vi bình thường** của nền tảng, được ghi trong tài liệu.

**Nhiều AZ và nhiều region — hai mức rất khác nhau:**

```text
NHIỀU AZ (trong một region)
  Độ trễ giữa AZ: ~1 ms ⇒ CSDL đồng bộ được
  Chi phí: phí truyền dữ liệu giữa AZ, và tài nguyên dự phòng
  ⇒ Hầu như LUÔN nên làm.

NHIỀU REGION
  Độ trễ giữa region: 50–200 ms ⇒ KHÔNG đồng bộ được
  ⇒ phải chọn: nhất quán cuối cùng, hoặc một region là chính
  Chi phí: cao, và độ phức tạp cao hơn nữa
  ⇒ Chỉ khi thật sự cần: yêu cầu pháp lý, hoặc người dùng
    phân bố toàn cầu, hoặc RTO tính bằng phút
    ([[du-lieu-o-quy-mo]])
```

Nhảy từ một AZ sang nhiều region là một bước rất lớn. Nhiều đội tưởng mình cần nó khi thực ra chỉ cần nhiều AZ.

## Cú pháp

**Chuyển đổi dự phòng — chưa diễn tập thì chưa có:**

```text
CSDL quản lý sẵn có chuyển đổi tự động. Nhưng:
  □ Mất 30–120 giây — trong lúc đó ghi thất bại
  □ Kết nối đang mở bị ĐỨT ⇒ ứng dụng phải kết nối lại
  □ Ứng dụng cache DNS ⇒ vẫn gọi máy cũ tới khi restart
    ([[dns-va-phan-giai-ten]])
  □ Replica bất đồng bộ ⇒ có thể MẤT giao dịch chưa sao chép

⇒ Diễn tập: kích hoạt chuyển đổi ở staging, đo thời gian thật,
  và xem ứng dụng có tự hồi phục không.
⇒ Nhiều nhà cung cấp cho phép kích hoạt thủ công. Hãy dùng nó.
```

**Sao lưu — bốn thứ hay bị bỏ:**

```text
□ Snapshot tự động CÙNG tài khoản, cùng region
  ⇒ Mất tài khoản hoặc bị xoá do sự cố ⇒ mất cả sao lưu
  ⇒ Cần một bản ở TÀI KHOẢN KHÁC hoặc REGION KHÁC

□ Chưa bao giờ KHÔI PHỤC thử
  ⇒ Bản sao lưu chưa từng khôi phục không phải bản sao lưu
    ([[giam-sat-va-sao-luu]])

□ Không biết RTO/RPO thật
  ⇒ Khôi phục một snapshot 500 GB mất bao lâu? Đã đo chưa?

□ Không có bảo vệ chống xoá
  ⇒ `deletion_protection`, và khoá ghi trên bucket sao lưu
```

**Bốn thứ chuẩn bị TRƯỚC sự cố:**

```text
① Runbook cho các sự cố đã lường: mất AZ, CSDL chuyển đổi,
   hết hạn chứng chỉ, hết quota
② Biết QUOTA của mình và cảnh báo khi gần chạm
   ⇒ hết quota giữa lúc mở rộng là một sự cố tự gây ra,
     và nó thường xảy ra đúng lúc tải cao
③ Có kênh liên lạc và tài khoản hỗ trợ SẴN SÀNG
   ⇒ tìm cách mở ticket lúc đang cháy là quá muộn
④ Biết trạng thái nhà cung cấp ở đâu, và đăng ký nhận thông báo
   ⇒ nhiều "sự cố của chúng ta" thật ra là sự cố của họ
```

Điểm ② đáng nhấn: quota là giới hạn mềm mà đội thường không biết mình có, và nó chỉ lộ ra khi bạn cần mở rộng gấp.

## Tại sao cần nó

Vì cloud dịch chuyển loại công việc, không xoá bỏ nó:

```text
Không dùng cloud:  bạn lo phần cứng, mạng vật lý, nguồn điện
Dùng cloud:        bạn lo cấu hình, IAM, quota, chi phí,
                   và thiết kế chịu lỗi

⇒ Số việc không giảm nhiều. Nhưng nó CHUYỂN từ những việc
  không tạo giá trị sang những việc thật sự thuộc hệ thống của bạn.
```

**Danh sách kiểm cho một hệ thống production trên cloud:**

```text
□ Chạy ở ≥ 2 AZ
□ Ứng dụng phi trạng thái, khởi động lại được bất kỳ lúc nào
□ Dữ liệu ở dịch vụ quản lý sẵn hoặc volume bền, KHÔNG ở đĩa cục bộ
□ Sao lưu ở tài khoản/region khác, và ĐÃ THỬ khôi phục
□ Bảo vệ chống xoá cho CSDL và bucket sao lưu
□ Timeout, retry có backoff cho mọi lời gọi ngoài
□ Cảnh báo: ngân sách chi phí, quota, chứng chỉ, sao lưu thất bại
□ Hạ tầng bằng mã, ở git ([[ha-tang-bang-ma]])
□ Không có access key dài hạn ([[iam-va-quyen-truy-cap]])
□ Runbook cho các sự cố đã lường
```

**Và một nhắc nhở về chi phí:** trên cloud, một cấu hình sai không chỉ gây sự cố — nó **gửi hoá đơn**. Một job vòng lặp gọi API, một môi trường test quên tắt, một truyền dữ liệu liên region không cần thiết đều là những thứ chỉ phát hiện vào cuối tháng nếu không có cảnh báo ngân sách ([[chi-phi-ha-tang]]).

## So sánh

| | Một AZ | Nhiều AZ | Nhiều region |
|---|---|---|---|
| Chống mất máy | ❌ | ✅ | ✅ |
| Chống mất trung tâm dữ liệu | ❌ | ✅ | ✅ |
| Chống mất cả vùng | ❌ | ❌ | ✅ |
| CSDL đồng bộ được | — | ✅ | ❌ |
| Chi phí | thấp | vừa | **cao** |
| Nên làm | không | gần như luôn | khi thật cần |

## Dễ nhầm

**1. Tin cloud tự làm hệ thống đáng tin.** Nó cho công cụ; mặc định thì không.

**2. Chạy production ở một AZ.**

**3. Lưu dữ liệu trên đĩa cục bộ của máy ảo.**

**4. Sao lưu cùng tài khoản, cùng region.**

**5. Chưa bao giờ thử khôi phục.**

**6. Chưa bao giờ diễn tập chuyển đổi dự phòng.**

**7. Không biết quota của mình.** Hết quota đúng lúc cần mở rộng.

**8. Ứng dụng cache DNS vĩnh viễn.** Chuyển đổi dự phòng không có tác dụng.

**9. Không có cảnh báo ngân sách.** Phát hiện vào cuối tháng.

**10. Nhảy sang nhiều region khi chỉ cần nhiều AZ.**

## Mẹo nhớ

> **Cloud NÓI TRƯỚC rằng máy sẽ dừng, đĩa sẽ hỏng, AZ sẽ mất. Hãy thiết kế theo đó.**
>
> **Nhiều AZ: gần như luôn nên. Nhiều region: chỉ khi thật cần.**
>
> **Chưa diễn tập chuyển đổi và khôi phục thì chưa có chúng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn giả định của cloud bạn phải thiết kế theo?
2. Nhiều AZ khác nhiều region ở điểm nào quyết định?
3. Chuyển đổi dự phòng CSDL có bốn điều gì cần lưu ý?
4. Bốn thứ hay bị bỏ trong sao lưu?
5. Bốn thứ chuẩn bị trước sự cố?

## Tự viết lại

Không nhìn lại, thiết kế cho một hệ thống có web, worker, Postgres, Redis, bucket ảnh:

```text
① phân bố qua AZ
② nơi lưu từng loại dữ liệu
③ chiến lược sao lưu, kèm RPO/RTO nhắm tới
④ năm cảnh báo cần có
⑤ hai diễn tập cần chạy, tần suất
```

Tự kiểm: ở ③, con số RTO của bạn là ước lượng hay đã đo — và nếu chưa đo, bạn đo bằng cách nào?

## Thử sức

Nhà cung cấp thông báo sự cố ở một AZ. Hệ thống của bạn chạy ở đúng AZ đó, một máy ảo, CSDL cùng chỗ. Bạn có snapshot hằng ngày, cùng region.

Ba câu để trả lời: bạn làm gì **ngay bây giờ**, theo thứ tự; sau khi khôi phục, ba thay đổi ưu tiên cao nhất; và bạn viết gì trong hậu kiểm. Câu khó nhất: snapshot cùng region — nếu sự cố là **cả region** chứ không phải một AZ, bạn còn gì trong tay, và điều đó đổi ưu tiên ở câu hai ra sao?
