---
title: Tổng quan OWASP Top 10
slug: tong-quan-owasp-top-10
summary: Mười nhóm rủi ro phổ biến nhất, cách đọc danh sách này, và tư duy nền tảng của bảo mật ứng dụng.
level: co-ban
tags: [owasp, bao-mat, tong-quan]
khung: v2
---

> **Sau bài này bạn sẽ:** có ba nguyên tắc nền tảng để tự suy ra cách phòng thủ, thay vì học thuộc mười mục.

## Ý tưởng chính

OWASP Top 10 **không phải danh sách kiểm tra** để tick từng ô rồi tuyên bố an toàn. Nó là **mười nhóm rủi ro hay gặp nhất**, xếp theo mức độ phổ biến và tác hại.

Giá trị thật của nó: nó cho bạn biết **kẻ tấn công thử gì trước tiên** — và vì vậy bạn nên gia cố chỗ nào trước.

## Mental model

Hãy nghĩ tới **báo cáo thống kê của cảnh sát về cách trộm vào nhà**.

> Báo cáo nói: 40% vào bằng **cửa sổ tầng một không khoá**, 25% bằng **cửa sau**, 15% vì **chìa khoá để dưới thảm**.
>
> Bạn không cần chống mọi kịch bản tưởng tượng. Bạn khoá cửa sổ tầng một trước — vì đó là chỗ 40% vụ trộm xảy ra.
>
> Và quan trọng: bạn **không** tự nghĩ ra danh sách này. Nó đến từ dữ liệu của hàng nghìn vụ thật.

Bảo mật ứng dụng cũng vậy. Bạn không cần nghĩ ra mọi cách tấn công — bạn cần biết cách nào **thật sự hay xảy ra**.

## Ví dụ nhỏ

```text
A01  Broken Access Control      ← phổ biến NHẤT
A02  Cryptographic Failures
A03  Injection (SQL, command, XSS)
A04  Insecure Design
A05  Security Misconfiguration
A06  Vulnerable Components
A07  Authentication Failures
A08  Data Integrity Failures
A09  Logging & Monitoring Failures
A10  Server-Side Request Forgery
```

## Code chạy thế nào

Ba nguyên tắc nền tảng — nếu chỉ nhớ được ba điều từ toàn bộ chủ đề bảo mật, hãy nhớ ba điều này:

**① Không bao giờ tin dữ liệu từ client.**

```text
Mọi thứ client gửi lên đều SỬA ĐƯỢC: body, header, cookie, tham số URL,
trường hidden trong form, và cả những giá trị mà giao diện của bạn "không cho phép" đổi.

Validate ở trình duyệt là để trải nghiệm tốt.
Validate ở server là để AN TOÀN.
```

**② Kiểm tra quyền ở mọi điểm chạm dữ liệu.**

```text
Ẩn nút trên giao diện KHÔNG phải bảo mật.
Middleware chặn route KHÔNG đủ — người tấn công gọi thẳng API.

Kiểm quyền phải nằm ở nơi THẬT SỰ đọc/ghi dữ liệu.
```

**③ Nguyên tắc đặc quyền tối thiểu.**

```text
Mỗi thành phần chỉ có đúng quyền nó cần:
· User cơ sở dữ liệu của app: không phải superuser
· Token API: chỉ scope cần thiết
· Container: không chạy bằng root
· Người dùng: mặc định không có quyền, cấp thêm khi cần
```

Ba nguyên tắc này **suy ra được** phần lớn mười mục kia. Đó là lý do chúng đáng nhớ hơn danh sách.

## Cú pháp

**Mô hình hoá mối đe doạ** — bốn câu hỏi, làm trước khi viết code cho một tính năng:

```text
① Chúng ta đang xây cái gì?        → vẽ luồng dữ liệu, chỉ ra ranh giới tin cậy
② Chuyện gì có thể sai?             → với mỗi ranh giới: ai vượt qua được và bằng cách nào?
③ Chúng ta làm gì với nó?           → sửa, giảm thiểu, chấp nhận, hay chuyển giao rủi ro
④ Chúng ta làm đủ tốt chưa?         → kiểm lại
```

Bước ② dễ làm nhất nếu hỏi cụ thể: *"nếu người dùng đổi id này thành id của người khác thì sao?"*, *"nếu họ gửi số âm thì sao?"*, *"nếu họ gọi API này 10.000 lần một phút thì sao?"*

## Tại sao cần nó

Vì phần lớn công việc bảo mật **nên được tự động hoá** — con người sẽ quên, công cụ thì không:

```text
Trong CI, mỗi PR:
  · npm audit / pnpm audit          → thư viện có lỗ hổng đã biết
  · gitleaks, secretlint            → secret lỡ commit
  · CodeQL, Semgrep                 → mẫu code nguy hiểm
  · Dependabot / Renovate           → tự mở PR nâng cấp

Trên hạ tầng:
  · HTTPS bắt buộc, HSTS
  · Header bảo mật (CSP, X-Frame-Options)
  · Rate limiting
  · WAF cho tấn công phổ biến
```

Danh sách này quan trọng vì nó chuyển bảo mật từ **"nhớ làm"** sang **"không làm được thì CI đỏ"** — cùng tinh thần với ràng buộc ở tầng cơ sở dữ liệu.

## So sánh

Cách đọc Top 10 cho đúng:

| Đọc sai | Đọc đúng |
|---|---|
| "Tick đủ 10 mục là an toàn" | "10 chỗ hay bị tấn công nhất — gia cố trước" |
| "Đây là danh sách kỹ thuật" | Nhiều mục là vấn đề **thiết kế** và **quy trình** |
| "Làm một lần rồi thôi" | Thư viện mới, tính năng mới ⇒ rủi ro mới |
| "Việc của đội bảo mật" | Lỗ hổng sinh ra lúc **viết code**, không phải lúc audit |

Và một điều đáng nói: **A01 Broken Access Control đứng đầu** không phải vì nó tinh vi nhất — mà vì nó là loại lỗi **dễ mắc nhất** và **khó phát hiện nhất bằng công cụ tự động**. Máy không biết người dùng nào *nên* xem được đơn hàng nào; chỉ có logic nghiệp vụ của bạn biết.

## Dễ nhầm

**1. Coi bảo mật là giai đoạn cuối.** Kiểm thử xâm nhập trước khi ra mắt tìm ra lỗi thiết kế — và lúc đó sửa rất đắt.

**2. Tin vào "chưa ai tấn công chúng ta".** Bot quét tự động chạm vào mọi địa chỉ IP công khai trong vòng vài giờ sau khi bạn mở cổng.

**3. Bảo mật qua sự mù mờ.** Ẩn endpoint, đổi tên tham số, không công khai mã nguồn — không cái nào là bảo mật.

**4. Chỉ dựa vào một lớp.** Phòng thủ nhiều lớp: validate + tham số hoá + quyền + giới hạn tần suất + giám sát. Một lớp thủng thì lớp khác còn đó.

**5. Bỏ qua A09 (logging & monitoring).** Không có log thì bạn không biết mình bị tấn công — và trung bình thời gian phát hiện xâm nhập tính bằng **tháng**.

**6. Nghĩ ứng dụng nhỏ thì không ai quan tâm.** Kẻ tấn công không nhắm vào bạn — họ quét hàng loạt và khai thác bất cứ thứ gì hở. Máy chủ của bạn có giá trị với họ ngay cả khi dữ liệu thì không.

## Mẹo nhớ

> **Top 10 là thống kê "trộm hay vào bằng đường nào", không phải danh sách tick.**
>
> **Ba nguyên tắc: không tin client · kiểm quyền ở nơi chạm dữ liệu · đặc quyền tối thiểu.**
>
> **Tự động hoá được thì đừng dựa vào trí nhớ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. OWASP Top 10 là gì, và **không** phải là gì?
2. Ba nguyên tắc nền tảng, và vì sao chúng đáng nhớ hơn danh sách mười mục?
3. Vì sao "validate ở trình duyệt" không phải bảo mật?
4. Bốn câu hỏi của mô hình hoá mối đe doạ?
5. Vì sao Broken Access Control đứng đầu danh sách?

## Tự viết lại

Không nhìn lại phần trên, áp bốn câu hỏi mô hình hoá mối đe doạ vào tính năng sau:

```text
"Người dùng tải lên ảnh đại diện. Ảnh được lưu vào S3 và hiển thị công khai."
```

Tự kiểm: bạn tìm ra **ít nhất bốn** rủi ro chứ? (Gợi ý: một liên quan tới kích thước, một tới loại file, một tới tên file, và một tới việc ảnh được hiển thị ở đâu.)

## Thử sức

Đội bạn sắp ra mắt sản phẩm sau 6 tháng phát triển và **chưa từng nghĩ tới bảo mật**. Bạn có 5 ngày.

Lập kế hoạch: bạn kiểm **ba** thứ nào trước tiên, dựa trên tiêu chí gì? Câu khó nhất: với thời gian đó, bạn **chấp nhận** bỏ qua những rủi ro nào — và bạn ghi lại quyết định đó ở đâu để người sau biết?
