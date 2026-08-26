---
title: TCP và UDP
slug: tcp-va-udp
summary: Bắt tay ba bước, kiểm soát tắc nghẽn, và vì sao "TCP đảm bảo tin cậy" không có nghĩa dữ liệu chắc chắn tới.
level: co-ban
tags: [mang, tcp-ip, giao-thuc, nen-tang]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được TCP hay UDP cho một bài toán, và hiểu vì sao mạng chậm làm TCP chậm theo cấp số.

## Ý tưởng chính

**TCP** đảm bảo dữ liệu tới **đủ và đúng thứ tự** — bằng cách xác nhận, đánh số, và gửi lại khi mất.

**UDP** gửi và quên. Không xác nhận, không sắp xếp, không gửi lại.

TCP không "tốt hơn". Nó **đắt hơn**, và với một số bài toán, cái nó đảm bảo lại chính là thứ gây hại.

## Mental model

Hãy nghĩ tới **thư bảo đảm và bưu thiếp**.

> **Thư bảo đảm (TCP)**: người nhận ký nhận, bạn biết chắc thư tới. Không có hồi báo thì bưu điện gửi lại. Thư số 3 chưa tới thì người nhận **giữ lại thư 4 và 5, chưa đọc**, chờ cho đủ bộ.
>
> **Bưu thiếp (UDP)**: bỏ vào thùng, xong. Không biết có tới không. Nhưng rẻ và nhanh.

Chi tiết "giữ lại thư 4 và 5" là điều quan trọng nhất và ít được nói tới: TCP đảm bảo **thứ tự**, nên một gói mất làm **mọi gói sau nó phải nằm chờ**. Với một cuộc gọi video, chờ như vậy tệ hơn là mất hẳn một khung hình.

## Ví dụ nhỏ

```text
TCP: bắt tay → gửi có đánh số → nhận xác nhận → mất thì gửi lại → đóng
UDP: gửi. Hết.
```

## Code chạy thế nào

**Bắt tay ba bước, và vì sao nó tồn tại:**

```text
Client                     Server
   │──── SYN ────────────────▶│   "tôi muốn kết nối, số bắt đầu của tôi là X"
   │◀─── SYN-ACK ─────────────│   "đồng ý, số của tôi là Y, tôi nhận được X"
   │──── ACK ────────────────▶│   "tôi nhận được Y"
   │        (kết nối mở)       │

⇒ Sau ba bước, HAI BÊN cùng biết bên kia sẵn sàng và cùng thống nhất
  số thứ tự khởi đầu. Đó là điều một bước không làm được.
⇒ Giá: MỘT round-trip trước khi gửi được byte dữ liệu nào.
```

**Ba thông báo lỗi, ba nguyên nhân khác hẳn:**

```text
connection refused   Gói SYN tới nơi, máy chủ trả lời RST.
                     ⇒ CÓ máy, KHÔNG có ai nghe cổng đó.
                     ⇒ Dịch vụ chết, hoặc sai cổng.

timeout              Gói SYN đi mà không có hồi âm nào.
                     ⇒ Tường lửa NUỐT gói, hoặc sai IP, hoặc máy chết.

connection reset     Đang kết nối thì nhận RST.
                     ⇒ Bên kia đóng đột ngột: tiến trình chết,
                       proxy hết thời gian chờ, hoặc load balancer
                       gỡ máy khỏi pool.
```

Phân biệt được ba cái này là công cụ chẩn đoán mạnh nhất ở tầng giao vận: mỗi thông báo loại bỏ một nhóm giả thuyết ngay lập tức.

**Kiểm soát tắc nghẽn — vì sao mạng xấu làm mọi thứ chậm hơn nhiều lần:**

```text
TCP không biết đường truyền chịu được bao nhiêu, nên nó DÒ:
  ① Bắt đầu chậm: gửi ít, mỗi lần nhận đủ ACK thì GẤP ĐÔI
  ② Mất gói ⇒ coi là tắc nghẽn ⇒ GIẢM MẠNH tốc độ rồi tăng lại từ từ

⇒ Kết nối mới luôn khởi động chậm — đó là "slow start".
⇒ Mất 1% gói không làm chậm 1%; nó có thể làm chậm NHIỀU LẦN,
  vì mỗi lần mất gói là một lần giảm mạnh.
```

Đây là lý do một mạng "chỉ mất vài phần trăm gói" lại cho cảm giác gần như không dùng được — và là lý do nên đo **tỉ lệ mất gói**, không chỉ đo độ trễ.

## Cú pháp

**Chọn TCP hay UDP:**

```text
TCP khi: dữ liệu phải ĐỦ và ĐÚNG THỨ TỰ
  → HTTP, CSDL, SSH, gửi file, hầu hết mọi thứ bạn viết

UDP khi: MUỘN cũng vô dụng, thà mất còn hơn chờ
  → gọi thoại/video, game thời gian thực, DNS, đo lường
  → và khi tự xây cơ chế tin cậy riêng ở tầng trên (QUIC)
```

```text
DNS dùng UDP vì: một câu hỏi, một câu trả lời, vừa trong một gói.
Bắt tay ba bước cho một lần hỏi tên miền là quá đắt.
Mất gói? Hỏi lại — rẻ hơn nhiều so với duy trì kết nối.
```

**Trạng thái kết nối — đọc `ss` để chẩn đoán:**

```bash
ss -tn state established | wc -l    # đang mở bao nhiêu
ss -tn state time-wait | wc -l      # vừa đóng, còn giữ chỗ
ss -s                                # tổng hợp theo trạng thái
```

```text
TIME_WAIT   Bên ĐÓNG TRƯỚC phải giữ 2×MSL (~60s) để nuốt gói đến muộn.
            Hàng chục nghìn TIME_WAIT là bình thường với máy chủ bận.
            Nhưng nếu chính máy chủ của bạn đóng trước ở mỗi request
            ⇒ cạn cổng nguồn ⇒ dùng keep-alive để sửa gốc.

CLOSE_WAIT  Bên kia đã đóng, CHƯƠNG TRÌNH CỦA BẠN chưa gọi close().
            ⇒ Đây là LỖI Ở PHÍA BẠN — rò rỉ kết nối.
            ⇒ Tăng dần rồi "too many open files"
              ([[file-io-va-he-thong-file]]).
```

Phân biệt TIME_WAIT với CLOSE_WAIT rất đáng nhớ: cái đầu thường vô hại, cái sau luôn là bug của bạn.

**Nagle và độ trễ nhỏ:** TCP gom các gói tin nhỏ lại để đỡ phí băng thông. Với ứng dụng cần phản hồi tức thì (game, terminal, trao đổi request nhỏ), điều đó thêm tới ~40 ms độ trễ — nên chúng bật `TCP_NODELAY`.

## Tại sao cần nó

Vì "TCP đảm bảo tin cậy" là một câu **dễ hiểu sai**:

```text
TCP đảm bảo: nếu dữ liệu tới, nó ĐỦ và ĐÚNG THỨ TỰ.
TCP KHÔNG đảm bảo: dữ liệu chắc chắn tới.

Kết nối đứt giữa chừng ⇒ bạn KHÔNG BIẾT bên kia đã nhận được
bao nhiêu, và đã xử lý tới đâu.

⇒ Đây chính là lý do cần idempotency ở tầng ứng dụng:
  timeout không phân biệt được "chưa tới" với "đã xử lý,
  phản hồi bị mất" ([[idempotency-va-thu-lai]]).
```

**Và nó giải thích vì sao tái dùng kết nối quan trọng:**

```text
Mỗi kết nối TCP mới phải trả:
  1 round-trip bắt tay
  + giai đoạn slow start (vài round-trip nữa mới đạt tốc độ)
  + (nếu HTTPS) 1–2 round-trip bắt tay TLS

Keep-alive / connection pool bỏ được TẤT CẢ phần đó
từ request thứ hai trở đi.
```

Đây là cùng một nguyên lý với việc gộp syscall và tránh N+1: **giảm số lần thiết lập, không giảm lượng dữ liệu** ([[syscall-va-ranh-gioi-nhan]]).

## So sánh

| | TCP | UDP |
|---|---|---|
| Bắt tay | 3 bước | không |
| Đảm bảo tới | ✅ (gửi lại) | ❌ |
| Đúng thứ tự | ✅ | ❌ |
| Kiểm soát tắc nghẽn | ✅ | ❌ (tự lo) |
| Độ trễ khi mất gói | cao — chờ gói thiếu | không đổi |
| Dùng cho | HTTP, CSDL, SSH | DNS, thoại, game |

## Dễ nhầm

**1. Hiểu "TCP tin cậy" là dữ liệu chắc chắn tới.** Đứt kết nối là không biết gì.

**2. Không phân biệt refused / timeout / reset.** Ba nguyên nhân khác hẳn nhau.

**3. Hoảng vì nhiều TIME_WAIT.** Thường bình thường.

**4. Bỏ qua CLOSE_WAIT.** Luôn là rò rỉ ở phía bạn.

**5. Không dùng keep-alive.** Trả phí bắt tay mỗi request.

**6. Tưởng mất 1% gói thì chậm 1%.** Kiểm soát tắc nghẽn làm nó tệ hơn nhiều.

**7. Chỉ đo độ trễ, không đo tỉ lệ mất gói.**

**8. Dùng UDP mà không tự lo tin cậy** cho dữ liệu thật sự cần đủ.

**9. Quên `TCP_NODELAY`** cho ứng dụng cần độ trễ thấp.

## Mẹo nhớ

> **TCP = thư bảo đảm (đủ, đúng thứ tự, đắt). UDP = bưu thiếp (nhanh, không hứa gì).**
>
> **refused = có máy không có dịch vụ. timeout = gói bị nuốt. reset = bên kia đóng đột ngột.**
>
> **CLOSE_WAIT nhiều = LỖI CỦA BẠN, chưa gọi close().**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bắt tay ba bước giải quyết vấn đề gì mà một bước không giải được?
2. Ba thông báo lỗi TCP và nguyên nhân từng cái?
3. Vì sao mất 1% gói làm chậm hơn 1% rất nhiều?
4. TIME_WAIT khác CLOSE_WAIT thế nào?
5. "TCP tin cậy" **không** đảm bảo điều gì, và hệ quả với thiết kế API?

## Tự viết lại

Không nhìn lại, chọn TCP hay UDP và giải thích:

```text
① Đồng bộ tin nhắn chat
② Truyền hình ảnh cuộc gọi video
③ Gửi số liệu đo mỗi giây từ 10.000 thiết bị IoT
④ Tải file 2 GB
⑤ Tra cứu tên miền
```

Tự kiểm: ở ③, nếu mất 5% số liệu thì có sao không — và câu trả lời đó quyết định lựa chọn của bạn thế nào?

## Thử sức

Dịch vụ của bạn gọi API đối tác. Log đầy `ECONNRESET`, khoảng 2% số request, và không theo quy luật thời gian nào.

Ba câu để trả lời: `ECONNRESET` nghĩa là gì và ai gây ra nó; ba nguyên nhân khả dĩ, kèm cách kiểm; và bạn xử lý ở phía mình thế nào. Câu khó nhất: nếu retry những request bị reset, rủi ro gì xuất hiện — và bạn cần gì ở phía đối tác để retry an toàn?
