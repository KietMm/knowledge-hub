---
title: Thiết kế cho thất bại
slug: thiet-ke-cho-that-bai
summary: Timeout, retry, circuit breaker, bulkhead — và vì sao retry sai cách làm sự cố nặng hơn.
level: trung-cap
tags: [kien-truc, chiu-loi, timeout, circuit-breaker]
---

> **Sau bài này bạn sẽ:** đặt được timeout đúng chỗ, và hiểu vì sao retry là con dao hai lưỡi trong lúc sự cố.

## Giả định sai làm hỏng mọi thứ

Code viết như thể lời gọi mạng luôn thành công và luôn nhanh. Thực tế nó có **năm** kết cục, không phải hai:

1. Thành công
2. Thất bại nhanh, rõ ràng (`connection refused`)
3. Thất bại chậm (timeout sau 30 giây)
4. **Không bao giờ trả lời** (treo)
5. Thành công nhưng response mất trên đường — xem [[idempotency-va-thu-lai]]

Kết cục 3 và 4 là nguy hiểm nhất, vì chúng **giữ tài nguyên của bạn**. Một service chậm gây thiệt hại lớn hơn một service chết hẳn: service chết trả lỗi ngay và bạn xử lý được, còn service chậm âm thầm ăn hết connection pool và thread của bạn.

## Timeout: không có mặc định nào an toàn

```ts
// ❌ fetch không có timeout mặc định. Request này có thể treo vô hạn,
// giữ một slot trong pool cho tới khi tiến trình restart.
const res = await fetch('https://api.doi-tac.com/gia')

// ✅
const res = await fetch('https://api.doi-tac.com/gia', {
  signal: AbortSignal.timeout(2000),
})
```

Timeout cần đặt ở **mọi ranh giới**, và mỗi tầng phải nhỏ hơn tầng gọi nó:

```
Người dùng (trình duyệt)     30 s
  └─ Nginx proxy_read_timeout 10 s
      └─ App (tổng)            8 s
          ├─ Database          2 s      ← statement_timeout
          ├─ Redis           200 ms
          └─ API đối tác       3 s
```

**Ngân sách timeout phải giảm dần từ ngoài vào trong.** Nếu database timeout 30s trong khi app timeout 8s, thì app đã bỏ request đi mà truy vấn vẫn chạy — bạn trả tiền cho công việc không ai nhận kết quả, và connection vẫn bị giữ.

```sql
-- Postgres: chặn ở tầng database, không tin vào tầng ứng dụng
ALTER ROLE app SET statement_timeout = '2s';
ALTER ROLE app SET idle_in_transaction_session_timeout = '10s';
```

Dòng thứ hai quan trọng không kém: một transaction mở mà không làm gì sẽ **giữ khoá** và chặn mọi thứ khác. Xem [[transaction-va-khoa-trong-postgres]].

## Retry: con dao hai lưỡi

Retry đúng cách cứu bạn khỏi lỗi chớp nhoáng. Retry sai cách **biến sự cố nhỏ thành sự cố lớn**.

```
Service B chậm vì tải cao
  → A timeout, retry 3 lần
    → Tải lên B tăng GẤP 3 đúng lúc B đang quá tải
      → B sập hoàn toàn
```

Đây gọi là **retry storm**, và nó là cách phổ biến nhất mà một sự cố cục bộ lan ra toàn hệ thống. Bốn quy tắc:

**1. Chỉ retry lỗi tạm thời.** `400`, `422`, `403` gửi lại y hệt vẫn sai — xem [[phuong-thuc-va-ma-trang-thai]].

**2. Backoff có jitter.** Thiếu jitter thì mọi client retry cùng một thời điểm.

**3. Đừng retry lồng nhau.** Ba tầng, mỗi tầng retry 3 lần = **27 lần** gọi tới tầng cuối. Chọn **một** tầng để retry — thường là tầng ngoài cùng biết được ý định của người dùng.

**4. Có ngân sách retry.** Chặn trần theo tỉ lệ, không theo từng request:

```ts
// Nếu hơn 10% lưu lượng đang là retry thì hệ thống đang có sự cố, và retry thêm
// chỉ làm nặng hơn. Trần theo TỈ LỆ chặn được retry storm mà trần theo từng
// request không chặn được.
if (retryRate() > 0.1) throw loi
```

## Circuit breaker: dừng gõ cửa nhà đang cháy

Khi một phụ thuộc đã rõ ràng chết, gọi tiếp là vô nghĩa: bạn tốn timeout, giữ tài nguyên, và làm nó khó hồi phục hơn.

```
ĐÓNG (bình thường) ──lỗi vượt ngưỡng──> MỞ (fail nhanh, không gọi)
      ↑                                        │
      └──── thành công ──── NỬA MỞ <──── sau 30 giây, cho 1 request thử
```

```ts
class CircuitBreaker {
  private loi = 0
  private moDenKhi = 0

  async goi<T>(fn: () => Promise<T>): Promise<T> {
    if (Date.now() < this.moDenKhi) {
      // Fail nhanh: quan trọng là KHÔNG tốn timeout, nhờ vậy tài nguyên của mình
      // không bị giữ và mình còn phục vụ được các đường khác.
      throw new MachHo('Phụ thuộc đang không khả dụng')
    }
    try {
      const kq = await fn()
      this.loi = 0
      return kq
    } catch (e) {
      this.loi += 1
      if (this.loi >= 5) this.moDenKhi = Date.now() + 30_000
      throw e
    }
  }
}
```

Lợi ích thật của circuit breaker không phải bảo vệ service kia — mà là **bảo vệ chính bạn**: fail nhanh giữ được connection pool và thread để phục vụ những chức năng không phụ thuộc vào nó.

## Bulkhead: chia khoang như tàu thuỷ

Tàu chia khoang để một khoang ngập không làm chìm cả tàu. Áp vào hệ thống: **chia tài nguyên theo phụ thuộc**.

```ts
// ❌ Pool 20 kết nối dùng chung. API đối tác treo → 20 request chiếm hết pool
//    → những endpoint KHÔNG dùng API đó cũng chết theo.

// ✅ Giới hạn riêng cho mỗi phụ thuộc
const semDoiTac = new Semaphore(5)     // tối đa 5 request đồng thời tới đối tác
const semBaoCao = new Semaphore(3)     // báo cáo nặng không được ăn hết pool
```

Đây là cách chặn **suy sụp lan truyền** (cascading failure): thiệt hại bị giữ trong khoang của nó.

## Suy giảm có kiểm soát

Không phải mọi phụ thuộc đều bắt buộc. Phân loại trước, rồi code theo:

```ts
async function trangSanPham(id: string) {
  // BẮT BUỘC: không có thì không có trang
  const sp = await db.products.findUnique({ where: { id } })
  if (sp === null) notFound()

  // TUỲ CHỌN: thiếu thì trang vẫn dùng được. Chú ý allSettled, không phải all —
  // Promise.all thất bại một cái là mất cả trang.
  const [goiY, danhGia] = await Promise.allSettled([
    breakerGoiY.goi(() => layGoiY(id)),
    breakerDanhGia.goi(() => layDanhGia(id)),
  ])

  return {
    sanPham: sp,
    goiY: goiY.status === 'fulfilled' ? goiY.value : [],
    danhGia: danhGia.status === 'fulfilled' ? danhGia.value : null,
  }
}
```

Câu hỏi thiết kế cần trả lời cho từng phụ thuộc: *"cái này chết thì trang còn bán được hàng không?"* Còn → tuỳ chọn, và phải có đường đi khi nó chết.

## Thundering herd sau khi hồi phục

Service hồi phục, 10.000 client đang chờ cùng lúc đổ vào → sập lại. Ba biện pháp:

- **Jitter** trong backoff và trong thời gian nửa mở của breaker
- **Nửa mở cho một request thử**, không mở cửa cho tất cả
- **Khởi động chậm**: máy mới vào cụm nhận tải tăng dần, để cache và JIT kịp nóng

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không đặt timeout | Request treo vĩnh viễn, ăn hết pool | Timeout ở mọi ranh giới |
| Timeout trong lớn hơn ngoài | Trả tiền cho việc không ai nhận | Ngân sách giảm dần vào trong |
| Retry lồng nhau nhiều tầng | 3×3×3 = 27 lần gọi | Chỉ retry ở một tầng |
| Retry không jitter | Cả đàn dồn vào cùng lúc | Backoff + jitter |
| Không có ngân sách retry | Retry storm làm sập service đang yếu | Trần theo tỉ lệ lưu lượng |
| Pool dùng chung mọi phụ thuộc | Một phụ thuộc treo, cả app chết | Bulkhead |
| `Promise.all` cho dữ liệu tuỳ chọn | Mất cả trang vì một widget | `allSettled` |
| Không có `idle_in_transaction_timeout` | Transaction bỏ dở giữ khoá mãi | Đặt ở tầng database |

## Ghi nhớ

- Service **chậm** nguy hiểm hơn service **chết** — nó giữ tài nguyên của bạn.
- Ngân sách timeout giảm dần từ ngoài vào trong.
- Circuit breaker bảo vệ **bạn**, không phải bảo vệ phụ thuộc.
- Phân loại phụ thuộc bắt buộc / tuỳ chọn trước khi viết code gọi chúng.

## Tự kiểm tra

1. Vì sao một phụ thuộc chậm gây thiệt hại lớn hơn một phụ thuộc chết hẳn?
2. Ba tầng mỗi tầng retry 3 lần thì tầng cuối nhận bao nhiêu lần gọi?
3. Vì sao `Promise.allSettled` đúng hơn `Promise.all` cho phần gợi ý sản phẩm?
