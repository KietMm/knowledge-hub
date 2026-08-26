---
title: Aggregation pipeline
slug: aggregation-pipeline
summary: Các stage dùng nhiều nhất, thứ tự stage quyết định hiệu năng, $group so với GROUP BY, và khi nào đừng dùng aggregation.
level: trung-cap
tags: [mongodb, aggregation, bao-cao]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được pipeline nhiều bước, và biết đặt `$match` ở đâu để pipeline không chết trên dữ liệu thật.

## Ý tưởng chính

Aggregation là **một dây chuyền**: mỗi stage nhận luồng document từ stage trước, biến đổi, đẩy sang stage sau.

Và điều quan trọng nhất không phải danh sách stage — mà là **thứ tự của chúng**. Cùng một pipeline, đổi thứ tự hai stage có thể chênh nhau hàng chục lần thời gian chạy.

## Mental model

Hãy nghĩ tới **dây chuyền phân loại thư ở bưu điện**.

> Bạn có 1 triệu lá thư và cần *"tổng số thư gửi tới Hà Nội, nhóm theo quận"*.
>
> **Cách sai**: nhóm cả 1 triệu lá theo quận trước, rồi vứt đi những nhóm không thuộc Hà Nội.
>
> **Cách đúng**: **lọc trước** — bỏ ra 40.000 lá gửi Hà Nội — rồi mới nhóm.

Nguyên tắc: **lọc càng sớm càng tốt**, vì mọi stage sau đó chỉ phải xử lý phần còn lại. Và có một lý do kỹ thuật nữa: chỉ `$match` ở **stage đầu tiên** mới dùng được index.

## Ví dụ nhỏ

```js
db.don_hang.aggregate([
  { $match: { trang_thai: "da_giao", tao_luc: { $gte: dauThang } } },
  { $group: { _id: "$khach.id", tong: { $sum: "$tong_tien" }, so_don: { $sum: 1 } } },
  { $match: { tong: { $gte: 5_000_000 } } },
  { $sort: { tong: -1 } },
  { $limit: 10 },
])
```

Đọc thành một câu: *"trong các đơn đã giao từ đầu tháng, tính tổng chi theo khách, giữ khách chi từ 5 triệu, lấy 10 người cao nhất."*

## Code chạy thế nào

Ánh xạ sang SQL để thấy rõ vai trò của `$match` ở hai vị trí:

```sql
SELECT khach_id, SUM(tong_tien) AS tong, COUNT(*) AS so_don
FROM don_hang
WHERE trang_thai = 'da_giao' AND tao_luc >= :dau_thang    -- ← $match TRƯỚC $group
GROUP BY khach_id
HAVING SUM(tong_tien) >= 5000000                           -- ← $match SAU $group
ORDER BY tong DESC
LIMIT 10;
```

```text
$match trước $group  =  WHERE
$match sau $group    =  HAVING
```

Cùng một stage, **vị trí quyết định ý nghĩa** — giống hệt [[group-by-va-ham-tong-hop]] trong SQL.

**Vì sao thứ tự là hiệu năng:**

```text
❌ CHẬM
   { $group: { _id: "$khach.id", tong: { $sum: "$tong_tien" } } },
   { $match: { _id: khachId } }
   ⇒ nhóm toàn bộ 5 triệu đơn, rồi vứt đi gần hết

✅ NHANH
   { $match: { "khach.id": khachId } },        ← dùng được index
   { $group: { _id: "$khach.id", tong: { $sum: "$tong_tien" } } }
   ⇒ lọc còn vài chục document trước khi nhóm
```

## Cú pháp

```js
{ $match:     { trang_thai: "moi" } }                      // lọc — cú pháp y như find()
{ $project:   { ma_don: 1, thang: { $month: "$tao_luc" } } } // chọn/tính field mới
{ $addFields: { loi: { $subtract: ["$thu", "$chi"] } } }     // thêm, giữ phần còn lại
{ $group:     { _id: "$the", so: { $sum: 1 } } }
{ $sort:      { tao_luc: -1 } }
{ $limit:     20 }
{ $unwind:    "$dong" }                                      // mảng → mỗi phần tử một document
{ $lookup:    { from: "khach", localField: "khach.id", foreignField: "_id", as: "kh" } }
```

**`$unwind`** là stage đặc trưng của mô hình document, không có tương đương trực tiếp trong SQL:

```js
// Top 10 SKU bán chạy trong tháng
db.don_hang.aggregate([
  { $match: { trang_thai: "da_giao", tao_luc: { $gte: dauThang } } },
  { $unwind: "$dong" },
  { $group: { _id: "$dong.sku", da_ban: { $sum: "$dong.so_luong" } } },
  { $sort: { da_ban: -1 } },
  { $limit: 10 },
])
```

⚠️ `$unwind` **nhân số document lên**. Sau nó, `$sum: 1` không còn đếm số **đơn** nữa mà đếm số **dòng** — đây là nguồn sai số thầm lặng trong báo cáo. Cần cả hai con số thì dùng `$addToSet` để đếm số đơn phân biệt.

**Toán tử trong `$group`:**

```js
{ $group: {
  _id: "$khach.id",
  tong:      { $sum: "$tong_tien" },
  trung_binh:{ $avg: "$tong_tien" },
  so_don:    { $sum: 1 },              // đếm: cộng 1 cho mỗi document
  sku_khac:  { $addToSet: "$dong.sku" },
  don_dau:   { $first: "$$ROOT" },     // cần $sort trước
} }
```

`_id: null` để gộp toàn bộ thành một dòng; `_id` là object để nhóm theo nhiều field.

## Tại sao cần nó

Vì ba quy tắc thứ tự dưới đây quyết định pipeline chạy được hay quá hạn:

```text
① $match càng sớm càng tốt
   Chỉ $match ở STAGE ĐẦU TIÊN mới dùng được index.
   Sau $group hay $unwind, dữ liệu không còn là collection — không index nào giúp được.

② $sort + $limit đi liền nhau
   Mongo nhận ra cặp này và chỉ giữ N document trong bộ nhớ,
   thay vì sắp xếp toàn bộ rồi cắt.

③ $project bỏ field nặng TRƯỚC các stage tốn kém
   Không cần `noi_dung` 50KB thì đừng mang nó theo suốt dây chuyền.
```

Và một giới hạn cứng: **mỗi stage có trần 100MB RAM**. Vượt thì pipeline **lỗi**, không phải chậm.

```js
db.don_hang.aggregate(pipeline, { allowDiskUse: true })
```

`allowDiskUse` là lối thoát, nhưng nếu bạn cần nó thì **hãy xem lại thứ tự stage trước đã** — thường vấn đề nằm ở đó.

```js
db.don_hang.explain("executionStats").aggregate(pipeline)
```

Nhìn stage đầu tiên: nếu là `COLLSCAN` mà bạn tin là có index, thì `$match` của bạn **không ở đầu**, hoặc filter dùng field mà index không phục vụ ([[index-va-doc-explain]]).

## So sánh

Hai mẫu dùng được ngay:

```js
// Doanh thu theo ngày — dữ liệu vẽ biểu đồ
{ $group: {
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$tao_luc", timezone: "Asia/Ho_Chi_Minh" } },
    doanh_thu: { $sum: "$tong_tien" },
} }
```

`timezone` là chi tiết dễ bỏ sót với hậu quả rõ ràng: không có nó, "ngày" được cắt theo UTC, nên đơn đặt lúc 8 giờ sáng giờ Việt Nam rơi vào **ngày hôm trước**. Mọi báo cáo theo ngày đều lệch, và không ai phát hiện cho tới khi đối chiếu sổ sách.

```js
// $facet — nhiều pipeline song song trên cùng dữ liệu vào
{ $facet: {
    trang: [{ $sort: { gia: 1 } }, { $skip: 0 }, { $limit: 20 }],
    tong: [{ $count: "so_luong" }],
    theo_thuong_hieu: [{ $group: { _id: "$thuong_hieu", so: { $sum: 1 } } }],
} }
```

Đây đúng là hình dạng dữ liệu mà một trang danh sách có bộ lọc cần: danh sách, tổng số để phân trang, và số đếm cho từng nhóm lọc.

```js
// $merge — ghi kết quả ra collection, cho báo cáo nặng chạy theo lịch
[...pipeline, { $merge: { into: "bao_cao_ngay", on: "_id", whenMatched: "replace" } }]
```

## Dễ nhầm

**1. `$match` không ở đầu pipeline.** Không dùng index, quét toàn bộ.

**2. `$lookup` trước khi lọc.** Hàng triệu lần tra cứu.

**3. Mang field nặng suốt pipeline.** Chậm, dễ vượt 100MB.

**4. `$sum: 1` sau `$unwind`.** Đếm sai — đếm dòng, không phải đơn.

**5. `$dateToString` không có `timezone`.** Báo cáo theo ngày lệch múi giờ.

**6. Dùng `allowDiskUse` để chữa pipeline sai thứ tự.** Che lỗi thiết kế, và vẫn chậm.

**7. Chạy báo cáo nặng trên node chính.** Pipeline nặng tiêu CPU và RAM của chính node đang trả lời request người dùng. Đẩy sang node phụ (`readPreference: 'secondary'`) hoặc dùng `$merge` theo lịch.

**8. Dùng aggregation cho việc `find()` làm được.** Lọc và sắp xếp thì `find()` rõ ràng hơn và không có gì nhanh hơn.

## Mẹo nhớ

> **Dây chuyền phân loại thư: LỌC TRƯỚC rồi mới nhóm.**
>
> **Chỉ `$match` ở stage ĐẦU TIÊN mới dùng được index.**
>
> **`$unwind` nhân document lên — cẩn thận khi đếm.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `$match` trước và sau `$group` tương ứng với gì trong SQL?
2. Vì sao `$match` ở stage thứ ba không dùng được index?
3. Sau `$unwind: "$dong"`, `{ $sum: 1 }` đang đếm cái gì?
4. Ba quy tắc thứ tự stage?
5. `timezone` trong `$dateToString` ảnh hưởng thế nào tới báo cáo?

## Tự viết lại

Không nhìn lại phần trên, viết pipeline cho:

```text
Top 5 danh mục có doanh thu cao nhất trong quý 3/2026, chỉ tính đơn đã giao,
kèm số đơn và giá trị trung bình mỗi đơn của từng danh mục.
(Mỗi đơn có mảng `dong`, mỗi dòng có `sku`, `danh_muc`, `gia`, `so_luong`.)
```

Tự kiểm: bạn đặt `$match` ở đâu, và sau `$unwind` thì "số đơn" bạn đếm bằng cách nào cho đúng?

## Thử sức

Dashboard của bạn hiển thị doanh thu 30 ngày, được mở 200 lần mỗi phút. Pipeline hiện tại mất 3 giây mỗi lần chạy và làm CPU của cơ sở dữ liệu luôn ở 90%.

Nêu **ba** cách xử lý, xếp theo công sức. Câu khó nhất: với cách dùng `$merge` chạy theo lịch, dữ liệu sẽ cũ tối đa bao lâu — và bạn quyết định tần suất chạy job dựa trên tiêu chí gì?
