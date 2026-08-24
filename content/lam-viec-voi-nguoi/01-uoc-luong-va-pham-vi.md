---
title: Ước lượng và phạm vi
slug: uoc-luong-va-pham-vi
summary: Vì sao ước lượng luôn sai, cách nói con số mà không hứa sai, và cắt phạm vi thay vì cắt chất lượng.
level: trung-cap
tags: [dan-dat, uoc-luong, pham-vi, ke-hoach]
---

> **Sau bài này bạn sẽ:** trả lời "bao lâu?" theo cách trung thực và vẫn dùng được để lập kế hoạch, và biết cắt gì khi hết thời gian.

## Vì sao ước lượng luôn thấp

Không phải vì kỹ sư lạc quan — mà vì bốn thứ có cấu trúc:

**1. Ước lượng cho phần đã hiểu.** Bạn hình dung được code chính, không hình dung được ba trường hợp biên chưa ai nghĩ tới. Phần chưa biết luôn tồn tại và luôn không được tính.

**2. Bỏ qua phần không phải viết code.** Với một tính năng "3 ngày":

```
Viết code chính        3 ngày   ← phần được ước lượng
Trường hợp biên        1 ngày
Test                   1 ngày
Review + sửa           1 ngày
Migration              0,5 ngày
Đúng ở mobile          0,5 ngày
Trạng thái lỗi/rỗng    0,5 ngày
Tài liệu               0,5 ngày
                     ────────
                       8 ngày
```

**3. Bỏ qua thời gian bị ngắt.** Một ngày làm việc thực tế có ~5 giờ tập trung, không phải 8. Có on-call, họp, review PR người khác, sự cố.

**4. Ngộ nhận kế hoạch.** Con người ước lượng dựa trên **kịch bản diễn ra tốt nhất**, kể cả khi biết rõ lịch sử của mình không như vậy.

## Nói khoảng, không nói điểm

```
❌ "3 ngày."                    ← nghe thành lời hứa
✅ "3 đến 8 ngày. Chỗ không rõ nhất là tích hợp cổng thanh toán —
   nếu tài liệu của họ đúng thì gần 3, nếu phải dò thì gần 8."
```

Câu thứ hai trung thực hơn **và** hữu ích hơn: nó nói cho người nghe biết **rủi ro nằm ở đâu**, nên họ có thể hành động (đi hỏi cổng thanh toán trước, hoặc chấp nhận rủi ro).

Khi bị ép một con số duy nhất, đưa mức tin cậy:

> "50% khả năng xong trong 4 ngày, 90% trong 9 ngày. Cần cam kết thì tôi cam kết 9."

Đây là cách nói đúng bản chất: ước lượng là **phân bố xác suất**, không phải một điểm. Người quản lý cần một ngày để lập kế hoạch — cho họ con số 90% để cam kết, và con số 50% để họ biết trường hợp tốt.

## Giảm phần chưa biết trước khi ước lượng

Không rõ tới mức không ước lượng nổi thì **đừng ước lượng** — đề nghị một spike:

> "Chưa ước lượng được vì chưa biết API của họ có hỗ trợ hoàn tiền một phần không. Cho tôi một ngày để thử, sau đó tôi ước lượng có cơ sở."

Một ngày spike đổi lấy một ước lượng đáng tin là giao dịch rất tốt, và nó cũng là cách hợp lệ để từ chối bị ép con số. Xem [[ra-quyet-dinh-ky-thuat]].

Chia nhỏ cũng làm ước lượng chính xác hơn: sai số của những phần nhỏ triệt tiêu lẫn nhau, còn sai số của một khối lớn thì chỉ lệch về một phía. Chia tới mức mỗi phần **dưới hai ngày** — phần nào không chia được nghĩa là bạn chưa hiểu nó.

## Bốn đòn bẩy, và chỉ một cái an toàn

Khi hạn không đủ, chỉ có bốn thứ đổi được:

| Đòn bẩy | Hệ quả |
|---|---|
| **Phạm vi** | ✅ An toàn nhất — làm ít việc hơn |
| **Thời gian** | ⚠️ Đôi khi được, nhưng thường là cái đang cố định |
| **Người** | ❌ Thêm người vào dự án muộn làm nó chậm hơn (onboarding + giao tiếp) |
| **Chất lượng** | ❌ Vay có lãi rất cao — xem [[no-ky-thuat-va-refactor]] |

**Cắt phạm vi là đòn bẩy duy nhất không có hoá đơn trả sau.** Việc của tech lead là làm cho việc cắt phạm vi trở nên dễ đối với người ra quyết định — nghĩa là đưa ra lựa chọn cụ thể, không phải nói "không đủ thời gian".

```
❌ "Không kịp đâu."

✅ "Đủ thời gian cho một trong hai:
   (a) Xuất báo cáo PDF đầy đủ, không có bộ lọc nâng cao
   (b) Xuất CSV đơn giản + bộ lọc nâng cao
   Người dùng hỏi về (b) nhiều hơn. Tôi đề nghị (b), và PDF vào sprint sau."
```

Câu thứ hai chuyển cuộc trò chuyện từ "kỹ sư nói không" sang "chọn phương án nào" — và người ra quyết định thường chọn đúng nếu được cho lựa chọn thật.

## Cái không được cắt

Cắt phạm vi không có nghĩa cắt chất lượng. Bốn thứ không nằm trong phần cắt được, vì cắt chúng tạo ra hoá đơn lớn hơn phần tiết kiệm:

- **Kiểm tra quyền** — bỏ nó là lỗ hổng, xem [[phan-quyen-theo-ban-ghi]]
- **Xử lý lỗi** — không có nó thì lỗi hiện ra dưới dạng trang trắng
- **Migration đúng cách** — sửa dữ liệu sai đắt hơn nhiều lần, xem [[trien-khai-an-toan]]
- **Test cho logic nghiệp vụ cốt lõi**

Cái **cắt được**: tính năng phụ, tối ưu hoá, trường hợp biên hiếm, giao diện admin (làm bằng SQL trước), phân trang (giới hạn 100 bản ghi trước), và làm đẹp.

## Khi đã rõ là trượt hạn

Nguyên tắc duy nhất: **báo sớm**. Trượt hạn báo trước hai tuần là một vấn đề lập kế hoạch; báo trước một ngày là một cuộc khủng hoảng — mà thông tin thì bạn đã có từ hai tuần trước.

```
✅ "Đến hôm nay xong 60% trong khi kế hoạch là 80%. Nguyên nhân: tích hợp
   thanh toán mất 4 ngày thay vì 1 (webhook của họ không có retry, phải tự
   làm hàng đợi). Ba lựa chọn:
   (a) Lùi 3 ngày
   (b) Phát hành không có hoàn tiền tự động, làm thủ công trong 2 tuần đầu
   (c) Bỏ báo cáo khỏi bản này
   Tôi đề nghị (b)."
```

Cấu trúc: **hiện trạng bằng số → nguyên nhân → lựa chọn → đề nghị**. Đừng chỉ báo tin xấu; báo tin xấu kèm lựa chọn.

## Vận tốc là để dự báo, không phải để đo năng suất

Đo bao nhiêu việc nhóm thực sự hoàn thành mỗi sprint, dùng nó để dự báo sprint sau. Không dùng nó để so sánh giữa các nhóm hay để đánh giá cá nhân — làm thế thì con số bị thổi phồng và mất giá trị dự báo.

Con số hữu ích hơn cho tech lead là **thời gian từ bắt đầu tới lên production** (cycle time). Nó gồm cả thời gian chờ review, chờ deploy, chờ QA — và phần chờ thường lớn hơn phần làm.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đưa một con số điểm | Nghe thành lời hứa | Nói khoảng + chỗ rủi ro |
| Chỉ ước lượng phần viết code | Thiếu 60% công việc thật | Tính cả test, review, migration |
| Tính 8 giờ làm việc mỗi ngày | Trượt hạn có hệ thống | Tính ~5 giờ tập trung |
| Ước lượng khi chưa hiểu | Con số vô nghĩa | Đề nghị spike |
| Khối việc lớn không chia | Sai số chỉ lệch một phía | Chia dưới 2 ngày mỗi phần |
| Thêm người khi gấp | Chậm hơn vì onboarding | Cắt phạm vi |
| Cắt chất lượng để kịp | Vay lãi cao, trả nhiều lần | Cắt phạm vi |
| Nói "không kịp" mà không có lựa chọn | Bị coi là cản trở | Đưa 2–3 phương án + đề nghị |
| Báo trượt hạn vào phút cuối | Khủng hoảng thay vì điều chỉnh | Báo ngay khi biết |
| Dùng vận tốc để đánh giá người | Con số bị thổi, mất giá trị dự báo | Chỉ dùng để dự báo |

## Ghi nhớ

- Ước lượng là phân bố, không phải một điểm — nói khoảng và nói chỗ rủi ro.
- Chưa hiểu thì đừng ước lượng; đổi một ngày spike lấy một con số đáng tin.
- Phạm vi là đòn bẩy duy nhất không có hoá đơn trả sau.
- Báo trượt hạn kèm lựa chọn, và báo ngay khi biết.

## Tự kiểm tra

1. Bốn nguyên nhân có cấu trúc làm ước lượng luôn thấp?
2. Bị ép một con số duy nhất thì trả lời thế nào cho vừa trung thực vừa dùng được?
3. Bốn đòn bẩy khi hết thời gian, và vì sao chỉ một cái an toàn?
