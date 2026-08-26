---
title: SELECT, lọc và sắp xếp
slug: select-loc-va-sap-xep
summary: Thứ tự thực thi thật của một câu SQL, và vì sao WHERE không dùng được alias ở SELECT.
level: co-ban
tags: [sql, select, where, co-ban]
khung: v2
---

> **Sau bài này bạn sẽ:** biết SQL thật sự chạy theo thứ tự nào, và tự giải thích được vì sao `WHERE` không dùng được alias mà `ORDER BY` thì được.

## Ý tưởng chính

SQL là ngôn ngữ **khai báo**: bạn mô tả *kết quả mình muốn*, không mô tả *cách lấy*. Cơ sở dữ liệu tự quyết định cách thực hiện.

Nhưng có một điều bắt buộc phải biết: **thứ tự bạn VIẾT khác thứ tự máy CHẠY**. Gần như mọi câu hỏi "vì sao SQL không cho tôi làm thế này" đều được trả lời bởi thứ tự đó.

## Mental model

Hãy nghĩ tới **một dây chuyền lọc cà phê**.

```text
Bạn VIẾT theo thứ tự này:        Máy CHẠY theo thứ tự này:
  SELECT                            ⑤ FROM      lấy nguyên liệu ở đâu
  FROM                              ④ WHERE     lọc bỏ hạt xấu
  WHERE                             ③ GROUP BY  gom theo loại
  GROUP BY                          ② HAVING    bỏ nhóm không đạt
  HAVING                            ① SELECT    chọn thứ đem ra
  ORDER BY                             ORDER BY sắp xếp
  LIMIT                                LIMIT    lấy mấy phần
```

> Bạn không thể đặt tên cho ly cà phê **trước khi** rót nó ra. `WHERE` chạy ở bước 2, còn cái tên (alias) chỉ sinh ra ở bước 5.

Đó là toàn bộ lời giải cho câu hỏi kinh điển bên dưới.

## Ví dụ nhỏ

```sql
SELECT gia * 1.1 AS gia_co_thue
FROM san_pham
WHERE gia_co_thue > 100000;      -- ❌ ERROR: column "gia_co_thue" does not exist
```

```sql
WHERE gia * 1.1 > 100000;        -- ✅ lặp lại biểu thức
ORDER BY gia_co_thue;            -- ✅ ORDER BY chạy SAU SELECT, nên thấy alias
```

## Code chạy thế nào

Lần theo một câu đầy đủ:

```sql
SELECT khach_id, SUM(tien) AS tong
FROM don_hang
WHERE trang_thai = 'da_giao'
GROUP BY khach_id
HAVING SUM(tien) > 1000000
ORDER BY tong DESC
LIMIT 10;
```

```text
① FROM     đọc bảng don_hang                        → 100.000 dòng
② WHERE    giữ lại dòng đã giao                     → 60.000 dòng
③ GROUP BY gom theo khach_id                        → 8.000 nhóm
④ HAVING   bỏ nhóm có tổng ≤ 1 triệu                → 900 nhóm
⑤ SELECT   tính SUM, đặt tên "tong"                 → 900 dòng, 2 cột
⑥ ORDER BY sắp theo tong (alias đã tồn tại ở đây)   → 900 dòng đã sắp
⑦ LIMIT    lấy 10 dòng đầu                          → 10 dòng
```

Từ sơ đồ này suy ra hai điều dùng được ngay:

```text
· WHERE lọc TỪNG DÒNG (trước khi gom); HAVING lọc TỪNG NHÓM (sau khi gom)
· Lọc càng sớm càng ít việc cho các bước sau ⇒ đặt điều kiện vào WHERE khi có thể
```

## Cú pháp

```sql
-- Lọc
WHERE tuoi BETWEEN 18 AND 65
WHERE trang_thai IN ('moi', 'dang_giao')
WHERE ten ILIKE '%an%'              -- ILIKE: không phân biệt hoa thường (Postgres)
WHERE ghi_chu IS NULL               -- KHÔNG dùng = NULL

-- Sắp xếp và phân trang
ORDER BY tao_luc DESC, id DESC      -- luôn có tie-break để thứ tự ổn định
LIMIT 20 OFFSET 40

-- Loại trùng và tập hợp
SELECT DISTINCT thanh_pho FROM khach;
SELECT a FROM x UNION SELECT a FROM y;      -- gộp, BỎ trùng
SELECT a FROM x UNION ALL SELECT a FROM y;  -- gộp, GIỮ trùng (nhanh hơn)

-- Rẽ nhánh
SELECT ten,
  CASE WHEN tuoi < 18 THEN 'trẻ em'
       WHEN tuoi < 60 THEN 'người lớn'
       ELSE 'cao tuổi' END AS nhom
FROM nguoi_dung;
```

## Tại sao cần nó

Vì **NULL không phải một giá trị** — nó là *"không biết"*, và mọi phép so sánh với "không biết" đều cho ra "không biết":

```sql
WHERE ghi_chu = NULL      -- ❌ luôn không khớp dòng nào, KHÔNG báo lỗi
WHERE ghi_chu IS NULL     -- ✅
```

Hệ quả tinh vi hơn, và nó làm mất dữ liệu một cách im lặng:

```sql
-- Bảng có 100 dòng, 30 dòng trang_thai = NULL
SELECT COUNT(*) FROM don WHERE trang_thai != 'huy';
-- → 70, KHÔNG phải 100 - (số dòng huỷ)
-- 30 dòng NULL bị loại, vì NULL != 'huy' cho ra NULL, không phải TRUE
```

```sql
WHERE trang_thai IS DISTINCT FROM 'huy'    -- ✅ coi NULL là "khác 'huy'"
```

Đây là một trong những nguồn sai số báo cáo phổ biến nhất, và nó không bao giờ ném lỗi.

## So sánh

| Viết | Nghĩa | Bẫy |
|---|---|---|
| `= NULL` | Luôn không khớp | Dùng `IS NULL` |
| `!= 'x'` | Bỏ luôn dòng NULL | Dùng `IS DISTINCT FROM` |
| `LIKE '%a%'` | Không dùng được index | Cân nhắc full-text search |
| `SELECT *` | Lấy cả cột không cần | Liệt kê cột cần dùng |
| `UNION` | Bỏ trùng — phải sắp xếp | `UNION ALL` nếu không cần bỏ trùng |

`SELECT *` đáng nói riêng: nó kéo về cả những cột `TEXT` khổng lồ bạn không dùng, và nó **vỡ âm thầm** khi ai đó thêm/đổi thứ tự cột — code phía ứng dụng đọc theo vị trí sẽ nhận nhầm dữ liệu.

## Dễ nhầm

**1. Dùng alias trong `WHERE`.** Xem thứ tự thực thi.

**2. `= NULL`.** Không lỗi, không khớp gì cả.

**3. Quên `NULL` khi dùng `!=` hoặc `NOT IN`.**

```sql
WHERE id NOT IN (SELECT khach_id FROM don)
-- ❌ nếu subquery trả về BẤT KỲ dòng NULL nào → toàn bộ điều kiện thành NULL → 0 dòng
```

Đây là bẫy khó chịu nhất trong bài: truy vấn trả về rỗng và trông như "không có dữ liệu". Dùng `NOT EXISTS` thay thế.

**4. `ORDER BY` không có tie-break.** Hai dòng cùng `tao_luc` thì thứ tự giữa chúng không xác định — và phân trang sẽ lặp hoặc sót ([[phan-trang-loc-va-sap-xep]]).

**5. `LIKE '%tu%'` trên bảng lớn.** Dấu `%` ở đầu làm index vô dụng, cơ sở dữ liệu phải quét toàn bảng.

**6. `SELECT *` trong code sản phẩm.** Xem ở trên.

**7. Quên `LIMIT` khi khám phá dữ liệu.** `SELECT * FROM don_hang` trên bảng 50 triệu dòng làm treo cả công cụ lẫn kết nối.

## Mẹo nhớ

> **Bạn viết SELECT trước, máy chạy FROM → WHERE → GROUP BY → HAVING → SELECT.**
>
> **Không đặt tên cho ly cà phê trước khi rót ra ⇒ `WHERE` không thấy alias.**
>
> **NULL nghĩa là "không biết" — so sánh với nó luôn ra "không biết".**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Thứ tự thực thi thật của một câu SELECT?
2. Vì sao `WHERE` không dùng được alias mà `ORDER BY` thì được?
3. `WHERE` và `HAVING` lọc ở cấp nào — dòng hay nhóm?
4. Vì sao `WHERE trang_thai != 'huy'` làm mất dòng có `trang_thai` NULL?
5. Vì sao `NOT IN (subquery)` nguy hiểm?

## Tự viết lại

Không nhìn lại phần trên, viết truy vấn:

```text
Lấy 10 khách hàng chi nhiều nhất trong năm 2026, chỉ tính đơn đã giao,
và chỉ lấy khách có từ 3 đơn trở lên. Hiện: tên khách, số đơn, tổng tiền.
```

Tự kiểm: điều kiện "đã giao" của bạn nằm ở `WHERE` hay `HAVING`? Còn điều kiện "từ 3 đơn trở lên"? Giải thích theo thứ tự thực thi.

## Thử sức

Truy vấn này trả về **0 dòng** dù bảng có dữ liệu:

```sql
SELECT * FROM khach
WHERE id NOT IN (SELECT khach_id FROM don_hang);
```

Chẩn đoán nguyên nhân, viết lại cho đúng, và trả lời câu khó hơn: vì sao lỗi này **không bao giờ báo lỗi** mà chỉ âm thầm trả về sai?
