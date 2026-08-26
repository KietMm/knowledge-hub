---
title: Biến môi trường và cấu hình khi triển khai
slug: bien-moi-truong-va-cau-hinh
summary: Tách cấu hình khỏi mã nguồn, một artifact cho mọi môi trường, và kiểm tra cấu hình lúc khởi động.
level: trung-cap
tags: [deploy, cau-hinh, 12-factor]
khung: v2
---

> **Sau bài này bạn sẽ:** phân biệt được cái gì là cấu hình và cái gì là mã, và làm cho ứng dụng chết ngay khi thiếu cấu hình thay vì chết lúc 3 giờ sáng.

## Ý tưởng chính

Cấu hình là **thứ khác nhau giữa các môi trường**. Mã là thứ giống nhau.

Từ định nghĩa đó suy ra một quy tắc kiểm tra: nếu bạn phải **build lại** để triển khai lên môi trường khác, thì bạn đang để cấu hình lẫn trong mã.

## Mental model

Hãy nghĩ tới **một thiết bị điện bán quốc tế**.

> Cái máy sấy tóc là **một sản phẩm duy nhất**, sản xuất giống hệt nhau ở mọi lô hàng.
>
> Cái thay đổi theo nước là **ổ cắm và điện áp** — thứ nó nhận từ **môi trường bên ngoài** khi cắm vào.
>
> Không ai sản xuất một dây chuyền riêng cho mỗi quốc gia. Và cái phích cắm **không** nằm bên trong vỏ máy.

`DATABASE_URL` là ổ cắm. Image Docker là cái máy sấy. Một artifact, cắm vào đâu chạy đó ([[trien-khai-tu-dong]]).

## Ví dụ nhỏ

```bash
NODE_ENV=production
DATABASE_URL=postgres://user:pass@db:5432/app
REDIS_URL=redis://cache:6379
JWT_SECRET=<chuỗi ngẫu nhiên dài>
```

## Code chạy thế nào

**Xác thực cấu hình **một lần** lúc khởi động — không rải rác khắp mã:**

```ts
// config.ts — nơi DUY NHẤT đọc process.env
import { z } from 'zod'

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

const kq = Schema.safeParse(process.env)
if (!kq.success) {
  console.error('Cấu hình sai:', z.treeifyError(kq.error))
  process.exit(1)                          // ← CHẾT NGAY, không chạy tiếp
}
export const config = kq.data
```

**Vì sao `process.exit(1)` là điều quan trọng nhất ở đây:**

```text
❌ Không xác thực:
   process.env.JWT_SECRET là undefined
   → Ứng dụng khởi động BÌNH THƯỜNG
   → Chạy được vài giờ
   → 3 giờ sáng, người dùng đầu tiên đăng nhập ⇒ sập
   → Bạn dậy, đọc log, và stack trace chỉ vào một hàm ký JWT.

✅ Có xác thực:
   Chết trong 200ms, thông báo: "JWT_SECRET: bắt buộc".
   Lần deploy đó thất bại RÕ RÀNG, quay lui tự động, không ai bị ảnh hưởng.
```

Đây là nguyên tắc **fail fast**: chuyển một lỗi âm thầm ở thời điểm xấu thành một lỗi ồn ào ở thời điểm tốt.

Lợi ích thứ hai của `config.ts`: mọi nơi khác trong mã dùng `config.PORT` — **đã có kiểu, đã được kiểm** — thay vì `process.env.PORT` là `string | undefined` ở khắp nơi.

## Cú pháp

**Cấu hình biến đổi thế nào qua các môi trường:**

```text
Máy dev:     file .env (KHÔNG commit) + .env.example (CÓ commit)
CI:          secret của CI
Container:   environment / env_file trong compose
Cloud:       secret manager của nhà cung cấp
Kubernetes:  ConfigMap (thường) + Secret (nhạy cảm)
```

`.env.example` là tài liệu duy nhất không lỗi thời được — vì thiếu một biến thì ứng dụng không chạy:

```bash
# .env.example — commit file này
DATABASE_URL=postgres://user:pass@localhost:5432/app
JWT_SECRET=doi-thanh-chuoi-ngau-nhien-32-ky-tu-tro-len
PORT=3000
```

**Cái gì là cấu hình, cái gì không:**

```text
✅ CẤU HÌNH (khác giữa các môi trường):
   URL CSDL, khoá API, tên miền, cổng, mức log,
   giới hạn tài nguyên, feature flag

❌ KHÔNG PHẢI cấu hình (giống nhau mọi nơi):
   Định tuyến, schema, quy tắc nghiệp vụ, cấu trúc thư mục
   → những thứ này thuộc về MÃ, và phải đi qua review.
```

Ranh giới này quan trọng: nhét quy tắc nghiệp vụ vào biến môi trường nghĩa là nó **không được review, không có test, không có lịch sử thay đổi**.

**Với ứng dụng frontend, một cái bẫy:**

```text
Biến build-time (NEXT_PUBLIC_*, VITE_*) được NHÚNG VÀO BUNDLE lúc build.
⇒ Ai cũng đọc được. KHÔNG BAO GIỜ để secret ở đó.
⇒ Và đổi giá trị thì phải BUILD LẠI — nó không còn là "cấu hình runtime".
```

## Tại sao cần nó

Vì cấu hình lẫn trong mã sinh ra một chuỗi hậu quả:

```text
Build riêng cho từng môi trường
  ⇒ artifact staging ≠ artifact production
  ⇒ "staging chạy tốt mà" không chứng minh được gì
  ⇒ mỗi lần đổi một URL phải build lại và deploy lại
```

**Secret không nằm trong git — và nếu lỡ, phải xoay:**

```text
git commit .env
  → xoá file ở commit sau KHÔNG đủ: nó còn trong LỊCH SỬ,
    trong bản clone của mọi người, trong cache của GitHub.
  ⇒ Coi như đã lộ. XOAY secret ngay.
```

Và điều làm việc xoay khả thi là **secret nằm ở một nơi duy nhất**: đổi một chỗ, deploy lại, xong. Nếu nó rải trong mã, trong CI, và trong đầu vài người, thì bạn không thật sự xoay được ([[quan-ly-secret-va-cau-hinh]]).

**Ba thứ nên có ngay từ đầu:**

```text
□ config.ts xác thực bằng schema, exit(1) khi sai
□ .env.example được commit và luôn đầy đủ
□ .env trong .gitignore
```

## So sánh

| | Trong mã | Biến môi trường |
|---|---|---|
| Đổi giá trị | build lại | restart |
| Một artifact mọi môi trường | ❌ | ✅ |
| Chứa secret an toàn | ❌ | ✅ (nếu quản lý đúng) |
| Được review, có test | ✅ | ❌ |
| Dùng cho | quy tắc nghiệp vụ | URL, khoá, cổng |

## Dễ nhầm

**1. Không xác thực cấu hình lúc khởi động.** Lỗi lộ ra vào lúc tệ nhất.

**2. Commit `.env`.** Secret vào lịch sử git vĩnh viễn.

**3. Không có `.env.example`.** Người mới không biết cần biến nào.

**4. Build riêng cho mỗi môi trường.** Mất ý nghĩa của staging.

**5. Để secret trong biến `NEXT_PUBLIC_*` / `VITE_*`.** Nhúng thẳng vào bundle.

**6. Đọc `process.env` rải khắp mã.** Không kiểm được, không có kiểu.

**7. Giá trị mặc định nguy hiểm:** `JWT_SECRET ?? 'dev-secret'` — production sẽ chạy với secret đó.

**8. Nhét quy tắc nghiệp vụ vào biến môi trường.** Không review, không test.

**9. Không xoay secret sau khi lộ.** Xoá file không xoá lịch sử.

**10. Cấu hình chỉ tồn tại trong đầu một người.** Người đó nghỉ phép là hệ thống không deploy lại được.

## Mẹo nhớ

> **Cấu hình = thứ khác nhau giữa các môi trường. Mã = thứ giống nhau.**
>
> **Một artifact, nhiều môi trường — chỉ biến môi trường thay đổi.**
>
> **Xác thực lúc khởi động và `exit(1)`: chết to và rõ, đúng lúc.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Phân biệt cấu hình và mã bằng câu hỏi nào?
2. Vì sao `exit(1)` khi cấu hình sai lại tốt hơn là chạy tiếp?
3. Vì sao secret không được để trong biến `NEXT_PUBLIC_*`?
4. Lỡ commit `.env` thì phải làm gì, và vì sao xoá file không đủ?
5. Vì sao không nên đọc `process.env` rải rác khắp mã?

## Tự viết lại

Không nhìn lại, viết `config.ts` cho ứng dụng cần: URL CSDL, URL Redis, JWT secret ít nhất 32 ký tự, cổng (mặc định 3000), mức log (mặc định info), và một khoá API bên thứ ba chỉ bắt buộc ở production.

Tự kiểm: điều gì xảy ra khi chạy ở production mà thiếu khoá API đó — và bạn thấy thông báo gì?

## Thử sức

Ứng dụng chạy production ba tuần thì phát hiện: **`JWT_SECRET` chưa bao giờ được đặt**, và mã có dòng `process.env.JWT_SECRET || 'dev-secret'`.

Ba câu để trả lời: hậu quả bảo mật **cụ thể** là gì; bạn xử lý theo thứ tự nào ngay bây giờ; và thay đổi nào khiến lớp lỗi này **không thể xảy ra nữa**. Câu khó nhất: sau khi đổi `JWT_SECRET`, chuyện gì xảy ra với người dùng đang đăng nhập — và bạn xử lý ra sao?
