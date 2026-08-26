---
title: Cấu trúc dự án và quản lý phụ thuộc
slug: cau-truc-du-an-va-phu-thuoc
summary: Chia thư mục theo tính năng, đảo ngược phụ thuộc khi thật sự cần, và giữ ranh giới bằng công cụ chứ không bằng lời nhắc.
level: trung-cap
tags: [backend, kien-truc, thiet-ke, module]
khung: v2
---

> **Sau bài này bạn sẽ:** tổ chức một dự án backend sao cho ranh giới được **máy** giữ, không phải trí nhớ của đội.

## Ý tưởng chính

Cấu trúc thư mục không phải chuyện thẩm mỹ. Nó quyết định **một thay đổi điển hình chạm bao nhiêu chỗ**.

Và ranh giới giữa các phần chỉ tồn tại thật khi có **công cụ chặn** việc vi phạm. Một quy ước chỉ nằm trong tài liệu sẽ bị vi phạm — không phải vì ai đó cẩu thả, mà vì lúc 5 giờ chiều thứ Sáu, cách nhanh nhất luôn là import thẳng.

## Mental model

Hãy nghĩ tới **sắp xếp bếp**.

> **Theo loại đồ vật**: mọi con dao một ngăn, mọi cái bát một ngăn, mọi gia vị một ngăn. Nghe gọn. Nhưng nấu một món thì phải chạy khắp bếp.
>
> **Theo món ăn**: dụng cụ và nguyên liệu cho món phở để cùng một chỗ. Nấu phở thì mở một ngăn.
>
> Và những thứ **thật sự dùng chung** — muối, dầu ăn, thớt — để riêng ở chỗ ai cũng với tới.

Sắp theo loại là chia theo **tầng kỹ thuật**. Sắp theo món là chia theo **tính năng**. Cái thứ hai thắng vì công việc thật đến theo tính năng, không đến theo tầng.

## Ví dụ nhỏ

```text
src/
  don-hang/    route.ts  service.ts  repo.ts  schema.ts  service.test.ts
  san-pham/    ...
  shared/      db.ts  logger.ts  errors.ts  config.ts
```

## Code chạy thế nào

**So sánh cụ thể — thêm một trường vào đơn hàng:**

```text
Chia theo TẦNG:
  controllers/don-hang.ts
  services/don-hang.ts
  repositories/don-hang.ts
  schemas/don-hang.ts
  tests/services/don-hang.test.ts
⇒ 5 thư mục cách xa nhau. Diff rải rác. Review khó theo dõi.

Chia theo TÍNH NĂNG:
  don-hang/  (5 file, cạnh nhau)
⇒ Một thư mục. Và khi cần tách ra service riêng,
  ranh giới đã sẵn ([[ranh-gioi-service]]).
```

**Mỗi module có một cửa vào:**

```ts
// don-hang/index.ts — cửa CÔNG KHAI duy nhất
export { donHangService } from './service'
export type { Don, TaoDon } from './schema'
// KHÔNG export repo — đó là nội bộ

// san-pham/service.ts
import { donHangService } from '../don-hang'        // ✅ qua cửa
import { donHangRepo } from '../don-hang/repo'      // ❌ thò tay vào ruột
```

```text
Vì sao quan trọng: nếu module khác gọi thẳng repo của bạn,
bạn KHÔNG đổi được repo mà không làm hỏng họ.
Ranh giới biến mất, và nó biến mất âm thầm.
```

**Giữ ranh giới bằng công cụ, không bằng lời nhắc:**

```js
// eslint.config.js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['*/*/repo', '*/*/service'],
        message: 'Import qua index.ts của module, đừng chạm vào ruột.',
      }],
    }],
  },
}
```

```text
Đây là điểm mấu chốt của cả bài:
  Quy ước trong tài liệu   → bị vi phạm, và không ai biết lúc nào
  Quy tắc trong linter     → CI đỏ, sửa ngay, không cần ai nhắc

Cùng nguyên lý với việc để máy giữ chuẩn định dạng thay vì
tranh luận trong review ([[review-code-va-nang-nguoi]]).
```

## Cú pháp

**Đảo ngược phụ thuộc — và khi nào nó là quá đà:**

```ts
// ❌ Service dính chặt vào một nhà cung cấp cụ thể
import { SendGrid } from 'sendgrid'
class DonHangService {
  async tao(dl) { await new SendGrid(KEY).send(...) }   // không test được nếu không gọi mạng
}

// ✅ Service phụ thuộc vào MỘT KHÁI NIỆM, không vào nhà cung cấp
interface GuiMail { gui(toi: string, chuDe: string, than: string): Promise<void> }
class DonHangService {
  constructor(private mail: GuiMail) {}
  async tao(dl) { await this.mail.gui(...) }
}
// Test: truyền vào một bản giả. Đổi nhà cung cấp: một chỗ.
```

```text
Nhưng ĐỪNG trừu tượng hoá mọi thứ:

Đáng tách:  thứ có thể ĐỔI (nhà cung cấp mail, thanh toán, lưu trữ)
            thứ khó test (mạng, thời gian, ngẫu nhiên, hệ thống file)

Không đáng: repository của chính bạn — nó đã là một lớp trừu tượng rồi
            hàm tiện ích thuần
            thư viện gần như không bao giờ đổi (lodash, date-fns)

Một interface chỉ có MỘT bản cài đặt và sẽ mãi như vậy
là một file phải đọc thêm mà không đổi lại gì.
```

**Phụ thuộc vòng tròn — dấu hiệu ranh giới sai:**

```text
don-hang → san-pham → don-hang

Triệu chứng: import trả về `undefined` lúc chạy, tuỳ thứ tự nạp module.
Và nó xuất hiện ngẫu nhiên khi bạn thêm một import không liên quan.

Ba cách xử lý:
  ① Tách phần dùng chung ra module thứ ba
  ② Đảo một chiều: dùng sự kiện thay vì gọi trực tiếp
  ③ Xem lại ranh giới — hai module cần nhau hai chiều
     thường thực chất là MỘT module
```

Cách ③ đáng cân nhắc trước hai cách kia: phụ thuộc vòng tròn thường là **triệu chứng**, không phải bệnh.

**`dependencies` và `devDependencies`:** thứ cần lúc **chạy** vào `dependencies`; thứ chỉ cần lúc **build/test** vào `devDependencies`. Đặt nhầm khiến `npm ci --omit=dev` trong image production thiếu gói — và lỗi chỉ lộ ra ở production ([[viet-dockerfile]]).

## Tại sao cần nó

Vì chi phí của cấu trúc tồi tăng dần và không có thời điểm nào "đáng để dừng lại sửa":

```text
Tháng 1:  15 file, để đâu cũng được
Tháng 6:  200 file, "hàm này ở đâu nhỉ?"
Tháng 12: 800 file, mọi thứ import mọi thứ,
          đổi một dòng làm hỏng ba chỗ không liên quan
```

**Ba câu hỏi kiểm tra cấu trúc:**

```text
① Người mới cần bao lâu để tìm ra chỗ sửa một tính năng?
② Một thay đổi điển hình chạm mấy thư mục?
③ Xoá một module thì bao nhiêu chỗ khác hỏng?
```

Câu ③ là phép thử ranh giới tốt nhất: nếu xoá module `khuyen-mai` làm hỏng mười chỗ ở bảy module khác, thì nó chưa bao giờ là một module — nó chỉ là một thư mục.

**Và một lưu ý về việc chia nhỏ:** module quá nhỏ cũng có giá. Bảy file mỗi file 20 dòng, phải mở cả bảy mới hiểu một luồng, là tệ hơn một file 140 dòng đọc từ trên xuống. Chia khi có **lý do** — nhiều người cùng sửa, nhiều nơi dùng lại, hoặc phần đó thay đổi theo nhịp khác.

## So sánh

| | Theo tầng | Theo tính năng |
|---|---|---|
| Một thay đổi chạm | nhiều thư mục | một |
| Tìm code | theo loại | theo nghiệp vụ |
| Tách service sau này | khó | ranh giới sẵn có |
| Hợp với | dự án rất nhỏ | mọi thứ lớn hơn thế |

## Dễ nhầm

**1. Chia theo tầng ở dự án lớn.** Mỗi thay đổi rải khắp nơi.

**2. Không có cửa vào cho module.** Ai cũng chạm vào ruột.

**3. Chỉ ghi quy ước trong tài liệu.** Sẽ bị vi phạm.

**4. Trừu tượng hoá mọi thứ.** Interface một bản cài đặt là chi phí thuần.

**5. Không tách thứ gọi ra ngoài.** Test phải gọi mạng thật.

**6. Bỏ qua phụ thuộc vòng tròn.** Lỗi `undefined` lúc chạy, xuất hiện ngẫu nhiên.

**7. Sửa vòng tròn bằng import động** thay vì xem lại ranh giới.

**8. Thư mục `utils/` khổng lồ.** Chỗ chứa mọi thứ không ai muốn đặt tên.

**9. Đặt nhầm `dependencies`/`devDependencies`.** Lỗi lộ ra ở production.

**10. Chia module quá nhỏ.** Bảy file cho một luồng.

## Mẹo nhớ

> **Chia theo TÍNH NĂNG, không theo tầng — công việc đến theo tính năng.**
>
> **Mỗi module một cửa vào; ranh giới do LINTER giữ, không do trí nhớ.**
>
> **Chỉ trừu tượng hoá thứ có thể ĐỔI hoặc khó TEST.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Chia theo tầng và theo tính năng khác nhau thế nào khi thêm một trường?
2. Vì sao mỗi module cần một cửa vào?
3. Vì sao quy ước phải do công cụ giữ?
4. Khi nào đáng đảo ngược phụ thuộc, khi nào là quá đà?
5. Ba câu hỏi kiểm tra chất lượng cấu trúc?

## Tự viết lại

Không nhìn lại, thiết kế cấu trúc cho một API thương mại điện tử: sản phẩm, đơn hàng, thanh toán, người dùng, thông báo.

```text
① cây thư mục
② cửa vào của mỗi module
③ quy tắc linter giữ ranh giới
④ chỗ nào cần trừu tượng hoá, chỗ nào không
```

Tự kiểm: module `thanh-toan` của bạn có phụ thuộc hai chiều với `don-hang` không — nếu có, bạn cắt nó thế nào?

## Thử sức

Dự án 6 tháng tuổi: `utils/` có 40 file, có phụ thuộc vòng tròn, và người mới mất hai ngày mới tìm ra chỗ sửa một tính năng nhỏ.

Ba câu để trả lời: bạn tái cấu trúc theo thứ tự nào và vì sao thứ tự đó; bạn tránh làm hỏng gì trong lúc di chuyển; và bạn ngăn nó quay lại bằng cách nào. Câu khó nhất: `utils/` 40 file thường là triệu chứng của điều gì — và đổi tên nó thành `shared/` giải quyết được bao nhiêu phần vấn đề?
