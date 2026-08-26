---
title: Biên dịch, thông dịch và cái gì thật sự chạy
slug: bien-dich-va-thong-dich
summary: Từ mã nguồn tới mã máy — và vì sao "ngôn ngữ chậm" là một cách nói không chính xác.
level: trung-cap
tags: [nen-tang, bien-dich, runtime, computer-science]
khung: v2
---

> **Sau bài này bạn sẽ:** mô tả được đường đi từ mã nguồn tới CPU, và biết vì sao JIT làm mã "thông dịch" chạy nhanh.

## Ý tưởng chính

CPU chỉ hiểu **mã máy** — những con số. Mọi ngôn ngữ lập trình đều là một cách viết dễ hơn cho con người, và luôn có một bước dịch ở giữa.

Điều đáng nói: **"biên dịch" và "thông dịch" không phải thuộc tính của ngôn ngữ**. Chúng là thuộc tính của bản cài đặt. Có trình thông dịch C, và có trình biên dịch Python.

## Mental model

Hãy nghĩ tới **hai cách xử lý một cuốn sách tiếng nước ngoài**.

> **Biên dịch**: thuê người dịch cả cuốn sách trước, in ra. Mất thời gian ban đầu, nhưng sau đó **ai đọc cũng nhanh**, và người dịch có thời gian đọc cả cuốn nên **sửa được cả những chỗ tối nghĩa**.
>
> **Thông dịch**: thuê phiên dịch ngồi cạnh, dịch từng câu khi bạn đọc tới. Bắt đầu được ngay. Nhưng đọc lại đoạn cũ thì **phải dịch lại từ đầu**.
>
> **JIT**: phiên dịch ngồi cạnh, nhưng nhận ra bạn đọc đi đọc lại chương 3 — nên **dịch sẵn chương đó ra giấy** và đưa bạn. Từ lần sau, chương 3 nhanh như đã biên dịch.

Vế thứ ba là cách JavaScript, Java và C# thật sự chạy, và là lý do "ngôn ngữ thông dịch thì chậm" đã lỗi thời.

## Ví dụ nhỏ

```text
mã nguồn  →  phân tích cú pháp  →  cây cú pháp (AST)
          →  tối ưu  →  mã máy hoặc bytecode  →  CPU
```

## Code chạy thế nào

**Các bước dịch, và mỗi bước bắt loại lỗi gì:**

```text
① PHÂN TÍCH TỪ VỰNG   chuỗi ký tự → các token
   Bắt: ký tự không hợp lệ

② PHÂN TÍCH CÚ PHÁP   token → cây cú pháp (AST)
   Bắt: thiếu dấu ngoặc, sai cú pháp

③ PHÂN TÍCH NGỮ NGHĨA kiểm kiểu, kiểm biến đã khai báo
   Bắt: gán string cho number, gọi hàm không tồn tại
   ⇒ ĐÂY là bước TypeScript làm — và nó dừng ở đây,
     không sinh mã tối ưu gì cả.

④ TỐI ƯU              gộp hằng số, bỏ mã chết, nội tuyến hàm

⑤ SINH MÃ             ra mã máy hoặc bytecode
```

Hiểu bước ③ giải thích một chuyện hay gây nhầm: **TypeScript không làm mã chạy nhanh hơn**. Nó xoá kiểu đi và sinh ra JavaScript. Lợi ích của nó nằm hoàn toàn ở thời điểm viết mã.

**JIT — vì sao nó nhanh:**

```text
① Bắt đầu: thông dịch bytecode, chạy ngay, không chờ
② Vừa chạy vừa ĐẾM: hàm nào gọi nhiều? vòng lặp nào chạy lâu?
③ Chỗ nóng ⇒ biên dịch sang mã máy, kèm GIẢ ĐỊNH:
     "biến này luôn là số nguyên"
     "object này luôn có đúng các trường này"
④ Giả định sai ⇒ HUỶ TỐI ƯU, quay về thông dịch, thử lại sau
```

Bước ③ là chỗ JIT có thể **thắng cả trình biên dịch tĩnh**: nó biết dữ liệu thật lúc chạy, còn trình biên dịch tĩnh chỉ đoán.

Nhưng bước ④ giải thích một lời khuyên quen thuộc:

```js
// ❌ Hình dạng object thay đổi ⇒ JIT huỷ tối ưu liên tục
const p = { x: 1 }
p.y = 2              // đổi hình dạng sau khi tạo

// ✅ Khai đủ trường ngay từ đầu, giữ kiểu ổn định
const p = { x: 1, y: 2 }
```

```js
// ❌ Mảng đa kiểu ⇒ không tối ưu được
const a = [1, 'hai', {}, null]
// ✅ Đồng nhất kiểu
const a = [1, 2, 3]
```

Đây không phải "mẹo vặt hiệu năng" — nó là hệ quả trực tiếp của cách JIT hoạt động.

## Cú pháp

**Bốn kiểu chạy, xếp theo thời điểm dịch:**

```text
BIÊN DỊCH TRƯỚC (AOT)        C, C++, Rust, Go
  Dịch thẳng ra mã máy trước khi chạy.
  + Khởi động tức thì, hiệu năng dự đoán được, không cần runtime
  − Biên dịch lâu, mã máy phụ thuộc nền tảng

BYTECODE + MÁY ẢO            Java, C#
  Dịch ra bytecode, máy ảo chạy và JIT các chỗ nóng.
  + Một artifact chạy nhiều nền tảng
  − Cần máy ảo, khởi động chậm hơn

THÔNG DỊCH + JIT             JavaScript, Python (PyPy), Ruby
  Chạy ngay, tối ưu dần.
  + Bắt đầu nhanh, linh hoạt
  − Vài giây đầu chậm; bộ nhớ tốn hơn

THÔNG DỊCH THUẦN             shell, Python (CPython, phần lớn)
  + Đơn giản nhất
  − Chậm nhất với việc nặng CPU
```

**Vì sao "khởi động chậm" quan trọng ở serverless:**

```text
Hàm serverless chạy 200ms rồi kết thúc.
JIT chưa kịp phát hiện chỗ nóng, chưa kịp tối ưu gì.
⇒ Ưu thế của JIT biến mất; ngôn ngữ AOT (Go, Rust) thắng rõ rệt
  ở loại tải này ([[chi-phi-ha-tang]]).
```

**Hai bước "dịch" nữa trong đời sống web:**

```text
TRANSPILE   TypeScript → JavaScript, JSX → JavaScript
            Dịch giữa hai ngôn ngữ CÙNG MỨC TRỪU TƯỢNG.
            TS chỉ XOÁ kiểu — không tối ưu gì.

BUNDLE      nhiều file → ít file, kèm tree-shaking, minify
            Không đổi ngôn ngữ; đổi cách phân phối.
```

## Tại sao cần nó

Vì nó trả lời được ba câu hỏi thường gặp một cách chính xác:

```text
① "Python chậm hơn Go bao nhiêu lần?"
   → Với vòng lặp thuần CPU: 10–100 lần.
   → Với ứng dụng web chờ CSDL: gần như KHÔNG khác biệt,
     vì 95% thời gian là chờ I/O.
   ⇒ Chọn ngôn ngữ theo bài toán, không theo bảng benchmark.

② "TypeScript có làm ứng dụng nhanh hơn không?"
   → Không. Nó bắt lỗi lúc viết. Mã chạy y hệt JavaScript.

③ "Vì sao lần chạy đầu chậm?"
   → JIT chưa tối ưu, cache lạnh, module chưa nạp.
   ⇒ Đó là lý do đo hiệu năng phải có warm-up.
```

**Và nó giải thích thông báo lỗi:**

```text
Lỗi cú pháp        → bước ②, trước khi chạy dòng nào
Lỗi kiểu (TS)      → bước ③, lúc biên dịch
Lỗi kiểu (JS)      → lúc chạy, tại đúng dòng đó
Lỗi ở runtime      → sau khi đã sinh mã, phụ thuộc dữ liệu thật
```

## So sánh

| | AOT | Bytecode + VM | JIT | Thông dịch thuần |
|---|---|---|---|---|
| Khởi động | tức thì | chậm | nhanh | tức thì |
| Đỉnh hiệu năng | cao | cao | cao | thấp |
| Đa nền tảng | biên dịch lại | ✅ | ✅ | ✅ |
| Ví dụ | Go, Rust | Java, C# | JS, PyPy | shell, CPython |

## Dễ nhầm

**1. Tưởng biên dịch/thông dịch là thuộc tính của ngôn ngữ.** Nó thuộc về bản cài đặt.

**2. Nghĩ TypeScript làm mã chạy nhanh hơn.** Nó chỉ xoá kiểu.

**3. Chọn ngôn ngữ theo benchmark thuần CPU** cho ứng dụng chủ yếu chờ I/O.

**4. Đo hiệu năng không warm-up.** Đo cả giai đoạn JIT chưa tối ưu.

**5. Đổi hình dạng object sau khi tạo.** JIT huỷ tối ưu.

**6. Mảng trộn nhiều kiểu.** Không tối ưu được.

**7. Dùng ngôn ngữ JIT cho serverless siêu ngắn** rồi ngạc nhiên vì chậm.

**8. Nhầm transpile với compile.** Transpile dịch giữa hai ngôn ngữ cùng mức.

**9. Tin rằng AOT luôn nhanh hơn JIT.** JIT biết dữ liệu thật lúc chạy.

## Mẹo nhớ

> **Biên dịch/thông dịch là thuộc tính của BẢN CÀI ĐẶT, không phải của ngôn ngữ.**
>
> **JIT = thông dịch trước, biên dịch chỗ NÓNG, huỷ tối ưu khi giả định sai.**
>
> **TypeScript chỉ XOÁ KIỂU. Mã chạy y hệt JavaScript.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm bước từ mã nguồn tới mã máy, mỗi bước bắt lỗi gì?
2. JIT hoạt động thế nào, và vì sao nó có thể thắng biên dịch tĩnh?
3. "Huỷ tối ưu" là gì, và nó liên quan gì tới cách bạn viết object?
4. Vì sao ngôn ngữ AOT hợp với serverless ngắn hơn?
5. TypeScript ảnh hưởng tới hiệu năng lúc chạy thế nào?

## Tự viết lại

Không nhìn lại:

```text
① Vẽ đường đi của một file .ts trong dự án Next.js, từ mã nguồn tới trình duyệt
② Đánh dấu bước nào là transpile, bước nào là bundle, bước nào là JIT
③ Viết hai đoạn mã tương đương, một cái JIT tối ưu được, một cái không
```

Tự kiểm: ở ① có bước nào **kiểm kiểu** không, và nó nằm trước hay sau bước sinh mã chạy được?

## Thử sức

Đội đề xuất viết lại dịch vụ API từ Python sang Go "để nhanh hơn". Đo hiện tại: p95 = 180ms, trong đó 160ms là chờ CSDL.

Ba câu để trả lời: viết lại sẽ cải thiện được bao nhiêu, ước lượng ra sao; bạn đề xuất làm gì **thay vào đó**; và có lý do chính đáng nào khác để đổi ngôn ngữ không. Câu khó nhất: nếu 160ms chờ CSDL kia là **tổng của 12 truy vấn tuần tự**, thì con số cải thiện thật sự nằm ở đâu — và nó có liên quan gì tới ngôn ngữ không?
