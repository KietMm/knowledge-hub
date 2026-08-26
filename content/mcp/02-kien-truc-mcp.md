---
title: Kiến trúc MCP
slug: kien-truc-mcp
summary: Host, client, server — ai chạy ở đâu, vòng đời một phiên, và ranh giới tin cậy nằm ở chỗ nào.
level: trung-cap
tags: [ai, mcp, kien-truc, giao-thuc]
khung: v2
---

> **Sau bài này bạn sẽ:** vẽ được kiến trúc MCP, và biết ranh giới tin cậy nằm ở đâu.

## Ý tưởng chính

MCP tách rõ ba vai: **host** (ứng dụng người dùng dùng), **client** (phần nói chuyện theo chuẩn), **server** (thứ bạn viết).

Điều quan trọng nhất về kiến trúc này không phải sơ đồ, mà là **ranh giới tin cậy**: server chạy ở đâu, với quyền của ai, và nó tin ai.

## Mental model

Hãy nghĩ tới **một quán cà phê có nhiều nhà cung cấp**.

> **Quán** là host: nơi khách tới, nơi quyết định phục vụ gì.
>
> **Nhân viên đặt hàng** là client: họ biết cách nói chuyện với nhà cung cấp theo đúng quy trình đặt hàng chuẩn.
>
> **Nhà cung cấp** là server: họ có danh mục, họ giao hàng khi được đặt.
>
> Và ranh giới quan trọng: **quán chịu trách nhiệm với khách**, không phải nhà cung cấp. Nhưng nhà cung cấp chịu trách nhiệm về **thứ họ giao** — và họ phải tự quyết định giao cho ai, bao nhiêu.

Vế cuối là điểm dễ nhầm nhất: **server phải tự lo phân quyền**, không trông chờ host lọc hộ.

## Ví dụ nhỏ

```text
Người dùng
   │
[ HOST ]  ứng dụng AI — quản lý ngữ cảnh, gọi mô hình, hiển thị
   │  (một client cho mỗi server)
   ├── CLIENT ──▶ SERVER A  (stdio, chạy trên máy người dùng)
   └── CLIENT ──▶ SERVER B  (HTTP, chạy trên máy chủ công ty)
```

## Code chạy thế nào

**Vòng đời một phiên:**

```text
① KẾT NỐI
   Host khởi động server (stdio) hoặc mở kết nối (HTTP).

② BẮT TAY
   Hai bên trao đổi phiên bản giao thức và khả năng hỗ trợ.
   ⇒ Server nói: tôi có tool, resource, prompt.
   ⇒ Host nói: tôi hỗ trợ những gì.

③ LIỆT KÊ
   Host hỏi danh sách tool/resource/prompt.
   ⇒ Mô tả tool sẽ đi vào ngữ cảnh của mô hình.

④ SỬ DỤNG
   Mô hình đề nghị gọi tool → host gọi client → client gọi server
   → server trả kết quả → host đưa vào ngữ cảnh

⑤ ĐÓNG
   Host tắt server hoặc đóng kết nối.
```

```text
Bước ③ đáng chú ý: danh sách tool được lấy MỘT LẦN khi kết nối
(và có thể cập nhật khi server báo thay đổi).
⇒ Nên mô tả tool là thứ NGƯỜI DÙNG sẽ mang theo suốt phiên,
  và nó chiếm token trong mọi lời gọi mô hình.
⇒ Server phơi 40 tool là 40 mô tả trong mọi lời gọi
  ([[khai-bao-cong-cu-tot]]).
```

**Ranh giới tin cậy — chỗ quan trọng nhất:**

```text
Server stdio chạy trên máy người dùng:
  ⇒ Nó chạy với QUYỀN CỦA NGƯỜI DÙNG ĐÓ.
  ⇒ Đọc được mọi file người đó đọc được.
  ⇒ Nếu server có lỗ hổng hoặc là mã độc, đó là mã độc chạy
    với quyền đầy đủ của người dùng.

Server HTTP chạy trên máy chủ:
  ⇒ Nó KHÔNG biết người dùng là ai, trừ khi bạn truyền danh tính.
  ⇒ Không xác thực ⇒ ai gọi được server cũng có toàn bộ quyền
    của nó.
```

```text
⇒ Hai kết luận:
  □ Server chỉ nên có quyền tối thiểu cho việc nó làm
  □ Server HTTP PHẢI tự xác thực và phân quyền —
    host không làm việc đó hộ ([[bao-mat-mcp]])
```

## Cú pháp

**Chọn stdio hay HTTP:**

```text
STDIO
  Server chạy như tiến trình con, một tiến trình cho mỗi phiên.
  ✅ Truy cập file cục bộ, công cụ cục bộ (git, docker)
  ✅ Không cần xác thực — nó đã chạy với quyền người dùng
  ✅ Không lộ ra mạng
  ❌ Mỗi người dùng một bản; không chia sẻ trạng thái
  ❌ Cài đặt trên từng máy

HTTP
  Server là dịch vụ chạy chung.
  ✅ Một chỗ cập nhật, mọi người dùng bản mới
  ✅ Truy cập được hệ thống nội bộ mà máy người dùng không vào được
  ❌ Cần xác thực, phân quyền, giới hạn tần suất, giám sát
  ❌ Là một dịch vụ web ⇒ mọi lo lắng của một dịch vụ web
```

```text
Nguyên tắc: dữ liệu và công cụ CỤC BỘ ⇒ stdio.
            Hệ thống DÙNG CHUNG của công ty ⇒ HTTP.
```

**Server có thể chủ động — hai chiều, không chỉ một:**

```text
Ngoài việc trả lời yêu cầu, server còn có thể:
  □ Báo danh sách tool/resource đã THAY ĐỔI
  □ Gửi tiến độ cho tác vụ dài
  □ Ghi log để host hiển thị

⇒ Điều này làm MCP khác một REST API thuần: kết nối là một
  PHIÊN, không phải chuỗi request rời rạc.
⇒ Với tác vụ chạy lâu, gửi tiến độ là thứ đáng làm — nó biến
  một khoảng chờ im lặng thành một quá trình nhìn thấy được.
```

**Một host, nhiều server — và hệ quả:**

```text
Host thường kết nối nhiều server cùng lúc.
⇒ Mô hình thấy TỔNG HỢP tool của tất cả.
⇒ Ba vấn đề nảy sinh:
  □ TRÙNG TÊN: hai server đều có `tim_kiem`
    ⇒ Host thường thêm tiền tố, nhưng đừng dựa vào đó —
      đặt tên có ngữ cảnh: `jira_tim_ticket`
  □ QUÁ NHIỀU TOOL: bốn server × 10 tool = 40 mô tả
    ⇒ Mô hình chọn sai nhiều hơn
  □ RANH GIỚI DỮ LIỆU: kết quả từ server A đi vào ngữ cảnh,
    và mô hình có thể dùng nó để gọi server B
    ⇒ Đây là đường cho prompt injection lan giữa các server
      ([[prompt-injection]])
```

Vấn đề thứ ba ít được nói tới và là vấn đề nghiêm trọng nhất: **dữ liệu từ một nguồn không tin được có thể điều khiển hành động lên một nguồn khác**.

## Tại sao cần nó

Vì hiểu kiến trúc quyết định bạn đặt trách nhiệm ở đâu:

```text
Hiểu sai: "host sẽ lo phân quyền"
  ⇒ Server HTTP không xác thực ⇒ ai gọi cũng được.

Hiểu sai: "server chạy trong sandbox"
  ⇒ Server stdio chạy với quyền đầy đủ của người dùng.

Hiểu đúng:
  □ Server tự chịu trách nhiệm về những gì nó phơi ra
  □ Host chịu trách nhiệm về ngữ cảnh và về việc hỏi người dùng
  □ Người dùng chịu trách nhiệm về việc cài server nào
```

**Ba câu hỏi trước khi cài một MCP server:**

```text
① Nó chạy với quyền gì? Đọc được những gì?
② Ai viết nó, mã nguồn có xem được không?
③ Nó gửi dữ liệu đi đâu?

⇒ Cài một MCP server = chạy mã của người khác với quyền của bạn.
  Cùng mức cân nhắc như cài một extension hoặc một gói phần mềm
  ([[ranh-gioi-va-trach-nhiem]]).
```

## So sánh

| | stdio | HTTP |
|---|---|---|
| Chạy ở | máy người dùng | máy chủ |
| Quyền | của người dùng | của dịch vụ |
| Xác thực | không cần | **bắt buộc** |
| Truy cập file cục bộ | ✅ | ❌ |
| Cập nhật | từng máy | một chỗ |
| Phù hợp | công cụ cục bộ | hệ thống dùng chung |

## Dễ nhầm

**1. Nghĩ host lo phân quyền cho server.**

**2. Server HTTP không xác thực.**

**3. Quên server stdio chạy với quyền đầy đủ của người dùng.**

**4. Phơi quá nhiều tool.** Chúng chiếm token và làm mô hình chọn sai.

**5. Đặt tên tool không có ngữ cảnh.** Trùng với server khác.

**6. Không gửi tiến độ cho tác vụ dài.**

**7. Dùng HTTP khi stdio đủ.**

**8. Bỏ qua đường injection giữa các server.**

**9. Cài server không rõ nguồn gốc.**

**10. Cấp quyền rộng cho server để tiện.**

## Mẹo nhớ

> **Bạn viết SERVER. Server tự lo XÁC THỰC và PHÂN QUYỀN — host không làm hộ.**
>
> **stdio chạy với QUYỀN CỦA NGƯỜI DÙNG. Cài server = chạy mã người khác với quyền của bạn.**
>
> **Nhiều server ⇒ dữ liệu từ server A có thể điều khiển hành động lên server B.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba vai và trách nhiệm của mỗi vai?
2. Năm bước vòng đời một phiên, bước nào ảnh hưởng token?
3. Ranh giới tin cậy của stdio và của HTTP khác nhau thế nào?
4. Ba vấn đề khi một host kết nối nhiều server?
5. Ba câu hỏi trước khi cài một server?

## Tự viết lại

Không nhìn lại, thiết kế kiến trúc MCP cho công ty bạn:

```text
① server nào cho dữ liệu gì
② mỗi server dùng stdio hay HTTP, vì sao
③ với server HTTP: xác thực và phân quyền thế nào
④ đặt tên tool ra sao để tránh trùng
⑤ giới hạn số tool mỗi server
```

Tự kiểm: ở ③, server của bạn biết người dùng là ai bằng cách nào — và nếu không biết, nó phân quyền thế nào?

## Thử sức

Đội cài một MCP server đọc CSDL nội bộ, chạy stdio trên máy từng người. Sau một tháng, phát hiện một lập trình viên đã dùng trợ lý AI truy vấn được bảng lương — bảng mà họ không có quyền xem trong ứng dụng nội bộ.

Ba câu để trả lời: lỗi nằm ở đâu trong kiến trúc; hai cách sửa và đánh đổi của mỗi cách; và bạn kiểm tra những server khác có cùng vấn đề bằng cách nào. Câu khó nhất: server chạy stdio với quyền của người dùng, nhưng người dùng đó **có** quyền kết nối CSDL ở tầng mạng — vậy phân quyền đúng phải nằm ở tầng nào, và vì sao?
