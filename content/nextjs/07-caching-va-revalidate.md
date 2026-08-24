---
title: Bốn tầng cache và revalidate
slug: caching-va-revalidate
summary: Next cache ở bốn chỗ khác nhau — biết chúng là gì mới giải thích được vì sao dữ liệu không chịu cập nhật.
level: nang-cao
tags: [nextjs, caching, revalidate, hieu-nang]
---

> **Sau bài này bạn sẽ:** chẩn đoán được "sửa dữ liệu rồi mà trang vẫn hiện cái cũ" bằng cách xác định đúng tầng cache đang giữ nó.

## Bốn tầng

| Tầng | Ở đâu | Cache cái gì | Xoá bằng |
|---|---|---|---|
| Request Memoization | Server, trong **một** request | Các `fetch` trùng nhau | Tự hết khi request xong |
| Data Cache | Server, **qua nhiều** request | Kết quả `fetch` | `revalidatePath` / `revalidateTag` / `revalidate` |
| Full Route Cache | Server, lúc build | HTML + RSC payload của route tĩnh | `revalidatePath`, deploy mới |
| Router Cache | **Trình duyệt** | RSC payload đã điều hướng qua | `router.refresh()`, tự hết sau ~30s |

Khi thấy dữ liệu cũ, hỏi theo thứ tự: nó cũ ở tab này thôi (Router Cache) hay ở mọi máy (Data/Route Cache)?

## Điều khiển Data Cache

```ts
// Cache mãi tới khi revalidate (mặc định trong Next 14; Next 15 mặc định KHÔNG cache)
await fetch(url, { cache: 'force-cache' })

// Không bao giờ cache
await fetch(url, { cache: 'no-store' })

// Cache và làm mới sau 60 giây (ISR)
await fetch(url, { next: { revalidate: 60 } })

// Gắn tag để xoá theo nhóm
await fetch(url, { next: { tags: ['bai-viet'] } })
```

Thay đổi lớn ở Next 15: `fetch` **không còn được cache mặc định**. Muốn cache thì phải nói rõ. Đây là nguồn nhầm lẫn phổ biến khi nâng cấp từ Next 14.

## Route tĩnh và route động

Next tự quyết định dựa vào những gì bạn dùng. Route trở thành **động** khi chạm vào: `cookies()`, `headers()`, `searchParams`, hoặc `fetch` với `no-store`.

```ts
// Ép cả route thành động
export const dynamic = 'force-dynamic'

// Ép tĩnh, làm mới mỗi 3600 giây
export const revalidate = 3600
```

Đọc `cookies()` trong một component nhỏ ở góc trang sẽ khiến **cả route** thành động. Nếu chỉ một phần cần dữ liệu riêng cho người dùng, tách phần đó ra sau `<Suspense>` để phần còn lại vẫn tĩnh.

## Xoá cache sau khi ghi

```ts
'use server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function capNhat(id: string, data: Data) {
  await db.baiViet.update({ where: { id }, data })

  revalidatePath('/bai-viet')                    // đường dẫn cụ thể
  revalidatePath('/bai-viet/[slug]', 'page')     // mọi trang khớp mẫu route
  revalidateTag('bai-viet')                      // mọi fetch gắn tag này
}
```

`revalidateTag` là cách sạch nhất khi một dữ liệu xuất hiện ở nhiều trang: gắn tag lúc fetch, xoá một lần lúc ghi, không cần liệt kê từng đường dẫn.

## Router Cache — thủ phạm hay bị bỏ sót

Đây là cache **phía trình duyệt**. Sau khi ghi thành công, nếu bạn `router.push()` sang một trang đã ghé trước đó, Next có thể phục vụ bản cũ trong bộ nhớ trình duyệt — server hoàn toàn không được hỏi.

```tsx
router.refresh()          // buộc lấy lại RSC payload từ server
```

`revalidatePath` trong Server Action cũng xoá Router Cache của client gọi nó — nhưng chỉ client đó, không phải mọi tab đang mở.

## Chọn chiến lược theo loại dữ liệu

| Loại dữ liệu | Chiến lược |
|---|---|
| Trang giới thiệu, tài liệu | Tĩnh hoàn toàn |
| Danh sách bài viết | `revalidate: 60` hoặc tag + revalidate lúc ghi |
| Bảng điều khiển cá nhân | `no-store`, hoặc động sau Suspense |
| Giá tiền, tồn kho | `no-store` — sai số không chấp nhận được |

## Chẩn đoán khi dữ liệu không cập nhật

1. Chạy `next build` — bảng kết quả đánh dấu route nào tĩnh (`○`), route nào động (`ƒ`).
2. Tĩnh mà đáng lẽ phải động ⇒ thiếu `no-store`/`dynamic`.
3. Đúng động mà vẫn cũ ⇒ nhiều khả năng là Router Cache: thử hard refresh, hoặc gọi `router.refresh()`.
4. Chỉ cũ sau khi ghi ⇒ thiếu `revalidatePath`/`revalidateTag`.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Cho rằng Next 15 cache `fetch` mặc định | Dữ liệu không được cache như mong đợi | Khai báo rõ `force-cache` |
| Quên revalidate sau khi ghi | Giao diện hiện dữ liệu cũ | Revalidate trong action |
| `cookies()` ở component nhỏ | Cả route thành động | Tách ra sau Suspense |
| `no-store` khắp nơi cho chắc | Mất hết lợi ích cache | Chọn theo loại dữ liệu |
| Nhầm Router Cache với Data Cache | Sửa nhầm tầng, tốn thời gian | Chẩn đoán theo bốn bước trên |

## Ghi nhớ

- Bốn tầng: memoization, data, route, router. Xác định đúng tầng trước khi sửa.
- Next 15 không cache `fetch` mặc định.
- `revalidateTag` gọn hơn khi dữ liệu xuất hiện ở nhiều trang.
- Router Cache nằm ở trình duyệt — `router.refresh()` mới xoá được.

## Tự kiểm tra

1. Bốn tầng cache, mỗi tầng một câu mô tả và cách xoá.
2. Trang danh sách vẫn hiện bài đã xoá sau khi xoá thành công. Chẩn đoán theo bốn bước.
3. Khi nào `revalidateTag` tốt hơn `revalidatePath`?
