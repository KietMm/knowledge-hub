---
title: Tối ưu ảnh, font và metadata
slug: toi-uu-anh-font-va-metadata
summary: Ba thứ ảnh hưởng điểm Core Web Vitals nhiều nhất, và Next đã làm sẵn phần lớn cho bạn.
level: trung-cap
tags: [nextjs, hieu-nang, seo, core-web-vitals]
---

> **Sau bài này bạn sẽ:** loại bỏ hiện tượng trang nhảy khi tải, và đảm bảo link chia sẻ lên mạng xã hội hiện đúng ảnh và mô tả.

## Ba chỉ số cần quan tâm

| Chỉ số | Đo gì | Ngưỡng tốt |
|---|---|---|
| LCP | Phần tử lớn nhất hiện ra sau bao lâu | < 2,5 s |
| INP | Độ trễ khi người dùng tương tác | < 200 ms |
| CLS | Bố cục nhảy bao nhiêu | < 0,1 |

Ảnh ảnh hưởng LCP và CLS; font ảnh hưởng CLS; kích thước bundle ảnh hưởng INP.

## `next/image`

```tsx
import Image from 'next/image'

<Image
  src="/anh-bia.jpg"
  alt="Ảnh bìa bài viết"      // bắt buộc — mô tả nội dung, không phải "hình ảnh"
  width={1200}
  height={630}
  priority                    // CHỈ cho ảnh LCP, thường là ảnh đầu trang
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

Component này tự làm: chuyển sang WebP/AVIF, sinh nhiều kích thước cho `srcset`, lazy-load ảnh dưới màn hình, và **giữ chỗ đúng tỉ lệ** nhờ `width`/`height` — chính là thứ chặn CLS.

`sizes` hay bị bỏ qua nhưng rất quan trọng: không có nó, trình duyệt giả định ảnh rộng bằng viewport và tải bản lớn hơn cần thiết.

Với ảnh từ domain khác, khai báo trong `next.config.ts`:

```ts
export default {
  images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }] },
}
```

Danh sách trắng này là biện pháp an toàn — nếu không, bộ tối ưu ảnh của bạn thành proxy miễn phí cho cả internet.

## `next/font`

```tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-sans',
})

export default function RootLayout({ children }) {
  return <html lang="vi" className={inter.variable}><body>{children}</body></html>
}
```

Next tải font về **lúc build** và tự host — không có request nào tới Google lúc chạy. Lợi ích: nhanh hơn, và không rò rỉ IP người dùng sang bên thứ ba (điểm đáng lưu ý với GDPR).

`display: 'swap'` hiện font dự phòng ngay rồi đổi khi font thật về. Next tự tính chỉ số font dự phòng sao cho kích thước gần khớp, nên bước đổi này gần như không làm nhảy chữ.

Nhớ thêm `subsets: ['vietnamese']` — thiếu nó, chữ có dấu sẽ rơi về font hệ thống và trông lệch hẳn.

## Metadata

```tsx
// Tĩnh
export const metadata: Metadata = {
  title: { default: 'Knowledge Hub', template: '%s — Knowledge Hub' },
  description: 'Sổ tay tra cứu kiến thức dev',
  openGraph: { type: 'website', locale: 'vi_VN' },
}

// Động, theo dữ liệu
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params
  const bai = await layBai(slug)
  if (bai === null) return { title: 'Không tìm thấy' }

  return {
    title: bai.tieuDe,
    description: bai.tomTat,
    openGraph: { title: bai.tieuDe, description: bai.tomTat, images: [bai.anhBia] },
  }
}
```

`template: '%s — Knowledge Hub'` khiến mọi trang con tự có hậu tố mà không phải lặp lại.

### Ảnh Open Graph động

```tsx
// app/bai-viet/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Anh({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bai = await layBai(slug)
  return new ImageResponse(
    <div style={{ display: 'flex', fontSize: 64, padding: 80, background: '#fff' }}>
      {bai?.tieuDe ?? 'Knowledge Hub'}
    </div>,
    size,
  )
}
```

Mỗi bài viết có ảnh chia sẻ riêng, sinh tự động — không cần thiết kế tay từng cái. Lưu ý `ImageResponse` chỉ hỗ trợ một tập CSS hạn chế (flexbox, không có grid).

## Cắt JavaScript

```tsx
import dynamic from 'next/dynamic'

// Chỉ tải khi component thật sự được render
const TrinhSoanThao = dynamic(() => import('./TrinhSoanThao'), {
  loading: () => <Skeleton />,
  ssr: false,     // cho thư viện chỉ chạy được ở trình duyệt
})
```

Kiểm tra bằng `ANALYZE=true next build` với `@next/bundle-analyzer` để thấy package nào đang chiếm chỗ.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `<img>` thường | Không tối ưu, CLS cao | `next/image` với width/height |
| `priority` cho mọi ảnh | Tranh băng thông, LCP tệ hơn | Chỉ cho một ảnh đầu trang |
| Thiếu `sizes` | Tải ảnh lớn hơn cần thiết | Khai báo theo breakpoint |
| Thiếu subset `vietnamese` | Chữ có dấu rơi về font hệ thống | Thêm vào `subsets` |
| `alt=""` cho ảnh có nội dung | Trình đọc màn hình bỏ qua | Mô tả nội dung thật |

## Ghi nhớ

- `next/image` chặn CLS nhờ giữ chỗ theo `width`/`height`.
- `priority` chỉ dành cho ảnh LCP.
- `next/font` tự host — nhanh hơn và riêng tư hơn.
- `generateMetadata` cho link chia sẻ; `opengraph-image.tsx` cho ảnh động.

## Tự kiểm tra

1. Vì sao `next/image` cần `width` và `height` dù CSS đã đặt kích thước?
2. Bài viết chia sẻ lên Facebook hiện sai tiêu đề. Kiểm tra ở đâu?
3. Trang có trình soạn thảo markdown nặng 300KB chỉ dùng ở trang sửa. Xử lý thế nào?
