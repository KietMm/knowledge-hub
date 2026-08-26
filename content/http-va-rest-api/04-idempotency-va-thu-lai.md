---
title: Idempotency và thử lại
slug: idempotency-va-thu-lai
summary: Vì sao retry có thể tạo hai đơn hàng, và idempotency key chặn nó thế nào.
level: trung-cap
tags: [http, idempotency, retry, api-design]
khung: v2
---

> **Sau bài này bạn sẽ:** hiểu vì sao "mất phản hồi" không có nghĩa là "việc chưa xảy ra", và cài được idempotency key đúng cách.

## Ý tưởng chính

Khi một request thất bại vì mạng, bạn **không biết** việc đã xảy ra hay chưa. Có đúng hai khả năng, và chúng trông giống hệt nhau từ phía client:

```text
① Request chưa tới server           → thử lại là đúng
② Request tới rồi, server đã làm,
   nhưng response mất trên đường về  → thử lại là TẠO HAI LẦN
```

Idempotency key là cách để **thử lại luôn an toàn**, bất kể rơi vào trường hợp nào.

## Mental model

Hãy nghĩ tới **đặt món qua điện thoại và bị rớt mạng**.

> Bạn gọi: *"cho tôi hai bát phở"* — rồi cuộc gọi đứt trước khi nghe *"vâng, đã ghi"*.
>
> Gọi lại thì sao? Nếu bạn chỉ nói *"cho tôi hai bát phở"*, quán có thể ghi **thêm** hai bát nữa.
>
> Nhưng nếu bạn nói: *"đơn số **DH-8817**, hai bát phở"* — quán tra sổ, thấy DH-8817 đã có, và trả lời *"đơn này ghi rồi"*.

**Mã đơn do bạn tự đặt** chính là idempotency key. Nó biến câu hỏi *"đã làm chưa"* từ chỗ đoán mò thành một phép tra cứu.

## Ví dụ nhỏ

```http
POST /don-hang
Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7
Content-Type: application/json

{"sanPhamId": "abc", "soLuong": 2}
```

Gửi lại **cùng key** → server trả **cùng kết quả cũ**, không tạo đơn thứ hai.

## Code chạy thế nào

```text
Nhận request kèm key K:

① Tra bảng idempotency theo K
   │
   ├─ CHƯA CÓ  → ghi K với trạng thái "đang xử lý"
   │              → thực hiện nghiệp vụ
   │              → LƯU response vào bảng cùng với K
   │              → trả response
   │
   ├─ CÓ, đã xong → trả LẠI response đã lưu (không làm gì thêm)
   │
   └─ CÓ, đang xử lý → trả 409 "đang xử lý, thử lại sau"
```

Bước quan trọng nhất là **lưu cả response**, không chỉ đánh dấu "đã xử lý". Nếu chỉ đánh dấu, lần thử lại thứ hai bạn không biết trả về gì — và client mất mã đơn hàng.

Và bước ghi khoá phải **nguyên tử** với việc kiểm tra:

```sql
INSERT INTO idempotency (khoa, trang_thai) VALUES ($1, 'dang_xu_ly')
ON CONFLICT (khoa) DO NOTHING
RETURNING khoa;
-- Không có dòng trả về ⇒ khoá đã tồn tại ⇒ đây là lần thử lại
```

Viết thành `SELECT` rồi `INSERT` riêng là mở cửa cho hai request song song cùng lọt qua — cùng vấn đề đã nói ở [[truy-cap-dong-thoi-va-khoa]].

## Cú pháp

**Ai tạo key?** — **Client**, và đây là điểm hay bị hiểu sai.

```ts
const key = crypto.randomUUID()          // tạo MỘT lần cho một ý định
// mọi lần thử lại của CÙNG một ý định đều dùng lại key này
await goiApi('/don-hang', { key, ...duLieu })
```

Nếu server tạo key thì vô nghĩa: mỗi request lại có key mới, và server không nhận ra đó là lần thử lại.

**Thử lại thế nào cho đúng** — ba quy tắc:

```ts
async function thuLai(fn, lanToiDa = 3) {
  for (let i = 0; i < lanToiDa; i++) {
    try {
      return await fn()
    } catch (e) {
      if (!dangThuLaiDuoc(e) || i === lanToiDa - 1) throw e
      // ① lùi theo cấp số nhân  ② cộng ngẫu nhiên (jitter)
      const cho = 2 ** i * 1000 + Math.random() * 1000
      await new Promise((r) => setTimeout(r, cho))
    }
  }
}

function dangThuLaiDuoc(e) {
  return e.status >= 500 || e.status === 429 || e.code === 'ECONNRESET'
}
```

```text
① Lùi theo cấp số nhân — 1s, 2s, 4s. Thử lại ngay lập tức chỉ làm server tệ hơn.
② Jitter (cộng ngẫu nhiên) — không có nó, 1000 client cùng thử lại ở giây thứ 2
   và tạo ra một đợt tải mới đúng lúc server đang hồi phục.
③ Chỉ thử lại lỗi TẠM THỜI — 5xx, 429, lỗi mạng.
   400 hay 403 thì thử lại vô ích: gửi lại y hệt vẫn sai.
```

Điểm ② gọi là *thundering herd*, và nó là lý do nhiều sự cố kéo dài hơn mức cần thiết.

## Tại sao cần nó

Vì với nghiệp vụ có tiền, một lần trùng là một khiếu nại. Bốn thao tác **bắt buộc** phải có idempotency key:

```text
· Tạo đơn hàng
· Thanh toán / hoàn tiền
· Gửi email, SMS, thông báo đẩy
· Bất kỳ thao tác nào tính phí hoặc trừ tồn kho
```

Đường thay thế khi không thể thêm key — **khoá tự nhiên**:

```sql
-- Ràng buộc duy nhất trên chính dữ liệu nghiệp vụ
CREATE UNIQUE INDEX ON don_hang (nguoi_dung_id, ma_gio_hang);
```

Cách này đơn giản hơn và đôi khi đủ dùng: lần thử lại thứ hai vi phạm ràng buộc, bạn bắt lỗi đó và trả về bản ghi đã có.

## So sánh

| Phương thức | Cần idempotency key? |
|---|---|
| GET, HEAD | ❌ vốn đã an toàn |
| PUT, DELETE | ❌ vốn đã idempotent |
| POST tạo tài nguyên | ✅ **bắt buộc** |
| POST thanh toán | ✅ **bắt buộc** |
| PATCH kiểu "cộng thêm" | ✅ cần |
| PATCH kiểu "gán bằng" | ❌ đã idempotent |

Dòng cuối đáng chú ý: `{"tuoi": 30}` gọi mười lần vẫn ra 30; `{"tang_diem": 5}` gọi mười lần thì cộng 50. Cùng là PATCH, khác nhau hoàn toàn.

## Dễ nhầm

**1. Server tạo key.** Vô nghĩa — xem ở trên.

**2. Tạo key mới cho mỗi lần thử lại.** Cùng lỗi: một ý định = một key, dùng lại cho mọi lần thử.

**3. Chỉ đánh dấu "đã xử lý" mà không lưu response.** Lần thử lại nhận về `200 OK` rỗng, và client mất mã đơn hàng.

**4. `SELECT` rồi `INSERT` không nguyên tử.** Hai request song song cùng thấy "chưa có" và cùng tạo.

**5. Thử lại lỗi 4xx.** Gửi lại dữ liệu sai vẫn sai; bạn chỉ tốn thêm request.

**6. Thử lại không có jitter.** Tạo đợt tải đồng loạt đúng lúc server đang gượng dậy.

**7. Không đặt hạn cho key.** Bảng idempotency phình vô hạn. Đặt TTL 24 giờ là đủ cho mọi kịch bản thử lại thực tế.

## Mẹo nhớ

> **Mất phản hồi ≠ việc chưa xảy ra.**
>
> **Client tạo key, một ý định một key.**
>
> **Lưu cả RESPONSE, không chỉ đánh dấu đã xong.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Hai khả năng khi request thất bại vì mạng, và vì sao client không phân biệt được?
2. Ai phải tạo idempotency key, và vì sao không phải bên kia?
3. Vì sao phải lưu cả response chứ không chỉ đánh dấu "đã xử lý"?
4. Jitter giải quyết vấn đề gì?
5. Vì sao không thử lại lỗi 400?

## Tự viết lại

Không nhìn lại phần trên, viết mã giả cho endpoint `POST /thanh-toan` có idempotency:

```text
Yêu cầu: hai request song song cùng key chỉ được trừ tiền MỘT lần;
lần thử lại sau khi xong phải trả về đúng kết quả cũ.
```

Tự kiểm: chỗ nào trong code của bạn là **thao tác nguyên tử**, và điều gì xảy ra nếu server chết ngay giữa hai bước?

## Thử sức

Hệ thống của bạn gửi email xác nhận đơn hàng. Log cho thấy có khách nhận **ba email giống hệt** trong 10 giây.

Truy nguyên nhân theo hai hướng: phía client và phía hạ tầng (retry của message queue). Rồi thiết kế cách chặn — lưu ý rằng gửi email là gọi ra **hệ thống bên ngoài**, nên bạn không thể bọc nó trong transaction cơ sở dữ liệu. Bạn làm thế nào?
