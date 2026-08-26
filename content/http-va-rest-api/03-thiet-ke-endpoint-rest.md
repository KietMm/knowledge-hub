---
title: Thiết kế endpoint REST
slug: thiet-ke-endpoint-rest
summary: Đặt URL theo danh từ, lồng tài nguyên đúng mức, và xử lý những thao tác không phải CRUD.
level: co-ban
tags: [rest, api-design, url]
khung: v2
---

> **Sau bài này bạn sẽ:** đặt được URL mà người khác đoán ra trước khi đọc tài liệu, và biết xử lý những thao tác không vừa khuôn CRUD.

## Ý tưởng chính

Nguyên tắc REST gói trong một câu: **URL là danh từ, phương thức là động từ**.

`/don-hang/123` nói *cái gì*; `GET` hay `DELETE` nói *làm gì với nó*. Nhét động từ vào URL (`/layDonHang`, `/xoaDonHang`) là nói cùng một thứ hai lần, và làm mất khả năng đoán.

## Mental model

Hãy nghĩ tới **địa chỉ nhà và các loại thao tác của bưu tá**.

> Địa chỉ luôn là **một chỗ**: *"số 12 đường Láng"*. Nó không đổi theo việc bạn định làm.
>
> Việc cần làm nằm ở **loại thư**: giao thư, thu thư, chuyển phát nhanh.
>
> Không ai viết địa chỉ là *"đi-giao-thư-số-12-đường-Láng"*.

Từ đó suy ra tính chất quan trọng nhất của API tốt: **đoán được**. Biết `/don-hang/123` thì đoán ra `/don-hang`, `/nguoi-dung/45`, `/nguoi-dung/45/don-hang` — mà không cần mở tài liệu.

## Ví dụ nhỏ

```text
❌ Động từ trong URL           ✅ Danh từ + phương thức
GET  /layDanhSachDonHang       GET    /don-hang
POST /taoDonHang               POST   /don-hang
POST /xoaDonHang?id=1          DELETE /don-hang/1
POST /capNhatDonHang           PATCH  /don-hang/1
```

## Code chạy thế nào

Bốn quy tắc đặt URL, mỗi cái có lý do cụ thể:

```text
① Danh từ SỐ NHIỀU cho tập hợp
   /don-hang           ← tập hợp
   /don-hang/123       ← một phần tử trong tập đó
   Nhất quán số nhiều thì không ai phải nhớ chỗ nào số ít chỗ nào số nhiều.

② Chữ thường, nối bằng gạch NGANG
   /don-hang-cho-duyet     ✅
   /donHangChoDuyet        ❌ URL phân biệt hoa thường trên nhiều server
   /don_hang_cho_duyet     ❌ gạch dưới bị gạch chân che mất trong link

③ Không có đuôi định dạng
   /don-hang.json          ❌ định dạng thuộc về header Accept
   /don-hang               ✅

④ Lồng TỐI ĐA một cấp
   /nguoi-dung/45/don-hang            ✅
   /nguoi-dung/45/don-hang/12/dong/3  ❌
```

Vì sao quy tắc ④: URL lồng sâu **khoá chặt cấu trúc dữ liệu vào API**. Ngày nào đó một dòng đơn hàng thuộc về hai đơn, hoặc bạn muốn lấy dòng đơn hàng mà không biết đơn nào — URL đó thành vô dụng.

```text
Cần lấy dòng số 3:   /dong-don-hang/3            ← truy cập thẳng bằng id
Cần lọc theo đơn:    /dong-don-hang?donHangId=12  ← dùng query
```

## Cú pháp

**Thao tác không phải CRUD** — chỗ REST hay bị chê là cứng nhắc. Có ba cách xử lý, xếp theo thứ tự nên thử:

```text
① Biến hành động thành TÀI NGUYÊN
   POST /don-hang/123/huy            ← "huỷ" là một sự kiện, tạo nó ra
   POST /nguoi-dung/45/xac-thuc-email

② Đổi TRẠNG THÁI bằng PATCH
   PATCH /don-hang/123    {"trangThai": "da_huy"}

③ Tài nguyên con thể hiện quan hệ
   PUT    /bai-viet/1/luot-thich/me     ← thích
   DELETE /bai-viet/1/luot-thich/me     ← bỏ thích
```

Cách ① là cách dùng nhiều nhất trong thực tế, và nó hợp lý về mặt nghiệp vụ: *"huỷ đơn"* thường kèm lý do, thời điểm, người thực hiện — nó **là** một bản ghi, không chỉ là một trường đổi giá trị.

Đừng ép mọi thứ vào CRUD. `POST /thanh-toan/123/hoan-tien` rõ ràng hơn nhiều so với `PATCH /thanh-toan/123 {"trangThai": "hoan_tien"}`, vì hoàn tiền là **một hành động có hệ quả**, không phải một phép gán.

## Tại sao cần nó

Vì **hình dạng response nhất quán** quyết định client viết code dễ hay khó:

```json
// Một phần tử
{ "id": "123", "tong": 500000 }

// Danh sách — luôn bọc trong object, đừng trả mảng trần
{
  "data": [ ... ],
  "meta": { "tong": 240, "trang": 1, "moiTrang": 20 }
}
```

Vì sao **không** trả mảng trần `[...]`:

```text
· Không có chỗ để thêm phân trang, tổng số, cảnh báo
· Thêm chúng sau này là THAY ĐỔI PHÁ VỠ
· Một số client cũ không parse được mảng ở cấp cao nhất (vấn đề bảo mật JSON cũ)
```

Và ba quy ước nhỏ nhưng tiết kiệm rất nhiều tranh cãi:

```text
· Tên trường: nhất quán một kiểu (camelCase HOẶC snake_case), không trộn
· Thời gian: LUÔN ISO 8601 kèm múi giờ — "2026-08-26T10:30:00Z"
· Tiền: số nguyên đơn vị nhỏ nhất, hoặc chuỗi thập phân — không dùng float
```

Ba dòng đó nên nằm trong tài liệu dự án ngay từ endpoint đầu tiên, vì sửa sau là thay đổi phá vỡ.

## So sánh

| Nhu cầu | Cách làm |
|---|---|
| Lấy một tài nguyên | `GET /don-hang/123` |
| Lấy danh sách có lọc | `GET /don-hang?trangThai=moi` — [[phan-trang-loc-va-sap-xep]] |
| Tài nguyên con của một tài nguyên | `GET /nguoi-dung/45/don-hang` |
| Quan hệ nhiều-nhiều | `PUT /bai-viet/1/the/2` |
| Hành động nghiệp vụ | `POST /don-hang/123/huy` |
| Tìm kiếm phức tạp | `POST /don-hang/tim-kiem` với body |

Dòng cuối là ngoại lệ hợp lệ: khi điều kiện tìm kiếm quá dài cho query string (URL có giới hạn ~2000 ký tự), dùng `POST` với body — và chấp nhận rằng nó không cache được.

## Dễ nhầm

**1. Động từ trong URL.** `/getUsers`, `/deleteOrder` — bạn đang lặp lại thứ phương thức đã nói.

**2. Trộn số ít và số nhiều.** `/user/1` và `/orders/2` trong cùng một API buộc người dùng phải tra từng endpoint.

**3. Lồng quá sâu.** Xem quy tắc ④.

**4. Trả mảng trần cho danh sách.** Bạn tự chặn đường thêm metadata.

**5. Trộn `camelCase` và `snake_case`.** Thường xảy ra khi API mới viết theo kiểu này, còn phần cũ theo kiểu kia — và client phải nhớ từng endpoint.

**6. Trả thời gian không có múi giờ.** `"2026-08-26 10:30:00"` là 10:30 ở đâu? Client đoán, và đoán sai.

**7. Ép hành động nghiệp vụ vào PATCH.** `PATCH {"trangThai": "da_thanh_toan"}` giấu mất việc thanh toán là một quy trình có hệ quả, và mở đường cho client tự đặt trạng thái tuỳ ý.

## Mẹo nhớ

> **URL là địa chỉ (danh từ); phương thức là loại thư (động từ).**
>
> **Lồng tối đa một cấp — sâu hơn thì dùng query.**
>
> **Danh sách luôn bọc trong object, đừng trả mảng trần.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao không đặt động từ trong URL?
2. Vì sao chỉ nên lồng tài nguyên một cấp?
3. Ba cách xử lý thao tác không phải CRUD?
4. Vì sao không trả mảng trần cho danh sách?
5. Khi nào dùng `POST` cho một thao tác **đọc**?

## Tự viết lại

Không nhìn lại phần trên, thiết kế endpoint cho một hệ thống blog:

```text
- Xem danh sách bài, xem một bài
- Tạo/sửa/xoá bài
- Bình luận vào bài; xoá bình luận
- Thích / bỏ thích một bài
- Xuất bản một bài nháp
- Tìm bài theo từ khoá, tác giả, khoảng ngày
```

Tự kiểm: "xuất bản" của bạn là `PATCH` hay `POST /bai-viet/1/xuat-ban`? Nêu lý do — và nói xem nếu xuất bản cần lưu **thời điểm và người xuất bản** thì lựa chọn nào đúng hơn.

## Thử sức

Team di động yêu cầu: *"cho tôi một endpoint trả về đơn hàng kèm thông tin khách, kèm 5 sản phẩm đầu, kèm trạng thái giao hàng — để tôi khỏi gọi 4 lần"*.

Nêu **ba** cách đáp ứng, với đánh đổi của từng cách. Câu khó: cách nào khiến bạn phải sửa server mỗi khi màn hình di động thay đổi, và làm sao tránh điều đó?
