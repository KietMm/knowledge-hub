---
title: Index và hiệu năng truy vấn
slug: index-va-hieu-nang-truy-van
summary: Index là gì, khi nào nên đánh, và những cách vô tình làm CSDL bỏ qua index bạn vừa tạo.
level: trung-cap
tags: [sql, index, hieu-nang, explain]
khung: v2
---

> **Sau bài này bạn sẽ:** đánh index đúng chỗ, và nhận ra ngay những cách viết truy vấn **vô hiệu hoá** index bạn vừa tạo.

## Ý tưởng chính

Không có index, tìm một dòng nghĩa là **đọc toàn bộ bảng**. Với 10 triệu dòng, đó là hàng giây cho mỗi truy vấn.

Index là một cấu trúc sắp xếp sẵn cho phép **nhảy thẳng** tới dòng cần tìm. Đổi lại: tốn đĩa, và làm mọi lệnh ghi chậm hơn một chút.

## Mental model

Hãy nghĩ tới **mục lục ở cuối một cuốn sách dày**.

> Không có mục lục: muốn tìm chữ "transaction", bạn **lật từng trang**.
>
> Có mục lục: tra chữ cái T, thấy *"transaction — trang 412"*, mở thẳng tới đó.

Ba điều rút ra từ hình ảnh này, và chúng giải thích cả bài:

```text
① Mục lục CHIẾM CHỖ và phải cập nhật khi sách sửa
   ⇒ index tốn đĩa, làm INSERT/UPDATE chậm hơn

② Mục lục chỉ dùng được nếu bạn tra ĐÚNG CÁCH nó sắp
   ⇒ tra "những trang có chữ bắt đầu bằng tra" thì được;
     tra "những trang có chữ CHỨA action" thì mục lục vô dụng

③ Mục lục sắp theo (chương, mục) thì tra được theo chương,
   nhưng không tra được theo mục nếu chưa biết chương
   ⇒ quy tắc tiền tố trái
```

## Ví dụ nhỏ

```sql
CREATE INDEX idx_don_khach ON don_hang (khach_id);

SELECT * FROM don_hang WHERE khach_id = 42;
-- Không index: quét 10 triệu dòng
-- Có index:    khoảng 3-4 bước
```

## Code chạy thế nào

Index của phần lớn cơ sở dữ liệu là **cây B-tree** — mỗi bước loại đi phần lớn dữ liệu còn lại:

```text
10.000.000 dòng, cây có ~4 tầng

tầng 1: chọn 1 trong ~200 nhánh   → còn 50.000 dòng
tầng 2: chọn 1 trong ~200 nhánh   → còn 250 dòng
tầng 3: chọn 1 trong ~200 nhánh   → còn ~1 dòng
tầng 4: đọc dòng thật

⇒ 4 lần đọc thay vì 10 triệu
```

Vì cây B-tree **giữ dữ liệu theo thứ tự**, index không chỉ giúp tìm bằng — nó còn giúp:

```text
· Truy vấn khoảng:  WHERE tao_luc BETWEEN ... AND ...
· Sắp xếp:          ORDER BY tao_luc   (đọc theo thứ tự có sẵn, không cần sắp)
· Min/max:          lấy nút ngoài cùng
```

## Cú pháp

**Index tổ hợp và quy tắc tiền tố trái** — phần quan trọng nhất:

```sql
CREATE INDEX idx ON don_hang (khach_id, trang_thai, tao_luc);
```

```text
Index này DÙNG ĐƯỢC cho:
  WHERE khach_id = 1
  WHERE khach_id = 1 AND trang_thai = 'moi'
  WHERE khach_id = 1 AND trang_thai = 'moi' AND tao_luc > '...'

KHÔNG dùng được cho:
  WHERE trang_thai = 'moi'                    ← thiếu cột đầu
  WHERE tao_luc > '...'                       ← thiếu hai cột đầu
```

Hình dung: danh bạ sắp theo **(họ, tên)** giúp bạn tìm "Trần Minh" và tìm mọi người họ "Trần" — nhưng vô dụng khi bạn chỉ biết tên là "Minh".

Thứ tự cột trong index tổ hợp: **cột lọc bằng (=) đặt trước, cột lọc khoảng đặt sau**. Vì một khi đi vào khoảng, các cột phía sau không còn thứ tự nữa.

## Tại sao cần nó

Vì có những cách viết **vô hiệu hoá index** mà nhìn qua không thấy — bạn tạo index xong mà truy vấn vẫn chậm:

```sql
-- ❌ Bọc cột trong hàm → index trên cột đó thành vô dụng
WHERE YEAR(tao_luc) = 2026
-- ✅
WHERE tao_luc >= '2026-01-01' AND tao_luc < '2027-01-01'

-- ❌ % ở đầu → không biết bắt đầu tra từ đâu
WHERE ten LIKE '%an%'
-- ✅ (dùng được index)
WHERE ten LIKE 'an%'

-- ❌ Ép kiểu ngầm
WHERE ma_so = 12345          -- ma_so là VARCHAR
-- ✅
WHERE ma_so = '12345'

-- ❌ OR trên hai cột khác nhau thường làm bộ tối ưu bỏ index
WHERE email = 'a@x.com' OR sdt = '090...'
-- ✅ tách thành UNION nếu cả hai cột đều có index
```

Trường hợp `YEAR(tao_luc)` là bẫy phổ biến nhất và cũng khó thấy nhất: truy vấn **đúng**, chỉ là chậm — và không có gì cảnh báo.

**Index bao phủ** — mẹo đáng biết:

```sql
CREATE INDEX idx ON don_hang (khach_id) INCLUDE (tien, trang_thai);

SELECT tien, trang_thai FROM don_hang WHERE khach_id = 1;
-- Mọi cột cần đều nằm TRONG index ⇒ không cần đọc bảng thật
```

## So sánh

**Nên đánh index:**

```text
· Khoá ngoại (cột dùng để JOIN)         ← hay bị quên nhất
· Cột trong WHERE thường xuyên
· Cột trong ORDER BY trên bảng lớn
· Cột UNIQUE (ràng buộc tự tạo index)
```

**Không nên:**

```text
· Bảng nhỏ (dưới vài nghìn dòng — quét toàn bảng còn nhanh hơn)
· Cột độ chọn lọc thấp (giới tính, cờ true/false)
· Bảng ghi rất nhiều, đọc rất ít (log, event)
· Cột đã là tiền tố trái của index tổ hợp khác — index đó là thừa
```

**Đo, đừng đoán:**

```sql
EXPLAIN ANALYZE SELECT * FROM don_hang WHERE khach_id = 42;
```

```text
Seq Scan on don_hang    ← ❌ QUÉT TOÀN BẢNG — thiếu index
Index Scan using idx    ← ✅ đang dùng index
rows=1 actual rows=1    ← ước lượng khớp thực tế: thống kê tốt
rows=1 actual rows=50000 ← ⚠️ thống kê lệch, chạy ANALYZE
```

Hai từ cần tìm: **`Seq Scan`** trên bảng lớn, và khoảng cách lớn giữa `rows` ước lượng với `actual rows`.

## Dễ nhầm

**1. Quên index cho khoá ngoại.** Nhiều cơ sở dữ liệu **không** tự tạo. JOIN chậm, và xoá dòng cha cũng chậm vì phải quét bảng con.

**2. Bọc cột trong hàm ở `WHERE`.** Xem ở trên.

**3. Đánh index cho mọi cột "cho chắc".** Mỗi index làm `INSERT`/`UPDATE` chậm hơn và chiếm RAM đáng lẽ dùng để cache dữ liệu.

**4. Sai thứ tự cột trong index tổ hợp.** Index `(trang_thai, khach_id)` không giúp gì cho `WHERE khach_id = 1`.

**5. Index trùng lặp.** Có `(a, b)` rồi tạo thêm `(a)` là thừa — `(a)` đã là tiền tố trái của `(a, b)`.

**6. Không bao giờ kiểm index nào đang được dùng.** Postgres có `pg_stat_user_indexes`: index có `idx_scan = 0` sau nhiều tuần là index chỉ làm chậm việc ghi.

**7. Tạo index trên bảng lớn ở giờ cao điểm.** Nó khoá bảng — dùng `CREATE INDEX CONCURRENTLY`, xem [[thay-doi-cau-truc-va-migration]].

## Mẹo nhớ

> **Index là mục lục: tốn giấy, phải cập nhật, và chỉ dùng được nếu tra ĐÚNG CÁCH nó sắp.**
>
> **Bọc cột trong hàm ⇒ mất index.**
>
> **Index tổ hợp dùng từ TRÁI sang, không nhảy cột.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Index đánh đổi cái gì lấy cái gì?
2. Vì sao `WHERE YEAR(tao_luc) = 2026` không dùng được index?
3. Index `(a, b, c)` dùng được cho những truy vấn nào, không dùng được cho những truy vấn nào?
4. Vì sao `LIKE '%an%'` không dùng được index mà `LIKE 'an%'` thì được?
5. Hai dấu hiệu trong `EXPLAIN ANALYZE` cho biết có vấn đề?

## Tự viết lại

Không nhìn lại phần trên, đề xuất index cho các truy vấn sau (**ít nhất có thể**, và nói rõ thứ tự cột):

```sql
SELECT * FROM don_hang WHERE khach_id = ? AND trang_thai = 'moi';
SELECT * FROM don_hang WHERE khach_id = ? ORDER BY tao_luc DESC LIMIT 20;
SELECT * FROM don_hang WHERE tao_luc >= ? AND tao_luc < ?;
```

Tự kiểm: bạn cần **mấy** index cho ba truy vấn này? (Gợi ý: ít hơn ba.)

## Thử sức

Bạn tạo index cho cột `email`, nhưng `EXPLAIN` vẫn cho thấy `Seq Scan`.

Liệt kê **năm** nguyên nhân có thể, và cách kiểm chứng từng cái. Gợi ý: một nguyên nhân không nằm ở truy vấn hay index, mà ở **kích thước bảng** — và đó là hành vi **đúng** của cơ sở dữ liệu.
