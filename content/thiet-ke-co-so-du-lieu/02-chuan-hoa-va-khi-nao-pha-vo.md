---
title: Chuẩn hoá và khi nào nên phá vỡ nó
slug: chuan-hoa-va-khi-nao-pha-vo
summary: Ba dạng chuẩn giải thích bằng ví dụ thật, và những trường hợp phi chuẩn hoá là lựa chọn đúng.
level: trung-cap
tags: [database, chuan-hoa, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra ba dạng chuẩn qua **triệu chứng** thay vì qua định nghĩa, và biết khi nào phi chuẩn hoá là lựa chọn đúng.

## Ý tưởng chính

Chuẩn hoá giải quyết đúng một vấn đề: **cùng một sự thật được lưu ở nhiều chỗ**.

Khi sự thật đó đổi, bạn phải sửa mọi chỗ — và chỉ cần quên một chỗ là dữ liệu **mâu thuẫn với chính nó**. Không có cách nào biết chỗ nào đúng.

## Mental model

Hãy nghĩ tới **số điện thoại của một người ghi trong ba cuốn sổ**.

> Sổ khách hàng ghi `0901234567`. Sổ đơn hàng ghi lại. Sổ giao hàng cũng ghi lại.
>
> Người đó đổi số. Bạn sửa sổ khách hàng, quên hai sổ kia.
>
> Bây giờ **ba cuốn sổ nói ba chuyện khác nhau**, và không cuốn nào tự nhận là sai.

Chuẩn hoá là nguyên tắc: **mỗi sự thật ghi ở đúng một chỗ**, chỗ khác chỉ **trỏ tới** nó.

Và phi chuẩn hoá là quyết định có ý thức chép lại — chấp nhận rủi ro lệch để đổi lấy tốc độ, hoặc để **đóng băng lịch sử**.

## Ví dụ nhỏ

```text
❌ Chưa chuẩn hoá
don_hang(id, khach_ten, khach_sdt, san_pham_ten, gia)
  1  An  0901  Áo thun  200000
  2  An  0901  Quần jean 500000     ← tên và số của An lặp lại

✅ Chuẩn hoá
khach(id, ten, sdt)
don_hang(id, khach_id)
dong_don(don_id, san_pham_id, gia_luc_mua)
```

## Code chạy thế nào

Ba dạng chuẩn, nhận ra qua **triệu chứng** chứ không qua định nghĩa:

**1NF — mỗi ô một giá trị:**

```text
❌ the = "áo, nam, khuyến mãi"     ← nhiều giá trị trong một ô

Triệu chứng: bạn phải dùng LIKE '%nam%' để lọc
Hậu quả: không index được, "nam" khớp cả "nam giới" lẫn "vải nam"
```

```sql
CREATE TABLE san_pham_the (san_pham_id UUID, the_id UUID, PRIMARY KEY (san_pham_id, the_id));
```

**2NF — không phụ thuộc một phần khoá:**

```text
❌ dong_don(don_id, san_pham_id, so_luong, san_pham_ten)
                                            ↑ chỉ phụ thuộc san_pham_id,
                                              không phụ thuộc cả khoá (don_id, san_pham_id)

Triệu chứng: đổi tên sản phẩm phải cập nhật hàng nghìn dòng đơn hàng
```

**3NF — không phụ thuộc bắc cầu:**

```text
❌ nhan_vien(id, ten, phong_id, phong_ten)
                              ↑ phong_ten phụ thuộc phong_id, phong_id phụ thuộc id
                                ⇒ bắc cầu

Triệu chứng: đổi tên phòng phải sửa mọi nhân viên trong phòng đó
```

Ba triệu chứng đều cùng một hình dạng: **sửa một sự thật mà phải chạm vào nhiều dòng**. Thấy dấu hiệu đó là biết cần tách bảng.

## Cú pháp

Ba loại bất thường mà chuẩn hoá ngăn — thuộc ba cái tên này thì bạn hiểu được vì sao chuẩn hoá tồn tại:

```text
Bất thường khi SỬA   đổi số điện thoại phải sửa 500 dòng, sót một dòng là lệch
Bất thường khi THÊM  chưa có nhân viên nào thì không tạo được phòng ban
                     (vì thông tin phòng chỉ tồn tại trong bảng nhân viên)
Bất thường khi XOÁ   xoá nhân viên cuối cùng của phòng ⇒ mất luôn thông tin phòng
```

Hai loại sau ít người nghĩ tới nhưng rất thật: chúng nói rằng **thông tin phòng ban không có chỗ ở riêng**, và điều đó là sai về mặt mô hình.

## Tại sao cần nó

Vì có **bốn trường hợp phi chuẩn hoá là đúng**, và biết chúng quan trọng ngang biết chuẩn hoá:

**① Bản chụp lịch sử — bắt buộc, không phải tối ưu:**

```sql
dong_don(don_id, san_pham_id, ten_luc_mua, gia_luc_mua)
```

Giá sản phẩm đổi hằng tuần; hoá đơn tháng trước **phải giữ giá lúc mua**. Đây không phải chép dữ liệu cho nhanh — đây là **hai sự thật khác nhau**: "giá hiện tại" và "giá đã bán".

**② Số đếm được tính sẵn:**

```sql
bai_viet(id, tieu_de, so_binh_luan)     -- thay vì COUNT(*) mỗi lần hiển thị
```

Đổi lại: phải cập nhật khi thêm/xoá bình luận, và số có thể lệch nếu cập nhật thất bại. Chấp nhận được khi trang danh sách được xem hàng nghìn lần mỗi phút.

**③ Bảng báo cáo tổng hợp sẵn:**

```sql
bao_cao_ngay(ngay, tong_don, doanh_thu)   -- tính bằng job đêm
```

Truy vấn tổng hợp trên 50 triệu dòng mất vài giây; đọc bảng tổng hợp mất vài mili giây.

**④ Chép trường hay JOIN:**

```sql
don_hang(id, khach_id, khach_ten)   -- để danh sách đơn khỏi JOIN bảng khách
```

Đây là loại **rủi ro nhất** — nó có thể lệch. Chỉ làm khi đã đo và JOIN thật sự là điểm nghẽn.

## So sánh

| | Chuẩn hoá | Phi chuẩn hoá |
|---|---|---|
| Sự thật lưu ở | Một chỗ | Nhiều chỗ |
| Nguy cơ mâu thuẫn | Không | **Có** |
| Ghi | Nhanh, gọn | Phải cập nhật nhiều chỗ |
| Đọc | Cần JOIN | Đọc thẳng |
| Dung lượng | Nhỏ | Lớn hơn |

Nguyên tắc thực dụng:

```text
① Chuẩn hoá tới 3NF làm mặc định
② Đo — nếu JOIN thật sự là điểm nghẽn
③ Phi chuẩn hoá CÓ CHỦ ĐÍCH, và ghi lại lý do
④ Có cơ chế giữ đồng bộ (trigger, job, hoặc cùng transaction)
```

Bước ④ hay bị bỏ, và đó là lý do dữ liệu phi chuẩn hoá dần lệch: không ai chịu trách nhiệm giữ nó đúng.

## Dễ nhầm

**1. Phi chuẩn hoá "cho nhanh" mà chưa đo.** JOIN có index thường rất rẻ. Bạn đang trả bằng nguy cơ dữ liệu mâu thuẫn để mua một thứ có thể không cần.

**2. Chuẩn hoá tới mức cực đoan.** Tách mọi thứ thành bảng riêng, và một truy vấn đơn giản cần JOIN 8 bảng. Chuẩn hoá là phương tiện, không phải mục tiêu.

**3. Nhầm bản chụp lịch sử với dữ liệu trùng lặp.** `gia_luc_mua` **không** vi phạm chuẩn hoá — nó là một sự thật khác với `gia hiện tại`.

**4. Phi chuẩn hoá mà không có cơ chế đồng bộ.** Số đếm lệch dần và không ai biết từ lúc nào.

**5. Nhồi JSON để né việc thiết kế.** Cột JSON là công cụ hợp lệ cho dữ liệu thật sự phi cấu trúc — nhưng dùng nó vì lười thiết kế thì bạn mất ràng buộc, mất index, mất khả năng truy vấn ([[chon-kieu-du-lieu]]).

**6. Không ghi lại lý do phi chuẩn hoá.** Người sau thấy dữ liệu trùng, "dọn dẹp" nó, và làm hỏng báo cáo lịch sử.

## Mẹo nhớ

> **Một sự thật, một chỗ ghi — chỗ khác chỉ trỏ tới.**
>
> **Triệu chứng cần tách bảng: sửa MỘT sự thật mà phải chạm NHIỀU dòng.**
>
> **Bản chụp lịch sử không phải trùng lặp — đó là sự thật khác.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Chuẩn hoá giải quyết vấn đề gì — nói bằng một câu?
2. Triệu chứng của mỗi dạng 1NF, 2NF, 3NF bị vi phạm?
3. Ba loại bất thường, và hai loại nào ít người nghĩ tới?
4. Vì sao `gia_luc_mua` không vi phạm chuẩn hoá?
5. Bốn bước của nguyên tắc thực dụng khi cân nhắc phi chuẩn hoá?

## Tự viết lại

Không nhìn lại phần trên, chỉ ra bảng này vi phạm dạng chuẩn nào và tách lại:

```text
dat_ve(id, khach_ten, khach_email, phim_ten, phim_thoi_luong,
       rap_ten, rap_dia_chi, ghe, gia, ngay_chieu)
```

Tự kiểm: cột `gia` — bạn để lại ở `dat_ve` hay chuyển sang bảng khác? Nêu lý do (gợi ý: câu trả lời liên quan tới bản chụp lịch sử).

## Thử sức

Bảng `bai_viet` có cột `so_binh_luan` được cập nhật mỗi khi thêm/xoá bình luận. Sau một năm, bạn phát hiện **khoảng 3% bài có số đếm lệch** so với đếm thật.

Nêu **ba** nguyên nhân có thể gây lệch. Rồi thiết kế cách sửa sao cho nó **không lệch lại** — và nói rõ cách của bạn đánh đổi gì.
