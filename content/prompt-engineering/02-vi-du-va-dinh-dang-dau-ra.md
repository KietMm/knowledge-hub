---
title: Ví dụ mẫu và định dạng đầu ra
slug: vi-du-va-dinh-dang-dau-ra
summary: Few-shot hiệu quả hơn mô tả dài, và cách nhận JSON dùng được mọi lần.
level: co-ban
tags: [ai, prompt, json, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** dùng ví dụ mẫu đúng cách, và nhận được đầu ra có cấu trúc dùng được mà không phải vá bằng regex.

## Ý tưởng chính

Có những thứ **mô tả bằng lời rất khó** nhưng **cho xem ví dụ thì rõ ngay**: phong cách, mức chi tiết, cách xử lý ca lạ, định dạng chính xác.

Và mô hình học từ ví dụ rất hiệu quả — vì nó vốn làm đúng một việc: **tiếp tục mẫu**. Đưa ba cặp đầu vào–đầu ra là đặt mô hình vào đúng vùng bạn muốn.

## Mental model

Hãy nghĩ tới **dạy người mới điền một biểu mẫu**.

> **Giải thích bằng lời**: "cột ngày ghi theo định dạng ngày trước tháng sau, năm bốn số, nếu không rõ ngày thì để trống chứ đừng đoán, còn nếu chỉ có tháng thì ghi ngày 01..." — dài, và họ vẫn sẽ hỏi lại.
>
> **Đưa ba biểu mẫu đã điền mẫu**: họ nhìn một lượt là hiểu. Kể cả những quy ước bạn quên nói ra.
>
> Và nếu bạn đưa ba mẫu mà **một mẫu điền sai**, họ sẽ học cả cái sai đó.

Vế cuối là điều quan trọng nhất: **ví dụ sai còn hại hơn không có ví dụ**, vì nó dạy một mẫu bạn không muốn.

## Ví dụ nhỏ

```text
Phân loại mức độ khẩn của ticket.

Đầu vào: "Không đăng nhập được, cần gấp"    → cao
Đầu vào: "Đề xuất thêm chế độ tối"          → thấp
Đầu vào: "Trang thanh toán báo lỗi 500"     → cao
Đầu vào: "Font hơi nhỏ trên điện thoại"     → thấp

Đầu vào: "Đơn hàng bị trừ tiền hai lần"     →
```

## Code chạy thế nào

**Vì sao ví dụ hiệu quả hơn mô tả:**

```text
Mô hình tiếp tục mẫu trong ngữ cảnh.
⇒ Ba cặp "đầu vào → đầu ra" tạo ra một MẪU rõ ràng.
⇒ Token tiếp theo có khả năng cao nhất là "một đầu ra theo
  đúng mẫu đó" ([[mo-hinh-ngon-ngu-hoat-dong-the-nao]]).

Mô tả bằng lời thì mô hình phải DIỄN GIẢI lời mô tả rồi mới
áp dụng — thêm một bước, thêm một chỗ hiểu sai.
```

**Bao nhiêu ví dụ là đủ:**

```text
0 ví dụ  Việc phổ biến, định dạng đơn giản
         ⇒ Thử trước. Đủ thì đừng thêm.
1–3      Phần lớn trường hợp. Điểm cân bằng tốt nhất.
5–8      Việc có nhiều ca biên, hoặc quy ước rất riêng
> 10     Hiếm khi đáng: token tăng ở MỌI lời gọi,
         và lợi ích giảm dần rõ rệt
```

**Chọn ví dụ — bốn nguyên tắc:**

```text
① ĐA DẠNG, không phải nhiều
   Ba ví dụ khác nhau về loại thắng mười ví dụ giống nhau.

② PHỦ CA BIÊN
   Đưa vào ca "không xác định được", ca dữ liệu thiếu,
   ca có nhiều đáp án đúng.
   ⇒ Đây là chỗ ví dụ có giá trị cao nhất: nó dạy mô hình
     cách xử lý những thứ bạn khó diễn đạt.

③ CÂN BẰNG giữa các nhãn
   4 ví dụ "cao" và 0 ví dụ "thấp" ⇒ mô hình nghiêng về "cao".

④ ĐÚNG TUYỆT ĐỐI
   Một ví dụ sai dạy một mẫu sai, và nó lặp lại ở mọi lời gọi.
```

Nguyên tắc ③ đáng chú ý vì nó dễ vi phạm mà không nhận ra: bạn chọn ví dụ từ những ca đã gặp, và những ca đáng nhớ thường lệch về một phía.

## Cú pháp

**Nhận JSON dùng được — bốn lớp, dùng cùng nhau:**

```text
① DÙNG CHẾ ĐỘ BẮT BUỘC SCHEMA của API nếu có
   Nhiều nhà cung cấp cho phép khai schema và đảm bảo đầu ra
   khớp cú pháp.
   ⇒ Đây là lớp hiệu quả nhất, và nó miễn phí nếu có sẵn.

② KHAI SCHEMA TRONG PROMPT, kèm một ví dụ đầy đủ
   "Trả về JSON theo đúng schema sau: {...}. Ví dụ: {...}"

③ NÓI RÕ: CHỈ JSON
   "Chỉ trả về JSON. Không lời dẫn, không khối mã, không giải thích."

④ XÁC THỰC Ở PHÍA NHẬN — luôn luôn
   Parse rồi kiểm bằng schema của bạn (zod...).
   ⇒ Đầu ra hợp lệ về CÚ PHÁP vẫn có thể sai về NỘI DUNG:
     trường thiếu, giá trị ngoài enum, số âm ở chỗ không được âm
     ([[xac-thuc-dau-vao-va-bien]]).
```

**Xử lý ba lỗi định dạng phổ biến:**

```ts
function layJson(raw: string): unknown {
  // ① Mô hình bọc trong khối mã dù đã bảo đừng
  const s = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  // ② Có lời dẫn trước JSON — lấy từ dấu ngoặc đầu tiên
  const dau = s.search(/[[{]/)
  return JSON.parse(dau > 0 ? s.slice(dau) : s)
}
```

```text
③ Lỗi thứ ba không sửa được ở phía nhận: JSON BỊ CẮT GIỮA CÂU
  vì đạt max_tokens.
  ⇒ Phải kiểm `finish_reason`. Nếu là "đạt giới hạn" thì đây là
    lỗi cấu hình, không phải lỗi định dạng
    ([[tham-so-sinh-van-ban]]).
```

**Chain-of-thought và định dạng — một xung đột thật:**

```text
Yêu cầu mô hình "suy nghĩ từng bước" giúp cho bài toán cần lập luận.
Nhưng nó SINH RA phần suy nghĩ — và phần đó phá định dạng JSON.

Cách xử lý: cho phần suy nghĩ vào một TRƯỜNG của JSON.

  { "lap_luan": "...", "ket_qua": { ... } }

⇒ Vừa có lập luận, vừa parse được. Và bạn đọc được `lap_luan`
  khi cần gỡ lỗi một câu trả lời sai.
⇒ Đặt `lap_luan` TRƯỚC `ket_qua` — mô hình sinh tuần tự, nên
  nó phải lập luận trước khi kết luận. Đảo thứ tự thì phần
  lập luận trở thành biện hộ cho kết luận đã sinh ra.
```

Chi tiết thứ tự trường này nhỏ nhưng có tác động thật, và nó suy ra trực tiếp từ cách mô hình sinh token.

## Tại sao cần nó

Vì đầu ra không parse được là một loại lỗi rất tốn kém trong hệ thống thật:

```text
Không có lớp bảo vệ:
  5% lời gọi trả về JSON hỏng
  ⇒ 5% request thất bại
  ⇒ retry ⇒ trả tiền hai lần, độ trễ gấp đôi
  ⇒ và người dùng thấy lỗi ngẫu nhiên không giải thích được

Có bốn lớp:
  gần như mọi lời gọi dùng được, và lỗi còn lại được phát hiện
  ở tầng xác thực với thông báo rõ ràng.
```

**Ví dụ động — chọn ví dụ theo đầu vào:**

```text
Thay vì 3 ví dụ cố định cho mọi câu hỏi, chọn 3 ví dụ GIỐNG NHẤT
với đầu vào hiện tại (bằng tìm kiếm ngữ nghĩa).

⇒ Hiệu quả hơn rõ rệt khi miền rộng: câu hỏi về hoá đơn nhận
  ví dụ về hoá đơn, không nhận ví dụ về giao hàng.
⇒ Cùng cơ chế với RAG, chỉ khác là truy hồi VÍ DỤ thay vì
  truy hồi TÀI LIỆU ([[rag-la-gi-va-khi-nao-dung]]).
⇒ Cái giá: thêm một bước truy hồi, và một chỗ nữa có thể sai.
```

## So sánh

| Cách | Hiệu quả cho định dạng | Token mỗi lời gọi |
|---|---|---|
| Chỉ mô tả bằng lời | thấp | thấp |
| + khai schema | vừa | vừa |
| + 1–3 ví dụ | **cao** | vừa |
| + bắt buộc schema của API | **cao nhất** | thấp |
| 10+ ví dụ | cao, lợi ích giảm dần | **cao** |

## Dễ nhầm

**1. Mô tả dài thay vì đưa ví dụ.**

**2. Ví dụ sai.** Dạy một mẫu sai, lặp ở mọi lời gọi.

**3. Ví dụ lệch về một nhãn.** Mô hình nghiêng theo.

**4. Nhiều ví dụ giống nhau thay vì ít ví dụ đa dạng.**

**5. Không phủ ca biên trong ví dụ.**

**6. Không xác thực đầu ra ở phía nhận.**

**7. Không kiểm `finish_reason`.** JSON cắt giữa câu.

**8. Đặt trường kết quả trước trường lập luận.**

**9. Nhồi 15 ví dụ mà không tính token.**

**10. Bỏ qua chế độ bắt buộc schema của API.**

## Mẹo nhớ

> **Ví dụ dạy thứ MÔ TẢ KHÔNG NÓI ĐƯỢC. Nhưng ví dụ SAI dạy cái sai.**
>
> **ĐA DẠNG quan trọng hơn NHIỀU. 1–3 ví dụ là điểm cân bằng.**
>
> **Bốn lớp cho JSON: bắt buộc schema → khai schema → "chỉ JSON" → XÁC THỰC.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao ví dụ hiệu quả hơn mô tả bằng lời?
2. Bốn nguyên tắc chọn ví dụ?
3. Bốn lớp để nhận JSON dùng được?
4. Ba lỗi định dạng phổ biến, cái nào không sửa được ở phía nhận?
5. Vì sao trường lập luận phải đặt trước trường kết quả?

## Tự viết lại

Không nhìn lại, viết prompt trích xuất thông tin từ CV ứng viên, trả về JSON có: tên, email, số năm kinh nghiệm, danh sách kỹ năng, và mức độ phù hợp (cao/vừa/thấp).

```text
① schema
② ba ví dụ đa dạng, có một ca thiếu thông tin
③ chỉ dẫn về định dạng
④ mã xác thực ở phía nhận
```

Tự kiểm: ba ví dụ ở ② của bạn có cân bằng giữa ba mức phù hợp không?

## Thử sức

Endpoint trích xuất dữ liệu trả về JSON hỏng khoảng 4% số lần. Nhìn log: một nửa là bọc trong khối mã, một nửa bị cắt giữa câu.

Ba câu để trả lời: hai nguyên nhân này cần hai cách sửa khác nhau — nêu rõ; thứ tự bạn sửa; và bạn xác nhận đã hết bằng cách nào. Câu khó nhất: sau khi sửa cả hai, còn 0,5% trả về JSON **hợp lệ nhưng nội dung sai** — lớp nào bắt được nó, và bạn làm gì với những ca đó?
