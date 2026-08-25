---
title: Route Handler và Middleware
slug: route-handler-va-middleware
summary: Khi nào cần API route thật, và middleware nên (không nên) làm gì.
level: trung-cap
tags: [nextjs, api, middleware]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng giữa Server Action và Route Handler, và biết vì sao middleware **không** phải chỗ để kiểm tra quyền.

## Ý tưởng chính

Server Action lo việc ghi dữ liệu **từ giao diện của chính bạn**. Nhưng có những thứ nó không làm được: webhook từ bên thứ ba, API cho ứng dụng di động, trả về file hay ảnh.

Đó là chỗ của **Route Handler** — một endpoint HTTP thật, bạn tự viết.

Và **Middleware** là thứ khác hẳn: nó chạy **trước mọi request**, ở tầng biên, và vì thế phải cực nhẹ.

## Mental model

Hãy nghĩ tới **toà nhà văn phòng**.

> **Route Handler là các phòng ban** — mỗi phòng làm một việc, ai vào phải nói rõ muốn gì.
>
> **Middleware là bảo vệ ở sảnh.** Anh ta xem thẻ, chỉ đường, chặn người rõ ràng không phận sự. Nhưng anh ta **không mở hồ sơ nhân sự ra tra cứu** — làm thế thì cả toà nhà xếp hàng chờ ở cửa.

Từ hình ảnh đó suy ra nguyên tắc quan trọng nhất: **middleware chỉ làm việc rẻ và nhanh**. Kiểm tra quyền chi tiết là việc của phòng ban, không phải của bảo vệ.

## Ví dụ nhỏ

```ts
// app/api/san-pham/route.ts  →  /api/san-pham
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ds = await db.sanPham.findMany({ take: Number(searchParams.get('limit') ?? 20) })
  return Response.json(ds)
}

export async function POST(req: Request) {
  const kq = TaoSchema.safeParse(await req.json())
  if (!kq.success) return Response.json({ loi: kq.error.flatten() }, { status: 400 })
  const sp = await db.sanPham.create({ data: kq.data })
  return Response.json(sp, { status: 201 })
}
```

Tên hàm **là** phương thức HTTP: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.

## Code chạy thế nào

Thứ tự xử lý một request, và đây là chỗ quyết định bạn đặt gì ở đâu:

```text
Request tới
   │
   ▼
① Middleware            ← chạy ở BIÊN, gần người dùng, trước cả cache
   │  · rẻ: đọc cookie, đổi header, chuyển hướng, chọn ngôn ngữ
   │  · KHÔNG: truy vấn cơ sở dữ liệu, gọi API chậm
   ▼
② Cache (nếu có)
   │
   ▼
③ Route Handler / Page  ← nơi làm việc thật: xác thực, phân quyền, truy vấn
```

Vì middleware chạy **trước mọi thứ và trên mọi request**, thêm 50ms ở đó là thêm 50ms cho **toàn bộ** trang web — kể cả file tĩnh nếu bạn không loại trừ chúng.

## Cú pháp

```ts
// middleware.ts (ở gốc dự án)
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Kiểm tra RẺ: chỉ xem cookie có tồn tại không, không xác minh chữ ký
  const token = req.cookies.get('phien')
  if (!token && req.nextUrl.pathname.startsWith('/quan-tri')) {
    return NextResponse.redirect(new URL('/dang-nhap', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],   // ← loại trừ file tĩnh
}
```

`matcher` là phần bắt buộc phải chỉnh: thiếu nó, middleware chạy cho **mọi** ảnh, font, file JS — và bạn trả giá ở mọi request.

Trả về nội dung không phải JSON:

```ts
export async function GET() {
  const pdf = await taoPdf()
  return new Response(pdf, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="bao-cao.pdf"' },
  })
}
```

## Tại sao cần nó

Vì có bốn việc **chỉ** Route Handler làm được:

```text
① Webhook          → bên thứ ba POST vào, họ không gọi được Server Action
② API cho mobile   → ứng dụng di động cần endpoint thật
③ Trả file/ảnh/CSV → Server Action chỉ trả dữ liệu serialize được
④ Streaming SSE    → gửi dữ liệu dần theo thời gian
```

Với webhook, có một điểm an toàn không được quên: **phải xác minh chữ ký**, vì bất kỳ ai cũng biết URL của bạn.

```ts
export async function POST(req: Request) {
  const chuKy = req.headers.get('stripe-signature')
  const raw = await req.text()                    // ← LẤY BẢN THÔ, không parse JSON trước
  const suKien = stripe.webhooks.constructEvent(raw, chuKy, process.env.WEBHOOK_SECRET)
}
```

Lấy `req.text()` chứ không `req.json()` là chi tiết quan trọng: chữ ký được tính trên **byte gốc**, parse rồi stringify lại sẽ ra chuỗi khác và xác minh luôn thất bại.

CORS khi có client bên ngoài:

```ts
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://doi-tac.com',   // ❌ đừng để '*' nếu có cookie
      'Access-Control-Allow-Methods': 'GET,POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
```

## So sánh

| Cần gì | Dùng |
|---|---|
| Ghi dữ liệu từ form của app | Server Action |
| Webhook từ Stripe/GitHub | Route Handler |
| API cho ứng dụng di động | Route Handler |
| Tải file PDF/CSV | Route Handler |
| Chuyển hướng theo cookie/ngôn ngữ | Middleware |
| Kiểm tra quyền chi tiết theo bản ghi | **Route Handler / Server Action**, không phải middleware |
| Thêm header bảo mật | Middleware |

## Dễ nhầm

**1. Dùng middleware làm lớp bảo mật duy nhất.** Middleware kiểm rẻ (có cookie không); nó **không** thay được kiểm tra quyền ở nơi thật sự chạm dữ liệu. Người tấn công gọi thẳng Server Action thì middleware của trang không giúp gì.

**2. Truy vấn cơ sở dữ liệu trong middleware.** Chậm trên **mọi** request, và ở môi trường biên thì kết nối cơ sở dữ liệu thường không dùng được.

**3. Quên `matcher`.** Middleware chạy cho từng ảnh và từng file JS.

**4. Đặt `page.tsx` và `route.ts` cùng thư mục.** Xung đột URL.

**5. Parse JSON trước khi xác minh chữ ký webhook.** Đã nói ở trên — xác minh sẽ luôn thất bại và bạn mất hàng giờ tìm nguyên nhân.

**6. `Access-Control-Allow-Origin: *` khi API dùng cookie.** Trình duyệt sẽ chặn, và nếu bạn "sửa" bằng cách bỏ credentials thì bạn vừa mở API cho mọi trang web.

## Mẹo nhớ

> **Middleware là bảo vệ ở sảnh: xem thẻ, chỉ đường — không tra hồ sơ.**
>
> **Route Handler cho webhook, mobile, file. Server Action cho form của chính bạn.**
>
> **Webhook: `req.text()` trước khi xác minh, không `req.json()`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn việc chỉ Route Handler làm được?
2. Vì sao middleware không được truy vấn cơ sở dữ liệu?
3. `matcher` giải quyết vấn đề gì?
4. Vì sao phải lấy `req.text()` khi xác minh chữ ký webhook?
5. Vì sao middleware **không** đủ để bảo vệ dữ liệu?

## Tự viết lại

Không nhìn lại phần trên, viết Route Handler nhận webhook thanh toán:

```text
Yêu cầu: xác minh chữ ký, chống xử lý trùng (bên gửi có thể gửi lại), trả 200 nhanh
```

Tự kiểm: bạn chống trùng bằng cách nào, và vì sao phải trả 200 **nhanh** — chuyện gì xảy ra nếu bạn xử lý 10 giây rồi mới trả lời?

## Thử sức

Đội bạn đặt toàn bộ kiểm tra quyền trong `middleware.ts`: *"nếu không có cookie hợp lệ thì chuyển hướng về trang đăng nhập"*. Mọi trang admin đều được bảo vệ.

Mô tả **một cách khai thác** vẫn lấy được dữ liệu admin dù middleware chạy đúng. Rồi nêu nguyên tắc chung về **nơi** kiểm tra quyền phải nằm.
