---
title: Chọn công cụ và vận hành
slug: chon-cong-cu-va-van-hanh
summary: Bảng CSDL, Redis, RabbitMQ hay Kafka — chọn theo bài toán, và những gì phải theo dõi sau khi chọn.
level: nang-cao
tags: [kien-truc, hang-doi, redis, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn công cụ hàng đợi theo bài toán thật, và biết bốn chỉ số phải theo dõi.

## Ý tưởng chính

Bốn công cụ, xếp theo **chi phí vận hành tăng dần**: một **bảng trong CSDL** sẵn có, **Redis**, **RabbitMQ**, **Kafka**.

Và nguyên tắc chọn ngược với trực giác: **bắt đầu từ cái rẻ nhất đủ dùng**, không phải cái mạnh nhất. Vì mỗi công cụ thêm vào là một thứ phải cấu hình, theo dõi, sao lưu, nâng cấp, và đánh thức bạn lúc 3 giờ sáng.

## Mental model

Hãy nghĩ tới **chọn xe để chở hàng**.

> Chở một thùng sách sang nhà bên: **đi bộ**. Không ai thuê xe tải.
>
> Chở đồ khi chuyển nhà: **xe tải nhỏ**.
>
> Chở hàng cho một chuỗi siêu thị mỗi ngày: **đội xe container**, và kèm theo đó là bãi đỗ, thợ bảo dưỡng, tài xế, lịch trình.
>
> Đội container mạnh hơn hẳn. Nhưng nếu bạn chỉ chở một thùng sách, bạn vừa mua về **một hệ thống phải vận hành** — và cái thùng sách vẫn chưa sang được nhà bên.

Kafka là đội container. Nó đúng khi bạn thật sự chở hàng cho chuỗi siêu thị.

## Ví dụ nhỏ

```sql
-- Hàng đợi bằng một bảng: đủ cho tới hàng nghìn job/phút
SELECT * FROM job WHERE trang_thai = 'cho' AND chay_luc <= now()
ORDER BY chay_luc
FOR UPDATE SKIP LOCKED LIMIT 10;
```

## Code chạy thế nào

**`FOR UPDATE SKIP LOCKED` — vì sao bảng CSDL đủ làm hàng đợi:**

```text
FOR UPDATE          khoá các dòng đã chọn
SKIP LOCKED         BỎ QUA dòng đã bị worker khác khoá

⇒ 10 worker cùng chạy câu trên, mỗi worker nhận 10 job KHÁC NHAU.
  Không worker nào phải chờ, không job nào bị xử lý hai lần
  cùng lúc.
```

```text
Và nó có một lợi thế mà không công cụ nào ở trên có:

  BEGIN;
    INSERT INTO don_hang ...;
    INSERT INTO job (loai, payload) VALUES ('gui-mail', ...);
  COMMIT;

  ⇒ Đơn hàng và job vào CÙNG một transaction.
  ⇒ Không có khe hở "đơn đã lưu nhưng job chưa đẩy được".

Với Redis/RabbitMQ/Kafka, bạn luôn có bài toán dual-write:
hai hệ thống, không có transaction chung
([[hang-doi-va-xu-ly-bat-dong-bo]]).
```

**Khi nào bảng CSDL hết đủ:**

```text
□ Vượt vài nghìn job/phút — polling bắt đầu tạo tải đáng kể
□ Cần nhiều consumer group độc lập đọc cùng sự kiện
□ Cần định tuyến theo mẫu
□ Cần giữ lịch sử sự kiện để phát lại
□ CSDL đã là điểm nghẽn — đừng thêm việc cho nó

Chưa gặp cái nào trong năm cái trên ⇒ một bảng là lựa chọn ĐÚNG,
không phải lựa chọn tạm.
```

## Cú pháp

**Bảng chọn theo bài toán:**

```text
"Đẩy việc nặng ra khỏi request, quy mô vừa"
  → BẢNG CSDL. Cùng transaction với dữ liệu, không thêm hạ tầng.

"Cần retry, backoff, DLQ, giao diện theo dõi — không muốn tự viết"
  → REDIS + BullMQ/Sidekiq. Bước lên vừa phải.

"Định tuyến phức tạp, nhiều loại consumer, ưu tiên, hẹn giờ"
  → RABBITMQ.

"Nhiều bên độc lập đọc cùng dữ liệu, cần PHÁT LẠI, thông lượng rất lớn"
  → KAFKA.
```

**Redis làm hàng đợi — hai điều cần biết:**

```text
List + BLPOP:  đơn giản, nhưng KHÔNG có ack.
               Worker chết giữa lúc xử lý ⇒ MẤT job.
               ⇒ Chỉ dùng cho việc mất được.

Streams:       có consumer group, có ack (XACK), có danh sách
               message đang xử lý dở (XPENDING).
               ⇒ Đây là thứ nên dùng nếu chọn Redis làm hàng đợi.

Và nhớ: Redis mặc định là RAM. Job trong hàng đợi có thể mất
khi mất điện ([[redis-cau-truc-du-lieu]]).
```

**Bốn chỉ số phải theo dõi — bất kể chọn công cụ nào:**

```text
① TUỔI message cũ nhất   ← quan trọng hơn độ dài hàng đợi
   Hàng dài 10.000 mà xử lý trong 30 giây thì không sao.
   Hàng dài 100 mà cái cũ nhất 2 tiếng thì có gì đang kẹt.

② SỐ VÀO DLQ / số thất bại
   Tăng ⇒ có lỗi hệ thống, không phải lỗi lẻ.

③ THỜI GIAN XỬ LÝ p95
   Tăng ⇒ hoặc job nặng hơn, hoặc phụ thuộc chậm hơn.

④ SỐ WORKER ĐANG SỐNG
   Giảm về 0 mà không ai biết là kịch bản tệ nhất: hàng đợi
   vẫn nhận việc, không ai xử lý, và không có lỗi nào.
```

Chỉ số ① và ④ là hai cái hay bị bỏ nhất, và chúng bắt được đúng loại hỏng im lặng ([[quan-sat-he-thong]]).

## Tại sao cần nó

Vì chi phí thật của một công cụ mới không nằm ở lúc cài đặt:

```text
Thêm Kafka vào hệ thống nghĩa là thêm:
  □ Cụm broker phải vận hành, nâng cấp, sao lưu cấu hình
  □ Theo dõi lag, rebalance, dung lượng đĩa
  □ Người trong đội phải hiểu partition, offset, retention
  □ Môi trường dev phải chạy được nó
  □ Một thứ nữa có thể chết lúc 3 giờ sáng

Nếu bài toán thật là "gửi email không chặn request",
một bảng CSDL 30 dòng mã giải quyết xong.
```

**Ba dấu hiệu bạn chọn quá to:**

```text
□ Dùng Kafka nhưng chỉ có MỘT consumer group
  ⇒ khả năng phát lại và nhiều bên đọc — hai lợi ích chính — không dùng
□ Dùng RabbitMQ nhưng chỉ có MỘT queue, direct exchange
  ⇒ định tuyến, lợi ích chính, không dùng
□ Không ai trong đội tự tin vận hành nó
  ⇒ sự cố đầu tiên sẽ rất dài
```

**Và ba dấu hiệu bạn chọn quá nhỏ:**

```text
□ Polling bảng job làm CSDL tốn đáng kể tài nguyên
□ Đang tự viết lại retry, backoff, DLQ, ưu tiên — và nó đã 500 dòng
□ Cần một bên nữa đọc cùng dữ liệu, và bạn định copy job sang bảng thứ hai
```

Đây là điểm cân bằng đáng nhớ: **chuyển lên khi có triệu chứng cụ thể**, không chuyển vì lo xa. Và cả hai chiều đều tốn kém — chọn quá to trả ngay, chọn quá nhỏ trả sau.

**Bốn thứ đúng với mọi công cụ:**

```text
① Consumer idempotent — at-least-once là mặc định của tất cả
② Có DLQ hoặc tương đương, và THEO DÕI nó
③ Retry có backoff và jitter, và có giới hạn số lần
④ Message mang ID, không mang dữ liệu lớn
```

Bốn điều này không phụ thuộc bạn chọn gì — nên hãy làm đúng chúng trước khi lo chọn công cụ.

## So sánh

| | Bảng CSDL | Redis Streams | RabbitMQ | Kafka |
|---|---|---|---|---|
| Hạ tầng thêm | không | có | có | **nặng** |
| Cùng transaction với dữ liệu | ✅ | ❌ | ❌ | ❌ |
| Thông lượng | thấp–vừa | cao | cao | **rất cao** |
| Phát lại | có (tự làm) | hạn chế | ❌ | ✅ |
| Định tuyến phức tạp | tự viết | ❌ | ✅ | ❌ |
| Nhiều bên đọc độc lập | tự viết | ✅ | fanout | ✅ |
| Ưu tiên / hẹn giờ | dễ (SQL) | có | ✅ | ❌ |

## Dễ nhầm

**1. Chọn Kafka khi một bảng CSDL là đủ.** Trả chi phí vận hành cho lợi ích không dùng.

**2. Dùng Redis List làm hàng đợi quan trọng.** Không có ack, mất job.

**3. Bỏ qua dual-write.** Job mất khi ghi hàng đợi lỗi.

**4. Chỉ theo dõi độ dài hàng đợi.** Tuổi message cũ nhất mới nói lên trải nghiệm.

**5. Không theo dõi số worker đang sống.** Hỏng im lặng hoàn toàn.

**6. Không có DLQ.**

**7. Retry không backoff.** Cơn bão vào dịch vụ đang quá tải.

**8. Message chứa dữ liệu lớn.** Phình, và dữ liệu cũ khi được xử lý.

**9. Chuyển công cụ vì lo xa, không vì triệu chứng.**

**10. Chọn công cụ không ai trong đội vận hành được.**

## Mẹo nhớ

> **Bắt đầu từ cái RẺ NHẤT đủ dùng. Một bảng CSDL đi rất xa.**
>
> **Bảng CSDL là công cụ duy nhất ghi job CÙNG transaction với dữ liệu.**
>
> **Theo dõi TUỔI message cũ nhất và SỐ WORKER ĐANG SỐNG.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn công cụ theo thứ tự chi phí vận hành?
2. `FOR UPDATE SKIP LOCKED` làm gì, và lợi thế riêng của bảng CSDL?
3. Năm dấu hiệu bảng CSDL hết đủ?
4. Bốn chỉ số phải theo dõi, hai cái nào hay bị bỏ?
5. Bốn thứ đúng với mọi công cụ?

## Tự viết lại

Không nhìn lại, chọn công cụ và giải thích cho từng hệ thống:

```text
① Blog: gửi email thông báo bài mới, ~100 email/ngày
② Sàn thương mại: 5 dịch vụ cần biết khi có đơn mới
③ Hệ thống log: 200.000 sự kiện/giây, cần phân tích lại lịch sử
④ Xử lý ảnh: 500 ảnh/phút, cần retry và theo dõi tiến độ
⑤ Gửi thông báo đẩy, có ưu tiên cao/thấp
```

Tự kiểm: ở ② bạn chọn gì, và nếu sau này cần **phát lại** các đơn hàng cũ thì lựa chọn đó còn đúng không?

## Thử sức

Đội bạn đang dùng Kafka cho hai việc: gửi email và cập nhật chỉ mục tìm kiếm. Một consumer group mỗi việc. Không ai từng phát lại. Vận hành cụm Kafka chiếm khoảng một ngày mỗi tháng của một người.

Ba câu để trả lời: bạn đánh giá lựa chọn này thế nào, dựa vào tiêu chí gì; nếu đề xuất chuyển sang cái nhẹ hơn, bạn trình bày ra sao; và bạn giữ lại gì từ thiết kế hiện tại. Câu khó nhất: chi phí **chuyển đổi** có thể lớn hơn chi phí giữ nguyên — bạn dùng con số nào để quyết định, và trong trường hợp nào câu trả lời đúng là "không làm gì"?
