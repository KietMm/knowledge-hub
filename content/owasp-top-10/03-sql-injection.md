---
title: SQL Injection
slug: sql-injection
summary: Khi dữ liệu người dùng bị hiểu thành lệnh SQL — và vì sao truy vấn tham số hoá giải quyết triệt để.
level: co-ban
tags: [owasp, sql-injection, injection]
---

> **Sau bài này bạn sẽ:** nhận ra mọi chỗ nối chuỗi vào SQL trong code, và biết cách xử lý cả những phần không tham số hoá được.

## Cơ chế

```ts
// LỖ HỔNG
const sql = `SELECT * FROM nguoi_dung WHERE email = '${email}'`
```

Người dùng nhập:

```
' OR '1'='1
```

Câu lệnh trở thành:

```sql
SELECT * FROM nguoi_dung WHERE email = '' OR '1'='1'
```

Trả về toàn bộ bảng. Với input độc hơn:

```
'; DROP TABLE nguoi_dung; --
'; UPDATE nguoi_dung SET vai_tro='admin' WHERE email='attacker@x.com'; --
```

Gốc rễ vấn đề: CSDL nhận **một chuỗi** và tự phân tích đâu là lệnh, đâu là dữ liệu. Nó không có cách nào biết phần nào do bạn viết và phần nào do người dùng nhập.

## Cách sửa: truy vấn tham số hoá

```ts
// Postgres (node-postgres)
await client.query('SELECT * FROM nguoi_dung WHERE email = $1', [email])

// MySQL
await conn.execute('SELECT * FROM nguoi_dung WHERE email = ?', [email])

// Prisma — tham số hoá sẵn
await db.nguoiDung.findFirst({ where: { email } })

// Template tag của Prisma cũng an toàn
await db.$queryRaw`SELECT * FROM nguoi_dung WHERE email = ${email}`
```

Ở đây câu lệnh và dữ liệu đi **theo hai đường riêng**. CSDL biên dịch câu lệnh trước, rồi mới gắn giá trị vào — dữ liệu không bao giờ được phân tích thành cú pháp SQL. Ký tự `'` trong input trở thành một ký tự bình thường, không còn là dấu kết thúc chuỗi.

Chú ý phân biệt: `$queryRaw` (template tag, an toàn) khác hẳn `$queryRawUnsafe` (nhận chuỗi, nguy hiểm).

## Những phần không tham số hoá được

Tên bảng, tên cột, và hướng sắp xếp **không** dùng tham số được. Phải dùng danh sách trắng:

```ts
// LỖ HỔNG
const sql = `SELECT * FROM san_pham ORDER BY ${cot} ${huong}`

// ĐÚNG
const COT_HOP_LE = { ten: 'ten', gia: 'gia', ngay: 'ngay_tao' } as const
const HUONG_HOP_LE = { asc: 'ASC', desc: 'DESC' } as const

const cotSql = COT_HOP_LE[cot as keyof typeof COT_HOP_LE] ?? 'ngay_tao'
const huongSql = HUONG_HOP_LE[huong as keyof typeof HUONG_HOP_LE] ?? 'DESC'
const sql = `SELECT * FROM san_pham ORDER BY ${cotSql} ${huongSql}`
```

Giá trị đi ra từ một object cố định trong code, không phải từ input — đó mới là danh sách trắng thật. "Lọc ký tự nguy hiểm" không phải danh sách trắng.

## LIKE và ký tự đặc biệt

```ts
// Người dùng nhập '%' sẽ khớp mọi thứ
await db.$queryRaw`SELECT * FROM san_pham WHERE ten LIKE ${'%' + tuKhoa + '%'}`

// Escape ký tự đại diện
const antoan = tuKhoa.replace(/[%_\\]/g, (c) => `\\${c}`)
```

Đây không phải lỗ hổng nghiêm trọng như injection, nhưng là nguyên nhân của truy vấn quét toàn bảng khi ai đó gõ `%`.

## ORM không tự động an toàn

```ts
// Prisma: an toàn
await db.nguoiDung.findMany({ where: { email } })

// Prisma: NGUY HIỂM — nhận chuỗi thô
await db.$queryRawUnsafe(`SELECT * FROM nguoi_dung WHERE email = '${email}'`)

// TypeORM: nguy hiểm
.where(`user.email = '${email}'`)
// TypeORM: an toàn
.where('user.email = :email', { email })
```

Dùng ORM không có nghĩa là an toàn — chỉ có nghĩa là đường an toàn dễ đi hơn.

## Phòng thủ nhiều lớp

1. **Tham số hoá** — lớp chính, giải quyết triệt để.
2. **Đặc quyền tối thiểu** — tài khoản DB của ứng dụng không có quyền `DROP`, `CREATE USER`. Injection lọt qua thì thiệt hại vẫn giới hạn.
3. **Validate đầu vào** — id phải là số, email phải đúng định dạng. Không thay được lớp 1 nhưng chặn được nhiều thứ sớm.
4. **Không lộ lỗi SQL ra ngoài** — thông báo lỗi chi tiết là bản đồ cho người tấn công.
5. **Ghi log truy vấn bất thường** — phát hiện được người đang dò tìm.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Nối chuỗi vào SQL | Injection | Tham số hoá |
| `$queryRawUnsafe` với biến | Injection dù đang dùng ORM | Dùng template tag |
| Tên cột từ input | Injection qua ORDER BY | Danh sách trắng cố định |
| Tài khoản DB quyền cao | Injection thành thảm hoạ | Cấp quyền tối thiểu |
| Hiện lỗi SQL cho người dùng | Lộ cấu trúc bảng | Log ở server, trả lỗi chung |

## Ghi nhớ

- Tham số hoá tách lệnh khỏi dữ liệu — đó là cách sửa triệt để duy nhất.
- Tên bảng/cột phải qua danh sách trắng cố định trong code.
- ORM giúp nhưng không miễn nhiễm; cẩn thận với các API `raw`.
- Đặc quyền tối thiểu giới hạn thiệt hại khi mọi thứ khác thất bại.

## Tự kiểm tra

1. Vì sao tham số hoá an toàn hơn việc escape dấu nháy?
2. Cho phép người dùng chọn cột sắp xếp — làm thế nào cho an toàn?
3. Tài khoản DB của ứng dụng web nên có và không nên có những quyền gì?
