---
title: Transaction, write concern và vận hành
slug: transaction-write-concern-va-van-hanh
summary: Replica set, mức an toàn khi ghi và khi đọc, transaction đa document, sharding, và những việc phải làm trước khi chạy production.
level: nang-cao
tags: [mongodb, transaction, van-hanh, replica-set]
---

> **Sau bài này bạn sẽ:** giải thích được `w: "majority"` bảo vệ điều gì, biết khi nào transaction là câu trả lời và khi nào nó là dấu hiệu thiết kế sai, và có danh sách kiểm tra trước khi đưa Mongo lên production.

## Replica set: nền tảng của mọi thứ còn lại

Production Mongo gần như luôn là **replica set** — thường ba node: một **primary** nhận mọi lệnh ghi, các **secondary** sao chép lại từ oplog của primary.

Khi primary chết, các node còn lại bầu primary mới. Quá trình này mất khoảng 10–12 giây; trong khoảng đó **mọi lệnh ghi thất bại**. Đây không phải sự cố, đây là hành vi bình thường và ứng dụng của bạn phải sống được qua nó — driver tự thử lại một lần cho lệnh ghi nếu `retryWrites=true` (mặc định với `mongodb+srv://`), nhưng chỉ giúp cho các lệnh *idempotent về bản chất*. Nguyên tắc chung nằm ở [[thiet-ke-cho-that-bai]] và [[idempotency-va-thu-lai]].

Sao chép là **bất đồng bộ**. Ghi vào primary xong không có nghĩa dữ liệu đã có ở secondary. Hai hệ quả trực tiếp:

- Đọc từ secondary có thể thấy dữ liệu cũ (*eventual consistency*).
- Nếu primary chết ngay sau khi xác nhận ghi mà chưa kịp sao chép, lần ghi đó **có thể bị mất** khi node khác lên làm primary.

`write concern` là cái van điều khiển đánh đổi đó.

## Write concern: an toàn bao nhiêu là đủ

```js
await c.insertOne(doc, { writeConcern: { w: "majority", j: true, wtimeout: 5000 } })
```

| Mức | Nghĩa | Dùng khi |
|---|---|---|
| `w: 0` | Không chờ xác nhận | Metric, log có thể mất — hầu như không nên dùng |
| `w: 1` | Primary đã nhận (trong RAM) | Dữ liệu ít quan trọng, cần nhanh |
| `w: "majority"` | Đa số node đã nhận | **Mặc định nên dùng** cho dữ liệu nghiệp vụ |
| `j: true` | Đã ghi xuống journal (đĩa) | Dữ liệu không được phép mất |

`w: "majority"` là ranh giới thật: đã có đa số node giữ dữ liệu thì mọi primary mới sau này chắc chắn có nó, nên lần ghi không thể bị mất khi bầu lại. Đây là lý do nó nên nằm trong connection string và bạn không nên hạ xuống `w: 1` để "cho nhanh hơn" — cái bạn đổi lấy là mất dữ liệu trong lúc chuyển primary.

`wtimeout` là chi tiết dễ hiểu sai: nó **không** hủy lệnh ghi. Hết thời gian chờ thì bạn nhận lỗi, nhưng dữ liệu vẫn có thể đã được ghi. Nghĩa là lỗi timeout không cho bạn biết chắc chuyện gì đã xảy ra — nên mọi lệnh ghi quan trọng nên viết được sao cho thử lại vô hại (dùng khoá tự nhiên hoặc unique index).

Phía đọc:

```js
// Đọc mặc định từ primary — luôn thấy dữ liệu mới nhất
db.collection('don_hang').findOne({ _id: id })

// Cho phép đọc từ secondary: rẻ hơn cho primary, nhưng có thể cũ
db.collection('don_hang').findOne({ _id: id }, { readPreference: 'secondaryPreferred' })

// Chỉ đọc dữ liệu đã được đa số node xác nhận (không bao giờ bị roll back)
db.collection('don_hang').findOne({ _id: id }, { readConcern: { level: 'majority' } })
```

`secondaryPreferred` phù hợp cho báo cáo và dashboard. Đừng dùng nó cho luồng đọc-sau-ghi: người dùng lưu xong, trang tải lại đọc từ secondary chưa kịp sao chép, và họ thấy dữ liệu cũ — một loại lỗi rất khó tái hiện khi gỡ.

## Transaction đa document

Từ 4.0, Mongo có transaction ACID trên nhiều document, nhiều collection. Cần replica set (không chạy trên node đơn).

```ts
const session = client.startSession()
try {
  await session.withTransaction(async () => {
    await taiKhoan.updateOne({ _id: A }, { $inc: { so_du: -500_000 } }, { session })
    await taiKhoan.updateOne({ _id: B }, { $inc: { so_du:  500_000 } }, { session })
    await soCai.insertOne({ tu: A, den: B, so_tien: 500_000, luc: new Date() }, { session })
  })
} finally {
  await session.endSession()
}
```

`withTransaction` xử lý cả việc thử lại khi gặp lỗi tạm thời (*transient transaction error*) — nên dùng nó thay vì tự gọi `startTransaction`/`commitTransaction`.

Điều quan trọng phải nhớ: **truyền `{ session }` vào mọi lệnh trong transaction.** Thiếu ở một lệnh thì lệnh đó chạy ngoài transaction — nó không bị rollback khi transaction thất bại, và bạn có dữ liệu nửa vời. Trình biên dịch không bắt được lỗi này; nó chỉ hiện ra dưới dạng số liệu lệch.

Chi phí và giới hạn:

- Transaction đắt hơn nhiều một lệnh ghi thường: nó giữ khoá, giữ snapshot, và tiêu bộ nhớ trên primary.
- Mặc định phải xong trong **60 giây**, nếu không bị hủy.
- Transaction dài chặn việc dọn dữ liệu cũ, làm bộ nhớ cache của máy chủ phình ra.

Nên: transaction phải **ngắn**, và chỉ chứa các lệnh CSDL. Đừng gọi API bên ngoài, đừng chờ I/O khác ở giữa.

**Và câu hỏi quan trọng hơn: có cần transaction không?** Nếu thiết kế document đúng theo [[thiet-ke-lang-nhau-hay-tham-chieu]], phần lớn cập nhật nghiệp vụ nằm trong *một* document — và **mọi cập nhật trên một document đều đã là nguyên tử**, không cần transaction. Cập nhật `$inc` tồn kho và `$push` vào lịch sử trong cùng một document là một hành động không thể chia.

Cần transaction ở nhiều chỗ là tín hiệu đáng dừng lại: hoặc nên gộp dữ liệu vào chung document, hoặc nghiệp vụ này vốn quan hệ và thuộc về một CSDL quan hệ, nơi transaction là chuyện rẻ và bình thường (xem [[transaction-va-acid]]).

## Sharding: mở rộng ghi theo chiều ngang

Replica set giải quyết chịu lỗi và mở rộng *đọc*. Khi lượng **ghi** vượt sức một primary, mới đến sharding: chia collection thành nhiều phần theo **shard key**, mỗi phần nằm trên một replica set riêng.

Điều duy nhất phải nhớ về sharding: **shard key là quyết định gần như không đảo lại được**, và chọn sai thì hoặc bạn có điểm nóng, hoặc mọi truy vấn phải hỏi mọi shard.

Ba tính chất của shard key tốt: **độ phân tán cao** (nhiều giá trị khác nhau), **ghi rải đều** (không dồn vào một khoảng), và **xuất hiện trong phần lớn truy vấn** (để truy vấn chỉ chạm một shard).

Sai kinh điển là dùng một field tăng dần đơn điệu — `tao_luc`, hay `_id` mặc định (ObjectId cũng tăng theo thời gian). Mọi document mới đều rơi vào cùng một shard cuối dãy: một shard nhận toàn bộ tải ghi, các shard khác rảnh rỗi. Cách sửa thường dùng là hashed shard key, hoặc khoá kép kiểu `{ khach_id: 1, tao_luc: 1 }` — rải theo khách nhưng vẫn cụm dữ liệu của một khách lại gần nhau.

Và lời khuyên thực dụng nhất: **đừng shard sớm.** Một replica set trên máy đủ tốt phục vụ được rất nhiều — thường là hàng chục nghìn lượt ghi mỗi giây. Trước khi shard, hãy chắc bạn đã hết cách với index, thiết kế document và mở rộng theo chiều dọc. Sharding thêm một tầng phức tạp vào vận hành, sao lưu, và cả cách viết truy vấn. Chủ đề chung ở [[du-lieu-o-quy-mo]].

## Sao lưu và vận hành

```bash
# Sao lưu — với dịch vụ quản lý, dùng snapshot của họ thay vì dump thủ công
mongodump --uri="$MONGODB_URI" --gzip --archive=backup-2026-08-24.gz

# Phục hồi
mongorestore --uri="$MONGODB_URI" --gzip --archive=backup-2026-08-24.gz

# Chỉ một collection
mongodump --uri="$MONGODB_URI" --collection=don_hang --db=ban_hang
```

Điều cần nói rõ: **một bản sao lưu chưa từng phục hồi thử thì chưa phải bản sao lưu.** Đặt lịch phục hồi thử vào môi trường staging mỗi quý, và ghi lại mất bao lâu — đó chính là RTO thật của bạn, không phải con số trong tài liệu. Cùng tinh thần với [[sao-luu-va-van-hanh-postgres]].

Vài lệnh theo dõi dùng hằng ngày:

```js
db.serverStatus().connections     // kết nối đang dùng / còn trống
db.currentOp({ secs_running: { $gte: 5 } })  // truy vấn đang chạy quá 5 giây
db.killOp(opid)                   // hủy một truy vấn đang treo
rs.status()                       // trạng thái replica set, độ trễ sao chép
db.stats()                        // dung lượng dữ liệu và index
```

`rs.status()` là chỗ nhìn đầu tiên khi có báo "dữ liệu cũ": `optimeDate` của secondary tụt xa primary nghĩa là sao chép đang trễ, và mọi thứ đọc từ secondary đều cũ theo.

Bốn chỉ số nên có dashboard và cảnh báo (xem [[quan-sat-he-thong]]):

- **Độ trễ sao chép** (replication lag) — trễ tăng là báo trước của rất nhiều sự cố.
- **Tỉ lệ cache hit của WiredTiger** — tụt xuống nghĩa là dữ liệu nóng không còn vừa RAM, và mọi thứ chậm dần.
- **Số truy vấn quét toàn bộ** (`COLLSCAN`) — tăng đột ngột thường là một index vừa bị xoá, hoặc một truy vấn mới thiếu index.
- **Số kết nối đang dùng** so với trần — tiến sát trần thường là do tạo client mới mỗi request (bài [[nosql-va-mo-hinh-document]]).

## Danh sách kiểm tra trước production

- [ ] Bật xác thực, mỗi ứng dụng một user riêng với quyền hẹp nhất (`readWrite` trên đúng một database, không phải `root`).
- [ ] Không mở cổng 27017 ra Internet — chỉ cho phép IP/VPC của ứng dụng.
- [ ] TLS bắt buộc trên mọi kết nối.
- [ ] Replica set ít nhất 3 node, không chạy production trên node đơn.
- [ ] `w: "majority"` cho mọi dữ liệu nghiệp vụ.
- [ ] Một `MongoClient` dùng chung, `maxPoolSize` đặt có ý thức.
- [ ] Unique index cho mọi khoá nghiệp vụ và mọi bộ field dùng trong upsert.
- [ ] Index đã được kiểm bằng `explain` cho các truy vấn nóng; profiler bật với `slowms`.
- [ ] TTL index cho dữ liệu tạm (phiên, token, log ngắn hạn).
- [ ] Sao lưu tự động **và** đã phục hồi thử thành công một lần.
- [ ] Cảnh báo cho replication lag, cache hit, kết nối, truy vấn chậm.
- [ ] Ứng dụng sống được qua 12 giây không ghi được lúc bầu lại primary.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `w: 1` cho dữ liệu nghiệp vụ | Mất lần ghi khi chuyển primary | `w: "majority"` |
| Thiếu `{ session }` ở một lệnh | Dữ liệu nửa vời, không rollback | Truyền session vào **mọi** lệnh |
| Transaction dài, gọi API bên ngoài | Hết 60s, khoá lâu, cache phình | Transaction ngắn, chỉ lệnh CSDL |
| Đọc-sau-ghi từ secondary | Người dùng thấy dữ liệu cũ | Đọc từ primary cho luồng đó |
| Shard key tăng đơn điệu | Một shard nhận toàn bộ tải ghi | Hashed key, hoặc khoá kép |
| Shard quá sớm | Phức tạp vận hành, không cần thiết | Tối ưu index và thiết kế trước |
| Sao lưu chưa phục hồi thử | Phát hiện nó hỏng đúng lúc cần | Diễn tập phục hồi định kỳ |
| Không cảnh báo replication lag | Sự cố phát hiện muộn | Dashboard + cảnh báo |

## Ghi nhớ

- Replica set là mặc định của production; bầu lại primary là chuyện bình thường, ứng dụng phải chịu được.
- `w: "majority"` là ranh giới giữa "đã ghi" và "có thể mất".
- Mọi cập nhật trên **một** document đã là nguyên tử — thiết kế tốt thì ít cần transaction.
- Shard key gần như không đổi được: chọn theo phân tán, rải đều ghi, và có trong truy vấn.
- Bản sao lưu chưa phục hồi thử thì chưa tồn tại.

## Tự kiểm tra

1. `w: 1` xác nhận ghi thành công rồi primary chết ngay. Dữ liệu đó có còn không? Vì sao?
2. Một lệnh trong transaction bị quên `{ session }`. Hậu quả cụ thể là gì?
3. Vì sao `{ tao_luc: 1 }` là shard key tệ, và bạn đổi thành gì?
