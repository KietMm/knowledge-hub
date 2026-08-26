---
title: Độ tương đồng và khoảng cách
slug: do-tuong-dong-va-khoang-cach
summary: Cosine, tích vô hướng, Euclid — chọn cái nào, và vì sao điểm số tuyệt đối không có ý nghĩa.
level: trung-cap
tags: [ai, embedding, so-hoc, tim-kiem]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng phép đo, và biết vì sao đặt ngưỡng cố định 0,8 là sai.

## Ý tưởng chính

Sau khi có vector, câu hỏi là **đo "gần nhau" thế nào**.

Có vài cách đo, và với vector đã chuẩn hoá thì chúng cho **cùng thứ hạng** — chỉ khác về chi phí tính. Nên chọn phép đo hiếm khi là vấn đề.

Vấn đề thật là ở chỗ khác: **điểm số tuyệt đối không có ý nghĩa cố định**, nên mọi ngưỡng phải được hiệu chỉnh.

## Mental model

Hãy nghĩ tới **hai cách so sánh hai mũi tên**.

> **Góc giữa hai mũi tên** — chúng có chỉ về cùng hướng không? Không quan tâm mũi tên dài hay ngắn. Đó là **cosine**.
>
> **Khoảng cách giữa hai đầu mũi tên** — cả hướng lẫn độ dài đều tính. Đó là **Euclid**.
>
> Nếu mọi mũi tên đều **dài đúng bằng nhau** (đã chuẩn hoá), thì hai cách đo này cho cùng một thứ tự: mũi tên nào cùng hướng nhất cũng là mũi tên có đầu gần nhất.

Đó là lý do trong thực tế, phần lớn hệ thống dùng vector chuẩn hoá và cosine — và việc chọn phép đo trở thành chuyện thứ yếu.

## Ví dụ nhỏ

```text
cosine = 1     hai vector cùng hướng hoàn toàn
cosine = 0     vuông góc — không liên quan
cosine = -1    ngược hướng

Trong thực tế với embedding văn bản, giá trị hầu như luôn
nằm trong khoảng 0,3–0,95 — hiếm khi xuống dưới 0.
```

## Code chạy thế nào

**Ba phép đo:**

```text
COSINE — góc giữa hai vector
  Bỏ qua độ dài. Mặc định cho embedding văn bản.

TÍCH VÔ HƯỚNG — cosine × độ dài của cả hai
  Với vector ĐÃ CHUẨN HOÁ, nó BẰNG cosine.
  Rẻ hơn một chút vì bỏ được bước chia.
  ⇒ Đây là lý do nhiều thư viện dùng nó khi vector đã chuẩn hoá.

EUCLID — khoảng cách giữa hai điểm
  Với vector đã chuẩn hoá, thứ hạng GIỐNG cosine.
  ⇒ Chọn cái nào cũng ra cùng kết quả.
```

```text
Kết luận thực dụng: chuẩn hoá vector, rồi dùng cosine hoặc
tích vô hướng. Đừng tốn thời gian so sánh ba phép đo —
hãy tốn thời gian vào chia đoạn và truy hồi.
```

**Vì sao điểm tuyệt đối không có ý nghĩa cố định:**

```text
Cùng một cặp "câu hỏi – đoạn liên quan":
  Mô hình A cho cosine 0,87
  Mô hình B cho cosine 0,62
⇒ Cả hai đều đúng. Chúng chỉ có thang khác nhau.

Và trong CÙNG một mô hình, thang cũng khác theo miền dữ liệu:
  Tài liệu kỹ thuật đồng nhất ⇒ mọi cặp đều có điểm cao
  Tài liệu đa dạng             ⇒ điểm trải rộng hơn

⇒ Ngưỡng 0,8 sao chép từ một hướng dẫn trên mạng gần như
  chắc chắn không đúng cho hệ thống của bạn.
```

**Cách hiệu chỉnh ngưỡng — bằng dữ liệu của bạn:**

```text
① Lấy 50 cặp câu hỏi – đoạn ĐÚNG. Ghi điểm.
② Lấy 50 cặp câu hỏi – đoạn KHÔNG liên quan. Ghi điểm.
③ Vẽ hai phân phối. Chọn ngưỡng ở chỗ tách chúng tốt nhất.
④ Kiểm lại: ngưỡng đó bỏ sót bao nhiêu ca đúng, cho lọt
  bao nhiêu ca sai?

⇒ Và nhớ: đổi mô hình embedding ⇒ HIỆU CHỈNH LẠI ngưỡng.
```

## Cú pháp

**Ngưỡng dùng để làm gì — và một cách tốt hơn:**

```text
Công dụng chính của ngưỡng: biết khi nào KHÔNG CÓ đoạn nào
đủ liên quan ⇒ trả lời "không tìm thấy" thay vì đưa đoạn
vô nghĩa vào ngữ cảnh ([[tao-cau-tra-loi-va-trich-dan]]).

Nhưng ngưỡng tuyệt đối giòn. Hai cách bền hơn:

① NGƯỠNG TƯƠNG ĐỐI
   Giữ đoạn có điểm ≥ 80% điểm của đoạn cao nhất.
   ⇒ Tự thích nghi với từng câu hỏi.

② DÙNG XẾP HẠNG LẠI để quyết định
   Mô hình xếp hạng lại cho điểm có ý nghĩa hơn nhiều,
   vì nó nhìn câu hỏi và đoạn cùng lúc.
   ⇒ Đặt ngưỡng trên điểm đó đáng tin hơn
     ([[truy-hoi-va-xep-hang-lai]]).
```

**Hiện tượng "mọi thứ đều giống nhau" ở số chiều cao:**

```text
Trong không gian rất nhiều chiều, khoảng cách giữa các điểm
ngẫu nhiên có xu hướng gần bằng nhau.

⇒ Hệ quả thực tế: chênh lệch điểm giữa đoạn thứ nhất và đoạn
  thứ mười có thể rất nhỏ (0,84 và 0,81).
⇒ Đừng đọc con số đó như "gần bằng nhau về mức liên quan".
  Trong thang hẹp đó, khác biệt nhỏ vẫn có ý nghĩa.
⇒ Và đây là lý do THỨ HẠNG đáng tin hơn ĐIỂM SỐ.
```

**Chuẩn hoá — hai điều cần nhớ:**

```text
① Nhiều mô hình đã trả về vector chuẩn hoá sẵn. Kiểm trước khi
  tự chuẩn hoá lại — làm hai lần không sai nhưng thừa.
② Nếu tự chuẩn hoá: phải chuẩn hoá CẢ hai phía, và cả lúc nạp
  dữ liệu lẫn lúc truy vấn.
  ⇒ Chuẩn hoá một phía là lỗi cho ra kết quả sai lệch mà
    không có thông báo nào.
```

## Tại sao cần nó

Vì hiểu sai về điểm số dẫn tới ba quyết định sai:

```text
① Đặt ngưỡng cố định sao chép từ nơi khác
   ⇒ Quá cao: hệ thống nói "không tìm thấy" cho câu có đáp án.
   ⇒ Quá thấp: đoạn không liên quan lọt vào ngữ cảnh.

② So sánh điểm giữa hai mô hình để chọn mô hình
   ⇒ Vô nghĩa. Phải so THỨ HẠNG và recall@k, không so điểm
     ([[danh-gia-he-thong-rag]]).

③ Hiển thị "độ liên quan 87%" cho người dùng
   ⇒ Con số đó không có ý nghĩa với họ, và nó gợi ý một mức
     chính xác không có thật.
```

**Ba việc nên làm:**

```text
□ Chuẩn hoá vector, dùng cosine hoặc tích vô hướng
□ Hiệu chỉnh ngưỡng bằng dữ liệu của mình, ghi lại con số
  và lý do
□ Ưu tiên ngưỡng TƯƠNG ĐỐI, hoặc dựa vào điểm của bước
  xếp hạng lại
```

**Và một điều đáng nhớ về mức độ quan trọng:** trong toàn bộ hệ thống RAG, việc chọn phép đo khoảng cách gần như không bao giờ là nguyên nhân của vấn đề. Nếu bạn đang cân nhắc giữa cosine và Euclid trong khi chưa đo recall@k, bạn đang tối ưu sai chỗ.

## So sánh

| | Cosine | Tích vô hướng | Euclid |
|---|---|---|---|
| Quan tâm độ dài | ❌ | ✅ | ✅ |
| Với vector chuẩn hoá | — | = cosine | cùng thứ hạng |
| Chi phí tính | vừa | thấp nhất | vừa |
| Dùng cho embedding văn bản | ✅ mặc định | ✅ | ✅ |

## Dễ nhầm

**1. Đặt ngưỡng cố định sao chép từ nơi khác.**

**2. So sánh điểm giữa hai mô hình.** Thang khác nhau.

**3. Không hiệu chỉnh lại ngưỡng khi đổi mô hình.**

**4. Đọc chênh lệch điểm nhỏ là "gần như nhau".**

**5. Hiển thị điểm cho người dùng như một tỉ lệ phần trăm.**

**6. Chuẩn hoá một phía.** Kết quả sai lệch, không có lỗi.

**7. Chuẩn hoá lại vector đã chuẩn hoá sẵn.** Thừa.

**8. Tốn thời gian chọn phép đo** trước khi đo recall@k.

**9. Không có ngưỡng nào.** Đoạn vô nghĩa vẫn vào ngữ cảnh.

**10. Dùng ngưỡng tuyệt đối cho mọi loại câu hỏi.**

## Mẹo nhớ

> **Chuẩn hoá vector ⇒ cosine, tích vô hướng, Euclid cho CÙNG thứ hạng.**
>
> **Điểm tuyệt đối KHÔNG có ý nghĩa cố định — phải hiệu chỉnh bằng dữ liệu của bạn.**
>
> **THỨ HẠNG đáng tin hơn ĐIỂM SỐ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba phép đo, và vì sao với vector chuẩn hoá chúng cho cùng thứ hạng?
2. Vì sao điểm 0,87 của mô hình A không so được với 0,62 của mô hình B?
3. Bốn bước hiệu chỉnh ngưỡng?
4. Hai cách bền hơn ngưỡng tuyệt đối?
5. Vì sao chênh lệch điểm nhỏ vẫn có ý nghĩa?

## Tự viết lại

Không nhìn lại, viết cách xác định ngưỡng "không tìm thấy" cho hệ thống RAG của bạn:

```text
① dữ liệu cần chuẩn bị
② quy trình hiệu chỉnh
③ dùng ngưỡng tuyệt đối hay tương đối, vì sao
④ khi nào phải hiệu chỉnh lại
```

Tự kiểm: nếu ngưỡng của bạn bỏ sót 10% ca đúng và cho lọt 5% ca sai, bạn chỉnh nó theo hướng nào — và điều đó phụ thuộc vào gì?

## Thử sức

Đội sao chép ngưỡng 0,75 từ một bài hướng dẫn. Kết quả: hệ thống nói "không tìm thấy thông tin" cho khoảng 40% câu hỏi mà tài liệu **có** câu trả lời.

Ba câu để trả lời: nguyên nhân; quy trình hiệu chỉnh lại; và bạn kiểm tra kết quả bằng chỉ số nào. Câu khó nhất: sau khi hạ ngưỡng, tỉ lệ "không tìm thấy" về 5% nhưng số câu trả lời sai tăng lên — bạn cân bằng hai thứ này thế nào, và điều gì trong nghiệp vụ quyết định điểm cân bằng đó?
