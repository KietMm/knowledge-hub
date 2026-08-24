---
title: Chia bài toán lớn thành bài toán nhỏ
slug: chia-bai-toan-lon-thanh-nho
summary: Kỹ năng quyết định nhất và ít được dạy nhất: nhìn một yêu cầu mơ hồ và cắt nó thành những mảnh bạn biết cách làm.
level: co-ban
tags: [nen-tang, tu-duy, phan-ra, giai-quyet-van-de]
---

> **Sau bài này bạn sẽ:** có một quy trình lặp lại được để đi từ "tôi không biết bắt đầu từ đâu" tới dòng code đầu tiên, mà không phụ thuộc ngôn ngữ hay framework.

## Bí không phải vì thiếu cú pháp

Khi một lập trình viên ngồi im trước màn hình, gần như không bao giờ là vì quên viết vòng `for` thế nào. Là vì **bài toán trong đầu còn quá to để cầm nắm**.

Chia nhỏ không phải mẹo vặt. Nó là kỹ năng cốt lõi, và nó **chuyển được nguyên vẹn** giữa mọi ngôn ngữ, mọi framework, cả sang những thứ chưa ra đời.

## Quy trình bốn bước

Lấy một yêu cầu thật: *"Cho người dùng tải lên file CSV danh sách nhân viên, kiểm tra hợp lệ, rồi nhập vào hệ thống."*

### Bước 1 — Viết ra bằng tiếng Việt, dạng động từ

Đừng mở editor. Liệt kê **việc**, mỗi việc một dòng, mỗi dòng bắt đầu bằng động từ:

```
- Nhận file từ người dùng
- Đọc nội dung file thành các dòng
- Tách mỗi dòng thành các cột
- Kiểm tra từng dòng có hợp lệ không
- Gom các dòng lỗi lại để báo cáo
- Ghi các dòng hợp lệ vào database
- Trả kết quả: bao nhiêu thành công, bao nhiêu lỗi
```

Bảy việc. Chưa có việc nào đáng sợ. Cái đáng sợ ban đầu là *cả bảy việc dính vào nhau thành một cục*.

### Bước 2 — Tìm việc nào **không phụ thuộc** việc nào

Đây là bước quan trọng nhất, và hay bị bỏ qua. Trong bảy việc trên:

| Việc | Cần gì | Loại |
|---|---|---|
| Nhận file | HTTP, hệ thống file | I/O |
| Đọc thành dòng | chuỗi | **thuần** |
| Tách dòng thành cột | chuỗi | **thuần** |
| Kiểm tra một dòng | dữ liệu của chính dòng đó | **thuần** |
| Gom lỗi | danh sách kết quả | **thuần** |
| Ghi database | database | I/O |
| Trả kết quả | — | **thuần** |

Năm trên bảy là **hàm thuần** — làm được ngay, test được ngay, không cần dựng gì. Nhận ra điều này biến một bài toán "phải có server và database mới bắt đầu được" thành một bài toán bắt đầu được trong 30 giây. Vì sao điều này quan trọng, xem [[ham-dau-vao-dau-ra-va-tac-dung-phu]].

### Bước 3 — Làm việc dễ nhất trước, không phải việc đầu tiên

Bản năng bảo bạn bắt đầu từ "nhận file" vì nó đứng đầu danh sách. Đó thường là việc **khó nhất** (cần dựng server, cần form, cần cấu hình).

Bắt đầu từ **kiểm tra một dòng** — việc nhỏ nhất có kết quả nhìn thấy được:

```ts
type Dong = { ten: string; email: string; luong: string }
type LoiDong = { cot: string; loi: string }

function kiemTraDong(d: Dong): LoiDong[] {
  const loi: LoiDong[] = []
  if (!d.ten.trim()) loi.push({ cot: 'ten', loi: 'không được trống' })
  if (!d.email.includes('@')) loi.push({ cot: 'email', loi: 'sai định dạng' })
  if (Number.isNaN(Number(d.luong))) loi.push({ cot: 'luong', loi: 'phải là số' })
  return loi
}
```

```python
def kiem_tra_dong(d: Dong) -> list[LoiDong]:
    loi = []
    if not d.ten.strip():      loi.append(LoiDong('ten', 'không được trống'))
    if '@' not in d.email:     loi.append(LoiDong('email', 'sai định dạng'))
    if not d.luong.isnumeric(): loi.append(LoiDong('luong', 'phải là số'))
    return loi
```

Mười dòng, chạy được, test được. Bạn vừa đi từ *"không biết bắt đầu đâu"* sang *"đã xong 1/7"*. Và quan trọng hơn: đà tâm lý đã đổi chiều.

### Bước 4 — Ghép dần, mỗi lần một mảnh

```ts
function nhapCsv(noiDung: string): { hopLe: Dong[]; loi: { dong: number; loi: LoiDong[] }[] } {
  const dongs = tachDong(noiDung)      // ← mảnh 2
  const hopLe: Dong[] = []
  const loi: { dong: number; loi: LoiDong[] }[] = []

  dongs.forEach((d, i) => {
    const l = kiemTraDong(d)            // ← mảnh 1, đã xong và đã test
    if (l.length === 0) hopLe.push(d)
    else loi.push({ dong: i + 2, loi: l })   // +2: bỏ dòng tiêu đề, người dùng đếm từ 1
  })

  return { hopLe, loi }
}
```

Vẫn chưa có database, chưa có HTTP. Toàn bộ nghiệp vụ đã xong và đã test. Phần I/O còn lại là lớp vỏ mỏng nhất.

## Hai hướng cắt, và khi nào dùng cái nào

**Cắt theo bước xử lý** (như trên) — hợp khi dữ liệu chảy qua một chuỗi biến đổi: nhận → làm sạch → kiểm tra → lưu.

**Cắt theo trường hợp** — hợp khi bài toán là "nhiều tình huống khác nhau":

```
Đăng nhập:
  - Trường hợp: đúng mật khẩu       → phát phiên
  - Trường hợp: sai mật khẩu        → đếm số lần sai
  - Trường hợp: sai quá 5 lần       → khoá tạm
  - Trường hợp: tài khoản chưa kích hoạt → nhắc xác minh email
```

Làm từng trường hợp một, mỗi cái xong là một test. Cách này còn cho bạn thứ khó có được về sau: **danh sách trường hợp biên đầy đủ, viết ra trước khi code**.

## Dấu hiệu bạn cắt chưa đủ nhỏ

- Mảnh không mô tả được trong một câu không có chữ "và"
- Không nghĩ ra cách test nó nếu chưa có mảnh khác
- Ước lượng của bạn cho nó là "khoảng một hai ngày" — mảnh đủ nhỏ thường đo bằng chục phút
- Bạn vẫn thấy sợ khi nhìn vào nó

Điều ngược lại cũng có thật: cắt **quá** nhỏ thì bạn được mười hàm một dòng gọi lẫn nhau, và phải nhảy qua mười file mới hiểu một luồng. Chỗ dừng đúng là chủ đề của [[truu-tuong-hoa-khi-nao-tach]].

## Vì sao kỹ năng này chuyển được đi khắp nơi

Bảy việc ở đầu bài không có chữ nào là TypeScript hay Python. Chúng là **bài toán**, không phải **lời giải**. Khi bạn đổi sang Go, Rust, hay một framework chưa tồn tại, danh sách bảy dòng đó không đổi một chữ — chỉ cú pháp của bước 3 đổi.

Đó cũng là lý do người có kinh nghiệm bắt nhịp ngôn ngữ mới nhanh: họ không học lại cách nghĩ, chỉ tra cú pháp.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Mở editor trước khi liệt kê việc | Viết được 200 dòng rồi phát hiện hiểu sai yêu cầu | Viết bảy dòng tiếng Việt trước |
| Bắt đầu từ việc đứng đầu danh sách | Việc đó thường khó nhất, dễ nản ngay | Bắt đầu từ việc nhỏ nhất có kết quả thấy được |
| Dựng cả hạ tầng rồi mới viết nghiệp vụ | Chưa chạy được gì đã hết ngày | Làm phần thuần trước, I/O sau |
| Cắt mảnh còn quá to | Vẫn bí, chỉ là bí ở mức nông hơn | Cắt tiếp cho tới khi mỗi mảnh đo bằng chục phút |
| Cắt quá vụn | Mười file cho một luồng, đọc mệt hơn | Xem [[truu-tuong-hoa-khi-nao-tach]] |
| Không viết ra trường hợp biên trước | Phát hiện chúng lúc đã lên production | Liệt kê trường hợp ở bước 1 |

## Ghi nhớ

- Bí là vì bài toán còn to, không phải vì thiếu cú pháp.
- Bốn bước: liệt kê việc → tìm việc độc lập → làm việc **dễ nhất** trước → ghép dần.
- Phần thuần thường chiếm đa số và làm được ngay, không cần hạ tầng.
- Mảnh đủ nhỏ = tả được trong một câu không có chữ "và", đo bằng chục phút.
- Danh sách việc không chứa tên ngôn ngữ nào — nên nó theo bạn sang mọi ngôn ngữ.

## Tự kiểm tra

1. Vì sao nên bắt đầu từ việc dễ nhất thay vì việc đầu tiên trong danh sách?
2. Trong bảy việc của bài toán CSV, việc nào là hàm thuần và điều đó giúp gì?
3. Ba dấu hiệu cho biết một mảnh vẫn còn quá to?
