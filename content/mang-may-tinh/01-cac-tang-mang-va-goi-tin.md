---
title: Các tầng mạng và hành trình một gói tin
slug: cac-tang-mang-va-goi-tin
summary: Từ lúc bạn bấm Enter tới khi byte tới máy chủ — mỗi tầng thêm gì và giải quyết vấn đề gì.
level: co-ban
tags: [mang, tcp-ip, giao-thuc, nen-tang]
khung: v2
---

> **Sau bài này bạn sẽ:** nói được mỗi tầng mạng giải quyết vấn đề gì, và định vị được một sự cố mạng thuộc tầng nào.

## Ý tưởng chính

Mạng được chia thành các **tầng**, mỗi tầng giải quyết đúng một vấn đề và **giả định tầng dưới đã xong việc của nó**.

Giá trị của cách chia này rất cụ thể: khi có sự cố, bạn không hỏi "mạng hỏng ở đâu" — bạn hỏi **"hỏng ở tầng nào"**, và mỗi tầng có một bộ công cụ chẩn đoán riêng.

## Mental model

Hãy nghĩ tới **gửi một kiện hàng quốc tế**.

> Bạn viết **nội dung** lá thư — đó là tầng ứng dụng (HTTP).
>
> Bạn cho vào **phong bì có địa chỉ người nhận và số thứ tự** (thư 2/5) — đó là tầng giao vận (TCP): đảm bảo đủ và đúng thứ tự.
>
> Bưu điện dán **nhãn định tuyến quốc gia** — đó là tầng mạng (IP): đưa nó tới đúng thành phố.
>
> Xe tải, máy bay, xe máy giao hàng — đó là tầng liên kết: đi được đoạn đường trước mắt.
>
> Mỗi tầng **chỉ cần biết việc của mình**. Người viết thư không cần biết chuyến bay nào; phi công không đọc lá thư.

Và điểm quan trọng: **mỗi tầng bọc thêm một lớp** rồi bóc ra theo thứ tự ngược lại ở đầu kia.

## Ví dụ nhỏ

```text
[ HTTP: GET /api/users              ]  tầng ứng dụng
[ TCP | HTTP...                     ]  + cổng, số thứ tự
[ IP | TCP | HTTP...                ]  + địa chỉ IP nguồn/đích
[ Ethernet | IP | TCP | HTTP... |CRC]  + địa chỉ MAC
```

## Code chạy thế nào

**Bốn tầng, và mỗi tầng hỏng thì triệu chứng gì:**

```text
④ ỨNG DỤNG   HTTP, DNS, TLS, WebSocket
   Hỏng: 404, 500, lỗi chứng chỉ, JSON sai
   Công cụ: curl -v, log ứng dụng

③ GIAO VẬN   TCP (tin cậy, có thứ tự) / UDP (nhanh, không đảm bảo)
   Hỏng: connection refused, connection reset, timeout
   Công cụ: ss -tn, nc -zv, telnet

② MẠNG       IP — định tuyến giữa các mạng
   Hỏng: no route to host, network unreachable
   Công cụ: ping, traceroute, ip route

① LIÊN KẾT   Ethernet, Wi-Fi — đi một chặng vật lý
   Hỏng: mất kết nối hoàn toàn
   Công cụ: ip link, ip addr
```

Bảng này là giá trị thực dụng lớn nhất của mô hình tầng: đọc thông báo lỗi ⇒ biết ngay tầng nào ⇒ biết dùng công cụ nào.

**Hành trình một request, đầy đủ:**

```text
① Trình duyệt: cần IP của api.example.com
   → hỏi DNS (nếu chưa có trong cache)              ~20–100 ms lần đầu
② Có IP → mở kết nối TCP: bắt tay 3 bước           1 round-trip
③ Nếu HTTPS → bắt tay TLS                          1–2 round-trip
④ Gửi request HTTP                                 1 round-trip
⑤ Máy chủ xử lý
⑥ Phản hồi về, đi ngược lại đúng đường
```

```text
Với round-trip 50 ms, một request HTTPS "nguội" mất:
  DNS 50 + TCP 50 + TLS 100 + HTTP 50 = 250 ms
  — trước khi máy chủ làm bất cứ việc gì.

⇒ Đây là lý do TÁI DÙNG KẾT NỐI quan trọng đến vậy:
  request thứ hai trên cùng kết nối chỉ tốn 50 ms.
```

Ba trong bốn bước đó là chi phí **thiết lập**, và chúng biến mất khi dùng lại kết nối — đó là toàn bộ lý do tồn tại của keep-alive và connection pool ([[reverse-proxy-voi-nginx]]).

## Cú pháp

**Địa chỉ IP, cổng, và cách chúng kết hợp:**

```text
Một kết nối được định danh bởi BỐN thứ:
  (IP nguồn, cổng nguồn, IP đích, cổng đích)

⇒ Cùng một máy chủ, cùng cổng 443, phục vụ được hàng vạn kết nối:
  mỗi client có cặp (IP, cổng) nguồn khác nhau.

Cổng quen thuộc:
  22 SSH   53 DNS   80 HTTP   443 HTTPS
  3306 MySQL   5432 Postgres   6379 Redis
```

```text
Riêng tư (không định tuyến ra Internet):
  10.0.0.0/8        172.16.0.0/12        192.168.0.0/16
  127.0.0.1         chính máy này

⇒ Đó là lý do container/VM dùng dải riêng và cần NAT để ra ngoài
  ([[mang-va-ket-noi]]).
```

**Ký hiệu CIDR — đọc cho nhanh:**

```text
10.0.0.0/24   → 24 bit đầu cố định, 8 bit cuối tự do → 256 địa chỉ
10.0.0.0/16   → 65.536 địa chỉ
10.0.0.0/8    → ~16,7 triệu

Số sau dấu / càng LỚN thì mạng càng NHỎ.
```

Bạn gặp CIDR mỗi khi cấu hình security group, firewall, hay VPC — và đọc sai một chữ số là mở cổng cho cả Internet.

**Ba lệnh chẩn đoán, theo thứ tự tầng:**

```bash
ping api.example.com          # ② IP tới được không?
nc -zv api.example.com 443    # ③ cổng có mở không?
curl -v https://api.example.com/health   # ④ ứng dụng trả lời gì?
```

```text
ping được nhưng nc không được   ⇒ tường lửa chặn cổng, hoặc dịch vụ không chạy
nc được nhưng curl lỗi           ⇒ vấn đề TLS hoặc tầng ứng dụng
ping không được                  ⇒ định tuyến, hoặc ICMP bị chặn (rất thường gặp)
```

Lưu ý cuối quan trọng: **nhiều máy chủ chặn ICMP**, nên `ping` thất bại **không** chứng minh máy chủ chết. Luôn kiểm bằng `nc` trước khi kết luận.

## Tại sao cần nó

Vì nó đổi cách bạn đọc một sự cố mạng từ đoán mò thành thu hẹp có hệ thống:

```text
"API không gọi được"

Không có mô hình tầng: thử lại, restart, đổi URL, đoán.
Có mô hình tầng:
  ① DNS phân giải được không?    dig api.example.com
  ② IP tới được không?           ping / traceroute
  ③ Cổng mở không?               nc -zv
  ④ TLS bắt tay được không?      openssl s_client
  ⑤ Ứng dụng trả lời gì?         curl -v

⇒ Mỗi bước loại bỏ một nửa khả năng.
```

**Và nó giải thích các con số hiệu năng:**

```text
Độ trễ có SÀN VẬT LÝ: ánh sáng trong cáp quang ~200.000 km/s.
  Hà Nội ↔ TP.HCM  (~1.100 km)  → ~11 ms khứ hồi, lý thuyết
  Việt Nam ↔ Mỹ    (~13.000 km) → ~130 ms khứ hồi, lý thuyết
  Thực tế gấp 1,5–2 lần vì đi vòng và qua nhiều thiết bị.

⇒ Không tối ưu mã nào phá được sàn này.
  Cách duy nhất là ĐẶT DỮ LIỆU GẦN NGƯỜI DÙNG HƠN — đó là CDN.
```

## So sánh

| Tầng | Đơn vị | Địa chỉ | Hỏng thì thấy |
|---|---|---|---|
| Ứng dụng | message | URL | 4xx, 5xx, lỗi TLS |
| Giao vận | segment | cổng | refused, reset, timeout |
| Mạng | packet | IP | unreachable |
| Liên kết | frame | MAC | mất mạng hoàn toàn |

## Dễ nhầm

**1. Kết luận "máy chủ chết" khi `ping` không được.** ICMP thường bị chặn.

**2. Không phân biệt refused với timeout.** Refused = có máy, không có dịch vụ. Timeout = gói tin bị nuốt, thường là tường lửa.

**3. Quên chi phí thiết lập kết nối.** Ba round-trip trước khi có byte dữ liệu đầu tiên.

**4. Không tái dùng kết nối.** Trả phí bắt tay mỗi lần.

**5. Đọc sai CIDR.** `/0` là cả Internet.

**6. Tưởng độ trễ tối ưu được bằng mã.** Nó có sàn vật lý.

**7. Nhầm cổng với địa chỉ.** IP đưa tới máy; cổng đưa tới tiến trình.

**8. Debug từ tầng ứng dụng xuống.** Bắt đầu từ tầng thấp thì thu hẹp nhanh hơn.

## Mẹo nhớ

> **Mỗi tầng giải một vấn đề và tin tầng dưới đã xong việc của nó.**
>
> **Thông báo lỗi cho biết TẦNG nào — và tầng nào có công cụ của tầng đó.**
>
> **Một HTTPS request nguội tốn 3–4 round-trip TRƯỚC khi máy chủ làm gì.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn tầng, mỗi tầng giải quyết vấn đề gì?
2. Kể lại hành trình một request HTTPS từ lúc bấm Enter.
3. Bốn thứ định danh một kết nối TCP?
4. `connection refused` khác `timeout` thế nào về nguyên nhân?
5. Vì sao độ trễ có sàn không phá được, và giải pháp là gì?

## Tự viết lại

Không nhìn lại:

```text
① Vẽ lại các lớp bọc của một gói tin HTTPS
② Viết năm lệnh chẩn đoán theo thứ tự tầng, kèm ý nghĩa từng kết quả
③ 10.0.1.0/24 có bao nhiêu địa chỉ? 0.0.0.0/0 nghĩa là gì?
```

Tự kiểm: ở ②, nếu lệnh thứ ba thành công mà lệnh thứ năm thất bại, bạn đã loại trừ được những gì?

## Thử sức

Ứng dụng gọi API đối tác, thỉnh thoảng báo `ETIMEDOUT`. Từ máy chủ, `curl` tới URL đó thì luôn thành công.

Ba câu để trả lời: ba giả thuyết khác nhau cho hiện tượng "thỉnh thoảng"; với mỗi cái, cách kiểm chứng; và bạn xử lý ở phía mình thế nào trong lúc chưa rõ nguyên nhân. Câu khó nhất: nếu `curl` thủ công luôn thành công còn ứng dụng thì không, khác biệt nào giữa hai đường đi có thể giải thích điều đó?
