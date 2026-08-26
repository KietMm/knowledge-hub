---
title: JOIN các loại
slug: join-cac-loai
summary: INNER, LEFT, RIGHT, FULL và CROSS — chọn sai loại là mất dữ liệu hoặc nhân bản dòng.
level: co-ban
tags: [sql, join]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng loại JOIN bằng một câu hỏi, và nhận ra ngay khi kết quả đang bị **nhân bản dòng**.

## Ý tưởng chính

JOIN ghép dòng của hai bảng theo một điều kiện. Loại JOIN quyết định **chuyện gì xảy ra với dòng không tìm được cặp**.

Chọn sai loại có hai hậu quả, và cả hai đều **không báo lỗi**: mất dữ liệu, hoặc nhân bản dòng làm mọi con số tổng bị thổi phồng.

## Mental model

Hãy nghĩ tới **ghép danh sách khách mời với danh sách quà tặng**.

> **INNER JOIN** — chỉ lấy người **vừa có mặt vừa có quà**. Ai thiếu một trong hai thì bỏ.
>
> **LEFT JOIN** — giữ **toàn bộ khách mời**; ai không có quà thì ô quà để trống (NULL).
>
> **FULL JOIN** — giữ cả hai danh sách, bên nào thiếu thì để trống.
>
> **CROSS JOIN** — ghép **mọi khách với mọi quà**: 100 khách × 50 quà = 5000 dòng.

Câu hỏi để chọn: ***"dòng bên trái không có cặp thì tôi muốn giữ hay bỏ?"*** — giữ thì LEFT, bỏ thì INNER. Đó là 95% các trường hợp bạn gặp.

## Ví dụ nhỏ

```sql
-- Ai cũng hiện, kể cả người chưa đặt đơn nào
SELECT k.ten, d.id AS don_id
FROM khach k
LEFT JOIN don_hang d ON d.khach_id = k.id;
```

```text
khach            don_hang           kết quả LEFT JOIN
id ten           khach_id id        ten  don_id
1  An            1        100       An   100
2  Bình          1        101       An   101
3  Cường                             Bình NULL      ← giữ lại, ô phải để trống
                                     Cường NULL
```

## Code chạy thế nào

**Bẫy lớn nhất: `WHERE` biến LEFT JOIN thành INNER JOIN.**

```sql
-- ❌ Mất hết khách chưa có đơn
SELECT k.ten, d.id
FROM khach k
LEFT JOIN don_hang d ON d.khach_id = k.id
WHERE d.trang_thai = 'da_giao';
```

```text
① LEFT JOIN chạy    →  An/100, An/101, Bình/NULL, Cường/NULL
② WHERE chạy SAU    →  kiểm d.trang_thai = 'da_giao'
                       với Bình: NULL = 'da_giao' → NULL → LOẠI
                       với Cường: cũng LOẠI
   ⇒ chỉ còn dòng có đơn ⇒ hoá thành INNER JOIN
```

```sql
-- ✅ Đưa điều kiện vào ON: lọc TRONG lúc ghép, không lọc SAU
LEFT JOIN don_hang d ON d.khach_id = k.id AND d.trang_thai = 'da_giao'
```

Quy tắc rút ra: **điều kiện về bảng bên phải thì đặt ở `ON`; điều kiện về bảng bên trái thì đặt ở `WHERE`.**

## Cú pháp

**Nhân bản dòng** — bẫy âm thầm nhất, và nó làm sai mọi báo cáo:

```sql
SELECT d.id, SUM(d.tien)
FROM don_hang d
JOIN dong_don dd ON dd.don_id = d.id      -- ❌ mỗi đơn có 3 dòng hàng
GROUP BY d.id;
-- → tiền của mỗi đơn bị nhân BA lần
```

```text
don_hang            dong_don              sau JOIN
id  tien            don_id                id tien
1   500             1                      1  500   ← tien lặp lại
                    1                      1  500
                    1                      1  500
                                    SUM → 1500, sai gấp 3
```

Ba cách chữa:

```sql
-- ① Gộp trước rồi mới JOIN
JOIN (SELECT don_id, COUNT(*) AS so_dong FROM dong_don GROUP BY don_id) x
  ON x.don_id = d.id

-- ② EXISTS khi chỉ cần kiểm tra "có hay không"
WHERE EXISTS (SELECT 1 FROM dong_don WHERE don_id = d.id)

-- ③ COUNT(DISTINCT ...) khi buộc phải JOIN
SELECT d.id, COUNT(DISTINCT dd.id)
```

Cách ② đáng nhớ: khi bạn chỉ cần biết *"có ít nhất một"*, `EXISTS` vừa đúng vừa nhanh hơn — nó dừng ngay khi tìm thấy dòng đầu tiên, không đếm hết.

## Tại sao cần nó

Vì hai kỹ thuật dưới đây giải quyết những bài toán thường gặp mà JOIN thường không nghĩ tới:

**Self join — ghép bảng với chính nó:**

```sql
-- Tìm nhân viên và người quản lý của họ
SELECT nv.ten AS nhan_vien, ql.ten AS quan_ly
FROM nhan_vien nv
LEFT JOIN nhan_vien ql ON ql.id = nv.quan_ly_id;
```

Dùng `LEFT` ở đây là quyết định có ý nghĩa: giám đốc không có quản lý, và bạn vẫn muốn thấy giám đốc trong danh sách.

**`EXISTS` thay JOIN khi chỉ cần kiểm tra:**

```sql
-- ❌ JOIN rồi DISTINCT: nhân dòng rồi mới bỏ trùng — tốn công
SELECT DISTINCT k.* FROM khach k JOIN don_hang d ON d.khach_id = k.id;

-- ✅ EXISTS: dừng ngay khi thấy dòng đầu tiên
SELECT * FROM khach k WHERE EXISTS (SELECT 1 FROM don_hang WHERE khach_id = k.id);
```

## So sánh

| Loại | Giữ dòng không có cặp | Dùng khi |
|---|---|---|
| `INNER JOIN` | Không giữ bên nào | Chỉ quan tâm dữ liệu có ở cả hai bảng |
| `LEFT JOIN` | Giữ **trái** | "Mọi khách, kèm đơn nếu có" |
| `RIGHT JOIN` | Giữ phải | Hiếm dùng — đảo thứ tự bảng rồi dùng LEFT |
| `FULL JOIN` | Giữ cả hai | Đối chiếu hai nguồn dữ liệu |
| `CROSS JOIN` | Ghép mọi cặp | Sinh lịch, sinh ma trận tổ hợp |

`RIGHT JOIN` gần như không cần: đọc `A LEFT JOIN B` dễ hơn `B RIGHT JOIN A`, và cả hai cho cùng kết quả. Chọn một hướng và giữ nhất quán.

## Dễ nhầm

**1. Điều kiện bảng phải đặt ở `WHERE` sau LEFT JOIN.** Biến LEFT thành INNER — bẫy số một.

**2. Nhân bản dòng khi JOIN quan hệ một-nhiều rồi `SUM`.** Số liệu sai mà không báo lỗi.

**3. Quên điều kiện `ON`.** Thành CROSS JOIN: 10.000 × 10.000 = 100 triệu dòng, và truy vấn treo.

**4. `SELECT *` với nhiều bảng.** Tên cột trùng nhau (`id` của cả hai bảng), và ứng dụng nhận nhầm giá trị.

**5. JOIN quá nhiều bảng.** Trên 5 bảng thì cả người lẫn bộ tối ưu đều khó theo dõi. Cân nhắc tách thành nhiều truy vấn hoặc dùng CTE ([[subquery-va-cte]]).

**6. Quên index trên cột JOIN.** Đây là nguyên nhân số một của "JOIN chậm" — xem [[index-va-hieu-nang-truy-van]].

**7. Dùng `DISTINCT` để che nhân bản dòng.** Nó giấu triệu chứng chứ không chữa nguyên nhân, và làm truy vấn chậm hơn vì phải sắp xếp toàn bộ kết quả.

## Mẹo nhớ

> **Câu hỏi duy nhất: dòng bên trái không có cặp thì GIỮ hay BỎ?**
>
> **Điều kiện về bảng PHẢI đặt ở `ON`, không đặt ở `WHERE`.**
>
> **JOIN một-nhiều rồi `SUM` ⇒ số bị thổi phồng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Câu hỏi một dòng để chọn giữa INNER và LEFT?
2. Vì sao `WHERE d.x = 'a'` biến LEFT JOIN thành INNER JOIN — giải thích theo thứ tự thực thi?
3. Nhân bản dòng xảy ra khi nào, và ba cách chữa?
4. Khi nào `EXISTS` tốt hơn `JOIN + DISTINCT`?
5. Vì sao `DISTINCT` không phải cách chữa đúng cho nhân bản dòng?

## Tự viết lại

Không nhìn lại phần trên, viết truy vấn:

```text
Liệt kê TẤT CẢ sản phẩm, kèm số lượng đã bán trong tháng 8/2026.
Sản phẩm chưa bán được cái nào phải hiện với số 0, không được biến mất.
```

Tự kiểm: điều kiện "tháng 8" của bạn nằm ở `ON` hay `WHERE`, và vì sao? Và bạn xử lý `NULL` thành `0` bằng gì?

## Thử sức

Báo cáo doanh thu của bạn cho ra **tổng lớn gấp 2,7 lần** con số kế toán.

Truy vấn có JOIN ba bảng: `don_hang`, `dong_don`, `thanh_toan`. Chỉ ra nguyên nhân, và nêu cách **kiểm chứng nhanh** trước khi sửa — một truy vấn ngắn cho biết bạn đang nhân dòng ở đâu.
