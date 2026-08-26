---
title: GROUP BY và hàm tổng hợp
slug: group-by-va-ham-tong-hop
summary: Gộp dòng thành nhóm, phân biệt WHERE với HAVING, và bẫy COUNT với NULL.
level: co-ban
tags: [sql, group-by, aggregate]
khung: v2
---

> **Sau bài này bạn sẽ:** biết `COUNT(*)` và `COUNT(cot)` khác nhau ở đâu, và dùng được window function để có tổng **mà không mất chi tiết**.

## Ý tưởng chính

`GROUP BY` **gộp nhiều dòng thành một**. Sau khi gộp, bạn không còn truy cập được từng dòng nữa — chỉ còn các giá trị tổng hợp.

Từ đó ra quy tắc nghiêm ngặt: **mọi cột trong `SELECT` phải hoặc nằm trong `GROUP BY`, hoặc nằm trong một hàm tổng hợp.** Cột nào không thoả thì SQL không biết lấy giá trị nào trong nhóm.

## Mental model

Hãy nghĩ tới **xếp học sinh thành hàng theo lớp rồi báo cáo**.

> Xếp xong, bạn báo cáo: *"lớp 10A: 35 em, điểm trung bình 7,2"*.
>
> Bây giờ ai đó hỏi *"tên em ngồi đầu hàng là gì?"* — câu hỏi vô nghĩa, vì cả hàng đã gộp thành **một dòng báo cáo**. Bạn chỉ còn số liệu của nhóm.

Đó chính là lý do SQL từ chối `SELECT ten` khi bạn `GROUP BY lop`: 35 cái tên, biết chọn cái nào?

Và **window function** là câu trả lời cho trường hợp bạn muốn cả hai: *"cho tôi từng em, kèm điểm trung bình của lớp em đó"* — vẫn giữ 35 dòng, mỗi dòng có thêm con số của nhóm.

## Ví dụ nhỏ

```sql
SELECT khach_id, COUNT(*) AS so_don, SUM(tien) AS tong
FROM don_hang
GROUP BY khach_id;
```

```text
Trước gộp                    Sau gộp
khach_id tien                khach_id so_don tong
1        100                 1        2      300
1        200                 2        1      150
2        150
```

## Code chạy thế nào

**`COUNT` có ba dạng, và chúng khác nhau thật sự:**

```text
Bảng: 5 dòng, cột email có 2 dòng NULL, 1 email bị trùng

COUNT(*)               → 5   đếm DÒNG, kể cả dòng toàn NULL
COUNT(email)           → 3   đếm dòng có email KHÁC NULL
COUNT(DISTINCT email)  → 2   đếm giá trị khác nhau, bỏ NULL và bỏ trùng
```

Nhầm ba cái này là nguồn sai số báo cáo phổ biến. Câu hỏi để chọn: *"tôi đang đếm dòng, đếm giá trị có thật, hay đếm giá trị khác nhau?"*

Cùng vấn đề với các hàm khác:

```sql
AVG(diem)     -- bỏ qua dòng NULL, KHÔNG coi NULL là 0
              -- ⇒ trung bình của [10, NULL] là 10, không phải 5
COALESCE(AVG(diem), 0)   -- nhóm rỗng thì AVG trả NULL, cần giá trị mặc định
```

## Cú pháp

**`WHERE` và `HAVING` — lọc ở hai thời điểm khác nhau:**

```sql
SELECT khach_id, SUM(tien) AS tong
FROM don_hang
WHERE trang_thai = 'da_giao'      -- ① lọc TỪNG DÒNG, trước khi gộp
GROUP BY khach_id
HAVING SUM(tien) > 1000000;       -- ② lọc TỪNG NHÓM, sau khi gộp
```

```text
WHERE  → dùng cho điều kiện về DÒNG   → chạy trước, giảm việc cho GROUP BY
HAVING → dùng cho điều kiện về NHÓM   → chỉ đặt ở đây khi bắt buộc
```

Đặt nhầm điều kiện dòng vào `HAVING` thì truy vấn vẫn đúng nhưng **chậm hơn**: bạn gộp cả những dòng rồi sẽ vứt đi.

**`FILTER` — nhiều điều kiện trong MỘT lần quét:**

```sql
SELECT
  COUNT(*) AS tong,
  COUNT(*) FILTER (WHERE trang_thai = 'da_giao') AS da_giao,
  COUNT(*) FILTER (WHERE trang_thai = 'huy')     AS da_huy,
  SUM(tien) FILTER (WHERE la_vip)                AS tien_vip
FROM don_hang;
```

Không có `FILTER`, bạn phải chạy ba truy vấn hoặc dùng `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`. `FILTER` vừa rõ hơn vừa chỉ quét bảng **một lần**.

**Nhóm theo biểu thức:**

```sql
SELECT DATE_TRUNC('month', tao_luc) AS thang, SUM(tien)
FROM don_hang
GROUP BY 1                            -- 1 = cột thứ nhất trong SELECT
ORDER BY 1;
```

## Tại sao cần nó

Vì **window function** giải quyết lớp bài toán mà `GROUP BY` không làm được: **có số liệu nhóm mà vẫn giữ từng dòng**.

```sql
SELECT
  ten,
  luong,
  phong_ban,
  AVG(luong) OVER (PARTITION BY phong_ban)      AS tb_phong,
  luong - AVG(luong) OVER (PARTITION BY phong_ban) AS chenh_lech,
  RANK() OVER (PARTITION BY phong_ban ORDER BY luong DESC) AS hang
FROM nhan_vien;
```

```text
GROUP BY:   10 nhân viên → 3 dòng (một dòng mỗi phòng)
OVER:       10 nhân viên → 10 dòng, mỗi dòng KÈM số liệu của phòng mình
```

Ba hàm window dùng nhiều nhất:

```sql
ROW_NUMBER() OVER (ORDER BY tao_luc)              -- đánh số thứ tự
RANK()       OVER (PARTITION BY nhom ORDER BY x)  -- xếp hạng trong nhóm
LAG(gia, 1)  OVER (ORDER BY ngay)                 -- giá trị của DÒNG TRƯỚC
```

`LAG` đặc biệt hữu ích cho báo cáo: so doanh thu hôm nay với hôm qua chỉ cần một câu, không cần self join.

## So sánh

| | `GROUP BY` | `OVER` (window) |
|---|---|---|
| Số dòng ra | Ít hơn (một dòng/nhóm) | **Giữ nguyên** |
| Thấy chi tiết từng dòng | ❌ | ✅ |
| Dùng cho | Báo cáo tổng hợp | So sánh dòng với nhóm, xếp hạng, so với dòng trước |

Câu hỏi để chọn: **"tôi có cần giữ lại từng dòng không?"** Có ⇒ window. Không ⇒ `GROUP BY`.

## Dễ nhầm

**1. `SELECT` cột không nằm trong `GROUP BY`.** Postgres báo lỗi thẳng. MySQL (chế độ lỏng) **im lặng trả về một giá trị bất kỳ** trong nhóm — nguy hiểm hơn nhiều.

**2. Nhầm `COUNT(*)` với `COUNT(cot)`.** Chênh nhau đúng bằng số dòng NULL.

**3. Đặt điều kiện dòng vào `HAVING`.** Đúng kết quả nhưng chậm.

**4. Tưởng `AVG` coi NULL là 0.** Nó **bỏ qua** dòng NULL, nên mẫu số nhỏ hơn bạn tưởng.

**5. `GROUP BY` sau khi JOIN một-nhiều.** Số bị nhân lên — xem [[join-cac-loai]].

**6. Quên rằng nhóm rỗng trả về `NULL`, không phải 0.** `SUM` của tập rỗng là `NULL`; bọc `COALESCE(..., 0)` khi kết quả đi thẳng ra giao diện.

**7. Dùng `GROUP BY` để bỏ trùng.** Ý định đó nên viết bằng `DISTINCT` — rõ ràng hơn với người đọc.

## Mẹo nhớ

> **Gộp hàng rồi thì không hỏi tên từng em được nữa.**
>
> **`WHERE` lọc dòng (trước), `HAVING` lọc nhóm (sau).**
>
> **Cần giữ từng dòng mà vẫn có số liệu nhóm ⇒ window function.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao mọi cột trong `SELECT` phải nằm trong `GROUP BY` hoặc trong hàm tổng hợp?
2. `COUNT(*)`, `COUNT(cot)`, `COUNT(DISTINCT cot)` khác nhau thế nào?
3. Khi nào bắt buộc dùng `HAVING` thay vì `WHERE`?
4. `AVG` xử lý dòng NULL ra sao, và hệ quả với kết quả?
5. Câu hỏi nào quyết định dùng `GROUP BY` hay window function?

## Tự viết lại

Không nhìn lại phần trên, viết truy vấn:

```text
Với mỗi nhân viên: tên, lương, lương trung bình phòng của họ, và họ đứng
thứ mấy về lương trong phòng. Chỉ tính nhân viên đang làm việc.
```

Tự kiểm: bạn dùng `GROUP BY` hay `OVER`? Nếu đề đổi thành *"chỉ hiện mỗi phòng một dòng với lương trung bình"* thì câu trả lời đổi thế nào?

## Thử sức

Báo cáo *"số khách hàng đã mua hàng"* của bạn ra **8.200**, nhưng kế toán nói chỉ có **7.850**.

Truy vấn dùng `COUNT(khach_id)` trên bảng đã JOIN với `don_hang`. Nêu **hai** nguyên nhân có thể gây chênh lệch theo hai hướng ngược nhau, và viết truy vấn kiểm chứng cho từng cái.
