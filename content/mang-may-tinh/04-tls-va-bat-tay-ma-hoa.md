---
title: TLS và bắt tay mã hoá
slug: tls-va-bat-tay-ma-hoa
summary: Cái gì thực sự xảy ra trong 100ms bắt tay, SNI, ALPN, và cách đọc lỗi chứng chỉ.
level: trung-cap
tags: [mang, tls, https, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được đầu ra của `openssl s_client`, và chẩn đoán được lỗi TLS thay vì đoán.

## Ý tưởng chính

TLS giải một bài toán nghe như không thể: **hai bên chưa từng gặp nhau, đang nói chuyện qua một đường ai cũng nghe được, làm sao thống nhất một bí mật chung?**

Lời giải dùng mật mã bất đối xứng cho phần **thoả thuận**, rồi chuyển sang mật mã đối xứng cho phần **truyền dữ liệu** — vì cái đầu an toàn nhưng chậm, cái sau nhanh nhưng cần bí mật chung.

## Mental model

Hãy nghĩ tới **hộp có ổ khoá và chìa**.

> Bạn muốn gửi bí mật cho một người lạ. Bạn không thể gửi chìa khoá qua đường — ai cũng chặn được.
>
> Nên người đó gửi cho bạn một **ổ khoá đang mở** (khoá công khai). Ai lấy cũng được, không sao. Bạn bỏ bí mật vào hộp, **bấm ổ khoá đó lại**, gửi đi. Chỉ người giữ **chìa** (khoá riêng) mở được.
>
> Nhưng còn một câu hỏi: **ổ khoá này có đúng của người bạn muốn không?** Nên trên ổ có **con dấu của một cơ quan chứng thực** mà bạn tin.

Con dấu đó là chứng chỉ. Và chi tiết cuối cùng: sau khi trao đổi xong bí mật, hai bên **bỏ hộp khoá đi** và dùng một mã đơn giản hơn nhiều — vì nó nhanh hơn hàng trăm lần.

## Ví dụ nhỏ

```bash
openssl s_client -connect api.example.com:443 -servername api.example.com
```

## Code chạy thế nào

**Bắt tay TLS 1.3 — một round-trip:**

```text
Client                                    Server
  │─ ClientHello ─────────────────────────▶│
  │   phiên bản, bộ mã hoá hỗ trợ,          │
  │   SNI (tên miền muốn nói chuyện),       │
  │   ALPN (h2? http/1.1?),                 │
  │   key share (đã đoán trước)             │
  │                                          │
  │◀─ ServerHello + chứng chỉ + Finished ───│
  │   chọn bộ mã, key share của server       │
  │                                          │
  │─ Finished ─────────────────────────────▶│
  │        (đã mã hoá từ đây)                │

TLS 1.2 cần HAI round-trip. TLS 1.3 gộp còn MỘT.
⇒ Với round-trip 50ms, đó là tiết kiệm 50ms cho MỌI kết nối mới.
```

**Ba trường trong ClientHello đáng nhớ vì chúng gây sự cố thật:**

```text
SNI — tên miền, gửi ở dạng RÕ, TRƯỚC khi mã hoá
  Vì sao cần: một IP phục vụ nhiều tên miền, server phải biết
  chọn chứng chỉ nào TRƯỚC khi mã hoá.
  ⇒ Quên `-servername` khi test bằng openssl ⇒ nhận chứng chỉ SAI
    và tưởng máy chủ cấu hình hỏng.

ALPN — thoả thuận giao thức tầng trên (h2 / http/1.1)
  ⇒ HTTP/2 được chọn Ở ĐÂY, không phải sau khi kết nối xong.

Bộ mã hoá — danh sách thuật toán client hỗ trợ
  ⇒ Không giao nhau với danh sách của server ⇒ handshake failure.
    Đây là lỗi khi client rất cũ gặp server đã tắt giao thức cũ.
```

## Cú pháp

**Đọc lỗi chứng chỉ — mỗi thông báo một nguyên nhân:**

```text
unable to get local issuer certificate
  ⇒ THIẾU CHỨNG CHỈ TRUNG GIAN ở phía server.
  ⇒ Trình duyệt thường tự tải được nên vẫn vào được;
    curl và app di động thì KHÔNG.
  ⇒ Sửa: dùng fullchain.pem ([[https-va-chung-chi]]).

certificate has expired
  ⇒ Hết hạn. Kiểm tự động gia hạn CÓ reload máy chủ không.

hostname mismatch
  ⇒ Tên trong chứng chỉ không khớp tên đang gọi.
  ⇒ Thường do thiếu tên trong SAN, hoặc gọi bằng IP.

self signed certificate
  ⇒ Chứng chỉ không do CA nào bạn tin ký.
  ⇒ Thường gặp khi có proxy chặn giữa (thiết bị của công ty).

handshake failure
  ⇒ Không thống nhất được phiên bản hoặc bộ mã hoá.
```

**Kiểm tra thực tế:**

```bash
# Chứng chỉ còn hạn tới bao giờ, và có chuỗi đầy đủ không
openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null \
  | openssl x509 -noout -dates -subject -issuer

# Xem chuỗi chứng chỉ (thiếu trung gian sẽ lộ ra ở đây)
openssl s_client -connect example.com:443 -servername example.com -showcerts < /dev/null

# ALPN có thoả thuận được h2 không
openssl s_client -connect example.com:443 -alpn h2 < /dev/null 2>/dev/null | grep ALPN
```

Lệnh đầu là thứ nên đưa vào một job kiểm tra định kỳ: nó trả lời "chứng chỉ còn bao nhiêu ngày" mà không cần chờ trình duyệt báo lỗi.

**Bí mật chuyển tiếp — vì sao nó đáng quan tâm:**

```text
Không có forward secrecy:
  Kẻ tấn công ghi lại toàn bộ traffic mã hoá hôm nay.
  Ba năm sau lấy được khoá riêng của server
  ⇒ giải mã được TOÀN BỘ dữ liệu đã ghi.

Có forward secrecy (ECDHE — mặc định của TLS 1.3):
  Mỗi phiên dùng một khoá tạm, vứt đi sau khi xong.
  Lộ khoá riêng của server ⇒ KHÔNG giải mã được các phiên cũ.
```

TLS 1.3 bắt buộc điều này, nên đây là một lý do nữa để tắt TLS 1.0/1.1.

**mTLS — cả hai bên cùng xuất trình chứng chỉ:**

```text
TLS thường:  client xác minh server.
mTLS:        server cũng xác minh CLIENT bằng chứng chỉ.

Dùng cho: giao tiếp giữa các service nội bộ, thiết bị IoT, API ngân hàng.
Đánh đổi: phải cấp phát, phân phối và XOAY chứng chỉ cho mọi client
— chi phí vận hành thật, đừng chọn nếu chưa cần.
```

## Tại sao cần nó

Vì TLS thêm độ trễ vào **mọi kết nối mới**, và có ba cách giảm:

```text
① TLS 1.3            2 round-trip → 1
② Tái dùng kết nối    request thứ hai: 0 round-trip bắt tay
③ Session resumption  kết nối lại nhanh hơn nhờ vé phiên
④ Kết thúc TLS ở BIÊN (CDN/load balancer)
   ⇒ bắt tay diễn ra gần người dùng ⇒ round-trip ngắn hơn nhiều
   ⇒ bên trong chạy HTTP thuần
```

Cách ④ thường cho cải thiện lớn nhất với người dùng ở xa, vì nó rút ngắn chính cái **khoảng cách vật lý** của các round-trip bắt tay.

**Và cần nhắc lại giới hạn của TLS:** nó bảo vệ **đường truyền**, không bảo vệ ứng dụng. Một API có lỗ hổng phân quyền thì bật HTTPS xong vẫn có lỗ hổng đó — chỉ là kẻ tấn công khai thác qua kênh đã mã hoá ([[tong-quan-owasp-top-10]]).

## So sánh

| | TLS 1.2 | TLS 1.3 |
|---|---|---|
| Round-trip bắt tay | 2 | **1** |
| Bộ mã hoá yếu | còn cho phép | đã loại bỏ |
| Forward secrecy | tuỳ chọn | **bắt buộc** |
| Kết nối lại | session ID/ticket | 0-RTT (có rủi ro lặp lại) |

## Dễ nhầm

**1. Quên `-servername` khi test bằng openssl.** Nhận chứng chỉ sai và chẩn đoán nhầm.

**2. Dùng `cert.pem` thay `fullchain.pem`.** Trình duyệt vào được, app thì không.

**3. Gia hạn chứng chỉ mà không reload máy chủ.**

**4. Không cảnh báo trước hạn.** Sự cố toàn phần, không báo trước.

**5. Còn bật TLS 1.0/1.1.**

**6. Gọi API bằng IP** rồi ngạc nhiên vì hostname mismatch.

**7. Tắt xác minh chứng chỉ cho nhanh** (`rejectUnauthorized: false`) rồi để nguyên khi lên production.

**8. Tưởng HTTPS làm ứng dụng an toàn.**

**9. Dùng mTLS khi chưa cần.** Chi phí vận hành xoay chứng chỉ là thật.

## Mẹo nhớ

> **Bất đối xứng để THOẢ THUẬN bí mật, đối xứng để TRUYỀN dữ liệu.**
>
> **SNI đi ở dạng RÕ — nên test bằng openssl phải có `-servername`.**
>
> **`unable to get local issuer certificate` = thiếu chứng chỉ trung gian.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao TLS dùng cả mật mã bất đối xứng lẫn đối xứng?
2. SNI là gì, vì sao nó phải đi ở dạng rõ, và nó gây nhầm lẫn gì khi test?
3. Bốn thông báo lỗi chứng chỉ và nguyên nhân từng cái?
4. Forward secrecy bảo vệ khỏi kịch bản nào?
5. Bốn cách giảm chi phí bắt tay, cái nào hiệu quả nhất với người dùng ở xa?

## Tự viết lại

Không nhìn lại, viết:

```text
① Lệnh kiểm tra chứng chỉ của một tên miền còn hạn bao lâu
② Lệnh xác minh chuỗi chứng chỉ đầy đủ
③ Một job kiểm tra định kỳ và cảnh báo trước 21 ngày
④ Ba lỗi TLS thường gặp và cách sửa từng cái
```

Tự kiểm: lệnh ① của bạn có `-servername` không, và nếu thiếu thì kết quả sai thế nào?

## Thử sức

Ứng dụng di động báo lỗi SSL khi gọi API. Mở cùng URL đó trên trình duyệt máy tính thì **hoàn toàn bình thường**.

Ba câu để trả lời: nguyên nhân khả dĩ nhất và vì sao hai môi trường khác nhau; bạn xác nhận bằng lệnh nào; và cách sửa. Câu khó nhất: nếu chuỗi chứng chỉ đã đầy đủ mà app vẫn lỗi, hai nguyên nhân nào còn lại — và một trong chúng liên quan tới mạng của chính người dùng?
