---
title: Kết dính cao, liên kết lỏng
slug: ket-dinh-cao-lien-ket-long
summary: Hai thước đo nằm dưới gần như mọi lời khuyên thiết kế khác. Hiểu chúng thì SOLID và mẫu thiết kế thành hệ quả, không phải luật cần thuộc.
level: co-ban
tags: [nen-tang, thiet-ke, cohesion, coupling]
---

> **Sau bài này bạn sẽ:** đo được chất lượng thiết kế bằng hai câu hỏi cụ thể, và nhận ra vì sao "sửa chỗ này lại vỡ chỗ kia" luôn quy về cùng một nguyên nhân.

## Hai thước đo

Mọi module, class, hay hàm đều đo được bằng hai câu:

- **Kết dính** (cohesion) — *những thứ bên trong nó có thuộc về nhau không?* Cao là tốt.
- **Liên kết** (coupling) — *nó phụ thuộc vào bao nhiêu thứ bên ngoài, và chặt tới đâu?* Lỏng là tốt.

Mục tiêu: **kết dính cao, liên kết lỏng.** Gần như mọi nguyên lý thiết kế khác — SOLID, mẫu thiết kế, kiến trúc nhiều tầng — đều chỉ là cách cụ thể để đạt hai điều này.

## Kết dính thấp trông thế nào

```ts
// ❌ Kết dính thấp — cái tên 'Helper' đã tự tố cáo
class Helper {
  dinhDangNgay(d: Date): string {}
  guiEmail(to: string): void {}
  tinhThue(tien: number): number {}
  nenAnh(buf: Buffer): Buffer {}
}
```

Bốn phương thức không liên quan gì tới nhau. Hệ quả cụ thể, không phải chuyện thẩm mỹ:

- Ai cần định dạng ngày cũng phải nạp cả module có mã nén ảnh
- Đổi cách gửi email làm test của phần tính thuế phải chạy lại
- Không ai biết nên đặt hàm mới vào đâu → cái gì cũng nhét vào `Helper`
- Tên module không nói được nó làm gì

**Dấu hiệu nhận biết** kết dính thấp, thấy là biết ngay: tên chứa `Helper`, `Util`, `Manager`, `Common`, `Misc`, `Base`, `Shared`.

```ts
// ✅ Kết dính cao — mỗi module một chủ đề
// ngay.ts     → dinhDangNgay, congNgay, khoangCachNgay
// email.ts    → guiEmail, dungMauEmail
// thue.ts     → tinhThue, tinhThueNhapKhau
```

Câu hỏi kiểm tra: **tả module này trong một câu, không dùng chữ "và"** — không tả được thì kết dính đang thấp.

## Liên kết chặt trông thế nào

```ts
// ❌ Liên kết chặt — tự dựng lấy thứ nó cần
class DichVuDon {
  private db = new PostgresClient('postgres://localhost/prod')   // ① dính DB cụ thể
  private mail = new SendGridClient(process.env.SENDGRID_KEY)    // ② dính nhà cung cấp

  async tao(don: Don) {
    await this.db.query('INSERT INTO dons ...')
    await this.mail.send(don.email, 'Đã đặt hàng')
    console.log('đã tạo đơn')                                     // ③ dính cách ghi log
  }
}
```

Cái class này **không test được** nếu không có Postgres thật và tài khoản SendGrid thật. Không đổi được nhà cung cấp email mà không sửa nó. Không dùng lại được ở môi trường khác.

```ts
// ✅ Liên kết lỏng — nhận thứ nó cần từ bên ngoài
interface KhoDon { luu(don: Don): Promise<void> }
interface GuiThu { gui(to: string, noiDung: string): Promise<void> }

class DichVuDon {
  constructor(private kho: KhoDon, private thu: GuiThu) {}

  async tao(don: Don) {
    await this.kho.luu(don)
    await this.thu.gui(don.email, 'Đã đặt hàng')
  }
}
```

```python
class DichVuDon:
    def __init__(self, kho: KhoDon, thu: GuiThu):
        self.kho, self.thu = kho, thu

    async def tao(self, don: Don) -> None:
        await self.kho.luu(don)
        await self.thu.gui(don.email, 'Đã đặt hàng')
```

Kỹ thuật vừa dùng là **tiêm phụ thuộc** (dependency injection) — nghe to tát nhưng chỉ là *"đừng tự tạo thứ mình cần, hãy nhận nó từ ngoài vào"*.

Cái bạn được, cụ thể:

```ts
// Test không cần database, không cần mạng, chạy trong mili-giây
const daLuu: Don[] = []
const dv = new DichVuDon(
  { luu: async (d) => { daLuu.push(d) } },
  { gui: async () => {} },
)
await dv.tao(donMau)
expect(daLuu).toHaveLength(1)
```

Đây chính là lý do [[test-double-stub-mock-fake]] khả thi: bạn thay được thành phần thật bằng bản giả **chỉ khi** liên kết đủ lỏng.

## Các mức liên kết, từ tệ tới tốt

| Mức | Ví dụ | Đánh giá |
|---|---|---|
| Dùng chung biến toàn cục | Hai module cùng sửa `global.config` | Tệ nhất |
| Biết cấu trúc bên trong của nhau | `a.b.c.d.tinh()` | Rất tệ |
| Phụ thuộc lớp cụ thể | `new PostgresClient()` | Chặt |
| Phụ thuộc giao diện | `kho: KhoDon` | **Tốt** |
| Chỉ truyền dữ liệu | `tinhThue(tien: number)` | **Tốt nhất** |

Dòng thứ hai có tên riêng — **luật Demeter**, hay "chỉ nói chuyện với hàng xóm":

```ts
// ❌ Biết quá nhiều về ruột người khác
const tp = don.khach.diaChi.thanhPho.ten

// ✅ Hỏi thứ mình cần, không tự đi mò
const tp = don.tenThanhPhoGiao()
```

Chuỗi `a.b.c.d` nghĩa là code của bạn phụ thuộc vào **bốn** cấu trúc. Bất kỳ ai đổi một trong bốn đều làm vỡ bạn.

## Hai thước đo kéo ngược nhau

Điều ít được nói: bạn **không** tối đa được cả hai.

Cắt module nhỏ hơn → kết dính mỗi cái cao hơn, nhưng số liên kết giữa chúng **tăng**. Gộp lại → ít liên kết hơn, nhưng kết dính giảm.

```
1 module lớn:  kết dính thấp,  liên kết = 0
20 module nhỏ: kết dính cao,   liên kết = rất nhiều đường
```

Chỗ đúng nằm ở giữa, và tìm nó bằng một câu hỏi: **cắt sao cho những thứ hay thay đổi cùng nhau nằm cùng một chỗ.** Cắt đúng thì phần lớn thay đổi chỉ chạm một module — đó mới là thước đo thật, không phải số lượng file.

Cùng một logic được áp ở quy mô lớn hơn khi chia service, xem [[ranh-gioi-service]].

## Kiểm nhanh thiết kế của bạn

Năm câu, trả lời được là ổn:

1. Tả module này trong một câu không có chữ "và"?
2. Test nó có cần dựng database / mạng / hệ thống file không?
3. Đổi thư viện bên ngoài thì phải sửa bao nhiêu file?
4. Có chuỗi `a.b.c.d` nào không?
5. Thêm một tính năng điển hình thì chạm mấy module?

Câu 5 là câu thật nhất. Thêm một tính năng mà phải sửa bảy module nghĩa là đường cắt đang sai — bất kể code trông sạch thế nào.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Module tên `Utils` / `Helper` / `Common` | Cái gì cũng nhét vào, không ai dám xoá | Cắt theo chủ đề |
| `new` thứ mình cần ngay trong class | Không test được, không thay được | Nhận qua constructor |
| Chuỗi `a.b.c.d.e` | Bốn cấu trúc có thể làm vỡ bạn | Hỏi thứ cần, đừng mò |
| Dùng biến toàn cục để hai module nói chuyện | Không lần được ai sửa cái gì | Truyền tường minh |
| Cắt quá nhỏ để "kết dính cao" | Số liên kết bùng nổ, đọc mệt hơn | Cắt theo lý do thay đổi |
| Thêm tính năng phải sửa bảy module | Đường cắt sai | Gom thứ thay đổi cùng nhau lại |
| Class ôm cả dữ liệu, HTTP, hiển thị | Kết dính thấp, đổi gì cũng vỡ | Tách theo trách nhiệm |

## Ghi nhớ

- **Kết dính cao**: thứ bên trong thuộc về nhau. **Liên kết lỏng**: ít phụ thuộc ngoài, và phụ thuộc vào giao diện chứ không vào lớp cụ thể.
- Tên `Helper` / `Util` / `Manager` là dấu hiệu kết dính thấp, gần như luôn đúng.
- Đừng tự tạo thứ mình cần — nhận từ ngoài vào. Đó là toàn bộ ý của tiêm phụ thuộc.
- Chuỗi `a.b.c.d` nghĩa là bạn phụ thuộc vào bốn cấu trúc.
- Hai thước đo kéo ngược nhau; cắt sao cho **thứ thay đổi cùng nhau nằm cùng chỗ**.
- Thước đo thật: thêm một tính năng thì chạm mấy module.

## Tự kiểm tra

1. Vì sao class tên `Helper` gần như luôn có kết dính thấp?
2. `new PostgresClient()` trong class gây ra ba vấn đề cụ thể nào?
3. Cắt module càng nhỏ càng tốt — sai ở đâu?
