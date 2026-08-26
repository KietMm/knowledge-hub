---
title: Phương thức và mã trạng thái
slug: phuong-thuc-va-ma-trang-thai
summary: GET/POST/PUT/PATCH/DELETE khác nhau ở chỗ nào, và chọn mã trạng thái cho đúng.
level: co-ban
tags: [http, rest, status-code, method]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn phương thức và mã trạng thái bằng hai câu hỏi, thay vì theo thói quen.

## Ý tưởng chính

Phương thức HTTP không phải nhãn dán tuỳ thích. Mỗi cái mang **hai lời hứa** với client, proxy, và trình duyệt:

```text
An toàn (safe)      →  Gọi nó KHÔNG làm thay đổi gì
Idempotent          →  Gọi 1 lần hay 10 lần cho cùng kết quả
```

Chọn sai phương thức nghĩa là **hứa sai** — và hạ tầng sẽ hành xử theo lời hứa đó, không theo ý bạn.

## Mental model

Hãy nghĩ tới **các loại thao tác ở quầy ngân hàng**.

> **GET là xem sao kê.** Xem mười lần cũng không đổi gì — an toàn, và nhân viên có thể đưa bản in sẵn (cache).
>
> **PUT là ghi số dư thành 5 triệu.** Làm mười lần vẫn ra 5 triệu — idempotent.
>
> **POST là nộp 1 triệu vào tài khoản.** Làm mười lần thì **nộp mười lần** — không idempotent, và đây là lý do trình duyệt cảnh báo khi bạn F5 sau khi gửi form.
>
> **DELETE là đóng tài khoản.** Lần đầu đóng, những lần sau "đã đóng rồi" — kết quả cuối vẫn như nhau, nên vẫn idempotent.

## Ví dụ nhỏ

```http
GET    /don-hang/123      → xem
POST   /don-hang          → tạo mới
PUT    /don-hang/123      → thay THẾ toàn bộ
PATCH  /don-hang/123      → sửa MỘT PHẦN
DELETE /don-hang/123      → xoá
```

## Code chạy thế nào

Vì sao hai tính chất kia quan trọng — chúng quyết định hành vi của **hạ tầng**, không chỉ của code bạn:

```text
GET an toàn ⇒
  · trình duyệt cache được
  · proxy/CDN cache được
  · trình duyệt tự tải trước (prefetch) khi rê chuột vào link
  · bot quét web gọi thoải mái

⇒ Đặt hành động XOÁ sau một GET là thảm hoạ:
     GET /xoa-don?id=123
  Bot Google quét trang, đi theo mọi link, và xoá sạch dữ liệu của bạn.
  Chuyện này ĐÃ XẢY RA với nhiều hệ thống thật.
```

```text
PUT/DELETE idempotent ⇒
  · client/proxy được phép TỰ THỬ LẠI khi mạng lỗi
POST không idempotent ⇒
  · không ai dám tự thử lại
  · muốn thử lại an toàn thì phải có idempotency key — [[idempotency-va-thu-lai]]
```

## Cú pháp

| Phương thức | An toàn | Idempotent | Có body |
|---|---|---|---|
| GET | ✅ | ✅ | ❌ |
| HEAD | ✅ | ✅ | ❌ |
| POST | ❌ | ❌ | ✅ |
| PUT | ❌ | ✅ | ✅ |
| PATCH | ❌ | ❌* | ✅ |
| DELETE | ❌ | ✅ | Hiếm |

\* `PATCH` idempotent hay không **tuỳ nội dung**: `{"tuoi": 30}` thì có; `{"tang_diem": 5}` thì không.

**PUT hay PATCH** — khác biệt hay bị nhầm:

```http
PUT /nguoi-dung/1        {"ten": "An", "email": "a@x.com", "tuoi": 30}
   → THAY THẾ toàn bộ. Thiếu trường nào thì trường đó bị XOÁ.

PATCH /nguoi-dung/1      {"tuoi": 31}
   → chỉ sửa `tuoi`, phần còn lại giữ nguyên.
```

Trong thực tế **PATCH được dùng nhiều hơn**, vì client hiếm khi có đủ toàn bộ bản ghi để gửi lên.

## Tại sao cần nó

Vì mã trạng thái là thứ **máy** đọc để quyết định làm gì tiếp — thử lại, cache, đăng nhập lại, hay báo lỗi.

```text
2xx  Thành công
  200 OK              — GET/PUT/PATCH thành công
  201 Created         — đã tạo mới (kèm header Location)
  204 No Content      — thành công, không có gì trả về (DELETE)

3xx  Chuyển hướng
  301 Moved Permanently — đổi vĩnh viễn, trình duyệt ghi nhớ
  304 Not Modified      — dữ liệu chưa đổi, dùng bản cache của bạn

4xx  LỖI CỦA CLIENT — gửi lại y hệt cũng vẫn lỗi
  400 Bad Request     — dữ liệu sai định dạng
  401 Unauthorized    — CHƯA đăng nhập (tên gọi sai lịch sử)
  403 Forbidden       — ĐÃ đăng nhập nhưng không có quyền
  404 Not Found       — không tồn tại
  409 Conflict        — xung đột trạng thái (email đã tồn tại)
  422 Unprocessable   — đúng định dạng nhưng sai nghiệp vụ
  429 Too Many Requests — vượt giới hạn tần suất

5xx  LỖI CỦA SERVER — client thử lại có thể được
  500 Internal Server Error
  502 Bad Gateway     — server phía sau trả lời sai
  503 Service Unavailable — quá tải/bảo trì, kèm Retry-After
  504 Gateway Timeout — server phía sau không trả lời kịp
```

Ranh giới **4xx và 5xx** là thứ quan trọng nhất phải hiểu: nó trả lời câu *"lỗi này tại ai, và thử lại có ích không?"* Trả sai nhóm thì client thử lại vô vọng, hoặc bỏ cuộc khi lẽ ra nên thử lại.

Phân biệt 401 và 403 (tên gọi gây nhầm từ đầu):

```text
401 → "Anh là ai? Tôi không biết anh."      → đăng nhập đi
403 → "Tôi biết anh, nhưng anh không được." → đăng nhập lại cũng vô ích
```

Chi tiết ở [[xac-thuc-va-phan-quyen-khac-nhau]].

## So sánh

**Đừng trả 200 rồi nhét lỗi vào body:**

```json
// ❌ Trả 200 OK
{ "success": false, "error": "Không tìm thấy đơn hàng" }
```

Hậu quả rất cụ thể:

```text
· Client phải parse body mới biết thành công hay không
· Thư viện HTTP tưởng thành công, không kích hoạt cơ chế thử lại
· Giám sát báo "0% lỗi" trong khi hệ thống đang hỏng
· CDN cache một phản hồi lỗi như thể nó hợp lệ
```

```http
404 Not Found
{ "error": { "code": "DON_HANG_KHONG_TON_TAI", "message": "Không tìm thấy đơn hàng" } }
```

Mã trạng thái cho **máy**, body cho **người và cho việc xử lý chi tiết**.

## Dễ nhầm

**1. Dùng GET cho hành động thay đổi dữ liệu.** Bot và trình duyệt sẽ gọi nó mà không hỏi bạn.

**2. Dùng POST cho mọi thứ.** Bạn mất khả năng cache, mất khả năng thử lại an toàn, và client không đoán được hành vi.

**3. Trả 200 cho lỗi.** Xem ở trên.

**4. Trả 500 cho lỗi validate.** Đó là 400 hoặc 422. Trả 500 làm hệ thống giám sát báo động nhầm, và client thử lại vô ích.

**5. Nhầm 401 với 403.**

**6. Trả 404 cho tài nguyên tồn tại nhưng không có quyền.** Đôi khi đây là **cố ý** (không tiết lộ sự tồn tại), nhưng phải là quyết định có ý thức chứ không phải nhầm lẫn.

**7. Quên `Retry-After` khi trả 429 hoặc 503.** Client không biết chờ bao lâu và sẽ thử lại ngay lập tức, làm mọi thứ tệ hơn.

## Mẹo nhớ

> **An toàn = không đổi gì. Idempotent = làm nhiều lần vẫn thế.**
>
> **4xx tại client, 5xx tại server — đó là câu hỏi "thử lại có ích không".**
>
> **Mã trạng thái cho máy, body cho người.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. "An toàn" và "idempotent" nghĩa là gì, và mỗi cái cho phép hạ tầng làm gì?
2. Vì sao `GET /xoa?id=1` là thiết kế nguy hiểm?
3. PUT và PATCH khác nhau thế nào — điều gì xảy ra với trường bạn không gửi?
4. 401 và 403 khác nhau ra sao?
5. Ba hậu quả của việc trả 200 kèm `{"success": false}`?

## Tự viết lại

Không nhìn lại phần trên, chọn phương thức và mã trạng thái cho từng tình huống:

```text
a) Lấy danh sách đơn hàng
b) Tạo đơn mới → trả về gì, mã nào, header nào?
c) Đổi trạng thái đơn thành "đã huỷ"
d) Xoá đơn không tồn tại
e) Người dùng gửi email đã có người dùng
f) Người dùng gọi API quá 100 lần/phút
```

Tự kiểm: câu (d) — trả 404 hay 204? Cả hai đều có lý; nêu lý do cho lựa chọn của bạn.

## Thử sức

Client báo: *"API của các anh cứ tạo đơn trùng"*. Bạn kiểm tra log: client gọi `POST /don-hang` ba lần trong 2 giây, cả ba đều thành công.

Giải thích **vì sao client làm vậy** (họ không cố ý), và nêu hai cách sửa — một ở phía client, một ở phía server. Cách nào đáng tin hơn, và vì sao?
