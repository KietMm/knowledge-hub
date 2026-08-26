---
title: Cache nhiều tầng
slug: cache-nhieu-tang
summary: Cache ở đâu, làm mất hiệu lực thế nào, và ba lỗi biến cache thành nguồn bug khó nhất.
level: trung-cap
tags: [kien-truc, cache, hieu-nang, redis]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được tầng cache đúng, và nhận ra ba lỗi làm cache trở thành nguồn bug khó tái hiện nhất.

## Ý tưởng chính

Cache đổi **độ tươi của dữ liệu** lấy **tốc độ**.

Đó là một cuộc trao đổi, không phải một cải tiến miễn phí. Mỗi tầng cache bạn thêm vào là một nơi dữ liệu có thể cũ, và một nơi nữa phải nghĩ tới khi có bug.

## Mental model

Hãy nghĩ tới **bản sao giấy tờ để trên bàn**.

> Bạn cần tra một thông tin trong hợp đồng. Đi xuống kho lưu trữ mỗi lần thì lâu, nên bạn photo một bản để trên bàn.
>
> Nhanh hơn hẳn. Nhưng bây giờ có **hai bản** — và nếu bản gốc trong kho được sửa, bản trên bàn của bạn **sai mà trông vẫn như đúng**.
>
> Nên bạn phải quyết định trước: "bản này tôi tin trong bao lâu?" (TTL), hoặc "khi nào ai đó sửa bản gốc thì báo tôi vứt bản photo đi" (invalidation).

Không có cách thứ ba. Mọi chiến lược cache đều là một trong hai cái đó, hoặc kết hợp cả hai.

## Ví dụ nhỏ

```ts
async function layNguoiDung(id: string) {
  const key = `user:${id}`
  const cached = await redis.get(key)
  if (cached !== null) return JSON.parse(cached)

  const user = await db.user.findUnique({ where: { id } })
  await redis.set(key, JSON.stringify(user), 'EX', 300)   // TTL 5 phút
  return user
}
```

## Code chạy thế nào

**Các tầng, từ gần người dùng nhất:**

```text
① Trình duyệt        Cache-Control  → 0ms, nhưng KHÔNG xoá được từ xa
② CDN                biên gần user  → ~10ms, xoá được (purge)
③ Reverse proxy      Nginx          → ~1ms
④ Ứng dụng           Redis          → ~1ms, dùng chung mọi máy
⑤ Trong tiến trình   Map            → ~0ms, nhưng MỖI MÁY MỘT BẢN
⑥ CSDL               buffer pool    → tự động
```

Càng gần người dùng càng nhanh, và **càng khó làm mất hiệu lực**. Tầng ① là cực đoan nhất: một file JS cache một năm trong trình duyệt người dùng thì bạn không có cách nào lấy lại — đó là lý do phải đổi tên file thay vì đổi nội dung.

**Ba lỗi biến cache thành nguồn bug khó nhất:**

```text
① CACHE DỮ LIỆU RIÊNG TƯ Ở TẦNG DÙNG CHUNG
   CDN cache /api/toi cho user A
   ⇒ user B gọi cùng URL ⇒ NHẬN DỮ LIỆU CỦA A.
   ⇒ Rò rỉ dữ liệu, và rất khó tái hiện.
   ✅ Cache-Control: private, no-store cho mọi phản hồi cá nhân hoá.

② KHÔNG XOÁ CACHE KHI GHI
   Cập nhật user ⇒ cache vẫn giữ bản cũ tới hết TTL
   ⇒ "Tôi sửa rồi mà, sao không thấy?"
   ✅ Xoá key ngay trong cùng luồng ghi.

③ CACHE CẢ LỖI
   API phụ thuộc lỗi 500 ⇒ cache 500 trong 5 phút
   ⇒ Dịch vụ kia hồi phục sau 10 giây, bạn vẫn lỗi 5 phút.
   ✅ Chỉ cache phản hồi thành công.
```

Cả ba đều có chung một đặc điểm: hệ thống **hoạt động bình thường** trong đa số trường hợp, và hỏng theo cách phụ thuộc thời điểm — kiểu bug tốn nhiều giờ nhất để tìm.

**Cache stampede — chỗ cache tự làm hại mình:**

```text
Một key nóng hết hạn lúc 10:00:00.
1.000 request đến cùng lúc, TẤT CẢ đều thấy cache miss,
TẤT CẢ cùng gọi CSDL.
⇒ CSDL nhận 1.000 truy vấn giống hệt nhau trong một nhịp.
⇒ Cache vốn để bảo vệ CSDL, nay tạo ra đúng cú sốc nó phải chặn.
```

Ba cách xử lý:

```text
① TTL có nhiễu:  ttl = 300 + random(0, 60)
   ⇒ các key không hết hạn cùng lúc.

② Khoá: chỉ một request được đi tính, các request khác chờ kết quả.

③ Làm mới sớm: khi còn 10% TTL, một request nền đi làm mới
   trong khi các request khác vẫn nhận bản cũ.
```

## Cú pháp

**Ba chiến lược ghi:**

```text
CACHE-ASIDE (phổ biến nhất)
  Đọc:  miss → CSDL → ghi cache
  Ghi:  ghi CSDL → XOÁ key
  ⇒ Đơn giản. Xoá chứ đừng ghi đè: hai request ghi đồng thời
    có thể để lại giá trị cũ trong cache.

WRITE-THROUGH
  Ghi:  ghi CSDL VÀ cache cùng lúc
  ⇒ Cache luôn tươi, nhưng ghi chậm hơn.

WRITE-BEHIND
  Ghi:  ghi cache trước, đẩy xuống CSDL sau
  ⇒ Ghi rất nhanh. Mất dữ liệu nếu cache chết. Hiếm dùng.
```

**Đặt tên key có phiên bản — mẹo đơn giản, hiệu quả lớn:**

```text
user:v2:{id}

Đổi cấu trúc dữ liệu ⇒ tăng lên v3
⇒ mọi key cũ tự trở thành rác và hết hạn dần,
  không cần xoá thủ công, không có phút nào phục vụ dữ liệu sai định dạng.
```

**Chọn TTL theo hậu quả của dữ liệu cũ:**

```text
Dữ liệu tĩnh (danh mục, cấu hình)   giờ – ngày
Danh sách sản phẩm                  phút
Số liệu bảng điều khiển             30 giây – vài phút
Số dư tài khoản, tồn kho            KHÔNG cache, hoặc TTL vài giây
```

Câu hỏi để quyết định: *"Nếu người dùng thấy dữ liệu cũ 5 phút, hậu quả là gì?"* Với danh mục sản phẩm là không có gì; với số dư ví là một khiếu nại.

## Tại sao cần nó

Vì cache là cách rẻ nhất để giảm tải, nhưng nó **không sửa được truy vấn tồi**:

```text
Truy vấn quét toàn bảng, mất 2 giây, có cache TTL 5 phút:
  → 99% request nhanh
  → 1% request mất 2 giây (đúng những người xui xẻo gặp cache miss)
  → Và mỗi lần cache hết hạn là một cú sốc cho CSDL.

⇒ Sửa truy vấn TRƯỚC, cache SAU.
  Cache đặt lên một truy vấn tồi chỉ giấu nó đi.
```

**Đo tỉ lệ trúng cache:**

```text
> 90%   tốt
70–90%  xem lại TTL hoặc key
< 50%   cache đang không có tác dụng — có thể còn làm chậm thêm
```

Tỉ lệ trúng thấp thường có nghĩa key quá đặc thù (chứa timestamp, chứa tham số hiếm lặp lại) hoặc TTL quá ngắn.

**Và câu hỏi nên hỏi trước tiên:** *"Có cần cache không?"*

```text
Postgres có index tốt trả lời truy vấn trong 1–5ms.
Redis mất ~1ms cộng chi phí mạng.

⇒ Với nhiều truy vấn, cache tiết kiệm rất ít
  mà thêm một hệ thống nữa để vận hành và một nguồn bug nữa.
```

## So sánh

| Tầng | Độ trễ | Xoá được | Dùng chung giữa các máy |
|---|---|---|---|
| Trình duyệt | 0ms | ❌ | — |
| CDN | ~10ms | ✅ purge | ✅ |
| Redis | ~1ms | ✅ | ✅ |
| Trong tiến trình | ~0ms | khó | ❌ |

## Dễ nhầm

**1. Cache dữ liệu cá nhân hoá ở tầng dùng chung.** Rò rỉ dữ liệu người khác.

**2. Không xoá cache khi ghi.** "Tôi sửa rồi mà."

**3. Cache cả phản hồi lỗi.** Kéo dài sự cố.

**4. TTL đồng loạt.** Cache stampede.

**5. Cache trong tiến trình rồi tưởng mọi máy giống nhau.** Người dùng thấy kết quả khác nhau tuỳ máy.

**6. Ghi đè cache khi ghi thay vì xoá.** Race condition để lại giá trị cũ.

**7. Cache để che truy vấn tồi.** Vấn đề vẫn còn, chỉ khó thấy hơn.

**8. Không đo tỉ lệ trúng.** Không biết cache có tác dụng không.

**9. Không xử lý khi Redis chết.** Cache là tối ưu — mất nó thì chậm, không nên là sập.

**10. Thêm cache khi chưa cần.** Một hệ thống nữa để vận hành và gỡ lỗi.

## Mẹo nhớ

> **Cache đổi ĐỘ TƯƠI lấy TỐC ĐỘ. Luôn có cái giá.**
>
> **Ghi thì XOÁ key, đừng ghi đè.**
>
> **Không bao giờ cache dữ liệu cá nhân hoá ở tầng dùng chung.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Các tầng cache, và đánh đổi khi tiến gần người dùng?
2. Ba lỗi phổ biến nhất, hậu quả của từng cái?
3. Cache stampede là gì, ba cách xử lý?
4. Vì sao khi ghi thì xoá key chứ không ghi đè?
5. Vì sao cache không sửa được một truy vấn tồi?

## Tự viết lại

Trang sản phẩm: thông tin sản phẩm (ít đổi), tồn kho (đổi liên tục), gợi ý cá nhân hoá. Không nhìn lại, thiết kế:

```text
① mỗi loại cache ở tầng nào, TTL bao nhiêu
② cái nào KHÔNG cache, vì sao
③ khi cập nhật sản phẩm thì xoá những key nào
④ chống stampede cho key nóng nhất
```

Tự kiểm: gợi ý cá nhân hoá của bạn có bị CDN cache nhầm không — bạn đặt header gì để chắc chắn?

## Thử sức

Người dùng báo: thỉnh thoảng họ thấy **thông tin của người khác** trên trang tài khoản. Không tái hiện được ở môi trường dev.

Ba câu để trả lời: nguyên nhân khả dĩ nhất và **tầng nào** gây ra; bạn xác nhận bằng cách nào; và bạn xử lý ngay lập tức thế nào. Câu khó nhất: sau khi sửa header, dữ liệu sai **đã nằm sẵn** ở CDN và trong trình duyệt người dùng — bạn làm gì với hai chỗ đó?
