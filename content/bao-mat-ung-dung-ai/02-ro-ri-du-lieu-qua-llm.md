---
title: Rò rỉ dữ liệu qua LLM
slug: ro-ri-du-lieu-qua-llm
summary: Bốn đường dữ liệu ra ngoài, và nguyên tắc duy nhất đáng tin: đừng đưa vào ngữ cảnh.
level: trung-cap
tags: [ai, bao-mat, du-lieu, do-tin-cay]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bốn đường dữ liệu rò ra qua một ứng dụng LLM, và nguyên tắc chặn tận gốc.

## Ý tưởng chính

Có đúng một nguyên tắc đáng tin: **dữ liệu không được phép nói ra thì không đưa vào ngữ cảnh**.

Mọi cách khác — dặn mô hình đừng nói, lọc đầu ra, kiểm bằng mô hình — đều là lớp giảm rủi ro, không phải ranh giới.

## Mental model

Hãy nghĩ tới **đưa một tập hồ sơ cho người thuyết trình**.

> Bạn đưa họ cả tập, và dặn: "đừng nói về ba trang cuối".
>
> Có thể họ nhớ. Nhưng nếu ai đó trong phòng hỏi đúng câu, hoặc họ vô tình nhắc tới, thì ba trang đó đã ra ngoài.
>
> Cách đúng: **rút ba trang đó ra trước khi đưa tập hồ sơ**.

Nghe hiển nhiên. Nhưng trong hệ thống thật, "đưa cả tập rồi dặn đừng nói" là cách phổ biến — vì lọc trước tốn công hơn.

## Ví dụ nhỏ

```text
❌ Đưa cả bảng sản phẩm (có giá vốn) vào ngữ cảnh,
   kèm chỉ dẫn "không được tiết lộ giá vốn"

✅ Truy vấn CHỈ lấy các cột được phép, rồi đưa vào ngữ cảnh
```

## Code chạy thế nào

**Bốn đường dữ liệu ra ngoài:**

```text
① QUA CÂU TRẢ LỜI cho chính người dùng
   Dữ liệu người này không được xem, nhưng nằm trong ngữ cảnh.
   ⇒ Nguyên nhân: truy hồi không lọc theo quyền, hoặc công cụ
     trả về quá nhiều trường
     ([[phan-quyen-theo-ban-ghi]]).

② QUA CÔNG CỤ GỬI RA NGOÀI
   Email, webhook, gọi API bên ngoài.
   ⇒ Kết hợp với prompt injection thì đây là đường rò chủ động
     ([[prompt-injection]]).

③ TỚI NHÀ CUNG CẤP MÔ HÌNH
   Mọi thứ trong ngữ cảnh đều được gửi ra một dịch vụ bên ngoài.
   ⇒ Đây là đường hay bị quên nhất, vì nó không "trông giống"
     rò rỉ.

④ QUA LOG VÀ CACHE
   Log ngữ cảnh đầy đủ = một kho dữ liệu cá nhân.
   Cache câu trả lời sai khoá = người dùng A nhận dữ liệu của B.
```

**Đường ③ nhìn kỹ:**

```text
Câu hỏi phải trả lời được:
  □ Gói dịch vụ có dùng dữ liệu để huấn luyện không?
  □ Lưu bao lâu? Ở region nào?
  □ Ai trong tổ chức của nhà cung cấp xem được?

⇒ Gói cá nhân và gói doanh nghiệp thường có điều khoản
  RẤT khác nhau.
⇒ Và đây là quyết định ở cấp tổ chức, không phải cấp cá nhân
  ([[ranh-gioi-va-trach-nhiem]]).
```

```text
Với dữ liệu rất nhạy cảm (y tế, tài chính, dữ liệu cá nhân
theo quy định):
  □ Che trước khi gửi — thay tên bằng mã, bỏ số định danh
  □ Hoặc dùng mô hình tự vận hành
  □ Hoặc không dùng LLM cho phần đó
```

## Cú pháp

**Lọc trước, không lọc sau — cụ thể:**

```text
Ở TẦNG TRUY HỒI
  ❌ Tìm trong toàn kho, rồi bỏ đoạn không được xem
  ✅ Chỉ tìm trong tập người này được xem
  ⇒ Cách đầu vẫn ĐỌC dữ liệu không được phép, và nếu 5 kết quả
    đầu bị bỏ thì bạn còn 0 kết quả ([[rag-trong-thuc-te]])

Ở TẦNG CÔNG CỤ
  ❌ SELECT * rồi trả về hết
  ✅ Chỉ chọn cột được phép, và lọc theo người dùng thật
  ⇒ Và danh tính phải từ phiên đăng nhập, không từ tham số
    ([[xac-thuc-va-gioi-han-cong-cu]])

Ở TẦNG DỮ LIỆU
  Che trước khi đưa vào ngữ cảnh: số thẻ, số định danh, địa chỉ
  ⇒ Nếu mô hình không cần chúng để trả lời, đừng đưa vào.
```

**Log và cache — hai chỗ dễ quên:**

```text
LOG
  □ Che dữ liệu nhạy cảm trước khi log
  □ Thời hạn lưu rõ ràng, xoá tự động
  □ Phân quyền: ai đọc được log
  □ Người dùng yêu cầu xoá ⇒ phải xoá được cả trong log
  ⇒ Đánh đổi thật: log ít thì không gỡ lỗi được. Cách cân bằng
    thường dùng: log đầy đủ với thời hạn ngắn, log tổng hợp
    với thời hạn dài ([[quan-sat-ung-dung-llm]]).

CACHE
  Khoá cache PHẢI gồm danh tính người dùng nếu câu trả lời
  phụ thuộc quyền.
  ⇒ Thiếu ⇒ người dùng A nhận câu trả lời chứa dữ liệu của B.
  ⇒ Đây là lỗi im lặng và rất khó phát hiện
    ([[cache-va-chi-phi-llm]]).
```

**Lọc đầu ra — có ích, nhưng là lớp cuối:**

```text
Quét đầu ra tìm mẫu dữ liệu nhạy cảm (số thẻ, số định danh,
email) trước khi hiển thị.

✅ Bắt được rò rỉ vô tình
❌ Không bắt được dữ liệu không có mẫu nhận dạng
   (tên người, số tiền, nội dung hợp đồng)
❌ Người tấn công có thể yêu cầu mã hoá đầu ra để vượt qua

⇒ Dùng như lưới an toàn cuối, KHÔNG dùng như biện pháp chính.
```

## Tại sao cần nó

Vì rò rỉ dữ liệu khác một bug thường ở một điểm quyết định:

```text
Bug thường:    sửa được, deploy lại, xong.
Rò rỉ dữ liệu: KHÔNG THU HỒI ĐƯỢC.
               Và có thể phải thông báo cho người dùng và
               cơ quan quản lý.

⇒ Nên biện pháp phải là NGĂN, không phải PHÁT HIỆN VÀ SỬA.
```

**Danh sách kiểm:**

```text
□ Truy hồi lọc TRƯỚC theo quyền người dùng
□ Công cụ chỉ trả về trường cần thiết
□ Danh tính từ phiên, không từ tham số mô hình điền
□ Dữ liệu nhạy cảm không cần thiết được che trước khi vào ngữ cảnh
□ Khoá cache gồm danh tính khi cần
□ Log có che dữ liệu, có thời hạn, có phân quyền
□ Đã kiểm điều khoản của gói dịch vụ mô hình
□ Công cụ gửi ra ngoài: giới hạn miền giá trị hoặc cần xác nhận
□ Có đường xoá dữ liệu cá nhân khỏi mọi nơi (CSDL, vector store, log)
```

**Và cách kiểm chứng — test phủ định:**

```text
Với mỗi luồng, viết test:
  "Người dùng A hỏi về dữ liệu của B ⇒ hệ thống KHÔNG trả về"

⇒ Đây là loại test hay thiếu nhất, và là loại duy nhất bắt
  được lỗi phân quyền một cách hệ thống
  ([[kiem-thu-va-danh-gia-bao-mat]]).
⇒ Thêm cả ca dùng prompt injection để thử lấy dữ liệu.
```

## So sánh

| Đường rò | Nguyên nhân | Chặn bằng |
|---|---|---|
| Qua câu trả lời | không lọc quyền | lọc trước ở truy hồi/công cụ |
| Qua công cụ ra ngoài | quyền quá rộng | giới hạn miền giá trị |
| Tới nhà cung cấp | mọi ngữ cảnh đều gửi | che dữ liệu, chọn gói phù hợp |
| Qua log / cache | log đầy đủ, khoá sai | che, thời hạn, khoá đúng |

## Dễ nhầm

**1. Đưa dữ liệu vào ngữ cảnh rồi dặn mô hình đừng nói.**

**2. Lọc quyền SAU khi truy hồi.**

**3. Công cụ trả về `SELECT *`.**

**4. Danh tính từ tham số mô hình điền.**

**5. Quên rằng mọi ngữ cảnh đều được gửi ra nhà cung cấp.**

**6. Không kiểm điều khoản gói dịch vụ.**

**7. Khoá cache thiếu danh tính người dùng.**

**8. Log ngữ cảnh đầy đủ không giới hạn thời hạn.**

**9. Dùng lọc đầu ra như biện pháp chính.**

**10. Không có test phủ định cho phân quyền.**

## Mẹo nhớ

> **Dữ liệu không được nói ra thì ĐỪNG ĐƯA VÀO ngữ cảnh. Không có ngoại lệ đáng tin.**
>
> **LỌC TRƯỚC khi truy hồi, không lọc sau — lọc sau nghĩa là đã đọc dữ liệu không được phép.**
>
> **Rò rỉ dữ liệu KHÔNG THU HỒI ĐƯỢC. Biện pháp phải là NGĂN.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn đường dữ liệu ra ngoài?
2. Vì sao đường thứ ba hay bị quên?
3. Lọc trước khác lọc sau thế nào, và vì sao lọc sau không đủ?
4. Hai chỗ dễ quên là gì, và lỗi cụ thể ở mỗi chỗ?
5. Vì sao lọc đầu ra chỉ là lớp cuối?

## Tự viết lại

Không nhìn lại, thiết kế bảo vệ dữ liệu cho trợ lý nội bộ truy cập hồ sơ nhân sự:

```text
① lọc quyền ở những tầng nào
② dữ liệu nào che trước khi vào ngữ cảnh
③ khoá cache gồm gì
④ chính sách log
⑤ ba test phủ định
```

Tự kiểm: ở ⑤, có test nào dùng prompt injection để thử lấy dữ liệu người khác không?

## Thử sức

Một nhân viên phát hiện trợ lý nội bộ trả lời được câu hỏi về lương của phòng khác. Điều tra cho thấy: truy hồi tìm trong toàn bộ kho tài liệu, rồi prompt có dòng "chỉ trả lời về phòng ban của người dùng".

Ba câu để trả lời: lỗi thiết kế nằm ở đâu; bạn sửa ngay thế nào; và bạn kiểm những luồng khác có cùng lỗi bằng cách nào. Câu khó nhất: dữ liệu lương đã nằm trong log của các phiên trước và trong cache — bạn xử lý hai chỗ đó ra sao, và ai cần được thông báo?
