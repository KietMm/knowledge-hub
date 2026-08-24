---
title: Document, collection và kiểu BSON
slug: document-collection-va-kieu-bson
summary: _id và ObjectId, các kiểu BSON dễ dùng sai, giới hạn 16MB, và cách bắt Mongo kiểm schema hộ bạn.
level: co-ban
tags: [mongodb, bson, schema]
---

> **Sau bài này bạn sẽ:** biết `_id` thật sự là gì và khi nào nên tự đặt, tránh được ba cái bẫy kiểu dữ liệu tốn nhiều giờ gỡ lỗi nhất, và bật được validator để CSDL từ chối dữ liệu sai hình dạng.

## BSON: JSON có kiểu

MongoDB không lưu JSON, nó lưu **BSON** (Binary JSON). Khác biệt quan trọng: BSON có nhiều kiểu hơn JSON — số nguyên 32/64 bit, số thực, `Decimal128`, ngày tháng, dữ liệu nhị phân, `ObjectId`.

Vì sao bạn phải quan tâm: **so sánh và sắp xếp phụ thuộc vào kiểu.** Chuỗi `"9"` lớn hơn chuỗi `"10"`, còn số `9` thì nhỏ hơn `10`. Nếu cùng một field mà nửa document lưu chuỗi, nửa lưu số, thì mọi truy vấn khoảng và mọi lần sắp xếp đều cho kết quả bạn không mong đợi — và không có lỗi nào được báo.

Các kiểu dùng nhiều:

| Kiểu BSON | Dùng cho | Ghi chú |
|---|---|---|
| `String` | văn bản | UTF-8 |
| `Int32` / `Int64` | số đếm, số lượng | driver JS mặc định gửi `Double` |
| `Double` | số thực | **không** dùng cho tiền |
| `Decimal128` | tiền, giá trị cần chính xác | thập phân chính xác 34 chữ số |
| `Date` | mốc thời gian | luôn là UTC, độ chính xác ms |
| `ObjectId` | khoá chính, tham chiếu | 12 byte |
| `Array` | danh sách | index được cả từng phần tử |
| `Binary` | file nhỏ, hash | không dùng để lưu file lớn |
| `Null` vs thiếu field | hai chuyện **khác nhau** | xem bên dưới |

## Ba cái bẫy kiểu dữ liệu

**Tiền lưu bằng `Double`.** Đây là lỗi kinh điển và nó không phải chuyện lý thuyết: `0.1 + 0.2` ra `0.30000000000000004`. Cộng dồn qua vài nghìn dòng đơn hàng là báo cáo lệch tiền.

```js
// Sai
{ gia: 199000.5 }                          // Double

// Đúng — chọn một trong hai:
{ gia: Decimal128("199000.50") }           // thập phân chính xác
{ gia_xu: NumberLong(19900050) }           // hoặc: lưu bằng đơn vị nhỏ nhất (xu)
```

Cách "lưu bằng đơn vị nhỏ nhất" (số nguyên xu) đơn giản hơn và nhanh hơn; `Decimal128` đọc dễ hơn và không cần nhân chia ở tầng ứng dụng. Chọn một và ghi vào tài liệu dự án — thảm hoạ là dùng lẫn cả hai. Chủ đề này nói kỹ ở [[chon-kieu-du-lieu]].

**Ngày tháng lưu bằng chuỗi.** `"20/08/2026"` sắp xếp sai, không so sánh khoảng được, không dùng được index cho truy vấn theo thời gian. Luôn lưu `Date` (BSON `Date`, UTC).

```js
// Sai
{ tao_luc: "20/08/2026" }
// Đúng
{ tao_luc: new Date() }   // driver gửi thành BSON Date
```

**`null` và thiếu field không giống nhau.** `{ trang_thai: null }` là "đã biết, và giá trị là rỗng"; document không có field `trang_thai` là "chưa từng ghi". Truy vấn `{ trang_thai: null }` khớp **cả hai**, đây là nguồn nhầm lẫn thường xuyên:

```js
db.don_hang.find({ huy_luc: null })                        // khớp cả hai trường hợp
db.don_hang.find({ huy_luc: { $type: "null" } })           // chỉ document có field = null
db.don_hang.find({ huy_luc: { $exists: false } })          // chỉ document thiếu field
```

Chọn một quy ước ngay từ đầu — thường là "thiếu field nghĩa là chưa có" và không bao giờ ghi `null` — rồi giữ nó.

## `_id` và `ObjectId`

Mọi document đều có `_id`, duy nhất trong collection, không đổi được sau khi ghi, và luôn được index. Không khai thì Mongo tự sinh một `ObjectId`.

`ObjectId` là 12 byte có cấu trúc, không phải số ngẫu nhiên:

```
6631a2f4  8c1e2b   4a7f09
└─ 4 byte ─┘ └─5 byte─┘ └─3 byte─┘
timestamp   ngẫu nhiên  bộ đếm
(giây)      (theo tiến trình)
```

Hai hệ quả dùng được ngay:

```js
// 1. Lấy được thời điểm tạo mà không cần field riêng
doc._id.getTimestamp()

// 2. Sắp xếp theo _id ≈ sắp xếp theo thời gian tạo (chính xác tới giây)
db.su_kien.find().sort({ _id: -1 }).limit(20)
```

Vì `_id` tăng dần theo thời gian, `sort({ _id: -1 })` là cách rẻ nhất để lấy "mới nhất" — nó dùng luôn index có sẵn, không cần index thêm cho `tao_luc`.

**Khi nào tự đặt `_id`:** khi bạn đã có một khoá tự nhiên thật sự duy nhất và bất biến — mã SKU, mã quốc gia, id từ hệ thống nguồn khi đồng bộ dữ liệu. Đặt `_id: "VN"` cho bảng quốc gia thì bạn tiết kiệm được một index duy nhất và một lần tra cứu.

```js
db.quoc_gia.insertOne({ _id: "VN", ten: "Việt Nam", vung: "APAC" })
```

Cẩn thận một điều: `_id` tự đặt phải **bất biến**. Muốn đổi `_id` thì phải xoá document rồi ghi lại — và mọi tham chiếu tới nó ở collection khác đều hỏng. Nếu có 1% khả năng giá trị đó sẽ đổi (email, số điện thoại, tên đăng nhập), đừng dùng nó làm `_id`.

## Giới hạn 16MB và mảng không có trần

Một document tối đa **16MB**. Con số này lớn hơn nhu cầu bình thường rất nhiều, nên vấn đề thật hiếm khi là một document to — nó là **một mảng lớn dần mãi mà không có trần**:

```js
// Bẫy: mảng này lớn theo lượt xem, không bao giờ nhỏ lại
{ _id: ObjectId("..."), tieu_de: "Bài viết", luot_xem: [ /* mỗi lượt xem một phần tử */ ] }
```

Hai vấn đề, và vấn đề thứ hai đến sớm hơn nhiều: (1) rồi sẽ chạm 16MB, (2) **mỗi lần cập nhật phải đọc và ghi lại toàn bộ document** — mảng 20.000 phần tử làm mỗi lượt ghi tốn kém, và làm mọi truy vấn đọc document đó tải về hàng megabyte không cần thiết.

Nguyên tắc: **mảng lồng trong document chỉ dành cho danh sách có trần biết trước** — dòng của một đơn hàng, biến thể của một sản phẩm, vài chục cái. Danh sách tăng vô hạn thì tách thành collection riêng, hoặc chỉ lưu số đếm và mốc gần nhất:

```js
{ _id: ..., tieu_de: "Bài viết", so_luot_xem: 18432, xem_gan_nhat: ISODate("...") }
```

Cần lưu file lớn hơn 16MB (video, ảnh gốc): dùng object storage (S3, R2, Vercel Blob) và lưu URL trong Mongo. GridFS tồn tại nhưng gần như không còn là lựa chọn đúng cho hệ thống mới.

## Bắt Mongo kiểm schema hộ bạn

Bài trước nói schema vẫn phải có. Đây là cách để CSDL kiểm giúp — `$jsonSchema` validator:

```js
db.createCollection("nguoi_dung", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "ten", "tao_luc"],
      properties: {
        email:    { bsonType: "string", pattern: "^.+@.+\\..+$" },
        ten:      { bsonType: "string", minLength: 1 },
        vai_tro:  { enum: ["admin", "bien_tap", "doc_gia"] },
        tao_luc:  { bsonType: "date" },
      },
    },
  },
  validationLevel: "moderate",   // chỉ kiểm document mới và document được sửa
  validationAction: "error",     // "warn" để chỉ ghi log, không từ chối
})
```

`validationLevel: "moderate"` là lựa chọn thực dụng khi thêm validator vào collection đã có dữ liệu: dữ liệu cũ sai hình dạng vẫn đọc/sửa được, nhưng không có dữ liệu sai mới nào vào thêm. Đặt `"strict"` ngay trên collection cũ sẽ làm mọi lần cập nhật document cũ thất bại.

Validator ở Mongo **không thay thế** kiểm tra ở tầng ứng dụng — nó là lưới an toàn cuối cùng, cho cả những lần ghi từ script thủ công hay công cụ quản trị. Kiểm tra ở ứng dụng cho thông báo lỗi tử tế; validator ngăn dữ liệu rác.

Ở phía Node.js, kiểu và kiểm tra nên đi cùng nhau:

```ts
const NguoiDung = z.object({
  email: z.string().email(),
  ten: z.string().min(1),
  vai_tro: z.enum(['admin', 'bien_tap', 'doc_gia']),
  tao_luc: z.date(),
})

// Ghi: kiểm trước khi chạm CSDL, lỗi hiện ở nơi có ngữ cảnh
await db.collection('nguoi_dung').insertOne(NguoiDung.parse(input))
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Tiền lưu `Double` | Báo cáo lệch tiền, không truy được | `Decimal128` hoặc số nguyên xu |
| Ngày lưu chuỗi | Sắp xếp sai, không lọc khoảng được | BSON `Date`, UTC |
| Cùng field, nửa số nửa chuỗi | Truy vấn khoảng cho kết quả sai, im lặng | Validator + chuẩn hoá dữ liệu cũ |
| Dùng lẫn `null` và thiếu field | Truy vấn khớp nhiều hơn mong đợi | Một quy ước, dùng `$exists` khi cần |
| Mảng lồng tăng vô hạn | Ghi ngày càng chậm, rồi chạm 16MB | Tách collection, giữ số đếm |
| `_id` là email/tên đăng nhập | Không đổi được, tham chiếu hỏng | `ObjectId`, hoặc khoá thật bất biến |

## Ghi nhớ

- BSON có kiểu: kiểu quyết định cách so sánh và sắp xếp, dùng lẫn kiểu là lỗi im lặng.
- Tiền không bao giờ dùng `Double`; ngày không bao giờ dùng chuỗi.
- `ObjectId` chứa timestamp — `sort({ _id: -1 })` là "mới nhất" miễn phí.
- Mảng lồng chỉ cho danh sách có trần; giới hạn thật đến từ chi phí ghi, không phải 16MB.
- Validator là lưới an toàn, kiểm tra ở ứng dụng là tuyến đầu.

## Tự kiểm tra

1. Vì sao `db.don_hang.find({ tong_tien: { $gt: 100000 } })` có thể bỏ sót đơn 900.000đ?
2. Bạn cần "20 sự kiện mới nhất" mà không muốn thêm index. Truy vấn thế nào?
3. Collection `bai_viet` có mảng `binh_luan` đang 30.000 phần tử. Hai vấn đề là gì, sửa ra sao?
