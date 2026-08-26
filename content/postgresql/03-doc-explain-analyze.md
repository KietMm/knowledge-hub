---
title: Đọc EXPLAIN ANALYZE
slug: doc-explain-analyze
summary: Kế hoạch thực thi nói cho bạn biết chính xác truy vấn chậm ở đâu — nếu biết đọc.
level: nang-cao
tags: [postgresql, explain, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được kế hoạch thực thi và chỉ ra **đúng nút** gây chậm, thay vì đoán và thử.

## Ý tưởng chính

Khi truy vấn chậm, bạn có hai lựa chọn: **đoán** (thêm index, thử viết lại, hy vọng) hoặc **đọc kế hoạch thực thi**.

Kế hoạch nói chính xác Postgres đã làm gì, mất bao lâu ở mỗi bước, và **ước lượng của nó lệch thực tế bao nhiêu** — thông tin cuối cùng thường là chìa khoá.

## Mental model

Hãy nghĩ tới **hoá đơn chi tiết của một chuyến du lịch**.

> Bạn thấy tổng 20 triệu và thấy đắt. Nhưng phải nhìn **từng dòng** mới biết: vé máy bay 4 triệu, khách sạn 3 triệu, và **một dòng thuê xe 12 triệu** vì đặt nhầm loại.
>
> Nhìn tổng thì chỉ biết "đắt". Nhìn từng dòng thì biết **sửa ở đâu**.

Kế hoạch thực thi là hoá đơn đó. Và cột quan trọng nhất không phải "mất bao lâu" — mà là **"tôi ước lượng 5 khách, thực tế có 50.000 khách"**, vì lệch ước lượng là nguyên nhân của phần lớn kế hoạch tệ.

## Ví dụ nhỏ

```sql
EXPLAIN                   -- chỉ ước lượng, KHÔNG chạy truy vấn
EXPLAIN ANALYZE           -- CHẠY thật rồi báo cáo số liệu thật
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;   -- thêm số liệu đọc đĩa/bộ nhớ
```

⚠️ `EXPLAIN ANALYZE` **thực sự chạy** truy vấn. Với `UPDATE`/`DELETE`, bọc trong transaction rồi `ROLLBACK`:

```sql
BEGIN;
EXPLAIN ANALYZE UPDATE ...;
ROLLBACK;
```

## Code chạy thế nào

Đọc kế hoạch **từ trong ra ngoài, từ dưới lên**:

```text
Sort  (cost=1250.5..1251.0 rows=200 width=48) (actual time=45.2..45.3 rows=180 loops=1)
  Sort Key: don.tao_luc DESC
  ->  Hash Join  (cost=350.2..1240.1 rows=200 width=48) (actual time=12.1..44.8 rows=180 loops=1)
        Hash Cond: (don.khach_id = khach.id)
        ->  Seq Scan on don_hang don  (cost=0..800 rows=20000 width=32) (actual time=0.01..25.3 rows=20000 loops=1)
        ->  Hash  (cost=300..300 rows=4000 width=24) (actual time=11.9..11.9 rows=4000 loops=1)
              ->  Seq Scan on khach  (cost=0..300 rows=4000 width=24)
Planning Time: 0.3 ms
Execution Time: 45.6 ms
```

Bốn con số cần đọc ở mỗi nút:

```text
cost=0..800          ước lượng chi phí (đơn vị tương đối, không phải mili giây)
rows=20000           SỐ DÒNG ƯỚC LƯỢNG
actual time=0.01..25.3  thời gian thật (bắt đầu..kết thúc), tính bằng ms
actual rows=20000    SỐ DÒNG THẬT
loops=1              nút này chạy bao nhiêu lần
```

**Hai điều cần tìm:**

```text
① rows ≠ actual rows lệch nhiều (10 lần trở lên)
   ⇒ thống kê sai ⇒ bộ tối ưu chọn kế hoạch dở
   ⇒ chạy ANALYZE ten_bang;

② Nút nào chiếm phần lớn actual time
   ⇒ đó là chỗ cần sửa, không phải chỗ trông "phức tạp nhất"
```

Lưu ý về `loops`: thời gian hiển thị là **cho một lần chạy**. Nút có `loops=5000` và `actual time=0.5` thật ra tốn `2500ms` — đây là chỗ rất dễ đọc sót.

## Cú pháp

**Các kiểu quét, từ nhanh tới chậm:**

```text
Index Only Scan   ⚡ mọi cột cần đều nằm trong index, không đọc bảng
Index Scan        ✅ dùng index rồi đọc dòng tương ứng
Bitmap Heap Scan  ✅ dùng index, đọc nhiều dòng — hợp khi khớp vừa phải
Seq Scan          ⚠️ quét toàn bảng
```

`Seq Scan` **không phải luôn xấu**: với bảng nhỏ hoặc khi truy vấn lấy phần lớn số dòng, quét tuần tự **nhanh hơn** đi qua index. Nó chỉ là vấn đề khi bảng lớn và bạn chỉ cần vài dòng.

**Các kiểu JOIN:**

```text
Nested Loop   với mỗi dòng bên trái, tìm bên phải
              ✅ nhanh khi bên trái ÍT dòng và bên phải có index
              ❌ thảm hoạ khi bên trái nhiều dòng

Hash Join     dựng bảng băm từ bên nhỏ rồi quét bên lớn
              ✅ tốt cho JOIN hai bảng lớn không sắp xếp

Merge Join    trộn hai bên đã sắp xếp
              ✅ tốt khi cả hai đã có thứ tự sẵn (thường nhờ index)
```

## Tại sao cần nó

Vì bảy dấu hiệu dưới đây phủ gần hết các nguyên nhân truy vấn chậm:

```text
① Seq Scan trên bảng lớn         → thiếu index
② rows lệch actual rows >10 lần   → ANALYZE ten_bang
③ Nested Loop với loops rất lớn   → thiếu index ở bảng bên trong
④ Sort Method: external merge     → sắp xếp phải ghi ra ĐĨA
                                     ⇒ tăng work_mem, hoặc thêm index cho ORDER BY
⑤ Rows Removed by Filter rất lớn  → index không đủ chọn lọc; cân nhắc index tổ hợp
⑥ Heap Fetches cao ở Index Only Scan → bảng cần VACUUM
⑦ Planning Time > Execution Time  → truy vấn quá đơn giản, hoặc quá nhiều JOIN
```

Dấu hiệu ④ đáng nói riêng: `external merge Disk: 25000kB` nghĩa là Postgres **không đủ RAM để sắp xếp** nên phải ghi tạm ra đĩa — chậm hơn hàng chục lần.

**Quy trình tối ưu**, theo đúng thứ tự:

```text
① EXPLAIN ANALYZE — tìm nút chiếm nhiều thời gian nhất
② Kiểm rows vs actual rows — lệch thì ANALYZE trước, đo lại
③ Nút đó là Seq Scan? → xem WHERE có index chưa
④ Có index mà không dùng? → kiểm: bọc hàm? ép kiểu? bảng quá nhỏ?
⑤ Thêm/sửa index → ĐO LẠI
⑥ Vẫn chậm → cân nhắc viết lại truy vấn, hoặc phi chuẩn hoá có chủ đích
```

Bước ⑤ hay bị bỏ: người ta thêm index rồi tin là xong. Đo lại mới biết nó có được dùng không.

## So sánh

| Thấy gì | Nghĩa là | Làm gì |
|---|---|---|
| `Seq Scan` bảng lớn | Thiếu index | Tạo index cho cột trong `WHERE` |
| `rows=5 actual rows=50000` | Thống kê cũ | `ANALYZE ten_bang;` |
| `loops=10000` | Nút này chạy 10.000 lần | Index ở bảng bên trong |
| `external merge Disk` | Sắp xếp tràn ra đĩa | Tăng `work_mem` hoặc index cho `ORDER BY` |
| `Heap Fetches: 40000` | Bảng có nhiều dòng chết | `VACUUM ANALYZE` |

## Dễ nhầm

**1. Đọc `cost` như thời gian.** Nó là **đơn vị tương đối** của bộ tối ưu, không phải mili giây. So sánh `cost` giữa hai kế hoạch thì được; đổi ra giây thì không.

**2. Bỏ qua `loops`.** Thời gian hiển thị là cho **một** lần chạy — nhân với `loops` mới ra tổng.

**3. Thấy `Seq Scan` là hoảng.** Trên bảng 500 dòng, nó nhanh hơn dùng index.

**4. Chạy `EXPLAIN` mà không `ANALYZE`.** Bạn chỉ thấy **ước lượng**, không thấy thực tế — và lệch ước lượng chính là thứ cần tìm.

**5. Quên `ANALYZE` bảng sau khi nạp dữ liệu lớn.** Thống kê cũ ⇒ bộ tối ưu chọn `Nested Loop` cho 5 triệu dòng.

**6. `EXPLAIN ANALYZE` trên `UPDATE`/`DELETE` ở production.** Nó **chạy thật** và sửa dữ liệu. Luôn bọc `BEGIN ... ROLLBACK`.

**7. Tối ưu nút không phải điểm nghẽn.** Nút chiếm 3% thời gian có tối ưu hoàn hảo cũng chỉ cải thiện 3%.

## Mẹo nhớ

> **Kế hoạch là hoá đơn chi tiết — nhìn từng dòng, không nhìn tổng.**
>
> **Đọc từ trong ra ngoài, từ dưới lên.**
>
> **`rows` lệch `actual rows` ⇒ chạy `ANALYZE` trước khi làm gì khác.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `EXPLAIN` và `EXPLAIN ANALYZE` khác nhau ra sao, và rủi ro của cái thứ hai?
2. Đọc kế hoạch theo thứ tự nào?
3. Hai con số nào cần so sánh trước tiên, và lệch nhiều thì làm gì?
4. Vì sao phải nhân thời gian với `loops`?
5. `Seq Scan` khi nào là bình thường, khi nào là vấn đề?

## Tự viết lại

Không nhìn lại phần trên, chẩn đoán kế hoạch này và đề xuất cách sửa:

```text
Nested Loop  (actual time=0.05..8420.3 rows=1200 loops=1)
  ->  Seq Scan on don_hang  (actual time=0.01..25.1 rows=50000 loops=1)
        Filter: (trang_thai = 'moi')
        Rows Removed by Filter: 950000
  ->  Seq Scan on khach  (actual time=0.16..0.16 rows=1 loops=50000)
        Filter: (id = don_hang.khach_id)
```

Tự kiểm: nút nào tốn nhiều thời gian nhất **sau khi nhân với `loops`**, và bạn cần **mấy** index?

## Thử sức

Một truy vấn chạy 80ms ở môi trường staging (100 nghìn dòng) nhưng **12 giây** ở production (40 triệu dòng), dù index giống hệt nhau.

Nêu **ba** nguyên nhân có thể khiến cùng một truy vấn với cùng index lại chọn kế hoạch khác nhau. Rồi mô tả cách bạn so sánh hai kế hoạch để tìm ra chỗ khác biệt.
