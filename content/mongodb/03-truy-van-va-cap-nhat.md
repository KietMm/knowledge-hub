---
title: Truy vấn và cập nhật
slug: truy-van-va-cap-nhat
summary: Toán tử lọc, projection, cập nhật nguyên tử, upsert, truy vấn trong mảng, và bulk write.
level: co-ban
tags: [mongodb, truy-van, cap-nhat]
khung: v2
---

> **Sau bài này bạn sẽ:** cập nhật dữ liệu **nguyên tử** thay vì đọc-sửa-ghi, và biết vì sao `$elemMatch` tồn tại.

## Ý tưởng chính

Người đến từ SQL hay mắc cùng một lỗi ở Mongo: **đọc dữ liệu về, sửa trong ứng dụng, rồi ghi lại**.

Cách đó vừa tốn hai vòng đi–về mạng, vừa **mất dữ liệu khi có hai request song song**. Mongo có sẵn các toán tử để máy chủ tự sửa — và dùng chúng là khác biệt giữa code chạy được và code đúng.

## Mental model

Hãy nghĩ tới **sửa một con số trên bảng thông báo**.

> **Đọc–sửa–ghi**: bạn chụp ảnh cái bảng, về bàn tính toán, rồi quay lại xoá hết và viết số mới.
> Trong lúc bạn đi, người khác cũng làm y vậy — và một trong hai người **xoá mất việc của người kia**.
>
> **Cập nhật nguyên tử**: bạn nói với người trực bảng *"cộng thêm 1 vào ô đó"*. Người trực làm ngay tại chỗ, và hai yêu cầu nối tiếp nhau — không ai mất gì.

Mọi toán tử `$inc`, `$push`, `$set` đều là câu *"làm giúp tôi ngay tại chỗ"*.

## Ví dụ nhỏ

```js
// ❌ Đọc rồi ghi — hai request song song sẽ ghi đè nhau
const don = await c.findOne({ _id: id })
don.so_lan_thu += 1
await c.replaceOne({ _id: id }, don)

// ✅ Một lệnh nguyên tử
await c.updateOne({ _id: id }, { $inc: { so_lan_thu: 1 } })
```

## Code chạy thế nào

Vì sao cách trên mất dữ liệu:

```text
so_lan_thu hiện tại = 5

Request A: đọc 5 ─────────────────► ghi 6
Request B:      đọc 5 ────► ghi 6

Kết quả: 6.  Đáng lẽ phải là 7 — mất một lần đếm.
```

Với `$inc`, máy chủ khoá document trong lúc thực hiện, nên hai lệnh nối tiếp nhau: `5 → 6 → 7`.

**Mẫu quan trọng nhất — đưa điều kiện nghiệp vụ vào filter:**

```js
const sau = await c.findOneAndUpdate(
  { _id: id, ton_kho: { $gte: 1 } },     // ← điều kiện nằm TRONG filter
  { $inc: { ton_kho: -1 } },
  { returnDocument: 'after' },
)
if (sau === null) throw new Error('Hết hàng')
```

```text
Kiểm ở code rồi mới ghi:  if (ton >= 1) { updateOne(...) }
                           ↑ có khe hở giữa kiểm và ghi ⇒ bán âm tồn kho

Điều kiện trong filter:    kiểm và ghi là MỘT hành động nguyên tử
                           không khớp ⇒ trả về null ⇒ bạn biết là hết hàng
```

Cùng ý tưởng với `UPDATE ... WHERE` trong SQL ([[truy-cap-dong-thoi-va-khoa]]).

## Cú pháp

**Đọc:**

```js
db.don.find({ trang_thai: "dang_giao" })
db.don.find({ tong_tien: { $gte: 500000 } })
db.don.find({ trang_thai: { $in: ["moi", "dang_giao"] } })
db.don.find({ ma_giam_gia: { $exists: true } })

// Nhiều điều kiện trong một object = AND ngầm
db.don.find({ trang_thai: "moi", tong_tien: { $gte: 500_000 } })

// $or phải viết tường minh, nhận một MẢNG
db.don.find({ $or: [{ trang_thai: "huy" }, { tong_tien: { $lt: 50_000 } }] })
```

**Projection** — không phải tối tiết:

```js
db.don.find({ trang_thai: "moi" }, { projection: { ma_don: 1, tong_tien: 1 } })
db.don.find({}, { projection: { lich_su: 0, payload_webhook: 0 } })
```

Với document lồng nhiều tầng, đây là chênh lệch giữa kéo 200 byte và 40 KB **cho mỗi bản ghi**.

**Toán tử cập nhật:**

```js
{ $set:   { trang_thai: "da_giao" } }      // gán
{ $unset: { ma_giam_gia: "" } }             // xoá field
{ $inc:   { ton_kho: -1, so_ban: 1 } }      // cộng/trừ
{ $min:   { gia_thap_nhat: 189000 } }       // chỉ ghi nếu nhỏ hơn
{ $push:  { dong: { sku: "MU-01" } } }      // thêm vào mảng
{ $pull:  { dong: { sku: "MU-01" } } }      // xoá phần tử khớp
{ $addToSet: { tags: "sale" } }             // thêm nếu chưa có
```

⚠️ **Quên `$set` là lỗi phá dữ liệu.** `replaceOne(filter, { trang_thai: "huy" })` **thay cả document** — mọi field khác biến mất. Nếu ý bạn là sửa một field, luôn dùng `updateOne` với `$set`.

## Tại sao cần nó

Vì **truy vấn trong mảng có một cái bẫy logic không bao giờ báo lỗi**:

```js
// SAI Ý ĐỊNH: khớp nếu MỘT phần tử có sku đúng và MỘT phần tử KHÁC có so_luong > 5
db.don.find({ "dong.sku": "AO-XL", "dong.so_luong": { $gt: 5 } })

// ĐÚNG: cùng MỘT phần tử thoả cả hai
db.don.find({ dong: { $elemMatch: { sku: "AO-XL", so_luong: { $gt: 5 } } } })
```

```text
Document:  dong: [ {sku:"AO-XL", so_luong:1}, {sku:"MU-01", so_luong:9} ]

Truy vấn sai:  "có phần tử nào sku=AO-XL?" ✓
               "có phần tử nào so_luong>5?" ✓
               ⇒ KHỚP, dù không phần tử nào thoả cả hai
```

`$elemMatch` tồn tại chính vì sự khác biệt đó. Bỏ qua nó là lỗi logic mà bộ test dữ liệu nhỏ thường không bắt được.

**Cập nhật phần tử trong mảng:**

```js
db.don.updateOne({ _id: id, "dong.sku": "MU-01" }, { $set: { "dong.$.so_luong": 3 } })

db.don.updateMany(
  { trang_thai: "moi" },
  { $set: { "dong.$[re].khuyen_mai": true } },
  { arrayFilters: [{ "re.gia": { $lt: 100_000 } }] },
)
```

**Upsert và bulk write:**

```js
await db.collection('thong_ke').updateOne(
  { ngay: "2026-08-26", sku: "AO-XL" },
  { $inc: { luot_xem: 1 }, $setOnInsert: { tao_luc: new Date() } },
  { upsert: true },
)
```

Upsert chạy song song **có thể tạo hai document trùng**, trừ khi có **unique index** trên đúng bộ field trong filter. Không có nó, dưới tải cao bạn sẽ có hai dòng thống kê cho cùng một ngày.

```js
await db.collection('san_pham').bulkWrite(
  capNhat.map((s) => ({ updateOne: { filter: { sku: s.sku }, update: { $set: { gia: s.gia } }, upsert: true } })),
  { ordered: false },     // không dừng ở lỗi đầu, và chạy song song được
)
```

## So sánh

| Muốn gì | Dùng |
|---|---|
| Sửa vài field | `updateOne` + `$set` |
| Cộng/trừ số | `$inc` — không bao giờ đọc-rồi-ghi |
| Kiểm điều kiện rồi mới ghi | Đưa điều kiện vào **filter** |
| Nhiều điều kiện trên cùng phần tử mảng | `$elemMatch` |
| Ghi nếu chưa có | `upsert` + **unique index** |
| Ghi hàng loạt | `bulkWrite({ ordered: false })` |

## Dễ nhầm

**1. Đọc–sửa–ghi thay vì `$inc`.** Mất cập nhật khi chạy song song.

**2. `replaceOne` khi ý là sửa một field.** Mất toàn bộ field khác.

**3. Kiểm điều kiện ở code rồi mới ghi.** Tồn kho âm.

**4. Hai điều kiện mảng không dùng `$elemMatch`.** Khớp sai, không báo lỗi.

**5. `skip()` cho phân trang sâu.** `skip(100000)` bắt máy chủ đếm qua 100.000 document rồi bỏ đi. Dùng phân trang theo con trỏ ([[phan-trang-loc-va-sap-xep]]):

```js
db.don.find({ _id: { $lt: idCuoiTrangTruoc } }).sort({ _id: -1 }).limit(20)
```

**6. Upsert không có unique index.** Sinh document trùng dưới tải.

**7. Vòng lặp `updateOne` cho lô lớn.** 1000 lệnh = 1000 vòng đi–về mạng. Dùng `bulkWrite`.

**8. Không kiểm `modifiedCount`.** `matchedCount > 0` mà `modifiedCount === 0` nghĩa là dữ liệu đã đúng như thế rồi — thường vô hại, nhưng đây là chỗ nhìn đầu tiên khi gỡ lỗi *"sao update không ăn"*.

## Mẹo nhớ

> **Nói với người trực bảng "cộng thêm 1", đừng chụp ảnh về nhà tính rồi viết đè.**
>
> **Điều kiện nghiệp vụ nằm trong FILTER ⇒ kiểm-và-ghi là nguyên tử.**
>
> **`$elemMatch` khi cần CÙNG MỘT phần tử thoả nhiều điều kiện.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao đọc–sửa–ghi làm mất cập nhật? Vẽ ra hai request song song.
2. Vì sao đưa điều kiện vào filter lại an toàn hơn kiểm ở code?
3. `find({ "a.x": 1, "a.y": 2 })` khớp document nào ngoài ý muốn?
4. Vì sao upsert cần unique index?
5. `matchedCount = 1`, `modifiedCount = 0` — chuyện gì đã xảy ra?

## Tự viết lại

Không nhìn lại phần trên, viết lệnh cho từng tình huống:

```text
a) Trừ tồn kho 1 sản phẩm, không cho âm, và biết được có thành công không
b) Thêm một thẻ vào bài viết, không cho trùng
c) Tăng bộ đếm lượt xem theo ngày, tạo mới nếu chưa có bản ghi ngày đó
d) Cập nhật giá cho 5000 sản phẩm từ một file
```

Tự kiểm: câu (c) — bạn cần index gì để nó an toàn dưới tải?

## Thử sức

Hệ thống của bạn bán vé. Log cho thấy có 3 vé được bán cho **cùng một ghế**, cả ba request cách nhau dưới 50ms.

Code hiện tại:

```js
const ghe = await c.findOne({ _id: gheId })
if (!ghe.da_dat) {
  await c.updateOne({ _id: gheId }, { $set: { da_dat: true, nguoi: userId } })
}
```

Chỉ ra chính xác khe hở, viết lại cho đúng, và trả lời câu khó: sau khi sửa, làm sao bạn **biết chắc** mình đã lấy được ghế — kiểm giá trị nào?
