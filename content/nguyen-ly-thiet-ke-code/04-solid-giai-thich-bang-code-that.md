---
title: SOLID giải thích bằng code thật
slug: solid-giai-thich-bang-code-that
summary: Năm chữ cái, mỗi chữ một lỗi cụ thể nó ngăn được. Bỏ định nghĩa sách vở, xem code trước và sau.
level: trung-cap
tags: [nen-tang, thiet-ke, solid, nguyen-ly]
---

> **Sau bài này bạn sẽ:** nhận ra từng nguyên lý SOLID qua **triệu chứng trong code** thay vì qua định nghĩa, và biết chúng đều quy về [[ket-dinh-cao-lien-ket-long]].

## Đọc SOLID thế nào cho đúng

SOLID không phải năm luật phải tuân thủ. Là năm **triệu chứng đã được đặt tên** — mỗi chữ mô tả một kiểu đau mà người ta gặp đủ nhiều nên phải đặt tên cho nó.

Đọc theo lối "code này đau ở đâu, chữ nào chẩn được" thì hữu ích. Đọc theo lối "phải thoả cả năm chữ" thì sinh ra kiến trúc thừa thãi.

## S — Trách nhiệm đơn nhất

> Một module chỉ nên có **một lý do để thay đổi**.

Chú ý: *một lý do để đổi*, không phải *"chỉ làm một việc"*. Khác biệt này quan trọng.

```ts
// ❌ Ba lý do đổi trong một class
class BaoCaoDon {
  layDuLieu() { return db.query('SELECT ...') }      // ① lược đồ DB đổi
  tinhTongDoanhThu() { /* quy tắc nghiệp vụ */ }      // ② chính sách kế toán đổi
  xuatPdf() { /* thư viện PDF */ }                    // ③ đổi thư viện xuất file
}
```

Ba bộ phận công ty khác nhau có thể yêu cầu đổi ba phương thức này, độc lập nhau. Mỗi lần đổi đều bắt bạn chạm vào file mà hai bên kia đang dùng.

```ts
// ✅ Tách theo lý do đổi
class KhoDon      { lay() {} }              // đổi khi lược đồ DB đổi
class TinhDoanhThu { tinh(dons: Don[]) {} }  // đổi khi chính sách kế toán đổi
class XuatPdf     { xuat(bc: BaoCao) {} }    // đổi khi đổi thư viện
```

**Triệu chứng nhận ra:** một file bị sửa trong hầu hết pull request, vì lý do khác nhau mỗi lần. Xem `git log` của file đó — nếu thông điệp commit nói về những chủ đề chẳng liên quan gì nhau, chữ S đang bị vi phạm.

## O — Mở để mở rộng, đóng để sửa đổi

> Thêm hành vi mới bằng cách **thêm code**, không phải sửa code đang chạy.

```ts
// ❌ Thêm cổng thanh toán = sửa hàm đang chạy tốt
function tinhPhi(cong: string, tien: number): number {
  if (cong === 'momo')  return tien * 0.01
  if (cong === 'vnpay') return tien * 0.015
  if (cong === 'the')   return tien * 0.025 + 2000
  throw new Error('Cổng lạ')
}
```

Mỗi cổng mới bắt bạn mở lại hàm này — nơi ba cổng cũ đang chạy tốt. Rủi ro làm vỡ cái đang chạy, và phải test lại tất cả.

```ts
// ✅ Thêm cổng = thêm một object, không đụng code cũ
interface Cong { ma: string; tinhPhi(tien: number): number }

const CONGS: Cong[] = [
  { ma: 'momo',  tinhPhi: (t) => t * 0.01 },
  { ma: 'vnpay', tinhPhi: (t) => t * 0.015 },
  { ma: 'the',   tinhPhi: (t) => t * 0.025 + 2000 },
]
const theoMa = new Map(CONGS.map((c) => [c.ma, c]))

function tinhPhi(ma: string, tien: number): number {
  const c = theoMa.get(ma)
  if (!c) throw new Error(`Cổng lạ: ${ma}`)
  return c.tinhPhi(tien)
}
```

**Triệu chứng:** chuỗi `if/else` hoặc `switch` trên một chuỗi "loại", và nó dài thêm mỗi quý.

Cảnh báo cân bằng: đừng dựng cơ chế cắm-thêm cho thứ **chưa bao giờ đổi**. Chữ O chỉ đáng trả giá ở những trục bạn **biết** sẽ mở rộng. Ba nhánh `if` ổn định năm năm thì cứ để yên.

## L — Thay thế được (Liskov)

> Đưa lớp con vào chỗ đang dùng lớp cha thì **mọi thứ vẫn đúng**.

```ts
class Chim { bay() { /* ... */ } }
class ChimCanhCut extends Chim {
  bay() { throw new Error('Chim cánh cụt không bay được') }   // ❌
}

function choBayHet(dan: Chim[]) { dan.forEach((c) => c.bay()) }   // nổ khi gặp cánh cụt
```

Lớp con **thu hẹp** hợp đồng của lớp cha là vi phạm. Nó biến một hàm đang đúng thành hàm có thể nổ, mà chữ ký kiểu không hề cảnh báo.

```ts
// ✅ Mô hình lại theo NĂNG LỰC, không theo phân loại sinh học
interface BayDuoc { bay(): void }
class ChimSe implements BayDuoc { bay() {} }
class ChimCanhCut { boi() {} }      // đơn giản là không có năng lực bay

function choBayHet(dan: BayDuoc[]) { dan.forEach((c) => c.bay()) }
```

**Triệu chứng:** lớp con ném lỗi "không hỗ trợ", hoặc có `if (x instanceof LoaiCuThe)` nằm trong code lẽ ra phải tổng quát. Bẫy hình vuông / hình chữ nhật ở [[oop-that-su-la-gi]] là ví dụ kinh điển của chữ này.

## I — Tách giao diện

> Đừng bắt ai phụ thuộc vào phương thức họ không dùng.

```ts
// ❌ Giao diện béo
interface KhoDuLieu {
  doc(id: string): Promise<Don>
  ghi(d: Don): Promise<void>
  xoa(id: string): Promise<void>
  saoLuu(): Promise<void>
  donDep(): Promise<void>
}

// Màn hình chỉ hiển thị, nhưng test nó phải giả lập cả năm phương thức
class ManHinhXem { constructor(private kho: KhoDuLieu) {} }
```

```ts
// ✅ Cắt theo nhu cầu người dùng giao diện
interface DocDuoc { doc(id: string): Promise<Don> }
interface GhiDuoc { ghi(d: Don): Promise<void>; xoa(id: string): Promise<void> }

class ManHinhXem { constructor(private kho: DocDuoc) {} }    // giả lập 1 phương thức
```

**Triệu chứng:** test phải viết `throw new Error('không dùng')` cho một nửa số phương thức của bản giả. Xem [[test-double-stub-mock-fake]].

Bonus thật: kiểu `DocDuoc` giờ **nói ra** rằng `ManHinhXem` không ghi gì cả. Đọc chữ ký là biết, không phải đọc ruột.

## D — Đảo ngược phụ thuộc

> Module cấp cao và cấp thấp đều phụ thuộc vào **trừu tượng**, không phụ thuộc lẫn nhau.

```ts
// ❌ Nghiệp vụ dính thẳng vào hạ tầng
import { PostgresClient } from 'pg'
class DichVuDon {
  private db = new PostgresClient(...)      // nghiệp vụ → Postgres
}
```

```ts
// ✅ Cả hai cùng nhìn vào giao diện ở giữa
interface KhoDon { luu(d: Don): Promise<void> }              // do tầng nghiệp vụ định nghĩa
class DichVuDon { constructor(private kho: KhoDon) {} }       // nghiệp vụ → giao diện
class KhoDonPostgres implements KhoDon { async luu(d) {} }    // hạ tầng → giao diện
```

Điểm mấu chốt hay bị bỏ qua: **giao diện thuộc về tầng nghiệp vụ**, không thuộc tầng hạ tầng. Mũi tên phụ thuộc đảo chiều — đó là lý do nó tên là "đảo ngược".

**Triệu chứng:** file chứa quy tắc nghiệp vụ có `import` từ thư viện database, HTTP, hay hệ thống file.

Chính giáo trình này làm đúng vậy: `src/lib/db/` là chỗ **duy nhất** chạm dữ liệu, còn `src/app/` và `src/components/` không file nào đọc file trực tiếp. Nhờ vậy đổi từ JSON sang Postgres không phải sửa giao diện người dùng.

## Bảng tra nhanh

| Chữ | Triệu chứng trong code | Sửa bằng |
|---|---|---|
| **S** | Một file bị sửa trong mọi PR, vì lý do khác nhau | Tách theo **lý do thay đổi** |
| **O** | `switch` dài thêm mỗi quý | Bảng tra / danh sách cắm thêm |
| **L** | Lớp con ném "không hỗ trợ" | Mô hình theo **năng lực** |
| **I** | Bản giả trong test phải cài phương thức thừa | Cắt giao diện nhỏ hơn |
| **D** | Nghiệp vụ `import` từ `pg` / `axios` / `fs` | Giao diện do tầng nghiệp vụ định nghĩa |

Cả năm đều là hệ quả của hai thước đo ở [[ket-dinh-cao-lien-ket-long]]: S và I nói về kết dính, O, L, D nói về liên kết. Nhớ hai thước đo thì suy ra được năm chữ; thuộc năm chữ mà không hiểu hai thước đo thì hay áp sai chỗ.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Áp cả năm chữ cho một script 100 dòng | Năm interface cho một việc | Áp khi thấy triệu chứng, không áp trước |
| Hiểu S là "một class một phương thức" | Hàng trăm class vụn | S là *một lý do đổi*, không phải một việc |
| Dựng cắm-thêm cho trục không bao giờ đổi | Khuôn khổ thừa, khó đọc | Chỉ mở ở trục biết sẽ mở rộng |
| Kế thừa rồi ném "không hỗ trợ" | Hàm đang đúng thành nổ | Mô hình theo năng lực |
| Đặt interface cạnh lớp hạ tầng | Mũi tên vẫn sai chiều, chưa đảo gì | Interface thuộc tầng nghiệp vụ |
| Interface một chỗ dùng, một chỗ cài | Thêm tầng không lợi ích | Chỉ tách khi có ≥2 bản cài hoặc cần test |

## Ghi nhớ

- SOLID là **năm triệu chứng đã được đặt tên**, không phải năm luật bắt buộc.
- **S** — một lý do để đổi, không phải một việc.
- **O** — thêm hành vi bằng cách thêm code; nhưng chỉ mở ở trục thật sự hay đổi.
- **L** — lớp con không được thu hẹp hợp đồng của cha.
- **I** — bản giả trong test phải cài phương thức thừa là dấu hiệu giao diện béo.
- **D** — giao diện thuộc tầng nghiệp vụ; hạ tầng đi cài nó.
- Cả năm quy về kết dính cao, liên kết lỏng.

## Tự kiểm tra

1. "Một lý do để thay đổi" khác "chỉ làm một việc" ở chỗ nào?
2. Vì sao `ChimCanhCut extends Chim` vi phạm chữ L, và sửa thế nào?
3. Trong chữ D, interface nên đặt ở tầng nào và vì sao điều đó quyết định?
