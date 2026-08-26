---
title: WebSocket và SSE
slug: websocket-va-sse
summary: Hai cách để server chủ động đẩy dữ liệu — và vì sao SSE thường là lựa chọn đúng dù ít được nhắc tới.
level: trung-cap
tags: [api, websocket, sse, realtime, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng giữa SSE và WebSocket, và biết phải chuẩn bị gì khi vận hành kết nối dài.

## Ý tưởng chính

HTTP thường là **client hỏi, server trả lời**. Server không tự nói được.

Hai cách phá vỡ điều đó: **SSE** (một chiều, server → client, chạy trên HTTP thường) và **WebSocket** (hai chiều, nâng cấp lên một giao thức riêng).

Phần lớn nhu cầu "thời gian thực" thật ra là **một chiều** — và đó là lý do SSE thường đúng hơn.

## Mental model

Hãy nghĩ tới **hai cách theo dõi một chuyến giao hàng**.

> **SSE = đăng ký nhận thông báo**. Bên giao hàng nhắn cho bạn mỗi khi có cập nhật. Bạn chỉ nhận, không nhắn lại qua kênh đó — muốn hỏi gì thì gọi tổng đài (một request HTTP bình thường).
>
> **WebSocket = mở một cuộc gọi và giữ máy**. Cả hai nói được bất cứ lúc nào. Mạnh hơn hẳn — nhưng bạn phải giữ đường dây, và nếu rớt sóng thì phải gọi lại và nói lại từ đâu.

Câu hỏi chọn giữa hai cái rất gọn: **client có cần gửi gì qua kênh đó không?** Không cần ⇒ SSE.

## Ví dụ nhỏ

```ts
// SSE — server
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
})
res.write(`data: ${JSON.stringify({ tienDo: 42 })}\n\n`)
```

```js
// SSE — client. TỰ ĐỘNG kết nối lại, không cần viết gì thêm.
const es = new EventSource('/su-kien')
es.onmessage = (e) => capNhat(JSON.parse(e.data))
```

## Code chạy thế nào

**SSE — điều làm nó nhẹ hơn nhiều so với vẻ ngoài:**

```text
Chạy trên HTTP THƯỜNG. Hệ quả:
  □ Đi qua proxy, CDN, tường lửa như mọi request khác
  □ Dùng nguyên cơ chế xác thực sẵn có (cookie, header)
  □ Nén, HTTP/2 hoạt động bình thường
  □ Trình duyệt TỰ kết nối lại khi đứt — bạn không viết dòng nào

Và có `Last-Event-ID`:
  Server gán id cho mỗi sự kiện.
  Client kết nối lại ⇒ trình duyệt TỰ gửi id cuối cùng nhận được
  ⇒ server gửi tiếp từ đó ⇒ KHÔNG MẤT SỰ KIỆN.
```

Cơ chế `Last-Event-ID` là thứ WebSocket **không có sẵn** — với WebSocket bạn phải tự thiết kế cách khôi phục sau khi đứt.

**WebSocket — mạnh hơn, và mọi thứ phải tự làm:**

```text
Bắt tay: HTTP request thường với `Upgrade: websocket`
       → sau đó KHÔNG còn là HTTP nữa

Phải tự viết:
  □ Kết nối lại có backoff (không có sẵn như EventSource)
  □ Heartbeat ping/pong — nếu không, proxy và NAT âm thầm
    cắt kết nối nhàn rỗi sau vài phút ([[tuong-lua-nat-va-vpn]])
  □ Xác thực: header tuỳ chỉnh KHÔNG gửi được từ trình duyệt
    ⇒ dùng cookie, hoặc token trong query (rồi nó vào log),
      hoặc gửi token trong tin nhắn đầu tiên
  □ Khôi phục trạng thái sau khi đứt
  □ Định dạng tin nhắn, kiểu, phiên bản — không có chuẩn nào cả
```

Danh sách này là lý do WebSocket "đơn giản" trong bản demo và **không đơn giản** trong sản phẩm thật.

## Cú pháp

**Ba giới hạn của SSE cần biết trước:**

```text
① Chỉ một chiều — client gửi thì dùng request HTTP thường (thường là đủ)
② Chỉ gửi được VĂN BẢN — nhị phân phải mã hoá base64
③ Trên HTTP/1.1, trình duyệt giới hạn ~6 kết nối mỗi tên miền
   ⇒ Mở SSE ở nhiều tab là hết quota, các tab sau treo
   ⇒ Trên HTTP/2 thì hết vấn đề này ([[http1-http2-http3]])
```

Giới hạn ③ là bất ngờ phổ biến nhất với SSE — và nó biến mất khi bật HTTP/2.

**Mở rộng ra nhiều máy — vấn đề chung của cả hai:**

```text
Kết nối là CÓ TRẠNG THÁI: nó gắn với MỘT tiến trình cụ thể.

  Người dùng A kết nối tới máy 1
  Sự kiện cho A phát sinh ở máy 2
  ⇒ Máy 2 KHÔNG gửi được cho A.

Cách xử lý: một kênh chung giữa các máy.
  Redis Pub/Sub, hoặc hàng đợi.
  Máy 2 phát lên kênh ⇒ máy 1 đang giữ kết nối của A thì gửi xuống.
```

Đây là điểm khiến kết nối dài khác hẳn API thường: bạn **không còn phi trạng thái** nữa, và mọi thứ về mở rộng phải tính lại ([[mo-rong-va-can-bang-tai]]).

**Vận hành — bốn thứ hay bị bỏ sót:**

```text
□ TIMEOUT của proxy: Nginx mặc định 60s ⇒ kết nối dài bị cắt
  ⇒ `proxy_read_timeout 3600s;` và tắt buffer cho SSE
□ HEARTBEAT: gửi comment `:\n\n` mỗi 30s giữ kết nối sống qua NAT
□ GIỚI HẠN số kết nối mỗi người dùng — nếu không, một client lỗi
  mở hàng nghìn kết nối
□ THOÁT SẠCH: khi nhận SIGTERM, đóng kết nối có báo trước
  để client kết nối lại chủ động thay vì thấy lỗi
```

**Và một câu hỏi nên hỏi trước:** có thật sự cần đẩy không?

```text
Cập nhật vài giây một lần, dữ liệu không quan trọng
  → polling mỗi 5–10 giây thường ĐỦ, và đơn giản hơn nhiều.

Đẩy thật sự cần khi: độ trễ dưới một giây quan trọng,
hoặc số client lớn tới mức polling tạo tải vô ích đáng kể.
```

## Tại sao cần nó

Vì WebSocket hay được chọn theo phản xạ, còn SSE thì bị bỏ qua:

```text
Nhu cầu thật của phần lớn tính năng "thời gian thực":
  thông báo, tiến độ job, cập nhật giá, log trực tiếp,
  streaming phản hồi của mô hình AI
⇒ TẤT CẢ đều một chiều ⇒ SSE đủ, và rẻ hơn nhiều về vận hành.

Thật sự cần hai chiều: chat, cộng tác thời gian thực (con trỏ,
soạn thảo chung), game.
```

Streaming token của LLM là ví dụ đáng chú ý: gần như mọi API mô hình đều dùng SSE, không dùng WebSocket — vì luồng token chỉ đi một chiều.

## So sánh

| | SSE | WebSocket | Polling |
|---|---|---|---|
| Hướng | server → client | hai chiều | client hỏi |
| Giao thức | HTTP thường | riêng, sau Upgrade | HTTP |
| Tự kết nối lại | ✅ sẵn có | tự viết | không cần |
| Khôi phục sự kiện đã mất | ✅ `Last-Event-ID` | tự viết | không cần |
| Qua proxy/CDN | ✅ dễ | cần cấu hình | ✅ |
| Nhị phân | ❌ | ✅ | ✅ |
| Độ phức tạp vận hành | thấp | **cao** | rất thấp |

## Dễ nhầm

**1. Chọn WebSocket khi chỉ cần một chiều.** Trả chi phí vận hành không cần.

**2. Không heartbeat.** Proxy và NAT cắt kết nối im lặng.

**3. Quên `proxy_read_timeout`.** Nginx cắt sau 60 giây.

**4. Quên tắt buffer cho SSE ở proxy.** Sự kiện bị giữ lại, tới thành cụm.

**5. Không xử lý mở rộng nhiều máy.** Sự kiện phát ở máy khác không tới được.

**6. Token trong query string của WebSocket.** Nó vào log máy chủ và proxy.

**7. Không giới hạn số kết nối mỗi người dùng.**

**8. Không dùng `Last-Event-ID`.** Mất sự kiện mỗi lần đứt.

**9. Mở nhiều SSE trên HTTP/1.1.** Hết quota 6 kết nối, tab sau treo.

**10. Dùng đẩy khi polling 10 giây là đủ.**

## Mẹo nhớ

> **Client có cần GỬI gì qua kênh đó không? Không ⇒ SSE.**
>
> **SSE chạy trên HTTP thường: tự kết nối lại, `Last-Event-ID`, qua proxy dễ.**
>
> **Kết nối dài là CÓ TRẠNG THÁI — nhiều máy thì cần một kênh chung.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Câu hỏi nào quyết định chọn SSE hay WebSocket?
2. Bốn thứ SSE có sẵn mà WebSocket phải tự viết?
3. `Last-Event-ID` giải quyết gì?
4. Vì sao kết nối dài gây khó khi mở rộng nhiều máy, và cách xử lý?
5. Ba giới hạn của SSE?

## Tự viết lại

Không nhìn lại, thiết kế cho *"hiển thị tiến độ xử lý video, có thể mất tới 10 phút"*:

```text
① chọn SSE hay WebSocket, vì sao
② server gửi gì, bao lâu một lần
③ xử lý khi client mất mạng giữa chừng
④ chạy trên 3 máy chủ thì sao
⑤ cấu hình proxy cần sửa
```

Tự kiểm: ở ③, nếu client mất mạng 2 phút rồi quay lại, họ có thấy các cập nhật đã bỏ lỡ không — nhờ cơ chế nào?

## Thử sức

Tính năng thông báo dùng WebSocket. Người dùng báo: thông báo **ngừng tới sau vài phút**, phải tải lại trang mới có lại. Log máy chủ không có lỗi nào.

Ba câu để trả lời: hai nguyên nhân khả dĩ nhất, và vì sao log im lặng; cách sửa từng cái; và vì sao SSE có thể đã tránh được toàn bộ chuyện này. Câu khó nhất: nếu vấn đề chỉ xảy ra với người dùng ở một công ty cụ thể, bạn nghi ngờ thiết bị nào trên đường truyền của họ?
