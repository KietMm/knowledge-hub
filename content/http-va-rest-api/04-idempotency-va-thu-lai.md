---
title: Idempotency và thử lại
slug: idempotency-va-thu-lai
summary: Vì sao retry có thể tạo hai đơn hàng, và idempotency key chặn nó thế nào.
level: trung-cap
tags: [http, idempotency, retry, api-design]
---

> **Sau bài này bạn sẽ:** hiểu vì sao mạng lỗi lại làm khách bị trừ tiền hai lần, và cài được idempotency key.

## Vấn đề: response mất tích không có nghĩa là việc chưa xảy ra

```
Client                          Server
  |---- POST /orders ----------->|
  |                              |  tạo đơn o-891 ✅
  |                              |  trừ tiền ✅
  |    ✗ mạng đứt ở đây          |
  |<-------- (không nhận) -------|
  |
  |  timeout → thử lại
  |---- POST /orders ----------->|
  |                              |  tạo đơn o-892 ✅  ← đơn thứ hai!
  |                              |  trừ tiền lần hai ✅
```

Client **không thể phân biệt** ba tình huống: request chưa tới server, server đang xử lý, hay server làm xong rồi mà response mất. Với `POST`, thử lại là đánh cược. Không thử lại thì người dùng thấy lỗi dù việc đã thành công.

Đây không phải trường hợp hiếm. Retry tự động có ở mọi tầng: thư viện HTTP, load balancer, service mesh, và cả ngón tay người dùng bấm nút hai lần.

## Idempotency key

Client sinh một khoá **duy nhất cho mỗi ý định**, không phải cho mỗi request:

```http
POST /api/orders
Idempotency-Key: 8f14e45f-ea2b-4c1a-9d3e-7b6c5a4d3e2f
Content-Type: application/json

{"productId":"p-12","quantity":2}
```

Điểm mấu chốt: **khi thử lại, gửi lại đúng khoá cũ**. Khoá mới ở lần thử lại thì vô nghĩa hoàn toàn.

Server xử lý:

```ts
async function taoDon(key: string, payload: DonHangInput) {
  // 1. Đã thấy khoá này chưa?
  const daLuu = await db.idempotency.findUnique({ where: { key } })
  if (daLuu !== null) return daLuu.response   // trả lại y nguyên kết quả cũ

  // 2. Chưa: xử lý và lưu kết quả CÙNG MỘT transaction với việc tạo đơn.
  //    Tách ra hai transaction thì vẫn còn kẽ hở: đơn đã tạo mà khoá chưa lưu.
  return db.$transaction(async (tx) => {
    const don = await tx.orders.create({ data: payload })
    await tx.idempotency.create({ data: { key, response: don } })
    return don
  })
}
```

Ràng buộc `UNIQUE` trên cột `key` là thứ chặn hai request **đồng thời**: một cái thắng, cái kia ném lỗi unique và đọc lại kết quả của cái thắng. Không có ràng buộc đó thì hai request cùng lúc đều thấy "chưa có khoá" và đều tạo đơn.

## Thử lại thế nào cho đúng

Không phải lỗi nào cũng nên thử lại:

| Mã | Thử lại? | Vì sao |
|---|---|---|
| `408`, `429`, `503`, `504` | ✅ | Tạm thời; `429`/`503` có `Retry-After` — tôn trọng nó |
| `500` | ⚠️ | Chỉ khi có idempotency key |
| `400`, `422` | ❌ | Request sai; gửi lại y hệt vẫn sai |
| `401`, `403` | ❌ | Thiếu quyền; thử lại chỉ làm khoá tài khoản |
| `409` | ❌ | Xung đột trạng thái, cần người quyết định |

Chờ theo **exponential backoff có jitter**:

```ts
async function goiLai<T>(fn: () => Promise<T>, soLan = 3): Promise<T> {
  for (let i = 0; ; i += 1) {
    try {
      return await fn()
    } catch (loi) {
      if (i >= soLan - 1 || !nenThuLai(loi)) throw loi
      // 2^i giây, cộng ngẫu nhiên 0-1s: thiếu jitter thì mọi client cùng
      // thử lại đúng một thời điểm và đánh sập server vừa hồi phục.
      const cho = 2 ** i * 1000 + Math.random() * 1000
      await new Promise((r) => setTimeout(r, cho))
    }
  }
}
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Sinh khoá mới ở mỗi lần thử lại | Idempotency vô tác dụng hoàn toàn | Sinh một lần cho mỗi ý định |
| Lưu khoá ở transaction riêng | Vẫn tạo đơn trùng khi hỏng giữa hai bước | Cùng một transaction |
| Không có `UNIQUE` trên cột khoá | Hai request đồng thời đều lọt | Thêm ràng buộc unique |
| Thử lại `400`/`422` | Đốt tài nguyên vô ích | Chỉ thử lại lỗi tạm thời |
| Retry không có jitter | Cả đàn client dồn vào cùng lúc, server vừa dậy lại sập | Cộng thêm ngẫu nhiên |
| Giữ khoá mãi mãi | Bảng phình vô hạn | TTL 24h là đủ |

## Ghi nhớ

- Response mất không có nghĩa việc chưa xảy ra — đây là gốc của mọi đơn trùng.
- Idempotency key gắn với **ý định**, gửi lại y nguyên khi thử lại.
- Lưu khoá và làm việc phải cùng một transaction; cột khoá phải `UNIQUE`.
- Chỉ thử lại `408/429/503/504`; backoff phải có jitter.

## Tự kiểm tra

1. Vì sao client không thể biết request đã được xử lý hay chưa khi bị timeout?
2. Lưu idempotency key ở transaction riêng sau khi tạo đơn thì kẽ hở còn ở đâu?
3. Vì sao không nên thử lại `422`?
