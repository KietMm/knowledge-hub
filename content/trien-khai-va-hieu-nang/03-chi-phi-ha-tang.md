---
title: Chi phí hạ tầng
slug: chi-phi-ha-tang
summary: Đọc hoá đơn cloud, tìm chỗ đốt tiền, và coi chi phí là một yêu cầu kỹ thuật thay vì việc của kế toán.
level: nang-cao
tags: [van-hanh, chi-phi, cloud, finops]
---

> **Sau bài này bạn sẽ:** biết chi phí của mình đi đâu, và nhận ra những quyết định kỹ thuật làm hoá đơn tăng gấp nhiều lần.

## Vì sao đây là việc của tech lead

Chi phí hạ tầng là **hệ quả trực tiếp của quyết định kỹ thuật**, và người duy nhất hiểu được nhân quả đó là người thiết kế hệ thống. Kế toán thấy "hoá đơn AWS tăng 40%"; chỉ bạn biết nó là do một truy vấn mới đọc cross-AZ.

Chi phí cũng là một **ràng buộc thiết kế** ngang với độ trễ. "Kiến trúc này chạy được" và "kiến trúc này chạy được với giá 3.000 đô/tháng thay vì 300" là hai kết luận khác nhau, và phương án thứ hai thường không tệ hơn về mặt kỹ thuật.

## Chi phí thường nằm ở đâu

Với ứng dụng web điển hình, theo thứ tự:

1. **Compute** — instance/container chạy 24/7, thường **cấp phát quá mức**
2. **Truyền dữ liệu ra ngoài (egress)** — đắt hơn nhiều so với cảm nhận
3. **Database** — nhất là bản có quản lý và có replica
4. **Lưu trữ** — snapshot, log, backup **không có hạn lưu**
5. **Công cụ quan sát** — hoá đơn Datadog vượt hoá đơn AWS là chuyện có thật

Điểm 4 và 5 là hai chỗ hay bị bỏ quên nhất, vì chúng tăng âm thầm theo thời gian chứ không nhảy vọt.

## Egress: cái bẫy đắt nhất

Giá tham khảo (khác nhau theo nhà cung cấp, nhưng **tỉ lệ** thì giống nhau):

```
Trong cùng AZ                    miễn phí
Giữa hai AZ cùng region          ~0,01 $/GB   mỗi chiều
Giữa hai region                  ~0,02 $/GB
Ra internet                      ~0,09 $/GB
Qua CDN ra internet              ~0,02–0,05 $/GB
```

Con số "giữa hai AZ" nhỏ nhưng nhân với lưu lượng nội bộ thì không nhỏ:

```
App ở AZ-a, database ở AZ-b
Mỗi request đọc 50 KB từ database
1.000 req/s × 50 KB = 50 MB/s = 4,3 TB/ngày = 130 TB/tháng
130.000 GB × 0,01 $ × 2 chiều = 2.600 $/tháng
```

**2.600 đô mỗi tháng chỉ để dữ liệu đi giữa hai tủ rack.** Sửa bằng cách đặt app và database cùng AZ (và có replica ở AZ khác để chịu lỗi). Đây là loại chi phí không ai thấy trên dashboard hiệu năng.

Hai cách giảm egress ra internet:

- **CDN cho mọi tài sản tĩnh** — rẻ hơn 2–4 lần và nhanh hơn cho người dùng
- **Nén** — `gzip`/`br` giảm 60–80% payload JSON, giảm cả tiền lẫn độ trễ

## Cấp phát quá mức: chỗ dễ cắt nhất

```
Instance 8 vCPU / 32 GB, dùng thực tế: CPU 6%, RAM 20%
→ giảm xuống 2 vCPU / 8 GB, tiết kiệm 75%
```

Nghe hiển nhiên nhưng rất phổ biến, vì kích thước được chọn một lần lúc dựng hệ thống rồi không ai xem lại. Rà lại theo quý, dựa trên **p95 của mức sử dụng** (không phải trung bình — trung bình che mất đỉnh, và cắt theo trung bình sẽ làm hệ thống chết lúc đỉnh).

Ba đòn bẩy khác, sắp theo tỉ lệ hoàn vốn:

**Tự động co giãn theo lịch.** Môi trường dev/staging tắt ngoài giờ làm: 12 giờ × 5 ngày thay vì 24 × 7 là **tiết kiệm 70%** cho toàn bộ hạ tầng phi production.

**Cam kết dài hạn.** Reserved/savings plan giảm 30–60% cho phần tải nền ổn định. Chỉ cam kết phần **nền**, để phần đỉnh dùng on-demand.

**Spot instance** cho việc chịu được bị ngắt: worker hàng đợi, CI runner, xử lý theo lô. Giảm 60–90%. Không dùng cho thứ phục vụ request trực tiếp.

## Chi phí lưu trữ và quan sát tự tăng

```
Log 5 GB/ngày, giữ vô hạn
→ sau 1 năm: 1,8 TB, và vẫn tăng mãi
```

Đặt vòng đời cho mọi thứ ghi ra:

| Loại | Giữ nóng | Sau đó |
|---|---|---|
| Log ứng dụng | 7–14 ngày | Nén, chuyển sang lưu trữ lạnh 90 ngày, rồi xoá |
| Metric | 15 ngày ở độ phân giải cao | Gộp xuống 5 phút, giữ 13 tháng |
| Trace | Lấy mẫu 1% (giữ 100% lỗi) | 7 ngày |
| Snapshot database | 7 ngày hằng ngày | 4 tuần hằng tuần, 12 tháng hằng tháng |

Với công cụ quan sát trả tiền, ba thứ đốt tiền nhiều nhất: **cardinality metric cao** (xem [[quan-sat-he-thong]]), **log ở mức `debug` bật trên production**, và **trace lấy mẫu 100%**.

## Đưa chi phí vào việc hằng ngày

**1. Gắn thẻ mọi tài nguyên.** Không có thẻ thì không biết tiền đi đâu, và mọi cuộc thảo luận về chi phí thành đoán.

```
service=orders  env=prod  team=platform  cost-center=engineering
```

**2. Báo động khi chi phí bất thường**, không phải xem hoá đơn cuối tháng. Phát hiện sau 30 ngày là đã trả tiền cho 30 ngày.

**3. Đưa chi phí vào quyết định thiết kế.** Trong ADR nên có một dòng về chi phí — xem [[ra-quyet-dinh-ky-thuat]]:

```markdown
## Chi phí dự kiến
- Redis có quản lý: ~120 $/tháng
- Egress thêm: ~40 $/tháng
- Tổng: ~160 $/tháng ở tải hiện tại, ~600 $ ở tải gấp 5
```

**4. Biết chi phí đơn vị.** Con số đáng theo dõi nhất không phải tổng hoá đơn mà là **chi phí mỗi đơn vị nghiệp vụ**:

```
chi phí / đơn hàng     hoặc     chi phí / người dùng hoạt động
```

Tổng hoá đơn tăng 30% trong khi lượng đơn hàng tăng 50% nghĩa là bạn đang **hiệu quả hơn**. Không có chi phí đơn vị, mọi lần hoá đơn tăng đều trông như một vấn đề.

## Đừng tối ưu quá xa

Kỹ sư mất một tuần để tiết kiệm 50 đô/tháng là một quyết định lỗ. Ước lượng trước:

```
Tiết kiệm/năm  vs  Thời gian bỏ ra × chi phí kỹ sư
600 $/năm      vs  1 tuần ≈ 2.000 $   → không đáng
30.000 $/năm   vs  1 tuần ≈ 2.000 $   → làm ngay
```

Và cảnh giác với việc đánh đổi độ tin cậy lấy chi phí: bỏ replica để tiết kiệm 200 đô/tháng, rồi một sự cố 4 giờ làm mất doanh thu nhiều hơn cả năm tiết kiệm.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| App và database khác AZ | Hàng nghìn đô egress nội bộ | Cùng AZ, replica ở AZ khác |
| Không dùng CDN cho tài sản tĩnh | Egress đắt gấp 2–4 lần | CDN |
| Kích thước instance chọn một lần rồi quên | Trả tiền cho 90% tài nguyên không dùng | Rà theo quý, theo p95 |
| Dev/staging chạy 24/7 | Trả gấp 3 phần cần thiết | Tắt theo lịch |
| Log/snapshot không có hạn lưu | Chi phí tăng mãi | Chính sách vòng đời |
| `debug` bật trên production | Hoá đơn quan sát vượt hoá đơn hạ tầng | `info` ở production |
| Cardinality metric cao | Nổ hoá đơn công cụ quan sát | Bỏ label có id |
| Không gắn thẻ tài nguyên | Không biết tiền đi đâu | Gắn thẻ bắt buộc |
| Chỉ xem tổng hoá đơn | Tăng vì tăng trưởng bị hiểu là vấn đề | Theo dõi chi phí đơn vị |
| Cắt replica để tiết kiệm | Một sự cố xoá sạch tiền tiết kiệm cả năm | Đừng đổi độ tin cậy lấy tiền lẻ |

## Ghi nhớ

- Egress giữa hai AZ nhỏ trên giấy nhưng cực đắt khi nhân với lưu lượng nội bộ.
- Cắt theo p95 mức sử dụng, không theo trung bình.
- Mọi thứ ghi ra phải có hạn lưu trữ, kể cả log và snapshot.
- Chi phí **đơn vị** là con số đáng theo dõi, không phải tổng hoá đơn.

## Tự kiểm tra

1. App ở AZ-a, database ở AZ-b, 1.000 req/s × 50 KB. Tính egress mỗi tháng.
2. Vì sao cắt kích thước instance theo mức sử dụng trung bình là nguy hiểm?
3. Hoá đơn tăng 30%, đơn hàng tăng 50%. Đây là vấn đề hay không?
