---
title: Tạo câu trả lời và trích dẫn
slug: tao-cau-tra-loi-va-trich-dan
summary: Bắt mô hình bám vào ngữ cảnh, trích dẫn kiểm được, và xử lý khi tài liệu không có câu trả lời.
level: trung-cap
tags: [ai, rag, prompt, do-tin-cay]
khung: v2
---

> **Sau bài này bạn sẽ:** viết prompt sinh câu trả lời bám vào nguồn, và kiểm được trích dẫn bằng máy.

## Ý tưởng chính

Truy hồi đúng đoạn mới là một nửa. Nửa còn lại: bắt mô hình **trả lời dựa trên đoạn đó** thay vì dựa trên trí nhớ của nó.

Và làm cho câu trả lời **kiểm được** — vì một câu trả lời không kiểm được thì người dùng chỉ có hai lựa chọn: tin hết, hoặc không tin gì.

## Mental model

Hãy nghĩ tới **bài thi mở sách**.

> Học sinh được mở sách. Nhưng có hai kiểu làm bài:
>
> **Kiểu một**: đọc câu hỏi, nhớ mang máng, viết ra theo trí nhớ, thỉnh thoảng liếc sách. Câu trả lời trôi chảy, và có chỗ sai lệch so với sách.
>
> **Kiểu hai**: tìm đúng đoạn, đọc, viết câu trả lời **ghi rõ trang mấy**. Chậm hơn, và giám khảo kiểm được.
>
> Yêu cầu ghi số trang không chỉ để kiểm — nó **buộc học sinh phải thật sự mở sách**.

Vế cuối là tác dụng ít được nói tới của việc yêu cầu trích dẫn: nó thay đổi cả cách câu trả lời được tạo ra, không chỉ cách nó được kiểm.

## Ví dụ nhỏ

```text
Chỉ trả lời dựa trên tài liệu dưới đây.
Mỗi khẳng định phải ghi rõ [nguồn: id đoạn].
Nếu tài liệu không có thông tin, trả lời: "Không tìm thấy
thông tin này trong tài liệu."
Không dùng kiến thức ngoài tài liệu.
```

## Code chạy thế nào

**Bốn thành phần của prompt sinh câu trả lời:**

```text
① RÀNG BUỘC NGUỒN
   "Chỉ dựa trên tài liệu dưới đây. Không dùng kiến thức khác."

② XỬ LÝ KHI KHÔNG CÓ — nói rõ phải làm gì
   "Không có thông tin ⇒ trả lời chính xác câu: '...'"
   ⇒ Không nói ra thì mô hình sẽ suy đoán, vì mặc định của nó
     là phải trả lời ([[ao-giac-va-gioi-han]]).

③ YÊU CẦU TRÍCH DẪN, có định dạng cụ thể
   "Mỗi khẳng định ghi [nguồn: <id>]"

④ ĐỊNH DẠNG ĐẦU RA
   độ dài, giọng điệu, có gạch đầu dòng hay không
```

**Đánh số đoạn để trích dẫn kiểm được:**

```text
<tai_lieu>
[1] (chinh-sach-doi-tra.md > Điều 5)
Sản phẩm phải còn nguyên tem, hộp và phụ kiện. Thời hạn 7 ngày.

[2] (chinh-sach-doi-tra.md > Điều 6)
Hàng khuyến mãi không áp dụng đổi trả.
</tai_lieu>

Câu hỏi: Mua hàng sale có đổi được không?
```

```text
⇒ Mô hình trả lời: "Hàng khuyến mãi không áp dụng đổi trả [2]."
⇒ Bạn KIỂM ĐƯỢC BẰNG MÁY: đoạn [2] có tồn tại không, và nó có
  thật sự nói điều đó không.
```

**Ba mức kiểm trích dẫn — tăng dần độ chặt:**

```text
① Trích dẫn có TỒN TẠI không
   Mô hình ghi [7] nhưng chỉ có 5 đoạn ⇒ loại bỏ ngay.
   ⇒ Rẻ, tự động hoàn toàn, bắt được lỗi rõ ràng nhất.

② Mọi khẳng định CÓ trích dẫn không
   Câu nào không có [n] ⇒ có thể là mô hình đang dùng trí nhớ.

③ Trích dẫn có ĐÚNG NỘI DUNG không
   Đoạn [2] có thật sự nói điều đó không?
   ⇒ Cần một lời gọi kiểm riêng, hoặc người kiểm.
   ⇒ Đây là loại ảo giác nguy hiểm nhất: trích dẫn có thật,
     nội dung sai.
```

Mức ① và ② tự động hoá được và nên có ngay. Mức ③ đắt hơn, dùng cho những câu trả lời quan trọng.

## Cú pháp

**"Không tìm thấy" phải là câu trả lời hợp lệ:**

```text
Hệ thống KHÔNG BAO GIỜ nói "không tìm thấy" là một dấu hiệu XẤU,
không phải dấu hiệu tốt.

⇒ Nó có nghĩa mô hình đang suy đoán cho những câu nó không có
  cơ sở để trả lời.

Ba điều kiện để "không tìm thấy" hoạt động:
  □ Nói rõ trong prompt, kèm CÂU CHÍNH XÁC phải trả lời
  □ Có ngưỡng điểm ở bước truy hồi — không đoạn nào đủ liên quan
    thì đừng đưa đoạn nào vào ([[truy-hoi-va-xep-hang-lai]])
  □ Có ca "không tìm thấy" trong bộ ca kiểm
```

**Hiển thị nguồn cho người dùng:**

```text
Câu trả lời: "Hàng khuyến mãi không áp dụng đổi trả."
Nguồn: Chính sách đổi trả > Điều 6  [xem]

⇒ Ba lợi ích:
  ① Người dùng kiểm được ngay khi nghi ngờ
  ② Xây được lòng tin — họ thấy hệ thống có cơ sở
  ③ Khi sai, họ báo ĐÚNG chỗ sai, không chỉ "câu trả lời sai"
     ⇒ dữ liệu này rất giá trị cho việc cải thiện
```

**Xử lý mâu thuẫn giữa các đoạn:**

```text
Tài liệu cũ nói 7 ngày, tài liệu mới nói 15 ngày. Cả hai được
truy hồi.

Ba cách:
  ① Nói mô hình ưu tiên theo NGÀY CẬP NHẬT trong siêu dữ liệu
  ② Nói mô hình NÊU RA mâu thuẫn thay vì tự chọn
     "Tài liệu có hai thông tin khác nhau: ... Bạn liên hệ ... để
      xác nhận."
  ③ Sửa ở GỐC: xoá tài liệu cũ khỏi kho
     ⇒ Đây mới là cách đúng. Hai cách trên là vá.

⇒ Mâu thuẫn xuất hiện thường xuyên ⇒ vấn đề ở quản lý tài liệu,
  không ở prompt.
```

**Trả lời khi thông tin nằm rải nhiều đoạn:**

```text
"So sánh chính sách của gói A và gói B" — thông tin ở 4 đoạn.

□ Đảm bảo truy hồi lấy đủ cả bốn (tách câu hỏi thành nhiều
  truy vấn nếu cần)
□ Nói rõ trong prompt: "tổng hợp từ nhiều đoạn nếu cần,
  trích dẫn tất cả các đoạn đã dùng"
□ Cẩn thận: mô hình có thể tự "điền vào chỗ trống" giữa các đoạn
  ⇒ đây là chỗ ảo giác hay chen vào trong RAG
```

## Tại sao cần nó

Vì RAG **giảm** ảo giác chứ không **loại bỏ** nó — và chỗ ảo giác còn lại nằm đúng ở bước này:

```text
Ba kiểu sai còn lại dù truy hồi đúng:
  ① Mô hình dùng trí nhớ thay vì ngữ cảnh
     ⇒ chống bằng ràng buộc nguồn và yêu cầu trích dẫn
  ② Mô hình suy diễn quá xa từ đoạn đã cho
     ⇒ chống bằng kiểm trích dẫn mức ③
  ③ Mô hình ghép hai đoạn không liên quan thành một kết luận
     ⇒ khó nhất, cần người hoặc mô hình kiểm riêng
```

**Và một quyết định thiết kế: hành động tự động hay không.**

```text
Câu trả lời RAG dùng để HIỂN THỊ cho người đọc
  ⇒ trích dẫn + hiển thị nguồn là đủ; người dùng là lớp kiểm cuối.

Câu trả lời RAG dùng để RA QUYẾT ĐỊNH TỰ ĐỘNG
  (duyệt yêu cầu, tính tiền, gửi email thay mặt công ty)
  ⇒ cần kiểm chứng bằng mã, và với việc quan trọng thì cần
    người duyệt.
  ⇒ "Ai phát hiện nếu nó sai?" là câu hỏi quyết định
    ([[prompt-injection]]).
```

**Bốn thứ nên có trong hệ thống RAG chạy thật:**

```text
□ Prompt có ràng buộc nguồn và câu "không tìm thấy" cụ thể
□ Trích dẫn kiểm được bằng máy (mức ① và ②)
□ Hiển thị nguồn cho người dùng, bấm xem được
□ Nút báo sai, và quy trình đọc các báo cáo đó
  ⇒ Đây là nguồn dữ liệu tốt nhất để mở rộng bộ ca kiểm
    ([[danh-gia-he-thong-rag]])
```

## So sánh

| | Không trích dẫn | Có trích dẫn |
|---|---|---|
| Người dùng kiểm được | ❌ | ✅ |
| Kiểm tự động được | ❌ | ✅ |
| Mô hình bám ngữ cảnh | ít hơn | **nhiều hơn** |
| Báo sai hữu ích | "câu này sai" | "đoạn [2] không nói vậy" |
| Token đầu ra | ít hơn | nhiều hơn chút |

## Dễ nhầm

**1. Không ràng buộc mô hình chỉ dùng ngữ cảnh.**

**2. Không nói rõ phải trả lời gì khi không tìm thấy.**

**3. Hệ thống không bao giờ nói "không tìm thấy".** Dấu hiệu xấu.

**4. Không đánh số đoạn.** Trích dẫn không kiểm được.

**5. Không kiểm trích dẫn có tồn tại không.** Lớp rẻ nhất mà bỏ.

**6. Tin trích dẫn có thật là nội dung đúng.**

**7. Không hiển thị nguồn cho người dùng.**

**8. Vá mâu thuẫn tài liệu bằng prompt** thay vì dọn kho.

**9. Không có ngưỡng điểm ở truy hồi.** Đoạn không liên quan vẫn được đưa vào.

**10. Tự động hoá hành động dựa trên câu trả lời không ai kiểm.**

## Mẹo nhớ

> **Yêu cầu trích dẫn không chỉ để KIỂM — nó buộc mô hình BÁM vào ngữ cảnh.**
>
> **"Không tìm thấy" phải là câu trả lời hợp lệ. Không bao giờ nói nó là dấu hiệu XẤU.**
>
> **Trích dẫn có thật mà nội dung sai là kiểu ảo giác nguy hiểm nhất.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn thành phần của prompt sinh câu trả lời?
2. Ba mức kiểm trích dẫn, mức nào tự động hoá được?
3. Ba điều kiện để "không tìm thấy" hoạt động?
4. Ba cách xử lý mâu thuẫn giữa các đoạn, cách nào đúng?
5. Ba kiểu sai còn lại dù truy hồi đúng?

## Tự viết lại

Không nhìn lại, viết prompt sinh câu trả lời cho trợ lý chính sách nhân sự:

```text
① đủ bốn thành phần
② định dạng đoạn đưa vào ngữ cảnh, có đánh số
③ mã kiểm trích dẫn ở phía nhận
④ những gì hiển thị cho người dùng
```

Tự kiểm: mã ở ③ của bạn kiểm được mức mấy — và mức còn lại bạn xử lý thế nào?

## Thử sức

Trợ lý RAG trả lời: *"Nhân viên được nghỉ 15 ngày phép mỗi năm [3]."* Đoạn [3] tồn tại, nói về chính sách nghỉ phép, nhưng con số thật là 12 ngày — số 15 xuất hiện ở đoạn [5] về một chế độ khác.

Ba câu để trả lời: đây là kiểu sai nào, và vì sao ba lớp kiểm tự động thông thường **không** bắt được; hai biện pháp có thể bắt được; và bạn xử lý rủi ro này thế nào cho toàn hệ thống. Câu khó nhất: nếu câu trả lời này được dùng để tự động duyệt đơn nghỉ phép, thiết kế của bạn phải khác ở điểm nào?
