---
title: RAG là gì và khi nào dùng
slug: rag-la-gi-va-khi-nao-dung
summary: Nối mô hình với dữ liệu của bạn — kiến trúc bốn bước, và ba lựa chọn thay thế thường bị bỏ qua.
level: co-ban
tags: [ai, rag, kien-truc, tim-kiem]
khung: v2
---

> **Sau bài này bạn sẽ:** mô tả được kiến trúc RAG bốn bước, và biết khi nào một cách đơn giản hơn là đủ.

## Ý tưởng chính

Mô hình không biết dữ liệu của bạn, và bạn **không thể nhồi hết** vào ngữ cảnh.

**RAG** giải bằng cách đảo thứ tự: **tìm phần liên quan trước, rồi mới hỏi mô hình dựa trên phần đó**. Nó biến bài toán từ *"mô hình có nhớ không"* thành *"tôi có tìm đúng đoạn không"*.

Và câu thứ hai là một bài toán tìm kiếm — thứ có thể đo và cải thiện.

## Mental model

Hãy nghĩ tới **luật sư tra cứu trước khi trả lời**.

> Bạn hỏi luật sư một câu về hợp đồng. Họ **không** trả lời từ trí nhớ — dù họ đã đọc bộ luật đó nhiều lần.
>
> Họ mở đúng vài điều khoản liên quan, đọc, rồi trả lời **kèm dẫn chiếu**.
>
> Ba lợi ích đến cùng nhau: câu trả lời đúng hơn, bạn kiểm được, và khi luật sửa thì họ không cần học lại — chỉ cần tra bản mới.

Ba lợi ích đó chính là lý do RAG được dùng thay vì tinh chỉnh mô hình. Và điểm yếu cũng lộ ra ngay: **nếu họ mở sai điều khoản, câu trả lời sai một cách rất thuyết phục**.

## Ví dụ nhỏ

```text
Câu hỏi: "Chính sách đổi hàng bao nhiêu ngày?"
  ① Tìm trong tài liệu → 3 đoạn liên quan nhất
  ② Đưa 3 đoạn đó + câu hỏi vào prompt
  ③ Mô hình trả lời DỰA TRÊN 3 đoạn đó, kèm trích dẫn
```

## Code chạy thế nào

**Bốn bước, và mỗi bước có thể hỏng:**

```text
① CHUẨN BỊ (offline, làm một lần rồi cập nhật dần)
   tài liệu → chia đoạn → tính embedding → lưu vào vector store
   Hỏng ở đây: đoạn cắt sai chỗ, mất ngữ cảnh
   ⇒ Đây là bước ảnh hưởng chất lượng nhiều nhất và bị coi nhẹ nhất
     ([[chia-doan-tai-lieu]])

② TRUY HỒI (mỗi câu hỏi)
   câu hỏi → embedding → tìm k đoạn gần nhất
   Hỏng ở đây: tìm sai đoạn ⇒ mọi thứ sau đó vô nghĩa

③ TĂNG CƯỜNG NGỮ CẢNH
   ghép các đoạn tìm được vào prompt
   Hỏng ở đây: quá nhiều đoạn ⇒ loãng; sai thứ tự ⇒ đoạn quan
   trọng bị kẹp giữa ([[token-va-context-window]])

④ SINH CÂU TRẢ LỜI
   mô hình trả lời dựa trên ngữ cảnh, kèm trích dẫn
   Hỏng ở đây: mô hình bỏ qua ngữ cảnh và dùng trí nhớ của nó
```

**Nguyên tắc quan trọng nhất: chất lượng RAG bị chặn bởi bước ②.**

```text
Truy hồi sai đoạn ⇒ mô hình có hai lựa chọn, cả hai đều tệ:
  □ Nói "không tìm thấy" — dù thông tin CÓ trong tài liệu
  □ Trả lời dựa trên đoạn sai — nghe thuyết phục và sai

⇒ Cải thiện prompt không sửa được lỗi truy hồi.
⇒ Nên khi câu trả lời sai, câu hỏi ĐẦU TIÊN là:
  "đoạn đúng có nằm trong kết quả truy hồi không?"
  ([[danh-gia-he-thong-rag]])
```

## Cú pháp

**Ba lựa chọn thay thế — thử trước khi dựng RAG:**

```text
① NHỒI HẾT VÀO NGỮ CẢNH
   Tài liệu dưới ~50 trang, context window đủ chứa?
   ⇒ Đưa hết vào. Không cần vector store, không cần chia đoạn,
     không có bước truy hồi để hỏng.
   ⇒ Đắt hơn mỗi lời gọi, nhưng đơn giản hơn rất nhiều.
   ⇒ Cache phần ngữ cảnh cố định thì chi phí giảm đáng kể.

② TÌM KIẾM TỪ KHOÁ SẴN CÓ
   Đã có full-text search trong Postgres?
   ⇒ Dùng nó để lấy đoạn liên quan, rồi đưa vào prompt.
   ⇒ Với dữ liệu có thuật ngữ, mã sản phẩm, tên riêng — tìm kiếm
     từ khoá THƯỜNG TỐT HƠN tìm theo ngữ nghĩa
     ([[jsonb-va-tim-kiem-toan-van]]).

③ TRUY VẤN CÓ CẤU TRÚC
   Câu hỏi thật ra là một truy vấn: "đơn hàng của tôi tháng này"
   ⇒ Đây KHÔNG phải bài toán tìm kiếm ngữ nghĩa.
     Dùng function calling để gọi CSDL ([[function-calling-co-ban]]).
```

```text
Rất nhiều hệ thống "cần RAG" thật ra thuộc nhóm ① hoặc ③.
⇒ Hỏi trước: dữ liệu bao nhiêu, và câu hỏi có cấu trúc không?
```

**Khi RAG là lựa chọn đúng:**

```text
□ Dữ liệu LỚN — hàng nghìn trang, không nhồi hết được
□ Dữ liệu THAY ĐỔI — cập nhật tài liệu là xong, không huấn luyện lại
□ Cần TRÍCH DẪN NGUỒN — người dùng phải kiểm được
□ Câu hỏi MỞ, diễn đạt tự do, không map thành truy vấn được
□ Cần PHÂN QUYỀN theo tài liệu — lọc ở bước truy hồi
```

Điểm cuối là một lợi thế của RAG ít được nói tới: vì truy hồi là **mã của bạn**, bạn lọc được theo quyền của người dùng trước khi đưa vào ngữ cảnh. Tinh chỉnh mô hình không làm được điều này.

**RAG so với tinh chỉnh — bảng quyết định:**

```text
Cần thêm KIẾN THỨC       → RAG
Cần đổi PHONG CÁCH       → tinh chỉnh
Dữ liệu đổi thường xuyên → RAG (tinh chỉnh phải huấn luyện lại)
Cần trích dẫn nguồn      → RAG (tinh chỉnh không biết nguồn)
Cần giảm token/chi phí   → tinh chỉnh
                           ([[tinh-chinh-hay-prompt]])
```

## Tại sao cần nó

Vì RAG chuyển bài toán sang một dạng bạn **kiểm soát được**:

```text
Không có RAG:
  "Mô hình có nhớ chính sách của chúng tôi không?"
  ⇒ Không đo được, không sửa được, không cập nhật được.

Có RAG:
  "Hệ thống tìm kiếm của tôi có tìm ra đúng đoạn không?"
  ⇒ Đo được (đoạn đúng có trong top-k?)
  ⇒ Sửa được (chia đoạn khác, đổi cách truy hồi, xếp hạng lại)
  ⇒ Cập nhật được (thêm tài liệu là xong)
```

**Ba thứ RAG KHÔNG giải quyết:**

```text
① Câu hỏi cần TỔNG HỢP toàn bộ tài liệu
   "Tổng doanh thu năm nay là bao nhiêu?" — nếu số liệu rải ở
   200 trang, truy hồi 5 đoạn không đủ.
   ⇒ Cần truy vấn có cấu trúc, không cần tìm kiếm ngữ nghĩa.

② Thông tin KHÔNG CÓ trong tài liệu
   ⇒ RAG làm mô hình trả lời đúng hơn về những gì CÓ.
     Nó không tạo ra thông tin không tồn tại.

③ Mô hình BỎ QUA ngữ cảnh
   Nó vẫn có thể dùng trí nhớ của nó thay vì đoạn bạn đưa.
   ⇒ Cần chỉ dẫn rõ và yêu cầu trích dẫn
     ([[tao-cau-tra-loi-va-trich-dan]]).
```

**Bắt đầu từ đâu:**

```text
① Thử nhồi hết vào ngữ cảnh. Đủ thì DỪNG.
② Không đủ ⇒ thử tìm kiếm từ khoá sẵn có.
③ Vẫn không đủ ⇒ RAG, và bắt đầu bằng phiên bản đơn giản nhất:
   chia đoạn theo tiêu đề, embedding, tìm top-5.
④ Đo. Rồi mới cải thiện từng bước.

⇒ Đừng bắt đầu bằng kiến trúc phức tạp nhất. Phần lớn cải thiện
  đến từ CHIA ĐOẠN tốt hơn, không từ thuật toán truy hồi phức tạp.
```

## So sánh

| | Nhồi hết ngữ cảnh | Tìm từ khoá | RAG | Tinh chỉnh |
|---|---|---|---|---|
| Dữ liệu lớn | ❌ | ✅ | ✅ | ✅ |
| Cập nhật tức thì | ✅ | ✅ | ✅ | ❌ |
| Trích dẫn nguồn | ✅ | ✅ | ✅ | ❌ |
| Phân quyền theo tài liệu | khó | ✅ | ✅ | ❌ |
| Độ phức tạp | rất thấp | thấp | **vừa–cao** | cao |
| Chi phí mỗi lời gọi | cao | thấp | thấp | thấp nhất |

## Dễ nhầm

**1. Dựng RAG khi nhồi hết vào ngữ cảnh là đủ.**

**2. Dùng RAG cho câu hỏi thật ra là truy vấn có cấu trúc.**

**3. Bỏ qua tìm kiếm từ khoá.** Với thuật ngữ và mã, nó thường tốt hơn.

**4. Sửa prompt khi vấn đề nằm ở truy hồi.**

**5. Nghĩ RAG loại bỏ ảo giác.** Nó giảm, không loại bỏ.

**6. Không kiểm đoạn đúng có trong top-k hay không.**

**7. Đưa quá nhiều đoạn vào ngữ cảnh.** Loãng.

**8. Không lọc theo quyền ở bước truy hồi.**

**9. Dùng RAG cho câu hỏi cần tổng hợp toàn bộ.**

**10. Bắt đầu bằng kiến trúc phức tạp nhất.**

## Mẹo nhớ

> **RAG đổi câu hỏi từ "mô hình có nhớ không" thành "tôi có TÌM ĐÚNG không".**
>
> **Chất lượng RAG bị CHẶN bởi bước truy hồi. Prompt không sửa được lỗi truy hồi.**
>
> **Thử NHỒI HẾT và TÌM TỪ KHOÁ trước. Nhiều hệ thống "cần RAG" thật ra không cần.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn bước của RAG, mỗi bước hỏng thế nào?
2. Vì sao chất lượng bị chặn bởi bước truy hồi?
3. Ba lựa chọn thay thế nên thử trước?
4. Năm điều kiện khiến RAG là lựa chọn đúng?
5. Ba thứ RAG không giải quyết?

## Tự viết lại

Không nhìn lại, quyết định cách làm cho từng trường hợp và giải thích:

```text
① Trả lời câu hỏi dựa trên 20 trang chính sách công ty
② Trả lời dựa trên 5.000 tài liệu kỹ thuật
③ "Đơn hàng của tôi đang ở đâu?"
④ "Tổng chi phí marketing quý này là bao nhiêu?"
⑤ Tìm sản phẩm theo mô tả tự do của khách
```

Tự kiểm: ở ⑤, tìm theo ngữ nghĩa và tìm theo từ khoá — cái nào tốt hơn, và có nên dùng cả hai?

## Thử sức

Trợ lý RAG của đội trả lời sai khoảng 30% câu hỏi. Đội đã sửa prompt bốn lần, không cải thiện.

Ba câu để trả lời: bạn chẩn đoán bằng cách nào để biết vấn đề ở bước nào; nếu vấn đề ở truy hồi, ba hướng cải thiện; và bạn đo tiến bộ bằng chỉ số gì. Câu khó nhất: nếu với 30% câu sai đó, đoạn đúng **có** nằm trong kết quả truy hồi, vấn đề nằm ở đâu — và bạn sửa thế nào?
