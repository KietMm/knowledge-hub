---
title: MCP là gì
slug: mcp-la-gi
summary: Một chuẩn để nối mô hình với công cụ và dữ liệu — vấn đề nó giải, và khi nào bạn không cần nó.
level: co-ban
tags: [ai, mcp, giao-thuc, kien-truc]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được MCP giải vấn đề gì, và biết khi nào function calling thường là đủ.

## Ý tưởng chính

Function calling giải quyết việc **một ứng dụng** cho **một mô hình** dùng công cụ của nó.

**MCP (Model Context Protocol)** giải một bài toán khác: làm sao để **nhiều ứng dụng AI khác nhau** dùng được **cùng một bộ công cụ**, mà không ai phải viết lại tích hợp cho từng bên.

Nó là một **chuẩn giao tiếp**, không phải một tính năng của mô hình.

## Mental model

Hãy nghĩ tới **cổng USB**.

> Trước khi có chuẩn: mỗi thiết bị một loại đầu cắm. Máy in một kiểu, chuột một kiểu, máy ảnh một kiểu. Mỗi máy tính phải có mỗi loại cổng.
>
> Có USB: **một chuẩn**. Nhà sản xuất thiết bị làm theo chuẩn một lần; mọi máy tính dùng được.
>
> Ai được lợi nhiều nhất? Không phải người chỉ có một thiết bị. Là **hệ sinh thái** — vì số kết nối cần viết giảm từ "mỗi cặp một cái" xuống "mỗi bên một cái".

Đó chính xác là bài toán MCP giải: **N ứng dụng × M nguồn dữ liệu** cần N×M tích hợp; với một chuẩn thì chỉ cần N + M.

## Ví dụ nhỏ

```text
KHÔNG CÓ CHUẨN
  App A cần dữ liệu từ Jira, GitHub, CSDL nội bộ → 3 tích hợp
  App B cũng cần cả ba                            → 3 tích hợp nữa
  ⇒ 6 tích hợp cho 2 app × 3 nguồn

CÓ MCP
  3 MCP server (Jira, GitHub, CSDL) + 2 app hỗ trợ MCP
  ⇒ 5 thứ, và thêm app thứ ba không cần viết thêm server nào
```

## Code chạy thế nào

**Ba vai trong MCP:**

```text
HOST      ứng dụng AI mà người dùng dùng
          (trợ lý lập trình, ứng dụng chat, IDE)
CLIENT    phần trong host, nói chuyện với server theo chuẩn MCP
SERVER    thứ BẠN viết — phơi ra công cụ, dữ liệu, prompt mẫu

⇒ Bạn viết SERVER. Host và client là phần đã có.
⇒ Server của bạn không cần biết mô hình nào đang dùng nó.
```

**Server phơi ra ba loại thứ:**

```text
TOOL       hành động mô hình gọi được — như function calling
           "tra_don_hang", "tao_ticket"

RESOURCE   dữ liệu host đọc được, có địa chỉ
           "file://tai-lieu/chinh-sach.md", "db://don-hang/ABC123"
           ⇒ Khác tool: nó là DỮ LIỆU để đọc, không phải hành động.

PROMPT     mẫu prompt đóng gói sẵn cho một việc
           "phan-tich-loi", "viet-tai-lieu-api"
           ⇒ Người dùng chọn từ danh sách, không phải tự viết.
```

```text
Ba loại này khác nhau ở chỗ AI QUYẾT ĐỊNH dùng:
  TOOL     — mô hình quyết định gọi khi nào
  RESOURCE — host hoặc người dùng chọn đưa vào ngữ cảnh
  PROMPT   — người dùng chọn

⇒ Phân biệt này quan trọng: đưa một tài liệu lớn thành RESOURCE
  thì người dùng chọn khi cần; làm nó thành TOOL thì mô hình
  có thể gọi liên tục ([[resource-prompt-va-tool]]).
```

## Cú pháp

**Khi nào MCP đáng dùng:**

```text
✅ Nhiều ứng dụng AI cần cùng một nguồn dữ liệu
✅ Bạn muốn công cụ của mình dùng được từ nhiều host
✅ Bạn dùng một trợ lý có sẵn và muốn nối nó vào hệ thống nội bộ
   ⇒ Đây là trường hợp phổ biến nhất trong thực tế: bạn KHÔNG
     viết ứng dụng AI, bạn chỉ muốn trợ lý đang dùng truy cập
     được dữ liệu của mình.
✅ Bạn muốn dùng lại server người khác đã viết
```

**Khi nào KHÔNG cần:**

```text
❌ Bạn tự viết ứng dụng AI, và chỉ ứng dụng đó dùng công cụ
   ⇒ Function calling trực tiếp đơn giản hơn, ít tầng hơn
     ([[function-calling-co-ban]]).
❌ Một công cụ, một ứng dụng
❌ Bạn cần kiểm soát chặt từng chi tiết của lời gọi
   ⇒ Thêm một tầng chuẩn nghĩa là thêm một tầng trừu tượng.
```

```text Nói gọn:
  Bạn là NGƯỜI DÙNG một trợ lý có sẵn ⇒ MCP rất hợp.
  Bạn là NGƯỜI XÂY ứng dụng AI riêng ⇒ function calling thường đủ.
```

**Hai cách kết nối:**

```text
STDIO — server chạy như một tiến trình con của host
  Host khởi động server, nói chuyện qua đầu vào/đầu ra chuẩn.
  + Đơn giản, không cần mạng, không cần xác thực riêng
  + Chạy trên máy người dùng ⇒ truy cập file cục bộ được
  − Chỉ dùng được cục bộ

HTTP — server chạy như một dịch vụ
  + Dùng được từ xa, nhiều người dùng chung một server
  − Cần xác thực, phân quyền, và mọi thứ của một dịch vụ web
    ([[bao-mat-mcp]])
```

Với server cá nhân hoặc server cho đội nhỏ chạy trên máy mình, `stdio` gần như luôn là lựa chọn đúng để bắt đầu.

## Tại sao cần nó

Vì nó thay đổi ai làm công việc tích hợp:

```text
Không có chuẩn:
  Mỗi nhà cung cấp ứng dụng AI tự viết tích hợp cho từng nguồn.
  ⇒ Nguồn dữ liệu ít phổ biến thì không ai viết.
  ⇒ Và hệ thống NỘI BỘ của bạn thì chắc chắn không ai viết.

Có chuẩn:
  Bạn viết một server cho hệ thống nội bộ của mình.
  ⇒ Mọi host hỗ trợ MCP dùng được.
  ⇒ Và bạn không phải chờ ai.
```

**Nhưng nhớ ba điều:**

```text
① MCP KHÔNG làm mô hình thông minh hơn
   Nó chỉ chuẩn hoá cách nối. Chất lượng vẫn phụ thuộc vào
   mô tả công cụ và chất lượng dữ liệu bạn phơi ra
   ([[khai-bao-cong-cu-tot]]).

② MCP KHÔNG giải quyết bảo mật cho bạn
   Server của bạn phải tự xác thực, phân quyền, giới hạn.
   Và một MCP server chạy trên máy người dùng có quyền của
   người dùng đó — đó là một bề mặt tấn công thật.

③ Đây là một chuẩn ĐANG PHÁT TRIỂN
   Chi tiết có thể thay đổi. Nên bọc phần dùng MCP sau một
   lớp của bạn, đừng rải nó khắp mã.
```

**Bắt đầu từ đâu:**

```text
① Dùng thử một server người khác đã viết — để hiểu mô hình
② Viết một server nhỏ với MỘT công cụ chỉ đọc
③ Thêm resource cho dữ liệu người dùng cần
④ Thêm công cụ ghi — và lúc đó mới cần lo bảo mật kỹ
  ([[viet-mcp-server]])
```

## So sánh

| | Function calling | MCP |
|---|---|---|
| Ai định nghĩa công cụ | ứng dụng của bạn | server độc lập |
| Dùng được từ nhiều host | ❌ | ✅ |
| Số tầng | ít | thêm một tầng |
| Phù hợp khi | bạn xây ứng dụng AI | bạn nối vào trợ lý có sẵn |
| Có resource, prompt mẫu | ❌ | ✅ |

## Dễ nhầm

**1. Nghĩ MCP là một tính năng của mô hình.** Nó là giao thức.

**2. Dùng MCP khi tự viết ứng dụng AI cho riêng mình.**

**3. Làm mọi thứ thành tool.** Dữ liệu để đọc nên là resource.

**4. Nghĩ MCP lo bảo mật cho bạn.**

**5. Bỏ qua việc server chạy với quyền của người dùng.**

**6. Rải mã MCP khắp ứng dụng.** Chuẩn còn đang thay đổi.

**7. Dùng HTTP khi stdio là đủ.** Thêm xác thực không cần.

**8. Bắt đầu bằng công cụ ghi.** Bắt đầu bằng công cụ đọc.

**9. Kỳ vọng MCP làm chất lượng tốt hơn.**

**10. Không phân biệt ba loại tool/resource/prompt.**

## Mẹo nhớ

> **MCP là chuẩn nối: N ứng dụng × M nguồn cần N×M tích hợp; có chuẩn thì N+M.**
>
> **Bạn viết SERVER. Host và client là phần đã có.**
>
> **Ba loại: TOOL (mô hình gọi), RESOURCE (đọc dữ liệu), PROMPT (người dùng chọn).**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. MCP giải bài toán gì mà function calling không giải?
2. Ba vai trong MCP, bạn viết phần nào?
3. Ba loại thứ server phơi ra, khác nhau ở chỗ ai quyết định dùng?
4. Khi nào MCP đáng dùng, khi nào function calling là đủ?
5. Ba điều MCP không làm cho bạn?

## Tự viết lại

Không nhìn lại, quyết định dùng MCP hay function calling và giải thích:

```text
① Bạn xây một chatbot hỗ trợ khách hàng cho công ty
② Bạn muốn trợ lý lập trình đang dùng truy cập được CSDL nội bộ
③ Bạn viết một công cụ tra cứu muốn nhiều người dùng được
④ Bạn xây một agent chạy nền, chỉ mình bạn dùng
```

Tự kiểm: ở ②, vì sao đây là trường hợp MCP hợp nhất — và nếu không có MCP thì bạn làm gì?

## Thử sức

Đội bạn có ba hệ thống nội bộ (CSDL đơn hàng, hệ thống ticket, wiki tài liệu) và đang dùng hai trợ lý AI khác nhau, mỗi trợ lý cho một nhóm.

Ba câu để trả lời: bạn cần bao nhiêu tích hợp nếu không dùng chuẩn, và bao nhiêu nếu dùng MCP; bạn bắt đầu từ server nào và vì sao; và ba thứ phải chuẩn bị trước khi cho các trợ lý truy cập dữ liệu thật. Câu khó nhất: các trợ lý này chạy trên máy của từng người dùng — điều đó ảnh hưởng gì tới cách bạn thiết kế phân quyền?
