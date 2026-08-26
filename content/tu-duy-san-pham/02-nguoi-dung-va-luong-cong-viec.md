---
title: Người dùng và luồng công việc
slug: nguoi-dung-va-luong-cong-viec
summary: Ai dùng, họ đang làm gì trước và sau — và vì sao tính năng đúng vẫn có thể không được dùng.
level: co-ban
tags: [san-pham, tu-duy, thiet-ke, nguoi-dung]
khung: v2
---

> **Sau bài này bạn sẽ:** mô tả được luồng công việc quanh một tính năng, và biết vì sao tính năng đúng vẫn có thể không được dùng.

## Ý tưởng chính

Một tính năng không tồn tại một mình. Nó nằm **giữa một chuỗi việc** người dùng đang làm.

Nên câu hỏi không chỉ là "tính năng này có đúng không" mà **"nó có khớp vào luồng công việc của họ không"** — và một tính năng đúng nhưng đặt sai chỗ trong luồng sẽ không được dùng.

## Mental model

Hãy nghĩ tới **đặt một cái thùng rác trong nhà**.

> Thùng rác là thứ hữu ích, ai cũng cần. Nhưng nếu bạn đặt nó ở tầng hai trong khi mọi người ăn ở tầng một, họ sẽ **để rác trên bàn**.
>
> Không phải thùng rác sai. Không phải người dùng lười. Nó **không nằm trên đường họ đi**.
>
> Và người thiết kế giỏi không hỏi "thùng rác có tốt không". Họ nhìn xem **mọi người đi những đường nào**, rồi đặt thùng ở đó.

Đó là toàn bộ nội dung của bài: tính năng phải nằm **trên đường người dùng đã đi**, không phải ở nơi bạn thấy hợp lý.

## Ví dụ nhỏ

```text
Tính năng: trang "Báo cáo tồn kho" rất chi tiết, đầy đủ.
Thực tế:   nhân viên kho làm việc trên điện thoại, giữa các kệ,
           và họ cần biết một con số: còn bao nhiêu.
⇒ Trang báo cáo đúng nội dung, sai luồng. Họ vẫn gọi điện hỏi.
```

## Code chạy thế nào

**Ba câu hỏi về luồng công việc:**

```text
① TRƯỚC ĐÓ họ đang làm gì?
   Họ đến tính năng này từ đâu? Đang ở giữa việc gì?

② SAU ĐÓ họ làm gì?
   Kết quả của tính năng này dùng để làm gì tiếp?
   ⇒ Câu này hay bị bỏ, và nó quyết định ĐỊNH DẠNG đầu ra.

③ Họ làm việc này ở ĐÂU, trong hoàn cảnh nào?
   Máy tính hay điện thoại? Ngồi yên hay đang di chuyển?
   Có thời gian hay đang gấp?
```

**Câu ② nhìn kỹ:**

```text
"Xuất báo cáo tồn kho" — sau đó họ làm gì?

  → Dán vào email gửi nhà cung cấp
    ⇒ Cần định dạng dán được, không cần file
  → Nhập vào hệ thống kế toán
    ⇒ Cần đúng định dạng hệ thống đó nhận
  → Đọc để quyết định đặt hàng
    ⇒ Cần thấy "cái nào sắp hết", không cần cả bảng

⇒ Ba câu trả lời ⇒ ba tính năng khác nhau hoàn toàn.
```

## Cú pháp

**Vẽ luồng — đơn giản và đủ:**

```text
Không cần công cụ gì. Viết ra các bước:

  ① Nhân viên nhận đơn qua điện thoại
  ② Kiểm tồn kho          ← chỗ tính năng của bạn
  ③ Báo giá cho khách
  ④ Ghi đơn vào hệ thống
  ⑤ In phiếu xuất kho

Rồi hỏ ba câu ở mỗi bước:
  □ Bước này mất bao lâu?
  □ Chỗ nào họ hay vấp?
  □ Chỗ nào họ đang làm thủ công hoặc làm ngoài hệ thống?
```

```text
Câu thứ ba là câu chỉ ra cơ hội rõ nhất: nơi người dùng đang
dùng Excel riêng, ghi giấy, hoặc gọi điện là nơi hệ thống
chưa phục vụ được họ.
```

**Ba lý do tính năng đúng vẫn không được dùng:**

```text
① SAI CHỖ TRONG LUỒNG
   Đúng nội dung, nhưng phải rời khỏi việc đang làm để tới đó.
   ⇒ Ba lần bấm chuyển trang là đủ để người ta quay về cách cũ.

② SAI HOÀN CẢNH
   Thiết kế cho máy tính, dùng trên điện thoại.
   Thiết kế cho lúc rảnh, dùng lúc đang gấp.

③ KHÔNG BIẾT LÀ CÓ
   Tính năng tồn tại, không ai nói với họ.
   ⇒ Lý do đơn giản nhất và phổ biến nhất — và thường không
     được xét tới khi tính năng "thất bại".
```

**Phân biệt người dùng — thường không phải một nhóm:**

```text
Cùng một hệ thống, ba nhóm rất khác nhau:
  Nhân viên nhập liệu    → dùng cả ngày, cần NHANH, cần phím tắt
  Quản lý                → dùng mỗi tuần, cần TỔNG QUAN
  Khách hàng             → dùng một lần, cần RÕ RÀNG, không cần học

⇒ Tối ưu cho nhóm này thường làm tệ cho nhóm kia.
⇒ Nên phải biết tính năng này cho AI, và chấp nhận nó không
  tối ưu cho nhóm khác.
```

```text
Sai lầm phổ biến: thiết kế cho "người dùng" chung chung.
Kết quả là một thứ trung bình, không nhóm nào thấy tiện.
```

**Hỏi người dùng thật — hai câu tốt và hai câu tệ:**

```text
✅ "Hôm qua bạn làm việc này thế nào? Kể mình nghe từng bước."
   ⇒ Hỏi về HÀNH VI ĐÃ XẢY RA, cụ thể, kiểm chứng được.
✅ "Chỗ nào trong việc này làm bạn mất thời gian nhất?"

❌ "Bạn có muốn có tính năng X không?"
   ⇒ Gần như ai cũng nói có. Không có thông tin.
❌ "Bạn sẽ dùng cái này không?"
   ⇒ Người ta dự đoán hành vi của mình rất kém.
```

Nguyên tắc: **hỏi về quá khứ cụ thể, không hỏi về tương lai giả định**.

## Tại sao cần nó

Vì tính năng không được dùng là chi phí lặp lại, không phải chi phí một lần:

```text
Tính năng không ai dùng vẫn phải:
  □ bảo trì khi đổi thứ khác
  □ test
  □ giữ tương thích
  □ và nó làm giao diện phức tạp hơn cho mọi người

⇒ Nên "làm thêm cho chắc" không phải lựa chọn trung tính
  ([[no-ky-thuat-va-refactor]]).
```

**Ba việc rẻ mà hiệu quả:**

```text
① NGỒI XEM một người dùng làm việc, 30 phút
   ⇒ Bạn sẽ thấy những thứ họ không nghĩ để kể: chỗ họ vấp,
     chỗ họ mở Excel riêng, chỗ họ gọi điện.
   ⇒ Ba mươi phút này thường đổi cả thiết kế.

② ĐO xem tính năng có được dùng không
   Bao nhiêu người, bao nhiêu lần, có quay lại không.
   ⇒ Không đo thì bạn không biết mình đúng hay sai.

③ HỎI những người KHÔNG dùng
   Họ cho biết lý do thật — thường là một trong ba lý do ở trên,
   và thường là lý do ③ (không biết là có).
```

**Và một điều về giá trị của việc này với lập trình viên:**

```text
Hiểu luồng công việc không phải việc của người khác. Nó là thứ
làm bạn viết đúng thứ cần viết.

⇒ Người viết mã hiểu người dùng đưa ra hàng trăm quyết định nhỏ
  đúng hơn: mặc định nào, thứ tự trường nào, thông báo lỗi nào.
⇒ Những quyết định đó không nằm trong yêu cầu, và không ai
  duyệt chúng. Chúng chỉ đúng nếu bạn hiểu người dùng
  ([[hieu-vi-sao-truoc-khi-lam-gi]]).
```

## So sánh

| Cách tìm hiểu | Độ tin cậy | Chi phí |
|---|---|---|
| Ngồi xem người dùng làm | **cao nhất** | 30 phút |
| Hỏi về hành vi đã xảy ra | cao | thấp |
| Đo dữ liệu sử dụng | cao | cần chuẩn bị |
| Hỏi "bạn có muốn X không" | **rất thấp** | thấp |
| Tự suy đoán | thấp | 0 |

## Dễ nhầm

**1. Chỉ nghĩ về tính năng, không nghĩ về luồng quanh nó.**

**2. Không hỏi "sau đó họ làm gì".** Nó quyết định định dạng đầu ra.

**3. Bỏ qua hoàn cảnh dùng.** Điện thoại, đang gấp, đang di chuyển.

**4. Thiết kế cho "người dùng" chung chung.** Ra một thứ trung bình.

**5. Không xét lý do "không ai biết là có".**

**6. Hỏi "bạn có muốn X không".** Ai cũng nói có.

**7. Không bao giờ ngồi xem người dùng làm việc.**

**8. Không đo xem tính năng có được dùng không.**

**9. Không hỏi những người không dùng.**

**10. Coi tính năng không ai dùng là trung tính.**

## Mẹo nhớ

> **Tính năng phải nằm TRÊN ĐƯỜNG người dùng đã đi, không ở nơi bạn thấy hợp lý.**
>
> **Hỏi "SAU ĐÓ họ làm gì" — nó quyết định định dạng đầu ra.**
>
> **Hỏi về QUÁ KHỨ CỤ THỂ, không hỏi về tương lai giả định.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba câu hỏi về luồng công việc, câu nào hay bị bỏ?
2. Ba lý do tính năng đúng vẫn không được dùng?
3. Vì sao không nên thiết kế cho "người dùng" chung chung?
4. Hai câu hỏi tốt và hai câu tệ khi phỏng vấn người dùng?
5. Ba việc rẻ mà hiệu quả?

## Tự viết lại

Bạn sắp làm tính năng "lịch sử thay đổi đơn hàng". Không nhìn lại, viết:

```text
① luồng công việc quanh nó, các bước trước và sau
② ba nhóm người dùng và nhu cầu khác nhau của họ
③ ba câu hỏi bạn đặt cho người dùng thật
④ đo gì để biết tính năng có được dùng
```

Tự kiểm: ở ②, nếu bạn tối ưu cho nhóm thứ nhất, nhóm nào bị ảnh hưởng — và bạn chấp nhận điều đó không?

## Thử sức

Đội bạn làm một trang thống kê rất đầy đủ cho quản lý cửa hàng. Sau ba tháng, dữ liệu cho thấy chỉ 4% quản lý mở nó, và trong số đó không ai mở lần thứ hai.

Ba câu để trả lời: ba giả thuyết cho hiện tượng này, và cách kiểm từng cái; bạn tìm hiểu bằng phương pháp nào; và bạn quyết định giữ, sửa, hay bỏ dựa trên gì. Câu khó nhất: nếu lý do là "quản lý xem số liệu trên điện thoại lúc đang ở cửa hàng", trang thống kê đầy đủ trên máy tính có sửa được không — hay bạn cần một thứ khác hẳn?
