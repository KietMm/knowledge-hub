---
title: Chia đoạn tài liệu
slug: chia-doan-tai-lieu
summary: Bước ảnh hưởng chất lượng nhiều nhất và bị coi nhẹ nhất — kích thước, ranh giới, và siêu dữ liệu.
level: trung-cap
tags: [ai, rag, du-lieu, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** chia đoạn theo cấu trúc thay vì theo số ký tự, và biết vì sao đoạn mất ngữ cảnh là nguyên nhân sai phổ biến nhất.

## Ý tưởng chính

Đơn vị mà hệ thống RAG truy hồi là **đoạn**, không phải tài liệu. Nên chất lượng phụ thuộc vào một câu hỏi: **mỗi đoạn có tự đứng vững không?**

Một đoạn cắt giữa câu, hoặc mất tiêu đề mục, hoặc chứa đại từ trỏ tới thứ ở đoạn trước, sẽ được tìm thấy và **không dùng được**.

## Mental model

Hãy nghĩ tới **cắt một cuốn sách hướng dẫn thành các thẻ ghi chú**.

> Bạn cắt thành các thẻ để sau này tìm nhanh. Nhưng cắt thế nào?
>
> **Cắt theo số dòng** — cứ 20 dòng một thẻ. Nhanh, và một thẻ có thể bắt đầu bằng "…rồi vặn ngược lại" mà không biết đang vặn cái gì.
>
> **Cắt theo mục** — mỗi thẻ là một bước hoàn chỉnh, và **ghi tên chương ở góc thẻ**. Người đọc thẻ đó hiểu được mà không cần cuốn sách.
>
> Và với một bảng thông số dài: **đừng cắt đôi bảng**. Nửa bảng không có tiêu đề cột là vô nghĩa.

Ba nguyên tắc đó — cắt theo cấu trúc, mang theo tiêu đề, không cắt đôi thứ không chia được — là toàn bộ nội dung của bài này.

## Ví dụ nhỏ

```text
❌ Cắt theo 500 ký tự:
   "...và thời hạn đổi hàng. Điều 5. Sản phẩm phải còn nguyên tem,"

✅ Cắt theo mục, kèm tiêu đề:
   "[Chính sách đổi trả > Điều 5: Điều kiện đổi hàng]
    Sản phẩm phải còn nguyên tem, hộp và phụ kiện. Thời hạn 7 ngày."
```

## Code chạy thế nào

**Ba cách chia đoạn, theo chất lượng:**

```text
① THEO SỐ KÝ TỰ CỐ ĐỊNH
   Đơn giản nhất, và tệ nhất: cắt giữa câu, giữa bảng, giữa
   khối mã. Chỉ dùng khi tài liệu không có cấu trúc gì cả.

② THEO CẤU TRÚC TÀI LIỆU
   Chia ở ranh giới tự nhiên: tiêu đề, mục, đoạn văn, hàng bảng.
   Markdown chia theo `##`; HTML theo thẻ; PDF theo mục lục.
   ⇒ Đây là cách mặc định nên dùng.

③ THEO NGỮ NGHĨA
   Ghép các câu liên quan, cắt ở chỗ chủ đề đổi (dựa vào
   độ tương đồng giữa các câu liền nhau).
   ⇒ Tốt hơn một chút, tốn công hơn nhiều. Chỉ đáng khi tài liệu
     không có cấu trúc và bạn đã thử ② rồi.
```

**Kích thước đoạn — đánh đổi hai chiều:**

```text
ĐOẠN NHỎ (100–300 token)
  + Truy hồi CHÍNH XÁC hơn — đoạn tập trung vào một ý
  − Dễ mất ngữ cảnh; câu trả lời cần nhiều đoạn ghép lại

ĐOẠN LỚN (1.000–2.000 token)
  + Nhiều ngữ cảnh, tự đứng vững hơn
  − Truy hồi kém chính xác — một đoạn chứa nhiều ý,
    embedding của nó "trung bình hoá" các ý đó
  − Tốn token, và có phần không liên quan lọt vào ngữ cảnh

Điểm cân bằng thường dùng: 300–800 token, chia theo cấu trúc.
Và câu hỏi quyết định không phải "bao nhiêu token" mà
"một câu trả lời điển hình cần bao nhiêu nội dung liền mạch".
```

**Chồng lấp — và giới hạn của nó:**

```text
Cho hai đoạn liền nhau chia sẻ 10–20% nội dung ở biên.
⇒ Giảm rủi ro thông tin nằm đúng chỗ cắt.

Nhưng chồng lấp KHÔNG sửa được việc cắt sai chỗ:
  Cắt đôi một bảng, chồng lấp 15% vẫn là hai nửa bảng.
⇒ Chồng lấp là lưới an toàn cho cách ②, không phải thay thế cho nó.
```

## Cú pháp

**Siêu dữ liệu — nửa còn lại của bài toán:**

```ts
{
  noiDung: 'Sản phẩm phải còn nguyên tem, hộp và phụ kiện...',
  embedding: [...],
  sieuDuLieu: {
    tieuDe: 'Chính sách đổi trả > Điều 5: Điều kiện đổi hàng',
    nguon: 'chinh-sach-doi-tra.md',
    capNhat: '2026-07-01',
    phongBan: 'ban-hang',      // ← để lọc theo quyền
    loai: 'chinh-sach',
  },
}
```

```text
Bốn công dụng của siêu dữ liệu:
  ① TRÍCH DẪN — người dùng biết thông tin từ đâu
  ② LỌC — chỉ tìm trong tài liệu người này được xem
     ⇒ Đây là nơi phân quyền được thực thi, và nó là MÃ,
       không phải một dòng trong prompt
       ([[phan-quyen-theo-ban-ghi]])
  ③ THU HẸP — "chỉ tìm trong tài liệu năm 2026"
  ④ GỠ LỖI — biết đoạn nào được truy hồi và từ đâu
```

**Đưa tiêu đề vào chính nội dung đoạn:**

```text
Không chỉ để trong siêu dữ liệu — hãy ghép vào TRƯỚC nội dung
khi tính embedding và khi đưa vào ngữ cảnh:

  "[Chính sách đổi trả > Điều 5: Điều kiện đổi hàng]
   Sản phẩm phải còn nguyên tem..."

Hai lợi ích:
  ① Embedding mang theo chủ đề ⇒ truy hồi chính xác hơn
  ② Mô hình biết đoạn này thuộc mục nào ⇒ trả lời có ngữ cảnh
```

Đây là một thay đổi nhỏ với tác động lớn, và nó thường cho cải thiện rõ hơn việc đổi thuật toán truy hồi.

**Ba loại nội dung cần xử lý riêng:**

```text
BẢNG
  Đừng cắt đôi. Mỗi bảng (hoặc mỗi nhóm hàng) là một đoạn,
  và LẶP LẠI tiêu đề cột trong mỗi đoạn nếu phải chia.

KHỐI MÃ
  Đừng cắt đôi. Kèm theo đoạn văn giải thích ngay trước nó.

TÀI LIỆU DÀI CÓ CẤU TRÚC PHÂN CẤP
  Cân nhắc lưu hai mức: đoạn nhỏ để TÌM, đoạn lớn (hoặc cả mục)
  để ĐƯA VÀO ngữ cảnh.
  ⇒ Tìm chính xác bằng đoạn nhỏ, trả lời đầy đủ bằng đoạn lớn.
    Đây là kỹ thuật hiệu quả và không phức tạp lắm.
```

**Cập nhật tài liệu — thiết kế từ đầu:**

```text
Tài liệu sửa ⇒ phải cập nhật đoạn tương ứng.

□ Lưu id nguồn trong siêu dữ liệu ⇒ xoá mọi đoạn của tài liệu đó,
  chèn lại đoạn mới
□ Lưu hash nội dung ⇒ tài liệu không đổi thì không tính lại embedding
  (tiết kiệm đáng kể khi có hàng nghìn tài liệu)
□ Tài liệu bị XOÁ ⇒ phải xoá đoạn. Bỏ bước này là hệ thống
  trả lời theo thông tin đã bị thu hồi.
```

Điểm cuối là loại lỗi nghiêm trọng và dễ bỏ: một chính sách đã hết hiệu lực vẫn được trợ lý dẫn ra.

## Tại sao cần nó

Vì đây là bước cho **cải thiện lớn nhất trên mỗi giờ công**:

```text
Đội thường tiêu nhiều thời gian vào:
  □ đổi mô hình embedding      → cải thiện nhỏ
  □ thêm thuật toán xếp hạng lại → cải thiện vừa
  □ tinh chỉnh prompt          → không sửa được lỗi truy hồi

Trong khi chia đoạn tệ là nguyên nhân của phần lớn ca sai:
  đoạn mất tiêu đề, cắt giữa bảng, chứa đại từ không rõ trỏ gì.
⇒ Kiểm chia đoạn TRƯỚC khi làm ba việc trên.
```

**Cách kiểm nhanh chất lượng chia đoạn:**

```text
Lấy 20 đoạn ngẫu nhiên. Với mỗi đoạn, tự hỏi:
  □ Đọc riêng đoạn này, tôi hiểu nó nói về gì không?
  □ Có đại từ nào không rõ trỏ tới đâu?
  □ Có bị cắt giữa câu, giữa bảng, giữa khối mã?
  □ Có biết nó thuộc mục nào của tài liệu nào?

Quá 3–4 đoạn có vấn đề ⇒ sửa chia đoạn trước khi làm gì khác.
```

Phép kiểm này mất mười phút và thường chỉ ra ngay nguyên nhân.

## So sánh

| Cách chia | Chất lượng | Công sức | Khi nào |
|---|---|---|---|
| Số ký tự cố định | thấp | rất thấp | tài liệu không cấu trúc |
| Theo cấu trúc | **cao** | thấp | mặc định |
| Theo ngữ nghĩa | cao hơn chút | cao | đã thử cấu trúc rồi |
| Hai mức (tìm nhỏ, đưa lớn) | cao nhất | vừa | tài liệu dài, phân cấp |

## Dễ nhầm

**1. Chia theo số ký tự cố định.** Cắt giữa câu, giữa bảng.

**2. Không đưa tiêu đề vào nội dung đoạn.** Mất chủ đề khi tính embedding.

**3. Cắt đôi bảng hoặc khối mã.**

**4. Đoạn quá lớn.** Truy hồi kém chính xác.

**5. Đoạn quá nhỏ.** Mất ngữ cảnh, cần ghép nhiều đoạn.

**6. Tin chồng lấp sửa được việc cắt sai chỗ.**

**7. Không lưu siêu dữ liệu.** Không trích dẫn, không lọc quyền được.

**8. Không xử lý tài liệu bị xoá.** Trả lời theo thông tin đã thu hồi.

**9. Tính lại embedding cho mọi tài liệu mỗi lần cập nhật.**

**10. Tối ưu truy hồi trước khi kiểm chia đoạn.**

## Mẹo nhớ

> **Câu hỏi duy nhất: đọc RIÊNG đoạn này, có hiểu được không?**
>
> **Chia theo CẤU TRÚC, và ghép TIÊU ĐỀ vào nội dung đoạn.**
>
> **Chia đoạn cho cải thiện lớn nhất trên mỗi giờ công — kiểm nó trước.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba cách chia đoạn, cách nào là mặc định nên dùng?
2. Đánh đổi giữa đoạn nhỏ và đoạn lớn?
3. Chồng lấp giải quyết gì và không giải quyết gì?
4. Bốn công dụng của siêu dữ liệu?
5. Phép kiểm nhanh chất lượng chia đoạn?

## Tự viết lại

Bạn cần đưa vào RAG: 200 trang tài liệu kỹ thuật markdown có tiêu đề nhiều cấp, nhiều bảng thông số và khối mã. Không nhìn lại, thiết kế:

```text
① cách chia đoạn, kích thước nhắm tới
② xử lý bảng và khối mã
③ siêu dữ liệu cho mỗi đoạn
④ quy trình cập nhật khi tài liệu sửa hoặc bị xoá
```

Tự kiểm: ở ①, một câu trả lời điển hình cần bao nhiêu nội dung liền mạch — và kích thước đoạn của bạn có phù hợp với con số đó?

## Thử sức

Hệ thống RAG trả lời sai nhiều câu hỏi về thông số sản phẩm. Tài liệu là PDF catalogue với nhiều bảng, được chia đoạn theo 1.000 ký tự.

Ba câu để trả lời: nguyên nhân gần như chắc chắn; bạn sửa chia đoạn thế nào cho bảng; và bạn xác nhận đã cải thiện bằng cách nào. Câu khó nhất: nếu một bảng có 200 hàng và không thể là một đoạn, bạn chia nó ra sao để mỗi đoạn vẫn **tự đứng vững**?
