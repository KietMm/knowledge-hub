---
title: Giám sát và sao lưu
slug: giam-sat-va-sao-luu
summary: Biết hệ thống đang hỏng trước khi người dùng báo, và chắc chắn khôi phục được khi mất dữ liệu.
level: nang-cao
tags: [deploy, giam-sat, sao-luu, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** biết cảnh báo cái gì (và cái gì thì đừng), và vì sao bản sao lưu chưa từng khôi phục thử là bản sao lưu không tồn tại.

## Ý tưởng chính

Hai câu hỏi phải trả lời được **trước** khi cần tới câu trả lời:

*"Hệ thống đang hỏng — tôi biết trước người dùng chứ?"*
*"Mất dữ liệu — tôi lấy lại được, mất bao lâu, và mất bao nhiêu?"*

Câu thứ hai chỉ có một cách trả lời trung thực: đã thử khôi phục.

## Mental model

Hãy nghĩ tới **khám sức khoẻ so với đợi tới lúc đau**.

> Đi khám định kỳ, đo vài chỉ số cơ bản — nhịp tim, huyết áp, đường huyết. Không phải để biết bệnh gì, mà để biết **có gì đang lệch khỏi bình thường của bạn**.
>
> Không đo gì cả, chỉ đi khám khi đã đau, nghĩa là bạn luôn biết tin xấu **muộn nhất có thể** — và ở giai đoạn tốn kém nhất.

Giám sát là mấy chỉ số cơ bản đó. Và như khám sức khoẻ, cái đáng chú ý không phải con số tuyệt đối mà là **xu hướng**: đĩa 70% không đáng lo; đĩa 70% và tăng 5% mỗi ngày thì bạn có bốn ngày.

## Ví dụ nhỏ

```bash
curl -fsS https://app.com/health || canh-bao "app không phản hồi"
```

## Code chạy thế nào

**Bốn tín hiệu vàng — cảnh báo theo cái người dùng cảm nhận được:**

```text
① Độ trễ        p95, p99 (KHÔNG dùng trung bình)
② Lưu lượng     request/giây
③ Tỉ lệ lỗi     % 5xx
④ Mức bão hoà   CPU, RAM, đĩa, kết nối CSDL
```

**Vì sao không dùng trung bình:**

```text
1000 request: 990 cái mất 50ms, 10 cái mất 10 giây.
Trung bình = 149ms  → trông ổn.
p99        = 10s    → 1% người dùng đang chịu 10 giây.

Trung bình che mất chính cái bạn cần thấy.
```

**Endpoint `/health` — có hai loại, đừng lẫn:**

```ts
// Liveness: "tiến trình còn sống không?" — trả về ngay, KHÔNG kiểm phụ thuộc
app.get('/health', (_, res) => res.json({ ok: true }))

// Readiness: "nhận traffic được chưa?" — kiểm phụ thuộc
app.get('/ready', async (_, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ ok: true })
  } catch {
    res.status(503).json({ ok: false })
  }
})
```

```text
Vì sao tách:
  Nếu liveness cũng kiểm CSDL, thì CSDL chập một nhịp
  ⇒ orchestrator tưởng ứng dụng chết ⇒ khởi động lại HÀNG LOẠT
  ⇒ CSDL vốn đang quá tải nay nhận thêm một cơn bão kết nối.
```

## Cú pháp

**Cảnh báo cái gì — và quan trọng hơn, cái gì thì đừng:**

```text
✅ CẢNH BÁO (người dùng đang bị ảnh hưởng, và cần người xử lý):
   Trang không phản hồi
   Tỉ lệ 5xx > 1% trong 5 phút
   p95 > 2 giây trong 10 phút
   Đĩa > 85%
   Chứng chỉ hết hạn trong < 21 ngày
   Job sao lưu THẤT BẠI hoặc KHÔNG CHẠY

❌ ĐỪNG CẢNH BÁO:
   CPU cao trong 1 phút          → tự hết
   Một request lỗi               → nhiễu
   Bất kỳ thứ gì "chỉ cần biết"  → cho vào dashboard, không phải chuông
```

Nguyên tắc lọc: **cảnh báo phải kèm một hành động cụ thể**. Cảnh báo không hành động được sẽ bị bỏ qua, và thói quen bỏ qua lan sang cả những cảnh báo thật ([[kiem-thu-tu-dong-trong-ci]] — cùng cơ chế với test chập chờn).

**Cảnh báo tốt trông như thế này:**

```text
❌ "Có lỗi ở server"
✅ "Tỉ lệ 5xx = 4.2% trong 5 phút (bình thường 0.1%).
    Bắt đầu 14:32, ngay sau deploy v1.4.2.
    Dashboard: <link>   Runbook: <link>"
```

Ba thứ làm nên khác biệt: **con số so với mức bình thường**, **thời điểm và thứ vừa thay đổi**, và **đường dẫn tới bước tiếp theo**.

**Quy tắc 3-2-1 cho sao lưu:**

```text
3 bản sao   (bản gốc + 2 bản lưu)
2 phương tiện khác nhau
1 bản ở NƠI KHÁC về mặt địa lý

Vì sao "nơi khác": ransomware, xoá nhầm, và sự cố cả vùng
đều xoá luôn bản sao nằm cùng chỗ với bản gốc.
```

**Và điều quan trọng nhất:**

```text
Bản sao lưu CHƯA TỪNG khôi phục thử = KHÔNG CÓ bản sao lưu.

Những thứ chỉ lộ ra khi thử thật:
  → file nén hỏng
  → thiếu schema, thiếu quyền, thiếu extension
  → khôi phục mất 6 tiếng, trong khi cam kết là 1 tiếng
  → script khôi phục tham chiếu một máy chủ đã ngừng hoạt động
```

Đặt lịch **diễn tập khôi phục mỗi quý**, và ghi lại thời gian thật.

## Tại sao cần nó

Vì hai con số này phải là **quyết định**, không phải phát hiện:

```text
RPO — Recovery Point Objective:  chấp nhận MẤT bao nhiêu dữ liệu?
      Sao lưu mỗi 24h ⇒ RPO = 24h ⇒ mất tối đa một ngày.
      RPO 5 phút ⇒ cần WAL archiving / replica.

RTO — Recovery Time Objective:   chấp nhận NGỪNG bao lâu?
      Khôi phục thủ công từ file nén ⇒ RTO vài giờ.
      RTO vài phút ⇒ cần replica sẵn sàng chuyển đổi.
```

Đây là câu hỏi kinh doanh, không phải câu hỏi kỹ thuật: mất một ngày dữ liệu đơn hàng có chấp nhận được không? Trả lời xong mới chọn được kiến trúc — và mới biết mình đang trả tiền cho cái gì ([[sao-luu-va-van-hanh-postgres]]).

**Ba tầng quan sát, đừng chỉ có một:**

```text
Metrics   số theo thời gian    → "có gì đó lệch"
Logs      sự kiện có ngữ cảnh   → "lệch cái gì"
Traces    một request qua các dịch vụ → "chậm ở đâu"
```

Chỉ có metrics thì biết hỏng mà không biết vì sao. Chỉ có log thì không biết có hỏng ([[quan-sat-he-thong]]).

**Bắt đầu tối thiểu, đừng chờ hoàn hảo:**

```text
□ Kiểm tra uptime từ bên ngoài (nhiều dịch vụ miễn phí)
□ /health và /ready
□ Cảnh báo: 5xx, p95, đĩa, chứng chỉ, job sao lưu
□ Sao lưu tự động + CẢNH BÁO KHI SAO LƯU THẤT BẠI
□ Một lần diễn tập khôi phục, có ghi lại thời gian
```

Dòng thứ tư đáng nhấn: cảnh báo khi **job sao lưu không chạy** quan trọng ngang bản sao lưu. Rất nhiều đội phát hiện cron sao lưu đã chết từ ba tháng trước — vào đúng ngày cần tới nó.

## So sánh

| | Metrics | Logs | Traces |
|---|---|---|---|
| Trả lời | có gì lệch | lệch cái gì | chậm ở đâu |
| Chi phí lưu | thấp | cao | vừa |
| Dùng khi | cảnh báo | điều tra | hệ nhiều dịch vụ |

## Dễ nhầm

**1. Không kiểm tra bản sao lưu.** Phát hiện nó hỏng vào đúng lúc cần.

**2. Sao lưu cùng chỗ với bản gốc.** Một sự cố xoá cả hai.

**3. Cảnh báo quá nhiều.** Đội học cách bỏ qua chuông.

**4. Cảnh báo theo trung bình.** Che mất đuôi.

**5. Không cảnh báo khi job sao lưu thất bại.** Im lặng suốt nhiều tháng.

**6. Liveness kiểm cả phụ thuộc.** CSDL chậm ⇒ khởi động lại hàng loạt.

**7. Không có RPO/RTO.** Không biết đang trả tiền cho mức bảo vệ nào.

**8. Chỉ có metrics, không có log.** Biết hỏng, không biết vì sao.

**9. Cảnh báo không kèm hành động.** Không dùng được lúc 3 giờ sáng.

**10. Chờ hệ thống quan sát "đầy đủ" mới bắt đầu.** Uptime check mất 5 phút để dựng và bắt được phần lớn sự cố nghiêm trọng.

## Mẹo nhớ

> **Bản sao lưu chưa từng khôi phục thử = không có bản sao lưu.**
>
> **Cảnh báo theo cái NGƯỜI DÙNG cảm nhận, và phải kèm hành động.**
>
> **Dùng p95/p99, đừng dùng trung bình — trung bình che mất đuôi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn tín hiệu vàng?
2. Vì sao p99 hữu ích hơn trung bình?
3. Liveness khác readiness thế nào, và vì sao không được gộp?
4. RPO và RTO là gì, ai quyết định chúng?
5. Vì sao phải cảnh báo cả khi **job sao lưu** thất bại?

## Tự viết lại

Ứng dụng web + Postgres trên một máy chủ. Không nhìn lại, viết:

```text
① Năm cảnh báo, kèm ngưỡng cụ thể
② Chiến lược sao lưu theo 3-2-1
③ Cách kiểm chứng bản sao lưu dùng được
④ RPO và RTO bạn nhắm tới, và cái đó đòi hỏi gì
```

Tự kiểm: nếu cả máy chủ cháy, bao lâu thì bạn chạy lại được — và bạn biết con số đó vì đã thử, hay vì ước lượng?

## Thử sức

Hệ thống mất dữ liệu do lỗi người dùng lúc 14:00. Bản sao lưu gần nhất lúc 02:00. Bạn khôi phục, nhưng file nén **báo lỗi** — và không ai từng thử khôi phục trước đây.

Ba câu để trả lời: bạn làm gì **ngay bây giờ**, theo thứ tự; ba thay đổi ngăn tình huống này lặp lại; và bạn nói gì với người dùng về 12 tiếng dữ liệu. Câu khó nhất: giả sử khôi phục được bản 02:00 — làm sao xác định **cái gì đã mất** trong khoảng 02:00–14:00, và có nguồn nào khác dựng lại được một phần không?
