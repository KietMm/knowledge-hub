---
title: Đặt tên và code đọc được
slug: dat-ten-va-code-doc-duoc
summary: Code được đọc nhiều gấp mười lần được viết. Tên tốt là hình thức tài liệu duy nhất không bao giờ lỗi thời.
level: co-ban
tags: [nen-tang, thiet-ke, dat-ten, clean-code]
khung: v2
---

> **Sau bài này bạn sẽ:** nhìn một cái tên là biết nó tốt hay tệ theo tiêu chí rõ ràng, thay vì theo cảm giác — và biết khi nào một comment là dấu hiệu code cần sửa.

## Ý tưởng chính

Bạn viết một dòng code **một lần** và đọc lại nó **hàng chục lần** — lúc gỡ lỗi, lúc thêm tính năng, lúc người khác vào dự án. Nên tối ưu cho người viết là tối ưu sai chỗ.

Và trong mọi hình thức tài liệu, **tên là thứ duy nhất không bao giờ lỗi thời**: comment có thể nói dối sau khi code đổi, tài liệu ngoài có thể quên cập nhật, nhưng tên biến thì luôn nằm ngay cạnh thứ nó mô tả.

## Mental model

Hãy coi mỗi cái tên là một **lời hứa với người đọc tương lai**.

> Bạn viết `layNguoiDung()`. Người đọc tin rằng gọi nó thì được một người dùng — nhanh, không tác dụng phụ, không xoá gì.
>
> Nếu hàm đó còn âm thầm ghi log, gọi mạng và cập nhật cache, **bạn vừa nói dối** — và người đọc sẽ phát hiện ra vào lúc tệ nhất có thể.

Người đọc tương lai đó thường là **chính bạn, sáu tháng sau**, không còn nhớ gì về ngữ cảnh hôm nay. Đặt tên là viết thư cho người ấy.

## Ví dụ nhỏ

```ts
// Tên nói CƠ CHẾ — người đọc phải tự dịch sang ý nghĩa
const d = new Date().getTime() - u.t
if (d > 2592000000) { }
```

```ts
// Tên nói Ý ĐỊNH — đọc là hiểu
const MOT_THANG_MS = 30 * 24 * 60 * 60 * 1000
const thoiGianKhongHoatDong = Date.now() - nguoiDung.lanDangNhapCuoi
if (thoiGianKhongHoatDong > MOT_THANG_MS) { }
```

Hai đoạn chạy y hệt nhau. Đoạn dưới không cần comment nào, và không ai phải bấm máy tính xem `2592000000` là bao nhiêu ngày.

## Tại sao cần nó

Vì tên tệ không chỉ khó đọc — nó **giấu lỗi**.

```ts
function kiemTra(ds, x) {
  for (const i of ds) if (i.id === x) return true
  return false
}
```

Hàm này trả về `true` khi **tìm thấy**. Nhưng cái tên `kiemTra` không nói kết quả `true` nghĩa là gì: tìm thấy? hợp lệ? bị cấm? Người dùng nó sáu tháng sau rất dễ viết `if (!kiemTra(ds, id))` với ý "nếu hợp lệ" và tạo ra một lỗi logic không có dòng đỏ nào.

Đổi thành `coIdTrongDanhSach(ds, id)` thì câu `if (!coIdTrongDanhSach(...))` tự tố cáo ý định của nó.

## So sánh

Bốn luật đặt tên dùng được ở mọi ngôn ngữ:

| Luật | Tệ | Tốt |
|---|---|---|
| **Độ dài tỉ lệ với phạm vi sống** | `nguoiDungHienTai` cho biến chạy trong 2 dòng | `i`, `x` trong vòng lặp ngắn; tên dài cho biến sống cả file |
| **Boolean đọc như câu hỏi có/không** | `trangThai`, `flag`, `check` | `daThanhToan`, `coQuyenSua`, `laHetHan` |
| **Hàm bắt đầu bằng động từ nói việc nó làm** | `nguoiDung()`, `duLieu()` | `layNguoiDung()`, `tinhTongTien()`, `kiemTraEmail()` |
| **Không viết tắt trừ khi cả ngành dùng** | `usrMgr`, `calcTtl`, `procData` | `quanLyNguoiDung`; nhưng `id`, `url`, `db`, `api` thì được |

Ba cái tên nên tránh vì chúng **không loại trừ được gì**: `data`, `info`, `manager`. Nếu hàm của bạn tên `xuLyDuLieu` thì mọi hàm trong dự án cũng có thể mang tên đó.

## Dễ nhầm

**1. Tưởng tên ngắn là tên gọn.** Ngắn chỉ tốt khi phạm vi sống ngắn:

```ts
ds.map((x) => x * 2)                    // ✅ x sống trong 1 dòng
const x = await db.layDonHang(id)       // ❌ x sống suốt hàm 40 dòng
```

**2. Dùng comment để cứu một cái tên tệ.**

```ts
// ❌ comment đang gánh việc của cái tên
const d = 30   // số ngày giữ log trước khi xoá

// ✅ tên tự nói
const SO_NGAY_GIU_LOG = 30
```

Quy tắc: khi định viết comment giải thích *cái gì*, hãy thử đổi tên trước. Comment chỉ đáng viết khi nó nói **vì sao** — thứ code không bao giờ nói được:

```ts
// ✅ comment đúng loại: giải thích lý do, không giải thích cơ chế
// Retry 3 lần vì cổng thanh toán trả 503 ngẫu nhiên khoảng 1% số lần.
// Nhà cung cấp đã xác nhận đây là hành vi mong đợi (ticket #4821).
await thuLai(() => congThanhToan.tinhPhi(don), 3)
```

**3. Số ma thuật rải trong code.** `if (tuoi > 17)`, `setTimeout(fn, 300000)` — người đọc không biết 17 và 300000 từ đâu ra, và khi con số đổi thì phải đi tìm mọi chỗ. Đặt tên cho chúng, và chỗ khai báo trở thành nơi duy nhất phải sửa.

**4. Tên nói dối sau khi code đổi.** Hàm tên `layNguoiDung` nhưng giờ còn tạo mới nếu chưa có. Tên cũ **tệ hơn không có tên**, vì nó khiến người đọc tin vào điều sai. Đổi code thì đổi tên theo.

**5. Ưu tiên "đúng" hơn "nhất quán".** Nếu cả dự án dùng `fetchUser`, `fetchOrder`, thì hàm mới của bạn nên là `fetchInvoice` — kể cả khi bạn thấy `retrieveInvoice` chính xác hơn. Người đọc quét mắt theo khuôn mẫu; một cái tên lệch khuôn buộc họ dừng lại nghĩ.

## Mẹo nhớ

> **Tên là lời hứa với chính bạn sáu tháng sau.**
>
> **Comment nói VÌ SAO. Tên nói CÁI GÌ. Code nói THẾ NÀO.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao tên là hình thức tài liệu bền nhất?
2. Độ dài của một cái tên nên phụ thuộc vào điều gì?
3. Khi nào một comment là dấu hiệu code cần sửa, khi nào nó đáng viết?
4. Vì sao `if (!kiemTra(ds, id))` là câu nguy hiểm?
5. Vì sao đôi khi nên chọn cái tên "kém chính xác hơn" nhưng nhất quán với dự án?

## Tự viết lại

Không nhìn lại phần trên, đặt lại tên cho toàn bộ đoạn này:

```ts
function proc(d, f) {
  const r = []
  for (const i of d) {
    if (f && i.s === 1) r.push(i)
    else if (!f) r.push(i)
  }
  return r
}
```

Tự kiểm: sau khi đổi tên xong, đoạn code còn cần comment nào không? Và bạn có phát hiện ra logic của nó **rút gọn được** không?

## Thử sức

Bạn gặp hàm này trong dự án:

```ts
async function updateUser(id, data) {
  const u = await db.users.update(id, data)
  await sendEmail(u.email, 'Thông tin của bạn đã thay đổi')
  await audit.log('user.updated', id)
  return u
}
```

Cái tên có nói đúng những gì hàm làm không? Nếu không, bạn **đổi tên** hay **đổi code**? Hai lựa chọn dẫn tới hai thiết kế khác nhau — mỗi cái phù hợp lúc nào?
