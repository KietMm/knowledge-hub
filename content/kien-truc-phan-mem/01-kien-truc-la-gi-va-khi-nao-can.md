---
title: Kiến trúc là gì và khi nào cần
slug: kien-truc-la-gi-va-khi-nao-can
summary: Kiến trúc là tập các quyết định khó đảo — nên nó chỉ đáng bàn ở đúng những quyết định đó.
level: co-ban
tags: [kien-truc, thiet-ke, danh-doi, tu-duy]
khung: v2
---

> **Sau bài này bạn sẽ:** phân biệt được quyết định kiến trúc với quyết định thiết kế thường, và biết khi nào một mẫu là quá đà.

## Ý tưởng chính

Kiến trúc là tập hợp những quyết định **khó đảo ngược nhất** trong một hệ thống: cái gì phụ thuộc cái gì, ranh giới nằm ở đâu, dữ liệu chảy theo hướng nào.

Đổi tên một hàm là refactor. Đổi chiều phụ thuộc giữa hai tầng là **kiến trúc** — nó chạm vào mọi thứ.

## Mental model

Hãy nghĩ tới **xây nhà**.

> **Móng và cột chịu lực** — quyết định một lần, đổi sau thì gần như xây lại. Đó là kiến trúc.
>
> **Vị trí tường ngăn** — đổi được, tốn công nhưng làm được. Đó là thiết kế.
>
> **Màu sơn, vị trí ổ cắm** — đổi lúc nào cũng được. Đó là chi tiết triển khai.
>
> Người xây nhà không họp ba tuần về màu sơn. Nhưng họ cũng không quyết định vị trí cột chịu lực trong ba mươi phút.

Câu hỏi phân loại rất gọn: **"đổi cái này sau sáu tháng tốn bao nhiêu?"** ([[ra-quyet-dinh-ky-thuat]])

## Ví dụ nhỏ

```text
KIẾN TRÚC (khó đảo)
  Ranh giới service, mô hình dữ liệu, chiều phụ thuộc,
  đồng bộ hay bất đồng bộ, một CSDL hay nhiều

THIẾT KẾ (đảo được)
  Chia tầng trong một module, tên lớp, cách tổ chức thư mục

CHI TIẾT (đảo dễ)
  Thư viện HTTP, thư viện ngày tháng, định dạng log
```

## Code chạy thế nào

**Ba thứ kiến trúc thật sự quyết định:**

```text
① RANH GIỚI       cái gì nằm trong một đơn vị, cái gì tách ra
                  ⇒ quyết định ai sửa được gì mà không đụng người khác

② PHỤ THUỘC       ai gọi ai, và ai KHÔNG được gọi ai
                  ⇒ quyết định thứ gì test được độc lập,
                    và thứ gì thay thế được

③ DÒNG DỮ LIỆU    dữ liệu đi đâu, biến đổi ở đâu, ai là nguồn sự thật
                  ⇒ quyết định dữ liệu có thể sai ở đâu
```

Ba câu hỏi này là toàn bộ nội dung của một cuộc bàn kiến trúc. Nếu cuộc họp đang bàn tên biến, nó không phải cuộc họp kiến trúc.

**Chiều phụ thuộc — thứ dễ bỏ qua nhất và đắt nhất:**

```text
Phụ thuộc nên chảy về phía thứ ÍT THAY ĐỔI HƠN.

  ❌ Quy tắc nghiệp vụ  →  phụ thuộc  →  thư viện HTTP cụ thể
     Đổi thư viện ⇒ phải sửa nghiệp vụ.
     Test nghiệp vụ ⇒ phải gọi mạng.

  ✅ Thư viện HTTP  →  phụ thuộc  →  một interface do nghiệp vụ định nghĩa
     Nghiệp vụ không biết gì về HTTP.
```

```text
Đây là ý cốt lõi của mọi kiến trúc "sạch", "hexagonal", "onion":
  chúng khác nhau ở cách gọi và số lớp,
  nhưng ĐỀU nói đúng một điều — QUY TẮC NGHIỆP VỤ KHÔNG PHỤ THUỘC
  VÀO HẠ TẦNG ([[ket-dinh-cao-lien-ket-long]]).
```

## Cú pháp

**Ba câu hỏi trước khi áp dụng một mẫu kiến trúc:**

```text
① Mẫu này giải quyết vấn đề gì?
   Không nói ra được cụ thể ⇒ đừng dùng.

② Tôi CÓ vấn đề đó chưa?
   Chưa có ⇒ đang trả chi phí cho một lợi ích có thể không bao giờ tới.

③ Chi phí là gì?
   Mọi mẫu đều có: thêm file, thêm tầng gián tiếp, người mới
   khó hiểu hơn, đi từ request tới CSDL qua nhiều bước hơn.
```

Câu ② lọc được phần lớn trường hợp áp dụng sai. Và nó khó trả lời trung thực, vì mẫu nào cũng nghe hợp lý khi đọc mô tả.

**Bốn mẫu và vấn đề chúng giải:**

```text
LAYERED (chia tầng)
  Vấn đề: logic nghiệp vụ trộn với HTTP và SQL ⇒ không test được
  Chi phí: thấp.  ⇒ Gần như luôn đáng ([[chia-tang-mot-ung-dung]])

HEXAGONAL / PORTS & ADAPTERS
  Vấn đề: nghiệp vụ dính chặt vào một nhà cung cấp cụ thể
  Chi phí: vừa — mỗi phụ thuộc ngoài thành một interface
  ⇒ Đáng khi thật sự có thể đổi nhà cung cấp, hoặc cần test
    không gọi mạng

EVENT-DRIVEN
  Vấn đề: nhiều bên cần biết khi một việc xảy ra; muốn giảm
          phụ thuộc thời gian thực
  Chi phí: cao — luồng bị cắt rời, gỡ lỗi khó hơn hẳn

CQRS
  Vấn đề: mô hình đọc và mô hình ghi khác nhau ĐÁNG KỂ
          (ghi cần chuẩn hoá và transaction; đọc cần phẳng và nhanh)
  Chi phí: rất cao — hai mô hình, và phải đồng bộ giữa chúng
  ⇒ Đáng ở rất ít hệ thống
```

**Và một mẫu bị áp dụng sai nhiều nhất:** CQRS thường được hiểu là "tách hàm đọc và hàm ghi". Đó chỉ là tổ chức mã, và nó gần như miễn phí. CQRS thật là **hai mô hình dữ liệu riêng** — và cái giá thật nằm ở việc giữ chúng đồng bộ, cùng với mọi hệ quả của nhất quán cuối cùng ([[du-lieu-o-quy-mo]]).

## Tại sao cần nó

Vì hai lỗi ngược nhau đều tốn kém, và lỗi thứ hai phổ biến hơn:

```text
KHÔNG có kiến trúc:
  Mọi thứ gọi mọi thứ. Đổi một chỗ hỏng ba chỗ.
  Không test được gì độc lập. Không ai dám xoá code cũ.

KIẾN TRÚC QUÁ ĐÀ:
  15 file cho một endpoint CRUD.
  Người mới mất một tuần mới hiểu luồng.
  Mọi tính năng mới phải viết qua bốn tầng gián tiếp.
  ⇒ Và những lợi ích được viện dẫn (đổi CSDL, đổi framework)
    thì chưa bao giờ xảy ra.
```

**Nguyên tắc thực dụng:**

```text
Bắt đầu ĐƠN GIẢN. Thêm cấu trúc khi ĐAU.

Và "đau" là những thứ đo được, không phải cảm giác:
  □ Sửa một chỗ làm hỏng chỗ không liên quan
  □ Không test được một phần mà không dựng cả hệ thống
  □ Hai người không làm song song được vì cùng sửa một file
  □ Không đổi được một phụ thuộc mà không sửa nghiệp vụ

Chưa có triệu chứng nào ⇒ chưa cần mẫu nào.
```

**YAGNI và giới hạn của nó:**

```text
"You Aren't Gonna Need It" đúng với phần lớn quyết định —
nhưng KHÔNG đúng đều cho mọi loại.

Quyết định ĐẢO ĐƯỢC dễ:  đừng chuẩn bị trước. Thêm khi cần.
Quyết định KHÓ ĐẢO:      nghĩ trước, vì sửa sau rất đắt.
  → mô hình dữ liệu, chiều phụ thuộc, ranh giới,
    định dạng API công khai

⇒ YAGNI cho chi tiết. Cẩn thận cho cột chịu lực.
```

## So sánh

| Mẫu | Giải vấn đề | Chi phí | Tần suất đáng dùng |
|---|---|---|---|
| Layered | nghiệp vụ trộn hạ tầng | thấp | gần như luôn |
| Hexagonal | dính nhà cung cấp | vừa | khi thật cần đổi/test |
| Event-driven | nhiều bên quan tâm | cao | khi có nhiều bên thật |
| CQRS | mô hình đọc ≠ ghi | rất cao | rất ít |

## Dễ nhầm

**1. Bàn kiến trúc về những thứ đảo được dễ.** Mất thời gian, không đổi gì.

**2. Quyết định nhanh những thứ khó đảo.** Trả giá nhiều năm.

**3. Áp dụng mẫu vì đọc thấy hay.** Không nói được nó giải vấn đề gì của mình.

**4. Bỏ qua chi phí của mẫu.** Mọi mẫu đều có.

**5. Để nghiệp vụ phụ thuộc hạ tầng.** Không test được, không đổi được.

**6. Hiểu CQRS là "tách hàm đọc và ghi".** Đó chỉ là tổ chức mã.

**7. Event-driven khi chỉ có một bên quan tâm.** Cắt luồng mà không được gì.

**8. Áp dụng YAGNI cho mô hình dữ liệu.** Đó là cột chịu lực.

**9. Nghĩ kiến trúc là sơ đồ.** Nó là tập các quyết định về phụ thuộc.

**10. Không viết lại lý do.** Sáu tháng sau tranh luận lại từ đầu.

## Mẹo nhớ

> **Kiến trúc = những quyết định KHÓ ĐẢO. Hỏi: "sáu tháng sau đổi tốn bao nhiêu?"**
>
> **Ba thứ nó quyết định: RANH GIỚI, PHỤ THUỘC, DÒNG DỮ LIỆU.**
>
> **Mọi mẫu "sạch" đều nói một điều: NGHIỆP VỤ KHÔNG PHỤ THUỘC HẠ TẦNG.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Phân biệt kiến trúc, thiết kế, chi tiết bằng câu hỏi nào?
2. Ba thứ kiến trúc quyết định?
3. Vì sao chiều phụ thuộc quan trọng, và nên chảy về phía nào?
4. Ba câu hỏi trước khi áp dụng một mẫu?
5. YAGNI đúng với loại quyết định nào và không đúng với loại nào?

## Tự viết lại

Không nhìn lại, phân loại và giải thích:

```text
① Dùng Postgres hay MongoDB
② Dùng thư viện ngày tháng nào
③ Đơn hàng và thanh toán chung hay tách service
④ Gọi API đối tác đồng bộ hay qua hàng đợi
⑤ Tên các lớp trong module đơn hàng
⑥ Định dạng của API công khai
```

Tự kiểm: trong sáu cái trên, cái nào bạn dành nhiều thời gian nhất — và nó có tương ứng với mức khó đảo không?

## Thử sức

Đồng nghiệp đề xuất áp dụng hexagonal architecture cho toàn bộ dự án: mọi phụ thuộc ngoài (CSDL, HTTP client, hệ thống file, đồng hồ) đều thành interface với adapter riêng.

Ba câu để trả lời: bạn hỏi lại những gì; phần nào của đề xuất bạn **đồng ý** và phần nào bạn cho là quá đà, kèm lý do; và bạn đề xuất phạm vi nào để thử. Câu khó nhất: "trừu tượng hoá đồng hồ" nghe như quá đà, nhưng có một lý do rất thực tế để làm — đó là gì?
