---
title: Cung cấp ngữ cảnh cho trợ lý AI
slug: cung-cap-ngu-canh
summary: Chất lượng đầu ra tỉ lệ với chất lượng ngữ cảnh — và ngữ cảnh nhiều không có nghĩa là tốt.
level: co-ban
tags: [ai, lap-trinh-cung-ai, prompt, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** cung cấp đúng ngữ cảnh cần thiết, và biết vì sao dán cả repo vào lại làm kết quả tệ hơn.

## Ý tưởng chính

Đầu ra của trợ lý AI phụ thuộc gần như hoàn toàn vào **ngữ cảnh bạn đưa vào**. Cùng một câu hỏi, hai ngữ cảnh khác nhau cho hai kết quả rất khác.

Nhưng ngữ cảnh **nhiều** không đồng nghĩa với ngữ cảnh **tốt**. Thông tin không liên quan làm loãng thông tin liên quan, và mô hình mất dấu đúng thứ bạn muốn nó chú ý.

## Mental model

Hãy nghĩ tới **nhờ một người mới sửa một chỗ trong nhà**.

> **Không ngữ cảnh**: "sửa cái vòi nước hộ tôi". Họ sẽ đoán vòi nào, và sửa theo cách thông thường nhất.
>
> **Ngữ cảnh đúng**: "vòi ở bếp, nó rỉ ở khớp nối, nhà tôi dùng ống nhựa loại này, và đừng tháo cái van kia vì nó liên quan tới máy giặt".
>
> **Ngữ cảnh quá nhiều**: đưa họ toàn bộ bản vẽ kỹ thuật cả toà nhà, hồ sơ bảo trì mười năm, và danh bạ ban quản lý. Họ phải **tự tìm** phần liên quan trong đó — và có thể tìm sai.

Vế thứ ba là điều dễ làm sai nhất khi dùng công cụ có khả năng đọc cả repo: đưa nhiều không giúp, mà làm mô hình phải tự chọn — và nó chọn không giỏi hơn bạn.

## Ví dụ nhỏ

```text
❌ "Viết hàm validate đơn hàng"
✅ "Viết hàm validate đơn hàng. Đây là schema hiện có (dán), đây
    là cách chúng tôi xử lý lỗi (dán 10 dòng), quy tắc: số lượng
    1–100, chỉ sản phẩm đang bán. Dùng zod, theo đúng phong cách
    file mẫu này."
```

## Code chạy thế nào

**Năm loại ngữ cảnh, theo thứ tự giá trị:**

```text
① MÃ LIÊN QUAN TRỰC TIẾP
   Hàm sẽ sửa, kiểu dữ liệu nó dùng, một hàm TƯƠNG TỰ đã có
   ⇒ Cái thứ ba quan trọng nhất và hay bị bỏ: một ví dụ mẫu
     truyền đạt phong cách tốt hơn mọi lời mô tả.

② RÀNG BUỘC VÀ QUY TẮC
   "không dùng thư viện ngoài", "phải tương thích Node 20",
   "quy tắc nghiệp vụ: X"
   ⇒ Không nói ra thì mô hình chọn mặc định phổ biến nhất,
     thường không phải cái bạn cần.

③ ĐỊNH DẠNG ĐẦU RA MONG MUỐN
   "chỉ trả về hàm, không giải thích", "kèm test", "dùng
   named export"

④ NHỮNG GÌ ĐÃ THỬ VÀ THẤT BẠI
   ⇒ Tiết kiệm được cả một vòng lặp: nó sẽ không đề xuất lại
     đúng cái bạn vừa loại.

⑤ THÔNG BÁO LỖI ĐẦY ĐỦ, nguyên văn
   ⇒ Đừng tóm tắt lỗi. Toàn văn stack trace mang nhiều thông tin
     hơn bản mô tả của bạn ([[doc-stack-trace-va-log]]).
```

**Vì sao dán cả repo làm kết quả tệ hơn:**

```text
Mô hình phải tự tìm phần liên quan trong hàng nghìn dòng.
⇒ Nó có thể bám vào một mẫu mã cũ mà bạn đang muốn thay thế.
⇒ Thông tin quan trọng bị "loãng" giữa thông tin nền.
⇒ Và mô hình chú ý không đều: phần đầu và phần cuối của ngữ cảnh
  thường được dùng tốt hơn phần giữa.

⇒ Đặt thứ QUAN TRỌNG NHẤT ở đầu hoặc cuối, không kẹp giữa.
⇒ Chọn lọc thắng đưa nhiều.
```

## Cú pháp

**Cấu trúc một yêu cầu tốt:**

```text
① VIỆC CẦN LÀM — cụ thể, một việc
② NGỮ CẢNH     — mã liên quan, dán trực tiếp
③ VÍ DỤ MẪU    — một chỗ tương tự đã có trong dự án
④ RÀNG BUỘC    — cái gì được, cái gì không
⑤ ĐỊNH DẠNG    — muốn nhận về dạng gì
```

```text
Trong năm phần đó, phần ③ có tỉ lệ giá trị trên công sức cao nhất:
"làm giống file này" truyền đạt phong cách, cách đặt tên, cách
xử lý lỗi, cách viết test — tất cả trong một lần dán.
```

**File hướng dẫn cho dự án — làm một lần, dùng mãi:**

```markdown
# Quy ước dự án

- TypeScript strict, không dùng `any`
- Xác thực đầu vào bằng zod ở tầng route
- Lỗi nghiệp vụ: ném lớp con của LoiNghiepVu, KHÔNG trả mã HTTP từ service
- Test bằng vitest, đặt cạnh file được test
- Tên biến và comment bằng tiếng Việt
- Không thêm thư viện mới mà không hỏi
```

```text
Nhiều công cụ đọc file này tự động ở mỗi phiên.
⇒ Bạn không phải nhắc lại quy ước mỗi lần.
⇒ Và nó có tác dụng phụ tốt: nó buộc đội VIẾT RA những quy ước
  vốn chỉ nằm trong đầu vài người — hữu ích cho người mới,
  không chỉ cho AI ([[cau-truc-du-an-va-phu-thuoc]]).
```

**Vòng lặp thu hẹp — cách làm hiệu quả hơn một yêu cầu lớn:**

```text
❌ Một yêu cầu khổng lồ → nhận 300 dòng → sửa lại từ đầu

✅ ① Yêu cầu phần nhỏ nhất có nghĩa
   ② Đọc, xác nhận đúng hướng
   ③ Yêu cầu phần tiếp theo, có ngữ cảnh của phần vừa xong
   ④ Lặp

⇒ Mỗi bước bạn còn hiểu được. Sai thì sửa hướng ngay, không phải
  bỏ cả khối.
```

**Khi kết quả không đúng — sửa NGỮ CẢNH, đừng chỉ nói "sai rồi":**

```text
❌ "Sai rồi, làm lại"
   ⇒ Nó sẽ thử một biến thể khác, có thể cũng sai theo cách khác.

✅ "Không đúng vì hàm này phải chạy trong transaction. Đây là
    cách chúng tôi mở transaction (dán). Viết lại theo đó."
   ⇒ Bổ sung đúng thứ đang thiếu.
```

Đây là kỹ năng chính của việc dùng AI hiệu quả: khi kết quả sai, câu hỏi đúng là *"tôi đã không nói ra điều gì?"*

## Tại sao cần nó

Vì phần lớn thời gian mất khi dùng AI đến từ **vòng lặp vô ích**:

```text
Không đủ ngữ cảnh:
  yêu cầu → kết quả sai hướng → sửa → vẫn sai → tự viết
  ⇒ mất thời gian nhiều hơn tự viết ngay từ đầu

Đủ ngữ cảnh:
  yêu cầu → kết quả đúng hướng → tinh chỉnh nhỏ → xong
```

**Ba thứ mô hình KHÔNG biết dù bạn dùng công cụ đọc được cả repo:**

```text
□ Vì sao mã hiện tại được viết như vậy
  ⇒ Nó thấy kết quả, không thấy lý do. Đoạn "kỳ lạ" có thể là
    một bản vá cho ca biên đã quên.
□ Điều gì sắp thay đổi
  ⇒ Nó tối ưu cho hiện tại, không cho kế hoạch của bạn.
□ Ràng buộc bên ngoài mã
  ⇒ Deadline, năng lực đội, thoả thuận với đối tác, quyết định
    đã chốt trong một cuộc họp.

⇒ Ba thứ này bạn phải NÓI RA. Không có cách nào khác.
```

## So sánh

| Ngữ cảnh | Kết quả |
|---|---|
| Chỉ mô tả bằng lời | đúng hướng chung, sai chi tiết |
| + mã liên quan | đúng kiểu, đúng tên |
| + ví dụ mẫu tương tự | đúng phong cách dự án |
| + ràng buộc | không đề xuất thứ bạn không dùng được |
| Dán cả repo | loãng, có thể bám vào mẫu cũ |

## Dễ nhầm

**1. Yêu cầu mà không dán mã liên quan.**

**2. Không đưa ví dụ mẫu.** Thứ có giá trị nhất trên mỗi dòng dán.

**3. Dán cả repo.** Loãng và bám vào mẫu cũ.

**4. Đặt thông tin quan trọng ở giữa ngữ cảnh dài.**

**5. Tóm tắt thông báo lỗi.** Dán nguyên văn.

**6. Một yêu cầu khổng lồ.** Chia nhỏ, xác nhận từng bước.

**7. Nói "sai rồi" mà không nói sai vì sao.**

**8. Không viết file quy ước dự án.** Nhắc lại mỗi lần.

**9. Không nói ràng buộc.** Nhận đề xuất bạn không dùng được.

**10. Giả định công cụ đọc repo là đủ.** Nó không thấy lý do và kế hoạch.

## Mẹo nhớ

> **Chất lượng đầu ra tỉ lệ với chất lượng NGỮ CẢNH — không phải số lượng.**
>
> **Một VÍ DỤ MẪU tương tự truyền đạt phong cách tốt hơn mọi lời mô tả.**
>
> **Kết quả sai ⇒ hỏi "tôi đã không nói ra điều gì?", đừng chỉ nói "làm lại".**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm loại ngữ cảnh, cái nào giá trị nhất trên mỗi dòng dán?
2. Vì sao dán cả repo làm kết quả tệ hơn?
3. Năm phần của một yêu cầu tốt?
4. Ba thứ mô hình không biết dù đọc được cả repo?
5. Khi kết quả sai thì làm gì?

## Tự viết lại

Bạn cần thêm endpoint `POST /don-hang/:id/huy`. Không nhìn lại, viết:

```text
① yêu cầu đầy đủ năm phần
② những gì bạn dán vào làm ngữ cảnh
③ file quy ước dự án của bạn (6–8 dòng)
④ kế hoạch chia nhỏ thành 3 bước
```

Tự kiểm: ở ② bạn có dán một endpoint **tương tự đã có** không — nếu không, bạn đang bỏ mất phần giá trị nhất.

## Thử sức

Bạn nhờ AI thêm một tính năng. Ba lần thử, cả ba lần nó dùng một thư viện đội đã bỏ từ năm ngoái, và không mở transaction ở chỗ cần.

Ba câu để trả lời: nguyên nhân của cả hai vấn đề nằm ở đâu; bạn sửa cách làm thế nào cho lần này; và bạn làm gì để nó **không lặp lại** ở mọi phiên sau. Câu khó nhất: nếu thư viện cũ vẫn còn trong `package.json` và vẫn còn mã dùng nó trong repo, việc chỉ thêm một dòng vào file quy ước có đủ không?
