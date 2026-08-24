---
title: GROUP BY và hàm tổng hợp
slug: group-by-va-ham-tong-hop
summary: Gộp dòng thành nhóm, phân biệt WHERE với HAVING, và bẫy COUNT với NULL.
level: co-ban
tags: [sql, group-by, aggregate]
---

> **Sau bài này bạn sẽ:** viết được báo cáo thống kê đúng, và giải thích được vì sao `COUNT(cot)` khác `COUNT(*)`.

## Gộp nhóm

```sql
SELECT danh_muc,
       COUNT(*)        AS so_san_pham,
       AVG(gia)        AS gia_trung_binh,
       MIN(gia)        AS re_nhat,
       MAX(gia)        AS dat_nhat,
       SUM(ton_kho)    AS tong_ton
FROM san_pham
GROUP BY danh_muc;
```

Quy tắc bất di bất dịch: mọi cột trong `SELECT` phải hoặc nằm trong `GROUP BY`, hoặc nằm trong một hàm tổng hợp. Postgres báo lỗi nếu vi phạm; MySQL (chế độ lỏng) trả về giá trị ngẫu nhiên — nguy hiểm hơn nhiều vì bạn không biết mình sai.

## COUNT: ba dạng khác nhau

```sql
COUNT(*)              -- đếm DÒNG, kể cả dòng toàn NULL
COUNT(email)          -- đếm dòng có email KHÁC NULL
COUNT(DISTINCT email) -- đếm số email khác nhau
```

```sql
SELECT
  COUNT(*)                    AS tong_khach,      -- 1000
  COUNT(email)                AS co_email,        -- 850
  COUNT(DISTINCT thanh_pho)   AS so_thanh_pho     -- 63
FROM khach_hang;
```

Mọi hàm tổng hợp (trừ `COUNT(*)`) đều **bỏ qua NULL**. Điều này ảnh hưởng `AVG` rất mạnh: `AVG(diem)` trên 100 dòng mà 40 dòng NULL là trung bình của 60 dòng, không phải 100.

## WHERE và HAVING

```sql
SELECT danh_muc, COUNT(*) AS sl
FROM san_pham
WHERE ngay_tao >= '2026-01-01'    -- lọc TỪNG DÒNG, trước khi gộp
GROUP BY danh_muc
HAVING COUNT(*) > 10              -- lọc TỪNG NHÓM, sau khi gộp
ORDER BY sl DESC;
```

Nhớ theo thứ tự thực thi: `WHERE` chạy trước `GROUP BY`, `HAVING` chạy sau. Vì vậy `HAVING` dùng được hàm tổng hợp còn `WHERE` thì không.

Về hiệu năng: lọc được ở `WHERE` thì đừng để tới `HAVING` — lọc sớm nghĩa là gộp ít dòng hơn.

## FILTER: nhiều điều kiện trong một lần quét

```sql
SELECT
  danh_muc,
  COUNT(*) AS tong,
  COUNT(*) FILTER (WHERE trang_thai = 'con_hang') AS con_hang,
  COUNT(*) FILTER (WHERE gia > 1000000)           AS hang_cao_cap
FROM san_pham
GROUP BY danh_muc;
```

`FILTER` là chuẩn SQL, có trong Postgres và SQLite. MySQL dùng `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`.

Cách này quét bảng **một lần** thay vì chạy ba truy vấn riêng rồi ghép.

## Nhóm theo biểu thức

```sql
SELECT DATE_TRUNC('month', ngay_dat) AS thang, SUM(tong_tien)
FROM don_hang
GROUP BY DATE_TRUNC('month', ngay_dat)      -- lặp lại biểu thức
ORDER BY thang;
```

Postgres cho phép `GROUP BY 1` (theo vị trí cột) nhưng cách đó dễ hỏng khi ai đó thêm cột vào `SELECT`.

## Window function: có tổng mà không mất chi tiết

`GROUP BY` gộp dòng lại. Window function tính trên nhóm nhưng **giữ nguyên từng dòng**:

```sql
SELECT
  ten,
  danh_muc,
  gia,
  AVG(gia) OVER (PARTITION BY danh_muc)              AS gia_tb_danh_muc,
  gia - AVG(gia) OVER (PARTITION BY danh_muc)        AS chenh_lech,
  ROW_NUMBER() OVER (PARTITION BY danh_muc ORDER BY gia DESC) AS hang
FROM san_pham;
```

Đây là cách trả lời "sản phẩm này đắt hơn trung bình danh mục của nó bao nhiêu" trong một truy vấn.

Mẫu rất hay dùng — lấy N dòng đầu mỗi nhóm:

```sql
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY danh_muc ORDER BY ban_chay DESC) AS r
  FROM san_pham
) t WHERE r <= 3;
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Cột không có trong `GROUP BY` | Lỗi, hoặc giá trị ngẫu nhiên ở MySQL | Thêm vào GROUP BY hoặc bọc hàm |
| `COUNT(cot)` tưởng là đếm dòng | Thiếu các dòng NULL | `COUNT(*)` |
| `AVG` trên cột nhiều NULL | Trung bình sai mẫu số | Xử lý NULL rõ ràng |
| Lọc dòng bằng `HAVING` | Gộp thừa, chậm | Đưa lên `WHERE` |
| Ba truy vấn cho ba điều kiện đếm | Quét bảng ba lần | `COUNT(*) FILTER` |

## Ghi nhớ

- `WHERE` lọc dòng, `HAVING` lọc nhóm.
- `COUNT(*)` đếm dòng; `COUNT(cot)` bỏ qua NULL.
- `FILTER` gộp nhiều điều kiện đếm vào một lần quét.
- Window function cho tổng mà vẫn giữ chi tiết từng dòng.

## Tự kiểm tra

1. `COUNT(*)`, `COUNT(email)`, `COUNT(DISTINCT email)` khác nhau thế nào trên bảng có NULL?
2. Vì sao lọc ở `WHERE` nhanh hơn lọc cùng điều kiện ở `HAVING`?
3. Viết truy vấn lấy 3 sản phẩm bán chạy nhất mỗi danh mục.
