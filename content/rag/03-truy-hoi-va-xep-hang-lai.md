---
title: Truy hồi và xếp hạng lại
slug: truy-hoi-va-xep-hang-lai
summary: Tìm ngữ nghĩa, tìm từ khoá, kết hợp cả hai, và một bước xếp hạng lại thường cho cải thiện lớn nhất.
level: trung-cap
tags: [ai, rag, tim-kiem, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** kết hợp hai kiểu tìm kiếm, và biết vì sao xếp hạng lại thường là bước đáng thêm nhất.

## Ý tưởng chính

Tìm theo **ngữ nghĩa** (embedding) hiểu được ý, nhưng hay bỏ sót từ khoá chính xác. Tìm theo **từ khoá** bắt được từ chính xác, nhưng không hiểu cách diễn đạt khác.

Chúng mạnh và yếu ở những chỗ **khác nhau**. Nên câu trả lời thường không phải chọn một, mà là **dùng cả hai rồi xếp hạng lại**.

## Mental model

Hãy nghĩ tới **tìm một cuốn sách trong thư viện bằng hai cách**.

> **Hỏi thủ thư về nội dung**: "tôi cần sách nói về cách nuôi dạy trẻ tuổi teen". Họ hiểu ý, gợi ý cả những cuốn không có chữ "teen" trong tiêu đề. Nhưng nếu bạn hỏi "cho tôi cuốn ISBN 978-604-1-08765", họ lại kém — con số không gợi ý gì về nội dung.
>
> **Tra danh mục theo từ**: nhập chính xác thì ra ngay. Nhưng gõ "thiếu niên" trong khi sách ghi "vị thành niên" thì không ra gì.
>
> **Cách tốt nhất**: lấy 20 cuốn từ cả hai nguồn, rồi **cầm lên xem thật** vài cuốn để chọn 3 cuốn tốt nhất.

Bước "cầm lên xem thật" là **xếp hạng lại** — đắt hơn nhiều nên chỉ áp dụng cho một danh sách ngắn, nhưng chính xác hơn hẳn.

## Ví dụ nhỏ

```text
Câu hỏi: "Bảo hành SP-4402 bao lâu?"

Tìm ngữ nghĩa  → đoạn về chính sách bảo hành chung  (hiểu ý)
Tìm từ khoá    → đoạn chứa đúng "SP-4402"           (bắt mã sản phẩm)
Kết hợp        → cả hai, rồi xếp hạng lại
```

## Code chạy thế nào

**Hai kiểu tìm kiếm mạnh/yếu ở đâu:**

```text
TÌM NGỮ NGHĨA (embedding)
  ✅ Diễn đạt khác nhau: "hoàn tiền" tìm ra "trả lại tiền"
  ✅ Câu hỏi tự do, dài, mô tả
  ❌ Mã sản phẩm, số hiệu, tên riêng hiếm, thuật ngữ chuyên ngành
  ❌ Phủ định — "không bao gồm pin" và "bao gồm pin" rất giống nhau
     trong không gian vector

TÌM TỪ KHOÁ (BM25 / full-text)
  ✅ Từ chính xác, mã, tên riêng, số
  ✅ Rẻ, nhanh, giải thích được vì sao ra kết quả đó
  ❌ Không hiểu từ đồng nghĩa
  ❌ Không hiểu diễn đạt khác
```

```text
Điểm yếu "phủ định" của tìm ngữ nghĩa đáng nhớ: nó là nguyên nhân
của một loại sai rất khó hiểu, khi hệ thống trả về đúng đoạn về
chủ đề nhưng NGƯỢC nghĩa.
```

**Kết hợp — hợp nhất hai danh sách:**

```text
① Chạy cả hai, mỗi bên lấy top-20
② Hợp nhất bằng cách cộng điểm theo THỨ HẠNG, không theo điểm số
   ⇒ Điểm của hai hệ thống có thang khác nhau, không cộng trực tiếp được.
   ⇒ Cách phổ biến: mỗi tài liệu được cộng 1/(k + thứ hạng)
     từ mỗi danh sách. Tài liệu xuất hiện ở CẢ HAI được đẩy lên cao.
③ Lấy top-20 sau hợp nhất
④ Xếp hạng lại còn top-3 tới top-5
```

Bước ② đáng chú ý: hợp nhất theo thứ hạng vừa đơn giản vừa không cần hiệu chỉnh thang điểm — nên nó là mặc định tốt.

## Cú pháp

**Xếp hạng lại — bước cho cải thiện lớn nhất:**

```text
Truy hồi bằng embedding: so sánh HAI vector đã tính SẴN.
  ⇒ Rất nhanh, tìm được trong hàng triệu đoạn.
  ⇒ Nhưng embedding của câu hỏi và của đoạn được tính ĐỘC LẬP —
    mô hình không bao giờ "nhìn hai cái cùng lúc".

Mô hình xếp hạng lại: nhận CẢ câu hỏi VÀ đoạn cùng lúc, chấm điểm.
  ⇒ Chính xác hơn nhiều.
  ⇒ Nhưng phải chạy cho TỪNG cặp ⇒ chỉ dùng được cho 20–50 ứng viên,
    không dùng được cho cả kho.

⇒ Nên kiến trúc hai tầng: truy hồi RỘNG và NHANH → xếp hạng lại
  HẸP và CHÍNH XÁC.
```

```text
Trong thực tế, thêm bước xếp hạng lại thường cải thiện rõ hơn
việc đổi sang mô hình embedding tốt hơn — và rẻ hơn để thử.
Cái giá: thêm ~50–200ms độ trễ.
```

**Viết lại câu hỏi — xử lý hai vấn đề:**

```text
① CÂU HỎI PHỤ THUỘC HỘI THOẠI
   "Còn size 42 không?" ⇒ còn của SẢN PHẨM NÀO?
   ⇒ Viết lại thành câu độc lập trước khi truy hồi:
     "Giày chạy bộ Nike Pegasus còn size 42 không?"
   ⇒ Không làm bước này thì truy hồi trong hội thoại nhiều lượt
     gần như luôn sai.

② CÂU HỎI GỒM NHIỀU Ý
   "So sánh chính sách bảo hành của A và B"
   ⇒ Tách thành hai truy vấn, truy hồi riêng, ghép kết quả.
```

**Lọc theo siêu dữ liệu — trước hay sau khi tìm:**

```text
LỌC TRƯỚC: chỉ tìm trong tập đã lọc
  ✅ Đúng về quyền — người dùng không thể chạm tới đoạn không
     được xem
  ⇒ ĐÂY là cách bắt buộc cho phân quyền.

LỌC SAU: tìm trong tất cả rồi bỏ kết quả không được xem
  ❌ Nếu 5 kết quả đầu đều bị lọc, bạn còn 0 kết quả
  ❌ Và nó có nghĩa là hệ thống đã ĐỌC dữ liệu không được phép

⇒ Với phân quyền: luôn lọc trước.
```

**Chọn k — bao nhiêu đoạn đưa vào ngữ cảnh:**

```text
k quá nhỏ (1–2): bỏ sót thông tin nếu câu trả lời cần nhiều nguồn
k quá lớn (15+): loãng, tốn token, và đoạn quan trọng bị kẹp giữa
                 ([[token-va-context-window]])

Điểm cân bằng thường dùng: 3–5 sau khi xếp hạng lại.
Và đặt NGƯỠNG ĐIỂM: đoạn dưới ngưỡng thì bỏ, kể cả khi chưa đủ k.
⇒ Đưa vào một đoạn không liên quan tệ hơn là đưa ít đoạn.
```

## Tại sao cần nó

Vì mọi thứ sau bước truy hồi đều bị chặn bởi nó:

```text
Đoạn đúng KHÔNG có trong kết quả truy hồi
  ⇒ Không prompt nào, không mô hình nào cứu được.
  ⇒ Câu trả lời hoặc là "không tìm thấy", hoặc là sai.

⇒ Chỉ số quan trọng nhất của RAG: TỈ LỆ ĐOẠN ĐÚNG NẰM TRONG TOP-K.
  Đo nó trước, cải thiện nó trước ([[danh-gia-he-thong-rag]]).
```

**Thứ tự cải thiện, theo tỉ lệ lợi ích trên công sức:**

```text
① Kiểm và sửa CHIA ĐOẠN            ← thường lớn nhất
② Thêm TÌM TỪ KHOÁ, kết hợp hai kiểu
③ Thêm XẾP HẠNG LẠI
④ Viết lại câu hỏi cho hội thoại nhiều lượt
⑤ Đổi mô hình embedding             ← thường nhỏ nhất
```

Thứ tự này ngược với thói quen: người ta hay bắt đầu từ ⑤ vì nó dễ thử nhất — đổi một dòng cấu hình.

**Và một cách nhìn:** RAG là một hệ thống tìm kiếm có mô hình ngôn ngữ ở cuối. Phần lớn công việc cải thiện nó là công việc của **tìm kiếm**, không phải của AI.

## So sánh

| | Ngữ nghĩa | Từ khoá | Kết hợp | + xếp hạng lại |
|---|---|---|---|---|
| Diễn đạt khác | ✅ | ❌ | ✅ | ✅ |
| Mã, tên riêng | ❌ | ✅ | ✅ | ✅ |
| Phủ định | ❌ | một phần | một phần | ✅ tốt hơn |
| Độ trễ | thấp | rất thấp | thấp | +50–200ms |
| Độ chính xác | vừa | vừa | tốt | **tốt nhất** |

## Dễ nhầm

**1. Chỉ dùng tìm ngữ nghĩa.** Bỏ sót mã, tên riêng, thuật ngữ.

**2. Cộng trực tiếp điểm của hai hệ thống.** Thang khác nhau.

**3. Không có bước xếp hạng lại.** Bỏ qua cải thiện lớn.

**4. Không viết lại câu hỏi trong hội thoại nhiều lượt.**

**5. Lọc quyền SAU khi tìm.** Sai về bảo mật và về số lượng kết quả.

**6. k quá lớn.** Loãng và tốn token.

**7. Không đặt ngưỡng điểm.** Đoạn không liên quan vẫn lọt vào.

**8. Bỏ qua điểm yếu phủ định của tìm ngữ nghĩa.**

**9. Đổi mô hình embedding trước khi sửa chia đoạn.**

**10. Không đo tỉ lệ đoạn đúng trong top-k.**

## Mẹo nhớ

> **Ngữ nghĩa hiểu Ý, từ khoá bắt CHỮ. Dùng cả hai rồi hợp nhất theo THỨ HẠNG.**
>
> **Xếp hạng lại nhìn câu hỏi và đoạn CÙNG LÚC — nên chính xác hơn, và chỉ chạy trên danh sách ngắn.**
>
> **Chỉ số quan trọng nhất: đoạn đúng có nằm trong top-k không.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Hai kiểu tìm kiếm mạnh và yếu ở đâu?
2. Vì sao hợp nhất theo thứ hạng chứ không theo điểm?
3. Xếp hạng lại khác truy hồi bằng embedding ở điểm cốt lõi nào?
4. Vì sao phải viết lại câu hỏi trong hội thoại nhiều lượt?
5. Vì sao lọc quyền phải làm trước khi tìm?

## Tự viết lại

Không nhìn lại, thiết kế truy hồi cho trợ lý hỗ trợ kỹ thuật, tài liệu có nhiều mã lỗi và mã sản phẩm:

```text
① kiểu tìm kiếm, và vì sao
② cách hợp nhất kết quả
③ có xếp hạng lại không, k bằng bao nhiêu
④ xử lý câu hỏi trong hội thoại nhiều lượt
⑤ lọc theo quyền ở đâu
```

Tự kiểm: với câu hỏi "lỗi E-4402 là gì", kiểu tìm kiếm nào của bạn sẽ ra kết quả đúng?

## Thử sức

Hệ thống RAG của bạn trả lời tốt các câu hỏi chung nhưng gần như luôn sai khi khách hỏi về một mã sản phẩm cụ thể. Hệ thống chỉ dùng tìm kiếm bằng embedding.

Ba câu để trả lời: nguyên nhân; cách sửa và thứ tự các bước; và bạn đo cải thiện bằng chỉ số nào. Câu khó nhất: sau khi thêm tìm từ khoá, một số câu hỏi **trước đó đúng** giờ lại sai — chuyện gì có thể đã xảy ra ở bước hợp nhất, và bạn kiểm ra sao?
