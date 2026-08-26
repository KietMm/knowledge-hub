---
title: DNS và phân giải tên miền
slug: dns-va-phan-giai-ten
summary: Từ tên miền tới IP, vì sao TTL quyết định tốc độ chuyển đổi, và các sự cố DNS kinh điển.
level: co-ban
tags: [mang, dns, ten-mien, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được bản ghi DNS, biết TTL ảnh hưởng gì khi chuyển máy chủ, và chẩn đoán được sự cố DNS.

## Ý tưởng chính

Máy tính định tuyến bằng **địa chỉ IP**. Con người nhớ bằng **tên**. DNS là hệ thống dịch giữa hai thứ đó.

Điều làm DNS trở thành nguồn sự cố thường xuyên: nó được **cache ở rất nhiều tầng**, và bạn không kiểm soát được phần lớn các tầng đó.

## Mental model

Hãy nghĩ tới **danh bạ điện thoại có nhiều bản sao**.

> Bạn tra số của một cửa hàng. Bạn nhìn **sổ tay của mình** trước; không có thì hỏi **tổng đài công ty**; tổng đài không biết thì hỏi **tổng đài quốc gia**.
>
> Cửa hàng đổi số. Tổng đài quốc gia cập nhật ngay. Nhưng **sổ tay của bạn** và **tổng đài công ty** vẫn giữ số cũ — cho tới khi bản sao của họ hết hạn.
>
> Và bạn **không có cách nào** bắt sổ tay của người khác cập nhật sớm hơn.

Thời hạn đó là **TTL**. Nó là lý do đổi DNS không có hiệu lực ngay, và là thứ bạn phải chuẩn bị **trước** khi cần chuyển máy chủ.

## Ví dụ nhỏ

```bash
$ dig api.example.com +short
203.0.113.42

$ dig api.example.com
;; ANSWER SECTION:
api.example.com.  300  IN  A  203.0.113.42
#                 ↑ TTL: cache 300 giây
```

## Code chạy thế nào

**Chuỗi phân giải, và mỗi tầng cache ở đâu:**

```text
① Cache của trình duyệt          (vài phút, không xoá từ xa được)
② Cache của hệ điều hành         (systemd-resolved, dnsmasq)
③ Cache của ứng dụng             ← JVM từng cache VĨNH VIỄN theo mặc định
④ DNS resolver (ISP / 8.8.8.8)   ← tôn trọng TTL, nhưng không phải luôn luôn
⑤ Root server → TLD (.com) → name server của tên miền
⑥ Bản ghi thật

Trả lời tìm thấy ở tầng nào thì dừng ở đó.
Lần đầu: ~20–100 ms. Các lần sau: gần như 0.
```

Tầng ③ là cái bẫy đặc thù cho lập trình viên: nhiều runtime và thư viện HTTP cache DNS **theo vòng đời tiến trình**. Máy chủ đổi IP, DNS đã cập nhật, nhưng ứng dụng của bạn vẫn gọi IP cũ cho tới khi restart.

**Các loại bản ghi cần biết:**

```text
A       tên → địa chỉ IPv4
AAAA    tên → địa chỉ IPv6
CNAME   tên → TÊN KHÁC  (bí danh)
MX      máy chủ nhận email
TXT     văn bản tự do — xác minh sở hữu, SPF, DKIM
NS      name server có thẩm quyền cho tên miền
```

```text
CNAME có hai ràng buộc hay bị vấp:
  ① KHÔNG đặt CNAME ở gốc tên miền (example.com) — chuẩn không cho,
     vì gốc phải có NS và SOA. Dùng ALIAS/ANAME của nhà cung cấp.
  ② CNAME thêm một lượt tra cứu nữa ⇒ chậm hơn A một chút.
```

## Cú pháp

**TTL — chuẩn bị trước khi chuyển:**

```text
Muốn đổi IP máy chủ mà không gián đoạn:

  ① 24–48 giờ TRƯỚC: hạ TTL từ 3600 xuống 60
     ⇒ chờ TTL CŨ hết hạn ở mọi cache
  ② Đổi bản ghi sang IP mới
  ③ Trong ~60 giây, traffic chuyển hết sang máy mới
  ④ GIỮ máy cũ chạy thêm vài giờ — luôn có cache không tôn trọng TTL
  ⑤ Vài ngày sau, nâng TTL trở lại

Không làm bước ①: một phần người dùng đi vào máy cũ tới một giờ,
và bạn không có cách nào ép họ cập nhật.
```

Bước ④ là bước dễ bỏ và tốn kém nhất: một số resolver, và một số ứng dụng, giữ bản ghi lâu hơn TTL đã khai.

**Chẩn đoán DNS:**

```bash
dig api.example.com                    # tra qua resolver mặc định
dig @8.8.8.8 api.example.com           # tra qua resolver khác → so sánh
dig api.example.com +trace             # đi từ root, xem tầng nào trả lời
dig api.example.com NS                 # name server nào có thẩm quyền
getent hosts api.example.com           # cách HỆ ĐIỀU HÀNH phân giải
```

```text
Kỹ thuật quan trọng nhất: SO SÁNH hai resolver.
  Kết quả khác nhau ⇒ vấn đề là CACHE, chờ TTL hoặc xoá cache.
  Kết quả giống nhau ⇒ bản ghi thật sự sai, sửa ở nhà cung cấp DNS.
```

Và `getent hosts` khác `dig` ở một điểm hữu ích: nó đi qua toàn bộ cơ chế phân giải của hệ điều hành, kể cả `/etc/hosts` — nên nó bắt được trường hợp một dòng trong `/etc/hosts` đang ghi đè mọi thứ.

**Round-robin DNS không phải cân bằng tải:**

```text
Một tên → nhiều bản ghi A ⇒ client tự chọn một cái.

Nhưng DNS KHÔNG BIẾT máy nào đang chết.
⇒ Một máy sập, DNS vẫn trả IP của nó ⇒ một phần người dùng gặp lỗi
  cho tới khi bạn sửa bản ghi VÀ cache hết hạn.

⇒ Cân bằng tải thật phải có health check
  ([[mo-rong-va-can-bang-tai]]).
```

## Tại sao cần nó

Vì DNS là **điểm hỏng chung** đứng trước mọi thứ khác:

```text
DNS hỏng ⇒ mọi dịch vụ đều "không truy cập được"
        ⇒ và log ứng dụng của bạn không ghi gì cả,
          vì request chưa bao giờ tới nơi.
```

**Ba sự cố DNS kinh điển:**

```text
① Quên gia hạn tên miền
   Toàn bộ dịch vụ biến mất. Bật TỰ ĐỘNG GIA HẠN và
   đặt cảnh báo 60 ngày trước hạn.

② Đổi IP mà không hạ TTL trước
   Một phần người dùng đi vào máy cũ hàng giờ.

③ Ứng dụng cache DNS vĩnh viễn
   Chuyển đổi dự phòng của CSDL không có tác dụng
   cho tới khi restart ứng dụng.
```

**DNS trong nội bộ:** trong Docker và Kubernetes, DNS là cơ chế **service discovery** — `db:5432` phân giải được là nhờ một DNS server nội bộ. Nên khi hai container "không thấy nhau", một trong những việc đầu tiên là kiểm tra phân giải tên từ **bên trong** container ([[mang-va-ket-noi]]).

## So sánh

| Bản ghi | Trỏ tới | Ghi chú |
|---|---|---|
| `A` | IPv4 | dùng được ở gốc tên miền |
| `AAAA` | IPv6 | — |
| `CNAME` | tên khác | **không** đặt ở gốc |
| `TXT` | văn bản | xác minh sở hữu, SPF |
| `NS` | name server | uỷ quyền tên miền |

## Dễ nhầm

**1. Đổi IP mà không hạ TTL trước.** Một phần người dùng kẹt ở máy cũ.

**2. Tắt máy cũ ngay sau khi đổi DNS.** Luôn có cache đến muộn.

**3. Đặt CNAME ở gốc tên miền.** Chuẩn không cho.

**4. Không biết ứng dụng đang cache DNS.** Chuyển đổi dự phòng không có tác dụng.

**5. Coi round-robin DNS là cân bằng tải.** Không có health check.

**6. Quên gia hạn tên miền.**

**7. Chỉ tra bằng một resolver.** So sánh hai cái mới biết là cache hay bản ghi.

**8. Quên `/etc/hosts` đang ghi đè.** Dùng `getent hosts` để phát hiện.

**9. Không theo dõi thời gian phân giải DNS.** Nó nằm trong độ trễ người dùng cảm nhận.

## Mẹo nhớ

> **TTL quyết định bạn chuyển máy chủ nhanh được tới đâu — hạ nó TRƯỚC vài ngày.**
>
> **So sánh hai resolver: khác nhau = cache, giống nhau = bản ghi sai.**
>
> **Giữ máy cũ chạy thêm sau khi đổi DNS. Luôn có cache đến muộn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Chuỗi phân giải DNS đi qua những tầng cache nào?
2. TTL làm gì, và nó ảnh hưởng thế nào khi bạn đổi IP?
3. Quy trình chuyển máy chủ không gián đoạn gồm mấy bước?
4. Vì sao round-robin DNS không phải cân bằng tải?
5. So sánh hai resolver cho biết điều gì?

## Tự viết lại

Không nhìn lại, viết kế hoạch chuyển toàn bộ hệ thống sang nhà cung cấp mới:

```text
① làm gì trước 48 giờ
② thứ tự các bước lúc chuyển
③ giữ hạ tầng cũ bao lâu, vì sao
④ ba lệnh kiểm chứng đã chuyển xong
```

Tự kiểm: bước ③ của bạn dựa vào TTL nào — TTL cũ hay TTL mới?

## Thử sức

Sau khi chuyển máy chủ, khoảng 30% người dùng vẫn báo lỗi, số còn lại bình thường. Bạn đã đổi bản ghi A từ hai giờ trước.

Ba câu để trả lời: nguyên nhân khả dĩ nhất; bạn xác nhận bằng lệnh nào; và bạn xử lý **ngay bây giờ** thế nào cho 30% kia. Câu khó nhất: nếu TTL của bản ghi cũ là 86400 (một ngày) và bạn không hạ trước, có cách nào rút ngắn thời gian chờ không — hay chỉ còn cách giữ máy cũ chạy?
