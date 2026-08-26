---
title: Lưu mật khẩu và mã hoá dữ liệu
slug: luu-mat-khau-va-ma-hoa
summary: Hash chậm có salt cho mật khẩu, mã hoá cho dữ liệu cần đọc lại — hai việc khác nhau hoàn toàn.
level: trung-cap
tags: [owasp, mat-khau, hashing, ma-hoa]
khung: v2
---

> **Sau bài này bạn sẽ:** phân biệt được hash, mã hoá và mã hoá một chiều, và biết vì sao mật khẩu cần hàm băm **chậm**.

## Ý tưởng chính

Ba khái niệm hay bị dùng lẫn, và chọn nhầm cái nào cũng dẫn tới lỗ hổng:

```text
Băm (hash)     một chiều — không khôi phục lại được  → MẬT KHẨU
Mã hoá         hai chiều — có khoá thì giải ra được   → dữ liệu cần ĐỌC LẠI
Mã hoá base64  KHÔNG phải bảo mật — chỉ là cách biểu diễn
```

Câu hỏi để chọn: ***"tôi có cần đọc lại giá trị gốc không?"*** Không cần ⇒ băm. Cần ⇒ mã hoá.

## Mental model

Hãy nghĩ tới ba cách xử lý một tài liệu mật.

> **Băm** là **đốt tài liệu và giữ lại đống tro có hình dạng đặc trưng**. Bạn không đọc lại được nội dung, nhưng nếu ai đưa bạn một tài liệu, bạn đốt nó và **so hai đống tro** để biết có phải cùng nội dung không.
>
> **Mã hoá** là **cất vào két có khoá**. Có khoá thì mở ra đọc được — nên bài toán chuyển thành: **giữ khoá ở đâu**.
>
> **Base64** là **viết ngược từ phải sang trái**. Nhìn lạ mắt, nhưng ai cũng đọc được.

Với mật khẩu, bạn **không bao giờ** cần đọc lại — nên đốt là đúng. Hệ thống nào gửi lại mật khẩu cũ cho bạn qua email là hệ thống đang cất mật khẩu trong két, và đó là lỗi nghiêm trọng.

## Ví dụ nhỏ

```ts
import argon2 from 'argon2'

const hash = await argon2.hash(matKhau)          // lúc đăng ký
const dung = await argon2.verify(hash, nhapVao)  // lúc đăng nhập
```

Không tự nối salt, không tự chọn tham số. Thư viện đã lo cả hai.

## Code chạy thế nào

**Vì sao mật khẩu cần hàm băm CHẬM** — đây là điểm phản trực giác:

```text
Kẻ tấn công lấy được bảng users. Hắn thử đoán mật khẩu bằng cách
băm hàng loạt từ điển rồi so với hash trong bảng.

Với SHA-256 (hàm băm NHANH):
  GPU hiện đại thử ~10 TỈ hash mỗi giây
  ⇒ mọi mật khẩu 8 ký tự thường bị dò trong vài giờ

Với Argon2 (hàm băm CHẬM, tốn RAM):
  cùng GPU thử được ~10 NGHÌN hash mỗi giây
  ⇒ chậm hơn một triệu lần
```

Sự chậm ở đây là **tính năng, không phải khuyết điểm**. Người dùng chờ 200ms khi đăng nhập — không ai để ý. Kẻ tấn công chờ 200ms cho **mỗi lần đoán** — và điều đó biến vài giờ thành vài thế kỷ.

**Salt** — chuỗi ngẫu nhiên khác nhau cho mỗi mật khẩu:

```text
Không có salt:
  hai người dùng cùng mật khẩu "123456" → CÙNG một hash
  ⇒ kẻ tấn công dò một lần, mở được nhiều tài khoản
  ⇒ và bảng tra sẵn (rainbow table) dùng được

Có salt:
  cùng mật khẩu → hash KHÁC NHAU
  ⇒ phải dò riêng từng tài khoản
```

Argon2 và bcrypt **tự sinh salt và nhúng vào chuỗi kết quả** — bạn không cần cột riêng, không cần tự xử lý.

## Cú pháp

```ts
// ✅ Nên dùng, theo thứ tự
argon2id     // lựa chọn hiện đại nhất — tốn cả CPU lẫn RAM ⇒ GPU khó tăng tốc
bcrypt       // cũ hơn nhưng vẫn tốt, có ở mọi ngôn ngữ (cost ≥ 12)
scrypt

// ❌ TUYỆT ĐỐI KHÔNG cho mật khẩu
md5, sha1, sha256, sha512     // quá nhanh — thiết kế cho mục đích khác
```

Điểm cần hiểu: SHA-256 **không phải hàm băm yếu** — nó rất tốt cho việc kiểm tra toàn vẹn file. Nó chỉ **sai mục đích** ở đây, vì nó nhanh, mà mật khẩu cần chậm.

**Chống dò mật khẩu** — hash chậm là lớp cuối, không phải lớp duy nhất:

```text
① Giới hạn tần suất theo IP và theo tài khoản
② Tăng dần thời gian chờ sau mỗi lần sai (1s, 2s, 4s, 8s…)
③ CAPTCHA sau vài lần thất bại
④ Cảnh báo qua email khi đăng nhập từ thiết bị mới
⑤ Xác thực hai yếu tố
```

Giới hạn theo **cả IP lẫn tài khoản** là chi tiết quan trọng: chỉ giới hạn theo IP thì kẻ tấn công dùng nhiều IP; chỉ giới hạn theo tài khoản thì hắn dò một mật khẩu phổ biến trên **hàng nghìn tài khoản** (credential stuffing).

## Tại sao cần nó

Vì **thông báo lỗi cũng là lỗ hổng**:

```ts
// ❌ Tiết lộ email nào đã đăng ký
if (!user) return { loi: 'Email không tồn tại' }
if (!dung) return { loi: 'Mật khẩu sai' }

// ✅ Cùng một thông báo
return { loi: 'Email hoặc mật khẩu không đúng' }
```

Và tinh vi hơn — **thời gian phản hồi cũng tiết lộ**:

```text
Email không tồn tại  → trả về ngay          (5ms)
Email tồn tại        → phải verify hash     (200ms)

⇒ Kẻ tấn công đo thời gian và biết email nào đã đăng ký.
```

Cách chặn: **luôn chạy verify**, kể cả khi không tìm thấy người dùng:

```ts
const user = await db.user.findByEmail(email)
const hash = user?.matKhauHash ?? HASH_GIA      // hash của một chuỗi bất kỳ
const dung = await argon2.verify(hash, nhapVao)
if (!user || !dung) return { loi: 'Email hoặc mật khẩu không đúng' }
```

**Đặt lại mật khẩu** — quy trình đúng:

```text
① Sinh token ngẫu nhiên ĐỦ DÀI (32 byte từ nguồn ngẫu nhiên mật mã)
② LƯU HASH của token, không lưu token gốc   ← nếu CSDL rò rỉ, token vô dụng
③ Hết hạn sau 15-60 phút
④ Dùng MỘT LẦN — xoá ngay sau khi dùng
⑤ Vô hiệu hoá mọi phiên đăng nhập cũ sau khi đổi
⑥ Thông báo "nếu email tồn tại, chúng tôi đã gửi hướng dẫn" — dù có hay không
```

Bước ⑤ hay bị quên, và nó quan trọng: nếu ai đó đã chiếm được tài khoản, đổi mật khẩu mà không huỷ phiên cũ thì hắn **vẫn còn quyền truy cập**.

**Mã hoá dữ liệu cần đọc lại:**

```ts
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
// AES-256-GCM: mã hoá + xác thực toàn vẹn trong một bước
```

Bài toán thật của mã hoã không phải thuật toán — mà là **quản lý khoá**:

```text
· Khoá KHÔNG nằm trong mã nguồn
· Khoá KHÔNG nằm cùng chỗ với dữ liệu đã mã hoá
· Dùng dịch vụ quản lý khoá (KMS, Vault) nếu có
· Có kế hoạch XOAY khoá — và biết cách mã hoá lại dữ liệu cũ
```

Xem thêm [[quan-ly-secret-va-cau-hinh]].

## So sánh

| Dữ liệu | Cách xử lý |
|---|---|
| Mật khẩu | Băm chậm (argon2id/bcrypt) — **không bao giờ** mã hoá |
| Token phiên, token reset | Băm (SHA-256 là đủ, vì token đã ngẫu nhiên và dài) |
| Số thẻ, số CMND, dữ liệu y tế | Mã hoá (AES-256-GCM) + quản lý khoá |
| Email, tên | Thường không mã hoá; bảo vệ bằng phân quyền |
| Kiểm tra toàn vẹn file | SHA-256 |

Dòng thứ hai đáng chú ý: **token phiên không cần hàm băm chậm**, vì nó đã là 32 byte ngẫu nhiên — không thể dò bằng từ điển. Hash chậm chỉ cần cho thứ mà con người tự nghĩ ra.

## Dễ nhầm

**1. Dùng MD5/SHA cho mật khẩu.** Quá nhanh — dò được trong vài giờ.

**2. Tự cài thuật toán băm hoặc tự nối salt.** Dùng thư viện.

**3. Mã hoá mật khẩu thay vì băm.** Nếu bạn giải mã được thì kẻ tấn công lấy được khoá cũng giải được.

**4. Thông báo lỗi phân biệt email và mật khẩu.** Tiết lộ email đã đăng ký.

**5. Không chặn tấn công theo thời gian.** Luôn chạy verify.

**6. Token đặt lại mật khẩu lưu nguyên văn.** CSDL rò rỉ ⇒ chiếm mọi tài khoản.

**7. Không huỷ phiên cũ sau khi đổi mật khẩu.** Kẻ tấn công vẫn còn quyền.

**8. Khoá mã hoá nằm cùng chỗ với dữ liệu.** Như để chìa khoá trong ổ.

**9. Bắt đổi mật khẩu định kỳ 90 ngày.** Khuyến nghị hiện đại (NIST) đã **bỏ** yêu cầu này: nó khiến người dùng chọn mật khẩu yếu hơn và ghi ra giấy. Thay bằng: kiểm tra mật khẩu có nằm trong danh sách rò rỉ không, và bật xác thực hai yếu tố.

## Mẹo nhớ

> **Băm là đốt thành tro; mã hoá là cất vào két; base64 là viết ngược.**
>
> **Mật khẩu cần hàm băm CHẬM — chậm là tính năng.**
>
> **Cần đọc lại giá trị gốc không? Không ⇒ băm. Có ⇒ mã hoá, và bài toán thật là giữ khoá.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba khái niệm băm / mã hoá / base64 khác nhau ra sao?
2. Vì sao mật khẩu cần hàm băm **chậm** — nêu con số?
3. Salt giải quyết vấn đề gì?
4. Tấn công theo thời gian hoạt động thế nào, và cách chặn?
5. Sáu bước của quy trình đặt lại mật khẩu, và bước nào hay bị quên?

## Tự viết lại

Không nhìn lại phần trên, viết mã giả cho hàm đăng nhập an toàn:

```text
Yêu cầu: không tiết lộ email đã đăng ký (kể cả qua thời gian phản hồi),
chống dò mật khẩu, và ghi log đủ để điều tra sự cố.
```

Tự kiểm: bạn ghi gì vào log, và bạn có ghi mật khẩu nhập sai không? Vì sao?

## Thử sức

Bạn tiếp nhận một hệ thống cũ lưu mật khẩu bằng `md5(matKhau)` cho 200.000 người dùng.

Bạn **không thể** băm lại vì không có mật khẩu gốc. Lập kế hoạch nâng cấp sang argon2 **mà không bắt tất cả người dùng đổi mật khẩu ngay lập tức**. Gợi ý: có một kỹ thuật cho phép nâng cấp **dần dần**, mỗi người một lần khi họ đăng nhập. Câu khó: trong lúc chuyển đổi, bạn xử lý những người **không bao giờ đăng nhập lại** thế nào?
