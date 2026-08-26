---
title: Index và đọc explain
slug: index-va-doc-explain
summary: Index đơn, index kép và quy tắc ESR, covered query, và cách đọc explain để biết truy vấn có dùng index hay đang quét cả collection.
level: trung-cap
tags: [mongodb, index, hieu-nang, explain]
khung: v2
---

> **Sau bài này bạn sẽ:** đặt đúng thứ tự field trong index kép bằng quy tắc ESR, và đọc `explain` để biết chắc truy vấn có dùng index hay không.

## Ý tưởng chính

Không có index, `find({ email: "a@b.com" })` phải đọc **mọi** document trong collection. Với 5 triệu bản ghi, mỗi request kéo hàng GB từ đĩa lên RAM.

Nhưng phần khó không phải "có index hay không" — mà là **thứ tự field trong index kép**. Sai thứ tự thì index tồn tại mà truy vấn vẫn không dùng được.

## Mental model

Hãy nghĩ tới **danh bạ sắp theo (họ, tên)**.

> Bạn tìm "Trần Minh" — mở đúng phần "Trần", rồi tìm "Minh". Nhanh.
>
> Bạn tìm mọi người **họ Trần** — vẫn nhanh, mở một lần là thấy cả khối.
>
> Bạn chỉ biết **tên là "Minh"** — danh bạ vô dụng. Bạn phải lật từng trang, vì "Minh" nằm rải rác khắp nơi.

Đó chính là **quy tắc tiền tố trái**: index dùng được **từ đầu về sau**, không nhảy cột.

## Ví dụ nhỏ

```js
db.don_hang.createIndex({ khach_id: 1, trang_thai: 1, tao_luc: -1 })
```

```text
DÙNG ĐƯỢC cho:
  { khach_id: 1 }
  { khach_id: 1, trang_thai: "moi" }
  { khach_id: 1, trang_thai: "moi", tao_luc: {...} }

KHÔNG dùng được:
  { trang_thai: "moi" }        ← thiếu field đầu
  { tao_luc: {...} }           ← thiếu hai field đầu
```

## Code chạy thế nào

**Quy tắc ESR** — thứ tự field trong index kép:

```text
E  Equality  field so sánh BẰNG        → đặt TRƯỚC
S  Sort      field dùng để SẮP XẾP     → đặt GIỮA
R  Range     field so sánh KHOẢNG      → đặt SAU
```

```js
// Truy vấn
db.don_hang
  .find({ trang_thai: "moi", tong_tien: { $gte: 500_000 } })   // E: trang_thai · R: tong_tien
  .sort({ tao_luc: -1 })                                        // S: tao_luc

// Index đúng theo ESR
db.don_hang.createIndex({ trang_thai: 1, tao_luc: -1, tong_tien: 1 })
```

Vì sao **Range phải đứng sau Sort**:

```text
Index sắp theo (trang_thai, tao_luc, tong_tien)

Đi vào một KHOẢNG của tong_tien ⇒ các field SAU nó không còn thứ tự
⇒ nếu đặt tong_tien trước tao_luc, Mongo phải TỰ SẮP XẾP kết quả trong bộ nhớ
⇒ vượt 32MB ⇒ truy vấn THẤT BẠI:  "Sort exceeded memory limit"
```

Đây không phải chậm — nó là **lỗi**. Và nó chỉ xuất hiện khi dữ liệu đủ lớn, tức là ở production.

**Hướng sắp xếp:** index dùng được cho cả `sort({tao_luc: -1})` lẫn `sort({tao_luc: 1})` (đọc ngược lại là chuyện rẻ). Nhưng khi sắp theo **nhiều** field, hướng tương đối phải khớp: index `{a: 1, b: -1}` phục vụ `sort({a:1, b:-1})` và `sort({a:-1, b:1})`, **không** phục vụ `sort({a:1, b:1})`.

## Cú pháp

```js
db.nguoi_dung.createIndex({ email: 1 }, { unique: true })
db.don_hang.createIndex({ "khach.sdt": 1 })        // field lồng
db.don_hang.createIndex({ "dong.sku": 1 })         // multikey: index từng phần tử mảng

// Index từng phần — chỉ index dữ liệu bạn thật sự truy vấn
db.don_hang.createIndex(
  { tao_luc: -1 },
  { partialFilterExpression: { trang_thai: { $in: ["moi", "dang_giao"] } } },
)

// TTL — tự xoá document sau N giây
db.phien.createIndex({ tao_luc: 1 }, { expireAfterSeconds: 86_400 })

// Text search
db.bai_viet.createIndex({ tieu_de: "text", noi_dung: "text" })
```

`unique: true` không chỉ để tăng tốc — nó là **ràng buộc dữ liệu**, và là cách duy nhất Mongo cho bạn ngăn bản ghi trùng. Với `email`, `sku`, hay bộ field trong filter của một upsert ([[truy-van-va-cap-nhat]]), đây là thứ **phải có**.

**TTL index** là cách gọn nhất để dọn dữ liệu tạm: phiên đăng nhập, token đặt lại mật khẩu, log ngắn hạn. Mongo quét mỗi 60 giây, nên "hết hạn" là **khoảng** chứ không đúng giây — đừng dựa vào nó cho logic bảo mật cần chính xác.

⚠️ **Multikey**: index trên mảng có một entry cho **mỗi phần tử**. Mảng 100 phần tử ⇒ 100 entry cho một document. Đây là lý do nữa để mảng có trần.

## Tại sao cần nó

Vì `explain` trả lời đúng một câu: **truy vấn này dùng index hay đang quét?**

```js
db.don_hang.find({ trang_thai: "moi" }).sort({ tao_luc: -1 }).explain("executionStats")
```

```text
executionStats: {
  nReturned: 20,               số document trả về
  totalKeysExamined: 20,       số entry index đã đọc
  totalDocsExamined: 20,       số document đã đọc
  executionTimeMillis: 1,
}
winningPlan: { stage: "IXSCAN", indexName: "trang_thai_1_tao_luc_-1" }
```

| Dấu hiệu | Nghĩa |
|---|---|
| `stage: "COLLSCAN"` | Quét toàn bộ collection — **thiếu index** |
| `stage: "IXSCAN"` | Đang dùng index |
| `stage: "SORT"` | Sắp xếp trong bộ nhớ — index không phục vụ được `sort` |
| `totalDocsExamined ≈ nReturned` | Index chọn lọc tốt |
| `totalDocsExamined >> nReturned` | Index kém chọn lọc, hoặc sai thứ tự field |
| `totalDocsExamined: 0` | **Covered query** — trả lời hoàn toàn từ index |

Tỉ lệ `totalDocsExamined / nReturned` là chỉ số hữu ích nhất: gần 1 là tốt; đọc 50.000 document để trả về 20 nghĩa là index đang không làm việc của nó.

**Covered query** — trường hợp đẹp nhất:

```js
db.nguoi_dung.createIndex({ email: 1, ten: 1 })
db.nguoi_dung.find({ email: "a@b.com" }, { projection: { _id: 0, ten: 1 } })
// → totalDocsExamined: 0
```

Chú ý `_id: 0` — `_id` mặc định được trả về, và nếu nó không nằm trong index thì truy vấn mất tính "covered".

## So sánh

**Khi nào KHÔNG nên thêm index:**

```text
· Collection nhỏ (vài nghìn document) — quét toàn bộ còn nhanh hơn
· Field độ chọn lọc thấp: { da_kich_hoat: 1 } với hai giá trị true/false
  ⇒ trừ khi làm field đầu của index kép, hoặc dùng partial index
· Collection ghi rất nhiều, đọc rất ít (log, event stream)
· Field đã là TIỀN TỐ TRÁI của index kép khác — index đó là thừa
```

**Tìm truy vấn chậm:**

```js
db.setProfilingLevel(1, { slowms: 100 })              // ghi lại truy vấn chậm hơn 100ms
db.system.profile.find().sort({ millis: -1 }).limit(10)
db.don_hang.aggregate([{ $indexStats: {} }])          // index nào ĐANG được dùng
```

`$indexStats` đáng chạy định kỳ: index có `accesses.ops: 0` sau nhiều tuần là index chỉ làm chậm việc ghi và chiếm RAM — xoá đi.

## Dễ nhầm

**1. Không index field trong filter.** `COLLSCAN`, chậm dần theo dữ liệu.

**2. Sai thứ tự field trong index kép.** Index không được dùng, hoặc `SORT` trong RAM.

**3. Range trước Sort.** Sắp xếp trong bộ nhớ, và có thể **lỗi** 32MB.

**4. Nhiều index đơn thay vì một index kép.** Mongo thường chỉ dùng **một** index cho một truy vấn — ba index đơn không thay được một index kép đúng thứ tự.

**5. Không index `foreignField` của `$lookup`.** Quét collection cho mỗi document đi vào ([[thiet-ke-lang-nhau-hay-tham-chieu]]).

**6. Index tồn tại nhưng không ai dùng.** Ghi chậm vô ích — kiểm bằng `$indexStats`.

**7. Quên `_id: 0` khi muốn covered query.** Mất tính covered mà không hiểu vì sao.

## Mẹo nhớ

> **Danh bạ sắp theo (họ, tên): biết họ thì tra được, chỉ biết tên thì vô dụng.**
>
> **ESR: Equality → Sort → Range.**
>
> **Hai từ cần tìm trong `explain`: `COLLSCAN` và `SORT`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Quy tắc tiền tố trái nghĩa là gì — giải thích bằng hình ảnh danh bạ?
2. ESR là gì, và vì sao Range phải đứng **sau** Sort?
3. Ba dấu hiệu trong `explain` cho biết có vấn đề?
4. Covered query là gì, và điều kiện để đạt được nó?
5. Bốn trường hợp **không** nên thêm index?

## Tự viết lại

Không nhìn lại phần trên, viết index cho từng truy vấn:

```js
find({ khach_id: X, trang_thai: "moi" }).sort({ tao_luc: -1 })
find({ trang_thai: "cho_duyet" }).sort({ tao_luc: 1 })     // chỉ 2% document
find({ tong_tien: { $gte: A, $lte: B } }).sort({ tong_tien: 1 })
```

Tự kiểm: truy vấn thứ hai — bạn dùng index thường hay partial index, và tiết kiệm được bao nhiêu?

## Thử sức

`explain` của một truy vấn cho: `nReturned: 15`, `totalDocsExamined: 42000`, `stage: "IXSCAN"`.

Có index, và Mongo **đang dùng** nó — nhưng vẫn đọc 42.000 document để trả về 15. Giải thích vì sao điều đó xảy ra, và nêu **hai** cách sửa khác nhau. Câu khó: cách nào bạn chọn nếu collection này còn có 5 truy vấn khác cũng chạy thường xuyên?
