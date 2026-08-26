---
title: Xây bộ eval
slug: xay-bo-eval
summary: Lấy ca ở đâu, bao nhiêu là đủ, và vì sao bộ chỉ có ca dễ thì vô dụng.
level: trung-cap
tags: [ai, danh-gia, kiem-thu, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** xây được bộ eval từ dữ liệu thật, và biết bộ của mình đang thiếu loại ca nào.

## Ý tưởng chính

Bộ eval là **bộ test cho hệ thống AI**: một tập ca đầu vào, kèm định nghĩa "đúng là gì", chạy được tự động.

Và giống test thường, giá trị của nó phụ thuộc hoàn toàn vào việc **nó có chứa những ca thật sự khó không**. Một bộ chỉ có ca dễ luôn cho điểm cao và không phát hiện được gì.

## Mental model

Hãy nghĩ tới **đề thi thử cho học sinh**.

> Đề chỉ có câu dễ: ai cũng 9 điểm. Đề đó **không nói gì** về việc học sinh đã sẵn sàng chưa.
>
> Đề có cả câu dễ, câu khó, câu bẫy, và câu **không giải được** (để xem học sinh có nhận ra và bỏ, thay vì làm bừa).
>
> Và đề tốt nhất được xây từ **những câu học sinh đã từng làm sai** — không phải từ những câu người ra đề nghĩ ra.

Vế cuối là nguyên tắc quan trọng nhất: **bộ eval tốt nhất đến từ ca đã từng sai**, không từ trí tưởng tượng của bạn.

## Ví dụ nhỏ

```json
{
  "id": "eval-042",
  "cauHoi": "Mua hàng sale có đổi được không?",
  "doanDung": ["chinh-sach-doi-tra#dieu-6"],
  "tieuChi": {
    "phaiCo": ["không áp dụng đổi trả", "hàng khuyến mãi"],
    "khongDuocCo": ["7 ngày"],
    "toiDaTu": 80,
    "phaiCoTrichDan": true
  }
}
```

## Code chạy thế nào

**Bốn nguồn ca, theo giá trị:**

```text
① CA ĐÃ TỪNG SAI                    ← giá trị cao nhất
   Mỗi lần phát hiện một câu trả lời sai ⇒ thêm vào bộ.
   ⇒ Bộ lớn dần một cách tự nhiên, và lỗi cũ không quay lại.
   ⇒ Đây là nguồn quan trọng nhất, và nó MIỄN PHÍ nếu bạn có
     nút báo sai ([[do-trong-production]]).

② CA THẬT từ log production
   Câu hỏi người dùng thật gửi, không phải câu bạn nghĩ ra.
   ⇒ Chọn theo phân bố thật: loại câu hỏi nào chiếm bao nhiêu.

③ CA BIÊN bạn nghĩ ra
   Đầu vào rỗng, rất dài, nhiều ngôn ngữ, ký tự lạ,
   câu hỏi mơ hồ, câu hỏi có tiền đề sai

④ CA CỐ TÌNH PHÁ
   Prompt injection, yêu cầu vượt phạm vi
   ([[prompt-injection]])
```

**Bốn loại ca phải có, và tỉ lệ:**

```text
□ Có câu trả lời rõ ràng trong tài liệu        ~50%
□ Cần TỔNG HỢP nhiều nguồn                     ~20%
□ KHÔNG CÓ câu trả lời trong tài liệu          ~20%
  ⇒ Đo xem hệ thống có nói "không tìm thấy" hay bịa.
  ⇒ Loại này BẮT BUỘC. Bỏ nó là bỏ mất cách đo ảo giác.
□ Ngoài phạm vi hoặc cố tình phá               ~10%
```

```text
Bộ chỉ có loại thứ nhất là bộ nói với bạn rằng hệ thống rất tốt —
và bỏ sót đúng những vấn đề nghiêm trọng nhất.
```

## Cú pháp

**Định nghĩa "đúng" cho từng ca — bốn thành phần:**

```text
① PHẢI CÓ         từ khoá hoặc con số bắt buộc xuất hiện
② KHÔNG ĐƯỢC CÓ   thông tin sai, thông tin của ca khác
③ RÀNG BUỘC       độ dài, có trích dẫn, đúng định dạng
④ ĐOẠN ĐÚNG       (với RAG) đoạn nào chứa câu trả lời
                  ⇒ để đo riêng tầng truy hồi
                    ([[danh-gia-he-thong-rag]])
```

```text
Thành phần ② hay bị bỏ và rất giá trị:
  "KHÔNG được có '7 ngày'" bắt được trường hợp mô hình lấy
  thông tin từ đoạn khác — thứ mà kiểm "phải có" không bắt được.
```

**Bao nhiêu ca là đủ:**

```text
< 20   → một ca sai làm tỉ lệ nhảy 5%, không đọc được xu hướng
20–50  → dùng được, phát hiện được hồi quy rõ ràng
50–200 → tốt, phân loại được theo loại câu hỏi
> 200  → chậm và đắt để chạy thường xuyên
         ⇒ Chia thành bộ NHANH (chạy mỗi lần) và bộ ĐẦY ĐỦ
           (chạy hằng ngày hoặc trước khi phát hành)
```

```text
Bắt đầu bằng 20 ca là hợp lý. Đừng chờ có 100 ca mới bắt đầu đo —
20 ca chạy được hôm nay hơn 100 ca chưa bao giờ viết.
```

**Chạy nhiều lần và ghi kết quả:**

```text
Mỗi ca chạy 3 lần, ghi:
  □ Tỉ lệ đúng của từng ca (3/3, 2/3, 0/3)
  □ Tỉ lệ đúng tổng
  □ Ca nào từ ĐÚNG thành SAI so với lần chạy trước  ← quan trọng nhất

⇒ Cột cuối là cột đáng nhìn nhất: tỉ lệ tổng có thể tăng
  trong khi bạn vừa làm hỏng ba ca đang đúng.
```

**Đưa vào CI:**

```text
Chạy bộ NHANH khi:
  □ Đổi prompt
  □ Đổi mô hình hoặc tham số
  □ Đổi cách chia đoạn, thêm tài liệu

Chạy bộ ĐẦY ĐỦ:
  □ Trước khi phát hành
  □ ĐỊNH KỲ — nhà cung cấp cập nhật mô hình mà không đổi tên
    ⇒ Đây là loại hồi quy không ai gây ra và không ai biết
      ([[chan-hoi-quy-ai]])

Ngưỡng chặn merge: tỉ lệ tổng không giảm, VÀ không có ca nào
từ đúng thành sai.
```

## Tại sao cần nó

Vì bộ eval là thứ duy nhất trả lời được câu hỏi *"thay đổi này tốt hơn hay xấu hơn"*:

```text
Không có bộ eval:
  Mỗi thay đổi prompt là một cú đánh cược.
  Bạn sửa cho ca A, làm hỏng ca B, và không biết.
  Sau tám lần sửa, không ai biết hệ thống ở đâu.

Có bộ eval:
  "74% → 82%, không ca nào từ đúng thành sai" ⇒ merge.
  "74% → 78%, nhưng 3 ca từ đúng thành sai" ⇒ xem lại.
```

**Ba điều làm bộ eval xuống cấp:**

```text
① KHÔNG THÊM CA MỚI
   Hệ thống thay đổi, người dùng hỏi khác, bộ eval đứng yên.
   ⇒ Điểm cao mà production vẫn tệ.

② TỐI ƯU CHO BỘ EVAL
   Sửa prompt để pass đúng những ca trong bộ.
   ⇒ Đây là hiện tượng thật, và nó khó phát hiện.
   ⇒ Chống bằng: giữ một phần ca KHÔNG dùng để tinh chỉnh,
     chỉ dùng để kiểm cuối.

③ ĐỊNH NGHĨA "ĐÚNG" QUÁ LỎNG
   "có chứa từ 'đổi trả'" ⇒ gần như câu nào cũng pass.
   ⇒ Tiêu chí phải đủ chặt để phân biệt được đúng và sai.
```

**Và một lời khuyên về công sức:**

```text
Xây bộ eval là công việc tốn thời gian NGƯỜI, không tốn thời gian máy.
Phần lớn công sức nằm ở việc định nghĩa "đúng là gì" cho từng ca.

⇒ Nhưng nó là công việc TÍCH LUỸ: mỗi ca thêm vào dùng lại mãi.
⇒ Và nó thay thế cho việc thử-và-đoán, thứ tốn thời gian hơn nhiều
  mà không tích luỹ gì.
```

## So sánh

| Nguồn ca | Giá trị | Công sức |
|---|---|---|
| Ca đã từng sai | **cao nhất** | thấp (nếu có nút báo sai) |
| Ca thật từ log | cao | vừa |
| Ca biên tự nghĩ | vừa | thấp |
| Ca cố tình phá | cao (cho bảo mật) | vừa |

## Dễ nhầm

**1. Bộ chỉ có ca dễ.** Luôn điểm cao, không phát hiện gì.

**2. Không có ca "không có câu trả lời".** Bỏ mất cách đo ảo giác.

**3. Ca do mình nghĩ ra thay vì ca thật.**

**4. Không thêm ca đã từng sai vào bộ.**

**5. Chỉ kiểm "phải có", không kiểm "không được có".**

**6. Chạy mỗi ca một lần.**

**7. Chỉ nhìn tỉ lệ tổng.** Bỏ sót ca từ đúng thành sai.

**8. Không chạy bộ eval định kỳ.** Bỏ sót hồi quy từ bên ngoài.

**9. Tối ưu prompt cho đúng bộ eval.** Cần một phần ca giữ riêng.

**10. Chờ có 100 ca mới bắt đầu.** 20 ca chạy được hôm nay hơn.

## Mẹo nhớ

> **Nguồn ca tốt nhất: ca ĐÃ TỪNG SAI. Mỗi báo sai là một ca mới.**
>
> **Bắt buộc có loại ca "KHÔNG CÓ câu trả lời" — nếu không, bạn không đo được ảo giác.**
>
> **Cột đáng nhìn nhất: ca nào từ ĐÚNG thành SAI.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn nguồn ca, nguồn nào giá trị nhất?
2. Bốn loại ca và tỉ lệ, loại nào bắt buộc?
3. Bốn thành phần định nghĩa "đúng", thành phần nào hay bị bỏ?
4. Bao nhiêu ca là đủ, và khi nào cần chia hai bộ?
5. Ba điều làm bộ eval xuống cấp?

## Tự viết lại

Không nhìn lại, xây bộ eval 25 ca cho trợ lý chính sách nhân sự:

```text
① nguồn ca và tỉ lệ từng loại
② cấu trúc một ca, đầy đủ bốn thành phần
③ chạy bao nhiêu lần, ghi lại gì
④ khi nào chạy, ngưỡng chặn merge
⑤ cách bộ này lớn dần
```

Tự kiểm: bộ của bạn có bao nhiêu ca "không có câu trả lời" — và nếu là 0, bạn đang không đo được gì?

## Thử sức

Đội bạn có bộ eval 40 ca, điểm luôn trên 95%. Nhưng production có khoảng 20% câu trả lời bị người dùng báo sai.

Ba câu để trả lời: nguyên nhân khả dĩ nhất; bạn sửa bộ eval thế nào; và bạn xác nhận bộ mới thật sự phản ánh production bằng cách nào. Câu khó nhất: 95% trên bộ eval nhưng 80% ở production — khoảng cách đó nói lên điều gì về **cách chọn ca** của bạn, và bạn lấy ca mới từ đâu?
