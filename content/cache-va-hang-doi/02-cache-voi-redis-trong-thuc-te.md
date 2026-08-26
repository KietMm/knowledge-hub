---
title: Cache với Redis trong thực tế
slug: cache-voi-redis-trong-thuc-te
summary: Làm mất hiệu lực, stampede, cache lồng ghép, và câu hỏi nên hỏi trước khi thêm một tầng cache.
level: trung-cap
tags: [redis, cache, hieu-nang, kien-truc]
khung: v2
---

> **Sau bài này bạn sẽ:** triển khai cache-aside đúng cách, và biết ba biện pháp chống stampede.

## Ý tưởng chính

Phần khó của cache không phải **ghi vào**. Nó là **làm mất hiệu lực đúng lúc** — và làm sao để lúc cache trống không có một cơn sóng đập vào CSDL.

Hai vấn đề đó là toàn bộ nội dung của bài này.

## Mental model

Hãy nghĩ tới **bảng thông báo ở sảnh chung cư**.

> Thay vì mỗi người gọi lên ban quản lý hỏi giờ cắt nước, người ta dán một tờ thông báo. Trăm người đọc một tờ giấy — rẻ hơn trăm cuộc gọi.
>
> Vấn đề một: **giờ cắt nước đổi**. Ai gỡ tờ cũ xuống? Nếu không ai gỡ, cả trăm người đọc thông tin sai.
>
> Vấn đề hai: tờ giấy có ghi "hết hiệu lực 8 giờ sáng mai". Đúng 8 giờ, **cả trăm người cùng gọi ban quản lý** — vì tờ giấy vừa hết hạn cùng lúc với tất cả mọi người.

Vấn đề một là invalidation. Vấn đề hai là **cache stampede**, và nó là loại sự cố hay xảy ra đúng vào lúc tải cao nhất.

## Ví dụ nhỏ

```ts
async function laySanPham(id: string) {
  const key = `cache:v1:sp:${id}`
  const daCo = await redis.get(key)
  if (daCo !== null) return JSON.parse(daCo)

  const sp = await db.sanPham.findUnique({ where: { id } })
  if (sp !== null) await redis.set(key, JSON.stringify(sp), 'EX', 300)
  return sp
}
```

## Code chạy thế nào

**Cache-aside: ghi thì XOÁ, đừng ghi đè:**

```ts
// ✅
async function capNhat(id: string, dl: Partial<SanPham>) {
  const sp = await db.sanPham.update({ where: { id }, data: dl })
  await redis.del(`cache:v1:sp:${id}`)      // XOÁ, không SET
  return sp
}
```

```text
Vì sao xoá chứ không ghi đè:

  Request A: đọc CSDL → giá 100
  Request B: cập nhật giá thành 200, SET cache = 200
  Request A: SET cache = 100        ← ghi đè bằng dữ liệu CŨ
  ⇒ Cache giữ 100 cho tới hết TTL. CSDL nói 200.

Xoá thì không có cửa sổ này: lần đọc sau luôn lấy từ CSDL.
```

**Xoá không đủ khi cache có nhiều dạng:**

```text
Cập nhật một sản phẩm ⇒ phải xoá những gì?
  cache:v1:sp:42                    ← rõ ràng
  cache:v1:danh-muc:dien-tu         ← danh sách CHỨA sản phẩm đó
  cache:v1:trang-chu                ← nếu nó có trong sản phẩm nổi bật
  cache:v1:tim-kiem:*               ← mọi kết quả tìm kiếm khớp

⇒ Đây là lý do người ta nói invalidation là phần khó.

Hai cách xử lý:
  ① TTL NGẮN cho dữ liệu tổng hợp (30–60s) — chấp nhận cũ một chút,
    đổi lại không phải theo dõi phụ thuộc
  ② TAG: gắn nhãn cho khoá, xoá theo nhãn
    ⇒ chính xác hơn, nhưng phải tự quản lý mối liên hệ
```

Cách ① đúng trong đa số trường hợp, và đó là một quyết định sản phẩm chứ không phải kỹ thuật: *"danh sách sản phẩm cũ 60 giây có sao không?"*

## Cú pháp

**Cache stampede — ba biện pháp:**

```text
Vấn đề: khoá nóng hết hạn lúc 10:00:00.
        1.000 request cùng thấy miss, cùng gọi CSDL.
        ⇒ CSDL nhận 1.000 truy vấn giống hệt nhau trong một nhịp.
```

```ts
// ① TTL CÓ NHIỄU — rẻ nhất, nên làm mặc định
const ttl = 300 + Math.floor(Math.random() * 60)
// ⇒ các khoá không hết hạn cùng lúc

// ② KHOÁ — chỉ một request đi tính
const khoa = await redis.set(`lock:${key}`, '1', 'NX', 'EX', 10)
if (khoa === null) {
  await nghi(50)
  return laySanPham(id)              // thử lại, cache có thể đã có
}

// ③ LÀM MỚI SỚM — mượt nhất
// Lưu kèm thời điểm hết hạn "mềm". Còn 10% TTL thì một request
// đi làm mới ở NỀN, các request khác vẫn nhận bản cũ ngay.
```

```text
Chọn: ① cho hầu hết trường hợp.
      ② khi truy vấn rất đắt.
      ③ khi khoá cực nóng và không được phép có độ trễ.
```

**Cache thất bại — hai thứ dễ bỏ:**

```ts
// ① Cache cả "không tìm thấy" — chống dò khoá không tồn tại
if (sp === null) {
  await redis.set(key, 'NULL', 'EX', 60)    // TTL ngắn hơn bình thường
  return null
}
// Không có bước này: request tới id không tồn tại LUÔN chạm CSDL
// ⇒ một vòng lặp gọi /sp/1..999999 là một cách làm nghẽn CSDL.

// ② KHÔNG cache lỗi
try {
  const sp = await db.sanPham.findUnique(...)
  await redis.set(key, JSON.stringify(sp), 'EX', 300)
} catch (e) {
  throw e        // đừng cache lỗi — dịch vụ hồi phục sau 10s
}                // mà bạn vẫn lỗi 5 phút
```

**Redis chết thì ứng dụng phải sống:**

```ts
async function layCache(key: string): Promise<string | null> {
  try {
    return await redis.get(key)
  } catch (e) {
    logger.warn({ e, event: 'cache.loi' })
    return null                       // coi như miss ⇒ đi CSDL
  }
}
```

```text
Không bọc như vậy: Redis chết ⇒ mọi request ném lỗi ⇒ toàn bộ
site chết, dù CSDL vẫn hoàn toàn khoẻ.

Nhưng chú ý: lúc đó CSDL nhận 100% traffic thay vì 10%.
⇒ Phải biết CSDL chịu được không. Nếu không, cần thêm
  circuit breaker hoặc giới hạn tải ([[thiet-ke-cho-that-bai]]).
```

## Tại sao cần nó

Vì câu hỏi nên hỏi đầu tiên là **"có cần cache không"**:

```text
Postgres có index tốt trả lời truy vấn trong 1–5 ms.
Redis mất ~1 ms cộng chi phí mạng.

⇒ Với nhiều truy vấn, cache tiết kiệm rất ít mà thêm:
  một hệ thống phải vận hành
  một chỗ dữ liệu có thể cũ
  một nguồn bug về invalidation

⇒ Cache đáng khi: truy vấn ĐẮT (>50ms), hoặc TẦN SUẤT rất cao,
  hoặc dữ liệu đến từ một API bên ngoài chậm/có hạn mức.
```

**Và cache không sửa được truy vấn tồi:**

```text
Truy vấn quét bảng 2 giây, cache TTL 5 phút:
  → 99% request nhanh
  → 1% mất 2 giây — đúng những người gặp cache miss
  → mỗi lần hết hạn là một cú sốc cho CSDL

⇒ Sửa truy vấn TRƯỚC, cache SAU ([[index-va-hieu-nang-truy-van]]).
```

**Đo tỉ lệ trúng — nếu không đo thì không biết cache có tác dụng:**

```text
> 90%    tốt
70–90%   xem lại TTL hoặc cách đặt khoá
< 50%    cache đang không giúp gì, và còn thêm một chặng mạng

Tỉ lệ thấp thường vì khoá quá đặc thù (chứa timestamp, chứa
tham số hiếm lặp lại) hoặc TTL quá ngắn.
```

## So sánh

| Chiến lược | Đọc | Ghi | Rủi ro |
|---|---|---|---|
| Cache-aside + xoá | miss → CSDL | ghi CSDL, xoá cache | phổ biến nhất, an toàn |
| Cache-aside + ghi đè | miss → CSDL | ghi cả hai | race để lại dữ liệu cũ |
| Write-through | luôn trúng | ghi cả hai đồng bộ | ghi chậm hơn |
| TTL ngắn, không xoá | miss → CSDL | không làm gì | đơn giản nhất, dữ liệu cũ |

## Dễ nhầm

**1. `SET` cache khi ghi thay vì `DEL`.** Race để lại dữ liệu cũ.

**2. Chỉ xoá khoá chính, quên các danh sách chứa nó.**

**3. TTL đồng loạt.** Stampede.

**4. Không cache "không tìm thấy".** Dò id không tồn tại đập thẳng CSDL.

**5. Cache cả lỗi.** Kéo dài sự cố.

**6. Redis chết là ứng dụng chết.**

**7. Không tính CSDL có chịu được 100% traffic khi cache mất.**

**8. Cache để che truy vấn tồi.**

**9. Không đo tỉ lệ trúng.**

**10. Thêm cache khi truy vấn đã 2 ms.** Chi phí lớn hơn lợi ích.

## Mẹo nhớ

> **Ghi thì XOÁ khoá, đừng ghi đè — ghi đè có cửa sổ để dữ liệu cũ thắng.**
>
> **TTL phải có NHIỄU. Đồng loạt hết hạn là một cơn sóng vào CSDL.**
>
> **Redis chết thì ứng dụng CHẬM, không được SẬP.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao xoá khoá an toàn hơn ghi đè khi cập nhật?
2. Cập nhật một sản phẩm cần xoá những loại khoá nào?
3. Ba biện pháp chống stampede, chọn cái nào khi nào?
4. Vì sao nên cache cả "không tìm thấy"?
5. Khi nào cache **không** đáng thêm?

## Tự viết lại

Không nhìn lại, viết lớp cache cho trang sản phẩm:

```text
① đọc có cache, TTL có nhiễu
② cập nhật: xoá những khoá nào
③ chống stampede cho sản phẩm bán chạy
④ Redis chết thì hành xử thế nào
⑤ hai chỉ số cần đo
```

Tự kiểm: ở ④, nếu CSDL không chịu được 100% traffic, bạn thêm gì?

## Thử sức

Cache TTL 5 phút cho trang chủ. Mỗi 5 phút, bảng theo dõi hiện một đỉnh: CSDL lên 90% CPU trong khoảng 10 giây, p99 tăng gấp 8 lần.

Ba câu để trả lời: chuyện gì đang xảy ra; ba cách sửa theo thứ tự đơn giản dần; và bạn xác nhận đã hết bằng số liệu nào. Câu khó nhất: nếu sau khi thêm nhiễu TTL mà đỉnh vẫn còn — nhỏ hơn nhưng vẫn thấy — nguyên nhân còn lại là gì?
