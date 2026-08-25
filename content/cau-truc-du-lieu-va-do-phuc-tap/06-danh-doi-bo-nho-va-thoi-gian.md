---
title: Đánh đổi bộ nhớ ↔ thời gian trong bài toán thật
slug: danh-doi-bo-nho-va-thoi-gian
summary: Gần như mọi cách tăng tốc đều là một hình thức trả bộ nhớ để mua thời gian. Nhận ra khuôn mẫu đó rồi thì bạn áp được ở mọi tầng.
level: nang-cao
tags: [nen-tang, do-phuc-tap, hieu-nang, danh-doi]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra cùng một khuôn mẫu đằng sau cache, index, bảng băm và bảng quy hoạch động — và biết ba câu phải hỏi trước khi áp dụng nó.

## Ý tưởng chính

Gần như mọi cách tăng tốc trong lập trình đều là **một hình thức của cùng một việc**: nhớ sẵn kết quả để khỏi tính lại.

Bạn trả bằng **bộ nhớ** và mua về **thời gian**. Nhận ra khuôn mẫu này rồi thì bạn thấy nó ở mọi tầng — và quan trọng hơn, bạn biết nó **luôn kèm hoá đơn**.

## Mental model

Hãy nghĩ tới **cuốn sổ tay của một người bán hàng**.

> Khách hỏi giá một món. Người bán có hai lựa chọn: **lật bảng giá tính lại từ đầu** (chậm, nhưng luôn đúng), hoặc **nhìn cuốn sổ đã ghi sẵn giá hôm qua** (nhanh, nhưng có thể đã cũ).
>
> Cuốn sổ càng dày thì tra càng nhanh — và càng dễ có trang ghi sai sự thật.

Toàn bộ chuyện cache, index, bảng băm đều nằm trong hình ảnh đó. Và hai vấn đề muôn thuở của nó cũng vậy: **cuốn sổ chiếm chỗ**, và **cuốn sổ có thể lệch với sự thật**.

## Ví dụ nhỏ

```ts
// Trả bằng thời gian: tính lại mỗi lần, luôn đúng, không tốn bộ nhớ
function fib(n) {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)
}
fib(40)   // ~1 giây, khoảng 300 triệu lời gọi
```

```ts
// Trả bằng bộ nhớ: ghi sổ, tra lại, tức thì
const so = new Map()
function fib(n) {
  if (n <= 1) return n
  if (so.has(n)) return so.get(n)
  const kq = fib(n - 1) + fib(n - 2)
  so.set(n, kq)
  return kq
}
fib(40)   // ~0,0001 giây, 40 mục trong sổ
```

## Code chạy thế nào

Cuốn sổ tiết kiệm được gì, nhìn cho cụ thể:

```text
KHÔNG ghi sổ — fib(5) gọi lại cùng một thứ rất nhiều lần
                  fib(5)
              /          \
         fib(4)          fib(3)      ← fib(3) tính LẦN 1
        /     \          /     \
    fib(3)  fib(2)   fib(2)  fib(1)  ← fib(3) tính LẦN 2, fib(2) ba lần
    ...

CÓ ghi sổ — mỗi giá trị tính đúng một lần
    fib(5) → cần fib(4), fib(3)
    fib(4) → cần fib(3), fib(2)
    fib(3) → tính, GHI SỔ
    fib(3) lần sau → tra sổ, xong ngay
```

Số lời gọi rơi từ ~300 triệu xuống 40. Cái giá: một `Map` 40 mục. Đây là món hời — nhưng không phải lúc nào cũng vậy, và phần dưới nói về lúc nào thì không.

## Tại sao cần nó

Vì khi bạn thấy được khuôn mẫu, bạn **học một lần, dùng ở mọi tầng**:

| Tên gọi | Nhớ sẵn cái gì | Trả bằng |
|---|---|---|
| Ghi nhớ / quy hoạch động | Kết quả hàm theo tham số | RAM |
| Bảng băm | Vị trí của phần tử theo khoá | RAM |
| Index cơ sở dữ liệu | Vị trí dòng theo giá trị cột | Đĩa + ghi chậm hơn |
| Cache HTTP / CDN | Nội dung phản hồi | Đĩa + nguy cơ dữ liệu cũ |
| Bảng tính sẵn (materialized view) | Kết quả truy vấn nặng | Đĩa + phải làm mới |
| Chỉ mục tìm kiếm | Tài liệu nào chứa từ nào | Đĩa + ghi chậm hơn |

Sáu dòng, một khuôn mẫu. Ai học riêng lẻ sáu thứ này sẽ thấy chúng là sáu chủ đề; ai thấy khuôn mẫu chỉ cần nhớ **một** câu và ba câu hỏi ở dưới. Tầng cache trong hệ thống thật nằm ở [[cache-nhieu-tang]].

## So sánh

Ba câu hỏi bắt buộc trước khi đánh đổi, theo đúng thứ tự:

**1. Kết quả có ổn định không?** Nhớ sẵn chỉ đúng khi cùng đầu vào cho cùng đầu ra — tức là bạn đang nhớ kết quả của một **hàm thuần** ([[ham-dau-vao-dau-ra-va-tac-dung-phu]]). Nhớ kết quả của một hàm phụ thuộc thời gian hay dữ liệu đang đổi là tự tạo ra lỗi khó tái hiện.

**2. Cuốn sổ lớn tới đâu?** Có trần không? `fib` chỉ cần 40 mục. Nhớ kết quả theo mọi tổ hợp tham số có thể phình vô hạn, và bạn đổi một chương trình chậm lấy một chương trình **hết RAM** — tệ hơn hẳn.

**3. Sổ lệch với sự thật thì sao?** Đây là câu khó nhất, và là lý do câu nói kinh điển: *"hai bài toán khó nhất là đặt tên và làm mất hiệu lực cache"*. Trả lời trước ba tình huống: dữ liệu gốc đổi thì sao, sổ đầy thì bỏ mục nào, và hiển thị dữ liệu cũ vài giây có chấp nhận được không.

Ba chiến lược làm mất hiệu lực, không cái nào hoàn hảo:

```text
Theo thời gian (TTL)   → đơn giản nhất; chấp nhận cũ tối đa N giây
Theo sự kiện           → chính xác; nhưng phải nhớ xoá ở MỌI chỗ ghi
Ghi thì xoá luôn       → an toàn; mất lợi ích nếu ghi nhiều hơn đọc
```

## Dễ nhầm

**1. Đánh đổi khi chưa đo.** Ghi nhớ một hàm vốn chỉ chạy 2ms và gọi 10 lần mỗi ngày là thêm code, thêm chỗ sai, không được gì. Đo trước — cách đo ở [[hieu-nang-va-do-luong]].

**2. Quên chiều ngược lại.** Đôi khi bạn trả **thời gian** để mua **bộ nhớ**, và đó cũng là lựa chọn đúng:

```ts
// Tốn RAM: nạp cả file 5GB
const tatCa = JSON.parse(await fs.readFile('lich-su.json'))

// Tốn thời gian hơn, nhưng chạy được với RAM 1GB
for await (const dong of docTungDong('lich-su.json')) { }
```

Nén dữ liệu, xử lý theo luồng, tính lại thay vì lưu — đều là chiều ngược lại. Khi bộ nhớ là thứ khan hiếm, chiều này mới đúng.

**3. Nhớ sẵn thứ phụ thuộc quyền xem.** Đây là lỗi bảo mật, không phải lỗi hiệu năng:

```ts
cache.set(`don-${id}`, don)   // ❌ ai tra khoá này cũng lấy được, kể cả người không có quyền
```

Khoá cache phải mang theo **danh tính người xem** khi dữ liệu khác nhau theo người.

**4. Tưởng cache luôn làm mọi thứ nhanh hơn.** Cache tra hụt (miss) tốn thêm một lần tra vô ích rồi mới tính. Với dữ liệu gần như không lặp lại — mỗi khoá chỉ được hỏi một lần — cache **luôn** chậm hơn không cache.

**5. Không đặt trần cho cuốn sổ.** Mọi bộ nhớ đệm trong tiến trình phải có giới hạn kích thước và chính sách loại bỏ. Không có nó, cache là một chỗ rò bộ nhớ mọc chậm — chạy tốt vài tuần rồi sập.

## Mẹo nhớ

> **Mọi cách tăng tốc đều là "ghi sổ để khỏi tính lại".**
>
> **Cuốn sổ nào cũng có hai hoá đơn: chỗ chứa, và nguy cơ ghi sai sự thật.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Index cơ sở dữ liệu và ghi nhớ hàm giống nhau ở điểm nào?
2. Ba câu hỏi phải trả lời trước khi thêm một lớp nhớ sẵn?
3. Vì sao chỉ nên nhớ sẵn kết quả của hàm thuần?
4. Cho một tình huống mà cache làm chương trình **chậm hơn**.
5. Khi nào bạn đi theo chiều ngược lại — trả thời gian để mua bộ nhớ?

## Tự viết lại

Không nhìn lại phần trên, thêm ghi nhớ cho hàm này **kèm trần 100 mục**:

```ts
function doiTien(soTien, tuTienTe, sangTienTe) { /* gọi API, ~200ms */ }
```

Ba câu tự kiểm: khoá của bạn gồm những gì, sổ đầy thì bạn bỏ mục nào, và tỉ giá đổi sau 5 phút thì chuyện gì xảy ra?

## Thử sức

Trang chủ hiển thị "10 sản phẩm bán chạy nhất", tính từ một truy vấn nặng mất 3 giây. Trang được xem 10.000 lần mỗi phút.

Rõ ràng là phải nhớ sẵn. Câu hỏi thật sự: **nhớ ở tầng nào** — trong tiến trình ứng dụng, trong Redis, hay ở CDN? Mỗi lựa chọn hỏng theo một kiểu khác nhau khi bạn chạy 5 instance ứng dụng — kiểu gì?
