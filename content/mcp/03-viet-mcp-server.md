---
title: Viết một MCP server
slug: viet-mcp-server
summary: Từ ý tưởng tới server chạy được — cấu trúc, khai báo tool, xử lý lỗi, và cách test.
level: trung-cap
tags: [ai, mcp, thiet-ke, kiem-thu]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được một MCP server có cấu trúc tốt, và test nó mà không cần một host thật.

## Ý tưởng chính

Một MCP server về bản chất là một **chương trình phơi ra danh sách tool và xử lý lời gọi**.

Phần khó không nằm ở giao thức — thư viện lo phần đó. Nó nằm ở những thứ giống hệt việc thiết kế một API: **chọn phơi ra cái gì**, **mô tả thế nào**, và **xử lý lỗi ra sao**.

## Mental model

Hãy nghĩ tới **viết một cuốn cẩm nang cho người mới đến làm việc**.

> Bạn không chép cả kho tài liệu cho họ. Bạn chọn **những việc họ thật sự cần làm**, mô tả mỗi việc rõ ràng, và nói rõ **khi nào không nên làm**.
>
> Và bạn viết cẩm nang cho người **không biết gì về nội bộ**: không dùng viết tắt của công ty, không giả định họ biết bảng nào chứa gì.

Người đọc cẩm nang đó là mô hình. Nó chỉ biết những gì bạn viết trong mô tả — không đọc được mã của bạn, không biết bảng CSDL của bạn có gì.

## Ví dụ nhỏ

```ts
server.tool(
  'tra_don_hang',
  'Tra trạng thái và lịch sử giao của MỘT đơn hàng theo mã đơn. Dùng khi người dùng hỏi về đơn cụ thể. KHÔNG dùng để liệt kê nhiều đơn.',
  { maDon: z.string().describe('Mã đơn, 3 chữ + 3 số, ví dụ ABC123') },
  async ({ maDon }, ctx) => {
    const don = await layDon(maDon, ctx.userId)
    if (don === null) return { loi: 'Không tìm thấy đơn này. Hãy hỏi người dùng kiểm tra lại mã.' }
    return { maDon: don.ma, trangThai: nhanTrangThai(don), duKienGiao: don.duKien }
  },
)
```

## Code chạy thế nào

**Cấu trúc một server — tách ba phần:**

```text
① TẦNG GIAO THỨC   khai báo tool/resource, đăng ký handler
                    ⇒ Mỏng. Chỉ dịch giữa MCP và mã của bạn.
② TẦNG NGHIỆP VỤ   hàm thật sự làm việc
                    ⇒ Không biết gì về MCP. Test được độc lập.
③ TẦNG DỮ LIỆU     truy vấn CSDL, gọi API

⇒ Đây là chia tầng thường ([[chia-tang-mot-ung-dung]]).
  Lợi ích cụ thể: tầng ② test được bằng test thường, và
  dùng lại được nếu sau này bạn muốn phơi qua HTTP API.
```

**Bốn thứ trong khai báo một tool:**

```text
① TÊN — có ngữ cảnh, tránh trùng với server khác
   `donhang_tra` tốt hơn `tra`
② MÔ TẢ — làm gì, dùng khi nào, KHÔNG dùng khi nào
③ SCHEMA THAM SỐ — có `describe` cho từng trường
④ HÀM XỬ LÝ — nhận tham số đã xác thực, trả kết quả
```

```text
Điểm quan trọng: mô tả và schema LÀ giao diện.
Mô hình không đọc mã của bạn.
⇒ Mọi ràng buộc, mọi quy ước, mọi cảnh báo phải nằm trong
  mô tả — không nằm trong comment ([[khai-bao-cong-cu-tot]]).
```

## Cú pháp

**Kết quả trả về — thiết kế cho mô hình đọc:**

```ts
// ❌ Trả nguyên bản ghi
{ id: 88213, status: 3, addr_line_1: '...', internal_note: '...' }

// ✅ Trả thứ có nghĩa, chỉ trường cần
{ maDon: 'ABC123', trangThai: 'Đang giao', duKienGiao: '2026-08-28' }
```

```text
Ba nguyên tắc:
  □ Nhãn có nghĩa thay cho mã số nội bộ
  □ CHỈ trường cần — mỗi trường thừa là token thừa trong mọi
    lời gọi sau đó
  □ Không trả dữ liệu người dùng không được xem
    ⇒ Lọc ở tầng dữ liệu, không dặn mô hình đừng nói
      ([[phan-quyen-theo-ban-ghi]])
```

**Xử lý lỗi — thông báo là cho mô hình đọc:**

```ts
// ❌ Ném lỗi thô ⇒ chi tiết nội bộ vào ngữ cảnh
throw new Error(err.stack)

// ❌ Quá mơ hồ ⇒ mô hình không biết làm gì
return { loi: 'Lỗi' }

// ✅ Nói rõ chuyện gì và mô hình nên làm gì tiếp
return { loi: 'Không tìm thấy đơn ABC999. Hãy hỏi người dùng kiểm tra lại mã đơn.' }
return { loi: 'Không có quyền xem đơn này. Không thử lại; hãy nói người dùng liên hệ quản trị.' }
```

```text
Phân biệt lỗi TẠM THỜI và VĨNH VIỄN trong thông báo:
  Tạm thời  → "hãy thử lại sau ít phút"
  Vĩnh viễn → "không thử lại; hãy ..."
⇒ Không nói ra thì mô hình có thể thử lại mãi
  ([[vong-lap-agent]]).
```

**Test — ba tầng, và tầng đầu là quan trọng nhất:**

```text
① TEST TẦNG NGHIỆP VỤ như hàm thường
   Không cần MCP, không cần mô hình. Nhanh, tất định.
   ⇒ Đây là nơi phần lớn test nên nằm.

② TEST SERVER qua giao thức
   Gọi trực tiếp handler, hoặc dùng công cụ kiểm tra MCP.
   ⇒ Kiểm: tool có được liệt kê không, schema đúng không,
     lời gọi hợp lệ và không hợp lệ xử lý ra sao.

③ TEST VỚI HOST THẬT
   Ít test nhất. Kiểm việc mô hình có CHỌN đúng tool không —
   tầng chỉ phát hiện được khi có mô hình thật
   ([[cong-cu-trong-thuc-te]]).
```

**Bốn thứ phải có trước khi người khác dùng server của bạn:**

```text
□ Xác thực và phân quyền — nếu server chạy chung (HTTP)
□ Giới hạn: timeout mỗi tool, kích thước kết quả, tần suất
□ Log mọi lời gọi: tool nào, tham số gì, ai gọi, kết quả gì
□ Tài liệu: server làm gì, cần biến môi trường gì, quyền gì
```

## Tại sao cần nó

Vì server của bạn là **một API mà người dùng là mô hình**, và nó có hai điểm khác API thường:

```text
① Mô tả LÀ tài liệu duy nhất
   API thường: lập trình viên đọc tài liệu, hỏi bạn khi không rõ.
   MCP server: mô hình chỉ có mô tả. Không hỏi được.
   ⇒ Mô tả mơ hồ ⇒ gọi sai, và bạn không biết vì sao.

② Kết quả đi vào NGỮ CẢNH
   API thường: client nhận, xử lý, hiển thị.
   MCP server: kết quả trở thành một phần "suy nghĩ" của mô hình
   ⇒ Kết quả dài làm đầy ngữ cảnh
   ⇒ Và nội dung của nó có thể chứa chỉ dẫn giả mạo
     ([[bao-mat-mcp]])
```

**Bắt đầu nhỏ — thứ tự nên đi:**

```text
① MỘT tool chỉ đọc, một việc rõ ràng
② Dùng thử, đọc log: mô hình có gọi đúng không, tham số đúng không
③ Sửa MÔ TẢ dựa trên log — đây là vòng lặp chính
④ Thêm tool thứ hai
⑤ Thêm resource cho dữ liệu người dùng cần đọc
⑥ Cuối cùng mới thêm tool ghi, và lúc đó lo bảo mật kỹ
```

```text
Bước ③ là vòng lặp quan trọng nhất và hay bị bỏ: phần lớn
vấn đề của một MCP server nằm ở mô tả, không ở mã.
```

## So sánh

| | API cho người | MCP tool cho mô hình |
|---|---|---|
| Tài liệu | ngoài mã, đọc riêng | **chính là mô tả** |
| Hỏi lại khi không rõ | ✅ | ❌ |
| Kết quả dùng để | hiển thị | **đưa vào ngữ cảnh** |
| Kết quả dài | phân trang | chiếm token |
| Tên trường | ngắn gọn được | phải có nghĩa |

## Dễ nhầm

**1. Mô tả tool sơ sài.** Mô hình không có tài liệu nào khác.

**2. Trả nguyên bản ghi CSDL.** Token thừa, có thể rò dữ liệu.

**3. Ném lỗi thô.** Chi tiết nội bộ vào ngữ cảnh.

**4. Thông báo lỗi không nói mô hình nên làm gì.**

**5. Không phân biệt lỗi tạm thời và vĩnh viễn.**

**6. Trộn tầng giao thức với tầng nghiệp vụ.** Không test được.

**7. Không giới hạn kích thước kết quả.**

**8. Không log tham số.** Không cải thiện mô tả được.

**9. Bắt đầu bằng tool ghi.**

**10. Phơi 20 tool ngay.** Bắt đầu bằng một.

## Mẹo nhớ

> **Mô tả tool LÀ tài liệu duy nhất — mô hình không đọc mã và không hỏi lại được.**
>
> **Kết quả đi vào NGỮ CẢNH: chỉ trả trường cần, nhãn có nghĩa.**
>
> **Vòng lặp chính: dùng thử → đọc log → sửa MÔ TẢ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba tầng của một server, tầng nào test dễ nhất?
2. Bốn thứ trong khai báo một tool?
3. Ba nguyên tắc cho kết quả trả về?
4. Vì sao phải phân biệt lỗi tạm thời và vĩnh viễn?
5. Hai điểm MCP tool khác API thường?

## Tự viết lại

Không nhìn lại, viết một MCP server cho hệ thống ticket nội bộ:

```text
① hai tool đọc và một tool ghi, có mô tả đầy đủ
② schema tham số có describe
③ kết quả trả về của một tool
④ hai thông báo lỗi, một tạm thời một vĩnh viễn
⑤ ba test bạn viết
```

Tự kiểm: mô tả tool ghi của bạn có nói rõ khi nào **không** nên gọi không?

## Thử sức

Server MCP của bạn có tool `tim_kiem_tai_lieu`. Log cho thấy mô hình gọi nó với những truy vấn rất chung ("tài liệu"), nhận về 50 kết quả mỗi lần, và ngữ cảnh đầy sau ba lời gọi.

Ba câu để trả lời: hai vấn đề riêng biệt ở đây; cách sửa từng cái, và cái nào sửa ở mô tả cái nào sửa ở mã; và bạn xác nhận đã cải thiện bằng cách nào. Câu khó nhất: nếu bạn giới hạn kết quả xuống 5, mô hình có thể gọi nhiều lần hơn để bù — bạn thiết kế thế nào để tránh điều đó?
