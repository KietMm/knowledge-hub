---
title: Ranh giới service
slug: ranh-gioi-service
summary: Monolith hay microservices là câu hỏi sai. Câu hỏi đúng là ranh giới nằm ở đâu và bạn mất gì khi cắt.
level: nang-cao
tags: [kien-truc, microservices, monolith, ranh-gioi]
---

> **Sau bài này bạn sẽ:** biết microservices giải quyết vấn đề gì (và không giải quyết vấn đề gì), và tìm được ranh giới đúng trước khi cắt.

## Microservices giải quyết vấn đề tổ chức, không phải vấn đề kỹ thuật

Đây là điều cần hiểu trước mọi thứ khác. Lợi ích thật của việc tách service:

- **Triển khai độc lập** — 8 nhóm không phải xếp hàng chờ một pipeline
- **Mở rộng độc lập** — service xử lý ảnh cần GPU, service auth không
- **Cách ly lỗi** — nếu có bulkhead thật, xem [[thiet-ke-cho-that-bai]]
- **Tự do công nghệ** — thường bị lạm dụng nhiều hơn được dùng đúng

Ba điều đầu là vấn đề **của tổ chức nhiều nhóm**. Với một nhóm 5 người, không có vấn đề nào trong đó tồn tại — nhưng bạn vẫn phải trả toàn bộ chi phí.

Cái bạn trả, và nó không nhỏ:

| Trong monolith | Sau khi tách |
|---|---|
| Gọi hàm, 0,001 ms, không bao giờ lỗi | Gọi mạng, 1–50 ms, **có thể lỗi hoặc treo** |
| `JOIN` một câu | Gọi 2 service rồi gộp bằng tay |
| Một transaction ACID | Saga, đền bù, trạng thái trung gian |
| Đổi kiểu dữ liệu = refactor | Đổi kiểu = phá vỡ hợp đồng, cần versioning |
| Stack trace một mạch | Cần distributed tracing mới lần được |
| Chạy `pnpm dev` | Docker Compose 12 service, hoặc mock |

Dòng "một transaction ACID" là dòng đắt nhất. Trong monolith, "trừ kho và tạo đơn cùng thành công hoặc cùng thất bại" là một `BEGIN/COMMIT`. Sau khi tách, nó thành một bài toán phân tán thật sự.

## Bắt đầu bằng monolith có ranh giới rõ

Con đường ít đau nhất: **monolith module hoá**. Ranh giới nằm trong code, chưa nằm trên mạng.

```
src/
  modules/
    orders/
      index.ts        ← API công khai DUY NHẤT của module
      service.ts
      repo.ts         ← chỉ orders/* được import file này
    inventory/
      index.ts
      service.ts
      repo.ts
```

```ts
// ❌ Xuyên qua ranh giới, chạm thẳng vào ruột module khác
import { inventoryRepo } from '@/modules/inventory/repo'

// ✅ Chỉ qua cửa trước
import { inventory } from '@/modules/inventory'
```

Ép bằng máy, đừng ép bằng lời nhắc trong code review:

```json
// eslint: chặn import xuyên vào bên trong module khác
"no-restricted-imports": ["error", {
  "patterns": [{ "group": ["@/modules/*/!(index)"], "message": "Chỉ import qua modules/<tên>" }]
}]
```

Giá trị của bước này: nếu về sau cần tách thật, ranh giới **đã có sẵn** và việc tách là thay lời gọi hàm bằng lời gọi mạng. Nếu không cần tách, bạn vẫn được lợi về khả năng đọc hiểu mà không trả chi phí phân tán nào.

## Ranh giới đúng nằm ở đâu

Cắt theo **năng lực nghiệp vụ**, không theo tầng kỹ thuật:

```
❌ Theo tầng — mỗi tính năng phải sửa cả ba, luôn phải deploy đồng bộ
   service-api / service-business-logic / service-database

✅ Theo nghiệp vụ — mỗi cái sở hữu trọn vẹn một miền, deploy độc lập được
   orders / inventory / payments / notifications
```

Ba tín hiệu cho biết ranh giới **đúng**:

- **Dữ liệu không dùng chung.** Mỗi service sở hữu bảng của nó. Hai service ghi cùng một bảng thì đó là **một** service bị chẻ đôi.
- **Đổi nghiệp vụ chỉ chạm một service.** Nếu "thêm mã giảm giá" phải sửa 5 service, ranh giới sai.
- **Từ vựng khác nhau.** "Đơn hàng" với kho là danh sách SKU và số lượng; với kế toán là số tiền và thuế. Hai mô hình khác nhau ở hai bên ranh giới là dấu hiệu ranh giới đúng.

Tín hiệu ranh giới **sai**: hai service luôn deploy cùng nhau, hoặc gọi nhau liên tục trong một request.

## Saga: khi transaction không còn

Trong monolith:

```ts
await db.$transaction([truKho(), taoDon(), truTien()])   // cùng sống hoặc cùng chết
```

Tách rồi thì không có `$transaction` nào bao được ba service. Mỗi bước phải có **bước đền bù**:

```
Bước                        Đền bù nếu bước sau thất bại
1. Giữ kho (reserve)        Nhả kho
2. Tạo đơn (pending)        Đánh dấu đơn thất bại
3. Trừ tiền                 Hoàn tiền
4. Xác nhận kho             —
```

```ts
async function datHang(input: DonInput) {
  const daLam: (() => Promise<void>)[] = []
  try {
    const giu = await inventory.giuKho(input)
    daLam.push(() => inventory.nhaKho(giu.id))

    const don = await orders.tao({ ...input, status: 'pending' })
    daLam.push(() => orders.danhDauThatBai(don.id))

    await payments.tru(don)                    // không đẩy đền bù: đây là bước cuối
    await inventory.xacNhan(giu.id)
    return don
  } catch (loi) {
    // Đền bù theo thứ tự NGƯỢC. Và mỗi hàm đền bù phải idempotent — bản thân việc
    // đền bù cũng có thể thất bại và bị chạy lại.
    for (const hoanTac of daLam.reverse()) {
      await hoanTac().catch((e) => logger.error({ e, msg: 'đền bù thất bại' }))
    }
    throw loi
  }
}
```

Hai điều saga **không** cho bạn, và phải thiết kế giao diện người dùng quanh chúng:

- **Không có isolation.** Có khoảng thời gian đơn hàng ở trạng thái `pending` và người khác thấy được.
- **Không đảm bảo đền bù thành công.** "Hoàn tiền thất bại" là trạng thái phải có người xử lý — nên nó cần một hàng đợi và một báo động, xem [[hang-doi-va-xu-ly-bat-dong-bo]].

## Đừng chia sẻ database

Cách phá vỡ microservices nhanh nhất:

```
service-orders ──┐
service-billing ─┼──> cùng một database, cùng các bảng
service-report ──┘
```

Bạn nhận đủ chi phí phân tán mà **không nhận được lợi ích nào**: đổi schema phá vỡ cả ba service, deploy vẫn phải đồng bộ, và không service nào thật sự sở hữu dữ liệu của nó. Đây là "distributed monolith" — dạng kiến trúc tệ nhất trong cả hai thế giới.

Cần dữ liệu của service khác thì: gọi API của nó, hoặc nghe event của nó và giữ một bản đọc riêng (read model) trong database của mình.

## Khi nào tách là đúng

Có ít nhất một dấu hiệu thật:

- Nhiều nhóm đang chặn nhau ở cùng một pipeline deploy
- Một phần hệ thống có nhu cầu tài nguyên **rất khác** (xử lý video, ML)
- Một phần cần độ tin cậy khác hẳn (thanh toán không được chết khi báo cáo chết)
- Một phần đang được viết lại hoàn toàn (dùng **strangler fig**: dựng service mới bên cạnh, chuyển dần lưu lượng qua)

Không có dấu hiệu nào ở trên thì monolith module hoá đang là câu trả lời đúng, và nói ra điều đó là một phần việc của tech lead — xem [[ra-quyet-dinh-ky-thuat]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Tách vì "microservices hiện đại" | Trả hết chi phí, không có lợi ích | Cần lý do thật |
| Nhiều service dùng chung database | Distributed monolith | Mỗi service sở hữu bảng của nó |
| Cắt theo tầng kỹ thuật | Mọi tính năng phải sửa mọi service | Cắt theo nghiệp vụ |
| Giả định vẫn có transaction | Dữ liệu không nhất quán khi lỗi | Saga + đền bù idempotent |
| Đền bù không idempotent | Hoàn tiền hai lần | Chống trùng bằng `UNIQUE` |
| Không có tracing | Không lần được request qua 6 service | Xem [[quan-sat-he-thong]] |
| Hai service luôn deploy cùng nhau | Ranh giới sai | Gộp lại |
| Tách khi nhóm còn 5 người | Vận hành nặng hơn phần việc thật | Monolith module hoá |

## Ghi nhớ

- Microservices giải quyết vấn đề **tổ chức**; một nhóm nhỏ không có vấn đề đó.
- Monolith module hoá cho bạn ranh giới mà không trả chi phí phân tán — ép bằng lint.
- Dữ liệu dùng chung = một service bị chẻ đôi, không phải hai service.
- Saga không có isolation và đền bù có thể thất bại; giao diện phải tính tới điều đó.

## Tự kiểm tra

1. Ba lợi ích chính của microservices thuộc loại vấn đề nào?
2. Hai service ghi cùng một bảng nói lên điều gì về ranh giới?
3. Saga không cho bạn hai thứ gì mà transaction ACID có?
