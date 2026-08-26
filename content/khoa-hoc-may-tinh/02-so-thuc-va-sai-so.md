---
title: Số thực và sai số dấu phẩy động
slug: so-thuc-va-sai-so
summary: Vì sao 0.1 + 0.2 không bằng 0.3, và vì sao không bao giờ được lưu tiền bằng float.
level: co-ban
tags: [nen-tang, so-hoc, float, computer-science]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được `0.1 + 0.2 !== 0.3`, và biết dùng gì thay cho float khi tính tiền.

## Ý tưởng chính

Số thực trong máy được lưu bằng **dấu phẩy động**: một số hữu hạn bit chia cho phần định trị và phần mũ.

Hữu hạn bit nghĩa là **phần lớn số thập phân không biểu diễn được chính xác** — chúng bị làm tròn tới giá trị gần nhất mà máy lưu được.

Đây không phải lỗi của ngôn ngữ nào cả. Nó là chuẩn IEEE 754, và mọi ngôn ngữ đều như vậy.

## Mental model

Hãy nghĩ tới **viết 1/3 dưới dạng số thập phân**.

> 1/3 = 0,3333... Bạn có bao nhiêu ô để viết? Mười ô? Vậy bạn viết 0,3333333333.
>
> Đó **không phải** 1/3. Nó là số gần nhất bạn viết được với mười ô. Nhân nó với 3 ra 0,9999999999, không phải 1.
>
> Bạn không sai, và máy tính cũng không hỏng. Chỉ là **hệ đếm và số ô có hạn**.

Máy dùng hệ nhị phân. Trong hệ nhị phân, `0,1` là một số vô hạn tuần hoàn — y như 1/3 trong hệ thập phân.

## Ví dụ nhỏ

```js
0.1 + 0.2              // 0.30000000000000004
0.1 + 0.2 === 0.3      // false
0.1 + 0.2 - 0.3        // 5.551115123125783e-17
```

## Code chạy thế nào

**Vì sao `0.1` không lưu chính xác được:**

```text
Trong hệ 10, phân số lưu chính xác được khi mẫu số chỉ có ước 2 và 5:
  1/2 = 0,5   ✓      1/4 = 0,25  ✓      1/3 = 0,333... ✗

Trong hệ 2, chỉ khi mẫu số là luỹ thừa của 2:
  1/2  = 0.1₂     ✓
  1/4  = 0.01₂    ✓
  1/10 = 0.000110011001100...₂  ← TUẦN HOÀN VÔ HẠN  ✗

⇒ 0.1 lưu thành số gần nhất trong 64 bit:
  0.1000000000000000055511151231257827...
```

Cộng hai số đã lệch một chút thì kết quả lệch nhiều hơn một chút. Đó là toàn bộ câu chuyện `0.1 + 0.2`.

**`double` 64 bit chia bit ra sao:**

```text
[1 bit dấu][11 bit mũ][52 bit định trị]

⇒ Độ chính xác ~15–17 chữ số thập phân.
⇒ Số nguyên biểu diễn CHÍNH XÁC tới 2⁵³ = 9.007.199.254.740.992
```

```js
Number.MAX_SAFE_INTEGER          // 9007199254740991
9007199254740992 === 9007199254740993   // true  ← hai số khác nhau, máy thấy như một
```

Đây là lý do id từ backend nên trả về **dạng chuỗi** nếu nó là `bigint`: JSON parse ra `number` và bạn mất chính xác ở id lớn — âm thầm.

## Cú pháp

**So sánh số thực — không dùng `===`:**

```js
// ❌
if (a === b) { ... }

// ✅ so với một sai số chấp nhận được
const gan = (a, b, eps = 1e-9) => Math.abs(a - b) < eps
gan(0.1 + 0.2, 0.3)     // true
```

**Tiền — ba cách, theo thứ tự ưu tiên:**

```text
① SỐ NGUYÊN ĐƠN VỊ NHỎ NHẤT      ← đơn giản và đủ dùng nhất
   Lưu 199000 (đồng) chứ không 199.00
   Lưu cent thay vì dollar.
   ⇒ Mọi phép cộng trừ đều chính xác tuyệt đối.
   ⇒ Chỉ cẩn thận lúc CHIA (chiết khấu, chia đều) — phải quyết định
     làm tròn ở đâu và ai chịu phần lẻ.

② KIỂU THẬP PHÂN CỦA CSDL
   Postgres NUMERIC(12,2) — chính xác, chậm hơn, nhưng an toàn.

③ THƯ VIỆN DECIMAL
   decimal.js, big.js ở tầng ứng dụng.

❌ KHÔNG BAO GIỜ: float/double cho tiền.
```

```text
Sai số tích luỹ, ví dụ thật:
  Cộng 0.1 mười lần bằng float ⇒ 0.9999999999999999
  Một triệu giao dịch ⇒ lệch tới mức kiểm toán phát hiện.
  Và lệch đó KHÔNG tái hiện được theo cách dễ hiểu ⇒ rất khó gỡ.
```

**Ba giá trị đặc biệt cần biết:**

```js
1 / 0            // Infinity
-1 / 0           // -Infinity
0 / 0            // NaN
NaN === NaN      // false  ← giá trị duy nhất không bằng chính nó
Number.isNaN(x)  // cách kiểm đúng
```

`NaN` lan truyền: một `NaN` trong chuỗi tính toán làm mọi kết quả sau đó thành `NaN`. Nên khi thấy `NaN` ở cuối, hãy tìm chỗ **đầu tiên** nó xuất hiện — thường là một phép chia cho 0 hoặc một `parseFloat` trên chuỗi rỗng.

## Tại sao cần nó

Vì ba lớp bug sinh ra từ đúng chỗ này, và cả ba đều khó tái hiện:

```text
① Tiền lệch vài đồng sau nhiều phép tính
   → chỉ lộ ra khi đối soát, và không ai biết bắt đầu từ đâu.

② So sánh bằng thất bại "vô lý"
   → if (tong === 100) không chạy dù in ra đúng 100.

③ id lớn bị làm tròn khi qua JSON
   → hai bản ghi khác nhau trở thành một, âm thầm.
```

**Thứ tự phép tính cũng ảnh hưởng:**

```js
(0.1 + 0.2) + 0.3      // 0.6000000000000001
0.1 + (0.2 + 0.3)      // 0.6

// Cộng số lớn với số rất nhỏ ⇒ số nhỏ bị nuốt mất
1e16 + 1 === 1e16      // true
```

```text
Mẹo khi phải cộng nhiều số thực: cộng các số NHỎ trước.
Cộng số nhỏ vào một tổng đã rất lớn thì nó bị làm tròn mất.
```

## So sánh

| Kiểu | Chính xác | Tốc độ | Dùng cho |
|---|---|---|---|
| `float`/`double` | ❌ xấp xỉ | nhanh | khoa học, đồ hoạ, thống kê |
| số nguyên (đơn vị nhỏ) | ✅ | nhanh | **tiền** |
| `NUMERIC`/`DECIMAL` | ✅ | chậm hơn | tiền, kế toán |
| thư viện decimal | ✅ | chậm nhất | tính toán tài chính phức tạp |

## Dễ nhầm

**1. Dùng float cho tiền.** Sai số tích luỹ, và phát hiện lúc đối soát.

**2. So sánh số thực bằng `===`.** Dùng sai số chấp nhận được.

**3. Tưởng đây là lỗi của JavaScript.** Python, Java, C, Go đều vậy — chuẩn IEEE 754.

**4. Trả id `bigint` dưới dạng number trong JSON.** Mất chính xác trên 2⁵³.

**5. Quên `NaN !== NaN`.** Dùng `Number.isNaN`.

**6. `parseFloat` không kiểm kết quả.** Chuỗi lạ cho ra `NaN` và nó lan đi.

**7. Cộng số nhỏ vào tổng rất lớn.** Bị nuốt mất.

**8. Làm tròn ở nhiều chỗ khác nhau.** Làm tròn **một lần**, ở tầng hiển thị.

**9. Tưởng `toFixed(2)` sửa được vấn đề.** Nó chỉ định dạng lúc hiển thị, không sửa giá trị đã sai.

## Mẹo nhớ

> **`0.1` là số vô hạn tuần hoàn trong hệ nhị phân — như 1/3 trong hệ 10.**
>
> **TIỀN thì lưu bằng SỐ NGUYÊN đơn vị nhỏ nhất, hoặc NUMERIC. Không bao giờ float.**
>
> **Số nguyên chính xác tới 2⁵³. Id lớn phải đi qua JSON dưới dạng chuỗi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao `0.1` không lưu chính xác được trong hệ nhị phân?
2. Ba cách lưu tiền đúng, ưu tiên cái nào?
3. `Number.MAX_SAFE_INTEGER` là gì và vì sao nó quan trọng với id?
4. Vì sao so sánh số thực bằng `===` là sai?
5. Vì sao thứ tự cộng ảnh hưởng tới kết quả?

## Tự viết lại

Không nhìn lại, viết mã cho:

```text
① Hàm so sánh hai số thực "bằng nhau trong sai số cho phép"
② Cộng một giỏ hàng gồm giá 199.000đ, 49.500đ, 1.200.000đ và thuế 8%,
   dùng cách lưu tiền đúng
③ Định dạng kết quả để hiển thị
```

Tự kiểm: thuế 8% cho ra số lẻ — bạn làm tròn ở bước nào, và ai được lợi từ phần lẻ đó?

## Thử sức

Kế toán báo: tổng doanh thu hệ thống tính ra **lệch 340 đồng** so với tổng các đơn hàng. Hệ thống lưu tiền bằng `double`.

Ba câu để trả lời: vì sao lệch, và vì sao con số lệch **nhỏ nhưng không bằng 0**; kế hoạch chuyển sang cách lưu đúng trên dữ liệu đang chạy; và bạn xử lý **dữ liệu cũ đã sai** thế nào. Câu khó nhất: sau khi chuyển sang số nguyên, phép chia (chia đều đơn hàng cho 3 người) vẫn cho số lẻ — bạn quyết định quy tắc gì, và vì sao nó phải được ghi thành tài liệu?
