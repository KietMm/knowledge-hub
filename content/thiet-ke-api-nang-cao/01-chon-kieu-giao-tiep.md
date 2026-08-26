---
title: Chọn kiểu giao tiếp cho API
slug: chon-kieu-giao-tiep
summary: REST, RPC, GraphQL, WebSocket, SSE — mỗi cái hợp với hình dạng bài toán nào.
level: trung-cap
tags: [api, rest, rpc, graphql, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được kiểu giao tiếp từ hình dạng bài toán, thay vì từ thứ đang thịnh hành.

## Ý tưởng chính

Câu hỏi quyết định không phải "REST hay GraphQL", mà là **hai bên đang trao đổi gì với nhau**:

Thao tác trên **tài nguyên**? Gọi một **hành động**? Lấy một **đồ thị dữ liệu**? Hay nhận **luồng sự kiện liên tục**?

Bốn hình dạng đó có bốn công cụ phù hợp. Chọn sai không làm hệ thống hỏng — nó làm mọi thứ sau đó nặng nề hơn cần thiết.

## Mental model

Hãy nghĩ tới **cách bạn liên lạc với một cửa hàng**.

> **Catalogue và phiếu đặt hàng** — có mẫu sẵn, mỗi mẫu cho một loại việc, ai cũng hiểu. Đó là **REST**.
>
> **Gọi điện bảo họ làm một việc cụ thể** — "huỷ đơn 123", "gửi lại mã". Nhanh, thẳng, không cần ép vào khuôn tài nguyên. Đó là **RPC**.
>
> **Đưa một danh sách chính xác những gì bạn muốn biết** — "cho tôi tên, giá, và tên ba người đánh giá gần nhất của năm sản phẩm này". Một lần hỏi, đúng những gì cần. Đó là **GraphQL**.
>
> **Đăng ký nhận thông báo khi có hàng mới** — họ chủ động báo, bạn không phải hỏi lại. Đó là **SSE / WebSocket**.

Không cách nào tốt hơn cách nào. Gọi điện để đặt 200 món là dở; điền phiếu để hỏi một câu cũng dở.

## Ví dụ nhỏ

```text
REST       GET /don-hang/123
RPC        POST /rpc  { "method": "huyDonHang", "params": { "id": 123 } }
GraphQL    query { donHang(id:123) { ma, sanPham { ten } } }
SSE        GET /su-kien   → server đẩy liên tục
WebSocket  ws://... → hai chiều
```

## Code chạy thế nào

**REST — mạnh khi dữ liệu thật sự là tài nguyên:**

```text
Được: ai cũng hiểu, cache HTTP hoạt động, công cụ sẵn có,
      mã trạng thái mang ý nghĩa chuẩn

Vấp:  hành động không phải CRUD
        "gửi lại email xác nhận" là tài nguyên gì?
        → POST /nguoi-dung/1/xac-nhan-email  (chấp nhận được)
        → đừng cố ép thành PUT trên một tài nguyên tưởng tượng

      lấy dữ liệu liên quan
        GET /don-hang/1  rồi  GET /nguoi-dung/5  rồi  GET /san-pham/9
        ⇒ ba round-trip cho một màn hình
```

**RPC — mạnh khi bạn gọi một hành động:**

```text
Được: ánh xạ thẳng sang lời gọi hàm, không phải nghĩ "cái này là
      tài nguyên gì"; gRPC còn có hợp đồng sinh mã cho cả hai phía
      và mã hoá nhị phân nhanh hơn JSON nhiều

Vấp:  cache HTTP gần như vô dụng (mọi thứ là POST)
      trình duyệt không gọi gRPC trực tiếp được — cần gRPC-Web hoặc proxy
      dễ trượt thành hàng trăm endpoint không có quy luật
```

Đây là lý do gRPC phổ biến **giữa các service nội bộ** nhưng hiếm ở API công khai: nó tối ưu cho hợp đồng chặt và tốc độ, đánh đổi bằng tính phổ dụng.

**GraphQL — mạnh khi client cần đúng một hình dạng dữ liệu:**

```text
Được: một round-trip cho dữ liệu lồng nhau; nhiều client với
      nhu cầu khác nhau dùng chung một API; schema có kiểu

Vấp:  cache HTTP không dùng được (mọi thứ là POST /graphql)
      N+1 query gần như CHẮC CHẮN xảy ra nếu không có DataLoader
      client viết được truy vấn rất nặng ⇒ phải giới hạn ĐỘ SÂU
      và ĐỘ PHỨC TẠP, nếu không đó là một lỗ hổng từ chối dịch vụ
      giám sát khó: mọi request đều là POST /graphql
```

GraphQL trả một chi phí cố định đáng kể ở tầng máy chủ. Nó đáng khi bạn có **nhiều client với nhu cầu dữ liệu khác nhau** — và không đáng khi chỉ có một web app do chính bạn viết.

## Cú pháp

**Quyết định theo hình dạng bài toán:**

```text
Dữ liệu là TÀI NGUYÊN, client đa dạng, muốn cache
  → REST

Gọi HÀNH ĐỘNG giữa các service nội bộ, cần nhanh và hợp đồng chặt
  → gRPC

Client cần ĐỒ THỊ dữ liệu, nhiều loại client khác nhau
  → GraphQL

Server ĐẨY một chiều: thông báo, tiến độ, giá, log
  → SSE

Hai chiều, độ trễ thấp: chat, cộng tác, game
  → WebSocket
```

**Trộn nhiều kiểu là bình thường** — và thường là lựa chọn đúng:

```text
REST cho CRUD chính
+ vài endpoint kiểu RPC cho hành động  (/don-hang/1/huy)
+ SSE cho thông báo
+ gRPC giữa các service nội bộ

Ép cả hệ thống vào MỘT kiểu là cách chắc chắn nhất để
có vài chỗ gượng ép.
```

**Ba thứ không phụ thuộc kiểu giao tiếp** — làm được ở cả năm:

```text
① Phiên bản hoá và tương thích ngược ([[loi-versioning-va-tai-lieu]])
② Idempotency cho thao tác ghi ([[idempotency-va-thu-lai]])
③ Xác thực đầu vào ở biên ([[xac-thuc-dau-vao-va-bien]])
```

Đây là điểm đáng nhớ: phần lớn chất lượng của một API **không nằm ở kiểu giao tiếp**. Một REST API thiếu ba thứ trên tệ hơn một RPC API có đủ.

## Tại sao cần nó

Vì chi phí chọn sai không nằm ở chỗ "không chạy được" — nó nằm ở ma sát hằng ngày:

```text
Chọn GraphQL cho một web app đơn giản:
  → trả chi phí schema, resolver, DataLoader, giới hạn độ phức tạp
  → mất cache HTTP
  → giám sát khó hơn
  → và lợi ích "client tự chọn trường" không ai dùng vì chỉ có một client

Ép mọi hành động vào REST:
  → PUT /don-hang/1/trang-thai  { "trangThai": "da-huy" }
  → client phải biết máy trạng thái nội bộ của bạn
  → thay vì POST /don-hang/1/huy, nói đúng ý định
```

**Một câu hỏi lọc rất nhanh:** *"client của tôi là ai?"*

```text
Chỉ web app của chính bạn        → REST đơn giản là đủ, đừng phức tạp hoá
Web + mobile + đối tác           → cân nhắc GraphQL, hoặc REST + BFF
Chỉ các service nội bộ           → gRPC đáng cân nhắc
Bên thứ ba không quen biết       → REST, vì nó phổ dụng nhất
```

## So sánh

| | REST | gRPC | GraphQL | SSE | WebSocket |
|---|---|---|---|---|---|
| Hướng | client hỏi | client hỏi | client hỏi | **server đẩy** | **hai chiều** |
| Cache HTTP | ✅ | ❌ | ❌ | ❌ | ❌ |
| Trình duyệt hỗ trợ thẳng | ✅ | ❌ | ✅ | ✅ | ✅ |
| Hợp đồng có kiểu | tuỳ (OpenAPI) | ✅ | ✅ | ❌ | ❌ |
| Chi phí máy chủ | thấp | thấp | **cao** | thấp | vừa |

## Dễ nhầm

**1. Chọn theo thứ đang thịnh hành** thay vì theo hình dạng bài toán.

**2. Ép mọi hành động vào REST.** Client phải biết trạng thái nội bộ của bạn.

**3. GraphQL không giới hạn độ sâu và độ phức tạp.** Lỗ hổng từ chối dịch vụ.

**4. GraphQL không có DataLoader.** N+1 gần như chắc chắn.

**5. Dùng gRPC cho API công khai trên trình duyệt.**

**6. WebSocket khi chỉ cần một chiều.** SSE đơn giản hơn nhiều.

**7. Nghĩ phải chọn đúng một kiểu cho cả hệ thống.**

**8. Bỏ qua cache HTTP** rồi tự xây cache — cái đầu miễn phí.

**9. Tin rằng kiểu giao tiếp quyết định chất lượng API.** Phiên bản hoá, idempotency và xác thực mới quyết định.

## Mẹo nhớ

> **Hỏi hình dạng bài toán: tài nguyên, hành động, đồ thị, hay luồng?**
>
> **Trộn nhiều kiểu là bình thường. Ép một kiểu cho tất cả thì gượng.**
>
> **Chất lượng API phần lớn KHÔNG nằm ở kiểu giao tiếp.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn hình dạng bài toán và công cụ tương ứng?
2. GraphQL mạnh ở đâu và trả giá gì?
3. Vì sao gRPC phổ biến nội bộ nhưng hiếm ở API công khai?
4. Ba thứ quyết định chất lượng API mà không phụ thuộc kiểu giao tiếp?
5. Câu hỏi nào lọc lựa chọn nhanh nhất?

## Tự viết lại

Không nhìn lại, chọn kiểu giao tiếp và giải thích:

```text
① Quản lý sản phẩm cho trang quản trị
② Huỷ đơn hàng
③ Trang chi tiết cần sản phẩm + đánh giá + người bán trong một lần
④ Hiển thị tiến độ xử lý video
⑤ Chat hỗ trợ
⑥ Service kho gọi service giá
```

Tự kiểm: ở ③, nếu bạn chọn GraphQL, chi phí nào bạn phải chấp nhận — và có cách nào đạt kết quả tương tự với REST không?

## Thử sức

Đội đề xuất chuyển toàn bộ REST API sang GraphQL, lý do: "client phải gọi nhiều lần mới đủ dữ liệu cho một màn hình".

Ba câu để trả lời: bạn hỏi lại những gì để xác minh vấn đề; hai giải pháp **nhẹ hơn** GraphQL cho đúng vấn đề đó; và nếu vẫn chọn GraphQL, những chi phí nào phải chuẩn bị trước. Câu khó nhất: nếu chỉ có **một** client là web app của chính đội, lợi ích lớn nhất của GraphQL còn lại bao nhiêu?
