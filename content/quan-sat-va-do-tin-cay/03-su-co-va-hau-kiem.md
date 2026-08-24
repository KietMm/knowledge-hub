---
title: Sự cố và hậu kiểm
slug: su-co-va-hau-kiem
summary: Ai chỉ huy, nói gì với ai lúc đang cháy, và cách viết hậu kiểm không quy tội mà vẫn có kết quả.
level: trung-cap
tags: [van-hanh, su-co, postmortem, on-call]
---

> **Sau bài này bạn sẽ:** dẫn một sự cố mà không để nhóm rơi vào hỗn loạn, và viết hậu kiểm thật sự làm hệ thống tốt lên.

## Lúc sự cố, vấn đề lớn nhất là phối hợp

Sự cố tệ đi không phải vì thiếu người giỏi, mà vì:

- Năm người cùng sửa, không ai biết người kia đang sửa gì
- Hai người thay đổi cùng lúc, thứ ba không biết vừa có gì đổi
- Người giỏi nhất về hệ thống đó vừa trả lời câu hỏi của giám đốc trong 20 phút
- Không ai nhớ đã thử gì → thử lại vòng hai

Ba vai, và ba vai này phải là **ba người khác nhau** khi sự cố kéo dài:

**Chỉ huy (IC).** Không tự sửa. Việc của họ: quyết định, ghi lại dòng thời gian, gọi thêm người. Đây là vai bị bỏ qua nhiều nhất và cũng quan trọng nhất — người giỏi nhất về mặt kỹ thuật thường là người *tệ nhất* để làm IC, vì họ nên đang gõ.

**Người xử lý.** Làm việc kỹ thuật. Báo lại IC trước và sau mỗi thay đổi.

**Người liên lạc.** Nói với bên ngoài: hỗ trợ khách hàng, quản lý, trang trạng thái. Chắn cho người xử lý khỏi bị hỏi.

Nhóm nhỏ thì một người có thể gánh hai vai — nhưng **IC không được đồng thời là người gõ**.

## Bốn việc theo thứ tự

**1. Tuyên bố sự cố.** Ngưỡng thấp. Tuyên bố rồi hạ cấp sau 10 phút rẻ hơn nhiều so với xử lý im lặng 40 phút rồi mới gọi người.

**2. Khôi phục trước, hiểu sau.** Đây là thứ tự người ta hay làm ngược:

```
❌ Tìm ra nguyên nhân → viết fix → review → deploy → hết sự cố   (2 giờ)
✅ Rollback ngay → hết sự cố → điều tra bình tĩnh                 (5 phút)
```

Rollback không cần biết nguyên nhân. Feature flag tắt cũng vậy. **Hiểu nguyên nhân là việc của giờ hành chính, không phải việc của lúc đang cháy** — xem [[trien-khai-an-toan]].

**3. Một kênh, một dòng thời gian.** Mọi thứ trong một channel, ghi lại từng bước có mốc giờ:

```
14:02  Báo động: tỉ lệ 5xx checkout 12%
14:03  IC: Kiệt. Xử lý: Hà. Liên lạc: Nam
14:05  Hà: p99 database 4s, kết nối đang đầy pool
14:07  Kiệt: quyết định rollback deploy 13:58
14:09  Hà: rollback xong, 5xx bắt đầu giảm
14:14  5xx về 0,2%. Hạ cấp xuống theo dõi
14:20  Nam: đã cập nhật trang trạng thái
```

Dòng thời gian ghi **lúc đang xảy ra**, không phải dựng lại sau. Dựng lại sau luôn thiếu và luôn thiên vị theo kết luận đã biết.

**4. Một người thay đổi một lúc.** Hai người cùng sửa thì không ai biết thay đổi nào có tác dụng — và khi hết sự cố cũng không biết cái gì đã cứu.

## Nói gì với bên ngoài

Chậm và mơ hồ tệ hơn tin xấu rõ ràng:

```
❌ "Chúng tôi đang gặp một số vấn đề kỹ thuật nhỏ."
❌ (im lặng 40 phút)

✅ 14:05 — "Checkout đang lỗi với một phần người dùng. Chúng tôi đã xác định
   nguyên nhân và đang xử lý. Cập nhật tiếp trong 15 phút."
✅ 14:20 — "Đã khắc phục. Đơn hàng tạo trong khoảng 13:58–14:09 có thể thất bại,
   không có đơn nào bị trừ tiền hai lần. Chúng tôi sẽ liên hệ những khách hàng
   bị ảnh hưởng."
```

Ba thứ bên ngoài cần: **cái gì hỏng**, **ảnh hưởng ai**, **bao giờ cập nhật lại**. Cam kết thời điểm cập nhật rồi giữ đúng — đó là thứ mua được sự kiên nhẫn. Đừng đoán nguyên nhân trước khi biết chắc; đoán sai công khai rồi phải rút lại còn tệ hơn im lặng.

## Hậu kiểm không quy tội

"Không quy tội" **không phải** là "không ai chịu trách nhiệm". Nó là một giả định về nhân quả:

> Người đó đã hành động hợp lý với thông tin và công cụ họ có lúc đó. Nếu hành động đó gây ra sự cố, thì **hệ thống** đã cho phép nó xảy ra.

Lý do không phải vì tử tế, mà vì hiệu quả: nhóm sợ bị quy tội sẽ **che thông tin**, và bạn mất đúng thứ bạn cần để sửa. Sự cố tiếp theo sẽ xảy ra với ít dữ liệu hơn.

```
❌ "Hà chạy migration sai giờ cao điểm."
✅ "Migration chạy được vào giờ cao điểm mà không có cảnh báo nào, và không có
   bước xác nhận. Một người mới trong nhóm không có cách nào biết điều đó là
   nguy hiểm."
```

Câu thứ hai dẫn tới một việc sửa được. Câu thứ nhất dẫn tới một người sợ.

### "Vì sao" năm lần, đi tới hệ thống

```
Checkout lỗi
 └─ Vì sao? Database hết kết nối
     └─ Vì sao? Một truy vấn báo cáo chạy 40 giây, giữ kết nối
         └─ Vì sao? Truy vấn thiếu index sau khi bảng lớn lên
             └─ Vì sao? Không ai theo dõi truy vấn chậm
                 └─ Vì sao? Không có báo động cho p99 truy vấn
```

Điểm dừng đúng là chỗ bạn tìm được **thứ sửa được và ngăn được cả một lớp sự cố**, không phải chỗ tìm ra ai gõ lệnh. Ở đây có ba việc sửa ở ba tầng khác nhau: thêm index (sửa ca này), báo động truy vấn chậm (bắt ca sau), bulkhead cho pool báo cáo (chặn lớp sự cố này) — xem [[thiet-ke-cho-that-bai]].

### Cấu trúc một bản hậu kiểm

```markdown
## Tóm tắt
Checkout lỗi 12% trong 11 phút (14:02–14:13). ~180 đơn hàng thất bại.

## Ảnh hưởng
- 180 đơn thất bại, người dùng thấy lỗi 500
- Không có đơn nào bị trừ tiền hai lần (đã kiểm tra)
- Error budget tháng: dùng 11 phút / 43 phút

## Dòng thời gian
(ghi lúc đang xảy ra)

## Nguyên nhân
Truy vấn báo cáo mới thiếu index; bảng orders vượt 2 triệu dòng nên nó
chuyển sang seq scan, mỗi lần chạy giữ kết nối 40 giây.

## Cái gì đã hoạt động tốt
- Báo động kích hoạt trong 60 giây
- Rollback mất 2 phút
(phần này phải có: nó cho biết cái gì ĐANG hiệu quả và đừng bỏ)

## Việc phải làm
| Việc | Người | Hạn | Loại |
|---|---|---|---|
| Thêm index cho truy vấn báo cáo | Hà | 19/8 | Sửa ca này |
| Báo động p99 truy vấn > 5s | Kiệt | 26/8 | Phát hiện sớm |
| Pool riêng cho báo cáo | Nam | 5/9 | Chặn lớp sự cố |
| `statement_timeout` cho role báo cáo | Hà | 22/8 | Giới hạn thiệt hại |
```

Hai phần bị bỏ nhiều nhất và đều quan trọng: **"cái gì đã hoạt động tốt"** (không có nó, người ta chỉ nhớ thất bại và có thể bỏ đi những thứ đang hiệu quả), và **người + hạn cụ thể** cho từng việc. Hậu kiểm không có tên và hạn là một bài văn, không phải một kế hoạch.

## Việc phải làm mà không ai làm

Đây là chỗ quy trình hậu kiểm chết ở phần lớn công ty. Hai biện pháp:

- Đưa việc vào **cùng backlog** với tính năng, không phải một danh sách riêng bị lãng quên
- Rà lại trong retro tiếp theo: bao nhiêu việc từ hậu kiểm trước đã xong?

Cùng một sự cố xảy ra lần thứ hai là dấu hiệu rõ nhất cho thấy quy trình hậu kiểm của bạn chỉ là hình thức.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| IC vừa chỉ huy vừa gõ | Không ai theo dõi toàn cảnh | Tách vai |
| Điều tra nguyên nhân trước khi khôi phục | Sự cố dài gấp 10 lần | Rollback trước |
| Nhiều người sửa cùng lúc | Không biết cái gì có tác dụng | Một thay đổi một lúc |
| Im lặng với bên ngoài | Mất tin cậy nhiều hơn chính sự cố | Cập nhật đều, có hẹn giờ |
| Đoán nguyên nhân công khai | Phải rút lại, mất tin cậy | Chỉ nói cái đã chắc |
| Hậu kiểm chỉ ra người | Nhóm che thông tin | Chỉ ra lỗ hổng hệ thống |
| Dựng dòng thời gian sau | Thiếu và thiên vị | Ghi lúc đang xảy ra |
| Việc phải làm không có tên/hạn | Không ai làm, sự cố lặp lại | Đưa vào backlog chính |
| Bỏ phần "cái gì đã tốt" | Bỏ mất thứ đang hiệu quả | Luôn có phần đó |

## Ghi nhớ

- IC không gõ. Đó là quy tắc quan trọng nhất của việc dẫn sự cố.
- Khôi phục trước, hiểu sau — rollback không cần biết nguyên nhân.
- Không quy tội là vì **hiệu quả**: nhóm sợ thì che thông tin bạn cần.
- Hậu kiểm không có tên và hạn cho từng việc là một bài văn, không phải kế hoạch.

## Tự kiểm tra

1. Vì sao người giỏi nhất về hệ thống thường không nên làm IC?
2. Vì sao rollback đứng trước việc tìm nguyên nhân?
3. "Không quy tội" mang lại lợi ích thực dụng gì, ngoài chuyện tử tế?
