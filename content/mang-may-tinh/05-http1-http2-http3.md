---
title: HTTP/1.1, HTTP/2 và HTTP/3
slug: http1-http2-http3
summary: Vì sao gộp file từng là tối ưu và giờ thì không, và HTTP/3 giải quyết vấn đề nào mà HTTP/2 không giải được.
level: trung-cap
tags: [mang, http, hieu-nang, giao-thuc]
khung: v2
---

> **Sau bài này bạn sẽ:** biết mỗi phiên bản giải quyết vấn đề gì, và vì sao vài lời khuyên tối ưu web đã lỗi thời.

## Ý tưởng chính

Ba phiên bản HTTP giải quyết cùng một vấn đề ở ba tầng khác nhau: **làm sao gửi nhiều thứ cùng lúc trên một kết nối mà không cái nào phải chờ cái nào**.

HTTP/1.1 không giải được. HTTP/2 giải ở tầng ứng dụng nhưng vướng TCP. HTTP/3 đổi luôn tầng giao vận.

## Mental model

Hãy nghĩ tới **quầy thanh toán ở siêu thị**.

> **HTTP/1.1** — một quầy, phục vụ **hết người này mới tới người sau**. Người trước mua nhiều thì cả hàng chờ. Cách chữa duy nhất: **mở thêm quầy** (mở thêm kết nối), nhưng siêu thị chỉ cho mở 6 quầy.
>
> **HTTP/2** — một quầy nhưng nhân viên xử lý **xen kẽ**: quét vài món của người này, vài món của người kia. Không ai phải chờ hết hàng của người trước.
>
> Nhưng cả siêu thị dùng **chung một băng chuyền**. Băng chuyền kẹt một chỗ ⇒ **tất cả** dừng, dù nhân viên vẫn rảnh.
>
> **HTTP/3** — thay băng chuyền bằng nhiều đường ray độc lập. Một đường kẹt, các đường khác vẫn chạy.

Băng chuyền chung đó là TCP. Và "một chỗ kẹt làm tất cả dừng" là **head-of-line blocking** — khái niệm trung tâm của bài này.

## Ví dụ nhỏ

```text
HTTP/1.1  6 kết nối × 1 request tại một thời điểm
HTTP/2    1 kết nối × nhiều stream song song  (nhưng chung 1 TCP)
HTTP/3    1 kết nối QUIC/UDP × nhiều stream ĐỘC LẬP THẬT SỰ
```

## Code chạy thế nào

**HTTP/1.1 và giới hạn của nó:**

```text
Một kết nối phục vụ MỘT request tại một thời điểm.
Trình duyệt bù bằng cách mở ~6 kết nối song song mỗi tên miền.

⇒ Trang có 60 tài nguyên: xếp thành 10 đợt, mỗi đợt 6 cái.
⇒ Và mỗi kết nối phải trả phí bắt tay TCP + TLS riêng.

Các "mẹo tối ưu" ra đời từ chính giới hạn này:
  gộp file JS/CSS, sprite ảnh, chia nhỏ ra nhiều tên miền (domain sharding)
```

**HTTP/2 làm ba việc:**

```text
① GHÉP KÊNH   nhiều stream trên MỘT kết nối, xen kẽ nhau
   ⇒ 60 tài nguyên đi cùng lúc, không xếp hàng ở tầng HTTP

② NÉN HEADER (HPACK)
   Header HTTP lặp lại rất nhiều giữa các request (cookie, user-agent).
   HTTP/2 gửi bảng chỉ mục thay vì lặp lại toàn văn.

③ NHỊ PHÂN thay vì văn bản
   Phân tích nhanh hơn, ít lỗi mơ hồ hơn.
```

Hệ quả trực tiếp: **các mẹo tối ưu cũ trở thành phản tác dụng.**

```text
Gộp toàn bộ JS thành một file:
  HTTP/1.1 → tốt (ít request)
  HTTP/2   → XẤU: đổi một dòng ⇒ người dùng tải lại CẢ gói,
             thay vì chỉ tải lại một mảnh nhỏ.

Domain sharding:
  HTTP/1.1 → tốt (nhiều kết nối hơn)
  HTTP/2   → XẤU: mỗi tên miền là một kết nối và một bắt tay TLS riêng,
             phá đúng lợi ích của ghép kênh.
```

Đây là ví dụ điển hình của **lời khuyên tối ưu gắn với một ràng buộc đã biến mất** — và là lý do nên hiểu *vì sao* một mẹo tồn tại, không chỉ nhớ mẹo đó.

## Cú pháp

**Head-of-line blocking — hai tầng, đừng lẫn:**

```text
Ở TẦNG HTTP (HTTP/1.1):
  request 2 phải chờ request 1 xong.
  ⇒ HTTP/2 GIẢI QUYẾT XONG.

Ở TẦNG TCP (vẫn còn trong HTTP/2):
  TCP đảm bảo đúng thứ tự BYTE trên toàn kết nối.
  Một gói mất ⇒ TCP giữ lại MỌI byte sau nó, kể cả byte
  thuộc stream khác hoàn toàn.
  ⇒ 10 stream song song, mất một gói ⇒ CẢ 10 cùng dừng.

⇒ HTTP/2 trên mạng mất gói có thể CHẬM HƠN HTTP/1.1,
  vì HTTP/1.1 dùng 6 kết nối độc lập — một cái kẹt,
  năm cái kia vẫn chạy.
```

**HTTP/3 giải quyết bằng cách bỏ TCP:**

```text
QUIC chạy trên UDP và tự cài đặt lại phần tin cậy —
nhưng THEO TỪNG STREAM, không theo cả kết nối.

⇒ Mất gói của stream 3 ⇒ chỉ stream 3 chờ. Stream 1, 2, 4 chạy tiếp.

Hai lợi ích nữa:
  ① Bắt tay gộp: kết nối + mã hoá trong 1 round-trip (TLS 1.3 nằm trong QUIC)
  ② DI CHUYỂN KẾT NỐI: đổi Wi-Fi sang 4G, kết nối KHÔNG đứt
     — vì QUIC định danh bằng connection ID, không bằng cặp (IP, cổng).
```

Lợi ích ② là thứ người dùng di động cảm nhận rõ nhất, và không có cách nào đạt được bằng TCP.

**Kiểm tra đang dùng phiên bản nào:**

```bash
curl -I --http2 https://example.com      # xem có "HTTP/2" trong phản hồi
curl -I --http3 https://example.com
```

```nginx
# Bật HTTP/2 trong Nginx
listen 443 ssl;
http2 on;
```

## Tại sao cần nó

Vì nó cho một danh sách rõ ràng những gì **nên** và **không nên** làm hôm nay:

```text
CÒN ĐÚNG:
  □ Nén (gzip/brotli)
  □ Cache tốt, đặt tên file có hash nội dung
  □ Ảnh đúng kích thước và định dạng
  □ Giảm tổng lượng byte gửi xuống

ĐÃ LỖI THỜI (với HTTP/2 trở lên):
  ✗ Gộp mọi thứ thành một file khổng lồ
  ✗ Domain sharding
  ✗ Sprite ảnh
  ✗ Nhét ảnh nhỏ vào CSS dưới dạng base64
```

**Một tính năng đã bị loại bỏ, đáng nhớ vì sao:** HTTP/2 Server Push cho phép server chủ động gửi tài nguyên trước khi client hỏi. Nghe hợp lý, nhưng server **không biết** client đã có thứ đó trong cache chưa — nên nó thường gửi thừa. Trình duyệt đã bỏ hỗ trợ; thay thế là `<link rel="preload">`, để client tự quyết định.

**Và một lưu ý vận hành:** HTTP/3 chạy trên UDP cổng 443. Một số tường lửa doanh nghiệp chặn UDP ra ngoài — nên client sẽ tự lùi về HTTP/2. Điều đó bình thường, nhưng nó có nghĩa là **bạn không thể giả định mọi người dùng đều được hưởng HTTP/3**.

## So sánh

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Tầng giao vận | TCP | TCP | **QUIC/UDP** |
| Ghép kênh | ❌ | ✅ | ✅ |
| HOL blocking ở HTTP | có | không | không |
| HOL blocking ở giao vận | có | **vẫn có** | không |
| Round-trip thiết lập | 2–3 | 2–3 | **1** |
| Đổi mạng không đứt | ❌ | ❌ | ✅ |

## Dễ nhầm

**1. Gộp file khổng lồ trên HTTP/2.** Đổi một dòng, tải lại cả gói.

**2. Domain sharding trên HTTP/2.** Phá đúng lợi ích ghép kênh.

**3. Tưởng HTTP/2 xoá hết head-of-line blocking.** Nó chỉ xoá ở tầng HTTP.

**4. Chờ HTTP/3 sửa một hệ thống chậm vì backend.** Nó không liên quan.

**5. Dùng Server Push.** Đã bị loại bỏ; dùng `preload`.

**6. Giả định mọi client đều dùng HTTP/3.** UDP có thể bị chặn.

**7. Bật HTTP/2 mà không có HTTPS.** Trình duyệt chỉ hỗ trợ HTTP/2 trên TLS.

**8. Nhớ mẹo tối ưu mà không nhớ ràng buộc sinh ra nó.** Mẹo hết đúng khi ràng buộc biến mất.

## Mẹo nhớ

> **HTTP/2 xoá head-of-line ở tầng HTTP. HTTP/3 xoá nốt ở tầng giao vận.**
>
> **Gộp file và domain sharding đã thành PHẢN TÁC DỤNG.**
>
> **QUIC định danh bằng connection ID ⇒ đổi Wi-Fi sang 4G không đứt kết nối.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. HTTP/1.1 hạn chế ở đâu, và trình duyệt bù bằng cách nào?
2. HTTP/2 làm ba việc gì?
3. Head-of-line blocking ở hai tầng — HTTP/2 xoá được cái nào?
4. Vì sao HTTP/2 có thể chậm hơn HTTP/1.1 trên mạng mất gói?
5. Ba lợi ích của QUIC, cái nào người dùng di động cảm nhận rõ nhất?

## Tự viết lại

Không nhìn lại:

```text
① Bốn mẹo tối ưu web CÒN đúng và bốn mẹo ĐÃ lỗi thời, kèm lý do
② Cấu hình Nginx bật HTTP/2
③ Lệnh kiểm tra một trang đang phục vụ bằng phiên bản nào
④ Giải thích cho đồng nghiệp vì sao không nên gộp hết JS thành một file
```

Tự kiểm: lời giải thích ở ④ của bạn có nêu được **cái gì đã thay đổi** so với thời mẹo đó đúng không?

## Thử sức

Đội bạn vừa bật HTTP/2. Đo lại: người dùng ở thành phố lớn nhanh hơn 15%, nhưng người dùng ở vùng mạng yếu **chậm hơn** so với trước.

Ba câu để trả lời: giải thích vì sao hai nhóm cho kết quả ngược nhau; bạn xác nhận giả thuyết bằng số liệu nào; và hai hướng xử lý. Câu khó nhất: nếu bật HTTP/3 cho nhóm mạng yếu, điều gì cải thiện và điều gì **vẫn không** cải thiện?
