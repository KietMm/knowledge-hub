---
title: Từ yêu cầu nghiệp vụ tới bảng
slug: tu-yeu-cau-toi-bang
summary: Nhận diện thực thể, thuộc tính và quan hệ — bước đầu tiên quyết định mọi thứ về sau.
level: co-ban
tags: [database, thiet-ke, erd]
---

> **Sau bài này bạn sẽ:** đọc một đoạn mô tả nghiệp vụ và vẽ ra được sơ đồ bảng hợp lý.

## Quy trình bốn bước

1. **Gạch chân danh từ** trong mô tả nghiệp vụ → ứng viên cho **bảng**.
2. **Gạch chân tính từ / thông tin mô tả** → ứng viên cho **cột**.
3. **Gạch chân động từ** nối các danh từ → ứng viên cho **quan hệ**.
4. Xác định **bản số** của mỗi quan hệ: một-một, một-nhiều, nhiều-nhiều.

## Ví dụ

> "Một **khách hàng** có thể đặt nhiều **đơn hàng**. Mỗi đơn hàng gồm nhiều **sản phẩm**, mỗi sản phẩm có **số lượng** và **giá tại thời điểm mua**. Sản phẩm thuộc một **danh mục**."

Danh từ → bảng: `khach_hang`, `don_hang`, `san_pham`, `danh_muc`.

Quan hệ:
- khách hàng — đơn hàng: **một-nhiều**
- đơn hàng — sản phẩm: **nhiều-nhiều** (một đơn nhiều sản phẩm, một sản phẩm ở nhiều đơn)
- danh mục — sản phẩm: **một-nhiều**

"Số lượng" và "giá tại thời điểm mua" không thuộc về `don_hang` cũng không thuộc `san_pham` — chúng thuộc về **mối quan hệ** giữa hai bảng. Đó là dấu hiệu chắc chắn cần một bảng trung gian.

## Ba loại quan hệ

### Một-nhiều — khoá ngoại ở bên "nhiều"

```sql
CREATE TABLE danh_muc (
  id   BIGSERIAL PRIMARY KEY,
  ten  TEXT NOT NULL UNIQUE
);

CREATE TABLE san_pham (
  id          BIGSERIAL PRIMARY KEY,
  danh_muc_id BIGINT NOT NULL REFERENCES danh_muc(id),
  ten         TEXT   NOT NULL
);
CREATE INDEX idx_san_pham_danh_muc ON san_pham (danh_muc_id);
```

### Nhiều-nhiều — bảng trung gian

```sql
CREATE TABLE chi_tiet_don (
  don_hang_id BIGINT NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
  san_pham_id BIGINT NOT NULL REFERENCES san_pham(id) ON DELETE RESTRICT,
  so_luong    INT    NOT NULL CHECK (so_luong > 0),
  gia_luc_mua NUMERIC(12,2) NOT NULL,          -- ảnh chụp, không phải tham chiếu
  PRIMARY KEY (don_hang_id, san_pham_id)
);
```

`gia_luc_mua` là chi tiết quan trọng: **không** lấy giá từ bảng `san_pham` khi hiển thị đơn cũ. Giá sản phẩm thay đổi theo thời gian; hoá đơn phải giữ giá tại thời điểm mua. Đây là ví dụ điển hình của việc "trùng lặp dữ liệu" **đúng** — vì hai giá trị đó có ý nghĩa khác nhau.

Hai `ON DELETE` khác nhau cũng có chủ ý: xoá đơn hàng thì xoá luôn chi tiết (`CASCADE`), nhưng không cho xoá sản phẩm đã từng được bán (`RESTRICT`).

### Một-một — hiếm, thường nên gộp

Chỉ tách khi: có nhiều cột hiếm dùng (tách để bảng chính gọn), hoặc phần dữ liệu nhạy cảm cần phân quyền riêng.

## Khoá chính: tự tăng, UUID hay ULID

| Loại | Ưu | Nhược |
|---|---|---|
| `BIGSERIAL` (tự tăng) | Nhỏ, index hiệu quả, dễ đọc | Đoán được, lộ quy mô, khó gộp dữ liệu nhiều nguồn |
| `UUID v4` | Sinh ở client, không đoán được | 16 byte, ngẫu nhiên nên index phân mảnh |
| `UUID v7` / ULID | Không đoán được **và** sắp theo thời gian | Ít công cụ hỗ trợ hơn |

Mặc định hợp lý: `BIGSERIAL` cho bảng nội bộ; UUID v7 khi id xuất hiện trên URL công khai hoặc dữ liệu đến từ nhiều nguồn.

**Luôn dùng khoá đại diện** (id không mang ý nghĩa nghiệp vụ) thay vì khoá tự nhiên (email, CMND, mã sản phẩm). Lý do: mọi thứ mang ý nghĩa nghiệp vụ đều có ngày thay đổi, và khi đó bạn phải cập nhật khoá ngoại ở mọi bảng.

## Đặt tên nhất quán

- Tên bảng: số ít hay số nhiều đều được — miễn **nhất quán** trong toàn dự án.
- Khoá ngoại: `<bang>_id` (`khach_hang_id`).
- Thời gian: `ngay_tao`, `ngay_cap_nhat`, hoặc `created_at`, `updated_at` — chọn một ngôn ngữ và giữ nguyên.
- Boolean: đặt tên khẳng định (`da_kich_hoat`), tránh phủ định (`khong_kich_hoat`) — điều kiện phủ định của phủ định rất khó đọc.

## Cột nên có ở gần như mọi bảng

```sql
id            BIGSERIAL PRIMARY KEY,
ngay_tao      TIMESTAMPTZ NOT NULL DEFAULT now(),
ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now()
```

Dùng `TIMESTAMPTZ` (có múi giờ), không dùng `TIMESTAMP`. Lưu mọi thứ ở UTC, chuyển sang giờ địa phương ở tầng hiển thị.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không có bảng trung gian cho nhiều-nhiều | Nhồi danh sách vào một cột | Tạo bảng nối |
| Dùng email làm khoá chính | Đổi email là sửa cả chục bảng | Khoá đại diện |
| Tham chiếu giá hiện tại cho đơn cũ | Hoá đơn cũ đổi giá theo | Lưu ảnh chụp giá |
| `TIMESTAMP` không múi giờ | Sai giờ khi đổi máy chủ | `TIMESTAMPTZ`, lưu UTC |
| `CASCADE` mọi khoá ngoại | Xoá một dòng mất cả cây dữ liệu | Mặc định `RESTRICT` |

## Ghi nhớ

- Danh từ → bảng, động từ → quan hệ, tính từ → cột.
- Thuộc tính của quan hệ ⇒ chắc chắn cần bảng trung gian.
- Khoá chính không mang ý nghĩa nghiệp vụ.
- Dữ liệu lịch sử cần ảnh chụp, không phải tham chiếu.

## Tự kiểm tra

1. Thiết kế bảng cho: "Sinh viên đăng ký nhiều lớp, mỗi đăng ký có ngày đăng ký và điểm".
2. Vì sao `gia_luc_mua` phải lưu riêng thay vì join sang `san_pham`?
3. Khi nào UUID tốt hơn khoá tự tăng?
