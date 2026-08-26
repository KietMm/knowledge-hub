---
title: Khai báo công cụ tốt
slug: khai-bao-cong-cu-tot
summary: Mô tả công cụ là prompt — tên, mô tả, tham số quyết định mô hình chọn đúng hay sai.
level: trung-cap
tags: [ai, function-calling, thiet-ke, prompt]
khung: v2
---

> **Sau bài này bạn sẽ:** viết khai báo công cụ mà mô hình chọn đúng, và biết vì sao 20 công cụ tệ hơn 5 công cụ.

## Ý tưởng chính

Mô hình chọn công cụ dựa **hoàn toàn** vào tên, mô tả và schema tham số bạn viết. Nó không đọc mã của hàm.

Nên **khai báo công cụ chính là prompt** — và mọi nguyên tắc viết prompt tốt đều áp dụng: rõ ràng, cụ thể, nói rõ khi nào dùng và khi nào không.

## Mental model

Hãy nghĩ tới **danh sách phòng ban dán ở sảnh toà nhà**.

> Khách cần giải quyết một việc. Họ đọc bảng và tự chọn phòng.
>
> **Bảng tệ**: "Phòng A", "Phòng B", "Phòng Tổng hợp". Khách đoán, đi nhầm, quay lại, đi tiếp.
>
> **Bảng tốt**: "Phòng 201 — Đăng ký và gia hạn thẻ. Mất thẻ thì lên phòng 305." Khách đi đúng ngay lần đầu.
>
> Và nếu bảng có **40 dòng**, khách sẽ đọc lướt và chọn dòng nghe hợp lý nhất — kể cả khi dòng đúng nằm ở cuối.

Ba điều đó ánh xạ đúng: mô tả mơ hồ ⇒ chọn sai; mô tả nói rõ ranh giới ⇒ chọn đúng; quá nhiều lựa chọn ⇒ chọn theo cái nghe hợp lý nhất.

## Ví dụ nhỏ

```json
❌ { "name": "get_data", "description": "Lấy dữ liệu" }

✅ { "name": "tra_don_hang",
     "description": "Tra trạng thái và lịch sử giao của MỘT đơn hàng theo mã đơn. Dùng khi người dùng hỏi về đơn cụ thể và đã cung cấp mã đơn. KHÔNG dùng để tìm danh sách đơn — dùng liet_ke_don_hang." }
```

## Code chạy thế nào

**Bốn phần của một khai báo tốt:**

```text
① TÊN — động từ + đối tượng, cụ thể
   ❌ get_data, process, handle
   ✅ tra_don_hang, tao_ticket_ho_tro, tinh_phi_van_chuyen

② MÔ TẢ — ba việc trong một đoạn
   - làm gì
   - DÙNG KHI NÀO
   - KHÔNG dùng khi nào, và dùng cái gì thay thế
   ⇒ Vế thứ ba hay bị bỏ và là vế giá trị nhất khi có
     nhiều công cụ gần giống nhau.

③ THAM SỐ — schema có mô tả cho TỪNG trường
   Kiểu, định dạng, ví dụ, giá trị cho phép

④ CÁI GÌ TRẢ VỀ — nói ngắn trong mô tả
   "Trả về trạng thái, ngày dự kiến giao và vị trí hiện tại."
   ⇒ Giúp mô hình biết có cần gọi thêm công cụ khác không.
```

**Mô tả tham số quyết định mô hình điền đúng hay sai:**

```json
{
  "maDon": {
    "type": "string",
    "description": "Mã đơn hàng, định dạng 3 chữ cái + 3 số, ví dụ ABC123. Lấy chính xác từ tin nhắn người dùng, không tự tạo."
  },
  "tuNgay": {
    "type": "string",
    "description": "Ngày bắt đầu, định dạng YYYY-MM-DD. Nếu người dùng nói 'tháng này', dùng ngày 1 của tháng hiện tại."
  },
  "trangThai": {
    "type": "string",
    "enum": ["cho-xac-nhan", "dang-giao", "da-giao", "da-huy"],
    "description": "Lọc theo trạng thái. Bỏ trống để lấy tất cả."
  }
}
```

```text
Ba chi tiết đáng chú ý:
  □ "không tự tạo" — chống mô hình bịa mã đơn khi người dùng
    chưa cung cấp
  □ Hướng dẫn xử lý cách nói tự nhiên ("tháng này")
    ⇒ Nếu không, mô hình tự đoán, và mỗi lần một kiểu.
  □ `enum` — ràng buộc cứng, mô hình không bịa được giá trị lạ
```

`enum` là công cụ mạnh nhất trong schema tham số: nó loại bỏ hẳn một loại lỗi thay vì chỉ giảm nó.

## Cú pháp

**Số lượng công cụ — vì sao ít hơn thường tốt hơn:**

```text
Nhiều công cụ gây ba vấn đề:
  ① Mô hình chọn sai nhiều hơn — nhất là khi các mô tả chồng lấn
  ② Mô tả chiếm token ở MỌI lời gọi, kể cả khi không dùng
  ③ Khó test: 20 công cụ là 20 đường đi cần kiểm

Kinh nghiệm:
  ≤ 10 công cụ  → thường ổn
  10–20         → cần mô tả rất rõ ranh giới giữa chúng
  > 20          → cân nhắc GỘP hoặc ĐỊNH TUYẾN
```

```text
Hai cách xử lý khi thật sự cần nhiều:
  □ GỘP: `tim_kiem(loai, tieu_chi)` thay vì 8 hàm tìm riêng
    ⇒ Nhưng đừng gộp quá tay thành một công cụ vạn năng —
      lúc đó mô tả lại mơ hồ.
  □ ĐỊNH TUYẾN: một lời gọi phân loại ý định trước, rồi chỉ đưa
    5 công cụ liên quan vào lời gọi sau.
```

**Một công cụ làm MỘT việc:**

```text
❌ quan_ly_don_hang(hanh_dong, ...)
   với hanh_dong ∈ {tra, huy, doi_dia_chi, hoan_tien}
   ⇒ Mô tả phải giải thích bốn hành vi khác nhau ⇒ mơ hồ.
   ⇒ Và kiểm quyền phức tạp: mỗi hành động một quyền khác nhau.

✅ tra_don_hang, huy_don_hang, doi_dia_chi_giao
   ⇒ Mỗi cái có mô tả rõ, có quyền riêng, và bạn kiểm soát được
     cái nào cho phép, cái nào cần người duyệt.
```

Điểm về **quyền** là lý do mạnh nhất để tách: một công cụ chỉ đọc và một công cụ thay đổi dữ liệu nên là hai thứ khác nhau ([[xac-thuc-va-gioi-han-cong-cu]]).

**Tách rõ công cụ ĐỌC và công cụ GHI:**

```text
ĐỌC   tra cứu, tìm kiếm, tính toán
      ⇒ Rủi ro thấp. Cho phép tự chạy được.

GHI   tạo, sửa, xoá, gửi
      ⇒ Có tác dụng phụ, khó quay lui.
      ⇒ Cần xác nhận, hoặc ít nhất cần idempotency và log đầy đủ.

⇒ Đặt tên và mô tả sao cho ranh giới này RÕ ngay khi nhìn
  danh sách công cụ.
```

**Hướng dẫn xử lý khi thiếu thông tin — đưa vào mô tả:**

```text
"Nếu người dùng chưa cung cấp mã đơn, HÃY HỎI LẠI thay vì
 gọi công cụ này."

⇒ Không nói ra thì mô hình có thể gọi với mã bịa, hoặc với
  chuỗi rỗng.
⇒ Đây là một trong những dòng có tác dụng lớn nhất trong
  mô tả công cụ.
```

## Tại sao cần nó

Vì lỗi "chọn sai công cụ" và "điền sai tham số" chiếm phần lớn ca hỏng, và cả hai đều sửa được bằng khai báo:

```text
Triệu chứng thường gặp:
  □ Mô hình gọi công cụ sai        → mô tả không rõ ranh giới
  □ Điền tham số sai định dạng     → thiếu mô tả và ví dụ trong schema
  □ Bịa giá trị tham số            → thiếu enum, thiếu "đừng tự tạo"
  □ Gọi công cụ khi không cần      → mô tả thiếu vế "không dùng khi nào"
  □ Không gọi khi cần              → mô tả không nói rõ dùng khi nào

⇒ Cả năm đều sửa ở KHAI BÁO, không sửa ở prompt hệ thống.
```

**Cách cải thiện có phương pháp:**

```text
① Ghi log MỌI lần gọi công cụ: tên, tham số, kết quả, và câu hỏi gốc
② Định kỳ đọc log, tìm ca chọn sai hoặc điền sai
③ Tìm MẪU: các ca sai có điểm chung gì?
④ Sửa MÔ TẢ nhắm vào mẫu đó, không nhắm vào từng ca
⑤ Chạy bộ ca kiểm để chắc không làm hỏng ca đang đúng
   ([[lap-va-cai-thien-prompt]])
```

Bước ① là điều kiện cho mọi bước sau. Không log tham số thì bạn chỉ biết "trợ lý trả lời sai", không biết vì sao.

## So sánh

| | Khai báo mơ hồ | Khai báo tốt |
|---|---|---|
| Tên | `get_data` | `tra_don_hang` |
| Mô tả | "lấy dữ liệu" | làm gì + khi nào + khi nào không |
| Tham số | `{type: string}` | có mô tả, ví dụ, enum |
| Mô hình chọn đúng | thấp | cao |
| Sửa khi sai | prompt hệ thống | **mô tả công cụ** |

## Dễ nhầm

**1. Tên chung chung.** `process`, `handle`, `get_data`.

**2. Mô tả không nói KHI NÀO dùng.**

**3. Không nói KHI NÀO KHÔNG dùng.** Mô hình chọn nhầm giữa các công cụ gần giống.

**4. Tham số không có mô tả.**

**5. Không dùng `enum` khi có tập giá trị cố định.**

**6. Không hướng dẫn xử lý cách nói tự nhiên.** "Tháng này" mỗi lần một kiểu.

**7. Không nói "đừng tự tạo giá trị".** Mô hình bịa mã đơn.

**8. Một công cụ làm nhiều việc.** Mô tả mơ hồ, quyền phức tạp.

**9. Không tách công cụ đọc và ghi.**

**10. Không log tham số của mỗi lần gọi.** Không cải thiện được.

## Mẹo nhớ

> **Khai báo công cụ CHÍNH LÀ prompt. Mô hình chỉ đọc tên, mô tả, schema.**
>
> **Mô tả phải có ba vế: làm gì, DÙNG KHI NÀO, KHÔNG dùng khi nào.**
>
> **`enum` loại bỏ hẳn một loại lỗi. Dùng nó ở mọi chỗ có tập giá trị cố định.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn phần của một khai báo công cụ tốt?
2. Vì sao vế "không dùng khi nào" quan trọng?
3. Ba vấn đề khi có quá nhiều công cụ, hai cách xử lý?
4. Vì sao tách công cụ đọc và công cụ ghi?
5. Năm triệu chứng đều sửa ở khai báo, không ở prompt hệ thống?

## Tự viết lại

Không nhìn lại, viết khai báo đầy đủ cho hai công cụ của một trợ lý đặt lịch khám:

```text
① tim_lich_trong — tìm khung giờ còn trống
② dat_lich — đặt một khung giờ
```

Với mỗi cái: tên, mô tả ba vế, schema tham số có mô tả và enum, và nói rõ trả về gì.

Tự kiểm: mô tả của `dat_lich` có nói rõ phải làm gì khi người dùng chưa chọn giờ cụ thể không?

## Thử sức

Trợ lý của bạn có 18 công cụ. Log cho thấy 25% lần gọi là chọn sai công cụ, chủ yếu nhầm giữa bốn công cụ tìm kiếm khác nhau.

Ba câu để trả lời: bạn chẩn đoán bằng dữ liệu nào; hai hướng xử lý và đánh đổi của mỗi cái; và bạn xác nhận cải thiện bằng cách nào. Câu khó nhất: nếu gộp bốn công cụ tìm kiếm thành một, bạn được gì và **mất** gì — và điều gì trong bốn công cụ đó quyết định việc gộp có an toàn hay không?
