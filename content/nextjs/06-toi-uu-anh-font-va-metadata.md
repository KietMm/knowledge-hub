---
title: Tối ưu ảnh, font và metadata
slug: toi-uu-anh-font-va-metadata
summary: Ba thứ ảnh hưởng điểm Core Web Vitals nhiều nhất, và Next đã làm sẵn phần lớn cho bạn.
level: trung-cap
tags: [nextjs, hieu-nang, seo, core-web-vitals]
khung: v2
---

> **Sau bài này bạn sẽ:** biết ba chỉ số Google đo là gì, và dùng đúng ba công cụ Next làm sẵn để không phải tự tối ưu bằng tay.

## Ý tưởng chính

Google đo trải nghiệm trang bằng ba chỉ số, và chúng ảnh hưởng cả thứ hạng tìm kiếm lẫn tỉ lệ người dùng bỏ đi:

```text
LCP  →  Phần tử lớn nhất hiện ra sau bao lâu?     (mục tiêu < 2,5s)
CLS  →  Nội dung nhảy giật bao nhiêu?             (mục tiêu < 0,1)
INP  →  Bấm vào thì bao lâu mới phản hồi?         (mục tiêu < 200ms)
```

Ba thủ phạm lớn nhất của ba chỉ số đó lần lượt là: **ảnh**, **font**, và **JavaScript thừa**. Next có công cụ sẵn cho cả ba.

## Mental model

Hãy nghĩ tới **dọn bàn ăn khi khách sắp tới**.

> **LCP** là *"món chính lên bàn lúc nào?"* — khách không quan tâm khăn trải bàn đã xong; họ chờ món chính.
>
> **CLS** là *"có ai kéo bàn ra khi khách đang đặt đĩa xuống không?"* — mọi thứ nhảy chỗ giữa chừng đều gây khó chịu, kể cả khi cuối cùng vẫn đẹp.
>
> **INP** là *"gọi phục vụ thì bao lâu có người quay lại?"* — không phải mang món ra ngay, chỉ cần **phản hồi** ngay.

Ba hình ảnh đó cũng nói luôn cách chữa: đưa món chính lên trước, **giữ chỗ sẵn** cho mọi thứ sẽ tới, và đừng để phục vụ bận đến mức không ngoái đầu lại được.

## Ví dụ nhỏ

```tsx
import Image from 'next/image'

<Image
  src="/anh-bia.jpg"
  alt="Ảnh bìa"
  width={1200}
  height={630}       // ← width/height GIỮ CHỖ, chống nhảy giật
  priority           // ← ảnh trong màn hình đầu: tải sớm, không lazy
/>
```

## Code chạy thế nào

Vì sao thiếu `width`/`height` gây nhảy giật:

```text
KHÔNG có kích thước
  t=0ms    trình duyệt vẽ: [tiêu đề] [đoạn văn]        ← ảnh chưa về, chiếm 0px
  t=800ms  ảnh về, cao 600px
           → mọi thứ phía dưới bị ĐẨY XUỐNG 600px
           → người dùng đang định bấm vào link thì link chạy mất  ⇒ CLS xấu

CÓ kích thước
  t=0ms    trình duyệt biết ảnh sẽ cao 600px → chừa sẵn chỗ trống
  t=800ms  ảnh lấp vào đúng chỗ đã chừa
           → không gì dịch chuyển  ⇒ CLS = 0
```

`next/image` còn tự làm ba việc nữa mà tự tay thì rất tốn công: đổi sang định dạng WebP/AVIF, sinh nhiều kích thước cho từng loại màn hình, và lazy-load mọi ảnh **trừ** cái bạn đánh dấu `priority`.

## Cú pháp

```tsx
// Ảnh không biết trước kích thước → fill + container có position
<div className="relative h-64">
  <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
</div>
```

```tsx
// Font — tự host, không gọi Google lúc chạy
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin', 'vietnamese'], display: 'swap' })

export default function Layout({ children }) {
  return <html className={inter.className}><body>{children}</body></html>
}
```

```tsx
// Metadata tĩnh
export const metadata: Metadata = {
  title: { default: 'Cửa hàng', template: '%s — Cửa hàng' },
  description: '…',
  openGraph: { images: ['/og.png'] },
}

// Metadata động theo dữ liệu
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params
  const sp = await laySanPham(slug)
  return { title: sp.ten, description: sp.moTa }
}
```

## Tại sao cần nó

**`next/font` giải quyết một vấn đề tinh vi.** Gọi font từ Google lúc chạy nghĩa là: một request DNS nữa, một kết nối nữa, và **chữ nhảy font** khi font về (FOUT). Next tải font lúc build, tự host, và chèn kích thước dự phòng khớp với font thật — nên khoảnh khắc đổi font gần như không thấy được.

Thêm nữa: gọi Google Fonts lúc chạy là **gửi IP người dùng của bạn sang Google**, và ở châu Âu điều đó có vấn đề pháp lý.

**`subsets` là chi tiết quan trọng với tiếng Việt.** Thiếu `'vietnamese'`, mọi chữ có dấu rơi về font dự phòng và lệch hẳn khỏi phần còn lại.

**Metadata quyết định link của bạn trông thế nào khi được chia sẻ.** Không có `openGraph.images` thì link dán vào Zalo hay Facebook chỉ là một dòng chữ xám.

Và với **INP**, cách chữa gốc rễ là gửi ít JavaScript hơn:

```text
① Giữ 'use client' ở lá     →  [[server-component-va-client-component]]
② next/dynamic cho phần nặng, không cần ngay
③ Kiểm tra bundle: npx @next/bundle-analyzer
```

```tsx
const BieuDo = dynamic(() => import('./BieuDo'), { ssr: false, loading: () => <Khung /> })
```

## So sánh

| Chỉ số | Thủ phạm chính | Cách chữa trong Next |
|---|---|---|
| LCP | Ảnh lớn tải chậm | `next/image` + `priority` cho ảnh đầu trang |
| CLS | Ảnh/font không chừa chỗ | `width`/`height`, `next/font`, khung xương đúng kích thước |
| INP | JavaScript quá nhiều | Server Component, `next/dynamic` |

## Dễ nhầm

**1. Dùng `<img>` thay vì `<Image>`.** Mất hết: tối ưu định dạng, nhiều kích thước, lazy-load, chống nhảy giật.

**2. Đặt `priority` cho mọi ảnh.** `priority` nghĩa là *"tải cái này trước"*. Đặt cho 20 ảnh thì không cái nào được ưu tiên, và bạn còn làm chậm chính ảnh quan trọng nhất. Chỉ dùng cho ảnh **nằm trong màn hình đầu tiên**.

**3. Quên `sizes` khi dùng `fill`.** Không có nó, trình duyệt tải ảnh cỡ lớn nhất cho cả điện thoại.

**4. Quên subset `vietnamese`.** Chữ có dấu lệch font — lỗi rất dễ thấy nhưng cũng rất dễ quên.

**5. Đặt `metadata` trong Client Component.** Nó chỉ hoạt động ở Server Component; đặt sai chỗ thì im lặng không có tác dụng.

**6. Khung xương (skeleton) khác kích thước nội dung thật.** Bạn tưởng đang cải thiện trải nghiệm nhưng lại tạo ra CLS — khung 100px thay bằng nội dung 400px thì trang vẫn nhảy.

## Mẹo nhớ

> **LCP: món chính lên bàn. CLS: đừng kéo bàn giữa chừng. INP: phục vụ phải ngoái được đầu lại.**
>
> **`width`/`height` là GIỮ CHỖ, không phải để hiển thị.**
>
> **`priority` cho ảnh trong màn hình đầu — và chỉ cho nó.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba chỉ số Core Web Vitals đo gì, và mục tiêu của mỗi cái?
2. Vì sao thiếu `width`/`height` làm điểm CLS xấu — mô tả theo từng thời điểm?
3. `next/font` giải quyết hai vấn đề gì so với gọi Google Fonts lúc chạy?
4. Vì sao đặt `priority` cho mọi ảnh lại phản tác dụng?
5. Cách chữa gốc rễ cho INP là gì?

## Tự viết lại

Không nhìn lại phần trên, sửa trang này cho ba chỉ số đều tốt:

```tsx
export default function Trang({ sp }) {
  return (
    <>
      <img src={sp.anh} alt={sp.ten} />
      <h1 style={{ fontFamily: 'Inter' }}>{sp.ten}</h1>
      <BieuDoDanhGia data={sp.danhGia} />   {/* thư viện 200KB, nằm cuối trang */}
    </>
  )
}
```

Tự kiểm: bạn sửa ba chỗ, mỗi chỗ ứng với một chỉ số nào?

## Thử sức

Trang chủ của bạn đạt LCP 1,2 giây trên máy bạn nhưng 4,8 giây trên báo cáo thực tế từ người dùng.

Nêu **ba giả thuyết** giải thích khoảng cách đó, và với mỗi giả thuyết, nói bạn **đo cái gì** để xác nhận. Gợi ý: một trong ba không liên quan gì tới code của bạn.
