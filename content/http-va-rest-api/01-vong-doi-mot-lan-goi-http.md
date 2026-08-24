---
title: Vòng đời một lần gọi HTTP
slug: vong-doi-mot-lan-goi-http
summary: Request gồm những gì, response gồm những gì, và vì sao HTTP không nhớ lần gọi trước.
level: co-ban
tags: [http, request, response, header]
---

> **Sau bài này bạn sẽ:** đọc được một request/response thô, và giải thích được vì sao server không tự biết bạn là ai ở lần gọi thứ hai.

## Một request là một khối văn bản

Bỏ hết thư viện đi, HTTP chỉ là văn bản gửi qua TCP:

```http
POST /api/orders HTTP/1.1
Host: shop.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGci...
Content-Length: 38

{"productId":"p-12","quantity":2}
```

Bốn phần, đúng thứ tự này:

1. **Dòng đầu** — phương thức, đường dẫn, phiên bản
2. **Header** — mỗi dòng một cặp `Tên: giá trị`
3. **Một dòng trống** — ranh giới bắt buộc giữa header và body
4. **Body** — tuỳ chọn; `GET` thường không có

Response cùng hình dạng, chỉ khác dòng đầu:

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/orders/o-891

{"id":"o-891","status":"pending"}
```

## HTTP không nhớ gì cả

Đây là tính chất quan trọng nhất và cũng bị quên nhiều nhất: **mỗi request là một tờ giấy trắng**. Server xử lý xong là quên sạch. Request thứ hai đến, server không có cách nào tự biết nó cùng người với request thứ nhất.

Nên mọi thứ cần "nhớ" phải **đi kèm trong từng request**:

```http
GET /api/me HTTP/1.1
Cookie: session=abc123          ← danh tính gửi lại mỗi lần
Authorization: Bearer eyJ...    ← hoặc bằng token
```

Hệ quả thực tế: không có "biến toàn cục của người dùng" ở server. Cái bạn tưởng là "đang đăng nhập" thực chất là *cookie được gửi lại ở mỗi request và server tra lại vào store mỗi lần*. Xem [[phien-dang-nhap-va-cookie]].

## Header đáng nhớ

| Header | Chiều | Việc |
|---|---|---|
| `Content-Type` | cả hai | Body đang ở định dạng gì (`application/json`) |
| `Accept` | request | Client muốn nhận định dạng gì |
| `Authorization` | request | Danh tính (`Bearer <token>`) |
| `Cache-Control` | cả hai | Được cache bao lâu, ở đâu |
| `Location` | response | URL của tài nguyên vừa tạo, hoặc đích chuyển hướng |
| `ETag` | response | "Dấu vân tay" của phiên bản nội dung |

## Xem tận mắt

`curl -v` in ra cả hai chiều, `>` là gửi đi và `<` là nhận về:

```bash
curl -v https://api.github.com/users/torvalds

# Chỉ xem header response
curl -sI https://example.com

# Gửi JSON và xem mã trạng thái
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST https://httpbin.org/post \
  -H 'Content-Type: application/json' \
  -d '{"a":1}'
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Gửi JSON mà không đặt `Content-Type` | Server đọc body thành chuỗi rỗng | Đặt `Content-Type: application/json` |
| Tưởng server "nhớ" mình từ request trước | Code chạy đúng ở máy mình, sai khi có nhiều instance | Gửi danh tính ở mọi request |
| Nhét dữ liệu nhạy cảm vào query string | Lộ trong log server, lịch sử trình duyệt, header `Referer` | Đưa vào body hoặc header |
| Đặt `Content-Length` sai bằng tay | Body bị cắt hoặc kết nối treo | Để thư viện tự tính |
| Dùng `GET` có body | Nhiều proxy âm thầm bỏ body đi | Đổi sang `POST` |

## Ghi nhớ

- Request = dòng đầu + header + dòng trống + body. Response cùng hình dạng.
- HTTP không có bộ nhớ giữa các request — danh tính phải gửi lại mỗi lần.
- `Content-Type` mô tả body; thiếu nó là nguyên nhân số một của "server nhận rỗng".
- `curl -v` là cách nhanh nhất để biết mình thật sự đã gửi cái gì.

## Tự kiểm tra

1. Vì sao HTTP cần một dòng trống giữa header và body?
2. Server có ba instance sau load balancer. Vì sao lưu trạng thái đăng nhập trong biến của tiến trình là sai?
3. Bạn `POST` JSON nhưng server báo body rỗng. Kiểm tra header nào trước tiên?
