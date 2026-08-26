---
title: RAG trong thực tế
slug: rag-trong-thuc-te
summary: Cập nhật dữ liệu, phân quyền, chi phí, và những gì phải vận hành sau khi hệ thống chạy.
level: nang-cao
tags: [ai, rag, van-hanh, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** biết những gì phải vận hành sau khi RAG chạy được, và bốn thứ hay bị bỏ khi lên production.

## Ý tưởng chính

Dựng một RAG chạy được là việc của vài ngày. Vận hành nó là việc **liên tục**: dữ liệu đổi, quyền đổi, chi phí tăng, và chất lượng trôi dạt.

Và ba vấn đề nghiêm trọng nhất của RAG trong production không phải vấn đề chất lượng — chúng là **phân quyền**, **dữ liệu cũ**, và **chi phí**.

## Mental model

Hãy nghĩ tới **một thư viện đang hoạt động**.

> Mở thư viện là dựng kệ và xếp sách. Xong trong một tuần.
>
> **Vận hành** thư viện là việc mỗi ngày: sách mới vào phải phân loại, sách cũ hết giá trị phải bỏ ra, sách thu hồi phải **lấy khỏi kệ ngay** — không phải chờ đợt tổng kiểm.
>
> Và có phòng đọc hạn chế: không phải ai cũng được vào mọi khu. Cái đó không thể là **lời nhắc ở cửa** — nó phải là **khoá**.

Hai vế cuối là hai vấn đề nghiêm trọng nhất: **sách đã thu hồi vẫn trên kệ**, và **phòng hạn chế không có khoá**.

## Ví dụ nhỏ

```text
Tài liệu bị xoá khỏi hệ thống gốc
  → nhưng đoạn của nó vẫn nằm trong vector store
  → trợ lý vẫn dẫn ra chính sách đã hết hiệu lực
```

## Code chạy thế nào

**Phân quyền — phải ở tầng truy hồi:**

```text
❌ Đưa mọi đoạn vào ngữ cảnh, dặn mô hình "chỉ nói những gì
   người này được xem"
   ⇒ Dữ liệu đã vào ngữ cảnh thì CÓ THỂ bị lấy ra.
   ⇒ Và một prompt injection đủ tốt sẽ lấy được.

✅ Lọc TRƯỚC khi tìm, bằng siêu dữ liệu
   truy hồi(cau_hoi, loc = { phongBan: user.phongBan })
   ⇒ Đoạn không được xem KHÔNG BAO GIỜ vào ngữ cảnh.
```

```text
Ba việc phải làm cho phân quyền:
  □ Mỗi đoạn mang siêu dữ liệu về quyền, đồng bộ với hệ thống gốc
  □ Lọc trước, không lọc sau
  □ Quyền ĐỔI ⇒ phải cập nhật siêu dữ liệu
    ⇒ Người rời phòng ban mà siêu dữ liệu chưa đổi là một lỗ hổng
      ([[phan-quyen-theo-ban-ghi]])
```

**Cập nhật dữ liệu — bốn trường hợp, đừng bỏ trường hợp thứ ba:**

```text
① TÀI LIỆU MỚI      → chia đoạn, tính embedding, chèn vào
② TÀI LIỆU SỬA      → xoá mọi đoạn cũ của nó, chèn đoạn mới
                       (đừng chỉ chèn thêm — sẽ có hai bản)
③ TÀI LIỆU XOÁ      → XOÁ đoạn.  ← hay bị bỏ nhất, và nghiêm trọng nhất
④ QUYỀN ĐỔI         → cập nhật siêu dữ liệu, không cần tính lại embedding

Cơ chế: lưu id nguồn trong siêu dữ liệu ⇒ mọi thao tác trên
đều làm được bằng một truy vấn theo id đó.
```

```text
Và một tối ưu đáng làm: lưu HASH nội dung mỗi đoạn.
Tài liệu sửa một chỗ ⇒ chỉ tính lại embedding cho đoạn thay đổi.
⇒ Với hàng nghìn tài liệu, đây là khác biệt giữa vài phút
  và vài giờ mỗi lần đồng bộ.
```

## Cú pháp

**Chi phí — bốn khoản, và khoản nào chiếm nhiều:**

```text
① EMBEDDING lúc nạp dữ liệu      một lần, cộng phần cập nhật
② EMBEDDING câu hỏi              mỗi request, rất rẻ
③ LƯU TRỮ vector                 theo số đoạn và số chiều
④ SINH CÂU TRẢ LỜI               mỗi request, CHIẾM PHẦN LỚN

⇒ Khoản ④ áp đảo ba khoản kia trong hầu hết hệ thống.
⇒ Nên tối ưu chi phí RAG chủ yếu là giảm token ở bước sinh:
  ít đoạn hơn (nhưng đúng hơn), đoạn ngắn hơn, giới hạn đầu ra.
```

```text
Ba cách giảm chi phí hiệu quả:
  □ Cache câu trả lời cho câu hỏi trùng lặp
    ⇒ Trong hỗ trợ khách hàng, tỉ lệ câu hỏi lặp rất cao.
    ⇒ Chuẩn hoá câu hỏi trước khi làm khoá cache.
  □ Xếp hạng lại rồi lấy 3 đoạn thay vì lấy 10 đoạn thô
    ⇒ Vừa rẻ hơn vừa chính xác hơn
      ([[truy-hoi-va-xep-hang-lai]])
  □ Mô hình nhỏ cho câu hỏi đơn giản ([[chon-mo-hinh]])
```

**Bốn thứ hay bị bỏ khi lên production:**

```text
① XỬ LÝ KHI VECTOR STORE CHẾT
   Trả về lỗi rõ ràng, hoặc lùi về tìm kiếm từ khoá.
   ⇒ Đừng để nó thành "mô hình trả lời từ trí nhớ" — đó là
     trường hợp tệ nhất: hệ thống vẫn trả lời, và không ai biết
     nó đang không có nguồn.

② GIỚI HẠN TẦN SUẤT
   Mỗi câu hỏi là một lời gọi mô hình. Không giới hạn thì một
   script vòng lặp là một hoá đơn.

③ LOG ĐỦ ĐỂ GỠ LỖI
   Câu hỏi, các đoạn được truy hồi (id + điểm), prompt cuối,
   câu trả lời, tham số.
   ⇒ Không có nó thì "câu trả lời này sai" là một báo cáo
     không điều tra được.

④ THEO DÕI CHẤT LƯỢNG LIÊN TỤC
   Tỉ lệ "không tìm thấy", phản hồi người dùng, câu hỏi không
   tìm được đoạn nào ([[danh-gia-he-thong-rag]]).
```

**Điều ① đáng nhấn thêm:** khi truy hồi trả về rỗng, prompt phải làm cho mô hình **từ chối**, không phải để nó tự do trả lời. Đây là nơi ranh giới giữa "hệ thống có nguồn" và "mô hình đoán" bị xoá mờ mà không ai nhận ra.

**Dữ liệu người dùng trong ngữ cảnh — cẩn thận:**

```text
Nếu đoạn chứa dữ liệu cá nhân, thì mỗi lời gọi là một lần
gửi dữ liệu đó ra nhà cung cấp mô hình.

□ Kiểm gói dịch vụ: có dùng để huấn luyện không, lưu bao lâu
□ Che dữ liệu không cần thiết trước khi đưa vào ngữ cảnh
□ Có yêu cầu xoá dữ liệu cá nhân ⇒ phải xoá được cả đoạn trong
  vector store, không chỉ trong CSDL gốc
  ⇒ Điểm này thường bị bỏ và là một vấn đề tuân thủ thật
    ([[ranh-gioi-va-trach-nhiem]])
```

## Tại sao cần nó

Vì ba vấn đề nghiêm trọng nhất đều **hỏng im lặng**:

```text
Tài liệu đã xoá vẫn còn trong kho
  ⇒ Hệ thống trả lời theo chính sách hết hiệu lực.
  ⇒ Không có lỗi nào. Không ai biết cho tới khi có hậu quả.

Phân quyền lọc sau, hoặc siêu dữ liệu lỗi thời
  ⇒ Người dùng thấy dữ liệu không được xem.
  ⇒ Không có lỗi nào.

Truy hồi rỗng mà mô hình vẫn trả lời
  ⇒ Câu trả lời trông giống mọi câu khác, nhưng không có nguồn.
```

Ba cái này không phải lỗi hiệu năng hay lỗi chất lượng. Chúng là lỗi **đúng đắn**, và cần được canh bằng kiểm tra tự động chứ không bằng cảm nhận.

**Danh sách kiểm trước khi lên production:**

```text
□ Phân quyền lọc TRƯỚC khi tìm
□ Đồng bộ hai chiều với hệ thống gốc: thêm, sửa, XOÁ
□ Xử lý khi vector store lỗi — từ chối, không đoán
□ Prompt từ chối khi truy hồi rỗng
□ Giới hạn tần suất
□ Log đầy đủ: câu hỏi, đoạn truy hồi, prompt, câu trả lời
□ Ba chỉ số chất lượng theo dõi liên tục
□ Bộ ca kiểm chạy trong CI
□ Đường xoá dữ liệu cá nhân khỏi vector store
```

## So sánh

| Vấn đề | Triệu chứng | Phát hiện bằng |
|---|---|---|
| Tài liệu xoá còn trong kho | trả lời theo thông tin cũ | đối chiếu định kỳ với nguồn |
| Lọc quyền sai | người dùng thấy dữ liệu lạ | test phủ định theo vai |
| Truy hồi rỗng mà vẫn trả lời | câu trả lời không nguồn | log + tỉ lệ "không tìm thấy" |
| Chi phí tăng | hoá đơn | theo dõi token mỗi request |

## Dễ nhầm

**1. Lọc quyền sau khi tìm.**

**2. Không xoá đoạn khi tài liệu bị xoá.**

**3. Chỉ chèn thêm khi tài liệu sửa.** Có hai bản trong kho.

**4. Không cập nhật siêu dữ liệu khi quyền đổi.**

**5. Tính lại toàn bộ embedding mỗi lần đồng bộ.**

**6. Để mô hình trả lời khi truy hồi rỗng.**

**7. Không giới hạn tần suất.**

**8. Không log các đoạn được truy hồi.** Không điều tra được.

**9. Không có đường xoá dữ liệu cá nhân khỏi vector store.**

**10. Tối ưu chi phí embedding** khi khoản chiếm phần lớn là bước sinh.

## Mẹo nhớ

> **Phân quyền phải LỌC TRƯỚC khi tìm — dữ liệu vào ngữ cảnh là có thể lấy ra được.**
>
> **Tài liệu XOÁ mà đoạn còn ⇒ trả lời theo thông tin đã thu hồi. Hỏng im lặng.**
>
> **Truy hồi rỗng thì phải TỪ CHỐI, không được đoán.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao phân quyền phải ở tầng truy hồi?
2. Bốn trường hợp cập nhật dữ liệu, cái nào hay bị bỏ?
3. Bốn khoản chi phí, khoản nào chiếm phần lớn?
4. Bốn thứ hay bị bỏ khi lên production?
5. Ba vấn đề hỏng im lặng, phát hiện bằng gì?

## Tự viết lại

Không nhìn lại, viết kế hoạch vận hành cho trợ lý RAG trên tài liệu nội bộ có phân quyền theo phòng ban:

```text
① cơ chế phân quyền
② quy trình đồng bộ dữ liệu, đủ bốn trường hợp
③ xử lý khi vector store lỗi
④ ba chỉ số theo dõi
⑤ đường xoá dữ liệu cá nhân
```

Tự kiểm: ở ②, khi một tài liệu bị xoá lúc 10 giờ sáng, bao lâu sau trợ lý ngừng dẫn nó ra — và con số đó có chấp nhận được không?

## Thử sức

Sáu tháng sau khi lên production, đội phát hiện trợ lý vẫn dẫn ra một chính sách đã bị thu hồi ba tháng trước. Đồng thời, một nhân viên thấy được thông tin lương của phòng khác.

Ba câu để trả lời: hai lỗi này có nguyên nhân gì chung ở mức thiết kế; bạn xử lý ngay thế nào cho từng cái; và ba biện pháp để cả hai loại lỗi này **bị phát hiện tự động** trong tương lai. Câu khó nhất: cả hai lỗi tồn tại nhiều tháng mà không ai biết — điều đó nói gì về những gì đang **thiếu** trong hệ thống quan sát, và bạn thêm gì đầu tiên?
