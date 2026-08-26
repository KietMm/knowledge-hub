---
title: RPC và gRPC
slug: rpc-va-grpc
summary: Gọi hàm qua mạng, hợp đồng bằng Protobuf, streaming — và ảo giác nguy hiểm rằng nó giống gọi hàm cục bộ.
level: trung-cap
tags: [api, rpc, grpc, protobuf, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được một hợp đồng gRPC, và biết những gì gọi qua mạng **không bao giờ** giống gọi hàm cục bộ.

## Ý tưởng chính

RPC làm cho việc gọi một hàm ở máy khác **trông giống** gọi hàm cục bộ.

Đó vừa là điểm mạnh — mã đọc tự nhiên — vừa là cái bẫy lớn nhất: một lời gọi mạng **có thể thất bại, chậm, hoặc thành công mà bạn không biết**. Không lời gọi hàm cục bộ nào làm được ba việc đó.

## Mental model

Hãy nghĩ tới **nhờ đồng nghiệp làm hộ một việc**.

> **Ngồi cạnh** (gọi hàm cục bộ): quay sang, nhờ, họ làm, xong. Bạn biết chắc kết quả.
>
> **Nhờ qua tin nhắn** (RPC): bạn gửi tin, rồi chờ.
>
> Và có ba tình huống không tồn tại ở vế đầu:
> - Họ **không đọc** tin nhắn (mất kết nối).
> - Họ đọc, làm xong, nhưng **tin nhắn trả lời không tới bạn** (bạn tưởng thất bại, thực ra đã xong).
> - Họ **đang bận** và trả lời sau 30 phút (chậm).

Cú pháp RPC che ba tình huống đó đi. Nhưng chúng vẫn ở đó, và mã của bạn phải xử lý chúng.

## Ví dụ nhỏ

```protobuf
service KhoService {
  rpc KiemTonKho (KiemTonKhoRequest) returns (KiemTonKhoResponse);
}
message KiemTonKhoRequest { string san_pham_id = 1; }
message KiemTonKhoResponse { int32 con_lai = 1; }
```

## Code chạy thế nào

**Hợp đồng sinh mã cho cả hai phía — đây là giá trị chính:**

```text
① Viết file .proto — nguồn sự thật DUY NHẤT
② Sinh mã cho server (Go, Java, Node...)  và client (bất kỳ ngôn ngữ nào)
③ Hai bên có cùng kiểu, cùng tên trường, trình biên dịch kiểm

⇒ Đổi tên trường trong .proto ⇒ client KHÔNG BIÊN DỊCH ĐƯỢC.
⇒ So với REST + JSON: đổi tên trường ⇒ client nhận `undefined`
  lúc chạy, ở production, có thể vài tuần sau.
```

Đây là khác biệt thật sự đáng giá của gRPC: nó chuyển một lớp lỗi từ **runtime** sang **thời điểm biên dịch**.

**Số thứ tự trường — quy tắc không được vi phạm:**

```protobuf
message NguoiDung {
  string ten = 1;
  string email = 2;
  // string dia_chi = 3;   ← đã bỏ
  reserved 3;                // ← ĐÁNH DẤU, không dùng lại
  int32 tuoi = 4;
}
```

```text
Protobuf mã hoá theo SỐ, không theo tên.
⇒ Đổi tên trường: an toàn (số không đổi)
⇒ Đổi SỐ, hoặc dùng lại số cũ cho trường mới: HỎNG IM LẶNG
   Client cũ đọc số 3 tưởng là địa chỉ, nhận về một số nguyên.

⇒ Quy tắc: chỉ THÊM trường mới với số mới. `reserved` cho số đã bỏ.
```

Vì mọi trường trong proto3 đều tuỳ chọn, thêm trường là thay đổi tương thích ngược — client cũ đơn giản bỏ qua nó.

## Cú pháp

**Bốn kiểu lời gọi:**

```protobuf
rpc Lay (Req) returns (Res);                          // đơn — đơn
rpc TaiLen (stream Chunk) returns (KetQua);           // client stream
rpc TheoDoi (Req) returns (stream SuKien);            // server stream
rpc Chat (stream Tin) returns (stream Tin);           // hai chiều
```

```text
Server stream là thứ REST không có tương đương gọn:
  "theo dõi tiến độ job này" — server đẩy cập nhật cho tới khi xong.
Client stream: tải file lớn theo mảnh.
Hai chiều: chat, đồng bộ liên tục.
```

**Xử lý lỗi — mã trạng thái riêng, ánh xạ gần với HTTP:**

```text
OK                  0
INVALID_ARGUMENT    3   ≈ 400
NOT_FOUND           5   ≈ 404
ALREADY_EXISTS      6   ≈ 409
PERMISSION_DENIED   7   ≈ 403
RESOURCE_EXHAUSTED  8   ≈ 429
UNAVAILABLE        14   ≈ 503  ← retry ĐƯỢC
DEADLINE_EXCEEDED   4   ≈ 504  ← retry cẩn thận
```

```text
Chỉ retry UNAVAILABLE và (nếu thao tác idempotent) DEADLINE_EXCEEDED.
Retry INVALID_ARGUMENT là lãng phí thuần: lần sau cũng vậy
([[thiet-ke-cho-that-bai]]).
```

**Deadline — gRPC làm tốt hơn HTTP thường ở điểm này:**

```go
ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
defer cancel()
res, err := client.KiemTonKho(ctx, req)
```

```text
Deadline được TRUYỀN TIẾP qua các lời gọi phía sau.
  A gọi B với deadline 2s.
  B còn 1,8s ⇒ gọi C với deadline 1,8s.
  Hết hạn ⇒ MỌI tầng dừng lại, không ai làm việc vô ích.

Với HTTP thường, mỗi tầng tự đặt timeout riêng và chúng
thường không nhất quán.
```

## Tại sao cần nó

Vì **ảo giác trong suốt** là nguồn của những lỗi khó nhất:

```text
res, err := client.TruTien(ctx, req)
if err != nil {
    // ← Trừ tiền ĐÃ XẢY RA hay CHƯA? Bạn KHÔNG BIẾT.
    //   err có thể là: chưa tới nơi / đã xử lý nhưng phản hồi mất
}
```

```text
Cùng một `err`, hai thực tế trái ngược.
⇒ Retry mà thao tác không idempotent = trừ tiền hai lần.
⇒ Không retry = có thể mất giao dịch.

⇒ Mọi thao tác GHI qua RPC phải idempotent, hoặc mang khoá
  idempotency ([[idempotency-va-thu-lai]]).
```

Đây không phải hạn chế của gRPC — nó là bản chất của mạng. gRPC chỉ làm nó **dễ quên hơn** vì cú pháp trông như gọi hàm.

**Bốn thứ khác cần nhớ khi vận hành gRPC:**

```text
□ Trình duyệt KHÔNG gọi gRPC trực tiếp — cần gRPC-Web + proxy
□ Payload nhị phân ⇒ không đọc được bằng mắt trong log
  ⇒ cần công cụ riêng (grpcurl), và bật server reflection ở môi trường dev
□ Load balancer HTTP/1 KHÔNG cân bằng được gRPC:
  gRPC giữ MỘT kết nối HTTP/2 dài ⇒ mọi request đi về một máy
  ⇒ cần load balancer hiểu HTTP/2, hoặc cân bằng ở tầng client
□ Cache HTTP không dùng được
```

Điểm thứ ba là bất ngờ phổ biến nhất khi triển khai gRPC lần đầu: hệ thống chạy đúng, nhưng tải dồn hết vào một máy ([[mo-rong-va-can-bang-tai]]).

## So sánh

| | REST + JSON | gRPC |
|---|---|---|
| Hợp đồng | tài liệu (OpenAPI) | **sinh mã, biên dịch kiểm** |
| Mã hoá | văn bản | nhị phân, nhỏ hơn |
| Đổi tên trường | hỏng lúc chạy | vẫn chạy (mã theo số) |
| Streaming | khó | 4 kiểu sẵn có |
| Trình duyệt | ✅ | cần proxy |
| Đọc log bằng mắt | ✅ | ❌ |
| Cân bằng tải | dễ | cần L7 hiểu HTTP/2 |

## Dễ nhầm

**1. Coi lời gọi RPC như gọi hàm cục bộ.** Nó thất bại, chậm, và có thể thành công mà bạn không biết.

**2. Không idempotent cho thao tác ghi.** Retry là trừ tiền hai lần.

**3. Dùng lại số trường đã bỏ.** Hỏng im lặng ở client cũ.

**4. Đổi số thứ tự trường.**

**5. Không đặt deadline.** Mất lợi ích lớn nhất của gRPC.

**6. Retry mọi mã lỗi.** Chỉ `UNAVAILABLE` mới đáng.

**7. Dùng load balancer HTTP/1 cho gRPC.** Tải dồn về một máy.

**8. Định dùng gRPC thẳng từ trình duyệt.**

**9. Bật server reflection ở production.** Nó phơi bày toàn bộ hợp đồng.

**10. Không có công cụ debug.** Payload nhị phân, log vô dụng nếu không chuẩn bị trước.

## Mẹo nhớ

> **RPC trông như gọi hàm cục bộ — đó là điểm mạnh và là cái bẫy.**
>
> **Protobuf mã hoá theo SỐ. Chỉ THÊM số mới; số đã bỏ thì `reserved`.**
>
> **gRPC giữ một kết nối HTTP/2 dài ⇒ cần load balancer hiểu HTTP/2.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Giá trị chính của hợp đồng .proto là gì?
2. Vì sao đổi tên trường an toàn mà đổi số thì không?
3. Bốn kiểu lời gọi gRPC?
4. Deadline được truyền tiếp nghĩa là gì, lợi ích ra sao?
5. Ba tình huống mạng mà lời gọi hàm cục bộ không có?

## Tự viết lại

Không nhìn lại, viết file `.proto` cho một service kho:

```text
① kiểm tồn kho một sản phẩm
② giữ hàng (thao tác GHI — chú ý idempotency)
③ theo dõi thay đổi tồn kho theo thời gian thực
④ đánh dấu một trường đã bỏ
```

Tự kiểm: ở ②, nếu client gọi lại vì timeout, thiết kế của bạn ngăn giữ hàng hai lần bằng cách nào?

## Thử sức

Sau khi chuyển hai service nội bộ sang gRPC, mọi thứ chạy đúng, nhưng bảng theo dõi cho thấy **một máy trong ba máy nhận gần hết traffic**.

Ba câu để trả lời: nguyên nhân; hai cách sửa và đánh đổi của mỗi cách; và bạn xác nhận đã sửa bằng số liệu nào. Câu khó nhất: nếu bạn chuyển sang cân bằng ở tầng client, cái gì phải có thêm để nó biết danh sách máy đang sống?
