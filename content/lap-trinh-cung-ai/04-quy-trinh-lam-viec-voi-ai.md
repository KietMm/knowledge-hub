---
title: Quy trình làm việc với AI
slug: quy-trinh-lam-viec-voi-ai
summary: Chia việc, xác nhận từng bước, và giữ quyền kiểm soát khi công cụ tự chạy nhiều bước.
level: trung-cap
tags: [ai, lap-trinh-cung-ai, phuong-phap, chat-luong]
khung: v2
---

> **Sau bài này bạn sẽ:** có một quy trình cố định để làm việc với trợ lý AI, và biết đặt điểm dừng ở đâu.

## Ý tưởng chính

Cách dùng AI hiệu quả không phải "yêu cầu to hơn" mà **vòng lặp ngắn hơn**: giao một việc nhỏ, đọc kết quả, xác nhận, đi tiếp.

Vòng lặp ngắn giữ được hai thứ quan trọng: bạn **vẫn hiểu** mã đang lớn dần, và sai hướng thì mất một bước chứ không mất cả buổi.

## Mental model

Hãy nghĩ tới **đi taxi trong một thành phố bạn không quen**.

> **Cách rủi ro**: nói tên điểm đến, nhắm mắt ngủ, mở mắt khi tới. Nếu tài xế hiểu sai, bạn phát hiện sau bốn mươi phút — ở một chỗ hoàn toàn khác.
>
> **Cách an toàn**: nói điểm đến, rồi **nhìn ra ngoài ở mỗi ngã tư lớn**. Rẽ sai một lần thì bạn biết ngay, và sửa mất hai phút.
>
> Bạn không cần chỉ đường từng mét. Bạn cần **vài điểm kiểm** đủ dày để sai lệch không tích tụ.

Ngã tư lớn đó là điểm xác nhận. Câu hỏi thiết kế quy trình là: **đặt chúng ở đâu và cách nhau bao xa**.

## Ví dụ nhỏ

```text
❌ "Làm tính năng đăng nhập bằng Google"        → nhận 500 dòng
✅ ① "Thiết kế luồng, chưa viết mã. Liệt kê các bước."
   ② (đọc, sửa hướng) "Viết phần sinh state và redirect."
   ③ (đọc, chạy)      "Viết phần callback, đổi code lấy token."
   ④ (đọc, chạy)      "Viết test cho hai ca lỗi."
```

## Code chạy thế nào

**Vòng lặp năm bước:**

```text
① MÔ TẢ KẾT QUẢ MONG MUỐN, không mô tả cách làm
   "Endpoint huỷ đơn, chỉ chủ đơn, chỉ khi chưa giao, hoàn tồn kho"
   ⇒ Mô tả cách làm quá chi tiết thì bạn đang tự viết bằng lời.

② YÊU CẦU KẾ HOẠCH TRƯỚC, CHƯA VIẾT MÃ
   "Liệt kê các bước và file sẽ sửa. Chưa viết mã."
   ⇒ Đây là bước có giá trị cao nhất và hay bị bỏ:
     sai hướng lộ ra ở đây, khi sửa chỉ mất một câu.

③ THỰC HIỆN TỪNG PHẦN, mỗi phần đọc được trong một lượt

④ CHẠY VÀ ĐỌC sau mỗi phần
   ⇒ Chạy test, không chỉ đọc mã.

⑤ TỰ MÌNH ĐÁNH BÓNG PHẦN CUỐI
   ⇒ Đặt tên, ghép vào phong cách dự án, xoá phần thừa.
     Việc này bạn làm nhanh hơn giải thích cho mô hình.
```

Bước ② đáng nhấn: nó biến một sai lệch tốn cả buổi thành một sai lệch tốn một câu.

**Ba việc nên tự làm, đừng giao:**

```text
① QUYẾT ĐỊNH: chọn phương án, đặt ranh giới, chấp nhận đánh đổi
② ĐẶT TÊN cho khái niệm nghiệp vụ
   ⇒ Tên là nơi hiểu biết về nghiệp vụ được ghi lại
     ([[dat-ten-va-code-doc-duoc]])
③ XÁC NHẬN ĐÚNG SAI: chạy, đọc, kiểm chứng

Ba việc này là chỗ giá trị của bạn nằm. Giao chúng đi thì bạn
không còn kiểm soát được kết quả.
```

## Cú pháp

**Công cụ tự chạy nhiều bước — đặt điểm dừng ở đâu:**

```text
Công cụ hiện nay có thể tự đọc file, sửa nhiều file, chạy lệnh,
đọc kết quả, và tiếp tục. Rất mạnh, và cần lan can.

Nên tự chạy (rủi ro thấp, quay lui dễ):
  □ Đọc file, tìm kiếm trong repo
  □ Chạy test, chạy linter, chạy typecheck
  □ Sửa file trong một nhánh git riêng

PHẢI xác nhận (khó quay lui):
  □ Xoá file, xoá thư mục
  □ Bất kỳ lệnh nào chạm CSDL
  □ `git push`, mở PR, merge
  □ Cài thêm phụ thuộc
  □ Lệnh gọi ra Internet, hoặc gửi dữ liệu ra ngoài
  □ Bất kỳ thứ gì chạm production
```

```text
Lan can rẻ nhất và hiệu quả nhất: LÀM VIỆC TRONG NHÁNH GIT RIÊNG,
commit thường xuyên.
⇒ Sai bao nhiêu cũng quay lui được bằng một lệnh.
⇒ Và diff là cách xem lại tốt hơn mọi bản mô tả.
```

**Ba dấu hiệu phải dừng lại:**

```text
□ Bạn không còn hiểu mã đang lớn dần
  ⇒ Dừng, đọc lại từ đầu, hoặc bỏ và làm lại nhỏ hơn.
□ Đã ba lượt mà vẫn chưa đúng
  ⇒ Vấn đề không ở lời yêu cầu — nó ở ngữ cảnh, hoặc bài toán
    chưa được định nghĩa rõ. Dừng và viết ra yêu cầu cho chính mình.
□ Nó sửa cùng một chỗ qua lại
  ⇒ Có hai ràng buộc mâu thuẫn. Bạn phải quyết định, không phải nó.
```

**Ghi lại quyết định — không ghi cuộc trò chuyện:**

```text
Cuộc trò chuyện với AI không phải tài liệu:
  □ Người khác không đọc
  □ Nó dài và lẫn nhiều thử-sai
  □ Nó không nói được VÌ SAO chọn phương án này

⇒ Quyết định đáng giữ thì viết vào ADR hoặc comment trong mã,
  bằng lời của bạn ([[ra-quyet-dinh-ky-thuat]]).
```

## Tại sao cần nó

Vì rủi ro lớn nhất không phải mã sai — mã sai thì phát hiện được. Rủi ro lớn nhất là **bạn mất mô hình về hệ thống của mình**:

```text
Giao việc lớn, nhận mã, merge, lặp lại:
  → sau ba tháng, có những phần bạn không hiểu
  → gặp bug ở đó, bạn không gỡ được
  → và bạn không sửa được kiến trúc vì không biết nó đang thế nào
  ⇒ Bạn vẫn là người chịu trách nhiệm, nhưng không còn khả năng.

Vòng lặp ngắn, đọc từng phần:
  → mã lớn dần, và hiểu biết của bạn lớn cùng nó
```

**Và một tác động lên việc học:**

```text
Người mới dùng AI để BỎ QUA giai đoạn hiểu:
  ⇒ giải quyết được việc hôm nay
  ⇒ nhưng không có mental model để tự suy lại khi gặp biến thể
  ⇒ và không nhận ra khi AI đưa ra đáp án sai

Cách dùng tốt hơn khi đang học:
  ① Tự thử trước
  ② Hỏi AI giải thích cách của mình sai ở đâu
  ③ So sánh với cách nó đề xuất, và hỏi VÌ SAO khác
  ⇒ Nhanh hơn tự mò, và vẫn giữ được phần hiểu.
```

**Quy trình gói gọn:**

```text
① Việc nhỏ, mô tả kết quả
② Xin kế hoạch trước khi viết mã
③ Đọc và chạy sau mỗi phần
④ Nhánh git riêng, commit dày
⑤ Xác nhận tay cho mọi thứ khó quay lui
⑥ Ba lượt chưa đúng ⇒ dừng, xem lại bài toán
```

## So sánh

| | Yêu cầu lớn một lần | Vòng lặp ngắn |
|---|---|---|
| Phát hiện sai hướng | sau khi xong | ở bước tiếp theo |
| Bạn hiểu mã | không chắc | ✅ |
| Chi phí khi sai | cả buổi | một bước |
| Cảm giác nhanh | ✅ | chậm hơn lúc làm |
| Thực tế nhanh hơn | ❌ | ✅ |

## Dễ nhầm

**1. Giao một yêu cầu khổng lồ.** Sai hướng phát hiện quá muộn.

**2. Bỏ bước xin kế hoạch trước.** Bước rẻ nhất để sửa hướng.

**3. Không chạy test sau mỗi phần.** Chỉ đọc mã là chưa đủ.

**4. Làm trên nhánh chính.** Mất lan can rẻ nhất.

**5. Cho tự chạy lệnh chạm CSDL hoặc production.**

**6. Thử lượt thứ tư, thứ năm.** Vấn đề ở bài toán, không ở lời yêu cầu.

**7. Giao việc đặt tên khái niệm nghiệp vụ.**

**8. Giao quyết định kiến trúc.**

**9. Coi cuộc trò chuyện là tài liệu.**

**10. Dùng AI để bỏ qua giai đoạn hiểu, khi đang học.**

## Mẹo nhớ

> **Vòng lặp NGẮN, không yêu cầu TO. Xin kế hoạch trước khi xin mã.**
>
> **Nhánh git riêng + commit dày = lan can rẻ nhất.**
>
> **Ba lượt chưa đúng ⇒ vấn đề ở BÀI TOÁN, không ở lời yêu cầu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm bước của vòng lặp, bước nào hay bị bỏ và vì sao nó quan trọng?
2. Ba việc nên tự làm, đừng giao?
3. Việc nào cho tự chạy, việc nào phải xác nhận tay?
4. Ba dấu hiệu phải dừng lại?
5. Rủi ro lớn nhất của việc giao việc lớn là gì?

## Tự viết lại

Bạn cần thêm tính năng *"xuất báo cáo doanh thu theo tháng ra Excel"*. Không nhìn lại, viết:

```text
① chia thành 4 bước nhỏ
② lời yêu cầu cho bước đầu tiên
③ bạn kiểm gì sau mỗi bước
④ những lệnh nào bạn không cho tự chạy
```

Tự kiểm: bước ① đầu tiên của bạn có phải "xin kế hoạch" không — nếu không, bạn đang bắt đầu từ bước hai.

## Thử sức

Một đồng nghiệp làm việc với công cụ AI tự chạy nhiều bước, để nó tự thực hiện suốt hai giờ. Kết quả: 40 file thay đổi, test xanh, nhưng không ai (kể cả họ) mô tả được thay đổi đã làm gì.

Ba câu để trả lời: bạn xử lý PR này thế nào; bạn đề xuất quy trình gì cho lần sau; và bạn giữ lại bao nhiêu phần công đã bỏ ra. Câu khó nhất: nếu 40 file đó thực sự đúng và hữu ích, việc yêu cầu làm lại theo từng bước có phải là lãng phí — và bạn cân giữa hai điều đó bằng tiêu chí nào?
