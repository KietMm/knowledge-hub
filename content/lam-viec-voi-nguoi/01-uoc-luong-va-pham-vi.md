---
title: Ước lượng và phạm vi
slug: uoc-luong-va-pham-vi
summary: Vì sao ước lượng luôn sai, cách nói con số mà không hứa sai, và cắt phạm vi thay vì cắt chất lượng.
level: trung-cap
tags: [dan-dat, uoc-luong, pham-vi, ke-hoach]
khung: v2
---

> **Sau bài này bạn sẽ:** đưa được con số kèm mức không chắc chắn, và biết cắt phạm vi thay vì cắt chất lượng khi bị ép.

## Ý tưởng chính

Ước lượng là **dự báo**, không phải cam kết. Nhưng người nghe hầu như luôn hiểu nó là cam kết.

Nên phần khó nhất của ước lượng không phải tính toán — mà là **truyền đạt mức không chắc chắn** sao cho nó không bị mất đi trên đường truyền.

## Mental model

Hãy nghĩ tới **dự báo thời tiết**.

> Không ai nói "ngày mai mưa lúc 14:32". Họ nói **"70% khả năng có mưa chiều mai"**.
>
> Và điều đó vẫn ra quyết định được: mang ô hay không. Nó không kém hữu ích vì có xác suất — nó **hữu ích hơn**, vì bạn biết mức tin cậy để mà cân nhắc.
>
> Dự báo càng xa, khoảng càng rộng. Không ai chờ đợi độ chính xác của dự báo 10 ngày bằng dự báo ngày mai.

Ước lượng phần mềm cũng vậy — và cũng vì cùng một lý do: bạn đang dự báo một hệ thống có quá nhiều biến chưa biết.

## Ví dụ nhỏ

```text
❌ "Ba ngày."
✅ "Nếu API của đối tác đúng như tài liệu: 3 ngày.
    Nếu phải xử lý các trường hợp lạ: 5–7 ngày.
    Tôi sẽ biết chắc hơn sau khi thử tích hợp — cho tôi nửa ngày."
```

## Code chạy thế nào

**Vì sao ước lượng luôn thấp hơn thực tế:**

```text
① Ta hình dung ĐƯỜNG ĐI SUÔN SẺ
   Không tính: review, sửa theo góp ý, họp, hỗ trợ người khác,
   sự cố production, môi trường hỏng.
   → Thời gian "làm việc thật" thường chỉ ~60% ngày làm việc.

② Cái chưa biết chỉ lộ ra khi bắt đầu làm
   "Tưởng chỉ thêm một trường" → hoá ra chạm 12 chỗ.

③ Quên phần không phải viết mã
   Test, tài liệu, migration, triển khai, theo dõi sau khi lên.

④ Áp lực xã hội
   Ai cũng đoán rằng con số thấp thì được đánh giá cao hơn.
```

Nguyên nhân ① và ③ có thể sửa bằng thói quen. Nguyên nhân ② thì không sửa được — chỉ có thể **thừa nhận** nó bằng cách đưa khoảng thay vì một điểm.

**Ba cách ước lượng, chọn theo mức không chắc chắn:**

```text
① KHOẢNG BA ĐIỂM
   Lạc quan 2 ngày | Khả dĩ 4 ngày | Bi quan 10 ngày
   ⇒ (2 + 4×4 + 10) / 6 ≈ 4,7 ngày
   Giá trị thật không nằm ở con số cuối, mà ở việc KHOẢNG RỘNG
   tự nói lên "chỗ này nhiều rủi ro".

② SO SÁNH TƯƠNG ĐỐI
   "Việc này giống việc X đã làm, nhưng phức tạp gấp rưỡi."
   ⇒ Con người ước lượng SO SÁNH tốt hơn ước lượng tuyệt đối.

③ SPIKE CÓ GIỚI HẠN THỜI GIAN
   "Cho tôi một ngày tìm hiểu, sau đó tôi ước lượng được."
   ⇒ Dùng khi quá nhiều thứ chưa biết. Đây là câu trả lời TRUNG THỰC,
     không phải câu trả lời né tránh.
```

**Kể cả khi phải đưa một con số**, hãy kèm điều kiện:

```text
"4 ngày, VỚI ĐIỀU KIỆN thiết kế đã chốt và API đối tác hoạt động
 như tài liệu. Nếu một trong hai không đúng, tôi báo lại ngay."
```

Câu cuối là phần quan trọng nhất: nó biến ước lượng thành một thoả thuận có cơ chế cập nhật, thay vì một lời hứa cố định.

## Cú pháp

**Cắt phạm vi, đừng cắt chất lượng:**

```text
Bốn thứ có thể điều chỉnh:  phạm vi | thời gian | người | chất lượng

Thêm người vào dự án trễ hạn ⇒ THƯỜNG LÀM CHẬM THÊM
  (người mới cần được hướng dẫn, bởi chính người đang bận nhất)

Cắt chất lượng ⇒ vay nợ với lãi suất cao, trả trong vài tuần tới
  ([[no-ky-thuat-va-refactor]])

⇒ PHẠM VI là biến nên điều chỉnh.
```

```text
❌ "Làm nhanh hơn được không?"     → chỉ có thể cắt chất lượng
✅ "Trong 2 tuần, ta làm được A và B, chưa có C.
    Hay bạn muốn có C và lùi B sang đợt sau?"
   ⇒ Chuyển câu hỏi từ "nhanh hơn" sang "cái gì trước" —
     và đó là câu hỏi người quyết định trả lời được.
```

**Báo trễ sớm:**

```text
Biết sẽ trễ ⇒ nói NGAY, đừng đợi tới hạn.

Sớm 1 tuần:  còn xoay được — cắt phạm vi, đổi thứ tự, thêm người sớm.
Đúng ngày:   không còn lựa chọn nào cho ai cả.

Nói kèm ba phần:
  ① tình hình      "sẽ trễ khoảng 3 ngày"
  ② vì sao         "API đối tác thiếu 2 endpoint ta cần"
  ③ phương án      "hoặc lùi 3 ngày, hoặc bỏ phần X ra đợt sau"
```

Phần ③ là thứ phân biệt một báo cáo trễ với một lời than phiền.

**Đệm — công khai, đừng giấu:**

```text
❌ Giấu đệm trong từng việc (mỗi việc ×2)
   → Không ai tin con số, và ai cũng nhân thêm hệ số của riêng mình.
   → Định luật Parkinson: việc giãn ra cho vừa thời gian được cấp.

✅ Đệm chung, công khai ở cấp dự án
   "Ước lượng 6 tuần, cộng 2 tuần dự phòng cho rủi ro đã biết."
```

## Tại sao cần nó

Vì ước lượng phục vụ một mục đích cụ thể — và biết mục đích đó thay đổi cách trả lời:

```text
"Có kịp cho chiến dịch tháng 10 không?"
  → Cần biết ĐỦ hay KHÔNG ĐỦ. Không cần con số chính xác.

"Nên làm A hay B trước?"
  → Cần so sánh tương đối. Không cần con số tuyệt đối.

"Tôi phải hứa gì với khách hàng?"
  → Cần con số AN TOÀN, có đệm, có điều kiện rõ ràng.
```

Nên câu hỏi nên hỏi trước khi ước lượng là: *"Con số này dùng để làm gì?"*

**Theo dõi độ chính xác của chính mình:**

```text
Ghi lại ước lượng và thời gian thực tế.
Sau vài tháng, bạn có một HỆ SỐ cá nhân — thường 1,5–2×.

Đó là dữ liệu, không phải sự tự trách.
Và nó làm ước lượng của bạn tốt lên nhanh hơn mọi lời khuyên.
```

## So sánh

| | Ước lượng | Cam kết |
|---|---|---|
| Bản chất | dự báo | lời hứa |
| Có mức không chắc chắn | ✅ | ❌ |
| Đổi khi có thông tin mới | ✅ | khó |
| Nên nói bằng | khoảng + điều kiện | một ngày cụ thể |

## Dễ nhầm

**1. Đưa một con số không kèm khoảng.** Nghe như cam kết.

**2. Quên phần không phải viết mã.** Test, review, triển khai chiếm phần lớn.

**3. Ước lượng khi chưa hiểu yêu cầu.** Xin một spike có giới hạn thời gian.

**4. Giấu đệm trong từng việc.** Không ai tin con số nữa.

**5. Báo trễ vào đúng ngày hạn.** Không còn lựa chọn cho ai.

**6. Cắt chất lượng thay vì cắt phạm vi.** Trả lãi trong vài tuần tới.

**7. Thêm người vào dự án đang trễ.** Thường chậm thêm.

**8. Không theo dõi độ chính xác của mình.** Lặp lại cùng sai số mãi.

**9. Nhận ước lượng do người khác đưa cho việc của mình.**

**10. Không hỏi con số dùng để làm gì.** Trả lời sai loại câu hỏi.

## Mẹo nhớ

> **Ước lượng là DỰ BÁO. Luôn kèm khoảng và điều kiện.**
>
> **Bị ép thì cắt PHẠM VI, không cắt chất lượng.**
>
> **Báo trễ SỚM — muộn thì không còn lựa chọn cho ai.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn lý do khiến ước lượng luôn thấp hơn thực tế?
2. Ba cách ước lượng, dùng khi nào?
3. Vì sao cắt phạm vi tốt hơn cắt chất lượng?
4. Báo trễ nên gồm ba phần nào?
5. Vì sao đệm nên công khai thay vì giấu?

## Tự viết lại

Sếp hỏi: *"Làm tính năng đăng nhập bằng Google mất bao lâu?"* Bạn chưa từng làm OAuth ở dự án này. Không nhìn lại, viết:

```text
① câu trả lời đầy đủ của bạn
② những gì bạn cần biết thêm
③ ước lượng ba điểm sau khi đã tìm hiểu
④ điều kiện kèm theo
```

Tự kiểm: câu trả lời ① của bạn có nêu rõ **mức không chắc chắn** không, hay chỉ là một con số kèm lời rào đón?

## Thử sức

Bạn ước lượng 4 tuần. Sếp nói: *"Chỉ có 2 tuần thôi."*

Ba câu để trả lời: bạn phản hồi thế nào; bạn đề xuất **cắt gì** và trình bày ra sao; và nếu sếp vẫn giữ 2 tuần, bạn làm gì tiếp theo. Câu khó nhất: nếu bạn nhận 2 tuần và không kịp, ai chịu hậu quả — và điều đó thay đổi cách bạn trả lời ngay từ đầu ra sao?
