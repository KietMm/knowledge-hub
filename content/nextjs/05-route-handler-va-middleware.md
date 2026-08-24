---
title: Route Handler và Middleware
slug: route-handler-va-middleware
summary: Khi nào cần API route thật, và middleware nên (không nên) làm gì.
level: trung-cap
tags: [nextjs, api, middleware]
---

> **Sau bài này bạn sẽ:** biết chọn giữa Server Action và Route Handler, và viết middleware không làm chậm mọi request.

## Route Handler

File `route.ts` xuất các hàm tên theo phương thức HTTP:

```ts
// app/api/bai-viet/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const trang = Number(searchParams.get('trang') ?? '1')
  const baiViet = await db.baiViet.findMany({ skip: (trang - 1) * 20, take: 20 })
  return NextResponse.json({ baiViet })
}

export async function POST(request: Request) {
  const parsed = TaoBaiSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ loi: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }
  const bai = await db.baiViet.create({ data: parsed.data })
  return NextResponse.json(bai, { status: 201 })
}
```

Route động: `app/api/bai-viet/[id]/route.ts`, với `params` là Promise giống page.

## Chọn Server Action hay Route Handler

| Dùng Server Action khi | Dùng Route Handler khi |
|---|---|
| Form và nút trong chính app này | Client bên ngoài gọi (mobile, webhook) |
| Muốn code gọn, không cần URL | Cần URL công khai ổn định |
| Cần progressive enhancement | Cần trả file, stream, hoặc header tuỳ chỉnh |
| | Cần phương thức HTTP đúng chuẩn REST |

Mặc định trong app Next: Server Action. Route Handler cho những gì thật sự cần một endpoint.

## Trả về nội dung không phải JSON

```ts
// Tải file
export async function GET() {
  const noiDung = JSON.stringify(await layTatCa(), null, 2)
  return new Response(noiDung, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="sao-luu.json"',
    },
  })
}
```

`Content-Disposition: attachment` là thứ biến một URL thành nút tải xuống.

## Middleware

`middleware.ts` ở gốc dự án, chạy **trước** mọi request khớp `matcher`:

```ts
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('phien')?.value

  if (token === undefined) {
    const url = new URL('/dang-nhap', request.url)
    url.searchParams.set('quay-lai', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/quan-tri/:path*', '/tai-khoan/:path*'],
}
```

`matcher` rất quan trọng: thiếu nó, middleware chạy cho **cả ảnh và file tĩnh** — mỗi request đều tốn thêm thời gian.

### Middleware nên và không nên làm gì

Nên: chuyển hướng theo cookie, đặt header (CSP, request id), rewrite URL, A/B test, chọn locale.

Không nên: truy vấn database, xác minh chữ ký JWT nặng, gọi API bên ngoài. Middleware chạy ở edge runtime (không đủ API Node), và nằm trên đường đi của **mọi** request khớp matcher — chậm ở đây là chậm toàn cục.

**Cực kỳ quan trọng:** middleware kiểm tra sự **có mặt** của cookie, không phải tính hợp lệ của nó. Nó là lớp trải nghiệm (đẩy người chưa đăng nhập về trang login), **không phải** lớp bảo mật. Kiểm tra quyền thật vẫn phải nằm trong page, Server Action và Route Handler — nơi truy cập được database.

## CORS cho client bên ngoài

```ts
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://app.example.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
```

Đừng đặt `Access-Control-Allow-Origin: *` cho endpoint có xác thực — nó vô hiệu hoá lớp bảo vệ mà same-origin policy cung cấp.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Middleware không có `matcher` | Chạy cho cả file tĩnh, chậm toàn site | Khai báo matcher hẹp |
| Coi middleware là lớp bảo mật | Bỏ qua kiểm tra quyền ở nơi thật | Kiểm tra lại trong page/action |
| Gọi DB trong middleware | Không chạy được ở edge, hoặc rất chậm | Chuyển vào page/handler |
| `route.ts` cùng thư mục `page.tsx` | Xung đột route | Tách thư mục |
| `Allow-Origin: *` cho API có auth | Ai cũng gọi được từ site khác | Chỉ định origin cụ thể |

## Ghi nhớ

- Server Action cho app của mình; Route Handler cho client bên ngoài.
- `matcher` là bắt buộc trên thực tế.
- Middleware = trải nghiệm, không phải bảo mật.
- Kiểm tra quyền thật luôn nằm ở nơi truy cập được dữ liệu.

## Tự kiểm tra

1. Ứng dụng mobile cần lấy danh sách bài viết. Server Action hay Route Handler? Vì sao?
2. Vì sao middleware không đủ để bảo vệ `/quan-tri`?
3. Viết Route Handler trả về file CSV cho trình duyệt tải xuống.
