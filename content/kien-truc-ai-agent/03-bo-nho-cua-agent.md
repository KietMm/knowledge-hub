---
title: Bộ nhớ của agent
slug: bo-nho-cua-agent
summary: Ba loại bộ nhớ, vì sao ngữ cảnh không phải bộ nhớ, và cách giữ mục tiêu qua hai mươi bước.
level: trung-cap
tags: [ai, agent, bo-nho, kien-truc]
khung: v2
---

> **Sau bài này bạn sẽ:** thiết kế bộ nhớ cho agent nhiều bước, và biết vì sao "nhồi hết vào ngữ cảnh" không phải bộ nhớ.

## Ý tưởng chính

Mô hình **không có bộ nhớ**. Mỗi lời gọi là độc lập — nó chỉ biết những gì nằm trong ngữ cảnh của lời gọi đó.

Nên "bộ nhớ của agent" là thứ **bạn xây**: quyết định lưu gì, ở đâu, và đưa lại vào ngữ cảnh khi nào.

## Mental model

Hãy nghĩ tới **một người làm việc với ba loại ghi chú**.

> **Tờ giấy nháp trên bàn** — đang làm gì, kết quả vài bước vừa rồi. Nhìn thấy liên tục, nhưng chỗ có hạn: đầy thì phải bỏ bớt.
>
> **Sổ tay ghi những điều quan trọng** — mục tiêu, quyết định đã chốt, ràng buộc. Ngắn, và **không bao giờ bỏ đi**.
>
> **Tủ hồ sơ** — mọi thứ đã làm, đầy đủ. Không nhìn thấy, nhưng **tra được khi cần**.

Ba loại đó là **ngữ cảnh hiện tại**, **bộ nhớ làm việc**, và **bộ nhớ dài hạn**. Sai lầm phổ biến là chỉ có loại thứ nhất — và khi tờ giấy nháp đầy, mọi thứ trước đó biến mất.

## Ví dụ nhỏ

```text
Ngữ cảnh (mỗi lời gọi):
  ├─ mục tiêu + ràng buộc        ← luôn có, không bao giờ cắt
  ├─ tóm tắt các bước đã làm     ← thay cho toàn bộ lịch sử
  ├─ kết quả 3 bước gần nhất     ← chi tiết đầy đủ
  └─ những gì cần làm tiếp
```

## Code chạy thế nào

**Ba loại bộ nhớ và cách dùng:**

```text
① NGỮ CẢNH HIỆN TẠI
   Những gì nằm trong lời gọi này. Có giới hạn cứng.
   ⇒ Đây KHÔNG phải bộ nhớ — nó là "tầm nhìn" của một lời gọi.

② BỘ NHỚ LÀM VIỆC (trong một nhiệm vụ)
   Mục tiêu, ràng buộc, quyết định đã chốt, danh sách việc còn lại.
   ⇒ NGẮN, có cấu trúc, và LUÔN đưa vào mọi lời gọi.
   ⇒ Đây là thứ giữ agent không quên mục tiêu ở bước thứ 15.

③ BỘ NHỚ DÀI HẠN (qua nhiều nhiệm vụ)
   Sở thích người dùng, kết quả các nhiệm vụ trước, kiến thức tích luỹ.
   ⇒ Lưu ngoài, TRUY HỒI phần liên quan khi cần
     ⇒ Đây thực chất là RAG trên chính lịch sử của agent
       ([[rag-la-gi-va-khi-nao-dung]]).
```

**Vì sao ngữ cảnh không phải bộ nhớ:**

```text
Cách làm ngây thơ: cứ thêm mọi thứ vào ngữ cảnh.
  Bước 1: 2.000 token
  Bước 10: 40.000 token
  Bước 20: đầy, hoặc rất đắt và chậm

Và tệ hơn: khi cắt bớt để nhét vừa, thường cắt phần CŨ NHẤT —
mà phần cũ nhất chứa MỤC TIÊU.
⇒ Agent quên mất mình đang làm gì, và bắt đầu đi lan.
```

Đây là nguyên nhân thật của hiện tượng agent "mất phương hướng" ở các bước sau: không phải mô hình kém, mà là **mục tiêu đã bị cắt khỏi ngữ cảnh**.

## Cú pháp

**Bộ nhớ làm việc — có cấu trúc, không phải văn xuôi:**

```json
{
  "mucTieu": "Tìm nguyên nhân đơn ABC123 giao trễ và tạo ticket",
  "tieuChiXong": "Ticket đã được tạo với nguyên nhân xác định",
  "rangBuoc": ["Không liên hệ khách hàng", "Không hoàn tiền tự động"],
  "daBiet": [
    "Đơn ABC123 giao ngày 25/8, dự kiến 20/8",
    "Nguyên nhân: kho Hà Nội hết hàng, chuyển từ kho HCM"
  ],
  "conLai": ["Tạo ticket ghi nhận"],
  "daThu": ["traChinhSachBoiThuong — không có quyền truy cập"]
}
```

```text
Bốn lợi ích của cấu trúc này:
  ① NGẮN — vài trăm token thay vì hàng chục nghìn
  ② KHÔNG BAO GIỜ CẮT — luôn vừa trong ngữ cảnh
  ③ ĐỌC ĐƯỢC — bạn hiểu agent đang ở đâu khi gỡ lỗi
  ④ HIỂN THỊ ĐƯỢC cho người dùng: `conLai` là tiến độ
```

**Trường `daThu` đáng chú ý:**

```text
Ghi lại những gì đã thử và THẤT BẠI, kèm lý do.
⇒ Chống trực tiếp kiểu mắc kẹt "thử lại thứ không làm được"
  ([[vong-lap-agent]]).
⇒ Và nó là thông tin quan trọng nhất khi bạn đọc log để hiểu
  vì sao agent không hoàn thành.
```

**Cập nhật bộ nhớ làm việc — hai cách:**

```text
① MÔ HÌNH TỰ CẬP NHẬT
   Cho nó một công cụ `capNhatBoNho(...)`
   + Linh hoạt
   − Tốn một lời gọi công cụ, và nó có thể ghi sai hoặc bỏ sót

② MÃ CỦA BẠN CẬP NHẬT
   Sau mỗi bước, tự thêm kết quả vào `daBiet` hoặc `daThu`
   + Đáng tin, không tốn lời gọi
   − Không tóm tắt được thông minh như mô hình

⇒ Thường dùng cả hai: mã ghi sự kiện thô, mô hình tóm tắt
  định kỳ khi `daBiet` quá dài.
```

**Nén ngữ cảnh khi dài — thứ tự ưu tiên khi cắt:**

```text
Cắt theo thứ tự này:
  ① Kết quả công cụ thô của các bước CŨ (giữ tóm tắt)
  ② Các bước không dẫn tới kết quả gì
  ③ Chi tiết của bước đã hoàn thành

TUYỆT ĐỐI KHÔNG cắt:
  □ Mục tiêu và tiêu chí hoàn thành
  □ Ràng buộc
  □ Chỉ dẫn hệ thống
  □ Kết quả 2–3 bước gần nhất
```

## Tại sao cần nó

Vì bộ nhớ quyết định agent chạy được bao nhiêu bước trước khi mất phương hướng:

```text
Không có bộ nhớ làm việc:
  Agent hoạt động tốt tới ~5–8 bước, sau đó chất lượng giảm rõ.
  Triệu chứng: quên mục tiêu, lặp lại việc đã làm, đi lan sang
  việc không được yêu cầu.

Có bộ nhớ làm việc có cấu trúc:
  Agent giữ được định hướng qua 20+ bước, vì mục tiêu và tiến độ
  luôn nằm ngay trong ngữ cảnh.
```

**Bộ nhớ dài hạn — cẩn thận ba điều:**

```text
① AI ĐƯỢC XEM
   Bộ nhớ về người dùng A không được lọt vào ngữ cảnh của B.
   ⇒ Khoá theo userId, lọc ở tầng truy hồi
     ([[phan-quyen-theo-ban-ghi]]).

② CÁI GÌ ĐÁNG LƯU
   Đừng lưu mọi thứ. Lưu quyết định và sở thích, không lưu
   toàn bộ hội thoại.
   ⇒ Bộ nhớ càng nhiều rác, truy hồi càng kém.

③ XOÁ ĐƯỢC
   Người dùng phải xoá được bộ nhớ về họ.
   ⇒ Yêu cầu tuân thủ, và cũng là cách sửa khi agent "nhớ" sai
     ([[ranh-gioi-va-trach-nhiem]]).
```

**Và một cảnh báo về bộ nhớ dài hạn:** thông tin sai lưu vào bộ nhớ sẽ **lặp lại mãi**. Agent kết luận sai một lần, ghi vào bộ nhớ, và mọi nhiệm vụ sau đều dựa trên kết luận đó. Nên bộ nhớ dài hạn cần cơ chế **sửa và hết hạn**, không chỉ cơ chế ghi.

## So sánh

| | Ngữ cảnh | Bộ nhớ làm việc | Bộ nhớ dài hạn |
|---|---|---|---|
| Phạm vi | một lời gọi | một nhiệm vụ | nhiều nhiệm vụ |
| Kích thước | lớn, có trần | **nhỏ** | không giới hạn |
| Luôn có mặt | — | ✅ | ❌ truy hồi khi cần |
| Lưu ở | ngữ cảnh | ngữ cảnh (ngắn) | CSDL / vector store |

## Dễ nhầm

**1. Coi ngữ cảnh là bộ nhớ.** Nó là tầm nhìn của một lời gọi.

**2. Cắt phần cũ nhất khi ngữ cảnh đầy.** Cắt mất mục tiêu.

**3. Bộ nhớ làm việc dạng văn xuôi dài.** Phải ngắn và có cấu trúc.

**4. Không ghi lại những gì đã thử và thất bại.**

**5. Không có tiêu chí hoàn thành trong bộ nhớ.**

**6. Lưu toàn bộ hội thoại vào bộ nhớ dài hạn.** Nhiều rác.

**7. Bộ nhớ dài hạn không khoá theo người dùng.**

**8. Không có cách xoá bộ nhớ.**

**9. Không có cơ chế sửa thông tin sai trong bộ nhớ.** Nó lặp lại mãi.

**10. Không hiển thị tiến độ dù đã có `conLai`.**

## Mẹo nhớ

> **Mô hình KHÔNG có bộ nhớ. Bộ nhớ là thứ BẠN xây.**
>
> **Bộ nhớ làm việc phải NGẮN, CÓ CẤU TRÚC, và KHÔNG BAO GIỜ bị cắt.**
>
> **Cắt ngữ cảnh thì cắt KẾT QUẢ THÔ CŨ, tuyệt đối không cắt MỤC TIÊU.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba loại bộ nhớ, phạm vi của mỗi loại?
2. Vì sao ngữ cảnh không phải bộ nhớ?
3. Vì sao trường `daThu` quan trọng?
4. Thứ tự ưu tiên khi cắt ngữ cảnh, và cái gì tuyệt đối không cắt?
5. Ba điều cẩn thận với bộ nhớ dài hạn?

## Tự viết lại

Không nhìn lại, thiết kế bộ nhớ cho agent hỗ trợ khách hàng, có thể chạy tới 15 bước:

```text
① cấu trúc bộ nhớ làm việc
② ai cập nhật nó, và khi nào
③ chiến lược nén ngữ cảnh
④ bộ nhớ dài hạn: lưu gì, khoá theo gì
```

Tự kiểm: bộ nhớ làm việc của bạn dài bao nhiêu token — và nó có vừa trong ngữ cảnh ngay cả ở bước thứ 15 không?

## Thử sức

Agent của bạn hoạt động tốt trong 6 bước đầu, sau đó bắt đầu lặp lại việc đã làm và cuối cùng trả về kết quả không liên quan tới yêu cầu ban đầu.

Ba câu để trả lời: nguyên nhân khả dĩ nhất, và bạn xác nhận bằng cách nào; ba thay đổi theo thứ tự ưu tiên; và bạn đo cải thiện bằng chỉ số gì. Câu khó nhất: nếu log cho thấy ở bước thứ 7, phần mô tả mục tiêu **vẫn còn** trong ngữ cảnh, thì nguyên nhân nằm ở đâu — và điều đó đổi cách sửa của bạn ra sao?
