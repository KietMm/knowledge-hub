---
title: Vòng đời một lần gọi HTTP
slug: vong-doi-mot-lan-goi-http
summary: Request gồm những gì, response gồm những gì, và vì sao HTTP không nhớ lần gọi trước.
level: co-ban
tags: [http, request, response, header]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được một request thô và biết mỗi phần làm gì, và giải thích được vì sao máy chủ "không nhớ" bạn là ai.

## Ý tưởng chính

HTTP đơn giản hơn nhiều người tưởng: **client gửi một khối văn bản, server gửi lại một khối văn bản**. Hết.

Và nó có một tính chất định hình mọi thứ còn lại: **HTTP không nhớ gì cả**. Mỗi request là một tờ giấy trắng — server không biết bạn vừa gọi gì năm giây trước.

## Mental model

Hãy nghĩ tới **gửi thư qua bưu điện, và người nhận bị mất trí nhớ mỗi sáng**.

> Bạn viết thư: **địa chỉ** (URL), **loại việc** (phương thức), **ghi chú ngoài phong bì** (header), **nội dung** (body).
>
> Người nhận đọc, làm, gửi thư trả lời: **mã tình trạng** (status), **ghi chú** (header), **nội dung** (body).
>
> Nhưng sáng hôm sau anh ta **quên sạch**. Bạn gửi thư thứ hai thì phải nói lại mình là ai — mỗi lần, không có ngoại lệ.

"Nói lại mình là ai" chính là cookie hoặc token. Và toàn bộ chuyện phiên đăng nhập tồn tại chỉ vì tính chất mất trí nhớ đó — xem [[phien-dang-nhap-va-cookie]].

## Ví dụ nhỏ

```http
POST /api/don-hang HTTP/1.1
Host: shop.vn
Content-Type: application/json
Authorization: Bearer eyJhbGc...

{"sanPhamId": "abc", "soLuong": 2}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/don-hang/123

{"id": "123", "trangThai": "moi"}
```

Bốn phần ở request, ba phần ở response. Không có gì khác.

## Code chạy thế nào

Một lần gọi đi qua sáu chặng, và biết chúng giúp bạn chẩn đoán khi chậm:

```text
① DNS       shop.vn → 203.0.113.5           (~20ms, có cache)
② TCP       bắt tay ba bước                  (~30ms)
③ TLS       trao đổi khoá, xác minh chứng chỉ (~50ms)  ← chỉ với https
④ Request   gửi khối văn bản đi
⑤ Xử lý     server làm việc, truy vấn CSDL   ← thường là phần lâu nhất
⑥ Response  gửi khối văn bản về
```

Ba chặng đầu tốn ~100ms và **chỉ trả một lần** cho nhiều request nhờ kết nối được giữ lại (keep-alive). Đó là lý do request thứ hai tới cùng một host luôn nhanh hơn request đầu.

Khi ai đó báo "API chậm", câu hỏi đầu tiên là **chậm ở chặng nào** — mạng, hay xử lý? Hai nguyên nhân đó cần hai cách sửa hoàn toàn khác nhau.

## Cú pháp

Header đáng nhớ, chia theo vai trò:

```text
GỬI ĐI (request)
  Content-Type      định dạng của body        application/json
  Authorization     giấy tờ tuỳ thân          Bearer <token>
  Accept            tôi muốn nhận định dạng gì
  User-Agent        tôi là trình duyệt/ứng dụng nào
  Cookie            dữ liệu trình duyệt tự đính kèm

NHẬN VỀ (response)
  Content-Type      định dạng của body trả về
  Cache-Control     được cache bao lâu
  Set-Cookie        server yêu cầu lưu cookie
  Location          địa chỉ mới (khi 201 hoặc 3xx)
  Retry-After       hãy thử lại sau N giây
```

Xem tận mắt:

```bash
curl -v https://api.github.com/users/torvalds       # -v hiện cả header
curl -i -X POST -H "Content-Type: application/json" \
     -d '{"a":1}' https://api.example.com/items
curl -w "\nDNS: %{time_namelookup}s  Kết nối: %{time_connect}s  Tổng: %{time_total}s\n" \
     -o /dev/null -s https://example.com
```

Lệnh cuối đo từng chặng — dùng nó trước khi kết luận "server chậm".

## Tại sao cần nó

Vì tính **không nhớ gì** của HTTP không phải khiếm khuyết mà là **quyết định thiết kế**, và nó đổi lấy ba thứ rất giá trị:

```text
① Mở rộng ngang được   → request nào cũng gửi tới server nào cũng được
② Cache được           → cùng URL + cùng điều kiện = cùng kết quả
③ Đơn giản, chịu lỗi   → server chết, request tiếp theo đi sang server khác
```

Nếu server phải nhớ bạn, mọi request của bạn buộc phải về đúng máy đó. Một máy chết là bạn mất phiên. Chuyện này liên quan trực tiếp tới [[mo-rong-va-can-bang-tai]].

Cái giá là bạn phải tự mang theo danh tính ở **mỗi** request — và mọi cơ chế xác thực đều chỉ là các cách khác nhau để làm việc đó.

## So sánh

| | Ai gửi | Chứa gì |
|---|---|---|
| Phương thức | Client | Ý định: đọc, tạo, sửa, xoá |
| URL | Client | Tài nguyên nào |
| Header (req) | Client | Bối cảnh: định dạng, danh tính, ngôn ngữ |
| Body (req) | Client | Dữ liệu gửi lên |
| Mã trạng thái | Server | Kết quả: thành công, lỗi ai, lỗi gì |
| Header (res) | Server | Cách xử lý kết quả: cache, cookie, chuyển hướng |
| Body (res) | Server | Dữ liệu trả về |

## Dễ nhầm

**1. Quên `Content-Type` khi gửi JSON.** Server không biết đọc kiểu gì và thường trả `400` hoặc `415` — lỗi trông rất khó hiểu vì body của bạn hoàn toàn hợp lệ.

**2. Nhét dữ liệu nhạy cảm vào URL.**

```text
❌ GET /api/login?matKhau=123456
```

URL bị ghi vào log máy chủ, log proxy, lịch sử trình duyệt, và header `Referer` khi người dùng bấm sang trang khác. Dữ liệu nhạy cảm đi trong **body** hoặc **header**.

**3. Tưởng HTTPS mã hoá cả URL.** Nó mã hoá đường dẫn và body, nhưng **tên miền** thì không (server cần biết bạn hỏi ai). Và URL vẫn hiện nguyên trong log của chính bạn.

**4. Gửi `GET` có body.** Kỹ thuật thì được, nhưng nhiều proxy và thư viện âm thầm bỏ nó đi. `GET` truyền tham số qua query string.

**5. Tưởng "không nhớ gì" nghĩa là không có phiên đăng nhập.** Có phiên — nhưng **client mang theo bằng chứng** ở mỗi request, chứ server không tự nhớ.

**6. Nhầm 3xx với lỗi.** `301`/`302` là chuyển hướng bình thường; `curl` không tự đi theo trừ khi bạn thêm `-L`.

## Mẹo nhớ

> **HTTP là gửi thư cho một người mất trí nhớ mỗi sáng.**
>
> **Request: phương thức + URL + header + body. Response: mã + header + body.**
>
> **Nhạy cảm thì đi trong body/header, không đi trong URL.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn phần của một request và ba phần của một response?
2. "HTTP không nhớ gì" nghĩa là gì, và nó đổi lấy ba lợi ích nào?
3. Vì sao request thứ hai tới cùng một host thường nhanh hơn?
4. Vì sao không được đặt mật khẩu trong query string, kể cả với HTTPS?
5. Nếu server không nhớ bạn, phiên đăng nhập hoạt động thế nào?

## Tự viết lại

Không nhìn lại phần trên, viết bằng tay một cặp request/response thô cho tình huống:

```text
Người dùng đã đăng nhập, tải lên một ảnh đại diện, server lưu thành công và
trả về đường dẫn ảnh mới.
```

Tự kiểm: `Content-Type` của bạn là gì (gợi ý: **không** phải `application/json`), và mã trạng thái nào phù hợp nhất?

## Thử sức

Một API mất trung bình 800ms. Bạn đo bằng `curl -w` và thấy:

```text
DNS: 0.004s   Kết nối: 0.031s   TLS: 0.089s   Bắt đầu nhận: 0.780s   Tổng: 0.795s
```

Chỉ ra chặng nào là điểm nghẽn, và **loại trừ** những nguyên nhân nào. Rồi nêu ba giả thuyết cho chặng đó và cách kiểm chứng từng cái.
