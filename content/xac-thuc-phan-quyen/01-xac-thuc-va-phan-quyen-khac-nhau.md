---
title: Xác thực và phân quyền khác nhau thế nào
slug: xac-thuc-va-phan-quyen-khac-nhau
summary: Hai câu hỏi, hai cơ chế, hai chỗ kiểm tra — nhầm lẫn giữa chúng là gốc của nhiều lỗ hổng.
level: co-ban
tags: [auth, bao-mat, co-ban]
khung: v2
---

> **Sau bài này bạn sẽ:** biết đặt mỗi loại kiểm tra ở đúng chỗ, và chọn được mô hình phân quyền phù hợp với hệ của mình.

## Ý tưởng chính

Hai từ nghe giống nhau, viết tắt giống nhau (authN/authZ), nhưng trả lời **hai câu hỏi hoàn toàn khác nhau**:

```text
Xác thực (Authentication)  →  "Anh là ai?"
Phân quyền (Authorization) →  "Anh được làm gì với CÁI NÀY?"
```

Nhầm lẫn giữa chúng là gốc của lỗ hổng phổ biến nhất trong OWASP Top 10 ([[broken-access-control]]).

## Mental model

Hãy nghĩ tới **sân bay**.

> **Xác thực** là quầy check-in: đối chiếu hộ chiếu với vé. Xong, bạn có thẻ lên máy bay. Việc này diễn ra **một lần**.
>
> **Phân quyền** là mọi cửa sau đó: cửa an ninh kiểm bạn có vé không, cửa phòng chờ hạng thương gia kiểm hạng vé, cửa lên máy bay kiểm đúng chuyến. Việc này diễn ra **liên tục**.
>
> Có thẻ lên máy bay **không** nghĩa là vào được phòng chờ hạng thương gia.

Câu cuối là toàn bộ bài học: *"đã đăng nhập"* không nghĩa là *"được phép làm việc này"*.

## Ví dụ nhỏ

```ts
app.get('/api/don/:id',
  requireLogin,                    // ← xác thực: anh là ai?
  async (req, res) => {
    const don = await db.don.findOne({ id: req.params.id, khachId: req.user.id })
    //                                                     ↑ phân quyền: đơn NÀY của anh chứ?
    if (!don) return res.status(404).end()
    res.json(don)
  })
```

## Code chạy thế nào

**Luồng đăng nhập đầy đủ**, từng bước và lý do:

```text
① Người dùng gửi email + mật khẩu qua HTTPS
② Server tìm user theo email
③ Verify mật khẩu bằng hàm băm chậm (argon2/bcrypt)
   ⚠️ Luôn verify kể cả khi không tìm thấy user → chống tấn công theo thời gian
④ Kiểm tra tài khoản: đã xác minh email? bị khoá? cần 2FA?
⑤ Sinh phiên (session id ngẫu nhiên, hoặc JWT)
⑥ Đặt cookie: HttpOnly, Secure, SameSite=Lax
⑦ Ghi log: đăng nhập thành công (IP, thiết bị)
⑧ Trả về — thông báo lỗi KHÔNG phân biệt "sai email" với "sai mật khẩu"
```

Bước ③ và ⑧ đều phục vụ một mục đích: **không tiết lộ email nào đã đăng ký** ([[luu-mat-khau-va-ma-hoa]]).

**Ba yếu tố xác thực** — dùng từ hai yếu tố trở lên gọi là xác thực đa yếu tố:

```text
① Thứ bạn BIẾT     mật khẩu, mã PIN
② Thứ bạn CÓ       điện thoại (TOTP), khoá phần cứng, email
③ Thứ bạn LÀ       vân tay, khuôn mặt
```

Xếp theo độ mạnh của yếu tố thứ hai:

```text
Khoá phần cứng (WebAuthn/passkey)  ⭐⭐⭐ chống được cả lừa đảo (phishing)
TOTP (Google Authenticator)         ⭐⭐  tốt, nhưng vẫn bị lừa nhập mã
SMS                                 ⭐   yếu nhất — SIM swap, chặn tin nhắn
```

Điểm đáng nhớ: **chỉ khoá phần cứng chống được phishing**, vì nó gắn với tên miền — người dùng không thể "nhập nhầm" nó vào trang giả.

## Cú pháp

**Chỗ đặt mỗi loại kiểm tra** — đây là phần quan trọng nhất:

```text
Xác thực     → middleware ở tầng route là ĐỦ
               "chưa đăng nhập ⇒ 401"

Phân quyền   → phải ở NƠI CHẠM DỮ LIỆU
               "đơn hàng NÀY có phải của anh không?"
               ⇒ middleware KHÔNG đủ, vì nó không biết id nào thuộc về ai
```

```ts
// ❌ Chỉ có middleware
app.get('/api/don/:id', requireLogin, (req, res) => db.don.findById(req.params.id))

// ✅ Điều kiện quyền nằm trong chính truy vấn
const don = await db.don.findOne({ id, khachId: req.user.id })
```

## Tại sao cần nó

Vì **ba mô hình phân quyền** hợp với ba loại hệ thống khác nhau, và chọn sai thì hoặc quá cứng hoặc quá phức tạp:

**① RBAC — theo vai trò** (đơn giản nhất, đủ cho phần lớn hệ):

```ts
const QUYEN = {
  admin:     ['user:*', 'don:*', 'bao_cao:*'],
  bien_tap:  ['bai_viet:doc', 'bai_viet:sua'],
  doc_gia:   ['bai_viet:doc'],
}
```

```text
✅ Dễ hiểu, dễ quản lý
❌ Không diễn đạt được "chỉ sửa bài CỦA MÌNH"
```

**② ABAC — theo thuộc tính** (linh hoạt, phức tạp hơn):

```ts
function coQuyen(user, hanhDong, taiNguyen) {
  if (user.vaiTro === 'admin') return true
  if (hanhDong === 'sua' && taiNguyen.tacGiaId === user.id) return true
  if (hanhDong === 'doc' && taiNguyen.congKhai) return true
  return false
}
```

```text
✅ Diễn đạt được quy tắc theo ngữ cảnh
❌ Khó kiểm tra tổng thể "ai có quyền gì"
```

**③ ReBAC — theo quan hệ** (cho hệ chia sẻ phức tạp):

```text
"user A là editor của document D"
"document D thuộc folder F, và ai là viewer của F cũng là viewer của D"
⇒ mô hình của Google Docs, Notion — công cụ: OpenFGA, SpiceDB
```

Cách chọn: **bắt đầu bằng RBAC**; thêm kiểm tra quyền sở hữu theo bản ghi khi cần (đó là ABAC ở mức nhẹ); chỉ dùng ReBAC khi nghiệp vụ thật sự là chia sẻ nhiều cấp ([[phan-quyen-theo-ban-ghi]]).

## So sánh

| | Xác thực | Phân quyền |
|---|---|---|
| Câu hỏi | "Anh là ai?" | "Anh được làm gì với cái này?" |
| Tần suất | Một lần (rồi giữ phiên) | **Mỗi lần** chạm dữ liệu |
| Chỗ kiểm | Middleware là đủ | Tầng dữ liệu |
| Mã HTTP | 401 | 403 (hoặc 404 để không lộ) |
| Sai thì | Người lạ vào được | Người quen xem được thứ không thuộc về họ |

## Dễ nhầm

**1. Coi "đã đăng nhập" là "được phép".** Lỗi số một.

**2. Kiểm quyền chỉ ở giao diện.** Ẩn nút không phải bảo mật.

**3. Trả 401 khi lẽ ra 403 (hoặc ngược lại).** `401` bảo client *"đăng nhập đi"*, và client sẽ chuyển hướng người dùng tới trang đăng nhập — dù họ **đã** đăng nhập rồi.

**4. Vai trò lưu trong JWT mà không kiểm lại.** Đổi vai trò của người dùng thì token cũ **vẫn còn quyền cũ** cho tới khi hết hạn.

**5. Dùng SMS làm yếu tố thứ hai cho tài khoản quan trọng.** SIM swap là tấn công có thật và không hiếm.

**6. Không có đường thu hồi quyền ngay lập tức.** Sa thải một nhân viên lúc 5 giờ chiều — token của họ còn sống bao lâu?

**7. Tự viết hệ thống xác thực từ đầu.** Có rất nhiều chi tiết dễ sai; dùng thư viện hoặc dịch vụ đã được kiểm chứng.

## Mẹo nhớ

> **Quầy check-in (xác thực) một lần; các cửa sau đó (phân quyền) kiểm liên tục.**
>
> **Thẻ lên máy bay ≠ vé vào phòng chờ hạng thương gia.**
>
> **Phân quyền phải nằm ở NƠI CHẠM DỮ LIỆU, không phải ở middleware.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Hai câu hỏi mà xác thực và phân quyền trả lời?
2. Vì sao middleware đủ cho xác thực nhưng không đủ cho phân quyền?
3. Ba yếu tố xác thực, và vì sao khoá phần cứng mạnh hơn TOTP?
4. RBAC không diễn đạt được quy tắc nào, và bạn xử lý thế nào?
5. Vì sao lưu vai trò trong JWT có rủi ro?

## Tự viết lại

Không nhìn lại phần trên, thiết kế phân quyền cho một hệ quản lý tài liệu:

```text
- Admin: mọi thứ
- Chủ sở hữu tài liệu: sửa, xoá, chia sẻ tài liệu của mình
- Người được chia sẻ: chỉ đọc
- Khách: chỉ đọc tài liệu công khai
```

Tự kiểm: bạn dùng RBAC thuần được không? Nếu không, chỗ nào cần thêm kiểm tra theo bản ghi?

## Thử sức

Một nhân viên bị sa thải lúc 17:00. Bạn xoá tài khoản của họ lúc 17:05.

Lúc 17:30, log cho thấy tài khoản đó **vẫn gọi API thành công**. Giải thích vì sao (gợi ý: liên quan tới cách bạn lưu phiên), và thiết kế lại để việc thu hồi có hiệu lực **trong vòng một phút**. Câu khó: giải pháp của bạn đánh đổi gì về hiệu năng?
