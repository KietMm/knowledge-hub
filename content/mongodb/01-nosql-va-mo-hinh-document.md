---
title: NoSQL và mô hình document
slug: nosql-va-mo-hinh-document
summary: Bốn họ NoSQL khác nhau ở đâu, MongoDB lưu dữ liệu theo mô hình nào, và khi nào chọn nó thay cho một CSDL quan hệ.
level: co-ban
tags: [mongodb, nosql, tong-quan]
khung: v2
---

> **Sau bài này bạn sẽ:** trả lời được câu *"vì sao dự án này dùng Mongo?"* mà không viện tới lý do "vì nó nhanh", và biết khi nào **không** nên chọn nó.

## Ý tưởng chính

"NoSQL" là tên gọi gây hiểu nhầm — nó không có nghĩa "không dùng SQL", mà là *Not Only SQL*: nhóm cơ sở dữ liệu **từ bỏ một phần mô hình quan hệ để đổi lấy thứ khác**.

Điểm quan trọng nhất của cả bài: **đó là một cuộc đánh đổi, không phải một bản nâng cấp.** Cái bạn từ bỏ thường là JOIN rẻ, ràng buộc do máy chủ kiểm, và schema được kiểm trước khi ghi.

## Mental model

Hãy nghĩ tới hai cách lưu hồ sơ bệnh án.

> **Quan hệ** là **tủ hồ sơ chia ngăn**: thông tin bệnh nhân một ngăn, kết quả xét nghiệm một ngăn, đơn thuốc một ngăn. Sửa số điện thoại chỉ sửa một chỗ — nhưng xem toàn bộ hồ sơ của một người thì phải **mở bốn ngăn**.
>
> **Document** là **một tập hồ sơ kẹp sẵn cho mỗi bệnh nhân**: mở ra là thấy đủ. Nhưng nếu tên bác sĩ được chép vào 500 tập, đổi tên bác sĩ là sửa 500 chỗ.

Nguyên tắc thiết kế của mô hình document nằm trong một câu: ***dữ liệu được truy cập cùng nhau thì nên nằm cạnh nhau.***

## Ví dụ nhỏ

```js
// Cả đơn hàng là MỘT document — đọc một lần là xong
{
  _id: ObjectId("6631a2..."),
  ma_don: "DH-2026-0042",
  khach: { id: ObjectId("6620ff..."), ten: "Trần Minh", sdt: "0901234567" },
  dong: [
    { sku: "AO-XL-DEN", ten: "Áo thun đen XL", so_luong: 2, gia: 199000 },
    { sku: "MU-01",     ten: "Mũ lưỡi trai",   so_luong: 1, gia: 89000 }
  ],
  tong_tien: 487000,
  trang_thai: "dang_giao"
}
```

## Code chạy thế nào

Cùng một câu hỏi *"đơn hàng 42 gồm những gì?"*, hai cách trả lời:

```text
QUAN HỆ — ghép từ ba bảng
  SELECT ... FROM don_hang
  JOIN dong_don_hang ON ...
  JOIN san_pham ON ...
  WHERE don_hang.id = 42;
  ⇒ 3 bảng, cơ sở dữ liệu ghép lại lúc đọc

DOCUMENT — đọc thẳng một document
  db.don_hang.findOne({ ma_don: "DH-2026-0042" })
  ⇒ 1 lần đọc, dữ liệu đã nằm cạnh nhau sẵn
```

Đổi lại, câu hỏi *"tổng doanh thu theo từng sản phẩm trên toàn hệ thống"* thì ngược lại: quan hệ làm bằng một câu `GROUP BY`, còn document phải mở từng đơn ra và gộp lại ([[aggregation-pipeline]]).

Bảng ánh xạ khái niệm:

```text
database   →  database
table      →  collection
row        →  document
column     →  field
JOIN       →  $lookup, hoặc: lồng dữ liệu vào luôn
```

## Cú pháp

```
mongodb+srv://nguoidung:matkhau@cluster0.abcd.mongodb.net/ten_db?retryWrites=true&w=majority
```

```bash
mongosh "$MONGODB_URI"

show dbs
use ban_hang
show collections
db.don_hang.findOne()      # ← lệnh đầu tiên nên chạy với CSDL Mongo lạ
db.don_hang.getIndexes()
```

`findOne()` là lệnh quan trọng nhất khi tiếp nhận một hệ Mongo lạ: **schema không nằm trong tài liệu nào, nó nằm trong chính dữ liệu**.

```ts
// Node.js: tạo client MỘT LẦN ở module, tái sử dụng
const client = new MongoClient(env.MONGODB_URI, { maxPoolSize: 20 })
export const db = client.db('ban_hang')
```

Tạo `MongoClient` bên trong mỗi handler là lỗi hiệu năng phổ biến nhất khi mới dùng Mongo: mỗi request mở một pool mới, và số kết nối tăng đến khi cluster từ chối.

## Tại sao cần nó

Vì **"schemaless" là hiểu nhầm tốn kém nhất** — và nó tốn kém sau khoảng sáu tháng, không phải ngay lập tức.

```text
Mongo không BẮT bạn khai schema trước khi ghi.
⇒ Người mới đọc thành: "dự án này không cần schema"

Sự thật: schema vẫn tồn tại, nó chỉ CHUYỂN TỪ CSDL VÀO CODE của bạn.
Nếu 30% document có `so_dien_thoai` và 70% có `sdt`, mọi hàm đọc dữ liệu
phải xử lý cả hai — và lỗi chỉ hiện ra khi gặp đúng document cũ.
```

Cái linh hoạt bạn **thật sự** được hưởng là khác: **schema đổi được mà không khoá bảng**. Thêm field cho document mới, đọc thì có giá trị mặc định cho document cũ. Với bảng hàng chục triệu dòng nơi `ALTER TABLE` là một sự kiện phải lên kế hoạch, đây là ưu điểm thật.

Vẫn nên viết schema ra — bằng zod/type ở code, hoặc `$jsonSchema` validator ở phía Mongo ([[document-collection-va-kieu-bson]]).

## So sánh

Bốn họ NoSQL — chúng **thật sự khác nhau**, không phải cùng một thứ khác tên:

| Họ | Đại diện | Đơn vị dữ liệu | Giỏi việc gì |
|---|---|---|---|
| Key–value | Redis, DynamoDB | khoá → giá trị | Tra theo khoá, cache, session |
| Document | MongoDB | document JSON lồng nhau | Thực thể có cấu trúc thay đổi |
| Column-family | Cassandra | hàng rộng theo khoá phân vùng | Ghi rất nhiều, chuỗi thời gian |
| Graph | Neo4j | đỉnh và cạnh | Truy vấn quan hệ nhiều bậc |

Chọn sai **họ** thì không có cách sửa nào rẻ: dùng MongoDB cho *"tìm mọi đường đi giữa hai người trong mạng xã hội"* là chọn sai họ, không phải viết truy vấn sai.

**Chọn MongoDB khi** phần lớn các điều sau đúng:

```text
· Mỗi thực thể được đọc/ghi gần như trọn vẹn
· Hình dạng dữ liệu khác nhau giữa các bản ghi, hoặc đổi thường xuyên
· Truy vấn chủ yếu theo một khoá vào đã biết trước
· Cần mở rộng ghi ngang và đã chọn được khoá phân vùng hợp lý
```

**Không chọn khi:**

```text
· Nghiệp vụ là báo cáo, phân tích đa chiều, JOIN tự do   → SQL ([[join-cac-loai]])
· Toàn vẹn nhiều bảng là yêu cầu cứng (kế toán, tồn kho) → [[transaction-va-acid]]
· Dữ liệu vốn rất quan hệ: người ↔ nhóm ↔ quyền ↔ tài nguyên
```

Và một lựa chọn thứ ba nhiều người quên: **Postgres với `JSONB`** cho bạn phần lớn sự linh hoạt của document mà vẫn giữ JOIN và ràng buộc. Nếu hệ thống chỉ có *vài chỗ* cần linh hoạt, đây thường là câu trả lời đúng ([[jsonb-va-tim-kiem-toan-van]]).

## Dễ nhầm

**1. Coi "schemaless" là "không cần thiết kế".** Sau sáu tháng bạn có dữ liệu nhiều hình dạng và code đầy nhánh `if`.

**2. Dùng Mongo cho nghiệp vụ nhiều JOIN.** Bạn mất JOIN thật, mất ràng buộc khoá ngoại, và không được gì.

**3. Bê nguyên schema quan hệ vào Mongo.** Sáu collection, mọi truy vấn ba `$lookup` — đó là dấu hiệu bạn nên dùng Postgres.

**4. Tạo `MongoClient` mỗi request.** Cạn kết nối tới cluster.

**5. Chọn Mongo vì "nhanh hơn".** Nó không nhanh hơn một cách tổng quát. Nó nhanh hơn ở **đúng hình dạng truy cập** mà nó được thiết kế cho.

**6. Quên `w=majority` trong connection string.** Xem [[transaction-write-concern-va-van-hanh]] — đây là ranh giới giữa "đã ghi" và "có thể mất".

## Mẹo nhớ

> **Tủ chia ngăn (quan hệ) vs tập hồ sơ kẹp sẵn (document).**
>
> **Dữ liệu đọc cùng nhau thì nằm cạnh nhau.**
>
> **Không có schema ở CSDL ≠ không có schema — nó chuyển vào code bạn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. "NoSQL" thật sự nghĩa là gì, và nó đánh đổi cái gì?
2. Nguyên tắc thiết kế một câu của mô hình document?
3. Vì sao "schemaless" là hiểu nhầm, và sự linh hoạt **thật** mà Mongo cho bạn là gì?
4. Ba dấu hiệu cho biết bạn **không** nên dùng MongoDB?
5. Khi nào Postgres + JSONB là lựa chọn đúng hơn cả hai?

## Tự viết lại

Không nhìn lại phần trên, quyết định chọn Postgres hay MongoDB cho từng hệ thống, **nêu lý do**:

```text
a) Hệ thống kế toán doanh nghiệp
b) Kho nội dung CMS, mỗi loại bài có trường khác nhau
c) Mạng xã hội cần gợi ý "bạn của bạn"
d) Ghi log sự kiện từ 200 thiết bị IoT
e) Sàn thương mại điện tử vừa, có báo cáo doanh thu
```

Tự kiểm: câu (e) khó nhất — bạn chọn gì, và nếu chọn Mongo thì phần **báo cáo** bạn giải quyết thế nào?

## Thử sức

Đội bạn đang dùng MongoDB. Bạn nhận thấy: mọi truy vấn chính đều cần 2–3 `$lookup`, và tuần nào cũng có bug do dữ liệu nhân bản bị lệch.

Đây là tín hiệu gì? Nêu **hai** lựa chọn (một là sửa thiết kế trong Mongo, một là chuyển hệ), và với mỗi lựa chọn nói rõ chi phí. Câu khó: bạn dùng **dữ kiện nào** để thuyết phục đội, thay vì nói "Mongo không hợp"?
