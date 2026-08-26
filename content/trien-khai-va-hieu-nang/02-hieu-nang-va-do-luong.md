---
title: Hiệu năng và đo lường
slug: hieu-nang-va-do-luong
summary: Profiling trước khi sửa, kiểm thử tải cho ra số đáng tin, và Core Web Vitals của phía người dùng.
level: nang-cao
tags: [van-hanh, hieu-nang, profiling, load-test, web-vitals]
khung: v2
---

> **Sau bài này bạn sẽ:** đo trước khi sửa, thiết kế được một bài kiểm thử tải cho ra số đáng tin, và biết ba chỉ số phía người dùng.

## Ý tưởng chính

Trực giác về hiệu năng gần như luôn sai. Kể cả người viết ra đoạn mã đó.

Nguyên nhân: điểm nghẽn thường nằm ở chỗ **không có gì để nhìn** — một truy vấn thiếu index, một lời gọi mạng lặp lại, một lần tuần tự hoá dữ liệu lớn. Còn chỗ mã trông "phức tạp" thì thường chạy trong micro giây.

## Mental model

Hãy nghĩ tới **tìm chỗ rò trong đường ống nước**.

> Hoá đơn nước tăng gấp ba. Bạn có thể đi thay từng đoạn ống — tốn kém, mất thời gian, và có thể vẫn rò.
>
> Hoặc bạn khoá từng nhánh và **xem đồng hồ**. Vài phút là biết rò ở nhánh nào.
>
> Người thợ giỏi không đoán chỗ rò. Họ đo.

Profiler là cái đồng hồ nước. Và như đồng hồ nước, nó thường chỉ vào chỗ bạn không ngờ tới.

## Ví dụ nhỏ

```text
Trang mất 2,3 giây:
  1.800ms  một truy vấn CSDL      ← 78%
    300ms  render
    150ms  tuần tự hoá JSON
     50ms  các thứ khác

⇒ Tối ưu render giỏi lắm cứu 300ms. Sửa truy vấn cứu 1.800ms.
```

## Code chạy thế nào

**Quy trình bốn bước, không bỏ bước nào:**

```text
① ĐO       profiler, APM, EXPLAIN ANALYZE
           → tìm ra 20% gây 80% chi phí
② SỬA      chỉ chỗ đó
③ ĐO LẠI   xác nhận cải thiện thật, và không làm hỏng chỗ khác
④ ĐẶT MỐC  thêm test/cảnh báo để nó không tụt lại
```

Bước ④ hay bị bỏ, và hậu quả là bạn tối ưu lại đúng chỗ đó sau sáu tháng.

**Bốn nguyên nhân chiếm gần hết các vấn đề hiệu năng backend:**

```text
① N+1 QUERY                     ← phổ biến nhất
   Lấy 100 đơn hàng → 1 truy vấn
   Lặp và lấy user từng đơn → 100 truy vấn nữa
   ⇒ 101 truy vấn thay vì 2.
   Sửa: eager loading / JOIN / DataLoader.

② TRUY VẤN THIẾU INDEX
   EXPLAIN ANALYZE thấy Seq Scan trên bảng lớn.
   Sửa: thêm index đúng cột và đúng thứ tự ([[index-va-hieu-nang-truy-van]]).

③ LỜI GỌI MẠNG TUẦN TỰ
   5 lời gọi × 100ms tuần tự = 500ms
   Promise.all ⇒ ~100ms. Cùng số lời gọi, khác cách chờ.

④ LÀM VIỆC KHÔNG CẦN THIẾT TRONG REQUEST
   Gửi email, tạo PDF, cập nhật báo cáo
   ⇒ đẩy ra hàng đợi ([[hang-doi-va-xu-ly-bat-dong-bo]]).
```

Kiểm bốn cái này trước khi nghĩ tới bất kỳ tối ưu vi mô nào — chúng chiếm phần lớn các trường hợp thực tế.

## Cú pháp

**Kiểm thử tải — bốn loại, mục đích khác nhau:**

```text
Load test    tải dự kiến, thời gian dài   → "chịu được bình thường không?"
Stress test  tăng dần tới khi vỡ          → "trần ở đâu, VỠ NHƯ THẾ NÀO?"
Spike test   tăng đột ngột                → "chịu được cú sốc không?"
Soak test    tải vừa, nhiều giờ           → "có RÒ RỈ BỘ NHỚ không?"
```

Soak test là loại hay bị bỏ nhất và bắt được loại lỗi khó chịu nhất: hệ thống chạy tốt hai tiếng đầu rồi chết vào giờ thứ sáu.

**Làm kiểm thử tải cho ra số đáng tin:**

```text
□ Môi trường GIỐNG production (dữ liệu, cấu hình, tài nguyên)
  → CSDL 1.000 bản ghi không nói gì về CSDL 10 triệu bản ghi
□ Dữ liệu thật về kích thước và phân bố
□ Có giai đoạn khởi động (warm-up) — cache lạnh cho số sai
□ Mô phỏng hành vi thật, không chỉ đập vào một endpoint
□ Đo cả phía SERVER (CPU, CSDL) lẫn phía CLIENT (độ trễ)
```

Và quan trọng nhất: **quan sát cách nó vỡ**, không chỉ ghi lại con số trần.

```text
Vỡ có kiểm soát:  quá tải → trả 503 nhanh → hồi phục ngay khi tải giảm
Vỡ thảm hoạ:      quá tải → chậm dần → timeout hàng loạt
                  → retry storm → không hồi phục kể cả khi tải đã hết
```

Hệ thống thứ hai nguy hiểm hơn nhiều, vì nó không tự đứng dậy được ([[thiet-ke-cho-that-bai]]).

**Core Web Vitals — hiệu năng phía người dùng:**

```text
LCP  Largest Contentful Paint   nội dung chính hiện ra   < 2,5s
INP  Interaction to Next Paint  phản hồi khi bấm         < 200ms
CLS  Cumulative Layout Shift    nội dung nhảy            < 0,1
```

```text
Cải thiện thường gặp:
  LCP  → tối ưu ảnh, preload font, giảm chặn render, SSR
  INP  → chia nhỏ tác vụ JS dài, giảm JS gửi xuống
  CLS  → đặt width/height cho ảnh, chừa chỗ cho quảng cáo/banner
```

**RUM khác synthetic — và bạn cần cả hai:**

```text
Synthetic (Lighthouse):  môi trường cố định, so sánh được, chạy trong CI.
RUM (người dùng thật):   thiết bị thật, mạng thật, phân bố thật.

Lighthouse 95 điểm mà p75 LCP của người dùng thật là 4 giây
⇒ Lighthouse chạy trên máy nhanh, mạng nhanh. Người dùng thì không.
```

Luôn tin RUM hơn khi hai bên mâu thuẫn.

## Tại sao cần nó

Vì tối ưu sai chỗ tốn thời gian mà không đổi được gì cho người dùng:

```text
Bỏ hai ngày tối ưu một hàm chạy 5ms
⇒ tiết kiệm 2ms trên tổng 2.300ms.
⇒ Người dùng không cảm nhận được gì.
⇒ Và mã giờ khó đọc hơn.
```

**Định luật Amdahl, dùng như một phép tính nhanh:**

```text
Phần A chiếm 5% thời gian. Tối ưu nó nhanh vô hạn
⇒ tổng cải thiện tối đa 5%.

⇒ Trước khi tối ưu, hỏi: "phần này chiếm bao nhiêu % tổng?"
  Dưới 10% ⇒ giới hạn trên của nỗ lực này đã dưới 10%.
```

**Đặt mốc để không tụt lại:**

```text
□ Ngân sách hiệu năng trong CI: bundle không vượt X KB,
  Lighthouse không dưới Y điểm
□ Cảnh báo khi p95 tăng quá ngưỡng
□ Kiểm thử tải trước mỗi phát hành lớn
```

Không có mốc thì hiệu năng luôn **trôi dần** — mỗi PR làm chậm thêm một chút, không PR nào đáng bị chặn, và sáu tháng sau trang chậm gấp đôi.

## So sánh

| Loại test | Trả lời | Bỏ qua thì |
|---|---|---|
| Load | chịu được tải dự kiến? | vỡ vào ngày cao điểm |
| Stress | trần ở đâu, vỡ ra sao? | không biết còn dư bao nhiêu |
| Spike | chịu cú sốc? | chiến dịch marketing làm sập |
| Soak | có rò rỉ? | chết vào giờ thứ sáu |

## Dễ nhầm

**1. Tối ưu trước khi đo.** Sửa 5%, bỏ qua 80%.

**2. Không kiểm N+1.** Nguyên nhân phổ biến nhất.

**3. Load test trên môi trường không giống production.** Số vô nghĩa.

**4. Không warm-up.** Cache lạnh cho ra số sai.

**5. Chỉ ghi trần, không xem cách vỡ.** Bỏ sót vỡ thảm hoạ.

**6. Tin Lighthouse hơn RUM.** Máy của bạn nhanh hơn máy người dùng.

**7. Dùng trung bình.** Che mất đuôi.

**8. Không đặt ngân sách hiệu năng.** Trôi dần không ai chặn.

**9. Bỏ soak test.** Rò rỉ bộ nhớ chỉ lộ ra sau nhiều giờ.

**10. Tối ưu vi mô trước khi sửa kiến trúc.** Đổi thuật toán thắng mọi tinh chỉnh.

## Mẹo nhớ

> **ĐO trước, sửa sau, đo lại, rồi ĐẶT MỐC.**
>
> **Bốn nguyên nhân: N+1, thiếu index, gọi mạng tuần tự, việc nặng trong request.**
>
> **Quan trọng không phải trần ở đâu, mà là VỠ NHƯ THẾ NÀO.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn bước của quy trình tối ưu, bước nào hay bị bỏ?
2. Bốn nguyên nhân hiệu năng phổ biến nhất ở backend?
3. Bốn loại kiểm thử tải, mỗi loại trả lời gì?
4. Vỡ có kiểm soát khác vỡ thảm hoạ thế nào?
5. Vì sao tin RUM hơn Lighthouse?

## Tự viết lại

Trang danh sách sản phẩm mất 3 giây. Không nhìn lại, viết kế hoạch:

```text
① đo bằng công cụ nào, theo thứ tự nào
② bốn nguyên nhân, kiểm từng cái ra sao
③ sau khi sửa, xác nhận thế nào
④ đặt mốc gì để không tụt lại
```

Tự kiểm: bước ① của bạn có bao gồm cả phía server lẫn phía trình duyệt không?

## Thử sức

Sếp nói: *"Website chậm quá, tối ưu đi."* Không có số liệu, không có APM.

Ba câu để trả lời: bạn làm gì **trong ngày đầu tiên** để có số; bạn báo cáo kết quả thế nào cho một người không phải kỹ thuật; và bạn ưu tiên sửa cái gì trước dựa trên số đó. Câu khó nhất: nếu hoá ra trang **không** chậm ở phía server mà chậm ở trình duyệt của một nhóm người dùng cụ thể, bạn tìm ra điều đó bằng cách nào?
