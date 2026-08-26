---
title: Xử lý lỗi trong backend
slug: xu-ly-loi-va-ket-qua
summary: Lỗi mong đợi khác lỗi bất ngờ, ném hay trả về, và vì sao catch rồi log rồi bỏ qua là tệ nhất.
level: trung-cap
tags: [backend, error-handling, thiet-ke, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** phân biệt được lỗi mong đợi với lỗi bất ngờ, và xử lý mỗi loại đúng cách.

## Ý tưởng chính

Có hai loại "lỗi", và trộn chúng làm cả hai bị xử lý sai:

**Lỗi mong đợi** — một kết quả hợp lệ của nghiệp vụ. "Không đủ tồn kho", "email đã tồn tại". Chúng **sẽ** xảy ra; hệ thống vẫn đang hoạt động đúng.

**Lỗi bất ngờ** — hệ thống đang hỏng. CSDL mất kết nối, hết bộ nhớ, một `undefined` không lường trước.

Loại thứ nhất là một phần của thiết kế. Loại thứ hai là thứ cần cảnh báo.

## Mental model

Hãy nghĩ tới **hai loại tình huống ở quầy ngân hàng**.

> **"Số dư không đủ để rút."** Giao dịch viên nói với bạn, ghi vào sổ, và **tiếp tục làm việc**. Đây là một kết quả bình thường — quy trình đã lường trước.
>
> **"Mất điện toàn chi nhánh."** Không ai nói "xin lỗi, mời anh thử lại" rồi làm tiếp. Chuông reo, quản lý được gọi, và có người phải xử lý ngay.

Cái đầu **không** đánh thức ai lúc 3 giờ sáng. Cái sau thì có. Nếu bạn ghi cả hai vào cùng một sổ với cùng mức độ, chuông sẽ reo suốt và không ai còn nghe nữa.

## Ví dụ nhỏ

```ts
class KhongDuTonKho extends Error {}      // mong đợi — nghiệp vụ
// vs
// db.query() ném ECONNREFUSED           // bất ngờ — hệ thống hỏng
```

## Code chạy thế nào

**Hai loại, hai cách xử lý:**

```text
                     LỖI MONG ĐỢI          LỖI BẤT NGỜ
Ví dụ                không đủ tồn kho      CSDL mất kết nối
Là gì                kết quả nghiệp vụ     hệ thống đang hỏng
Mã HTTP              4xx                   5xx
Mức log              info / warn           ERROR
Cảnh báo             ❌ không              ✅ có
Nói gì với người dùng lý do cụ thể         "lỗi hệ thống", kèm mã tra cứu
Nên bắt riêng        ✅                    ❌ để nó nổi lên tầng trên
```

Dòng cuối là quy tắc quan trọng nhất: **đừng bắt lỗi bạn không xử lý được**.

```ts
// ❌ Tệ nhất: nuốt lỗi
try { await luu(don) } catch (e) { logger.error(e) }
// Hàm trả về bình thường. Người gọi tưởng đã lưu. Dữ liệu thì không.

// ❌ Cũng tệ: bắt rồi ném lại y nguyên
try { await luu(don) } catch (e) { logger.error(e); throw e }
// Log cùng một lỗi nhiều lần ở nhiều tầng ⇒ nhiễu.

// ✅ Không bắt — để tầng xử lý lỗi chung lo
await luu(don)

// ✅ Hoặc bắt để THÊM NGỮ CẢNH rồi ném tiếp
try {
  await thanhToan.tinhPhi(don)
} catch (e) {
  throw new LoiThanhToan(`Tính phí thất bại cho đơn ${don.id}`, { cause: e })
}
```

`cause` giữ được lỗi gốc, nên bạn có cả ngữ cảnh nghiệp vụ **và** stack trace gốc — thay vì phải chọn một.

**Một chỗ duy nhất xử lý lỗi:**

```ts
app.use((err, req, res, _next) => {
  const traceId = req.traceId
  if (err instanceof LoiNghiepVu) {
    logger.info({ event: 'nghiep_vu.tu_choi', ma: err.ma, traceId })
    return res.status(err.maHttp).json({ loi: err.message, ma: err.ma, traceId })
  }
  logger.error({ err, traceId })          // ← chỉ ĐÂY mới log mức error
  res.status(500).json({ loi: 'Lỗi hệ thống', traceId })
})
```

```text
`traceId` trả về cho client là chi tiết nhỏ, giá trị lớn:
người dùng gửi mã đó cho hỗ trợ ⇒ bạn lọc log ra đúng request
trong vài giây, thay vì mò theo thời gian ([[quan-sat-he-thong]]).
```

## Cú pháp

**Ném lỗi hay trả về kết quả — chọn theo tần suất:**

```ts
// Ném — mặc định, hợp khi lỗi là ngoại lệ
async function layDon(id: string): Promise<Don> {
  const d = await repo.tim(id)
  if (d === null) throw new KhongTimThay(`Đơn ${id}`)
  return d
}

// Trả về kết quả — hợp khi "thất bại" là chuyện thường xuyên
type KetQua<T> = { ok: true; giaTri: T } | { ok: false; loi: LoiXacThuc }
```

```text
Ném:      gọn, tự nổi lên, không cần người gọi làm gì
          nhưng KHÔNG hiện trong chữ ký hàm ⇒ dễ quên xử lý

Trả về:   trình biên dịch BẮT bạn xử lý
          nhưng rườm rà nếu dùng cho mọi thứ

Kinh nghiệm dùng được:
  Lỗi hiếm, không xử lý được tại chỗ  → ném
  Lỗi thường xuyên, người gọi phải quyết định → trả về
```

**Lỗi bất đồng bộ — hai chỗ hay rò:**

```js
// ☠️ Không có await ⇒ promise bị từ chối mà không ai bắt
// ⇒ Node hiện tại KẾT THÚC TIẾN TRÌNH
guiEmail(don)

// ✅ Cố ý chạy nền thì phải tự bắt
void guiEmail(don).catch((e) => logger.error({ e, event: 'email.that_bai' }))

// ✅ Và luôn có lưới cuối
process.on('unhandledRejection', (e) => { logger.error({ e }); process.exit(1) })
```

```text
Vì sao `process.exit(1)` chứ không chạy tiếp:
sau một lỗi không lường trước, trạng thái tiến trình KHÔNG còn tin được.
Thoát và để trình quản lý dịch vụ khởi động lại là an toàn hơn
chạy tiếp trong trạng thái không xác định ([[tien-trinh-va-dich-vu]]).
```

**Thoát sạch:** khi nhận SIGTERM, ngừng nhận request mới, **xử lý nốt request đang chạy**, rồi mới thoát — nếu không, mỗi lần triển khai là một lần cắt ngang người dùng.

## Tại sao cần nó

Vì cách bạn phân loại lỗi quyết định trực tiếp chất lượng cảnh báo:

```text
Trộn hai loại: mọi thứ log mức ERROR
  → 5.000 dòng ERROR mỗi ngày, phần lớn là "email đã tồn tại"
  → không ai đọc nữa
  → lỗi thật chìm trong đó

Tách rõ: ERROR chỉ dành cho lỗi hệ thống
  → vài chục dòng mỗi ngày
  → đáng đọc, và cảnh báo dựa vào nó có ý nghĩa
```

Đây là cùng cơ chế với test chập chờn và cảnh báo giả: **tín hiệu mất giá trị khi nó kêu quá thường xuyên** ([[su-co-va-hau-kiem]]).

**Ba câu hỏi cho mỗi `catch` bạn viết:**

```text
① Tôi XỬ LÝ ĐƯỢC lỗi này không?   Không → đừng bắt.
② Tôi THÊM được ngữ cảnh gì?      Có → bọc lại kèm `cause`.
③ Người gọi CẦN BIẾT không?       Có → ném tiếp.
```

Nếu cả ba câu đều "không", thì `catch` đó chỉ đang **giấu** lỗi.

## So sánh

| | Ném lỗi | Trả về kết quả |
|---|---|---|
| Hiện trong chữ ký | ❌ | ✅ |
| Trình biên dịch ép xử lý | ❌ | ✅ |
| Gọn | ✅ | rườm hơn |
| Hợp với | lỗi hiếm | lỗi thường xuyên |

## Dễ nhầm

**1. `catch` rồi chỉ log rồi bỏ qua.** Người gọi tưởng thành công.

**2. Bắt rồi ném lại y nguyên.** Log trùng lặp nhiều tầng.

**3. Log mọi thứ ở mức ERROR.** Cảnh báo mất giá trị.

**4. Trả stack trace cho client.** Rò rỉ thông tin nội bộ.

**5. Ném chuỗi thay vì `Error`.** Mất stack trace.

**6. Bọc lỗi mà không giữ `cause`.** Mất nguyên nhân gốc.

**7. Quên `await` cho promise.** Tiến trình chết vì `unhandledRejection`.

**8. Chạy tiếp sau lỗi không lường trước.** Trạng thái không tin được.

**9. Không có `traceId` trong phản hồi lỗi.** Hỗ trợ không lần ra được.

**10. Xử lý lỗi rải rác thay vì một chỗ.** Mỗi endpoint trả một định dạng khác.

## Mẹo nhớ

> **Lỗi MONG ĐỢI là kết quả nghiệp vụ (4xx, không cảnh báo). Lỗi BẤT NGỜ là hệ thống hỏng (5xx, cảnh báo).**
>
> **Đừng bắt lỗi bạn không xử lý được. Bắt để giấu là tệ nhất.**
>
> **Bọc lỗi thì giữ `cause` — đừng đánh đổi stack trace lấy ngữ cảnh.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Hai loại lỗi, khác nhau ở sáu điểm nào?
2. Vì sao `catch` rồi log rồi bỏ qua là tệ nhất?
3. Khi nào ném lỗi, khi nào trả về kết quả?
4. Vì sao nên thoát tiến trình sau `unhandledRejection`?
5. Ba câu hỏi cho mỗi `catch`?

## Tự viết lại

Không nhìn lại, viết xử lý lỗi cho luồng thanh toán:

```text
① các lớp lỗi nghiệp vụ và mã HTTP tương ứng
② nơi xử lý lỗi tập trung
③ cách gọi API thanh toán bên ngoài — lỗi mạng xử lý thế nào
④ log gì ở mỗi loại, mức nào
```

Tự kiểm: khi API thanh toán timeout, bạn xếp nó vào loại nào — và câu trả lời có phụ thuộc vào việc nó timeout **thường xuyên** hay không?

## Thử sức

Đội bạn có 8.000 dòng log mức ERROR mỗi ngày. Không ai đọc. Tuần trước một sự cố thật kéo dài 3 tiếng vì cảnh báo bị bỏ qua.

Ba câu để trả lời: bạn phân loại lại 8.000 dòng đó theo cách nào; các thay đổi cụ thể trong mã; và bạn ngăn nó tích tụ lại bằng cách nào. Câu khó nhất: sau khi dọn, mức ERROR còn lại bao nhiêu là "đúng" — và bạn dùng con số nào để biết mình đã dọn quá tay?
