---
title: DDL và migration
slug: thay-doi-cau-truc-va-migration
summary: CREATE/ALTER TABLE, ràng buộc, và cách đổi cấu trúc bảng đang chạy production mà không gây downtime.
level: nang-cao
tags: [sql, ddl, migration]
---

> **Sau bài này bạn sẽ:** viết được migration chạy được cả tiến lẫn lùi, và biết thao tác DDL nào khoá bảng.

## Tạo bảng với ràng buộc đầy đủ

```sql
CREATE TABLE don_hang (
  id            BIGSERIAL PRIMARY KEY,
  ma_don        TEXT        NOT NULL UNIQUE,
  khach_hang_id BIGINT      NOT NULL REFERENCES khach_hang(id) ON DELETE RESTRICT,
  tong_tien     NUMERIC(12,2) NOT NULL CHECK (tong_tien >= 0),
  trang_thai    TEXT        NOT NULL DEFAULT 'cho'
                            CHECK (trang_thai IN ('cho','xac_nhan','giao','xong','huy')),
  ghi_chu       TEXT,
  ngay_dat      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Mỗi ràng buộc ở đây ngăn một loại dữ liệu rác. Ràng buộc ở tầng CSDL đáng giá hơn kiểm tra ở tầng ứng dụng vì nó đúng với **mọi** đường ghi vào — kể cả script sửa tay lúc 2 giờ sáng.

`ON DELETE`:

| Lựa chọn | Khi xoá bản ghi cha |
|---|---|
| `RESTRICT` / `NO ACTION` | Từ chối nếu còn con — mặc định an toàn |
| `CASCADE` | Xoá luôn con — cẩn thận, dễ mất dữ liệu ngoài ý muốn |
| `SET NULL` | Đặt khoá ngoại thành NULL |

## ALTER TABLE

```sql
ALTER TABLE don_hang ADD COLUMN ma_giam_gia TEXT;
ALTER TABLE don_hang DROP COLUMN ghi_chu;
ALTER TABLE don_hang ALTER COLUMN ghi_chu SET NOT NULL;
ALTER TABLE don_hang RENAME COLUMN ghi_chu TO ghi_chu_noi_bo;
ALTER TABLE don_hang ADD CONSTRAINT chk_tien CHECK (tong_tien >= 0);
```

## Thao tác nào khoá bảng

Đây là phần quan trọng nhất khi làm việc với production. Trên PostgreSQL hiện đại:

| Thao tác | Ảnh hưởng |
|---|---|
| `ADD COLUMN` không có DEFAULT | Nhanh, không viết lại bảng |
| `ADD COLUMN ... DEFAULT hằng số` | Nhanh (PG11+) |
| `ADD COLUMN ... DEFAULT hàm biến động` | **Viết lại toàn bộ bảng** |
| `ALTER COLUMN TYPE` | Thường viết lại bảng |
| `SET NOT NULL` | Quét toàn bảng |
| `CREATE INDEX` | **Khoá ghi** trên bảng |
| `CREATE INDEX CONCURRENTLY` | Không khoá ghi, chậm hơn |

Với bảng lớn đang chạy, luôn dùng `CREATE INDEX CONCURRENTLY`. Đổi lại: không chạy được trong transaction, và nếu hỏng sẽ để lại index không hợp lệ cần dọn tay.

Luôn đặt timeout để một migration kẹt không làm nghẽn cả hệ thống:

```sql
SET lock_timeout = '5s';
SET statement_timeout = '30s';
```

## Migration có thể quay lui

Mỗi migration là một file có số thứ tự, gồm phần tiến và phần lùi:

```sql
-- 20260818_120000_them_ma_giam_gia.up.sql
ALTER TABLE don_hang ADD COLUMN ma_giam_gia TEXT;
CREATE INDEX CONCURRENTLY idx_don_hang_ma_giam_gia ON don_hang (ma_giam_gia);

-- 20260818_120000_them_ma_giam_gia.down.sql
DROP INDEX CONCURRENTLY IF EXISTS idx_don_hang_ma_giam_gia;
ALTER TABLE don_hang DROP COLUMN IF EXISTS ma_giam_gia;
```

Quy tắc: **migration đã chạy trên production thì không bao giờ sửa nội dung**. Cần thay đổi thì viết migration mới. Sửa file cũ khiến các môi trường lệch nhau mà không ai phát hiện.

## Expand–contract: đổi cấu trúc không downtime

Đổi tên cột trực tiếp làm hỏng phiên bản code đang chạy. Chia thành ba lần triển khai:

**1. Expand** — thêm cái mới, giữ cái cũ:
```sql
ALTER TABLE nguoi_dung ADD COLUMN ho_ten_day_du TEXT;
UPDATE nguoi_dung SET ho_ten_day_du = ho || ' ' || ten WHERE ho_ten_day_du IS NULL;
```
Code mới ghi vào **cả hai** cột, đọc từ cột mới nếu có.

**2. Migrate** — chép nốt dữ liệu còn lại theo lô, kiểm tra khớp.

**3. Contract** — sau khi chắc chắn không còn code nào dùng cột cũ:
```sql
ALTER TABLE nguoi_dung DROP COLUMN ho, DROP COLUMN ten;
```

Chậm hơn, nhưng không có phút nào hệ thống hỏng.

## Cập nhật dữ liệu lớn theo lô

`UPDATE` 10 triệu dòng trong một lệnh sẽ giữ khoá rất lâu và làm phình WAL. Chia lô:

```sql
DO $$
DECLARE so_dong INT;
BEGIN
  LOOP
    UPDATE don_hang SET trang_thai = 'xong'
    WHERE id IN (SELECT id FROM don_hang WHERE trang_thai = 'hoan_tat' LIMIT 5000);
    GET DIAGNOSTICS so_dong = ROW_COUNT;
    EXIT WHEN so_dong = 0;
    COMMIT;
  END LOOP;
END $$;
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `CREATE INDEX` trên bảng lớn production | Khoá ghi, hệ thống đứng | `CONCURRENTLY` |
| Sửa migration đã chạy | Các môi trường lệch nhau | Viết migration mới |
| Đổi tên cột trong một lần deploy | Code cũ hỏng ngay | Expand–contract |
| `UPDATE` toàn bảng một lệnh | Khoá lâu, phình WAL | Chia lô |
| Không có phần `down` | Không quay lui được khi sự cố | Viết cả hai chiều |

## Ghi nhớ

- Ràng buộc ở tầng CSDL bảo vệ mọi đường ghi, không chỉ đường qua ứng dụng.
- `CREATE INDEX CONCURRENTLY` cho bảng đang chạy.
- Migration đã chạy production là bất biến.
- Thay đổi phá vỡ tương thích ⇒ expand–contract qua nhiều lần triển khai.

## Tự kiểm tra

1. Vì sao `ADD COLUMN ... DEFAULT now()` nguy hiểm hơn `DEFAULT 'cho'`?
2. Đổi `email` từ nullable sang `NOT NULL` trên bảng 50 triệu dòng — các bước?
3. Vì sao không được sửa file migration đã chạy trên production?
