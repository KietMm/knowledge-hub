---
title: Khung 45 phút
slug: khung-45-phut
summary: Chia thời gian, và vì sao 10 phút đầu quyết định phần lớn kết quả.
level: co-ban
tags: [phong-van, thiet-ke-he-thong, phuong-phap, giao-tiep]
khung: v2
---

> **Sau bài này bạn sẽ:** có một khung thời gian cố định cho buổi phỏng vấn thiết kế, và biết vì sao đừng vẽ ngay.

## Ý tưởng chính

Phỏng vấn thiết kế hệ thống **không kiểm tra bạn có biết kiến trúc "đúng" hay không** — không có kiến trúc đúng cho một đề bài mơ hồ trong 45 phút.

Nó kiểm tra: bạn **làm rõ yêu cầu** thế nào, **ra quyết định có lý do** thế nào, và **nói ra đánh đổi** thế nào.

Và lỗi phổ biến nhất là bắt đầu vẽ ngay — vì nó cảm giác như đang làm việc.

## Mental model

Hãy nghĩ tới **một khách hàng gọi bạn tới thiết kế nhà**.

> Họ nói: "tôi muốn một cái nhà". Bạn không mở giấy vẽ ngay.
>
> Bạn hỏi: mấy người ở, đất bao nhiêu, ngân sách, có cần chỗ đỗ xe, sau này có thêm người không.
>
> Mười phút hỏi đó **quyết định phần lớn thiết kế**. Vẽ trước khi hỏi thì bạn đang vẽ một cái nhà cho một gia đình tưởng tượng.
>
> Và người phỏng vấn bạn cũng là người **biết đáp án họ muốn nghe** — họ chờ bạn hỏi để nói ra.

Vế cuối là điều quan trọng: đề bài **cố tình mơ hồ**, và việc làm rõ là **một phần của bài kiểm tra**, không phải bước chuẩn bị.

## Ví dụ nhỏ

```text
Chia thời gian 45 phút:
  0–8    làm rõ yêu cầu, chốt phạm vi
  8–13   ước lượng tải và dung lượng
  13–20  thiết kế tổng quan (các khối chính, dòng dữ liệu)
  20–35  đào sâu 1–2 phần (người phỏng vấn thường chọn)
  35–42  điểm nghẽn, mở rộng, đánh đổi
  42–45  tóm lại, nói những gì chưa làm
```

## Code chạy thế nào

**Giai đoạn 1 — làm rõ yêu cầu (8 phút, quan trọng nhất):**

```text
Ba nhóm câu hỏi:

① CHỨC NĂNG — hệ thống làm gì
   "Người dùng làm được những gì? Có cần X không?"
   ⇒ Chốt 3–5 chức năng CỐT LÕI, nói rõ cái gì để ngoài phạm vi.

② QUY MÔ — con số
   "Bao nhiêu người dùng? Bao nhiêu request? Tỉ lệ đọc/ghi?
    Dữ liệu bao lớn?"
   ⇒ Người phỏng vấn thường đưa số nếu bạn hỏi. Không hỏi thì
     bạn thiết kế cho một quy mô tưởng tượng.

③ PHI CHỨC NĂNG — ràng buộc
   "Độ trễ mong đợi? Nhất quán mạnh hay chấp nhận trễ?
    Có yêu cầu về vùng địa lý?"
   ⇒ Đây là nhóm phân biệt người có kinh nghiệm.
```

**Vì sao chốt phạm vi quan trọng hơn cả:**

```text
Đề "thiết kế Twitter" có thể là 20 hệ thống khác nhau.
Không chốt phạm vi ⇒ bạn nói lan man, không đào sâu được gì.

⇒ Nói ra: "Mình sẽ tập trung vào đăng bài, xem timeline, và
  theo dõi. Chưa làm tìm kiếm, thông báo, quảng cáo.
  Bạn thấy ổn không?"
⇒ Một câu này cho bạn quyền kiểm soát phần còn lại của buổi.
```

## Cú pháp

**Giai đoạn 2 — ước lượng (5 phút):**

```text
Tính nhẩm, nói to:
  1 triệu người dùng × 10 request/ngày = 10 triệu/ngày
  ÷ 100.000 giây ≈ 100 req/s trung bình
  × 3 ≈ 300 req/s đỉnh

⇒ Đúng bậc độ lớn là đủ. Không cần chính xác
  ([[uoc-luong-va-tim-diem-nghen]]).
⇒ Mục đích: con số này QUYẾT ĐỊNH thiết kế. 300 req/s và
  300.000 req/s là hai hệ thống khác nhau.
```

**Giai đoạn 3 — thiết kế tổng quan (7 phút):**

```text
Vẽ các khối chính và dòng dữ liệu. KHÔNG đi vào chi tiết.

  client → load balancer → API → CSDL
                              ↓
                           cache, hàng đợi

⇒ Nói ra mỗi khối làm gì và VÌ SAO có nó.
⇒ Chưa cần chọn công nghệ cụ thể ở bước này.
```

**Giai đoạn 4 — đào sâu (15 phút, phần dài nhất):**

```text
Người phỏng vấn thường chọn phần họ muốn nghe. Nếu không:
  □ Chọn phần KHÓ NHẤT hoặc RỦI RO NHẤT
  □ Hoặc hỏi: "bạn muốn mình đào sâu phần nào?"

Ở phần này nói về:
  □ Mô hình dữ liệu — bảng gì, khoá gì, index gì
  □ API — endpoint chính, tham số
  □ Xử lý đồng thời, transaction
  □ Cái gì có thể sai và xử lý thế nào
```

**Giai đoạn 5 — điểm nghẽn và mở rộng (7 phút):**

```text
"Ở quy mô này, cái gì vỡ trước?"
  ⇒ Thường là CSDL. Nói ra thứ tự xử lý: index → cache →
    replica → sharding ([[mo-rong-va-can-bang-tai]])

Và nói ĐÁNH ĐỔI của mỗi lựa chọn.
```

**Giai đoạn 6 — tóm lại (3 phút):**

```text
□ Nhắc lại quyết định chính và lý do
□ Nói những gì CHƯA làm và vì sao để ngoài phạm vi
□ Nói một điểm bạn không chắc

⇒ Điểm cuối là một điểm mạnh, không phải điểm yếu: nói ra
  giới hạn của thiết kế cho thấy bạn hiểu nó.
```

## Tại sao cần nó

Vì không có khung thì buổi phỏng vấn trượt theo hai hướng sai:

```text
① VẼ NGAY, KHÔNG HỎI
   ⇒ Thiết kế cho quy mô tưởng tượng.
   ⇒ Và bạn bỏ mất phần được đánh giá cao nhất: làm rõ yêu cầu.

② HỎI QUÁ LÂU, KHÔNG KỊP THIẾT KẾ
   ⇒ 20 phút làm rõ yêu cầu ⇒ không còn thời gian đào sâu.
   ⇒ Người phỏng vấn không thấy được bạn thiết kế thế nào.
```

**Ba thứ được đánh giá cao nhất:**

```text
① NÓI TO SUY NGHĨ
   Người phỏng vấn không đọc được đầu bạn. Im lặng suy nghĩ
   ba phút là ba phút họ không biết gì về bạn.
   ⇒ "Mình đang cân nhắc giữa A và B. A thì..., B thì..."

② NÓI RA ĐÁNH ĐỔI, không nói "cái này tốt hơn"
   ⇒ "Dùng cache giảm tải CSDL, đổi lại dữ liệu có thể cũ
     tới 5 phút. Với timeline thì chấp nhận được."
   ⇒ Đây là thứ phân biệt rõ nhất giữa các mức
     ([[doc-danh-doi]]).

③ ĐIỀU CHỈNH KHI CÓ THÔNG TIN MỚI
   Người phỏng vấn nói "giả sử 100 triệu người dùng" ⇒ họ đang
   mời bạn đổi thiết kế.
   ⇒ Bám vào thiết kế cũ là bỏ mất tín hiệu.
```

**Và một điều nên biết:** người phỏng vấn thường **không mong bạn hoàn thành**. Họ mong thấy cách bạn nghĩ. Nên chất lượng của 15 phút đào sâu quan trọng hơn việc phủ hết mọi phần.

## So sánh

| Giai đoạn | Thời gian | Điều được đánh giá |
|---|---|---|
| Làm rõ yêu cầu | 8 phút | có hỏi đúng câu không |
| Ước lượng | 5 phút | có dùng số để quyết định không |
| Tổng quan | 7 phút | có cấu trúc rõ không |
| Đào sâu | 15 phút | **độ sâu kỹ thuật** |
| Điểm nghẽn | 7 phút | có thấy trước vấn đề không |
| Tóm lại | 3 phút | có tự đánh giá được không |

## Dễ nhầm

**1. Vẽ ngay, không hỏi.** Bỏ mất phần được đánh giá cao nhất.

**2. Không hỏi con số quy mô.** Thiết kế cho quy mô tưởng tượng.

**3. Không chốt phạm vi.** Nói lan man, không đào sâu được.

**4. Hỏi quá lâu.** Không còn thời gian thiết kế.

**5. Im lặng suy nghĩ.** Người phỏng vấn không biết gì về bạn.

**6. Nói "cái này tốt hơn" mà không nói đánh đổi.**

**7. Bám thiết kế cũ khi có thông tin mới.**

**8. Cố phủ hết mọi phần.** Độ sâu quan trọng hơn.

**9. Chọn công nghệ cụ thể quá sớm.**

**10. Không nói ra điểm mình không chắc.**

## Mẹo nhớ

> **Đề bài CỐ TÌNH mơ hồ. Làm rõ yêu cầu LÀ một phần của bài kiểm tra.**
>
> **NÓI TO suy nghĩ. Im lặng ba phút là ba phút họ không biết gì về bạn.**
>
> **Nói ĐÁNH ĐỔI, không nói "tốt hơn". Đây là thứ phân biệt rõ nhất các mức.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Sáu giai đoạn và thời gian mỗi giai đoạn?
2. Ba nhóm câu hỏi làm rõ yêu cầu?
3. Vì sao chốt phạm vi quan trọng?
4. Ba thứ được đánh giá cao nhất?
5. Vì sao nói ra điểm không chắc là điểm mạnh?

## Tự viết lại

Đề: *"Thiết kế một hệ thống rút gọn URL."*

Không nhìn lại, viết:

```text
① tám câu hỏi làm rõ, chia ba nhóm
② câu chốt phạm vi của bạn
③ ước lượng, tính nhẩm ra số
④ bạn sẽ đề nghị đào sâu phần nào, vì sao
```

Tự kiểm: trong tám câu hỏi ở ①, có bao nhiêu câu về phi chức năng — nhóm hay bị bỏ nhất?

## Thử sức

Bạn đang phỏng vấn. Người phỏng vấn nói: *"Thiết kế Instagram."* Rồi im lặng.

Ba câu để trả lời: bạn nói gì trong 60 giây đầu; bạn hỏi những gì trước khi vẽ bất cứ thứ gì; và bạn chốt phạm vi thế nào. Câu khó nhất: nếu sau khi bạn chốt phạm vi, người phỏng vấn nói "mình muốn tập trung vào phần feed thôi", điều đó thay đổi phần còn lại của buổi ra sao — và bạn phân bổ lại thời gian thế nào?
