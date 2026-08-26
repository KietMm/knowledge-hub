---
title: Quan sát hệ thống
slug: quan-sat-he-thong
summary: Log, metric, trace — mỗi loại trả lời câu hỏi gì, và vì sao dashboard đẹp vẫn không cứu được bạn.
level: co-ban
tags: [van-hanh, observability, log, metric, trace]
khung: v2
---

> **Sau bài này bạn sẽ:** biết ba loại tín hiệu trả lời câu hỏi gì, và vì sao "giám sát" khác "quan sát được".

## Ý tưởng chính

**Giám sát** trả lời những câu hỏi bạn **đã biết trước** để hỏi: CPU cao chưa, còn sống không.

**Quan sát được** là khả năng trả lời những câu hỏi bạn **chưa từng nghĩ tới** — mà không phải deploy thêm mã.

Sự cố thật hầu như luôn thuộc loại thứ hai. Nếu nó thuộc loại thứ nhất, bạn đã tự động xử lý nó rồi.

## Mental model

Hãy nghĩ tới **đèn báo trên xe hơi so với chẩn đoán ở gara**.

> **Đèn báo** — vài cái đèn cho vài tình huống người thiết kế đã lường trước: hết xăng, nóng máy, áp suất lốp. Rẻ, luôn nhìn thấy, và **chỉ biết những gì đã được nghĩ tới**.
>
> **Máy chẩn đoán ở gara** — cắm vào và đọc được hàng trăm thông số, kể cả những thứ bạn không biết mình cần cho tới lúc xe kêu tiếng lạ.
>
> Xe kêu tiếng lạ mà không có đèn nào sáng — đó chính là mọi sự cố production thú vị.

Metric là đèn báo. Log và trace là máy chẩn đoán.

## Ví dụ nhỏ

```ts
logger.info({
  event: 'don_hang.tao',
  donHangId: don.id,
  userId: user.id,
  tongTien: don.tongTien,
  duration_ms: Date.now() - batDau,
})
```

## Code chạy thế nào

**Ba loại tín hiệu, mỗi loại trả lời một câu hỏi khác:**

```text
METRICS  — số theo thời gian
  Trả lời: "CÓ gì lệch không?"
  Rẻ để lưu, nhanh để truy vấn, dùng cho CẢNH BÁO.
  Không trả lời được "vì sao".

LOGS     — sự kiện rời rạc có ngữ cảnh
  Trả lời: "lệch CÁI GÌ, với AI, lúc NÀO?"
  Đắt để lưu, chậm để tìm nếu không có cấu trúc.

TRACES   — một request đi qua nhiều dịch vụ
  Trả lời: "chậm Ở ĐÂU trong chuỗi này?"
  Bắt buộc khi có nhiều dịch vụ.
```

Thiếu một loại thì mất một khả năng cụ thể: chỉ có metric ⇒ biết hỏng mà không biết vì sao. Chỉ có log ⇒ không biết có hỏng cho tới khi ai đó báo.

**Log có cấu trúc — khác biệt thật sự:**

```ts
// ❌ Chuỗi văn bản — tìm được, nhưng không lọc và không tổng hợp được
console.log(`Đơn ${don.id} của ${user.email} thất bại: ${err.message}`)

// ✅ JSON — truy vấn được như dữ liệu
logger.error({
  event: 'don_hang.that_bai',
  donHangId: don.id,
  userId: user.id,
  loi: err.message,
  traceId: ctx.traceId,
})
```

```text
Với log có cấu trúc, bạn hỏi được:
  "Đếm lỗi theo mã lỗi trong 1 giờ qua"
  "Mọi log của userId X, sắp theo thời gian"
  "p95 duration của event don_hang.tao theo từng giờ"

Với log dạng chuỗi: bạn grep, và hy vọng định dạng chưa từng đổi.
```

**`traceId` — trường quan trọng nhất trong log:**

```text
Sinh một id ở biên (hoặc nhận từ header), truyền qua MỌI tầng
và MỌI dịch vụ, ghi vào MỌI dòng log.

⇒ Người dùng báo lỗi lúc 14:32.
  Có traceId: lọc một lần, ra toàn bộ hành trình của request đó.
  Không có:   ghép log thủ công theo thời gian và đoán.
```

Đây là thứ rẻ nhất để thêm và có giá trị cao nhất khi có sự cố.

## Cú pháp

**Log cái gì, và cái gì thì đừng:**

```text
✅ LOG:
   Sự kiện nghiệp vụ (đơn hàng, thanh toán, đăng nhập)
   Lỗi kèm ngữ cảnh đầy đủ
   Lời gọi ra ngoài: đích, thời gian, kết quả
   Quyết định quan trọng ("dùng đường dự phòng vì X")

❌ ĐỪNG LOG:
   Mật khẩu, token, số thẻ, dữ liệu cá nhân   ← rò rỉ qua log là chuyện thật
   Mọi dòng của một vòng lặp
   "đã vào hàm foo"                            ← nhiễu, che mất tín hiệu
```

**Mức log dùng cho đúng:**

```text
ERROR  cần người xử lý           → nên có cảnh báo
WARN   bất thường, tự phục hồi   → xem lại định kỳ
INFO   sự kiện nghiệp vụ         → mặc định ở production
DEBUG  chi tiết kỹ thuật         → chỉ bật khi cần
```

Lỗi thường gặp: log mọi thứ ở mức ERROR. Khi mọi thứ là lỗi thì không có gì là lỗi.

**Bốn tín hiệu vàng — bộ metric tối thiểu:**

```text
① Độ trễ     p50, p95, p99 (không dùng trung bình)
② Lưu lượng  req/s
③ Lỗi        % 5xx
④ Bão hoà    CPU, RAM, đĩa, kết nối CSDL, độ dài hàng đợi
```

**Metric nghiệp vụ — thứ hay bị bỏ quên:**

```text
Kỹ thuật: CPU 40%, lỗi 0.1%, p95 200ms   → "mọi thứ ổn"
Nghiệp vụ: số đơn hàng/giờ GIẢM 80%       → "có gì đó rất sai"

Một lỗi ở giao diện thanh toán không tạo ra 5xx nào.
Chỉ metric nghiệp vụ bắt được.
```

Với nhiều hệ thống, "số đơn hàng mỗi giờ" là chỉ số cảnh báo tốt hơn mọi chỉ số hạ tầng cộng lại.

## Tại sao cần nó

Vì dashboard đẹp không cứu được bạn:

```text
Sự cố xảy ra lúc 3 giờ sáng.
Không ai đang nhìn dashboard.
Dashboard cho câu trả lời khi bạn ĐÃ BIẾT phải hỏi gì.

⇒ Thứ cứu bạn là CẢNH BÁO (biết có chuyện)
  cộng khả năng TRUY VẤN (tìm ra chuyện gì).
  Dashboard là công cụ thứ ba, không phải thứ nhất.
```

**Chi phí — lý do phải chọn lọc:**

```text
Log ở quy mô rất đắt. 1 TB/tháng có thể tốn hơn cả máy chủ.

Cách kiểm soát:
  □ Lấy mẫu log DEBUG/INFO ở đường nóng
  □ Giữ ERROR/WARN đầy đủ
  □ Thời hạn lưu khác nhau: 7 ngày chi tiết, 90 ngày tổng hợp
  □ Chuyển những thứ đếm được sang metric — rẻ hơn nhiều lần
```

Dòng cuối đáng nhấn: nếu bạn đang log để **đếm** thứ gì đó, hãy dùng metric. Log để **điều tra**, metric để **đếm**.

**Bắt đầu tối thiểu:**

```text
□ Log có cấu trúc JSON, có traceId
□ Bốn tín hiệu vàng
□ 2–3 metric nghiệp vụ quan trọng nhất
□ Cảnh báo cho ERROR và cho metric nghiệp vụ bất thường
□ Kiểm tra uptime từ bên ngoài
```

## So sánh

| | Metrics | Logs | Traces |
|---|---|---|---|
| Trả lời | có gì lệch | lệch cái gì | chậm ở đâu |
| Chi phí | thấp | **cao** | vừa |
| Dùng cho | cảnh báo | điều tra | hệ nhiều dịch vụ |
| Trả lời câu hỏi mới | ❌ | ✅ | ✅ |

## Dễ nhầm

**1. Log dạng chuỗi không cấu trúc.** Không truy vấn được.

**2. Không có traceId.** Ghép log thủ công lúc đang cháy.

**3. Log dữ liệu nhạy cảm.** Rò rỉ qua hệ thống log.

**4. Mọi thứ đều là ERROR.** Mất khả năng phân biệt.

**5. Chỉ có metric hạ tầng.** Lỗi nghiệp vụ vẫn "xanh".

**6. Dùng trung bình.** Che mất đuôi.

**7. Tin vào dashboard thay vì cảnh báo.** Không ai nhìn lúc 3 giờ sáng.

**8. Không kiểm soát chi phí log.** Hoá đơn vượt cả chi phí máy chủ.

**9. Không có trace trong hệ nhiều dịch vụ.** Không định vị được chỗ chậm.

**10. Dùng log để đếm.** Metric rẻ hơn nhiều lần.

## Mẹo nhớ

> **Metric: CÓ lệch không. Log: lệch CÁI GÌ. Trace: chậm Ở ĐÂU.**
>
> **`traceId` trong mọi dòng log — rẻ nhất, giá trị cao nhất.**
>
> **Metric nghiệp vụ bắt được thứ metric hạ tầng luôn bỏ sót.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Giám sát khác quan sát được ở điểm nào?
2. Ba loại tín hiệu, mỗi loại trả lời câu hỏi gì?
3. Vì sao log có cấu trúc quan trọng hơn log dạng chuỗi?
4. `traceId` giải quyết gì?
5. Vì sao metric nghiệp vụ cần thiết dù metric hạ tầng đều xanh?

## Tự viết lại

Ứng dụng đặt hàng. Không nhìn lại, thiết kế:

```text
① năm sự kiện cần log, mỗi cái kèm những trường nào
② năm metric: 3 kỹ thuật, 2 nghiệp vụ
③ ba cảnh báo, kèm ngưỡng
④ cách truyền traceId qua các tầng
```

Tự kiểm: nếu trang thanh toán hỏng nhưng không sinh 5xx nào, cảnh báo nào của bạn kêu?

## Thử sức

Người dùng báo: *"Đơn hàng của tôi lúc 14:32 báo lỗi."* Bạn có log dạng chuỗi, không có traceId, và ba dịch vụ.

Ba câu để trả lời: bạn điều tra thế nào **với hiện trạng**; ba thay đổi giúp lần sau chỉ mất vài phút; và bạn thuyết phục đội đầu tư vào đó bằng lập luận nào. Câu khó nhất: nếu chỉ được thêm **một** thứ, bạn chọn gì và vì sao?
