---
title: Đọc stack trace và log
slug: doc-stack-trace-va-log
summary: Dòng nào trong stack trace là của bạn, lỗi async mất stack ra sao, và đọc log từ đầu sự cố.
level: co-ban
tags: [go-loi, log, stack-trace, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** tìm được dòng đáng đọc trong một stack trace 60 dòng, và biết vì sao lỗi async thường mất dấu.

## Ý tưởng chính

Một stack trace đã nói cho bạn **chuyện gì xảy ra và ở đâu**. Nó bị bỏ qua vì trông dài và phần lớn nội dung không liên quan.

Nhưng cấu trúc của nó rất đơn giản, và có hai quy tắc đọc: **dòng đầu nói lỗi gì**, và **dòng đầu tiên thuộc mã của bạn nói lỗi ở đâu**.

## Mental model

Hãy nghĩ tới **lịch sử cuộc gọi chuyển tiếp**.

> Bạn gọi tổng đài → tổng đài chuyển sang phòng kinh doanh → phòng kinh doanh chuyển sang một nhân viên → nhân viên đó gặp sự cố.
>
> Stack trace là danh sách đó, **đọc từ dưới lên**: ai gọi ai, cho tới chỗ hỏng. Dòng **trên cùng** là nơi nó nổ; các dòng dưới là đường dẫn tới đó.
>
> Và phần lớn danh sách là các tổng đài trung gian — thư viện, framework. Chỗ bạn cần là **nhân viên đầu tiên thuộc công ty bạn**.

## Ví dụ nhỏ

```text
TypeError: Cannot read properties of undefined (reading 'toFixed')
    at tinhTong (/app/src/don-hang/service.ts:42:28)      ← MÃ CỦA BẠN
    at DonHangService.tao (/app/src/don-hang/service.ts:15:20)
    at /app/node_modules/express/lib/router/route.js:149:13
    at Layer.handle (/app/node_modules/express/lib/router/layer.js:95:5)
```

## Code chạy thế nào

**Đọc theo ba bước:**

```text
① DÒNG ĐẦU: loại lỗi + thông báo
   "Cannot read properties of undefined (reading 'toFixed')"
   ⇒ Một thứ là `undefined`, và bạn gọi `.toFixed` trên nó.
   ⇒ Đã biết CHUYỆN GÌ.

② DÒNG ĐẦU TIÊN CÓ ĐƯỜNG DẪN CỦA BẠN
   service.ts:42:28
   ⇒ Đã biết Ở ĐÂU. Mở đúng dòng đó.

③ CÁC DÒNG SAU: đường dẫn tới đó
   Đọc khi cần biết "vì sao hàm này lại được gọi với dữ liệu đó".
   Bỏ qua mọi dòng trong node_modules — trừ khi bạn nghi thư viện.
```

Ba bước này giải quyết phần lớn trace. Cái mất thời gian là khi trace **không có dòng nào của bạn** — và đó thường là dấu hiệu của một trong hai chuyện: lỗi async mất ngữ cảnh, hoặc lỗi xảy ra trong callback do thư viện gọi.

**Lỗi async — vì sao stack bị cắt:**

```js
// ❌ Không await ⇒ stack trace không có mã của bạn
function xuLy() { layDuLieu() }        // promise bị bỏ rơi

// Trace nhận được:
// UnhandledPromiseRejection
//     at processTicksAndRejections (node:internal/...)
// ⇒ Không có dòng nào của bạn. Vô dụng.

// ✅ await giữ được ngữ cảnh
async function xuLy() { await layDuLieu() }
```

```text
Vì sao: stack trace là ngăn xếp lời gọi HIỆN TẠI.
Khi callback chạy, ngăn xếp gốc đã bị tháo bỏ từ lâu.

Cách chữa:
  □ Luôn `await` (hoặc `.catch()` có chủ đích)
  □ Bọc lỗi kèm ngữ cảnh: `new Error('...', { cause: e })`
  □ Node ≥ 12: `--async-stack-traces` (mặc định bật ở bản mới)
```

**Source map — không có thì trace vô dụng ở production:**

```text
Không có source map:
  at t (/app/.next/server/chunks/8912.js:1:48273)
  ⇒ Mã đã minify. Không tra được về dòng nào.

Có source map:
  at tinhTong (/app/src/don-hang/service.ts:42:28)

⇒ Cấu hình `sourcemap: true` và tải map lên hệ thống theo dõi lỗi
  (Sentry và tương tự). Đừng phục vụ map công khai —
  nó là mã nguồn của bạn.
```

## Cú pháp

**Đọc log — quy tắc quan trọng nhất:**

```text
Đọc từ THỜI ĐIỂM SỰ CỐ BẮT ĐẦU, không đọc từ cuối.

Bản năng là `tail -f` để xem lỗi mới nhất.
Nhưng lỗi mới nhất thường là HẬU QUẢ thứ n:
  "connection pool exhausted" ← hậu quả
  "connection pool exhausted"
  ... (hàng nghìn dòng)
  "query timeout on orders"   ← NGUYÊN NHÂN, 4 phút trước
```

```bash
journalctl -u app --since "14:30" | head -100     # từ lúc bắt đầu
grep -c "ERROR" app.log                            # đếm, để so trước/sau
grep "traceId=abc123" app.log                      # toàn bộ một request
```

**Lỗi đầu tiên khác lỗi ồn nhất:**

```text
Lỗi xuất hiện 5.000 lần thường là hậu quả.
Lỗi xuất hiện 1 lần, sớm nhất, thường là nguyên nhân.

⇒ Sắp theo THỜI GIAN để tìm nguyên nhân.
  Sắp theo SỐ LƯỢNG để biết mức ảnh hưởng.
  Hai câu hỏi khác nhau, hai cách sắp khác nhau.
```

**Bốn thứ phải có trong mỗi dòng log lỗi:**

```text
□ traceId          — nối được toàn bộ hành trình request
□ Ngữ cảnh nghiệp vụ — userId, donHangId... KHÔNG có dữ liệu nhạy cảm
□ Lỗi ĐẦY ĐỦ, kể cả `cause`
□ Thời gian có múi giờ rõ ràng
```

```ts
// ❌ Mất gần hết thông tin
logger.error('Lỗi khi lưu đơn: ' + err.message)

// ✅
logger.error({
  event: 'don_hang.luu_that_bai',
  donHangId: don.id,
  userId: user.id,
  traceId: ctx.traceId,
  err,                     // logger có cấu trúc tự tuần tự hoá cả stack và cause
})
```

Ghi `err.message` thay vì `err` là lỗi phổ biến nhất: bạn giữ lại câu chữ và **bỏ mất stack trace** — đúng phần có giá trị nhất ([[xu-ly-loi-va-ket-qua]]).

## Tại sao cần nó

Vì thông tin để tìm ra bug thường **đã có sẵn** — chỉ chưa được đọc đúng:

```text
Ba tình huống rất hay gặp:
  ① Thông báo lỗi đã nói đúng vấn đề, nhưng bị đọc qua loa
  ② Stack trace chỉ đúng dòng, nhưng bị bỏ qua vì dài
  ③ Log có đủ dữ liệu, nhưng đọc từ cuối nên chỉ thấy hậu quả
```

**Đọc thông báo lỗi cho đúng — bốn ví dụ:**

```text
"Cannot read properties of undefined (reading 'x')"
  ⇒ Thứ TRƯỚC dấu chấm là undefined, không phải `x`.

"ECONNREFUSED 127.0.0.1:5432"
  ⇒ Đã nói cả IP và cổng: bạn đang gọi localhost.
    Trong container, đó gần như luôn là sai cấu hình.

"Maximum call stack size exceeded"
  ⇒ Đệ quy không có điều kiện dừng, hoặc dữ liệu có vòng.

"ENOENT: no such file or directory, open 'config.json'"
  ⇒ Đường dẫn TƯƠNG ĐỐI. Câu hỏi là: chạy từ thư mục nào?
```

Mỗi thông báo trên đã chứa gần đủ để tìm ra nguyên nhân. Kỹ năng cần rèn là **đọc chậm và đọc hết**.

## So sánh

| Nguồn | Trả lời | Hạn chế |
|---|---|---|
| Thông báo lỗi | chuyện gì xảy ra | không nói vì sao |
| Stack trace | ở đâu, gọi từ đâu | mất dấu với async |
| Log | ngữ cảnh và trình tự | chỉ có nếu đã ghi |
| Metric | có bất thường không | không nói chi tiết |

## Dễ nhầm

**1. Bỏ qua stack trace vì dài.** Dòng cần đọc chỉ là dòng thứ hai.

**2. Đọc log từ cuối.** Chỉ thấy hậu quả.

**3. Ưu tiên lỗi ồn nhất.** Lỗi **sớm nhất** mới là nguyên nhân.

**4. Log `err.message` thay vì `err`.** Mất stack trace.

**5. Bọc lỗi mà không giữ `cause`.**

**6. Không `await`.** Stack trace không có mã của bạn.

**7. Không có source map ở production.** Trace vô dụng.

**8. Phục vụ source map công khai.** Phơi mã nguồn.

**9. Không có `traceId`.** Không nối được các dòng log của cùng một request.

**10. Đọc thông báo lỗi qua loa.** Nó thường đã nói đúng vấn đề.

## Mẹo nhớ

> **Dòng đầu = LỖI GÌ. Dòng đầu tiên có đường dẫn của bạn = Ở ĐÂU.**
>
> **Đọc log từ lúc sự cố BẮT ĐẦU. Lỗi ồn nhất là hậu quả.**
>
> **Log cả object `err`, đừng chỉ log `err.message`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba bước đọc một stack trace?
2. Vì sao lỗi async thường mất stack trace, và cách chữa?
3. Vì sao đọc log từ đầu sự cố chứ không từ cuối?
4. Bốn thứ phải có trong mỗi dòng log lỗi?
5. `Cannot read properties of undefined (reading 'x')` — cái gì là `undefined`?

## Tự viết lại

Không nhìn lại:

```text
① Cho một stack trace 40 dòng, viết ra quy tắc chọn dòng cần đọc
② Viết một dòng log lỗi đầy đủ cho luồng thanh toán
③ Ba lệnh điều tra khi có sự cố lúc 14:32
④ Giải thích ba thông báo lỗi bằng lời của bạn
```

Tự kiểm: dòng log ở ② của bạn có chứa dữ liệu nào **không được phép ghi** không?

## Thử sức

Sentry báo 3.000 lỗi `Cannot read properties of undefined (reading 'id')` trong một giờ. Stack trace chỉ có các dòng trong `node_modules`.

Ba câu để trả lời: vì sao trace không có mã của bạn, và điều đó gợi ý loại lỗi nào; bạn thu hẹp bằng cách nào **với thông tin hiện có**; và bạn thêm gì để lần sau có trace dùng được. Câu khó nhất: 3.000 lỗi trong một giờ — bạn xác định có bao nhiêu **người dùng thật** bị ảnh hưởng bằng cách nào, và vì sao con số đó quan trọng hơn 3.000?
