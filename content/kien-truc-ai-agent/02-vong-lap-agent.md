---
title: Vòng lặp agent
slug: vong-lap-agent
summary: Lập kế hoạch, hành động, quan sát — và ba chỗ vòng lặp hay mắc kẹt.
level: trung-cap
tags: [ai, agent, kien-truc, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** cài đặt được vòng lặp agent, và nhận ra ba kiểu mắc kẹt cùng cách thoát.

## Ý tưởng chính

Vòng lặp agent chỉ có ba bước lặp lại: **quan sát → quyết định → hành động**.

Phần khó không nằm ở vòng lặp. Nó nằm ở việc **biết khi nào dừng** — và ở việc phát hiện khi vòng lặp đang chạy mà không tiến triển.

## Mental model

Hãy nghĩ tới **tìm đường trong một toà nhà lạ**.

> Bạn đứng ở một hành lang. **Quan sát**: có ba cửa và một biển chỉ dẫn. **Quyết định**: đi cửa giữa. **Hành động**: mở cửa, bước vào.
>
> Lại quan sát. Lại quyết định. Cứ thế cho tới khi tới đích.
>
> Ba cách bạn có thể mắc kẹt:
> - Đi vòng qua vòng lại **cùng một hành lang** — không nhớ mình đã đi rồi.
> - Đi mãi mà **không biết đích trông thế nào** — nên không biết khi nào đã tới.
> - **Cửa bị khoá** và bạn cứ thử mở lại thay vì tìm đường khác.

Ba kiểu mắc kẹt đó xuất hiện đúng như vậy trong agent thật, và mỗi kiểu có một cách chống khác nhau.

## Ví dụ nhỏ

```ts
let buoc = 0
while (buoc++ < TRAN_BUOC) {
  const res = await model.chat({ messages, tools })
  if (!res.toolCalls) return res.content          // mô hình nói đã xong
  for (const goi of res.toolCalls) {
    const kq = await chayCongCu(goi, ctx)
    messages.push({ role: 'tool', toolCallId: goi.id, content: JSON.stringify(kq) })
  }
}
return { chuaXong: true, daLam: messages }        // chạm trần
```

## Code chạy thế nào

**Ba bước, và mỗi bước cần gì:**

```text
① QUAN SÁT
   Ngữ cảnh hiện tại: mục tiêu, các bước đã làm, kết quả.
   ⇒ Đây là nơi ngữ cảnh lớn dần, và là nơi cần quản lý
     ([[bo-nho-cua-agent]]).

② QUYẾT ĐỊNH
   Mô hình chọn: gọi công cụ nào, hay đã xong.
   ⇒ Chất lượng quyết định phụ thuộc vào: mục tiêu có rõ không,
     công cụ có mô tả tốt không, và kết quả trước có đọc được không.

③ HÀNH ĐỘNG
   Bạn chạy công cụ, đưa kết quả về.
   ⇒ Kết quả phải ở dạng mô hình DÙNG ĐƯỢC để quyết định tiếp,
     không phải bản ghi thô.
```

**Lập kế hoạch trước — có nên hay không:**

```text
Cách A — không kế hoạch: mỗi bước quyết định dựa trên hiện tại
  + Linh hoạt, thích nghi nhanh
  − Dễ đi lan, dễ quên mục tiêu ban đầu ở bước thứ 10

Cách B — lập kế hoạch trước rồi thực hiện
  + Có định hướng, dễ theo dõi tiến độ, dễ hiển thị cho người dùng
  − Kế hoạch có thể sai ngay từ đầu vì chưa biết gì

Cách C — kế hoạch + xem lại  ← thường tốt nhất
  Lập kế hoạch, thực hiện, sau vài bước thì hỏi:
  "kế hoạch còn đúng không? cần đổi gì?"
```

```text
Cách C có một lợi ích thực dụng ít nói tới: kế hoạch là thứ
HIỂN THỊ ĐƯỢC cho người dùng. "Đang làm bước 2/5" tốt hơn nhiều
so với một con xoay không biết bao lâu.
```

## Cú pháp

**Ba kiểu mắc kẹt và cách chống:**

```text
① LẶP LẠI CÙNG MỘT HÀNH ĐỘNG
   Gọi cùng công cụ với cùng tham số nhiều lần.
   Chống: lưu lịch sử (công cụ, tham số) đã gọi.
          Trùng lặp ⇒ đưa vào ngữ cảnh: "bạn đã gọi cái này,
          kết quả là ...". Đừng chỉ chặn im lặng.

② KHÔNG BIẾT KHI NÀO XONG
   Mục tiêu mơ hồ ⇒ mô hình không có tiêu chí dừng.
   Chống: định nghĩa ĐIỀU KIỆN HOÀN THÀNH ngay trong mục tiêu.
          ❌ "giải quyết khiếu nại của khách"
          ✅ "xác định nguyên nhân, quyết định có bồi thường
             hay không, và tạo một ticket ghi lại quyết định.
             Xong khi ticket đã được tạo."

③ CỨ THỬ LẠI THỨ KHÔNG THỂ LÀM
   Công cụ trả lỗi vĩnh viễn, mô hình vẫn thử lại.
   Chống: thông báo lỗi phải nói rõ ĐÂY LÀ LỖI VĨNH VIỄN
          và gợi ý hướng khác.
          "Không có quyền truy cập tài liệu này. Không thử lại;
           hãy nói người dùng liên hệ quản trị."
```

Kiểu ② là kiểu phổ biến nhất, và cách chống nó nằm hoàn toàn trong việc **viết mục tiêu có tiêu chí dừng**.

**Phát hiện không tiến triển:**

```text
Ba tín hiệu:
  □ N bước liên tiếp không gọi công cụ mới nào
  □ Cùng một công cụ được gọi > 3 lần
  □ Ngữ cảnh tăng mà không có kết quả mới

⇒ Phát hiện được ⇒ hai lựa chọn:
  ① Đưa vào ngữ cảnh: "bạn đang lặp lại. Hãy thử hướng khác,
    hoặc nói rõ bạn không làm được việc này."
  ② Dừng và trả về kết quả một phần

⇒ Cách ① đáng thử trước: mô hình thường thoát được khi được
  chỉ ra rằng nó đang lặp.
```

**Chạm trần — xử lý cho tử tế:**

```text
❌ Trả về lỗi trắng: "Không hoàn thành được"
✅ Trả về những gì ĐÃ LÀM ĐƯỢC, và nói rõ còn thiếu gì

  "Tôi đã tra được đơn hàng và xác định nguyên nhân là giao
   trễ. Tôi chưa tính được mức bồi thường vì không truy cập
   được bảng chính sách. Bạn kiểm tra giúp phần đó."

⇒ Kết quả một phần thường vẫn hữu ích.
⇒ Và log của lần chạm trần đó chỉ ra công cụ nào còn thiếu
  ([[danh-gia-agent]]).
```

## Tại sao cần nó

Vì vòng lặp là chỗ toàn bộ chi phí và rủi ro của agent nằm ở:

```text
Mỗi lượt vòng lặp:
  + một lời gọi mô hình (độ trễ, chi phí)
  + ngữ cảnh lớn hơn lượt trước (chi phí tăng dần)
  + một cơ hội nữa để quyết định sai

⇒ Nên mọi tối ưu agent đều là "giảm số bước" hoặc
  "làm mỗi bước quyết định đúng hơn".
```

**Bốn cách giảm số bước:**

```text
① MỤC TIÊU RÕ với tiêu chí hoàn thành
   ⇒ Tác động lớn nhất và rẻ nhất.
② CÔNG CỤ TRẢ VỀ ĐỦ THÔNG TIN
   ⇒ Đừng để mô hình phải gọi ba công cụ để có thứ một công cụ
     trả về được ([[goi-nhieu-cong-cu]]).
③ CUNG CẤP TRẠNG THÁI BAN ĐẦU
   ⇒ Nếu bạn đã biết mã đơn, đưa luôn thông tin đơn vào ngữ cảnh
     thay vì để agent tự đi tra.
④ CHUYỂN PHẦN CỐ ĐỊNH SANG MÃ
   ⇒ Nếu ba bước đầu luôn giống nhau, làm chúng bằng mã rồi
     mới đưa agent vào.
```

Cách ④ đáng nhấn: **agent không cần phụ trách toàn bộ nhiệm vụ**. Dùng nó cho đúng phần không đoán trước được.

**Và một điều về hiển thị:**

```text
Vòng lặp agent chạy lâu và không biết trước bao lâu.
⇒ Hiển thị TIẾN TRÌNH là yêu cầu chức năng, không phải trang trí:
  "Đang tra đơn hàng..." → "Đang kiểm chính sách..." → ...
⇒ Nó cũng cho người dùng cơ hội DỪNG khi thấy nó đi sai hướng.
```

## So sánh

| | Không kế hoạch | Có kế hoạch | Kế hoạch + xem lại |
|---|---|---|---|
| Linh hoạt | cao | thấp | cao |
| Giữ đúng mục tiêu | kém | tốt | tốt |
| Hiển thị tiến độ | khó | ✅ | ✅ |
| Số lời gọi thêm | 0 | 1 | 1–2 |

## Dễ nhầm

**1. Mục tiêu không có tiêu chí hoàn thành.** Kiểu mắc kẹt phổ biến nhất.

**2. Không phát hiện lặp lại hành động.**

**3. Chặn hành động trùng lặp im lặng.** Nên nói cho mô hình biết.

**4. Thông báo lỗi không phân biệt tạm thời và vĩnh viễn.**

**5. Không có trần số bước.**

**6. Chạm trần trả về lỗi trắng.** Kết quả một phần vẫn hữu ích.

**7. Không hiển thị tiến trình.**

**8. Để agent phụ trách cả phần luồng cố định.**

**9. Không đưa trạng thái ban đầu vào ngữ cảnh.**

**10. Không log đường đi từng bước.**

## Mẹo nhớ

> **Vòng lặp dễ. Phần khó là BIẾT KHI NÀO DỪNG — nên mục tiêu phải có tiêu chí hoàn thành.**
>
> **Phát hiện lặp lại thì NÓI CHO MÔ HÌNH BIẾT, đừng chặn im lặng.**
>
> **Chạm trần thì trả về những gì ĐÃ LÀM ĐƯỢC, không trả lỗi trắng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba bước của vòng lặp, mỗi bước cần gì?
2. Ba kiểu mắc kẹt và cách chống từng cái?
3. Ba tín hiệu phát hiện không tiến triển?
4. Bốn cách giảm số bước, cách nào tác động lớn nhất?
5. Vì sao hiển thị tiến trình là yêu cầu chức năng?

## Tự viết lại

Không nhìn lại, viết vòng lặp agent cho nhiệm vụ *"tìm nguyên nhân một đơn hàng bị giao trễ và tạo ticket ghi lại"*:

```text
① mục tiêu, có tiêu chí hoàn thành
② các công cụ cần
③ mã vòng lặp, có trần bước
④ phát hiện lặp lại
⑤ xử lý khi chạm trần
```

Tự kiểm: mục tiêu ở ① của bạn có câu "xong khi..." không — nếu không, agent sẽ không biết dừng.

## Thử sức

Agent của bạn đôi khi chạy 20 bước rồi chạm trần, và log cho thấy nó gọi `traDonHang` với cùng mã đơn 7 lần.

Ba câu để trả lời: ba nguyên nhân khả dĩ của việc gọi lặp lại; cách sửa cho từng cái; và bạn thêm gì để phát hiện tình trạng này tự động. Câu khó nhất: nếu kết quả của `traDonHang` không chứa thông tin mô hình đang tìm, vì sao nó lại gọi lại thay vì thử công cụ khác — và điều đó chỉ ra vấn đề ở đâu?
