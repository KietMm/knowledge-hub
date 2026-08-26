---
title: Cắt phạm vi và ưu tiên
slug: cat-pham-vi-va-uu-tien
summary: Cắt phạm vi không phải làm ít hơn — nó là chọn phần tạo ra giá trị và giao nó trước.
level: trung-cap
tags: [san-pham, uoc-luong, dan-dat, tu-duy]
khung: v2
---

> **Sau bài này bạn sẽ:** cắt phạm vi theo cách vẫn giao được giá trị, và ưu tiên bằng tiêu chí thay vì cảm giác.

## Ý tưởng chính

Cắt phạm vi thường bị hiểu là **làm ít hơn, kém hơn**. Đó là cách cắt tệ nhất.

Cách cắt đúng: tìm **phần nhỏ nhất vẫn giải quyết được vấn đề cho một nhóm người dùng**, giao nó, rồi mở rộng dựa trên phản hồi thật.

## Mental model

Hãy nghĩ tới **xây một cây cầu qua sông**.

> **Cắt tệ**: xây cả cầu nhưng thiếu lan can, thiếu mặt đường hoàn thiện, thiếu đèn. Chưa ai qua được, và bạn không biết cầu có đúng chỗ không.
>
> **Cắt đúng**: xây một **cây cầu tạm hẹp** qua đúng khúc sông đó. Người đi bộ qua được ngay hôm nay. Bạn thấy có bao nhiêu người qua, họ đi giờ nào, và có nên mở rộng không.
>
> Cả hai đều "làm một phần". Nhưng cách thứ hai **giao được giá trị**, và nó cho bạn thông tin để làm tiếp.

Nguyên tắc: cắt theo **chiều dọc** (một luồng hoàn chỉnh, hẹp) chứ không cắt theo **chiều ngang** (nhiều phần dở dang).

## Ví dụ nhỏ

```text
Tính năng: "Quản lý khuyến mãi" — 6 tuần.

❌ Cắt ngang:  làm xong phần tạo mã, chưa có phần áp dụng
               ⇒ chưa ai dùng được gì
✅ Cắt dọc:    một loại khuyến mãi duy nhất (giảm % toàn đơn),
               tạo được, áp dụng được, báo cáo được — 1 tuần
               ⇒ dùng được thật, và học được nhiều
```

## Code chạy thế nào

**Bốn cách cắt phạm vi, theo thứ tự nên thử:**

```text
① CẮT THEO NHÓM NGƯỜI DÙNG
   Làm cho nhóm quan trọng nhất trước.
   "Chỉ cho quản trị viên, chưa cho khách hàng" — nửa công việc.

② CẮT THEO TRƯỜNG HỢP
   Làm ca phổ biến nhất, chưa làm ca biên.
   "Chỉ hỗ trợ một loại khuyến mãi, chưa hỗ trợ kết hợp nhiều loại"
   ⇒ Cách hiệu quả nhất: 20% loại ca thường chiếm 80% lượng dùng.

③ CẮT THEO TỰ ĐỘNG HOÁ
   Làm phần logic, phần vận hành làm tay trước.
   "Chưa có giao diện quản lý, admin sửa trực tiếp trong CSDL"
   ⇒ Nghe thô, nhưng nếu chỉ có ba người dùng thì đây là lựa chọn
     đúng — và nó cho bạn biết có đáng làm giao diện không.

④ CẮT THEO HOÀN THIỆN
   Giao diện đơn giản, chưa tối ưu, chưa đẹp.
   ⇒ Cắt cuối cùng, vì nó ảnh hưởng cảm nhận người dùng.
```

**Ba thứ KHÔNG được cắt:**

```text
□ TÍNH ĐÚNG ĐẮN
  Tính sai tiền, mất dữ liệu ⇒ không phải "phiên bản đầu",
  đó là lỗi.

□ BẢO MẬT VÀ PHÂN QUYỀN
  "Phiên bản đầu chưa kiểm quyền" là một lỗ hổng, không phải
  một phạm vi bị cắt ([[phan-quyen-theo-ban-ghi]]).

□ KHẢ NĂNG SỬA SAU
  Cắt bằng cách chọn một mô hình dữ liệu không mở rộng được
  ⇒ bạn vừa tiết kiệm một tuần và tạo ra một dự án di chuyển
    ([[ra-quyet-dinh-ky-thuat]]).
```

```text
Ba thứ này là ranh giới. Cắt vào chúng không phải cắt phạm vi —
đó là vay nợ với lãi suất rất cao, và người vay thường không
biết mình đang vay.
```

## Cú pháp

**Ưu tiên bằng tiêu chí, không bằng cảm giác:**

```text
Với mỗi việc, ước lượng hai con số:
  GIÁ TRỊ    bao nhiêu người dùng, bao nhiêu lần, tiết kiệm gì
  CHI PHÍ    bao nhiêu ngày

Rồi xếp theo GIÁ TRỊ / CHI PHÍ.

⇒ Đơn giản, và nó đủ tốt cho phần lớn trường hợp.
⇒ Điểm mạnh thật: nó buộc nói ra GIÁ TRỊ bằng con số, thay vì
  "cái này quan trọng".
```

**Ba loại việc cần đối xử riêng:**

```text
① RỦI RO — có thể làm hỏng thứ khác hoặc chặn việc khác
   ⇒ Làm SỚM, dù giá trị thấp. Biết sớm thì rẻ hơn.
   ⇒ Ví dụ: một quyết định về mô hình dữ liệu mà mọi thứ
     phụ thuộc vào.

② KHÔNG ĐẢO ĐƯỢC
   ⇒ Cân nhắc kỹ hơn tỉ lệ giá trị/chi phí gợi ý.

③ ĐANG CHẶN NGƯỜI KHÁC
   ⇒ Ưu tiên cao dù nhỏ. Một việc nửa ngày chặn hai người
     một tuần là một việc rất đắt.
```

**"Không làm" là một lựa chọn — và thường là lựa chọn đúng:**

```text
Với mỗi yêu cầu, luôn xét: KHÔNG LÀM thì sao?

  □ Có bao nhiêu người thật sự cần?
  □ Họ đang làm thế nào? Có chịu được không?
  □ Nếu chờ ba tháng nữa, có gì thay đổi?

⇒ Danh sách việc luôn dài hơn thời gian có. Nên phần lớn quyết
  định là quyết định KHÔNG LÀM — và nói ra rõ ràng tốt hơn
  là để nó nằm mãi trong danh sách.
```

**Nói "không" mà không đối đầu:**

```text
❌ "Việc đó không quan trọng."
❌ "Không có thời gian."

✅ "Trong hai tuần này mình làm được A và B. C thì phải sang
    đợt sau. Nếu C quan trọng hơn B, mình đổi — bạn thấy cái
    nào cần trước?"

⇒ Chuyển từ "làm hay không làm" thành "cái gì trước".
⇒ Đó là câu hỏi người quyết định trả lời được, và nó đặt
  đánh đổi lên bàn thay vì để bạn tự gánh
  ([[uoc-luong-va-pham-vi]]).
```

## Tại sao cần nó

Vì phạm vi lớn có ba chi phí mà không ai tính khi bắt đầu:

```text
① GIAO MUỘN ⇒ HỌC MUỘN
   Sáu tuần mới có phản hồi. Nếu hướng sai, bạn sai sáu tuần.
   ⇒ Đây là chi phí lớn nhất và ít được nói tới.

② RỦI RO TẬP TRUNG
   Một lần giao lớn ⇒ nhiều thứ có thể hỏng cùng lúc,
   và khó biết cái nào gây ra ([[trien-khai-an-toan]]).

③ LÀM THỨ KHÔNG AI DÙNG
   Phạm vi lớn thường chứa những phần "cho đầy đủ" —
   và chúng thường không được dùng.
```

**Và một cách nhìn về việc cắt:**

```text
Cắt phạm vi không phải nhượng bộ. Nó là cách BIẾT SỚM mình
có đang làm đúng không.

⇒ Giao một tuần rồi đo còn tốt hơn giao sáu tuần rồi mới biết.
⇒ Và phần bạn cắt đi có thể hoá ra không cần làm — đó là lợi ích,
  không phải mất mát.
```

**Ba câu hỏi trước khi bắt đầu một việc lớn:**

```text
① Phần nhỏ nhất vẫn dùng được là gì?
② Nếu chỉ làm phần đó, ai được lợi và lợi bao nhiêu?
③ Sau khi giao phần đó, tôi sẽ BIẾT thêm gì để quyết định
   phần tiếp theo?

⇒ Câu ③ là câu quan trọng nhất: nếu giao phần đầu không cho bạn
  thông tin gì mới, có thể bạn đang cắt ngang chứ không cắt dọc.
```

## So sánh

| Cách cắt | Giao được giá trị | Học được gì | Rủi ro |
|---|---|---|---|
| Theo nhóm người dùng | ✅ | nhóm đó có dùng không | thấp |
| Theo trường hợp | ✅ | ca nào thật sự phổ biến | thấp |
| Theo tự động hoá | ✅ | có đáng tự động không | thấp |
| Theo hoàn thiện | ✅ | — | cảm nhận người dùng |
| Cắt ngang (nhiều phần dở) | ❌ | không | cao |

## Dễ nhầm

**1. Cắt ngang thay vì cắt dọc.** Nhiều phần dở, chưa ai dùng được.**

**2. Cắt vào tính đúng đắn.** Đó là lỗi, không phải phạm vi.

**3. Cắt vào bảo mật.** Đó là lỗ hổng.

**4. Cắt bằng cách chọn mô hình dữ liệu không mở rộng được.**

**5. Ưu tiên bằng cảm giác.** Buộc nói ra giá trị bằng con số.

**6. Không đối xử riêng với việc rủi ro và việc đang chặn người khác.**

**7. Không xét "không làm thì sao".**

**8. Nói "không" thay vì hỏi "cái gì trước".**

**9. Không hỏi "giao phần này thì tôi biết thêm gì".**

**10. Coi cắt phạm vi là nhượng bộ.**

## Mẹo nhớ

> **Cắt DỌC (một luồng hẹp, dùng được) chứ không cắt NGANG (nhiều phần dở).**
>
> **Ba thứ không được cắt: TÍNH ĐÚNG ĐẮN, BẢO MẬT, KHẢ NĂNG SỬA SAU.**
>
> **Đổi câu hỏi từ "làm hay không" thành "CÁI GÌ TRƯỚC".**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Cắt dọc khác cắt ngang thế nào?
2. Bốn cách cắt phạm vi, cách nào hiệu quả nhất?
3. Ba thứ không được cắt, và vì sao cắt vào chúng không phải cắt phạm vi?
4. Ba loại việc cần đối xử riêng khi ưu tiên?
5. Ba câu hỏi trước khi bắt đầu việc lớn, câu nào quan trọng nhất?

## Tự viết lại

Yêu cầu: *"Hệ thống báo cáo doanh thu đầy đủ: theo ngày/tuần/tháng, theo sản phẩm, theo nhân viên, theo chi nhánh, xuất Excel và PDF, gửi email tự động."* Ước lượng 5 tuần.

Không nhìn lại, viết:

```text
① phiên bản một tuần, cắt dọc
② ai dùng được nó và lợi gì
③ giao nó rồi bạn biết thêm gì
④ ba thứ bạn KHÔNG cắt
⑤ cách trình bày cho người yêu cầu
```

Tự kiểm: phiên bản một tuần của bạn có ai dùng được **thật** không, hay nó vẫn là một phần dở?

## Thử sức

Sếp muốn một tính năng lớn xong trong bốn tuần. Bạn ước lượng tám tuần. Sếp nói "cứ làm nhanh hơn đi".

Ba câu để trả lời: bạn đề xuất cắt gì để có phiên bản bốn tuần dùng được; bạn trình bày thế nào để đây là một lựa chọn chứ không phải một lời từ chối; và bạn nói rõ điều gì về những phần bị cắt. Câu khó nhất: nếu để đạt bốn tuần bạn phải cắt vào phần kiểm quyền, bạn phản ứng thế nào — và bạn giải thích ranh giới đó cho sếp bằng lập luận gì?
