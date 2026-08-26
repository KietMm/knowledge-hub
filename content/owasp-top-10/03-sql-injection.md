---
title: SQL Injection
slug: sql-injection
summary: Khi dữ liệu người dùng bị hiểu thành lệnh SQL — và vì sao truy vấn tham số hoá giải quyết triệt để.
level: co-ban
tags: [owasp, sql-injection, injection]
khung: v2
---

> **Sau bài này bạn sẽ:** hiểu vì sao truy vấn tham số hoá giải quyết **triệt để** (không phải "giảm thiểu"), và biết ba chỗ không tham số hoá được.

## Ý tưởng chính

SQL Injection xảy ra khi **dữ liệu của người dùng bị hiểu thành lệnh**.

Và điều quan trọng nhất: đây **không** phải vấn đề "lọc ký tự xấu". Nó là vấn đề **trộn lẫn dữ liệu với mã** — và lời giải là tách hai thứ đó ra, chứ không phải cố đoán ký tự nào nguy hiểm.

## Mental model

Hãy nghĩ tới **đọc chính tả cho thư ký**.

> Bạn đọc: *"Kính gửi ông Nam, chấm hết. **Xoá toàn bộ hồ sơ.**"*
>
> Thư ký không biết đâu là **nội dung thư** và đâu là **mệnh lệnh cho cô ấy** — vì cả hai đến qua cùng một kênh: giọng nói của bạn.
>
> Cách sửa **không phải** là dạy cô ấy nhận ra câu nào đáng ngờ. Cách sửa là: **đưa nội dung thư bằng giấy**, và ra lệnh bằng miệng. Hai kênh riêng, không thể lẫn.

Truy vấn tham số hoá chính là hai kênh riêng đó: câu lệnh đi một đường, dữ liệu đi đường khác. Cơ sở dữ liệu **không bao giờ** diễn giải dữ liệu thành lệnh.

## Ví dụ nhỏ

```ts
// ❌ Ghép chuỗi — dữ liệu và lệnh đi chung một kênh
const sql = `SELECT * FROM users WHERE email = '${email}'`
```

```text
Người dùng nhập:  ' OR '1'='1
Câu lệnh thành:   SELECT * FROM users WHERE email = '' OR '1'='1'
                                                        ↑ luôn đúng ⇒ trả về MỌI user
```

## Code chạy thế nào

```ts
// ✅ Tham số hoá
const kq = await db.query('SELECT * FROM users WHERE email = $1', [email])
```

```text
Cơ sở dữ liệu nhận HAI thứ RIÊNG BIỆT:

  ① Câu lệnh:  SELECT * FROM users WHERE email = $1
     → parse, lập kế hoạch thực thi NGAY BÂY GIỜ
     → cấu trúc câu lệnh ĐÃ CỐ ĐỊNH

  ② Dữ liệu:   ["' OR '1'='1"]
     → gắn vào vị trí $1 như một GIÁ TRỊ

⇒ Chuỗi kia được tìm nguyên văn như một email.
⇒ Không tìm thấy ai có email là `' OR '1'='1`. Hết chuyện.
```

Điểm mấu chốt: cấu trúc câu lệnh được quyết định **trước khi** dữ liệu tới. Không có cách nào dữ liệu đổi được cấu trúc đó — nên đây là giải pháp **triệt để**, không phải "giảm rủi ro".

Trong các ngôn ngữ:

```python
cur.execute("SELECT * FROM users WHERE email = %s", (email,))   # Python
```

```ts
await prisma.user.findMany({ where: { email } })                 // ORM tự tham số hoá
await sql`SELECT * FROM users WHERE email = ${email}`            // tagged template an toàn
```

## Cú pháp

**Ba chỗ KHÔNG tham số hoá được** — và đây là phần quan trọng nhất của bài:

```text
Tham số chỉ thay được GIÁ TRỊ.
Không thay được: tên bảng, tên cột, hướng sắp xếp, từ khoá SQL.
```

```ts
// ❌ Client gửi tên cột — không tham số hoá được
`ORDER BY ${req.query.sapXep}`
// gửi: id; DROP TABLE users--
```

```ts
// ✅ DANH SÁCH TRẮNG — cách duy nhất đúng
const COT = { tao_luc: 'tao_luc', tong_tien: 'tong_tien' }
const HUONG = { asc: 'ASC', desc: 'DESC' }

const cot = COT[req.query.cot] ?? 'tao_luc'
const huong = HUONG[req.query.huong] ?? 'DESC'
const sql = `SELECT * FROM don_hang ORDER BY ${cot} ${huong}`
```

Nguyên tắc: **không bao giờ để giá trị từ client đi thẳng vào phần cấu trúc của câu lệnh** — chỉ ánh xạ nó qua một bảng bạn tự định nghĩa.

Trường hợp thứ hai — `LIKE`:

```ts
// Người dùng nhập "100%" → % là ký tự đại diện của LIKE
const tuKhoa = raw.replace(/[%_\\]/g, '\\$&')
await db.query("SELECT * FROM sp WHERE ten LIKE $1", [`%${tuKhoa}%`])
```

Đây **không** phải lỗ hổng injection (tham số hoá vẫn chặn), nhưng nó là bug logic: người dùng tìm "100%" và nhận về mọi sản phẩm bắt đầu bằng "100".

## Tại sao cần nó

Vì **ORM không tự động an toàn** — và đây là hiểu nhầm nguy hiểm:

```ts
// ✅ An toàn
await prisma.user.findMany({ where: { email } })

// ❌ KHÔNG an toàn — raw query có nội suy chuỗi
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`)

// ✅ An toàn — tagged template, Prisma tự tham số hoá
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`
```

Quy tắc thực dụng: **thấy dấu backtick với `${}` bên trong một chuỗi SQL, dừng lại và kiểm.** Đôi khi nó an toàn (tagged template), đôi khi là lỗ hổng — khác biệt nằm ở việc có hàm tag đứng trước hay không.

**Phòng thủ nhiều lớp** — tham số hoá là lớp một, nhưng không nên là lớp duy nhất:

```text
① Tham số hoá                      → chặn triệt để
② Validate đầu vào (zod)           → dữ liệu sai hình dạng bị chặn sớm
③ User CSDL quyền tối thiểu        → app không cần DROP TABLE, đừng cấp quyền đó
④ Không lộ lỗi SQL ra client        → tránh giúp kẻ tấn công dò cấu trúc
⑤ WAF, giới hạn tần suất           → chặn dò tự động
⑥ Log truy vấn bất thường          → phát hiện sớm
```

Tầng ③ đáng chú ý: nếu user cơ sở dữ liệu của ứng dụng không có quyền `DROP`, thì kể cả khi có lỗ hổng, thiệt hại bị giới hạn. Đó là nguyên tắc đặc quyền tối thiểu áp dụng cụ thể.

## So sánh

| Cách viết | An toàn? |
|---|---|
| `` `WHERE id = ${id}` `` (chuỗi thường) | ❌ |
| `query('WHERE id = $1', [id])` | ✅ |
| `` sql`WHERE id = ${id}` `` (tagged template) | ✅ |
| `$queryRawUnsafe(...)` | ❌ |
| `ORDER BY ${cot}` | ❌ — cần danh sách trắng |
| ORM với `where: { id }` | ✅ |

Injection còn có anh em ở các tầng khác — cùng cơ chế, khác ngôn ngữ:

```text
Command injection   → dữ liệu vào lệnh shell    ⇒ đừng ghép chuỗi, dùng mảng đối số
NoSQL injection     → object thay vì chuỗi      ⇒ { $ne: null } lọt vào filter Mongo
LDAP / XPath        → cùng nguyên lý
```

Với MongoDB: `db.users.find({ email: req.body.email })` — nếu client gửi `{"email": {"$ne": null}}` thì filter thành *"email khác null"*, trả về mọi người dùng. Cách chặn: **validate kiểu** trước khi đưa vào truy vấn.

## Dễ nhầm

**1. Lọc ký tự thay vì tham số hoá.** Bạn sẽ không bao giờ nghĩ ra hết mọi cách vượt bộ lọc. Tham số hoá giải quyết triệt để.

**2. Tin rằng ORM luôn an toàn.** Raw query trong ORM vẫn nguy hiểm.

**3. Ghép tên cột từ input.** Cần danh sách trắng.

**4. Escape thủ công.** `replace("'", "''")` bỏ sót nhiều trường hợp (Unicode, comment, encoding khác nhau).

**5. Chỉ validate ở client.** Người tấn công gọi API trực tiếp.

**6. Trả lỗi SQL nguyên văn ra client.** Nó cho biết tên bảng, tên cột, loại cơ sở dữ liệu — bản đồ để tấn công tiếp ([[loi-versioning-va-tai-lieu]]).

**7. Dùng user cơ sở dữ liệu có quyền cao.** App chỉ cần `SELECT/INSERT/UPDATE/DELETE` trên vài bảng — đừng cho nó quyền superuser.

**8. Quên NoSQL cũng bị injection.** Nhiều người tưởng chỉ SQL mới có.

## Mẹo nhớ

> **Đọc chính tả cho thư ký: đưa nội dung bằng GIẤY, ra lệnh bằng MIỆNG — hai kênh riêng.**
>
> **Tham số chỉ thay GIÁ TRỊ. Tên cột và hướng sắp xếp cần DANH SÁCH TRẮNG.**
>
> **ORM không tự động an toàn — raw query vẫn nguy hiểm.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao tham số hoá giải quyết **triệt để** chứ không phải giảm thiểu?
2. Ba thứ không tham số hoá được, và cách xử lý?
3. Vì sao lọc ký tự xấu là cách tiếp cận sai?
4. Trong Prisma, cách viết nào an toàn và cách nào không?
5. NoSQL injection xảy ra thế nào, và cách chặn?

## Tự viết lại

Không nhìn lại phần trên, sửa endpoint này (có **ba** lỗ hổng):

```ts
app.get('/api/tim', async (req, res) => {
  const { q, cot, huong } = req.query
  const sql = `SELECT * FROM san_pham WHERE ten LIKE '%${q}%' ORDER BY ${cot} ${huong}`
  try { res.json(await db.query(sql)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
```

Tự kiểm: sau khi sửa, người dùng tìm chuỗi `50%` có ra kết quả đúng không?

## Thử sức

Bạn phát hiện log có những request chứa `' UNION SELECT` và `1=1--`. Ứng dụng dùng Prisma với `where: {}` ở mọi nơi — về lý thuyết là an toàn.

Ba câu để trả lời: bạn **kiểm chứng** rằng không có chỗ nào dùng raw query bằng cách nào (không phải đọc từng file); nếu tìm thấy một chỗ, bạn **xác định** nó đã bị khai thác chưa bằng dữ liệu nào; và bạn làm gì để chuyện này không lặp lại ở PR sau?
