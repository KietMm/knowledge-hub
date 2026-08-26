---
title: Thư viện lỗi thời, logging và SSRF
slug: thu-vien-log-va-ssrf
summary: Ba nhóm rủi ro còn lại — phụ thuộc có CVE, không nhìn thấy tấn công, và server bị lừa gọi nội bộ.
level: nang-cao
tags: [owasp, dependency, logging, ssrf]
khung: v2
---

> **Sau bài này bạn sẽ:** biết vì sao "không có log" cũng là lỗ hổng, và hiểu SSRF — kiểu tấn công dùng chính máy chủ của bạn làm công cụ.

## Ý tưởng chính

Ba nhóm rủi ro trong bài này ít được nói tới hơn XSS hay SQL injection, nhưng chúng gây ra những sự cố lớn nhất:

```text
A06  Thư viện có lỗ hổng   → bạn không viết code sai, nhưng bạn dùng code sai
A09  Thiếu log và giám sát  → bị tấn công mà không biết, trong nhiều tháng
A10  SSRF                   → máy chủ của bạn bị lừa gọi vào mạng nội bộ
```

## Mental model

Ba hình ảnh, mỗi cái một câu:

> **A06** — bạn xây nhà rất chắc, nhưng dùng **ổ khoá của một hãng vừa bị công bố lỗi**. Nhà bạn không sai; ổ khoá sai.
>
> **A09** — nhà bạn **không có camera**. Trộm đã vào, đã đi, và bạn chỉ biết khi phát hiện mất đồ ba tháng sau.
>
> **A10** — kẻ tấn công **nhờ bạn đi lấy hộ một món đồ**. Bạn có chìa khoá vào kho nội bộ; hắn thì không. Hắn không cần đột nhập — hắn chỉ cần bạn đi hộ.

Hình ảnh thứ ba là chìa khoá để hiểu SSRF: **máy chủ của bạn ở trong mạng nội bộ, còn kẻ tấn công thì không.**

## Ví dụ nhỏ

```ts
// Tính năng vô hại: cho người dùng nhập URL ảnh để tải về
const res = await fetch(req.body.url)
```

```text
Người dùng gửi:  http://169.254.169.254/latest/meta-data/iam/credentials
⇒ Đây là địa chỉ metadata của AWS — chỉ truy cập được TỪ BÊN TRONG
⇒ Máy chủ của bạn gọi hộ, và trả về khoá IAM cho kẻ tấn công
```

## Code chạy thế nào

**SSRF — vì sao khó chặn:**

```text
Chặn bằng danh sách đen KHÔNG hiệu quả — có quá nhiều cách viết:

  http://169.254.169.254        địa chỉ metadata
  http://[::ffff:169.254.169.254]  IPv6 mapped
  http://2852039166             dạng số nguyên
  http://0251.0376.0251.0376    dạng bát phân
  http://metadata.google.internal  tên miền nội bộ
  http://ke-tan-cong.com        → DNS trả về 127.0.0.1  ← DNS rebinding
```

Dòng cuối đáng chú ý: kẻ tấn công điều khiển DNS của tên miền mình, nên hắn cho nó trả về IP công khai lúc bạn **kiểm tra**, rồi trả về IP nội bộ lúc bạn **thật sự gọi**.

**Cách chặn đúng — danh sách trắng:**

```ts
const HOST_CHO_PHEP = new Set(['images.example.com', 'cdn.example.com'])

function kiemTraUrl(raw: string) {
  const u = new URL(raw)
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Giao thức không hợp lệ')
  if (!HOST_CHO_PHEP.has(u.hostname)) throw new Error('Host không được phép')
  return u
}
```

Và bốn lớp bổ sung, vì danh sách trắng không phải lúc nào cũng khả thi:

```text
① Phân giải DNS TRƯỚC, kiểm IP, rồi gọi bằng chính IP đó  ← chống DNS rebinding
② Chặn mọi dải IP nội bộ: 127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, ::1
③ KHÔNG đi theo redirect tự động — hoặc kiểm lại URL sau mỗi lần redirect
④ Chạy tính năng gọi ra ngoài trong mạng RIÊNG, không có đường vào nội bộ
```

Lớp ④ là biện pháp mạnh nhất: nếu tiến trình đó **không có đường mạng** tới dịch vụ nội bộ, thì SSRF không lấy được gì.

## Cú pháp

**A06 — thư viện có lỗ hổng:**

```bash
pnpm audit                          # xem lỗ hổng đã biết
pnpm audit --fix
pnpm outdated
```

```yaml
# CI — chặn merge nếu có lỗ hổng nghiêm trọng
- run: pnpm audit --audit-level=high
```

Ba nguyên tắc thực dụng:

```text
① Nâng cấp ĐỀU ĐẶN, đừng dồn
   Nâng mỗi tuần một chút thì dễ; dồn hai năm rồi nâng một lần thì rất đau.

② Ít phụ thuộc hơn = ít rủi ro hơn
   Trước khi cài thư viện: việc này tự viết mất bao lâu?
   Một hàm 20 dòng thường tốt hơn một package kéo theo 40 package khác.

③ Ghim phiên bản bằng lock file
   Không có nó, mỗi lần cài lại có thể ra phiên bản khác — kể cả phiên bản đã bị chiếm.
```

Nguyên tắc ③ liên quan tới **tấn công chuỗi cung ứng**: kẻ tấn công chiếm được tài khoản npm của một thư viện phổ biến và phát hành bản độc hại. Lock file làm bạn không tự động nhận bản mới đó.

## Tại sao cần nó

Vì **A09 — thiếu log — là lý do các vụ xâm nhập kéo dài hàng tháng**:

```text
Thống kê ngành: thời gian trung bình từ lúc bị xâm nhập tới lúc PHÁT HIỆN
tính bằng HÀNG TRĂM NGÀY.

Không phải vì kẻ tấn công giỏi — mà vì không ai nhìn.
```

**Phải ghi log:**

```text
· Đăng nhập: thành công và THẤT BẠI (kèm IP, user agent)
· Đổi mật khẩu, đổi email, đổi quyền
· Truy cập bị từ chối (403) — dấu hiệu đang dò
· Thao tác quản trị
· Thanh toán, hoàn tiền
· Lỗi 5xx
```

**KHÔNG được ghi:**

```text
· Mật khẩu (kể cả sai)
· Token, khoá API
· Số thẻ đầy đủ
· Dữ liệu cá nhân nhạy cảm không cần thiết
```

**Log phải có cấu trúc** — để máy tìm được, không chỉ người đọc được:

```ts
logger.warn({
  su_kien: 'dang_nhap_that_bai',
  email_hash: bam(email),        // hash, không phải email gốc
  ip: req.ip,
  request_id: req.id,
  luc: new Date().toISOString(),
})
```

`request_id` là trường quý nhất: nó nối một sự kiện với toàn bộ hành trình của request đó qua mọi dịch vụ ([[quan-sat-he-thong]]).

**Cảnh báo — log không có cảnh báo thì chỉ là dữ liệu:**

```text
· >10 lần đăng nhập thất bại từ một IP trong 1 phút
· Đăng nhập thành công từ quốc gia lạ
· Tỉ lệ lỗi 403 tăng đột biến
· Tài khoản admin mới được tạo
· Truy vấn cơ sở dữ liệu bất thường về khối lượng
```

## So sánh

| Rủi ro | Bạn kiểm soát được gì | Công cụ |
|---|---|---|
| A06 Thư viện | Chọn ít phụ thuộc, nâng cấp đều | `audit`, Dependabot, lock file |
| A09 Log | Ghi gì, cảnh báo gì | Log có cấu trúc, giám sát |
| A10 SSRF | Danh sách trắng, cô lập mạng | Kiểm URL, mạng riêng |

Điểm chung của cả ba: chúng **không phải lỗi trong code bạn viết**. Đó là lý do chúng hay bị bỏ qua — người ta review code, thấy code sạch, và kết luận là an toàn.

## Dễ nhầm

**1. Không bao giờ chạy `audit`.** Lỗ hổng đã công bố công khai, và bot quét biết bạn dùng phiên bản nào.

**2. Cài thư viện cho việc nhỏ.** Mỗi phụ thuộc là một cửa vào mới — cả về bảo mật lẫn bảo trì.

**3. Nâng cấp dồn.** Hai năm không nâng thì lần nâng đầu tiên là một dự án riêng.

**4. Không ghi log đăng nhập thất bại.** Bạn không thấy được cuộc dò mật khẩu đang diễn ra.

**5. Ghi mật khẩu vào log.** Kể cả mật khẩu sai — vì người dùng hay gõ nhầm mật khẩu **của tài khoản khác**.

**6. Log không có cấu trúc.** Chuỗi văn bản tự do thì không tìm kiếm và không cảnh báo tự động được.

**7. Có log nhưng không ai xem.** Log không có cảnh báo chỉ là dữ liệu.

**8. Chặn SSRF bằng danh sách đen.** Có quá nhiều cách viết cùng một địa chỉ.

**9. Đi theo redirect tự động khi gọi URL người dùng cung cấp.** URL đầu tiên hợp lệ, redirect đưa tới `169.254.169.254`.

## Mẹo nhớ

> **Ổ khoá của hãng vừa bị lỗi · nhà không có camera · nhờ bạn đi lấy hộ.**
>
> **SSRF: máy chủ của bạn Ở TRONG mạng nội bộ, kẻ tấn công thì không.**
>
> **Log không có cảnh báo chỉ là dữ liệu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao SSRF nguy hiểm — điều gì máy chủ của bạn làm được mà kẻ tấn công không?
2. Vì sao chặn SSRF bằng danh sách đen không hiệu quả?
3. DNS rebinding hoạt động thế nào?
4. Bốn loại sự kiện **phải** ghi log, và ba thứ **không được** ghi?
5. Vì sao lock file liên quan tới tấn công chuỗi cung ứng?

## Tự viết lại

Không nhìn lại phần trên, viết hàm an toàn cho tính năng:

```text
"Người dùng dán URL một bài viết, hệ thống tải về và trích xuất tiêu đề + ảnh đại diện."
```

Tự kiểm: bạn kiểm URL ở **mấy** bước, và bạn xử lý redirect thế nào? Nếu không dùng được danh sách trắng (vì URL có thể là bất kỳ trang nào), bạn dựa vào lớp phòng thủ nào?

## Thử sức

Bạn phát hiện log có 40.000 request `403` từ 200 IP khác nhau trong 10 phút, tất cả đều nhắm vào các đường dẫn kiểu `/api/admin/*`.

Ba câu để trả lời: chuyện gì đang xảy ra, bạn **phản ứng** thế nào trong 15 phút đầu, và — câu quan trọng nhất — làm sao biết được liệu có request nào đã **thành công** trước khi bạn phát hiện? Nếu log hiện tại không trả lời được câu đó, bạn thiếu gì?
