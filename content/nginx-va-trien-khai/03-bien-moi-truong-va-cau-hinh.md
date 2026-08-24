---
title: Biến môi trường và cấu hình khi triển khai
slug: bien-moi-truong-va-cau-hinh
summary: Tách cấu hình khỏi mã nguồn, một artifact cho mọi môi trường, và kiểm tra cấu hình lúc khởi động.
level: trung-cap
tags: [deploy, cau-hinh, 12-factor]
---

> **Sau bài này bạn sẽ:** cấu hình ứng dụng theo cách chạy được ở mọi môi trường mà không phải build lại.

## Nguyên tắc

Từ 12-Factor App: **cấu hình là thứ khác nhau giữa các môi trường triển khai**. Mọi thứ giống nhau ở mọi môi trường thì thuộc về mã nguồn.

Hệ quả trực tiếp: **một artifact duy nhất** chạy được ở dev, staging và production, chỉ khác biến môi trường. Nếu phải build lại cho từng môi trường, thứ bạn kiểm tra ở staging không phải thứ chạy ở production.

```
# Là cấu hình
DATABASE_URL, API keys, URL dịch vụ ngoài, mức log, feature flag

# KHÔNG phải cấu hình
Định tuyến, quy tắc nghiệp vụ, schema — chúng thuộc về mã nguồn
```

## Kiểm tra lúc khởi động

```ts
// src/lib/env.ts
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET phải dài tối thiểu 32 ký tự'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Cấu hình môi trường không hợp lệ:')
  for (const [truong, loi] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  ${truong}: ${loi?.join(', ')}`)
  }
  process.exit(1)
}

export const env = parsed.data
```

Hai lợi ích: ứng dụng **hỏng ngay lúc khởi động** với thông báo rõ ràng thay vì hỏng lúc 2 giờ sáng khi ai đó chạm vào tính năng thanh toán; và `env.PORT` có kiểu `number`, không phải `string | undefined`.

`z.coerce.number()` cần thiết vì biến môi trường **luôn là chuỗi** — `"3000"`, không phải `3000`.

## Ranh giới build-time và runtime

Với Next.js, một số giá trị được **nhúng vào bundle lúc build**:

```ts
process.env.NEXT_PUBLIC_API_URL     // cố định lúc build, không đổi được sau
process.env.DATABASE_URL            // đọc lúc chạy, đổi được bằng restart
```

Hệ quả quan trọng: biến `NEXT_PUBLIC_*` phá vỡ nguyên tắc "một artifact cho mọi môi trường" — image build với URL của staging không dùng cho production được.

Cách xử lý: hạn chế `NEXT_PUBLIC_*` tới mức tối thiểu. Với giá trị cần khác nhau theo môi trường, hãy để Server Component đọc lúc chạy rồi truyền xuống như dữ liệu thường.

## Thứ tự ưu tiên

```
1. Biến môi trường thật (từ hệ thống/orchestrator)  ← cao nhất
2. .env.production.local
3. .env.local
4. .env.production
5. .env                                              ← thấp nhất
```

Ở production, giá trị nên đến từ **hệ thống quản lý secret**, không từ file `.env` nằm trên đĩa cạnh mã nguồn.

## Nơi đặt cấu hình theo cách triển khai

| Cách triển khai | Nơi đặt |
|---|---|
| systemd | `EnvironmentFile=/etc/ung-dung/env` (quyền `600`) |
| Docker | `--env-file`, hoặc secret của orchestrator |
| Kubernetes | ConfigMap cho cấu hình, Secret cho khoá |
| Nền tảng PaaS | Giao diện quản lý biến môi trường |

Với Docker, đừng dùng `ENV` trong Dockerfile cho giá trị theo môi trường — nó cố định vào image.

## Feature flag

```ts
const CO_TINH_NANG_MOI = env.FEATURE_TIM_KIEM_MOI === 'true'
```

Feature flag tách **triển khai** khỏi **phát hành**: code lên production nhưng tắt, bật cho một nhóm nhỏ trước, và tắt ngay lập tức khi có vấn đề — không cần triển khai lại.

Đổi lại: mỗi cờ là một nhánh code phải bảo trì và test. Xoá cờ ngay sau khi tính năng đã ổn định.

## Cấu hình khác nhau theo môi trường

```ts
export const cauHinh = {
  db: {
    // Production nhiều kết nối hơn, timeout ngắn hơn
    poolSize: env.NODE_ENV === 'production' ? 20 : 5,
  },
  log: {
    // JSON cho máy đọc ở production; định dạng người đọc ở dev
    format: env.NODE_ENV === 'production' ? 'json' : 'pretty',
  },
}
```

Giữ những khác biệt này ở **một chỗ** thay vì rải `if (production)` khắp codebase.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Build lại cho từng môi trường | Staging khác production | Một artifact + biến môi trường |
| Không validate env | Hỏng lúc chạy, thông báo khó hiểu | Validate lúc khởi động |
| Quên `coerce` cho số | `PORT` là chuỗi `"3000"` | `z.coerce.number()` |
| `NEXT_PUBLIC_` cho giá trị theo môi trường | Image không dùng lại được | Đọc lúc chạy ở server |
| File `.env` trên máy chủ production | Ai đọc được đĩa là có secret | Dùng secret manager |

## Ghi nhớ

- Một artifact cho mọi môi trường; chỉ biến môi trường khác nhau.
- Validate cấu hình lúc khởi động, hỏng sớm và rõ ràng.
- Biến môi trường luôn là chuỗi.
- Feature flag tách triển khai khỏi phát hành — nhưng nhớ dọn cờ cũ.

## Tự kiểm tra

1. Vì sao build image riêng cho staging và production là sai?
2. `NEXT_PUBLIC_API_URL` gây vấn đề gì với nguyên tắc một artifact?
3. Ứng dụng khởi động được nhưng lỗi khi gửi email vì thiếu `SMTP_HOST` — sửa cách tiếp cận thế nào?
