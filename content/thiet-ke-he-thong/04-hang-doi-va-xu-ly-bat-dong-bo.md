---
title: Hàng đợi và xử lý bất đồng bộ
slug: hang-doi-va-xu-ly-bat-dong-bo
summary: Đưa việc nặng ra khỏi request, at-least-once nghĩa là gì, và vì sao consumer phải idempotent.
level: trung-cap
tags: [kien-truc, hang-doi, worker, bat-dong-bo]
khung: v2
---

> **Sau bài này bạn sẽ:** biết việc nào nên đẩy ra hàng đợi, và vì sao consumer **bắt buộc** phải xử lý được cùng một message hai lần.

## Ý tưởng chính

Người dùng bấm "Đặt hàng" không cần đợi email xác nhận gửi xong, ảnh được resize xong, hay báo cáo được cập nhật xong.

Hàng đợi tách hai câu hỏi ra: *"đã ghi nhận chưa?"* (trả lời ngay) và *"đã xử lý xong chưa?"* (làm sau).

## Mental model

Hãy nghĩ tới **quầy nhận đồ giặt là**.

> Bạn đưa đồ, nhận **phiếu**, và đi về. Bạn không đứng đó nhìn người ta giặt.
>
> Quán nhận đồ liên tục dù máy giặt đang bận — đồ **xếp hàng chờ**. Máy hỏng thì đồ vẫn còn đó, giặt sau.
>
> Và cái phiếu là điều then chốt: nó cho bạn cách **hỏi lại trạng thái** mà không cần đứng chờ.

Cái phiếu là job id. Không có nó, hàng đợi biến việc "chậm nhưng biết kết quả" thành việc "nhanh nhưng không biết gì" — thường là một đánh đổi tệ.

## Ví dụ nhỏ

```ts
// Trong request — trả lời ngay
app.post('/don-hang', async (req, res) => {
  const don = await db.donHang.create({ data: req.body })
  await hangDoi.them('gui-email-xac-nhan', { donHangId: don.id })
  res.json({ id: don.id })          // ← không đợi email
})
```

## Code chạy thế nào

**At-least-once — điều quan trọng nhất về hàng đợi:**

```text
Gần như mọi hàng đợi đảm bảo AT-LEAST-ONCE: message được giao
ÍT NHẤT một lần — có thể nhiều hơn.

Vì sao không phải exactly-once:
  Worker xử lý xong, chưa kịp báo "đã xong" thì chết.
  Hàng đợi không phân biệt được:
      "worker chết TRƯỚC khi xử lý"  ⇒ phải giao lại
      "worker chết SAU khi xử lý"    ⇒ không nên giao lại
  Nó chọn phương án an toàn: GIAO LẠI.

⇒ Consumer PHẢI xử lý được cùng một message hai lần
  mà không gây hậu quả khác nhau.
```

Từ đó suy ra hệ quả không tránh được: **idempotent không phải tính năng nâng cao, nó là điều kiện tối thiểu**.

```ts
// ❌ Chạy hai lần = trừ tiền hai lần
await truTien(don.userId, don.tongTien)

// ✅ Chạy hai lần = kết quả như chạy một lần
const daXuLy = await db.xuLy.findUnique({ where: { messageId } })
if (daXuLy !== null) return                    // đã làm rồi, bỏ qua
await db.$transaction([
  truTien(don.userId, don.tongTien),
  db.xuLy.create({ data: { messageId } }),     // ghi dấu TRONG CÙNG transaction
])
```

Chi tiết quyết định: dấu "đã xử lý" phải nằm **trong cùng một transaction** với tác dụng phụ. Tách ra là quay lại đúng vấn đề cũ, chỉ nhỏ hơn ([[idempotency-va-thu-lai]]).

**Dead letter queue — nơi message hỏng đi tới:**

```text
Message lỗi → thử lại 3 lần với backoff (1s, 4s, 16s)
            → vẫn lỗi → chuyển sang DLQ, KHÔNG chặn hàng đợi chính

Không có DLQ:
  Một message hỏng (JSON sai định dạng, bản ghi đã bị xoá)
  ⇒ thử lại vô hạn
  ⇒ chặn cả hàng đợi phía sau nó
  ⇒ và tạo một vòng lặp đốt tài nguyên.
```

DLQ phải được **theo dõi**: message vào đó là dấu hiệu có gì đó sai, và không ai biết nếu không có cảnh báo.

## Cú pháp

**Việc nào nên đẩy ra hàng đợi:**

```text
✅ NÊN:
   Gửi email, SMS, thông báo đẩy
   Xử lý ảnh, video, tạo PDF
   Gọi API bên thứ ba (chậm, hay lỗi)
   Đồng bộ dữ liệu, cập nhật chỉ mục tìm kiếm
   Báo cáo, tính toán nặng

❌ KHÔNG NÊN:
   Việc người dùng cần kết quả NGAY để đi tiếp
   Việc dưới 100ms (chi phí hàng đợi lớn hơn lợi ích)
   Việc phải chạy đúng thứ tự nghiêm ngặt (khó đảm bảo)
```

**Ba mức phức tạp — chọn cái nhỏ nhất đủ dùng:**

```text
① Bảng trong CSDL sẵn có   (SELECT ... FOR UPDATE SKIP LOCKED)
   Không thêm hạ tầng. Đủ cho tới hàng nghìn job/phút.
   Và bạn ghi job trong CÙNG transaction với dữ liệu ⇒ không mất job.

② Redis + BullMQ / Sidekiq
   Nhanh, có sẵn retry, DLQ, giao diện theo dõi.

③ Kafka / RabbitMQ / SQS
   Nhiều consumer, thông lượng rất lớn, lưu lại lịch sử.
   Vận hành nặng.
```

Phần lớn hệ thống dừng ở ① hoặc ② rất lâu. Chọn ③ khi chưa cần là mua một hệ thống nữa phải vận hành.

**Vấn đề dual-write — dễ bỏ sót:**

```ts
// ❌ Hai hệ thống, không có transaction chung
await db.donHang.create({ data })      // thành công
await hangDoi.them('email', { ... })   // ← lỗi ở đây ⇒ đơn hàng KHÔNG BAO GIỜ được gửi email
```

Cách xử lý gọn nhất là **outbox**: ghi job vào một bảng trong **cùng transaction** với dữ liệu, rồi một tiến trình riêng đọc bảng đó đẩy sang hàng đợi. Hoặc đơn giản hơn: dùng luôn cách ① — CSDL **là** hàng đợi.

**Theo dõi hàng đợi:**

```text
Độ dài hàng đợi        tăng đều ⇒ worker không theo kịp
Tuổi message cũ nhất   ⇒ chỉ số quan trọng hơn độ dài
Tỉ lệ lỗi, số vào DLQ
Thời gian xử lý p95
```

"Tuổi message cũ nhất" nói lên trải nghiệm thật: hàng đợi dài 10.000 mà xử lý trong 30 giây thì không sao; hàng đợi dài 100 mà message cũ nhất 2 tiếng thì có gì đó kẹt.

## Tại sao cần nó

Vì đẩy việc ra khỏi request đổi cả hình dạng của hệ thống:

```text
Đồng bộ:      request giữ worker suốt 5 giây gửi email
              → tải cao là hết worker, dù CPU rảnh
              → dịch vụ email lỗi ⇒ ĐẶT HÀNG THẤT BẠI

Bất đồng bộ:  request trả về sau 50ms
              → chịu được đỉnh tải: hàng đợi hấp thụ, worker xử lý dần
              → dịch vụ email lỗi ⇒ retry sau, đơn hàng VẪN THÀNH CÔNG
```

Vế thứ ba là giá trị lớn nhất và ít được nói tới: hàng đợi **cách ly lỗi**. Một dịch vụ phụ hỏng không kéo theo luồng chính.

**Cái giá phải trả — nói rõ để cân nhắc:**

```text
□ Người dùng không thấy kết quả ngay ⇒ cần cách báo trạng thái
□ Gỡ lỗi khó hơn: luồng bị cắt làm hai, log ở hai nơi
□ Thêm một hệ thống phải vận hành và theo dõi
□ Mọi consumer phải idempotent
```

Với điểm đầu, cách xử lý thường là trả về job id và cho phép hỏi trạng thái — hoặc thông báo đẩy khi xong. Điểm quan trọng: **đừng để người dùng không biết gì**.

## So sánh

| | Đồng bộ | Bất đồng bộ |
|---|---|---|
| Người dùng thấy kết quả | ngay | sau |
| Chịu đỉnh tải | kém | ✅ hàng đợi hấp thụ |
| Dịch vụ phụ lỗi | luồng chính hỏng | ✅ retry sau |
| Gỡ lỗi | dễ | khó hơn |
| Cần idempotent | không | **bắt buộc** |

## Dễ nhầm

**1. Consumer không idempotent.** Email gửi hai lần, tiền trừ hai lần.

**2. Không có DLQ.** Một message hỏng chặn cả hàng đợi.

**3. Không theo dõi DLQ.** Message rơi vào đó và không ai biết.

**4. Dual-write không có outbox.** Job mất khi ghi hàng đợi lỗi.

**5. Retry không backoff.** Dịch vụ đang quá tải nhận thêm cơn bão retry.

**6. Đẩy việc người dùng cần ngay ra hàng đợi.** Trải nghiệm tệ hơn.

**7. Message chứa dữ liệu thay vì id.** Dữ liệu cũ khi worker xử lý, và message phình to.

**8. Dùng Kafka khi một bảng CSDL là đủ.**

**9. Không báo trạng thái cho người dùng.** "Tôi đặt hàng rồi, sao chẳng thấy gì?"

**10. Chỉ theo dõi độ dài hàng đợi.** Tuổi message cũ nhất mới nói lên trải nghiệm.

## Mẹo nhớ

> **At-least-once là mặc định ⇒ consumer BẮT BUỘC idempotent.**
>
> **Dấu "đã xử lý" phải nằm trong CÙNG transaction với tác dụng phụ.**
>
> **Message mang ID, không mang dữ liệu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. At-least-once nghĩa là gì, và vì sao exactly-once khó?
2. Vì sao consumer phải idempotent, và làm thế nào?
3. DLQ giải quyết gì?
4. Vấn đề dual-write là gì, cách xử lý?
5. Ba việc nên đẩy ra hàng đợi và ba việc không nên?

## Tự viết lại

Luồng đặt hàng cần: trừ tồn kho, gửi email, tạo hoá đơn PDF, cập nhật báo cáo. Không nhìn lại, thiết kế:

```text
① việc nào đồng bộ, việc nào bất đồng bộ, vì sao
② một consumer idempotent (viết mã)
③ xử lý khi PDF thất bại 3 lần
④ người dùng biết trạng thái bằng cách nào
```

Tự kiểm: nếu ghi vào hàng đợi thất bại sau khi đơn hàng đã lưu, thiết kế của bạn xử lý ra sao?

## Thử sức

Người dùng báo nhận **ba email xác nhận giống hệt nhau** cho một đơn hàng.

Ba câu để trả lời: nguyên nhân khả dĩ nhất; bạn sửa ở đâu để nó không xảy ra nữa; và bạn **kiểm chứng** cách sửa đó đúng bằng cách nào. Câu khó nhất: nếu đó là **thanh toán** chứ không phải email — trừ tiền ba lần — thì cách sửa của bạn có gì phải chặt hơn?
