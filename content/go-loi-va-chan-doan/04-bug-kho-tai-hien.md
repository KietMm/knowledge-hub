---
title: Bug khó tái hiện
slug: bug-kho-tai-hien
summary: Bug chỉ xảy ra ở production, một lần trong nghìn lần, hoặc biến mất khi bạn nhìn vào — bốn nguyên nhân và cách vây bắt.
level: nang-cao
tags: [go-loi, race-condition, phuong-phap, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra bốn nguyên nhân điển hình của bug không tái hiện được, và có chiến lược vây bắt thay vì chờ may mắn.

## Ý tưởng chính

Bug tái hiện được là bug đã gần như xong. Bug **không** tái hiện được đòi một cách làm khác: thay vì gây ra nó, bạn **dựng bẫy** rồi chờ.

Và điểm khởi đầu quan trọng: "không tái hiện được" không phải một tính chất huyền bí. Nó luôn có nghĩa là **có một biến bạn chưa kiểm soát** — và bốn nhóm biến dưới đây chiếm gần hết.

## Mental model

Hãy nghĩ tới **tiếng kêu lạ trong xe, chỉ xuất hiện đôi khi**.

> Bạn mang ra gara. Thợ chạy thử 20 phút, không nghe gì. "Xe bình thường mà."
>
> Nhưng tiếng kêu có thật. Chỉ là nó cần **điều kiện**: trời lạnh, xe chạy trên 60 km/h, và đã đi được 20 phút.
>
> Người thợ giỏi không nói "không tái hiện được". Họ **gắn thiết bị ghi âm vào xe** và cho bạn lái về. Lần sau có tiếng kêu, họ có bản ghi kèm tốc độ, nhiệt độ, vòng tua.

Đó là chiến lược của bài này: khi không gây ra được bug, hãy **tăng khả năng quan sát** rồi để bug tự đến.

## Ví dụ nhỏ

```text
Máy dev              Production
1 người dùng      →  1.000 đồng thời
dữ liệu 100 dòng  →  10 triệu dòng
CSDL localhost    →  qua mạng, đôi lúc chậm
1 tiến trình      →  8 tiến trình
```

## Code chạy thế nào

**Bốn nhóm nguyên nhân — kiểm theo thứ tự này:**

```text
① ĐỒNG THỜI          hai request chen vào nhau
   Dấu hiệu: chỉ xảy ra khi có tải; hết khi thêm log (log làm chậm
             và thay đổi thời điểm)
   Kiểm:     chạy N thao tác song song rồi kiểm bất biến
             ([[dong-bo-hoa-va-race-condition]])

② TRẠNG THÁI TÍCH LUỸ  rò rỉ bộ nhớ, kết nối, fd, cache phình
   Dấu hiệu: hỏng sau vài giờ; restart là hết
   Kiểm:     đo RSS, số fd, độ dài hàng đợi theo thời gian

③ DỮ LIỆU            một bản ghi có hình dạng đặc biệt
   Dấu hiệu: chỉ hỏng với một số người dùng, luôn hỏng với họ
   Kiểm:     tìm điểm chung của các bản ghi hỏng

④ MÔI TRƯỜNG         múi giờ, locale, phiên bản, cấu hình, DNS
   Dấu hiệu: hỏng ở production, không hỏng ở dev; hoặc hỏng
             lúc nửa đêm / đầu tháng
   Kiểm:     liệt kê MỌI khác biệt, bỏ dần từng cái
```

**Nhóm ③ đáng chú ý vì nó thường bị xếp nhầm:** "chỉ 1% người dùng" nghe như ngẫu nhiên, nhưng nếu **luôn** hỏng với đúng 1% đó thì nó hoàn toàn xác định — chỉ cần tìm ra điểm chung.

```text
Phân biệt nhanh:
  Cùng người dùng, thử lại thì đôi khi được đôi khi không → ① hoặc ②
  Cùng người dùng, LUÔN hỏng                              → ③
```

**Heisenbug — bug biến mất khi bạn nhìn vào:**

```text
Thêm log ⇒ bug hết.  Đặt breakpoint ⇒ bug hết.

Nguyên nhân gần như luôn là ①: log và breakpoint thay đổi
THỜI ĐIỂM, và bug phụ thuộc thời điểm.

⇒ Bản thân hiện tượng này là MỘT MANH MỐI mạnh, không phải trở ngại.
  Nó gần như xác nhận đây là vấn đề đồng thời.
```

## Cú pháp

**Chiến lược vây bắt — bốn bước:**

```text
① TĂNG KHẢ NĂNG QUAN SÁT trước, đừng cố tái hiện trước
   Thêm log có cấu trúc quanh vùng nghi ngờ, kèm traceId
   và mọi biến có thể liên quan.
   ⇒ Lần sau bug xảy ra, bạn có bản ghi thay vì lời kể.

② GHI LẠI ĐIỀU KIỆN đầy đủ mỗi lần bug xuất hiện
   Thời gian, người dùng, dữ liệu, phiên bản, tải lúc đó.
   ⇒ Sau 5–10 lần, ĐIỂM CHUNG lộ ra.
   ⇒ Đây là bước thay thế cho việc tái hiện.

③ KHUẾCH ĐẠI điều kiện nghi ngờ
   Nghi đồng thời → chạy 1.000 request song song
   Nghi tích luỹ → chạy tải liên tục vài giờ (soak test)
   Nghi dữ liệu → tải dữ liệu production (đã che thông tin) về thử
   Nghi thời gian → đặt đồng hồ hệ thống sang 23:59 ngày 31

④ THU HẸP THEO THỜI GIAN
   `git bisect` nếu biết mốc "trước đó còn chạy".
```

Bước ③ là chỗ nhiều bug "không tái hiện được" đầu hàng: chúng không phải không tái hiện được — chúng chỉ cần **điều kiện đủ mạnh**.

**Ba biến hay bị bỏ qua nhất:**

```text
MÚI GIỜ
  Server UTC, người dùng UTC+7.
  ⇒ Bug "chỉ xảy ra sau 5 giờ chiều" = bug đổi ngày.
  ⇒ Kiểm: mọi phép tính ngày có nói rõ múi giờ chưa?

THỜI GIAN CỤ THỂ
  Ngày 31 (tháng có 30 ngày), 29/2, đầu tháng, cuối năm,
  giờ đổi sang giờ mùa hè.
  ⇒ Bug "mỗi tháng một lần" gần như luôn thuộc nhóm này.

DỮ LIỆU ĐẶC BIỆT
  Chuỗi rỗng, tên có emoji, tên rất dài, số 0, giá trị null,
  dấu nháy đơn trong tên, ký tự Unicode ghép
  ([[unicode-va-encoding]]).
```

Ba biến này chiếm một tỉ lệ đáng kể các bug "kỳ lạ", và cả ba đều **không xuất hiện** trong dữ liệu thử của bạn.

**Bốn công cụ hợp với loại bug này:**

```text
□ Log có cấu trúc + traceId — nền tảng, không có thì mọi thứ khác vô nghĩa
□ Feature flag để bật log chi tiết cho MỘT người dùng
  ⇒ chi tiết cao mà không tốn hoá đơn log
□ Ghi lại request (một tỉ lệ nhỏ) để phát lại sau
□ Cảnh báo trên BẤT BIẾN, không chỉ trên lỗi
  ⇒ "số dư không được âm", "tổng đơn phải bằng tổng dòng"
  ⇒ Bug hỏng dữ liệu KHÔNG sinh ra lỗi nào; chỉ bất biến bắt được nó
```

Điểm cuối là thứ đáng đầu tư nhất: nó chuyển một lớp bug từ "phát hiện sau vài tuần khi đối soát" sang "cảnh báo trong vài phút".

## Tại sao cần nó

Vì phản xạ tự nhiên với loại bug này đều dẫn tới chỗ tệ hơn:

```text
"Không tái hiện được" → đóng ticket
  ⇒ Nó quay lại. Và lần này khách hàng đã mất kiên nhẫn.

"Thêm try/catch cho chắc"
  ⇒ Bug vẫn còn, chỉ im lặng hơn. Bạn vừa xoá mất manh mối duy nhất.

"Restart mỗi đêm cho hết"
  ⇒ Che rò rỉ. Và rò rỉ vẫn lớn dần cho tới khi một đêm không đủ.
```

**Chấp nhận không tìm ra — có luật:**

```text
Đôi khi chi phí tìm lớn hơn chi phí chịu. Nhưng phải làm ba việc:

  ① GIẢM THIỆT HẠI: retry, dự phòng, hoặc thông báo rõ cho người dùng
  ② THÊM QUAN SÁT: lần sau xảy ra thì có dữ liệu
  ③ GHI LẠI: một ticket có mô tả và các lần xuất hiện đã biết,
     để người sau không bắt đầu từ số 0

Bỏ qua hoàn toàn thì lần sau ai đó lại điều tra từ đầu.
```

## So sánh

| Dấu hiệu | Nguyên nhân khả dĩ | Kiểm bằng |
|---|---|---|
| Chỉ khi có tải | đồng thời | chạy song song |
| Hết khi thêm log | đồng thời | — (bản thân là manh mối) |
| Sau vài giờ | tích luỹ | đo RSS, fd theo thời gian |
| Restart là hết | tích luỹ | như trên |
| Một số người dùng, luôn hỏng | dữ liệu | tìm điểm chung |
| Mỗi tháng một lần | thời gian/ngày tháng | đặt đồng hồ |
| Chỉ ở production | môi trường | liệt kê khác biệt |

## Dễ nhầm

**1. Đóng ticket vì "không tái hiện được".** Nó sẽ quay lại.

**2. Thêm `try/catch` để bug im lặng.** Xoá mất manh mối.

**3. Restart định kỳ để che rò rỉ.**

**4. Cố tái hiện trước khi tăng khả năng quan sát.** Ngược thứ tự.

**5. Không ghi lại điều kiện mỗi lần xảy ra.** Không tìm ra điểm chung.

**6. Coi "hết khi thêm log" là trở ngại.** Đó là manh mối mạnh.

**7. Bỏ qua múi giờ.**

**8. Thử với dữ liệu sạch.** Dữ liệu thật có emoji, chuỗi rỗng, giá trị null.

**9. Chỉ cảnh báo trên lỗi.** Bug hỏng dữ liệu không sinh lỗi nào.

**10. Xếp "1% người dùng" vào nhóm ngẫu nhiên** khi nó có thể hoàn toàn xác định.

## Mẹo nhớ

> **"Không tái hiện được" = có một BIẾN bạn chưa kiểm soát. Bốn nhóm: đồng thời, tích luỹ, dữ liệu, môi trường.**
>
> **Tăng QUAN SÁT trước, tái hiện sau. Ghi điều kiện mỗi lần xảy ra.**
>
> **Cảnh báo trên BẤT BIẾN — bug hỏng dữ liệu không sinh lỗi nào.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn nhóm nguyên nhân, dấu hiệu nhận biết từng nhóm?
2. Phân biệt nhóm "đồng thời" với nhóm "dữ liệu" bằng câu hỏi nào?
3. Vì sao "hết khi thêm log" là manh mối chứ không phải trở ngại?
4. Bốn bước vây bắt, bước nào đi trước việc tái hiện?
5. Nếu quyết định không tìm nữa, ba việc phải làm?

## Tự viết lại

Bug: *"Đôi khi đơn hàng bị trừ tồn kho hai lần. Khoảng một lần mỗi ngày, không theo quy luật."*

Không nhìn lại, viết:

```text
① nhóm nguyên nhân bạn nghi nhất, vì sao
② log và số liệu cần thêm
③ cách khuếch đại để tái hiện
④ một cảnh báo trên bất biến
```

Tự kiểm: bất biến ở ④ của bạn có phát hiện được các trường hợp **đã xảy ra trong quá khứ** không, hay chỉ các trường hợp mới?

## Thử sức

Ba tuần nay, khoảng 0,3% giao dịch thanh toán bị ghi nhận hai lần. Không tái hiện được ở staging. Không có log chi tiết ở luồng đó.

Ba câu để trả lời: bạn làm gì **trong ngày đầu tiên** — và vì sao đó không phải là "cố tái hiện"; bạn giảm thiệt hại cho người dùng thế nào **trong lúc chưa tìm ra**; và bạn dựng bẫy gì để lần sau có đủ dữ liệu. Câu khó nhất: 0,3% — nếu con số này **tăng theo lưu lượng**, điều đó chỉ ra nhóm nguyên nhân nào và loại bỏ nhóm nào?
