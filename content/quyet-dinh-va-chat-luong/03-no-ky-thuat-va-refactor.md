---
title: Nợ kỹ thuật và refactor
slug: no-ky-thuat-va-refactor
summary: Phân biệt nợ có chủ ý với code xấu, đo nó bằng số, và thương lượng để được trả.
level: trung-cap
tags: [dan-dat, no-ky-thuat, refactor, chat-luong]
khung: v2
---

> **Sau bài này bạn sẽ:** phân biệt được nợ với code xấu, đo nợ bằng số, và trình bày nó theo ngôn ngữ nghiệp vụ.

## Ý tưởng chính

**Nợ kỹ thuật** là quyết định có chủ ý: chọn cách nhanh hơn bây giờ, biết rõ sẽ phải trả lãi sau.

**Code xấu** là không biết cách làm tốt hơn.

Cái đầu là công cụ tài chính hợp lý. Cái sau là vấn đề năng lực. Gọi cả hai bằng một tên làm cả hai không giải quyết được.

## Mental model

Hãy nghĩ tới **vay tiền so với tiêu bừa**.

> **Vay có chủ ý**: vay để mở cửa hàng đúng mùa cao điểm. Bạn biết lãi suất, biết kế hoạch trả. Đây là quyết định kinh doanh tốt.
>
> **Tiêu bừa**: không biết mình còn bao nhiêu, quẹt thẻ theo cảm hứng. Cuối tháng bất ngờ.
>
> Điểm chung: cả hai đều làm số dư giảm. Điểm khác: cái đầu có **kế hoạch trả**, và bạn **biết** mình đang nợ.

Và như nợ thật, thứ giết bạn không phải khoản gốc — mà là **lãi tích luỹ**: mỗi tính năng mới phải đi vòng qua chỗ nợ, chậm hơn một chút, mỗi lần.

## Ví dụ nhỏ

```text
Nợ có chủ ý:
  "Hardcode danh sách quốc gia để kịp ra mắt thứ Sáu.
   Ticket #451: chuyển sang bảng cấu hình trước tháng 10."
  ⇒ Có lý do, có ticket, có hạn.

Code xấu:
  Hàm 400 dòng, không ai biết vì sao nó như vậy, không có ticket.
```

## Code chạy thế nào

**Bốn loại nợ — cách xử lý khác nhau:**

```text
① CÓ CHỦ Ý, NGẮN HẠN     "nhanh để kịp ra mắt, trả trong 2 tuần"
   → Hợp lý. Điều kiện: có ticket và có hạn.

② CÓ CHỦ Ý, DÀI HẠN      "chấp nhận kiến trúc này cho tới khi đạt X"
   → Hợp lý. Điều kiện: ghi rõ ĐIỀU KIỆN KÍCH HOẠT xem lại.

③ VÔ TÌNH                "lúc đó chưa hiểu miền nghiệp vụ"
   → Bình thường và không tránh được. Sửa khi đi ngang qua.

④ MỤC RỮA                "thư viện hết hỗ trợ, chuẩn đã đổi"
   → Không làm gì cũng sinh nợ. Cần rà soát định kỳ.
```

Loại ④ hay bị bỏ qua vì nó xuất hiện mà không ai làm gì cả: mã đứng yên, còn thế giới xung quanh thì đi tiếp.

**Đo nợ bằng số — nếu không thì nó chỉ là ý kiến:**

```text
❌ "Code này tệ lắm"                     → không ai hành động được
✅ "Module thanh toán:
     - trung bình 3,2 ngày cho một thay đổi nhỏ (module khác: 0,5)
     - 40% số lỗi production 6 tháng qua
     - 2 người trong đội dám đụng vào
     - 12% độ phủ test"
```

Bốn con số đó biến "tôi thấy khó chịu" thành "đây là một vấn đề đo được". Và chúng là ngôn ngữ mà người ngoài kỹ thuật hiểu được.

**Trình bày theo ngôn ngữ nghiệp vụ:**

```text
❌ "Cần refactor module thanh toán, code rối lắm."
   → Nghe như "tôi muốn dọn dẹp cho sạch."

✅ "Mỗi tính năng liên quan tới thanh toán mất gấp 6 lần bình thường.
    Quý này có 4 tính năng như vậy ⇒ mất thêm khoảng 3 tuần.
    Đầu tư 1 tuần refactor ⇒ hoà vốn ngay trong quý này,
    và giảm rủi ro sự cố ở luồng ra tiền."
```

Nguyên tắc: nói bằng **thời gian, rủi ro, tiền** — ba thứ người quyết định ngân sách quan tâm ([[giao-tiep-va-anh-huong]]).

## Cú pháp

**Bốn cách trả nợ:**

```text
① QUY TẮC HƯỚNG ĐẠO SINH     ← mặc định, không cần xin phép
   Đi qua chỗ nào thì để nó sạch hơn một chút.
   Không đòi hỏi dự án riêng, không cần ai duyệt.

② NGÂN SÁCH CỐ ĐỊNH
   10–20% mỗi sprint cho nợ kỹ thuật.
   ⇒ Ổn định, không phải thương lượng lại mỗi lần.

③ REFACTOR KÈM TÍNH NĂNG
   Phải sửa module đó ⇒ dọn luôn phần liên quan.
   ⇒ Dễ được chấp nhận nhất, vì đã có lý do nghiệp vụ.

④ DỰ ÁN RIÊNG                ← chỉ khi nợ quá lớn
   Cần số liệu thuyết phục và cam kết rõ về kết quả.
```

Thứ tự này là thứ tự ưu tiên: ① và ③ giải quyết phần lớn nợ mà không cần thương lượng gì.

**Refactor an toàn:**

```text
① CÓ TEST TRƯỚC
   Không có test ⇒ đó là VIẾT LẠI, không phải refactor.
   Chưa có ⇒ viết test đặc tả hành vi HIỆN TẠI trước, kể cả hành vi lạ.
② TỪNG BƯỚC NHỎ, mỗi bước chạy được và commit được
③ KHÔNG đổi hành vi và cấu trúc trong cùng một commit
④ Merge liên tục — nhánh refactor sống ba tuần là một PR không ai review nổi
```

Điểm ③ đáng nhấn: khi test đỏ, bạn cần biết ngay đó là do đổi cấu trúc hay do đổi hành vi. Trộn hai việc là mất khả năng đó.

**Khi nào KHÔNG refactor:**

```text
□ Mã sắp bị xoá
□ Mã không ai đụng vào, chạy ổn định nhiều năm
   → xấu nhưng không tốn gì ⇒ đừng động vào
□ Không có test và không có thời gian viết
□ Đang có deadline gấp — refactor lúc gấp là cách tạo sự cố
□ Bạn chưa hiểu vì sao mã đang như vậy
   → "chỗ này thừa" đôi khi là một bản vá cho một ca biên đã quên
```

Dòng cuối cùng đáng ghi nhớ: mã kỳ lạ thường có lý do đã mất. Tìm ra lý do trước khi xoá.

## Tại sao cần nó

Vì nợ không trả sẽ tự tích luỹ và đổi hành vi của cả đội:

```text
Nợ tăng ⇒ mỗi thay đổi chậm hơn
       ⇒ ước lượng phồng lên
       ⇒ áp lực đi tắt để kịp
       ⇒ nợ tăng thêm
       ⇒ người giỏi chán và rời đi
       ⇒ người còn lại càng không dám động vào
```

Vòng lặp này chạy chậm, nên khó nhận ra ở từng bước. Cách phá vòng: **đo và trình bày**, để nó trở thành một khoản mục có thật thay vì một cảm giác chung.

**Ba nguyên tắc thực dụng:**

```text
① Nợ ở chỗ ÍT THAY ĐỔI thì rẻ — cứ để đó.
   Nợ ở chỗ ĐỘNG VÀO HẰNG NGÀY thì đắt — trả trước.
   ⇒ Ưu tiên theo tần suất thay đổi, không theo mức độ xấu.

② Ghi nợ có chủ ý vào ticket NGAY LÚC TẠO RA NÓ.
   Không ghi ⇒ ba tháng sau không ai nhớ đó là cố ý.

③ Không bao giờ có "sprint dọn dẹp" một lần cho xong.
   Nợ là dòng chảy liên tục, cần một cơ chế liên tục.
```

Nguyên tắc ① là nguyên tắc quan trọng nhất và trái trực giác nhất: **mã xấu nhất trong repo có thể là mã bạn nên để yên**.

## So sánh

| | Nợ có chủ ý | Code xấu |
|---|---|---|
| Biết mình đang làm gì | ✅ | ❌ |
| Có ticket và hạn | ✅ | ❌ |
| Là quyết định | ✅ | không |
| Xử lý | lên kế hoạch trả | nâng năng lực, đặt chuẩn |

## Dễ nhầm

**1. Gọi mọi code xấu là "nợ kỹ thuật".** Che mất vấn đề năng lực.

**2. Không ghi ticket khi cố ý vay.** Ba tháng sau không ai nhớ.

**3. Trình bày bằng ngôn ngữ kỹ thuật.** Nghe như dọn dẹp cho sạch.

**4. Refactor không có test.** Đó là viết lại, và rủi ro cao.

**5. Trộn đổi hành vi với đổi cấu trúc.** Không biết cái gì làm test đỏ.

**6. Nhánh refactor sống hàng tuần.** PR khổng lồ, xung đột lớn.

**7. Refactor chỗ không ai đụng.** Rủi ro có, lợi ích không.

**8. Ưu tiên theo mức độ xấu thay vì tần suất thay đổi.**

**9. Xin một "sprint dọn dẹp".** Không giải quyết dòng chảy liên tục.

**10. Xoá mã kỳ lạ mà chưa hiểu vì sao nó ở đó.**

## Mẹo nhớ

> **Nợ có chủ ý = có ticket, có hạn. Không có hai thứ đó thì là code xấu.**
>
> **Ưu tiên theo TẦN SUẤT THAY ĐỔI, không theo mức độ xấu.**
>
> **Không có test thì không phải refactor — đó là viết lại.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Nợ kỹ thuật khác code xấu ở điểm nào?
2. Bốn loại nợ, cách xử lý mỗi loại?
3. Đo nợ bằng những con số nào?
4. Bốn cách trả nợ, cái nào không cần xin phép?
5. Vì sao ưu tiên theo tần suất thay đổi chứ không theo mức độ xấu?

## Tự viết lại

Module thanh toán: 3.000 dòng, không test, 2 người dám sửa, chiếm 40% lỗi production, và đội phải sửa nó gần như mỗi tuần. Không nhìn lại, viết:

```text
① đo bằng những số nào
② đề xuất trình bày cho sếp (ngôn ngữ nghiệp vụ)
③ kế hoạch trả nợ từng bước
④ cách đảm bảo an toàn khi refactor
```

Tự kiểm: đề xuất ở ② của bạn có nêu **con số hoà vốn** không?

## Thử sức

Sếp nói: *"Không có thời gian refactor, quý này phải xong 5 tính năng."*

Ba câu để trả lời: bạn phản hồi thế nào **mà không đối đầu**; bạn làm gì trong ràng buộc đó; và bạn xây dựng lập luận cho quý sau bằng cách nào. Câu khó nhất: nếu một trong 5 tính năng đó **nằm ngay trên** phần nợ nặng nhất, điều đó thay đổi cuộc trò chuyện ra sao?
