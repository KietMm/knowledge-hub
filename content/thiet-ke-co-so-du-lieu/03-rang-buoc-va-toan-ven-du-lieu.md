---
title: Ràng buộc và toàn vẹn dữ liệu
slug: rang-buoc-va-toan-ven-du-lieu
summary: NOT NULL, UNIQUE, CHECK, FOREIGN KEY — hàng rào cuối cùng bảo vệ dữ liệu khỏi mọi đường ghi.
level: trung-cap
tags: [database, rang-buoc, toan-ven]
---

> **Sau bài này bạn sẽ:** đặt ràng buộc ở đúng tầng, và hiểu vì sao validate ở ứng dụng không thay thế được ràng buộc ở CSDL.

## Vì sao ràng buộc phải ở tầng CSDL

Dữ liệu vào bảng qua nhiều đường: ứng dụng web, ứng dụng mobile, script nhập liệu, công cụ quản trị, và những lệnh `UPDATE` gõ tay lúc xử lý sự cố. Validate ở ứng dụng chỉ bảo vệ **một** trong số đó.

Ràng buộc ở CSDL là hàng rào cuối cùng, đúng với mọi đường ghi, và nó **không bao giờ quên**.

Điều này không có nghĩa bỏ validate ở ứng dụng — nó cho thông báo lỗi thân thiện và bắt lỗi sớm. Hai tầng phục vụ hai mục đích khác nhau.

## NOT NULL

Mặc định nên là `NOT NULL`; chỉ cho phép NULL khi "không có giá trị" thật sự là một trạng thái nghiệp vụ có nghĩa.

```sql
ten           TEXT NOT NULL,
ngay_hoan_thanh TIMESTAMPTZ,          -- NULL = chưa hoàn thành, có nghĩa rõ ràng
```

NULL lan truyền qua mọi phép tính (`NULL + 1 = NULL`) và làm mọi so sánh trả về UNKNOWN. Mỗi cột nullable là một nhánh logic bạn phải xử lý mãi mãi.

## UNIQUE

```sql
email TEXT NOT NULL UNIQUE,

-- Duy nhất theo tổ hợp
CONSTRAINT uq_dang_ky UNIQUE (sinh_vien_id, lop_id),

-- Duy nhất có điều kiện (partial index) — mỗi user chỉ một địa chỉ mặc định
CREATE UNIQUE INDEX uq_dia_chi_mac_dinh
  ON dia_chi (nguoi_dung_id) WHERE la_mac_dinh;
```

Lưu ý: theo chuẩn SQL, nhiều dòng cùng có `NULL` **không** vi phạm `UNIQUE` — NULL không bằng NULL. Nếu cần chặn, dùng `NULLS NOT DISTINCT` (Postgres 15+) hoặc đặt `NOT NULL`.

## CHECK

```sql
gia        NUMERIC(12,2) NOT NULL CHECK (gia >= 0),
tuoi       INT CHECK (tuoi BETWEEN 0 AND 150),
trang_thai TEXT NOT NULL CHECK (trang_thai IN ('cho','chay','xong','huy')),
email      TEXT CHECK (email LIKE '%@%'),

-- Ràng buộc giữa nhiều cột trong cùng dòng
CONSTRAINT chk_ngay CHECK (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= ngay_bat_dau)
```

`CHECK` chỉ nhìn thấy **dòng hiện tại** — không kiểm tra được điều kiện liên quan tới dòng khác hay bảng khác. Việc đó cần trigger hoặc xử lý ở tầng ứng dụng trong transaction.

### CHECK hay bảng tham chiếu?

| | `CHECK (IN (...))` | Bảng tham chiếu + FK |
|---|---|---|
| Thêm giá trị mới | Cần migration | Chỉ `INSERT` một dòng |
| Kèm dữ liệu phụ (nhãn, thứ tự, màu) | Không | Có |
| Đơn giản | Có | Thêm một bảng |

Danh sách ổn định và ngắn (`'nam'/'nu'/'khac'`) ⇒ `CHECK`. Danh sách sẽ mở rộng và cần hiển thị nhãn ⇒ bảng tham chiếu.

## FOREIGN KEY

```sql
khach_hang_id BIGINT NOT NULL
  REFERENCES khach_hang(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE
```

Khoá ngoại ngăn "dòng mồ côi" — chi tiết đơn trỏ tới đơn hàng không tồn tại.

Ba lưu ý thực tế:

1. Nhiều CSDL (kể cả Postgres) **không tự tạo index** cho cột khoá ngoại. Thiếu index, mỗi lần xoá dòng cha phải quét toàn bảng con.
2. `ON DELETE CASCADE` tiện nhưng nguy hiểm: xoá một danh mục có thể xoá hàng nghìn sản phẩm mà không cảnh báo. Mặc định nên là `RESTRICT`.
3. Với dữ liệu cần giữ lịch sử, cân nhắc **xoá mềm** (`ngay_xoa TIMESTAMPTZ`) thay vì xoá thật.

## Xoá mềm

```sql
ALTER TABLE san_pham ADD COLUMN ngay_xoa TIMESTAMPTZ;

CREATE VIEW san_pham_hien_hanh AS
SELECT * FROM san_pham WHERE ngay_xoa IS NULL;
```

Đổi lại: **mọi** truy vấn phải nhớ lọc `ngay_xoa IS NULL`. Dùng view hoặc lớp truy cập dữ liệu để không ai quên. Và `UNIQUE(email)` sẽ chặn việc tạo lại tài khoản với email cũ — cần `UNIQUE (email) WHERE ngay_xoa IS NULL`.

## Tự động cập nhật `ngay_cap_nhat`

```sql
CREATE OR REPLACE FUNCTION cap_nhat_thoi_gian() RETURNS TRIGGER AS $$
BEGIN
  NEW.ngay_cap_nhat = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_don_hang_cap_nhat
BEFORE UPDATE ON don_hang
FOR EACH ROW EXECUTE FUNCTION cap_nhat_thoi_gian();
```

Đặt ở CSDL nghĩa là script sửa tay cũng cập nhật đúng — thứ mà code ứng dụng không đảm bảo được.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Chỉ validate ở ứng dụng | Script/công cụ khác ghi rác vào | Thêm ràng buộc CSDL |
| Mọi cột nullable | Logic đầy nhánh `IS NULL` | `NOT NULL` mặc định |
| `CASCADE` mọi khoá ngoại | Xoá dây chuyền ngoài ý muốn | `RESTRICT` mặc định |
| Quên index cho khoá ngoại | Xoá dòng cha quét toàn bảng con | Đánh index thủ công |
| Xoá mềm mà quên lọc | Dữ liệu đã xoá vẫn hiện | View hoặc lớp truy cập chung |

## Ghi nhớ

- Ràng buộc CSDL đúng với mọi đường ghi; validate ứng dụng chỉ đúng với một đường.
- `NOT NULL` là mặc định; nullable phải có lý do nghiệp vụ.
- `RESTRICT` an toàn hơn `CASCADE`.
- Khoá ngoại cần index thủ công.

## Tự kiểm tra

1. Vì sao validate bằng zod ở Server Action không thay thế được `CHECK` trong CSDL?
2. Khi nào chọn `CHECK (IN ...)` và khi nào chọn bảng tham chiếu?
3. Xoá mềm gây ra vấn đề gì với ràng buộc `UNIQUE(email)`? Sửa thế nào?
