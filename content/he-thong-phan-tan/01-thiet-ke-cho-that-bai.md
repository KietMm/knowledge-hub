---
title: Thiết kế cho thất bại
slug: thiet-ke-cho-that-bai
summary: Timeout, retry, circuit breaker, bulkhead — và vì sao retry sai cách làm sự cố nặng hơn.
level: trung-cap
tags: [kien-truc, chiu-loi, timeout, circuit-breaker]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bốn công cụ chịu lỗi và thứ tự áp dụng, và vì sao retry là con dao hai lưỡi.

## Ý tưởng chính

Trong một hệ thống phân tán, **mọi lời gọi mạng đều sẽ thất bại** — không phải "có thể", mà là sẽ, với tần suất nào đó.

Nên câu hỏi thiết kế không phải *"làm sao để không hỏng"* mà *"khi nó hỏng thì chuyện gì xảy ra"*.

## Mental model

Hãy nghĩ tới **cầu chì trong nhà**.

> Chập điện ở một ổ cắm. Cầu chì **tự ngắt mạch đó**. Cả nhà vẫn có điện.
>
> Không có cầu chì: chập một chỗ, dây nóng lên, và cháy cả hệ thống.
>
> Điều quan trọng: cầu chì **cố ý làm hỏng một phần nhỏ để cứu phần lớn**. Nó không sửa cái chập — nó ngăn cái chập lan ra.

Circuit breaker là cầu chì. Bulkhead là vách ngăn khoang tàu — nước tràn vào một khoang không làm chìm tàu. Cả hai đều dựa trên cùng một ý: **giới hạn bán kính thiệt hại**.

## Ví dụ nhỏ

```ts
const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
```

## Code chạy thế nào

**Timeout — công cụ nền tảng, và thường bị quên:**

```text
KHÔNG có timeout:
  Dịch vụ phụ treo (không lỗi, chỉ không trả lời)
  ⇒ request của bạn chờ mãi
  ⇒ worker bị giữ
  ⇒ hết worker
  ⇒ TOÀN BỘ dịch vụ của bạn chết, vì một dịch vụ phụ chậm.
```

Đây là cơ chế lan truyền sự cố phổ biến nhất, và nó bắt đầu từ chỗ **không ai gây ra lỗi cả** — chỉ có một thứ chậm.

```text
Đặt timeout theo p99 của dịch vụ đó, cộng biên:
  p99 = 200ms  →  timeout 500ms–1s

Và timeout phải GIẢM DẦN theo tầng:
  API gateway   5s
    → service A 3s
      → service B 1s
  Nếu B timeout 10s trong khi gateway timeout 5s
  ⇒ gateway bỏ cuộc trước, B vẫn làm việc vô ích.
```

**Retry — và vì sao nó nguy hiểm:**

```text
Dịch vụ quá tải, trả lỗi.
100 client cùng retry ngay lập tức, mỗi cái 3 lần
⇒ 300 request thêm vào một dịch vụ VỐN ĐANG QUÁ TẢI
⇒ nó chết hẳn
⇒ retry tiếp
⇒ không bao giờ hồi phục được.
```

Gọi là **retry storm**. Ba điều kiện để retry an toàn:

```text
① CHỈ retry lỗi TẠM THỜI
   ✅ timeout, 503, lỗi kết nối
   ❌ 400, 401, 404, 422 — retry cũng cùng kết quả, chỉ tốn thêm

② Exponential backoff + JITTER
   1s → 2s → 4s → 8s, cộng ngẫu nhiên
   Jitter là bắt buộc: không có nó, mọi client retry ĐỒNG THỜI
   ⇒ vẫn là cơn bão, chỉ chậm hơn một nhịp.

③ Giới hạn số lần: 3 là đủ. Và tổng thời gian phải nằm trong timeout của tầng trên.
```

**Circuit breaker — biết khi nào ngừng thử:**

```text
ĐÓNG (bình thường)  → mọi request đi qua
   ↓ tỉ lệ lỗi > 50% trong 10 giây
MỞ                  → TỪ CHỐI NGAY, không gọi nữa
   ↓ sau 30 giây
NỬA MỞ              → cho vài request thử
   ↓ thành công → ĐÓNG        ↓ thất bại → MỞ lại
```

Hai lợi ích, và cái thứ hai quan trọng hơn:

```text
① Bạn thất bại NHANH (10ms thay vì chờ hết 3 giây timeout)
② Dịch vụ kia được NGHỈ để hồi phục
   ⇒ không có breaker, nó bị nện liên tục và không bao giờ đứng dậy được.
```

## Cú pháp

**Bulkhead — chia tài nguyên để lỗi không lan:**

```text
Không có bulkhead — một pool 100 kết nối dùng chung:
  Dịch vụ khuyến nghị chậm ⇒ chiếm hết 100 kết nối
  ⇒ luồng THANH TOÁN cũng không còn kết nối nào.
  ⇒ Một tính năng phụ làm sập tính năng chính.

Có bulkhead:
  thanh toán: 50   |   tìm kiếm: 30   |   khuyến nghị: 20
  ⇒ Khuyến nghị chết thì chỉ khuyến nghị chết.
```

**Suy giảm có kiểm soát — thứ người dùng thực sự cảm nhận:**

```ts
async function layGoiY(userId: string) {
  try {
    return await dichVuGoiY.lay(userId)
  } catch {
    return SAN_PHAM_PHO_BIEN            // ← dự phòng, không phải lỗi
  }
}
```

```text
Trang sản phẩm không có gợi ý  →  vẫn bán được hàng.
Trang sản phẩm báo lỗi 500     →  mất doanh thu.

Câu hỏi cho mỗi phụ thuộc: "Thiếu nó thì trang này còn dùng được không?"
  Còn  ⇒ phải có dự phòng.
  Không ⇒ nó là phụ thuộc thiết yếu, cần được đối xử khác.
```

**Thứ tự áp dụng:**

```text
① Timeout          — luôn luôn, cho MỌI lời gọi mạng
② Retry có backoff + jitter — cho lỗi tạm thời, cho thao tác idempotent
③ Circuit breaker  — cho phụ thuộc bên ngoài quan trọng
④ Bulkhead         — khi có nhiều luồng nghiệp vụ chung tài nguyên
⑤ Dự phòng         — cho mọi thứ không thiết yếu
```

Đừng làm ngược: circuit breaker mà không có timeout thì gần như vô dụng, vì lỗi phổ biến nhất — treo — không bao giờ được tính là lỗi.

## Tại sao cần nó

Vì **retry chỉ an toàn khi thao tác idempotent**:

```text
POST /thanh-toan  → timeout
Bạn retry.
Nhưng lần đầu có thể ĐÃ THÀNH CÔNG — chỉ phản hồi bị mất.
⇒ Trừ tiền hai lần.
```

Cách xử lý: khoá idempotency do client sinh, server nhớ kết quả theo khoá đó ([[idempotency-va-thu-lai]]).

**Tính xác suất — vì sao nhiều phụ thuộc là vấn đề:**

```text
Mỗi dịch vụ uptime 99,9%.
Trang gọi 10 dịch vụ, tất cả đều bắt buộc:
  0,999¹⁰ ≈ 99%
⇒ Từ "43 phút downtime/tháng" thành "7 GIỜ/tháng".

⇒ Càng nhiều phụ thuộc bắt buộc, càng phải biến chúng thành KHÔNG bắt buộc.
```

Đây là lập luận mạnh nhất cho dự phòng: nó không chỉ cải thiện trải nghiệm, nó thay đổi hẳn con số uptime.

**Kiểm chứng:** những cơ chế này chỉ đáng tin khi đã thử.

```text
□ Tắt một dịch vụ phụ ở staging — hệ thống suy giảm hay sập?
□ Thêm độ trễ giả 5 giây — timeout có kích hoạt không?
□ Circuit breaker có thật sự mở không, và mất bao lâu?
```

Không thử thì bạn chỉ có mã trông giống chịu lỗi ([[su-co-va-hau-kiem]]).

## So sánh

| Công cụ | Chống | Khi nào |
|---|---|---|
| Timeout | treo vô hạn | **mọi lời gọi mạng** |
| Retry | lỗi thoáng qua | lỗi tạm thời, thao tác idempotent |
| Circuit breaker | nện dịch vụ đang chết | phụ thuộc bên ngoài |
| Bulkhead | cạn tài nguyên dùng chung | nhiều luồng nghiệp vụ |
| Dự phòng | mất tính năng phụ | thứ không thiết yếu |

## Dễ nhầm

**1. Không đặt timeout.** Cách lan truyền sự cố phổ biến nhất.

**2. Retry mà không backoff và jitter.** Tạo retry storm.

**3. Retry lỗi vĩnh viễn.** 400/404 retry bao nhiêu cũng thế.

**4. Retry thao tác không idempotent.** Trừ tiền hai lần.

**5. Timeout tầng trong lớn hơn tầng ngoài.** Làm việc vô ích.

**6. Không có circuit breaker cho phụ thuộc bên ngoài.** Nện dịch vụ đang chết.

**7. Coi mọi phụ thuộc là bắt buộc.** Uptime nhân lên rất nhanh.

**8. Không có bulkhead.** Tính năng phụ chiếm hết tài nguyên của tính năng chính.

**9. Không bao giờ thử.** Mã trông giống chịu lỗi, chưa chắc là chịu lỗi.

**10. Nuốt lỗi im lặng.** Có dự phòng thì tốt, nhưng vẫn phải ghi log và đếm.

## Mẹo nhớ

> **Mọi lời gọi mạng đều SẼ thất bại. Câu hỏi là "rồi sao".**
>
> **Retry phải có BACKOFF và JITTER — không thì nó là cơn bão.**
>
> **Circuit breaker cho dịch vụ đang chết được NGHỈ để hồi phục.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao thiếu timeout làm sập cả dịch vụ của bạn?
2. Retry storm hình thành thế nào? Ba điều kiện để retry an toàn?
3. Ba trạng thái của circuit breaker và điều kiện chuyển?
4. Bulkhead giải quyết vấn đề gì?
5. Vì sao 10 phụ thuộc 99,9% lại cho ra 99%?

## Tự viết lại

Trang chi tiết sản phẩm gọi: CSDL sản phẩm (bắt buộc), dịch vụ tồn kho (quan trọng), dịch vụ gợi ý (phụ), dịch vụ đánh giá (phụ). Không nhìn lại, thiết kế:

```text
① timeout cho từng cái
② cái nào có dự phòng, dự phòng là gì
③ cái nào cần circuit breaker
④ trang hiển thị ra sao khi mỗi cái hỏng
```

Tự kiểm: nếu dịch vụ tồn kho hỏng, bạn hiện gì — và quyết định đó có rủi ro nghiệp vụ nào?

## Thử sức

Sự cố: dịch vụ gợi ý chậm (không lỗi, chỉ chậm) trong 20 phút. Toàn bộ website **không truy cập được** suốt thời gian đó.

Ba câu để trả lời: mô tả **chuỗi lan truyền** từ "một dịch vụ chậm" tới "cả website chết"; ba thay đổi ngăn nó lặp lại, theo thứ tự ưu tiên; và bạn **kiểm chứng** bằng cách nào. Câu khó nhất: vì sao "chậm" nguy hiểm hơn "lỗi" trong tình huống này?
