---
title: Ranh giới và trách nhiệm khi dùng AI
slug: ranh-gioi-va-trach-nhiem
summary: Dữ liệu nào không được đưa vào, giấy phép mã sinh ra, và ai chịu trách nhiệm khi nó sai.
level: nang-cao
tags: [ai, lap-trinh-cung-ai, bao-mat, chat-luong]
khung: v2
---

> **Sau bài này bạn sẽ:** biết dữ liệu nào không được đưa vào công cụ AI, và ai chịu trách nhiệm cho mã nó sinh ra.

## Ý tưởng chính

Dùng trợ lý AI là **gửi dữ liệu ra một dịch vụ bên ngoài**. Điều đó nghe hiển nhiên nhưng dễ quên, vì trải nghiệm giống như gõ vào một cái editor.

Và về trách nhiệm: không có sự chia sẻ nào. **Người merge chịu trách nhiệm cho mã đó** — trước đội, trước người dùng, và trước quy định.

## Mental model

Hãy nghĩ tới **nhờ một công ty bên ngoài xử lý giấy tờ**.

> Bạn gửi hồ sơ sang, họ xử lý, gửi lại. Nhanh hơn tự làm nhiều.
>
> Nhưng: bạn **đã đưa hồ sơ đó ra khỏi công ty**. Nếu trong đó có hợp đồng khách hàng hay dữ liệu cá nhân, việc gửi đi là một hành động có hậu quả pháp lý — bất kể họ hứa gì.
>
> Và nếu họ điền sai một con số, **khách hàng khiếu nại bạn**, không khiếu nại họ.

Hai vế đó là toàn bộ nội dung của bài này: **cẩn thận với thứ gửi đi**, và **trách nhiệm không đi kèm**.

## Ví dụ nhỏ

```text
❌ Dán vào để nhờ debug:
   log production có email và số điện thoại người dùng
   file .env
   một truy vấn kèm dữ liệu thật của khách hàng

✅ Thay bằng:
   dữ liệu giả cùng hình dạng
   tên biến thay cho giá trị thật
```

## Code chạy thế nào

**Bốn loại dữ liệu không đưa vào:**

```text
① BÍ MẬT
   khoá API, mật khẩu, chuỗi kết nối, khoá riêng, token
   ⇒ Coi như đã lộ. Phải XOAY, không chỉ xoá tin nhắn.

② DỮ LIỆU CÁ NHÂN
   email, số điện thoại, địa chỉ, hồ sơ y tế, thông tin thanh toán
   ⇒ Đây là vấn đề tuân thủ, không chỉ vấn đề tốt-xấu.

③ MÃ CÓ RÀNG BUỘC HỢP ĐỒNG
   mã của khách hàng, mã dưới NDA, thuật toán độc quyền
   ⇒ Kiểm xem hợp đồng có cho phép xử lý bởi bên thứ ba không.

④ DỮ LIỆU THẬT CỦA PRODUCTION
   kể cả để "debug cho nhanh"
```

**Và một chi tiết quyết định: gói dịch vụ bạn đang dùng.**

```text
Câu hỏi phải trả lời được TRƯỚC khi đội dùng rộng:
  □ Dữ liệu có được dùng để huấn luyện không?
  □ Được lưu bao lâu?
  □ Lưu ở đâu (region nào)?
  □ Có bản dành cho doanh nghiệp với cam kết khác không?

Gói cá nhân và gói doanh nghiệp của cùng một sản phẩm thường
có điều khoản RẤT khác nhau về ba câu đầu.
⇒ Đây là câu hỏi cho người phụ trách, không phải cho từng lập
  trình viên tự quyết ([[quan-ly-secret-va-cau-hinh]]).
```

## Cú pháp

**Giấy phép mã sinh ra — nói rõ những gì đã biết:**

```text
Điều chắc chắn: mô hình được huấn luyện trên mã công khai,
trong đó có mã dưới nhiều loại giấy phép khác nhau.

Điều CHƯA rõ ràng và đang thay đổi:
  □ Mã do mô hình sinh ra thuộc về ai
  □ Trường hợp nào bị coi là sao chép mã có giấy phép
  □ Trách nhiệm thuộc về nhà cung cấp hay người dùng

⇒ Đây là vùng pháp lý đang được làm rõ dần. Đừng dựa vào một
  kết luận chắc chắn từ ai — kể cả từ tài liệu này.
```

```text
Ba biện pháp thực dụng, không phụ thuộc vào kết luận pháp lý:
  ① Đoạn mã dài, đặc thù, "trông như copy từ đâu đó"
     ⇒ tìm thử trên mạng trước khi dùng
  ② Dự án thương mại: chọn nhà cung cấp có cam kết bảo vệ
     pháp lý (nhiều bên cung cấp điều này cho gói doanh nghiệp)
  ③ Không dùng AI sinh mã cho phần cốt lõi nhất của sản phẩm
     nếu đó là tài sản trí tuệ chính của công ty
```

**Trách nhiệm — nguyên tắc rõ ràng:**

```text
Bạn merge ⇒ bạn chịu trách nhiệm. Không có ngoại lệ.

"AI viết" KHÔNG phải:
  □ một lời giải thích trong hậu kiểm
  □ một lý do giảm nhẹ khi có sự cố
  □ một cách chia sẻ trách nhiệm với ai

⇒ Nó không khác gì "tôi copy từ Stack Overflow" — điều đó
  chưa bao giờ là một lời bào chữa.
```

**Điều này có một hệ quả rất thực tế:**

```text
Nếu bạn không đủ hiểu để chịu trách nhiệm cho một đoạn mã,
bạn không nên merge nó.

⇒ Và điều đó đặt một giới hạn tự nhiên cho việc dùng AI:
  bạn dùng được tới mức bạn còn hiểu được.
  Vượt qua đó, bạn đang nhận trách nhiệm cho thứ mình không
  kiểm soát ([[review-ma-do-ai-sinh]]).
```

## Tại sao cần nó

Vì hai loại hậu quả ở đây khác hẳn hậu quả của một bug thường:

```text
BUG THƯỜNG:      sửa được, deploy lại, xong.
RÒ RỈ DỮ LIỆU:   không thu hồi được. Có thể phải thông báo cho
                 người dùng và cơ quan quản lý.
VẤN ĐỀ GIẤY PHÉP: có thể phải viết lại một phần sản phẩm.

⇒ Cả hai loại sau không có nút "hoàn tác".
```

**Chính sách nên có trong đội — viết ra, không để ngầm hiểu:**

```text
□ Công cụ nào được dùng, gói nào
□ Loại dữ liệu nào KHÔNG được đưa vào (bốn loại ở trên)
□ Phần mã nào không dùng AI sinh (nếu có)
□ Ai duyệt khi cần đưa dữ liệu nhạy cảm vào (thường là: không bao giờ)
□ Quy trình khi phát hiện đã lỡ đưa bí mật vào

Điểm cuối quan trọng và hay thiếu: nó sẽ xảy ra. Có quy trình
sẵn thì phản ứng đúng trong mười phút; không có thì người ta
im lặng vì sợ.
```

**Và một điều nên nói thẳng:** những giới hạn này không phải để làm chậm đội. Chúng là **điều kiện để dùng AI rộng rãi mà không phải lo lắng** — cùng logic với việc có test tốt là điều kiện để deploy thường xuyên.

**Ba thứ nên tự động hoá thay vì nhắc nhở:**

```text
□ Quét bí mật trong mã và trong commit (pre-commit hook, CI)
  ⇒ chặn trước khi bí mật vào git, và cùng cơ chế đó giúp
    bạn nhận ra mình đang giữ bí mật trong file mình định dán
□ Che dữ liệu tự động trong log ở môi trường dev
  ⇒ dán log vào AI thì không có gì nhạy cảm để lộ
□ Dữ liệu mẫu sẵn có cho môi trường dev
  ⇒ không ai cần lấy dữ liệu production "cho nhanh"

Ba thứ này loại bỏ nhu cầu, thay vì dựa vào kỷ luật.
```

## So sánh

| Hành động | Hậu quả | Thu hồi được? |
|---|---|---|
| Merge mã có bug | sự cố, sửa được | ✅ |
| Dán khoá API vào chat | khoá coi như đã lộ | ❌ (phải xoay) |
| Dán dữ liệu cá nhân | vấn đề tuân thủ | ❌ |
| Dùng mã có ràng buộc giấy phép | có thể phải viết lại | rất đắt |

## Dễ nhầm

**1. Dán `.env` hoặc log production vào để nhờ debug.**

**2. Xoá tin nhắn rồi coi như xong.** Bí mật đã lộ phải xoay.

**3. Không biết gói mình dùng có dùng dữ liệu để huấn luyện không.**

**4. Để mỗi người tự quyết định về dữ liệu.** Đây là chính sách chung.

**5. Coi "AI viết" là lời giải thích khi có sự cố.**

**6. Merge mã mình không đủ hiểu để chịu trách nhiệm.**

**7. Dựa vào một kết luận pháp lý chắc chắn.** Vùng này đang thay đổi.

**8. Không có quy trình khi lỡ đưa bí mật vào.** Người ta sẽ im lặng.

**9. Dựa vào kỷ luật thay vì tự động hoá.**

**10. Coi chính sách là thứ làm chậm đội.** Nó là điều kiện để dùng rộng.

## Mẹo nhớ

> **Dùng AI = GỬI DỮ LIỆU RA NGOÀI. Bốn loại không đưa vào: bí mật, dữ liệu cá nhân, mã có ràng buộc, dữ liệu production.**
>
> **Bạn merge ⇒ bạn chịu trách nhiệm. "AI viết" không phải lời giải thích.**
>
> **Bạn dùng được tới mức bạn còn HIỂU được.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn loại dữ liệu không đưa vào?
2. Bốn câu hỏi về gói dịch vụ phải trả lời trước khi dùng rộng?
3. Điều gì chắc chắn và điều gì chưa rõ về giấy phép mã sinh ra?
4. Nguyên tắc trách nhiệm, và hệ quả thực tế của nó?
5. Ba thứ nên tự động hoá thay vì nhắc nhở?

## Tự viết lại

Không nhìn lại, viết chính sách dùng AI cho một đội 10 người làm sản phẩm có dữ liệu người dùng:

```text
① công cụ và gói được phép
② danh sách dữ liệu không được đưa vào
③ ba thứ tự động hoá để không phụ thuộc kỷ luật
④ quy trình khi lỡ đưa bí mật vào
⑤ nguyên tắc trách nhiệm, một câu
```

Tự kiểm: mục ④ của bạn có làm người ta **dễ báo** hơn hay dễ **im lặng** hơn?

## Thử sức

Một đồng nghiệp nhắc bạn: tuần trước, để gỡ một lỗi, họ đã dán một đoạn log production vào chat AI. Đoạn đó có email của khoảng 30 người dùng và một token nội bộ.

Ba câu để trả lời: bạn làm gì **trong giờ đầu tiên**, theo thứ tự; bạn báo cho ai; và ba thay đổi để nó không lặp lại. Câu khó nhất: token đã lộ thì xoay được — nhưng 30 email thì không thu hồi được. Bạn đánh giá mức độ và quyết định có phải thông báo ra ngoài hay không dựa vào tiêu chí gì, và ai là người quyết định điều đó?
