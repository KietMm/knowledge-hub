---
title: Độ tin cậy của một backend
slug: idempotency-va-tin-cay-o-backend
summary: Thoát sạch, kiểm tra sức khoẻ, timeout với mọi lời gọi ngoài, và giới hạn tài nguyên — bốn thứ phân biệt backend chạy được với backend chạy thật.
level: nang-cao
tags: [backend, do-tin-cay, van-hanh, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bốn thứ một backend phải có trước khi lên production, và vì sao chúng không lộ ra khi test ở máy dev.

## Ý tưởng chính

Một backend "chạy được" và một backend **chạy thật** khác nhau ở những thứ chỉ xuất hiện khi có tải, khi có sự cố, và khi triển khai.

Không cái nào trong số đó gây lỗi trên máy bạn. Chúng gây lỗi lúc 3 giờ sáng.

## Mental model

Hãy nghĩ tới **khác biệt giữa lái xe trong bãi tập và lái ngoài đường**.

> Trong bãi tập: đường trống, tốc độ thấp, không ai chen. Bạn lái được — nghĩa là bạn biết vận hành cái xe.
>
> Ngoài đường: có người tạt đầu, có mưa, có tắc đường, có lúc phải dừng gấp. Kỹ năng cần thêm không phải "lái giỏi hơn" — nó là **xử lý những gì bạn không kiểm soát được**.
>
> Và cái quyết định an toàn không phải lúc mọi thứ ổn, mà là **cái gì xảy ra khi có chuyện**: phanh có ăn không, dây an toàn có cài không.

Bốn thứ trong bài này là dây an toàn. Chúng không làm hệ thống nhanh hơn, và bạn chỉ biết chúng thiếu vào đúng lúc cần.

## Ví dụ nhỏ

```ts
process.on('SIGTERM', async () => {
  server.close()                 // ngừng nhận request MỚI
  await dangXuLyXong()           // xử lý nốt cái đang chạy
  await db.end()
  process.exit(0)
})
```

## Code chạy thế nào

**① Thoát sạch — vì sao mỗi lần deploy đang cắt ngang người dùng:**

```text
Không xử lý SIGTERM:
  ① Trình quản lý gửi SIGTERM
  ② Tiến trình bỏ qua
  ③ Sau 10 giây (mặc định) → SIGKILL
  ④ Mọi request đang xử lý ĐỨT GIỮA CHỪNG
  ⑤ Transaction dở dang, kết nối không đóng

⇒ Mỗi lần triển khai là một lần vài chục người dùng gặp lỗi.
  Và nó không hiện trong log của bạn — vì tiến trình đã chết.
```

```text
Thoát sạch đúng cách còn cần một bước ít ai làm:
  ① Trả 503 ở endpoint readiness NGAY khi nhận SIGTERM
  ② ĐỢI vài giây để load balancer gỡ mình khỏi pool
  ③ Rồi mới đóng server

Thiếu bước ②: load balancer vẫn gửi request tới trong lúc bạn đang tắt
⇒ vẫn lỗi, dù bạn đã "thoát sạch".
```

**② Health check — hai loại, đừng gộp:**

```ts
app.get('/health', (_, res) => res.json({ ok: true }))   // còn sống?

app.get('/ready', async (_, res) => {                     // nhận traffic được?
  try {
    await db.query('SELECT 1')
    res.json({ ok: true })
  } catch {
    res.status(503).json({ ok: false })
  }
})
```

```text
Gộp hai cái ⇒ CSDL chập một nhịp ⇒ orchestrator tưởng ứng dụng chết
⇒ khởi động lại HÀNG LOẠT ⇒ CSDL vốn đang quá tải nhận thêm
một cơn bão kết nối ([[giam-sat-va-sao-luu]]).
```

## Cú pháp

**③ Timeout cho MỌI lời gọi ra ngoài:**

```ts
// ❌ Không timeout: đối tác treo ⇒ worker của bạn bị giữ vô hạn
const r = await fetch(url)

// ✅
const r = await fetch(url, { signal: AbortSignal.timeout(3000) })
```

```text
Ba nơi hay quên:
  □ HTTP client                    → timeout theo p99 của bên kia, cộng biên
  □ Truy vấn CSDL                  → statement_timeout
  □ Kết nối CSDL từ pool           → khác với timeout truy vấn:
                                     pool cạn thì bạn chờ Ở ĐÂY

Và timeout phải GIẢM DẦN theo tầng: nếu tầng ngoài bỏ cuộc
sau 5 giây, đừng để tầng trong chờ 30 giây — nó chỉ đang
làm việc vô ích ([[thiet-ke-cho-that-bai]]).
```

**④ Giới hạn tài nguyên:**

```ts
const pool = new Pool({
  max: 10,                          // số kết nối TỐI ĐA mỗi tiến trình
  connectionTimeoutMillis: 3000,    // chờ lấy kết nối từ pool
  idleTimeoutMillis: 30000,
})
```

```text
Tính tổng, đây là chỗ hay vỡ khi mở rộng:
  10 tiến trình × max 10 = 100 kết nối tới CSDL
  Postgres mặc định max_connections = 100
  ⇒ Chạm trần ngay, và thêm máy làm mọi thứ TỆ HƠN
    ([[mo-rong-va-can-bang-tai]]).
```

```text
Ba giới hạn khác cũng cần:
  □ Kích thước request body       — tránh nuốt file 2 GB
  □ Rate limit                    — theo người dùng và theo IP
  □ Số job đồng thời của worker   — nếu không, một đợt tải
                                    làm cạn kết nối CSDL
```

**Và một thứ thứ năm không thuộc mã: `restart: always`.** Không có nó, tiến trình chết là nằm im tới khi có người phát hiện.

## Tại sao cần nó

Vì cả bốn thứ này đều có chung một đặc điểm: **chúng không gây lỗi ở môi trường dev**.

```text
Máy dev:  một người dùng, không deploy giữa chừng,
          CSDL trên localhost, không ai treo.
⇒ Bốn thứ trên không cần thiết. Chúng LUÔN có vẻ dư thừa.

Production: deploy vài lần mỗi ngày, đối tác treo,
            CSDL đôi lúc chậm, tải không đều.
⇒ Thiếu một trong bốn là một loại sự cố định kỳ.
```

**Danh sách kiểm trước khi lên production:**

```text
□ Xử lý SIGTERM, có độ trễ cho load balancer gỡ mình ra
□ /health và /ready tách riêng
□ Timeout cho mọi lời gọi ngoài, giảm dần theo tầng
□ Giới hạn: pool, body, rate limit, job đồng thời
□ restart: always
□ Log ra stdout, có traceId ([[quan-sat-he-thong]])
□ Cấu hình xác thực lúc khởi động, sai thì exit(1)
□ Không secret trong image
□ Job nền chịu được chạy hai lần
```

**Cách kiểm chứng — vì mã trông giống chịu lỗi không có nghĩa là chịu lỗi:**

```text
□ Gửi SIGTERM lúc đang có tải → có request nào lỗi không?
□ Chặn CSDL 30 giây → ứng dụng trả 503 hay treo?
□ Thêm độ trễ 10 giây cho API đối tác → timeout có kích hoạt?
□ Bắn 10× tải bình thường → cái gì vỡ trước, và vỡ có kiểm soát không?
```

Bốn phép thử này chạy được ở staging trong một buổi, và chúng biến "tôi nghĩ là ổn" thành "tôi đã thấy nó ổn" ([[hieu-nang-va-do-luong]]).

## So sánh

| Thiếu cái gì | Triệu chứng ở production |
|---|---|
| Thoát sạch | mỗi lần deploy có người gặp lỗi |
| Readiness riêng | CSDL chậm ⇒ khởi động lại hàng loạt |
| Timeout | một dịch vụ treo kéo sập cả hệ thống |
| Giới hạn pool | thêm máy làm CSDL chậm hơn |
| `restart` | tiến trình chết nằm im |

## Dễ nhầm

**1. Không xử lý SIGTERM.** Mỗi deploy cắt ngang request.

**2. Thoát ngay khi nhận SIGTERM.** Load balancer chưa kịp gỡ bạn ra.

**3. Gộp liveness với readiness.** Khởi động lại hàng loạt.

**4. Không timeout lời gọi ngoài.**

**5. Timeout tầng trong lớn hơn tầng ngoài.** Làm việc vô ích.

**6. Không tính tổng kết nối CSDL.**

**7. Không giới hạn kích thước body.**

**8. Không rate limit.**

**9. Chưa bao giờ thử các kịch bản hỏng.** Mã trông giống chịu lỗi.

**10. Tin rằng chạy tốt ở dev nghĩa là sẵn sàng.**

## Mẹo nhớ

> **Bốn thứ: THOÁT SẠCH, HEALTH CHECK tách đôi, TIMEOUT khắp nơi, GIỚI HẠN tài nguyên.**
>
> **Cả bốn đều KHÔNG gây lỗi ở dev — nên chúng luôn có vẻ dư thừa.**
>
> **Thoát sạch phải có độ trễ để load balancer kịp gỡ bạn ra.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn thứ phân biệt backend chạy được với chạy thật?
2. Thoát sạch gồm mấy bước, bước nào hay bị bỏ?
3. Liveness khác readiness thế nào, gộp lại thì hậu quả gì?
4. Vì sao phải tính tổng kết nối CSDL khi thêm máy?
5. Bốn phép thử kiểm chứng độ tin cậy?

## Tự viết lại

Không nhìn lại, viết phần "sẵn sàng production" cho một API Node:

```text
① xử lý SIGTERM đầy đủ
② hai endpoint sức khoẻ
③ cấu hình timeout ba tầng
④ các giới hạn tài nguyên, kèm con số
⑤ ba phép thử kiểm chứng
```

Tự kiểm: ở ①, giữa lúc nhận SIGTERM và lúc `server.close()`, bạn có chờ không — và chờ bao lâu là đủ?

## Thử sức

Mỗi lần triển khai, bảng theo dõi hiện một đợt 5xx kéo dài khoảng 20 giây. Không ai coi đó là vấn đề vì "deploy mà".

Ba câu để trả lời: chuyện gì đang xảy ra ở mức chi tiết; ba thay đổi để đợt 5xx đó biến mất; và bạn **chứng minh** đã hết bằng cách nào. Câu khó nhất: nếu đội triển khai 10 lần mỗi ngày, 20 giây lỗi mỗi lần tiêu bao nhiêu phần error budget tháng — và con số đó có đổi cách mọi người nhìn vấn đề không?
