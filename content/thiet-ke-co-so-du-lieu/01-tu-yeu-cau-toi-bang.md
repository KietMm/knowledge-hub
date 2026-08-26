---
title: Từ yêu cầu nghiệp vụ tới bảng
slug: tu-yeu-cau-toi-bang
summary: Nhận diện thực thể, thuộc tính và quan hệ — bước đầu tiên quyết định mọi thứ về sau.
level: co-ban
tags: [database, thiet-ke, erd]
khung: v2
---

> **Sau bài này bạn sẽ:** biến một đoạn mô tả nghiệp vụ thành sơ đồ bảng bằng bốn bước, và chọn được loại khoá chính phù hợp.

## Ý tưởng chính

Thiết kế cơ sở dữ liệu bắt đầu từ **ngôn ngữ của người dùng**, không từ màn hình giao diện.

Trong một đoạn mô tả nghiệp vụ, **danh từ** thường là bảng, **tính từ / thông tin mô tả** là cột, và **động từ** là quan hệ. Nghe đơn giản, nhưng nó cho bạn một điểm bắt đầu chắc chắn thay vì ngồi nhìn màn hình trắng.

## Mental model

Hãy nghĩ tới **gạch chân trong một đoạn văn**.

> *"**Khách hàng** đặt **đơn hàng**. Mỗi đơn có nhiều **sản phẩm**, mỗi sản phẩm có **giá** và thuộc một **danh mục**."*
>
> Gạch chân danh từ → đó là các **bảng**: khách hàng, đơn hàng, sản phẩm, danh mục.
> Gạch chân thông tin mô tả → đó là **cột**: giá, tên, số lượng.
> Khoanh tròn động từ → đó là **quan hệ**: *đặt*, *có*, *thuộc*.

Cách này không cho ra thiết kế hoàn hảo, nhưng nó luôn cho ra **bản nháp đầu tiên đủ tốt để bàn tiếp** — và đó là thứ khó nhất.

## Ví dụ nhỏ

```text
"Khách hàng đặt đơn hàng. Mỗi đơn có nhiều dòng hàng."

khach_hang ──1──đặt──n── don_hang ──1──có──n── dong_don
```

## Code chạy thế nào

**Bốn bước**, làm theo thứ tự:

```text
① Liệt kê thực thể     danh từ chính, có vòng đời riêng
② Xác định quan hệ     1-1, 1-n, hay n-n
③ Gán thuộc tính       mỗi thông tin thuộc về ĐÚNG MỘT thực thể
④ Chọn khoá            khoá chính, và khoá ngoại theo quan hệ
```

Bước ③ có một phép thử hữu ích: **"nếu thông tin này đổi, thì cái gì thật sự đổi?"**

```text
"Địa chỉ giao hàng" thuộc về khách hay thuộc về đơn?
  → Khách đổi địa chỉ nhà, đơn hàng CŨ vẫn phải giữ địa chỉ đã giao
  ⇒ địa chỉ giao thuộc về ĐƠN HÀNG (bản chụp), không phải khách
```

Đây là loại quyết định mà làm sai thì sáu tháng sau bạn phát hiện hoá đơn cũ hiển thị sai địa chỉ — và không có cách nào phục hồi.

## Cú pháp

**Ba loại quan hệ** và cách thể hiện:

```text
① MỘT–MỘT (1-1)   hiếm; thường nên gộp vào một bảng
   Tách khi: một phần dữ liệu ít dùng, rất lớn, hoặc có mức bảo mật khác
   nguoi_dung ──1──1── ho_so_chi_tiet

② MỘT–NHIỀU (1-n)  phổ biến nhất
   Khoá ngoại đặt ở phía "NHIỀU"
   khach_hang ──1───n── don_hang        → don_hang.khach_id
```

```sql
CREATE TABLE don_hang (
  id       UUID PRIMARY KEY,
  khach_id UUID NOT NULL REFERENCES khach_hang(id)
);
```

```text
③ NHIỀU–NHIỀU (n-n)  cần BẢNG TRUNG GIAN
   san_pham ──n───n── danh_muc
```

```sql
CREATE TABLE san_pham_danh_muc (
  san_pham_id UUID REFERENCES san_pham(id) ON DELETE CASCADE,
  danh_muc_id UUID REFERENCES danh_muc(id) ON DELETE CASCADE,
  PRIMARY KEY (san_pham_id, danh_muc_id)
);
```

Điểm quan trọng về bảng trung gian: nó **thường không chỉ là bảng nối**. Bảng `don_hang_san_pham` cần thêm `so_luong`, `gia_luc_mua` — và ngay khi nó có thuộc tính riêng, nó đã là một **thực thể thật** (dòng đơn hàng), không phải bảng kỹ thuật.

## Tại sao cần nó

Vì chọn khoá chính là quyết định **khó đảo ngược nhất** trong toàn bộ thiết kế:

| | Tự tăng (`BIGSERIAL`) | UUID v4 | ULID / UUID v7 |
|---|---|---|---|
| Kích thước | 8 byte | 16 byte | 16 byte |
| Sinh ở client | ❌ | ✅ | ✅ |
| Đoán được id khác | ✅ **rủi ro** | ❌ | ❌ |
| Sắp theo thời gian | ✅ | ❌ | ✅ |
| Ghi vào index | Nhanh | **Chậm** (ngẫu nhiên) | Nhanh |

Dòng "đoán được" là vấn đề an ninh thật: `/don-hang/1043` cho phép người dùng thử `1044` và xem đơn của người khác — nếu bạn quên kiểm quyền. Đó là lỗ hổng IDOR, và id tuần tự làm nó dễ khai thác hơn nhiều.

Dòng cuối là vấn đề hiệu năng ít người biết: UUID v4 hoàn toàn ngẫu nhiên nên mỗi lần chèn rơi vào một chỗ khác nhau trong cây index, làm index phân mảnh. **ULID / UUID v7** có phần đầu là thời gian nên chèn tuần tự — giữ được ưu điểm của cả hai.

Khuyến nghị: **ULID hoặc UUID v7** cho hệ thống mới.

## So sánh

**Cột nên có ở gần như mọi bảng:**

```sql
id          UUID PRIMARY KEY
tao_luc     TIMESTAMPTZ NOT NULL DEFAULT NOW()
cap_nhat_luc TIMESTAMPTZ NOT NULL DEFAULT NOW()
xoa_luc     TIMESTAMPTZ                 -- nếu dùng xoá mềm
```

`tao_luc` và `cap_nhat_luc` trông thừa cho tới lần đầu bạn phải trả lời *"bản ghi này có từ bao giờ, ai sửa gần nhất"* — và lúc đó thì đã muộn để thêm.

**Đặt tên nhất quán** — chọn một quy ước và giữ:

```text
Bảng:       số ít hay số nhiều — chọn MỘT (don_hang / don_hangs)
Cột:        snake_case
Khoá ngoại: <bang>_id       (khach_id, san_pham_id)
Boolean:    la_/da_ + tính từ   (la_vip, da_thanh_toan)
Thời gian:  <động từ>_luc      (tao_luc, giao_luc)
```

Nhất quán quan trọng hơn "đúng": người đọc quét mắt theo khuôn mẫu, và một cái tên lệch khuôn buộc họ dừng lại kiểm tra.

## Dễ nhầm

**1. Thiết kế bảng theo màn hình giao diện.** Giao diện đổi vài tháng một lần; dữ liệu sống nhiều năm. Thiết kế theo **nghiệp vụ**.

**2. Nhét nhiều giá trị vào một ô.**

```sql
the VARCHAR(500)   -- "áo,nam,khuyến mãi"   ❌ không lọc được, không index được
```

Cần bảng riêng hoặc kiểu mảng — xem [[chuan-hoa-va-khi-nao-pha-vo]].

**3. Quên bản chụp lịch sử.** Giá sản phẩm đổi thì hoá đơn cũ **phải giữ giá lúc mua**. Không lưu là số liệu kế toán sai vĩnh viễn.

**4. Dùng khoá tự nhiên làm khoá chính.** Email, số điện thoại, mã số thuế đều **đổi được** — và khi đổi, mọi khoá ngoại trỏ tới nó đều hỏng.

**5. Quan hệ n-n mà không có bảng trung gian.** Nhét danh sách id vào một cột chuỗi — không JOIN được, không ràng buộc được.

**6. Quên `NOT NULL`.** Mặc định cho phép NULL, và bạn sẽ có dữ liệu thiếu ở những cột lẽ ra bắt buộc — xem [[rang-buoc-va-toan-ven-du-lieu]].

**7. Không có `tao_luc`.** Không truy được gì khi cần điều tra.

## Mẹo nhớ

> **Gạch chân danh từ → bảng. Thông tin mô tả → cột. Động từ → quan hệ.**
>
> **Phép thử thuộc tính: "cái này đổi thì THẬT SỰ cái gì đổi?"**
>
> **Khoá chính không bao giờ dùng thứ có thể thay đổi.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn bước từ yêu cầu tới bảng?
2. Khoá ngoại trong quan hệ 1-n đặt ở bảng nào, và vì sao?
3. Phép thử để biết một thuộc tính thuộc về thực thể nào?
4. Vì sao UUID v4 làm index chậm, và ULID sửa điều đó thế nào?
5. Vì sao không dùng email làm khoá chính?

## Tự viết lại

Không nhìn lại phần trên, thiết kế bảng cho mô tả sau (liệt kê bảng, cột chính, quan hệ):

```text
"Một khoá học có nhiều bài giảng. Học viên đăng ký khoá học và xem từng bài,
hệ thống ghi lại tiến độ xem của mỗi học viên với mỗi bài. Học viên có thể
đánh giá khoá học một lần, kèm số sao và nhận xét."
```

Tự kiểm: có mấy quan hệ n-n, và bảng trung gian nào của bạn mang **thuộc tính riêng**?

## Thử sức

Bạn thiết kế bảng `don_hang` với cột `dia_chi_giao` trỏ tới `dia_chi_id` của khách.

Sáu tháng sau, khách đổi địa chỉ, và **mọi hoá đơn cũ của họ đều hiển thị địa chỉ mới**. Kế toán báo sai lệch với chứng từ giấy.

Giải thích sai lầm thiết kế, đề xuất cách sửa, và trả lời câu khó: với dữ liệu **đã có**, bạn khôi phục địa chỉ đúng bằng cách nào — hay không thể?
