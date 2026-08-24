---
title: Phương thức và mã trạng thái
slug: phuong-thuc-va-ma-trang-thai
summary: GET/POST/PUT/PATCH/DELETE khác nhau ở chỗ nào, và chọn mã trạng thái cho đúng.
level: co-ban
tags: [http, rest, status-code, method]
---

> **Sau bài này bạn sẽ:** chọn đúng phương thức cho mỗi thao tác, và không còn trả `200 OK` cho mọi thứ kể cả khi lỗi.

## Phương thức: hai tính chất quyết định tất cả

| Phương thức | An toàn? | Idempotent? | Việc |
|---|---|---|---|
| `GET` | ✅ | ✅ | Đọc, không đổi gì |
| `HEAD` | ✅ | ✅ | Như `GET` nhưng chỉ lấy header |
| `POST` | ❌ | ❌ | Tạo mới, hoặc thao tác không xếp vào đâu được |
| `PUT` | ❌ | ✅ | Thay **toàn bộ** tài nguyên |
| `PATCH` | ❌ | ❌ | Sửa **một phần** tài nguyên |
| `DELETE` | ❌ | ✅ | Xoá |

- **An toàn** = không làm thay đổi dữ liệu. Trình duyệt và crawler tự do gọi lại.
- **Idempotent** = gọi 10 lần cho kết quả giống gọi 1 lần. Đây là tính chất khiến việc thử lại khi mạng lỗi trở nên an toàn — xem [[idempotency-va-thu-lai]].

`PUT` idempotent vì nó *ghi đè* bằng giá trị bạn gửi:

```http
PUT /api/users/u-1
{"name":"Kiệt","email":"k@example.com"}
```

Gọi ba lần thì user vẫn đúng như vậy. Còn `POST /api/orders` ba lần thì có **ba** đơn hàng.

## PUT hay PATCH

Sai phổ biến: dùng `PUT` để sửa một trường.

```http
PUT /api/users/u-1
{"email":"moi@example.com"}
```

Đúng nghĩa `PUT`, cái này nói *"user u-1 giờ chỉ có email, không có tên"* — nhiều API sẽ xoá trắng `name`. Sửa một phần thì dùng `PATCH`:

```http
PATCH /api/users/u-1
{"email":"moi@example.com"}
```

## Mã trạng thái: nhóm chữ số đầu là ý chính

| Nhóm | Nghĩa | Ai sai |
|---|---|---|
| `2xx` | Thành công | — |
| `3xx` | Chuyển hướng | — |
| `4xx` | Request có vấn đề | **Client** |
| `5xx` | Server hỏng | **Server** |

Ranh giới `4xx`/`5xx` không phải chuyện thẩm mỹ: hệ thống giám sát báo động dựa trên tỉ lệ `5xx`. Trả `500` cho lỗi nhập liệu sai là tự tạo báo động giả lúc 3 giờ sáng.

Những mã dùng thật sự:

```
200 OK                  Đọc thành công, hoặc sửa xong và có trả về nội dung
201 Created             Vừa tạo. Kèm header Location trỏ tới tài nguyên mới
204 No Content          Xong, cố tình không có body (DELETE thường dùng)
400 Bad Request         Cú pháp/kiểu dữ liệu sai
401 Unauthorized        CHƯA đăng nhập (tên gọi sai lịch sử — nó là "unauthenticated")
403 Forbidden           ĐÃ đăng nhập nhưng không có quyền
404 Not Found           Không có tài nguyên này
409 Conflict            Xung đột trạng thái (email đã tồn tại)
422 Unprocessable       Cú pháp đúng nhưng nghiệp vụ sai (ngày sinh ở tương lai)
429 Too Many Requests   Quá tần suất. Kèm Retry-After
500 Internal Error      Bug của server
503 Service Unavailable Quá tải hoặc đang bảo trì. Kèm Retry-After
```

**401 và 403** là cặp bị lẫn nhiều nhất. `401` = "bạn là ai?", `403` = "biết bạn là ai rồi, nhưng không được". Xem [[xac-thuc-va-phan-quyen-khac-nhau]].

## Đừng trả 200 rồi nhét lỗi vào body

```json
// ❌ Mã 200, lỗi giấu trong body
{ "success": false, "error": "Email đã tồn tại" }
```

Client phải parse body mới biết có lỗi, mọi lớp trung gian (proxy, cache, retry, monitoring) đều tưởng thành công. Dùng đúng mã:

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":{"code":"EMAIL_TAKEN","message":"Email đã được dùng"}}
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `200` cho mọi response kể cả lỗi | Retry/cache/monitoring hiểu sai hoàn toàn | Dùng mã đúng nhóm |
| `500` cho lỗi validate | Báo động giả, che mất lỗi server thật | `400` hoặc `422` |
| `403` khi người dùng chưa đăng nhập | Client không biết là cần hiện form đăng nhập | `401` |
| `POST` để đọc dữ liệu | Mất cache, mất khả năng bookmark | `GET` với query string |
| `PUT` để sửa một trường | Xoá trắng các trường không gửi | `PATCH` |
| `201` mà không có `Location` | Client không biết tài nguyên mới ở đâu | Thêm header `Location` |

## Ghi nhớ

- An toàn = không đổi dữ liệu. Idempotent = gọi lại không hại gì.
- `PUT` thay toàn bộ, `PATCH` sửa một phần.
- `4xx` là client sai, `5xx` là mình sai — giám sát dựa vào ranh giới này.
- `401` chưa đăng nhập, `403` không có quyền.

## Tự kiểm tra

1. Vì sao `DELETE` được coi là idempotent dù lần thứ hai trả `404`?
2. API trả `200 {"success": false}`. Kể ba thứ bị hỏng vì cách này.
3. Người dùng gửi ngày sinh là năm 2090. Trả mã nào, và vì sao không phải `500`?
