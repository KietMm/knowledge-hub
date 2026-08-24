---
title: Khi các nguyên lý mâu thuẫn nhau
slug: khi-cac-nguyen-ly-mau-thuan
summary: DRY chống lại tách theo lý do thay đổi. YAGNI chống lại mở-đóng. Bài cuối: cách chọn khi hai lời khuyên đúng cùng chỉ ngược hướng.
level: nang-cao
tags: [nen-tang, thiet-ke, danh-doi, yagni, dry]
---

> **Sau bài này bạn sẽ:** biết mọi nguyên lý thiết kế đều là đánh đổi có điều kiện, và có cách quyết định khi hai nguyên lý đúng lại chỉ ngược hướng nhau.

## Vì sao bài này tồn tại

Học xong SOLID, DRY, YAGNI, mẫu thiết kế, người ta thường bước vào một giai đoạn khó chịu: **áp cả bốn cùng lúc thì không được**, vì chúng mâu thuẫn nhau.

Đó không phải vì bạn hiểu sai. Mỗi nguyên lý là câu trả lời cho **một loại đau cụ thể**, và chữa loại đau này thường làm nặng loại kia. Người có kinh nghiệm không phải người thuộc nhiều nguyên lý hơn — mà là người biết **loại đau nào đang có mặt**.

## Mâu thuẫn 1: DRY chống lại "tách theo lý do thay đổi"

- **DRY** nói: thấy code lặp thì gộp.
- **Chữ S của SOLID** nói: tách theo lý do thay đổi.

Hai đoạn code giống hệt nhau nhưng đổi vì hai lý do khác nhau — gộp hay không?

```ts
// Cùng công thức, khác lý do đổi
const thueVat = (t: number) => t * 0.1     // luật thuế đổi
const hoaHong = (t: number) => t * 0.1     // chính sách bán hàng đổi
```

**Chữ S thắng.** DRY vốn không nói về "code trông giống nhau" — bản gốc của nó nói về **tri thức**: *mỗi mẩu tri thức chỉ nên có một biểu diễn duy nhất trong hệ thống*. Hai công thức trên là **hai** mẩu tri thức tình cờ cùng con số.

Câu hỏi quyết định: **"yêu cầu đổi thì hai chỗ này có phải đổi cùng nhau không?"** Không → để riêng, dù trông giống hệt. Chi tiết ở [[truu-tuong-hoa-khi-nao-tach]].

## Mâu thuẫn 2: YAGNI chống lại mở-đóng

- **YAGNI** (*bạn sẽ không cần nó đâu*) nói: đừng xây cho tương lai tưởng tượng.
- **Chữ O** nói: thiết kế sao cho thêm hành vi mới không phải sửa code cũ.

```ts
// Cần một cổng thanh toán. Dựng interface luôn cho "sau này dễ mở rộng"?
interface CongThanhToan { tru(t: number): Promise<KetQua> }
class Momo implements CongThanhToan {}
```

**YAGNI thắng ở mặc định**, vì lý do bất đối xứng: chi phí **thêm** trừu tượng về sau là **thấp** (một lần refactor có test bảo vệ), còn chi phí **gỡ** một trừu tượng sai là **cao** (phải lần mọi chỗ gọi, và thường không ai dám).

Ngoại lệ hợp lý — mở sẵn khi bạn có **bằng chứng**, không phải linh cảm:

- Đã có trong lộ trình quý này
- Đã có bản cài thứ hai (kể cả bản giả cho test)
- Chi phí sửa sau **thật sự** cao (đã lộ ra API công khai, đã có dữ liệu di trú)

Không có bằng chứng nào → viết thẳng, chờ tới lần thứ ba.

## Mâu thuẫn 3: Đóng gói chống lại đơn giản

Đóng gói nói: giấu trạng thái sau các phép hợp lệ. Nhưng:

```ts
// Chỉ chở dữ liệu từ API về màn hình — không có bất biến nào để bảo vệ
type Don = { id: string; tong: number; ngay: Date }
```

Bọc cái này vào class có `private` và getter là **khuôn khổ thuần tuý**. Đóng gói đáng giá khi **có một bất biến để giữ** (số dư không âm, giỏ hàng không quá 50 món). Không có bất biến thì một kiểu dữ liệu trần là đúng.

Quy tắc: **dữ liệu có quy tắc → class; dữ liệu chỉ chở đi → kiểu trần.**

## Mâu thuẫn 4: Ít liên kết chống lại ít gián tiếp

Mỗi interface bạn thêm vào làm liên kết lỏng hơn, và làm code **khó lần hơn một bậc**:

```
Đọc code: DichVuDon → KhoDon (interface) → ??? 
                                            ↑ phải tra ai cài nó
```

Với một bản cài duy nhất, bạn vừa trả một bước nhảy và không mua được gì. Với ba bản cài, bạn mua được thật.

Ngưỡng thực dụng: **tách interface khi có ≥ 2 bản cài thật, hoặc khi cần thay bằng bản giả để test.** Bản giả cho test **có tính** là bản cài thứ hai — đó là lý do tầng dữ liệu thường xứng đáng có interface ngay từ đầu.

## Cách quyết định: hỏi ba câu

Khi hai nguyên lý chỉ ngược hướng, đừng chọn theo nguyên lý nào nổi tiếng hơn. Hỏi:

**① Đâu là trục thay đổi thật của bài toán này?**

Không phải mọi chiều đều cần linh hoạt. App thương mại điện tử thêm cổng thanh toán mới **liên tục** và đổi cấu trúc bảng đơn hàng **hiếm khi**. Vậy mở ở trục thanh toán, đóng cứng ở trục lược đồ. Cùng một app, hai quyết định ngược nhau, cả hai đều đúng.

**② Sửa sai theo hướng nào rẻ hơn?**

| | Thiếu trừu tượng | Thừa trừu tượng |
|---|---|---|
| Triệu chứng | Sửa một tính năng chạm 7 file | 5 tầng gián tiếp cho 1 bản cài |
| Cách sửa | Trích xuất — công cụ làm được | Gỡ, lần mọi chỗ gọi |
| Rủi ro khi sửa | Thấp, có test bảo vệ | Cao, thường không ai dám |

Bảng này giải thích vì sao **nghiêng về ít trừu tượng hơn** là mặc định đúng: sai theo hướng đó rẻ hơn hẳn.

**③ Ai sẽ đọc đoạn này, và bao lâu một lần?**

Code trong vòng lặp nóng ai cũng đọc → ưu tiên hiển nhiên hơn thông minh. Code chạy một lần lúc khởi động → khuôn khổ không đáng.

## Ba nguyên lý ít mâu thuẫn nhất

Có vài thứ gần như luôn đúng, không cần cân đo:

- **Đặt tên tốt.** Không có đánh đổi nào. Xem [[dat-ten-va-code-doc-duoc]].
- **Không sửa thứ mình không sở hữu.** Xem [[ham-dau-vao-dau-ra-va-tac-dung-phu]].
- **Nghiệp vụ không import hạ tầng.** Chữ D — hầu như luôn lời.

Khi phân vân, làm ba thứ này trước rồi hẵng nghĩ tới phần còn lại.

## Sai lầm cuối: coi nguyên lý là mục tiêu

Mục tiêu không phải "code thoả SOLID". Mục tiêu là **thay đổi tiếp theo rẻ và an toàn**.

Nguyên lý là phương tiện, và như mọi phương tiện, chúng có điều kiện áp dụng. Một codebase 200 dòng thoả cả năm chữ SOLID với mười interface đang **tệ hơn** một file 200 dòng viết thẳng — nó khó đọc hơn mà không mua được gì.

Thước đo cuối cùng chỉ có một, và nó đo được: **thêm tính năng điển hình thì chạm mấy file, và bạn có sợ khi sửa không?** Chạm ít và không sợ thì thiết kế đang đúng, bất kể nó có tên gọi nào hay không. Cách biến câu hỏi đó thành hành động là nội dung của [[no-ky-thuat-va-refactor]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Áp DRY cho code chỉ **trông** giống | Buộc hai tri thức khác nhau cùng số phận | Hỏi "có đổi cùng nhau không" |
| Mở sẵn mọi trục "cho dễ mở rộng" | Khuôn khổ gấp ba nghiệp vụ | Chỉ mở khi có bằng chứng |
| Bọc class cho dữ liệu không có bất biến | Khuôn khổ thuần tuý | Kiểu trần là đủ |
| Interface cho một bản cài duy nhất | Thêm một bước nhảy, không mua gì | Chờ bản cài thứ hai |
| Coi "thoả SOLID" là mục tiêu | Kiến trúc phục vụ nguyên lý, không phục vụ người | Mục tiêu là thay đổi tiếp theo rẻ |
| Chọn theo nguyên lý nổi tiếng hơn | Quyết định ngẫu nhiên | Hỏi ba câu: trục nào, sai hướng nào rẻ, ai đọc |
| Sợ gỡ trừu tượng vì "đã lỡ viết" | Nó tiếp tục lan | Gỡ sớm khi còn rẻ |

## Ghi nhớ

- Nguyên lý mâu thuẫn nhau là **bình thường** — mỗi cái chữa một loại đau khác nhau.
- DRY nói về **tri thức**, không nói về code trông giống nhau.
- YAGNI thắng ở mặc định vì **thêm** trừu tượng rẻ hơn **gỡ** trừu tượng.
- Đóng gói đáng giá khi có bất biến để giữ; không có thì kiểu trần là đúng.
- Tách interface khi có ≥2 bản cài — bản giả cho test có tính.
- Mục tiêu không phải thoả nguyên lý, mà là **thay đổi tiếp theo rẻ và an toàn**.

## Tự kiểm tra

1. Hai hàm cùng công thức nhưng khác lý do đổi — DRY hay chữ S thắng, vì sao?
2. Vì sao "nghiêng về ít trừu tượng hơn" là mặc định đúng?
3. Thước đo cuối cùng của một thiết kế tốt là gì?
