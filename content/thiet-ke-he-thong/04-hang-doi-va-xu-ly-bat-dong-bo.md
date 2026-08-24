---
title: Hàng đợi và xử lý bất đồng bộ
slug: hang-doi-va-xu-ly-bat-dong-bo
summary: Đưa việc nặng ra khỏi request, at-least-once nghĩa là gì, và vì sao consumer phải idempotent.
level: trung-cap
tags: [kien-truc, hang-doi, worker, bat-dong-bo]
---

> **Sau bài này bạn sẽ:** biết việc nào phải ra khỏi request, và viết được consumer an toàn khi cùng một message đến hai lần.

## Việc nào phải ra khỏi request

Người dùng bấm "Đặt hàng". Trong request đó bạn đang làm:

```
1. Kiểm tra tồn kho          20 ms   ← người dùng cần biết ngay
2. Tạo đơn hàng              30 ms   ← người dùng cần biết ngay
3. Trừ kho                   10 ms   ← người dùng cần biết ngay
4. Gửi email xác nhận       800 ms   ← không
5. Gửi tin nhắn cho kho     600 ms   ← không
6. Đồng bộ sang CRM        1200 ms   ← không
7. Cập nhật báo cáo          400 ms   ← không
                          ─────────
                           3060 ms
```

Người dùng chờ 3 giây cho một việc lẽ ra 60ms. Tệ hơn: **CRM sập thì đơn hàng không tạo được** — bạn vừa gắn khả năng bán hàng của mình vào uptime của một hệ thống bên ngoài.

Tiêu chí tách rất rõ ràng: **người dùng có cần kết quả của việc này để biết yêu cầu đã thành công hay chưa?** Không → đưa vào hàng đợi.

```ts
export async function datHang(input: DonInput) {
  const don = await db.$transaction(async (tx) => {
    const kho = await tx.$executeRaw`
      UPDATE kho SET so_luong = so_luong - ${input.soLuong}
      WHERE id = ${input.productId} AND so_luong >= ${input.soLuong}`
    if (kho === 0) throw new HetHang()
    return tx.orders.create({ data: input })
  })

  // Đẩy việc SAU khi transaction commit. Đẩy bên trong transaction thì worker có thể
  // nhận message trước khi đơn hàng thật sự tồn tại trong database, rồi báo "không
  // tìm thấy đơn" — một lỗi rất khó tái hiện.
  await queue.add('don-da-tao', { orderId: don.id })

  return don      // ~60 ms
}
```

Đoạn chú thích trên là một trong những lỗi khó gỡ nhất của kiến trúc có hàng đợi. Nếu cần đảm bảo chắc chắn "tạo đơn thì phải có message", dùng **transactional outbox**: ghi message vào một bảng trong cùng transaction, rồi một tiến trình riêng đọc bảng đó và đẩy vào hàng đợi.

## At-least-once: giả định phải sống cùng

Gần như mọi hàng đợi thực tế đảm bảo **at-least-once**, không phải exactly-once. Nghĩa là **cùng một message sẽ đến hai lần**, và điều đó là bình thường, không phải bug:

- Worker xử lý xong nhưng chết trước khi ack → message quay lại hàng đợi
- Ack bị mất trên đường
- Retry sau timeout

Exactly-once ở mức hạ tầng gần như không tồn tại trong hệ phân tán. Cách thực tế: **at-least-once + consumer idempotent** — về mặt hiệu ứng thì tương đương exactly-once, và đây là cách mọi hệ thống nghiêm túc làm.

```ts
// ❌ Message đến hai lần = khách nhận hai email, hoặc bị trừ tiền hai lần
async function xuLy(job: { orderId: string }) {
  const don = await db.orders.findUnique({ where: { id: job.orderId } })
  await guiEmail(don.email, 'don-da-tao')
}

// ✅ Chống trùng bằng ràng buộc UNIQUE trong database
async function xuLy(job: { orderId: string; jobId: string }) {
  try {
    // UNIQUE trên (job_id) là thứ THẬT SỰ chặn: kiểm tra bằng SELECT trước rồi
    // INSERT vẫn có kẽ hở khi hai worker chạy đồng thời.
    await db.processedJobs.create({ data: { jobId: job.jobId } })
  } catch (loi) {
    if (laLoiUnique(loi)) return      // đã xử lý rồi, bỏ qua êm
    throw loi
  }

  const don = await db.orders.findUnique({ where: { id: job.orderId } })
  if (don === null) return             // đơn đã bị xoá: không phải lỗi, đừng retry
  await guiEmail(don.email, 'don-da-tao')
}
```

Cùng nguyên tắc với [[idempotency-va-thu-lai]] ở tầng HTTP và [[truy-cap-dong-thoi-va-khoa]] ở tầng dữ liệu: **ràng buộc unique trong database là thứ duy nhất chặn được cuộc đua**.

## Retry và dead letter queue

```ts
await queue.add('don-da-tao', { orderId }, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },   // 1s, 2s, 4s, 8s, 16s
  removeOnComplete: { count: 1000 },
  removeOnFail: false,                              // giữ lại để điều tra
})
```

Phân biệt hai loại lỗi, vì chúng cần cách xử lý ngược nhau:

| Loại | Ví dụ | Xử lý |
|---|---|---|
| **Tạm thời** | Mạng lỗi, `503`, timeout, deadlock | Retry có backoff |
| **Vĩnh viễn** | Payload sai, đơn không tồn tại, email không hợp lệ | **Đừng retry** — vào DLQ ngay |

```ts
class LoiVinhVien extends Error {}

async function xuLy(job) {
  if (!EmailSchema.safeParse(job.email).success) {
    // Retry 5 lần một payload sai chỉ đốt tài nguyên và làm nhiễu log.
    throw new LoiVinhVien(`Email không hợp lệ: ${job.email}`)
  }
  ...
}

worker.on('failed', (job, loi) => {
  if (loi instanceof LoiVinhVien) void job.discard()   // bỏ retry, đưa vào DLQ
})
```

**DLQ không phải nơi để quên.** Nó cần một báo động: DLQ có message nghĩa là có người dùng không nhận được email xác nhận, và không ai biết trừ khi bạn theo dõi nó. Xem [[slo-va-error-budget]].

## Thứ tự và tính song song đối nghịch nhau

Nhiều worker chạy song song → **mất thứ tự**. Message "cập nhật địa chỉ" và "xoá địa chỉ" có thể xử lý ngược thứ tự.

Ba cách, theo mức độ đắt:

**1. Thiết kế để thứ tự không quan trọng** (tốt nhất). Gửi trạng thái cuối thay vì delta:

```ts
// ❌ Phụ thuộc thứ tự
{ type: 'tang-so-luong', delta: 1 }

// ✅ Xử lý thứ tự nào cũng ra cùng kết quả
{ type: 'dat-so-luong', soLuong: 5, version: 12 }
```

**2. Phân vùng theo khoá.** Cùng `orderId` vào cùng một phân vùng → thứ tự được giữ **trong phạm vi khoá đó**, mà vẫn song song giữa các khoá khác nhau. Đây là mô hình của Kafka và là điểm ngọt trong hầu hết trường hợp.

**3. Một worker duy nhất.** Thứ tự tuyệt đối, nhưng không mở rộng được.

Cũng cần bảo vệ chống message cũ đến muộn:

```ts
// version trong WHERE: message cũ tới sau message mới thì không ghi gì cả.
const { count } = await db.orders.updateMany({
  where: { id, version: { lt: job.version } },
  data: { soLuong: job.soLuong, version: job.version },
})
```

## Theo dõi hàng đợi: ba con số

| Chỉ số | Nghĩa | Báo động khi |
|---|---|---|
| **Độ sâu** | Số job đang chờ | Tăng liên tục = consumer không kịp |
| **Tuổi job cũ nhất** | Job chờ lâu nhất | Quan trọng hơn độ sâu |
| **Tỉ lệ vào DLQ** | Lỗi vĩnh viễn | > 0 cần người xem |

"Tuổi job cũ nhất" đáng theo dõi hơn "độ sâu": hàng đợi 10.000 job xử lý hết trong 30 giây thì bình thường, còn hàng đợi 5 job mà job cũ nhất đã chờ 2 giờ nghĩa là worker đã chết.

## Khi nào chưa cần hàng đợi

Hàng đợi thêm một hệ thống phải vận hành, một chế độ lỗi mới, và làm việc gỡ lỗi khó hơn. Nếu bạn chỉ cần đưa việc gửi email ra khỏi request và có thể chấp nhận mất nó khi tiến trình chết:

```ts
// Chấp nhận được cho việc không quan trọng, KHÔNG dùng cho việc phải đảm bảo:
// tiến trình chết là job mất, không có retry, không thấy được từ ngoài.
void guiEmail(...).catch((loi) => logger.error({ loi }))
```

Và bước trung gian rất tốt trước khi dựng Redis + BullMQ: **hàng đợi bằng chính database** — một bảng `jobs` với `SELECT ... FOR UPDATE SKIP LOCKED`. Xem [[truy-cap-dong-thoi-va-khoa]]. Nó dùng lại transaction của database bạn đã có, và chịu tải tốt hơn nhiều so với cảm giác.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đẩy job trong transaction | Worker thấy dữ liệu chưa commit | Đẩy sau commit, hoặc outbox |
| Consumer không idempotent | Email/tiền lặp hai lần | `UNIQUE` trên job id |
| Retry lỗi vĩnh viễn | Đốt tài nguyên, nhiễu log | Phân loại lỗi, DLQ ngay |
| DLQ không có báo động | Người dùng mất email, không ai biết | Cảnh báo khi DLQ > 0 |
| Giả định thứ tự với nhiều worker | Cập nhật ghi ngược | Phân vùng theo khoá, hoặc gửi trạng thái cuối |
| Chỉ theo dõi độ sâu | Không phát hiện worker đã chết | Theo dõi tuổi job cũ nhất |
| Payload chứa cả object lớn | Message phình, dữ liệu cũ lúc xử lý | Chỉ gửi id, worker tự đọc |
| Dựng Kafka cho 100 job/ngày | Vận hành nặng vô ích | Bảng `jobs` + `SKIP LOCKED` |

## Ghi nhớ

- Ra hàng đợi nếu người dùng không cần kết quả để biết yêu cầu đã thành công.
- At-least-once là mặc định — consumer **phải** idempotent, chặn bằng `UNIQUE`.
- Lỗi tạm thời thì retry, lỗi vĩnh viễn thì vào DLQ ngay; DLQ phải có báo động.
- Payload chỉ chứa id, không chứa bản sao dữ liệu.

## Tự kiểm tra

1. Vì sao đẩy job bên trong transaction là bug, và outbox sửa nó thế nào?
2. Cùng một message đến hai lần. Cơ chế nào thật sự chặn được, và vì sao `SELECT` rồi `INSERT` thì không?
3. Vì sao "tuổi job cũ nhất" hữu ích hơn "độ sâu hàng đợi"?
