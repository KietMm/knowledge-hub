---
title: Xoá mềm và vòng đời bản ghi
slug: xoa-mem-va-vong-doi-ban-ghi
summary: Khi nào nên xoá mềm, cái giá phải trả, và cách xử lý dữ liệu tham chiếu tới bản ghi đã xoá.
level: trung-cap
tags: [database, xoa-mem, thiet-ke, vong-doi]
khung: v2
---

> **Sau bài này bạn sẽ:** quyết định được có nên xoá mềm hay không bằng một câu hỏi, và biết trước ba cái giá bạn sẽ phải trả.

## Ý tưởng chính

Xoá thẳng (`DELETE`) là thao tác **không thể hoàn tác**. Với dữ liệu nghiệp vụ, đó thường là quyết định sai:

```text
· Người dùng bấm nhầm và muốn khôi phục
· Kế toán cần chứng từ ba năm trước
· Điều tra sự cố cần dữ liệu tại thời điểm đó
· Luật pháp yêu cầu lưu trữ
```

Xoá mềm là đánh dấu bản ghi *"đã xoá"* thay vì xoá thật. Nhưng nó **không miễn phí** — và phần lớn người ta chỉ nhìn thấy lợi ích.

## Mental model

Hãy nghĩ tới **thùng rác trên máy tính**.

> Bấm xoá không xoá thật — file vào thùng rác. Khôi phục được, và đó là lý do tính năng này tồn tại.
>
> Nhưng thùng rác cũng có giá: nó **vẫn chiếm ổ cứng**, nó **vẫn hiện trong kết quả tìm kiếm** nếu công cụ tìm kiếm không biết bỏ qua nó, và nếu bạn quên dọn thì nó phình ra mãi.

Ba cái giá đó tương ứng chính xác với ba vấn đề của xoá mềm: **dung lượng**, **mọi truy vấn phải nhớ lọc**, và **ràng buộc `UNIQUE` bị phá**.

## Ví dụ nhỏ

```sql
-- ✅ Cột thời điểm, không phải cột boolean
ALTER TABLE nguoi_dung ADD COLUMN xoa_luc TIMESTAMPTZ;

-- Xoá
UPDATE nguoi_dung SET xoa_luc = NOW() WHERE id = ?;

-- Khôi phục
UPDATE nguoi_dung SET xoa_luc = NULL WHERE id = ?;
```

Vì sao **thời điểm** thay vì `da_xoa BOOLEAN`: nó trả lời thêm hai câu hỏi miễn phí — *xoá lúc nào*, và *có xoá không* (`IS NULL`). Boolean chỉ trả lời câu thứ hai.

## Code chạy thế nào

**Cái giá số một: mọi truy vấn phải nhớ lọc.**

```sql
SELECT * FROM nguoi_dung WHERE email = ?;                       -- ❌ lấy cả bản đã xoá
SELECT * FROM nguoi_dung WHERE email = ? AND xoa_luc IS NULL;   -- ✅
```

Chỉ cần **quên một chỗ** là người dùng đã xoá hiện lại trong một danh sách nào đó. Và bạn sẽ quên — vì điều kiện này phải lặp lại ở hàng trăm truy vấn.

Hai cách giảm rủi ro:

```sql
-- ① View: mặc định chỉ thấy bản ghi sống
CREATE VIEW nguoi_dung_song AS
SELECT * FROM nguoi_dung WHERE xoa_luc IS NULL;
```

```ts
// ② ORM: đặt bộ lọc mặc định ở tầng truy cập dữ liệu
// Prisma: middleware; TypeORM: @DeleteDateColumn
```

Cách nào cũng được, miễn là **quyết định một lần ở một chỗ** thay vì trông chờ mọi người nhớ.

**Cái giá số hai: `UNIQUE` bị phá.**

```sql
UNIQUE (email)
-- Người dùng A (đã xoá mềm) giữ email a@x.com
-- A muốn đăng ký lại → ❌ bị chặn, dù bản ghi cũ "đã xoá"
```

```sql
-- ✅ Chỉ áp dụng UNIQUE cho bản ghi chưa xoá
CREATE UNIQUE INDEX ON nguoi_dung (email) WHERE xoa_luc IS NULL;
```

Index một phần là cách gọn nhất. Không có nó, bạn phải đổi email cũ thành `a@x.com.deleted.1699...` — cách này chạy được nhưng làm bẩn dữ liệu và phá luôn khả năng truy vết.

## Cú pháp

**Ba trạng thái, không phải hai.** Đây là chỗ nhiều người dừng lại quá sớm:

```text
Đang hoạt động  →  Đã xoá (khôi phục được)  →  Xoá vĩnh viễn (hết hạn giữ)
```

```sql
-- Job định kỳ: xoá thật những gì đã ở "thùng rác" quá 90 ngày
DELETE FROM nguoi_dung WHERE xoa_luc < NOW() - INTERVAL '90 days';
```

Không có bước thứ ba, bảng của bạn phình vô hạn — và bạn trả tiền lưu trữ cho dữ liệu không ai cần, đồng thời làm mọi truy vấn chậm dần.

Với dữ liệu cá nhân, bước ba còn là **yêu cầu pháp lý**: người dùng có quyền yêu cầu xoá thật, và "đã xoá mềm" không phải là đã xoá.

## Tại sao cần nó

Vì **dữ liệu tham chiếu tới bản ghi đã xoá** là vấn đề khó nhất, và nó không có lời giải chung — chỉ có nguyên tắc:

> **Đóng băng cái cần đóng băng.**

```sql
-- ❌ Hoá đơn trỏ tới sản phẩm; sản phẩm bị xoá ⇒ hoá đơn cũ trống thông tin
dong_don(don_id, san_pham_id)

-- ✅ Chép lại thứ KHÔNG ĐƯỢC ĐỔI vào lúc giao dịch xảy ra
dong_don(don_id, san_pham_id, ten_luc_mua, gia_luc_mua)
```

Đây không phải phi chuẩn hoá tuỳ tiện — đó là ghi nhận rằng *"tên sản phẩm hiện tại"* và *"tên sản phẩm lúc khách mua"* là **hai sự thật khác nhau** ([[chuan-hoa-va-khi-nao-pha-vo]]).

Với cách này, xoá sản phẩm không còn nguy hiểm: hoá đơn cũ vẫn đầy đủ thông tin, và bạn thậm chí có thể dùng `DELETE` thật cho bảng `san_pham`.

## So sánh

Câu hỏi để quyết định:

> **"Xoá nhầm cái này thì hậu quả là gì?"**

| Loại dữ liệu | Cách xoá | Vì sao |
|---|---|---|
| Đơn hàng, giao dịch, hoá đơn | **Không bao giờ xoá** | Chứng từ — chỉ đổi trạng thái |
| Tài khoản người dùng | Xoá mềm + hết hạn 90 ngày | Khôi phục được, rồi xoá thật |
| Bài viết, bình luận | Xoá mềm | Người dùng hay bấm nhầm |
| Phiên đăng nhập, cache | `DELETE` thẳng | Không ai cần khôi phục |
| Log, sự kiện | `DELETE` theo phân vùng | Khối lượng lớn, xoá theo thời gian |

Dòng đầu quan trọng: với chứng từ, câu trả lời không phải "xoá mềm" mà là **không có khái niệm xoá**. Đơn hàng bị huỷ thì `trang_thai = 'huy'` — đó là một trạng thái nghiệp vụ, không phải một thao tác xoá.

## Dễ nhầm

**1. Xoá mềm mọi bảng "cho chắc".** Bảng phiên đăng nhập, bảng cache, bảng hàng đợi — không ai cần khôi phục, và xoá mềm chỉ làm chúng phình ra.

**2. Dùng `da_xoa BOOLEAN`.** Mất thông tin thời điểm, và không phân biệt được "chưa xoá" với "dữ liệu cũ chưa có cột này".

**3. Quên lọc `xoa_luc IS NULL`.** Bản ghi đã xoá hiện lại ở đâu đó — thường là ở một báo cáo hoặc một API ít dùng.

**4. Quên index một phần cho `UNIQUE`.** Người dùng không đăng ký lại được bằng email cũ.

**5. Không có bước xoá vĩnh viễn.** Bảng phình mãi, và bạn vi phạm yêu cầu về dữ liệu cá nhân.

**6. Xoá mềm mà không xử lý dữ liệu liên quan.** Xoá mềm người dùng nhưng phiên đăng nhập của họ **vẫn hoạt động** — họ vẫn dùng được hệ thống bình thường.

**7. Quên rằng xoá mềm không phải xoá.** Khi người dùng yêu cầu "xoá tài khoản của tôi" theo luật bảo vệ dữ liệu, đánh dấu `xoa_luc` **không đáp ứng** yêu cầu đó.

## Mẹo nhớ

> **Thùng rác: khôi phục được, nhưng vẫn chiếm chỗ và vẫn hiện ra nếu quên lọc.**
>
> **Dùng cột THỜI ĐIỂM, không dùng boolean.**
>
> **Ba trạng thái: sống → thùng rác → xoá thật.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Câu hỏi nào quyết định có nên xoá mềm hay không?
2. Vì sao dùng `xoa_luc TIMESTAMPTZ` tốt hơn `da_xoa BOOLEAN`?
3. Ba cái giá của xoá mềm?
4. Vì sao `UNIQUE (email)` xung đột với xoá mềm, và cách sửa?
5. Vì sao đơn hàng **không** nên xoá mềm mà nên đổi trạng thái?

## Tự viết lại

Không nhìn lại phần trên, thiết kế cách xoá cho từng bảng, **nêu lý do**:

```text
a) nguoi_dung        b) phien_dang_nhap      c) don_hang
d) binh_luan         e) log_su_kien          f) gio_hang
```

Tự kiểm: với (a), bạn xử lý (b) thế nào khi người dùng bị xoá mềm? Và với (c), "xoá" nghĩa là gì?

## Thử sức

Bạn xoá mềm người dùng `A`. Ba tuần sau, bộ phận hỗ trợ báo:

```text
· A vẫn nhận được email khuyến mãi hằng tuần
· A vẫn đăng nhập được bằng phiên cũ
· Tên A vẫn hiện trong danh sách bình luận cũ
· A không đăng ký lại được bằng email của mình
```

Bốn vấn đề, bốn nguyên nhân khác nhau. Chẩn đoán từng cái và nêu cách sửa. Câu khó nhất: vấn đề thứ ba — bạn **có nên** ẩn tên A khỏi bình luận cũ không, và điều đó phụ thuộc yếu tố gì?
