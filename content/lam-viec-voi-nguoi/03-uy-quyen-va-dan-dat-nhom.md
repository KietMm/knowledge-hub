---
title: Uỷ quyền và dẫn dắt nhóm
slug: uy-quyen-va-dan-dat-nhom
summary: Uỷ quyền mà không bỏ rơi, onboarding, 1:1, phỏng vấn — và giữ lại thời gian cho việc kỹ thuật.
level: nang-cao
tags: [dan-dat, uy-quyen, onboarding, 1-1, phong-van]
khung: v2
---

> **Sau bài này bạn sẽ:** uỷ quyền theo mức phù hợp với từng người và từng việc, và giữ được thời gian cho việc kỹ thuật.

## Ý tưởng chính

Khi dẫn dắt, thước đo đổi: không còn là **bạn** làm được bao nhiêu, mà là **đội** làm được bao nhiêu.

Từ đó suy ra một điều trái với bản năng: việc bạn tự làm một task nhanh hơn người khác **không phải lý do để tự làm**. Nó là lý do để dạy — vì khoảng cách đó sẽ lặp lại mỗi tuần cho tới khi bạn đóng nó lại.

## Mental model

Hãy nghĩ tới **dạy đi xe đạp**.

> Giữ yên xe suốt: đứa trẻ không bao giờ tự đi được, và bạn phải chạy theo mãi.
>
> Buông ngay từ đầu trên đường dốc: ngã đau, và sợ xe.
>
> Người dạy giỏi **buông dần** — bắt đầu ở chỗ an toàn, để ngã những cú không nguy hiểm, và luôn đứng đủ gần.

Uỷ quyền là bài toán buông dần đó. Hai lỗi tương ứng: quản lý vi mô (giữ mãi) và uỷ quyền rồi biến mất (buông ở chỗ nguy hiểm).

## Ví dụ nhỏ

```text
❌ "Làm tính năng X đi."          ← thiếu bối cảnh, thiếu mức tự chủ
✅ "Bạn làm tính năng X. Mục tiêu: giảm số bước thanh toán từ 5 xuống 3.
    Cách làm bạn quyết. Ràng buộc: không đổi API công khai.
    Xong thiết kế thì cho tôi xem trước khi code.
    Vướng gì cứ hỏi bất cứ lúc nào."
```

## Code chạy thế nào

**Năm mức uỷ quyền — nói rõ mức, đừng để người kia đoán:**

```text
① "Làm chính xác như tôi nói"        người mới, việc rủi ro cao
② "Tìm hiểu rồi báo tôi, tôi quyết"  đang học
③ "Đề xuất phương án, ta bàn"        có kinh nghiệm
④ "Bạn quyết, báo tôi sau"           tin cậy
⑤ "Bạn toàn quyền"                   chuyên gia trong lĩnh vực đó

Mức phụ thuộc CẢ HAI: người này ở đâu, và việc này rủi ro thế nào.
Cùng một người có thể ở mức ⑤ với backend và mức ② với hạ tầng.
```

Nguồn của hầu hết hiểu lầm khi uỷ quyền: người giao nghĩ mức ④, người nhận hiểu mức ②. Cách chữa là **nói mức ra thành lời**.

**Uỷ quyền đúng cách — bốn phần:**

```text
① BỐI CẢNH   vì sao việc này quan trọng, nó phục vụ mục tiêu nào
② KẾT QUẢ    thế nào là xong — mô tả kết quả, không mô tả cách làm
③ RÀNG BUỘC  hạn, ngân sách, thứ không được đụng vào
④ HỖ TRỢ     hỏi ai, khi nào ta xem lại
```

```text
Giao KẾT QUẢ, không giao CÁCH LÀM.
  "Giảm thời gian tải trang xuống dưới 1 giây"   ✅
  "Thêm index vào bảng orders"                    ❌ ← đó là cách làm của BẠN

Giao cách làm ⇒ người kia không học được cách nghĩ,
              và không sở hữu kết quả.
```

**Uỷ quyền không phải bỏ rơi:**

```text
□ Đặt điểm xem lại TRƯỚC, không phải hỏi thăm ngẫu nhiên
   "Xong thiết kế thì ta xem 15 phút" ← đã hẹn, không phải kiểm tra đột xuất
□ Sai thì để họ sửa, đừng nhảy vào làm hộ
   Trừ khi hậu quả nghiêm trọng — lúc đó nói rõ vì sao bạn can thiệp.
□ Kết quả thuộc về họ, kể cả khi cách làm khác cách của bạn
□ Việc hỏng thì trách nhiệm vẫn là của bạn — công thì của họ
```

Dòng cuối là bài kiểm tra thật của việc dẫn dắt, và cũng là điều làm người ta dám nhận việc lần sau.

## Cú pháp

**Onboarding — 30 ngày đầu quyết định rất nhiều:**

```text
Ngày 1     máy chạy được, chạy được dự án, gặp cả đội
Tuần 1     một PR nhỏ đã lên production
           ← quan trọng hơn mọi tài liệu: nó chứng minh
             "tôi đóng góp được", và kiểm tra cả quy trình
Tuần 2–4   một tính năng nhỏ trọn vẹn, có người kèm
Tháng 2–3  làm việc độc lập ở mức bình thường
```

```text
Chuẩn bị trước khi họ tới:
  □ README dựng môi trường CHẠY ĐƯỢC (có người test lại gần đây)
  □ Một người kèm cụ thể, có tên
  □ Danh sách task nhỏ đã chọn sẵn
  □ Sơ đồ kiến trúc, dù chỉ vẽ tay

Và: khi người mới vấp ở chỗ nào, đó là LỖI TÀI LIỆU, không phải lỗi họ.
    Nhờ chính họ sửa lại tài liệu ⇒ vừa học vừa đóng góp.
```

**1:1 — của người kia, không phải của bạn:**

```text
❌ Báo cáo tiến độ         → đã có standup và bảng công việc
✅ Cái gì đang cản trở bạn?
✅ Bạn muốn phát triển theo hướng nào?
✅ Tôi có thể làm gì để bạn làm việc dễ hơn?
✅ Có gì bạn muốn nói mà chưa nói?

□ Đều đặn, đừng huỷ  ← huỷ 1:1 gửi đi thông điệp mạnh hơn bạn nghĩ
□ Nghe nhiều hơn nói
□ Ghi lại cam kết hai bên và theo dõi
□ Phản hồi khó thì nói ở đây, không nói trước mặt người khác
```

**Phản hồi cụ thể, không phán xét tính cách:**

```text
❌ "Em cẩu thả quá."             ← nói về con người, không sửa được
✅ "PR hôm qua có 3 lỗi mà test đã bắt được nếu chạy trước khi push.
    Ta thống nhất chạy test trước khi push nhé?"
   ⇒ HÀNH VI cụ thể + TÁC ĐỘNG + ĐỀ NGHỊ thay đổi.
```

**Giữ thời gian cho việc kỹ thuật:**

```text
Mất hoàn toàn tay nghề ⇒ mất khả năng đánh giá và mất uy tín kỹ thuật.
Ôm đường găng của dự án ⇒ bạn thành điểm nghẽn của cả đội.

Cách giữ cân bằng:
  □ Nhận việc kỹ thuật KHÔNG nằm trên đường găng
  □ Review code đều đặn — cách rẻ nhất để giữ nhịp với codebase
  □ Chặn sẵn khối thời gian không họp trong tuần
  □ Làm spike, prototype, công cụ nội bộ
```

## Tại sao cần nó

Vì lý do "tôi làm nhanh hơn" đúng ở mức từng task và sai ở mức tháng:

```text
Bạn làm: 2 giờ.  Họ làm: 6 giờ + 1 giờ bạn hướng dẫn.
Lần này bạn "tiết kiệm" 5 giờ.

Nhưng việc này lặp lại mỗi tuần.
Tháng thứ hai: họ làm trong 3 giờ, không cần bạn.
Tháng thứ ba: họ làm việc khó hơn, và bạn rảnh cho việc khác.

Còn nếu bạn luôn tự làm:
  tháng thứ mười hai vẫn là bạn làm — và bạn là điểm nghẽn.
```

**Ba dấu hiệu bạn đang uỷ quyền chưa đủ:**

```text
□ Bạn là người duy nhất biết một phần quan trọng của hệ thống
□ Bạn nghỉ phép là mọi thứ chậm lại
□ Bạn thường xuyên làm việc buổi tối trong khi đội thì không
```

**Phỏng vấn — nhìn cách nghĩ, không nhìn trí nhớ:**

```text
□ Bài tập giống công việc thật, không phải câu đố
□ Hỏi về một quyết định họ từng đưa ra và VÌ SAO
□ Xem cách họ xử lý khi không biết ← thứ dự báo tốt nhất
□ Bảng tiêu chí thống nhất trước, chấm sau
   → chống thiên kiến "giống mình thì thấy giỏi"
□ Ứng viên cũng đang đánh giá bạn: trả lời thật, kể cả về mặt chưa tốt
```

## So sánh

| | Quản lý vi mô | Uỷ quyền đúng | Bỏ rơi |
|---|---|---|---|
| Giao | cách làm | **kết quả** | không rõ gì |
| Theo dõi | liên tục | điểm hẹn trước | không có |
| Người kia học | ít | ✅ | qua thất bại đau |
| Bạn | quá tải | có thời gian | bất ngờ khi hỏng |

## Dễ nhầm

**1. "Tôi làm nhanh hơn" nên tự làm.** Đúng tuần này, sai cả năm.

**2. Giao cách làm thay vì kết quả.** Người kia không học được cách nghĩ.

**3. Không nói rõ mức uỷ quyền.** Hai bên hiểu khác nhau.

**4. Uỷ quyền rồi biến mất.** Bỏ rơi, không phải tin tưởng.

**5. Nhảy vào làm hộ khi thấy sai.** Lấy mất cơ hội học.

**6. Nhận công, đẩy trách nhiệm.** Lần sau không ai dám nhận việc.

**7. 1:1 thành họp báo cáo tiến độ.**

**8. Huỷ 1:1 vì bận.** Thông điệp mạnh hơn bạn nghĩ.

**9. Phản hồi về tính cách thay vì hành vi.**

**10. Ôm việc trên đường găng.** Bạn thành điểm nghẽn.

**11. Không chuẩn bị onboarding.** Tuần đầu quyết định rất nhiều.

**12. Phỏng vấn bằng câu đố.** Đo trí nhớ, không đo năng lực làm việc.

## Mẹo nhớ

> **Giao KẾT QUẢ, không giao cách làm. Và nói rõ MỨC uỷ quyền.**
>
> **Uỷ quyền không phải bỏ rơi: đặt điểm xem lại TRƯỚC.**
>
> **Việc hỏng thì trách nhiệm của bạn; công thì của họ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm mức uỷ quyền, mức phụ thuộc vào những gì?
2. Bốn phần khi giao việc?
3. Vì sao "tôi làm nhanh hơn" là lý do sai?
4. Ba dấu hiệu bạn uỷ quyền chưa đủ?
5. 1:1 nên nói về gì và không nên nói về gì?

## Tự viết lại

Bạn cần giao cho một bạn mới vào ba tháng việc *"cải thiện hiệu năng trang danh sách sản phẩm"*. Không nhìn lại, viết:

```text
① mức uỷ quyền và vì sao chọn mức đó
② bối cảnh, kết quả mong đợi, ràng buộc, hỗ trợ
③ các điểm xem lại
④ bạn làm gì nếu họ chọn hướng khác hướng của bạn
```

Tự kiểm: phần ② của bạn mô tả **kết quả** hay mô tả **cách làm**?

## Thử sức

Bạn vừa lên tech lead của đội 5 người. Sau hai tháng: bạn làm 12 giờ mỗi ngày, đội thì kêu thiếu việc rõ ràng, và không ai dám sửa hai module bạn viết.

Ba câu để trả lời: ba vấn đề bạn nhận ra và cái nào sửa trước; thay đổi cụ thể trong tháng tới; và bạn **đo** xem mình đã cải thiện chưa bằng gì. Câu khó nhất: hai module không ai dám sửa — bạn xử lý ra sao, và tại sao "viết tài liệu cho chúng" **chưa đủ**?
