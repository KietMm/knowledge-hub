---
title: Đánh giá và tiến hoá kiến trúc
slug: danh-gia-va-tien-hoa-kien-truc
summary: Đo kiến trúc bằng gì, nhận ra khi nào nó không còn phù hợp, và đổi mà không dừng phát triển.
level: nang-cao
tags: [kien-truc, danh-gia, refactor, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** đo được chất lượng kiến trúc bằng chỉ số quan sát được, và đổi nó theo từng bước có thể dừng.

## Ý tưởng chính

Không có kiến trúc "đúng" — chỉ có kiến trúc **phù hợp với ràng buộc hiện tại**. Và ràng buộc thay đổi: đội lớn lên, tải tăng, nghiệp vụ đổi hướng.

Nên câu hỏi không phải "kiến trúc này tốt không" mà **"nó còn phục vụ được nhu cầu hiện tại không"** — và đó là câu hỏi trả lời được bằng số.

## Mental model

Hãy nghĩ tới **quần áo của một đứa trẻ đang lớn**.

> Bộ quần áo vừa vặn năm ngoái không có gì sai. Nó **vẫn đúng như lúc mua**.
>
> Nhưng đứa trẻ đã lớn. Và dấu hiệu không phải là "bộ quần áo xấu" — nó là những thứ **quan sát được**: tay áo ngắn, cúc căng, mặc vào mất nhiều thời gian hơn.
>
> Và bạn không đợi tới lúc không mặc vào được nữa mới mua bộ mới. Cũng không mua sẵn bộ cỡ người lớn cho đứa trẻ ba tuổi.

Cả hai lỗi đều có thật trong kiến trúc: **để quá lâu** cho tới lúc mọi thay đổi đều đau, và **chuẩn bị cho quy mô chưa có** rồi trả chi phí suốt thời gian chờ.

## Ví dụ nhỏ

```text
Chỉ số quan sát được, không phải cảm giác:
  Thời gian từ ý tưởng tới production
  Số file phải sửa cho một tính năng điển hình
  Thời gian CI
  Số lần một thay đổi làm hỏng chỗ không liên quan
```

## Code chạy thế nào

**Bốn chỉ số đo được kiến trúc:**

```text
① THỜI GIAN GIAO MỘT TÍNH NĂNG NHỎ
   Tăng dần theo tháng ⇒ kiến trúc đang cản.
   Đây là chỉ số tổng hợp nhất và khó gian lận nhất.

② SỐ FILE / MODULE PHẢI SỬA cho một thay đổi điển hình
   1–3 file: ranh giới tốt.
   10+ file rải rác: ranh giới sai chỗ.

③ THỜI GIAN TỪ SỬA TỚI BIẾT ĐÚNG/SAI
   Chạy được test cho phần vừa sửa trong bao lâu?
   Vài giây: tốt. 20 phút: kiến trúc buộc bạn test cả hệ thống.

④ SỐ LẦN THAY ĐỔI GÂY HỎNG CHỖ KHÔNG LIÊN QUAN
   Cao ⇒ kết dính ngầm giữa các phần
   ⇒ ranh giới chỉ tồn tại trên giấy.
```

Bốn chỉ số này đều **quan sát được từ dữ liệu có sẵn**: lịch sử git, log CI, danh sách sự cố. Không cần khảo sát ý kiến ai.

**Bốn triệu chứng và ranh giới sai ở đâu:**

```text
"Mọi tính năng đều phải sửa file X"
  ⇒ X đang giữ quá nhiều trách nhiệm ⇒ tách theo trục thay đổi

"Hai đội luôn xung đột ở cùng một chỗ"
  ⇒ ranh giới MÃ không khớp ranh giới ĐỘI ⇒ vẽ lại theo đội

"Không test được phần này mà không dựng cả hệ thống"
  ⇒ nghiệp vụ dính hạ tầng ([[layered-va-hexagonal]])

"Không ai dám xoá code cũ"
  ⇒ không biết ai đang dùng ⇒ thiếu ranh giới rõ và thiếu đo lường
```

**Và bốn triệu chứng của kiến trúc quá đà:**

```text
"15 file cho một endpoint CRUD"
"Người mới mất một tuần mới hiểu một luồng"
"Nhiều interface có đúng một cài đặt"
"Không ai nói được lợi ích cụ thể của tầng gián tiếp này"
```

Cả hai nhóm đều là vấn đề. Nhóm thứ hai ít được thừa nhận hơn vì nó trông giống sự cẩn thận.

## Cú pháp

**Đổi kiến trúc — bốn quy tắc:**

```text
① TỪNG BƯỚC, mỗi bước GIAO ĐƯỢC
   ❌ "Dự án tái kiến trúc 6 tháng"
      ⇒ không giao gì suốt 6 tháng, và ranh giới mới vẫn do đoán
   ✅ Mỗi bước 1–2 tuần, merge được, dừng được giữa đường
      mà hệ thống vẫn chạy

② SONG SONG, ĐỪNG THAY THẾ MỘT LẦN
   Dựng cái mới cạnh cái cũ. Chuyển traffic dần.
   Có vấn đề ⇒ chuyển về, không phải quay lui một dự án.

③ ĐO TRƯỚC VÀ SAU
   Không đo thì không biết có tốt hơn — và không thuyết phục
   được ai cho lần sau.

④ CÓ ĐIỀU KIỆN DỪNG
   "Nếu sau 3 module mà chỉ số không cải thiện, ta dừng và
    xem lại." ⇒ tránh việc đi tới cùng chỉ vì đã bỏ nhiều công.
```

**Mẫu strangler fig — cách chuyển an toàn nhất:**

```text
① Đặt một lớp định tuyến trước hệ thống cũ
② Viết phần mới cho MỘT tính năng, định tuyến tính năng đó sang mới
③ Cũ và mới chạy song song, cùng phục vụ
④ Chuyển dần từng tính năng
⑤ Phần cũ teo lại dần rồi xoá

Lợi ích quyết định: MỖI BƯỚC ĐỀU QUAY LUI ĐƯỢC.
Và bạn học được về ranh giới đúng TRONG KHI làm, thay vì
phải đoán hết từ đầu.
```

Đây cũng là lý do cách này thắng "viết lại từ đầu": viết lại đòi bạn biết trước mọi thứ, và bạn không biết ([[trien-khai-an-toan]]).

**Ba thứ không được đổi cùng lúc:**

```text
Đổi kiến trúc VÀ đổi công nghệ VÀ thêm tính năng
  ⇒ Hỏng thì không biết vì cái nào.
  ⇒ Và nó sẽ hỏng.

⇒ Một lần đổi một trục. Kiến trúc trước, công nghệ sau,
  hoặc ngược lại — nhưng không cùng lúc.
```

**Kiến trúc phải chịu được sự thật là bạn sẽ đoán sai:**

```text
Ranh giới đầu tiên bạn vẽ gần như chắc chắn sai một phần —
vì lúc đó bạn hiểu nghiệp vụ ít nhất.

⇒ Nên tiêu chí chọn không phải "ranh giới đúng nhất"
  mà "ranh giới DỄ SỬA nhất khi biết mình sai".

⇒ Đó là một lập luận mạnh cho monolith mô-đun so với
  microservices ở giai đoạn đầu: vẽ lại ranh giới trong một
  codebase là một PR; vẽ lại giữa hai service là một dự án
  ([[ranh-gioi-service]]).
```

## Tại sao cần nó

Vì cả hai hướng sai đều tốn kém, và chúng cần cách nhận biết khác nhau:

```text
ĐỔI QUÁ MUỘN:
  Mỗi tính năng chậm dần. Không có thời điểm nào "đủ đau để dừng lại".
  Người giỏi rời đi. Và lúc quyết định đổi thì việc đã rất lớn.
  ⇒ Nhận biết bằng chỉ số ① và ②, theo dõi theo THỜI GIAN.

ĐỔI QUÁ SỚM / QUÁ NHIỀU:
  Trả phức tạp ngay, nhận lợi ích có thể không bao giờ tới.
  ⇒ Nhận biết bằng câu hỏi: "vấn đề này tôi ĐANG CÓ chưa?"
```

**Viết lại lý do — và điều kiện xem lại:**

```text
Mỗi quyết định kiến trúc nên ghi kèm GIẢ ĐỊNH:

  "Chọn monolith mô-đun vì: đội 6 người, một sản phẩm,
   dưới 1.000 req/s.
   Xem lại khi: đội quá 15 người, hoặc có hai sản phẩm
   với nhịp phát hành khác nhau."

⇒ Sáu tháng sau, không tranh luận lại từ đầu.
  Chỉ kiểm: giả định còn đúng không? ([[ra-quyet-dinh-ky-thuat]])
```

Đây là thứ biến kiến trúc từ một cuộc tranh luận định kỳ thành một thứ có thể **rà soát** — và điều kiện xem lại được viết ra là phần có giá trị nhất, không phải kết luận.

## So sánh

| | Viết lại từ đầu | Strangler fig |
|---|---|---|
| Giao được giữa đường | ❌ | ✅ |
| Quay lui | cả dự án | từng tính năng |
| Cần biết trước ranh giới | ✅ toàn bộ | học dần |
| Rủi ro | rất cao | thấp |
| Thời gian tới lợi ích đầu tiên | dài | ngắn |

## Dễ nhầm

**1. Đánh giá kiến trúc bằng cảm giác.** Dùng bốn chỉ số.

**2. Không theo dõi chỉ số theo thời gian.** Xu hướng mới nói lên vấn đề.

**3. Viết lại từ đầu.** Không giao gì trong nhiều tháng.

**4. Đổi kiến trúc, công nghệ, và tính năng cùng lúc.**

**5. Không có điều kiện dừng.** Đi tới cùng vì đã bỏ nhiều công.

**6. Không đo trước và sau.** Không biết có tốt hơn.

**7. Chọn "ranh giới đúng nhất" thay vì "dễ sửa nhất".**

**8. Không ghi giả định.** Tranh luận lại mỗi sáu tháng.

**9. Bỏ qua triệu chứng quá đà.** Nó trông giống cẩn thận.

**10. Vẽ ranh giới mã không khớp ranh giới đội.** Xung đột mãi.

## Mẹo nhớ

> **Không có kiến trúc đúng — chỉ có kiến trúc PHÙ HỢP với ràng buộc hiện tại.**
>
> **Chọn ranh giới DỄ SỬA nhất, không phải đúng nhất — bạn sẽ đoán sai.**
>
> **Đổi từng bước, mỗi bước GIAO ĐƯỢC và QUAY LUI ĐƯỢC.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn chỉ số đo kiến trúc?
2. Bốn triệu chứng ranh giới sai, và bốn triệu chứng quá đà?
3. Bốn quy tắc khi đổi kiến trúc?
4. Strangler fig hoạt động thế nào, lợi ích quyết định là gì?
5. Vì sao nên chọn ranh giới dễ sửa thay vì đúng nhất?

## Tự viết lại

Không nhìn lại, viết đánh giá cho một hệ thống bạn biết:

```text
① bốn chỉ số hiện tại, ước lượng cụ thể
② triệu chứng rõ nhất
③ một thay đổi kiến trúc đề xuất, chia thành các bước 1–2 tuần
④ đo gì trước và sau
⑤ điều kiện dừng
```

Tự kiểm: bước đầu tiên ở ③ của bạn có giao được giá trị gì cho người dùng, hay nó chỉ là "chuẩn bị"?

## Thử sức

Monolith 4 năm tuổi, 15 kỹ sư. Deploy 50 phút, CI 25 phút, mọi tính năng chạm ít nhất 8 file, và tháng nào cũng có một sự cố kiểu "sửa A làm hỏng B".

Ba câu để trả lời: bạn đo gì trong hai tuần đầu để có căn cứ; bạn đề xuất thay đổi gì, chia bước thế nào; và bạn thuyết phục đội và sếp bằng lập luận nào. Câu khó nhất: trong bốn triệu chứng nêu trên, cái nào có cách sửa **rẻ nhất mà không đụng tới kiến trúc** — và làm nó trước có đổi kết luận của bạn không?
