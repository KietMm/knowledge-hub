---
title: Quan sát hệ thống
slug: quan-sat-he-thong
summary: Log, metric, trace — mỗi loại trả lời câu hỏi gì, và vì sao dashboard đẹp vẫn không cứu được bạn.
level: co-ban
tags: [van-hanh, observability, log, metric, trace]
---

> **Sau bài này bạn sẽ:** biết đo cái gì và ghi log thế nào để lúc 3 giờ sáng bạn tìm ra nguyên nhân trong vài phút.

## Monitoring và observability khác nhau

**Monitoring** trả lời câu hỏi bạn **đã biết trước**: "CPU có cao không?", "còn sống không?". Bạn dựng dashboard cho những câu đó.

**Observability** là khả năng trả lời câu hỏi bạn **chưa nghĩ tới**: *"vì sao riêng khách hàng X, chỉ trên Safari, chỉ khi giỏ hàng có hơn 10 món, thì checkout chậm 8 giây?"*

Không dashboard nào dựng sẵn được câu đó. Bạn cần **dữ liệu đủ chiều để tự đặt câu hỏi mới** — và đó là điều quyết định giữa "gỡ trong 5 phút" và "gỡ trong 5 giờ".

## Ba trụ, ba câu hỏi khác nhau

| | Trả lời | Chi phí | Dùng để |
|---|---|---|---|
| **Metric** | *Có đang xảy ra không?* | Rẻ (số đã gộp) | Báo động, dashboard, xu hướng |
| **Log** | *Chuyện gì đã xảy ra?* | Trung bình | Điều tra một trường hợp cụ thể |
| **Trace** | *Thời gian đi đâu?* | Đắt (nên lấy mẫu) | Tìm chặng chậm trong nhiều service |

Quy trình thực tế khi có sự cố: **metric báo động → trace tìm ra chặng chậm → log nói vì sao**. Thiếu một trụ là mất một bước.

## Log có cấu trúc, không phải câu văn

```ts
// ❌ Không lọc được, không đếm được, không nối được với request nào
console.log(`Người dùng ${id} đặt hàng thất bại: ${loi.message}`)

// ✅ JSON: truy vấn được như dữ liệu
logger.error({
  event: 'order.failed',
  requestId,          // nối mọi log của cùng một request
  userId: id,
  orderId,
  reason: 'out_of_stock',
  productId,
  durationMs: 234,
}, 'Đặt hàng thất bại')
```

Với log có cấu trúc bạn hỏi được: *"đếm `order.failed` theo `reason` trong 1 giờ qua"*. Với log dạng câu văn, bạn chỉ grep được — và grep không trả lời được câu hỏi gộp nhóm.

### `requestId` xuyên suốt là thứ đáng làm nhất

```ts
import { AsyncLocalStorage } from 'node:async_hooks'

const store = new AsyncLocalStorage<{ requestId: string }>()

export function withRequestId<T>(requestId: string, fn: () => T): T {
  return store.run({ requestId }, fn)
}

// Mọi log tự có requestId — không phải truyền tay qua từng lớp hàm,
// và không thể quên ở một nhánh nào.
export const logger = base.child({
  get requestId() { return store.getStore()?.requestId },
})
```

Nhận `requestId` từ header nếu có (để nối với hệ thống gọi tới), sinh mới nếu không. Trả nó trong response — đó chính là `requestId` trong hình dạng lỗi ở [[loi-versioning-va-tai-lieu]]. Người dùng đọc mã đó cho bạn, bạn tìm ra đúng request trong vài giây.

### Đừng log những thứ này

```ts
// ❌ Mật khẩu, token, số thẻ, và cả object request thô (nó chứa header Authorization)
logger.info({ body: req.body, headers: req.headers })

// ✅ Danh sách trắng những field được log
logger.info({ email: mask(body.email), soLuong: body.soLuong })
```

Log thường được giữ lâu, gửi sang bên thứ ba, và nhiều người đọc được. Secret vào log là secret bị lộ — xem [[quan-ly-secret-va-cau-hinh]].

## Metric: bốn tín hiệu vàng

Đo bốn thứ này cho mọi service, trước khi đo bất cứ thứ gì khác:

| Tín hiệu | Nghĩa |
|---|---|
| **Latency** | Nhanh chậm — tách riêng request thành công và thất bại |
| **Traffic** | Lượng request |
| **Errors** | Tỉ lệ lỗi |
| **Saturation** | Mức đầy của tài nguyên chật nhất (pool, hàng đợi, RAM) |

Chi tiết dễ bỏ sót: **tách latency của request lỗi ra khỏi request thành công**. Lỗi thường trả về rất nhanh (`400` mất 2ms), nên khi tỉ lệ lỗi tăng, latency trung bình lại *giảm* — dashboard trông đẹp hơn đúng lúc hệ thống đang tệ hơn.

```ts
// Histogram, không phải trung bình: chỉ histogram cho ra được phân vị,
// và trung bình không mô tả trải nghiệm của ai — xem [[uoc-luong-va-tim-diem-nghen]].
const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 1, 3, 10],
})
```

### Cardinality: cái làm nổ hoá đơn

```ts
// ❌ route chứa id → mỗi id là một chuỗi thời gian riêng. Một triệu người dùng
//    = một triệu chuỗi. Đây là cách phổ biến nhất làm sập hệ thống metric.
httpDuration.observe({ route: '/api/users/u-8813' }, 0.2)

// ✅ Dùng mẫu route, id để cho log
httpDuration.observe({ route: '/api/users/:id' }, 0.2)
```

Quy tắc: label chỉ nhận giá trị thuộc **tập hữu hạn nhỏ** (method, status, route pattern, tên service). Mọi thứ có độ đa dạng cao — user id, order id, URL đầy đủ — thuộc log hoặc trace, không thuộc metric.

## Trace: khi có nhiều service

Trace là cây các span, mỗi span là một chặng công việc:

```
[trace 4f2a] POST /api/orders                          412 ms
  ├─ [span] kiểm tra tồn kho                            18 ms
  ├─ [span] db: SELECT products                          6 ms
  ├─ [span] db: UPDATE kho                              11 ms
  ├─ [span] payments.charge (HTTP)                     351 ms  ← đây
  │    └─ [span] doi-tac: POST /v1/charges              340 ms
  └─ [span] queue.add order.created                      4 ms
```

Chỉ cần nhìn cây này là biết tối ưu ở đâu — điều mà log và metric đều không nói được trực tiếp.

Lấy mẫu để chịu được chi phí: **giữ 100% trace có lỗi hoặc chậm, lấy mẫu 1% phần còn lại**. Trace bình thường có giá trị thống kê; trace lỗi có giá trị điều tra, nên đừng bỏ cái nào.

## Dashboard đẹp không cứu được bạn

Ba lỗi làm cả hệ thống quan sát trở nên vô dụng:

**1. Không ai xem dashboard lúc bình thường.** Nên bạn không biết đâu là "bình thường", và lúc sự cố không phân biệt được số bất thường với số vẫn luôn như vậy.

**2. Báo động theo nguyên nhân thay vì triệu chứng.** "CPU > 80%" báo động lúc 3 giờ sáng trong khi người dùng không hề bị ảnh hưởng. Báo động phải theo thứ người dùng cảm nhận — xem [[slo-va-error-budget]].

**3. Quá nhiều báo động.** 40 cảnh báo mỗi ngày thì người ta tắt thông báo, và cái thứ 41 — cái thật — bị bỏ qua. Đây là kết cục thực tế của việc thêm báo động mà không bao giờ xoá báo động.

## Bắt đầu tối thiểu, làm được ngay hôm nay

Không cần cả bộ công cụ đắt tiền. Thứ tự có giá trị giảm dần:

1. **Log có cấu trúc + `requestId`** — giá trị lớn nhất, làm trong một buổi
2. **Bốn tín hiệu vàng** cho endpoint chính
3. **Một báo động** theo tỉ lệ lỗi
4. Trace, khi bắt đầu có nhiều service

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Log dạng câu văn | Không gộp nhóm, không đếm được | JSON có cấu trúc |
| Không có `requestId` | Không nối được các log của một request | `AsyncLocalStorage` |
| Log request/header thô | Lộ token, mật khẩu | Danh sách trắng field |
| Metric label chứa id | Nổ cardinality, sập hệ thống metric | Dùng route pattern |
| Đo trung bình thay vì histogram | Không có phân vị | Histogram + phân vị |
| Gộp latency của lỗi và thành công | Tỉ lệ lỗi tăng mà latency trông đẹp hơn | Tách theo `status` |
| Báo động theo CPU/RAM | Gọi dậy khi không ai bị ảnh hưởng | Báo động theo triệu chứng |
| Thêm báo động, không bao giờ xoá | Nhiễu tới mức bị tắt hết | Rà soát định kỳ |

## Ghi nhớ

- Metric nói *có đang xảy ra*, trace nói *thời gian đi đâu*, log nói *vì sao*.
- `requestId` xuyên suốt là việc có tỉ lệ hoàn vốn cao nhất trong cả bài này.
- Label metric chỉ nhận tập giá trị nhỏ; id thuộc log/trace.
- Tách latency của request lỗi, nếu không tỉ lệ lỗi tăng sẽ làm dashboard trông đẹp hơn.

## Tự kiểm tra

1. Metric, log, trace — dùng cái nào ở bước nào khi điều tra sự cố?
2. Vì sao `route: '/api/users/u-8813'` làm nổ hệ thống metric?
3. Vì sao tỉ lệ lỗi tăng lại có thể làm latency trung bình giảm?
