---
title: Index và đọc explain
slug: index-va-doc-explain
summary: Index đơn, index kép và quy tắc ESR, covered query, và cách đọc explain để biết truy vấn có dùng index hay đang quét cả collection.
level: trung-cap
tags: [mongodb, index, hieu-nang, explain]
---

> **Sau bài này bạn sẽ:** biết thứ tự field trong index kép quan trọng thế nào, đọc được `explain` để phát hiện quét toàn bộ collection, và biết khi nào **không** nên thêm index.

## Không index thì mọi truy vấn quét toàn bộ

Không có index, `find({ email: "a@b.com" })` phải đọc **mọi** document trong collection để biết cái nào khớp. Với 1.000 document thì không ai nhận ra; với 5 triệu thì mỗi request kéo hàng GB từ đĩa lên RAM.

Index của Mongo là B-tree, giống ý tưởng với index của CSDL quan hệ (xem [[index-va-hieu-nang-truy-van]]) — nên các đánh đổi cũng giống: đọc nhanh hơn, ghi chậm hơn một chút, tốn thêm bộ nhớ và đĩa.

```js
db.nguoi_dung.createIndex({ email: 1 }, { unique: true })   // 1 = tăng, -1 = giảm
db.don_hang.createIndex({ tao_luc: -1 })
db.nguoi_dung.getIndexes()
db.nguoi_dung.dropIndex("email_1")
```

`unique: true` không chỉ để tăng tốc — nó là **ràng buộc dữ liệu**, và là cách duy nhất Mongo cho bạn ngăn bản ghi trùng. Với những field như `email`, `sku`, hay bộ field trong filter của một upsert (bài [[truy-van-va-cap-nhat]]), đây là thứ phải có, không phải tuỳ chọn.

Trên collection lớn ở production, tạo index dưới nền để không chặn truy vấn khác:

```js
db.don_hang.createIndex({ khach_id: 1 }, { background: true })   // mặc định từ 4.2+
```

## Index kép và quy tắc ESR

Đây là phần đem lại nhiều cải thiện nhất, và cũng bị làm sai nhiều nhất. **Thứ tự field trong index kép quyết định truy vấn nào dùng được nó.**

Index `{ a: 1, b: 1, c: 1 }` phục vụ được truy vấn lọc theo:

- `a`
- `a` + `b`
- `a` + `b` + `c`

Nhưng **không** phục vụ truy vấn chỉ lọc theo `b`, hay chỉ `c`, hay `b` + `c`. Đây gọi là *tiền tố trái*: bạn chỉ dùng được index từ đầu về sau, không nhảy giữa. Cách hình dung: danh bạ sắp theo (họ, tên) giúp bạn tìm "Trần Minh" và tìm mọi người họ "Trần", nhưng không giúp gì khi bạn chỉ biết tên là "Minh".

**Quy tắc ESR** cho thứ tự field — Equality, Sort, Range:

1. **E**quality: field so sánh bằng, đặt trước.
2. **S**ort: field dùng để sắp xếp, đặt giữa.
3. **R**ange: field so sánh khoảng (`$gt`, `$lt`, `$in`), đặt cuối.

Áp vào một truy vấn thật:

```js
db.don_hang
  .find({ trang_thai: "moi", tong_tien: { $gte: 500_000 } })   // E: trang_thai, R: tong_tien
  .sort({ tao_luc: -1 })                                        // S: tao_luc

// Index đúng theo ESR:
db.don_hang.createIndex({ trang_thai: 1, tao_luc: -1, tong_tien: 1 })
```

Vì sao Range phải đứng sau Sort: một khi index đi vào một *khoảng*, các field sau nó không còn được sắp thứ tự nữa. Đặt `tong_tien` trước `tao_luc` thì Mongo phải tự sắp xếp lại kết quả trong bộ nhớ — và nếu vượt 32MB, truy vấn **thất bại** với lỗi *Sort exceeded memory limit*, chứ không chỉ chậm.

Hai lưu ý về hướng sắp xếp: index dùng được cho cả `sort({ tao_luc: -1 })` và `sort({ tao_luc: 1 })` (đọc index theo chiều ngược lại là chuyện rẻ). Nhưng khi sắp theo **nhiều** field, hướng tương đối phải khớp: index `{ a: 1, b: -1 }` phục vụ `sort({ a: 1, b: -1 })` và `sort({ a: -1, b: 1 })`, không phục vụ `sort({ a: 1, b: 1 })`.

## Các loại index khác

```js
// Index trên field lồng và trên mảng — cú pháp giống nhau
db.don_hang.createIndex({ "khach.sdt": 1 })
db.don_hang.createIndex({ "dong.sku": 1 })       // multikey: index từng phần tử mảng

// Text search
db.bai_viet.createIndex({ tieu_de: "text", noi_dung: "text" })
db.bai_viet.find({ $text: { $search: "mongodb index" } })

// Partial: chỉ index phần document thật sự được truy vấn
db.don_hang.createIndex(
  { tao_luc: -1 },
  { partialFilterExpression: { trang_thai: { $in: ["moi", "dang_giao"] } } },
)

// TTL: tự xoá document sau một khoảng thời gian
db.phien.createIndex({ tao_luc: 1 }, { expireAfterSeconds: 86_400 })
```

**Partial index** đáng biết: nếu 95% đơn hàng đã hoàn tất và bạn chỉ truy vấn đơn đang xử lý, index chỉ chứa 5% dữ liệu — nhỏ hơn, nằm gọn trong RAM, ghi rẻ hơn.

**TTL index** là cách gọn nhất để dọn dữ liệu tạm: phiên đăng nhập, token đặt lại mật khẩu, log ngắn hạn. Mongo quét mỗi 60 giây và xoá, nên "hết hạn" là *khoảng* chứ không phải đúng giây — đừng dựa vào nó cho logic bảo mật cần chính xác.

Một cảnh báo về multikey: index trên mảng có một entry cho **mỗi phần tử**. Mảng 100 phần tử ⇒ 100 entry cho một document. Đây là lý do nữa để mảng có trần.

## Đọc explain

`explain` trả lời một câu hỏi: **truy vấn này dùng index hay đang quét?**

```js
db.don_hang
  .find({ trang_thai: "moi" })
  .sort({ tao_luc: -1 })
  .explain("executionStats")
```

Đọc từ trên xuống, ba con số và một chữ:

```
executionStats: {
  nReturned: 20,              // số document trả về
  totalKeysExamined: 20,      // số entry index đã đọc
  totalDocsExamined: 20,      // số document đã đọc
  executionTimeMillis: 1,
}
winningPlan: { stage: "IXSCAN", indexName: "trang_thai_1_tao_luc_-1" }
```

Điều duy nhất phải nhớ để chẩn đoán:

| Dấu hiệu | Nghĩa |
|---|---|
| `stage: "COLLSCAN"` | Quét toàn bộ collection — **thiếu index** |
| `stage: "IXSCAN"` | Dùng index |
| `stage: "FETCH"` | Đọc index rồi đọc document (bình thường) |
| `stage: "SORT"` | Sắp xếp trong bộ nhớ — index không phục vụ được `sort` |
| `totalDocsExamined ≈ nReturned` | Index chọn lọc tốt |
| `totalDocsExamined >> nReturned` | Index kém chọn lọc, hoặc sai thứ tự field |
| `totalDocsExamined: 0` | Covered query — trả lời hoàn toàn từ index |

Tỉ lệ `totalDocsExamined / nReturned` là chỉ số hữu ích nhất: gần 1 là tốt; đọc 50.000 document để trả về 20 nghĩa là index đang không làm việc của nó. Ý tưởng và cách đọc rất giống `EXPLAIN ANALYZE` của Postgres — xem [[doc-explain-analyze]].

**Covered query** là trường hợp đẹp nhất: mọi field trong filter *và* trong projection đều nằm trong index, nên Mongo không cần đọc document nào.

```js
db.nguoi_dung.createIndex({ email: 1, ten: 1 })
db.nguoi_dung.find({ email: "a@b.com" }, { projection: { _id: 0, ten: 1 } })
// → totalDocsExamined: 0
```

Chú ý `_id: 0` — `_id` mặc định được trả về, và nếu nó không nằm trong index thì truy vấn mất tính "covered".

## Tìm truy vấn chậm

```js
// Bật profiler: ghi lại mọi truy vấn chậm hơn 100ms
db.setProfilingLevel(1, { slowms: 100 })

// Xem 10 truy vấn chậm nhất gần đây
db.system.profile.find().sort({ millis: -1 }).limit(10)

// Xem index nào thật sự được dùng — và index nào chưa bao giờ dùng
db.don_hang.aggregate([{ $indexStats: {} }])
```

`$indexStats` đáng chạy định kỳ. Index có `accesses.ops: 0` sau nhiều tuần là index chỉ làm chậm việc ghi và chiếm RAM — xoá đi.

## Khi nào không nên thêm index

Index không miễn phí: mỗi index làm mọi lệnh ghi phải cập nhật thêm một B-tree, và chiếm phần RAM mà lẽ ra dùng để cache dữ liệu.

Đừng thêm index khi:

- Collection nhỏ (vài nghìn document) — quét toàn bộ còn nhanh hơn.
- Field có độ chọn lọc thấp: `{ da_kich_hoat: 1 }` với hai giá trị true/false gần như vô dụng — trừ khi làm field đầu của một index kép, hoặc dùng partial index.
- Collection ghi rất nhiều, đọc rất ít (log, event stream).
- Đã có index kép mà field cần là **tiền tố trái** của nó: có `{ a: 1, b: 1 }` thì index `{ a: 1 }` là dư thừa, xoá được.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không index field trong filter | `COLLSCAN`, chậm dần theo dữ liệu | `explain` rồi tạo index |
| Sai thứ tự field index kép | Index không được dùng, hoặc `SORT` trong RAM | Theo ESR |
| Range trước Sort | Sắp xếp trong bộ nhớ, có thể lỗi 32MB | Sort trước Range |
| Nhiều index đơn thay vì một index kép | Ghi chậm, RAM tốn, vẫn không phục vụ được | Một index kép theo ESR |
| Không index `foreignField` của `$lookup` | Quét collection cho mỗi document đi vào | Index phía được lookup |
| Index tồn tại nhưng không ai dùng | Ghi chậm vô ích | `$indexStats` rồi xoá |

## Ghi nhớ

- Không index nghĩa là quét toàn bộ collection — `explain` là cách duy nhất để biết chắc.
- Index kép chỉ dùng được từ tiền tố trái; thứ tự field theo ESR: Equality → Sort → Range.
- `COLLSCAN` và `SORT` trong `explain` là hai từ cần tìm khi truy vấn chậm.
- `totalDocsExamined / nReturned` gần 1 là index tốt.
- Partial index và TTL index giải quyết gọn hai bài toán rất thường gặp.

## Tự kiểm tra

1. Có index `{ trang_thai: 1, tao_luc: -1 }`. Truy vấn `find({}).sort({ tao_luc: -1 })` dùng được không? Vì sao?
2. Viết index đúng cho: `find({ khach_id: X, tong_tien: { $gt: 100000 } }).sort({ tao_luc: -1 })`.
3. `explain` cho `nReturned: 15`, `totalDocsExamined: 42000`. Bạn kết luận gì và làm gì tiếp?
