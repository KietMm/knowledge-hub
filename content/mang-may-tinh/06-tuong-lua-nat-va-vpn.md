---
title: Tường lửa, NAT và mạng riêng
slug: tuong-lua-nat-va-vpn
summary: Vì sao container có IP mà Internet không gọi vào được, security group hoạt động ra sao, và bastion để làm gì.
level: trung-cap
tags: [mang, tuong-lua, nat, bao-mat, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** thiết kế được một mạng nhiều tầng, và chẩn đoán được "gói tin biến mất ở đâu".

## Ý tưởng chính

Trong một hệ thống thật, **phần lớn máy không nên nói chuyện trực tiếp với Internet**. Chúng nằm sau nhiều lớp: tường lửa, NAT, mạng riêng.

Mỗi lớp là một chỗ gói tin có thể bị chặn — và cũng là một chỗ cần kiểm khi có sự cố kết nối.

## Mental model

Hãy nghĩ tới **một toà nhà văn phòng có nhiều vòng bảo vệ**.

> **Sảnh ngoài** — ai vào cũng được. Đó là load balancer, khu vực công cộng.
>
> **Cửa có thẻ từ** — chỉ nhân viên. Đó là tường lửa: kiểm ai được qua, đi hướng nào.
>
> **Phòng máy chủ trong cùng** — không có cửa ra ngoài trực tiếp. Muốn vào phải qua sảnh, qua cửa thẻ, rồi mới tới. Đó là mạng riêng.
>
> Và nhân viên trong phòng máy chủ vẫn **gọi điện ra ngoài được**, qua tổng đài chung của toà nhà — số hiện lên là số tổng đài, không phải số bàn của họ. Đó là **NAT**.

Ý cuối là điều quan trọng nhất: NAT cho phép **đi ra** mà không cho phép **gọi vào**. Đó là lý do container tải được thư viện từ Internet nhưng Internet không gọi thẳng vào container được.

## Ví dụ nhỏ

```text
Internet
   │
[ Load balancer ]  ← chỉ cái này có IP công khai
   │
[ Ứng dụng ]       ← mạng riêng, ra ngoài qua NAT
   │
[ CSDL ]           ← mạng riêng, KHÔNG ra Internet
```

## Code chạy thế nào

**NAT — một IP công khai cho nhiều máy:**

```text
Máy nội bộ 10.0.1.5:54321 gửi ra Internet.
Thiết bị NAT:
  ① Đổi nguồn thành 203.0.113.7:61000  (IP công khai của nó)
  ② GHI VÀO BẢNG: 61000 ↔ 10.0.1.5:54321
  ③ Phản hồi về cổng 61000 ⇒ tra bảng ⇒ chuyển về đúng máy

⇒ Đi ra: được. Vào từ ngoài: KHÔNG, vì không có mục nào trong bảng.
⇒ Muốn cho vào phải khai TRƯỚC: port forwarding / publish port.
```

Đây chính xác là cơ chế `-p 8080:80` của Docker: nó tạo một mục ánh xạ để gói tin từ ngoài biết đường vào ([[mang-va-ket-noi]]).

Và nó giải thích một hành vi hay gây bối rối: **kết nối NAT có thời hạn**. Bảng ánh xạ bị dọn sau vài phút không có lưu lượng — nên kết nối nhàn rỗi lâu (WebSocket, kết nối CSDL trong pool) có thể "chết im lặng". Cách chữa là **keep-alive định kỳ**.

**Tường lửa — hai kiểu từ chối, hai triệu chứng:**

```text
DROP    nuốt gói, không trả lời gì
        ⇒ client thấy TIMEOUT
        ⇒ dùng ở biên: không tiết lộ cổng nào tồn tại

REJECT  trả lời "không được"
        ⇒ client thấy CONNECTION REFUSED ngay
        ⇒ dùng trong mạng nội bộ: hỏng thì biết ngay,
          không phải chờ hết timeout
```

Phân biệt được hai cái này giúp bạn đọc lỗi ngược lại: **timeout thường là tường lửa; refused thường là dịch vụ không chạy** ([[tcp-va-udp]]).

## Cú pháp

**Security group — tường lửa theo nhóm, không theo IP:**

```text
❌ Theo IP: "cho 10.0.1.5 vào cổng 5432"
   ⇒ Thêm máy ứng dụng ⇒ phải sửa quy tắc. Máy đổi IP ⇒ hỏng.

✅ Theo nhóm: "cho MỌI máy trong nhóm sg-app vào cổng 5432"
   ⇒ Thêm máy vào nhóm là xong. Quy tắc mô tả VAI TRÒ, không mô tả địa chỉ.
```

```text
Nguyên tắc:
  □ Mặc định TỪ CHỐI hết, chỉ mở đúng cái cần
  □ Nói rõ hướng: vào (inbound) và ra (outbound) là hai chuyện khác nhau
  □ Đừng bỏ qua chiều RA — nhiều cuộc tấn công lộ ra ở đó
    (máy chủ bị chiếm cố gọi ra máy chủ điều khiển)
```

**Ba tầng mạng điển hình:**

```text
CÔNG KHAI    load balancer, bastion
             có IP công khai, vào từ Internet được

RIÊNG        ứng dụng, worker
             KHÔNG có IP công khai
             ra Internet qua NAT gateway
             vào chỉ từ load balancer

RIÊNG SÂU    CSDL, cache
             không ra Internet, không vào từ Internet
             chỉ nhận từ tầng ứng dụng
```

Điều làm cấu trúc này có giá trị: **một máy ứng dụng bị chiếm cũng không mở được đường thẳng từ Internet vào CSDL** — kẻ tấn công phải đi qua đúng con đường bạn đã kiểm soát và ghi log.

**Bastion — điểm vào duy nhất cho quản trị:**

```bash
# Đi xuyên qua bastion, không cần đăng nhập vào nó
ssh -J bastion.example.com app@10.0.1.5

# Chuyển tiếp cổng CSDL về máy mình để dùng công cụ đồ hoạ
ssh -L 5432:db.internal:5432 bastion.example.com
```

```text
Vì sao có bastion:
  □ Một chỗ duy nhất để ghi log truy cập quản trị
  □ Một chỗ duy nhất để thu hồi quyền khi ai đó rời đội
  □ CSDL và ứng dụng không cần mở cổng SSH ra Internet

Cấu hình bastion nghiêm túc: chỉ đăng nhập bằng khoá,
giới hạn IP nguồn, bật MFA, và ghi log phiên.
```

Nhiều nền tảng nay thay bastion bằng dịch vụ truy cập qua tác nhân (SSM Session Manager, IAP) — cùng mục đích, nhưng không cần mở cổng SSH nào cả.

## Tại sao cần nó

Vì "không kết nối được" có bốn nguyên nhân ở bốn tầng khác nhau, và bạn cần loại trừ theo thứ tự:

```text
① DNS         dig ten-mien
② Định tuyến  ping / traceroute        (nhớ: ICMP hay bị chặn)
③ Tường lửa   nc -zv host port  → timeout = chặn, refused = không có dịch vụ
④ Dịch vụ     ss -tlnp trên chính máy đó → có nghe cổng đó không?
              và nghe ở 0.0.0.0 hay chỉ 127.0.0.1?
```

Bước ④ đáng nhấn: một dịch vụ nghe ở `127.0.0.1` sẽ **từ chối mọi kết nối từ ngoài** dù tường lửa đã mở — và triệu chứng giống hệt như bị chặn.

**Sai lầm cấu hình phổ biến nhất, và hậu quả:**

```text
0.0.0.0/0 vào cổng 22    ⇒ SSH mở cho cả Internet
                            → bot dò mật khẩu liên tục trong vài phút
0.0.0.0/0 vào cổng 5432  ⇒ CSDL mở cho cả Internet
                            → đây là nguyên nhân của rất nhiều vụ rò rỉ dữ liệu

⇒ Rà soát định kỳ: quy tắc nào đang mở 0.0.0.0/0, và nó có cần không?
```

Nhiều quy tắc kiểu này được thêm "tạm thời để debug" rồi không ai gỡ ([[quan-ly-secret-va-cau-hinh]]).

## So sánh

| | DROP | REJECT |
|---|---|---|
| Trả lời | không | có (RST/ICMP) |
| Client thấy | timeout | refused |
| Lộ thông tin | ít | có |
| Dùng ở | biên Internet | mạng nội bộ |

## Dễ nhầm

**1. Mở `0.0.0.0/0` cho cổng quản trị hoặc CSDL.**

**2. Quy tắc theo IP thay vì theo nhóm.** Vỡ khi mở rộng.

**3. Bỏ qua chiều ra.** Bỏ mất tín hiệu của máy đã bị chiếm.

**4. Quên NAT có thời hạn.** Kết nối nhàn rỗi chết im lặng.

**5. Kết luận "bị chặn" khi dịch vụ nghe ở `127.0.0.1`.**

**6. Kết luận "máy chết" vì `ping` không được.** ICMP thường bị chặn.

**7. Mở cổng "tạm thời để debug" rồi quên gỡ.**

**8. Không có bastion.** Mở SSH trên mọi máy.

**9. Đặt CSDL ở mạng công khai cho tiện.**

## Mẹo nhớ

> **NAT cho ĐI RA, không cho GỌI VÀO — trừ khi khai trước.**
>
> **timeout = tường lửa DROP. refused = không có dịch vụ nghe.**
>
> **Quy tắc tường lửa mô tả VAI TRÒ (nhóm), không mô tả địa chỉ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. NAT hoạt động thế nào, và vì sao nó chặn kết nối từ ngoài vào?
2. DROP khác REJECT thế nào, dùng cái nào ở đâu?
3. Ba tầng mạng điển hình, mỗi tầng chứa gì?
4. Bốn bước loại trừ khi "không kết nối được"?
5. Vì sao security group nên theo nhóm chứ không theo IP?

## Tự viết lại

Không nhìn lại, thiết kế mạng cho: web + API + Postgres + Redis + worker.

```text
① máy nào ở tầng nào
② các quy tắc tường lửa, ghi rõ hướng
③ quản trị viên vào bằng đường nào
④ worker gọi API bên ngoài bằng đường nào
```

Tự kiểm: trong thiết kế của bạn, nếu một máy ứng dụng bị chiếm quyền, kẻ tấn công **chạm được tới những gì** — và không chạm được tới gì?

## Thử sức

Ứng dụng trên máy chủ A không gọi được CSDL trên máy chủ B. Từ A, `ping B` thành công, nhưng `nc -zv B 5432` thì **treo rồi timeout**.

Ba câu để trả lời: kết quả đó loại trừ được những gì và chỉ ra điều gì; ba nguyên nhân còn lại, kèm cách kiểm từng cái; và bạn kiểm tra ở phía B bằng lệnh nào. Câu khó nhất: nếu trên B, `ss -tlnp` cho thấy Postgres đang nghe ở `127.0.0.1:5432`, vì sao triệu chứng lại là **timeout** chứ không phải **refused**?
