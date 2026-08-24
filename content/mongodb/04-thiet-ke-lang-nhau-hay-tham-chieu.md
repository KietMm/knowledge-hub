---
title: Thiết kế: lồng nhau hay tham chiếu
slug: thiet-ke-lang-nhau-hay-tham-chieu
summary: Quy tắc chọn giữa lồng dữ liệu và tham chiếu, cách nhân bản dữ liệu có kiểm soát, $lookup, và các mẫu phản diện thường gặp.
level: trung-cap
tags: [mongodb, thiet-ke, mo-hinh-du-lieu]
---

> **Sau bài này bạn sẽ:** quyết định được từng quan hệ nên lồng hay tham chiếu dựa trên truy vấn thật, và biết khi nào nhân bản dữ liệu là thiết kế đúng chứ không phải cẩu thả.

## Đảo ngược thứ tự thiết kế

Với CSDL quan hệ, bạn mô hình hoá thực thể trước, viết truy vấn sau — chuẩn hoá bảo vệ bạn, JOIN lo phần còn lại (xem [[chuan-hoa-va-khi-nao-pha-vo]]).

Với MongoDB, thứ tự **ngược lại**: bắt đầu từ *các truy vấn hệ thống sẽ chạy nhiều nhất*, rồi thiết kế document sao cho mỗi truy vấn đó đọc càng ít document càng tốt. Đây không phải phong cách — nó là hệ quả trực tiếp của việc Mongo không có JOIN rẻ.

Nên câu hỏi đầu tiên luôn là: **"trang nào của ứng dụng đọc dữ liệu này, và nó cần gì trong một lần đọc?"**

## Quy tắc quyết định

Với mỗi quan hệ, chạy qua bốn câu hỏi:

**1. Nó có được đọc cùng nhau không?** Trang chi tiết đơn hàng luôn cần các dòng đơn hàng ⇒ lồng. Trang đơn hàng gần như không bao giờ cần toàn bộ lịch sử mua của khách ⇒ tham chiếu.

**2. Phía "nhiều" có trần không?** Đơn hàng có 1–50 dòng ⇒ lồng an toàn. Người dùng có số bài viết không giới hạn ⇒ tham chiếu (nhắc lại bài [[document-collection-va-kieu-bson]]: mảng vô hạn là bẫy).

**3. Nó có được truy cập độc lập không?** Nếu có trang riêng cho từng bình luận, hoặc bình luận cần phân trang, thì nó là thực thể riêng ⇒ collection riêng.

**4. Nó thay đổi thường xuyên hơn phần bao ngoài không?** Tồn kho đổi từng phút trong khi thông tin sản phẩm đổi từng tháng ⇒ tách, để lần ghi tồn kho không phải viết lại cả document sản phẩm.

Dạng bảng, để dán vào tài liệu thiết kế:

| Tình huống | Chọn |
|---|---|
| 1–1, luôn đọc cùng nhau (địa chỉ của khách) | Lồng |
| 1–ít, có trần, đọc cùng nhau (dòng đơn hàng, biến thể) | Lồng |
| 1–nhiều không trần (bài viết, log, giao dịch) | Tham chiếu |
| Nhiều–nhiều (sản phẩm ↔ danh mục) | Tham chiếu bằng mảng id |
| Thực thể có trang riêng, cần phân trang | Tham chiếu |
| Cần sửa một chỗ và thấy ở mọi nơi | Tham chiếu |
| Đọc rất nhiều, gần như không đổi | Lồng, hoặc nhân bản |

## Nhân bản dữ liệu có kiểm soát

Đây là chỗ khó chấp nhận nhất với người quen SQL, và cũng là chỗ Mongo thật sự khác: **sao chép một ít dữ liệu vào nơi cần đọc là thiết kế đúng, nếu bạn làm có ý thức.**

```js
// don_hang: giữ bản chụp thông tin khách và giá tại thời điểm mua
{
  _id: ObjectId("..."),
  khach: {
    id: ObjectId("6620ff..."),      // vẫn giữ tham chiếu để tra nguồn
    ten: "Trần Minh",               // bản chụp, không đồng bộ về sau
    sdt: "0901234567",
  },
  dong: [{ sku: "AO-XL-DEN", ten: "Áo thun đen XL", gia: 199000, so_luong: 2 }],
}
```

Ở đây nhân bản không chỉ để nhanh — nó **đúng về nghiệp vụ**. Hoá đơn phải giữ tên và giá *tại thời điểm mua*. Nếu JOIN sang bảng sản phẩm để lấy giá hiện tại, hoá đơn tháng trước sẽ đổi số khi bạn tăng giá. Loại nhân bản này gọi là *bản chụp lịch sử*, và cả hệ thống SQL nghiêm túc cũng làm thế.

Phân biệt với loại nhân bản thứ hai — **cache cho tốc độ** — cần đồng bộ:

```js
// bai_viet: nhúng tên tác giả để trang danh sách không phải đọc thêm collection
{ _id: ..., tieu_de: "...", tac_gia: { id: ObjectId("..."), ten: "Trần Minh" } }
```

Khi người dùng đổi tên, các bản nhúng lệch. Trước khi chọn cách này, hãy trả lời: **lệch bao lâu thì chấp nhận được?** Ba lựa chọn, theo thứ tự nên thử:

1. **Không nhân bản** — `$lookup` khi cần, hoặc đọc thêm một truy vấn theo danh sách id. Với danh sách 20 bài viết, một truy vấn `find({ _id: { $in: ids } })` gần như miễn phí và luôn đúng. **Đây là mặc định nên chọn.**
2. **Nhân bản, cập nhật lười** — chấp nhận lệch, đồng bộ bằng job định kỳ. Chỉ dùng cho dữ liệu hiển thị mà lệch không gây hại.
3. **Nhân bản, cập nhật ngay** — khi đổi tên thì `updateMany` mọi bản nhúng. Chỉ đúng khi số bản nhúng nhỏ và có trần.

Nguyên tắc: nhân bản để *nhanh hơn* là tối ưu, và tối ưu cần số đo trước. Nhân bản vì *nghiệp vụ cần bản chụp* thì làm ngay từ đầu.

## `$lookup`: JOIN của Mongo

`$lookup` trong aggregation pipeline làm được việc của LEFT JOIN:

```js
db.don_hang.aggregate([
  { $match: { trang_thai: "moi" } },
  { $lookup: {
      from: "khach_hang",
      localField: "khach.id",
      foreignField: "_id",
      as: "khach_day_du",
  } },
  { $unwind: "$khach_day_du" },
])
```

Ba điều cần biết trước khi dùng nó thay cho thiết kế:

- Nó **không nhanh như JOIN của CSDL quan hệ**. Về bản chất là một truy vấn vào `khach_hang` cho mỗi document đi vào — nên `foreignField` **bắt buộc** phải có index, nếu không đây là vòng lặp quét toàn bộ collection.
- Nó chạy tốt khi số document đi vào nhỏ (sau `$match` và `$limit`). Đặt `$lookup` trước khi lọc là lỗi hiệu năng phổ biến nhất trong pipeline — xem [[aggregation-pipeline]].
- Cần `$lookup` ở *mọi* truy vấn chính là một tín hiệu: có thể dữ liệu này vốn quan hệ và nên nằm ở CSDL quan hệ.

## Mẫu phản diện

**Bê nguyên schema quan hệ.** Sáu collection, mọi truy vấn ba `$lookup`. Bạn mất JOIN thật, mất ràng buộc khoá ngoại, và không được gì. Nếu thiết kế cuối cùng trông như vậy thì câu trả lời đúng là dùng Postgres.

**Ngược lại: lồng tất cả vào một document.** Một `nguoi_dung` chứa mọi đơn hàng, mọi phiên đăng nhập, mọi thông báo. Document phình theo thời gian, mỗi lần ghi viết lại vài trăm KB, và đọc thông tin hiển thị cũng kéo về toàn bộ.

**Mảng không trần.** Đã nói ở bài trước, nhưng nó là lỗi thiết kế Mongo phổ biến nhất nên nhắc lại: `binh_luan: []`, `luot_xem: []`, `su_kien: []` đều sẽ thành sự cố.

**Dùng chung một collection cho mọi loại document** vì "Mongo linh hoạt mà". Không index nào phục vụ tốt cho tất cả, không validator nào viết được, và mọi truy vấn phải mang thêm điều kiện `loai`. Một collection cho một loại thực thể.

## Ví dụ hoàn chỉnh: blog

Yêu cầu: trang danh sách bài (20 bài, tiêu đề + tác giả + số bình luận), trang chi tiết bài (nội dung + 20 bình luận đầu, phân trang), trang tác giả.

```js
// bai_viet — lồng thẻ (có trần), nhúng tên tác giả (đọc rất nhiều), giữ số đếm
{
  _id: ObjectId("..."),
  tieu_de: "Thiết kế document trong MongoDB",
  slug: "thiet-ke-document-trong-mongodb",
  noi_dung: "...",                                    // chỉ trang chi tiết cần
  tac_gia: { id: ObjectId("..."), ten: "Trần Minh" },  // nhúng, cập nhật lười
  the: ["mongodb", "thiet-ke"],                        // lồng: có trần
  so_binh_luan: 42,                                    // đếm sẵn, tránh count mỗi lần
  xuat_ban_luc: ISODate("2026-08-20T02:00:00Z"),
}

// binh_luan — collection riêng: không trần, cần phân trang
{
  _id: ObjectId("..."),
  bai_viet_id: ObjectId("..."),      // index
  tac_gia: { id: ObjectId("..."), ten: "Lê An" },
  noi_dung: "...",
  tao_luc: ISODate("..."),
}
```

Quyết định và lý do, viết ra để người sau hiểu:

- `the` lồng vì có trần và luôn hiển thị cùng bài.
- `noi_dung` ở cùng document nhưng bị loại khỏi projection ở trang danh sách.
- `binh_luan` tách vì không trần và cần phân trang độc lập.
- `so_binh_luan` là số đếm nhân bản, cập nhật bằng `$inc` trong cùng lệnh với việc thêm bình luận — rẻ hơn `countDocuments` ở mỗi lần render danh sách.
- `tac_gia.ten` nhúng, chấp nhận lệch khi đổi tên; job đêm đồng bộ lại.

## Ghi nhớ

- Thiết kế từ truy vấn ngược về document, không phải từ thực thể xuống bảng.
- Lồng khi: đọc cùng nhau, có trần, không truy cập độc lập.
- Nhân bản vì nghiệp vụ (bản chụp giá, tên trên hoá đơn) là đúng; nhân bản vì tốc độ cần số đo và một câu trả lời cho "lệch bao lâu thì được".
- `$lookup` cần index ở `foreignField` và nên đứng sau `$match`.
- Cần `$lookup` ở mọi truy vấn ⇒ xem lại có nên dùng Mongo.

## Tự kiểm tra

1. Sản phẩm có tồn kho đổi từng phút. Lồng tồn kho vào document sản phẩm hay tách? Vì sao?
2. Hoá đơn nên lưu giá tại thời điểm mua hay tham chiếu giá hiện tại? Nêu hậu quả của lựa chọn sai.
3. Thiết kế của bạn có 5 collection và mọi truy vấn cần 3 `$lookup`. Kết luận gì?
