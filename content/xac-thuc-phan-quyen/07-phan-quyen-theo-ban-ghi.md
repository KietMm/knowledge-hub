---
title: Phân quyền theo bản ghi
slug: phan-quyen-theo-ban-ghi
summary: RBAC không đủ khi quyền phụ thuộc vào chính bản ghi. ABAC, và nơi đặt kiểm tra để không bỏ sót.
level: nang-cao
tags: [phan-quyen, rbac, abac, bao-mat]
---

> **Sau bài này bạn sẽ:** phân quyền được ở mức từng bản ghi, và đặt kiểm tra ở chỗ không thể quên.

## RBAC hết tác dụng ở đâu

RBAC (theo vai trò) trả lời được *"người này có được sửa bài viết không?"*:

```ts
if (user.role !== 'editor') throw new Forbidden()
```

Nhưng câu hỏi thật gần như luôn là *"người này có được sửa **bài viết NÀY** không?"* — và câu trả lời phụ thuộc vào chính bản ghi:

- Tác giả sửa được bài **của mình**, không sửa bài người khác
- Quản lý xem được đơn hàng **của chi nhánh mình**
- Trong hệ thống nhiều khách hàng, ai cũng chỉ thấy dữ liệu **của tổ chức mình**

Vai trò không mang được thông tin đó. Đây là **Broken Access Control** — nhóm lỗ hổng đứng đầu OWASP Top 10, xem [[broken-access-control]].

## ABAC: quyết định từ thuộc tính

```ts
type QuyetDinh = { cho_phep: boolean; ly_do?: string }

export function coTheSuaBaiViet(user: User, bai: BaiViet): QuyetDinh {
  if (user.role === 'admin') return { cho_phep: true }

  if (bai.tacGiaId !== user.id) {
    return { cho_phep: false, ly_do: 'Không phải bài của bạn' }
  }
  if (bai.status === 'published' && user.role !== 'editor') {
    return { cho_phep: false, ly_do: 'Bài đã xuất bản, cần quyền biên tập' }
  }
  return { cho_phep: true }
}
```

Ba tính chất khiến hàm này dễ sống chung lâu dài:

- **Hàm thuần** — vào là `(user, bai)`, ra là quyết định. Không chạm DB, không chạm request. Test được không cần dựng gì, và đây là thứ đáng test nhất trong toàn hệ thống.
- **Một chỗ duy nhất** — mọi nơi cần biết quyền đều gọi nó. Luật đổi thì sửa một chỗ.
- **Trả về lý do** — hiện được thông báo hữu ích, và log được nguyên nhân bị chặn.

## Đừng để quên: chặn ở tầng truy vấn

Kiểm tra ở từng handler là chống được lỗ hổng — cho tới khi có người viết endpoint mới và quên. Cách chắc chắn hơn là **để bộ lọc vào chính truy vấn**:

```ts
// ❌ Lấy hết rồi mới lọc: dữ liệu người khác đã ra khỏi database
const tatCa = await db.baiViet.findMany()
return tatCa.filter((b) => b.tacGiaId === user.id)

// ✅ Phạm vi nằm trong điều kiện truy vấn
return db.baiViet.findMany({ where: { tacGiaId: user.id } })
```

Cách thứ nhất còn sai ở chỗ khác: phân trang chạy **trước** khi lọc, nên trang 1 có thể chỉ còn 3 bài trong khi `total` nói 100.

Gói thành hàm phạm vi để không ai phải nhớ:

```ts
/** Điều kiện giới hạn bài viết mà người dùng này được thấy. Mọi truy vấn đi qua đây. */
export function phamViBaiViet(user: User) {
  if (user.role === 'admin') return {}
  if (user.role === 'editor') return { toChucId: user.toChucId }
  return { tacGiaId: user.id }
}

// Dùng ở mọi nơi
db.baiViet.findMany({ where: { ...phamViBaiViet(user), status: 'published' } })
```

Chắc chắn nhất là đẩy xuống database bằng **Row Level Security** — lúc đó dù code có bug thì database vẫn từ chối:

```sql
ALTER TABLE bai_viet ENABLE ROW LEVEL SECURITY;

CREATE POLICY bai_viet_cua_toi ON bai_viet
  USING (tac_gia_id = current_setting('app.user_id'));
```

## 404 hay 403

```ts
const bai = await db.baiViet.findUnique({ where: { id } })
if (bai === null) throw new NotFound()

const qd = coTheSuaBaiViet(user, bai)
if (!qd.cho_phep) throw new Forbidden(qd.ly_do)
```

Trả `403` xác nhận rằng bản ghi đó **tồn tại**. Đôi khi bản thân điều đó là thông tin nhạy cảm: `/api/hop-dong/hd-2024-089` trả `403` cho biết hợp đồng ấy có thật, và thử một dải id là dò ra được quy mô.

Quy tắc: **`403` khi việc tồn tại không phải bí mật; `404` khi nó là bí mật.** Với dữ liệu của tổ chức khác trong hệ thống nhiều khách hàng, luôn `404`.

## Kiểm tra ở tầng nào

| Tầng | Vai trò | Đủ chưa |
|---|---|---|
| Giao diện (ẩn nút) | Trải nghiệm | ❌ Không phải bảo mật chút nào |
| Handler / Server Action | Chặn chính | ✅ Bắt buộc |
| Tầng truy vấn (phạm vi) | Lưới an toàn | ✅ Rất nên có |
| Database (RLS) | Lưới cuối | ✅ Chắc nhất |

Ẩn nút trên giao diện **không phải phân quyền**. Ai cũng gọi được API trực tiếp bằng `curl`. Ẩn nút là để người dùng khỏi bấm vào thứ không dùng được, không phải để ngăn ai.

## IDOR: id đoán được

```
GET /api/hoa-don/1     ← đổi thành 2, 3, 4... là đọc hoá đơn người khác
```

Hai việc phải làm, và cả hai đều cần:

```ts
// 1. Luôn kiểm tra quyền, không bao giờ tin id từ client
const hd = await db.hoaDon.findFirst({ where: { id, ...phamViHoaDon(user) } })
if (hd === null) throw new NotFound()

// 2. Dùng id không đoán được
id: z.string().default(() => nanoid())    // thay vì số tự tăng
```

Id không đoán được **không thay thế** việc kiểm tra quyền — nó chỉ làm việc dò khó hơn. Nếu id lọt ra ngoài (được chia sẻ, nằm trong log, trong `Referer`) mà không có kiểm tra quyền thì vẫn mất dữ liệu.

## Kiểm tra cả thao tác ghi, không chỉ đọc

Chỗ bị quên nhiều nhất:

```ts
// ❌ Ai biết id là xoá được
await db.baiViet.delete({ where: { id } })

// ✅ Điều kiện quyền nằm trong chính câu lệnh ghi
const { count } = await db.baiViet.deleteMany({
  where: { id, tacGiaId: user.id },
})
if (count === 0) throw new NotFound()
```

Đưa điều kiện vào `deleteMany`/`updateMany` khiến việc kiểm tra và việc ghi thành **một thao tác nguyên tử** — không có khoảng trống giữa lúc kiểm tra và lúc ghi để đối tượng bị đổi chủ, xem [[truy-cap-dong-thoi-va-khoa]].

Và đừng bao giờ tin trường nhạy cảm từ client:

```ts
// ❌ Client gửi kèm "role": "admin" là tự nâng quyền
await db.users.update({ where: { id }, data: req.body })

// ✅ Chỉ nhận đúng những trường được phép sửa
const patch = z.object({ name: z.string(), bio: z.string() }).parse(req.body)
await db.users.update({ where: { id: user.id }, data: patch })
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Chỉ kiểm tra vai trò, không kiểm tra chủ sở hữu | Sửa được dữ liệu người khác | Kiểm tra theo bản ghi |
| Lấy hết rồi lọc trong code | Dữ liệu ra khỏi DB, phân trang sai | Bộ lọc trong `where` |
| Ẩn nút và coi đó là phân quyền | Gọi API trực tiếp là lọt | Chặn ở server |
| Quên kiểm tra ở endpoint mới | Lỗ hổng theo từng lần thêm code | Hàm phạm vi + RLS |
| `403` cho dữ liệu của tổ chức khác | Xác nhận bản ghi tồn tại | `404` |
| Chỉ kiểm tra khi đọc | Xoá/sửa vẫn lọt | Điều kiện trong `deleteMany`/`updateMany` |
| `data: req.body` | Client tự nâng `role` lên admin | Danh sách trường cho phép |
| Logic quyền rải khắp handler | Sửa luật phải tìm hàng chục chỗ | Một hàm thuần duy nhất |

## Ghi nhớ

- Câu hỏi thật là "bản ghi **này**", không phải "loại bản ghi này" — RBAC một mình không đủ.
- Quyết định quyền nên là hàm thuần `(user, resource) => quyết định`, ở một chỗ.
- Phạm vi đặt trong `where`, không lọc sau khi đã lấy về.
- Kiểm tra cả thao tác ghi, và không bao giờ nhận nguyên `req.body`.

## Tự kiểm tra

1. Vì sao `if (user.role === 'editor')` không đủ để bảo vệ `PATCH /api/bai-viet/:id`?
2. Khi nào trả `404` thay vì `403`, và vì sao?
3. `await db.baiViet.delete({ where: { id } })` sai ở đâu, và viết lại thế nào?
