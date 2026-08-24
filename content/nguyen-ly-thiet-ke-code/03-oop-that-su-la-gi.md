---
title: OOP thật sự là gì
slug: oop-that-su-la-gi
summary: Bốn tính chất trong sách chỉ có ba cái đáng giá. Vì sao kế thừa bị lạm dụng, và vì sao "ưu tiên kết hợp" là lời khuyên đắt giá nhất.
level: trung-cap
tags: [nen-tang, thiet-ke, oop, ke-thua, ket-hop]
---

> **Sau bài này bạn sẽ:** hiểu OOP giải bài toán gì, phân biệt được đóng gói thật với `private` hình thức, và biết vì sao gần như mọi lần bạn định dùng kế thừa thì kết hợp mới là đáp án.

## OOP giải bài toán gì

Trước OOP, chương trình là dữ liệu ở một nơi và hàm ở nơi khác. Vấn đề: **không gì buộc dữ liệu ở trạng thái hợp lệ**.

```ts
const taiKhoan = { soDu: 100 }
taiKhoan.soDu = -5000        // không ai chặn — số dư âm giờ tồn tại trong hệ thống
```

OOP đề xuất: **gói dữ liệu cùng với các phép hợp lệ trên nó, và không cho ai chạm vào dữ liệu theo đường khác.**

```ts
class TaiKhoan {
  private soDu: number
  constructor(banDau: number) {
    if (banDau < 0) throw new Error('Số dư ban đầu không được âm')
    this.soDu = banDau
  }
  rut(tien: number): void {
    if (tien <= 0) throw new Error('Số tiền rút phải dương')
    if (tien > this.soDu) throw new Error('Không đủ số dư')
    this.soDu -= tien
  }
  xem(): number { return this.soDu }
}
```

```python
class TaiKhoan:
    def __init__(self, ban_dau: float):
        if ban_dau < 0: raise ValueError('Số dư ban đầu không được âm')
        self._so_du = ban_dau

    def rut(self, tien: float) -> None:
        if tien <= 0:        raise ValueError('Số tiền rút phải dương')
        if tien > self._so_du: raise ValueError('Không đủ số dư')
        self._so_du -= tien
```

Cái bạn được không phải cú pháp `class`. Là **một bất biến**: *ở bất kỳ thời điểm nào, `soDu` không bao giờ âm* — và bạn chứng minh được điều đó bằng cách đọc **một** file, vì không có đường nào khác chạm tới nó.

Đây là giá trị thật của OOP, và nó chỉ tồn tại nếu bạn thực sự đóng cửa.

## Đóng gói thật và `private` hình thức

Rất nhiều class có `private` nhưng chẳng đóng gói gì:

```ts
// ❌ private hình thức — getter/setter mở toang lại đúng cái vừa đóng
class TaiKhoan {
  private soDu: number = 0
  getSoDu() { return this.soDu }
  setSoDu(x: number) { this.soDu = x }   // ← ai cũng đặt -5000 được
}
```

Class này y hệt một object trần, chỉ dài hơn ba lần. Sinh `getX/setX` cho mọi trường là thói quen từ công cụ sinh code, không phải thiết kế.

Một bẫy tinh vi hơn, có thật và hay gặp:

```ts
class GioHang {
  private items: Item[] = []
  layItems(): Item[] { return this.items }   // ❌ trả về CHÍNH mảng bên trong
}

const g = new GioHang()
g.layItems().push(itemLau)      // sửa được ruột từ bên ngoài, vòng qua mọi kiểm tra
```

Đúng ra:

```ts
layItems(): readonly Item[] { return [...this.items] }   // ✅ trả bản sao
```

Đây là hệ quả trực tiếp của [[bien-trang-thai-va-luong-dieu-khien]]: trả về một mảng là trả **đường tới** mảng đó, không phải bản sao.

Câu hỏi kiểm tra đóng gói: **có cách nào đưa object này vào trạng thái không hợp lệ từ bên ngoài không?** Có, thì `private` chỉ là trang trí.

## Bốn tính chất — ba cái đáng giá

**① Đóng gói** — giấu trạng thái, chỉ lộ phép hợp lệ. ✅ Giá trị cốt lõi, như trên.

**② Trừu tượng** — lộ ra *cái gì*, giấu *thế nào*. ✅ Đáng giá, chi tiết ở [[truu-tuong-hoa-khi-nao-tach]].

**③ Đa hình** — nhiều loại đáp ứng cùng một giao diện, chỗ gọi không cần biết loại nào. ✅ Đáng giá, và **là thứ dùng nhiều nhất trong thực tế**:

```ts
interface CongThanhToan { tru(tien: number): Promise<KetQua> }

class Momo implements CongThanhToan   { async tru(t) { /* ... */ } }
class VnPay implements CongThanhToan  { async tru(t) { /* ... */ } }
class TheTest implements CongThanhToan { async tru(t) { return { ok: true } } }

// Chỗ gọi không đổi một chữ khi thêm cổng mới
async function thanhToan(cong: CongThanhToan, tien: number) {
  return cong.tru(tien)
}
```

Chú ý: đa hình ở đây **không cần kế thừa** — chỉ cần cùng một giao diện. Điều này quan trọng, vì nó tách được thứ hữu ích ra khỏi thứ gây rắc rối.

**④ Kế thừa** — ⚠️ **cái này mới là vấn đề.**

## Vì sao kế thừa bị lạm dụng

Kế thừa được dạy như "cách dùng lại code". Đó là cách hiểu sai, và nó dẫn tới:

```ts
// ❌ Kế thừa để dùng lại — nghe hợp lý, sai bản chất
class DanhSach<T> {
  protected items: T[] = []
  them(x: T) { this.items.push(x) }
  soLuong() { return this.items.length }
}

class NganXep<T> extends DanhSach<T> {     // "ngăn xếp cũng là một danh sách mà?"
  lay(): T | undefined { return this.items.pop() }
}

const s = new NganXep<number>()
s.them(1)
s.items.splice(0, 1)     // ❌ ngăn xếp bị sửa từ giữa — phá vỡ chính định nghĩa của nó
```

`NganXep` thừa hưởng **toàn bộ** bề mặt của `DanhSach`, kể cả những phép làm nó không còn là ngăn xếp nữa.

Ba vấn đề thật của kế thừa:

- **Liên kết chặt nhất có thể.** Lớp con phụ thuộc vào cả chi tiết bên trong lớp cha. Đổi lớp cha vỡ mọi lớp con, và bạn không biết có bao nhiêu lớp con.
- **Bài toán lớp cha mong manh.** Lớp cha đổi cách một phương thức gọi phương thức khác — lớp con vỡ dù chữ ký không đổi chút nào.
- **Chỉ có một cha.** Cần hành vi từ hai chỗ thì hết cách, sinh ra cây kế thừa méo mó.

Và cái bẫy kinh điển nhất, cho thấy "là một" không đủ để dùng kế thừa:

```ts
class HinhChuNhat {
  constructor(protected r: number, protected c: number) {}
  datRong(x: number) { this.r = x }
  datCao(x: number) { this.c = x }
  dienTich() { return this.r * this.c }
}

class HinhVuong extends HinhChuNhat {    // toán học nói hình vuông LÀ hình chữ nhật
  datRong(x: number) { this.r = this.c = x }
  datCao(x: number)  { this.r = this.c = x }
}

function kiemTra(h: HinhChuNhat) {
  h.datRong(5); h.datCao(4)
  console.log(h.dienTich())     // mong đợi 20 — với HinhVuong ra 16
}
```

Hàm `kiemTra` đúng với `HinhChuNhat` và sai với `HinhVuong`. Đây là vi phạm **nguyên lý thay thế** — chữ L trong [[solid-giai-thich-bang-code-that]]. Bài học: quan hệ "là một" trong đời thật **không** đảm bảo thay thế được trong code.

## Ưu tiên kết hợp

Thay vì *"ngăn xếp **là một** danh sách"*, dùng *"ngăn xếp **có một** mảng"*:

```ts
// ✅ Kết hợp — chỉ lộ đúng phép của ngăn xếp
class NganXep<T> {
  private items: T[] = []            // có một mảng, không phải là một mảng
  day(x: T) { this.items.push(x) }
  lay(): T | undefined { return this.items.pop() }
  soLuong() { return this.items.length }
}
```

```python
class NganXep:
    def __init__(self): self._items = []
    def day(self, x):  self._items.append(x)
    def lay(self):     return self._items.pop() if self._items else None
```

Không ai chạm được vào giữa. Bề mặt đúng bằng cái bạn muốn cho phép.

| | Kế thừa | Kết hợp |
|---|---|---|
| Quan hệ | "là một" | "có một" |
| Bề mặt lộ ra | **toàn bộ** của cha | đúng cái bạn chọn |
| Đổi lúc chạy | không | có |
| Số nguồn hành vi | một cha | bao nhiêu cũng được |
| Lớp cha đổi | lớp con có thể vỡ | không ảnh hưởng |

Nguyên tắc: **kết hợp để dùng lại code, giao diện để đa hình, kế thừa chỉ khi thật sự là quan hệ thay thế được.**

## Vậy khi nào kế thừa đúng

Vẫn có chỗ dùng đúng, chỉ là ít hơn nhiều so với lượng người ta dùng:

- Lớp con **thay thế được hoàn toàn** cho lớp cha ở mọi chỗ, không có ngoại lệ
- Lớp cha là **trừu tượng**, chỉ định nghĩa hợp đồng, không giữ trạng thái
- Cây kế thừa **nông** (một, tối đa hai tầng)
- Framework yêu cầu (`extends Error`, `extends Component`)

Nếu phân vân, chọn kết hợp. Chuyển từ kết hợp sang kế thừa dễ; gỡ một cây kế thừa bốn tầng thì không.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Sinh `getX/setX` cho mọi trường | Đóng gói bằng không, chỉ dài hơn | Chỉ lộ phép hợp lệ |
| Trả thẳng mảng/object bên trong | Sửa được ruột từ ngoài | Trả bản sao hoặc `readonly` |
| Kế thừa để dùng lại code | Lộ cả bề mặt không mong muốn | Kết hợp |
| Cây kế thừa 4–5 tầng | Không biết phương thức đến từ đâu | Làm phẳng, dùng kết hợp |
| Tin "là một" nên kế thừa được | Bẫy hình vuông / hình chữ nhật | Kiểm tra thay thế được thật không |
| Class ôm hết mọi thứ liên quan | Kết dính thấp, xem [[ket-dinh-cao-lien-ket-long]] | Tách theo trách nhiệm |
| Dùng class ở nơi một hàm là đủ | Khuôn khổ thừa | Xem [[ba-loi-viet-menh-lenh-oop-ham]] |

## Ghi nhớ

- Giá trị thật của OOP là **giữ được một bất biến** — chứng minh được bằng cách đọc một file.
- `private` mà có setter mở toang thì không đóng gói gì cả.
- Trả về mảng bên trong = trả đường tới nó. Phải chép.
- Đa hình **không cần** kế thừa — chỉ cần cùng giao diện.
- Kế thừa là liên kết chặt nhất: lộ toàn bộ bề mặt cha, chỉ một cha, cha đổi thì con vỡ.
- "Là một" trong đời thật không đảm bảo thay thế được trong code.
- **Kết hợp để dùng lại, giao diện để đa hình, kế thừa chỉ khi thật sự thay thế được.**

## Tự kiểm tra

1. Câu hỏi nào kiểm tra được một class có đóng gói thật hay chỉ `private` hình thức?
2. Vì sao `NganXep extends DanhSach` là sai, và kết hợp sửa được gì?
3. Bẫy hình vuông / hình chữ nhật cho thấy điều gì về quan hệ "là một"?
