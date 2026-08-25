---
title: OOP thật sự là gì
slug: oop-that-su-la-gi
summary: Bốn tính chất trong sách chỉ có ba cái đáng giá. Vì sao kế thừa bị lạm dụng, và vì sao "ưu tiên kết hợp" là lời khuyên đắt giá nhất.
level: trung-cap
tags: [nen-tang, thiet-ke, oop, ke-thua, ket-hop]
khung: v2
---

> **Sau bài này bạn sẽ:** biết OOP giải bài toán gì (và không giải bài toán gì), và có một phép thử một câu để quyết định giữa kế thừa và kết hợp.

## Ý tưởng chính

OOP không sinh ra để "mô hình hoá thế giới thực" — đó là cách giải thích trong sách giáo khoa và nó gây hiểu nhầm rất nhiều.

OOP sinh ra để giải một bài toán cụ thể: **giữ dữ liệu luôn ở trạng thái hợp lệ, bằng cách buộc mọi thay đổi phải đi qua các cửa do chính nó quy định.**

## Mental model

Hãy nghĩ tới **máy ATM** so với **một két sắt mở toang**.

> Két mở toang: ai cũng thò tay lấy tiền, bỏ tiền vào, viết lại con số trên sổ. Không có gì bảo đảm con số trên sổ khớp với tiền trong két.
>
> ATM: bạn **không chạm được vào tiền**. Bạn chỉ có ba nút — rút, gửi, xem số dư — và mỗi nút đều kiểm tra trước khi làm. *"Rút 5 triệu khi số dư 2 triệu"* bị từ chối, chứ không âm thầm ghi số dư âm.

Cái ATM giấu tiền đi không phải để bí mật. Nó giấu để **không ai làm hỏng được sự nhất quán giữa tiền và sổ**. Đó chính là đóng gói, và đó là toàn bộ giá trị cốt lõi của OOP.

## Ví dụ nhỏ

```ts
// ❌ Két mở toang: ai cũng sửa được, không ai bảo đảm hợp lệ
const taiKhoan = { soDu: 100 }
taiKhoan.soDu = -50        // không ai chặn
taiKhoan.soDu = 'nhiều'    // cũng không ai chặn
```

```ts
// ✅ ATM: chỉ có cửa vào, và mỗi cửa tự kiểm tra
class TaiKhoan {
  #soDu = 0                                    // # = thật sự riêng tư

  rut(sum: number) {
    if (sum <= 0) throw new Error('Số tiền phải dương')
    if (sum > this.#soDu) throw new Error('Không đủ số dư')
    this.#soDu -= sum
  }

  get soDu() { return this.#soDu }              // đọc được, ghi thì không
}
```

Sau khi viết `TaiKhoan`, **không tồn tại đường nào** để đưa nó về trạng thái sai. Đó là thứ bạn mua được bằng OOP.

## Code chạy thế nào

Điều đáng để ý là **ai chịu trách nhiệm giữ quy tắc**:

```text
KÉT MỞ TOANG — quy tắc nằm rải ở mọi chỗ dùng
  chỗ A: if (sum <= soDu) soDu -= sum          ← nhớ kiểm
  chỗ B: soDu -= sum                            ← QUÊN kiểm  ← lỗi ở đây
  chỗ C: if (sum <= soDu) soDu -= sum          ← nhớ kiểm

  ⇒ có 3 chỗ có thể sai, và sẽ thành 10 chỗ sau một năm

ATM — quy tắc nằm đúng MỘT chỗ
  chỗ A, B, C: taiKhoan.rut(sum)
                    │
                    └─► kiểm tra ở đây, không ai bỏ qua được

  ⇒ có 1 chỗ có thể sai, và nó được test kỹ
```

Đây là lý do `private` không phải chuyện "che giấu": nó là cách **thu hẹp số chỗ có thể làm hỏng dữ liệu** từ N xuống 1.

## Tại sao cần nó

Vì không có nó, mọi trạng thái quan trọng đều dần trôi về trạng thái sai — không phải do ai ẩu, mà do **số chỗ chạm vào nó lớn dần theo thời gian**.

Nhưng cũng vì vậy, OOP chỉ đáng dùng khi **có trạng thái cần bảo vệ**. Một object chỉ chứa dữ liệu và không có quy tắc nào thì không cần class:

```ts
// Không cần class — nó chỉ là dữ liệu
type Diem = { x: number; y: number }
```

Ba tính chất đáng giá và một tính chất bị thổi phồng:

| Tính chất | Đáng giá? | Vì sao |
|---|---|---|
| **Đóng gói** | ⭐ cốt lõi | Thu hẹp chỗ có thể làm hỏng dữ liệu về một |
| **Đa hình** | ⭐ rất đáng | Thêm loại mới mà không sửa chỗ dùng |
| **Trừu tượng** | ⭐ đáng | Lộ ra ý định, giấu cơ chế |
| **Kế thừa** | ⚠️ dè chừng | Tạo liên kết chặt nhất trong mọi kiểu liên kết |

## So sánh

Kế thừa và kết hợp giải cùng một nhu cầu — dùng lại code — theo hai cách rất khác:

```ts
// Kế thừa: "Chim LÀ Động vật"
class Chim extends DongVat { }

// Kết hợp: "Chim CÓ khả năng bay"
class Chim {
  constructor(private cachDiChuyen: CachDiChuyen) {}
  diChuyen() { this.cachDiChuyen.thucHien() }
}
```

Vì sao kế thừa hay hỏng — bài toán kinh điển:

```ts
class Chim { bay() {} }
class ChimCanh extends Chim {}
class ChimCanhCut extends Chim {
  bay() { throw new Error('Cánh cụt không bay được') }   // ❌ vỡ hợp đồng
}
```

Mọi hàm nhận `Chim` giờ có thể nổ giữa chừng. Cây phân loại nghe rất tự nhiên lúc vẽ trên giấy, nhưng nó **cứng**: mỗi lớp con thừa hưởng *toàn bộ* lớp cha, kể cả phần không đúng với nó. Đây chính là chữ **L** trong SOLID ([[solid-giai-thich-bang-code-that]]).

| | Kế thừa | Kết hợp |
|---|---|---|
| Quan hệ | "LÀ một" | "CÓ một" |
| Quyết định lúc | Viết code | Chạy chương trình |
| Đổi hành vi | Sửa cây phân loại | Truyền thứ khác vào |
| Liên kết | **Chặt nhất** | Lỏng |
| Kết hợp nhiều hành vi | Rất khó (đa kế thừa) | Dễ |

Phép thử một câu: **"X có mãi mãi LÀ một Y, trong mọi hoàn cảnh, không ngoại lệ?"** Do dự một chút thôi thì chọn kết hợp.

## Dễ nhầm

**1. Tưởng dùng `class` là đang làm OOP.** Class chỉ chứa dữ liệu công khai, còn logic nằm ở service bên ngoài, thì đó là lập trình mệnh lệnh mặc áo OOP — và bạn mất đúng cái lợi duy nhất là giữ trạng thái hợp lệ. Xem [[ba-loi-viet-menh-lenh-oop-ham]].

**2. `private` hình thức.** Đặt `private` rồi mở luôn getter/setter cho mọi trường thì két vẫn mở toang, chỉ thêm hai lớp cửa giả:

```ts
class TaiKhoan {
  private soDu = 0
  getSoDu() { return this.soDu }
  setSoDu(v: number) { this.soDu = v }   // ❌ vẫn ghi được giá trị bất kỳ
}
```

Đóng gói thật là **không có setter** — chỉ có các hành vi nghiệp vụ (`rut`, `gui`) tự kiểm tra bên trong.

**3. Kế thừa để dùng lại code.** Đây là lý do sai phổ biến nhất. `class BaoCaoPDF extends TienIchFile` chỉ vì muốn dùng vài hàm tiện ích — trong khi báo cáo **không phải là** một tiện ích file. Cần dùng lại thì gọi hàm, hoặc truyền vào bằng kết hợp.

**4. Cây kế thừa sâu.** Ba tầng trở lên thì để hiểu một lớp bạn phải đọc cả ba, và sửa lớp cha có thể làm vỡ những lớp con bạn không hề biết tồn tại. Đây là **liên kết chặt nhất** trong mọi kiểu — xem [[ket-dinh-cao-lien-ket-long]].

**5. Bọc class quanh mọi thứ.** Một hàm thuần không có trạng thái thì cứ để là hàm. Bọc nó vào `class TinhToanHelper` chỉ thêm một lớp vỏ, không thêm quy tắc nào cần bảo vệ — đúng thứ mà [[truu-tuong-hoa-khi-nao-tach]] cảnh báo.

## Mẹo nhớ

> **OOP là cái ATM: giấu tiền đi để không ai làm lệch sổ.**
>
> **"LÀ một" thì kế thừa. "CÓ một" thì kết hợp. Do dự thì chọn kết hợp.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. OOP giải quyết bài toán gì — nói bằng một câu, không nhắc tới "thế giới thực"?
2. `private` thu hẹp cái gì, và vì sao điều đó quan trọng?
3. Vì sao `getSoDu`/`setSoDu` là đóng gói hình thức?
4. Phép thử một câu để chọn giữa kế thừa và kết hợp?
5. Vì sao kế thừa là kiểu liên kết chặt nhất?

## Tự viết lại

Không nhìn lại phần trên, viết lớp `GioHang` sao cho **không tồn tại cách nào** đưa nó về trạng thái sai:

```text
Quy tắc: số lượng mỗi món ≥ 1; tổng tiền luôn khớp với các món trong giỏ.
```

Tự kiểm: lớp của bạn có setter nào không? Nếu có, thử nghĩ xem người dùng nó có thể phá quy tắc nào bằng chính setter đó.

## Thử sức

Bạn có `class NhanVien` và cần thêm `NhanVienThoiVu` — không có bảo hiểm, tính lương theo giờ, không được duyệt nghỉ phép.

Kế thừa hay kết hợp? Trả lời rồi thử tiếp: nếu tháng sau có thêm *"nhân viên chính thức làm bán thời gian"* và *"cộng tác viên tính theo dự án"*, lựa chọn của bạn còn trụ được không?
