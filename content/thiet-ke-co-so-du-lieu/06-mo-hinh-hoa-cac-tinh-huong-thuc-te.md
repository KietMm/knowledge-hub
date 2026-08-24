---
title: Mô hình hoá các tình huống thực tế
slug: mo-hinh-hoa-cac-tinh-huong-thuc-te
summary: Cây phân cấp, đa hình, phiên bản, audit log và multi-tenant — năm bài toán lặp lại ở mọi hệ thống.
level: nang-cao
tags: [database, thiet-ke, mo-hinh]
---

> **Sau bài này bạn sẽ:** có sẵn phương án cho những bài toán thiết kế xuất hiện ở gần như mọi dự án.

## 1. Cây phân cấp

Danh mục nhiều cấp, sơ đồ tổ chức, bình luận lồng nhau.

**Adjacency list** — đơn giản nhất:
```sql
danh_muc (id, ten, cha_id REFERENCES danh_muc(id))
```
Đọc con trực tiếp: dễ. Đọc cả cây: cần CTE đệ quy. Đây là lựa chọn mặc định đúng cho hầu hết trường hợp.

**Materialized path** — nhanh khi đọc cả nhánh:
```sql
danh_muc (id, ten, duong_dan TEXT)   -- '/1/5/12/'
WHERE duong_dan LIKE '/1/5/%'        -- toàn bộ nhánh, một truy vấn
```
Đổi lại: chuyển nhánh phải cập nhật đường dẫn của mọi con cháu.

**Closure table** — mạnh nhất, tốn chỗ nhất:
```sql
quan_he (to_tien_id, con_chau_id, khoang_cach)
```
Mọi câu hỏi về cây trả lời bằng một JOIN, nhưng số dòng tăng theo bình phương độ sâu.

Chọn: mặc định adjacency list; đổi sang materialized path khi truy vấn "cả nhánh" trở thành nút thắt.

## 2. Quan hệ đa hình

"Bình luận gắn được vào bài viết, video, hoặc sản phẩm."

**Cách sai** — không ràng buộc được:
```sql
binh_luan (id, doi_tuong_loai TEXT, doi_tuong_id BIGINT)
```
CSDL không có cách nào đảm bảo `doi_tuong_id` trỏ tới dòng có thật.

**Cách đúng** — cột khoá ngoại riêng, chỉ một cột khác NULL:
```sql
CREATE TABLE binh_luan (
  id          BIGSERIAL PRIMARY KEY,
  noi_dung    TEXT NOT NULL,
  bai_viet_id BIGINT REFERENCES bai_viet(id),
  video_id    BIGINT REFERENCES video(id),
  san_pham_id BIGINT REFERENCES san_pham(id),
  CONSTRAINT chk_mot_doi_tuong CHECK (
    (bai_viet_id IS NOT NULL)::int +
    (video_id    IS NOT NULL)::int +
    (san_pham_id IS NOT NULL)::int = 1
  )
);
```

**Cách đúng thứ hai** — bảng cha chung:
```sql
noi_dung (id, loai)                      -- bảng gốc
bai_viet (noi_dung_id PRIMARY KEY REFERENCES noi_dung(id), ...)
binh_luan (id, noi_dung_id REFERENCES noi_dung(id), ...)
```
Sạch về mặt mô hình, đổi lại thêm một lần JOIN ở mọi truy vấn.

## 3. Lịch sử phiên bản

**Bảng lịch sử riêng** — cách phổ biến nhất:
```sql
bai_viet         (id, tieu_de, noi_dung, phien_ban INT, ngay_cap_nhat)
bai_viet_lich_su (id, bai_viet_id, tieu_de, noi_dung, phien_ban, ngay_luu, nguoi_sua_id)
```
Trigger `BEFORE UPDATE` chép bản cũ sang bảng lịch sử. Bảng chính vẫn gọn và nhanh.

**Temporal table** — mỗi dòng có khoảng hiệu lực:
```sql
gia_san_pham (san_pham_id, gia, hieu_luc TSTZRANGE,
  EXCLUDE USING GIST (san_pham_id WITH =, hieu_luc WITH &&))
```
Truy vấn "giá tại thời điểm X" trở nên tự nhiên: `WHERE hieu_luc @> '2026-01-15'::timestamptz`.

## 4. Audit log

```sql
CREATE TABLE nhat_ky (
  id           BIGSERIAL PRIMARY KEY,
  bang         TEXT        NOT NULL,
  ban_ghi_id   TEXT        NOT NULL,
  hanh_dong    TEXT        NOT NULL CHECK (hanh_dong IN ('them','sua','xoa')),
  nguoi_dung_id BIGINT,
  gia_tri_cu   JSONB,
  gia_tri_moi  JSONB,
  thoi_diem    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nhat_ky_ban_ghi ON nhat_ky (bang, ban_ghi_id, thoi_diem DESC);
```

Bảng này chỉ **thêm**, không bao giờ sửa hay xoá — đó là điều làm nó đáng tin. Nó lớn rất nhanh, nên hãy phân vùng theo tháng và có chính sách lưu trữ ngay từ đầu.

Cân nhắc: ghi log bằng trigger (bắt được cả thay đổi từ script sửa tay) hay từ tầng ứng dụng (biết được ai làm và trong ngữ cảnh nào). Nhiều hệ thống dùng cả hai cho các mục đích khác nhau.

## 5. Multi-tenant

| Cách | Cô lập | Chi phí vận hành |
|---|---|---|
| Cột `tenant_id` chung bảng | Thấp — phụ thuộc code | Thấp nhất |
| Schema riêng mỗi tenant | Trung bình | Trung bình |
| Database riêng mỗi tenant | Cao nhất | Cao nhất |

Với cách phổ biến nhất (cột `tenant_id`), rủi ro lớn nhất là **quên điều kiện lọc** ở một truy vấn — dữ liệu khách hàng này lộ sang khách hàng khác. Postgres có Row Level Security để chốt ở tầng CSDL:

```sql
ALTER TABLE don_hang ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON don_hang
  USING (tenant_id = current_setting('app.tenant_id')::bigint);
```

Giờ dù truy vấn quên `WHERE tenant_id = ...`, CSDL vẫn chỉ trả về dữ liệu đúng tenant. Đây là ví dụ tốt nhất cho nguyên tắc "đặt ràng buộc ở tầng thấp nhất có thể".

Nhớ đưa `tenant_id` vào **mọi** index tổ hợp, đặt ở vị trí đầu tiên.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đa hình bằng `(loai, id)` | Không ràng buộc, dữ liệu mồ côi | Cột FK riêng + CHECK |
| Closure table cho cây nhỏ | Phức tạp không cần thiết | Adjacency list |
| Lịch sử lưu chung bảng chính | Bảng phình, truy vấn chậm | Tách bảng lịch sử |
| Audit log không phân vùng | Bảng khổng lồ, backup chậm | Phân vùng theo tháng |
| Multi-tenant chỉ lọc ở code | Một chỗ quên là lộ dữ liệu | Row Level Security |

## Ghi nhớ

- Adjacency list là mặc định cho cây; đổi khi có nút thắt cụ thể.
- Đa hình phải giữ được khoá ngoại thật.
- Audit log chỉ thêm, phân vùng theo thời gian.
- Cô lập tenant nên được đảm bảo ở tầng CSDL, không chỉ ở code.

## Tự kiểm tra

1. Bình luận gắn vào ba loại nội dung — thiết kế bảng và giải thích lựa chọn.
2. Lưu lịch sử giá sản phẩm để truy vấn được "giá ngày 15/1" — dùng mô hình nào?
3. Vì sao Row Level Security an toàn hơn việc luôn nhớ thêm `WHERE tenant_id`?
