---
title: Document, collection và kiểu BSON
slug: document-collection-va-kieu-bson
summary: _id và ObjectId, các kiểu BSON dễ dùng sai, giới hạn 16MB, và cách bắt Mongo kiểm schema hộ bạn.
level: co-ban
tags: [mongodb, bson, schema]
khung: v2
---

> **Sau bài này bạn sẽ:** tránh được ba cái bẫy kiểu dữ liệu tốn nhiều giờ gỡ lỗi nhất, và biết vì sao mảng lồng vô hạn là lỗi thiết kế nghiêm trọng.

## Ý tưởng chính

MongoDB không lưu JSON — nó lưu **BSON** (Binary JSON). Khác biệt quan trọng: BSON **có kiểu** — số nguyên 32/64 bit, số thực, `Decimal128`, ngày tháng, nhị phân, `ObjectId`.

Vì sao bạn phải quan tâm: **so sánh và sắp xếp phụ thuộc vào kiểu**. Cùng một field mà nửa document lưu chuỗi, nửa lưu số, thì mọi truy vấn khoảng và mọi lần sắp xếp đều cho kết quả sai — **và không có lỗi nào được báo**.

## Mental model

Hãy nghĩ tới **cân đo trong một cửa hàng**.

> Một người ghi *"2"* nghĩa là 2 kg. Người khác ghi *"2"* nghĩa là 2 gam. Cả hai đều ghi đúng con số.
>
> Rồi bạn hỏi *"có bao nhiêu đơn trên 1 kg?"* — và nhận về kết quả vô nghĩa, **mà không ai báo lỗi**, vì cả hai con số đều hợp lệ.

Kiểu BSON là **đơn vị đo**. Không thống nhất kiểu thì dữ liệu vẫn ghi được, chỉ có câu trả lời là sai.

## Ví dụ nhỏ

```js
db.don.insertOne({ tong: 100 })      // Int32
db.don.insertOne({ tong: "900" })    // String  ← ai đó gửi lên từ form

db.don.find({ tong: { $gt: 500 } })  // → chỉ trả về document đầu? Không.
                                      //   BSON so sánh theo THỨ TỰ KIỂU: số < chuỗi
                                      //   ⇒ "900" luôn "lớn hơn" mọi số
```

## Code chạy thế nào

Ba cái bẫy kiểu dữ liệu, theo thứ tự tốn kém:

**① Tiền lưu bằng `Double`** — lỗi kinh điển, và không phải chuyện lý thuyết:

```text
0.1 + 0.2 = 0.30000000000000004

Một đơn lệch 0,0000000004 đồng — không ai thấy.
Cộng dồn vài nghìn dòng trong báo cáo — kế toán không khớp.
```

```js
{ gia: 199000.5 }                    // ❌ Double
{ gia: Decimal128("199000.50") }     // ✅ thập phân chính xác
{ gia_xu: NumberLong(19900050) }     // ✅ hoặc: số nguyên đơn vị nhỏ nhất
```

Chọn **một** cách và ghi vào tài liệu dự án. Thảm hoạ thật là dùng lẫn cả hai — xem [[chon-kieu-du-lieu]].

**② Ngày tháng lưu bằng chuỗi:**

```js
{ tao_luc: "20/08/2026" }   // ❌ sắp xếp sai, không so khoảng, không dùng index
{ tao_luc: new Date() }     // ✅ BSON Date, UTC
```

**③ `null` và thiếu field không giống nhau:**

```js
{ trang_thai: null }        // "đã biết, giá trị rỗng"
{ }                          // "chưa từng ghi"
```

```js
db.don.find({ huy_luc: null })                    // khớp CẢ HAI  ← nguồn nhầm lẫn
db.don.find({ huy_luc: { $type: "null" } })       // chỉ document có field = null
db.don.find({ huy_luc: { $exists: false } })      // chỉ document thiếu field
```

Chọn một quy ước ngay từ đầu — thường là *"thiếu field nghĩa là chưa có, và không bao giờ ghi `null`"* — rồi giữ nó.

## Cú pháp

**`_id` và `ObjectId`:**

```text
ObjectId là 12 byte CÓ CẤU TRÚC, không phải số ngẫu nhiên:

6631a2f4   8c1e2b     4a7f09
└4 byte┘   └5 byte┘   └3 byte┘
timestamp  ngẫu nhiên  bộ đếm
(giây)     (theo tiến trình)
```

Hai hệ quả dùng được ngay:

```js
doc._id.getTimestamp()                         // thời điểm tạo, không cần field riêng
db.su_kien.find().sort({ _id: -1 }).limit(20)  // "mới nhất" MIỄN PHÍ — dùng index sẵn có
```

Vì `_id` tăng dần theo thời gian, `sort({ _id: -1 })` là cách rẻ nhất để lấy bản ghi mới nhất — không cần thêm index cho `tao_luc`.

**Khi nào tự đặt `_id`:** khi có khoá tự nhiên thật sự duy nhất **và bất biến** — mã quốc gia, SKU, id từ hệ thống nguồn khi đồng bộ.

```js
db.quoc_gia.insertOne({ _id: "VN", ten: "Việt Nam" })
```

Cẩn thận: `_id` **không đổi được**. Muốn đổi thì phải xoá rồi ghi lại, và mọi tham chiếu tới nó đều hỏng. Nếu có 1% khả năng giá trị sẽ đổi (email, số điện thoại, tên đăng nhập), **đừng** dùng nó làm `_id`.

## Tại sao cần nó

Vì **giới hạn thật không phải 16MB** — nó là chi phí ghi, và nó đến sớm hơn nhiều:

```js
// ❌ Mảng lớn dần mãi, không có trần
{ _id: ..., tieu_de: "Bài viết", luot_xem: [ /* mỗi lượt xem một phần tử */ ] }
```

```text
Vấn đề ① rồi sẽ chạm 16MB
Vấn đề ② — đến TRƯỚC, và tệ hơn:
   Mỗi lần cập nhật, Mongo phải ĐỌC VÀ GHI LẠI TOÀN BỘ document.
   Mảng 20.000 phần tử ⇒ mỗi lượt ghi tải và ghi vài MB
   ⇒ và mọi truy vấn đọc document đó cũng kéo về vài MB không cần thiết
```

**Nguyên tắc: mảng lồng chỉ dành cho danh sách có trần biết trước** — dòng của một đơn hàng, biến thể của một sản phẩm, vài chục cái. Danh sách tăng vô hạn thì tách collection riêng, hoặc chỉ giữ số đếm:

```js
{ _id: ..., tieu_de: "Bài viết", so_luot_xem: 18432, xem_gan_nhat: ISODate("...") }
```

Cần lưu file lớn hơn 16MB: dùng object storage (S3, R2) và lưu URL. GridFS tồn tại nhưng gần như không còn là lựa chọn đúng cho hệ mới.

**Bắt Mongo kiểm schema hộ bạn:**

```js
db.createCollection("nguoi_dung", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "ten", "tao_luc"],
      properties: {
        email:   { bsonType: "string", pattern: "^.+@.+\\..+$" },
        vai_tro: { enum: ["admin", "bien_tap", "doc_gia"] },
        tao_luc: { bsonType: "date" },
      },
    },
  },
  validationLevel: "moderate",   // chỉ kiểm document MỚI và document được sửa
  validationAction: "error",
})
```

`validationLevel: "moderate"` là lựa chọn thực dụng khi thêm validator vào collection đã có dữ liệu: dữ liệu cũ sai hình dạng vẫn đọc/sửa được, nhưng **không có dữ liệu sai mới nào vào thêm**. Đặt `"strict"` trên collection cũ sẽ làm mọi lần cập nhật document cũ thất bại.

## So sánh

| Kiểu BSON | Dùng cho | Lưu ý |
|---|---|---|
| `String` | văn bản | UTF-8 |
| `Int32` / `Int64` | số đếm | driver JS mặc định gửi `Double` |
| `Double` | số thực | **không** dùng cho tiền |
| `Decimal128` | tiền | thập phân chính xác |
| `Date` | mốc thời gian | luôn UTC |
| `ObjectId` | khoá chính | 12 byte, chứa timestamp |
| `Array` | danh sách | index được từng phần tử |

## Dễ nhầm

**1. Tiền lưu `Double`.** Báo cáo lệch tiền, không truy được nguyên nhân.

**2. Ngày lưu chuỗi.** Sắp xếp sai, không lọc khoảng được.

**3. Cùng field, nửa số nửa chuỗi.** Truy vấn khoảng cho kết quả sai — im lặng.

**4. Dùng lẫn `null` và thiếu field.** Truy vấn khớp nhiều hơn mong đợi.

**5. Mảng lồng tăng vô hạn.** Ghi ngày càng chậm, rồi chạm 16MB.

**6. `_id` là email hoặc tên đăng nhập.** Không đổi được, mọi tham chiếu hỏng khi cần đổi.

**7. Chỉ dựa vào validator, bỏ kiểm tra ở ứng dụng.** Validator cho thông báo lỗi khô khan; kiểm ở ứng dụng mới cho người dùng biết sai chỗ nào. Cần **cả hai** — cùng nguyên tắc với [[rang-buoc-va-toan-ven-du-lieu]].

## Mẹo nhớ

> **Kiểu BSON là ĐƠN VỊ ĐO — lẫn kiểu thì dữ liệu vẫn ghi được, chỉ câu trả lời là sai.**
>
> **`ObjectId` chứa timestamp ⇒ `sort({_id: -1})` là "mới nhất" miễn phí.**
>
> **Mảng lồng chỉ cho danh sách CÓ TRẦN.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. BSON khác JSON ở điểm nào, và vì sao điều đó quan trọng?
2. Vì sao `find({ tong: { $gt: 500 } })` có thể bỏ sót đơn 900 nghìn?
3. `null` và thiếu field khác nhau ra sao, và ba cách truy vấn tương ứng?
4. Vì sao mảng lồng vô hạn gây hại **trước khi** chạm 16MB?
5. `validationLevel: "moderate"` giải quyết vấn đề gì?

## Tự viết lại

Không nhìn lại phần trên, thiết kế document cho một bài viết blog:

```text
Bài có: tiêu đề, nội dung, tác giả, thẻ (tối đa 10), ngày xuất bản,
số lượt xem (tăng liên tục), và bình luận (không giới hạn).
```

Tự kiểm: **hai** thứ nào bạn **không** để trong document bài viết, và vì sao?

## Thử sức

Collection `bai_viet` của bạn có mảng `binh_luan` đang ở 30.000 phần tử cho bài phổ biến nhất. Người dùng báo trang đó tải mất 8 giây.

Chẩn đoán **hai** nguyên nhân (một về đọc, một về ghi). Rồi lập kế hoạch chuyển đổi sang cấu trúc đúng — câu khó nhất: bạn di chuyển 30.000 bình luận sang collection mới **mà không làm gián đoạn** trang đang chạy như thế nào?
