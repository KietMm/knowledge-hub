---
title: Gỡ lỗi như một quy trình
slug: go-loi-nhu-mot-quy-trinh
summary: Thay đoán mò bằng vòng lặp giả thuyết — quan sát, dự đoán, kiểm chứng, thu hẹp.
level: co-ban
tags: [go-loi, phuong-phap, tu-duy]
khung: v2
---

> **Sau bài này bạn sẽ:** có một vòng lặp cố định để chạy khi gặp bug, thay vì thử ngẫu nhiên tới lúc may mắn.

## Ý tưởng chính

Gỡ lỗi không phải tài năng. Nó là **một quy trình**: thu hẹp không gian tìm kiếm bằng cách đặt giả thuyết và kiểm chứng từng cái.

Người gỡ lỗi giỏi không đoán đúng hơn. Họ **loại trừ nhanh hơn** — và họ không bao giờ sửa gì trước khi biết chắc nguyên nhân.

## Mental model

Hãy nghĩ tới **trò chơi đoán số từ 1 tới 1000**.

> Đoán ngẫu nhiên: trung bình 500 lượt.
>
> Đoán 500, được trả lời "nhỏ hơn" ⇒ còn 500 số. Đoán 250 ⇒ còn 250. **Mười lượt là ra**, dù bắt đầu với 1000 khả năng.
>
> Điều làm nó hiệu quả không phải đoán khéo, mà là **mỗi lượt đoán loại bỏ một nửa**.

Sửa code rồi xem có hết bug không là "đoán ngẫu nhiên". Đặt một giả thuyết và kiểm nó bằng một phép đo là "chia đôi". Khác biệt giữa hai cách là hàng giờ.

## Ví dụ nhỏ

```text
Giả thuyết: "Truy vấn trả về mảng rỗng."
Kiểm:       log số dòng trả về ngay sau truy vấn.
Kết quả:    12 dòng ⇒ giả thuyết SAI, loại bỏ. Đi tiếp.
```

## Code chạy thế nào

**Vòng lặp năm bước:**

```text
① TÁI HIỆN
   Tìm cách gây ra bug MỘT CÁCH ĐÁNG TIN CẬY.
   Không tái hiện được ⇒ không biết mình đã sửa hay chưa.

② THU HẸP
   Bug ở tầng nào? Frontend hay backend? Trước hay sau CSDL?
   Mỗi câu trả lời cắt đôi không gian tìm kiếm.

③ ĐẶT GIẢ THUYẾT — cụ thể và KIỂM ĐƯỢC
   ❌ "Có gì đó sai trong hàm xử lý đơn hàng"
   ✅ "Hàm nhận `soLuong` là chuỗi thay vì số"

④ KIỂM CHỨNG bằng phép đo NHỎ NHẤT
   Một dòng log, một breakpoint, một truy vấn.
   KHÔNG sửa gì ở bước này.

⑤ Sai giả thuyết ⇒ về ③.  Đúng ⇒ sửa, rồi kiểm lại từ ①.
```

**Vì sao bước ① không được bỏ:**

```text
Không tái hiện được mà vẫn sửa:
  → bạn thay đổi mã dựa trên phỏng đoán
  → bug "hết" (hoặc chỉ trở nên hiếm hơn)
  → nó quay lại sau ba tuần, và giờ có thêm một thay đổi
    không cần thiết trong mã

⇒ Thời gian bỏ ra để tái hiện gần như luôn được hoàn lại.
```

Và tái hiện được cho bạn một thứ nữa: **một test**. Bug tái hiện được là bug viết được test cho nó, và test đó ngăn nó quay lại ([[tdd-trong-thuc-te]]).

## Cú pháp

**Chia đôi trong thực tế — bốn cách áp dụng:**

```text
① THEO TẦNG
   Log ở biên mỗi tầng: request vào, ra khỏi service, vào CSDL.
   Dữ liệu đúng tới đâu, sai từ đâu?

② THEO THỜI GIAN — `git bisect`
   "Tuần trước còn chạy" ⇒ để git tìm commit gây ra.
   20 commit → 5 lần thử. 1000 commit → 10 lần thử.

③ THEO DỮ LIỆU
   Hỏng với mọi bản ghi, hay chỉ một số? Cái nào khác biệt?

④ THEO CẤU HÌNH
   Chạy ở dev, hỏng ở production ⇒ khác biệt nào?
   Bỏ dần từng khác biệt cho tới khi bug xuất hiện ở dev.
```

```bash
git bisect start
git bisect bad                 # hiện tại hỏng
git bisect good v1.4.0         # bản này còn tốt
# git tự checkout điểm giữa; bạn thử rồi báo good/bad
git bisect good
git bisect reset
```

`git bisect` là công cụ bị đánh giá thấp nhất trong bộ này: nó biến "bug này từ đâu ra" thành một tìm kiếm nhị phân có kết quả xác định.

**Bốn câu hỏi đầu tiên cho mọi bug:**

```text
① VỪA THAY ĐỔI GÌ?      deploy, config, dữ liệu, phiên bản thư viện,
                        hay một dịch vụ bên ngoài
                        ⇒ ~80% bug có một thay đổi đứng ngay trước nó
② HỎNG VỚI AI?          mọi người, một nhóm, hay một người?
③ TỪ KHI NÀO?           luôn hỏng, hay từ một thời điểm?
④ SỐ LIỆU NÓI GÌ?       log, metric, trace ở khoảng thời gian đó
```

Câu ① có tỉ lệ trúng cao nhất và tốn ít thời gian nhất. Nó nên là câu đầu tiên, luôn luôn.

**Sáu giả định cần kiểm, không được tin:**

```text
□ "Chắc chắn hàm này được gọi"      → log vào và kiểm
□ "Biến này chắc chắn có giá trị"   → in ra
□ "Truy vấn này trả về dữ liệu"     → chạy tay
□ "Config đã đúng"                  → in ra giá trị THẬT lúc chạy
□ "Mã mới đã lên production"        → kiểm phiên bản đang chạy
□ "Cache đã được xoá"               → kiểm

Bug ẩn trong đúng những chỗ bạn không kiểm vì "chắc chắn đúng rồi".
```

## Tại sao cần nó

Vì cách gỡ lỗi phổ biến nhất là cách tệ nhất:

```text
Sửa thử → chạy lại → vẫn hỏng → sửa thử chỗ khác → ...

Ba vấn đề:
  ① Không thu hẹp gì cả — mỗi lần thử là một lần đoán ngẫu nhiên
  ② Tích tụ thay đổi không cần thiết trong mã
  ③ Nếu "hết" thì bạn KHÔNG BIẾT VÌ SAO
     ⇒ không học được gì, và không biết nó có quay lại không
```

Điểm ③ là chi phí lớn nhất và ít ai tính: một bug "tự hết" là một bug bạn sẽ gặp lại.

**Ghi lại trong lúc làm** — một dòng mỗi bước:

```text
14:05  tái hiện được với đơn có mã giảm giá
14:12  log: soLuong = "2" (chuỗi!) khi đi vào service
14:15  nguồn: query string không được ép kiểu
14:20  sửa: dùng z.coerce.number() trong schema
14:25  thêm test cho ca này
```

Bản ghi này mất một phút để viết và trả lại nhiều lần: nó ngăn bạn thử lại cùng một thứ, nó là nội dung của phần mô tả trong PR, và nếu phải bàn giao cho người khác thì nó là toàn bộ ngữ cảnh.

**Khi bế tắc — bốn cách phá:**

```text
□ Giải thích bug cho người khác (hoặc cho một tờ giấy)
  → Bạn buộc phải nói rõ giả định, và chỗ sai thường lộ ra ở đó.
□ Đọc lại thông báo lỗi. TOÀN VĂN. Chậm.
  → Nó thường đã nói đúng vấn đề.
□ Kiểm những thứ "chắc chắn đúng".
□ Nghỉ 15 phút.
  → Nghe như lời khuyên sáo rỗng, nhưng bế tắc thường là do
    bạn đang bám vào một giả thuyết đã bị loại.
```

## So sánh

| | Đoán mò | Có quy trình |
|---|---|---|
| Mỗi bước | thử ngẫu nhiên | loại bỏ một nửa |
| Biết vì sao hết bug | ❌ | ✅ |
| Thay đổi mã ngoài ý muốn | nhiều | không |
| Bug quay lại | có thể | có test chặn |
| Thời gian | không đoán được | tuyến tính, dự đoán được |

## Dễ nhầm

**1. Sửa trước khi hiểu.** Bug "hết" mà không biết vì sao.

**2. Bỏ bước tái hiện.** Không biết mình đã sửa hay chưa.

**3. Giả thuyết mơ hồ.** "Có gì đó sai ở đâu đó" không kiểm được.

**4. Vừa sửa vừa kiểm.** Không biết thay đổi nào có tác dụng.

**5. Đổi nhiều thứ một lúc.** Mất khả năng quy nguyên nhân.

**6. Không hỏi "vừa thay đổi gì".** Bỏ qua câu có tỉ lệ trúng cao nhất.

**7. Đọc thông báo lỗi qua loa.** Nó thường đã nói đúng vấn đề.

**8. Không dùng `git bisect`** khi biết "tuần trước còn chạy".

**9. Tin vào giả định.** Bug ẩn ở chỗ bạn không kiểm.

**10. Sửa xong không viết test.** Bug quay lại.

## Mẹo nhớ

> **Tái hiện → thu hẹp → giả thuyết → KIỂM (đừng sửa) → lặp.**
>
> **Câu hỏi đầu tiên luôn là: "VỪA THAY ĐỔI GÌ?"**
>
> **Mỗi bước phải loại bỏ một nửa. Nếu không, bạn đang đoán.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm bước của vòng lặp gỡ lỗi?
2. Vì sao không được bỏ bước tái hiện?
3. Bốn cách áp dụng chia đôi?
4. Bốn câu hỏi đầu tiên, câu nào có tỉ lệ trúng cao nhất?
5. Vì sao "bug tự hết" là một vấn đề chứ không phải may mắn?

## Tự viết lại

Bug: *"Người dùng báo tổng đơn hàng đôi khi sai vài đồng."* Không nhìn lại, viết:

```text
① cách tái hiện
② ba giả thuyết cụ thể, kiểm được
③ với mỗi giả thuyết, phép đo nhỏ nhất để kiểm
④ thứ tự kiểm và vì sao thứ tự đó
```

Tự kiểm: ba giả thuyết của bạn có cái nào **không kiểm được bằng một phép đo** không — nếu có, hãy làm nó cụ thể hơn.

## Thử sức

Bug chỉ xảy ra ở production, khoảng 1% request, và bạn không tái hiện được ở dev.

Ba câu để trả lời: bạn thu hẹp bằng cách nào **khi không tái hiện được**; bạn thêm gì vào mã để lần sau có đủ thông tin; và bạn xác nhận đã sửa thế nào khi không có cách gây bug theo ý muốn. Câu khó nhất: "1% request" gợi ý gì về **hình dạng** nguyên nhân — và nó loại bỏ được nhóm giả thuyết nào ngay lập tức?
