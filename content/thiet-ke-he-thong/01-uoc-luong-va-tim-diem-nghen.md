---
title: Ước lượng và tìm điểm nghẽn
slug: uoc-luong-va-tim-diem-nghen
summary: Những con số một tech lead phải nhớ, cách tính nhẩm tải, và vì sao trung bình là chỉ số dối.
level: co-ban
tags: [kien-truc, thiet-ke-he-thong, hieu-nang, uoc-luong]
khung: v2
---

> **Sau bài này bạn sẽ:** ước lượng được tải và dung lượng trong đầu, và chỉ ra điểm nghẽn trước khi viết dòng mã nào.

## Ý tưởng chính

Thiết kế hệ thống bắt đầu bằng **số**, không bằng sơ đồ.

Và số không cần chính xác — cần **đúng bậc độ lớn**. Sai gấp đôi thì không sao; sai gấp nghìn lần thì bạn đang thiết kế cho một hệ thống khác hẳn.

## Mental model

Hãy nghĩ tới **ước lượng số khách cho một bữa tiệc**.

> Bạn không cần biết chính xác 143 hay 147 người. Bạn cần biết đó là **150 người chứ không phải 1500** — vì hai con số đó dẫn tới hai loại địa điểm, hai loại bếp, hai ngân sách hoàn toàn khác nhau.
>
> Và bạn cần biết **giờ cao điểm**: 150 khách trải đều cả buổi khác hẳn 150 khách ập vào cùng lúc lúc 7 giờ.

Toàn bộ việc ước lượng hệ thống là như vậy: tìm bậc độ lớn, rồi tìm đỉnh.

## Ví dụ nhỏ

```text
1 triệu người dùng/ngày, mỗi người 10 request
= 10 triệu request/ngày
≈ 10.000.000 / 86.400 ≈ 116 request/giây trung bình
Đỉnh ≈ 3× trung bình ≈ 350 req/s
```

## Code chạy thế nào

**Bộ số cần thuộc — để tính nhẩm mà không tra:**

```text
Một ngày ≈ 86.400 giây  ≈ 10⁵     ← dùng con số này để nhẩm

Đọc RAM tuần tự 1 MB       ~0,25 ms
Round-trip trong data center ~0,5 ms
Đọc SSD ngẫu nhiên          ~0,1 ms
Đọc đĩa quay ngẫu nhiên     ~10 ms       (chậm hơn SSD 100 lần)
Round-trip qua Internet     ~50–150 ms   ← thường là phần lớn độ trễ

Postgres đơn giản (có index)  ~1–5 ms
Postgres không index, quét bảng  giây
Redis GET                    ~0,1 ms
```

Một hệ quả rút ra ngay từ bảng này: **một request đi qua mạng Internet đắt hơn 500 truy vấn Redis**. Nên gộp nhiều lời gọi lại thường có tác động lớn hơn tối ưu từng lời gọi.

**Quy trình ước lượng bốn bước:**

```text
① TẢI
   DAU × request mỗi người / 86.400 = req/s trung bình
   × 2–5 = đỉnh
   Tỉ lệ đọc/ghi? (thường 100:1 hoặc hơn ⇒ tối ưu đọc trước)

② DUNG LƯỢNG
   số bản ghi/ngày × kích thước × 365 × số năm
   × 2–3 cho index, bản sao, và chỗ dự phòng

③ BĂNG THÔNG
   req/s × kích thước phản hồi

④ ĐIỂM NGHẼN
   Cái nào chạm giới hạn TRƯỚC?
```

**Ví dụ đầy đủ — ứng dụng ảnh:**

```text
1 triệu DAU, mỗi người tải lên 2 ảnh, xem 50 ảnh.

Ghi:  2.000.000 / 86.400 ≈ 23 ảnh/s      → nhỏ
Đọc:  50.000.000 / 86.400 ≈ 580 req/s    → đỉnh ~1.700 req/s
Tỉ lệ đọc/ghi ≈ 25:1                     → CDN là ưu tiên số một

Dung lượng: 2 triệu ảnh/ngày × 2 MB = 4 TB/ngày
            → 1,4 PB/năm  ⇒ object storage, KHÔNG phải CSDL
Băng thông đọc: 580 × 200 KB ≈ 116 MB/s ≈ 1 Gbps ⇒ CDN
```

Chú ý: chưa vẽ sơ đồ nào, nhưng ba quyết định kiến trúc lớn nhất đã lộ ra — CDN, object storage, tối ưu cho đọc.

## Cú pháp

**Vì sao trung bình là chỉ số dối:**

```text
100 request: 99 cái 10ms, 1 cái 5.000ms
Trung bình = 60ms   → "nhanh mà"
p99        = 5.000ms → 1% người dùng chờ 5 giây

Với 1 triệu request/ngày, 1% = 10.000 người dùng bực mình MỖI NGÀY.
```

Và cái đuôi ấy còn được **nhân lên** khi một trang gọi nhiều dịch vụ:

```text
Một trang gọi 10 dịch vụ, mỗi dịch vụ p99 = 1 giây.
Xác suất KHÔNG dính cái chậm nào = 0.99¹⁰ ≈ 90%
⇒ 10% số lần tải trang chạm ít nhất một dịch vụ chậm.

p99 của từng phần trở thành p90 của trải nghiệm.
```

Đây là lý do trong hệ nhiều dịch vụ, người ta theo dõi cả p999 ([[quan-sat-he-thong]]).

**Tìm điểm nghẽn — kiểm theo thứ tự:**

```text
① CSDL       thường là chỗ vỡ đầu tiên
   → truy vấn thiếu index, N+1, connection pool cạn
② Ứng dụng   CPU (tính toán) hay chờ I/O?
③ Mạng       băng thông, độ trễ, số kết nối
④ Đĩa        IOPS, dung lượng
```

**Quy tắc kiểm tra nhanh trước khi thiết kế phức tạp:**

```text
< 1.000 req/s   → một máy chủ + một CSDL là đủ.
                  KHÔNG cần microservices, không cần Kafka.
< 100 GB        → Postgres thoải mái.
< 1 TB          → vẫn Postgres, cần chú ý index và phân vùng.
```

Phần lớn hệ thống nằm gọn trong ba dòng này. Thiết kế cho quy mô chưa có là cách chắc chắn nhất để làm chậm chính mình ([[chi-phi-ha-tang]]).

## Tại sao cần nó

Vì con số quyết định kiến trúc, và **đoán sai bậc độ lớn thì mọi lựa chọn sau đó đều sai**:

```text
100 req/s      → một máy chủ. Thêm gì cũng là phức tạp thừa.
10.000 req/s   → cân bằng tải, replica đọc, cache.
1.000.000 req/s → sharding, nhiều vùng, kiến trúc khác hẳn.
```

Ba dòng đó không phải "cùng một thiết kế ở ba quy mô" — chúng là ba thiết kế khác nhau.

**Quy tắc 80/20 khi tối ưu:** đo trước, và tấn công chỗ đắt nhất.

```text
Trang mất 2 giây:
  1.700ms  một truy vấn CSDL thiếu index
    200ms  render
    100ms  mạng

⇒ Tối ưu render giỏi lắm cứu được 100ms.
⇒ Thêm một index cứu 1.600ms.
```

Nghe hiển nhiên, nhưng phần lớn thời gian tối ưu trong thực tế bị tiêu vào các dòng thứ hai và thứ ba — vì chúng dễ nhìn thấy hơn trong mã ([[hieu-nang-va-do-luong]]).

## So sánh

| Chỉ số | Nói lên | Dùng khi |
|---|---|---|
| Trung bình | ít giá trị | gần như không bao giờ |
| p50 | trải nghiệm điển hình | mô tả chung |
| p95 | phần đuôi thật sự | **đặt SLO** |
| p99 | trường hợp xấu | cảnh báo |
| p999 | hệ nhiều dịch vụ | quy mô lớn |

## Dễ nhầm

**1. Dùng trung bình.** Che mất đuôi — nơi người dùng thật sự khổ.

**2. Quên nhân hệ số đỉnh.** Thiết kế cho mức trung bình là hỏng vào giờ cao điểm.

**3. Không tính chỗ cho index và bản sao.** Dung lượng thật gấp 2–3 lần dữ liệu thô.

**4. Thiết kế cho quy mô chưa có.** Trả giá phức tạp ngay, nhận lợi ích có thể không bao giờ tới.

**5. Bỏ qua tỉ lệ đọc/ghi.** Nó quyết định cache và replica.

**6. Tối ưu trước khi đo.** Sửa 5% và bỏ qua 85%.

**7. Quên độ trễ mạng.** Round-trip Internet thường lớn hơn toàn bộ thời gian xử lý.

**8. Không tính hiệu ứng đuôi khi gọi nhiều dịch vụ.**

**9. Lẫn bit với byte.** 1 Gbps ≈ 125 MB/s.

## Mẹo nhớ

> **Một ngày ≈ 10⁵ giây. Đỉnh ≈ 3× trung bình.**
>
> **Trung bình là chỉ số dối. Dùng p95/p99.**
>
> **Dưới 1.000 req/s: một máy chủ, một CSDL. Đừng thiết kế cho quy mô chưa có.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn bước ước lượng?
2. Vì sao trung bình che mất vấn đề, và bạn dùng gì thay thế?
3. Vì sao p99 của từng dịch vụ lại thành p90 của trang?
4. Tỉ lệ đọc/ghi ảnh hưởng tới quyết định kiến trúc nào?
5. Ba mốc quy mô và kiến trúc tương ứng?

## Tự viết lại

Ứng dụng chat: 500.000 DAU, mỗi người gửi 50 tin, đọc 200 tin, mỗi tin ~1 KB. Không nhìn lại, tính:

```text
① req/s trung bình và đỉnh cho ghi và đọc
② dung lượng một năm
③ băng thông
④ điểm nghẽn khả dĩ nhất
```

Tự kiểm: tỉ lệ đọc/ghi của bạn là bao nhiêu, và nó gợi ý kiến trúc nào?

## Thử sức

Sếp hỏi: *"Hệ thống này chịu được bao nhiêu người dùng?"* Bạn có một máy chủ 4 CPU, Postgres, và ứng dụng Node.

Ba câu để trả lời: bạn cần **đo** những gì để trả lời có căn cứ; bạn dự đoán cái nào vỡ trước và vì sao; và bạn diễn đạt câu trả lời thế nào cho **trung thực** — không hứa quá, cũng không né. Câu khó nhất: nếu sếp cần con số **ngay bây giờ**, chưa kịp đo gì, bạn nói gì?
