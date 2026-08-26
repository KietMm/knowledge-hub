---
title: Broken Access Control
slug: broken-access-control
summary: Lỗ hổng phổ biến nhất — người dùng truy cập được dữ liệu và chức năng không thuộc quyền của họ.
level: co-ban
tags: [owasp, phan-quyen, idor]
khung: v2
---

> **Sau bài này bạn sẽ:** phân biệt xác thực với phân quyền, nhận ra lỗ hổng IDOR, và biết đặt kiểm tra quyền ở đúng chỗ.

## Ý tưởng chính

Đây là lỗ hổng **phổ biến nhất** trong OWASP Top 10, và lý do rất cụ thể: nó không phải lỗi kỹ thuật tinh vi — nó là **quên một câu `if`**.

Và công cụ tự động gần như không phát hiện được, vì máy không biết người dùng nào *nên* xem được dữ liệu nào. Chỉ logic nghiệp vụ của bạn biết.

## Mental model

Hãy nghĩ tới **khách sạn**.

> **Xác thực** là quầy lễ tân kiểm giấy tờ: *"anh là ai?"* Xong, bạn được thẻ phòng.
>
> **Phân quyền** là ổ khoá trên **từng cửa phòng**: *"thẻ này có mở được phòng NÀY không?"*
>
> Lỗ hổng phổ biến nhất là: khách sạn kiểm giấy tờ rất kỹ ở quầy, rồi làm **mọi cửa phòng mở bằng cùng một thẻ** — vì "ai vào được toà nhà thì cũng là khách cả".

Đó chính xác là điều xảy ra khi bạn kiểm `if (đã đăng nhập)` rồi dừng lại.

## Ví dụ nhỏ

```ts
// ❌ Chỉ kiểm "đã đăng nhập"
app.get('/api/don-hang/:id', requireLogin, async (req, res) => {
  const don = await db.donHang.findById(req.params.id)
  res.json(don)          // ← ai đăng nhập cũng xem được đơn của BẤT KỲ AI
})
```

Người dùng đổi `/api/don-hang/1043` thành `1044` và xem đơn của người khác. Lỗ hổng này gọi là **IDOR** (Insecure Direct Object Reference).

## Code chạy thế nào

```ts
// ✅ Kiểm quyền trên CHÍNH BẢN GHI đó
app.get('/api/don-hang/:id', requireLogin, async (req, res) => {
  const don = await db.donHang.findById(req.params.id)
  if (!don) return res.status(404).end()
  if (don.khachId !== req.user.id) return res.status(404).end()   // ← câu quyết định
  res.json(don)
})
```

```text
Cách tốt hơn: đưa điều kiện quyền vào chính TRUY VẤN

  const don = await db.donHang.findOne({ id, khachId: req.user.id })
  if (!don) return res.status(404).end()

⇒ Không thể QUÊN kiểm, vì không có đường nào lấy được bản ghi của người khác.
```

Đây là nguyên tắc quan trọng nhất của bài: **biến việc kiểm quyền từ một câu `if` phải nhớ thành một điều kiện không thể bỏ qua**.

Chú ý mã trạng thái: trả **404** thay vì **403** khi người dùng không có quyền xem. `403` xác nhận *"bản ghi này tồn tại"* — thông tin đó tự nó đã là rò rỉ. Chi tiết ở [[phuong-thuc-va-ma-trang-thai]].

## Cú pháp

**Nâng quyền theo chiều dọc** — người dùng thường làm được việc của admin:

```ts
// ❌ Kiểm quyền admin chỉ ở giao diện
{ user.isAdmin && <button>Xoá người dùng</button> }
// API vẫn nhận request từ bất kỳ ai gọi thẳng
```

```ts
// ✅ Kiểm ở server, tại chính endpoint
app.delete('/api/users/:id', requireLogin, requireRole('admin'), handler)
```

Ẩn nút **không phải bảo mật**. Nó chỉ là trải nghiệm — người tấn công không dùng giao diện của bạn.

**Mass assignment** — dạng ít người biết nhưng rất hay gặp:

```ts
// ❌ Gán thẳng toàn bộ body vào bản ghi
await db.user.update(req.user.id, req.body)
// Người dùng gửi: { "ten": "An", "vaiTro": "admin", "soDu": 999999999 }
```

```ts
// ✅ Danh sách trắng — chỉ nhận field được phép
const { ten, avatar } = req.body
await db.user.update(req.user.id, { ten, avatar })
```

Với zod thì rõ hơn nữa:

```ts
const CapNhatHoSo = z.object({ ten: z.string(), avatar: z.string().url().optional() }).strict()
await db.user.update(req.user.id, CapNhatHoSo.parse(req.body))
```

`.strict()` làm zod **từ chối** field lạ thay vì âm thầm bỏ qua — nên bạn phát hiện được cả những request đang thăm dò.

## Tại sao cần nó

Vì lỗ hổng này có nhiều dạng hơn người ta nghĩ, và tất cả đều cùng một gốc:

```text
· Đổi id trong URL, trong body, trong tham số            → IDOR
· Gọi thẳng API mà giao diện không hiện nút               → nâng quyền dọc
· Gửi thêm field không được phép                          → mass assignment
· Đoán đường dẫn quản trị: /admin, /api/internal          → thiếu kiểm ở route
· Sửa JWT payload (khi server không xác minh chữ ký)      → giả mạo danh tính
· Truy cập file của người khác qua đường dẫn: ../../etc    → path traversal
· Xem dữ liệu tenant khác trong hệ SaaS                   → thiếu lọc tenant_id
```

**Cách phòng có hệ thống** — bốn tầng, không phải một câu `if`:

```text
① Mặc định TỪ CHỐI
   Không phải "kiểm xem có bị cấm không" mà "kiểm xem có được phép không".
   Route mới thêm vào mà quên khai quyền ⇒ nó phải bị chặn, không phải mở.

② Kiểm ở TẦNG DỮ LIỆU, không chỉ ở tầng route
   Đưa điều kiện quyền vào truy vấn, hoặc dùng Row Level Security.

③ Kiểm quyền trên CHÍNH BẢN GHI (không chỉ trên loại tài nguyên)
   "được xem đơn hàng" ≠ "được xem đơn hàng NÀY".

④ Test tự động cho phân quyền
   Với mỗi endpoint: user A có lấy được dữ liệu của user B không?
```

Tầng ④ là thứ ít đội làm nhất, nhưng nó là **cách duy nhất** để lỗi này không quay lại — vì con người sẽ quên khi thêm endpoint thứ 200.

## So sánh

| | Xác thực (Authentication) | Phân quyền (Authorization) |
|---|---|---|
| Trả lời câu | "Anh là ai?" | "Anh được làm gì với cái này?" |
| Xảy ra khi | Đăng nhập | **Mỗi lần** chạm dữ liệu |
| Mã HTTP | 401 | 403 (hoặc 404 để không lộ) |
| Sai thì | Người lạ vào được | Người quen xem được thứ không thuộc về họ |

Chi tiết hơn ở [[xac-thuc-va-phan-quyen-khac-nhau]] và [[phan-quyen-theo-ban-ghi]].

## Dễ nhầm

**1. Kiểm "đã đăng nhập" rồi dừng.** Lỗi số một.

**2. Ẩn nút trên giao diện và coi đó là bảo mật.** Người tấn công dùng `curl`.

**3. Kiểm quyền chỉ ở middleware của route.** Đủ cho trang, **không đủ** cho từng bản ghi.

**4. Dùng id tuần tự.** Không tự nó là lỗ hổng, nhưng nó làm IDOR **dễ khai thác hơn nhiều** — thử `1044`, `1045`, `1046` là ra. UUID/ULID không thay được kiểm tra quyền, nhưng nó loại bỏ việc dò tìm hàng loạt ([[tu-yeu-cau-toi-bang]]).

**5. Gán thẳng `req.body`.** Mass assignment.

**6. Trả 403 khi lẽ ra nên trả 404.** Xác nhận sự tồn tại của bản ghi.

**7. Tin vào dữ liệu trong JWT mà không xác minh chữ ký.** Payload của JWT chỉ là base64 — ai cũng đọc và sửa được; chỉ chữ ký mới bảo đảm.

**8. Không có test phân quyền.** Sau 50 endpoint, chắc chắn có chỗ quên.

## Mẹo nhớ

> **Lễ tân kiểm giấy tờ (xác thực) ≠ ổ khoá từng phòng (phân quyền).**
>
> **Đưa điều kiện quyền vào TRUY VẤN — để không thể quên.**
>
> **Mặc định TỪ CHỐI, không phải mặc định cho phép.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Xác thực và phân quyền khác nhau thế nào — nói bằng hình ảnh khách sạn?
2. IDOR là gì, và cách sửa **triệt để** (không phải thêm câu `if`)?
3. Vì sao ẩn nút trên giao diện không phải bảo mật?
4. Mass assignment xảy ra thế nào, và cách chặn?
5. Vì sao đôi khi nên trả 404 thay vì 403?

## Tự viết lại

Không nhìn lại phần trên, tìm **ba** lỗ hổng trong đoạn này và sửa:

```ts
app.patch('/api/bai-viet/:id', requireLogin, async (req, res) => {
  const bai = await db.baiViet.findById(req.params.id)
  await db.baiViet.update(req.params.id, req.body)
  res.json(bai)
})
```

Tự kiểm: sau khi sửa, người dùng có đổi được `tacGiaId` của bài viết không?

## Thử sức

Hệ SaaS của bạn có 300 endpoint. Bạn nghi ngờ một số chỗ thiếu kiểm tra quyền nhưng không biết chỗ nào.

Thiết kế cách **tìm ra tất cả** một cách có hệ thống — không phải đọc từng file. Gợi ý: có một cách viết test chạy tự động cho **mọi** endpoint mà không cần viết 300 test riêng. Câu khó: test đó cần dữ liệu gì để chạy được?
