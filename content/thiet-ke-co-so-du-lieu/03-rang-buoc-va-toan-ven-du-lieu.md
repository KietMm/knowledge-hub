---
title: Ràng buộc và toàn vẹn dữ liệu
slug: rang-buoc-va-toan-ven-du-lieu
summary: NOT NULL, UNIQUE, CHECK, FOREIGN KEY — hàng rào cuối cùng bảo vệ dữ liệu khỏi mọi đường ghi.
level: trung-cap
tags: [database, rang-buoc, toan-ven]
khung: v2
---

> **Sau bài này bạn sẽ:** biết vì sao kiểm tra ở tầng ứng dụng **không đủ**, và dùng được năm loại ràng buộc đúng chỗ.

## Ý tưởng chính

Ứng dụng của bạn không phải đường duy nhất ghi vào cơ sở dữ liệu. Còn có: script chạy tay, công cụ quản trị, migration, dịch vụ khác, và **chính bạn lúc 11 giờ đêm sửa dữ liệu bằng `psql`**.

Ràng buộc ở tầng cơ sở dữ liệu là **hàng rào cuối cùng** — nó đúng với mọi đường ghi, không phụ thuộc ai nhớ kiểm tra.

## Mental model

Hãy nghĩ tới **cửa an ninh sân bay** so với **nhân viên quầy làm thủ tục**.

> Quầy làm thủ tục kiểm giấy tờ để bạn không phải xếp hàng vô ích. Đó là **validate ở ứng dụng**: thân thiện, thông báo lỗi rõ, nhưng **đi vòng qua được**.
>
> Cửa an ninh kiểm lại lần nữa, không tin quầy nào cả. Đó là **ràng buộc ở cơ sở dữ liệu**: thông báo lỗi khô khan, nhưng **không ai đi vòng được**.

Cả hai đều cần. Bỏ quầy thì trải nghiệm tệ; bỏ cửa an ninh thì sớm muộn có thứ không hợp lệ lọt vào — và một khi dữ liệu bẩn đã nằm trong bảng, việc dọn nó rất đắt.

## Ví dụ nhỏ

```sql
CREATE TABLE nguoi_dung (
  id       UUID PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  tuoi     INT CHECK (tuoi BETWEEN 0 AND 150),
  vai_tro  TEXT NOT NULL DEFAULT 'user'
           CHECK (vai_tro IN ('user', 'admin'))
);
```

Bốn ràng buộc trong bốn dòng. Sau đó, **không tồn tại đường nào** đưa bảng này về trạng thái sai.

## Code chạy thế nào

**`UNIQUE` và `NULL`** — hành vi làm nhiều người bất ngờ:

```sql
CREATE UNIQUE INDEX ON nguoi_dung (email);

INSERT INTO nguoi_dung (email) VALUES (NULL);   -- ✅
INSERT INTO nguoi_dung (email) VALUES (NULL);   -- ✅ vẫn được!
```

Lý do: `NULL` nghĩa là *"không biết"*, và hai thứ không biết thì **không thể khẳng định là bằng nhau**. Nên `UNIQUE` không chặn nhiều dòng NULL.

Hệ quả thực tế với xoá mềm:

```sql
-- Người dùng A bị xoá mềm, giờ muốn đăng ký lại cùng email
UNIQUE (email)              -- ❌ chặn, dù bản ghi cũ đã "xoá"

-- ✅ Chỉ áp dụng UNIQUE cho bản ghi CHƯA xoá
CREATE UNIQUE INDEX ON nguoi_dung (email) WHERE xoa_luc IS NULL;
```

Index một phần (partial index) là công cụ giải quyết gọn ghẽ vấn đề này — chi tiết ở [[xoa-mem-va-vong-doi-ban-ghi]].

## Cú pháp

**`FOREIGN KEY`** và hành vi khi xoá — quyết định quan trọng nhất:

```sql
khach_id UUID NOT NULL REFERENCES khach(id) ON DELETE RESTRICT
```

```text
RESTRICT / NO ACTION   ❌ chặn xoá nếu còn bản ghi con      ← mặc định an toàn
CASCADE                🔥 xoá cha ⇒ xoá luôn TẤT CẢ con
SET NULL               đặt khoá ngoại thành NULL
SET DEFAULT            đặt về giá trị mặc định
```

Chọn thế nào:

```text
CASCADE   dùng khi con KHÔNG có ý nghĩa nếu không có cha
          (dòng đơn hàng, ảnh của sản phẩm, phiên đăng nhập)

RESTRICT  dùng cho MỌI trường hợp còn lại
          (xoá khách thì đơn hàng phải giữ lại — đó là chứng từ)
```

`CASCADE` nguy hiểm hơn vẻ ngoài: xoá một danh mục có thể kéo theo hàng nghìn sản phẩm, và **không có cảnh báo**. Mặc định nên là `RESTRICT`; dùng `CASCADE` chỉ khi bạn thật sự muốn hiệu ứng dây chuyền đó.

**`CHECK`** — ràng buộc theo nghiệp vụ:

```sql
CHECK (tien >= 0)
CHECK (ket_thuc > bat_dau)
CHECK (trang_thai IN ('moi','dang_giao','da_giao','huy'))
CHECK (giam_gia >= 0 AND giam_gia <= gia)      -- nhiều cột
CHECK (char_length(sdt) BETWEEN 9 AND 15)
```

`CHECK` nhiều cột là thứ ORM thường không tạo giúp, và nó bắt được những lỗi logic mà kiểm tra từng trường bỏ sót — như *"giảm giá lớn hơn giá gốc"*.

## Tại sao cần nó

Vì đây là những lỗi mà **chỉ** ràng buộc cơ sở dữ liệu bắt được:

```text
· Script chạy tay quên kiểm tra
· Dịch vụ thứ hai ghi vào cùng bảng, không dùng chung code validate
· Migration cũ để lại dữ liệu không hợp lệ
· Điều kiện đua: hai request cùng lúc cùng thấy "email chưa tồn tại"
```

Trường hợp cuối đáng nói riêng: kiểm tra ở ứng dụng **không thể** chặn nó.

```ts
// ❌ Có khe hở giữa hai lệnh
const daCo = await db.nguoiDung.findByEmail(email)
if (daCo) throw new Error('Email đã tồn tại')
await db.nguoiDung.create({ email })     // ← hai request cùng lọt qua đây
```

Chỉ ràng buộc `UNIQUE` ở cơ sở dữ liệu mới bảo đảm được — vì nó là thao tác nguyên tử. Cách viết đúng: **cứ ghi, bắt lỗi vi phạm ràng buộc**:

```ts
try {
  await db.nguoiDung.create({ email })
} catch (e) {
  if (laLoiTrungKhoa(e)) throw new LoiNghiepVu('Email đã tồn tại')
  throw e
}
```

## So sánh

| Ràng buộc | Bảo vệ điều gì |
|---|---|
| `NOT NULL` | Trường bắt buộc không bị bỏ trống |
| `UNIQUE` | Không trùng (kể cả khi có điều kiện đua) |
| `CHECK` | Giá trị nằm trong miền hợp lệ |
| `FOREIGN KEY` | Không trỏ tới bản ghi không tồn tại |
| `PRIMARY KEY` | Định danh duy nhất, không NULL |

Nguyên tắc: **kiểm ở cả hai tầng**. Ứng dụng kiểm để cho thông báo lỗi tử tế và trải nghiệm tốt; cơ sở dữ liệu kiểm để bảo đảm không có đường nào lọt.

## Dễ nhầm

**1. Chỉ kiểm ở ứng dụng.** Xem phần trên — điều kiện đua và các đường ghi khác.

**2. Không đặt `NOT NULL`.** Mặc định là cho phép NULL, và mỗi cột NULL là một nhánh `if` phải xử lý ở mọi nơi đọc dữ liệu.

**3. Tưởng `UNIQUE` chặn nhiều NULL.** Không — xem phần trên.

**4. Dùng `CASCADE` bừa bãi.** Một lệnh `DELETE FROM danh_muc WHERE id = 5` xoá luôn 12.000 sản phẩm.

**5. Không có khoá ngoại "để cho nhanh".** Bạn đổi lấy vài phần trăm tốc độ ghi và nhận về **dữ liệu mồ côi** — đơn hàng trỏ tới khách không tồn tại, và không có cách nào phục hồi.

**6. Đặt logic nghiệp vụ phức tạp vào `CHECK`.** `CHECK` chỉ nên kiểm những gì **luôn đúng với một dòng**. Quy tắc kiểu *"đơn VIP được giảm tối đa 30%"* thuộc về tầng ứng dụng — vì nó sẽ thay đổi.

**7. Thêm ràng buộc trên bảng lớn ở giờ cao điểm.** Nó quét toàn bảng để kiểm dữ liệu cũ. Dùng `NOT VALID` rồi `VALIDATE` riêng — xem [[thay-doi-cau-truc-va-migration]].

## Mẹo nhớ

> **Quầy thủ tục (ứng dụng) cho trải nghiệm; cửa an ninh (CSDL) cho bảo đảm.**
>
> **`UNIQUE` không chặn nhiều `NULL` — vì "không biết" ≠ "không biết".**
>
> **`RESTRICT` là mặc định; `CASCADE` chỉ khi con vô nghĩa nếu thiếu cha.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao kiểm tra ở tầng ứng dụng không đủ — kể ba đường ghi khác?
2. Vì sao `UNIQUE` cho phép nhiều dòng `NULL`?
3. Khi nào dùng `CASCADE`, khi nào `RESTRICT`?
4. Vì sao chỉ ràng buộc `UNIQUE` mới chặn được điều kiện đua khi đăng ký?
5. Loại quy tắc nào **không** nên đưa vào `CHECK`?

## Tự viết lại

Không nhìn lại phần trên, viết `CREATE TABLE` đầy đủ ràng buộc cho:

```text
Bảng đặt phòng khách sạn: id, phòng, khách, ngày nhận, ngày trả, giá, trạng thái.
Quy tắc: ngày trả sau ngày nhận; giá không âm; trạng thái thuộc 4 giá trị;
xoá khách thì đặt phòng phải giữ lại; xoá phòng thì chặn nếu còn đặt phòng.
```

Tự kiểm: bạn có ràng buộc nào ngăn **hai người đặt cùng một phòng trùng ngày** không? (Gợi ý: `UNIQUE` thường không đủ — cần một loại ràng buộc khác.)

## Thử sức

Bảng `don_hang` của bạn có 400 dòng với `khach_id` trỏ tới khách **không còn tồn tại**. Không có khoá ngoại nào cả.

Nêu cách **tìm ra** những dòng đó, rồi lập kế hoạch thêm khoá ngoại vào bảng đang chạy production. Câu khó: 400 dòng mồ côi kia bạn xử lý thế nào — xoá, hay có cách nào giữ lại thông tin?
