---
title: Aggregation pipeline
slug: aggregation-pipeline
summary: Các stage dùng nhiều nhất, thứ tự stage quyết định hiệu năng, $group so với GROUP BY, và khi nào đừng dùng aggregation.
level: trung-cap
tags: [mongodb, aggregation, bao-cao]
---

> **Sau bài này bạn sẽ:** viết được pipeline thống kê nhiều bước, biết đặt `$match` và `$limit` ở đâu để pipeline không chết trên dữ liệu thật, và biết khi nào việc này nên làm ở nơi khác.

## Pipeline là một dây chuyền

Aggregation là một mảng các **stage**. Mỗi stage nhận luồng document từ stage trước, biến đổi, đẩy sang stage sau. Cách đọc dễ nhất: giống pipe của shell — `grep | sort | head`, mỗi khâu làm một việc.

```js
db.don_hang.aggregate([
  { $match: { trang_thai: "da_giao", tao_luc: { $gte: dauThang } } },   // lọc
  { $group: { _id: "$khach.id", tong: { $sum: "$tong_tien" }, so_don: { $sum: 1 } } },
  { $match: { tong: { $gte: 5_000_000 } } },                            // lọc trên kết quả nhóm
  { $sort: { tong: -1 } },
  { $limit: 10 },
])
```

Pipeline trên đọc thành một câu: "trong các đơn đã giao từ đầu tháng, tính tổng chi theo khách, giữ khách chi từ 5 triệu, lấy 10 người cao nhất".

Tương đương SQL, để đối chiếu (xem [[group-by-va-ham-tong-hop]]):

```sql
SELECT khach_id, SUM(tong_tien) AS tong, COUNT(*) AS so_don
FROM don_hang
WHERE trang_thai = 'da_giao' AND tao_luc >= :dau_thang
GROUP BY khach_id
HAVING SUM(tong_tien) >= 5000000
ORDER BY tong DESC
LIMIT 10;
```

Ánh xạ đáng nhớ: `$match` trước `$group` là `WHERE`, `$match` sau `$group` là `HAVING`. Cùng một stage, vị trí quyết định ý nghĩa.

## Các stage dùng nhiều

```js
{ $match:   { trang_thai: "moi" } }                      // lọc — cú pháp y như find()
{ $project: { ma_don: 1, thang: { $month: "$tao_luc" } } } // chọn/tính field mới
{ $addFields: { loi_nhuan: { $subtract: ["$doanh_thu", "$chi_phi"] } } } // thêm, giữ nguyên phần còn lại
{ $group:   { _id: "$the", so_luong: { $sum: 1 } } }      // nhóm
{ $sort:    { tao_luc: -1 } }
{ $limit:   20 }
{ $skip:    20 }
{ $unwind:  "$dong" }                                     // mảng → mỗi phần tử một document
{ $lookup:  { from: "khach_hang", localField: "khach.id", foreignField: "_id", as: "kh" } }
{ $count:   "tong_so" }
```

`$unwind` là stage đặc trưng của mô hình document và không có tương đương trực tiếp trong SQL. Nó "mở" một mảng ra: document có 3 dòng đơn hàng trở thành 3 document, mỗi cái mang một dòng. Đây là cách để thống kê xuyên qua mảng lồng:

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

Lưu ý về `$unwind`: nó **nhân số document lên**. Sau `$unwind`, `$sum: 1` không còn đếm số đơn hàng nữa mà đếm số dòng — đây là nguồn sai số thầm lặng trong báo cáo. Cần cả hai con số thì nhóm theo `_id` gốc trước, hoặc dùng `$addToSet` để đếm số đơn phân biệt.

Các toán tử tổng hợp trong `$group`:

```js
{ $group: {
  _id: "$khach.id",
  tong:      { $sum: "$tong_tien" },
  trung_binh:{ $avg: "$tong_tien" },
  cao_nhat:  { $max: "$tong_tien" },
  so_don:    { $sum: 1 },              // đếm: cộng 1 cho mỗi document
  danh_sach: { $push: "$ma_don" },     // gom thành mảng — cẩn thận với nhóm lớn
  sku_khac:  { $addToSet: "$dong.sku" },  // gom, bỏ trùng
  don_dau:   { $first: "$$ROOT" },     // document đầu của nhóm (cần $sort trước)
} }
```

`_id: null` để tổng hợp toàn bộ thành một dòng:

```js
db.don_hang.aggregate([
  { $match: { tao_luc: { $gte: dauThang } } },
  { $group: { _id: null, doanh_thu: { $sum: "$tong_tien" }, so_don: { $sum: 1 } } },
])
```

Nhóm nhiều field thì `_id` là một document:

```js
{ $group: { _id: { thang: { $month: "$tao_luc" }, trang_thai: "$trang_thai" }, so_don: { $sum: 1 } } }
```

## Thứ tự stage là hiệu năng

Đây là phần quan trọng nhất của bài. Hai pipeline sau cho **kết quả giống nhau** nhưng chênh nhau hàng chục lần về thời gian:

```js
// CHẬM: nhóm toàn bộ 5 triệu đơn, rồi mới bỏ đi gần hết
db.don_hang.aggregate([
  { $group: { _id: "$khach.id", tong: { $sum: "$tong_tien" } } },
  { $match: { _id: khachId } },
])

// NHANH: lọc còn vài chục document trước khi nhóm
db.don_hang.aggregate([
  { $match: { "khach.id": khachId } },     // dùng được index
  { $group: { _id: "$khach.id", tong: { $sum: "$tong_tien" } } },
])
```

Ba quy tắc, theo thứ tự quan trọng:

1. **`$match` càng sớm càng tốt.** Chỉ `$match` ở stage *đầu tiên* mới dùng được index. Sau khi đã qua `$group` hay `$unwind`, dữ liệu không còn là collection nữa — không index nào giúp được.
2. **`$sort` + `$limit` nên đi liền nhau.** Mongo nhận ra cặp này và chỉ giữ N document trong bộ nhớ thay vì sắp xếp toàn bộ.
3. **`$project` bỏ field nặng trước các stage tốn kém**, nhất là trước `$group` và `$lookup`. Không cần `noi_dung` 50KB thì đừng mang nó theo suốt dây chuyền.

Và một hệ quả từ bài trước: `$lookup` đặt sau `$match`/`$limit`, không đặt trước. `$lookup` trên 5 triệu document là 5 triệu lần tra cứu.

Giới hạn cứng cần biết: mỗi stage có trần **100MB RAM**. Vượt thì pipeline lỗi, không phải chậm. Xử lý dữ liệu lớn thì bật `{ allowDiskUse: true }` — nhưng đó là dấu hiệu nên xem lại thứ tự stage trước đã.

```js
db.don_hang.aggregate(pipeline, { allowDiskUse: true })
```

`explain` cũng chạy với aggregation, và nên chạy:

```js
db.don_hang.explain("executionStats").aggregate(pipeline)
```

Nhìn stage đầu tiên: nếu là `COLLSCAN` mà bạn tin là có index, thì `$match` của bạn đang không ở đầu, hoặc filter dùng field mà index không phục vụ (xem [[index-va-doc-explain]]).

## Vài mẫu dùng được ngay

**Doanh thu theo ngày** — trả về dữ liệu vẽ biểu đồ:

```js
db.don_hang.aggregate([
  { $match: { trang_thai: "da_giao", tao_luc: { $gte: ba_muoi_ngay_truoc } } },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$tao_luc", timezone: "Asia/Ho_Chi_Minh" } },
      doanh_thu: { $sum: "$tong_tien" },
      so_don: { $sum: 1 },
  } },
  { $sort: { _id: 1 } },
])
```

`timezone` là chi tiết dễ bỏ sót và hậu quả rõ ràng: không có nó, "ngày" được cắt theo UTC, nên đơn đặt lúc 8h sáng giờ Việt Nam rơi vào ngày hôm trước. Mọi báo cáo theo ngày đều lệch, và không ai phát hiện cho tới khi đối chiếu với sổ sách.

**Đếm tổng và lấy một trang trong cùng một lần gọi** — `$facet` chạy nhiều pipeline song song trên cùng dữ liệu vào:

```js
db.san_pham.aggregate([
  { $match: { danh_muc: "ao" } },
  { $facet: {
      trang: [{ $sort: { gia: 1 } }, { $skip: 0 }, { $limit: 20 }],
      tong: [{ $count: "so_luong" }],
      theo_thuong_hieu: [{ $group: { _id: "$thuong_hieu", so: { $sum: 1 } } }],
  } },
])
```

Đây đúng là hình dạng dữ liệu một trang danh sách có bộ lọc cần: danh sách, tổng số để phân trang, và số đếm cho từng nhóm lọc.

**Ghi kết quả ra collection** — cho báo cáo nặng chạy theo lịch:

```js
db.don_hang.aggregate([...pipeline, { $merge: { into: "bao_cao_ngay", on: "_id", whenMatched: "replace" } }])
```

`$merge` (hoặc `$out`) phải là stage cuối. Kết hợp với một cron job, đây là cách gọn để trang dashboard đọc dữ liệu đã tính sẵn thay vì tính lại mỗi lần mở.

## Khi nào đừng dùng aggregation

- **Truy vấn đơn giản.** Lọc và sắp xếp thì `find()` rõ ràng hơn, và không có gì nhanh hơn. Dùng aggregation cho việc `find` làm được là làm code khó đọc mà không được gì.
- **Báo cáo phân tích nặng trên CSDL đang phục vụ người dùng.** Pipeline nặng tiêu CPU và RAM của chính node đang trả lời request. Đẩy sang node phụ (`readPreference: 'secondary'`), sang collection tính sẵn bằng `$merge`, hoặc sang kho dữ liệu riêng.
- **Nghiệp vụ nhiều bước phức tạp với nhiều nhánh điều kiện.** Pipeline 15 stage với `$cond` lồng nhau là thứ không ai gỡ lỗi được sau ba tháng. Đó là code, và code nên nằm ở ngôn ngữ có test.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `$match` không ở đầu pipeline | Không dùng index, quét toàn bộ | Đưa `$match` lên stage đầu |
| `$lookup` trước khi lọc | Hàng triệu lần tra cứu | `$match`/`$limit` trước `$lookup` |
| Mang field nặng suốt pipeline | Chậm, dễ vượt 100MB | `$project` bỏ sớm |
| `$sum: 1` sau `$unwind` | Đếm sai (đếm dòng, không phải đơn) | Nhóm lại, hoặc `$addToSet` |
| `$dateToString` không có timezone | Báo cáo theo ngày lệch múi giờ | Khai `timezone` |
| `allowDiskUse` để chữa pipeline sai | Che lỗi thiết kế, vẫn chậm | Sửa thứ tự stage trước |
| Báo cáo nặng chạy trên node chính | Ảnh hưởng người dùng thật | Node phụ, hoặc `$merge` theo lịch |

## Ghi nhớ

- Pipeline là dây chuyền: mỗi stage một việc, thứ tự quyết định hiệu năng.
- `$match` ở stage đầu là điều kiện duy nhất để dùng index.
- `$match` trước `$group` = `WHERE`; sau `$group` = `HAVING`.
- `$unwind` nhân document lên — cẩn thận khi đếm.
- Báo cáo nặng thì tính trước bằng `$merge` theo lịch, đừng tính lúc người dùng đang chờ.

## Tự kiểm tra

1. Vì sao `$match` ở stage thứ ba (sau `$group`) không dùng được index?
2. Sau `$unwind: "$dong"`, `{ $sum: 1 }` đang đếm cái gì?
3. Dashboard cần doanh thu 30 ngày và mở 200 lần/phút. Bạn tổ chức thế nào?
