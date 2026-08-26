---
title: Mô hình ngôn ngữ hoạt động thế nào
slug: mo-hinh-ngon-ngu-hoat-dong-the-nao
summary: Dự đoán token tiếp theo — và vì sao một cơ chế đơn giản như vậy lại giải thích được gần hết hành vi của LLM.
level: co-ban
tags: [ai, llm, nen-tang, tu-duy]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được LLM làm gì ở mức cơ chế, và suy ra được vì sao nó mạnh ở đâu và yếu ở đâu.

## Ý tưởng chính

Một mô hình ngôn ngữ làm đúng một việc: **nhìn vào chuỗi văn bản hiện có, dự đoán token tiếp theo có khả năng nhất**. Rồi lặp lại.

Nghe đơn giản tới mức khó tin. Nhưng gần như mọi hành vi đáng chú ý của LLM — cả điểm mạnh và điểm yếu — đều suy ra được từ đúng câu đó.

## Mental model

Hãy nghĩ tới **gợi ý từ tiếp theo trên bàn phím điện thoại**, nhưng mạnh hơn rất nhiều bậc.

> Bàn phím điện thoại nhìn 2–3 từ trước và gợi ý từ tiếp theo. Nó chỉ dựa vào tần suất.
>
> LLM nhìn **hàng chục nghìn từ trước**, và học được không chỉ tần suất mà cả cấu trúc: cú pháp, lập luận, phong cách, mối liên hệ giữa các khái niệm.
>
> Nhưng nó vẫn đang làm **cùng một việc**: chọn token tiếp theo.

Từ hình ảnh này suy ra ngay một điều quan trọng: nó không "tra cứu" và cũng không "biết". Nó **sinh ra chuỗi có khả năng cao** — và một chuỗi có khả năng cao thường đúng, nhưng không phải vì nó được kiểm chứng.

## Ví dụ nhỏ

```text
Đầu vào:  "Thủ đô của Việt Nam là"
Mô hình tính xác suất cho token tiếp theo:
  " Hà"      0.94
  " thành"   0.02
  " một"     0.01
  ...
Chọn " Hà" → thêm vào chuỗi → lặp lại → " Nội"
```

## Code chạy thế nào

**Vòng sinh từng token:**

```text
① Chuỗi đầu vào được cắt thành TOKEN (không phải từ)
② Mô hình tính phân phối xác suất cho token tiếp theo
③ Chọn một token theo phân phối đó
④ THÊM token đó vào chuỗi
⑤ Lặp lại từ ②, với chuỗi đã dài hơn một token
⑥ Dừng khi gặp token kết thúc, hoặc đạt giới hạn
```

```text
Bước ④ giải thích hai chuyện:
  □ Vì sao đầu ra đến DẦN từng chút — nó thật sự được sinh dần
  □ Vì sao mô hình "cam kết" với những gì đã nói:
    một token sai ở đầu làm mọi token sau đó bị điều kiện hoá
    trên cái sai đó
    ⇒ Nó không sửa lại được, và nó sẽ tiếp tục một cách nhất quán
      với cái sai — nghe rất thuyết phục.
```

**Cơ chế attention — vì sao nó "hiểu" được ngữ cảnh dài:**

```text
Với mỗi token cần sinh, mô hình tính xem MỖI token trước đó
liên quan bao nhiêu tới việc này, rồi tổng hợp có trọng số.

  "Con mèo đuổi con chuột vì nó đói."
  Sinh phần liên quan tới "nó" ⇒ trọng số cao vào "mèo"

⇒ Đây là điều bàn phím điện thoại không làm được: nó liên kết
  được các phần XA NHAU trong ngữ cảnh.
⇒ Và nó giải thích vì sao ngữ cảnh có cấu trúc rõ ràng cho kết quả
  tốt hơn ngữ cảnh lộn xộn: mô hình phải tự tìm ra liên hệ,
  và bạn giúp được nó ([[cung-cap-ngu-canh]]).
```

**Ba điều suy ra ngay từ cơ chế:**

```text
① MẠNH ở việc có nhiều mẫu trong dữ liệu huấn luyện
   Viết mã theo khuôn mẫu, giải thích khái niệm phổ biến,
   dịch, tóm tắt, đổi định dạng.

② YẾU ở việc cần TÍNH TOÁN CHÍNH XÁC hoặc SỰ THẬT CỤ THỂ
   Nó không có máy tính bên trong, không có cơ sở dữ liệu để tra.
   "13847 × 2913 = ?" → nó SINH ra một con số trông hợp lý.

③ KHÔNG BIẾT nó không biết
   Không có tín hiệu nội tại phân biệt "tôi đã thấy điều này
   nhiều lần" với "tôi đang ghép một chuỗi nghe hợp lý".
```

## Cú pháp

**Token — không phải từ, và điều đó có hệ quả thực tế:**

```text
"Hello world"      → 2 token
"Xin chào các bạn" → có thể 6–8 token
"internationalization" → nhiều token
"3.14159"          → nhiều token

⇒ Tiếng Việt (và mọi ngôn ngữ không phải tiếng Anh) tốn NHIỀU
  TOKEN HƠN cho cùng một lượng nội dung.
  ⇒ Ảnh hưởng trực tiếp tới chi phí và tới lượng nội dung vừa
    trong context window ([[luong-request-cua-ung-dung-llm]]).

⇒ Và nó giải thích một hạn chế nghe kỳ lạ: mô hình khó đếm
  ký tự hoặc đảo chữ trong một từ, vì nó không "thấy" từng ký tự —
  nó thấy các token.
```

**Huấn luyện gồm hai giai đoạn rất khác nhau:**

```text
① TIỀN HUẤN LUYỆN (pretraining)
   Đọc lượng văn bản khổng lồ, học dự đoán token tiếp theo.
   ⇒ Đây là nơi "kiến thức" và khả năng ngôn ngữ hình thành.
   ⇒ Và nó đóng băng ở một MỐC THỜI GIAN — mô hình không biết
     gì xảy ra sau đó.

② TINH CHỈNH THEO HƯỚNG DẪN VÀ PHẢN HỒI
   Học cách trả lời hữu ích, làm theo yêu cầu, từ chối khi cần.
   ⇒ Đây là lý do mô hình "hành xử như một trợ lý" thay vì chỉ
     tiếp tục văn bản.
   ⇒ Nó KHÔNG thêm kiến thức mới đáng kể — nó thay đổi cách
     kiến thức được trình bày.
```

Phân biệt hai giai đoạn này giải thích một điều hay gây nhầm: mô hình mới hơn "biết nhiều hơn" là do tiền huấn luyện; mô hình "làm theo yêu cầu tốt hơn" là do giai đoạn hai. Chúng là hai trục khác nhau.

## Tại sao cần nó

Vì hiểu cơ chế thay đổi cách bạn dùng nó:

```text
Nếu bạn nghĩ LLM "tra cứu":
  → bạn tin con số nó đưa ra
  → bạn hỏi nó thông tin thời sự
  → bạn ngạc nhiên khi nó bịa ra một hàm không tồn tại

Nếu bạn hiểu nó "sinh chuỗi có khả năng cao":
  → bạn cung cấp sự thật trong ngữ cảnh thay vì trông cậy trí nhớ nó
  → bạn kiểm mọi con số và mọi tên API
  → bạn dùng nó cho việc BIẾN ĐỔI văn bản, và tự lo phần SỰ THẬT
```

Đây là chuyển dịch quan trọng nhất: **đưa sự thật vào, đừng lấy sự thật ra**. Đó cũng là ý tưởng nền của RAG và của function calling.

**Và một hệ quả về cách viết yêu cầu:**

```text
Mô hình tiếp tục chuỗi bạn đưa. Nên chuỗi bạn đưa ĐẶT KHUÔN
cho những gì tiếp theo.

  "Viết code" → nó chọn phong cách phổ biến nhất
  "Viết code, đây là một hàm tương tự trong dự án (dán)"
    → chuỗi giờ chứa phong cách của bạn ⇒ token tiếp theo
      có khả năng cao là theo phong cách đó

⇒ Đây là lý do một ví dụ mẫu hiệu quả hơn nhiều lời mô tả:
  nó không "giải thích" cho mô hình, nó ĐẶT mô hình vào đúng
  vùng phân phối bạn muốn.
```

## So sánh

| | Tra cứu (cơ sở dữ liệu) | Sinh token (LLM) |
|---|---|---|
| Nguồn câu trả lời | bản ghi cụ thể | phân phối xác suất |
| Sai thì | không tìm thấy | **trả về thứ nghe hợp lý** |
| Biết mình không biết | ✅ | ❌ |
| Mạnh ở | sự thật chính xác | biến đổi ngôn ngữ |
| Tính toán | chính xác | xấp xỉ |

## Dễ nhầm

**1. Nghĩ LLM tra cứu thông tin.** Nó sinh chuỗi.

**2. Tin con số nó tính ra.** Không có máy tính bên trong.

**3. Hỏi thông tin sau mốc huấn luyện.**

**4. Tưởng nó biết khi nào nó không biết.**

**5. Nghĩ token = từ.** Tiếng Việt tốn nhiều token hơn.

**6. Ngạc nhiên khi nó không đếm được ký tự.** Nó thấy token.

**7. Trông cậy trí nhớ mô hình cho sự thật** thay vì đưa sự thật vào ngữ cảnh.

**8. Lẫn hai giai đoạn huấn luyện.** "Biết nhiều" và "làm theo tốt" là hai trục.

**9. Nghĩ mô hình sửa được câu nó đã nói.** Nó bị điều kiện hoá trên đó.

**10. Mô tả dài thay vì đưa ví dụ mẫu.**

## Mẹo nhớ

> **LLM dự đoán TOKEN TIẾP THEO. Gần hết hành vi của nó suy ra từ câu này.**
>
> **Nó không tra cứu — nó SINH chuỗi có khả năng cao. Nên nó không biết mình không biết.**
>
> **ĐƯA sự thật vào, đừng LẤY sự thật ra.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vòng sinh token gồm mấy bước, bước nào giải thích việc "cam kết với cái sai"?
2. Attention làm gì, và nó cho phép điều gì?
3. Ba điều suy ra ngay từ cơ chế dự đoán token?
4. Token khác từ thế nào, và hai hệ quả thực tế?
5. Hai giai đoạn huấn luyện, mỗi giai đoạn cho cái gì?

## Tự viết lại

Không nhìn lại, giải thích bằng lời của bạn cho một đồng nghiệp:

```text
① LLM làm gì, trong hai câu
② vì sao nó bịa ra tên hàm không tồn tại
③ vì sao nó tính sai phép nhân hai số lớn
④ vì sao đưa một ví dụ mẫu hiệu quả hơn mô tả dài
```

Tự kiểm: câu trả lời ② và ③ của bạn có dùng **cùng một** lý do gốc không — nếu có, bạn đã nắm được ý chính của bài.

## Thử sức

Đồng nghiệp nói: *"Mô hình này bảo hàm `Array.prototype.groupBy` tồn tại từ Node 18, mình dùng thì lỗi. Mô hình dở."*

Ba câu để trả lời: giải thích chuyện gì đã xảy ra ở mức cơ chế; vì sao nó **không phải** lỗi "dở" mà là một tính chất; và bạn đề xuất cách làm việc nào để chuyện này không tốn thời gian nữa. Câu khó nhất: nếu tên hàm đó **thật sự tồn tại** ở một môi trường khác (một đề xuất chuẩn, hoặc một thư viện), điều đó nói gì thêm về cách mô hình sinh ra câu trả lời — và vì sao nó khiến lỗi khó nhận ra hơn?
