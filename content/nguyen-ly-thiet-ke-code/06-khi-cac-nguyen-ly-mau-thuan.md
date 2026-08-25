---
title: Khi các nguyên lý mâu thuẫn nhau
slug: khi-cac-nguyen-ly-mau-thuan
summary: "DRY chống lại tách theo lý do thay đổi. YAGNI chống lại mở-đóng. Bài cuối: cách chọn khi hai lời khuyên đúng cùng chỉ ngược hướng."
level: nang-cao
tags: [nen-tang, thiet-ke, danh-doi, yagni, dry]
khung: v2
---

> **Sau bài này bạn sẽ:** có ba câu hỏi để quyết định khi hai nguyên lý đúng cùng chỉ ngược hướng, thay vì chọn theo cái mình nhớ gần đây nhất.

## Ý tưởng chính

Sách dạy từng nguyên lý riêng lẻ, nên chúng đều nghe hợp lý. Vấn đề chỉ lộ ra khi bạn ngồi trước một đoạn code thật và **hai nguyên lý cùng đúng lại chỉ ngược hướng nhau**.

Lúc đó không có luật nào cứu bạn. Chỉ có việc **hiểu mỗi nguyên lý đang bảo vệ điều gì**, rồi chọn cái bảo vệ thứ quan trọng hơn trong hoàn cảnh này.

## Mental model

Hãy nghĩ tới **hai người cố vấn giỏi ngồi hai bên vai bạn**.

> Người bên trái: *"Đừng lặp lại — gộp ba chỗ này thành một."*
> Người bên phải: *"Đừng gộp — ba chỗ này sẽ đổi theo ba hướng khác nhau."*
>
> **Cả hai đều đúng.** Họ chỉ đang bảo vệ hai thứ khác nhau: người trái sợ bạn phải sửa ba chỗ, người phải sợ bạn không dám sửa chỗ nào.

Nhiệm vụ của bạn không phải chọn ai giỏi hơn. Là hỏi: **trong bài này, rủi ro nào lớn hơn?**

## Ví dụ nhỏ

```ts
// Ba chỗ, code giống hệt nhau
function tinhGiamGiaHocSinh(gia) { return gia * 0.9 }
function tinhGiamGiaNhanVien(gia) { return gia * 0.9 }
function tinhGiamGiaKhachVip(gia) { return gia * 0.9 }
```

DRY nói: gộp lại. "Tách theo lý do thay đổi" nói: **để yên**.

Ai đúng? Câu trả lời không nằm trong code — nó nằm ở câu hỏi: *"khi công ty đổi mức giảm giá cho học sinh, hai mức kia có đổi theo không?"* Không ⇒ chúng là ba quy tắc nghiệp vụ khác nhau tình cờ cùng bằng 0.9 ⇒ **để yên**.

Gộp lại thành `tinhGiamGia(gia)` thì sáu tháng sau, khi học sinh được giảm 15%, bạn sẽ thêm một tham số `loai`, rồi một `if`, rồi ba `if` — và đoạn code cuối cùng tệ hơn ba dòng ban đầu.

## Tại sao cần nó

Vì bốn cặp mâu thuẫn dưới đây bạn sẽ gặp hằng tuần, và mỗi lần chọn sai đều để lại nợ:

**Mâu thuẫn 1 — DRY chống lại "tách theo lý do thay đổi".** Vừa nói ở trên. Phép thử: *ba chỗ này có đổi cùng nhau không?*

**Mâu thuẫn 2 — YAGNI chống lại mở-đóng.**

```text
YAGNI     →  "Chưa cần thì đừng xây. Viết thẳng cho một cổng thanh toán."
Mở-đóng   →  "Xây sẵn interface để thêm cổng mới khỏi phải sửa."
```

Chọn thế nào: **YAGNI thắng khi bạn chưa biết chắc sẽ có loại thứ hai.** Mở-đóng thắng khi **đã có** loại thứ hai trên bàn — không phải khi bạn tưởng tượng ra nó. Chi phí của đoán sai ở đây rất lệch: xây sẵn cho thứ không tới thì bạn ôm một lớp trừu tượng vô ích *mãi mãi*; còn không xây sẵn thì lúc cần chỉ tốn một buổi refactor.

**Mâu thuẫn 3 — đóng gói chống lại đơn giản.**

```ts
// Đóng gói chặt: an toàn, nhưng viết nhiều
class Diem {
  #x: number; #y: number
  constructor(x, y) { this.#x = x; this.#y = y }
  get x() { return this.#x }
  get y() { return this.#y }
}

// Đơn giản: đọc là hiểu, nhưng ai cũng sửa được
type Diem = { x: number; y: number }
```

Chọn thế nào: **có quy tắc cần bảo vệ thì đóng gói; chỉ là dữ liệu thì để trần.** `Diem` không có quy tắc nào (mọi cặp số đều hợp lệ) ⇒ dùng bản đơn giản. `TaiKhoan` có quy tắc "số dư không âm" ⇒ đóng gói.

**Mâu thuẫn 4 — ít liên kết chống lại ít gián tiếp.** Mỗi lớp trừu tượng thêm vào để giảm liên kết cũng là thêm một chỗ phải nhảy tới khi đọc. Bảy tầng trừu tượng "sạch" có thể khó hiểu hơn một hàm 40 dòng viết thẳng.

## So sánh

Ba câu hỏi để quyết định, hỏi theo đúng thứ tự:

**1. Sai theo hướng nào thì sửa rẻ hơn?**

```text
Gộp sớm rồi phát hiện sai  →  phải gỡ ra, tìm mọi chỗ dùng, rủi ro cao
Để lặp rồi phát hiện nên gộp →  gộp lại, việc cơ học, rủi ro thấp
```

Vì bất đối xứng đó, **khi phân vân thì chọn phương án dễ đảo ngược hơn** — thường là chọn viết thẳng, chưa trừu tượng.

**2. Điều gì thật sự sẽ thay đổi?** Không phải "có thể", mà là *đã có dấu hiệu*: sếp đã nói, đối thủ đã làm, đã có ticket. Thiết kế cho thay đổi có bằng chứng, không thiết kế cho thay đổi tưởng tượng.

**3. Ai đọc code này sau tôi?** Đội junior thì code thẳng, ít tầng, dễ dò. Đội quen kiến trúc thì trừu tượng đúng chỗ lại giúp họ đi nhanh hơn. "Tốt" phụ thuộc người đọc, không phải chỉ phụ thuộc code.

## Dễ nhầm

**1. Coi nguyên lý là mục tiêu.** Không ai trả tiền cho bạn để code "SOLID" hay "DRY". Họ trả tiền để phần mềm **chạy đúng và sửa được**. Nguyên lý là phương tiện — khi phương tiện chống lại mục tiêu, bỏ phương tiện.

**2. Áp dụng nguyên lý mà không nêu được nó bảo vệ điều gì.** Nếu bạn không nói được *"tôi tách chỗ này để tránh chuyện X"*, thì bạn đang làm theo quán tính. Cách kiểm: nói to lý do; nếu nghe như một câu trích sách chứ không phải một rủi ro cụ thể, dừng lại.

**3. Nhớ nguyên lý nào gần đây nhất thì dùng nguyên lý đó.** Vừa đọc bài về DRY thì thấy chỗ nào cũng cần gộp; vừa đọc về YAGNI thì thấy chỗ nào cũng thừa. Ba câu hỏi ở trên tồn tại để thay trí nhớ ngắn hạn bằng dữ kiện.

**4. Quên rằng có ba nguyên lý gần như không mâu thuẫn với gì.** Khi lạc lối, quay về ba cái này:

```text
Đặt tên tốt        →  chưa bao giờ có hại  ([[dat-ten-va-code-doc-duoc]])
Hàm không tác dụng phụ  →  gần như luôn tốt  ([[ham-dau-vao-dau-ra-va-tac-dung-phu]])
Xoá code chết      →  luôn đúng
```

**5. Tưởng quyết định hôm nay là vĩnh viễn.** Thiết kế sai không phải thảm hoạ nếu bạn phát hiện sớm và sửa. Thứ biến nó thành thảm hoạ là **để nguyên và vá thêm** — xem [[no-ky-thuat-va-refactor]].

## Mẹo nhớ

> **Nguyên lý là phương tiện, không phải mục tiêu.**
>
> **Phân vân thì chọn hướng dễ đảo ngược hơn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao DRY và "tách theo lý do thay đổi" có thể mâu thuẫn? Phép thử là gì?
2. Khi nào YAGNI thắng mở-đóng, và ngược lại?
3. Vì sao "chọn hướng dễ đảo ngược hơn" là lời khuyên tốt khi phân vân?
4. Điều gì phân biệt "thay đổi có bằng chứng" với "thay đổi tưởng tượng"?
5. Ba nguyên lý gần như không bao giờ mâu thuẫn với gì?

## Tự viết lại

Không nhìn lại phần trên, quyết định cho từng tình huống và **nêu rõ nguyên lý nào thắng, vì sao**:

```text
a) Ba màn hình cùng có đoạn kiểm tra "đã đăng nhập chưa"
b) Sếp nói "có thể năm sau sẽ hỗ trợ đăng nhập bằng Google"
c) Một class 200 dòng nhưng chỉ có đúng một lý do thay đổi
d) Hàm 15 dòng viết thẳng vs 5 lớp nhỏ "sạch" hơn
```

Tự kiểm: với mỗi câu, bạn dùng câu hỏi nào trong ba câu ở trên?

## Thử sức

Bạn review một pull request. Tác giả gộp bốn hàm gần giống nhau thành một hàm có ba tham số boolean, và ghi trong mô tả: *"áp dụng DRY, giảm 60 dòng code"*.

Số dòng giảm là thật. Hãy nêu **bằng chứng cụ thể** để phản biện (hoặc để đồng ý) — bằng chứng phải nằm trong bản chất nghiệp vụ, không phải trong cảm giác "trông không sạch".
