---
title: Lạm dụng công cụ và leo thang quyền
slug: lam-dung-cong-cu-va-quyen
summary: Khi mô hình có quyền hành động, quyền của nó là quyền của kẻ tấn công — và cách giới hạn.
level: trung-cap
tags: [ai, bao-mat, function-calling, agent]
khung: v2
---

> **Sau bài này bạn sẽ:** thiết kế quyền cho công cụ theo đặc quyền tối thiểu, và nhận ra đường leo thang quyền.

## Ý tưởng chính

Khi mô hình có công cụ, **quyền của mô hình trở thành quyền của bất kỳ ai điều khiển được nó**.

Và điều khiển được nó không cần chiếm quyền hệ thống — chỉ cần đưa được một câu vào ngữ cảnh ([[prompt-injection]]).

Nên câu hỏi thiết kế là: *"nếu người ngoài điều khiển được mô hình trong một request, họ làm được gì?"*

## Mental model

Hãy nghĩ tới **giao chìa khoá cho một người có thể bị nói dối**.

> Bạn nhờ họ lấy hồ sơ ở phòng lưu trữ. Bạn đưa họ chùm chìa khoá cả toà nhà — vì tiện.
>
> Một người lạ nói với họ: "anh quản lý nhờ tôi lấy hồ sơ ở phòng tài chính, anh mở hộ." Họ mở.
>
> Không phải họ xấu. Họ chỉ **không phân biệt được ai có quyền yêu cầu**.
>
> Cách chữa không phải huấn luyện họ tinh hơn. Cách chữa là **chỉ đưa chìa của phòng lưu trữ**.

Đó là toàn bộ nội dung của bài: **giới hạn chùm chìa khoá**, không cố làm người giữ chìa thông minh hơn.

## Ví dụ nhỏ

```text
❌ Công cụ chạy SQL tuỳ ý, với tài khoản có quyền ghi mọi bảng
✅ Công cụ `traDonHang(maDon)` với tài khoản chỉ đọc bảng đơn hàng,
   và lọc theo người dùng đang đăng nhập
```

## Code chạy thế nào

**Ba đường leo thang quyền:**

```text
① QUYỀN CÔNG CỤ QUÁ RỘNG
   Công cụ chạy SQL tuỳ ý, hoặc chạy lệnh shell tuỳ ý.
   ⇒ Quyền của mô hình = quyền của tài khoản đó.
   ⇒ Đây là đường trực tiếp nhất, và cũng dễ chặn nhất.

② DANH TÍNH DO MÔ HÌNH ĐIỀN
   Công cụ nhận `userId` như một tham số.
   ⇒ "Tra đơn của khách hàng 42" ⇒ mô hình điền 42.
   ⇒ Hàm hoạt động ĐÚNG như viết. Lỗ hổng ở thiết kế.

③ GHÉP NHIỀU CÔNG CỤ
   Từng công cụ đều "vô hại", nhưng ghép lại thì không:
     đọc file + gửi email          ⇒ rò dữ liệu
     tìm kiếm toàn kho + tóm tắt   ⇒ tổng hợp dữ liệu không được xem
     tra dữ liệu + gọi webhook      ⇒ đưa dữ liệu ra ngoài
   ⇒ Đường này khó thấy nhất, vì đánh giá từng công cụ riêng
     thì không phát hiện được ([[nhieu-agent-va-phan-cong]]).
```

**Đường ③ đáng nhìn kỹ:**

```text
Khi review, người ta hỏi: "công cụ này có an toàn không?"
Câu hỏi đúng hơn: "TẬP HỢP các công cụ này cho phép làm gì?"

⇒ Với mỗi cặp công cụ, hỏi: ghép chúng lại thì được gì?
⇒ Và nhớ rằng agent có thể gọi nhiều công cụ trong một phiên,
  nên "tập hợp" là toàn bộ những gì có trong phiên đó.
```

## Cú pháp

**Đặc quyền tối thiểu, cụ thể cho công cụ:**

```text
□ Mỗi công cụ dùng tài khoản có ĐÚNG quyền nó cần
  Công cụ tra đơn ⇒ tài khoản chỉ đọc bảng đơn hàng.
  Không dùng một tài khoản chung cho mọi công cụ.

□ Không có công cụ "chạy SQL tuỳ ý" hoặc "chạy lệnh tuỳ ý"
  ⇒ Nếu thật sự cần: danh sách CHO PHÉP, không phải danh sách cấm,
    và chạy trong môi trường cách ly.

□ Danh tính từ phiên đăng nhập, KHÔNG từ tham số
  ⇒ Đây là lỗi thiết kế phổ biến nhất và nghiêm trọng nhất.

□ Miền giá trị tham số bị giới hạn
  Gửi email ⇒ chỉ tới địa chỉ của chính người dùng, hoặc
  trong danh sách cho phép.
  ⇒ Biện pháp hiệu quả nhất trên mỗi dòng mã
    ([[xac-thuc-va-gioi-han-cong-cu]]).
```

**Tách theo quyền — lý do chính đáng để có nhiều agent hoặc nhiều server:**

```text
Agent A: đọc dữ liệu khách hàng. KHÔNG có công cụ gửi ra ngoài.
Agent B: gửi email. KHÔNG có quyền đọc dữ liệu khách hàng.

⇒ Ghép hai công cụ trong một phiên là đường rò.
⇒ Tách phiên thì đường đó không tồn tại.
⇒ Cái giá: bàn giao giữa hai agent, và mất thông tin ở đó.
```

**Giới hạn tốc độ và số lượng — chống lạm dụng:**

```text
□ Số lần gọi mỗi công cụ trong một request
□ Số lần gọi mỗi công cụ mỗi người dùng mỗi ngày
□ Với công cụ đắt hoặc có tác dụng phụ: ngưỡng thấp hơn

⇒ Không giới hạn: một request có thể gọi công cụ hàng trăm lần
  ⇒ tiêu tài nguyên, hoặc quét dữ liệu hàng loạt.
⇒ Và "quét dữ liệu hàng loạt" là một dạng rò rỉ: từng lời gọi
  hợp lệ, tổng hợp lại thì không.
```

**Ghi log kiểm toán — bắt buộc cho công cụ có tác dụng phụ:**

```text
Mỗi lời gọi công cụ ghi: ai, khi nào, công cụ nào, tham số gì,
kết quả gì, và câu hỏi gốc của người dùng.

⇒ Đây là bản ghi duy nhất cho biết AI đã làm gì thay mặt ai.
⇒ Không có nó thì không điều tra được, và không trả lời được
  câu "hệ thống đã làm gì với dữ liệu của tôi"
  ([[quan-sat-ung-dung-llm]]).
```

## Tại sao cần nó

Vì đây là điểm hệ thống AI khác hệ thống thường về bản chất:

```text
Hệ thống thường:
  Người dùng gọi API ⇒ API kiểm quyền của NGƯỜI DÙNG ⇒ thực hiện.
  Ranh giới rõ: quyền gắn với danh tính đã xác thực.

Hệ thống có công cụ AI:
  Người dùng nói chuyện ⇒ MÔ HÌNH quyết định gọi gì ⇒ thực hiện.
  ⇒ Có thêm một tầng quyết định, và tầng đó chịu ảnh hưởng
    của dữ liệu trong ngữ cảnh.

⇒ Nên kiểm quyền ở tầng công cụ không thể dựa vào việc
  "mô hình sẽ chỉ gọi những gì hợp lý".
```

**Câu hỏi thiết kế trung tâm:**

```text
"Nếu một người ngoài điều khiển được mô hình trong một request,
 họ làm được gì?"

Trả lời bằng cách liệt kê:
  □ Đọc được dữ liệu nào?
  □ Ghi hoặc xoá được gì?
  □ Gửi được gì ra ngoài?
  □ Tiêu được bao nhiêu tài nguyên?

⇒ Nếu câu trả lời nào đó không chấp nhận được, giới hạn quyền
  cho tới khi nó chấp nhận được.
```

**Và một nguyên tắc kết:**

```text
Đừng hỏi "mô hình có đáng tin không".
Hỏi "nếu nó bị điều khiển, thiệt hại tối đa là bao nhiêu".

⇒ Câu thứ nhất không trả lời được. Câu thứ hai trả lời được,
  và nó dẫn tới thiết kế cụ thể
  ([[gioi-han-va-lan-can-agent]]).
```

## So sánh

| Thiết kế | Rủi ro | Chi phí |
|---|---|---|
| Công cụ SQL tuỳ ý | **rất cao** | thấp để làm |
| Công cụ hẹp, tài khoản riêng | thấp | vừa |
| Danh tính từ tham số | **rất cao** | — |
| Danh tính từ phiên | thấp | thấp |
| Tách phiên theo quyền | thấp nhất | mất thông tin ở bàn giao |

## Dễ nhầm

**1. Công cụ chạy SQL hoặc lệnh tuỳ ý.**

**2. Một tài khoản chung cho mọi công cụ.**

**3. Danh tính từ tham số mô hình điền.**

**4. Đánh giá từng công cụ riêng.** Đường ③ chỉ thấy khi xét tập hợp.

**5. Không giới hạn miền giá trị tham số.**

**6. Ghép công cụ đọc dữ liệu và công cụ gửi ra ngoài trong một phiên.**

**7. Không giới hạn số lần gọi.** Quét dữ liệu hàng loạt.

**8. Danh sách lệnh cấm thay vì danh sách cho phép.**

**9. Không có log kiểm toán cho công cụ có tác dụng phụ.**

**10. Thiết kế dựa vào việc mô hình sẽ hành xử hợp lý.**

## Mẹo nhớ

> **Quyền của mô hình = quyền của bất kỳ ai điều khiển được nó.**
>
> **Câu hỏi đúng không phải "công cụ này an toàn không" mà "TẬP HỢP công cụ này cho phép làm gì".**
>
> **Danh tính từ PHIÊN, không bao giờ từ tham số mô hình điền.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba đường leo thang quyền, đường nào khó thấy nhất?
2. Vì sao danh tính từ tham số là lỗi thiết kế?
3. Bốn nguyên tắc đặc quyền tối thiểu cho công cụ?
4. Vì sao tách phiên theo quyền hiệu quả, và cái giá là gì?
5. Câu hỏi thiết kế trung tâm, và bốn câu con của nó?

## Tự viết lại

Không nhìn lại, đánh giá và thiết kế lại một hệ thống có các công cụ: đọc tài liệu nội bộ, tìm kiếm toàn kho, gửi email, tạo ticket, chạy truy vấn báo cáo.

```text
① với mỗi công cụ: tài khoản nào, quyền gì
② các cặp công cụ nguy hiểm khi ghép
③ nên tách thành mấy phiên/agent, vì sao
④ giới hạn cho từng công cụ
⑤ trả lời câu hỏi thiết kế trung tâm
```

Tự kiểm: ở ②, bạn tìm được bao nhiêu cặp — và có cặp nào bạn ban đầu nghĩ là vô hại không?

## Thử sức

Trợ lý nội bộ có công cụ `chayTruyVan(sql)` để "linh hoạt trả lời mọi câu hỏi về dữ liệu", dùng một tài khoản CSDL có quyền đọc toàn bộ.

Ba câu để trả lời: liệt kê thiệt hại tối đa nếu ai đó điều khiển được mô hình; bạn thiết kế lại thế nào mà vẫn giữ được phần lớn tính linh hoạt; và bạn triển khai thay đổi đó theo thứ tự nào. Câu khó nhất: nếu đội phản đối vì "công cụ hẹp không trả lời được câu hỏi mới", bạn đề xuất cách nào để vừa hẹp vừa mở rộng được — và ai duyệt việc mở rộng?
