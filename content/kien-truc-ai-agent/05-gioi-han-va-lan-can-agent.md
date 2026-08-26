---
title: Giới hạn và lan can cho agent
slug: gioi-han-va-lan-can-agent
summary: Trần bước, trần chi phí, quyền tối thiểu, điểm dừng cho người — bốn lan can không thể thiếu.
level: nang-cao
tags: [ai, agent, bao-mat, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** đặt bốn lan can bắt buộc cho agent, và biết chỗ nào phải có người xác nhận.

## Ý tưởng chính

Agent tự quyết định hành động. Nên câu hỏi thiết kế không phải *"nó có làm đúng không"* mà **"nếu nó làm sai, thiệt hại tối đa là bao nhiêu?"**

Lan can không phải để agent làm đúng hơn. Chúng để **giới hạn thiệt hại** khi nó làm sai — và nó sẽ làm sai một tỉ lệ nào đó.

## Mental model

Hãy nghĩ tới **đường đèo có lan can**.

> Lan can không làm tài xế lái giỏi hơn. Nó không ngăn được việc đánh lái sai.
>
> Nó chỉ làm một việc: **biến một cú lệch tay thành một vết xước, thay vì một cú rơi xuống vực**.
>
> Và nó được đặt ở đúng những chỗ **hậu quả nghiêm trọng nhất** — không phải rải đều khắp đường.

Hai điều đó áp dụng nguyên vẹn: lan can nhắm vào **hậu quả**, không nhắm vào **xác suất**. Và chúng đặt ở chỗ khó quay lui nhất.

## Ví dụ nhỏ

```ts
const KET_QUA = await chayAgent({
  mucTieu,
  tranBuoc: 10,
  tranChiPhi: 0.50,              // đô la cho một nhiệm vụ
  congCu: congCuChiDoc,           // agent này KHÔNG có công cụ ghi
  canXacNhan: ['guiEmail', 'hoanTien'],
})
```

## Code chạy thế nào

**Bốn lan can bắt buộc:**

```text
① TRẦN SỐ BƯỚC
   5–15 tuỳ nhiệm vụ. Chạm trần ⇒ dừng, trả kết quả một phần.
   ⇒ Chống vòng lặp vô hạn.

② TRẦN CHI PHÍ
   Tính token đã dùng, dừng khi vượt ngưỡng.
   ⇒ Trần bước KHÔNG đủ: một bước có kết quả công cụ 50.000 token
     đắt hơn năm bước nhẹ.

③ QUYỀN TỐI THIỂU
   Agent chỉ có đúng những công cụ nó cần, và mỗi công cụ chỉ
   có quyền nó cần ([[xac-thuc-va-gioi-han-cong-cu]]).
   ⇒ Agent tra cứu KHÔNG nên có công cụ gửi email.

④ ĐIỂM DỪNG CHO NGƯỜI
   Hành động khó đảo hoặc ra ngoài ⇒ dừng, hỏi, chờ xác nhận.
```

**Vì sao trần bước không đủ, và trần chi phí cũng chưa đủ:**

```text
Cần một trần thứ ba ít người đặt: TRẦN THỜI GIAN.
  Agent gọi một công cụ chậm, hoặc chờ một API treo.
  ⇒ Trần bước chưa chạm, trần chi phí chưa chạm, nhưng người dùng
    đã chờ hai phút.

⇒ Ba trần cùng lúc: BƯỚC, CHI PHÍ, THỜI GIAN. Chạm bất kỳ cái nào
  thì dừng.
```

## Cú pháp

**Phân loại hành động theo mức quay lui:**

```text
XANH — đọc, không tác dụng phụ
  tra cứu, tìm kiếm, tính toán, đọc file
  ⇒ Tự chạy.

VÀNG — ghi, đảo được dễ
  tạo nháp, thêm ghi chú, tạo file trong thư mục tạm
  ⇒ Tự chạy, có log và có đường hoàn tác.

ĐỎ — khó đảo, hoặc RA NGOÀI hệ thống
  gửi email, chuyển tiền, xoá dữ liệu, gọi API đối tác,
  đăng nội dung công khai
  ⇒ CẦN NGƯỜI XÁC NHẬN, hoặc ngưỡng tự động có giới hạn rõ.
```

```text
Ranh giới quan trọng nhất là "RA NGOÀI hệ thống":
  Một hành động bên trong hệ thống của bạn — bạn sửa được.
  Một email đã gửi, một bài đã đăng — không thu hồi được.
⇒ Nên "ra ngoài" luôn là ĐỎ, kể cả khi nghe có vẻ vô hại.
```

**Xác nhận của người — thiết kế cho dùng được:**

```text
❌ Hỏi xác nhận cho MỌI hành động
   ⇒ Người dùng bấm "đồng ý" theo phản xạ sau lần thứ mười.
   ⇒ Lan can mất tác dụng, và bạn còn tệ hơn không có nó,
     vì bạn tưởng là có.

✅ Chỉ hỏi cho hành động ĐỎ, và hỏi cho ĐỦ THÔNG TIN:
   "Gửi email tới khach@vd.com với nội dung: [xem]. Đồng ý?"
   ⇒ Nói rõ SẼ LÀM GÌ, với AI, và nội dung gì.
   ⇒ Cho phép SỬA trước khi đồng ý, không chỉ đồng ý/từ chối.
```

Điểm về "bấm theo phản xạ" là điểm quyết định: **một lan can bị bỏ qua thường xuyên thì tệ hơn không có**, vì nó tạo cảm giác an toàn giả.

**Ngưỡng tự động — giữ tự động hoá mà vẫn chặn thiệt hại lớn:**

```text
hoàn tiền < 200.000đ        → tự động
hoàn tiền ≥ 200.000đ        → người duyệt
gửi email cho khách hàng    → tự động nếu dùng MẪU đã duyệt
gửi email nội dung tự do    → người duyệt
xoá bản ghi                 → không bao giờ tự động (dùng xoá mềm)
```

```text
Mẫu "xoá mềm" đáng chú ý: thay vì cấm agent xoá, cho nó đánh dấu
đã xoá. Hành động trở nên ĐẢO ĐƯỢC ⇒ chuyển từ ĐỎ sang VÀNG
([[xoa-mem-va-vong-doi-ban-ghi]]).

⇒ Đây là kỹ thuật chung: THIẾT KẾ LẠI hành động để nó đảo được,
  thay vì thêm một lớp xác nhận.
```

**Môi trường bị giới hạn — cho agent chạy mã hoặc lệnh:**

```text
Agent chạy lệnh shell hoặc mã ⇒ phải trong môi trường cách ly:
  □ Container riêng, không có quyền vào mạng nội bộ
  □ Không có thông tin đăng nhập của production
  □ Hệ thống file chỉ ghi được vào thư mục tạm
  □ Giới hạn CPU, RAM, thời gian
  □ Danh sách lệnh CHO PHÉP, không phải danh sách lệnh CẤM
    ⇒ Danh sách cấm luôn thiếu; danh sách cho phép thì không.
```

Nguyên tắc "danh sách cho phép thay vì danh sách cấm" là nguyên tắc bảo mật chung, và nó đặc biệt đúng ở đây vì bạn không đoán được agent sẽ nghĩ ra lệnh gì.

## Tại sao cần nó

Vì agent kết hợp hai thứ nguy hiểm khi đi cùng nhau:

```text
① Nó QUYẾT ĐỊNH hành động — bạn không duyệt từng cái
② Nó chịu ảnh hưởng của DỮ LIỆU trong ngữ cảnh — kể cả dữ liệu
   do người ngoài đưa vào ([[prompt-injection]])

⇒ Kết hợp: một tài liệu độc hại có thể khiến agent thực hiện
  hành động mà không ai yêu cầu.
⇒ Và không có lan can nào ở tầng prompt chặn được điều này
  một cách đáng tin. Chỉ có giới hạn QUYỀN và ĐIỂM DỪNG.
```

**Danh sách kiểm trước khi cho agent chạy trên production:**

```text
□ Ba trần: bước, chi phí, thời gian
□ Quyền tối thiểu cho mỗi công cụ
□ Phân loại xanh/vàng/đỏ cho mọi hành động
□ Điểm dừng cho mọi hành động ĐỎ
□ Log toàn bộ: mỗi bước, mỗi công cụ, mỗi tham số, mỗi kết quả
□ Nút DỪNG cho người dùng, dùng được giữa chừng
□ Môi trường cách ly nếu agent chạy mã hoặc lệnh
□ Đã chạy chế độ chỉ-ghi-log một thời gian
  ([[cong-cu-trong-thuc-te]])
□ Cảnh báo khi tỉ lệ chạm trần tăng
```

**Và một điều nên nói rõ:**

```text
Lan can làm agent KÉM LINH HOẠT HƠN. Đó là điều đúng như thiết kế.

Nếu bạn thấy lan can đang cản trở quá nhiều, câu trả lời thường
KHÔNG phải là gỡ lan can — mà là bài toán này chưa phù hợp
với agent tự chạy ([[agent-la-gi-va-khi-nao-can]]).
```

## So sánh

| Mức | Ví dụ | Tự chạy | Cần gì |
|---|---|---|---|
| Xanh | tra cứu, tính toán | ✅ | log |
| Vàng | tạo nháp, ghi chú | ✅ | log + hoàn tác |
| Đỏ | gửi email, chuyển tiền, xoá | ❌ | **người xác nhận** |

## Dễ nhầm

**1. Chỉ có trần số bước.** Cần cả chi phí và thời gian.

**2. Cấp mọi công cụ cho một agent.**

**3. Hỏi xác nhận cho mọi hành động.** Người dùng bấm theo phản xạ.

**4. Xác nhận không nói rõ sẽ làm gì.**

**5. Không cho sửa trước khi xác nhận.**

**6. Coi hành động ra ngoài là vô hại.**

**7. Dùng danh sách lệnh CẤM thay vì danh sách CHO PHÉP.**

**8. Cho agent chạy mã với quyền của production.**

**9. Không có nút dừng cho người dùng.**

**10. Gỡ lan can vì nó cản trở.** Có thể bài toán không hợp với agent.

## Mẹo nhớ

> **Lan can nhắm vào HẬU QUẢ, không nhắm vào xác suất.**
>
> **Ba trần: BƯỚC, CHI PHÍ, THỜI GIAN. Chạm cái nào cũng dừng.**
>
> **Một lan can bị bấm qua theo phản xạ thì TỆ HƠN không có.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn lan can bắt buộc?
2. Vì sao trần bước không đủ, và trần thứ ba là gì?
3. Ba mức xanh/vàng/đỏ, ranh giới quan trọng nhất?
4. Vì sao hỏi xác nhận cho mọi thứ lại có hại?
5. Vì sao danh sách cho phép tốt hơn danh sách cấm?

## Tự viết lại

Không nhìn lại, thiết kế lan can cho agent xử lý khiếu nại khách hàng, có các công cụ: tra đơn, tra chính sách, hoàn tiền, gửi email, tạo ticket.

```text
① phân loại xanh/vàng/đỏ cho từng công cụ
② ba trần, kèm con số
③ điểm dừng: ở đâu, hiển thị gì
④ ngưỡng tự động cho hoàn tiền
⑤ một hành động bạn thiết kế lại để nó đảo được
```

Tự kiểm: ở ⑤, bạn chuyển được hành động nào từ ĐỎ sang VÀNG — và bằng cách nào?

## Thử sức

Agent hỗ trợ của bạn đã gửi một email không phù hợp tới 40 khách hàng trước khi ai đó phát hiện. Nó có công cụ `guiEmail` với quyền gửi tới địa chỉ tuỳ ý, và không có điểm dừng.

Ba câu để trả lời: các lan can đã thiếu, xếp theo mức độ quan trọng; bạn xử lý ngay bây giờ thế nào; và bạn thiết kế lại để việc này không thể xảy ra nữa. Câu khó nhất: nếu chỉ thêm "cần xác nhận cho mỗi email" mà mỗi ngày có 300 email cần gửi, lan can đó sẽ bị bỏ qua — bạn thiết kế cách nào để vừa giữ tự động hoá vừa chặn được ca như thế này?
