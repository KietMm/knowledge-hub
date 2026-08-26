---
title: Kiến trúc hướng sự kiện
slug: kien-truc-huong-su-kien
summary: Sự kiện khác lệnh, event sourcing khác event notification, và cái giá thật của việc cắt rời luồng.
level: nang-cao
tags: [kien-truc, su-kien, bat-dong-bo, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** phân biệt sự kiện với lệnh, chọn được mức event-driven phù hợp, và biết cái gì khó hơn hẳn khi luồng bị cắt rời.

## Ý tưởng chính

Trong kiến trúc thông thường, A **gọi** B và chờ kết quả. A biết B tồn tại, biết B cần gì, và phụ thuộc vào việc B đang sống.

Trong kiến trúc hướng sự kiện, A **thông báo** rằng một việc đã xảy ra. Ai quan tâm thì tự phản ứng. A không biết có bao nhiêu người nghe.

Đổi lại sự độc lập đó, bạn mất khả năng theo dõi một luồng từ đầu tới cuối trong một chỗ.

## Mental model

Hãy nghĩ tới **hai cách thông báo trong công ty**.

> **Gọi điện từng người** (gọi trực tiếp): "Kho ơi, trừ hàng nhé." "Kế toán ơi, ghi sổ nhé." Bạn phải **biết danh sách** và **gọi được từng người**. Ai nghỉ phép thì việc đó không xong, và bạn phải xử lý.
>
> **Dán thông báo lên bảng tin** (sự kiện): "Đơn hàng #42 đã được tạo." Bạn dán một lần. Ai quan tâm thì tự đọc và làm việc của mình. Thêm một phòng ban quan tâm — bạn không cần biết.
>
> Nhưng: **không ai biết toàn bộ chuỗi việc đã xảy ra**. Muốn biết "đơn #42 đã đi qua những đâu", bạn phải hỏi từng phòng.

Vế cuối là cái giá thật, và nó không giảm theo thời gian.

## Ví dụ nhỏ

```text
LỆNH (command)    "TruTonKho"        — ra lệnh, mong đợi được làm
                                       gửi tới MỘT nơi cụ thể
SỰ KIỆN (event)   "DonHangDaTao"     — thông báo việc ĐÃ xảy ra
                                       ai quan tâm thì nghe
```

## Code chạy thế nào

**Lệnh và sự kiện — phân biệt bằng ba dấu hiệu:**

```text
                LỆNH                    SỰ KIỆN
Thời             tương lai (hãy làm)     QUÁ KHỨ (đã xảy ra)
Tên              động từ mệnh lệnh       danh từ + đã/quá khứ
                 `TruTonKho`             `DonHangDaTao`
Người nhận       một, cụ thể             không xác định, nhiều
Từ chối được?    ✅ (validate rồi từ chối) ❌ đã xảy ra rồi
Ai phụ thuộc ai  người gửi biết người nhận  người nhận biết người gửi
```

Dòng cuối là điểm quyết định về kiến trúc: sự kiện **đảo chiều phụ thuộc**. Producer không biết consumer, nên thêm consumer không sửa producer.

**Ba mức event-driven — chọn mức thấp nhất đủ dùng:**

```text
① EVENT NOTIFICATION (thông báo mỏng)
   Sự kiện chỉ chứa ID: { donHangId: '42' }
   Ai cần chi tiết thì tự gọi API lấy.
   + Đơn giản nhất, sự kiện nhỏ, không sợ dữ liệu cũ
   − Consumer phải gọi lại producer ⇒ vẫn có phụ thuộc thời gian thực

② EVENT-CARRIED STATE TRANSFER (sự kiện mang dữ liệu)
   Sự kiện chứa đủ thông tin: { donHangId, tongTien, sanPham: [...] }
   + Consumer KHÔNG cần gọi lại ⇒ độc lập thật sự
   − Sự kiện lớn hơn; dữ liệu trong đó có thể đã cũ;
     đổi hình dạng sự kiện là thay đổi hợp đồng

③ EVENT SOURCING
   KHÔNG lưu trạng thái hiện tại. Chỉ lưu chuỗi sự kiện.
   Trạng thái = phát lại toàn bộ sự kiện.
   + Lịch sử đầy đủ, kiểm toán được, dựng lại được trạng thái
     ở bất kỳ thời điểm
   − Rất phức tạp: schema sự kiện phải sống mãi, cần snapshot,
     truy vấn "trạng thái hiện tại" không còn tầm thường
```

```text
Mức ② là điểm cân bằng đúng cho phần lớn hệ thống.
Mức ③ đáng ở rất ít nơi — chủ yếu là kế toán, giao dịch tài chính,
nơi lịch sử LÀ nghiệp vụ, không phải một tính năng phụ.
```

## Cú pháp

**Vấn đề khó nhất: theo dõi một luồng bị cắt rời:**

```text
Gọi trực tiếp:  một stack trace, một transaction, một log.
Sự kiện:        đơn hàng tạo ở service A, kho phản ứng ở B,
                email ở C, báo cáo ở D — bốn log riêng, bốn thời điểm.

"Đơn #42 đã đi tới đâu?" trở thành một câu hỏi KHÓ.
```

```text
Ba thứ bắt buộc phải có, không phải tuỳ chọn:
  ① correlationId đi cùng MỌI sự kiện phát sinh từ một hành động gốc
     ⇒ lọc một lần ra toàn bộ chuỗi
  ② Trace phân tán ⇒ thấy được cây sự kiện, không chỉ danh sách
  ③ Sơ đồ ai phát gì, ai nghe gì — CẬP NHẬT, và sinh tự động nếu được
     ⇒ không có nó, sau một năm không ai biết ai đang nghe sự kiện nào
```

Điểm ③ là chỗ kiến trúc sự kiện hay xuống cấp: nó dễ thêm consumer tới mức không ai còn theo dõi được bức tranh tổng.

**Không có transaction xuyên service — cần saga:**

```text
Đặt hàng cần: trừ kho, trừ tiền, tạo đơn — ở ba service.
Không có transaction chung.

SAGA: chuỗi bước, mỗi bước có bước BÙ TRỪ
  ① Giữ kho        → bù: nhả kho
  ② Trừ tiền       → bù: hoàn tiền
  ③ Tạo đơn        → bù: huỷ đơn

Bước ② thất bại ⇒ chạy bù của ①.

Và điều khó nhất: bù trừ KHÔNG phải rollback.
  Rollback: như chưa từng xảy ra.
  Bù trừ:   một hành động MỚI, và nó có thể cũng thất bại.
  ⇒ Người dùng có thể thấy "đã trừ tiền" rồi "đã hoàn tiền" —
    hai thông báo, không phải im lặng.
```

Đây là lý do saga đắt: nó không chỉ là mã, nó là **một mô hình nghiệp vụ mới** mà người dùng cũng nhìn thấy ([[ranh-gioi-service]]).

**Ba đảm bảo phải xử lý:**

```text
□ AT-LEAST-ONCE  ⇒ consumer PHẢI idempotent
□ KHÔNG ĐÚNG THỨ TỰ ⇒ "DonHangDaHuy" có thể tới trước
                      "DonHangDaTao"
                      ⇒ consumer phải chịu được, hoặc dùng khoá
                        phân vùng để giữ thứ tự theo thực thể
□ SỰ KIỆN CŨ     ⇒ dữ liệu trong sự kiện có thể đã lạc hậu khi
                   được xử lý; nếu quan trọng thì gọi lại lấy bản mới
```

## Tại sao cần nó

Vì event-driven giải một vấn đề rất thật — nhưng chỉ một:

```text
Gọi trực tiếp:
  Thêm bên quan tâm thứ tư ⇒ SỬA service đặt hàng
  Service email chết ⇒ ĐẶT HÀNG THẤT BẠI
  Đặt hàng chậm bằng tổng thời gian của cả bốn lời gọi

Sự kiện:
  Thêm bên quan tâm ⇒ không sửa gì ở đặt hàng
  Service email chết ⇒ sự kiện nằm chờ, đặt hàng VẪN THÀNH CÔNG
  Đặt hàng nhanh: chỉ ghi và phát sự kiện
```

**Nhưng cái giá cũng rất thật:**

```text
□ Gỡ lỗi khó hơn hẳn — luồng nằm ở nhiều chỗ
□ Không có transaction ⇒ saga, và bù trừ mà người dùng thấy được
□ Nhất quán cuối cùng ⇒ giao diện phải xử lý trạng thái "đang xử lý"
□ Schema sự kiện là hợp đồng công khai — đổi nó khó như đổi API
□ Sự kiện mồ côi: ai đang nghe cái này? xoá được chưa?
```

**Quy tắc thực dụng:**

```text
Dùng sự kiện cho: THÔNG BÁO một việc đã xảy ra, khi có (hoặc sẽ có)
                  nhiều bên quan tâm, và họ KHÔNG cần xong ngay.

Dùng gọi trực tiếp cho: khi bạn CẦN KẾT QUẢ để đi tiếp,
                        hoặc chỉ có một bên nhận.

Và đừng chuyển cả hệ thống sang sự kiện. Trộn là bình thường:
luồng chính gọi trực tiếp, các tác động phụ đi qua sự kiện.
```

## So sánh

| | Gọi trực tiếp | Sự kiện |
|---|---|---|
| Thêm bên quan tâm | sửa producer | không sửa gì |
| Bên nhận chết | luồng chính hỏng | xử lý sau |
| Có kết quả ngay | ✅ | ❌ |
| Transaction | ✅ | saga |
| Theo dõi luồng | một stack trace | cần correlationId + trace |
| Độ phức tạp | thấp | **cao** |

## Dễ nhầm

**1. Đặt tên sự kiện như lệnh.** `TruTonKho` là lệnh, `TonKhoDaTru` là sự kiện.

**2. Dùng sự kiện khi cần kết quả ngay.** Bạn sẽ tự xây lại request-response.

**3. Không có correlationId.** Không lần được chuỗi.

**4. Không có sơ đồ ai nghe gì.** Sau một năm không ai dám xoá sự kiện nào.

**5. Consumer không idempotent.**

**6. Giả định thứ tự sự kiện.**

**7. Dùng sự kiện mang dữ liệu rồi tin dữ liệu đó luôn mới nhất.**

**8. Nhầm bù trừ với rollback.** Bù trừ là hành động mới, người dùng thấy được.

**9. Đi thẳng lên event sourcing.** Rất phức tạp, và ít nơi cần.

**10. Chuyển cả hệ thống sang sự kiện.** Trộn mới đúng.

## Mẹo nhớ

> **Lệnh = tương lai, một người nhận. Sự kiện = QUÁ KHỨ, nhiều người nghe.**
>
> **Sự kiện đảo chiều phụ thuộc — thêm consumer không sửa producer.**
>
> **Cái giá thật: luồng bị cắt rời. Bắt buộc có correlationId và trace.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba dấu hiệu phân biệt lệnh với sự kiện?
2. Ba mức event-driven, mức nào là điểm cân bằng?
3. Ba thứ bắt buộc phải có để theo dõi luồng?
4. Bù trừ khác rollback thế nào, và vì sao điều đó ảnh hưởng tới người dùng?
5. Ba đảm bảo phải xử lý ở consumer?

## Tự viết lại

Không nhìn lại, thiết kế cho *"đặt hàng"* với: kho, thanh toán, email, báo cáo.

```text
① việc nào gọi trực tiếp, việc nào qua sự kiện, vì sao
② tên các sự kiện
③ saga cho phần cần nguyên tử, kèm bước bù trừ
④ cách theo dõi một đơn hàng qua toàn bộ chuỗi
⑤ giao diện hiện gì trong lúc chưa xong
```

Tự kiểm: ở ③, nếu bước bù trừ **cũng thất bại**, thiết kế của bạn làm gì?

## Thử sức

Hệ thống dùng sự kiện cho 12 luồng. Khách hàng báo: *"Tôi đặt hàng, trừ tiền rồi, nhưng đơn hàng không xuất hiện."*

Ba câu để trả lời: bạn điều tra thế nào khi luồng nằm ở bốn service; ba nguyên nhân khả dĩ nhất; và bạn thêm gì để lần sau việc này mất vài phút thay vì vài giờ. Câu khó nhất: đã trừ tiền mà không có đơn — bạn xử lý **cho khách hàng này** ngay bây giờ thế nào, và ai quyết định điều đó?
