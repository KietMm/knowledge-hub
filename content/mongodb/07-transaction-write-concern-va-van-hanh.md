---
title: Transaction, write concern và vận hành
slug: transaction-write-concern-va-van-hanh
summary: Replica set, mức an toàn khi ghi và khi đọc, transaction đa document, sharding, và những việc phải làm trước khi chạy production.
level: nang-cao
tags: [mongodb, transaction, van-hanh, replica-set]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được `w: "majority"` bảo vệ điều gì, và biết khi nào transaction là câu trả lời — khi nào nó là dấu hiệu thiết kế sai.

## Ý tưởng chính

Production Mongo gần như luôn là **replica set**: một node **primary** nhận mọi lệnh ghi, các node **secondary** sao chép lại.

Và sao chép là **bất đồng bộ**. Từ sự thật đó sinh ra câu hỏi quan trọng nhất của bài: **"ghi xong" nghĩa là gì?**

## Mental model

Hãy nghĩ tới **gửi một lá thư quan trọng**.

> **`w: 1`** — bưu tá nhận thư và gật đầu. Thư **đang trong túi anh ta**. Nếu anh ta gặp tai nạn trước khi về bưu cục, thư mất.
>
> **`w: "majority"`** — thư đã được **sao và phát tới đa số bưu cục**. Bất kỳ bưu cục nào tiếp quản sau này cũng chắc chắn có nó.

Đó chính là ranh giới giữa *"đã ghi"* và *"có thể mất"*. Và khi primary chết, một node khác lên thay — nếu lần ghi của bạn chưa tới đa số node, **nó biến mất**.

## Ví dụ nhỏ

```js
await c.insertOne(doc, { writeConcern: { w: "majority", j: true, wtimeout: 5000 } })
```

| Mức | Nghĩa | Dùng khi |
|---|---|---|
| `w: 0` | Không chờ xác nhận | Metric, log có thể mất |
| `w: 1` | Primary đã nhận (trong RAM) | Dữ liệu ít quan trọng |
| `w: "majority"` | **Đa số node đã nhận** | ✅ Mặc định cho dữ liệu nghiệp vụ |
| `j: true` | Đã ghi xuống journal (đĩa) | Dữ liệu không được phép mất |

## Code chạy thế nào

Chuyện gì xảy ra khi primary chết:

```text
w: 1
  ① App ghi vào primary, primary trả "OK"
  ② Primary chết TRƯỚC khi kịp sao chép
  ③ Node khác lên làm primary — nó KHÔNG có lần ghi đó
  ⇒ dữ liệu biến mất, và app tưởng đã ghi thành công

w: "majority"
  ① App ghi vào primary
  ② Primary chờ tới khi ĐA SỐ node xác nhận
  ③ Rồi mới trả "OK"
  ⇒ mọi primary mới sau này chắc chắn có lần ghi đó
```

Đây là lý do `w: "majority"` nên nằm trong connection string và **đừng hạ xuống `w: 1` để "cho nhanh hơn"** — cái bạn đổi lấy là mất dữ liệu trong lúc chuyển primary.

Và một chi tiết dễ hiểu sai: **`wtimeout` không huỷ lệnh ghi**. Hết thời gian chờ thì bạn nhận lỗi, nhưng dữ liệu **vẫn có thể đã được ghi**. Nghĩa là lỗi timeout không cho bạn biết chắc chuyện gì đã xảy ra — nên mọi lệnh ghi quan trọng phải **thử lại được vô hại** ([[idempotency-va-thu-lai]]).

Việc bầu lại primary mất khoảng **10–12 giây**, và trong khoảng đó **mọi lệnh ghi thất bại**. Đây không phải sự cố — đây là hành vi bình thường, và ứng dụng phải sống được qua nó ([[thiet-ke-cho-that-bai]]).

## Cú pháp

**Phía đọc:**

```js
c.findOne({ _id: id })                                         // mặc định: từ primary
c.findOne({ _id: id }, { readPreference: 'secondaryPreferred' }) // rẻ hơn, có thể CŨ
c.findOne({ _id: id }, { readConcern: { level: 'majority' } })   // không bao giờ bị roll back
```

`secondaryPreferred` phù hợp cho báo cáo và dashboard. **Đừng** dùng cho luồng đọc-sau-ghi: người dùng lưu xong, trang tải lại đọc từ secondary chưa kịp sao chép, và họ thấy dữ liệu cũ — lỗi rất khó tái hiện khi gỡ.

**Transaction đa document:**

```ts
const session = client.startSession()
try {
  await session.withTransaction(async () => {
    await taiKhoan.updateOne({ _id: A }, { $inc: { so_du: -500_000 } }, { session })
    await taiKhoan.updateOne({ _id: B }, { $inc: { so_du:  500_000 } }, { session })
    await soCai.insertOne({ tu: A, den: B, so_tien: 500_000 }, { session })
  })
} finally {
  await session.endSession()
}
```

⚠️ **Truyền `{ session }` vào MỌI lệnh.** Thiếu ở một lệnh thì lệnh đó chạy **ngoài** transaction — nó không bị rollback khi transaction thất bại, và bạn có dữ liệu nửa vời. Trình biên dịch không bắt được lỗi này; nó chỉ hiện ra dưới dạng số liệu lệch.

## Tại sao cần nó

Vì câu hỏi quan trọng hơn "transaction viết thế nào" là: ***có cần transaction không?***

```text
Mọi cập nhật trên MỘT document đều đã là NGUYÊN TỬ.

$inc tồn kho và $push vào lịch sử trong cùng một document
= một hành động không thể chia — không cần transaction.
```

Nếu thiết kế document đúng theo [[thiet-ke-lang-nhau-hay-tham-chieu]], phần lớn cập nhật nghiệp vụ nằm trong **một** document. Cần transaction ở nhiều chỗ là tín hiệu đáng dừng lại: hoặc nên gộp dữ liệu vào chung document, hoặc nghiệp vụ này vốn quan hệ và thuộc về một CSDL quan hệ nơi transaction là chuyện rẻ ([[transaction-va-acid]]).

Chi phí của transaction trong Mongo:

```text
· Đắt hơn nhiều một lệnh ghi thường — giữ khoá, giữ snapshot, tiêu RAM trên primary
· Mặc định phải xong trong 60 GIÂY, nếu không bị huỷ
· Transaction dài chặn việc dọn dữ liệu cũ, làm cache máy chủ phình
```

⇒ Transaction phải **ngắn**, và chỉ chứa các lệnh cơ sở dữ liệu. Đừng gọi API bên ngoài ở giữa.

## So sánh

**Sharding** — chỉ đến khi lượng **ghi** vượt sức một primary:

```text
Điều duy nhất phải nhớ: SHARD KEY gần như không đảo lại được.

Shard key tốt cần ba tính chất:
  ① Độ phân tán cao        — nhiều giá trị khác nhau
  ② Ghi rải đều            — không dồn vào một khoảng
  ③ Có trong phần lớn truy vấn — để truy vấn chỉ chạm MỘT shard
```

Sai kinh điển: dùng field **tăng dần đơn điệu** (`tao_luc`, hay `_id` mặc định — `ObjectId` cũng tăng theo thời gian). Mọi document mới rơi vào cùng một shard cuối dãy: **một shard nhận toàn bộ tải ghi**, các shard khác rảnh rỗi.

Cách sửa: hashed shard key, hoặc khoá kép kiểu `{ khach_id: 1, tao_luc: 1 }` — rải theo khách nhưng vẫn cụm dữ liệu của một khách lại gần nhau.

Và lời khuyên thực dụng nhất: **đừng shard sớm.** Một replica set trên máy đủ tốt phục vụ được hàng chục nghìn lượt ghi mỗi giây. Sharding thêm một tầng phức tạp vào vận hành, sao lưu, và cả cách viết truy vấn ([[du-lieu-o-quy-mo]]).

## Dễ nhầm

**1. `w: 1` cho dữ liệu nghiệp vụ.** Mất lần ghi khi chuyển primary.

**2. Thiếu `{ session }` ở một lệnh trong transaction.** Dữ liệu nửa vời, không rollback.

**3. Transaction dài, gọi API bên ngoài.** Hết 60 giây, khoá lâu, cache phình.

**4. Đọc-sau-ghi từ secondary.** Người dùng thấy dữ liệu cũ.

**5. Shard key tăng đơn điệu.** Một shard gánh toàn bộ tải ghi.

**6. Shard quá sớm.** Phức tạp vận hành mà chưa cần.

**7. Bản sao lưu chưa phục hồi thử.** Phát hiện nó hỏng đúng lúc cần.

**8. Không cảnh báo độ trễ sao chép.** Trễ tăng là báo trước của rất nhiều sự cố ([[quan-sat-he-thong]]).

## Danh sách kiểm tra trước production

```text
☐ Bật xác thực; mỗi ứng dụng một user riêng, quyền hẹp nhất
☐ Không mở cổng 27017 ra Internet
☐ TLS bắt buộc trên mọi kết nối
☐ Replica set ít nhất 3 node
☐ w: "majority" cho mọi dữ liệu nghiệp vụ
☐ Một MongoClient dùng chung, maxPoolSize đặt có ý thức
☐ Unique index cho mọi khoá nghiệp vụ và mọi bộ field dùng trong upsert
☐ Index đã kiểm bằng explain; profiler bật với slowms
☐ TTL index cho dữ liệu tạm
☐ Sao lưu tự động VÀ đã phục hồi thử thành công một lần
☐ Cảnh báo: replication lag, cache hit, kết nối, truy vấn chậm
☐ Ứng dụng sống được qua 12 giây không ghi được lúc bầu lại primary
```

## Mẹo nhớ

> **`w: 1` là thư trong túi bưu tá; `w: "majority"` là thư đã tới đa số bưu cục.**
>
> **Mọi cập nhật trên MỘT document đã là nguyên tử — thiết kế tốt thì ít cần transaction.**
>
> **Shard key gần như không đổi được.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `w: 1` xác nhận thành công rồi primary chết ngay — dữ liệu còn không? Vì sao?
2. `wtimeout` hết hạn nghĩa là lệnh ghi đã thất bại phải không?
3. Một lệnh trong transaction quên `{ session }` — hậu quả cụ thể?
4. Vì sao thiết kế document tốt làm giảm nhu cầu transaction?
5. Vì sao `{ tao_luc: 1 }` là shard key tệ, và bạn đổi thành gì?

## Tự viết lại

Không nhìn lại phần trên, viết mã cho:

```text
Chuyển 500.000đ từ tài khoản A sang B, ghi một dòng sổ cái.
Yêu cầu: không được mất tiền dù server chết giữa chừng, và
lệnh này có thể bị client gửi lại hai lần.
```

Tự kiểm: bạn dùng transaction, và bạn chống gửi lại hai lần bằng gì?

## Thử sức

Hệ thống của bạn có `w: 1` và không ai để ý. Một hôm primary chết đột ngột lúc 14:03, và sau khi bầu lại, **17 đơn hàng biến mất** khỏi cơ sở dữ liệu — nhưng khách đã nhận email xác nhận.

Giải thích chính xác chuyện gì đã xảy ra. Rồi trả lời hai câu: bạn **khôi phục** 17 đơn đó bằng cách nào (gợi ý: dữ liệu còn ở đâu đó ngoài Mongo), và thay đổi gì để chuyện này không lặp lại?
