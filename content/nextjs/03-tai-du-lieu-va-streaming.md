---
title: Tải dữ liệu, Suspense và streaming
slug: tai-du-lieu-va-streaming
summary: Fetch ngay trong component, chạy song song thay vì thác nước, và gửi từng phần trang về sớm.
level: trung-cap
tags: [nextjs, suspense, streaming, data-fetching]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra ngay khi mình đang tạo ra thác nước request, và biết dùng Suspense để trang hiện ra sớm thay vì chờ phần chậm nhất.

## Ý tưởng chính

Trong App Router, bạn **lấy dữ liệu ngay trong component** bằng `async/await` — không `useEffect`, không trạng thái loading tự quản, không điều kiện đua.

Đổi lại, bạn phải để ý hai thứ mà trước đây framework lo hộ: **thứ tự các request** (song song hay nối tiếp), và **phần nào của trang được gửi về trước**.

## Mental model

Hãy nghĩ tới **phục vụ món ăn ở nhà hàng**.

> **Thác nước request** là bếp làm xong món một mới bắt đầu món hai. Khách chờ tổng thời gian của cả ba món.
>
> **Song song** là ba bếp làm cùng lúc. Khách chờ đúng bằng món lâu nhất.
>
> **Streaming** là **bưng món nào xong trước ra trước**. Khách có đồ ăn ngay, món hầm lâu nhất tới sau — thay vì ngồi nhìn bàn trống 20 phút.

Ba hình ảnh đó là toàn bộ bài này. Và chú ý: streaming không làm gì **nhanh hơn** — nó chỉ làm phần nhanh **tới sớm hơn**.

## Ví dụ nhỏ

```tsx
export default async function Trang() {
  const ds = await fetch('https://api.x/san-pham').then((r) => r.json())
  return <ul>{ds.map((s) => <li key={s.id}>{s.ten}</li>)}</ul>
}
```

Không hook, không state, không `loading`. Component là `async`, và Next chờ nó xong rồi mới gửi HTML.

## Code chạy thế nào

**Thác nước** — lỗi hiệu năng phổ biến nhất trong App Router:

```text
❌ Nối tiếp: mỗi await chặn cái sau
   const u   = await layNguoiDung(id)      [====== 300ms ======]
   const don = await layDonHang(id)                            [====== 300ms ======]
   const tb  = await layThongBao(id)                                                [====== 300ms ======]
   ⇒ tổng 900ms

✅ Song song: khởi động cả ba rồi mới chờ
   const [u, don, tb] = await Promise.all([...])
   [====== 300ms ======]   ⇒ tổng 300ms
```

Cách phân biệt vẫn là câu hỏi cũ: **việc sau có cần kết quả việc trước không?** Cần thì buộc phải nối tiếp, và đó là đúng.

Thác nước còn có một dạng **ẩn** và khó thấy hơn nhiều:

```text
Trang (await layNguoiDung)
  └─ DanhSachDon (await layDon)      ← chỉ bắt đầu SAU KHI Trang xong
```

Component cha `await` xong mới render con, nên con mới bắt đầu fetch. Cách chữa là dùng Suspense — cho phép cha render ngay và con tự chờ.

## Cú pháp

```tsx
import { Suspense } from 'react'

export default function Trang() {
  return (
    <>
      <Header />                                    {/* gửi về NGAY */}
      <Suspense fallback={<Khung />}>
        <DanhSachDon />                             {/* chờ ở đây, không chặn Header */}
      </Suspense>
      <Suspense fallback={<Khung />}>
        <GoiY />                                    {/* chờ độc lập với DanhSachDon */}
      </Suspense>
    </>
  )
}
```

Hai `Suspense` riêng biệt nghĩa là hai vùng **chờ độc lập**: đơn hàng về trước thì hiện trước, không phải đợi gợi ý.

```tsx
// Điều khiển cache của fetch
fetch(url)                                  // mặc định: không cache (Next 15)
fetch(url, { cache: 'force-cache' })        // cache mãi
fetch(url, { next: { revalidate: 60 } })    // làm mới sau 60 giây
fetch(url, { next: { tags: ['san-pham'] } })// gắn thẻ để xoá cache có chủ đích
```

## Tại sao cần nó

Vì ba thứ dưới đây thay đổi hẳn trải nghiệm người dùng:

**Streaming làm trang "có vẻ" nhanh hơn nhiều.** Người dùng thấy header, menu, khung nội dung ngay lập tức; phần chậm lấp vào sau. Chỉ số cảm nhận được cải thiện dù tổng thời gian không đổi.

**Dedupe tự động.** Trong cùng một lần render, `fetch` cùng một URL nhiều lần chỉ **thật sự gọi một lần**:

```tsx
// Ba component cùng gọi layNguoiDung(id) → chỉ MỘT request
const layNguoiDung = cache(async (id) => db.user.find(id))   // cho hàm không phải fetch
```

Nhờ vậy bạn không cần "nâng dữ liệu lên cha rồi truyền xuống" chỉ để tránh gọi trùng — cứ để mỗi component tự lấy thứ nó cần.

**Trang tĩnh sinh sẵn lúc build:**

```tsx
export async function generateStaticParams() {
  const ds = await layTatCaSlug()
  return ds.map((slug) => ({ slug }))          // dựng sẵn HTML cho từng slug
}
```

## So sánh

| Cách lấy dữ liệu | Khi nào |
|---|---|
| `await` trong Server Component | Mặc định — gần như luôn đúng |
| `Promise.all` | Nhiều nguồn độc lập |
| `Suspense` bọc component con | Có phần chậm không nên chặn cả trang |
| `useEffect` + fetch ở client | Dữ liệu phụ thuộc tương tác người dùng, hoặc cần cập nhật liên tục |
| Thư viện cache client (React Query) | Dữ liệu client cần đồng bộ, thử lại, cập nhật lạc quan |

Dòng thứ tư và năm vẫn có chỗ đứng — chỉ là chúng không còn là **mặc định** nữa.

## Dễ nhầm

**1. `await` tuần tự những việc độc lập.** Đã nói ở trên; đây là lỗi số một.

**2. Không bọc Suspense quanh phần chậm.** Một truy vấn 2 giây làm **toàn bộ** trang trắng 2 giây, dù 90% nội dung đã sẵn sàng.

**3. Đặt `fallback` quá khác với nội dung thật.** Khung xương nên có **cùng kích thước** với nội dung sẽ thay thế nó; khác kích thước thì trang nhảy giật khi dữ liệu về (điểm CLS xấu) — xem [[toi-uu-anh-font-va-metadata]].

**4. Gọi API của chính mình từ Server Component.**

```tsx
await fetch('https://app-cua-toi.com/api/san-pham')   // ❌ đi vòng qua mạng
const ds = await db.san_pham.findMany()                // ✅ gọi thẳng
```

**5. Quên xử lý danh sách rỗng và lỗi.** `loading.tsx` và `error.tsx` lo hai đầu, nhưng "có dữ liệu nhưng rỗng" là trạng thái thứ ba mà bạn phải tự xử lý — và người dùng gặp nó nhiều hơn bạn tưởng.

**6. Tưởng streaming làm mọi thứ nhanh hơn.** Nó chỉ đổi **thứ tự** nội dung tới. Truy vấn chậm vẫn chậm — nếu vấn đề là ở cơ sở dữ liệu thì phải sửa ở đó, xem [[index-va-hieu-nang-truy-van]].

## Mẹo nhớ

> **Ba bếp làm cùng lúc, và bưng món nào xong trước ra trước.**
>
> **Streaming không làm nhanh hơn — nó làm phần nhanh TỚI SỚM hơn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Làm sao biết hai `await` liên tiếp có gộp được thành `Promise.all` không?
2. "Thác nước ẩn" giữa component cha và con xảy ra thế nào?
3. `Suspense` giải quyết vấn đề gì mà `Promise.all` không giải được?
4. Vì sao `fallback` nên có cùng kích thước với nội dung thật?
5. Vì sao không nên `fetch` tới API của chính mình từ Server Component?

## Tự viết lại

Không nhìn lại phần trên, tối ưu trang này — hiện tại mất 1,5 giây mới thấy gì:

```tsx
export default async function Trang({ params }) {
  const { id } = await params
  const u = await layNguoiDung(id)        // 200ms
  const don = await layDonHang(id)        // 300ms
  const goiY = await layGoiY(id)          // 1000ms
  return <><HoSo u={u} /><Don d={don} /><GoiY g={goiY} /></>
}
```

Tự kiểm: sau khi sửa, người dùng thấy phần đầu tiên sau bao nhiêu mili giây? Và bạn cần **mấy** ranh giới Suspense?

## Thử sức

Trang của bạn có 6 component, mỗi cái tự gọi `layNguoiDung(id)`. Bạn lo lắng về 6 request.

Giải thích vì sao **có thể** chỉ có một request, và điều kiện để chuyện đó xảy ra. Rồi câu khó hơn: nếu `layNguoiDung` là truy vấn Prisma chứ không phải `fetch`, cơ chế dedupe còn hoạt động không — và bạn phải làm gì?
