---
title: SLO và error budget
slug: slo-va-error-budget
summary: Đặt mục tiêu độ tin cậy bằng số, và dùng nó để quyết định khi nào ngừng làm tính năng.
level: trung-cap
tags: [van-hanh, slo, sli, error-budget, bao-dong]
---

> **Sau bài này bạn sẽ:** viết được một SLO có nghĩa, và dùng error budget để chấm dứt tranh luận "làm tính năng hay đi sửa hệ thống".

## Vì sao "làm cho nó ổn định" là mục tiêu vô dụng

Không ai phản đối câu đó, và cũng không ai làm được gì với nó. Nó không nói được: ổn định tới mức nào là đủ? Đủ rồi thì chuyển sang làm tính năng chứ? Chưa đủ thì ưu tiên hơn tính năng không?

**100% uptime không phải mục tiêu** — nó là mục tiêu sai, vì:

- Chi phí tăng theo hàm mũ ở mỗi con số 9 thêm vào
- Người dùng vào bằng mạng 4G có tỉ lệ lỗi cao hơn hệ thống của bạn, nên họ **không cảm nhận được** phần bạn cải thiện
- Zero lỗi nghĩa là zero thay đổi — mọi deploy đều có rủi ro

## Ba khái niệm, quan hệ rõ ràng

**SLI** (Indicator) — con số bạn đo:
```
tỉ lệ thành công = số request không phải 5xx / tổng số request
```

**SLO** (Objective) — mục tiêu bạn đặt cho SLI đó:
```
99,9% request thành công, tính trên cửa sổ 30 ngày
```

**SLA** (Agreement) — cam kết hợp đồng có tiền đền. Nội bộ thường không cần; nếu có thì SLO phải **chặt hơn** SLA để bạn còn thời gian phản ứng.

## Error budget: phần được phép hỏng

Đây là ý tưởng có giá trị nhất của cả bài.

```
SLO 99,9% trong 30 ngày
→ được phép lỗi 0,1%
→ 30 ngày × 24 × 60 = 43.200 phút
→ ngân sách = 43,2 phút không khả dụng mỗi tháng
```

| SLO | Ngân sách/tháng | Thực tế nghĩa là |
|---|---|---|
| 99% | 7,2 giờ | Rất dễ đạt |
| 99,9% | 43 phút | Mục tiêu hợp lý cho hầu hết sản phẩm |
| 99,95% | 22 phút | Cần deploy tự động, rollback nhanh |
| 99,99% | 4,3 phút | Cần dự phòng nhiều vùng, on-call thật |
| 99,999% | 26 giây | Rất ít hệ thống thật sự cần |

43 phút/tháng nghe ít, nhưng nó **đủ cho một sự cố nhỏ**. Và đó là điểm quan trọng: ngân sách không phải để tránh, mà là **để dùng**.

Còn ngân sách → cứ deploy, cứ thử nghiệm, rủi ro nằm trong mức đã thoả thuận.
Hết ngân sách → **đóng băng tính năng, cả nhóm chuyển sang việc độ tin cậy** cho tới khi cửa sổ 30 ngày trượt qua.

Giá trị thật của cơ chế này: nó biến "làm tính năng hay đi sửa hệ thống" từ một **cuộc tranh luận theo cảm tính và theo cấp bậc** thành một **quy tắc đã thoả thuận trước**. Không ai phải thắng cuộc họp — số liệu quyết định.

## Viết SLO có nghĩa

SLO tồi:

```
❌ "Server uptime 99,9%"
```

Server sống mà mọi request trả `500` thì uptime vẫn 100%. Đo cái người dùng không cảm nhận được là đo sai chỗ.

SLO tốt: đo ở **góc nhìn người dùng**, chia theo **luồng nghiệp vụ**:

```
✅ Checkout thành công:  99,95% request POST /api/orders trả 2xx, cửa sổ 28 ngày
✅ Trang chủ nhanh:      99% request GET / có p95 dưới 800 ms
✅ Tìm kiếm chính xác:   99,9% truy vấn tìm kiếm trả kết quả trong 2 s
```

Ba điều làm chúng khác hẳn SLO tồi:

- **Chia theo luồng.** Checkout hỏng nghiêm trọng hơn trang "Về chúng tôi" hỏng rất nhiều. Một SLO chung cho cả hệ thống cho phép checkout hỏng ẩn sau lượng lớn request lành mạnh của trang tĩnh.
- **Có cả độ trễ, không chỉ lỗi.** Trang trả `200` sau 30 giây là hỏng theo mọi nghĩa mà người dùng quan tâm.
- **Cửa sổ trượt 28 ngày.** Chia hết cho 7 nên không bị lệch vì cuối tuần có mẫu lưu lượng khác ngày thường.

## Báo động theo triệu chứng, không theo nguyên nhân

```
❌ CPU > 80%                    ← có thể hoàn toàn bình thường
❌ RAM > 90%                    ← nhiều runtime cố tình dùng hết RAM
❌ Có exception trong log       ← luôn có exception trong log

✅ Tỉ lệ 5xx của checkout > 1% trong 5 phút
✅ p95 checkout > 2 s trong 10 phút
✅ Độ sâu hàng đợi tăng liên tục 15 phút
✅ Tốc độ tiêu error budget cao gấp 10 lần bình thường
```

Nguyên tắc: **báo động chỉ khi người dùng đang bị ảnh hưởng, hoặc sắp bị.** CPU 95% mà mọi request vẫn nhanh thì đó là dấu hiệu bạn dùng máy hiệu quả, không phải sự cố.

### Cảnh báo theo tốc độ tiêu ngân sách

Ngưỡng tĩnh có hai chế độ thất bại: báo động quá nhạy với đợt lỗi ngắn vô hại, và **quá chậm** với rò rỉ nhỏ kéo dài. Cảnh báo theo tốc độ tiêu (burn rate) giải quyết cả hai:

```
burn rate = (tỉ lệ lỗi hiện tại) / (tỉ lệ lỗi cho phép theo SLO)
```

Dùng hai cửa sổ song song:

| Burn rate | Cửa sổ | Nghĩa | Hành động |
|---|---|---|---|
| 14,4× | 1 giờ | Hết ngân sách tháng trong 2 ngày | Gọi người dậy |
| 6× | 6 giờ | Hết trong 5 ngày | Gọi người dậy |
| 3× | 1 ngày | Hết trong 10 ngày | Tạo ticket, giờ hành chính |
| 1× | 3 ngày | Đúng mức dự kiến | Không làm gì |

Cửa sổ ngắn bắt sự cố cấp tính; cửa sổ dài bắt rò rỉ chậm mà ngưỡng tĩnh không bao giờ thấy.

## Mỗi báo động phải kèm việc phải làm

```yaml
- alert: CheckoutErrorRateCao
  expr: |
    sum(rate(http_requests_total{route="/api/orders", status=~"5.."}[5m]))
    / sum(rate(http_requests_total{route="/api/orders"}[5m])) > 0.01
  for: 5m
  annotations:
    summary: "Tỉ lệ lỗi checkout {{ $value | humanizePercentage }}"
    # Ba dòng dưới là phần khiến báo động này hữu ích lúc 3 giờ sáng.
    dashboard: "https://grafana.../checkout"
    runbook: "https://wiki.../runbook-checkout"
    viec_dau_tien: "Xem log order.failed theo reason; kiểm tra trạng thái payment provider"
```

**Báo động không nói được phải làm gì thì nên xoá.** Nó chỉ dạy người ta bỏ qua báo động — và thói quen đó sẽ áp cả lên báo động thật.

## Bắt đầu thực tế

1. Chọn **một** luồng quan trọng nhất (thường là checkout hoặc đăng nhập)
2. Đo SLI của nó trong 2–4 tuần **mà không đặt mục tiêu** — để biết hiện trạng
3. Đặt SLO **hơi tốt hơn** hiện trạng, không phải con số lý tưởng
4. Một báo động burn rate
5. Rà lại mỗi quý

SLO đặt cao hơn khả năng hiện tại quá nhiều sẽ liên tục báo đỏ, và cả nhóm sẽ học cách phớt lờ nó — lúc đó bạn mất luôn công cụ.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Mục tiêu 100% uptime | Không dám deploy, chi phí vô hạn | Đặt SLO có ngân sách |
| Đo uptime của server | Mọi request `500` mà vẫn 100% | Đo ở góc nhìn người dùng |
| Một SLO cho cả hệ thống | Checkout hỏng ẩn sau request trang tĩnh | Chia theo luồng nghiệp vụ |
| SLO chỉ có lỗi, không có độ trễ | Trang 30 giây vẫn tính là đạt | Thêm SLO độ trễ |
| Báo động theo CPU/RAM | Gọi dậy khi không ai bị ảnh hưởng | Báo động theo triệu chứng |
| Chỉ dùng ngưỡng tĩnh | Bỏ lọt rò rỉ chậm | Burn rate hai cửa sổ |
| Báo động không có runbook | Người bị gọi không biết làm gì | Kèm dashboard + việc đầu tiên |
| SLO đặt quá cao so với thực tế | Đỏ liên tục, cả nhóm phớt lờ | Bắt đầu từ hiện trạng |

## Ghi nhớ

- Error budget biến tranh luận ưu tiên thành một quy tắc thoả thuận trước.
- Ngân sách là để **dùng**: còn thì cứ deploy, hết thì đóng băng tính năng.
- Đo ở góc nhìn người dùng, chia theo luồng, có cả lỗi và độ trễ.
- Báo động không nói được phải làm gì thì xoá nó đi.

## Tự kiểm tra

1. SLO 99,9% cho bạn bao nhiêu phút lỗi mỗi tháng, và nên dùng nó thế nào?
2. Vì sao "uptime server 99,9%" là SLI sai?
3. Burn rate hai cửa sổ bắt được điều gì mà ngưỡng tĩnh không bắt được?
