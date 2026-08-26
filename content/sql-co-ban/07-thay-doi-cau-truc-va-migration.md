---
title: DDL và migration
slug: thay-doi-cau-truc-va-migration
summary: CREATE/ALTER TABLE, ràng buộc, và cách đổi cấu trúc bảng đang chạy production mà không gây downtime.
level: nang-cao
tags: [sql, ddl, migration]
khung: v2
---

> **Sau bài này bạn sẽ:** biết thao tác nào **khoá bảng** trước khi chạy nó lên production, và dùng được mẫu expand–contract để đổi cấu trúc không downtime.

## Ý tưởng chính

Đổi cấu trúc bảng trên máy dev là chuyện vài giây. Trên bảng 50 triệu dòng đang phục vụ người dùng, **cùng câu lệnh đó có thể khoá bảng 20 phút** — và cả hệ thống đứng.

Nên với migration, câu hỏi quan trọng nhất không phải *"lệnh này có chạy được không"*, mà: ***"lệnh này khoá bảng bao lâu?"***

## Mental model

Hãy nghĩ tới **sửa đường đang có xe chạy**.

> **Thêm làn mới** — làm bên cạnh, xe vẫn chạy. Nhanh, an toàn.
>
> **Bóc toàn bộ mặt đường lên rải lại** — phải chặn đường. Xe xếp hàng, càng lâu càng tắc.
>
> **Đổi hẳn hướng lưu thông** — không thể làm trong một đêm. Phải mở đường mới, cho xe đi song song, rồi mới đóng đường cũ.

Ba tình huống đó tương ứng chính xác với ba loại migration, và cái thứ ba chính là mẫu **expand–contract**.

## Ví dụ nhỏ

```sql
-- ✅ Nhanh: chỉ ghi metadata, không đụng dữ liệu
ALTER TABLE don_hang ADD COLUMN ghi_chu TEXT;

-- ❌ Chậm: phải ghi lại TOÀN BỘ dòng
ALTER TABLE don_hang ADD COLUMN trang_thai TEXT NOT NULL DEFAULT 'moi';
-- (ở Postgres cũ; từ 11+ đã tối ưu, nhưng MySQL vẫn viết lại bảng)
```

## Code chạy thế nào

**Bảng phân loại theo mức khoá** — bảng cần thuộc trước khi viết migration:

```text
✅ NHANH (chỉ đổi metadata)
   ADD COLUMN không có DEFAULT, cho phép NULL
   DROP COLUMN
   RENAME COLUMN / RENAME TABLE
   ADD INDEX CONCURRENTLY          ← Postgres

⚠️ KHOÁ NGẮN nhưng cần chờ giao dịch đang chạy
   ADD CONSTRAINT ... NOT VALID    ← rồi VALIDATE riêng
   ALTER COLUMN DROP NOT NULL

❌ VIẾT LẠI CẢ BẢNG — có thể hàng chục phút
   ALTER COLUMN ... TYPE  (đổi kiểu)
   ADD COLUMN ... NOT NULL DEFAULT  (trên CSDL cũ)
   ADD CONSTRAINT ... (không có NOT VALID)
   CREATE INDEX (không có CONCURRENTLY)
```

Mấu chốt: **`CREATE INDEX` bình thường khoá bảng khỏi mọi lệnh ghi**. Trên bảng lớn, đó là sự cố.

```sql
CREATE INDEX CONCURRENTLY idx_don_khach ON don_hang (khach_id);
-- Chậm hơn, nhưng KHÔNG khoá ghi.
-- Đổi lại: không chạy được trong transaction, và có thể để lại index hỏng nếu lỗi
--          → kiểm bằng: SELECT * FROM pg_index WHERE NOT indisvalid;
```

Tương tự với ràng buộc:

```sql
-- Hai bước: thêm ràng buộc mà chưa kiểm dữ liệu cũ, rồi kiểm riêng
ALTER TABLE don ADD CONSTRAINT ck_tien CHECK (tien >= 0) NOT VALID;
ALTER TABLE don VALIDATE CONSTRAINT ck_tien;   -- ← chỉ khoá đọc nhẹ
```

## Cú pháp

**Expand–contract — đổi cấu trúc không downtime.** Ví dụ: tách `ho_ten` thành `ho` và `ten`.

```text
① EXPAND    Thêm cột mới, GIỮ cột cũ
            ALTER TABLE nguoi_dung ADD COLUMN ho TEXT, ADD COLUMN ten TEXT;

② GHI CẢ HAI   Deploy code ghi vào CẢ cột cũ lẫn cột mới, đọc từ cột CŨ
               ⇒ lúc này rollback vẫn an toàn

③ CHUYỂN DỮ LIỆU  Cập nhật theo lô cho dữ liệu cũ (xem phần dưới)

④ ĐỔI NGUỒN ĐỌC   Deploy code đọc từ cột MỚI, vẫn ghi cả hai
                  ⇒ chạy vài ngày để chắc chắn

⑤ CONTRACT   Ngừng ghi cột cũ → deploy → rồi mới DROP COLUMN ho_ten
```

Năm bước, **năm lần deploy**, và mỗi bước đều **quay lui được**. Đó là toàn bộ giá trị: không có khoảnh khắc nào hệ thống ở trạng thái không thể lùi.

Ai làm một bước (`ALTER TABLE ... RENAME`) sẽ có vài phút mà code cũ và cấu trúc mới không khớp — với ứng dụng nhiều instance, deploy không bao giờ tức thời.

**Cập nhật dữ liệu lớn theo lô:**

```sql
-- ❌ Một lệnh cho 50 triệu dòng: khoá lâu, transaction khổng lồ, có thể hết bộ nhớ
UPDATE nguoi_dung SET ho = split_part(ho_ten, ' ', 1);

-- ✅ Theo lô, mỗi lô một transaction ngắn
UPDATE nguoi_dung SET ho = split_part(ho_ten, ' ', 1)
WHERE id IN (SELECT id FROM nguoi_dung WHERE ho IS NULL LIMIT 10000);
-- lặp lại tới khi không còn dòng nào
```

## Tại sao cần nó

Vì **mọi migration phải quay lui được** — và điều đó phải thiết kế trước, không phải xử lý sau:

```sql
-- migrations/001_them_cot_ghi_chu.sql
-- UP
ALTER TABLE don_hang ADD COLUMN ghi_chu TEXT;

-- DOWN
ALTER TABLE don_hang DROP COLUMN ghi_chu;
```

Ba nguyên tắc:

```text
① Mỗi migration làm MỘT việc — lỗi thì biết lỗi ở đâu
② Không bao giờ SỬA migration đã chạy trên production — viết cái mới
③ Migration xoá dữ liệu thì KHÔNG quay lui được
   ⇒ tách thành hai lần deploy cách nhau vài ngày
```

Nguyên tắc ③ đáng nhớ: `DROP COLUMN` là thao tác **một chiều**. Sau khi drop, dữ liệu trong cột đó biến mất — `DOWN` chỉ tạo lại cột rỗng. Vì vậy expand–contract để bước drop ở **cuối cùng**, sau khi đã chắc chắn không cần lùi.

Tạo bảng với ràng buộc đầy đủ ngay từ đầu — rẻ hơn nhiều so với thêm sau:

```sql
CREATE TABLE don_hang (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_id    UUID NOT NULL REFERENCES khach(id) ON DELETE RESTRICT,
  tien        BIGINT NOT NULL CHECK (tien >= 0),        -- đơn vị đồng
  trang_thai  TEXT NOT NULL DEFAULT 'moi'
              CHECK (trang_thai IN ('moi','dang_giao','da_giao','huy')),
  tao_luc     TIMESTAMPTZ NOT NULL DEFAULT NOW(),       -- TZ, không phải TIMESTAMP
  UNIQUE (khach_id, ma_don)
);
CREATE INDEX ON don_hang (khach_id);       -- khoá ngoại KHÔNG tự có index
```

## So sánh

| Thao tác | Trên bảng 50 triệu dòng |
|---|---|
| `ADD COLUMN` (nullable) | Vài mili giây |
| `ADD COLUMN NOT NULL DEFAULT` | Postgres 11+: nhanh; MySQL: viết lại bảng |
| `CREATE INDEX` | Khoá ghi hàng phút |
| `CREATE INDEX CONCURRENTLY` | Không khoá, chậm hơn ~2 lần |
| `ALTER COLUMN TYPE` | Viết lại bảng — dùng expand–contract |
| `DROP COLUMN` | Nhanh (chỉ đánh dấu), nhưng **không lùi được** |

## Dễ nhầm

**1. Chạy `CREATE INDEX` không có `CONCURRENTLY` trên production.** Khoá ghi và gây sự cố.

**2. Đổi kiểu cột trực tiếp.** Viết lại cả bảng — dùng expand–contract.

**3. `UPDATE` toàn bảng trong một lệnh.** Transaction khổng lồ, khoá lâu, có thể tràn WAL.

**4. Sửa migration đã chạy trên production.** Máy chủ đã chạy bản cũ; sửa file không đổi được quá khứ, và lần chạy tiếp theo ở môi trường khác sẽ ra kết quả khác.

**5. Migration không có `DOWN`.** Deploy hỏng lúc 2 giờ sáng và không có đường lùi.

**6. Dùng `TIMESTAMP` thay vì `TIMESTAMPTZ`.** Không có múi giờ, và bạn sẽ mất vài ngày để tìm ra vì sao báo cáo lệch 7 tiếng.

**7. Quên index cho khoá ngoại.** Xem [[index-va-hieu-nang-truy-van]].

**8. Deploy code mới và migration cùng lúc.** Trong lúc deploy, một số instance chạy code cũ. Code cũ phải chạy được với cấu trúc mới — đó chính là lý do expand–contract tồn tại.

## Mẹo nhớ

> **Câu hỏi đầu tiên của mọi migration: lệnh này KHOÁ BẢNG bao lâu?**
>
> **Expand → ghi cả hai → chuyển dữ liệu → đổi nguồn đọc → contract.**
>
> **`DROP` là thao tác một chiều — để nó ở lần deploy cuối cùng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba nhóm thao tác DDL theo mức khoá, mỗi nhóm một ví dụ?
2. `CREATE INDEX CONCURRENTLY` đánh đổi cái gì?
3. Năm bước của expand–contract, và vì sao cần **năm lần deploy**?
4. Vì sao không được sửa migration đã chạy trên production?
5. Vì sao code cũ phải chạy được với cấu trúc mới?

## Tự viết lại

Không nhìn lại phần trên, lập kế hoạch migration cho:

```text
Đổi cột `gia` từ INTEGER (nghìn đồng) sang BIGINT (đồng), nhân giá trị lên 1000.
Bảng có 20 triệu dòng, hệ thống chạy 24/7 với 6 instance ứng dụng.
```

Tự kiểm: kế hoạch của bạn có mấy lần deploy, và **ở bước nào** thì việc quay lui không còn an toàn?

## Thử sức

Bạn chạy `ALTER TABLE don_hang ADD COLUMN trang_thai TEXT NOT NULL DEFAULT 'moi'` lúc 10 giờ sáng. Hệ thống đứng 12 phút, mọi request timeout.

Giải thích **chính xác** chuyện gì đã xảy ra ở tầng cơ sở dữ liệu. Rồi nêu cách làm đúng — và câu khó hơn: bạn **kiểm tra trước** bằng cách nào để biết một migration sẽ khoá bảng, **trước khi** chạy nó lên production?
