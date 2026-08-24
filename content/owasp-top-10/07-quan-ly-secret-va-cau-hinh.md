---
title: Quản lý secret và cấu hình
slug: quan-ly-secret-va-cau-hinh
summary: Biến môi trường, nơi cất khoá bí mật, và những cách secret rò rỉ mà bạn không ngờ tới.
level: trung-cap
tags: [owasp, secret, cau-hinh, devops]
---

> **Sau bài này bạn sẽ:** biết secret nào được phép xuống trình duyệt (không cái nào), và xử lý đúng khi lỡ commit khoá.

## Không bao giờ để secret trong mã nguồn

```ts
// SAI
const STRIPE_KEY = 'sk_live_51H...'

// ĐÚNG
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
```

Mã nguồn được sao chép khắp nơi: máy của mọi thành viên, bản fork, CI, backup, và lịch sử Git giữ lại vĩnh viễn. Một khoá vào repo là một khoá coi như đã lộ.

```gitignore
.env
.env.local
.env.*.local
*.pem
*.key
```

Commit `.env.example` với **tên biến nhưng giá trị giả** — người mới biết cần cấu hình gì:

```bash
# .env.example
DATABASE_URL=postgresql://user:pass@localhost:5432/db
STRIPE_SECRET_KEY=sk_test_thay_bang_khoa_that
NEXTAUTH_SECRET=sinh_bang_openssl_rand_base64_32
```

## Kiểm tra biến môi trường lúc khởi động

Thiếu biến môi trường thì phải hỏng **ngay lúc khởi động**, không phải lúc người dùng đầu tiên chạm vào tính năng thanh toán:

```ts
// src/lib/env.ts
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  NODE_ENV: z.enum(['development', 'test', 'production']),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Cấu hình môi trường thiếu hoặc sai:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}
export const env = parsed.data
```

Thêm lợi ích: `env.DATABASE_URL` có kiểu `string`, không phải `string | undefined`.

## Ranh giới client và server

```ts
// Chỉ ở server — an toàn
process.env.STRIPE_SECRET_KEY

// Nhúng vào bundle JavaScript, AI CŨNG XEM ĐƯỢC
process.env.NEXT_PUBLIC_ANALYTICS_ID
```

Tiền tố `NEXT_PUBLIC_` (hoặc `VITE_`, `REACT_APP_`) nghĩa là giá trị được **chèn thẳng vào file JS** gửi xuống trình duyệt. Không có ngoại lệ nào.

Ba cách secret vô tình xuống client:

1. Đặt tên biến có tiền tố public.
2. Truyền secret làm prop từ Server Component sang Client Component.
3. Trả secret trong response API (ví dụ trả nguyên object cấu hình).

Kiểm tra nhanh: `pnpm build` rồi `grep -r "sk_live" .next/static/`.

## Nơi cất secret

| Nơi | Phù hợp cho |
|---|---|
| `.env.local` | Máy phát triển cá nhân |
| Secret của nền tảng (Vercel, Railway) | Ứng dụng nhỏ và vừa |
| GitHub Actions secrets | Dùng trong CI |
| Vault / AWS Secrets Manager / KMS | Hệ thống lớn, cần xoay vòng và ghi log truy cập |

Tiêu chí chọn: cần **xoay vòng khoá tự động** và **nhật ký ai đã đọc khoá** thì phải dùng nhóm cuối.

## Xoay vòng khoá

Mọi secret nên xoay vòng định kỳ, và **bắt buộc** khi có người rời nhóm hoặc nghi ngờ rò rỉ.

Để xoay vòng không gây gián đoạn, hệ thống phải chấp nhận **hai khoá cùng lúc** trong giai đoạn chuyển tiếp:

```ts
const KHOA_HOP_LE = [env.JWT_SECRET, env.JWT_SECRET_CU].filter(Boolean)
// Ký bằng khoá mới, xác minh bằng cả hai
```

## Khi lỡ commit secret

Theo đúng thứ tự này:

1. **Vô hiệu hoá khoá ngay** ở nơi phát hành (Stripe, AWS...). Đây là bước duy nhất thật sự cứu được tình hình.
2. Phát hành khoá mới, cập nhật nơi cất secret.
3. Xoá khỏi lịch sử Git bằng `git filter-repo`, rồi force push.
4. Kiểm tra log xem khoá đã bị dùng bất thường chưa.

Đừng làm ngược lại. Xoá khỏi Git trước rồi mới đổi khoá nghĩa là khoá vẫn sống trong suốt khoảng thời gian đó — mà repo có thể đã bị fork, clone, hoặc bot đã quét.

Phòng ngừa: bật secret scanning của GitHub, và cài `gitleaks` làm pre-commit hook.

## Những chỗ secret hay rò rỉ khác

- **Log** — `console.log(request.headers)` in luôn cả `Authorization`.
- **Thông báo lỗi** gửi lên Sentry kèm biến môi trường.
- **URL** — token trong query string bị ghi vào log của Nginx và trong `Referer` gửi sang site khác.
- **Ảnh chụp màn hình** trong tài liệu và ticket.
- **File build** — source map công khai kèm mã nguồn server.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Secret trong mã nguồn | Lộ vĩnh viễn qua lịch sử Git | Biến môi trường + secret scanning |
| Tiền tố `NEXT_PUBLIC_` cho secret | Nằm sẵn trong bundle | Bỏ tiền tố, giữ ở server |
| Không kiểm tra env lúc khởi động | Hỏng giữa chừng ở production | Validate bằng zod |
| Token trong query string | Vào log máy chủ và header Referer | Đặt trong header |
| Xoá khỏi Git mà không đổi khoá | Khoá vẫn dùng được | Vô hiệu hoá khoá trước tiên |

## Ghi nhớ

- Secret không bao giờ vào repo; `.env.example` chỉ chứa tên biến.
- Validate biến môi trường lúc khởi động, hỏng sớm còn hơn hỏng muộn.
- `NEXT_PUBLIC_` = công khai, không có ngoại lệ.
- Lỡ lộ thì đổi khoá trước, dọn lịch sử sau.

## Tự kiểm tra

1. Vì sao xoá secret khỏi lịch sử Git không đủ?
2. Làm sao kiểm tra chắc chắn không có secret nào lọt vào bundle client?
3. Xoay vòng `JWT_SECRET` mà không làm đăng xuất toàn bộ người dùng — làm thế nào?
