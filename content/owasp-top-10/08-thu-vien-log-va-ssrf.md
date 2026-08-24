---
title: Thư viện lỗi thời, logging và SSRF
slug: thu-vien-log-va-ssrf
summary: Ba nhóm rủi ro còn lại — phụ thuộc có CVE, không nhìn thấy tấn công, và server bị lừa gọi nội bộ.
level: nang-cao
tags: [owasp, dependency, logging, ssrf]
---

> **Sau bài này bạn sẽ:** dựng được quy trình cập nhật thư viện, biết ghi log gì và không ghi gì, và chặn được SSRF.

## A06 — Thư viện có lỗ hổng

Phần lớn code trong ứng dụng của bạn không do bạn viết. Một dự án Node điển hình có hàng trăm package phụ thuộc gián tiếp.

```bash
pnpm audit                     # lỗ hổng đã biết
pnpm outdated                  # phiên bản đã cũ
pnpm why ten-package           # vì sao package này có mặt
```

Quy trình tối thiểu nên có:

1. **Renovate hoặc Dependabot** tự mở PR nâng cấp. Gộp bản vá bảo mật tự động khi CI xanh.
2. **Lockfile được commit** và CI cài bằng `--frozen-lockfile`.
3. **CI chặn** khi có lỗ hổng mức cao.
4. Rà soát định kỳ và **gỡ package không còn dùng** — cách giảm rủi ro rẻ nhất.

Cẩn thận với chuỗi cung ứng: package bị chiếm quyền, tên gõ nhầm (`react-dom` vs `react-dorn`), và script `postinstall` chạy tuỳ ý lúc cài. Với môi trường nhạy cảm, cài bằng `--ignore-scripts`.

## A09 — Logging và giám sát

Nhiều vụ xâm nhập tồn tại hàng tháng vì không ai nhìn thấy. Log không phải để debug — nó là **hệ thống phát hiện**.

### Nên ghi

```ts
ghiLog.info({
  suKien: 'dang_nhap_that_bai',
  email: chePhanGiua(email),        // che bớt, không ghi nguyên
  ip: req.headers.get('x-forwarded-for'),
  requestId,
  thoiDiem: new Date().toISOString(),
})
```

Các sự kiện đáng ghi: đăng nhập thành công/thất bại, đổi mật khẩu, đổi quyền, truy cập bị từ chối, thao tác quản trị, thanh toán, xoá dữ liệu.

### Không bao giờ ghi

Mật khẩu (kể cả sai), token phiên, số thẻ, header `Authorization`, dữ liệu cá nhân đầy đủ, nội dung request body của form nhạy cảm.

```ts
// Bẫy rất phổ biến
console.log('request', { headers: req.headers })   // in luôn Authorization và Cookie
```

Nhiều thư viện log cho phép khai báo danh sách trường cần che — cấu hình nó ngay từ đầu.

### Log có cấu trúc và request id

JSON thay vì chuỗi tự do: query được, gắn cảnh báo được. Mỗi request gắn một `requestId` truyền qua mọi tầng — nếu không, log của 50 request đồng thời trộn vào nhau và không lần được.

### Cảnh báo

Log mà không ai đọc thì vô dụng. Đặt cảnh báo cho: tỷ lệ đăng nhập thất bại tăng đột biến, lỗi 5xx vượt ngưỡng, thao tác quản trị ngoài giờ, truy cập bị từ chối lặp lại từ một IP.

## A10 — SSRF

Server-Side Request Forgery: ứng dụng nhận URL từ người dùng rồi tự gọi tới đó.

```ts
// LỖ HỔNG
export async function POST(req: Request) {
  const { url } = await req.json()
  const res = await fetch(url)       // người dùng chỉ đâu, server gọi đó
  return Response.json(await res.json())
}
```

Người tấn công nhắm tới những nơi chỉ máy chủ với tới được:

```
http://localhost:6379              → Redis nội bộ
http://169.254.169.254/latest/meta-data/   → thông tin xác thực của cloud
file:///etc/passwd                 → file hệ thống
http://10.0.0.5/admin              → dịch vụ trong mạng riêng
```

Địa chỉ `169.254.169.254` đặc biệt nguy hiểm: trên AWS/GCP nó trả về thông tin xác thực tạm thời của máy chủ.

### Cách phòng

```ts
import { lookup } from 'node:dns/promises'
import ipaddr from 'ipaddr.js'

async function urlAnToan(raw: string): Promise<boolean> {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol)) return false

  // Phân giải DNS rồi kiểm tra IP thật — tên miền có thể trỏ vào 127.0.0.1
  const { address } = await lookup(url.hostname)
  const ip = ipaddr.parse(address)
  return ip.range() === 'unicast'    // loại private, loopback, linkLocal
}
```

Bốn lớp phòng thủ:

1. **Danh sách trắng tên miền** khi có thể — luôn tốt hơn danh sách đen.
2. **Kiểm tra IP sau khi phân giải DNS**, không chỉ kiểm tra chuỗi hostname.
3. **Chặn chuyển hướng** (`redirect: 'manual'`) — nếu không, trang đích có thể redirect 302 về `127.0.0.1`.
4. **Cô lập mạng**: dịch vụ gọi URL bên ngoài nên chạy trong subnet không tới được dịch vụ nội bộ.

Lưu ý về TOCTOU: giữa lúc kiểm tra DNS và lúc `fetch` thật, bản ghi DNS có thể đổi (DNS rebinding). Phòng thủ chắc chắn nhất vẫn là cô lập ở tầng mạng.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không cập nhật dependency | CVE đã công khai tồn tại lâu | Renovate + CI chặn |
| Log nguyên `req.headers` | Token vào file log | Danh sách che trường |
| Log không có request id | Không lần được luồng | Gắn id xuyên suốt |
| `fetch(urlNguoiDung)` | SSRF vào dịch vụ nội bộ | Danh sách trắng + kiểm tra IP |
| Chỉ kiểm tra chuỗi hostname | DNS trỏ về 127.0.0.1 | Kiểm tra IP sau khi phân giải |

## Ghi nhớ

- Phụ thuộc là một phần bề mặt tấn công — tự động hoá việc cập nhật.
- Log để phát hiện tấn công, không chỉ để debug; và đừng ghi secret.
- SSRF cần kiểm tra **IP sau phân giải DNS**, không phải chuỗi URL.
- Cô lập mạng là lớp phòng thủ đáng tin cậy nhất cho SSRF.

## Tự kiểm tra

1. Vì sao danh sách trắng tên miền tốt hơn danh sách đen khi chống SSRF?
2. Ba loại sự kiện phải ghi log và ba loại dữ liệu không bao giờ được ghi?
3. Tính năng "nhập ảnh từ URL" cần những kiểm soát nào?
