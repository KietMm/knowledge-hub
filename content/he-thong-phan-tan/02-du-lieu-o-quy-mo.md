---
title: Dữ liệu ở quy mô
slug: du-lieu-o-quy-mo
summary: Replication, sharding, CAP — và cái giá thật của nhất quán cuối cùng mà người ta ít nói tới.
level: nang-cao
tags: [kien-truc, replication, sharding, nhat-quan]
khung: v2
---

> **Sau bài này bạn sẽ:** phát biểu được CAP một cách chính xác, và biết vì sao sharding là quyết định gần như không đảo được.

## Ý tưởng chính

Dữ liệu vượt quá một máy có hai hướng đi, và chúng giải quyết hai vấn đề khác nhau:

**Replication** — cùng một dữ liệu ở nhiều máy. Giải quyết: tải đọc, chịu lỗi.
**Sharding** — dữ liệu **khác nhau** ở các máy. Giải quyết: tải ghi, dung lượng.

Nhầm hai cái này dẫn tới việc chọn sai công cụ cho vấn đề đang có.

## Mental model

Hãy nghĩ tới **thư viện**.

> **Replication** = mở nhiều chi nhánh, **mỗi chi nhánh có bản sao của cùng bộ sách**. Nhiều người đọc cùng lúc hơn. Nhưng khi có sách mới, phải chuyển tới mọi chi nhánh — và trong lúc chuyển, các chi nhánh **không giống nhau**.
>
> **Sharding** = chia bộ sách ra: chi nhánh A giữ vần A–M, chi nhánh B giữ N–Z. Chứa được nhiều sách hơn tổng sức chứa một toà nhà. Nhưng muốn tìm sách phải **biết nó ở chi nhánh nào** — và câu hỏi "liệt kê mọi sách về Toán" giờ phải hỏi cả hai nơi rồi gộp lại.

Cái giá của sharding nằm gọn trong hai vế cuối, và nó không giảm đi theo thời gian.

## Ví dụ nhỏ

```text
Ghi  →  Primary  ──sao chép──→  Replica 1  (đọc)
                 ──sao chép──→  Replica 2  (đọc)
```

## Code chạy thế nào

**Replication và độ trễ sao chép:**

```text
Đồng bộ:      primary đợi replica xác nhận rồi mới báo thành công
              ⇒ không mất dữ liệu, nhưng GHI CHẬM HƠN
              ⇒ và replica chết thì ghi bị chặn

Bất đồng bộ:  primary báo thành công ngay, sao chép sau
              ⇒ ghi nhanh, nhưng primary chết đột ngột
                ⇒ MẤT các giao dịch chưa kịp sao chép
              ⇒ mặc định của hầu hết hệ thống
```

Hệ quả trực tiếp và rất hay gặp:

```text
① Người dùng đổi tên → ghi vào primary
② Chuyển trang, đọc từ replica
③ Replica chậm 100ms ⇒ thấy TÊN CŨ
⇒ "Tôi vừa sửa mà!"

Cách xử lý: "đọc từ primary sau khi ghi" trong một khoảng ngắn
(read-your-own-writes).
```

**CAP — phát biểu cho đúng:**

```text
KHÔNG phải "chọn 2 trong 3".

P (chịu phân mảnh mạng) là điều BẮT BUỘC — mạng sẽ đứt, bạn không chọn.
Nên câu hỏi thật là: KHI mạng đứt, bạn hy sinh C hay A?

CP: từ chối phục vụ để giữ dữ liệu đúng
    → CSDL tài chính, tồn kho.  Thà lỗi còn hơn sai.

AP: vẫn phục vụ, chấp nhận dữ liệu có thể lệch tạm thời
    → mạng xã hội, giỏ hàng.  Thà cũ còn hơn không dùng được.
```

Và khi mạng **không** đứt — tức là hầu hết thời gian — bạn vẫn có một lựa chọn khác: đánh đổi giữa **độ trễ** và **nhất quán**. Đó là phần mà CAP không nói tới nhưng lại ảnh hưởng tới hệ thống mỗi ngày.

**Nhất quán cuối cùng — cái giá thật:**

```text
Người ta nói: "cuối cùng thì các bản sao cũng giống nhau."
Ít ai nói: MÃ ỨNG DỤNG phải xử lý giai đoạn ở giữa.

  Đọc xong giá cũ → tính tiền sai
  Đếm hai lần từ hai replica → hai con số khác nhau
  Hai người cùng đặt chỗ cuối cùng → cả hai thành công

⇒ Nhất quán cuối cùng không phải "chậm hơn một chút".
  Nó là "ứng dụng của bạn phải xử lý xung đột".
```

## Cú pháp

**Sharding — chọn khoá là quyết định quan trọng nhất:**

```text
Theo HASH của id      phân bố đều ✅
                      truy vấn theo khoảng ❌ (phải hỏi mọi shard)

Theo KHOẢNG (ngày)    truy vấn theo khoảng ✅
                      HOT SPOT: mọi ghi mới dồn vào shard cuối ❌

Theo TENANT/khách hàng  cách ly tốt ✅, dễ hiểu ✅
                      khách hàng lớn làm lệch tải ❌
```

**Sharding phá vỡ những thứ bạn đang dùng hằng ngày:**

```text
❌ JOIN giữa các shard        → phải gộp ở tầng ứng dụng
❌ Transaction xuyên shard     → cần giao thức phân tán, rất phức tạp
❌ AUTO_INCREMENT toàn cục     → cần UUID hoặc snowflake id
❌ Truy vấn không chứa khoá shard → quét MỌI shard
❌ Đổi khoá shard sau này      → phải chuyển toàn bộ dữ liệu
```

Dòng cuối là lý do gọi đây là quyết định **gần như không đảo được**: chọn sai khoá shard, cách sửa duy nhất là di chuyển toàn bộ dữ liệu trong lúc hệ thống đang chạy.

**Trước khi shard, thử hết những thứ này:**

```text
① Index và tối ưu truy vấn      thường đủ, và rẻ nhất
② Cache                          giảm tải đọc
③ Replica đọc                    tải đọc chia được ngay
④ Phân vùng trong CÙNG một CSDL  (Postgres partitioning)
   → có được lợi ích về truy vấn theo khoảng mà KHÔNG mất JOIN
⑤ Máy to hơn                     một máy hiện đại chứa hàng TB
⑥ Tách bảng lớn nhất ra CSDL riêng
──────────────────────────────
⑦ Sharding                       chỉ khi 6 cách trên đã hết
```

## Tại sao cần nó

Vì sharding thường được chọn quá sớm, và cái giá của nó không bao giờ giảm:

```text
Một Postgres hiện đại xử lý được:
  hàng TB dữ liệu
  hàng chục nghìn truy vấn/giây (có index tốt)

Phần lớn hệ thống KHÔNG BAO GIỜ cần shard.
```

**Cách chọn theo mô hình đọc/ghi:**

```text
Đọc nhiều, ghi ít (thường gặp)  → replica đọc + cache. Không cần shard.
Ghi nhiều                        → shard, hoặc CSDL chuyên cho ghi
Dữ liệu quá lớn cho một máy      → shard hoặc phân tầng lưu trữ
```

**Và một câu hỏi thường bị bỏ qua: dữ liệu cũ có cần nằm cùng chỗ không?**

```text
Rất nhiều "vấn đề dung lượng" thực ra là vấn đề vòng đời:
  90% dữ liệu là bản ghi cũ hơn một năm, gần như không ai đọc.
  Chuyển chúng sang lưu trữ lạnh ⇒ bảng nóng nhỏ lại nhiều lần.
  ⇒ Rẻ hơn sharding rất nhiều, và đảo được ([[xoa-mem-va-vong-doi-ban-ghi]]).
```

## So sánh

| | Replication | Sharding |
|---|---|---|
| Dữ liệu mỗi máy | **giống nhau** | **khác nhau** |
| Giải quyết | tải đọc, chịu lỗi | tải ghi, dung lượng |
| Độ phức tạp | thấp | **cao** |
| JOIN, transaction | giữ nguyên | vỡ |
| Đảo ngược được | ✅ | ❌ rất khó |

## Dễ nhầm

**1. Shard quá sớm.** Trả giá phức tạp cho vấn đề chưa có.

**2. Chọn sai khoá shard.** Sửa nghĩa là chuyển toàn bộ dữ liệu.

**3. Shard theo thời gian mà không nghĩ tới hot spot.** Mọi ghi dồn vào một shard.

**4. Đọc từ replica ngay sau khi ghi.**

**5. Coi nhất quán cuối cùng là "chậm hơn chút".** Nó là "phải xử lý xung đột".

**6. Phát biểu CAP là "chọn 2 trong 3".** P là bắt buộc.

**7. Quên chuyển đổi khi primary chết.** Replica không tự lên làm primary.

**8. Không kiểm tra độ trễ sao chép.** Failover khi replica trễ = mất dữ liệu.

**9. Nhầm replication với sao lưu.** Xoá nhầm một bảng ⇒ replica xoá theo ngay.

**10. Bỏ qua phân vùng và vòng đời dữ liệu.** Hai cách rẻ hơn nhiều mà đảo được.

## Mẹo nhớ

> **Replication = cùng dữ liệu, nhiều máy. Sharding = khác dữ liệu, nhiều máy.**
>
> **CAP: P là bắt buộc; câu hỏi là KHI mạng đứt thì hy sinh C hay A.**
>
> **Replica KHÔNG phải sao lưu — nó sao chép cả lệnh xoá nhầm.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Replication và sharding khác nhau ở đâu, mỗi cái giải quyết vấn đề gì?
2. Phát biểu CAP cho đúng.
3. Cái giá thật của nhất quán cuối cùng?
4. Sharding phá vỡ những gì?
5. Sáu thứ nên thử trước khi shard?

## Tự viết lại

Hệ thống thương mại điện tử: 500 GB dữ liệu, 90% đọc, đỉnh 5.000 req/s, CSDL bắt đầu chậm. Không nhìn lại, viết kế hoạch:

```text
① điều tra gì trước
② thứ tự các biện pháp
③ tới bước nào mới cân nhắc shard
④ nếu shard, chọn khoá gì và vì sao
```

Tự kiểm: với 500 GB và 90% đọc, bạn có thật sự tới bước ③ không?

## Thử sức

Sếp nói: *"Dữ liệu sắp quá lớn, chúng ta cần shard."* Hiện tại: 200 GB, 2.000 req/s, 95% đọc, và có vài truy vấn chậm.

Ba câu để trả lời: bạn hỏi lại những gì trước khi đồng ý; bạn đề xuất làm gì **thay vì** shard, theo thứ tự; và bạn trình bày lập luận thế nào để nó thuyết phục chứ không phải phản đối. Câu khó nhất: nếu sau khi làm hết mọi cách rẻ hơn mà vẫn cần shard, quyết định nào bạn phải đưa ra **đầu tiên** — và vì sao nó khó sửa nhất?
