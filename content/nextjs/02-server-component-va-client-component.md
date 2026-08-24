---
title: Server Component và Client Component
slug: server-component-va-client-component
summary: Mặc định là server; 'use client' là ranh giới, không phải công tắc — và cách để ranh giới đó nằm càng thấp càng tốt.
level: co-ban
tags: [nextjs, react, server-component]
---

> **Sau bài này bạn sẽ:** biết chính xác khi nào cần `'use client'`, và vì sao đặt nó ở đầu cây làm bundle phình to.

## Hai môi trường, hai khả năng

| | Server Component (mặc định) | Client Component (`'use client'`) |
|---|---|---|
| Chạy ở | Server | Server (HTML đầu) rồi trình duyệt |
| Truy cập DB, filesystem, biến bí mật | Có | **Không** |
| `useState`, `useEffect`, `onClick` | Không | Có |
| Gửi JS xuống trình duyệt | Không | Có |
| `async/await` trong component | Có | Không (dùng hook) |

Server Component không gửi mã nguồn của nó xuống trình duyệt. Một trang toàn Server Component có thể gần như không có JavaScript nào.

## `'use client'` đánh dấu ranh giới

Chỉ thị này **không** biến mỗi file thành client — nó đánh dấu **điểm vào** của phần client. Mọi thứ được import từ file đó trở xuống đều thành Client Component:

```tsx
// app/page.tsx — Server Component
import { NutThich } from './NutThich'          // client
import { DanhSach } from './DanhSach'          // vẫn là server

export default async function Trang() {
  const baiViet = await db.baiViet.findMany()   // chạy ở server
  return <><DanhSach items={baiViet} /><NutThich id={baiViet[0].id} /></>
}
```

```tsx
// app/NutThich.tsx
'use client'
import { useState } from 'react'
export function NutThich({ id }: { id: string }) {
  const [thich, setThich] = useState(false)
  return <button onClick={() => setThich(!thich)}>{thich ? '♥' : '♡'}</button>
}
```

**Đẩy ranh giới xuống thấp nhất có thể.** Đặt `'use client'` ở layout gốc nghĩa là toàn bộ ứng dụng thành client, và bạn mất hết lợi ích.

## Server Component có thể là con của Client Component

Nghe mâu thuẫn nhưng làm được — qua `children` (hoặc bất kỳ prop nào nhận JSX):

```tsx
// Trang (server)
<KhungClient>
  <ThanhPhanServer />       {/* vẫn render ở server */}
</KhungClient>
```

Lý do: `<ThanhPhanServer />` được **render ở server rồi truyền xuống dưới dạng kết quả**, không phải dạng mã nguồn. `KhungClient` chỉ đặt nó vào đúng chỗ.

Đây là mẫu quan trọng nhất để giữ phần client nhỏ — dùng nó cho sidebar gập/mở, modal, tab: phần tương tác là client, phần nội dung vẫn là server.

## Props phải serialize được

Dữ liệu từ Server sang Client Component đi qua mạng, nên phải chuyển thành JSON được:

```tsx
// Được: string, number, boolean, null, mảng, object thuần, Date, Map, Set, Promise
<Client data={{ ten: 'An', ngay: new Date() }} />

// Không được: hàm, class instance, Symbol
<Client onLuu={() => {}} />       // lỗi — trừ khi đó là Server Action
```

Server Action là ngoại lệ có chủ đích: nó truyền xuống dưới dạng một tham chiếu, không phải mã nguồn hàm.

## Khi nào cần `'use client'`

Cần khi dùng: `useState`/`useReducer`/`useEffect`/`useRef`, trình xử lý sự kiện (`onClick`, `onChange`), API trình duyệt (`window`, `localStorage`, `IntersectionObserver`), hook từ thư viện UI tương tác, hoặc Context Provider.

Không cần khi chỉ: đọc dữ liệu, render markup, gọi `async/await`, đọc biến môi trường server.

## Bí mật không bao giờ rò rỉ

```tsx
// Server Component — an toàn, mã này không xuống trình duyệt
const key = process.env.STRIPE_SECRET_KEY
```

Nhưng nếu bạn vô tình truyền `key` làm prop xuống Client Component, nó **sẽ** xuất hiện trong HTML gửi về trình duyệt. Quy tắc: chỉ truyền xuống client đúng những gì giao diện cần hiển thị.

Biến môi trường có tiền tố `NEXT_PUBLIC_` được nhúng thẳng vào bundle client — đừng bao giờ đặt bí mật ở đó.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `'use client'` ở root layout | Cả app thành client, mất SSR | Đặt ở component lá |
| Truyền hàm làm prop sang client | Lỗi "Functions cannot be passed" | Dùng Server Action hoặc định nghĩa trong client |
| Dùng `useState` trong Server Component | Lỗi biên dịch | Thêm `'use client'` cho đúng file đó |
| Truyền secret xuống client | Lộ trong HTML | Chỉ truyền dữ liệu hiển thị |
| Bọc mọi thứ trong Client Component | Bundle to, mất streaming | Truyền `children` |

## Ghi nhớ

- Mặc định là Server Component; chỉ thêm `'use client'` khi thật sự cần tương tác.
- `'use client'` là ranh giới, mọi import bên dưới đều thành client.
- Server Component làm con của Client Component được, qua `children`.
- Props qua ranh giới phải serialize được.

## Tự kiểm tra

1. Trang có danh sách bài viết và một nút "Thích". Chia component thế nào để JS gửi xuống là ít nhất?
2. Vì sao `<ClientBao><ServerCon /></ClientBao>` không biến `ServerCon` thành client?
3. Ba thứ chỉ Server Component làm được, ba thứ chỉ Client Component làm được?
