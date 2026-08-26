---
title: Ranh giới service
slug: ranh-gioi-service
summary: Monolith hay microservices là câu hỏi sai. Câu hỏi đúng là ranh giới nằm ở đâu và bạn mất gì khi cắt.
level: nang-cao
tags: [kien-truc, microservices, monolith, ranh-gioi]
khung: v2
---

> **Sau bài này bạn sẽ:** biết cắt service theo tiêu chí gì, và những gì bạn **mất** ngay khi vẽ đường cắt đầu tiên.

## Ý tưởng chính

"Monolith hay microservices" là câu hỏi sai, vì nó hỏi về **số lượng tiến trình**.

Câu hỏi đúng: **ranh giới nằm ở đâu**, và **có cần đặt ranh giới đó lên ranh giới mạng không**.

Ranh giới rõ ràng trong một monolith tốt hơn nhiều so với ranh giới lộn xộn trải trên mười service.

## Mental model

Hãy nghĩ tới **tách một phòng ban ra thành công ty riêng**.

> Hai đội trong cùng công ty: ngồi khác tầng, nhưng cần gì thì đi bộ sang hỏi. Nhanh, không thủ tục.
>
> Tách thành hai công ty: mọi trao đổi thành **hợp đồng**. Đổi một thứ nhỏ cũng phải thông báo trước, thương lượng, có phiên bản. Không ai được vào xem sổ sách của bên kia.
>
> Đôi khi tách là đúng — hai bên phát triển theo hai hướng khác nhau, quy mô khác nhau, nhịp khác nhau. Nhưng **không ai tách công ty chỉ để cho gọn**.

Ranh giới mạng chính là ranh giới pháp nhân đó. Nó có ích khi giải quyết một vấn đề **về con người và vận hành**, không phải vấn đề về mã.

## Ví dụ nhỏ

```text
❌ Cắt theo tầng kỹ thuật:  service-database, service-api, service-ui
   → mọi tính năng phải sửa cả ba ⇒ vẫn phải deploy cùng nhau
   → được cái phức tạp, không được cái độc lập.

✅ Cắt theo miền nghiệp vụ: đặt-hàng, thanh-toán, kho, thông-báo
   → một tính năng thường nằm gọn trong một service.
```

## Code chạy thế nào

**Tiêu chí cắt — theo thứ tự quan trọng:**

```text
① MIỀN NGHIỆP VỤ
   Ranh giới nên trùng ranh giới của bài toán, không phải của tầng kỹ thuật.
   Kiểm nhanh: một yêu cầu nghiệp vụ điển hình chạm mấy service?
     1 ⇒ ranh giới tốt.  3+ ⇒ cắt sai chỗ.

② DỮ LIỆU SỞ HỮU
   Mỗi service sở hữu dữ liệu của mình, KHÔNG service nào đọc bảng của service khác.
   Dùng chung CSDL = ranh giới giả: đổi schema là hỏng chỗ khác.

③ NHỊP THAY ĐỔI
   Phần đổi hằng ngày và phần đổi hằng năm không nên bị buộc chung.

④ ĐỘI SỞ HỮU
   Một service nên có một đội chịu trách nhiệm.
   Hai đội cùng sửa một service ⇒ ranh giới sai chỗ.

⑤ YÊU CẦU QUY MÔ KHÁC HẲN
   Xử lý ảnh cần 20 máy, quản trị cần 1 ⇒ lý do chính đáng để tách.
```

Tiêu chí ② là tiêu chí phân biệt thật sự: nếu hai service đọc chung một bảng thì bạn có hai tiến trình, không có hai service.

**Bạn mất gì ngay khi cắt:**

```text
❌ TRANSACTION
   Trong monolith:  BEGIN; trừ kho; tạo đơn; COMMIT;
   Qua service:     hai lời gọi mạng, cái thứ hai có thể thất bại
                    ⇒ cần saga, bù trừ, hoặc chấp nhận không nhất quán.

❌ GỌI HÀM RẺ
   0,001ms  →  1–50ms, và có thể thất bại.

❌ REFACTOR XUYÊN RANH GIỚI
   Đổi tên một trường trong monolith: IDE làm được.
   Qua API: đổi hợp đồng, giữ tương thích ngược, phối hợp deploy.

❌ GỠ LỖI MỘT CHỖ
   Stack trace một luồng → log rải trên nhiều dịch vụ.
   Cần trace phân tán mới lần lại được ([[quan-sat-he-thong]]).
```

Không cái nào trong bốn cái đó lấy lại được. Đó là lý do phải chắc trước khi cắt.

## Cú pháp

**Monolith mô-đun — thường là câu trả lời đúng:**

```text
src/
  dat-hang/     ├── api.ts   service.ts   repo.ts   index.ts  ← chỉ index.ts
  thanh-toan/   │                                                được import
  kho/          │
  thong-bao/    ┘

Quy tắc: module chỉ gọi nhau qua index.ts, KHÔNG chạm vào ruột nhau,
KHÔNG đọc bảng của nhau.
```

```text
Được: ranh giới rõ, đội độc lập về mã, transaction còn nguyên,
      deploy đơn giản, gỡ lỗi dễ.
Và:   nếu sau này cần tách, ranh giới ĐÃ CÓ SẴN — việc tách thành cơ học.
```

Điều đáng chú ý: phần khó của microservices không phải "chạy nhiều tiến trình", mà là **tìm ra ranh giới đúng**. Monolith mô-đun cho phép bạn làm phần khó trước, với chi phí sai lầm thấp hơn nhiều.

**Nếu tách — tách dần, đừng viết lại:**

```text
① Dựng ranh giới mô-đun trong monolith trước
② Chọn MỘT mô-đun có ranh giới rõ nhất, ít phụ thuộc nhất
③ Tách nó ra
④ Chạy song song, đo, học
⑤ Lặp lại

KHÔNG: viết lại toàn bộ thành microservices trong một dự án lớn.
       Đó là dự án nhiều tháng không giao được gì, và ranh giới
       vẫn do đoán mà ra.
```

**Giao tiếp giữa service:**

```text
Đồng bộ (HTTP/gRPC)
  Dùng khi cần kết quả ngay.
  Tạo phụ thuộc thời gian thực: A gọi B, B chết ⇒ A hỏng.

Bất đồng bộ (sự kiện)
  Dùng khi thông báo "đã xảy ra chuyện gì".
  Bên nhận chết ⇒ xử lý sau ⇒ ít phụ thuộc hơn.
```

Nguyên tắc: **truy vấn thì đồng bộ, thông báo thì bất đồng bộ** — và khi phân vân, chọn bất đồng bộ, vì nó giảm phụ thuộc ([[hang-doi-va-xu-ly-bat-dong-bo]]).

## Tại sao cần nó

Vì microservices giải quyết **vấn đề tổ chức**, không phải vấn đề kỹ thuật:

```text
Lý do CHÍNH ĐÁNG:
  Nhiều đội giẫm chân nhau khi deploy
  Các phần cần quy mô rất khác nhau
  Cần cách ly lỗi thật sự
  Cần dùng ngôn ngữ/công nghệ khác cho một phần

Lý do KHÔNG chính đáng:
  "Ai cũng làm vậy"
  "Monolith là lỗi thời"
  "Cho code sạch hơn"        ← module làm được, rẻ hơn nhiều
```

**Chi phí phải trả trước khi có service thứ hai:**

```text
□ Trace phân tán (không có thì không gỡ lỗi được)
□ Thu gom log tập trung
□ CI/CD cho nhiều dịch vụ
□ Quản lý phiên bản API và tương thích ngược
□ Xử lý lỗi phân tán ([[thiet-ke-cho-that-bai]])
□ Môi trường dev chạy được nhiều service cùng lúc
```

Sáu dòng này là **thuế cố định**, không phụ thuộc bạn có 2 hay 20 service. Đội chưa trả nổi thuế này thì tách service sẽ làm mọi việc chậm lại, không nhanh lên.

**Con số để cân nhắc:** dưới 10 kỹ sư, monolith mô-đun gần như luôn là lựa chọn đúng. Ranh giới đội chưa đủ rõ để ranh giới service có nghĩa.

## So sánh

| | Monolith mô-đun | Microservices |
|---|---|---|
| Ranh giới | mã | mạng |
| Transaction | ✅ | ❌ saga |
| Deploy | một lần | độc lập |
| Gỡ lỗi | dễ | cần trace |
| Đội độc lập | một phần | ✅ |
| Chi phí vận hành | thấp | **cao** |

## Dễ nhầm

**1. Cắt theo tầng kỹ thuật.** Mọi tính năng vẫn phải sửa mọi service.

**2. Dùng chung CSDL.** Ranh giới giả.

**3. Tách trước khi có ranh giới rõ trong mã.** Đoán sai và trả giá đắt.

**4. Viết lại toàn bộ trong một dự án lớn.** Nhiều tháng không giao được gì.

**5. Không đầu tư quan sát trước.** Không gỡ lỗi được.

**6. Gọi đồng bộ ở chỗ đáng lẽ là sự kiện.** Chuỗi phụ thuộc thời gian thực.

**7. Chia quá nhỏ.** Mỗi tính năng chạm 5 service.

**8. Tách vì mốt.** Trả chi phí, không nhận lợi ích.

**9. Không quản lý phiên bản API.** Một thay đổi làm hỏng nhiều bên.

**10. Quên rằng transaction đã mất.** Phát hiện lúc dữ liệu đã lệch.

## Mẹo nhớ

> **Câu hỏi là RANH GIỚI Ở ĐÂU, không phải bao nhiêu tiến trình.**
>
> **Cắt theo miền nghiệp vụ; mỗi service sở hữu dữ liệu của mình.**
>
> **Monolith mô-đun trước — ranh giới có sẵn thì tách sau là cơ học.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm tiêu chí cắt service, cái nào phân biệt thật sự?
2. Bốn thứ bạn mất ngay khi cắt?
3. Vì sao cắt theo tầng kỹ thuật là sai?
4. Vì sao dùng chung CSDL làm ranh giới trở thành giả?
5. Những chi phí nào phải trả **trước** khi có service thứ hai?

## Tự viết lại

Ứng dụng thương mại điện tử monolith: sản phẩm, giỏ hàng, đặt hàng, thanh toán, kho, thông báo, đánh giá. Không nhìn lại:

```text
① chia thành các mô-đun, nêu ranh giới
② nếu buộc phải tách MỘT service, chọn cái nào, vì sao
③ nó giao tiếp với phần còn lại thế nào
④ bạn mất gì khi tách nó
```

Tự kiểm: lựa chọn ở ② của bạn có ít phụ thuộc hai chiều nhất không — hay bạn chọn cái "dễ hình dung nhất"?

## Thử sức

Đội 8 người, monolith 200.000 dòng, deploy mất 40 phút và hay xung đột. Có người đề xuất chuyển sang microservices.

Ba câu để trả lời: bạn hỏi lại những gì để tìm **vấn đề thật**; bạn đề xuất gì thay thế và vì sao nó giải quyết đúng vấn đề đó; và nếu vẫn quyết định tách, bạn làm theo thứ tự nào. Câu khó nhất: trong "deploy 40 phút" và "hay xung đột", cái nào là lý do chính đáng để tách service — và cái nào có cách sửa rẻ hơn nhiều?
