---
title: TDD trong thực tế
slug: tdd-trong-thuc-te
summary: Vòng đỏ-xanh-refactor, khi TDD giúp thật, và khi nó chỉ làm chậm bạn.
level: nang-cao
tags: [testing, tdd, quy-trinh]
khung: v2
---

> **Sau bài này bạn sẽ:** chạy được một vòng TDD đầy đủ, và biết khi nào **không** nên dùng nó — điều ít tài liệu nào nói.

## Ý tưởng chính

TDD là vòng ba bước: **viết test đỏ → làm nó xanh → dọn dẹp**.

Nhưng giá trị thật của TDD không nằm ở chỗ "có test". Nó nằm ở chỗ **viết test trước buộc bạn thiết kế từ phía người dùng code** — bạn phải quyết định hàm này gọi thế nào **trước khi** biết nó làm thế nào.

## Mental model

Hãy nghĩ tới **viết đơn đặt hàng trước khi vào xưởng**.

> Cách thông thường: vào xưởng, làm ra một cái ghế, rồi mô tả nó cho khách.
>
> TDD: **viết đơn đặt hàng trước** — *"ghế cao 45cm, chịu 100kg, gấp lại được"* — rồi mới vào xưởng làm cho vừa đơn.
>
> Đơn hàng viết trước buộc bạn nghĩ từ phía **người ngồi**, không phải từ phía **cái máy tiện bạn đang có**.

Đó là lý do code viết theo TDD thường dễ dùng hơn: giao diện của nó được thiết kế bởi người **dùng** nó, không phải bởi người **cài đặt** nó.

## Ví dụ nhỏ

```text
🔴 ĐỎ     viết test cho hành vi CHƯA có → chạy → phải ĐỎ
🟢 XANH   viết code ÍT NHẤT có thể để xanh
🔵 DỌN    cải thiện code, test vẫn xanh
```

Bước "chạy để thấy nó đỏ" nghe thừa nhưng bắt buộc: test không bao giờ đỏ là test **không kiểm gì cả**, và bạn sẽ không phát hiện ra điều đó nếu bỏ qua bước này.

## Code chạy thế nào

Một vòng đầy đủ với bài "tính phí giao hàng":

```ts
// 🔴 ĐỎ — hàm chưa tồn tại
it('phí cơ bản là 30k', () => {
  expect(tinhPhi({ khoangCach: 5 })).toBe(30_000)
})
// → ReferenceError: tinhPhi is not defined  ✅ đỏ đúng như mong đợi
```

```ts
// 🟢 XANH — ít nhất có thể. Đúng, trả về hằng số cũng được.
function tinhPhi(don) { return 30_000 }
```

Trả về hằng số nghe như gian lận, nhưng nó có mục đích: nó chứng minh **test chạy đúng cơ chế**, và nó ép bạn viết ca test tiếp theo để "phá" nó.

```ts
// 🔴 ĐỎ — ca thứ hai buộc code phải thật
it('trên 10km cộng 5k mỗi km', () => {
  expect(tinhPhi({ khoangCach: 12 })).toBe(40_000)
})
```

```ts
// 🟢 XANH
function tinhPhi(don) {
  if (don.khoangCach <= 10) return 30_000
  return 30_000 + (don.khoangCach - 10) * 5_000
}
```

```ts
// 🔵 DỌN — đặt tên cho số ma thuật, test vẫn xanh
const PHI_CO_BAN = 30_000
const NGUONG_KM = 10
const PHI_MOI_KM = 5_000

function tinhPhi(don) {
  const themKm = Math.max(0, don.khoangCach - NGUONG_KM)
  return PHI_CO_BAN + themKm * PHI_MOI_KM
}
```

Chú ý bước 🔵: bạn refactor **với lưới an toàn** — nếu làm hỏng, test đỏ ngay. Đây là chỗ TDD trả lại công sức đã bỏ ra.

## Cú pháp

Nhịp làm việc thực tế, tính bằng phút:

```text
🔴 1-2 phút   viết một test nhỏ, chạy, thấy đỏ
🟢 2-5 phút   làm xanh bằng cách đơn giản nhất
🔵 0-5 phút   dọn dẹp nếu cần
──────────────
lặp lại
```

Một vòng **không nên quá 10 phút**. Vòng dài nghĩa là bước bạn chọn quá lớn — chia nhỏ hơn.

## Tại sao cần nó

Vì TDD **giúp thật** ở ba tình huống cụ thể, và **không giúp** ở những tình huống khác:

```text
✅ TDD giúp rõ nhất
   · Logic nghiệp vụ phức tạp, nhiều quy tắc và ca biên
     (tính giá, tính thuế, quy tắc trạng thái, phân quyền)
   · Sửa bug — viết test tái hiện bug TRƯỚC, rồi mới sửa
   · Refactor code cũ — bọc test quanh hành vi hiện tại rồi mới đụng vào

❌ TDD cản trở
   · Đang khám phá, chưa biết mình muốn gì (viết nháp trước, test sau)
   · Giao diện, bố cục — nhìn bằng mắt nhanh hơn
   · Script chạy một lần rồi bỏ
   · Code chỉ chuyển tiếp, không có quyết định nào
```

Tình huống "sửa bug" là chỗ TDD có lãi nhất và ai cũng áp dụng được ngay:

```text
① Viết test tái hiện bug           → đỏ (chứng minh bạn hiểu đúng bug)
② Sửa code                          → xanh
③ Test đó ở lại mãi mãi             → bug không quay lại lần thứ hai
```

Bước ① quan trọng hơn vẻ ngoài: rất nhiều lần bạn sẽ phát hiện mình **hiểu sai bug** ngay ở bước này, trước khi tốn một giờ sửa nhầm chỗ.

## So sánh

**Vì sao viết test trước ra thiết kế khác** — đây là lập luận cốt lõi, không phải chuyện niềm tin:

```ts
// Viết code trước: bạn nghĩ từ phía CÀI ĐẶT
class DichVuDon {
  constructor() {
    this.db = new PostgresClient()          // ← tự tạo phụ thuộc bên trong
    this.mail = new SendGridClient()
  }
}
// Khi viết test: bạn phát hiện không mock nổi, phải sửa lại thiết kế
```

```ts
// Viết test trước: bạn nghĩ từ phía NGƯỜI GỌI
it('gửi mail sau khi tạo đơn', async () => {
  const mail = { gui: vi.fn() }
  await taoDon(donMau, { db: dbGia, mail })     // ← chữ ký này bạn TỰ CHỌN
  expect(mail.gui).toHaveBeenCalled()
})
// Thiết kế "tiêm phụ thuộc" xuất hiện tự nhiên, không phải do bạn nhớ nguyên lý
```

TDD không dạy bạn nguyên lý thiết kế — nó **buộc bạn dùng chúng**, vì code khó test là code bạn không viết xong được. Cùng ý với [[test-double-stub-mock-fake]].

## Dễ nhầm

**1. Bỏ qua bước "thấy nó đỏ".** Test không bao giờ đỏ là test không kiểm gì. Bạn chỉ phát hiện điều đó vào lúc production hỏng mà test vẫn xanh.

**2. Viết test quá lớn.** Test kiểm 5 hành vi cùng lúc thì bạn phải viết cả module mới làm nó xanh — và mất hẳn nhịp đỏ-xanh nhanh.

**3. Bỏ bước refactor.** Đây là bước hay bị bỏ nhất, và bỏ nó thì bạn chỉ còn "viết test trước" chứ không phải TDD. Code tích tụ nợ dần dần.

**4. TDD cho mọi thứ.** Áp dụng máy móc lên code giao diện hoặc script dùng một lần là tự làm chậm mình.

**5. Sửa test cho khớp code khi test đỏ.** Nếu test viết đúng ý định, **code sai chứ không phải test sai**. Dừng lại và hỏi lại ý định trước khi sửa test.

**6. Test trước khi đã hiểu bài toán.** TDD không thay được việc suy nghĩ. Bí quá thì viết nháp trước cho hiểu, xoá đi, rồi làm lại bằng TDD.

## Mẹo nhớ

> **Viết đơn đặt hàng trước khi vào xưởng.**
>
> **Đỏ → Xanh → Dọn. Một vòng dưới 10 phút.**
>
> **Sửa bug: test tái hiện TRƯỚC, sửa SAU.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba bước của TDD, và bước nào hay bị bỏ nhất?
2. Vì sao bắt buộc phải chạy để **thấy test đỏ**?
3. Vì sao viết test trước dẫn tới thiết kế khác — nêu cơ chế, không nêu niềm tin?
4. Ba tình huống TDD giúp rõ nhất?
5. Khi test đỏ, khi nào bạn được phép sửa test?

## Tự viết lại

Không nhìn lại phần trên, chạy một vòng TDD đầy đủ trên giấy cho yêu cầu:

```text
Hàm kiemTraMatKhau(mk) trả về danh sách lỗi:
- ngắn hơn 8 ký tự
- không có chữ số
- không có chữ hoa
- trùng với 100 mật khẩu phổ biến
```

Viết ra **ba vòng đầu tiên**: test nào trước, code tối thiểu nào, và bạn dọn dẹp gì ở vòng thứ ba?

## Thử sức

Bạn nhận một module 800 dòng, không có test nào, và cần sửa một bug bên trong. Sếp cho hai ngày.

Bạn **không** đủ thời gian viết test cho cả module. Lập kế hoạch: bạn viết test cho **phần nào**, theo tiêu chí gì, và làm sao để chắc rằng phần bạn không test vẫn không bị bạn làm hỏng? Gợi ý: có một kỹ thuật tên là "characterization test" — hãy tự suy ra nó làm gì từ chính cái tên.
