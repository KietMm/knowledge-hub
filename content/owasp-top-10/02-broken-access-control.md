---
title: Broken Access Control
slug: broken-access-control
summary: Lỗ hổng phổ biến nhất — người dùng truy cập được dữ liệu và chức năng không thuộc quyền của họ.
level: co-ban
tags: [owasp, phan-quyen, idor]
---

> **Sau bài này bạn sẽ:** nhận ra lỗ hổng IDOR trong code của mình, và biết vì sao ẩn nút trên giao diện không phải là kiểm soát truy cập.

## Hai câu hỏi khác nhau

- **Xác thực (authentication):** Bạn là ai?
- **Phân quyền (authorization):** Bạn được làm gì?

Broken Access Control là lỗi ở câu thứ hai. Người dùng đã đăng nhập hợp lệ, nhưng làm được việc không thuộc quyền của họ.

## IDOR — lỗ hổng kinh điển

**Insecure Direct Object Reference:** dùng id từ URL để đọc dữ liệu mà không kiểm tra chủ sở hữu.

```ts
// LỖ HỔNG: đổi id trên URL là xem được hoá đơn của người khác
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hoaDon = await db.hoaDon.findUnique({ where: { id } })
  return Response.json(hoaDon)
}
```

```ts
// ĐÚNG: điều kiện chủ sở hữu nằm ngay trong truy vấn
const phien = await layPhien()
if (phien === null) return new Response('Chưa đăng nhập', { status: 401 })

const hoaDon = await db.hoaDon.findFirst({
  where: { id, nguoiDungId: phien.userId },   // không phải của mình -> không tìm thấy
})
if (hoaDon === null) return new Response('Không tìm thấy', { status: 404 })
```

Đưa điều kiện quyền **vào chính truy vấn** thay vì kiểm tra sau khi đọc — vừa gọn, vừa không thể quên.

Trả về `404` thay vì `403` khi người dùng không có quyền: `403` xác nhận rằng bản ghi đó tồn tại, vốn đã là rò rỉ thông tin.

## Nâng quyền theo chiều dọc

Người dùng thường gọi được chức năng dành cho quản trị:

```ts
// LỖ HỔNG: ẩn nút trên giao diện không ngăn ai gọi thẳng action
export async function xoaNguoiDungAction(id: string) {
  'use server'
  await db.nguoiDung.delete({ where: { id } })
}

// ĐÚNG
export async function xoaNguoiDungAction(id: string) {
  'use server'
  const phien = await layPhien()
  if (phien?.vaiTro !== 'admin') return { ok: false, loi: 'Không có quyền' }
  await db.nguoiDung.delete({ where: { id } })
  return { ok: true }
}
```

**Giao diện không phải là lớp bảo mật.** Nút bị ẩn, route không có link, trang không hiện trong menu — tất cả đều không ngăn được một request gửi thẳng.

## Mass assignment

```ts
// LỖ HỔNG: người dùng gửi kèm { vaiTro: 'admin' } là tự nâng quyền
await db.nguoiDung.update({ where: { id }, data: await req.json() })

// ĐÚNG: danh sách trắng bằng schema
const CapNhatSchema = z.object({ ten: z.string(), anhDaiDien: z.string().url().optional() })
const parsed = CapNhatSchema.safeParse(await req.json())
if (!parsed.success) return badRequest()
await db.nguoiDung.update({ where: { id }, data: parsed.data })
```

Luôn dùng danh sách trắng (chỉ nhận trường cho phép), không dùng danh sách đen (loại bỏ trường cấm) — danh sách đen luôn thiếu một trường nào đó.

## Các dạng khác thường gặp

- **Duyệt đường dẫn:** `../../etc/passwd` trong tên file tải lên.
- **CORS quá rộng:** `Access-Control-Allow-Origin: *` trên API có xác thực.
- **Thiếu kiểm tra ở API nội bộ:** endpoint "chỉ dành cho service" nhưng ai gọi cũng được.
- **Chỉ kiểm tra ở middleware:** middleware bị bỏ qua với một số route pattern.

## Cách phòng có hệ thống

1. **Mặc định từ chối.** Mọi route yêu cầu đăng nhập trừ danh sách công khai được liệt kê rõ.
2. **Kiểm tra ở tầng dữ liệu**, không phải chỉ ở tầng route — nơi truy cập DB là nơi cuối cùng còn cơ hội chặn.
3. **Một hàm kiểm tra quyền dùng chung**, không rải `if` khắp nơi:

```ts
export async function yeuCauQuyen(hanhDong: HanhDong, taiNguyen: TaiNguyen) {
  const phien = await layPhien()
  if (phien === null) throw new ChuaDangNhap()
  if (!coQuyen(phien, hanhDong, taiNguyen)) throw new KhongCoQuyen()
  return phien
}
```

4. **Row Level Security** ở CSDL cho hệ thống nhiều khách hàng — chốt cuối cùng nếu code quên lọc.
5. **Test cho ca phủ định:** viết test kiểm tra người dùng A **không** đọc được dữ liệu của B. Loại test này hiếm khi được viết, và đó là lý do lỗ hổng tồn tại.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đọc theo id không kiểm tra chủ sở hữu | IDOR — lộ dữ liệu người khác | Điều kiện quyền trong truy vấn |
| Chỉ ẩn nút trên UI | Gọi thẳng API là qua mặt | Kiểm tra ở server |
| `data: req.body` nguyên khối | Mass assignment, tự nâng quyền | Danh sách trắng bằng schema |
| Trả `403` cho tài nguyên không thuộc mình | Xác nhận tài nguyên tồn tại | Trả `404` |
| Không có test ca phủ định | Lỗ hổng không ai phát hiện | Test "A không xem được của B" |

## Ghi nhớ

- Xác thực trả lời "bạn là ai", phân quyền trả lời "bạn được làm gì".
- Đưa điều kiện quyền vào truy vấn, đừng kiểm tra sau.
- Danh sách trắng cho mọi dữ liệu ghi.
- Mặc định từ chối; công khai là ngoại lệ được liệt kê.

## Tự kiểm tra

1. `GET /api/don-hang/123` cần những kiểm tra gì trước khi trả dữ liệu?
2. Vì sao trả `404` an toàn hơn `403` khi người dùng không có quyền?
3. Viết một test chứng minh người dùng A không đọc được ghi chú của B.
