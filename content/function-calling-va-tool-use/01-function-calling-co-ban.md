---
title: Function calling cơ bản
slug: function-calling-co-ban
summary: Cho mô hình gọi mã của bạn — vòng lặp bốn bước, và điều quan trọng nhất: nó KHÔNG tự chạy gì cả.
level: co-ban
tags: [ai, function-calling, api, kien-truc]
khung: v2
---

> **Sau bài này bạn sẽ:** mô tả được vòng lặp function calling, và hiểu vì sao mô hình không bao giờ tự thực thi mã của bạn.

## Ý tưởng chính

Mô hình không tính toán được chính xác, không biết dữ liệu của bạn, và không biết hôm nay là ngày nào.

**Function calling** giải bằng cách để mô hình **nói ra rằng nó muốn gọi hàm nào với tham số gì**. Bạn chạy hàm đó, đưa kết quả về, và mô hình dùng kết quả để trả lời.

Điểm quan trọng nhất, và hay bị hiểu sai: **mô hình không thực thi gì cả**. Nó chỉ đề nghị. Mọi việc chạy đều do mã của bạn.

## Mental model

Hãy nghĩ tới **một chuyên gia tư vấn qua điện thoại**.

> Bạn hỏi: "đơn hàng của tôi tới đâu rồi?"
>
> Chuyên gia không có quyền vào hệ thống của bạn. Họ nói: **"bạn tra giúp tôi mã đơn ABC123 trong hệ thống nhé"**.
>
> Bạn tra, đọc kết quả cho họ. Họ dựa vào đó để trả lời.
>
> Họ **đề nghị**, bạn **quyết định có làm hay không**, và bạn **là người thực hiện**.

Ba vế cuối là toàn bộ mô hình bảo mật của function calling. Nếu bạn tự động làm mọi thứ mô hình đề nghị, bạn đã tự bỏ đi lớp kiểm soát duy nhất.

## Ví dụ nhỏ

```json
// Bạn khai báo công cụ
{
  "name": "tra_don_hang",
  "description": "Tra cứu trạng thái đơn hàng theo mã đơn",
  "parameters": {
    "type": "object",
    "properties": { "maDon": { "type": "string" } },
    "required": ["maDon"]
  }
}
```

## Code chạy thế nào

**Vòng lặp bốn bước:**

```text
① BẠN gửi: câu hỏi + danh sách công cụ đã khai báo
② MÔ HÌNH trả về một trong hai:
     - câu trả lời bằng văn bản, HOẶC
     - "tôi muốn gọi tra_don_hang với maDon='ABC123'"
③ BẠN chạy hàm đó (hoặc từ chối), lấy kết quả
④ BẠN gửi lại: câu hỏi + đề nghị của mô hình + KẾT QUẢ
   ⇒ mô hình trả lời dựa trên kết quả thật

⇒ Bước ②–④ có thể lặp: mô hình gọi tiếp công cụ khác.
```

```ts
const res = await model.chat({ messages, tools })
if (res.toolCalls) {
  for (const goi of res.toolCalls) {
    const kq = await chayCongCu(goi.name, goi.arguments)   // ← MÃ CỦA BẠN
    messages.push({ role: 'tool', toolCallId: goi.id, content: JSON.stringify(kq) })
  }
  return model.chat({ messages, tools })   // gọi lại với kết quả
}
```

**Ba điều suy ra ngay từ vòng lặp:**

```text
① Mô hình KHÔNG chạy gì. Bạn chạy.
   ⇒ Mọi kiểm tra quyền, xác thực tham số, giới hạn — đều ở mã bạn.

② Mỗi lần gọi công cụ là MỘT LƯỢT nữa với mô hình
   ⇒ thêm độ trễ, thêm token (câu hỏi + đề nghị + kết quả
     đều nằm trong ngữ cảnh của lượt sau)
   ⇒ ba công cụ tuần tự = ít nhất bốn lời gọi mô hình

③ Kết quả công cụ đi vào NGỮ CẢNH
   ⇒ Kết quả 50.000 token sẽ chiếm hết context window.
   ⇒ Và nội dung của nó có thể chứa chỉ dẫn giả mạo
     ([[prompt-injection]]).
```

## Cú pháp

**Khi nào dùng công cụ — bốn nhóm:**

```text
① SỰ THẬT MÔ HÌNH KHÔNG BIẾT
   dữ liệu của bạn, giá hiện tại, tồn kho, hồ sơ khách hàng

② VIỆC NÓ LÀM KÉM
   tính toán chính xác, ngày giờ, sắp xếp số lượng lớn
   ⇒ Đừng để mô hình "nhớ" hay "tính" thứ có thể tra
     ([[ao-giac-va-gioi-han]])

③ HÀNH ĐỘNG CÓ TÁC DỤNG PHỤ
   gửi email, tạo ticket, đặt lịch
   ⇒ Nhóm này cần cẩn trọng nhất: nó THAY ĐỔI thế giới bên ngoài.

④ TRUY VẤN CÓ CẤU TRÚC
   "đơn hàng của tôi tháng này", "sản phẩm dưới 500 nghìn"
   ⇒ Đây là truy vấn, không phải tìm kiếm ngữ nghĩa —
     đừng dùng RAG cho nó ([[rag-la-gi-va-khi-nao-dung]]).
```

**Function calling so với RAG — hai công cụ cho hai bài toán:**

```text
RAG:              câu hỏi mở, trả lời từ văn bản
                  "chính sách đổi trả thế nào?"
FUNCTION CALLING: câu hỏi có cấu trúc, cần dữ liệu chính xác
                  "đơn ABC123 tới đâu rồi?"

⇒ Nhiều hệ thống cần CẢ HAI, và bước đầu tiên là phân loại
  câu hỏi thuộc loại nào.
⇒ Và bản thân "tìm trong tài liệu" cũng có thể là MỘT CÔNG CỤ —
  lúc đó mô hình tự quyết định khi nào cần tra.
```

**Kết quả trả về — thiết kế cho mô hình đọc:**

```ts
// ❌ Trả về nguyên bản ghi CSDL
{ id: 88213, status_code: 3, created_at: '2026-08-01T03:22:11Z', ... }

// ✅ Trả về thứ mô hình hiểu và dùng được
{ maDon: 'ABC123', trangThai: 'Đang giao', duKienGiao: '2026-08-28',
  viTri: 'Kho Hà Nội' }
```

```text
Ba nguyên tắc cho kết quả:
  □ Dùng nhãn có nghĩa, không dùng mã số nội bộ
  □ Chỉ trả về trường CẦN THIẾT — mỗi trường thừa là token thừa
    và một cơ hội nữa để mô hình bám vào thứ không liên quan
  □ Không trả về dữ liệu người dùng không được xem
    ⇒ Lọc ở tầng dữ liệu, không dặn mô hình đừng nói
```

## Tại sao cần nó

Vì nó thay đổi loại bài toán mô hình giải được:

```text
Không có công cụ:
  Mô hình chỉ làm việc với văn bản trong ngữ cảnh.
  Mọi thứ về hệ thống của bạn phải được đưa vào trước.

Có công cụ:
  Mô hình QUYẾT ĐỊNH nó cần gì và yêu cầu.
  ⇒ Không cần đoán trước người dùng sẽ hỏi gì.
  ⇒ Và đây chính là bước từ "trợ lý trả lời" sang "agent"
    ([[agent-la-gi-va-khi-nao-can]]).
```

**Ba thứ phải làm ngay từ công cụ đầu tiên:**

```text
① XÁC THỰC THAM SỐ bằng schema của bạn
   Mô hình có thể gọi với tham số sai kiểu, thiếu, hoặc vô lý.
   ⇒ Coi tham số như dữ liệu từ người dùng — vì thực chất
     nó chịu ảnh hưởng của người dùng
     ([[xac-thuc-dau-vao-va-bien]]).

② KIỂM QUYỀN trong hàm, theo người dùng thật
   `tra_don_hang('XYZ999')` — đơn đó có phải của họ không?
   ⇒ Đừng để mô hình quyết định điều này.

③ GIỚI HẠN
   timeout, kích thước kết quả, số lần gọi mỗi request
   ⇒ Không giới hạn số lần gọi thì một vòng lặp là một hoá đơn.
```

**Và một lời khuyên về phạm vi:**

```text
Bắt đầu với 2–3 công cụ, mỗi cái làm MỘT việc rõ ràng.
Đừng khai 20 công cụ ngay:
  □ Mô hình chọn sai nhiều hơn khi có quá nhiều lựa chọn
  □ Mô tả công cụ chiếm token ở MỌI lời gọi
  □ Khó test, khó biết cái nào đang gây lỗi
  ([[khai-bao-cong-cu-tot]])
```

## So sánh

| | RAG | Function calling |
|---|---|---|
| Nguồn dữ liệu | văn bản đã lập chỉ mục | hệ thống đang chạy |
| Câu hỏi phù hợp | mở, diễn đạt tự do | có cấu trúc, cần chính xác |
| Độ mới của dữ liệu | theo lần đồng bộ | thời gian thực |
| Thực hiện hành động | ❌ | ✅ |
| Số lời gọi mô hình | 1 | 2+ |

## Dễ nhầm

**1. Nghĩ mô hình tự thực thi hàm.** Bạn thực thi.

**2. Không xác thực tham số.** Coi như dữ liệu từ người dùng.

**3. Kiểm quyền bằng cách dặn mô hình.** Kiểm trong mã.

**4. Trả về nguyên bản ghi CSDL.** Token thừa, và có thể rò dữ liệu.

**5. Không giới hạn số lần gọi công cụ.**

**6. Không giới hạn kích thước kết quả.** Chiếm hết ngữ cảnh.

**7. Quên mỗi lần gọi là một lượt mô hình nữa.** Độ trễ và chi phí.

**8. Khai 20 công cụ ngay từ đầu.**

**9. Dùng RAG cho câu hỏi thật ra là truy vấn.**

**10. Tin nội dung kết quả công cụ là an toàn.** Nó vào ngữ cảnh.

## Mẹo nhớ

> **Mô hình chỉ ĐỀ NGHỊ. Bạn QUYẾT ĐỊNH và THỰC THI.**
>
> **Tham số công cụ là dữ liệu KHÔNG TIN ĐƯỢC — xác thực bằng schema.**
>
> **Mỗi lần gọi công cụ là MỘT LƯỢT mô hình nữa: thêm độ trễ, thêm token.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn bước của vòng lặp function calling?
2. Ba điều suy ra ngay từ vòng lặp đó?
3. Bốn nhóm việc nên dùng công cụ?
4. RAG và function calling khác nhau ở đâu?
5. Ba thứ phải làm ngay từ công cụ đầu tiên?

## Tự viết lại

Không nhìn lại, thiết kế công cụ cho trợ lý cửa hàng:

```text
① ba công cụ cần thiết, kèm schema tham số
② kết quả trả về của một công cụ, dạng mô hình đọc được
③ kiểm quyền cho từng công cụ
④ các giới hạn bạn đặt
```

Tự kiểm: ở ③, nếu mô hình gọi `tra_don_hang` với mã đơn của người khác, mã của bạn phản ứng thế nào?

## Thử sức

Trợ lý của bạn có công cụ `tra_don_hang(maDon)`. Một người dùng hỏi: *"Cho tôi xem đơn hàng ABC999"* — mã đơn của người khác. Trợ lý trả về đầy đủ thông tin đơn đó, gồm địa chỉ và số điện thoại người nhận.

Ba câu để trả lời: lỗi nằm ở đâu, và vì sao chỉ dẫn hệ thống không ngăn được; cách sửa; và bạn tìm những công cụ khác có cùng lỗi bằng cách nào. Câu khó nhất: nếu công cụ đó nhận thêm tham số `userId` do mô hình điền vào, vì sao đó **vẫn** là thiết kế sai — và tham số đó nên đến từ đâu?
