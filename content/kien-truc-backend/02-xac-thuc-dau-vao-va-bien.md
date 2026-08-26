---
title: Xác thực đầu vào và biên hệ thống
slug: xac-thuc-dau-vao-va-bien
summary: Nơi dữ liệu chưa tin được thành dữ liệu có kiểu — và vì sao mọi thứ bên trong biên nên là dữ liệu sạch.
level: co-ban
tags: [backend, xac-thuc, zod, thiet-ke, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** đặt xác thực đúng chỗ, và biết vì sao kiểu TypeScript không bảo vệ được ở biên.

## Ý tưởng chính

**Biên** là nơi dữ liệu từ ngoài đi vào hệ thống của bạn: HTTP body, query string, biến môi trường, phản hồi từ API khác, hàng đợi, file.

Ở biên, dữ liệu là **`unknown`**. Sau biên, nó phải là dữ liệu có kiểu, đã kiểm, và tin được — để mọi tầng bên trong không phải hỏi lại.

## Mental model

Hãy nghĩ tới **cửa an ninh sân bay**.

> Trước cửa: ai cũng có thể mang bất cứ thứ gì.
>
> Sau cửa: mọi người đã qua kiểm tra. Nhân viên bên trong **không soi lại từng người** ở mỗi cửa lên máy bay — vì đã có một chỗ làm việc đó, và làm triệt để.
>
> Nếu mỗi cửa đều tự soi lại, hai chuyện xảy ra: chậm, và **các cửa soi theo tiêu chuẩn khác nhau**. Cửa nào lỏng nhất trở thành lỗ hổng của cả sân bay.

Đó là lý do xác thực phải nằm ở **một chỗ, tại biên** — không rải trong logic.

## Ví dụ nhỏ

```ts
const TaoDonSchema = z.object({
  spId: z.string().uuid(),
  soLuong: z.number().int().positive().max(100),
  ghiChu: z.string().max(500).optional(),
})
type TaoDon = z.infer<typeof TaoDonSchema>   // kiểu suy ra TỪ schema
```

## Code chạy thế nào

**Vì sao TypeScript không bảo vệ được ở biên:**

```ts
// ☠️ Lời nói dối trong sáng nhất của TypeScript
const dl = req.body as TaoDon
// Kiểu là lời KHẲNG ĐỊNH lúc biên dịch. Không có gì kiểm lúc chạy.
// req.body có thể là {}, là null, là { soLuong: "rất nhiều" }.
```

```text
TypeScript bị XOÁ HẾT khi biên dịch ([[bien-dich-va-thong-dich]]).
Lúc chạy không còn dòng nào kiểm tra gì.

⇒ `as` ở biên không phải "gán kiểu" — nó là tắt cảnh báo
  cho một chỗ bạn thật sự không biết.
⇒ Ở biên, luôn PARSE, đừng CAST.
```

**Một schema, hai công dụng — đây là điểm mấu chốt:**

```ts
const Schema = z.object({ soLuong: z.number().int().positive() })
type Dl = z.infer<typeof Schema>       // kiểu SUY RA từ schema
```

```text
Viết kiểu và validator riêng ⇒ hai nguồn sự thật, và chúng LỆCH NHAU
sau vài tháng: thêm trường vào interface, quên thêm vào validator
⇒ trường đó không bao giờ được kiểm.

Suy kiểu từ schema ⇒ không thể lệch. Đổi schema là kiểu đổi theo.
```

**Bốn biên hay bị bỏ sót:**

```text
① HTTP body / query / params      ← ai cũng nhớ
② BIẾN MÔI TRƯỜNG                 ← thường bị bỏ ([[bien-moi-truong-va-cau-hinh]])
③ PHẢN HỒI TỪ API BÊN NGOÀI       ← "họ nói sẽ trả về vậy" không phải đảm bảo
④ MESSAGE TỪ HÀNG ĐỢI             ← có thể do phiên bản mã CŨ gửi
```

Biên ③ đáng nhấn: API đối tác đổi định dạng, hoặc trả lỗi dưới dạng 200 kèm body khác — và nếu bạn `as` nó, lỗi sẽ nổ ở một chỗ hoàn toàn khác, nhiều tầng sau, với thông báo vô nghĩa.

## Cú pháp

```ts
// Query string: mọi thứ là chuỗi ⇒ phải ép kiểu có kiểm
const QuerySchema = z.object({
  trang: z.coerce.number().int().min(1).default(1),
  soDong: z.coerce.number().int().min(1).max(100).default(20),
  sapXep: z.enum(['moi-nhat', 'cu-nhat']).default('moi-nhat'),
})

// Thân request: từ chối trường lạ
const Schema = z.object({ ten: z.string() }).strict()
```

```text
`.max(100)` ở soDong không phải chuyện thẩm mỹ:
thiếu nó thì `?soDong=999999` là một cách làm sập CSDL
mà không cần lỗ hổng nào khác ([[phan-trang-loc-va-sap-xep]]).

`.strict()` từ chối trường lạ — chặn tấn công gán đè thuộc tính:
gửi thêm `{ vaiTro: 'admin' }` vào form cập nhật hồ sơ.
```

**Thông báo lỗi cho client — đủ để sửa, không hơn:**

```ts
const kq = Schema.safeParse(req.body)
if (!kq.success) {
  return res.status(400).json({
    loi: 'Dữ liệu không hợp lệ',
    chiTiet: kq.error.issues.map((i) => ({
      truong: i.path.join('.'),
      thongBao: i.message,
    })),
  })
}
```

```text
Trả về TẤT CẢ lỗi một lượt, không trả từng cái một.
Người dùng sửa một trường rồi lại thấy lỗi trường khác là trải nghiệm tệ,
và với client tự động thì đó là nhiều vòng gọi vô ích.
```

**Xác thực khác phân quyền — đừng gộp:**

```text
XÁC THỰC ĐẦU VÀO   "dữ liệu này có đúng hình dạng không?"     → ở biên
QUY TẮC NGHIỆP VỤ  "còn đủ tồn kho không?"                    → ở service
PHÂN QUYỀN         "người này được sửa bản ghi này không?"     → ở service

Nhét quy tắc nghiệp vụ vào schema là một cái bẫy quen thuộc:
schema không truy cập được CSDL, không biết người dùng là ai,
và không tái dùng được cho luồng khác ([[phan-quyen-theo-ban-ghi]]).
```

## Tại sao cần nó

Vì thiếu xác thực ở biên gây ba loại hậu quả, và loại thứ ba là tệ nhất:

```text
① Lỗi runtime khó hiểu
   `undefined is not a function` ở tầng repository,
   nguyên nhân thật là body thiếu một trường ba tầng trước đó.

② Dữ liệu bẩn vào CSDL
   Sửa được lúc phát hiện, nhưng dữ liệu đã sai thì phải dọn thủ công.

③ Lỗ hổng bảo mật
   Gán đè thuộc tính, tham số không giới hạn, injection.
```

**Nguyên tắc gói gọn:**

```text
□ PARSE, đừng CAST — không dùng `as` cho dữ liệu ngoài
□ Xác thực ở BIÊN, một lần, không rải trong logic
□ Một schema là nguồn duy nhất cho cả kiểu lẫn kiểm tra
□ Mọi trường số có giới hạn trên
□ `.strict()` cho dữ liệu ghi
□ Xác thực CẢ biến môi trường và phản hồi API ngoài
□ Kiểu bên trong hệ thống mô tả dữ liệu ĐÃ SẠCH
```

Dòng cuối là ý đáng mang đi: nếu tầng service của bạn vẫn phải viết `if (don.soLuong == null)`, nghĩa là biên chưa làm xong việc của nó — và mỗi chỗ như vậy là một chỗ ai đó sẽ quên.

## So sánh

| | `as Type` | `schema.parse()` |
|---|---|---|
| Kiểm lúc chạy | ❌ | ✅ |
| Còn sau khi biên dịch | ❌ | ✅ |
| Ép kiểu chuỗi → số | ❌ | ✅ `coerce` |
| Thông báo lỗi | không có | rõ theo từng trường |
| Dùng ở biên | **không bao giờ** | luôn |

## Dễ nhầm

**1. `as` cho `req.body`.** Không kiểm gì lúc chạy.

**2. Viết kiểu và validator riêng.** Hai nguồn sự thật, sẽ lệch.

**3. Không xác thực biến môi trường.** Lỗi lộ ra lúc 3 giờ sáng.

**4. Không xác thực phản hồi API ngoài.** Lỗi nổ ở chỗ khác hẳn.

**5. Không giới hạn trên cho số.** `?soDong=999999`.

**6. Không `.strict()`.** Gán đè thuộc tính.

**7. Nhét quy tắc nghiệp vụ vào schema.**

**8. Trả lỗi từng cái một.** Nhiều vòng gọi vô ích.

**9. Lộ chi tiết nội bộ trong thông báo lỗi.**

**10. Xác thực lại ở mọi tầng.** Biên đã làm rồi; lặp lại chỉ che việc biên bị bỏ sót.

## Mẹo nhớ

> **Ở biên: PARSE, đừng CAST. `as` không kiểm gì lúc chạy.**
>
> **Một schema — kiểu và kiểm tra suy ra từ CÙNG một nguồn.**
>
> **Bốn biên: HTTP, biến môi trường, API ngoài, hàng đợi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. "Biên" là những chỗ nào? Kể bốn cái.
2. Vì sao `as` không bảo vệ được ở biên?
3. Vì sao suy kiểu từ schema tốt hơn viết riêng?
4. `.strict()` chặn tấn công gì?
5. Xác thực đầu vào khác quy tắc nghiệp vụ và phân quyền thế nào?

## Tự viết lại

Không nhìn lại, viết schema và xử lý cho: `POST /san-pham` với tên, giá, danh mục, tồn kho, mô tả tuỳ chọn, và ảnh (mảng URL).

```text
① schema, kèm giới hạn hợp lý cho từng trường
② kiểu suy ra
③ xử lý lỗi trả về client
④ ba chỗ khác trong hệ thống cũng cần xác thực
```

Tự kiểm: mảng ảnh của bạn có giới hạn số phần tử không — và nếu không, ai đó gửi 100.000 URL thì chuyện gì xảy ra?

## Thử sức

Production báo `TypeError: Cannot read properties of undefined (reading 'toFixed')` trong hàm tính tổng đơn hàng.

Ba câu để trả lời: nguyên nhân gốc **có khả năng cao nhất** nằm ở đâu, và vì sao lỗi lại nổ ở chỗ khác; bạn sửa ở đâu để cả **lớp** lỗi này biến mất; và bạn tìm những chỗ còn lại đang thiếu xác thực bằng cách nào. Câu khó nhất: nếu nguồn dữ liệu bẩn là một API đối tác vừa đổi định dạng, xác thực ở biên giúp bạn **phát hiện** điều đó nhanh hơn ra sao?
