---
title: Quản lý secret và cấu hình
slug: quan-ly-secret-va-cau-hinh
summary: Biến môi trường, nơi cất khoá bí mật, và những cách secret rò rỉ mà bạn không ngờ tới.
level: trung-cap
tags: [owasp, secret, cau-hinh, devops]
khung: v2
---

> **Sau bài này bạn sẽ:** biết secret rò rỉ qua những đường nào (nhiều hơn bạn nghĩ), và xử lý đúng thứ tự khi nó đã lộ.

## Ý tưởng chính

Secret rò rỉ **không phải vì ai đó cẩu thả một lần**. Nó rò rỉ vì có **rất nhiều đường** mà không ai nghĩ tới: log, thông báo lỗi, ảnh chụp màn hình, bundle JavaScript, biến môi trường in ra khi debug.

Nên chiến lược đúng không phải "cẩn thận hơn" — mà là **giảm số đường có thể rò**, và **chuẩn bị sẵn cho lúc nó rò**.

## Mental model

Hãy nghĩ tới **chìa khoá nhà**.

> Bạn không để chìa dưới thảm — điều đó ai cũng biết.
>
> Nhưng bạn có nghĩ tới: chìa trong ảnh bạn đăng lên mạng, chìa bạn đưa thợ sửa ống nước ba năm trước, chìa dự phòng ở nhà bố mẹ mà bạn quên mất?
>
> Và câu hỏi quan trọng nhất: **nếu chìa lộ, bạn có thay ổ khoá được nhanh không?**

Câu cuối là thứ phân biệt hệ thống chuẩn bị tốt với hệ thống chỉ hy vọng. Secret **sẽ** lộ vào lúc nào đó — điều bạn kiểm soát được là **phản ứng mất bao lâu**.

## Ví dụ nhỏ

```ts
// ❌ Trong mã nguồn — vào Git là vĩnh viễn
const API_KEY = 'sk_live_51H8xY2...'

// ✅ Từ biến môi trường
const API_KEY = process.env.STRIPE_SECRET_KEY
```

```gitignore
.env
.env.*
!.env.example        # ← giữ file MẪU để người mới biết cần biến gì
```

## Code chạy thế nào

**Kiểm tra biến môi trường lúc khởi động** — chi tiết nhỏ với giá trị lớn:

```ts
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

export const env = EnvSchema.parse(process.env)   // ← thiếu biến ⇒ CHẾT NGAY lúc khởi động
```

```text
Không có bước này:
  Thiếu STRIPE_SECRET_KEY → app khởi động bình thường
  → 3 giờ sau, khách đầu tiên bấm thanh toán → nổ
  → và lỗi hiện ra ở tầng thanh toán, không nói gì về biến môi trường

Có bước này:
  App từ chối khởi động, log nói rõ thiếu biến nào
  → deploy thất bại NGAY, trước khi có người dùng nào chạm vào
```

Nguyên tắc: **thất bại sớm và ồn ào** luôn tốt hơn thất bại muộn và im lặng.

## Cú pháp

**Ranh giới client và server** — chỗ rò rỉ phổ biến nhất trong ứng dụng web:

```text
Next.js:   NEXT_PUBLIC_*   → GỬI XUỐNG TRÌNH DUYỆT
Vite:      VITE_*          → GỬI XUỐNG TRÌNH DUYỆT
```

```ts
// ❌ Nằm nguyên văn trong bundle JavaScript — ai cũng đọc được
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_...

// ✅ Chỉ khoá công khai mới được có tiền tố đó
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...          // không tiền tố ⇒ chỉ ở server
```

Quy tắc: **đừng bao giờ đặt tiền tố công khai cho thứ gì là bí mật**. Và cách kiểm tra rất đơn giản:

```bash
grep -r "sk_live" .next/static/    # nếu tìm thấy gì ⇒ đã rò rỉ
```

**Nơi cất secret**, từ tệ tới tốt:

```text
❌ Mã nguồn
❌ File .env commit vào Git
⚠️ File .env trên máy chủ (được, nhưng phải kiểm soát quyền đọc file)
✅ Biến môi trường của nền tảng (Vercel, Railway, Kubernetes Secret)
✅ Dịch vụ quản lý bí mật (AWS Secrets Manager, Vault, Doppler)
✅ Danh tính không cần khoá (IAM role, workload identity)
```

Dòng cuối là đích đến tốt nhất: **không có khoá nào để rò rỉ cả**. Ứng dụng chứng minh danh tính bằng cơ chế của nền tảng, và nền tảng cấp quyền tạm thời.

## Tại sao cần nó

Vì **những chỗ secret hay rò rỉ mà ít người nghĩ tới**:

```text
· Log ứng dụng          console.log(config) in ra cả object chứa khoá
· Thông báo lỗi         stack trace chứa connection string
· Ảnh chụp màn hình     dán vào ticket, vào chat nhóm
· Lịch sử shell         export API_KEY=... nằm trong ~/.bash_history
· CI/CD logs            biến môi trường in ra khi debug
· URL                   ?token=... ghi vào log máy chủ, log proxy, header Referer
· Bundle frontend       tiền tố công khai
· Docker image          ENV trong Dockerfile nằm trong metadata của image
· Bản sao lưu           file dump chứa mọi thứ, thường không mã hoá
```

Danh sách này dài hơn người ta tưởng, và mỗi dòng là một sự cố có thật ở đâu đó.

**Che secret trong log** — nên làm ngay từ đầu:

```ts
const KHOA_NHAY_CAM = /password|secret|token|key|authorization|cookie/i

function che(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, KHOA_NHAY_CAM.test(k) ? '***' : v]),
  )
}
```

**Khi lỡ commit secret** — thứ tự này quan trọng hơn mọi thứ khác trong bài:

```text
① ĐỔI KHOÁ NGAY LẬP TỨC          ← trong 5 phút đầu
② Kiểm log xem khoá đã bị dùng chưa
③ Xoá khỏi lịch sử Git (nếu cần)
④ Thông báo cho đội
```

Vì sao ① đứng đầu: repo đã được clone, CI đã ghi log, máy chủ Git có bản sao, và **bot quét GitHub tìm ra khoá trong vòng vài phút**. Dọn lịch sử Git không thay đổi sự thật rằng khoá đã lộ — chỉ có đổi khoá mới chặn được thiệt hại ([[cau-hinh-git-cho-du-an]]).

**Xoay vòng khoá** — nên làm định kỳ, không chỉ khi có sự cố:

```text
· Ghi lại khoá nào dùng ở đâu, hết hạn khi nào
· Hỗ trợ HAI khoá cùng lúc trong lúc chuyển đổi
  ⇒ đây là điểm mấu chốt: không có nó, xoay khoá = downtime
· Tự động hoá nếu có thể
```

## So sánh

| Loại giá trị | Cất ở đâu |
|---|---|
| Khoá API bí mật, mật khẩu CSDL | Biến môi trường / dịch vụ quản lý bí mật |
| Khoá công khai (publishable key) | Được phép ở client |
| URL API, tên môi trường | Cấu hình thường, không cần giấu |
| Chứng chỉ, khoá riêng tư | Dịch vụ quản lý bí mật, không bao giờ trong Git |
| Token của người dùng | Cookie `HttpOnly`, không phải `localStorage` |

## Dễ nhầm

**1. Commit `.env`.** Vào Git là vĩnh viễn — kể cả khi xoá ở commit sau.

**2. Đặt tiền tố công khai cho secret.** Nằm nguyên văn trong bundle.

**3. `console.log` cả object cấu hình.** In ra mọi khoá vào log.

**4. Truyền token qua query string.** Ghi vào log máy chủ, log proxy, và header `Referer` khi người dùng bấm sang trang khác.

**5. Không validate biến môi trường lúc khởi động.** Lỗi hiện ra ở chỗ khác, muộn hơn nhiều.

**6. Chỉ xoá lịch sử Git mà không đổi khoá.** Tốn nửa ngày và khoá vẫn đang bị dùng.

**7. `.env.example` chứa giá trị thật.** File mẫu phải có **tên biến** và giá trị giả — đây là chỗ rò rỉ hay bị bỏ qua vì ai cũng nghĩ file mẫu thì an toàn.

**8. Không có cách xoay khoá.** Khi buộc phải đổi, bạn phát hiện hệ thống chỉ chấp nhận một khoá tại một thời điểm ⇒ downtime.

**9. Dùng cùng một secret cho mọi môi trường.** Rò rỉ ở staging ⇒ mất luôn production.

## Mẹo nhớ

> **Câu hỏi quan trọng nhất: nếu chìa lộ, bạn thay ổ khoá được trong bao lâu?**
>
> **Secret lộ ⇒ ĐỔI KHOÁ trước, dọn lịch sử sau.**
>
> **Đích đến tốt nhất: không có khoá nào để rò rỉ (IAM role).**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Kể **năm** đường secret có thể rò rỉ ngoài "commit vào Git".
2. Vì sao validate biến môi trường lúc khởi động lại quan trọng?
3. `NEXT_PUBLIC_` làm gì, và hệ quả bảo mật?
4. Bốn bước khi lỡ commit secret, và vì sao bước ① đứng đầu?
5. Vì sao "hỗ trợ hai khoá cùng lúc" là điều kiện để xoay khoá?

## Tự viết lại

Không nhìn lại phần trên, thiết lập quản lý cấu hình cho một ứng dụng Next.js:

```text
Cần: DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY,
     RESEND_API_KEY, NEXT_PUBLIC_APP_URL
```

Tự kiểm: biến nào được phép có tiền tố công khai, và bạn **kiểm chứng** rằng những biến còn lại không lọt vào bundle bằng lệnh gì?

## Thử sức

Bot quét GitHub gửi email báo: khoá AWS của bạn xuất hiện trong một repo công khai từ **hai tuần trước**.

Lập kế hoạch xử lý theo phút: **5 phút đầu** làm gì, **1 giờ đầu** làm gì, **ngày đầu** làm gì. Câu khó nhất: bạn xác định khoá đó **đã bị dùng vào việc gì** bằng dữ liệu nào, và nếu nó đã bị dùng thì phạm vi thiệt hại được đánh giá ra sao?
