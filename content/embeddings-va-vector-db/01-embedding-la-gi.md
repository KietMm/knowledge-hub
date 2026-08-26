---
title: Embedding là gì
slug: embedding-la-gi
summary: Biến ý nghĩa thành toạ độ — cơ chế, những gì nó bắt được, và những gì nó bỏ sót.
level: co-ban
tags: [ai, embedding, tim-kiem, nen-tang]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được embedding làm gì, và biết ba loại quan hệ nó **không** bắt được.

## Ý tưởng chính

**Embedding** biến một đoạn văn bản thành một dãy số — một điểm trong không gian nhiều chiều.

Điều làm nó hữu ích: mô hình được huấn luyện sao cho **văn bản có nghĩa gần nhau thì điểm gần nhau**. Nên "so sánh ý nghĩa" trở thành "đo khoảng cách" — một phép tính rẻ và làm được ở quy mô lớn.

## Mental model

Hãy nghĩ tới **bản đồ thành phố, nhưng xếp theo chủ đề thay vì theo địa lý**.

> Trên bản đồ này, mọi thứ liên quan tới **ăn uống** nằm ở một vùng: nhà hàng, quán cà phê, chợ, siêu thị.
>
> Mọi thứ liên quan tới **y tế** nằm ở vùng khác: bệnh viện, phòng khám, nhà thuốc.
>
> "Quán ăn" và "nhà hàng" nằm gần nhau dù **viết khác nhau hoàn toàn** — vì chúng cùng nghĩa. Đó là điều tìm kiếm từ khoá không làm được.
>
> Nhưng bản đồ chỉ có ba chiều để xếp mọi thứ. Nên có những quan hệ nó **không thể** thể hiện: "nhà thuốc gần nhà tôi" cần một trục khác hẳn.

Embedding có hàng trăm tới hàng nghìn chiều thay vì ba, nên nó thể hiện được nhiều quan hệ hơn nhiều. Nhưng nguyên tắc vẫn thế: **số chiều hữu hạn nghĩa là có những quan hệ bị nén mất**.

## Ví dụ nhỏ

```text
"chính sách hoàn tiền"  → [0.021, -0.183, 0.442, ... ]  (1.536 số)
"quy định trả lại tiền" → [0.019, -0.177, 0.451, ... ]  ← rất gần
"hướng dẫn cài đặt"     → [0.412,  0.083, -0.221, ... ] ← xa
```

## Code chạy thế nào

**Từ văn bản tới vector:**

```text
① Văn bản → token
② Mô hình xử lý toàn bộ chuỗi token
③ Tổng hợp thành MỘT vector cố định (768, 1.536, 3.072 chiều...)
④ Thường được chuẩn hoá về độ dài 1

⇒ Điểm quan trọng ở bước ③: mọi đoạn văn, dài hay ngắn,
  đều thành một vector CÙNG kích thước.
⇒ Nên một đoạn 800 token bị "nén" vào cùng số chiều với
  một câu 10 token — và thông tin bị mất nhiều hơn.
```

Từ đó suy ra một điều thực dụng: **đoạn quá dài làm embedding kém sắc nét**, vì nó phải trung bình hoá nhiều ý vào một điểm ([[chia-doan-tai-lieu]]).

**Ba loại quan hệ embedding bắt được tốt:**

```text
① TỪ ĐỒNG NGHĨA và DIỄN ĐẠT KHÁC
   "hoàn tiền" ↔ "trả lại tiền" ↔ "refund"

② CÙNG CHỦ ĐỀ
   "cách reset mật khẩu" gần "quên mật khẩu làm sao"

③ QUAN HỆ NGỮ NGHĨA TỔNG QUÁT
   "chó" gần "mèo" hơn gần "máy tính"
```

**Ba loại quan hệ nó bắt KÉM — và đây là phần quan trọng:**

```text
① PHỦ ĐỊNH
   "bao gồm pin" và "KHÔNG bao gồm pin" rất GẦN nhau.
   ⇒ Nguyên nhân của loại sai khó hiểu nhất trong RAG:
     tìm ra đúng chủ đề nhưng ngược nghĩa.

② MÃ, SỐ, TÊN RIÊNG HIẾM
   "SP-4402" và "SP-4403" — với mô hình, chúng gần như giống nhau.
   ⇒ Cần tìm kiếm từ khoá cho những thứ này
     ([[truy-hoi-va-xep-hang-lai]]).

③ QUAN HỆ CÓ CẤU TRÚC
   "đơn hàng của tôi tháng này", "sản phẩm dưới 500 nghìn"
   ⇒ Đây là truy vấn, không phải tìm kiếm ngữ nghĩa.
     Dùng bộ lọc hoặc truy vấn CSDL.
```

Biết ba điểm yếu này giải thích được phần lớn ca sai của một hệ thống tìm kiếm ngữ nghĩa.

## Cú pháp

**Số chiều — đánh đổi thật:**

```text
384–768 chiều    nhanh, ít bộ nhớ, chất lượng tốt cho phần lớn việc
1.536            phổ biến, cân bằng
3.072+           chất lượng cao hơn chút, tốn gấp đôi bộ nhớ
                 và chậm hơn khi tìm

Ước lượng bộ nhớ: số đoạn × số chiều × 4 byte
  1 triệu đoạn × 1.536 chiều × 4 byte ≈ 6 GB
  ⇒ Cộng thêm chi phí của chỉ mục.
  ⇒ Con số này quyết định bạn cần bao nhiêu RAM
    ([[vector-database-va-chi-muc]]).
```

**Embedding cho câu hỏi và cho tài liệu — cùng một mô hình:**

```text
Bắt buộc dùng CÙNG mô hình cho cả hai. Vector từ hai mô hình
khác nhau nằm trong hai không gian khác nhau — so sánh chúng
cho ra số vô nghĩa.

⇒ Và hệ quả quan trọng: ĐỔI mô hình embedding nghĩa là phải
  TÍNH LẠI TOÀN BỘ kho. Với hàng triệu đoạn, đó là một dự án,
  không phải một dòng cấu hình.
```

```text
Một số mô hình còn phân biệt loại đầu vào:
  embedding cho TRUY VẤN khác embedding cho TÀI LIỆU
  (cùng mô hình, khác tiền tố hoặc khác chế độ)
⇒ Dùng sai chế độ làm chất lượng giảm rõ rệt mà không có lỗi nào.
⇒ Đọc tài liệu của mô hình bạn dùng.
```

**Tiếng Việt — hai điều cần biết:**

```text
① Không phải mô hình nào cũng đều nhau
   Mô hình huấn luyện chủ yếu trên tiếng Anh có thể kém với
   tiếng Việt, nhất là với thuật ngữ chuyên ngành.
   ⇒ Phải ĐO trên dữ liệu của bạn, không tin bảng xếp hạng chung.

② Mô hình đa ngôn ngữ cho phép tìm chéo ngôn ngữ
   Câu hỏi tiếng Việt tìm ra tài liệu tiếng Anh.
   ⇒ Rất hữu ích khi tài liệu kỹ thuật là tiếng Anh còn người
     dùng hỏi tiếng Việt.
```

## Tại sao cần nó

Vì embedding là nền của mọi tìm kiếm ngữ nghĩa, và hiểu giới hạn của nó tránh được cả một lớp lỗi:

```text
Không hiểu giới hạn:
  → dùng tìm ngữ nghĩa cho mã sản phẩm ⇒ sai
  → ngạc nhiên khi hệ thống trả về đoạn ngược nghĩa
  → cố sửa bằng prompt ⇒ không có tác dụng

Hiểu giới hạn:
  → thêm tìm từ khoá cho mã và tên riêng
  → thêm xếp hạng lại để xử lý phủ định
  → dùng bộ lọc cho điều kiện có cấu trúc
```

**Và embedding không chỉ để tìm kiếm:**

```text
□ PHÂN CỤM — nhóm các ticket tương tự để tìm chủ đề đang nổi
□ PHÁT HIỆN TRÙNG LẶP — hai câu hỏi khác chữ, cùng nghĩa
□ PHÂN LOẠI — so với embedding đại diện của từng nhãn,
  không cần huấn luyện mô hình riêng
□ CHỌN VÍ DỤ ĐỘNG — lấy ví dụ few-shot giống đầu vào nhất
  ([[vi-du-va-dinh-dang-dau-ra]])
□ PHÁT HIỆN BẤT THƯỜNG — câu hỏi xa mọi thứ trong kho

⇒ Nhóm cuối đáng chú ý: nó là cách phát hiện người dùng đang
  hỏi những thứ tài liệu của bạn chưa có.
```

## So sánh

| | Tìm từ khoá | Tìm bằng embedding |
|---|---|---|
| Từ đồng nghĩa | ❌ | ✅ |
| Diễn đạt khác | ❌ | ✅ |
| Mã, số, tên riêng | ✅ | ❌ |
| Phủ định | một phần | ❌ |
| Điều kiện có cấu trúc | qua bộ lọc | ❌ |
| Giải thích được kết quả | ✅ | khó |
| Chi phí tính | rất thấp | vừa |

## Dễ nhầm

**1. Dùng hai mô hình khác nhau cho câu hỏi và tài liệu.** Số vô nghĩa.

**2. Không biết mô hình phân biệt chế độ truy vấn/tài liệu.**

**3. Dùng tìm ngữ nghĩa cho mã sản phẩm.**

**4. Bỏ qua điểm yếu phủ định.** Sai mà không hiểu vì sao.

**5. Dùng embedding cho điều kiện có cấu trúc.**

**6. Đoạn quá dài.** Embedding bị trung bình hoá.

**7. Chọn mô hình theo bảng xếp hạng tiếng Anh cho dữ liệu tiếng Việt.**

**8. Không tính bộ nhớ trước khi chọn số chiều.**

**9. Coi đổi mô hình embedding là một dòng cấu hình.**

**10. Chỉ dùng embedding để tìm kiếm.** Nó làm được nhiều hơn.

## Mẹo nhớ

> **Embedding biến "so sánh ý nghĩa" thành "đo khoảng cách".**
>
> **Nó bắt KÉM ba thứ: PHỦ ĐỊNH, MÃ/SỐ/TÊN RIÊNG, và ĐIỀU KIỆN CÓ CẤU TRÚC.**
>
> **Đổi mô hình embedding = tính lại TOÀN BỘ kho.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Embedding làm gì, và vì sao nó hữu ích cho tìm kiếm?
2. Ba loại quan hệ nó bắt tốt, ba loại nó bắt kém?
3. Vì sao đoạn quá dài làm embedding kém sắc nét?
4. Vì sao phải dùng cùng mô hình cho câu hỏi và tài liệu?
5. Năm công dụng của embedding ngoài tìm kiếm?

## Tự viết lại

Không nhìn lại, quyết định cách tìm cho từng truy vấn và giải thích:

```text
① "làm sao lấy lại mật khẩu"
② "SP-4402 còn hàng không"
③ "sản phẩm nào KHÔNG bao gồm sạc"
④ "đơn hàng của tôi trong tháng 8"
⑤ "áo khoác mùa đông cho nam"
```

Tự kiểm: ở ③, vì sao tìm bằng embedding có nguy cơ trả về đúng chủ đề mà ngược nghĩa — và bạn xử lý ra sao?

## Thử sức

Hệ thống tìm kiếm sản phẩm dùng embedding. Khách tìm "áo thun không cổ" và nhận được toàn áo thun **có** cổ.

Ba câu để trả lời: nguyên nhân ở mức cơ chế; ba cách xử lý và đánh đổi của mỗi cách; và bạn phát hiện những ca tương tự trong hệ thống bằng cách nào. Câu khó nhất: nếu bạn thêm xếp hạng lại, vì sao nó xử lý phủ định tốt hơn — điều gì khác về cách nó nhìn câu hỏi và tài liệu?
