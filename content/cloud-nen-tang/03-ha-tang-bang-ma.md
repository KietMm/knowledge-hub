---
title: Hạ tầng bằng mã
slug: ha-tang-bang-ma
summary: Vì sao bấm chuột trên giao diện cloud là nợ kỹ thuật, và state file là thứ quan trọng nhất phải bảo vệ.
level: trung-cap
tags: [cloud, devops, terraform, tu-dong-hoa]
khung: v2
---

> **Sau bài này bạn sẽ:** biết vì sao hạ tầng phải nằm trong git, và cái bẫy lớn nhất của Terraform là gì.

## Ý tưởng chính

Hạ tầng dựng bằng cách bấm chuột trên giao diện có ba vấn đề: **không ai biết đã bấm gì**, **không dựng lại được**, và **không review được**.

Hạ tầng bằng mã (IaC) biến hạ tầng thành thứ chịu cùng quy trình với mã ứng dụng: review, lịch sử, và dựng lại được.

## Mental model

Hãy nghĩ tới **công thức nấu ăn so với nấu theo cảm giác**.

> Người đầu bếp nấu theo cảm giác có thể nấu rất ngon. Nhưng: món hôm nay **không giống hôm qua**, người khác **không nấu lại được**, và khi có vấn đề thì không ai biết đã cho bao nhiêu muối.
>
> Công thức viết ra thì nhàm hơn — nhưng **ai cũng nấu lại được**, và sửa công thức là một thay đổi **thấy được**.
>
> Và có một chi tiết: đầu bếp phải **ghi lại mình đang nấu tới bước nào**. Mất tờ ghi đó thì không biết đã cho muối chưa — cho thêm lần nữa là mặn, không cho thì nhạt.

Tờ ghi "đang ở bước nào" là **state file**, và nó là thứ dễ bị đánh giá thấp nhất trong toàn bộ IaC.

## Ví dụ nhỏ

```hcl
resource "aws_s3_bucket" "anh" {
  bucket = "anh-san-pham-${var.moi_truong}"
}

resource "aws_s3_bucket_public_access_block" "anh" {
  bucket                  = aws_s3_bucket.anh.id
  block_public_acls       = true
  block_public_policy     = true
}
```

## Code chạy thế nào

**Khai báo, không phải ra lệnh — và điều đó thay đổi cách nghĩ:**

```text
RA LỆNH (script):     "tạo máy ảo"
  Chạy hai lần ⇒ hai máy ảo.
  Muốn biết hiện có gì ⇒ đọc lại toàn bộ script và đoán.

KHAI BÁO (Terraform): "phải có một máy ảo với cấu hình này"
  Chạy nhiều lần ⇒ vẫn một máy.
  Terraform SO SÁNH mong muốn với thực tế, rồi làm phần chênh lệch.
```

```text
Vòng làm việc:
  ① viết/sửa mã mô tả trạng thái MONG MUỐN
  ② `plan` — xem nó SẼ làm gì   ← bước quan trọng nhất
  ③ đọc plan, xác nhận đúng ý
  ④ `apply`
```

Bước ② là điểm khác biệt lớn nhất so với bấm chuột: bạn **thấy trước** hậu quả, và nó review được như một diff.

**State file — cái bẫy lớn nhất:**

```text
State file ghi: "tôi đã tạo những tài nguyên nào, id là gì".
Nó là cách Terraform biết cái gì đã tồn tại.

Mất state file:
  ⇒ Terraform tưởng chưa tạo gì
  ⇒ `apply` sẽ TẠO LẠI mọi thứ (hoặc lỗi vì tên đã tồn tại)

Hai người apply cùng lúc:
  ⇒ hai state ghi đè nhau ⇒ tài nguyên mồ côi, không ai quản

⇒ Bắt buộc: state ở NƠI DÙNG CHUNG (S3, GCS) và có KHOÁ.
⇒ Và state file chứa THÔNG TIN NHẠY CẢM (mật khẩu CSDL sinh ra
  lúc tạo tài nguyên) ⇒ phải mã hoá, và KHÔNG BAO GIỜ commit vào git.
```

Ba dòng cuối là ba lỗi thường gặp nhất của người dùng Terraform lần đầu, và cả ba đều gây hậu quả khó dọn.

## Cú pháp

**Drift — thay đổi bằng tay làm lệch trạng thái:**

```text
Ai đó sửa security group trên giao diện web.
Terraform không biết ⇒ lần `apply` sau nó ĐƯA VỀ như mã khai báo
⇒ thay đổi kia mất, có thể lúc đang xử lý sự cố.

Hai cách xử lý:
  ① Chặn sửa tay: chỉ CI có quyền thay đổi hạ tầng, người thì chỉ đọc
     ⇒ hiệu quả nhất, và khả thi
  ② Chạy `plan` định kỳ, cảnh báo khi có drift
     ⇒ phát hiện, không ngăn

Và một ngoại lệ thực dụng: lúc sự cố, sửa tay để khôi phục
nhanh là ĐÚNG. Nhưng phải đưa vào mã ngay sau đó, không để đó.
```

**Module — đừng copy-paste hạ tầng:**

```hcl
module "api" {
  source      = "./modules/dich-vu-web"
  ten         = "api"
  moi_truong  = "production"
  so_ban_sao  = 3
}
```

```text
Không có module: dev, staging, production là ba bản copy.
⇒ Sửa một thứ phải sửa ba nơi, và chúng lệch nhau dần.
⇒ "Staging chạy được mà" mất ý nghĩa vì staging KHÁC production.

Có module: một định nghĩa, ba lần dùng với tham số khác nhau.
⇒ Khác biệt giữa các môi trường trở thành THẤY ĐƯỢC:
  chỉ nằm ở danh sách tham số.
```

**Tách state theo phạm vi thay đổi:**

```text
❌ Một state cho tất cả
   ⇒ `plan` mất 10 phút; đổi một biến môi trường phải chạm
     vào cả VPC và CSDL; và một lỗi có thể ảnh hưởng mọi thứ.

✅ Tách theo NHỊP THAY ĐỔI:
   mang/         VPC, subnet, DNS        — đổi vài lần mỗi năm
   du-lieu/      CSDL, cache             — đổi vài lần mỗi quý
   ung-dung/     dịch vụ, scaling        — đổi hằng tuần

⇒ Cùng nguyên tắc với xếp lớp Dockerfile theo tần suất thay đổi
  ([[viet-dockerfile]]).
```

**Hai thứ phải làm với dữ liệu:**

```hcl
resource "aws_db_instance" "main" {
  # ...
  lifecycle { prevent_destroy = true }   # ① chặn xoá bằng Terraform
  deletion_protection = true             # ② chặn xoá ở cả tầng nhà cung cấp
}
```

Không có hai dòng này, một `terraform destroy` gõ sai môi trường là mất CSDL production. Đây là loại lỗi có thật và không sửa được.

## Tại sao cần nó

Vì bốn thứ chỉ có được khi hạ tầng nằm trong git:

```text
① REVIEW      thay đổi hạ tầng đi qua PR như mã
              ⇒ mở một cổng ra Internet là một dòng diff ai cũng thấy
② LỊCH SỬ     "vì sao security group này mở cổng 8080?" → git blame
③ DỰNG LẠI    mất cả region ⇒ dựng lại ở region khác từ mã
              (nếu có sao lưu dữ liệu)
④ MÔI TRƯỜNG GIỐNG NHAU
              staging thật sự giống production, khác biệt thấy được
```

Điểm ① đáng nhấn: nó chuyển bảo mật hạ tầng từ "hy vọng không ai bấm sai" sang "một thay đổi rủi ro phải có người thứ hai đồng ý" ([[iam-va-quyen-truy-cap]]).

**Nhưng IaC không miễn phí:**

```text
□ Cần học một công cụ và một mô hình tư duy mới
□ State file là một thứ nữa phải vận hành và bảo vệ
□ Thay đổi nhỏ chậm hơn bấm chuột — lúc sự cố là bất tiện thật
□ Drift là một loại vấn đề chỉ tồn tại vì có IaC

⇒ Đáng gần như luôn, nhưng đừng bắt đầu bằng cách viết lại toàn bộ
  hạ tầng hiện có. Cách khả thi hơn: mọi thứ MỚI thì bằng mã,
  và `import` dần những thứ cũ khi có việc chạm tới chúng.
```

## So sánh

| | Bấm chuột | Script (ra lệnh) | IaC (khai báo) |
|---|---|---|---|
| Review được | ❌ | ✅ | ✅ |
| Chạy lại an toàn | — | ❌ | ✅ |
| Biết hiện có gì | phải xem giao diện | đoán | state file |
| Dựng lại từ 0 | ❌ | một phần | ✅ |
| Tốc độ thay đổi nhỏ | nhanh nhất | nhanh | chậm hơn |

## Dễ nhầm

**1. Commit state file vào git.** Nó chứa thông tin nhạy cảm.

**2. State file cục bộ.** Hai người apply là hỏng.

**3. Không có khoá state.**

**4. `apply` mà không đọc `plan`.**

**5. Không có `prevent_destroy` cho CSDL.**

**6. Copy-paste giữa các môi trường thay vì dùng module.**

**7. Một state cho tất cả.** `plan` chậm, và phạm vi rủi ro rộng.

**8. Cho phép sửa tay mà không phát hiện drift.**

**9. Sửa tay lúc sự cố rồi không đưa vào mã.**

**10. Viết lại toàn bộ hạ tầng cũ trong một dự án.** Import dần thì khả thi hơn.

## Mẹo nhớ

> **Khai báo trạng thái MONG MUỐN, không ra lệnh. Luôn đọc `plan` trước `apply`.**
>
> **STATE FILE: dùng chung, có khoá, mã hoá, KHÔNG vào git.**
>
> **Tách state theo NHỊP THAY ĐỔI, và `prevent_destroy` cho dữ liệu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Khai báo khác ra lệnh thế nào, và hệ quả khi chạy lại?
2. State file làm gì, và bốn yêu cầu với nó?
3. Drift là gì, hai cách xử lý?
4. Vì sao tách state theo nhịp thay đổi?
5. Bốn thứ chỉ có được khi hạ tầng nằm trong git?

## Tự viết lại

Không nhìn lại, viết cấu trúc IaC cho một hệ thống có VPC, ứng dụng web (3 bản sao), Postgres, Redis, và một bucket:

```text
① chia thành mấy state, theo tiêu chí gì
② module nào cần
③ ba biện pháp bảo vệ dữ liệu
④ ai được `apply`, ở đâu
```

Tự kiểm: ở ④, nếu chỉ CI được apply, thì lúc 3 giờ sáng có sự cố cần sửa hạ tầng ngay, bạn làm thế nào?

## Thử sức

Đội bạn có hạ tầng dựng hoàn toàn bằng tay qua giao diện web trong hai năm. Không ai biết đầy đủ đang có những gì.

Ba câu để trả lời: bạn bắt đầu từ đâu — và vì sao **không** phải là viết mã cho toàn bộ; bạn xử lý những tài nguyên đang chạy thế nào; và bạn ngăn việc bấm chuột tiếp diễn ra sao. Câu khó nhất: nếu `import` một tài nguyên đang chạy vào Terraform mà mã bạn viết khác cấu hình thật, lần `apply` đầu tiên sẽ làm gì — và bạn tránh tai nạn đó bằng cách nào?
