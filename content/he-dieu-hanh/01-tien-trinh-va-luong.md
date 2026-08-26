---
title: Tiến trình và luồng
slug: tien-trinh-va-luong
summary: Khác biệt thật giữa process và thread, chi phí của mỗi cái, và chọn cái nào cho bài toán nào.
level: co-ban
tags: [he-dieu-hanh, tien-trinh, luong, dong-thoi]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được giữa tiến trình và luồng, và giải thích được vì sao Node dùng một luồng mà vẫn phục vụ hàng nghìn kết nối.

## Ý tưởng chính

**Tiến trình** là một chương trình đang chạy, có **không gian bộ nhớ riêng**. Hai tiến trình không nhìn thấy bộ nhớ của nhau.

**Luồng** là một dòng thực thi bên trong tiến trình. Các luồng cùng tiến trình **dùng chung bộ nhớ**.

Toàn bộ khác biệt về ưu điểm, nhược điểm và loại bug của hai thứ này đều suy ra được từ hai câu trên.

## Mental model

Hãy nghĩ tới **nhà riêng và phòng trong cùng một nhà**.

> **Hai tiến trình = hai căn nhà riêng.** Muốn đưa nhau đồ thì phải mang qua đường — chậm hơn. Nhưng nhà này cháy, nhà kia vẫn nguyên.
>
> **Hai luồng = hai người trong cùng một nhà.** Chia sẻ tủ lạnh, chung phòng khách — trao đổi tức thì.
>
> Và đây là chỗ sinh ra mọi rắc rối: **hai người cùng mở tủ lạnh lấy quả trứng cuối cùng**. Cả hai đều thấy còn trứng. Cả hai đều với tay. Kết quả không xác định.

Quả trứng đó là **race condition**. Nó chỉ tồn tại khi có bộ nhớ dùng chung.

## Ví dụ nhỏ

```text
Tiến trình A ──┐ bộ nhớ riêng
Tiến trình B ──┘ bộ nhớ riêng     → giao tiếp qua IPC/socket/file

Tiến trình C ── luồng 1 ─┐
             └─ luồng 2 ─┴─ CÙNG bộ nhớ  → giao tiếp tức thì, và cần khoá
```

## Code chạy thế nào

**Chi phí — con số quyết định lựa chọn:**

```text
                        Tiến trình        Luồng
Tạo mới                 ~1–10 ms          ~10–100 µs   (nhanh hơn ~100 lần)
Bộ nhớ mỗi cái          vài MB            ~1 MB stack
Chuyển ngữ cảnh         đắt (đổi bảng     rẻ hơn (cùng
                        trang bộ nhớ)     không gian địa chỉ)
Giao tiếp               IPC — phải sao    đọc thẳng bộ nhớ chung
                        chép dữ liệu
Một cái sập             cái kia sống      CẢ TIẾN TRÌNH chết
```

Dòng cuối là lý do trình duyệt tách mỗi tab thành một **tiến trình** riêng: một trang web treo không kéo theo cả trình duyệt.

**Chuyển ngữ cảnh — vì sao nó không miễn phí:**

```text
CPU chỉ chạy được một luồng mỗi lõi tại một thời điểm.
Hệ điều hành luân phiên: chạy A 10ms → lưu trạng thái A →
nạp trạng thái B → chạy B...

Mỗi lần chuyển:
  lưu/nạp thanh ghi
  và quan trọng hơn: CACHE CPU bị "nguội" ([[cache-cpu-va-tinh-cuc-bo]])

⇒ Tạo 10.000 luồng KHÔNG làm nhanh hơn tạo 8 luồng trên máy 8 lõi.
  Nó làm chậm đi, vì phần lớn thời gian dành cho việc chuyển qua lại.
```

Đây là lý do các thư viện dùng **pool luồng** cố định thay vì tạo luồng mỗi việc.

## Cú pháp

**Chặn CPU và chặn I/O — phân biệt quyết định kiến trúc:**

```text
CHẶN CPU (tính toán, mã hoá, xử lý ảnh)
  → cần NHIỀU LÕI thật sự chạy song song
  → số worker ≈ số lõi

CHẶN I/O (chờ CSDL, chờ mạng, chờ đĩa)
  → luồng ngồi CHỜ, không dùng CPU
  → một luồng phục vụ được RẤT NHIỀU kết nối nếu không chờ đồng bộ
```

Vế thứ hai giải thích Node.js:

```text
Node có MỘT luồng chạy mã JS của bạn.
Nhưng khi bạn gọi CSDL:
  ① Node đăng ký "khi có kết quả thì gọi hàm này"
  ② Luồng đó QUAY LẠI phục vụ request khác ngay
  ③ Kết quả về ⇒ event loop gọi lại hàm bạn đăng ký

⇒ 10.000 kết nối đang chờ CSDL chỉ tốn 10.000 mục trong một bảng,
  không tốn 10.000 luồng × 1 MB stack.
```

Và nó cũng giải thích điểm yếu:

```js
// ☠️ Một vòng lặp nặng chặn TOÀN BỘ server Node
function tinhNang() { for (let i = 0; i < 1e10; i++) {} }
// Trong lúc này KHÔNG request nào được phục vụ.
```

```text
Cách xử lý:
  ① Đẩy việc nặng sang worker thread
  ② Hoặc sang tiến trình riêng / hàng đợi ([[hang-doi-va-xu-ly-bat-dong-bo]])
  ③ Hoặc chia nhỏ và nhường lại event loop giữa chừng
```

**Ba mô hình đồng thời, và ai dùng cái nào:**

```text
MỘT LUỒNG + EVENT LOOP        Node.js, Python asyncio, nginx
  + Không có race condition trên bộ nhớ chung
  + Rất nhiều kết nối đồng thời với ít RAM
  − Một chỗ nặng CPU chặn tất cả

NHIỀU LUỒNG                    Java, C#, Go (goroutine)
  + Dùng được nhiều lõi
  − Cần khoá; race condition, deadlock

NHIỀU TIẾN TRÌNH               PHP-FPM, Gunicorn, cluster của Node
  + Cách ly thật; một cái sập không kéo theo
  − Tốn RAM hơn, chia sẻ trạng thái khó
```

Go nằm giữa: **goroutine** là "luồng nhẹ" do runtime của Go tự lập lịch trên một số ít luồng hệ điều hành — nên tạo hàng trăm nghìn goroutine là chuyện bình thường, trong khi hàng trăm nghìn luồng thật thì không.

## Tại sao cần nó

Vì ba quyết định hằng ngày dựa vào đây:

```text
① "Đặt bao nhiêu worker?"
   Nặng CPU  → ≈ số lõi
   Nặng I/O  → nhiều hơn số lõi, đo mà chỉnh
   Node      → cluster với số tiến trình ≈ số lõi

② "Vì sao thêm luồng mà không nhanh hơn?"
   → Chặn ở I/O chứ không ở CPU, hoặc đang tranh nhau một khoá.

③ "Vì sao một request chậm làm cả server chậm?"
   → Mô hình một luồng, và có việc nặng CPU chặn event loop.
```

**Và nó giải thích các con số bạn thấy khi vận hành:**

```text
`ps` cho thấy tiến trình.  `top -H` cho thấy luồng.
Load average đếm cả tiến trình đang CHỜ I/O — nên load cao
với CPU thấp nghĩa là đang chờ đĩa hoặc mạng ([[go-loi-tren-may-chu]]).
```

## So sánh

| | Tiến trình | Luồng | Goroutine / coroutine |
|---|---|---|---|
| Bộ nhớ | riêng | chung | chung |
| Chi phí tạo | cao | vừa | rất thấp |
| Một cái sập | cái kia sống | cả tiến trình chết | cả tiến trình chết |
| Race condition | không (trên bộ nhớ) | **có** | có |
| Tạo được bao nhiêu | trăm | nghìn | trăm nghìn |

## Dễ nhầm

**1. Tạo càng nhiều luồng càng nhanh.** Chuyển ngữ cảnh ăn hết lợi ích.

**2. Chạy việc nặng CPU trên event loop.** Chặn toàn bộ server.

**3. Tưởng luồng có bộ nhớ riêng.** Chúng dùng chung — đó là nguồn của race condition.

**4. Đặt số worker bằng nhau cho tải CPU và tải I/O.**

**5. Nhầm đồng thời với song song.** Đồng thời là *quản lý nhiều việc*; song song là *chạy cùng lúc trên nhiều lõi*.

**6. Dùng luồng để cách ly lỗi.** Luồng chết kéo cả tiến trình.

**7. Quên rằng mỗi luồng tốn stack.** 10.000 luồng × 1 MB = 10 GB.

**8. Đọc load average như là phần trăm CPU.** Nó đếm cả tiến trình chờ I/O.

## Mẹo nhớ

> **Tiến trình = nhà riêng. Luồng = hai người chung nhà, chung tủ lạnh.**
>
> **Chặn CPU cần nhiều LÕI. Chặn I/O chỉ cần đừng CHỜ ĐỒNG BỘ.**
>
> **Nhiều luồng hơn số lõi không làm nhanh hơn — nó làm chậm đi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Khác biệt cốt lõi giữa tiến trình và luồng? Mọi khác biệt khác suy ra từ đâu?
2. Chuyển ngữ cảnh tốn gì, và vì sao nhiều luồng lại phản tác dụng?
3. Vì sao Node một luồng vẫn phục vụ được hàng nghìn kết nối?
4. Chặn CPU khác chặn I/O thế nào, ảnh hưởng gì tới số worker?
5. Goroutine khác luồng hệ điều hành ở chỗ nào?

## Tự viết lại

Không nhìn lại, quyết định cho từng hệ thống và giải thích:

```text
① API web chủ yếu đọc CSDL, 5.000 req/s
② Dịch vụ resize ảnh, mỗi ảnh tốn 200ms CPU
③ Trình duyệt với 50 tab
④ Worker gửi email đọc từ hàng đợi
```

Tự kiểm: ở ② bạn đặt bao nhiêu worker trên máy 8 lõi, và vì sao không đặt 100?

## Thử sức

API Node phục vụ tốt 2.000 req/s. Sau khi thêm tính năng xuất PDF (mỗi lần ~800ms CPU), **toàn bộ API** chậm hẳn dù chỉ vài người xuất PDF.

Ba câu để trả lời: giải thích cơ chế; ba cách sửa và đánh đổi của mỗi cách; và bạn **xác nhận** chẩn đoán bằng số liệu nào. Câu khó nhất: nếu chuyển PDF sang worker thread thay vì hàng đợi, bạn được gì và **vẫn chưa** được gì?
