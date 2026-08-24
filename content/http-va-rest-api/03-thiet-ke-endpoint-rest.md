---
title: Thiết kế endpoint REST
slug: thiet-ke-endpoint-rest
summary: Đặt URL theo danh từ, lồng tài nguyên đúng mức, và xử lý những thao tác không phải CRUD.
level: co-ban
tags: [rest, api-design, url]
---

> **Sau bài này bạn sẽ:** đặt được URL cho một API mới mà không phải tra tài liệu, và biết làm gì với những thao tác không nhét được vào CRUD.

## Đường dẫn là danh từ, hành động là phương thức

Nguyên tắc duy nhất cần nhớ: **URL chỉ tài nguyên, phương thức nói hành động**.

```
❌ POST /api/createUser          ✅ POST   /api/users
❌ GET  /api/getUserById?id=1    ✅ GET    /api/users/u-1
❌ POST /api/deleteUser          ✅ DELETE /api/users/u-1
❌ POST /api/updateUserEmail     ✅ PATCH  /api/users/u-1
```

Động từ trong URL là dấu hiệu API đang mô phỏng lời gọi hàm chứ không phải mô tả tài nguyên. Hệ quả thật: cache không dùng được (mọi thứ thành `POST`), và số endpoint phình theo số hành động thay vì theo số loại dữ liệu.

Danh từ **số nhiều**, nhất quán toàn bộ API:

```
/api/users        /api/users/u-1
/api/orders       /api/orders/o-9
/api/categories   /api/categories/c-2
```

Trộn `/user/1` với `/orders/9` là bắt người dùng API phải đoán ở mỗi endpoint.

## Lồng tài nguyên: một cấp là đủ

```
GET  /api/users/u-1/orders        ← đơn hàng của user u-1
POST /api/users/u-1/orders        ← tạo đơn cho user u-1
```

Đừng lồng sâu hơn khi tài nguyên đã có id riêng:

```
❌ GET /api/users/u-1/orders/o-9/items/i-3/product
✅ GET /api/order-items/i-3        ← nó có id riêng, truy cập trực tiếp
```

Quy tắc: **lồng để lọc, không lồng để định danh**. `o-9` đã đủ để tìm ra đơn hàng, không cần biết nó thuộc user nào mới đọc được — và nếu bạn cần `u-1` để kiểm tra quyền, đó là việc của tầng phân quyền chứ không phải của URL.

## Thao tác không phải CRUD

Không phải mọi việc đều là tạo/đọc/sửa/xoá. "Xuất bản bài viết", "hoàn tiền đơn hàng", "gửi lại email xác nhận" — ba cách xử lý, theo thứ tự ưu tiên:

**1. Biến trạng thái thành thứ sửa được** (tốt nhất):

```http
PATCH /api/posts/p-1
{"status":"published"}
```

**2. Coi hành động là một tài nguyên** — dùng khi bản thân hành động có dữ liệu và lịch sử riêng:

```http
POST /api/orders/o-9/refunds
{"amount":50000,"reason":"Hàng lỗi"}

GET /api/orders/o-9/refunds       ← lịch sử hoàn tiền, tự nhiên có luôn
```

**3. Sub-resource dạng động từ** — chấp nhận được khi hai cách trên đều gượng:

```http
POST /api/emails/e-1/resend
```

Đừng cố nhồi mọi thứ vào CRUD tới mức méo mó. `POST /api/orders/o-9/refunds` rõ ràng hơn `PATCH /api/orders/o-9 {"refundAmount": 50000}` rất nhiều.

## Hình dạng response nên nhất quán

Một tài nguyên trả thẳng object, danh sách trả object có khoá bọc ngoài:

```json
// GET /api/users/u-1
{ "id": "u-1", "name": "Kiệt", "email": "k@example.com" }

// GET /api/users
{ "data": [ {...}, {...} ], "meta": { "total": 128, "page": 1 } }
```

Vì sao danh sách cần khoá bọc: trả mảng trần `[...]` thì sau này muốn thêm thông tin phân trang là **phá vỡ tương thích** — mọi client đang `for` trực tiếp trên response sẽ vỡ. Xem [[phan-trang-loc-va-sap-xep]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Động từ trong URL | Mất cache, endpoint phình vô hạn | Danh từ + phương thức |
| Trộn số ít và số nhiều | Người dùng API phải đoán từng chỗ | Số nhiều, nhất quán |
| Lồng 4-5 cấp | URL dài, khó cache, khó test | Lồng tối đa một cấp |
| Trả mảng trần cho danh sách | Không thêm được phân trang về sau | Bọc trong `{ data, meta }` |
| Mỗi endpoint một hình dạng lỗi khác nhau | Client phải viết parser riêng cho từng chỗ | Một hình dạng lỗi chung |
| Lộ khoá chính tự tăng | Đoán được `/users/1`, `/users/2` — lộ quy mô và mở đường dò dữ liệu | Dùng id không đoán được |

## Ghi nhớ

- URL là danh từ số nhiều; hành động nằm ở phương thức.
- Lồng để lọc (`/users/u-1/orders`), không lồng để định danh.
- Thao tác lạ: ưu tiên đổi trạng thái, rồi tới coi hành động là tài nguyên.
- Danh sách luôn bọc `{ data, meta }` để còn chỗ mở rộng.

## Tự kiểm tra

1. Đặt URL cho "lấy toàn bộ bình luận của bài viết p-9".
2. "Gộp hai tài khoản trùng thành một" — thiết kế thế nào theo cách 2?
3. Vì sao trả mảng trần cho danh sách là một quyết định khó sửa về sau?
