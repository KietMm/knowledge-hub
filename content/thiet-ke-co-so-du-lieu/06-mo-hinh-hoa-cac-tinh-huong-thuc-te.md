---
title: Mô hình hoá các tình huống thực tế
slug: mo-hinh-hoa-cac-tinh-huong-thuc-te
summary: Cây phân cấp, đa hình, phiên bản, audit log và multi-tenant — năm bài toán lặp lại ở mọi hệ thống.
level: nang-cao
tags: [database, thiet-ke, mo-hinh]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra năm bài toán mô hình hoá lặp lại ở mọi dự án, và chọn được lời giải phù hợp thay vì tự nghĩ lại từ đầu.

## Ý tưởng chính

Năm bài toán dưới đây xuất hiện ở gần như mọi hệ thống, dù lĩnh vực khác nhau hoàn toàn. Chúng đã có lời giải chuẩn, kèm đánh đổi đã biết.

Nhận ra chúng giúp bạn không phải tự phát minh — và quan trọng hơn, **không phải tự phát hiện những cái bẫy mà người khác đã trả giá rồi**.

## Mental model

Hãy nghĩ tới **các mẫu nhà có sẵn của kiến trúc sư**.

> Không ai thiết kế lại cầu thang từ đầu cho mỗi ngôi nhà. Có vài mẫu cầu thang chuẩn, mỗi mẫu hợp một loại không gian, và **mỗi mẫu có nhược điểm đã biết**.
>
> Việc của bạn là **nhận ra không gian của mình thuộc loại nào**, rồi chọn mẫu — không phải nghĩ lại từ đầu.

Năm bài dưới đây là năm mẫu như vậy.

## Ví dụ nhỏ

```text
① Cây phân cấp    danh mục nhiều cấp, sơ đồ tổ chức, cây bình luận
② Đa hình         bình luận gắn vào bài viết HOẶC video HOẶC sản phẩm
③ Phiên bản       lưu lịch sử chỉnh sửa của một tài liệu
④ Audit log       ai đã đổi gì, lúc nào
⑤ Multi-tenant    nhiều khách hàng dùng chung một hệ thống
```

## Code chạy thế nào

**① Cây phân cấp** — ba cách, ba đánh đổi:

```sql
-- A. Adjacency list: mỗi nút trỏ tới cha
danh_muc(id, ten, cha_id)
```

```text
✅ Ghi cực đơn giản, đổi cha chỉ sửa một dòng
❌ Lấy toàn bộ cây con cần CTE đệ quy ([[subquery-va-cte]])
```

```sql
-- B. Materialized path: lưu cả đường đi
danh_muc(id, ten, duong_dan)     -- '/dien-tu/dien-thoai/iphone'
SELECT * FROM danh_muc WHERE duong_dan LIKE '/dien-tu/%';   -- cây con: một truy vấn
```

```text
✅ Lấy cây con rất nhanh, index prefix dùng được
❌ Chuyển một nhánh sang chỗ khác ⇒ phải cập nhật đường dẫn của MỌI con cháu
```

```sql
-- C. Closure table: lưu MỌI cặp tổ tiên–con cháu
cay(to_tien_id, con_chau_id, khoang_cach)
```

```text
✅ Mọi truy vấn cây đều nhanh, kể cả "tất cả tổ tiên của X"
❌ Tốn chỗ (n² trường hợp xấu), ghi phức tạp
```

Chọn: **A** cho cây nông và ít truy vấn cây con; **B** cho danh mục sản phẩm (đọc nhiều, ít đổi cấu trúc); **C** khi truy vấn cây là nghiệp vụ chính.

**② Quan hệ đa hình** — bình luận gắn vào nhiều loại đối tượng:

```sql
-- ❌ Cột đa hình: KHÔNG có khoá ngoại nào bảo vệ được
binh_luan(id, doi_tuong_loai, doi_tuong_id)
```

```sql
-- ✅ Bảng nối riêng cho từng loại: giữ được ràng buộc
binh_luan(id, noi_dung, tac_gia_id)
binh_luan_bai_viet(binh_luan_id REFERENCES binh_luan, bai_viet_id REFERENCES bai_viet)
binh_luan_video(binh_luan_id REFERENCES binh_luan, video_id REFERENCES video)
```

Cách thứ nhất là thứ mọi ORM khuyến khích, và nó **hỏng âm thầm**: không ràng buộc nào ngăn `doi_tuong_id` trỏ tới bản ghi không tồn tại, và bạn tích luỹ dữ liệu mồ côi trong nhiều năm.

Cách thứ hai dài dòng hơn nhưng cơ sở dữ liệu **bảo đảm được** tính đúng đắn. Với 2–4 loại đối tượng, đây là lựa chọn đúng.

## Cú pháp

**③ Lịch sử phiên bản:**

```sql
tai_lieu(id, tieu_de, noi_dung, phien_ban_hien_tai)
tai_lieu_phien_ban(tai_lieu_id, so_phien_ban, noi_dung, tao_boi, tao_luc,
                   PRIMARY KEY (tai_lieu_id, so_phien_ban))
```

Bảng chính giữ **bản hiện tại** (đọc nhanh, không cần tìm max), bảng phiên bản giữ lịch sử. Lưu cả nội dung mỗi bản tốn chỗ nhưng đơn giản; lưu diff tiết kiệm chỗ nhưng khôi phục phải ghép lại từ đầu — chỉ đáng khi tài liệu rất lớn.

**④ Audit log:**

```sql
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  bang       TEXT NOT NULL,
  ban_ghi_id TEXT NOT NULL,
  hanh_dong  TEXT NOT NULL CHECK (hanh_dong IN ('them','sua','xoa')),
  truoc      JSONB,
  sau        JSONB,
  boi        UUID,
  luc        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Hai cách ghi, và khác biệt quan trọng:

```text
Trigger ở CSDL   ✅ bắt được MỌI đường ghi, kể cả script chạy tay
                 ❌ không biết "ai" nếu ứng dụng không truyền thông tin xuống

Ở tầng ứng dụng  ✅ biết người dùng, biết ngữ cảnh nghiệp vụ
                 ❌ BỎ SÓT mọi đường ghi không đi qua ứng dụng
```

Với audit phục vụ tuân thủ pháp lý, trigger là lựa chọn đúng — vì yêu cầu là *"không bỏ sót"*.

**⑤ Multi-tenant** — ba mức cô lập:

| Cách | Cô lập | Chi phí | Hợp với |
|---|---|---|---|
| Cột `tenant_id` chung bảng | Thấp | Rẻ nhất | SaaS nhiều khách nhỏ |
| Schema riêng mỗi tenant | Vừa | Vừa | Vài chục–vài trăm khách |
| Database riêng mỗi tenant | Cao | Đắt | Khách lớn, yêu cầu tuân thủ |

Với cách một, rủi ro lớn nhất là **quên `WHERE tenant_id = ?`** — và hậu quả là khách hàng A thấy dữ liệu của khách hàng B. Đây là loại lỗi nghiêm trọng nhất một hệ SaaS có thể mắc.

```sql
-- Postgres: bắt CSDL tự lọc, không phụ thuộc lập trình viên nhớ
ALTER TABLE don_hang ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON don_hang
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Row Level Security biến điều kiện lọc từ **kỷ luật** thành **cơ chế** — cùng tinh thần với ràng buộc ở [[rang-buoc-va-toan-ven-du-lieu]].

## Tại sao cần nó

Vì mỗi mẫu ở trên đều có một cái bẫy mà bạn chỉ phát hiện sau nhiều tháng:

```text
Cây          → đổi vị trí một nhánh (materialized path) tốn kém bất ngờ
Đa hình      → dữ liệu mồ côi tích luỹ âm thầm, không ràng buộc nào bắt được
Phiên bản    → bảng lịch sử lớn gấp 10 bảng chính, phải có kế hoạch dọn
Audit log    → ghi ở ứng dụng thì bỏ sót; ghi ở trigger thì thiếu ngữ cảnh
Multi-tenant → quên một chỗ lọc là rò rỉ dữ liệu giữa khách hàng
```

Biết trước năm cái bẫy này đáng giá hơn nhiều so với biết cú pháp của năm mẫu.

## So sánh

Câu hỏi để chọn nhanh:

```text
Cây      → "tôi truy vấn cây con thường xuyên không?" Có ⇒ B hoặc C
Đa hình  → "có bao nhiêu loại đối tượng?" Ít (2-4) ⇒ bảng nối riêng
Phiên bản → "cần xem lại bản cũ hay chỉ cần biết ai sửa?" Chỉ cần biết ⇒ audit log là đủ
Audit    → "phục vụ tuân thủ hay phục vụ gỡ lỗi?" Tuân thủ ⇒ trigger
Tenant   → "khách lớn cỡ nào, yêu cầu cô lập ra sao?"
```

## Dễ nhầm

**1. Dùng cột đa hình vì ORM gợi ý.** Mất hết ràng buộc — xem ở trên.

**2. Materialized path cho cây hay thay đổi cấu trúc.** Mỗi lần chuyển nhánh là cập nhật hàng nghìn dòng.

**3. Lưu phiên bản mà không có kế hoạch dọn.** Bảng lịch sử phình gấp nhiều lần bảng chính.

**4. Audit log ghi vào cùng bảng dữ liệu.** Bảng chính phình ra và mọi truy vấn chậm theo. Tách bảng riêng, và cân nhắc phân vùng theo tháng.

**5. Multi-tenant bằng cột mà không có RLS hoặc kiểm tra tự động.** Sớm muộn có một truy vấn quên lọc.

**6. Chọn database riêng mỗi tenant khi có 10.000 khách nhỏ.** Chi phí vận hành 10.000 database vượt xa lợi ích.

**7. Áp mẫu trước khi hiểu bài toán.** Cây ba tầng cố định (tỉnh → huyện → xã) không cần closure table — ba bảng thường là đủ và rõ hơn.

## Mẹo nhớ

> **Năm bài toán này lặp lại ở mọi hệ thống — nhận ra mẫu, đừng nghĩ lại từ đầu.**
>
> **Đa hình bằng cột = mất ràng buộc = dữ liệu mồ côi.**
>
> **Multi-tenant: biến việc lọc từ KỶ LUẬT thành CƠ CHẾ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba cách mô hình cây, và đánh đổi của từng cách?
2. Vì sao cột đa hình (`doi_tuong_loai`, `doi_tuong_id`) nguy hiểm?
3. Audit log ghi bằng trigger và ghi ở ứng dụng — mỗi cách bỏ sót gì?
4. Ba mức cô lập multi-tenant và tiêu chí chọn?
5. Rủi ro lớn nhất của multi-tenant bằng cột `tenant_id`, và cách biến nó thành cơ chế?

## Tự viết lại

Không nhìn lại phần trên, thiết kế bảng cho:

```text
Hệ thống quản lý tài liệu nội bộ: tài liệu xếp theo thư mục nhiều cấp, mỗi lần
sửa lưu lại phiên bản, mọi thao tác đều phải ghi log ai làm gì, và hệ thống
phục vụ 50 công ty khách hàng dùng chung.
```

Tự kiểm: bạn dùng mẫu nào cho cây thư mục, và **vì sao** — dựa trên câu hỏi nào về nghiệp vụ?

## Thử sức

Hệ SaaS của bạn dùng `tenant_id` chung bảng. Một khách hàng báo họ **nhìn thấy một đơn hàng của công ty khác** trong kết quả tìm kiếm.

Nêu **ba** chỗ trong hệ thống có thể gây ra rò rỉ này (chỉ một trong ba là "quên `WHERE`"). Rồi thiết kế biện pháp sao cho lỗi này **không thể lặp lại** — không phải sửa một truy vấn.
