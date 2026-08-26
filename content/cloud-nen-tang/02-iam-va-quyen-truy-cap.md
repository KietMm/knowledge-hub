---
title: IAM và quyền truy cập trên cloud
slug: iam-va-quyen-truy-cap
summary: Vai, chính sách, đặc quyền tối thiểu — và vì sao khoá truy cập dài hạn là thứ nên biến mất khỏi hệ thống.
level: trung-cap
tags: [cloud, iam, bao-mat, devops]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được chính sách theo đặc quyền tối thiểu, và thay khoá dài hạn bằng vai.

## Ý tưởng chính

Trên cloud, **danh tính là ranh giới bảo mật chính**. Không phải tường lửa, không phải mạng — mà là câu hỏi *"ai được gọi API nào, trên tài nguyên nào".*

Và sai ở đây khác sai ở tầng khác: một chính sách quá rộng không gây lỗi gì, không hiện trong log, và chỉ lộ ra khi có người khai thác nó.

## Mental model

Hãy nghĩ tới **thẻ từ trong một toà nhà lớn**.

> Cách tệ: mỗi người một chùm chìa khoá vật lý. Ai vào đội thì làm thêm chìa; ai nghỉ thì... hy vọng họ trả lại. **Chìa đã sao thì không thu hồi được.**
>
> Cách tốt: thẻ từ. Quyền gắn với **vai** ("nhân viên kho", "quản lý tầng 3"), không gắn với người. Vào đội thì gán vai; nghỉ thì rút thẻ, và **mọi cửa biết ngay**.
>
> Và thẻ khách chỉ có hiệu lực **trong ngày**, không phải mãi mãi.

Chùm chìa khoá là **access key dài hạn**. Thẻ từ theo vai là **role**. Thẻ khách hết hạn trong ngày là **thông tin đăng nhập tạm thời** — và đó là thứ nên dùng ở gần như mọi nơi.

## Ví dụ nhỏ

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::anh-san-pham/*"
}
```

## Code chạy thế nào

**Bốn thành phần của một quyết định cho phép:**

```text
① AI          (principal) — người dùng, vai, hoặc một dịch vụ
② LÀM GÌ      (action)    — s3:GetObject, rds:DeleteDBInstance
③ TRÊN CÁI GÌ (resource)  — bucket nào, bảng nào, máy nào
④ ĐIỀU KIỆN   (condition) — từ IP nào, có MFA chưa, thẻ nào

Thiếu ③ là lỗi phổ biến nhất: `"Resource": "*"` nghĩa là
"trên MỌI tài nguyên", kể cả những thứ tạo ra năm sau.
```

**Bốn mức chính sách, từ tệ tới tốt:**

```text
❌ TỆ NHẤT
   { "Action": "*", "Resource": "*" }
   ⇒ Toàn quyền. Một khoá rò rỉ = mất toàn bộ hạ tầng.

⚠️ VẪN RỘNG
   { "Action": "s3:*", "Resource": "*" }
   ⇒ Đọc, ghi, XOÁ mọi bucket — kể cả bucket sao lưu.

⚠️ TỐT HƠN
   { "Action": ["s3:GetObject","s3:PutObject"], "Resource": "arn:...:anh/*" }

✅ ĐẶC QUYỀN TỐI THIỂU
   Như trên, cộng điều kiện: chỉ từ VPC của bạn, chỉ khi có MFA,
   chỉ trên tài nguyên có thẻ đúng môi trường.
```

**Nguyên tắc thứ tự đánh giá — hai điều phải nhớ:**

```text
① Mặc định là TỪ CHỐI. Không có chính sách nào cho phép ⇒ từ chối.
② DENY luôn thắng ALLOW, bất kể thứ tự.

⇒ Hệ quả hữu ích: một chính sách chặn ở cấp tổ chức
  ("không ai được xoá log kiểm toán", "không ai được tạo tài
  nguyên ngoài region cho phép") KHÔNG THỂ bị ghi đè bởi
  chính sách cấp dưới.
  ⇒ Đây là cách đặt lan can an toàn cho cả tổ chức.
```

## Cú pháp

**Khoá dài hạn — vì sao nên biến mất:**

```text
Access key dài hạn:
  □ Không tự hết hạn
  □ Nằm trong file cấu hình, biến môi trường, CI secret,
    và trong lịch sử shell của người ta
  □ Rò rỉ ⇒ dùng được cho tới khi có người phát hiện và thu hồi
  □ Bot quét GitHub tìm chúng liên tục, và tìm thấy trong vài phút

Thay bằng:
  □ Máy ảo / container       → gán VAI cho máy, SDK tự lấy
                               thông tin đăng nhập tạm
  □ CI/CD                    → OIDC ([[secret-va-quyen-trong-ci]])
  □ Người dùng               → đăng nhập một lần (SSO) + MFA
  □ Dịch vụ nói với dịch vụ  → vai, không phải khoá

⇒ Mục tiêu thực tế: KHÔNG CÓ access key dài hạn nào trong hệ thống.
  Nghe cực đoan, nhưng đạt được ở phần lớn kiến trúc hiện nay.
```

**Assume role — cách một danh tính lấy quyền tạm:**

```text
① Danh tính gốc (người, hoặc máy) yêu cầu "cho tôi nhận vai X"
② Cloud kiểm: danh tính này có được phép nhận vai X không?
③ Trả về thông tin đăng nhập TẠM (thường 1 giờ)
④ Hết hạn ⇒ tự lấy lại

⇒ Rò rỉ thông tin tạm chỉ có giá trị trong một giờ.
⇒ Và mọi lần nhận vai đều được GHI LOG — bạn biết ai, lúc nào,
  từ đâu.
```

**Tách môi trường bằng tài khoản, không bằng tên:**

```text
❌ Một tài khoản, phân biệt dev/prod bằng tiền tố tên tài nguyên
   ⇒ Một chính sách quá rộng chạm được cả hai.
   ⇒ Một lệnh gõ sai xoá tài nguyên production.

✅ Tài khoản riêng cho mỗi môi trường
   ⇒ Ranh giới CỨNG. Không có chính sách nào "vô tình" vượt qua.
   ⇒ Và tách được hoá đơn theo môi trường.
```

Đây là biện pháp có tỉ lệ lợi ích trên công sức cao nhất trong bài, và nó gần như miễn phí nếu làm từ đầu.

## Tại sao cần nó

Vì cấu hình IAM sai là **nguyên nhân hàng đầu** của các vụ rò rỉ dữ liệu trên cloud — và nó hỏng theo cách âm thầm nhất:

```text
Tường lửa cấu hình sai   ⇒ thường có ai đó không truy cập được ⇒ phát hiện
IAM cấu hình quá rộng    ⇒ mọi thứ CHẠY BÌNH THƯỜNG
                          ⇒ không ai báo lỗi
                          ⇒ chỉ lộ ra khi bị khai thác
```

**Bốn thứ nên rà soát định kỳ:**

```text
□ Chính sách có "Action": "*" hoặc "Resource": "*"
□ Access key dài hạn còn tồn tại — và lần cuối dùng là khi nào
□ Danh tính không dùng trong 90 ngày
□ Bucket lưu trữ và snapshot đang ở chế độ công khai
```

```text
Và một điều hay bị bỏ: THU HỒI khi người rời đội.
  Xoá tài khoản là bước rõ ràng.
  Nhưng còn: khoá họ tạo ra, vai họ có thể nhận, token trong CI,
  và các dịch vụ bên thứ ba họ đã kết nối.
  ⇒ Cần một danh sách kiểm, không dựa vào trí nhớ.
```

**Bắt đầu từ đâu nếu đang lộn xộn:**

```text
① Bật ghi log mọi lời gọi API (CloudTrail và tương đương) — trước tiên
② Tách tài khoản theo môi trường
③ Xoá access key dài hạn, thay bằng vai và OIDC
④ Rà chính sách có `*`, siết dần theo log ai thật sự dùng gì
⑤ Đặt chính sách chặn ở cấp tổ chức làm lan can

Bước ① đi trước vì nó cho bạn DỮ LIỆU để siết chính sách
mà không làm hỏng thứ đang chạy.
```

## So sánh

| | Khoá dài hạn | Vai + thông tin tạm |
|---|---|---|
| Hết hạn | ❌ | ✅ ~1 giờ |
| Rò rỉ thì | dùng mãi tới khi thu hồi | hết giá trị sau 1 giờ |
| Ghi log việc lấy quyền | ❌ | ✅ |
| Xoay định kỳ | thủ công | tự động |
| Dùng cho | gần như không nên | mọi nơi |

## Dễ nhầm

**1. `"Resource": "*"`.** Gồm cả tài nguyên tạo ra sau này.

**2. Dùng access key dài hạn cho máy ảo hoặc CI.**

**3. Một tài khoản cho cả dev và production.**

**4. Không bật ghi log lời gọi API.** Không có dữ liệu để siết chính sách.

**5. Cấp quyền theo người thay vì theo vai.** Không quản được khi đội thay đổi.

**6. Không thu hồi đầy đủ khi người rời đội.**

**7. Không rà chính sách định kỳ.** Quyền chỉ tích tụ, không tự giảm.

**8. Bỏ qua điều kiện trong chính sách.** IP, MFA, thẻ là lớp phòng thủ rẻ.

**9. Không có chính sách chặn ở cấp tổ chức.** Thiếu lan can.

**10. Tin rằng IAM sai sẽ gây lỗi.** Nó chạy bình thường.

## Mẹo nhớ

> **Bốn phần: AI — LÀM GÌ — TRÊN CÁI GÌ — ĐIỀU KIỆN. Thiếu "trên cái gì" là lỗi phổ biến nhất.**
>
> **DENY luôn thắng ALLOW ⇒ dùng nó làm lan can cấp tổ chức.**
>
> **Mục tiêu: KHÔNG có access key dài hạn nào trong hệ thống.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn thành phần của một quyết định cho phép?
2. Vì sao khoá dài hạn nên được thay bằng vai?
3. Assume role hoạt động thế nào, hai lợi ích?
4. Vì sao tách môi trường bằng tài khoản chứ không bằng tên?
5. Vì sao cấu hình IAM sai khó phát hiện hơn tường lửa sai?

## Tự viết lại

Không nhìn lại, viết chính sách theo đặc quyền tối thiểu cho:

```text
① Ứng dụng web: đọc/ghi một bucket ảnh, đọc một secret
② Job sao lưu: đọc CSDL, ghi vào bucket sao lưu (KHÔNG được xoá)
③ CI: deploy lên môi trường staging, không chạm production
④ Kỹ sư trực: đọc log và metric, không sửa tài nguyên
```

Tự kiểm: ở ② vì sao "không được xoá" quan trọng — và nó bảo vệ bạn khỏi kịch bản nào?

## Thử sức

Rà soát phát hiện: 14 access key dài hạn, 6 chính sách có `"Action": "*"`, và một tài khoản dùng cho cả dev lẫn production.

Ba câu để trả lời: bạn xử lý theo thứ tự nào và vì sao thứ tự đó; bạn siết chính sách mà **không làm hỏng thứ đang chạy** bằng cách nào; và bạn ngăn tình trạng này tái diễn ra sao. Câu khó nhất: một trong 14 khoá đó không ai biết dùng cho việc gì — bạn tìm ra bằng cách nào, và nếu không tìm ra thì làm gì?
