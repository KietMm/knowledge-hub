---
title: Chuẩn hoá và khi nào nên phá vỡ nó
slug: chuan-hoa-va-khi-nao-pha-vo
summary: Ba dạng chuẩn giải thích bằng ví dụ thật, và những trường hợp phi chuẩn hoá là lựa chọn đúng.
level: trung-cap
tags: [database, chuan-hoa, thiet-ke]
---

> **Sau bài này bạn sẽ:** nhận ra dữ liệu chưa chuẩn hoá qua các dị thường cập nhật, và biết khi nào cố tình trùng lặp là hợp lý.

## Vấn đề mà chuẩn hoá giải quyết

Bảng sai:

| don_id | khach_ten | khach_email | san_pham | gia |
|---|---|---|---|---|
| 1 | An | an@x.com | Áo, Quần | 100k, 200k |
| 2 | An | an@x.com | Áo | 100k |

Ba loại dị thường:

- **Cập nhật** — An đổi email, phải sửa mọi dòng. Sót một dòng là dữ liệu mâu thuẫn.
- **Chèn** — không thêm được khách hàng chưa có đơn nào.
- **Xoá** — xoá đơn cuối của An là mất luôn thông tin về An.

## 1NF — mỗi ô một giá trị

Vi phạm: `"Áo, Quần"` trong một ô.

```sql
-- Sai
san_pham TEXT   -- 'Áo, Quần'

-- Đúng: tách thành dòng riêng ở bảng chi tiết
CREATE TABLE chi_tiet_don (
  don_hang_id BIGINT, san_pham_id BIGINT, so_luong INT
);
```

Dấu hiệu vi phạm: bạn phải dùng `LIKE '%...%'` hoặc `split_part()` để tìm dữ liệu bên trong một ô.

## 2NF — không phụ thuộc một phần khoá

Chỉ liên quan khi khoá chính gồm nhiều cột.

```sql
-- Sai: ten_san_pham phụ thuộc san_pham_id, không phụ thuộc cả khoá (don_id, san_pham_id)
chi_tiet_don (don_id, san_pham_id, so_luong, ten_san_pham)

-- Đúng: ten_san_pham về bảng san_pham
chi_tiet_don (don_id, san_pham_id, so_luong)
san_pham (id, ten)
```

## 3NF — không phụ thuộc bắc cầu

```sql
-- Sai: ten_thanh_pho phụ thuộc thanh_pho_id, mà thanh_pho_id lại phụ thuộc id
khach_hang (id, ten, thanh_pho_id, ten_thanh_pho)

-- Đúng
khach_hang (id, ten, thanh_pho_id)
thanh_pho (id, ten)
```

Câu tóm tắt kinh điển: *mọi cột không khoá phải phụ thuộc vào khoá, toàn bộ khoá, và không gì ngoài khoá.*

Trong thực tế, 3NF là đủ cho gần như mọi hệ thống nghiệp vụ. Các dạng chuẩn cao hơn (BCNF, 4NF) hiếm khi cần tới.

## Khi nào cố tình phi chuẩn hoá

Chuẩn hoá tối ưu cho **tính đúng đắn**. Đôi khi phải đánh đổi lấy tốc độ đọc — nhưng chỉ khi có lý do đo được:

**1. Ảnh chụp dữ liệu lịch sử** (không phải phi chuẩn hoá thật sự):
```sql
chi_tiet_don (..., gia_luc_mua NUMERIC)   -- giá đã đổi cũng không ảnh hưởng hoá đơn cũ
```

**2. Cột đếm sẵn** cho bảng đọc rất nhiều:
```sql
bai_viet (..., so_binh_luan INT NOT NULL DEFAULT 0)
```
Đổi lại: phải cập nhật ở mọi nơi thêm/xoá bình luận. Dùng trigger hoặc cập nhật trong cùng transaction để không lệch. Chỉ làm khi `COUNT(*)` đã thật sự chậm.

**3. Materialized view** cho báo cáo nặng:
```sql
CREATE MATERIALIZED VIEW doanh_thu_thang AS
SELECT DATE_TRUNC('month', ngay_dat) AS thang, SUM(tong_tien) AS tong
FROM don_hang GROUP BY 1;

REFRESH MATERIALIZED VIEW CONCURRENTLY doanh_thu_thang;
```
Đây là cách phi chuẩn hoá **sạch nhất**: dữ liệu gốc vẫn chuẩn, bản tổng hợp tách riêng và dựng lại được bất cứ lúc nào.

**4. JSONB cho thuộc tính thưa và thay đổi liên tục:**
```sql
san_pham (id, ten, gia, thuoc_tinh JSONB)   -- màu áo, dung lượng pin, số trang sách...
```
Ranh giới: dữ liệu bạn cần `JOIN`, ràng buộc, hoặc lọc thường xuyên thì phải là **cột thật**. JSONB cho phần còn lại.

## Nguyên tắc

> Chuẩn hoá trước. Phi chuẩn hoá sau, chỉ khi có số đo, và luôn ghi lại lý do.

Phi chuẩn hoá sớm là một trong những cách chắc chắn nhất tạo ra dữ liệu mâu thuẫn — mà dữ liệu sai thì không có bản vá nào sửa được về sau.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Danh sách trong một ô (CSV) | Không query, không ràng buộc được | Tách bảng con |
| Sao chép tên/email sang bảng khác | Dữ liệu mâu thuẫn theo thời gian | Chỉ lưu khoá ngoại |
| Phi chuẩn hoá "cho nhanh" từ đầu | Bug dữ liệu, không đo được lợi ích | Chuẩn hoá trước, đo sau |
| Cột đếm không cập nhật đồng bộ | Số hiển thị sai | Trigger hoặc cùng transaction |
| Nhét mọi thứ vào JSONB | Mất ràng buộc và index | Cột thật cho dữ liệu quan trọng |

## Ghi nhớ

- 1NF: mỗi ô một giá trị. 2NF: không phụ thuộc một phần khoá. 3NF: không phụ thuộc bắc cầu.
- 3NF đủ cho gần như mọi hệ thống nghiệp vụ.
- Lưu ảnh chụp dữ liệu lịch sử không phải là vi phạm chuẩn hoá.
- Materialized view là cách phi chuẩn hoá an toàn nhất.

## Tự kiểm tra

1. Bảng `don_hang(id, khach_ten, khach_email, tinh_thanh, ma_vung)` vi phạm dạng chuẩn nào?
2. Vì sao lưu `gia_luc_mua` không phải là trùng lặp dữ liệu sai?
3. Khi nào nên thêm cột `so_binh_luan` thay vì đếm bằng `COUNT(*)`?
