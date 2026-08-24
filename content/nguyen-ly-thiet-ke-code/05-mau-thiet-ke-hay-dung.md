---
title: Mẫu thiết kế hay dùng
slug: mau-thiet-ke-hay-dung
summary: Sáu mẫu bạn thật sự gặp, và chỗ chúng đã nằm sẵn trong React, Express, Postgres mà bạn dùng hằng ngày.
level: trung-cap
tags: [nen-tang, thiet-ke, design-pattern, mau-thiet-ke]
---

> **Sau bài này bạn sẽ:** nhận ra sáu mẫu thiết kế trong thư viện bạn đang dùng, biết mỗi mẫu giải bài toán gì, và biết vì sao học thuộc 23 mẫu là cách học sai.

## Mẫu thiết kế là gì, nói cho đúng

Mẫu thiết kế **không phải** thứ bạn đi tìm chỗ để áp vào. Nó là **tên gọi cho một lời giải đã lặp lại đủ nhiều**.

Giá trị thật của nó là **từ vựng**: nói *"chỗ này dùng Strategy"* nhanh hơn nhiều so với mô tả năm câu. Giá trị đó chỉ có khi cả hai bên đều biết từ.

Cách học sai: thuộc 23 mẫu rồi tìm chỗ nhét vào. Cách học đúng: gặp một bài toán, giải nó, rồi phát hiện lời giải của mình đã có tên.

## ① Strategy — thay thuật toán mà không sửa chỗ gọi

**Bài toán:** một việc có nhiều cách làm, chọn cách nào tuỳ lúc chạy.

```ts
interface CachSapXep { sap(ds: Don[]): Don[] }

const theoNgay: CachSapXep = { sap: (ds) => [...ds].sort((a, b) => +a.ngay - +b.ngay) }
const theoTien: CachSapXep = { sap: (ds) => [...ds].sort((a, b) => b.tong - a.tong) }

function hienThi(ds: Don[], cach: CachSapXep) {   // không biết và không cần biết cách nào
  return cach.sap(ds)
}
```

```python
def hien_thi(ds, cach):   # cach chỉ là một hàm — Python/JS không cần class
    return cach(ds)

hien_thi(dons, lambda ds: sorted(ds, key=lambda d: d.ngay))
```

Điểm quan trọng cho ngôn ngữ có hàm bậc cao: **Strategy thường chỉ là một hàm truyền vào**. `array.sort(comparator)` chính là Strategy — bạn dùng nó mỗi ngày mà không gọi tên.

**Đã nằm sẵn ở:** `sort(fn)`, `filter(fn)`, middleware, chiến lược xác thực của Passport.

## ② Adapter — bọc thứ không vừa cho vừa

**Bài toán:** thư viện bên ngoài có giao diện khác cái code bạn cần.

```ts
interface GuiThu { gui(to: string, noiDung: string): Promise<void> }

// SendGrid có API riêng, không khớp
class AdapterSendGrid implements GuiThu {
  constructor(private sg: SendGridClient) {}
  async gui(to: string, noiDung: string) {
    await this.sg.send({ to, from: 'no-reply@x.com', html: noiDung })   // dịch
  }
}
```

Lợi ích thật: **đổi nhà cung cấp chỉ sửa một file**. Không có adapter thì tên `SendGrid` rải khắp codebase.

**Đã nằm sẵn ở:** driver database, adapter lưu trữ, mọi lớp bọc SDK.

## ③ Factory — tập trung chỗ tạo object

**Bài toán:** việc tạo có logic (chọn loại, đọc cấu hình, kiểm tra), và bạn không muốn logic đó rải khắp nơi.

```ts
function taoCong(ma: string, cauHinh: CauHinh): CongThanhToan {
  switch (ma) {
    case 'momo':  return new Momo(cauHinh.momoKey)
    case 'vnpay': return new VnPay(cauHinh.vnpayKey, cauHinh.vnpaySecret)
    default: throw new Error(`Cổng không hỗ trợ: ${ma}`)
  }
}
```

Không có nó thì mỗi chỗ cần cổng thanh toán phải tự biết cần key nào — và thêm cổng mới là sửa mười chỗ.

**Đã nằm sẵn ở:** `createServer()`, `createClient()`, `createContext()`.

## ④ Observer — báo cho nhiều bên khi có chuyện

**Bài toán:** một sự kiện xảy ra, nhiều nơi cần biết, và nơi phát **không nên biết** ai đang nghe.

```ts
type Nghe<T> = (du: T) => void

class Phat<T> {
  private nghes: Nghe<T>[] = []
  dangKy(fn: Nghe<T>): () => void {
    this.nghes.push(fn)
    return () => { this.nghes = this.nghes.filter((x) => x !== fn) }   // trả hàm huỷ
  }
  phat(du: T) { this.nghes.forEach((fn) => fn(du)) }
}

const donMoi = new Phat<Don>()
donMoi.dangKy((d) => guiEmail(d))
donMoi.dangKy((d) => capNhatKho(d))    // thêm người nghe không đụng chỗ phát
```

Chú ý chi tiết **trả về hàm huỷ đăng ký** — quên nó là rò rỉ bộ nhớ kinh điển. Đúng thứ `useEffect` bắt bạn làm khi trả về hàm dọn dẹp, xem [[useeffect-dung-cach]].

**Đã nằm sẵn ở:** `addEventListener`, `EventEmitter` của Node, `useEffect`, hàng đợi tin nhắn ở quy mô hệ thống — xem [[hang-doi-va-xu-ly-bat-dong-bo]].

## ⑤ Decorator — thêm hành vi mà không sửa bản gốc

**Bài toán:** cần thêm ghi log / đo giờ / thử lại / bộ nhớ đệm quanh một thứ đã có.

```ts
function themThuLai<T>(goc: () => Promise<T>, lan = 3): () => Promise<T> {
  return async () => {
    let loiCuoi: unknown
    for (let i = 0; i < lan; i++) {
      try { return await goc() } catch (e) { loiCuoi = e }
    }
    throw loiCuoi
  }
}

const goiCoThuLai = themThuLai(() => api.layDon(id))
```

Ghép chồng được: `themLog(themThuLai(themDem(goc)))` — mỗi lớp một mối quan tâm, đúng tinh thần kết dính cao.

**Đã nằm sẵn ở:** middleware Express, decorator của Python, `React.memo`, chặn request của Axios.

## ⑥ Repository — giấu chỗ dữ liệu nằm

**Bài toán:** không muốn nghiệp vụ biết dữ liệu đến từ SQL, file, hay API.

```ts
interface KhoDon {
  layTheoId(id: string): Promise<Don | null>
  luu(d: Don): Promise<void>
}
```

Đây là chữ **D** của [[solid-giai-thich-bang-code-that]] đóng gói thành một mẫu. Giáo trình này dùng đúng nó: `notes.repo.ts` giấu chuyện dữ liệu nằm trong file JSON, nên đổi sang Postgres không phải sửa giao diện.

## Mẫu nên dè chừng: Singleton

Singleton — đảm bảo chỉ có **một** thể hiện — được dạy nhiều nhất và gây hại nhiều nhất:

```ts
class CauHinh {
  private static instance: CauHinh
  static lay(): CauHinh {
    if (!CauHinh.instance) CauHinh.instance = new CauHinh()
    return CauHinh.instance
  }
}
```

Vấn đề: nó là **biến toàn cục đội lốt thiết kế**. Test không cô lập được (test này ảnh hưởng test kia), phụ thuộc bị giấu (đọc chữ ký hàm không thấy nó), và trong môi trường nhiều tiến trình thì "một thể hiện" cũng không còn đúng.

Gần như mọi lúc, thứ bạn cần là **một thể hiện được truyền vào** — như [[ket-dinh-cao-lien-ket-long]] mô tả, chứ không phải một thể hiện toàn cục.

## Khi nào **đừng** dùng mẫu

- Chỉ có **một** cách làm, và chưa có dấu hiệu sẽ có cách thứ hai → đừng Strategy
- Chỉ có **một** bản cài, mãi mãi → đừng interface, đừng Adapter
- Bạn đang dùng mẫu để "cho đúng chuẩn" chứ không để giải bài toán nào
- Số dòng khuôn khổ nhiều hơn số dòng nghiệp vụ

Mẫu thiết kế là **chi phí trả trước để mua sự linh hoạt về sau**. Mua sự linh hoạt bạn không cần thì đó là lỗ thuần — và là đúng thứ [[truu-tuong-hoa-khi-nao-tach]] cảnh báo.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Học thuộc 23 mẫu rồi tìm chỗ nhét | Kiến trúc thừa gấp ba nhu cầu | Giải bài toán trước, gọi tên sau |
| Strategy bằng class ở JS/Python | Khuôn khổ thừa | Truyền thẳng một hàm |
| Observer quên hàm huỷ đăng ký | Rò rỉ bộ nhớ | Luôn trả hàm huỷ và gọi nó |
| Singleton cho mọi dịch vụ | Test dính nhau, phụ thuộc bị giấu | Truyền thể hiện vào |
| Interface cho thứ chỉ có một bản cài | Thêm tầng, không thêm lợi ích | Chờ tới bản cài thứ hai |
| Factory cho `new X()` không có logic | Một tầng gián tiếp vô nghĩa | Gọi thẳng |
| Dùng tên mẫu mà nhóm không biết | Từ vựng chung không tồn tại → mất tác dụng | Giải thích hoặc mô tả thẳng |

## Ghi nhớ

- Mẫu thiết kế là **tên gọi cho lời giải lặp lại**, không phải thứ đi tìm chỗ áp.
- Giá trị chính là **từ vựng chung** — mất giá trị nếu người nghe không biết từ.
- Ở ngôn ngữ có hàm bậc cao, Strategy và Decorator thường chỉ là **một hàm**.
- Observer phải trả hàm huỷ đăng ký, nếu không sẽ rò rỉ bộ nhớ.
- Singleton là biến toàn cục đội lốt — gần như luôn nên truyền thể hiện vào thay thế.
- Mẫu là chi phí trả trước mua linh hoạt; không cần linh hoạt thì đó là lỗ.

## Tự kiểm tra

1. Vì sao `array.sort(fn)` đã là mẫu Strategy?
2. Observer quên điều gì thì gây rò rỉ bộ nhớ?
3. Singleton gây ra ba vấn đề cụ thể nào, và thay bằng gì?
