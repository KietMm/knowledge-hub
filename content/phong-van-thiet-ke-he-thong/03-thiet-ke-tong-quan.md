---
title: Thiết kế tổng quan
slug: thiet-ke-tong-quan
summary: Vẽ các khối chính và dòng dữ liệu — và vì sao đừng chọn công nghệ cụ thể ở bước này.
level: trung-cap
tags: [phong-van, thiet-ke-he-thong, kien-truc, phuong-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** vẽ được sơ đồ tổng quan trong 7 phút, và biết trình tự nói để người nghe theo được.

## Ý tưởng chính

Thiết kế tổng quan là **bản đồ**, không phải bản vẽ thi công. Mục đích: người nghe hiểu được **dữ liệu đi đâu** và **mỗi khối làm gì**.

Và điều quan trọng nhất về bước này: **đừng chọn công nghệ cụ thể**. Nói "một hàng đợi" trước, chọn Kafka hay RabbitMQ ở phần đào sâu — khi đã có lý do.

## Mental model

Hãy nghĩ tới **chỉ đường cho người lạ**.

> "Đi thẳng 500m, gặp ngã tư thì rẽ phải, đi tiếp tới cây xăng, rẽ trái, số nhà thứ ba."
>
> Bạn không nói vỉa hè bên nào rộng hơn, hay cây nào ở góc đường. Đó là chi tiết — và nói chúng làm người nghe mất mạch.
>
> Nhưng bạn nói **theo trình tự đi**, không nhảy: không thể nói "sau đó rẽ trái" trước khi nói tới ngã tư.

Hai điều đó: **đúng mức chi tiết**, và **theo trình tự dòng dữ liệu**. Nhảy qua lại giữa các khối là cách nhanh nhất để người nghe mất mạch.

## Ví dụ nhỏ

```text
client → CDN (nội dung tĩnh)
       → load balancer → API server (nhiều bản)
                            ├→ cache
                            ├→ CSDL chính (ghi)
                            ├→ replica đọc
                            └→ hàng đợi → worker
```

## Code chạy thế nào

**Trình tự nói — theo dòng dữ liệu, không theo tầng:**

```text
① BẮT ĐẦU TỪ CLIENT
   "Người dùng gửi request từ ứng dụng di động..."

② ĐI THEO MỘT LUỒNG GHI HOÀN CHỈNH
   "...tới load balancer, vào API server. API xác thực,
    ghi vào CSDL, rồi đẩy một sự kiện vào hàng đợi..."

③ RỒI MỘT LUỒNG ĐỌC HOÀN CHỈNH
   "Khi người dùng xem timeline, request đi tới API, API kiểm
    cache trước, miss thì đọc replica..."

④ RỒI CÁC LUỒNG NỀN
   "Worker đọc hàng đợi để gửi thông báo..."

⇒ Đi hết một luồng rồi mới sang luồng khác. Đừng nhảy.
```

**Bốn khối gần như luôn có, và khi nào cần nói tới:**

```text
LOAD BALANCER   khi có nhiều bản sao API
                ⇒ nói ngay, nó là chỗ đầu tiên request tới

CACHE           khi tỉ lệ đọc cao
                ⇒ nói VÌ SAO: "vì tỉ lệ đọc/ghi 100:1 nên
                  cache có tác dụng lớn"

HÀNG ĐỢI        khi có việc không cần làm trong request
                ⇒ gửi thông báo, xử lý ảnh, cập nhật chỉ mục

CSDL + REPLICA  khi đọc nhiều hơn ghi
```

```text
Mỗi khối bạn thêm vào phải có LÝ DO gắn với con số ở phần
làm rõ yêu cầu. Thêm khối vì "hệ thống nào cũng có" là dấu
hiệu bạn đang vẽ theo mẫu ([[uoc-luong-va-tim-diem-nghen]]).
```

## Cú pháp

**Đừng chọn công nghệ cụ thể quá sớm:**

```text
❌ "Dùng Kafka cho hàng đợi, Redis cho cache, Postgres cho CSDL."
   ⇒ Chưa có lý do. Và nếu người phỏng vấn hỏi "vì sao Kafka",
     bạn ở thế phải biện hộ một lựa chọn chưa nghĩ kỹ.

✅ "Cần một hàng đợi ở đây để tách việc gửi thông báo ra khỏi
    request. Về lựa chọn cụ thể thì tuỳ: nếu cần phát lại
    lịch sử thì Kafka, nếu chỉ phân phối công việc thì
    RabbitMQ hoặc một bảng trong CSDL cũng đủ."

⇒ Câu thứ hai cho thấy bạn biết đánh đổi, không chỉ biết tên
  công cụ ([[chon-cong-cu-va-van-hanh]]).
```

**Mô hình dữ liệu — nói ở tổng quan hay để lại:**

```text
Nói ở tổng quan: các THỰC THỂ chính và quan hệ
  "Có user, post, follow. Follow là quan hệ nhiều-nhiều."

Để lại phần đào sâu: schema chi tiết, index, kiểu dữ liệu

⇒ Nhưng nếu mô hình dữ liệu LÀ phần khó của bài (ví dụ:
  thiết kế timeline), thì nó xứng đáng nói sớm — vì mọi thứ
  khác phụ thuộc vào nó.
```

**Ba lỗi ở bước tổng quan:**

```text
① VẼ QUÁ CHI TIẾT
   Đi vào schema, vào API cụ thể ⇒ hết thời gian, và người nghe
   chưa thấy bức tranh tổng.

② VẼ QUÁ SƠ SÀI
   Ba hộp: "client, server, database" ⇒ không có gì để bàn.

③ VẼ THEO MẪU, không theo bài toán
   Thêm cache, hàng đợi, CDN vì "hệ thống nào cũng có".
   ⇒ Người phỏng vấn sẽ hỏi "vì sao cần cái này" và bạn
     không trả lời được.
```

**Xử lý khi người phỏng vấn ngắt:**

```text
Họ ngắt để hỏi ⇒ đó là tín hiệu tốt, không phải bạn sai.
  □ Trả lời câu hỏi
  □ Rồi QUAY VỀ mạch: "quay lại luồng đọc, sau cache thì..."

⇒ Đừng để câu hỏi làm bạn mất mạch và không quay lại nữa.
⇒ Và nếu họ ngắt để đề nghị đào sâu một phần, chuyển sang
  phần đó — họ đang cho bạn biết họ muốn nghe gì.
```

## Tại sao cần nó

Vì bước này là chỗ người phỏng vấn quyết định **đào sâu vào đâu**:

```text
Tổng quan rõ ⇒ họ chọn được một phần thú vị để đào
            ⇒ bạn được thể hiện độ sâu ở phần bạn hiểu

Tổng quan mơ hồ ⇒ họ phải hỏi lại nhiều
                ⇒ mất thời gian, và phần đào sâu bị ngắn
```

**Và một điều về việc vẽ:**

```text
Sơ đồ không cần đẹp. Nó cần ĐỌC ĐƯỢC và có NHÃN.

□ Ghi tên mỗi khối
□ Vẽ MŨI TÊN có hướng — dòng dữ liệu đi đâu
□ Ghi con số quan trọng lên sơ đồ (300 req/s, 100:1)
  ⇒ Nó nhắc bạn và nhắc người phỏng vấn về ràng buộc

⇒ Sơ đồ là công cụ để nói, không phải sản phẩm cần hoàn thiện.
```

**Ba câu nên nói ở bước này:**

```text
□ "Vì [con số], nên mình thêm [khối này]."
□ "Phần này mình sẽ đào sâu hơn, còn phần kia đơn giản."
□ "Ở đây có một đánh đổi: ..., mình chọn ... vì ..."
```

## So sánh

| Mức chi tiết | Có bàn được | Vấn đề |
|---|---|---|
| 3 hộp (client-server-db) | ❌ | quá sơ sài |
| Các khối chính + dòng dữ liệu | ✅ | đúng mức |
| Schema, API, cấu hình | ❌ ở bước này | quá chi tiết, hết thời gian |

## Dễ nhầm

**1. Chọn công nghệ cụ thể mà chưa có lý do.**

**2. Nhảy qua lại giữa các khối.** Người nghe mất mạch.

**3. Vẽ quá chi tiết ở bước tổng quan.**

**4. Vẽ ba hộp rồi dừng.**

**5. Thêm khối theo mẫu, không theo bài toán.**

**6. Không nói VÌ SAO cần mỗi khối.**

**7. Không gắn quyết định với con số ở phần làm rõ yêu cầu.**

**8. Sơ đồ không có nhãn, mũi tên không có hướng.**

**9. Bị ngắt rồi không quay về mạch.**

**10. Bỏ qua tín hiệu khi họ đề nghị đào sâu một phần.**

## Mẹo nhớ

> **Đi theo DÒNG DỮ LIỆU, hết một luồng rồi mới sang luồng khác.**
>
> **Nói "một hàng đợi" trước; chọn Kafka hay RabbitMQ ở phần đào sâu, khi có lý do.**
>
> **Mỗi khối phải có LÝ DO gắn với một con số.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Trình tự nói ở bước tổng quan?
2. Bốn khối gần như luôn có, và khi nào cần nói tới?
3. Vì sao đừng chọn công nghệ cụ thể ở bước này?
4. Ba lỗi ở bước tổng quan?
5. Ba câu nên nói ở bước này?

## Tự viết lại

Đề: *"Thiết kế hệ thống thông báo (gửi email/push cho người dùng khi có sự kiện)."* Giả định 10 triệu thông báo/ngày.

Không nhìn lại, viết:

```text
① sơ đồ tổng quan, các khối và mũi tên
② trình tự bạn nói, theo dòng dữ liệu
③ với mỗi khối, lý do gắn với con số
④ phần nào bạn đề nghị đào sâu
```

Tự kiểm: có khối nào bạn thêm mà không nói được lý do gắn với con số không?

## Thử sức

Bạn vừa vẽ tổng quan. Người phỏng vấn nói: *"Mình thấy bạn đặt cache ở đây. Vì sao?"*

Ba câu để trả lời: bạn trả lời thế nào để cho thấy đây là quyết định có lý do; nếu thật ra bạn đặt cache theo phản xạ và chưa có lý do, bạn xử lý ra sao; và bạn quay về mạch trình bày thế nào. Câu khó nhất: nếu sau khi bạn giải thích, họ nói "nhưng tỉ lệ đọc/ghi ở đây chỉ 2:1", bạn phản ứng thế nào — và điều đó nói gì về việc dùng con số từ phần làm rõ yêu cầu?
