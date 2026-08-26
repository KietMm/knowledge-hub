---
title: Kafka và luồng sự kiện
slug: kafka-va-luong-su-kien
summary: Log phân tán, partition, consumer group — và vì sao Kafka không phải một hàng đợi.
level: nang-cao
tags: [kafka, hang-doi, su-kien, kien-truc]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được Kafka khác hàng đợi thế nào, và chọn khoá phân vùng đúng.

## Ý tưởng chính

Kafka **không phải một hàng đợi**. Nó là một **log có thể phát lại**: message được ghi nối tiếp và **giữ lại** sau khi đọc, không bị xoá.

Từ khác biệt đó suy ra hầu hết mọi thứ: nhiều consumer độc lập đọc cùng dữ liệu, đọc lại được từ đầu, và thứ tự được đảm bảo trong từng phân vùng.

## Mental model

Hãy nghĩ tới **sổ ghi chép so với hộp thư**.

> **Hộp thư (RabbitMQ)**: thư vào, bạn lấy ra, **thư hết**. Muốn hai người cùng nhận thì phải gửi hai bản.
>
> **Sổ ghi chép (Kafka)**: mọi việc được ghi nối tiếp vào sổ, không ai xoá. Mỗi người đọc **giữ một cái bookmark** của riêng mình — "tôi đã đọc tới trang 412".
>
> Người mới vào đội mở sổ đọc từ trang 1. Người phát hiện mình xử lý sai thì **kéo bookmark về trang 300 và đọc lại**.

Cái bookmark đó là **offset**, và việc consumer tự giữ offset là điểm khác biệt kiến trúc quan trọng nhất: **đọc không phá huỷ dữ liệu**.

## Ví dụ nhỏ

```text
Topic "don-hang", 3 partition:

P0: [m0][m1][m2][m3]        ← offset tăng dần, không bao giờ xoá lệch
P1: [m0][m1][m2]
P2: [m0][m1][m2][m3][m4]
```

## Code chạy thế nào

**Partition — nguồn của cả khả năng mở rộng lẫn hạn chế về thứ tự:**

```text
Một topic chia thành N partition.
Message được đưa vào partition theo hash(khoá).

⇒ THỨ TỰ được đảm bảo TRONG một partition, KHÔNG đảm bảo giữa các partition.
⇒ Nên chọn khoá sao cho mọi message CẦN đúng thứ tự cùng vào một partition.

Ví dụ: khoá = donHangId
  Mọi sự kiện của đơn #42 → cùng partition → đúng thứ tự.
  Sự kiện của đơn #43 có thể ở partition khác — và điều đó KHÔNG SAO.
```

**Chọn khoá phân vùng — quyết định khó sửa nhất:**

```text
❌ Không có khoá        → phân bố đều, nhưng KHÔNG có thứ tự nào
❌ Khoá lệch            → khoá = quốc gia, 90% traffic là "VN"
                          ⇒ một partition ngập, các partition khác rảnh
✅ Khoá theo thực thể   → donHangId, userId
                          ⇒ thứ tự trong từng thực thể, phân bố đều

Và số partition khó GIẢM: thêm partition thì hash đổi
⇒ message của cùng một khoá có thể sang partition khác
⇒ thứ tự bị vỡ ở thời điểm chuyển.
⇒ Nên chọn số partition dư ngay từ đầu.
```

**Consumer group — cơ chế mở rộng:**

```text
Một consumer group: mỗi partition được gán cho ĐÚNG MỘT consumer.

3 partition, 1 consumer  → nó đọc cả 3
3 partition, 3 consumer  → mỗi cái một partition   ← lý tưởng
3 partition, 5 consumer  → 2 CONSUMER NGỒI KHÔNG

⇒ Số consumer hữu ích TỐI ĐA = số partition.
  Đây là bất ngờ phổ biến nhất: thêm consumer quá số partition
  không tăng thông lượng.

Nhiều group ĐỘC LẬP đọc cùng topic:
  group "kho", group "ke-toan", group "email"
  → mỗi group có offset riêng, đọc toàn bộ dữ liệu
  → thêm một bên quan tâm KHÔNG ảnh hưởng ai
```

## Cú pháp

**Commit offset — nơi quyết định mất hay lặp:**

```ts
// ❌ Auto-commit: offset được commit theo ĐỊNH KỲ, không theo tiến độ
// Crash sau khi commit nhưng trước khi xử lý xong ⇒ MẤT message

// ✅ Commit thủ công SAU khi xử lý
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    await xuLy(message)
    await consumer.commitOffsets([
      { topic, partition, offset: (Number(message.offset) + 1).toString() },
    ])
  },
})
```

```text
Thứ tự quyết định đảm bảo nào bạn nhận được:
  commit TRƯỚC khi xử lý  → at-most-once  → có thể MẤT
  commit SAU khi xử lý    → at-least-once → có thể LẶP  ← chọn cái này

⇒ At-least-once + consumer idempotent = kết quả đúng.
  Đây là cùng kết luận với mọi hệ thống message
  ([[hang-doi-va-xu-ly-bat-dong-bo]]).
```

**Consumer lag — chỉ số quan trọng nhất:**

```text
lag = offset mới nhất − offset đã commit
    = "còn bao nhiêu message chưa xử lý"

Ổn định         → consumer theo kịp
Tăng đều        → không kịp ⇒ thêm consumer (tối đa = số partition)
                  hoặc tối ưu xử lý
Nhảy đột ngột   → consumer chết, hoặc đang rebalance
```

Lag là chỉ số nên cảnh báo, và nó tốt hơn "độ dài hàng đợi": nó nói được **bao xa so với hiện tại**, không chỉ "còn nhiều".

**Rebalance — cái giá của consumer group:**

```text
Một consumer vào hoặc ra ⇒ Kafka gán lại partition cho cả group.
Trong lúc rebalance, TOÀN BỘ group DỪNG xử lý.

⇒ Consumer xử lý quá lâu một message ⇒ vượt `max.poll.interval.ms`
  ⇒ Kafka coi nó đã chết ⇒ rebalance ⇒ message được giao cho
    consumer khác ⇒ xử lý LẶP, và group dừng một nhịp.

⇒ Việc nặng thì tăng `max.poll.interval.ms`, hoặc giảm số message
  lấy mỗi lần poll, hoặc đẩy việc nặng ra khỏi vòng lặp consumer.
```

**Retention — điều làm Kafka khác hẳn hàng đợi:**

```text
retention.ms = 7 ngày   → giữ 7 ngày, kể cả đã đọc
retention = -1          → giữ mãi
log compaction          → giữ BẢN GHI CUỐI CÙNG cho mỗi khoá
                          ⇒ dùng để lưu trạng thái hiện tại của thực thể

⇒ Phát lại được: sửa bug ở consumer, đặt offset về 0, xử lý lại
  toàn bộ. Không hàng đợi truyền thống nào làm được điều này.
```

Khả năng phát lại là lý do chính đáng nhất để chọn Kafka.

## Tại sao cần nó

Vì Kafka và RabbitMQ giải hai bài toán khác nhau, và chọn sai thì trả chi phí vận hành đáng kể:

```text
CHỌN KAFKA khi:
  □ Nhiều bên độc lập cần cùng dữ liệu
  □ Cần PHÁT LẠI (sửa bug rồi xử lý lại lịch sử)
  □ Cần thứ tự theo từng thực thể
  □ Thông lượng rất lớn (hàng trăm nghìn message/giây)
  □ Muốn giữ lịch sử sự kiện như một nguồn sự thật

CHỌN RABBITMQ khi:
  □ Phân phối công việc cho worker
  □ Định tuyến phức tạp theo mẫu
  □ Cần hàng đợi ưu tiên, hoặc hẹn giờ
  □ Quy mô vừa, muốn vận hành đơn giản
```

**Và cái giá của Kafka:**

```text
□ Vận hành nặng hơn hẳn (broker, và trước đây là ZooKeeper)
□ Không có hàng đợi ưu tiên, không có hẹn giờ từng message
□ Không có DLQ sẵn — phải tự tạo topic riêng
□ Xoá một message cụ thể: không làm được (log là bất biến)
  ⇒ đây là vấn đề thật với yêu cầu xoá dữ liệu cá nhân;
    cách xử lý thường là mã hoá theo khoá rồi xoá khoá
□ Số partition khó giảm
```

Với phần lớn hệ thống, một bảng job trong CSDL hoặc RabbitMQ là đủ rất lâu. Kafka đáng khi bạn thật sự cần **phát lại** hoặc **nhiều bên đọc độc lập** ([[chi-phi-ha-tang]]).

## So sánh

| | Kafka | RabbitMQ |
|---|---|---|
| Bản chất | log phát lại được | hàng đợi |
| Message sau khi đọc | **còn lại** | bị xoá |
| Nhiều bên đọc cùng dữ liệu | ✅ tự nhiên | cần fanout + nhiều queue |
| Phát lại từ đầu | ✅ | ❌ |
| Thứ tự | trong partition | một consumer duy nhất |
| Định tuyến phức tạp | ❌ | ✅ |
| Ưu tiên / hẹn giờ | ❌ | ✅ |
| Vận hành | nặng | vừa |

## Dễ nhầm

**1. Coi Kafka như hàng đợi.** Nó là log; message không mất đi khi đọc.

**2. Không có khoá phân vùng** rồi mong có thứ tự.

**3. Khoá lệch.** Một partition ngập.

**4. Thêm consumer quá số partition.** Chúng ngồi không.

**5. Auto-commit offset.** Có thể mất message.

**6. Consumer không idempotent.** At-least-once là mặc định.

**7. Không theo dõi lag.** Không biết đang tụt lại.

**8. Xử lý quá lâu trong vòng lặp consumer.** Rebalance liên tục.

**9. Chọn số partition quá ít từ đầu.** Rất khó sửa về sau.

**10. Chọn Kafka khi RabbitMQ hoặc một bảng CSDL là đủ.**

## Mẹo nhớ

> **Kafka là LOG, không phải hàng đợi. Đọc KHÔNG xoá — mỗi group giữ offset riêng.**
>
> **Thứ tự chỉ trong PARTITION ⇒ chọn khoá theo thực thể.**
>
> **Số consumer hữu ích tối đa = số partition.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Kafka khác hàng đợi ở điểm cốt lõi nào? Ba hệ quả?
2. Thứ tự được đảm bảo ở phạm vi nào, và chọn khoá thế nào?
3. Vì sao thêm consumer quá số partition không giúp gì?
4. Commit offset trước và sau khi xử lý — hai đảm bảo khác nhau ra sao?
5. Consumer lag là gì, và ba dạng biểu đồ của nó nói gì?

## Tự viết lại

Không nhìn lại, thiết kế cho hệ thống thương mại điện tử:

```text
① topic nào, khoá phân vùng nào, vì sao
② các consumer group
③ số partition và lý do
④ cấu hình commit offset
⑤ hai cảnh báo cần có
```

Tự kiểm: nếu sau sáu tháng bạn cần thêm một consumer group mới đọc lại **toàn bộ** lịch sử, cấu hình retention ở ③ của bạn có cho phép không?

## Thử sức

Đội bạn dùng Kafka cho hàng đợi gửi email, một topic, một consumer group. Consumer lag tăng đều mỗi ngày. Đội đã tăng số consumer từ 3 lên 12 nhưng **không cải thiện**.

Ba câu để trả lời: nguyên nhân gần như chắc chắn; hai cách sửa và đánh đổi của mỗi cách; và bạn nghi ngờ gì về việc **chọn Kafka** cho bài toán này. Câu khó nhất: nếu tăng số partition từ 3 lên 12, cái gì bị ảnh hưởng — và với bài toán gửi email cụ thể này, ảnh hưởng đó có quan trọng không?
