---
title: Cache nhiều tầng
slug: cache-nhieu-tang
summary: Cache ở đâu, làm mất hiệu lực thế nào, và ba lỗi biến cache thành nguồn bug khó nhất.
level: trung-cap
tags: [kien-truc, cache, hieu-nang, redis]
---

> **Sau bài này bạn sẽ:** chọn được tầng cache đúng cho từng loại dữ liệu, và tránh ba lỗi kinh điển: stampede, dữ liệu cũ vĩnh viễn, và cache dữ liệu của người khác.

## Cache là một đánh đổi, không phải tối ưu miễn phí

Cái bạn nhận: nhanh hơn, tải xuống database giảm.
Cái bạn trả: **dữ liệu có thể cũ**, và một lớp trạng thái nữa để suy luận khi có bug.

Nên câu hỏi đầu tiên **không** phải "cache ở đâu" mà là: *"dữ liệu này cũ 30 giây thì có ai chịu thiệt không?"*

| Dữ liệu | Cũ được bao lâu |
|---|---|
| Danh sách bài viết công khai | Phút tới giờ |
| Tồn kho hiển thị trên trang sản phẩm | Giây |
| Tồn kho lúc **trừ kho** | Không bao giờ — xem [[truy-cap-dong-thoi-va-khoa]] |
| Số dư ví | Không bao giờ |
| Kết quả tính toán từ dữ liệu bất biến | Vĩnh viễn |

Dòng thứ ba là điểm quan trọng: **hiển thị** và **quyết định** có yêu cầu khác nhau trên cùng một dữ liệu. Hiển thị "còn 3 cái" từ cache là được; trừ kho phải đọc nguồn thật.

## Năm tầng, từ ngoài vào trong

```
Trình duyệt          Cache-Control, ETag          0 ms, không kiểm soát được
CDN                  cache biên                   10–50 ms, xoá được
App (RAM)            Map/LRU trong tiến trình     0,001 ms, mỗi instance một bản
Redis                cache dùng chung             0,5 ms, cả cụm thấy như nhau
Database             buffer pool                  tự động, không cần làm gì
```

Mỗi tầng gần người dùng hơn thì nhanh hơn nhưng **khó làm mất hiệu lực hơn**. Cache trong RAM trình duyệt của người dùng: bạn không có cách nào xoá nó. Vì vậy nguyên tắc: **thời gian sống càng ngắn khi càng ra xa**.

```ts
// Tài sản có hash trong tên: nội dung không bao giờ đổi → cache vĩnh viễn
'Cache-Control': 'public, max-age=31536000, immutable'

// Trang HTML: luôn hỏi lại, nhưng dùng ETag để trả 304 nếu chưa đổi
'Cache-Control': 'no-cache'

// API công khai: CDN giữ 60s, và được phục vụ bản cũ trong 5 phút khi origin chết
'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
```

`stale-while-revalidate` đáng giá nhất trong ba dòng trên: nó trả bản cũ **ngay** rồi làm mới ở nền, nên người dùng không bao giờ phải chờ một lần tính lại. Next.js dựng `revalidate` trên đúng ý này — xem [[caching-va-revalidate]].

## Cache-aside: mẫu mặc định

```ts
async function layBaiViet(slug: string): Promise<BaiViet> {
  const key = `post:${slug}`

  const daCache = await redis.get(key)
  if (daCache !== null) return JSON.parse(daCache)   // hit

  const bai = await db.posts.findUnique({ where: { slug } })
  if (bai === null) throw new NotFound()

  // TTL là BẮT BUỘC. Không có nó, một lần invalidate lỗi là dữ liệu sai vĩnh viễn —
  // và không ai phát hiện được cho tới khi có người phàn nàn.
  await redis.set(key, JSON.stringify(bai), { EX: 300 })
  return bai
}
```

Đặt TTL kể cả khi bạn đã có logic xoá cache chủ động. TTL là **lưới an toàn cho chính bug của bạn**: mọi cơ chế invalidate đều có ngày hỏng, và TTL giới hạn thiệt hại xuống còn vài phút thay vì vĩnh viễn.

## Ba lỗi kinh điển

### 1. Cache stampede

Key hết hạn đúng lúc 1.000 request đang vào. Cả 1.000 đều miss, cả 1.000 đều chạy truy vấn nặng cùng lúc → database sập. Cache vừa cứu bạn khỏi tải, giờ tạo ra một đợt tải tệ hơn.

```ts
// Khoá: chỉ MỘT request được tính lại, số còn lại chờ rồi đọc kết quả
async function layCoKhoa<T>(key: string, tinh: () => Promise<T>, ttl = 300): Promise<T> {
  const co = await redis.get(key)
  if (co !== null) return JSON.parse(co)

  const lockKey = `lock:${key}`
  const thang = await redis.set(lockKey, '1', { NX: true, EX: 10 })

  if (thang !== 'OK') {
    // Không thắng lock: chờ ngắn rồi đọc lại. Nếu vẫn chưa có thì tự tính —
    // thà nhiều request cùng tính còn hơn treo vô hạn khi request thắng lock chết.
    await new Promise((r) => setTimeout(r, 50))
    const lai = await redis.get(key)
    if (lai !== null) return JSON.parse(lai)
    return tinh()
  }

  try {
    const kq = await tinh()
    // Jitter: nếu mọi key đều TTL đúng 300s, chúng cùng hết hạn một lúc và
    // stampede quay lại theo chu kỳ.
    await redis.set(key, JSON.stringify(kq), { EX: ttl + Math.floor(Math.random() * 60) })
    return kq
  } finally {
    await redis.del(lockKey)
  }
}
```

### 2. Cache dữ liệu của người khác

Lỗi nguy hiểm nhất trong bài này, vì nó là **lỗ hổng bảo mật**, không phải lỗi hiệu năng:

```ts
// ❌ Key không có danh tính → người dùng B thấy dữ liệu của người dùng A
const key = `dashboard`

// ✅ Danh tính nằm trong key
const key = `dashboard:${user.id}`
```

Ở tầng CDN cũng vậy: đặt `Cache-Control: public` trên một response phụ thuộc cookie thì CDN sẽ phục vụ dữ liệu của người đầu tiên cho mọi người sau. Response cá nhân hoá phải là `private`, và nếu buộc phải cache thì `Vary` đúng header.

```
Cache-Control: private, no-store     ← response có dữ liệu cá nhân
```

Xem [[broken-access-control]].

### 3. Invalidate theo từng key rời rạc

```ts
// ❌ Sửa một bài viết, phải nhớ xoá đủ mọi chỗ đang chứa nó — và sẽ quên
await redis.del(`post:${slug}`)
// còn `posts:list:page:1`, `posts:by-tag:${tag}`, `sitemap`, feed RSS...
```

Hai cách đúng, chọn theo tình huống:

**Tag/namespace** — xoá theo nhóm:

```ts
// Đổi phiên bản namespace là mọi key cũ trở nên không thể tra tới (rồi TTL tự dọn).
// Rẻ hơn KEYS/SCAN rất nhiều và không chặn Redis.
const v = await redis.incr('posts:version')
const key = `posts:v${v}:list:page:1`
```

**Cache theo dữ liệu bất biến** — tránh invalidate hoàn toàn:

```ts
// Key chứa dấu vân tay của nội dung. Nội dung đổi → key mới. Không cần xoá gì.
const key = `post:${slug}:${bai.updatedAt}`
```

Cách thứ hai là cách tốt nhất khi dùng được: **không có invalidate thì không có bug invalidate**.

## Đo trước khi thêm cache

```ts
// Tỉ lệ hit dưới ~80% thường nghĩa là cache đang không đáng: bạn trả giá phức tạp
// và dữ liệu cũ, mà vẫn phải chạy truy vấn ở phần lớn request.
metrics.increment(hit ? 'cache.hit' : 'cache.miss', { key: 'post' })
```

Nếu tỉ lệ hit thấp, thường vấn đề thật là **key quá riêng biệt** (chứa timestamp, chứa tham số phân trang tự do) hoặc **truy vấn thiếu index** — và index rẻ hơn cache rất nhiều vì nó không tạo ra dữ liệu cũ.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Cache không TTL | Một lần invalidate lỗi = sai vĩnh viễn | Luôn đặt TTL làm lưới an toàn |
| Key thiếu danh tính người dùng | **Lộ dữ liệu giữa người dùng** | Đưa `user.id` vào key |
| `Cache-Control: public` cho response cá nhân | CDN phát dữ liệu người khác | `private, no-store` |
| Không chống stampede | Key hết hạn → database sập | Lock + jitter TTL |
| TTL bằng nhau cho mọi key | Hết hạn đồng loạt theo chu kỳ | Cộng jitter |
| Invalidate từng key rời rạc | Luôn quên một chỗ | Namespace version hoặc key bất biến |
| Cache để che truy vấn thiếu index | Vấn đề thật vẫn còn, chỉ bị hoãn | Thêm index trước |
| Cache dữ liệu dùng để quyết định | Trừ kho sai, tính tiền sai | Đọc nguồn thật khi quyết định |

## Ghi nhớ

- Câu hỏi đầu tiên là "cũ bao lâu thì có ai thiệt", không phải "cache ở đâu".
- Càng xa người dùng càng dễ xoá; TTL ngắn dần khi ra xa.
- TTL là lưới an toàn cho bug invalidate của chính bạn — luôn có.
- Key thiếu danh tính là lỗ hổng bảo mật, không phải lỗi hiệu năng.

## Tự kiểm tra

1. Cùng dữ liệu tồn kho: vì sao hiển thị được cache mà trừ kho thì không?
2. Cache stampede xảy ra thế nào, và jitter TTL giải quyết phần nào của nó?
3. Vì sao key chứa `updatedAt` làm bạn không cần invalidate?
