---
title: App Router và cấu trúc thư mục
slug: app-router-va-cau-truc-file
summary: Mỗi tên file đặc biệt trong app/ có một nhiệm vụ — layout, loading, error, not-found và route động.
level: co-ban
tags: [nextjs, app-router, routing]
---

> **Sau bài này bạn sẽ:** nhìn cây thư mục là đọc ra được sơ đồ URL của ứng dụng, và biết đặt file nào ở đâu.

## Thư mục là URL

Trong App Router, đường dẫn URL chính là đường dẫn thư mục dưới `app/`:

```
app/
  page.tsx                 -> /
  layout.tsx               -> khung bao mọi trang
  bai-viet/
    page.tsx               -> /bai-viet
    [slug]/
      page.tsx             -> /bai-viet/bat-ky
  (marketing)/             -> nhóm route: KHÔNG xuất hiện trên URL
    gioi-thieu/page.tsx    -> /gioi-thieu
```

Chỉ file tên đặc biệt mới tạo ra route. Đặt component, test, helper ngay cạnh `page.tsx` là an toàn — chúng không thành URL.

## Các file đặc biệt

| File | Nhiệm vụ | Ghi chú |
|---|---|---|
| `page.tsx` | Nội dung một URL | Bắt buộc để route truy cập được |
| `layout.tsx` | Khung bao, **giữ nguyên** khi điều hướng trong nhánh | State bên trong không mất |
| `template.tsx` | Như layout nhưng tạo mới mỗi lần điều hướng | Dùng khi cần reset/animation |
| `loading.tsx` | Giao diện chờ, tự bọc Suspense | Hiện ngay khi đang tải |
| `error.tsx` | Bắt lỗi trong nhánh đó | Phải là Client Component |
| `not-found.tsx` | Khi gọi `notFound()` | |
| `route.ts` | API endpoint | Không dùng chung thư mục với `page.tsx` |

Điểm hay bị bỏ sót: `error.tsx` **không** bắt được lỗi ném từ `layout.tsx` cùng cấp — lỗi đó đi lên layout cha. Lỗi ở root layout chỉ có `global-error.tsx` bắt được.

## Route động

```
app/bai-viet/[slug]/page.tsx        -> /bai-viet/abc
app/cua-hang/[...duong]/page.tsx    -> /cua-hang/a/b/c  (catch-all)
app/cua-hang/[[...duong]]/page.tsx  -> /cua-hang và /cua-hang/a/b (tuỳ chọn)
```

Trong Next 15, `params` và `searchParams` là **Promise** — phải `await`:

```tsx
export default async function Trang({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tag?: string }>
}) {
  const { slug } = await params
  const { tag } = await searchParams
  ...
}
```

Đây là thay đổi phá vỡ so với Next 14; code cũ đọc thẳng `params.slug` sẽ không chạy.

## Layout lồng nhau

```
app/layout.tsx              <- luôn bao ngoài cùng (phải có <html> và <body>)
app/quan-tri/layout.tsx     <- bao mọi trang trong /quan-tri
app/quan-tri/nguoi-dung/page.tsx
```

Điều hướng từ `/quan-tri/nguoi-dung` sang `/quan-tri/cai-dat` **không** render lại `app/quan-tri/layout.tsx`. Đó là lý do sidebar giữ nguyên vị trí cuộn và trạng thái mở/gập khi bạn chuyển trang.

## Nhóm route và route song song

```
app/(marketing)/layout.tsx    -> layout riêng cho trang giới thiệu
app/(app)/layout.tsx          -> layout riêng cho phần đăng nhập
```

Ngoặc đơn chỉ để **tổ chức** — không ảnh hưởng URL. Rất hữu ích khi hai phần của site cần layout hoàn toàn khác nhau.

## Điều hướng

```tsx
import Link from 'next/link'
<Link href="/bai-viet/abc" prefetch>Xem</Link>       // prefetch khi vào viewport

// Client Component
'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
const router = useRouter()
router.push('/dich')
router.refresh()      // tải lại dữ liệu server, GIỮ state client

// Server Component / Server Action
import { redirect } from 'next/navigation'
redirect('/dang-nhap')
```

Chú ý: `redirect()` và `notFound()` hoạt động bằng cách **ném** một exception đặc biệt. Đặt chúng trong `try/catch` sẽ nuốt mất — đừng bọc chúng.

Luôn dùng `<Link>` thay cho `<a>` cho link nội bộ: `<a>` tải lại toàn trang, mất hết state client.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đọc `params.slug` không `await` | Lỗi runtime ở Next 15 | `const { slug } = await params` |
| `<a href="/noi-bo">` | Tải lại cả trang | `<Link>` |
| `redirect()` trong `try/catch` | Không chuyển trang | Đặt ngoài try |
| `route.ts` cùng thư mục `page.tsx` | Xung đột route | Tách thư mục |
| Trông chờ `error.tsx` bắt lỗi layout cùng cấp | Trang vẫn trắng | `global-error.tsx` cho root |

## Ghi nhớ

- Thư mục = URL; ngoặc đơn `(nhom)` không tính vào URL.
- `layout` giữ nguyên khi điều hướng trong nhánh, `template` thì không.
- Next 15: `params`/`searchParams` là Promise.
- `redirect()`/`notFound()` ném exception — không bọc try/catch.

## Tự kiểm tra

1. Vẽ cây thư mục cho: trang chủ, `/blog`, `/blog/[slug]`, và khu `/admin` có layout riêng.
2. Vì sao sidebar không mất trạng thái khi chuyển giữa hai trang cùng nhánh?
3. Lỗi ném từ root layout thì file nào bắt?
