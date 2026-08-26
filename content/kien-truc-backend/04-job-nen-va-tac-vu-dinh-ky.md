---
title: Job nền và tác vụ định kỳ
slug: job-nen-va-tac-vu-dinh-ky
summary: Cron, worker, khoá phân tán — và vì sao chạy job trong tiến trình web là sai ngay khi có máy thứ hai.
level: trung-cap
tags: [backend, job, cron, worker, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** đặt job nền đúng chỗ, và biết vì sao mỗi job phải chịu được chạy hai lần.

## Ý tưởng chính

Không phải việc nào cũng bắt đầu từ một request. Có việc chạy **theo lịch** (dọn dữ liệu cũ, gửi báo cáo), có việc chạy **theo sự kiện nhưng không cần ngay** (gửi email, xử lý ảnh).

Điểm chung của chúng: **không ai ngồi nhìn**. Nên hai câu hỏi thiết kế quan trọng nhất là *"chạy hai lần thì sao?"* và *"không chạy thì ai biết?"*.

## Mental model

Hãy nghĩ tới **hẹn giờ tưới cây tự động**.

> Bạn đặt hẹn giờ, đi công tác. Về nhà, cây xanh tốt — bạn cho rằng nó đã chạy đúng.
>
> Nhưng ba tình huống bạn **không hề biết**: hẹn giờ chạy hai lần một ngày (cây úng); hẹn giờ chết từ tuần trước (cây sống nhờ trời mưa); hoặc bạn lắp **hai** bộ hẹn giờ mà quên.
>
> Cái duy nhất cho bạn biết là **một thiết bị báo về mỗi lần tưới xong** — và báo động khi quá lâu không có tin gì.

Ba tình huống đó chính là ba vấn đề của job nền: **chạy trùng**, **không chạy**, và **không ai biết**.

## Ví dụ nhỏ

```ts
// ❌ Cron trong tiến trình web
setInterval(donDuLieuCu, 24 * 3600 * 1000)
// 3 máy chủ ⇒ chạy 3 LẦN mỗi ngày. Và mất khi restart.
```

## Code chạy thế nào

**Vì sao job trong tiến trình web sai ngay khi có máy thứ hai:**

```text
1 máy:  cron chạy 1 lần/ngày.  Trông ổn.
3 máy:  cron chạy 3 lần/ngày.  Email gửi 3 lần. Báo cáo cộng 3 lần.

Và còn ba vấn đề nữa:
  □ Job nặng chiếm CPU của tiến trình đang phục vụ request
    ⇒ p99 tăng vọt vào đúng giờ job chạy
  □ Deploy giữa lúc job đang chạy ⇒ job đứt giữa chừng
  □ Không mở rộng riêng được: cần thêm worker thì phải thêm cả web
```

**Ba cách chạy job, chọn theo quy mô:**

```text
① CRON CỦA HỆ THỐNG / NỀN TẢNG
   crontab, systemd timer, cron của cloud
   + Đơn giản, tách khỏi web, chạy đúng MỘT chỗ
   − Không tự retry, không thấy trạng thái, khó ghi log tập trung

② WORKER ĐỌC HÀNG ĐỢI
   BullMQ, Sidekiq, Celery
   + Retry, backoff, DLQ, giao diện theo dõi, mở rộng riêng
   − Thêm một thành phần phải vận hành

③ BẢNG JOB TRONG CSDL SẴN CÓ
   SELECT ... FOR UPDATE SKIP LOCKED
   + Không thêm hạ tầng; ghi job CÙNG TRANSACTION với dữ liệu
   − Tự viết retry và lịch
```

Cách ③ đáng chú ý vì nó giải quyết luôn vấn đề **dual-write**: nếu bạn tạo đơn hàng và đẩy job vào Redis, bước thứ hai có thể thất bại sau khi bước một đã commit. Ghi job vào một bảng trong cùng transaction thì không có khe hở đó ([[hang-doi-va-xu-ly-bat-dong-bo]]).

**Khoá phân tán — khi buộc phải chạy job trong ứng dụng:**

```ts
const KHOA = 'job:don-du-lieu'
const daLay = await redis.set(KHOA, id, 'NX', 'EX', 300)  // hết hạn 5 phút
if (daLay === null) return                                 // máy khác đang chạy
try {
  await donDuLieuCu()
} finally {
  await redis.del(KHOA)
}
```

```text
`EX 300` là phần bắt buộc, không phải tuỳ chọn:
máy giữ khoá chết mà khoá không tự hết hạn ⇒ job KHÔNG BAO GIỜ
chạy lại nữa, và im lặng.

Và thời hạn phải LỚN HƠN thời gian chạy job. Ngắn hơn ⇒ khoá hết hạn
giữa chừng ⇒ máy thứ hai vào ⇒ đúng thứ bạn đang cố tránh.
```

## Cú pháp

**Mọi job phải chịu được chạy hai lần:**

```ts
// ❌ Chạy lại = cộng dồn sai
await db.query('UPDATE thong_ke SET tong = tong + $1', [tongHomNay])

// ✅ Chạy lại = kết quả như chạy một lần
await db.query(
  `INSERT INTO thong_ke (ngay, tong) VALUES ($1, $2)
   ON CONFLICT (ngay) DO UPDATE SET tong = EXCLUDED.tong`,
  [ngay, tongHomNay],
)
```

```text
Vì sao BẮT BUỘC, không phải "nên":
  □ Cron có thể chạy trùng (khoá hết hạn, cấu hình nhân đôi)
  □ Job có thể bị retry sau khi đã làm được một nửa
  □ Người vận hành sẽ chạy tay lại khi nghi ngờ
⇒ Cả ba đều là chuyện bình thường, không phải sự cố.
```

**Job phải chia lô và ghi tiến độ:**

```ts
// ❌ Xoá 10 triệu dòng một lệnh: khoá bảng, transaction khổng lồ,
//    và mất sạch tiến độ nếu đứt giữa chừng
await db.query('DELETE FROM log WHERE tao_luc < $1', [motNamTruoc])

// ✅ Chia lô, dừng được, chạy lại được
let daXoa = 0
for (;;) {
  const { rowCount } = await db.query(
    'DELETE FROM log WHERE id IN (SELECT id FROM log WHERE tao_luc < $1 LIMIT 1000)',
    [motNamTruoc],
  )
  daXoa += rowCount
  if (rowCount === 0) break
  await nghi(100)                      // nhường I/O cho traffic thật
}
logger.info({ event: 'don_log.xong', daXoa })
```

Việc `nghi(100)` giữa các lô là chi tiết dễ bỏ và quan trọng: một job dọn dẹp chạy hết tốc lực làm nghẽn đĩa và kéo p95 của cả hệ thống lên ([[lap-lich-va-uu-tien]]).

**Theo dõi — phần hay bị bỏ hoàn toàn:**

```text
□ Job CHẠY XONG   → log event, và cập nhật "lần chạy thành công gần nhất"
□ Job THẤT BẠI    → cảnh báo
□ Job KHÔNG CHẠY  → cảnh báo  ← QUAN TRỌNG NHẤT và hay thiếu nhất
□ Job chạy quá lâu → cảnh báo
```

```text
"Job không chạy" là loại hỏng im lặng nhất:
không có log lỗi, không có ngoại lệ, không có gì cả.
⇒ Cách phát hiện duy nhất là đo NGƯỢC LẠI:
  "đã bao lâu kể từ lần chạy thành công gần nhất?"
  Quá ngưỡng ⇒ cảnh báo.
```

Rất nhiều đội phát hiện cron sao lưu chết từ ba tháng trước vào đúng ngày cần tới nó ([[giam-sat-va-sao-luu]]).

## Tại sao cần nó

Vì job nền là nơi tập trung ba đặc điểm khiến lỗi khó phát hiện nhất:

```text
□ Không ai nhìn lúc nó chạy
□ Không có người dùng để báo lỗi
□ Hậu quả thường là DỮ LIỆU SAI, không phải crash
```

**Cron expression — hai chỗ hay sai:**

```text
0 2 * * *      2 giờ sáng mỗi ngày — theo MÚI GIỜ NÀO?
               Cron của cloud thường mặc định UTC.
               ⇒ 2h UTC = 9h sáng giờ Việt Nam. Khai rõ múi giờ.

0 0 1 * *      Ngày 1 hằng tháng — job "chạy cuối tháng"
               viết sai thành đầu tháng là lỗi kinh điển.
```

Và một chi tiết nữa: **giờ chạy nên tránh đúng phút tròn của mọi hệ thống khác**. Đặt `0 2 * * *` cho mười job nghĩa là mười job cùng khởi động một lúc — thêm vài phút lệch nhau là đủ.

## So sánh

| | Cron hệ thống | Worker + hàng đợi | Bảng trong CSDL |
|---|---|---|---|
| Hạ tầng thêm | không | có | không |
| Retry sẵn có | ❌ | ✅ | tự viết |
| Theo dõi | tự làm | ✅ | tự làm |
| Cùng transaction với dữ liệu | ❌ | ❌ | ✅ |
| Hợp với | việc định kỳ đơn giản | quy mô lớn | vừa và nhỏ |

## Dễ nhầm

**1. Chạy cron trong tiến trình web.** Nhiều máy = chạy nhiều lần.

**2. Job không idempotent.** Chạy lại là hỏng dữ liệu.

**3. Khoá phân tán không có thời hạn.** Máy chết là job kẹt vĩnh viễn.

**4. Thời hạn khoá ngắn hơn thời gian chạy job.**

**5. Không cảnh báo khi job **không chạy**.** Hỏng im lặng nhiều tháng.

**6. Xử lý cả bảng trong một transaction.** Khoá bảng, mất tiến độ khi đứt.

**7. Không nghỉ giữa các lô.** Nghẽn I/O, kéo p95 lên.

**8. Sai múi giờ trong cron.**

**9. Nhiều job cùng khởi động một phút.**

**10. Job không ghi log lúc thành công.** Không đo được "lần chạy gần nhất".

## Mẹo nhớ

> **Job trong tiến trình web sai ngay khi có máy thứ hai.**
>
> **Mọi job PHẢI chịu được chạy hai lần — đó không phải sự cố hiếm.**
>
> **Cảnh báo khi job KHÔNG CHẠY, không chỉ khi nó lỗi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn vấn đề khi chạy job trong tiến trình web?
2. Ba cách chạy job, cách nào ghi job cùng transaction với dữ liệu?
3. Vì sao khoá phân tán bắt buộc phải có thời hạn, và thời hạn đặt thế nào?
4. Vì sao mọi job phải idempotent? Ba tình huống chạy trùng?
5. Vì sao "job không chạy" khó phát hiện, và đo bằng cách nào?

## Tự viết lại

Không nhìn lại, thiết kế job *"mỗi đêm gửi báo cáo doanh thu cho 5.000 khách hàng"*:

```text
① chạy ở đâu, vì sao
② chống chạy trùng
③ idempotent: gửi hai lần thì sao
④ chia lô và tiến độ
⑤ ba cảnh báo cần có
```

Tự kiểm: nếu job dừng ở khách hàng thứ 3.000, lần chạy sau của bạn bắt đầu từ đâu?

## Thử sức

Khách hàng báo họ nhận **ba email báo cáo giống hệt nhau** vào sáng nay. Hệ thống chạy trên 3 máy chủ.

Ba câu để trả lời: nguyên nhân gần như chắc chắn; hai cách sửa, ngắn hạn và dài hạn; và bạn kiểm chứng đã sửa bằng cách nào. Câu khó nhất: nếu bạn thêm khoá phân tán mà tuần sau vẫn có người nhận hai email, hai nguyên nhân nào còn lại?
