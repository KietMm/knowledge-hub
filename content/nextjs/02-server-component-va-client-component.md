---
title: Server Component và Client Component
slug: server-component-va-client-component
summary: "Mặc định là server; 'use client' là ranh giới, không phải công tắc — và cách để ranh giới đó nằm càng thấp càng tốt."
level: co-ban
tags: [nextjs, react, server-component]
khung: v2
---

> **Sau bài này bạn sẽ:** biết chính xác `'use client'` làm gì (và **không** làm gì), và đặt được ranh giới đó ở chỗ khiến bundle nhỏ nhất.

## Ý tưởng chính

Trong App Router, **mọi component mặc định chạy ở server**. Chúng chạy một lần, sinh ra HTML, và **không gửi JavaScript nào xuống trình duyệt**.

`'use client'` không phải công tắc bật/tắt cho một file. Nó là **ranh giới**: từ file đó trở xuống, mọi thứ được import đều thành client.

## Mental model

Hãy nghĩ tới **một ngôi nhà có cửa ra sân**.

> Trong nhà (server) có bếp, tủ lạnh, két sắt — bạn dùng thoải mái, nhưng **không mang ra sân được**.
>
> Ngoài sân (client) có nắng, gió, khách khứa — nơi duy nhất có tương tác: click, gõ phím, cuộn.
>
> `'use client'` là **cái cửa**. Mọi thứ bạn mang qua cửa đó phải **đóng gói được** (serialize) — không mang được một cái tủ lạnh, và tuyệt đối không mang két sắt.

Điểm quan trọng nhất: **cửa càng đặt xa vào trong nhà thì càng nhiều thứ phải mang ra sân.** Đặt `'use client'` ở gốc cây là mang cả nhà ra sân.

## Ví dụ nhỏ

```tsx
// app/page.tsx — Server Component (mặc định)
import { db } from '@/lib/db'

export default async function Trang() {
  const ds = await db.san_pham.findMany()      // ✅ chạm thẳng cơ sở dữ liệu
  return <DanhSach ds={ds} />
}
```

```tsx
'use client'                                    // ← cái cửa
import { useState } from 'react'

export function NutThich() {
  const [thich, setThich] = useState(false)     // ✅ chỉ client mới có state
  return <button onClick={() => setThich(!thich)}>{thich ? '♥' : '♡'}</button>
}
```

## Code chạy thế nào

Vì sao vị trí cái cửa quyết định kích thước bundle:

```text
❌ Cửa đặt ở gốc
   app/page.tsx  'use client'
     ├─ Header          → client
     ├─ BangDuLieu      → client   (kéo theo thư viện bảng 80KB)
     ├─ BieuDo          → client   (kéo theo thư viện biểu đồ 120KB)
     └─ NutThich        → client
   ⇒ toàn bộ + mọi thư viện chúng import đều gửi xuống trình duyệt

✅ Cửa đặt ở lá
   app/page.tsx                    → server, 0 KB JS
     ├─ Header                     → server, 0 KB
     ├─ BangDuLieu                 → server, 0 KB  (thư viện bảng chạy ở server!)
     ├─ BieuDo         'use client'→ client, 120KB (thật sự cần tương tác)
     └─ NutThich       'use client'→ client, ~1KB
   ⇒ chỉ 2 component nhỏ được gửi xuống
```

Và một điều nhiều người không biết: **Server Component có thể là con của Client Component** — miễn là truyền qua `children`:

```tsx
'use client'
export function Tab({ children }) {            // children đã được dựng ở SERVER
  const [mo, setMo] = useState(false)
  return <div>{mo && children}</div>
}
```

```tsx
// Ở Server Component
<Tab><BangNang /></Tab>       // ✅ BangNang vẫn chạy ở server
```

Mẫu này rất mạnh: nó cho bạn giữ phần tương tác ở client mà không kéo theo phần nặng.

## Cú pháp

Khi nào **bắt buộc** `'use client'`:

```text
useState, useReducer, useEffect, useRef, useContext
onClick, onChange, onSubmit… (mọi event handler)
window, document, localStorage
thư viện chỉ chạy ở trình duyệt (chart, map, editor)
```

Còn lại — kể cả `async/await`, đọc cơ sở dữ liệu, đọc file, gọi API nội bộ — **để ở server**.

Props truyền qua cửa phải đóng gói được:

```tsx
<Con ten="a" so={1} ds={[1,2]} ngay={new Date()} />   // ✅
<Con onClick={() => {}} />                             // ❌ hàm không serialize được
<Con instance={new MyClass()} />                       // ❌
```

Ngoại lệ duy nhất: **Server Action** truyền được, vì nó không phải hàm thật mà là một tham chiếu tới endpoint — xem [[server-actions]].

## Tại sao cần nó

Ba thứ Server Component mua cho bạn, và không cái nào là chuyện nhỏ:

**① JavaScript gửi xuống bằng 0 cho phần lớn giao diện.** Trang blog, trang sản phẩm, dashboard chỉ để đọc — không cần một byte JS nào.

**② Chạm dữ liệu trực tiếp, không cần API.** Không phải viết endpoint chỉ để component tự gọi lại chính server của mình.

**③ Bí mật không bao giờ rò rỉ.**

```tsx
// Server Component — an toàn
const key = process.env.STRIPE_SECRET_KEY
```

```tsx
'use client'
const key = process.env.STRIPE_SECRET_KEY     // ❌ undefined (và nếu đặt NEXT_PUBLIC_ thì LỘ)
```

Next chỉ gửi biến môi trường có tiền tố `NEXT_PUBLIC_` xuống client. Quy tắc: **đừng bao giờ đặt tiền tố đó cho thứ gì là bí mật** — nó nằm nguyên văn trong bundle mà ai cũng đọc được.

## So sánh

| | Server Component | Client Component |
|---|---|---|
| Chạy ở | Máy chủ, một lần | Trình duyệt (và một lần ở server để SSR) |
| JS gửi xuống | **0 KB** | Có |
| `useState`, `useEffect` | ❌ | ✅ |
| Event handler | ❌ | ✅ |
| `async/await` trong component | ✅ | ❌ |
| Đọc cơ sở dữ liệu, biến bí mật | ✅ | ❌ |
| Truy cập `window`, `localStorage` | ❌ | ✅ |

## Dễ nhầm

**1. Đặt `'use client'` ở đầu mọi file "cho chắc".** Bạn vừa vứt bỏ toàn bộ lợi ích của App Router. Chỉ đặt ở lá — nơi thật sự có tương tác.

**2. Tưởng Client Component không chạy ở server.** Nó **có** chạy một lần ở server để sinh HTML ban đầu. Vì vậy `window.x` ở cấp cao nhất của file sẽ nổ:

```tsx
'use client'
const rong = window.innerWidth              // ❌ nổ lúc SSR
useEffect(() => { setRong(window.innerWidth) }, [])   // ✅
```

**3. Truyền hàm làm props qua cửa.** Không serialize được. Cần callback thì hoặc dùng Server Action, hoặc đảo cấu trúc để hàm được tạo ở phía client.

**4. Gọi `fetch` tới chính API của mình từ Server Component.** Nó đã ở server rồi — gọi thẳng hàm hoặc truy vấn thẳng cơ sở dữ liệu, đừng đi vòng qua HTTP.

**5. Bọc cả cây bằng một Client Component ở layout.** Cùng lỗi với ①, nhưng khó thấy hơn vì nó nằm ở `layout.tsx`.

## Mẹo nhớ

> **Trong nhà (server) có két sắt; ngoài sân (client) có tương tác.**
>
> **`'use client'` là CỬA, không phải công tắc — đặt càng gần lá càng tốt.**
>
> **Qua cửa thì props phải đóng gói được.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `'use client'` ảnh hưởng tới file đó và những file nào khác?
2. Vì sao đặt `'use client'` ở gốc cây làm bundle phình to?
3. Server Component có thể nằm bên trong Client Component không? Bằng cách nào?
4. Vì sao `const x = window.innerWidth` ở đầu một Client Component lại nổ?
5. Biến môi trường nào bị gửi xuống trình duyệt, và hệ quả bảo mật là gì?

## Tự viết lại

Không nhìn lại phần trên, sửa lại cấu trúc này để bundle nhỏ nhất có thể:

```tsx
'use client'
import { BieuDoNang } from './BieuDo'
import { BangTinh } from './Bang'

export default function Dashboard({ duLieu }) {
  const [tab, setTab] = useState('bieu-do')
  return (
    <>
      <nav><button onClick={() => setTab('bieu-do')}>Biểu đồ</button></nav>
      {tab === 'bieu-do' ? <BieuDoNang d={duLieu} /> : <BangTinh d={duLieu} />}
    </>
  )
}
```

Tự kiểm: `BangTinh` — thứ chỉ hiển thị, không tương tác — có còn phải gửi xuống trình duyệt không?

## Thử sức

Đồng nghiệp báo: *"tôi đặt `NEXT_PUBLIC_API_KEY` để Client Component gọi API bên thứ ba, chạy ngon"*.

Mô tả chính xác **ai có thể lấy được key đó và bằng cách nào**. Rồi đề xuất cách làm đúng — và nói rõ nó đánh đổi cái gì so với cách hiện tại.
