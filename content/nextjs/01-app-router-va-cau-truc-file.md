---
title: App Router và cấu trúc thư mục
slug: app-router-va-cau-truc-file
summary: Mỗi tên file đặc biệt trong app/ có một nhiệm vụ — layout, loading, error, not-found và route động.
level: co-ban
tags: [nextjs, app-router, routing]
khung: v2
---

> **Sau bài này bạn sẽ:** nhìn cây thư mục `app/` là đọc ra được toàn bộ bản đồ URL, và biết đặt file nào ở đâu mà không phải tra tài liệu.

## Ý tưởng chính

Trong App Router, **cấu trúc thư mục chính là bảng định tuyến**. Không có file cấu hình route nào cả — bạn tạo thư mục, và URL xuất hiện.

Bên trong mỗi thư mục, **tên file quyết định vai trò**: `page` là nội dung, `layout` là khung bao, `loading` là màn hình chờ, `error` là lưới an toàn.

## Mental model

Hãy nghĩ tới **các lớp áo mặc chồng lên nhau**.

> Thư mục lồng nhau = áo mặc chồng: `app/layout` là áo trong cùng, `app/blog/layout` khoác thêm bên ngoài, và `page` là người mặc.
>
> Khi bạn đi từ `/blog/a` sang `/blog/b`, **những lớp áo bên ngoài không cởi ra** — chỉ người bên trong đổi. Đó là lý do sidebar không nhấp nháy, và state trong layout không mất khi điều hướng.

Hình ảnh đó giải thích luôn `loading.tsx`: nó là thứ hiện ra **ở đúng vị trí của người mặc**, trong khi các lớp áo vẫn nguyên.

## Ví dụ nhỏ

```text
app/
├─ layout.tsx          → khung của MỌI trang
├─ page.tsx            → /
├─ blog/
│  ├─ layout.tsx       → khung riêng cho mọi trang trong /blog
│  ├─ page.tsx         → /blog
│  └─ [slug]/
│     └─ page.tsx      → /blog/bat-ky
└─ api/
   └─ ping/route.ts    → /api/ping
```

## Code chạy thế nào

Mở `/blog/hello`, Next dựng cây theo thứ tự từ ngoài vào trong:

```text
app/layout.tsx                      ← lớp ngoài cùng, luôn có
  └─ app/blog/layout.tsx            ← lớp của khu blog
       └─ app/blog/[slug]/page.tsx  ← nội dung

Nếu page đang chờ dữ liệu:
app/layout → app/blog/layout → app/blog/[slug]/loading.tsx   ← hiện tạm ở ĐÚNG chỗ page

Nếu page ném lỗi:
app/layout → app/blog/layout → app/blog/[slug]/error.tsx     ← layout vẫn còn nguyên
```

Điểm quan trọng: `error.tsx` **không** thay thế layout của nó — nên khi một trang hỏng, người dùng vẫn còn menu để đi chỗ khác thay vì thấy trang trắng.

## Cú pháp

Các file đặc biệt, mỗi cái một nhiệm vụ:

```text
page.tsx        → nội dung, TẠO RA một URL
layout.tsx      → khung bao, giữ nguyên khi điều hướng bên trong
template.tsx    → như layout nhưng DỰNG LẠI mỗi lần điều hướng
loading.tsx     → Suspense fallback tự động cho page cùng cấp
error.tsx       → Error Boundary ('use client' bắt buộc)
not-found.tsx   → hiện khi gọi notFound()
route.ts        → API endpoint (không đi cùng page.tsx trong một thư mục)
```

Route động và cách đọc tham số:

```tsx
// app/blog/[slug]/page.tsx
export default async function Trang({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>          // ← Promise từ Next 15
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const { q } = await searchParams
}
```

```text
[slug]        → khớp một đoạn:      /blog/a
[...slug]     → khớp nhiều đoạn:    /docs/a/b/c
[[...slug]]   → như trên, kể cả rỗng: /docs
(nhom)        → nhóm để chia layout, KHÔNG xuất hiện trong URL
_thumuc       → thư mục riêng tư, Next bỏ qua hoàn toàn
```

Cặp `(nhom)` và `_thumuc` là hai thứ tiết kiệm nhiều công nhất: nhóm route cho phép hai khu vực có layout khác nhau mà URL vẫn sạch, còn `_components` cho bạn để component ngay cạnh trang dùng nó mà không tạo ra URL.

## Tại sao cần nó

Vì mô hình này giải quyết ba thứ mà Pages Router cũ làm vụng:

**Layout không dựng lại khi điều hướng.** Menu, sidebar, trạng thái cuộn đều giữ nguyên — không phải "tự làm cho giống SPA" nữa.

**Mỗi khu vực có màn hình chờ và lưới an toàn riêng.** Trang sản phẩm chậm thì chỉ vùng đó hiện `loading`, phần còn lại đã dùng được.

**Điều hướng có tải trước.** `<Link>` tự tải trước route khi nó lọt vào tầm nhìn, nên bấm vào thấy gần như tức thì:

```tsx
import Link from 'next/link'
<Link href="/blog">Blog</Link>          {/* ✅ dùng cái này */}
<a href="/blog">Blog</a>                {/* ❌ tải lại toàn trang, mất hết layout */}
```

Điều hướng từ code:

```tsx
'use client'
const router = useRouter()
router.push('/blog')      // thêm vào lịch sử
router.replace('/blog')   // thay thế, không thêm nút Back
router.refresh()          // lấy lại dữ liệu server, giữ nguyên state client
```

## So sánh

| Cần gì | File |
|---|---|
| Một URL mới | `page.tsx` |
| Khung chung, giữ state khi điều hướng | `layout.tsx` |
| Khung chung nhưng **phải** dựng lại mỗi lần | `template.tsx` |
| Màn hình chờ | `loading.tsx` |
| Bắt lỗi cho một vùng | `error.tsx` |
| API trả JSON | `route.ts` |

`template` khác `layout` ở đúng một điểm và ít khi cần: dùng nó khi bạn muốn hiệu ứng chuyển trang chạy lại, hoặc muốn state trong khung **bị xoá** mỗi lần đổi trang.

## Dễ nhầm

**1. Dùng `<a>` thay vì `<Link>`.** Tải lại toàn bộ trang, mất mọi lợi thế của App Router.

**2. Quên `await params`.** Từ Next 15, `params` và `searchParams` là Promise. Quên `await` thì bạn nhận về một Promise và mọi thứ `undefined`.

**3. Đặt `page.tsx` và `route.ts` trong cùng thư mục.** Hai file cùng nhận một URL ⇒ xung đột.

**4. Quên `'use client'` trong `error.tsx`.** File này bắt buộc là Client Component — nó cần state để hiện lại và cần `onClick` cho nút thử lại.

**5. Nghĩ `(nhom)` xuất hiện trong URL.** Không. `app/(marketing)/gia/page.tsx` cho ra `/gia`, không phải `/marketing/gia`.

**6. Đặt file dùng chung vào `app/` mà không có tiền tố `_`.** Mọi thư mục trong `app/` đều có thể thành route. `app/utils/` là an toàn (không có `page.tsx`), nhưng `_utils` nói rõ ý định hơn và tránh nhầm lẫn.

## Mẹo nhớ

> **Thư mục là URL. Tên file là vai trò.**
>
> **Layout là lớp áo — điều hướng bên trong không cởi áo ngoài.**
>
> **`(nhom)` chia layout mà không hiện trong URL.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `app/blog/[slug]/page.tsx` tạo ra URL nào?
2. Điều gì xảy ra với layout khi bạn điều hướng từ `/blog/a` sang `/blog/b`?
3. `loading.tsx` hiện ra ở **vị trí nào** trên màn hình, và vì sao?
4. `layout` và `template` khác nhau ở đâu?
5. `(nhom)` và `_thumuc` khác nhau thế nào về ảnh hưởng tới URL?

## Tự viết lại

Không nhìn lại phần trên, vẽ cây thư mục cho yêu cầu sau:

```text
- Trang chủ /
- /san-pham và /san-pham/<id>
- Khu quản trị /admin, /admin/don-hang — có sidebar riêng, KHÔNG dùng header của trang chính
- API /api/webhook
- Trang sản phẩm cần màn hình chờ riêng và lưới bắt lỗi riêng
```

Tự kiểm: bạn dùng nhóm route ở đâu, và vì sao khu admin không thể chỉ là một thư mục thường?

## Thử sức

Bạn đặt `loading.tsx` ở `app/loading.tsx`. Người dùng đang ở `/blog/a` bấm sang `/blog/b`, và **toàn bộ trang** — kể cả sidebar — bị thay bằng màn hình chờ.

Giải thích vì sao, rồi sửa để chỉ vùng nội dung hiện màn hình chờ. Câu hỏi tiếp: nếu `/blog/b` tải rất nhanh, người dùng có nhìn thấy `loading` không, và điều đó ảnh hưởng trải nghiệm thế nào?
