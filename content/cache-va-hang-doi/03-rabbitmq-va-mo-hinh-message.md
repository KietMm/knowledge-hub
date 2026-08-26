---
title: RabbitMQ và các mô hình message
slug: rabbitmq-va-mo-hinh-message
summary: Exchange, queue, routing key — và vì sao ack thủ công là thứ quyết định bạn có mất message không.
level: trung-cap
tags: [rabbitmq, hang-doi, kien-truc, message]
khung: v2
---

> **Sau bài này bạn sẽ:** định tuyến message theo bốn mô hình, và biết vì sao auto-ack là cách mất message dễ nhất.

## Ý tưởng chính

RabbitMQ tách **người gửi** khỏi **người nhận** bằng một tầng định tuyến ở giữa.

Người gửi không biết ai sẽ nhận, có bao nhiêu người nhận, hay họ có đang sống không. Họ chỉ gửi vào một **exchange** kèm một **routing key**. Việc còn lại là cấu hình, không phải mã.

## Mental model

Hãy nghĩ tới **bưu điện phân loại thư**.

> Bạn không tự mang thư tới nhà người nhận. Bạn bỏ vào bưu điện kèm **địa chỉ**.
>
> **Exchange** là bộ phận phân loại: nó đọc địa chỉ và quyết định thư đi vào **túi** nào.
>
> **Queue** là các túi thư. Thư nằm trong túi cho tới khi có người đến lấy.
>
> **Routing key** là địa chỉ trên bì thư.
>
> Và điểm quan trọng nhất: bưu điện chỉ **xoá thư khỏi sổ** khi người nhận **ký nhận**. Không có ký nhận, thư được giao lại.

Cái "ký nhận" đó là **ack**, và nó là chi tiết quyết định giữa "không mất message" và "mất message một cách âm thầm".

## Ví dụ nhỏ

```text
Producer → [Exchange] → routing → [Queue] → Consumer
                                              ↓ ack
                                     message được xoá
```

## Code chạy thế nào

**Bốn loại exchange — bốn mô hình định tuyến:**

```text
DIRECT    routing key khớp CHÍNH XÁC tên binding
  "don-hang.tao" → queue nào bind với đúng "don-hang.tao"
  ⇒ dùng cho: gửi tới một loại consumer cụ thể

FANOUT    bỏ qua routing key, gửi tới MỌI queue đã bind
  ⇒ dùng cho: phát sự kiện cho nhiều bên cùng quan tâm
     (một đơn hàng tạo ra → kho, kế toán, email đều cần biết)

TOPIC     khớp theo mẫu, có ký tự đại diện
  "don-hang.*.vn"   * = đúng một từ
  "don-hang.#"      # = không hoặc nhiều từ
  ⇒ dùng cho: consumer tự chọn tập sự kiện nó quan tâm

HEADERS   khớp theo header thay vì routing key
  ⇒ ít dùng; linh hoạt hơn nhưng khó đọc hơn
```

**Fanout là mô hình đáng chú ý nhất về mặt kiến trúc:**

```text
Producer gửi một message "don-hang.tao".
Fanout exchange đưa nó vào 3 queue: kho, ke-toan, email.

⇒ Thêm một bên quan tâm (ví dụ: gợi ý sản phẩm) chỉ cần
  tạo queue mới và bind vào exchange. KHÔNG sửa producer.

⇒ Đây là điểm khác biệt thật với việc gọi API trực tiếp:
  producer không cần biết có bao nhiêu người nhận
  ([[ranh-gioi-service]]).
```

**Ack — chi tiết quyết định mất hay không mất message:**

```ts
// ☠️ auto-ack: RabbitMQ xoá message NGAY khi gửi đi
ch.consume(q, xuLy, { noAck: true })
// Consumer crash giữa lúc xử lý ⇒ MESSAGE MẤT HẲN. Không ai biết.

// ✅ ack thủ công: xoá chỉ khi xử lý XONG
ch.consume(q, async (msg) => {
  try {
    await xuLy(JSON.parse(msg.content.toString()))
    ch.ack(msg)                         // xong → xoá
  } catch (e) {
    ch.nack(msg, false, false)          // lỗi → KHÔNG requeue → sang DLQ
  }
}, { noAck: false })
```

```text
`nack(msg, false, false)`: tham số cuối là `requeue`.
  requeue = true  ⇒ message quay lại đầu queue ⇒ nếu lỗi là
                    do NỘI DUNG message (JSON sai, bản ghi đã xoá)
                    thì nó lặp vô hạn và chặn cả queue
  requeue = false ⇒ chuyển sang dead letter queue  ← thường đúng

⇒ Đừng requeue vô điều kiện. Đó là cách tạo vòng lặp đốt tài nguyên.
```

## Cú pháp

**Prefetch — một dòng ảnh hưởng lớn tới thông lượng:**

```ts
await ch.prefetch(10)   // mỗi consumer giữ tối đa 10 message chưa ack
```

```text
Không đặt prefetch (mặc định = không giới hạn):
  RabbitMQ đẩy HẾT message sang consumer đầu tiên kết nối.
  ⇒ Consumer đó ngập, các consumer khác NGỒI KHÔNG.
  ⇒ Thêm consumer không giúp gì — đây là bất ngờ phổ biến nhất.

Đặt prefetch quá nhỏ (=1):
  Consumer phải chờ round-trip ack trước khi nhận message tiếp.
  ⇒ Thông lượng thấp nếu xử lý nhanh.

Kinh nghiệm: 10–100 cho việc nhanh, 1–5 cho việc chậm và nặng.
```

**Dead letter queue — bắt buộc, không phải tuỳ chọn:**

```ts
await ch.assertQueue('don-hang', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'dlx',
    'x-message-ttl': 3600000,           // 1 giờ chưa xử lý → DLQ
  },
})
```

```text
Message vào DLQ khi: bị nack (không requeue), hết TTL, hoặc queue đầy.

Và DLQ PHẢI được theo dõi. Message vào đó là dấu hiệu có gì sai,
và không ai biết nếu không có cảnh báo ([[hang-doi-va-xu-ly-bat-dong-bo]]).
```

**Ba điều kiện để message sống qua khi broker restart:**

```text
① Queue phải `durable: true`
② Message phải `persistent: true`
③ Exchange phải `durable: true`

Thiếu một trong ba ⇒ restart broker là mất. Và đây là lỗi
hay gặp vì mọi thứ chạy đúng cho tới lần restart đầu tiên.
```

**Publisher confirm — producer biết message đã tới:**

```ts
const ch = await conn.createConfirmChannel()
ch.publish(ex, key, buf, { persistent: true })
await ch.waitForConfirms()     // broker đã NHẬN và GHI
```

Không có bước này, `publish` chỉ nghĩa là "đã ghi vào socket" — broker chết đúng lúc đó thì message mất mà producer tưởng đã gửi.

## Tại sao cần nó

Vì RabbitMQ đảm bảo **at-least-once**, và điều đó có hệ quả bắt buộc:

```text
Consumer xử lý xong, chưa kịp ack thì chết
⇒ RabbitMQ không phân biệt được "chưa xử lý" với "đã xử lý,
  chưa kịp ack" ⇒ nó GIAO LẠI.

⇒ Consumer PHẢI idempotent. Đây không phải tính năng nâng cao,
  nó là điều kiện tối thiểu ([[idempotency-va-thu-lai]]).
```

**Và thứ tự message — một đảm bảo yếu hơn nhiều người tưởng:**

```text
Một queue, MỘT consumer, prefetch=1  → giữ được thứ tự
Một queue, NHIỀU consumer            → KHÔNG giữ thứ tự

⇒ Cần thứ tự cho từng thực thể (mọi sự kiện của đơn hàng #42
  phải theo thứ tự)?
  ⇒ RabbitMQ không có cơ chế phân vùng theo khoá.
    Phải tự làm: một queue cho mỗi nhóm, hoặc chuyển sang Kafka
    ([[kafka-va-luong-su-kien]]).
```

Đây là điểm phân biệt quan trọng giữa RabbitMQ và Kafka, và nó thường là lý do thật để chọn giữa hai cái.

## So sánh

| Exchange | Định tuyến theo | Dùng cho |
|---|---|---|
| direct | khớp chính xác | gửi tới một loại consumer |
| fanout | không quan tâm key | phát sự kiện cho nhiều bên |
| topic | mẫu có ký tự đại diện | consumer tự chọn tập sự kiện |
| headers | header | ít dùng |

## Dễ nhầm

**1. `noAck: true`.** Consumer crash là mất message, âm thầm.

**2. Không đặt prefetch.** Một consumer ngập, các consumer khác rảnh.

**3. Requeue vô điều kiện khi lỗi.** Vòng lặp vô hạn, chặn queue.

**4. Không có DLQ.** Một message hỏng chặn cả hàng.

**5. Không theo dõi DLQ.** Message rơi vào đó, không ai biết.

**6. Thiếu một trong ba `durable`/`persistent`.** Restart là mất.

**7. Không dùng publisher confirm.** Producer tưởng đã gửi.

**8. Consumer không idempotent.** At-least-once là mặc định.

**9. Giả định thứ tự với nhiều consumer.**

**10. Message chứa cả dữ liệu lớn** thay vì id. Message phình, và dữ liệu có thể đã cũ khi được xử lý.

## Mẹo nhớ

> **Exchange định tuyến, queue chứa, ACK mới xoá. `noAck: true` là cách mất message.**
>
> **Không đặt PREFETCH thì thêm consumer không giúp gì.**
>
> **Nack thì ĐỪNG requeue vô điều kiện — cho sang DLQ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn loại exchange và mô hình của mỗi cái?
2. Vì sao `noAck: true` làm mất message?
3. Prefetch ảnh hưởng gì nếu không đặt?
4. Ba điều kiện để message sống qua restart broker?
5. RabbitMQ đảm bảo thứ tự trong điều kiện nào?

## Tự viết lại

Không nhìn lại, thiết kế cho: *"Khi đơn hàng được tạo, cần trừ kho, gửi email, và cập nhật báo cáo — ba việc độc lập."*

```text
① loại exchange và lý do
② các queue và binding
③ cấu hình ack, prefetch, DLQ
④ consumer idempotent
⑤ thêm một bên quan tâm mới thì sửa gì
```

Tự kiểm: ở ⑤, bạn có phải sửa producer không — nếu có, thiết kế ở ① đã chọn sai loại exchange.

## Thử sức

Đội thêm consumer từ 2 lên 6 để xử lý nhanh hơn. Nhưng thông lượng **không tăng**, và bảng theo dõi cho thấy một consumer đang giữ 8.000 message chưa ack, năm consumer còn lại rảnh.

Ba câu để trả lời: nguyên nhân; một dòng cấu hình sửa nó; và bạn chọn giá trị bao nhiêu, dựa vào gì. Câu khó nhất: nếu consumer đang giữ 8.000 message đó **chết**, chuyện gì xảy ra với 8.000 message — và điều đó nói gì thêm về việc chọn prefetch?
