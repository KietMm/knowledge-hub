---
title: SOLID giải thích bằng code thật
slug: solid-giai-thich-bang-code-that
summary: Năm chữ cái, mỗi chữ một lỗi cụ thể nó ngăn được. Bỏ định nghĩa sách vở, xem code trước và sau.
level: trung-cap
tags: [nen-tang, thiet-ke, solid, nguyen-ly]
khung: v2
---

> **Sau bài này bạn sẽ:** nhớ được năm nguyên lý qua **lỗi mà mỗi cái ngăn được**, thay vì qua định nghĩa — và biết khi nào áp dụng chúng là quá tay.

## Ý tưởng chính

SOLID không phải năm luật phải tuân thủ. Đó là **năm mô tả về những kiểu hỏng hay gặp**, mỗi cái kèm một cách tránh.

Cách học đúng: với mỗi chữ cái, đừng nhớ định nghĩa — nhớ **câu chuyện code hỏng như thế nào khi thiếu nó**.

## Mental model

Hãy coi năm nguyên lý như **năm câu hỏi bạn tự hỏi khi review một thiết kế**:

```text
S  →  "Ai là người sẽ yêu cầu sửa lớp này? Có nhiều hơn một người không?"
O  →  "Thêm loại mới thì tôi sửa code cũ hay chỉ viết thêm code mới?"
L  →  "Lớp con này có làm được MỌI thứ lớp cha hứa không?"
I  →  "Người dùng có bị bắt phụ thuộc vào thứ họ không dùng không?"
D  →  "Phần nghiệp vụ đang phụ thuộc vào chi tiết kỹ thuật cụ thể nào?"
```

Năm câu này dùng được ngay, kể cả khi bạn quên tên đầy đủ của các nguyên lý.

## Ví dụ nhỏ

Chữ **S** — trách nhiệm đơn nhất — nhìn cho cụ thể:

```ts
// ❌ Ba người khác nhau có thể yêu cầu sửa lớp này
class BaoCaoDoanhThu {
  tinhDoanhThu() {}      // ← kế toán yêu cầu đổi công thức
  dinhDangPDF() {}       // ← marketing yêu cầu đổi layout
  guiEmail() {}          // ← kỹ thuật đổi nhà cung cấp mail
}
```

```ts
// ✅ Mỗi lớp một lý do thay đổi
class TinhDoanhThu {}
class XuatPDF {}
class GuiMail {}
```

"Trách nhiệm đơn nhất" **không** có nghĩa là "một lớp chỉ có một hàm". Nó nghĩa là: **một lớp chỉ nên có một lý do để thay đổi** — và cách nhận ra lý do là hỏi *ai* sẽ yêu cầu thay đổi đó.

## Code chạy thế nào

Chữ **O** — mở để mở rộng, đóng để sửa đổi — thấy rõ nhất qua cách code **lớn lên**:

```text
KHÔNG có O — mỗi loại mới là một lần sửa hàm cũ
  v1:  if (loai === 'the')     { ... }
  v2:  if (loai === 'the')     { ... }
       else if (loai === 'momo') { ... }        ← sửa hàm cũ
  v3:  else if (loai === 'zalopay') { ... }     ← lại sửa hàm cũ
       ⇒ hàm phình dần, và mỗi lần sửa đều có nguy cơ làm vỡ nhánh cũ

CÓ O — mỗi loại mới là một file mới
  const congThanhToan = { the: new The(), momo: new Momo() }
  congThanhToan[loai].thanhToan(sum)

  v3:  thêm  zalopay: new ZaloPay()             ← thêm dòng khai báo, không sửa logic
       ⇒ code cũ đã chạy đúng thì không bị đụng vào
```

```ts
interface CongThanhToan { thanhToan(sum: number): void }

class The implements CongThanhToan { thanhToan(s) {} }
class Momo implements CongThanhToan { thanhToan(s) {} }

const cong: Record<string, CongThanhToan> = { the: new The(), momo: new Momo() }
cong[loai].thanhToan(sum)
```

Điểm mấu chốt: nguy cơ làm vỡ nằm ở việc **sửa code đang chạy đúng**. Nguyên lý này không làm code ít đi — nó chuyển thay đổi từ "sửa" sang "thêm".

## Tại sao cần nó

Vì mỗi chữ cái ngăn một kiểu hỏng rất cụ thể:

| Chữ | Câu hỏi | Lỗi nó ngăn |
|---|---|---|
| **S** | Ai yêu cầu sửa lớp này? | Sửa layout PDF làm vỡ công thức doanh thu |
| **O** | Thêm loại mới thì sửa hay thêm? | Thêm cổng thanh toán làm vỡ cổng cũ |
| **L** | Lớp con làm được mọi thứ cha hứa? | `ChimCanhCut.bay()` ném lỗi giữa chừng |
| **I** | Có bị ép phụ thuộc thứ không dùng? | Đổi một hàm trong interface to làm 10 lớp phải sửa |
| **D** | Nghiệp vụ dính chi tiết kỹ thuật? | Không test được vì phải có cơ sở dữ liệu thật |

Chữ **L** (Liskov) nói gọn: **lớp con phải dùng được ở mọi chỗ lớp cha dùng được, không gây bất ngờ**. Vi phạm nó thì đa hình mất tác dụng, vì người gọi bắt đầu phải hỏi "đây thật ra là loại gì?" — và thế là quay lại `if/else`.

Chữ **I** (tách giao diện): một interface 15 hàm bắt mọi bản cài đặt phải làm đủ 15, kể cả thứ chúng không cần. Tách thành ba interface nhỏ thì mỗi bên chỉ phụ thuộc phần nó dùng.

Chữ **D** (đảo ngược phụ thuộc): phần nghiệp vụ **không được** phụ thuộc vào Postgres, SendGrid hay S3 — nó phụ thuộc vào một hợp đồng, và chi tiết kỹ thuật cài hợp đồng đó. Đây chính là ví dụ `dangKy(email, boGuiMail)` ở [[ket-dinh-cao-lien-ket-long]], và là thứ làm test viết được mà không dựng cả hệ thống ([[test-double-stub-mock-fake]]).

## So sánh

Điều ít ai nói: **năm nguyên lý này không độc lập, và chúng chỉ là hệ quả của hai thước đo**:

```text
S, I  →  làm KẾT DÍNH cao hơn  (mỗi thứ chỉ chứa cái thuộc về nhau)
O, L, D  →  làm LIÊN KẾT lỏng hơn  (phụ thuộc vào hợp đồng, không vào chi tiết)
```

Nên nếu chỉ nhớ được một thứ, hãy nhớ hai thước đo — SOLID sẽ tự suy ra được. Đó cũng là lý do bài này đứng **sau** bài kết dính/liên kết chứ không phải trước.

## Dễ nhầm

**1. Áp dụng SOLID cho code chưa cần.** Tạo interface cho một lớp duy nhất, tách một lớp 30 dòng thành năm lớp — bạn vừa mua bảo hiểm cho thay đổi chưa chắc xảy ra, và trả bằng năm chỗ phải nhảy tới khi đọc. Chờ tới khi có **lý do cụ thể**.

**2. Hiểu S thành "một lớp một hàm".** Trách nhiệm đo bằng **lý do thay đổi**, không đo bằng số hàm. Lớp `TaiKhoan` có `rut`, `gui`, `xemSoDu` vẫn là một trách nhiệm: giữ số dư luôn hợp lệ.

**3. Hiểu O thành "không bao giờ sửa code cũ".** Sửa code cũ là chuyện bình thường và cần thiết. O chỉ nói: với **trục thay đổi mà bạn đã biết là sẽ có** (thêm cổng thanh toán, thêm định dạng xuất), hãy làm sao thêm được mà không phải sửa.

**4. Tưởng vi phạm L chỉ xảy ra với kế thừa.** Nó xảy ra với mọi hợp đồng: một bản cài đặt `LuuTru` ném lỗi ở hàm `xoa()` trong khi các bản khác thì không, cũng là vi phạm L — dù chẳng có `extends` nào.

**5. Coi SOLID là mục tiêu.** Mục tiêu là code dễ đổi. SOLID là **phương tiện**, và có lúc phương tiện đó không phù hợp — xem [[khi-cac-nguyen-ly-mau-thuan]].

## Mẹo nhớ

> **S** ai yêu cầu sửa · **O** thêm chứ đừng sửa · **L** con phải giữ lời cha hứa · **I** đừng ép người ta ôm thứ họ không dùng · **D** nghiệp vụ không được biết tên nhà cung cấp.

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Chữ S đo trách nhiệm bằng gì — số hàm hay lý do thay đổi? Cho ví dụ.
2. Chữ O chuyển thay đổi từ dạng nào sang dạng nào?
3. `ChimCanhCut.bay()` ném lỗi vi phạm chữ nào, và hậu quả với người gọi là gì?
4. Chữ D nói phần nghiệp vụ **không được** phụ thuộc vào cái gì?
5. Năm nguyên lý này quy về hai thước đo nào?

## Tự viết lại

Không nhìn lại phần trên, chỉ ra lớp này vi phạm những chữ nào và sửa lại:

```ts
class XuLyDonHang {
  constructor() { this.db = new PostgresClient() }

  xuLy(don, loaiThanhToan) {
    if (loaiThanhToan === 'the') { /* ... */ }
    else if (loaiThanhToan === 'momo') { /* ... */ }
    this.db.query('INSERT INTO don_hang ...')
    this.guiMailXacNhan(don)
  }
}
```

Tự kiểm: sau khi sửa, bạn có test được `xuLy` mà **không cần Postgres** không?

## Thử sức

Đội bạn có quy tắc: *"mọi service đều phải có interface"*. Hiện có 40 interface, và **38 cái chỉ có đúng một bản cài đặt**.

Quy tắc đó đang phục vụ chữ D hay đang vi phạm tinh thần của SOLID? Nêu **tiêu chí cụ thể** để quyết định service nào cần interface, service nào không — tiêu chí phải trả lời được bằng dữ kiện, không bằng cảm giác.
