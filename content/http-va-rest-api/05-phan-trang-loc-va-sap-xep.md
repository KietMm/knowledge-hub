---
title: Phân trang, lọc và sắp xếp
slug: phan-trang-loc-va-sap-xep
summary: Offset hay cursor, và vì sao trang 2 đôi khi lặp lại bản ghi của trang 1.
level: trung-cap
tags: [rest, api-design, phan-trang, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được giữa offset và cursor bằng một câu hỏi, và hiểu vì sao phân trang offset **bỏ sót bản ghi** khi dữ liệu đang thay đổi.

## Ý tưởng chính

Không bao giờ trả về "tất cả". Hôm nay bảng có 200 dòng, sáu tháng sau có 2 triệu — và endpoint của bạn làm sập cả server lẫn trình duyệt.

Nhưng phân trang có hai cách, và chúng **không tương đương**: một cách đơn giản nhưng sai khi dữ liệu thay đổi, một cách đúng nhưng hạn chế hơn.

## Mental model

Hãy nghĩ tới hai cách đọc một chồng hồ sơ **mà người khác vẫn đang thêm vào**.

> **Offset là đếm từ đầu**: *"bỏ qua 20 tờ, đưa tôi 10 tờ tiếp"*. Nhưng nếu có ai chèn thêm 3 tờ vào đầu chồng trong lúc bạn đọc, thì "tờ thứ 21" bây giờ là tờ bạn **đã đọc rồi**.
>
> **Cursor là đánh dấu trang**: *"đưa tôi 10 tờ đứng sau tờ có mã DH-8817"*. Ai chèn thêm ở đâu cũng không sao — cái mốc của bạn vẫn ở đúng chỗ cũ.

Người ta chọn offset vì nó cho phép nhảy tới "trang 47". Nhưng cái giá là **kết quả không ổn định** khi dữ liệu thay đổi, và nó chậm dần ở trang sâu.

## Ví dụ nhỏ

```http
GET /don-hang?page=2&limit=20        # offset
GET /don-hang?cursor=eyJpZCI6MTIzfQ&limit=20   # cursor
```

## Code chạy thế nào

**Vì sao offset bỏ sót bản ghi** — lần theo từng bước:

```text
Danh sách sắp theo thời gian giảm dần, mỗi trang 3 dòng.

t=0  Dữ liệu:  [E, D, C, B, A]
     Trang 1 (offset 0, limit 3)  →  E, D, C   ✅

t=1  Ai đó thêm F:  [F, E, D, C, B, A]

t=2  Trang 2 (offset 3, limit 3)  →  C, B, A
                                     ↑ C ĐÃ ĐỌC ở trang 1, và không dòng nào bị mất
     Nếu thay vì thêm mà XOÁ E:   [D, C, B, A]
     Trang 2 (offset 3)           →  A
                                     ↑ B bị BỎ SÓT hoàn toàn
```

Người dùng cuộn xuống và thấy một mục xuất hiện hai lần, hoặc **không bao giờ thấy** một mục nào đó. Với danh sách sản phẩm thì khó chịu; với danh sách giao dịch thì là lỗi nghiêm trọng.

**Vì sao offset chậm ở trang sâu:**

```sql
SELECT * FROM don_hang ORDER BY tao_luc DESC LIMIT 20 OFFSET 100000;
-- Cơ sở dữ liệu phải ĐỌC VÀ BỎ ĐI 100.000 dòng đầu tiên rồi mới lấy 20 dòng
```

`OFFSET` không phải phép nhảy — nó là phép đếm. Trang 5000 chậm gấp hàng nghìn lần trang 1.

**Cursor tránh cả hai vấn đề:**

```sql
SELECT * FROM don_hang
WHERE (tao_luc, id) < ($1, $2)          -- mốc của trang trước
ORDER BY tao_luc DESC, id DESC
LIMIT 20;
-- Dùng thẳng index để NHẢY tới đúng chỗ — nhanh như nhau ở mọi trang
```

Chú ý cặp `(tao_luc, id)`: nếu hai bản ghi cùng `tao_luc`, chỉ so `tao_luc` thôi là bỏ sót hoặc lặp. Cần một trường **duy nhất** làm mốc phụ để thứ tự là toàn phần.

## Cú pháp

```json
// Offset — có tổng số, nhảy trang được
{
  "data": [...],
  "meta": { "trang": 2, "moiTrang": 20, "tong": 240, "soTrang": 12 }
}
```

```json
// Cursor — không có tổng số, chỉ đi tiếp
{
  "data": [...],
  "meta": { "cursorTiep": "eyJpZCI6MTIzfQ", "conNua": true }
}
```

Cursor thường là **base64 của một object** chứ không phải id trần — để bạn đổi được cấu trúc bên trong sau này mà không phá client:

```ts
const cursor = Buffer.from(JSON.stringify({ taoLuc, id })).toString('base64url')
```

Lọc và sắp xếp:

```http
GET /don-hang?trangThai=moi,dang_giao&tuNgay=2026-01-01&sapXep=-tao_luc,tong_tien
```

```text
tuNgay/denNgay      khoảng
trangThai=a,b       nhiều giá trị, phân tách bằng dấu phẩy
sapXep=-tao_luc     dấu trừ = giảm dần
```

## Tại sao cần nó

Vì sắp xếp là chỗ **SQL injection** hay lọt qua nhất — client truyền tên cột, và người ta ghép thẳng vào truy vấn:

```ts
// ❌ Ghép chuỗi — client gửi sapXep=id; DROP TABLE--
`ORDER BY ${req.query.sapXep}`

// ✅ Danh sách trắng
const COT_CHO_PHEP = { tao_luc: 'tao_luc', tong_tien: 'tong_tien' }
const cot = COT_CHO_PHEP[truong] ?? 'tao_luc'
```

Tham số truy vấn thông thường thì tham số hoá được, nhưng **tên cột và hướng sắp xếp thì không** — chúng phải đi qua danh sách trắng. Chi tiết ở [[sql-injection]].

Và ba giới hạn nên có ở mọi endpoint danh sách:

```text
· limit mặc định 20, TỐI ĐA 100      → chặn client xin 1 triệu dòng
· mọi cột lọc/sắp xếp phải có index   → [[index-va-hieu-nang-truy-van]]
· thứ tự phải TOÀN PHẦN (có tie-break) → không thì phân trang lặp/sót
```

## So sánh

| | Offset | Cursor |
|---|---|---|
| Nhảy tới trang bất kỳ | ✅ | ❌ chỉ đi tiếp/lùi |
| Có tổng số trang | ✅ | ❌ (đếm riêng thì đắt) |
| Ổn định khi dữ liệu đổi | ❌ **lặp/sót** | ✅ |
| Tốc độ ở trang sâu | ❌ chậm dần | ✅ như nhau |
| Cài đặt | Dễ | Phức tạp hơn |

Câu hỏi để chọn:

```text
Danh sách quản trị, dữ liệu ít thay đổi, cần nhảy trang  →  OFFSET
Bảng tin, feed, log, dữ liệu thêm liên tục               →  CURSOR
Dữ liệu lớn (>100k dòng)                                  →  CURSOR
```

## Dễ nhầm

**1. Không giới hạn `limit`.** Client gửi `limit=1000000` và server chết.

**2. Dùng offset cho feed cuộn vô hạn.** Đúng chỗ dữ liệu thay đổi liên tục nhất — người dùng sẽ thấy bài trùng.

**3. Thứ tự không toàn phần.** Sắp theo `tao_luc` mà nhiều bản ghi cùng giây thì thứ tự giữa chúng **không xác định**, và phân trang lặp/sót ngay cả khi dữ liệu đứng yên. Luôn thêm `id` làm tie-break.

**4. Ghép tên cột vào SQL.** Xem ở trên.

**5. Đếm tổng số ở mỗi request.** `SELECT COUNT(*)` trên bảng lớn có thể mất hàng giây. Cân nhắc: đếm ước lượng, cache, hoặc bỏ hẳn tổng số.

**6. Cursor lộ dữ liệu nội bộ.** Base64 **không phải mã hoá** — ai cũng giải ra được. Đừng nhét thông tin nhạy cảm vào cursor.

**7. Quên index cho cột sắp xếp.** Truy vấn cursor không có index thì còn chậm hơn offset.

## Mẹo nhớ

> **Offset đếm từ đầu; cursor đánh dấu trang.**
>
> **Dữ liệu đang thay đổi ⇒ offset lặp và sót.**
>
> **Thứ tự phải TOÀN PHẦN — luôn thêm `id` làm tie-break.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao offset bỏ sót bản ghi khi có người xoá dữ liệu giữa chừng?
2. Vì sao `OFFSET 100000` chậm — cơ sở dữ liệu làm gì ở đó?
3. Vì sao cursor cần **hai** trường `(tao_luc, id)` chứ không chỉ một?
4. Vì sao tên cột sắp xếp không tham số hoá được, và cách xử lý?
5. Câu hỏi nào quyết định chọn offset hay cursor?

## Tự viết lại

Không nhìn lại phần trên, thiết kế endpoint danh sách giao dịch:

```text
- Lọc theo khoảng ngày, loại giao dịch (nhiều giá trị)
- Sắp xếp theo số tiền hoặc thời gian
- 500.000 bản ghi, có thêm mới liên tục
- Client là app di động, cuộn vô hạn
```

Tự kiểm: bạn chọn offset hay cursor, cursor gồm những trường nào, và index bạn cần tạo là gì?

## Thử sức

Người dùng báo: *"tôi cuộn danh sách đơn hàng và thấy đơn DH-8817 xuất hiện hai lần"*.

Nêu **ba** nguyên nhân có thể (không phải cái nào cũng là phân trang), và cách phân biệt chúng bằng dữ liệu bạn có trong log. Rồi trả lời: sửa thế nào để lỗi này **không thể** xảy ra nữa, thay vì sửa một lần?
