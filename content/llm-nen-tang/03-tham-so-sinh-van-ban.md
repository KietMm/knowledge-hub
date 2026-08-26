---
title: Tham số sinh văn bản
slug: tham-so-sinh-van-ban
summary: Temperature, top-p, max tokens, stop sequence — mỗi tham số làm gì, và chọn thế nào cho từng loại việc.
level: co-ban
tags: [ai, llm, tham-so, api]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được tham số theo loại việc, và biết vì sao temperature 0 không đảm bảo kết quả giống nhau.

## Ý tưởng chính

Mô hình cho ra một **phân phối xác suất** trên các token có thể tiếp theo. Tham số sinh văn bản quyết định **cách chọn** từ phân phối đó.

Không có bộ tham số "tốt nhất". Có bộ tham số **phù hợp với loại việc**: trích xuất dữ liệu cần tính xác định; viết nội dung cần đa dạng.

## Mental model

Hãy nghĩ tới **gọi món ở một quán bạn hay tới**.

> Bạn có một danh sách món yêu thích, xếp theo mức thích: món A (thích nhất), món B, món C...
>
> **Temperature 0** = luôn gọi món A. Đáng tin, và nhàm — bạn không bao giờ thử món mới.
>
> **Temperature cao** = chọn khá ngẫu nhiên trong cả danh sách, kể cả những món bạn chỉ hơi thích. Đa dạng, và đôi khi bạn gọi phải món dở.
>
> **Top-p** = chỉ xét những món chiếm 90% mức thích của bạn, rồi chọn trong đó. Vẫn đa dạng, nhưng **không bao giờ chạm vào những món bạn gần như không thích**.

Điểm khác biệt cuối là lý do top-p thường hữu ích hơn temperature khi bạn muốn đa dạng mà không muốn kết quả kỳ lạ.

## Ví dụ nhỏ

```json
{
  "temperature": 0,
  "max_tokens": 500,
  "stop": ["\n\n---"]
}
```

## Code chạy thế nào

**Temperature — làm phẳng hay làm nhọn phân phối:**

```text
Xác suất gốc:  A 0.70   B 0.20   C 0.08   D 0.02

temperature 0    → luôn chọn A                    (tất định)
temperature 0.3  → A 0.90  B 0.09  C 0.01  ...    (nhọn hơn)
temperature 1.0  → giữ nguyên phân phối gốc
temperature 1.5  → A 0.45  B 0.28  C 0.18  D 0.09 (phẳng hơn)

⇒ Thấp = an toàn, nhất quán, lặp lại nhiều
⇒ Cao = đa dạng, sáng tạo, và nhiều khả năng đi chệch
```

**Top-p (nucleus sampling) — cắt phần đuôi:**

```text
top_p = 0.9 nghĩa là: chỉ xét những token đầu tiên có TỔNG
xác suất đạt 0,9, bỏ hết phần còn lại.

  A 0.70 → tổng 0.70
  B 0.20 → tổng 0.90  ← đủ 0.9, dừng
  C, D bị LOẠI hoàn toàn

⇒ Khác biệt quan trọng so với temperature: top-p LOẠI BỎ
  các token rất ít khả năng, thay vì chỉ giảm xác suất của chúng.
⇒ Nên temperature cao + top-p thấp cho đa dạng mà ít kết quả kỳ lạ.
```

**Chọn theo loại việc:**

```text
temperature 0        Trích xuất dữ liệu, phân loại, chuyển đổi định dạng,
                     sinh mã, trả về JSON theo schema
                     ⇒ Bạn muốn CÙNG đầu vào ra CÙNG kết quả.

temperature 0.2–0.5  Trả lời câu hỏi, tóm tắt, giải thích
                     ⇒ Cần tự nhiên, vẫn cần đáng tin.

temperature 0.7–1.0  Viết nội dung, đặt tên, sinh ý tưởng
                     ⇒ Cần đa dạng.

⇒ Điều chỉnh MỘT trong hai (temperature hoặc top-p), không cả hai.
  Điều chỉnh cả hai cùng lúc làm hiệu ứng khó dự đoán.
```

## Cú pháp

**Temperature 0 KHÔNG đảm bảo kết quả giống nhau:**

```text
Nghe như nghịch lý, nhưng có ba nguyên nhân thật:
  ① Tính toán dấu phẩy động trên GPU không hoàn toàn xác định
    theo thứ tự — hai token có xác suất rất gần nhau có thể
    đổi chỗ ([[so-thuc-va-sai-so]])
  ② Nhà cung cấp có thể cập nhật mô hình mà không đổi tên
  ③ Hạ tầng thay đổi (gộp lô request khác nhau)

⇒ Đừng thiết kế hệ thống dựa vào giả định "cùng đầu vào,
  cùng đầu ra tuyệt đối".
⇒ Muốn tất định thật thì phải CACHE kết quả, không phải
  đặt temperature 0.
```

**Max tokens — hai vai trò:**

```text
① Chặn chi phí — token đầu ra đắt hơn đầu vào
② Chặn đầu ra dài vô hạn

Cái bẫy: đầu ra bị CẮT GIỮA CÂU khi đạt giới hạn.
  ⇒ JSON không đóng ngoặc ⇒ parse thất bại
  ⇒ Phải KIỂM lý do dừng: "đạt giới hạn" khác "sinh xong"
  ⇒ Nhiều API trả về `finish_reason` — hãy đọc nó.
```

**Stop sequence — dừng đúng chỗ:**

```text
"stop": ["\n\nNgười dùng:", "```\n\n"]

Hữu ích khi:
  □ Mô hình có xu hướng tự viết tiếp lượt của người dùng
  □ Bạn chỉ cần một khối mã, không cần phần giải thích sau
  □ Bạn sinh danh sách và muốn dừng sau N mục

⇒ Rẻ hơn nhiều so với sinh dài rồi tự cắt: bạn không trả tiền
  cho phần không dùng.
```

**Hai tham số ít dùng nhưng đáng biết:**

```text
frequency_penalty   giảm xác suất token đã xuất hiện NHIỀU LẦN
presence_penalty    giảm xác suất token đã xuất hiện DÙ MỘT LẦN

⇒ Dùng khi đầu ra bị lặp — mô hình nói lại cùng một câu.
⇒ Nhưng lặp thường là dấu hiệu của một vấn đề khác:
  chỉ dẫn không rõ, hoặc ngữ cảnh mâu thuẫn. Sửa gốc trước.
```

## Tại sao cần nó

Vì tham số sai gây ra hai loại lỗi rất khác nhau, và cả hai đều khó chẩn đoán nếu không biết:

```text
Temperature CAO cho việc cần chính xác:
  → cùng một đầu vào, lúc đúng lúc sai
  → test đôi khi xanh đôi khi đỏ
  → và bạn đi tìm bug trong mã, trong khi nguyên nhân là
    một con số trong cấu hình

Temperature 0 cho việc cần đa dạng:
  → sinh 10 ý tưởng ra 10 câu gần giống nhau
  → người dùng thấy trợ lý "nhàm" và "cứng"
```

**Ba thứ nên làm trong hệ thống thật:**

```text
① Đặt tham số theo TỪNG LOẠI VIỆC, không đặt một bộ cho cả app
   ⇒ endpoint trích xuất: temperature 0
   ⇒ endpoint gợi ý nội dung: temperature 0.8

② Ghi tham số vào log cùng với đầu vào và đầu ra
   ⇒ Không có nó thì không tái hiện được một câu trả lời lạ.

③ Coi tham số là CẤU HÌNH, không hardcode
   ⇒ Điều chỉnh chúng là việc bạn sẽ làm nhiều lần khi đo chất lượng
     ([[vi-sao-danh-gia-ai-kho]]).
```

**Và với đầu ra có cấu trúc:** temperature 0 giúp, nhưng không đủ. Cách đáng tin là **bắt buộc theo schema** (nhiều nhà cung cấp hỗ trợ) rồi **xác thực lại bằng schema của bạn** ở phía nhận — vì đầu ra vẫn có thể hợp lệ về cú pháp mà sai về nội dung.

## So sánh

| Việc | temperature | Vì sao |
|---|---|---|
| Trích xuất trường từ văn bản | 0 | cần lặp lại được |
| Phân loại | 0 | cần nhất quán |
| Sinh mã | 0–0.2 | cần đúng, ít biến thể |
| Trả lời câu hỏi | 0.2–0.5 | tự nhiên nhưng đáng tin |
| Viết mô tả sản phẩm | 0.7–0.9 | cần đa dạng |
| Sinh nhiều ý tưởng | 0.8–1.0 | cần khác nhau |

## Dễ nhầm

**1. Một bộ tham số cho cả ứng dụng.**

**2. Temperature cao cho việc cần chính xác.** Test chập chờn, bug khó tìm.

**3. Tin temperature 0 là tất định tuyệt đối.**

**4. Điều chỉnh cả temperature và top-p cùng lúc.**

**5. Không kiểm `finish_reason`.** JSON bị cắt giữa câu.

**6. Max tokens quá thấp cho đầu ra có cấu trúc.**

**7. Không dùng stop sequence.** Trả tiền cho phần không dùng.

**8. Dùng penalty để chữa lặp** thay vì sửa chỉ dẫn.

**9. Không ghi tham số vào log.** Không tái hiện được.

**10. Tin đầu ra JSON hợp lệ là nội dung đúng.** Vẫn phải xác thực.

## Mẹo nhớ

> **Temperature làm PHẲNG phân phối. Top-p CẮT phần đuôi. Chỉ điều chỉnh một cái.**
>
> **Temperature 0 KHÔNG đảm bảo cùng kết quả — muốn tất định thì CACHE.**
>
> **Luôn kiểm `finish_reason`: "hết token" khác "sinh xong".**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Temperature làm gì với phân phối xác suất?
2. Top-p khác temperature ở điểm quyết định nào?
3. Ba nguyên nhân temperature 0 vẫn không tất định?
4. Hai vai trò của max tokens, và cái bẫy của nó?
5. Ba thứ nên làm trong hệ thống thật?

## Tự viết lại

Không nhìn lại, chọn tham số và giải thích cho từng endpoint:

```text
① Trích xuất địa chỉ từ văn bản tự do, trả JSON
② Tóm tắt một bài viết
③ Gợi ý 5 tiêu đề cho bài viết
④ Trả lời câu hỏi dựa trên tài liệu nội bộ
⑤ Sinh mã SQL từ câu hỏi bằng tiếng Việt
```

Tự kiểm: ở ①, ngoài temperature 0, bạn còn cần gì để đảm bảo JSON dùng được?

## Thử sức

Endpoint trích xuất thông tin từ hoá đơn hoạt động đúng 95% lần, sai 5% một cách không quy luật. Cùng một hoá đơn, thử lại có khi đúng có khi sai. Cấu hình đang dùng `temperature: 0.7`.

Ba câu để trả lời: nguyên nhân khả dĩ nhất và cách xác nhận; các thay đổi bạn làm; và bạn xử lý phần 5% còn lại thế nào **sau khi** đã sửa tham số. Câu khó nhất: nếu sau khi đặt temperature 0 mà vẫn còn khoảng 1% sai, ba nguyên nhân nào còn lại — và cái nào bạn kiểm trước?
