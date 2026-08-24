---
title: Truy vấn và cập nhật
slug: truy-van-va-cap-nhat
summary: Toán tử lọc, projection, cập nhật nguyên tử, upsert, truy vấn trong mảng, và bulk write.
level: co-ban
tags: [mongodb, truy-van, cap-nhat]
---

> **Sau bài này bạn sẽ:** viết được truy vấn lọc nhiều điều kiện, cập nhật nguyên tử mà không cần đọc-sửa-ghi, và biết vì sao `$elemMatch` tồn tại.

## Đọc: filter và projection

Mọi truy vấn đọc đều là `find(filter, options)`. Filter là một document mô tả điều kiện; document rỗng `{}` nghĩa là lấy tất cả.

```js
db.don_hang.find({ trang_thai: "dang_giao" })                      // bằng
db.don_hang.find({ tong_tien: { $gte: 500000 } })                  // ≥
db.don_hang.find({ trang_thai: { $in: ["moi", "dang_giao"] } })     // thuộc tập
db.don_hang.find({ trang_thai: { $ne: "huy" } })                    // khác
db.don_hang.find({ ma_giam_gia: { $exists: true } })                // có field
```

Nhiều điều kiện trong cùng một document là **AND** ngầm:

```js
// trang_thai = "moi" VÀ tong_tien ≥ 500000 VÀ tạo trong 7 ngày
db.don_hang.find({
  trang_thai: "moi",
  tong_tien: { $gte: 500_000 },
  tao_luc: { $gte: new Date(Date.now() - 7 * 86_400_000) },
})
```

`$or` phải viết tường minh, và nhận một mảng:

```js
db.don_hang.find({
  $or: [{ trang_thai: "huy" }, { tong_tien: { $lt: 50_000 } }],
})
```

**Projection** quyết định field nào được trả về. Đây không phải tối tiết — với document lồng nhiều tầng, nó là chênh lệch giữa việc kéo 200 byte và 40KB qua mạng cho mỗi bản ghi:

```js
// Chỉ lấy những field cần cho danh sách đơn
db.don_hang.find({ trang_thai: "moi" }, { projection: { ma_don: 1, tong_tien: 1, tao_luc: 1 } })

// Hoặc: lấy hết trừ vài field nặng
db.don_hang.find({}, { projection: { lich_su_trang_thai: 0, payload_webhook: 0 } })
```

`_id` luôn được trả về kể cả khi không liệt kê; muốn bỏ thì `{ _id: 0 }`. Không trộn kiểu bao gồm (`1`) và loại trừ (`0`) trong cùng một projection — trừ đúng trường hợp `_id: 0`.

Sắp xếp, phân trang:

```js
db.don_hang.find({ trang_thai: "moi" }).sort({ tao_luc: -1 }).limit(20)
```

`skip()` tồn tại nhưng đừng dùng cho phân trang sâu: `skip(100000)` bắt máy chủ đếm qua 100.000 document rồi bỏ đi. Dùng phân trang theo con trỏ:

```js
// Trang sau: mọi document "cũ hơn" document cuối của trang trước
db.don_hang.find({ _id: { $lt: idCuoiTrangTruoc } }).sort({ _id: -1 }).limit(20)
```

Chủ đề này giống hệt ở REST API — xem [[phan-trang-loc-va-sap-xep]].

## Ghi: cập nhật nguyên tử

Đây là điểm người đến từ SQL hay làm sai nhất. Sai:

```js
// SAI: đọc, sửa ở ứng dụng, ghi lại
const don = await c.findOne({ _id: id })
don.so_lan_thu += 1
await c.replaceOne({ _id: id }, don)
```

Đoạn trên có hai vấn đề: nó tốn hai vòng đi-về, và **hai request chạy song song sẽ ghi đè nhau** — cùng đọc `so_lan_thu = 5`, cùng ghi `6`, mất một lần đếm. Đúng là để máy chủ tự sửa, trong một lệnh nguyên tử:

```js
await c.updateOne({ _id: id }, { $inc: { so_lan_thu: 1 } })
```

Các toán tử cập nhật dùng nhiều:

```js
{ $set:   { trang_thai: "da_giao", giao_luc: new Date() } }  // gán
{ $unset: { ma_giam_gia: "" } }                              // xoá field
{ $inc:   { ton_kho: -1, so_ban: 1 } }                       // cộng/trừ
{ $min:   { gia_thap_nhat: 189000 } }                        // chỉ ghi nếu nhỏ hơn
{ $max:   { xem_gan_nhat: new Date() } }                     // chỉ ghi nếu lớn hơn
{ $push:  { dong: { sku: "MU-01", so_luong: 1 } } }           // thêm vào mảng
{ $pull:  { dong: { sku: "MU-01" } } }                        // xoá phần tử khớp
{ $addToSet: { tags: "khuyen-mai" } }                         // thêm nếu chưa có
{ $currentDate: { sua_luc: true } }                           // đóng dấu thời gian
```

**Quên `$set` là lỗi phá dữ liệu.** `updateOne(filter, { trang_thai: "huy" })` bị driver từ chối, nhưng `replaceOne(filter, { trang_thai: "huy" })` thì chạy — và nó **thay cả document**, mọi field khác biến mất. Nếu ý bạn là "sửa một field", luôn dùng `updateOne` với `$set`.

`updateOne` sửa document đầu tiên khớp; `updateMany` sửa tất cả. Không có phanh an toàn nào ở đây — chạy `updateMany({}, ...)` trên production là một phút để hỏng cả collection. Chạy `countDocuments(filter)` với đúng filter đó trước, mỗi lần.

## Upsert: ghi nếu chưa có

```js
await db.collection('thong_ke_ngay').updateOne(
  { ngay: "2026-08-24", san_pham: "AO-XL-DEN" },
  { $inc: { luot_xem: 1 }, $setOnInsert: { tao_luc: new Date() } },
  { upsert: true },
)
```

Không có bản ghi thì tạo mới từ filter cộng phần cập nhật; có rồi thì cộng thêm. `$setOnInsert` chỉ áp dụng ở lần tạo — đúng chỗ cho `tao_luc`.

Một điều dễ bỏ sót: upsert chạy song song có thể tạo hai document trùng, trừ khi có **unique index** trên đúng bộ field trong filter. Với ví dụ trên là `{ ngay: 1, san_pham: 1 }` unique. Không có nó, dưới tải cao bạn sẽ có hai dòng thống kê cho cùng một ngày.

`findOneAndUpdate` trả về document, dùng khi cần giá trị sau khi sửa:

```js
const sau = await c.findOneAndUpdate(
  { _id: id, ton_kho: { $gte: 1 } },      // điều kiện nằm trong filter, không ở code
  { $inc: { ton_kho: -1 } },
  { returnDocument: 'after' },
)
if (sau === null) throw new Error('Hết hàng')
```

Mẫu này quan trọng: **đặt điều kiện nghiệp vụ vào filter** thì việc kiểm tra và việc ghi là một hành động nguyên tử. Kiểm `ton_kho >= 1` ở code rồi mới `$inc` là mở cửa cho bán âm tồn kho. Cùng ý tưởng với `UPDATE ... WHERE` trong SQL — xem [[truy-cap-dong-thoi-va-khoa]].

## Truy vấn trong mảng

Với `dong` là mảng các object, điều kiện đơn lẻ hoạt động trực tiếp:

```js
db.don_hang.find({ "dong.sku": "AO-XL-DEN" })     // có ít nhất một dòng SKU này
```

Nhưng hai điều kiện thì có một cái bẫy:

```js
// SAI ý định: khớp nếu MỘT phần tử có sku đúng và MỘT phần tử KHÁC có so_luong > 5
db.don_hang.find({ "dong.sku": "AO-XL-DEN", "dong.so_luong": { $gt: 5 } })

// ĐÚNG: cùng MỘT phần tử thoả cả hai
db.don_hang.find({ dong: { $elemMatch: { sku: "AO-XL-DEN", so_luong: { $gt: 5 } } } })
```

`$elemMatch` tồn tại chính vì sự khác biệt đó. Bỏ qua nó là một lỗi logic không bao giờ báo lỗi.

Cập nhật một phần tử cụ thể trong mảng — toán tử `$`:

```js
// $ trỏ tới phần tử đầu tiên khớp filter
db.don_hang.updateOne(
  { _id: id, "dong.sku": "MU-01" },
  { $set: { "dong.$.so_luong": 3 } },
)

// $[] cho mọi phần tử; $[dk] cho phần tử thoả điều kiện đặt tên
db.don_hang.updateMany(
  { trang_thai: "moi" },
  { $set: { "dong.$[re].khuyen_mai": true } },
  { arrayFilters: [{ "re.gia": { $lt: 100_000 } }] },
)
```

## Bulk write

Ghi 1.000 document bằng 1.000 lệnh `updateOne` là 1.000 vòng đi-về mạng. Gộp lại:

```js
await db.collection('san_pham').bulkWrite(
  capNhat.map((s) => ({
    updateOne: { filter: { sku: s.sku }, update: { $set: { gia: s.gia } }, upsert: true },
  })),
  { ordered: false },   // không dừng ở lỗi đầu tiên, và chạy song song được
)
```

`ordered: false` nhanh hơn đáng kể và là lựa chọn đúng khi các lệnh độc lập với nhau. Giữ `ordered: true` (mặc định) khi thứ tự có ý nghĩa — ví dụ tạo document rồi sửa nó ngay sau.

Kiểm tra kết quả thay vì tin tưởng: `result.modifiedCount` cho biết thật sự có bao nhiêu document thay đổi. `matchedCount > 0` mà `modifiedCount === 0` nghĩa là dữ liệu đã đúng như thế rồi — thường vô hại, nhưng nếu bạn đang gỡ lỗi "sao update không ăn", đây là chỗ nhìn đầu tiên.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đọc–sửa–ghi thay vì `$inc` | Mất cập nhật khi chạy song song | Toán tử cập nhật nguyên tử |
| `replaceOne` khi ý là sửa field | Mất toàn bộ field khác | `updateOne` + `$set` |
| Kiểm điều kiện ở code rồi mới ghi | Tồn kho âm, ghi đè nhau | Đưa điều kiện vào filter |
| Hai điều kiện mảng không `$elemMatch` | Khớp sai, không báo lỗi | `$elemMatch` |
| `skip()` cho phân trang sâu | Càng về sau càng chậm | Phân trang theo con trỏ |
| Upsert không có unique index | Sinh document trùng dưới tải | Unique index trên field filter |
| Vòng lặp `updateOne` cho lô lớn | Chậm gấp nhiều lần | `bulkWrite` |

## Ghi nhớ

- Để máy chủ sửa dữ liệu (`$inc`, `$set`, `$push`), đừng mang về ứng dụng sửa rồi ghi lại.
- Điều kiện nghiệp vụ nằm trong filter thì kiểm-và-ghi là nguyên tử.
- `$elemMatch` khi cần *cùng một* phần tử mảng thoả nhiều điều kiện.
- Projection và phân trang theo con trỏ là hai thứ rẻ nhất để làm truy vấn nhanh hơn.

## Tự kiểm tra

1. Hai request cùng lúc trừ tồn kho của một sản phẩm còn 1 cái. Viết lệnh không cho âm.
2. `find({ "dong.sku": "A", "dong.so_luong": { $gt: 5 } })` khớp document nào ngoài ý muốn?
3. `matchedCount` là 1 nhưng `modifiedCount` là 0 — chuyện gì đã xảy ra?
