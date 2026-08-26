---
title: Token và context window
slug: token-va-context-window
summary: Đơn vị tính tiền, giới hạn cứng của mọi lời gọi, và vì sao ngữ cảnh dài không phải luôn tốt hơn.
level: co-ban
tags: [ai, llm, token, chi-phi]
khung: v2
---

> **Sau bài này bạn sẽ:** ước lượng được token và chi phí, và biết vì sao nhồi đầy context window làm kết quả tệ hơn.

## Ý tưởng chính

**Context window** là toàn bộ thứ mô hình "thấy" trong một lời gọi: chỉ dẫn hệ thống, lịch sử hội thoại, tài liệu bạn dán vào, **và cả phần nó đang sinh ra**.

Nó là một giới hạn **cứng**. Và nó cũng là đơn vị tính tiền. Hai điều đó làm việc quản lý ngữ cảnh trở thành một phần thật của kiến trúc, không phải một chi tiết.

## Mental model

Hãy nghĩ tới **cái bàn làm việc của một người chỉ nhìn được những gì trên bàn**.

> Mọi thứ họ cần để trả lời phải **đặt trên bàn**: câu hỏi, tài liệu tham khảo, ghi chú của cuộc nói chuyện trước.
>
> Bàn có kích thước cố định. Đặt thêm thì phải bỏ bớt.
>
> Và điểm quan trọng: **bàn càng bừa thì họ càng khó tìm đúng tờ giấy cần**. Chồng năm trăm trang lên bàn không làm họ thông minh hơn — nó làm họ khó tìm hơn.

Vế cuối là điều đi ngược trực giác nhất: context window lớn hơn cho phép bạn đưa nhiều hơn, nhưng **không** đảm bảo mô hình dùng tốt hơn.

## Ví dụ nhỏ

```text
Một lời gọi gồm:
  chỉ dẫn hệ thống      ~200 token
  lịch sử hội thoại   ~3.000 token
  tài liệu dán vào    ~5.000 token
  câu hỏi                ~50 token
  ────────────────────────────────
  đầu vào             ~8.250 token
  đầu ra (sinh ra)      ~800 token   ← cũng nằm trong giới hạn
```

## Code chạy thế nào

**Cách token hoá — và vì sao ước lượng lệch:**

```text
Tiếng Anh:    ~4 ký tự / token   → 1.000 từ ≈ 1.300 token
Tiếng Việt:   ~2–3 ký tự / token → 1.000 từ ≈ 2.000–2.500 token
Mã nguồn:     nhiều token hơn văn xuôi (dấu, thụt lề, ký hiệu)
JSON:         rất tốn — dấu ngoặc, nháy, dấu phẩy đều là token

⇒ Ước lượng nhanh cho tiếng Việt: SỐ KÝ TỰ ÷ 2,5
⇒ Đừng ước lượng theo tiếng Anh rồi áp cho tiếng Việt:
  bạn sẽ lệch gần hai lần.
```

**Chi phí — hai chiều, giá khác nhau:**

```text
Token ĐẦU VÀO  thường rẻ hơn
Token ĐẦU RA   thường đắt hơn đáng kể

⇒ Hệ quả thực tế: một hệ thống dán nhiều tài liệu vào nhưng
  trả về câu trả lời ngắn có thể rẻ hơn hệ thống ngược lại.
⇒ Và giới hạn độ dài đầu ra là một biện pháp tiết kiệm trực tiếp.
```

```text
Cách giảm chi phí, theo thứ tự hiệu quả:
  ① Đừng gửi thứ không cần — chọn lọc ngữ cảnh
  ② Giới hạn độ dài đầu ra
  ③ Cache phần ngữ cảnh lặp lại (nhiều nhà cung cấp hỗ trợ,
    và giảm chi phí đáng kể cho phần cố định)
  ④ Dùng mô hình nhỏ hơn cho việc đơn giản
  ⑤ Cache cả câu trả lời cho câu hỏi trùng lặp
```

Bước ① luôn hiệu quả nhất và hay bị bỏ qua nhất — vì nhồi thêm ngữ cảnh dễ hơn là chọn lọc nó.

## Cú pháp

**"Lost in the middle" — mô hình chú ý không đều:**

```text
Với ngữ cảnh dài, thông tin ở ĐẦU và CUỐI được dùng tốt hơn
thông tin ở GIỮA.

⇒ Đặt chỉ dẫn quan trọng ở ĐẦU.
⇒ Đặt câu hỏi thật ở CUỐI.
⇒ Đừng kẹp thứ quyết định vào giữa 50 trang tài liệu.

Và một hệ quả cho RAG: xếp đoạn liên quan nhất ở gần câu hỏi,
không phải chôn nó ở giữa danh sách ([[rag-la-gi-va-khi-nao-dung]]).
```

**Ngữ cảnh dài không miễn phí, dù còn chỗ:**

```text
Nhồi đầy context window có ba cái giá, kể cả khi chưa vượt giới hạn:
  ① Chi phí — trả tiền cho mọi token
  ② Độ trễ — xử lý nhiều token mất nhiều thời gian hơn
  ③ Chất lượng — thông tin nền làm loãng thông tin liên quan

⇒ "Còn chỗ nên cứ nhồi vào" là một quyết định, và thường là
  quyết định sai.
```

**Quản lý hội thoại dài — ba cách:**

```text
① CẮT BỚT: giữ N lượt gần nhất
   Đơn giản. Mất thông tin đầu cuộc trò chuyện — có thể là
   thông tin quan trọng nhất.

② TÓM TẮT: gộp phần cũ thành một đoạn tóm tắt
   Giữ được ý chính. Mất chi tiết, và tóm tắt cũng tốn một lời gọi.

③ TRUY HỒI: lưu toàn bộ ra ngoài, mỗi lượt chỉ lấy phần liên quan
   Giữ được mọi thứ. Phức tạp hơn — đây thực chất là RAG
   trên chính lịch sử hội thoại.
```

```text
Và một thứ KHÔNG BAO GIỜ cắt: chỉ dẫn hệ thống.
Cắt nó đi thì mô hình mất hết ràng buộc về hành vi —
kể cả các ràng buộc an toàn.
```

## Tại sao cần nó

Vì context window là **ràng buộc kiến trúc**, và nó quyết định thiết kế:

```text
"Cho mô hình đọc toàn bộ tài liệu công ty rồi trả lời"
  → 500.000 token tài liệu, context window không đủ
  → và nếu đủ thì: rất đắt, rất chậm, và chất lượng kém hơn
  ⇒ Đây chính là lý do RAG tồn tại: chỉ lấy phần LIÊN QUAN
    ([[embedding-la-gi]])

"Cho agent tự chạy 50 bước"
  → mỗi bước thêm kết quả vào ngữ cảnh
  → bước 30 thì ngữ cảnh đầy
  ⇒ Đây là ràng buộc thật của kiến trúc agent
    ([[agent-la-gi-va-khi-nao-can]])
```

**Ba thứ phải làm trong hệ thống thật:**

```text
① ĐẾM token trước khi gửi
   Vượt giới hạn ⇒ lỗi, hoặc bị cắt âm thầm ở một số API.
   ⇒ Cắt âm thầm là trường hợp tệ hơn: mô hình trả lời dựa trên
     ngữ cảnh thiếu, và bạn không biết.

② ĐẶT NGÂN SÁCH token cho từng phần
   chỉ dẫn ≤ 500, tài liệu ≤ 6.000, lịch sử ≤ 2.000, đầu ra ≤ 1.000
   ⇒ Có ngân sách rõ thì việc cắt bớt là một quyết định có chủ đích,
     không phải một tai nạn.

③ THEO DÕI token dùng mỗi request
   ⇒ Đây là chỉ số chi phí, và nó tăng âm thầm khi ai đó thêm
     một dòng vào chỉ dẫn hệ thống ([[chi-phi-ha-tang]]).
```

## So sánh

| Nội dung | Ước lượng token (tiếng Việt) |
|---|---|
| 1 trang văn bản (~500 từ) | ~1.200 |
| 100 dòng mã | ~1.500 |
| 1 bản ghi JSON 20 trường | ~300 |
| Một cuộc hội thoại 20 lượt | ~4.000–8.000 |

## Dễ nhầm

**1. Ước lượng token theo tiếng Anh rồi áp cho tiếng Việt.** Lệch gần hai lần.

**2. Quên đầu ra cũng nằm trong giới hạn.**

**3. Nhồi đầy context window vì "còn chỗ".** Ba cái giá.

**4. Đặt thông tin quan trọng ở giữa ngữ cảnh dài.**

**5. Không đếm token trước khi gửi.**

**6. Không biết API đang cắt âm thầm.** Trả lời dựa trên ngữ cảnh thiếu.

**7. Cắt chỉ dẫn hệ thống khi hết chỗ.**

**8. Không giới hạn độ dài đầu ra.** Token đầu ra đắt hơn.

**9. Không cache phần ngữ cảnh cố định.**

**10. Không theo dõi token mỗi request.** Chi phí tăng âm thầm.

## Mẹo nhớ

> **Context window gồm CẢ đầu ra. Nó là giới hạn cứng và là đơn vị tính tiền.**
>
> **Tiếng Việt ≈ số ký tự ÷ 2,5 token. Đừng dùng con số của tiếng Anh.**
>
> **Quan trọng thì đặt ở ĐẦU hoặc CUỐI — đừng kẹp giữa.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Context window gồm những gì?
2. Ước lượng token cho tiếng Việt thế nào, và vì sao khác tiếng Anh?
3. Ba cái giá của việc nhồi đầy ngữ cảnh?
4. "Lost in the middle" là gì, và hai hệ quả thực tế?
5. Ba thứ phải làm trong hệ thống thật?

## Tự viết lại

Bạn xây một trợ lý trả lời câu hỏi dựa trên tài liệu nội bộ. Không nhìn lại, viết:

```text
① ngân sách token cho từng phần của lời gọi
② thứ tự sắp xếp các phần, và vì sao
③ ba cách giảm chi phí, xếp theo hiệu quả
④ xử lý khi tài liệu liên quan vượt ngân sách
```

Tự kiểm: ở ④, bạn cắt bớt hay chọn lọc lại — và hai cách đó khác nhau thế nào về chất lượng câu trả lời?

## Thử sức

Trợ lý nội bộ của đội chạy tốt lúc đầu. Sau ba tháng, người dùng phàn nàn nó "hay bỏ qua yêu cầu" và hoá đơn tăng gấp bốn. Hệ thống lưu toàn bộ lịch sử hội thoại và gửi lại mỗi lượt.

Ba câu để trả lời: hai vấn đề riêng biệt ở đây và nguyên nhân chung của chúng; ba thay đổi theo thứ tự ưu tiên; và bạn đo cải thiện bằng chỉ số nào. Câu khó nhất: "hay bỏ qua yêu cầu" — vì sao nó xảy ra ở cuộc hội thoại dài, và chỉ dẫn hệ thống nên đặt ở đâu để giảm hiện tượng đó?
