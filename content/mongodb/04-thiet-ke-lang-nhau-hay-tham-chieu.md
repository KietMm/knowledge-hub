---
title: "Thiết kế: lồng nhau hay tham chiếu"
slug: thiet-ke-lang-nhau-hay-tham-chieu
summary: Quy tắc chọn giữa lồng dữ liệu và tham chiếu, cách nhân bản dữ liệu có kiểm soát, $lookup, và các mẫu phản diện thường gặp.
level: trung-cap
tags: [mongodb, thiet-ke, mo-hinh-du-lieu]
khung: v2
---

> **Sau bài này bạn sẽ:** quyết định từng quan hệ nên lồng hay tham chiếu bằng bốn câu hỏi, và biết khi nào nhân bản dữ liệu là **thiết kế đúng** chứ không phải cẩu thả.

## Ý tưởng chính

Với cơ sở dữ liệu quan hệ, bạn mô hình hoá thực thể trước, viết truy vấn sau — chuẩn hoá bảo vệ bạn, JOIN lo phần còn lại ([[chuan-hoa-va-khi-nao-pha-vo]]).

Với MongoDB, **thứ tự ngược lại**: bắt đầu từ *các truy vấn hệ thống sẽ chạy nhiều nhất*, rồi thiết kế document sao cho mỗi truy vấn đó đọc càng ít document càng tốt.

Đây không phải phong cách — nó là hệ quả trực tiếp của việc Mongo **không có JOIN rẻ**.

## Mental model

Hãy nghĩ tới **đóng gói hành lý cho một chuyến đi**.

> Thứ bạn dùng **cùng lúc** thì để chung một túi: bàn chải, kem đánh răng, khăn mặt — mở túi ra là đủ.
>
> Thứ **dùng riêng, hoặc quá nhiều** thì để riêng: bạn không nhét cả tủ quần áo vào túi đồ vệ sinh, dù cả hai đều là "đồ của bạn".
>
> Và có thứ bạn **cố ý mang hai bản**: bản sao hộ chiếu để trong ví, bản gốc trong két. Không phải vì bất cẩn — vì **hai bản phục vụ hai mục đích khác nhau**.

Câu cuối chính là "nhân bản có kiểm soát", và nó là phần khó chấp nhận nhất với người quen SQL.

## Ví dụ nhỏ

```js
// Lồng: dòng đơn hàng luôn đọc cùng đơn, có trần (1-50 dòng)
{ _id: ..., ma_don: "DH-42", dong: [ { sku: "AO-XL", so_luong: 2 } ] }

// Tham chiếu: bài viết của một tác giả — không trần, có trang riêng
{ _id: ..., tieu_de: "...", tac_gia_id: ObjectId("...") }
```

## Code chạy thế nào

**Bốn câu hỏi**, chạy qua cho từng quan hệ:

```text
① Nó có được ĐỌC CÙNG NHAU không?
   Trang chi tiết đơn luôn cần các dòng đơn        ⇒ LỒNG
   Trang đơn không cần toàn bộ lịch sử mua của khách ⇒ THAM CHIẾU

② Phía "nhiều" có TRẦN không?
   Đơn có 1-50 dòng          ⇒ LỒNG an toàn
   Người dùng có vô hạn bài  ⇒ THAM CHIẾU

③ Nó có được TRUY CẬP ĐỘC LẬP không?
   Bình luận có trang riêng, cần phân trang ⇒ collection riêng

④ Nó có ĐỔI THƯỜNG XUYÊN HƠN phần bao ngoài không?
   Tồn kho đổi từng phút, thông tin sản phẩm đổi từng tháng ⇒ TÁCH
   (để lần ghi tồn kho không phải viết lại cả document sản phẩm)
```

Câu ④ là câu ít người nghĩ tới nhưng ảnh hưởng hiệu năng nhiều nhất — nhắc lại điều đã nói ở [[document-collection-va-kieu-bson]]: **mỗi lần cập nhật là ghi lại cả document**.

## Cú pháp

**Nhân bản có kiểm soát** — có **hai loại**, và phân biệt chúng là mấu chốt:

```js
// Loại ① — BẢN CHỤP LỊCH SỬ: bắt buộc, không phải tối ưu
{
  ma_don: "DH-42",
  khach: { id: ObjectId("..."), ten: "Trần Minh", sdt: "0901234567" },
  dong: [{ sku: "AO-XL", ten: "Áo thun đen XL", gia: 199000, so_luong: 2 }],
}
```

Ở đây nhân bản **đúng về nghiệp vụ**: hoá đơn phải giữ tên và giá *tại thời điểm mua*. Tra sang bảng sản phẩm để lấy giá hiện tại sẽ làm hoá đơn tháng trước đổi số khi bạn tăng giá. Cả hệ SQL nghiêm túc cũng làm thế.

```js
// Loại ② — CACHE CHO TỐC ĐỘ: cần đồng bộ, có thể lệch
{ tieu_de: "...", tac_gia: { id: ObjectId("..."), ten: "Trần Minh" } }
```

Với loại ②, phải trả lời trước: **lệch bao lâu thì chấp nhận được?** Ba lựa chọn, theo thứ tự nên thử:

```text
① KHÔNG nhân bản — đọc thêm một truy vấn theo danh sách id
   find({ _id: { $in: ids } }) cho 20 bài viết gần như miễn phí, và LUÔN ĐÚNG
   ⇒ đây là mặc định nên chọn

② Nhân bản, cập nhật LƯỜI — chấp nhận lệch, job đêm đồng bộ lại
   chỉ cho dữ liệu hiển thị mà lệch không gây hại

③ Nhân bản, cập nhật NGAY — đổi tên thì updateMany mọi bản nhúng
   chỉ đúng khi số bản nhúng nhỏ và có trần
```

**Nguyên tắc:** nhân bản để *nhanh hơn* là **tối ưu**, và tối ưu cần số đo trước. Nhân bản vì *nghiệp vụ cần bản chụp* thì làm ngay từ đầu.

## Tại sao cần nó

Vì `$lookup` **không phải JOIN của SQL**, và hiểu nhầm điều đó dẫn tới thiết kế sai:

```js
db.don_hang.aggregate([
  { $match: { trang_thai: "moi" } },      // ← LỌC TRƯỚC
  { $lookup: { from: "khach_hang", localField: "khach.id", foreignField: "_id", as: "kh" } },
  { $unwind: "$kh" },
])
```

```text
Ba điều phải biết:

① Về bản chất là MỘT TRUY VẤN vào collection kia CHO MỖI document đi vào
   ⇒ foreignField BẮT BUỘC phải có index, nếu không đây là vòng lặp quét toàn bộ

② Chạy tốt khi số document đi vào NHỎ (sau $match và $limit)
   Đặt $lookup trước khi lọc là lỗi hiệu năng phổ biến nhất ([[aggregation-pipeline]])

③ Cần $lookup ở MỌI truy vấn chính = tín hiệu dữ liệu này vốn quan hệ
   ⇒ có lẽ nó nên nằm ở CSDL quan hệ
```

## So sánh

| Tình huống | Chọn |
|---|---|
| 1–1, luôn đọc cùng nhau (địa chỉ của khách) | Lồng |
| 1–ít, có trần, đọc cùng nhau (dòng đơn, biến thể) | Lồng |
| 1–nhiều không trần (bài viết, log, giao dịch) | Tham chiếu |
| Nhiều–nhiều (sản phẩm ↔ danh mục) | Tham chiếu bằng mảng id |
| Có trang riêng, cần phân trang | Tham chiếu |
| Sửa một chỗ, thấy ở mọi nơi | Tham chiếu |
| Đọc rất nhiều, gần như không đổi | Lồng, hoặc nhân bản |

**Ví dụ hoàn chỉnh — blog:**

```js
// bai_viet
{
  _id: ..., tieu_de: "...", slug: "...",
  noi_dung: "...",                                    // chỉ trang chi tiết cần
  tac_gia: { id: ObjectId("..."), ten: "Trần Minh" },  // nhúng, cập nhật lười
  the: ["mongodb", "thiet-ke"],                        // lồng: có trần
  so_binh_luan: 42,                                    // đếm sẵn
}

// binh_luan — collection riêng: không trần, cần phân trang
{ _id: ..., bai_viet_id: ObjectId("..."), noi_dung: "...", tao_luc: ... }
```

Quyết định và lý do — nên viết ra để người sau hiểu:

```text
the           lồng — có trần, luôn hiển thị cùng bài
noi_dung      cùng document nhưng bị loại khỏi projection ở trang danh sách
binh_luan     tách — không trần, cần phân trang độc lập
so_binh_luan  đếm nhân bản, cập nhật bằng $inc cùng lúc thêm bình luận
tac_gia.ten   nhúng, chấp nhận lệch; job đêm đồng bộ
```

## Dễ nhầm

**1. Bê nguyên schema quan hệ vào Mongo.** Sáu collection, mọi truy vấn ba `$lookup`. Bạn mất JOIN thật, mất ràng buộc, và không được gì.

**2. Lồng tất cả vào một document.** `nguoi_dung` chứa mọi đơn hàng, mọi phiên, mọi thông báo — document phình theo thời gian.

**3. Mảng không trần.** `binh_luan: []`, `luot_xem: []` — lỗi thiết kế Mongo phổ biến nhất.

**4. Dùng chung một collection cho mọi loại document** vì "Mongo linh hoạt mà". Không index nào phục vụ tốt cho tất cả, không validator nào viết được, và mọi truy vấn phải mang thêm điều kiện `loai`.

**5. Nhân bản mà không quyết định trước cách đồng bộ.** Dữ liệu lệch dần và không ai biết từ lúc nào.

**6. Quên index cho `foreignField` của `$lookup`.** Quét toàn bộ collection cho mỗi document đi vào.

**7. Nhầm bản chụp lịch sử với nhân bản cẩu thả.** `gia_luc_mua` là **sự thật khác** với giá hiện tại — không phải trùng lặp.

## Mẹo nhớ

> **Thứ dùng cùng lúc để chung túi; thứ quá nhiều hoặc dùng riêng thì để riêng.**
>
> **Thiết kế từ TRUY VẤN ngược về document, không phải từ thực thể xuống bảng.**
>
> **Cần `$lookup` ở mọi truy vấn ⇒ xem lại có nên dùng Mongo.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao thiết kế Mongo đi ngược so với thiết kế quan hệ?
2. Bốn câu hỏi quyết định lồng hay tham chiếu?
3. Hai loại nhân bản khác nhau ở chỗ nào — loại nào **bắt buộc**?
4. Ba điều phải biết về `$lookup` trước khi dùng nó?
5. Dấu hiệu nào cho biết dữ liệu của bạn vốn thuộc về CSDL quan hệ?

## Tự viết lại

Không nhìn lại phần trên, thiết kế document cho một ứng dụng đặt món:

```text
- Nhà hàng có thực đơn (20-100 món), mỗi món có giá và ảnh
- Khách đặt đơn gồm nhiều món, giá lúc đặt phải giữ nguyên
- Mỗi nhà hàng có đánh giá từ khách (không giới hạn số lượng)
- Trang chủ hiển thị danh sách nhà hàng kèm điểm trung bình
```

Tự kiểm: điểm trung bình bạn tính lúc đọc hay lưu sẵn? Nêu lý do và cách giữ nó đúng.

## Thử sức

Sản phẩm của bạn có `ton_kho` nằm trong document `san_pham` cùng với tên, mô tả, và mảng 30 ảnh. Tồn kho được cập nhật khoảng 200 lần mỗi phút.

Chỉ ra **hai** vấn đề với thiết kế này. Rồi đề xuất cách sửa, và trả lời câu khó: sau khi tách tồn kho ra, trang danh sách sản phẩm (cần hiện "còn hàng/hết hàng") có bị chậm đi không — và bạn xử lý thế nào?
