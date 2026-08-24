---
title: Đặt tên và code đọc được
slug: dat-ten-va-code-doc-duoc
summary: Code được đọc nhiều gấp mười lần được viết. Tên tốt là hình thức tài liệu duy nhất không bao giờ lỗi thời.
level: co-ban
tags: [nen-tang, thiet-ke, dat-ten, clean-code]
---

> **Sau bài này bạn sẽ:** đặt được tên nói đúng ý định thay vì mô tả cơ chế, và biết khi nào một comment là dấu hiệu code cần sửa.

## Vì sao tên quan trọng hơn bạn tưởng

Một dòng code được viết một lần và đọc hàng chục lần — bởi đồng nghiệp, bởi người review, và nhiều nhất là bởi **chính bạn sáu tháng sau**, khi bối cảnh trong đầu đã bay hết.

Tên là **hình thức tài liệu duy nhất không lỗi thời**, vì nó nằm ngay chỗ code chạy. Comment nói dối được; tên biến sai thì lộ ngay khi đọc.

## Tên nói **ý định**, không nói cơ chế

```ts
// ❌ Mô tả cơ chế — đọc xong vẫn không biết để làm gì
const list = users.filter((u) => u.d !== null)
const flag = list.length > 0
if (flag) { process(list) }

// ✅ Nói ý định — đọc một lượt là hiểu nghiệp vụ
const daXoa = nguoiDungs.filter((u) => u.thoiDiemXoa !== null)
if (daXoa.length > 0) khoiPhuc(daXoa)
```

```python
# ❌                                    # ✅
d = [u for u in users if u.d]           da_xoa = [u for u in nguoi_dungs if u.thoi_diem_xoa]
if len(d) > 0: p(d)                     if da_xoa: khoi_phuc(da_xoa)
```

Câu hỏi kiểm tra: **đọc tên xong có phải mở ruột ra xem mới hiểu không?** Phải mở thì tên chưa đạt.

## Bốn luật đặt tên dùng được ở mọi ngôn ngữ

**① Độ dài tên tỉ lệ với phạm vi sống của nó.**

```ts
ds.map((u) => u.ten)                    // ✅ 'u' sống một dòng — ngắn là đúng

let u = await db.layNguoiDung(id)       // ❌ 'u' sống 40 dòng
// ... 40 dòng dùng u ...
let nguoiDungHienTai = await db.layNguoiDung(id)   // ✅
```

Biến sống một dòng thì `i`, `u`, `x` hoàn toàn ổn — thêm chữ chỉ thêm nhiễu. Biến sống cả hàm thì phải tự giải thích.

**② Boolean đặt tên như một câu khẳng định.**

```ts
if (user.status) { }              // ❌ status là gì? có? bật? hợp lệ?
if (nguoiDung.daKichHoat) { }     // ✅ đọc thành câu: "nếu người dùng đã kích hoạt"

if (!khong Cho Phep) { }          // ❌ phủ định của phủ định — não phải dịch hai lần
if (duocPhep) { }                 // ✅
```

Tránh phủ định trong tên. `if (!chuaXacMinh)` bắt người đọc đảo ngược trong đầu; `if (daXacMinh)` thì không.

**③ Hàm bắt đầu bằng động từ, và động từ phải đúng.**

| Tiền tố | Hứa điều gì | Vi phạm thì sao |
|---|---|---|
| `lay` / `get` | Trả về nhanh, không tác dụng phụ | `layX()` mà gọi API là bẫy người dùng |
| `tim` / `find` | Có thể không thấy → trả `null` | Trả về mà ném lỗi là sai hợp đồng |
| `tinh` / `calc` | Có tính toán, thuần | |
| `kiemTra` / `is` / `co` | Trả boolean | |
| `luu` / `xoa` / `gui` | **Có tác dụng phụ** | Tên phải nói rõ |
| `tai` / `nap` | Chậm, có I/O | |

Đây không phải quy ước hình thức — nó là hợp đồng. `layTenNguoiDung()` mà bên trong gọi ba API là lý do người ta viết vòng lặp gọi nó 1000 lần rồi không hiểu sao chậm.

**④ Đừng nhét kiểu vào tên.**

```ts
const userArray: User[] = []      // ❌ dấu [] đã nói rồi
const nguoiDungs: User[] = []     // ✅ số nhiều là đủ
const strTen: string              // ❌ Hungarian notation, đã lỗi thời từ lâu
```

## Số ma thuật và chuỗi ma thuật

```ts
// ❌ 86400 là gì? 3 là gì? Người sửa sau không dám đụng
if (Date.now() - t > 86400000) { }
if (don.trangThai === 3) { }

// ✅
const MOT_NGAY_MS = 24 * 60 * 60 * 1000
if (Date.now() - t > MOT_NGAY_MS) { }

const TrangThaiDon = { CHO: 1, DANG_GIAO: 2, DA_GIAO: 3 } as const
if (don.trangThai === TrangThaiDon.DA_GIAO) { }
```

Lợi ích thật không phải "đẹp hơn": nó là **tìm được**. Gõ `TrangThaiDon.DA_GIAO` vào ô tìm kiếm ra đúng mọi chỗ liên quan; gõ `3` ra ba nghìn kết quả vô nghĩa.

Ngoại lệ hợp lý: `0`, `1`, và những con số mà bối cảnh đã nói rõ (`arr.length - 1`).

## Comment: khi nào cần, khi nào là mùi

```ts
// ❌ Nói lại điều code đã nói
// tăng i lên 1
i++

// ❌ Comment thay cho việc đặt tên đúng
// kiểm tra xem người dùng đã kích hoạt và chưa bị khoá chưa
if (u.s === 1 && u.b === 0) { }

// ✅ Đặt tên đúng thì comment biến mất
if (nguoiDung.daKichHoat && !nguoiDung.biKhoa) { }
```

Comment cần thiết trả lời câu **"vì sao"**, thứ mà code không bao giờ nói được:

```ts
// Retry 3 lần: cổng thanh toán trả 503 rải rác khoảng 0,5% số lần,
// nhà cung cấp xác nhận đây là hành vi đã biết và khuyên thử lại.
// Đừng bỏ đoạn này khi thấy "code thừa" — đã từng bỏ và gây sự cố ngày 12/3.
for (let i = 0; i < 3; i++) { ... }
```

Comment này **không thể** thay bằng tên biến, vì nó chứa thông tin nằm ngoài code: một sự thật về thế giới. Giáo trình này dùng comment đúng theo lối đó — chỗ nào cũng ghi *vì sao chọn thế* chứ không ghi *đang làm gì*.

Quy tắc gọn: **code nói "làm gì", comment nói "vì sao".** Comment giải thích *làm gì* là dấu hiệu tên chưa đạt.

## Nhất quán quan trọng hơn đúng

```ts
// ❌ Cùng một khái niệm, ba tên trong một codebase
function layNguoiDung() {}
function fetchUser() {}
function getKhachHang() {}
```

Ba tên cho một thứ buộc người đọc phải nhớ rằng chúng là một. Chọn **một** từ cho **một** khái niệm rồi giữ nguyên — kể cả khi lựa chọn ban đầu không phải hay nhất. Nhất quán tiết kiệm nhiều công sức hơn tối ưu từng cái tên.

Chuyện tiếng Việt hay tiếng Anh cũng vậy: chọn một lối rồi giữ. Giáo trình này dùng tiếng Việt cho tên nghiệp vụ và giữ tiếng Anh cho thuật ngữ đã chuẩn hoá (`Map`, `commit`, `cache`) — quan trọng là **có luật**, không phải luật nào.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Tên viết tắt tự chế (`usrMgr`, `procDt`) | Người sau đoán sai nghĩa | Viết đủ chữ |
| Boolean tên phủ định (`khongHopLe`) | Não phải đảo ngược mỗi lần đọc | Đặt tên khẳng định |
| `lay...()` nhưng bên trong gọi API | Người dùng gọi trong vòng lặp, chậm bất ngờ | Đổi thành `tai...()` |
| Số ma thuật rải khắp | Sửa sót một chỗ | Đặt hằng số có tên |
| Comment mô tả code đang làm gì | Code đổi, comment nói dối | Sửa tên, xoá comment |
| Ba tên cho một khái niệm | Người đọc phải nhớ chúng là một | Một khái niệm, một từ |
| Tên dài cho biến sống một dòng | Nhiễu | Độ dài theo phạm vi |

## Ghi nhớ

- Code được đọc nhiều hơn được viết — người đọc chính là bạn, sáu tháng sau.
- Tên nói **ý định**, không nói cơ chế. Phải mở ruột mới hiểu = tên chưa đạt.
- Độ dài tên tỉ lệ với phạm vi sống.
- Động từ mở đầu hàm là một **hợp đồng** về chi phí và tác dụng phụ.
- Code nói *làm gì*, comment nói *vì sao*. Comment giải thích *làm gì* là mùi.
- Nhất quán ăn đứt tối ưu từng cái tên.

## Tự kiểm tra

1. Vì sao `if (!chuaXacMinh)` khó đọc hơn `if (daXacMinh)`?
2. Tiền tố `lay` và `tai` hứa hai điều khác nhau gì với người gọi?
3. Comment nào là cần thiết, comment nào là dấu hiệu code cần sửa?
