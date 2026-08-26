---
title: Chi phí hạ tầng
slug: chi-phi-ha-tang
summary: Đọc hoá đơn cloud, tìm chỗ đốt tiền, và coi chi phí là một yêu cầu kỹ thuật thay vì việc của kế toán.
level: nang-cao
tags: [van-hanh, chi-phi, cloud, finops]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được hoá đơn cloud, tìm ra chỗ đốt tiền, và coi chi phí là một ràng buộc thiết kế.

## Ý tưởng chính

Chi phí hạ tầng là **hệ quả của các quyết định kỹ thuật**, không phải một dòng trong bảng kế toán.

Chọn kiểu máy, thiết kế truy vấn, đặt TTL cache, quyết định lưu log bao lâu — mỗi cái đều là một quyết định về tiền. Người kỹ sư ra quyết định đó, nên người kỹ sư phải nhìn thấy giá của nó.

## Mental model

Hãy nghĩ tới **hoá đơn điện nhà bạn**.

> Hoá đơn chỉ có một con số. Nó không nói cho bạn biết máy lạnh chiếm bao nhiêu, tủ lạnh bao nhiêu, bình nóng lạnh bao nhiêu.
>
> Cho tới khi bạn **gắn công tơ riêng cho từng nhánh**. Lúc đó thường có một bất ngờ: cái tốn nhất không phải cái bạn nghĩ.
>
> Và một chi tiết nữa: cái đèn hành lang bạn quên tắt suốt sáu tháng vẫn đang tính tiền, dù không ai đi qua đó.

Gắn thẻ (tag) tài nguyên chính là gắn công tơ riêng. Còn cái đèn quên tắt là tài nguyên mồ côi — hạng mục lãng phí lớn nhất ở gần như mọi tài khoản cloud.

## Ví dụ nhỏ

```text
Hoá đơn tháng: 8.400 USD
  Compute       3.200   (38%)
  CSDL          2.100   (25%)
  Truyền dữ liệu 1.800  (21%)   ← thường bị bỏ qua
  Lưu trữ       1.100   (13%)
  Khác            200
```

## Code chạy thế nào

**Bốn nguồn lãng phí lớn nhất, theo thứ tự:**

```text
① TÀI NGUYÊN MỒ CÔI                thường 10–30% hoá đơn
   Đĩa của máy đã xoá, snapshot cũ, IP tĩnh không gắn vào đâu,
   load balancer không có backend, môi trường test của dự án đã đóng.
   ⇒ Không ai dùng, vẫn tính tiền hằng giờ.

② CẤP DƯ NHIỀU
   Máy 16 CPU dùng 8% CPU. Đặt cỡ theo "phòng khi cần" chứ không theo đo.
   ⇒ Xem biểu đồ 30 ngày, hạ cấp theo p95 chứ không theo đỉnh tuyệt đối.

③ MÔI TRƯỜNG KHÔNG SẢN XUẤT CHẠY 24/7
   Dev và staging chạy cả đêm, cả cuối tuần.
   Tắt ngoài giờ ⇒ tiết kiệm ~70% phần đó.

④ TRUYỀN DỮ LIỆU
   Vào thường miễn phí. RA và LIÊN VÙNG rất đắt.
   ⇒ Dòng này hay là bất ngờ lớn nhất khi đọc hoá đơn lần đầu.
```

Thứ tự này quan trọng: nhiều đội bắt đầu bằng việc tối ưu mã, trong khi hai mục đầu thường cho mức tiết kiệm lớn hơn với ít công hơn nhiều.

**Truyền dữ liệu — vì sao nó đắt bất ngờ:**

```text
Trong cùng một vùng khả dụng      thường miễn phí
Giữa các vùng khả dụng            có phí
Giữa các vùng địa lý              đắt
Ra Internet                       đắt nhất

Kịch bản thật:
  Ứng dụng ở vùng A, CSDL ở vùng B "cho an toàn"
  ⇒ MỌI truy vấn đều là truyền liên vùng
  ⇒ vừa chậm hơn, vừa tốn tiền, mỗi ngày.
```

Và cách giảm hiệu quả nhất thường không phải đổi kiến trúc mà là **CDN**: đẩy dữ liệu tĩnh ra biên, giảm cả chi phí lẫn độ trễ ([[cache-nhieu-tang]]).

## Cú pháp

**Đọc hoá đơn theo ba câu hỏi:**

```text
① Dòng nào LỚN NHẤT?          → chỗ đáng tối ưu
② Dòng nào TĂNG NHANH NHẤT?   → chỗ sắp thành vấn đề
③ Dòng nào KHÔNG GIẢI THÍCH ĐƯỢC?  → thường là tài nguyên mồ côi
```

Câu ② đáng chú ý: một dòng nhỏ tăng 40% mỗi tháng sẽ vượt dòng lớn nhất trong nửa năm — và lúc đó sửa khó hơn nhiều.

**Gắn thẻ — điều kiện để mọi phân tích khác có nghĩa:**

```text
Mọi tài nguyên phải có:
  team, service, environment, owner

Không có thẻ ⇒ hoá đơn là MỘT con số ⇒ không ai chịu trách nhiệm
⇒ và không ai biết cái gì xoá được.
```

**Mô hình mua — chọn theo tính chất tải:**

```text
On-demand     linh hoạt, đắt nhất       → tải thất thường, mới bắt đầu
Reserved/Savings Plan  cam kết 1–3 năm, rẻ hơn 30–70%
              → tải nền ỔN ĐỊNH, đã biết rõ
Spot          rẻ hơn tới 90%, CÓ THỂ BỊ THU HỒI
              → job xử lý lô, CI, thứ chịu được gián đoạn
Serverless    trả theo lần dùng          → tải không đều, ít
```

Mẫu thường đúng: **reserved cho phần tải nền, on-demand cho phần đỉnh, spot cho job nền**.

**Quy tắc kiểm tra nhanh trước khi tối ưu:**

```text
Chi phí hạ tầng < 20% lương đội  → tối ưu chi phí thường không đáng
                                    thời gian kỹ sư.
Chi phí > lương đội              → đây là vấn đề kỹ thuật ưu tiên cao.
```

Con số này giữ cho việc tối ưu chi phí không trở thành một dạng tối ưu sớm. Hai ngày kỹ sư để tiết kiệm 50 USD/tháng là một khoản lỗ.

## Tại sao cần nó

Vì chi phí nên là một **ràng buộc thiết kế**, giống như độ trễ hay tính đúng đắn:

```text
Khi thiết kế, hỏi luôn:
  "Chỗ này tốn bao nhiêu ở quy mô 10 lần hiện tại?"

Ví dụ:
  Lưu mọi log DEBUG ⇒ 50 USD/tháng hôm nay, 5.000 USD khi lớn gấp 100.
  Lấy mẫu 1% log DEBUG ⇒ vẫn đủ để điều tra, rẻ hơn 100 lần.
```

**Chi phí "vô hình" hay bị bỏ sót:**

```text
□ Snapshot và bản sao lưu tích tụ nhiều năm
□ Log giữ 365 ngày trong khi chỉ cần 30
□ Chỉ mục tìm kiếm cho dữ liệu không ai tìm
□ CSDL cấp dư "cho chắc"
□ Môi trường của dự án đã đóng, không ai nhớ để xoá
□ Truy vấn N+1 làm CSDL phải to hơn cần thiết  ← chi phí gián tiếp
```

Dòng cuối nối chi phí với hiệu năng: **tối ưu truy vấn thường là cách giảm chi phí hiệu quả nhất**, vì nó cho phép hạ cấp máy chứ không chỉ tiết kiệm vài phần trăm ([[hieu-nang-va-do-luong]]).

**Đưa chi phí vào tầm nhìn của đội:**

```text
□ Bảng chi phí theo service, hiển thị hằng tuần
□ Cảnh báo khi vượt ngân sách hoặc tăng bất thường
□ Ước lượng chi phí trong ADR cho quyết định lớn
□ Một người phụ trách rà soát mỗi tháng
```

Điểm mấu chốt: đội **không nhìn thấy** chi phí thì không tối ưu được nó, dù có muốn.

## So sánh

| Mô hình | Giá | Rủi ro | Dùng cho |
|---|---|---|---|
| On-demand | cao nhất | không | tải thất thường |
| Reserved | −30–70% | cam kết dài | tải nền ổn định |
| Spot | −90% | bị thu hồi | job lô, CI |
| Serverless | theo lần dùng | cold start | tải ít, không đều |

## Dễ nhầm

**1. Không gắn thẻ tài nguyên.** Hoá đơn là một con số, không ai chịu trách nhiệm.

**2. Bỏ qua tài nguyên mồ côi.** Thường 10–30% hoá đơn.

**3. Quên chi phí truyền dữ liệu.** Bất ngờ lớn nhất khi đọc hoá đơn.

**4. Đặt cỡ theo cảm giác.** Máy 16 CPU dùng 8%.

**5. Dev/staging chạy 24/7.**

**6. Mua reserved cho tải chưa ổn định.** Cam kết sai thì mất tiền chắc chắn.

**7. Giữ log và snapshot vĩnh viễn.**

**8. Tối ưu chi phí khi nó nhỏ hơn nhiều so với lương đội.** Lỗ thời gian kỹ sư.

**9. Không cảnh báo ngân sách.** Phát hiện vào cuối tháng.

**10. Coi chi phí là việc của tài chính.** Người ra quyết định kỹ thuật mới sửa được.

## Mẹo nhớ

> **Chi phí là HỆ QUẢ của quyết định kỹ thuật. Kỹ sư phải nhìn thấy nó.**
>
> **Bốn nguồn lãng phí: mồ côi, cấp dư, môi trường 24/7, truyền dữ liệu.**
>
> **Không gắn thẻ thì không phân tích được gì.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn nguồn lãng phí lớn nhất, theo thứ tự?
2. Vì sao chi phí truyền dữ liệu hay gây bất ngờ?
3. Ba câu hỏi khi đọc hoá đơn?
4. Bốn mô hình mua, mỗi cái hợp với tải nào?
5. Khi nào tối ưu chi phí **không** đáng làm?

## Tự viết lại

Hoá đơn 12.000 USD/tháng, tăng 15% mỗi tháng, đội 6 người. Không nhìn lại, viết kế hoạch:

```text
① điều tra gì trước
② ba biện pháp có tác động nhanh nhất
③ ba biện pháp dài hạn
④ ngăn nó tăng lại bằng cách nào
```

Tự kiểm: với đội 6 người, mức 12.000 USD/tháng có đáng ưu tiên không — bạn dựa vào đâu để nói vậy?

## Thử sức

Hoá đơn tháng này **gấp đôi** tháng trước, không ai biết vì sao.

Ba câu để trả lời: bạn điều tra thế nào **ngay hôm nay**; ba nguyên nhân khả dĩ nhất và cách kiểm từng cái; và bạn ngăn "bất ngờ hoá đơn" tái diễn bằng cách nào. Câu khó nhất: nếu nguyên nhân hoá ra là một tính năng mới **hợp lệ** và đang được dùng nhiều, bạn báo cáo điều đó thế nào — và đề xuất gì?
