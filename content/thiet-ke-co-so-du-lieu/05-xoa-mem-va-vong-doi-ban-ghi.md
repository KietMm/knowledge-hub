---
title: Xoá mềm và vòng đời bản ghi
slug: xoa-mem-va-vong-doi-ban-ghi
summary: Khi nào nên xoá mềm, cái giá phải trả, và cách xử lý dữ liệu tham chiếu tới bản ghi đã xoá.
level: trung-cap
tags: [database, xoa-mem, thiet-ke, vong-doi]
---

> **Sau bài này bạn sẽ:** quyết định được xoá cứng hay xoá mềm, và tránh những bug mà xoá mềm luôn kéo theo.

## Vì sao không xoá thẳng

`DELETE FROM users WHERE id = 'u-1'` là thao tác không hoàn tác được. Bốn lý do thực tế để không làm vậy:

- **Người dùng bấm nhầm** và muốn phục hồi
- **Kiểm toán** — cần biết ai từng tồn tại và bị xoá lúc nào
- **Dữ liệu tham chiếu** — đơn hàng cũ trỏ tới sản phẩm này; xoá cứng thì hoá đơn năm ngoái mất tên sản phẩm
- **Quy định** — nhiều ngành buộc giữ dữ liệu N năm

## Xoá mềm: thêm cột thời điểm, đừng thêm cột boolean

```sql
ALTER TABLE bai_viet ADD COLUMN deleted_at TIMESTAMPTZ;
```

`deleted_at NULL` = còn sống. Có giá trị = đã xoá, **và biết luôn lúc nào**.

```sql
-- ❌ is_deleted BOOLEAN: mất thông tin thời điểm, vẫn phải thêm cột nữa để biết
-- ✅ deleted_at: một cột, hai thông tin
UPDATE bai_viet SET deleted_at = now() WHERE id = 'p-1';
```

Cần biết *ai* xoá thì thêm `deleted_by`.

## Cái giá: mọi truy vấn phải nhớ lọc

Đây là vấn đề thật của xoá mềm, và nó không nhỏ:

```sql
SELECT * FROM bai_viet;                              -- ❌ có cả bài đã xoá
SELECT * FROM bai_viet WHERE deleted_at IS NULL;     -- ✅
```

Quên một lần là bài đã xoá hiện lên trước mặt người dùng. Ba chỗ đặc biệt dễ quên: `COUNT(*)` cho thống kê, `JOIN` sang bảng khác, và các báo cáo viết tay sau này.

Hai cách chống quên:

**View cho dữ liệu sống** — code thường chỉ dùng view, cần dữ liệu đã xoá thì mới chạm bảng gốc:

```sql
CREATE VIEW bai_viet_song AS
SELECT * FROM bai_viet WHERE deleted_at IS NULL;
```

**Bộ lọc mặc định ở tầng repository** — đúng cách repo này tổ chức: mọi truy cập dữ liệu đi qua `src/lib/db/*.repo.ts`, nên bộ lọc đặt một lần ở đó và không có đường nào lách qua:

```ts
export async function listAll(): Promise<BaiViet[]> {
  const all = await readCollection(FILE, BaiVietSchema)
  return all.filter((b) => b.deletedAt === null)      // mặc định: chỉ bản sống
}

export async function listAllIncludingDeleted(): Promise<BaiViet[]> {
  return readCollection(FILE, BaiVietSchema)          // tường minh mới lấy được bản đã xoá
}
```

Điểm quan trọng của thiết kế này: **an toàn là mặc định**, còn muốn thấy dữ liệu đã xoá thì phải gọi hàm có tên nói rõ điều đó.

## Xoá mềm phá vỡ ràng buộc UNIQUE

Bug này gặp gần như chắc chắn:

```sql
CREATE TABLE users (
  email TEXT UNIQUE,
  deleted_at TIMESTAMPTZ
);
```

Xoá mềm `k@example.com`, người đó muốn đăng ký lại → **lỗi trùng email**, dù bản ghi cũ đã "xoá".

Cách sửa: unique có điều kiện, chỉ áp cho bản ghi còn sống.

```sql
-- PostgreSQL: partial unique index
CREATE UNIQUE INDEX users_email_song
ON users (email)
WHERE deleted_at IS NULL;
```

Giờ nhiều bản ghi đã xoá cùng email đều hợp lệ, nhưng chỉ tối đa một bản ghi *sống* giữ email đó.

## Dữ liệu tham chiếu: đóng băng cái cần đóng băng

Xoá mềm sản phẩm nhưng đơn hàng vẫn `JOIN` sang bảng sản phẩm để lấy tên và giá — sai về nghiệp vụ, kể cả khi truy vấn chạy được. Giá sản phẩm hôm nay không phải giá lúc khách mua.

```sql
CREATE TABLE order_items (
  order_id    TEXT NOT NULL REFERENCES orders(id),
  product_id  TEXT REFERENCES products(id),   -- để đối chiếu về sau
  -- Ảnh chụp tại thời điểm mua: hoá đơn phải bất biến
  ten_luc_mua  TEXT NOT NULL,
  gia_luc_mua  BIGINT NOT NULL
);
```

Nguyên tắc chung: **bản ghi giao dịch phải tự đủ nghĩa**. Hoá đơn, hợp đồng, bảng lương không được đổi nội dung khi dữ liệu tham chiếu đổi. Với những bảng này, xoá cứng bản ghi được tham chiếu không còn là vấn đề — bản sao đã nằm trong giao dịch.

## Ba trạng thái, không phải hai

Nhiều hệ thống thực tế cần phân biệt "ẩn" và "đã xoá":

```sql
status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
deleted_at TIMESTAMPTZ
```

- `draft` / `published` — trạng thái nghiệp vụ, người dùng điều khiển
- `archived` — không hiện nữa nhưng vẫn là dữ liệu hợp lệ, tìm được
- `deleted_at` — đã xoá, chỉ còn cho phục hồi và kiểm toán

Trộn ba thứ này vào một cột `is_deleted` là nguồn của những câu điều kiện không ai hiểu nổi sáu tháng sau.

## Dọn thật sự

Xoá mềm không phải là giữ mãi mãi. Định trước thời hạn và dọn định kỳ:

```sql
-- Chạy theo lịch: xoá cứng những gì đã xoá mềm quá 90 ngày
DELETE FROM bai_viet
WHERE deleted_at < now() - INTERVAL '90 days';
```

Không có bước này thì bảng phình vô hạn, index to dần, và bạn giữ dữ liệu cá nhân lâu hơn mức được phép — nhiều quy định về bảo vệ dữ liệu yêu cầu xoá thật khi người dùng đề nghị.

## Khi nào đừng xoá mềm

Xoá mềm có giá. Bỏ qua nó khi:

- Bảng log, cache, session — hết hạn thì xoá thẳng
- Bảng rất lớn ghi liên tục — dùng phân vùng theo thời gian rồi `DROP PARTITION`
- Dữ liệu không ai muốn phục hồi (bản nháp tự lưu, dữ liệu tạm)

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Quên `WHERE deleted_at IS NULL` | Bản ghi đã xoá hiện cho người dùng | View hoặc lọc ở repository |
| `UNIQUE` thường trên bảng có xoá mềm | Không đăng ký lại được sau khi xoá | Partial unique index |
| Dùng `is_deleted BOOLEAN` | Mất thông tin thời điểm xoá | `deleted_at TIMESTAMPTZ` |
| `JOIN` lấy tên/giá cho hoá đơn cũ | Hoá đơn đổi nội dung theo thời gian | Đóng băng vào bản ghi giao dịch |
| Xoá mềm rồi giữ mãi | Bảng phình, vi phạm quy định lưu trữ | Dọn theo hạn |
| Trộn trạng thái nghiệp vụ với xoá | Điều kiện rối, không ai hiểu | Tách `status` và `deleted_at` |
| Quên lọc trong `COUNT(*)` | Thống kê sai âm thầm | Đếm qua view |

## Ghi nhớ

- `deleted_at` chứ không phải `is_deleted` — một cột, hai thông tin.
- Cái giá của xoá mềm là mọi truy vấn phải lọc; đặt bộ lọc ở một chỗ duy nhất.
- Xoá mềm cần partial unique index, nếu không không đăng ký lại được.
- Hoá đơn và bản ghi giao dịch phải đóng băng dữ liệu, không `JOIN`.

## Tự kiểm tra

1. Vì sao `deleted_at` tốt hơn `is_deleted`?
2. Người dùng xoá tài khoản rồi đăng ký lại cùng email và bị lỗi trùng. Sửa thế nào?
3. Vì sao `order_items` nên lưu `gia_luc_mua` thay vì `JOIN` sang `products`?
