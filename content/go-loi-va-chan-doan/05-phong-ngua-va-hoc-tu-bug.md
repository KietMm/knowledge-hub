---
title: Phòng ngừa và học từ bug
slug: phong-ngua-va-hoc-tu-bug
summary: Sửa một bug là xong một việc; sửa cả lớp bug là xong nhiều việc — cách biến từng bug thành một cải tiến hệ thống.
level: nang-cao
tags: [go-loi, chat-luong, phuong-phap, tu-duy]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bốn mức sửa một bug, và chọn được mức đúng theo mức độ nghiêm trọng.

## Ý tưởng chính

Sau khi tìm ra nguyên nhân, có bốn mức can thiệp — và mặc định của mọi người là dừng ở mức thấp nhất:

**Sửa trường hợp này** → **Sửa cả lớp bug tương tự** → **Làm cho lớp bug đó không viết ra được** → **Sửa quy trình sinh ra nó**.

Mỗi mức đắt hơn mức trước và trả lại nhiều hơn.

## Mental model

Hãy nghĩ tới **một chỗ trơn trong nhà xưởng**.

> **Mức 1**: lau chỗ nước đó. Xong việc hôm nay.
>
> **Mức 2**: đi lau mọi chỗ nước khác trong xưởng.
>
> **Mức 3**: tìm ra cái ống rò và bịt lại — không còn nước để lau.
>
> **Mức 4**: hỏi vì sao ống rò ba tháng mà không ai báo, rồi đặt quy trình kiểm tra định kỳ.
>
> Lau sàn là việc phải làm ngay. Nhưng nếu bạn **chỉ** lau sàn, bạn sẽ lau nó mỗi tuần, mãi mãi.

## Ví dụ nhỏ

```text
Bug: crash vì `don.khachHang` là null.

Mức 1: thêm `?.` ở dòng đó
Mức 2: tìm mọi chỗ khác cũng giả định khách hàng luôn có
Mức 3: đổi kiểu thành `KhachHang | null` để trình biên dịch bắt
Mức 4: hỏi vì sao dữ liệu có đơn không khách hàng — có nên có không?
```

## Code chạy thế nào

**Bốn mức, và mức nào chọn khi nào:**

```text
MỨC 1 — Sửa trường hợp này
  Rẻ nhất, nhanh nhất. Luôn làm.
  Nhưng nếu DỪNG ở đây, bug tương tự sẽ xuất hiện ở chỗ khác.

MỨC 2 — Sửa cả lớp
  "Còn chỗ nào cũng có lỗi này?" → grep, đọc, sửa hết.
  Chi phí: một buổi. Trả lại: một lớp bug không tái xuất hiện.

MỨC 3 — Làm cho nó KHÔNG VIẾT RA ĐƯỢC
  Kiểu dữ liệu chặt hơn, quy tắc linter, ràng buộc CSDL, API khó dùng sai.
  Chi phí: cao hơn. Trả lại: vĩnh viễn, và áp dụng cho người sau.

MỨC 4 — Sửa quy trình
  Vì sao bug này lọt qua review, test, và staging?
  Chi phí: cao nhất. Chỉ làm cho bug NGHIÊM TRỌNG.
```

**Chọn mức theo mức độ, không theo cảm hứng:**

```text
Bug nhỏ, ít ảnh hưởng            → mức 1, có thể mức 2
Bug ảnh hưởng người dùng         → mức 2, và cân nhắc mức 3
Bug làm mất dữ liệu hoặc mất tiền → mức 3 và mức 4, bắt buộc
Bug lặp lại lần thứ ba            → mức 3, không thương lượng
```

Dòng cuối là một quy tắc đáng đặt ra thành thoả thuận trong đội: **cùng một loại bug xuất hiện lần thứ ba nghĩa là mức 1 và 2 không đủ**.

**Mức 3 cụ thể — bốn cách làm cho bug không viết ra được:**

```ts
// ① KIỂU DỮ LIỆU: chuyển lỗi từ runtime sang biên dịch
type Don = { khachHang: KhachHang | null }   // trình biên dịch BẮT bạn xử lý

// ② KIỂU PHÂN BIỆT: trạng thái không hợp lệ không biểu diễn được
type KetQua =
  | { trangThai: 'dang-cho' }
  | { trangThai: 'xong'; duLieu: Don }        // duLieu chỉ tồn tại khi xong
  | { trangThai: 'loi'; loi: string }
// ⇒ Không thể viết được `{ trangThai: 'dang-cho', duLieu: ... }`

// ③ RÀNG BUỘC CSDL: lưới cuối, không ai vượt qua được
// ALTER TABLE tai_khoan ADD CONSTRAINT so_du_khong_am CHECK (so_du >= 0)

// ④ API KHÓ DÙNG SAI
// ❌ chuyenTien(a, b, 100)        — a và b thứ tự nào?
// ✅ chuyenTien({ tu: a, den: b, soTien: 100 })
```

Cách ② mạnh nhất và ít được dùng nhất: nó không "kiểm tra" trạng thái sai — nó làm cho trạng thái sai **không tồn tại trong kiểu** ([[thu-hep-kieu-va-unknown]]).

## Cú pháp

**Mỗi bug nên để lại một test:**

```ts
// Test viết TỪ bug, không phải từ yêu cầu
it('không crash khi đơn không có khách hàng (bug #1234)', () => {
  expect(() => tinhTong({ khachHang: null, dong: [] })).not.toThrow()
})
```

```text
Vì sao đáng làm dù bug đã sửa:
  ① Chứng minh bạn đã sửa THẬT — không phải "trông như đã hết"
  ② Bug không quay lại sau một lần refactor
  ③ Test đó mô tả một ca biên THẬT, thứ bạn không nghĩ ra khi
     viết test từ yêu cầu

Và trình tự đúng: viết test cho bug TRƯỚC khi sửa.
Test đỏ ⇒ bạn đã tái hiện đúng. Test xanh sau khi sửa ⇒ đã sửa đúng chỗ.
```

**Câu hỏi mức 4 — hỏi cho hệ thống, không cho người:**

```text
① Vì sao bug này lọt qua REVIEW?
   → thiếu checklist? PR quá lớn để đọc kỹ? người review thiếu ngữ cảnh?

② Vì sao TEST không bắt được?
   → thiếu ca biên? thiếu test cho vai "người lạ"? test chỉ ca thuận?

③ Vì sao STAGING không phát hiện?
   → dữ liệu quá sạch? tải quá nhẹ? cấu hình khác production?

④ Vì sao mất LÂU mới phát hiện ở production?
   → thiếu cảnh báo? thiếu metric nghiệp vụ? log không đủ?

Cả bốn đều nhắm vào hệ thống. "Ai đó cẩu thả" không phải câu trả lời
dùng được ([[su-co-va-hau-kiem]]).
```

**Tìm mẫu qua nhiều bug — việc nên làm mỗi quý:**

```text
Đọc lại 20–30 bug gần nhất và phân loại. Thường lộ ra:
  □ 40% là null/undefined         → siết kiểu, bật strictNullChecks
  □ 25% là ca biên chưa nghĩ tới  → thêm bước liệt kê ca biên khi review
  □ 15% là race condition         → xem lại các chỗ đọc-sửa-ghi
  □ 10% là cấu hình sai            → xác thực cấu hình lúc khởi động

Nhìn từng bug: mỗi cái là một sự cố riêng lẻ.
Nhìn 30 bug: lộ ra 3–4 nguyên nhân hệ thống.
⇒ Sửa nguyên nhân hệ thống rẻ hơn nhiều so với sửa 30 bug tiếp theo.
```

## Tại sao cần nó

Vì áp lực luôn đẩy về mức 1, và đó là lựa chọn đúng **trong ngắn hạn**:

```text
Sửa mức 1:  15 phút. Ticket đóng. Sếp hài lòng.
Sửa mức 3:  nửa ngày. Ticket vẫn đóng. Không ai thấy khác biệt.

Nhưng sáu tháng sau:
  Chỉ mức 1  → bug tương tự xuất hiện ở 8 chỗ khác, mỗi cái 15 phút
               cộng thời gian điều tra, cộng ảnh hưởng người dùng
  Có mức 3   → 0 chỗ
```

**Cách nói về việc này với người quyết định:**

```text
❌ "Cần thời gian để refactor cho sạch"
✅ "Bug này đã xuất hiện lần thứ ba, mỗi lần tốn khoảng nửa ngày
    điều tra cộng một sự cố nhỏ với người dùng. Một ngày để siết
    kiểu dữ liệu sẽ chặn hẳn cả nhóm này."
```

Nói bằng **số lần đã xảy ra và chi phí mỗi lần** thì đây là một phép tính, không phải một mong muốn ([[no-ky-thuat-va-refactor]]).

## So sánh

| Mức | Chi phí | Phạm vi bảo vệ | Khi nào |
|---|---|---|---|
| 1 — sửa ca này | 15 phút | một chỗ | luôn |
| 2 — sửa cả lớp | vài giờ | mọi chỗ hiện có | bug ảnh hưởng người dùng |
| 3 — không viết ra được | nửa ngày | vĩnh viễn, cả người sau | bug nghiêm trọng, hoặc lần thứ ba |
| 4 — sửa quy trình | ngày | mọi lớp bug tương lai | mất dữ liệu, mất tiền |

## Dễ nhầm

**1. Luôn dừng ở mức 1.** Bug tương tự xuất hiện ở chỗ khác.

**2. Không hỏi "còn chỗ nào nữa".**

**3. Sửa xong không viết test.** Không chứng minh được đã sửa.

**4. Viết test sau khi sửa.** Không biết test có thật sự bắt được bug.

**5. Không hỏi vì sao review và test không bắt được.**

**6. Hỏi mức 4 nhắm vào người.** Người ta sẽ giấu bug lần sau.

**7. Nhảy lên mức 4 cho mọi bug nhỏ.** Quá đà, và làm mất uy tín của quy trình.

**8. Không bao giờ đọc lại các bug cũ theo nhóm.** Bỏ mất nguyên nhân hệ thống.

**9. Trình bày mức 3 như "muốn refactor".** Nói bằng số lần và chi phí.

**10. Không có quy tắc cho bug lặp lại.** Nó sẽ lặp lần thứ tư.

## Mẹo nhớ

> **Bốn mức: sửa ca này → sửa cả lớp → làm cho không viết ra được → sửa quy trình.**
>
> **Bug lặp lần thứ ba ⇒ mức 3, không thương lượng.**
>
> **Viết test cho bug TRƯỚC khi sửa — test đỏ chứng minh bạn tái hiện đúng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn mức sửa bug, chi phí và phạm vi của mỗi mức?
2. Chọn mức theo tiêu chí gì?
3. Bốn cách làm cho một lớp bug không viết ra được?
4. Vì sao viết test trước khi sửa?
5. Bốn câu hỏi mức 4, và vì sao chúng nhắm vào hệ thống?

## Tự viết lại

Bug: *"Gửi email cho người dùng đã xoá tài khoản, gây lỗi."* Bạn vừa sửa bằng cách thêm một `if`.

Không nhìn lại, viết:

```text
① mức 2: còn chỗ nào cũng giả định người dùng luôn tồn tại
② mức 3: làm cho lỗi này không viết ra được
③ test cho bug này
④ bốn câu hỏi mức 4 và câu trả lời của bạn
```

Tự kiểm: giải pháp mức 3 của bạn có bảo vệ được **mã người khác viết sáu tháng sau** không, hay chỉ bảo vệ chỗ hiện tại?

## Thử sức

Ba tháng qua, đội bạn có 6 sự cố production, và **tất cả** đều là `undefined`/`null` ở một chỗ không lường trước.

Ba câu để trả lời: đây là mức mấy, và bạn đề xuất gì cụ thể; bạn thuyết phục đội và sếp bằng lập luận nào; và bạn đo xem biện pháp có hiệu quả bằng chỉ số gì. Câu khó nhất: nếu bật `strictNullChecks` cho một codebase 100.000 dòng sinh ra 2.000 lỗi biên dịch, bạn triển khai theo cách nào để không đóng băng cả đội trong hai tuần?
