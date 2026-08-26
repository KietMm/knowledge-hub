---
title: Review mã do AI sinh
slug: review-ma-do-ai-sinh
summary: Mã do AI viết hỏng theo những kiểu riêng — sáu chỗ cần nhìn trước, và vì sao test xanh không đủ.
level: trung-cap
tags: [ai, lap-trinh-cung-ai, code-review, chat-luong, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** biết sáu chỗ mã do AI sinh hay sai, và vì sao "chạy được, test xanh" không phải điều kiện đủ.

## Ý tưởng chính

Mã do AI sinh thường **chạy được** và **trông đúng**. Nó hỏng theo những kiểu khác với mã người viết — và vì thế cần một cách review khác.

Người viết mã sai ở chỗ họ chưa nghĩ tới. AI sai ở chỗ nó **không có thông tin**, nhưng vẫn phải đưa ra một đáp án.

## Mental model

Hãy nghĩ tới **một bản dịch rất trôi chảy**.

> Bản dịch của người mới học ngoại ngữ: câu cú lủng củng, bạn thấy ngay chỗ sai.
>
> Bản dịch của một máy dịch tốt: **trôi chảy, đọc rất thuận**. Và chính vì trôi chảy, bạn không dừng lại ở chỗ nó dịch sai một thuật ngữ chuyên ngành — vì câu đó nghe hoàn toàn bình thường.
>
> Người biên tập bản dịch máy không tìm câu lủng củng. Họ **kiểm những chỗ cần biết bối cảnh**: tên riêng, thuật ngữ, con số, và những chỗ nguyên bản có ẩn ý.

Review mã AI cũng vậy: đừng tìm mã xấu. Tìm những chỗ **cần biết ngữ cảnh mà mô hình không có**.

## Ví dụ nhỏ

```ts
// Chạy được, test xanh, và thiếu một thứ quan trọng
app.patch('/don-hang/:id', async (req, res) => {
  const don = await db.donHang.update({
    where: { id: req.params.id },      // ← không kiểm ai được sửa
    data: req.body,                     // ← không xác thực, gán đè mọi trường
  })
  res.json(don)
})
```

## Code chạy thế nào

**Sáu chỗ mã do AI sinh hay thiếu:**

```text
① PHÂN QUYỀN THEO BẢN GHI
   Nó kiểm "đã đăng nhập chưa", ít khi kiểm "có phải của bạn không".
   ⇒ Đây là lỗ hổng phổ biến nhất, và test chức năng KHÔNG bắt được
     ([[phan-quyen-theo-ban-ghi]]).

② GIỚI HẠN VÀ XÁC THỰC ĐẦU VÀO
   `limit` không có trần, `req.body` gán thẳng vào update.
   ⇒ Không lỗi gì cả — cho tới khi ai đó gửi `?limit=999999`
     hoặc thêm `{ vaiTro: 'admin' }`.

③ XỬ LÝ LỖI VÀ CA BIÊN
   Giả định mọi thứ tồn tại: mảng không rỗng, bản ghi tìm thấy,
   API ngoài trả về đúng.

④ RANH GIỚI TRANSACTION
   Nhiều thao tác ghi liên quan nhưng không nằm trong một transaction.
   ⇒ Hỏng giữa chừng để lại dữ liệu nửa vời.

⑤ N+1 QUERY
   Vòng lặp gọi CSDL từng bản ghi. Chạy đúng, chậm ở dữ liệu thật
   ([[hieu-nang-va-do-luong]]).

⑥ PHÙ HỢP VỚI DỰ ÁN
   Dùng thư viện khác, phong cách khác, hoặc viết lại một tiện ích
   đã có sẵn trong repo.
```

**Vì sao test xanh không đủ:**

```text
Cả sáu loại lỗi trên đều KHÔNG làm test đỏ:
  □ Thiếu phân quyền  → test chức năng dùng đúng người có quyền
  □ Thiếu giới hạn    → test dùng giá trị hợp lệ
  □ Ca biên           → test không có ca đó
  □ Transaction       → test không mô phỏng lỗi giữa chừng
  □ N+1              → test có 3 bản ghi, không phải 10.000
  □ Trùng lặp        → không có test nào kiểm "đã có sẵn chưa"

⇒ "Chạy được, test xanh" là điều kiện CẦN, không phải ĐỦ.
```

Đây là điểm khiến review mã AI cần một danh sách kiểm cố định: sáu loại lỗi này **lặp lại**, nên chúng kiểm được có hệ thống.

## Cú pháp

**Danh sách kiểm — theo thứ tự:**

```text
□ Phân quyền: ai được gọi cái này, trên bản ghi nào?
□ Đầu vào: có schema chưa? mọi số có trần chưa? có `.strict()` chưa?
□ Ca biên: rỗng, null, số 0, giá trị rất lớn, ký tự lạ?
□ Transaction: các thao tác ghi liên quan có cùng một transaction?
□ Truy vấn: có vòng lặp nào gọi CSDL? có index cho truy vấn mới?
□ Trùng lặp: repo đã có hàm này chưa?
□ Thư viện: mới thêm cái nào? có thật không? có cần không?
□ Bí mật: có giá trị nào hardcode?
```

**Ba câu hỏi cho người mở PR:**

```text
① "Giải thích cho tôi dòng này làm gì và vì sao cần."
   ⇒ Không giải thích được ⇒ chưa đọc hiểu ⇒ chưa nên merge.

② "Ca nào làm nó hỏng?"
   ⇒ Buộc nghĩ về ca biên, thay vì tin vào test có sẵn.

③ "Vì sao chọn cách này thay vì cách kia?"
   ⇒ Phân biệt "tôi đã cân nhắc" với "AI đưa ra thế".
```

Ba câu này không phải để bắt lỗi người viết. Chúng là cách chuyển trách nhiệm về đúng chỗ: **người merge chịu trách nhiệm cho mã đó**, bất kể ai gõ ra.

**Quy ước nên có trong đội:**

```text
□ Không merge mã mình không giải thích được
□ Thêm thư viện mới ⇒ nói rõ trong PR, và có người thứ hai xác nhận
□ PR lớn ⇒ chia nhỏ, kể cả khi "AI viết một lần là xong"
□ Mã do AI sinh cho phần NHẠY CẢM (xác thực, thanh toán, phân quyền)
  ⇒ review kỹ hơn, và tốt hơn là tự viết
```

Điểm cuối đáng cân nhắc: không phải vì AI viết kém ở đó, mà vì **hậu quả của một lỗi bị bỏ sót** ở những phần đó cao hơn hẳn.

**Và một lỗi review đặc thù: mã hay hơn cần thiết.**

```text
Mô hình có xu hướng đưa ra giải pháp "đầy đủ":
  thêm cache khi chưa cần
  thêm interface cho một cài đặt
  thêm cấu hình cho thứ không ai đổi
  xử lý những ca không tồn tại trong nghiệp vụ của bạn

⇒ Nó không sai, nhưng nó là mã phải bảo trì.
⇒ Câu hỏi review: "phần này giải quyết vấn đề nào chúng ta ĐANG CÓ?"
  ([[kien-truc-la-gi-va-khi-nao-can]])
```

## Tại sao cần nó

Vì tốc độ sinh mã tăng làm **review trở thành điểm nghẽn** — và cũng là lớp phòng thủ duy nhất còn lại:

```text
Trước: viết chậm, và người viết hiểu từng dòng khi viết.
Nay:   sinh nhanh, và người viết có thể chưa hiểu hết.

⇒ Trọng tâm chất lượng dịch từ "lúc viết" sang "lúc review".
⇒ Nếu review vẫn làm như cũ, chất lượng giảm — dù mã trông đẹp hơn.
```

**Ba thứ giúp review đỡ nặng:**

```text
① PR NHỎ — quy tắc cũ, nay quan trọng hơn
   500 dòng do AI sinh khó review hơn 500 dòng người viết,
   vì không ai đã "sống cùng" nó.

② TỰ ĐỘNG HOÁ những gì máy kiểm được
   linter, typecheck strict, quét phụ thuộc, kiểm test phủ định
   ⇒ Để người tập trung vào phân quyền, ca biên, và thiết kế
     ([[kiem-thu-va-danh-gia-bao-mat]]).

③ TEST PHỦ ĐỊNH LÀ BẮT BUỘC
   Mỗi endpoint mới: test cho vai "người lạ" và "chưa đăng nhập".
   ⇒ Đây là cách duy nhất bắt được lỗi ① một cách hệ thống.
```

## So sánh

| | Mã người viết | Mã AI sinh |
|---|---|---|
| Kiểu lỗi | chỗ chưa nghĩ tới | chỗ thiếu ngữ cảnh |
| Trông ra sao | đôi khi lủng củng | trôi chảy, thuyết phục |
| Người viết hiểu | ✅ | không chắc |
| Xu hướng | thiếu | **thừa** (quá đầy đủ) |
| Bắt lỗi bằng | đọc logic | danh sách kiểm cố định |

## Dễ nhầm

**1. Coi "test xanh" là đủ.** Sáu loại lỗi trên không làm test đỏ.

**2. Không kiểm phân quyền theo bản ghi.**

**3. Gán `req.body` thẳng vào update.**

**4. Bỏ qua N+1.** Chạy đúng với dữ liệu test.

**5. Không hỏi người viết giải thích.**

**6. Merge mã không hiểu.**

**7. Không kiểm thư viện mới thêm.**

**8. Bỏ qua mã "hay hơn cần thiết".** Nó vẫn phải bảo trì.

**9. Review PR 800 dòng như PR 80 dòng.**

**10. Không có test phủ định cho endpoint mới.**

## Mẹo nhớ

> **Đừng tìm mã xấu. Tìm chỗ CẦN NGỮ CẢNH mà mô hình không có.**
>
> **"Chạy được, test xanh" là điều kiện CẦN, không phải ĐỦ.**
>
> **Không giải thích được thì không merge — bất kể ai gõ ra nó.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Sáu chỗ mã AI sinh hay thiếu?
2. Vì sao cả sáu đều không làm test đỏ?
3. Ba câu hỏi cho người mở PR?
4. "Mã hay hơn cần thiết" là gì, và câu hỏi review nào bắt được nó?
5. Ba thứ giúp review đỡ nặng?

## Tự viết lại

Không nhìn lại, review đoạn mã ở phần "Ví dụ nhỏ" đầu bài:

```text
① liệt kê mọi vấn đề bạn thấy
② với mỗi cái, hậu quả cụ thể
③ viết lại cho đúng
④ hai test bạn thêm vào
```

Tự kiểm: hai test ở ④ của bạn có ít nhất một test **phủ định** không?

## Thử sức

Đội bạn tăng tốc độ giao tính năng gấp đôi sau khi dùng trợ lý AI. Nhưng ba tháng sau: số sự cố production tăng gấp ba, phần lớn là lỗi phân quyền và ca biên.

Ba câu để trả lời: chuyện gì đã xảy ra ở mức quy trình; ba thay đổi cụ thể theo thứ tự ưu tiên; và bạn đo xem có hiệu quả bằng chỉ số nào. Câu khó nhất: nếu đề xuất của bạn làm tốc độ giao tính năng giảm lại, bạn trình bày điều đó với sếp thế nào — và con số nào làm cho nó thành một phép tính chứ không phải một lời xin phép?
