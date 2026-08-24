---
title: Tải dữ liệu, Suspense và streaming
slug: tai-du-lieu-va-streaming
summary: Fetch ngay trong component, chạy song song thay vì thác nước, và gửi từng phần trang về sớm.
level: trung-cap
tags: [nextjs, suspense, streaming, data-fetching]
---

> **Sau bài này bạn sẽ:** nhận ra "thác nước request" trong code của mình và sửa nó, đồng thời dùng Suspense để trang hiện ra ngay thay vì chờ phần chậm nhất.

## Fetch ngay trong component

Server Component gọi dữ liệu trực tiếp, không cần `getServerSideProps` hay `useEffect`:

```tsx
async function DanhSachBaiViet() {
  const baiViet = await db.baiViet.findMany({ take: 20 })
  return <ul>{baiViet.map((b) => <li key={b.id}>{b.tieuDe}</li>)}</ul>
}
```

Dữ liệu ở ngay cạnh nơi dùng — không phải truyền qua ba tầng props.

## Thác nước request

Đây là vấn đề hiệu năng số một của App Router:

```tsx
// Chậm: 3 lượt chờ nối tiếp
const nguoiDung = await layNguoiDung(id)
const donHang = await layDonHang(id)      // không cần đợi nguoiDung!
const goiY = await layGoiY(id)

// Nhanh: cùng khởi động
const [nguoiDung, donHang, goiY] = await Promise.all([
  layNguoiDung(id),
  layDonHang(id),
  layGoiY(id),
])
```

Thác nước còn xảy ra **giữa các component**: component cha `await` xong mới render con, con lại `await` tiếp. Cách chữa là khởi động fetch ở cha (không `await`) rồi truyền Promise xuống con để con `await`:

```tsx
export default function Trang() {
  const donHangPromise = layDonHang(id)     // khởi động, không chờ
  return (
    <Suspense fallback={<Skeleton />}>
      <BangDonHang duLieu={donHangPromise} />
    </Suspense>
  )
}
```

## Suspense và streaming

Suspense cho phép server gửi HTML **theo từng phần**: khung trang về ngay, phần chậm được thay vào khi xong.

```tsx
export default function Trang() {
  return (
    <>
      <Header />                              {/* về ngay */}
      <Suspense fallback={<TinTucSkeleton />}>
        <TinTuc />                            {/* chậm — về sau */}
      </Suspense>
      <Suspense fallback={<GoiYSkeleton />}>
        <GoiY />                              {/* chậm — về sau, độc lập */}
      </Suspense>
    </>
  )
}
```

Người dùng thấy nội dung ở mốc **thời gian của phần nhanh nhất**, thay vì phải chờ phần chậm nhất. Đặt mỗi vùng chậm trong một Suspense riêng để chúng không chờ nhau.

`loading.tsx` chính là cách viết tắt: Next tự bọc `page.tsx` trong một Suspense với fallback đó.

### Skeleton phải giống bố cục thật

Fallback nên có cùng kích thước và hình dạng với nội dung thật. Nếu không, nội dung về sẽ làm trang nhảy (Cumulative Layout Shift) — khó chịu hơn cả việc chờ.

## Dedupe và cache trong một request

Next tự **gộp** các lần `fetch()` trùng nhau (cùng URL, cùng options) trong một lần render. Nghĩa là ba component cùng gọi `fetch('/api/me')` chỉ tạo một request thật.

Với hàm không phải `fetch` (truy vấn DB chẳng hạn), dùng `cache()` của React:

```ts
import { cache } from 'react'
export const layNguoiDung = cache(async (id: string) => db.user.findUnique({ where: { id } }))
```

Giờ layout và page cùng gọi `layNguoiDung('1')` chỉ chạy một truy vấn.

## `generateStaticParams` cho trang tĩnh

```tsx
export async function generateStaticParams() {
  const baiViet = await db.baiViet.findMany({ select: { slug: true } })
  return baiViet.map((b) => ({ slug: b.slug }))
}
```

Next dựng sẵn HTML cho các slug này lúc build. Slug không có trong danh sách sẽ được render lúc chạy rồi cache lại (nếu `dynamicParams` không bị tắt).

## Xử lý lỗi và trạng thái rỗng

```tsx
const baiViet = await db.baiViet.findUnique({ where: { slug } })
if (baiViet === null) notFound()          // -> not-found.tsx
```

Danh sách rỗng thì hiện trạng thái rỗng **có hướng dẫn** ("Chưa có bài nào — viết bài đầu tiên"), đừng để một vùng trắng.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `await` nối tiếp các fetch độc lập | Thời gian cộng dồn | `Promise.all` |
| Một Suspense bọc cả trang | Chờ phần chậm nhất mới thấy gì | Nhiều Suspense nhỏ |
| Skeleton khác kích thước thật | Trang nhảy khi dữ liệu về | Skeleton đúng bố cục |
| `useEffect` để fetch trong Server Component | Không chạy được | `await` trực tiếp |
| Gọi cùng truy vấn ở nhiều component | N lần truy vấn | Bọc bằng `cache()` |

## Ghi nhớ

- Fetch ngay tại component cần dữ liệu.
- Việc độc lập ⇒ `Promise.all`; đừng để thác nước.
- Mỗi vùng chậm một Suspense riêng.
- `fetch` được dedupe sẵn; hàm khác thì bọc `cache()`.

## Tự kiểm tra

1. Chỉ ra thác nước trong: `const a = await x(); const b = await y(a.id); const c = await z()`.
2. Vì sao chia thành nhiều Suspense lại làm trang "nhanh hơn" dù tổng thời gian không đổi?
3. Layout và page cùng cần thông tin người dùng. Làm sao chỉ truy vấn một lần?
