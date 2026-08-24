---
title: NoSQL và mô hình document
slug: nosql-va-mo-hinh-document
summary: Bốn họ NoSQL khác nhau ở đâu, MongoDB lưu dữ liệu theo mô hình nào, và khi nào chọn nó thay cho một CSDL quan hệ.
level: co-ban
tags: [mongodb, nosql, tong-quan]
---

> **Sau bài này bạn sẽ:** phân biệt được bốn họ NoSQL, mô tả được mô hình document của MongoDB bằng từ ngữ của mình, và trả lời được câu "vì sao dự án này dùng Mongo?" mà không viện tới lý do "vì nó nhanh".

## NoSQL không phải "không dùng SQL"

Tên gọi gây hiểu nhầm. "NoSQL" ban đầu là *Not Only SQL* — nhóm CSDL từ bỏ một phần mô hình quan hệ để đổi lấy thứ khác: mô hình dữ liệu linh hoạt hơn, hoặc khả năng mở rộng ngang dễ hơn.

Điểm quan trọng: **đó là một cuộc đánh đổi, không phải một bản nâng cấp.** Cái bạn từ bỏ thường là JOIN ở tầng CSDL, ràng buộc toàn vẹn do máy chủ kiểm, và schema được kiểm tra trước khi ghi.

Bốn họ chính, và chúng thật sự khác nhau chứ không phải cùng một thứ khác tên:

| Họ | Đại diện | Đơn vị dữ liệu | Việc nó giỏi |
|---|---|---|---|
| Key–value | Redis, DynamoDB | một khoá → một giá trị | tra cứu theo khoá, cache, session |
| Document | MongoDB, Couchbase | tài liệu JSON lồng nhau | thực thể có cấu trúc thay đổi theo thời gian |
| Column-family | Cassandra, HBase | hàng rộng theo khoá phân vùng | ghi rất nhiều, chuỗi thời gian |
| Graph | Neo4j | đỉnh và cạnh | truy vấn theo quan hệ nhiều bậc |

Chọn sai họ thì không có cách sửa nào rẻ. Dùng MongoDB cho bài toán "tìm mọi đường đi giữa hai người trong mạng xã hội" là chọn sai họ, không phải chọn sai cách viết truy vấn.

## Mô hình document

Trong MongoDB, một **document** là một đối tượng JSON — có thể lồng nhau, có thể chứa mảng. Nhiều document nằm chung trong một **collection**. Collection nằm trong một **database**.

```
CSDL quan hệ          MongoDB
─────────────────     ─────────────────
database          →   database
table             →   collection
row               →   document
column            →   field
JOIN              →   $lookup (hoặc: lồng dữ liệu vào luôn)
```

Đây là chỗ khác biệt thật sự. Với CSDL quan hệ, một đơn hàng có 3 sản phẩm nằm ở 3 bảng:

```sql
SELECT ... FROM don_hang
JOIN dong_don_hang ON ...
JOIN san_pham ON ...
WHERE don_hang.id = 42;
```

Với MongoDB, cả đơn hàng là **một** document, đọc một lần là xong:

```js
{
  _id: ObjectId("6631a2..."),
  ma_don: "DH-2026-0042",
  khach: { id: ObjectId("6620ff..."), ten: "Trần Minh", sdt: "0901234567" },
  dong: [
    { sku: "AO-XL-DEN", ten: "Áo thun đen XL", so_luong: 2, gia: 199000 },
    { sku: "MU-01",     ten: "Mũ lưỡi trai",   so_luong: 1, gia: 89000 }
  ],
  tong_tien: 487000,
  trang_thai: "dang_giao",
  tao_luc: ISODate("2026-08-20T09:12:00Z")
}
```

Nguyên tắc thiết kế của mô hình document nằm trong một câu: **dữ liệu được truy cập cùng nhau thì nên nằm cạnh nhau.** Bài [[thiet-ke-lang-nhau-hay-tham-chieu]] nói kỹ về giới hạn của nguyên tắc này — vì nó không phải luôn đúng.

## "Schemaless" là hiểu nhầm tốn kém nhất

MongoDB không bắt bạn khai báo schema trước khi ghi. Người mới đọc câu đó thành "dự án này không cần schema". Sai — và cái giá trả sau 6 tháng.

Sự thật: **schema vẫn tồn tại, chỉ là nó chuyển từ CSDL vào code của bạn.** Nếu 30% document có field `so_dien_thoai` và 70% có `sdt`, thì mọi hàm đọc dữ liệu đều phải xử lý cả hai. Không ai kiểm giúp bạn, và lỗi chỉ hiện ra khi gặp đúng document cũ.

Vậy nên:

- Vẫn thiết kế schema — viết nó ra, ở dạng type/zod trong code hoặc `$jsonSchema` validator ở phía Mongo (bài [[document-collection-va-kieu-bson]]).
- Cái linh hoạt bạn thật sự được hưởng là **schema thay đổi được không cần khoá bảng**: thêm field mới cho document mới, đọc thì có mặc định cho document cũ. Đây là ưu điểm thật, đặc biệt với bảng hàng chục triệu dòng nơi `ALTER TABLE` là một sự kiện phải lên kế hoạch.

## Khi nào chọn MongoDB

Chọn khi phần lớn các điều sau đúng:

- Mỗi thực thể được đọc/ghi gần như trọn vẹn (một trang sản phẩm, một document CMS, một event log).
- Hình dạng dữ liệu khác nhau giữa các bản ghi, hoặc đổi thường xuyên — danh mục sản phẩm nhiều ngành, cấu hình theo khách hàng, payload webhook từ nhiều nguồn.
- Truy vấn chủ yếu theo một khoá vào đã biết trước, không phải kết hợp tự do nhiều bảng.
- Bạn cần mở rộng ghi theo chiều ngang và đã chọn được khoá phân vùng hợp lý.

Không chọn khi:

- Nghiệp vụ là báo cáo và phân tích đa chiều — JOIN tự do giữa nhiều thực thể. Việc này SQL làm tốt hơn nhiều; xem [[join-cac-loai]].
- Toàn vẹn dữ liệu nhiều bảng là yêu cầu cứng (chuyển tiền, kế toán, tồn kho). Mongo *có* transaction đa document nhưng đó không phải điểm mạnh của nó — xem [[transaction-write-concern-va-van-hanh]] và [[transaction-va-acid]].
- Dữ liệu vốn rất quan hệ: người ↔ nhóm ↔ quyền ↔ tài nguyên, ai cũng nhiều-nhiều với ai.

Và một lựa chọn thứ ba mà nhiều người quên: **Postgres với cột `JSONB`** cho bạn phần lớn sự linh hoạt của document mà vẫn giữ được JOIN và ràng buộc. Nếu hệ thống của bạn chỉ có *một vài* chỗ cần linh hoạt, đây thường là lựa chọn đúng — xem [[jsonb-va-tim-kiem-toan-van]].

## Kết nối

```
mongodb+srv://nguoidung:matkhau@cluster0.abcd.mongodb.net/ten_db?retryWrites=true&w=majority
```

`mongodb+srv://` để Mongo tự tìm các node trong cluster qua DNS — dùng dạng này với dịch vụ quản lý. `w=majority` là mức an toàn ghi mặc định nên giữ; nó nói ở bài [[transaction-write-concern-va-van-hanh]].

```bash
mongosh "$MONGODB_URI"

show dbs                  // danh sách database
use ban_hang              // chọn database
show collections          // danh sách collection
db.don_hang.countDocuments()
db.don_hang.findOne()     // xem hình dạng thật của một document
db.don_hang.getIndexes()  // index đang có
```

`db.<collection>.findOne()` là lệnh đầu tiên nên chạy khi tiếp nhận một CSDL Mongo lạ: schema không nằm trong tài liệu nào, nó nằm trong chính dữ liệu.

Trong Node.js, thứ quan trọng nhất là **tạo client một lần** và tái sử dụng — mỗi `MongoClient` mang theo một connection pool riêng:

```ts
import { MongoClient } from 'mongodb'

// Module-level: dùng lại giữa các request, không tạo mới mỗi lần gọi.
const client = new MongoClient(env.MONGODB_URI, { maxPoolSize: 20 })
export const db = client.db('ban_hang')
```

Tạo client bên trong mỗi handler là lỗi hiệu năng phổ biến nhất khi mới dùng Mongo: mỗi request mở một pool mới, và số kết nối tới cluster tăng đến khi bị từ chối.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Coi "schemaless" là "không cần thiết kế" | Dữ liệu nhiều hình dạng, code đầy nhánh `if` | Viết schema ở code + validator |
| Dùng Mongo cho nghiệp vụ nhiều JOIN | Truy vấn phức tạp, chậm, khó đúng | Dùng SQL, hoặc Postgres + JSONB |
| Tạo `MongoClient` mỗi request | Cạn kết nối tới cluster | Một client dùng chung ở module |
| Bê nguyên schema quan hệ vào Mongo | Mất ưu điểm document, thêm nhược điểm | Thiết kế lại theo truy vấn |

## Ghi nhớ

- NoSQL là một đánh đổi có chủ đích, không phải bản nâng cấp của SQL.
- Đơn vị của MongoDB là document JSON lồng nhau: dữ liệu đọc cùng nhau nằm cạnh nhau.
- Không có schema ở CSDL không có nghĩa là không có schema — nó chuyển vào code bạn.
- Nghiệp vụ nhiều quan hệ và nhiều báo cáo: SQL vẫn là lựa chọn đúng.

## Tự kiểm tra

1. Cùng bài toán "mạng xã hội, tìm bạn của bạn", vì sao họ graph phù hợp hơn họ document?
2. Bạn nhận một CSDL Mongo lạ, cần biết `don_hang` có những field gì. Làm thế nào?
3. Dự án chỉ có hai chỗ cần dữ liệu linh hoạt, còn lại rất quan hệ. Bạn đề xuất gì?
