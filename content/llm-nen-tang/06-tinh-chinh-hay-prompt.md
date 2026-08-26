---
title: Tinh chỉnh mô hình hay chỉnh prompt
slug: tinh-chinh-hay-prompt
summary: Bốn cách làm mô hình phù hợp hơn với bài toán của bạn, xếp theo chi phí — và vì sao tinh chỉnh thường là lựa chọn cuối.
level: nang-cao
tags: [ai, llm, fine-tuning, chi-phi]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bốn cách thích nghi mô hình và thứ tự thử chúng, cùng lý do tinh chỉnh ít khi là câu trả lời.

## Ý tưởng chính

Khi mô hình chưa làm đúng việc bạn cần, có bốn cách can thiệp — xếp theo chi phí tăng dần:

**Chỉnh prompt** → **Đưa ví dụ vào ngữ cảnh** → **Đưa dữ liệu vào ngữ cảnh (RAG)** → **Tinh chỉnh mô hình**.

Và một điều đi ngược trực giác: **tinh chỉnh không dạy mô hình kiến thức mới**. Nó dạy mô hình một **phong cách** hoặc một **định dạng**. Dùng nó để nhồi kiến thức là dùng sai công cụ.

## Mental model

Hãy nghĩ tới **làm cho một nhân viên mới làm đúng việc**.

> **Nói rõ yêu cầu hơn** — rẻ nhất, thử ngay. Phần lớn vấn đề dừng ở đây.
>
> **Cho xem vài ví dụ mẫu** — "làm giống ba cái này". Rất hiệu quả cho việc cần đúng định dạng.
>
> **Đưa họ tài liệu tra cứu** — họ không cần nhớ, chỉ cần biết tra ở đâu. Đây là cách đúng để xử lý **kiến thức**.
>
> **Đào tạo lại họ trong ba tháng** — đắt, lâu, và chỉ hợp lý khi bạn cần họ thay đổi **cách làm việc**, không phải bổ sung thông tin.

Không ai gửi nhân viên đi đào tạo ba tháng để họ nhớ danh sách sản phẩm. Người ta đưa họ catalogue.

## Ví dụ nhỏ

```text
Vấn đề: mô hình trả về JSON không đúng schema
  ① Chỉnh prompt:      nói rõ schema, yêu cầu chỉ trả JSON     ← thử trước
  ② Ví dụ trong prompt: đưa 3 cặp đầu vào–đầu ra mẫu
  ③ Bắt buộc schema:    dùng chế độ structured output của API
  ④ Tinh chỉnh:         gần như không cần cho bài toán này
```

## Code chạy thế nào

**Bốn cách và chi phí thật:**

```text
① CHỈNH PROMPT
   Chi phí: phút tới giờ.  Sửa lại: tức thì.
   Giải được: phần lớn vấn đề về định dạng, giọng điệu,
              cấu trúc đầu ra, phạm vi câu trả lời.

② VÍ DỤ TRONG NGỮ CẢNH (few-shot)
   Chi phí: giờ.  Sửa lại: tức thì.
   Giải được: định dạng khó diễn đạt bằng lời, quy ước riêng
              của miền, phân loại theo tiêu chí đặc thù.
   Cái giá:  ví dụ chiếm token ở MỌI lời gọi.

③ ĐƯA DỮ LIỆU VÀO NGỮ CẢNH (RAG)
   Chi phí: ngày tới tuần.  Sửa lại: cập nhật dữ liệu là xong.
   Giải được: KIẾN THỨC — tài liệu công ty, dữ liệu mới,
              thông tin sau mốc huấn luyện ([[rag-la-gi-va-khi-nao-dung]]).

④ TINH CHỈNH (fine-tuning)
   Chi phí: tuần, cộng dữ liệu huấn luyện, cộng vận hành.
   Sửa lại: huấn luyện lại — chậm và đắt.
   Giải được: PHONG CÁCH nhất quán, định dạng rất đặc thù,
              giảm độ dài prompt, và giảm chi phí ở quy mô lớn.
   KHÔNG giải được: thêm kiến thức mới một cách đáng tin.
```

**Vì sao tinh chỉnh không phải cách thêm kiến thức:**

```text
Tinh chỉnh điều chỉnh trọng số bằng một lượng dữ liệu nhỏ
so với tiền huấn luyện.

⇒ Mô hình học được CÁCH nói, không học chắc NỘI DUNG.
⇒ Kiến thức nhồi vào bằng tinh chỉnh:
     không đáng tin (vẫn bịa)
     không cập nhật được (dữ liệu đổi ⇒ huấn luyện lại)
     không trích dẫn được (không biết thông tin từ đâu)

⇒ Cả ba nhược điểm đó RAG không có: dữ liệu nằm ngoài,
  cập nhật tức thì, và trích dẫn được nguồn.
```

Đây là kết luận quan trọng nhất của bài: **kiến thức thì đưa vào ngữ cảnh; phong cách thì tinh chỉnh**.

## Cú pháp

**Quy trình chẩn đoán — sửa đúng nguyên nhân:**

```text
Mô hình làm sai. Hỏi theo thứ tự:

① Chỉ dẫn có RÕ RÀNG chưa?
   ⇒ Đọc lại prompt như người ngoài. Có chỗ nào mơ hồ?
   ⇒ Phần lớn "mô hình không hiểu" thật ra là "prompt không rõ".

② Mô hình có ĐỦ THÔNG TIN chưa?
   ⇒ Nó cần biết gì mà bạn chưa đưa vào?
   ⇒ Nếu là dữ liệu của bạn ⇒ RAG, không phải tinh chỉnh.

③ Định dạng có KHÓ DIỄN ĐẠT bằng lời không?
   ⇒ Có ⇒ đưa ví dụ. Ba ví dụ tốt thắng ba đoạn mô tả.

④ Vẫn sai sau ba bước trên, VÀ bạn có ≥ 500–1.000 ca mẫu
  chất lượng cao, VÀ lời gọi rất nhiều mỗi ngày?
   ⇒ Lúc này tinh chỉnh mới đáng cân nhắc.
```

**Ba lý do chính đáng để tinh chỉnh:**

```text
① GIẢM CHI PHÍ Ở QUY MÔ LỚN
   Prompt 2.000 token × 10 triệu lời gọi/tháng là khoản tiền lớn.
   Tinh chỉnh cho phép prompt 100 token với cùng hành vi.
   ⇒ Đây là lý do phổ biến nhất và ít được nói tới nhất.

② PHONG CÁCH RẤT ĐẶC THÙ, khó diễn đạt
   Giọng điệu thương hiệu, quy ước viết của một ngành hẹp.

③ MÔ HÌNH NHỎ ĐẠT CHẤT LƯỢNG MÔ HÌNH LỚN cho MỘT việc hẹp
   ⇒ Rẻ hơn và nhanh hơn nhiều ở đúng việc đó.
```

**Và ba lý do KHÔNG chính đáng:**

```text
✗ "Để mô hình biết về sản phẩm của chúng tôi"     → RAG
✗ "Để mô hình cập nhật thông tin mới"              → RAG
✗ "Prompt hiện tại chưa đúng lắm"                  → sửa prompt trước
```

**Nếu tinh chỉnh — bốn thứ quyết định kết quả:**

```text
□ CHẤT LƯỢNG dữ liệu quan trọng hơn số lượng
  500 ca sạch, nhất quán thắng 5.000 ca lẫn lộn.
  Và dữ liệu mâu thuẫn nhau làm hại nhiều hơn không có.

□ TẬP KIỂM TRA RIÊNG, không dùng để huấn luyện
  Không có thì bạn không biết mô hình có thật sự tốt hơn.

□ SO VỚI ĐƯỜNG CƠ SỞ
  Mô hình gốc + prompt tốt đạt bao nhiêu? Nếu tinh chỉnh chỉ
  hơn vài phần trăm, nó không đáng chi phí vận hành.

□ CHUẨN BỊ HUẤN LUYỆN LẠI
  Yêu cầu đổi, dữ liệu đổi ⇒ phải làm lại.
  ⇒ Đây là chi phí LẶP LẠI, không phải chi phí một lần.
```

Điểm cuối là chi phí hay bị bỏ qua khi ra quyết định: tinh chỉnh không phải một dự án, nó là **một thứ phải bảo trì**.

## Tại sao cần nó

Vì thứ tự thử sai gây ra lãng phí rất lớn:

```text
Nhảy thẳng vào tinh chỉnh:
  → vài tuần chuẩn bị dữ liệu
  → chi phí huấn luyện và vận hành
  → và có thể một prompt tốt hơn đã giải quyết xong trong một giờ
  → tệ hơn: nếu vấn đề thật là THIẾU KIẾN THỨC, tinh chỉnh
    không giải quyết được, và bạn phát hiện điều đó sau vài tuần

Theo thứ tự:
  → 80% vấn đề dừng ở bước ① hoặc ②
  → và khi tới bước ④, bạn đã biết CHÍNH XÁC nó cần giải gì
```

**Và một cách nhìn gọn:**

```text
Vấn đề về CÁCH NÓI      → prompt, ví dụ, hoặc tinh chỉnh
Vấn đề về CÁI BIẾT      → RAG, hoặc công cụ
Vấn đề về CHI PHÍ/TỐC ĐỘ → mô hình nhỏ hơn, hoặc tinh chỉnh
                            ([[chon-mo-hinh]])

Phân loại đúng vấn đề trước khi chọn công cụ.
```

## So sánh

| | Prompt | Few-shot | RAG | Tinh chỉnh |
|---|---|---|---|---|
| Chi phí bắt đầu | rất thấp | thấp | vừa | **cao** |
| Sửa lại | tức thì | tức thì | cập nhật dữ liệu | huấn luyện lại |
| Thêm kiến thức | ❌ | hạn chế | ✅ | ❌ |
| Đổi phong cách | một phần | ✅ | ❌ | ✅ |
| Token mỗi lời gọi | ít | **nhiều** | nhiều | **ít nhất** |
| Trích dẫn nguồn | — | — | ✅ | ❌ |

## Dễ nhầm

**1. Tinh chỉnh để thêm kiến thức.** Dùng sai công cụ.

**2. Nhảy vào tinh chỉnh trước khi sửa prompt.**

**3. Không có đường cơ sở để so.** Không biết có tốt hơn không.

**4. Không có tập kiểm tra riêng.**

**5. Nhiều dữ liệu lẫn lộn thay vì ít dữ liệu sạch.**

**6. Dữ liệu huấn luyện mâu thuẫn nhau.** Hại hơn không có.

**7. Coi tinh chỉnh là chi phí một lần.**

**8. Nhồi 20 ví dụ vào prompt mà không tính token.**

**9. Không phân loại vấn đề trước.** "Cách nói" và "cái biết" cần hai công cụ khác nhau.

**10. Bỏ qua structured output của API** rồi tự tinh chỉnh cho định dạng.

## Mẹo nhớ

> **Thứ tự: PROMPT → VÍ DỤ → RAG → TINH CHỈNH. Đừng nhảy cóc.**
>
> **Kiến thức thì đưa vào NGỮ CẢNH. Phong cách thì TINH CHỈNH.**
>
> **Tinh chỉnh là thứ phải BẢO TRÌ, không phải một dự án.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn cách thích nghi, chi phí và khả năng sửa lại của mỗi cách?
2. Vì sao tinh chỉnh không phải cách thêm kiến thức? Ba nhược điểm?
3. Quy trình chẩn đoán bốn câu hỏi?
4. Ba lý do chính đáng và ba lý do không chính đáng để tinh chỉnh?
5. Bốn thứ quyết định kết quả nếu tinh chỉnh?

## Tự viết lại

Không nhìn lại, chọn cách và giải thích cho từng vấn đề:

```text
① Mô hình không biết về 300 sản phẩm của công ty
② Mô hình trả lời đúng nhưng giọng điệu không giống thương hiệu
③ Mô hình trả JSON sai schema khoảng 5% số lần
④ Prompt hiện tại 3.000 token, có 8 triệu lời gọi mỗi tháng
⑤ Mô hình phân loại sai loại khiếu nại đặc thù của ngành
```

Tự kiểm: ở ⑤, bạn thử bao nhiêu cách trước khi tới tinh chỉnh — và cách nào có khả năng giải quyết xong nhất?

## Thử sức

Đội đề xuất tinh chỉnh một mô hình để nó "hiểu nghiệp vụ của công ty". Kế hoạch: thu thập 2.000 cuộc hội thoại hỗ trợ khách hàng làm dữ liệu huấn luyện, dự kiến ba tuần.

Ba câu để trả lời: bạn hỏi lại những gì để xác định vấn đề thật; bạn đề xuất thử gì **trước** và trong bao lâu; và nếu vẫn quyết định tinh chỉnh, bốn thứ phải chuẩn bị. Câu khó nhất: 2.000 cuộc hội thoại hỗ trợ thật — chúng dạy mô hình được gì và **không** dạy được gì, và bạn giải thích sự khác biệt đó cho đội thế nào?
