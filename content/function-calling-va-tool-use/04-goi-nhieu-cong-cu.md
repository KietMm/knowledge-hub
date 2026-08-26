---
title: Gọi nhiều công cụ
slug: goi-nhieu-cong-cu
summary: Song song hay tuần tự, xử lý khi một công cụ lỗi, và giới hạn số bước.
level: trung-cap
tags: [ai, function-calling, kien-truc, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** xử lý nhiều lời gọi công cụ đúng cách, và biết vì sao phải giới hạn số bước.

## Ý tưởng chính

Một câu hỏi thật thường cần nhiều công cụ: tra đơn, rồi tra chính sách, rồi tính phí.

Có hai kiểu quan hệ giữa chúng — **độc lập** (chạy được song song) và **phụ thuộc** (đầu ra của cái này là đầu vào của cái kia). Phân biệt hai kiểu quyết định độ trễ, và nó là điểm tối ưu lớn nhất ở đây.

## Mental model

Hãy nghĩ tới **chuẩn bị một bữa ăn**.

> **Việc độc lập**: luộc mì và pha nước sốt. Hai việc không cần nhau ⇒ làm **cùng lúc**. Tổng thời gian = việc lâu nhất.
>
> **Việc phụ thuộc**: phải luộc mì xong mới trộn được với sốt. Không có cách nào rút ngắn — thứ tự là bắt buộc.
>
> Người nấu kém làm mọi việc tuần tự, kể cả những việc độc lập. Bữa ăn vẫn đúng, chỉ lâu gấp ba.

Và có một chi tiết nữa: **nếu hết mì giữa lúc đang nấu**, bạn không dừng cả bữa — bạn báo và điều chỉnh. Đó là xử lý lỗi một phần.

## Ví dụ nhỏ

```text
"So sánh phí giao hàng cho đơn ABC123 tới Hà Nội và Đà Nẵng"

Độc lập  → tinhPhi(ABC123, 'HN') và tinhPhi(ABC123, 'DN') song song
Phụ thuộc → traDonHang(ABC123) TRƯỚC, để biết khối lượng
            rồi mới tính phí
```

## Code chạy thế nào

**Song song — khi mô hình đề nghị nhiều lời gọi cùng lượt:**

```ts
// Mô hình trả về nhiều toolCalls trong MỘT phản hồi
// ⇒ chúng độc lập với nhau ⇒ chạy song song
const ketQua = await Promise.all(
  res.toolCalls.map(async (goi) => {
    try {
      return { id: goi.id, kq: await chayCongCu(goi, ctx) }
    } catch (e) {
      return { id: goi.id, kq: { loi: moTaLoi(e) } }   // ← không throw
    }
  }),
)
```

```text
Hai điểm quan trọng:
  □ Nhiều toolCalls trong CÙNG một phản hồi = mô hình cho rằng
    chúng độc lập ⇒ song song là đúng và tiết kiệm thật.
  □ Dùng `Promise.all` với try/catch BÊN TRONG mỗi lời gọi.
    `Promise.all` mà không bắt lỗi từng cái ⇒ một công cụ lỗi
    làm cả nhóm thất bại, kể cả những cái đã thành công.
```

**Tuần tự — khi phụ thuộc nhau:**

```text
Mô hình gọi công cụ A → bạn trả kết quả → mô hình xem kết quả
→ gọi công cụ B với tham số lấy từ kết quả A → ...

⇒ Mỗi bước là MỘT lượt mô hình nữa.
⇒ Ba bước phụ thuộc = ít nhất bốn lời gọi mô hình
  ⇒ độ trễ cộng dồn, token cộng dồn (ngữ cảnh lớn dần)
```

```text
Cách giảm:
  □ Thiết kế công cụ trả về đủ thông tin để bỏ được một bước
    ⇒ `traDonHang` trả luôn khối lượng ⇒ không cần gọi thêm
  □ Gộp hai bước hay đi cùng nhau thành một công cụ
  □ Với luồng cố định: đừng để mô hình quyết định thứ tự —
    viết mã gọi tuần tự, chỉ dùng mô hình ở bước cần suy luận
```

Cách thứ ba đáng cân nhắc nghiêm túc: nhiều luồng "cần agent" thật ra có thứ tự cố định, và mã thường đúng hơn, nhanh hơn, rẻ hơn ([[agent-la-gi-va-khi-nao-can]]).

## Cú pháp

**Xử lý lỗi — trả lỗi CHO MÔ HÌNH, đừng làm sập request:**

```text
Công cụ lỗi ⇒ hai lựa chọn:
  ① Ném lỗi ra ngoài ⇒ cả request thất bại
     ⇒ Chỉ đúng khi lỗi là không thể tiếp tục.
  ② Trả lỗi vào ngữ cảnh như một kết quả
     ⇒ Mô hình biết và xử lý: thử cách khác, hỏi người dùng,
       hoặc trả lời với phần thông tin đã có.

⇒ Cách ② thường đúng hơn, và nó là điểm mạnh thật của
  function calling: hệ thống suy giảm có kiểm soát.
```

```ts
// Thông báo lỗi phải cho mô hình biết PHẢI LÀM GÌ
{ loi: 'Không tìm thấy đơn ABC999. Hãy hỏi người dùng kiểm tra lại mã đơn.' }
{ loi: 'Dịch vụ tính phí tạm thời không phản hồi. Hãy nói người dùng thử lại sau ít phút.' }
```

**Giới hạn số bước — bắt buộc:**

```text
Không giới hạn thì có ba kịch bản xấu:
  □ Mô hình gọi đi gọi lại cùng công cụ (không thấy tiến triển)
  □ Hai công cụ đẩy qua đẩy lại
  □ Nhiệm vụ không giải được, và nó cứ thử

⇒ Đặt trần: 5–10 bước cho một request.
⇒ Chạm trần ⇒ DỪNG, trả lời với thông tin đã có, và GHI LOG
  ⇒ Log này rất giá trị: nó chỉ ra công cụ nào thiếu hoặc
    mô tả nào chưa rõ.
```

**Ngữ cảnh lớn dần — vấn đề của luồng nhiều bước:**

```text
Mỗi bước thêm vào ngữ cảnh: đề nghị gọi + kết quả.
Sau 8 bước với kết quả lớn, ngữ cảnh có thể đầy.

Ba cách xử lý:
  □ Cắt bớt kết quả công cụ: giữ tóm tắt, bỏ chi tiết thô
  □ Bỏ kết quả của các bước đã dùng xong
  □ Tóm tắt tiến trình sau mỗi vài bước
    ⇒ Nhưng nhớ: tóm tắt cũng tốn một lời gọi
    ([[token-va-context-window]])
```

**Ba thứ phải ghi log cho luồng nhiều công cụ:**

```text
□ Chuỗi các công cụ được gọi, theo thứ tự, kèm tham số
□ Kết quả của từng cái (hoặc tóm tắt nếu quá dài)
□ Số bước đã dùng, và có chạm trần không

⇒ Không có ba thứ này thì "trợ lý trả lời sai" là một báo cáo
  không điều tra được ([[quan-sat-ung-dung-llm]]).
```

## Tại sao cần nó

Vì luồng nhiều công cụ có ba chi phí cộng dồn, và chúng dễ bị bỏ qua khi thử ở quy mô nhỏ:

```text
ĐỘ TRỄ    mỗi bước = một round-trip mô hình + thời gian công cụ
          5 bước ≈ 5–15 giây
CHI PHÍ   ngữ cảnh lớn dần ⇒ token của bước 5 nhiều hơn bước 1
          rất nhiều
LỖI       mỗi bước là một chỗ có thể hỏng
          5 bước, mỗi bước 98% đúng ⇒ ~90% tổng
```

**Ba nguyên tắc thực dụng:**

```text
① Song song mọi thứ song song được. Đây là tối ưu lớn nhất
   và rẻ nhất.
② Thiết kế công cụ để GIẢM SỐ BƯỚC — trả về đủ thông tin
   thay vì bắt gọi thêm.
③ Luồng có thứ tự CỐ ĐỊNH ⇒ viết mã, đừng để mô hình quyết định.
   ⇒ Chỉ để mô hình quyết định ở chỗ thật sự cần suy luận.
```

Nguyên tắc ③ là ranh giới quan trọng: **để mô hình chọn đường đi chỉ đáng khi đường đi thật sự thay đổi theo tình huống**. Nếu nó luôn giống nhau, mã tuần tự thắng ở cả ba chiều: đúng hơn, nhanh hơn, rẻ hơn.

## So sánh

| | Song song | Tuần tự |
|---|---|---|
| Điều kiện | các lời gọi độc lập | phụ thuộc kết quả |
| Độ trễ | = cái lâu nhất | **cộng dồn** |
| Số lượt mô hình | 1 | mỗi bước một lượt |
| Xử lý lỗi | từng cái riêng | có thể dừng chuỗi |

## Dễ nhầm

**1. Chạy tuần tự những lời gọi độc lập.** Mất tối ưu lớn nhất.

**2. `Promise.all` không bắt lỗi từng cái.** Một cái lỗi, mất cả nhóm.

**3. Ném lỗi công cụ ra ngoài.** Mất khả năng suy giảm có kiểm soát.

**4. Thông báo lỗi không nói mô hình phải làm gì.**

**5. Không giới hạn số bước.** Vòng lặp đốt tài nguyên.

**6. Không log khi chạm trần.** Bỏ mất manh mối về công cụ còn thiếu.

**7. Không quản lý ngữ cảnh lớn dần.**

**8. Để mô hình quyết định thứ tự trong luồng cố định.**

**9. Không log chuỗi công cụ và tham số.**

**10. Thiết kế công cụ bắt gọi nhiều bước không cần thiết.**

## Mẹo nhớ

> **Nhiều toolCalls trong CÙNG một phản hồi = độc lập = chạy SONG SONG.**
>
> **Lỗi công cụ nên đi VÀO ngữ cảnh, không ném ra ngoài — để mô hình xử lý.**
>
> **Thứ tự CỐ ĐỊNH thì viết MÃ. Chỉ để mô hình quyết định khi đường đi thật sự thay đổi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Làm sao biết các lời gọi là độc lập hay phụ thuộc?
2. Vì sao `Promise.all` cần try/catch bên trong từng lời gọi?
3. Hai cách xử lý lỗi công cụ, cách nào thường đúng hơn?
4. Ba kịch bản xấu khi không giới hạn số bước?
5. Ba chi phí cộng dồn của luồng nhiều bước?

## Tự viết lại

Không nhìn lại, thiết kế luồng cho: *"Tôi muốn đổi địa chỉ giao của đơn ABC123 sang địa chỉ mới, và cho tôi biết phí có đổi không."*

```text
① các công cụ cần, và cái nào độc lập/phụ thuộc
② thứ tự thực hiện
③ xử lý khi công cụ đổi địa chỉ thất bại
④ giới hạn bạn đặt
⑤ có nên để mô hình quyết định thứ tự không, vì sao
```

Tự kiểm: ở ⑤, thứ tự trong luồng này có thay đổi theo tình huống không — và câu trả lời đó quyết định thiết kế của bạn ra sao?

## Thử sức

Trợ lý của bạn đôi khi mất 25 giây để trả lời. Log cho thấy nó gọi 7 công cụ tuần tự, trong đó 4 công cụ hoàn toàn không phụ thuộc nhau.

Ba câu để trả lời: bạn xử lý thế nào để giảm độ trễ; ba thay đổi theo thứ tự hiệu quả; và bạn đo cải thiện bằng gì. Câu khó nhất: nếu bốn công cụ độc lập đó luôn được gọi cùng nhau trong mọi request, có một thay đổi thiết kế tốt hơn cả việc chạy song song — đó là gì?
