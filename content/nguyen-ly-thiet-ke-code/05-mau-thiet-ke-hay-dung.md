---
title: Mẫu thiết kế hay dùng
slug: mau-thiet-ke-hay-dung
summary: Sáu mẫu bạn thật sự gặp, và chỗ chúng đã nằm sẵn trong React, Express, Postgres mà bạn dùng hằng ngày.
level: trung-cap
tags: [nen-tang, thiet-ke, design-pattern, mau-thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra sáu mẫu này trong thư viện bạn đang dùng, và biết gọi tên chúng khi bàn thiết kế — thay vì học thuộc 23 mẫu trong sách.

## Ý tưởng chính

Mẫu thiết kế **không phải thứ bạn đi tìm chỗ để áp dụng**. Chúng là **tên gọi cho những lời giải đã lặp đi lặp lại** — người ta gặp cùng một vấn đề nhiều lần, giải theo cùng một cách, rồi đặt tên cho cách đó.

Giá trị lớn nhất của chúng là **ngôn ngữ chung**: nói "chỗ này dùng Strategy" ngắn hơn nhiều so với mô tả cả thiết kế.

## Mental model

Hãy coi mẫu thiết kế như **tên các thế trong cờ vua**: "nhập thành", "phong hậu".

> Người mới học không cần biết tên vẫn chơi được. Nhưng khi hai người cùng biết tên, họ bàn được ván cờ trong ba câu thay vì ba mươi câu.
>
> Và điều quan trọng: **không ai chơi cờ bằng cách tìm chỗ để nhập thành.** Thế cờ tự dẫn tới đó.

Đi tìm chỗ áp dụng mẫu là làm ngược. Bạn giải bài toán trước; nếu lời giải trùng một mẫu, bạn gọi đúng tên nó.

## Ví dụ nhỏ

**Strategy** — thay thuật toán mà không sửa chỗ gọi:

```ts
// ❌ Mỗi cách tính phí mới là một lần sửa hàm cũ
function tinhPhi(don, loai) {
  if (loai === 'thuong') return 30000
  if (loai === 'nhanh') return 60000
  if (loai === 'hoa-toc') return don.khoangCach * 5000
}
```

```ts
// ✅ Mỗi cách tính là một object; chỗ gọi không bao giờ đổi
const cachTinhPhi = {
  thuong: () => 30000,
  nhanh: () => 60000,
  'hoa-toc': (don) => don.khoangCach * 5000,
}
const phi = cachTinhPhi[loai](don)
```

Trong JavaScript, Strategy thường chỉ là **một object chứa các hàm** — không cần class, không cần interface. Nhiều mẫu trong sách trông nặng nề vì sách viết cho Java những năm 1990.

## Code chạy thế nào

Sáu mẫu, mỗi mẫu một câu và một chỗ bạn đã gặp:

**① Strategy** — *"nhiều cách làm cùng một việc, chọn lúc chạy"*

```text
đã gặp ở: cachTinhPhi[loai](don) · mảng .sort(cachSoSanh) · middleware xác thực
```

**② Adapter** — *"bọc thứ không vừa cho vừa"*

```ts
// Thư viện trả về hình dạng khác thứ code bạn cần
class AdapterThanhToan {
  constructor(private sdk: SdkBenThuBa) {}
  async traTien(sum: number) {
    const r = await this.sdk.charge({ amount: sum * 100, currency: 'VND' })
    return { thanhCong: r.status === 'ok', ma: r.transaction_id }   // ← dịch sang ngôn ngữ của bạn
  }
}
```

Giá trị thật: khi đổi nhà cung cấp, bạn viết adapter mới — **phần còn lại của dự án không biết gì cả**.

**③ Factory** — *"tập trung chỗ tạo object"*

```ts
function taoBoNhoDem(moiTruong: string) {
  return moiTruong === 'production' ? new RedisCache() : new CacheTrongBoNho()
}
```

Đáng dùng khi việc tạo có điều kiện hoặc nhiều bước; **không** đáng dùng khi chỉ là `new X()`.

**④ Observer** — *"báo cho nhiều bên khi có chuyện, mà không cần biết họ là ai"*

```text
đã gặp ở: addEventListener · useEffect trong React · pub/sub trong hàng đợi
```

Người phát không biết ai đang nghe. Đó vừa là điểm mạnh (thêm người nghe không sửa người phát) vừa là điểm yếu (khó lần ra ai đã phản ứng khi gỡ lỗi). Ở quy mô hệ thống, mẫu này chính là [[hang-doi-va-xu-ly-bat-dong-bo]].

**⑤ Decorator** — *"thêm hành vi mà không sửa bản gốc"*

```ts
const withLog = (fn) => async (...args) => {
  console.time(fn.name)
  const kq = await fn(...args)
  console.timeEnd(fn.name)
  return kq
}
const layDonHang = withLog(layDonHangGoc)
```

```text
đã gặp ở: middleware của Express · higher-order component · @decorator trong NestJS
```

**⑥ Repository** — *"giấu chỗ dữ liệu nằm"*

```ts
interface KhoNguoiDung {
  timTheoId(id: string): Promise<NguoiDung | null>
  luu(u: NguoiDung): Promise<void>
}
```

Phần nghiệp vụ chỉ biết `KhoNguoiDung`. Đằng sau là Postgres, file JSON hay bộ nhớ tạm lúc test — nó không cần biết. Đây chính là chữ D của SOLID ở dạng cụ thể ([[solid-giai-thich-bang-code-that]]).

## Tại sao cần nó

Ba lý do, theo thứ tự thực dụng:

**Ngôn ngữ chung khi bàn việc.** "Tách phần này ra Strategy" thay cho ba đoạn giải thích.

**Nhận ra thứ mình đang dùng.** `useEffect` là Observer, middleware là Decorator, `sort(fn)` là Strategy. Biết tên rồi thì bạn hiểu **vì sao chúng được thiết kế như vậy**, và đoán được cách dùng đúng — ví dụ vì sao `useEffect` cần hàm dọn dẹp ([[useeffect-dung-cach]]).

**Có sẵn danh sách bẫy.** Mỗi mẫu đã được dùng hàng triệu lần, nên nhược điểm của nó đã được ghi lại đầy đủ — bạn không phải tự phát hiện.

## So sánh

Mẫu nên dè chừng: **Singleton** — bảo đảm chỉ có một thể hiện duy nhất.

```ts
class ConfigManager {
  private static instance: ConfigManager
  static getInstance() { return (this.instance ??= new ConfigManager()) }
}
```

Nghe hợp lý, nhưng nó là **biến toàn cục mặc áo class**, và kéo theo ba vấn đề:

| Vấn đề | Hậu quả |
|---|---|
| Trạng thái dùng chung toàn cục | Test này ảnh hưởng test kia, thứ tự chạy đổi thì kết quả đổi |
| Phụ thuộc ẩn | Nhìn chữ ký hàm không biết nó dùng ConfigManager |
| Không thay được lúc test | Không truyền bản giả vào được |

Thay bằng: tạo **một thể hiện ở điểm khởi động** rồi truyền xuống nơi cần. Vẫn "chỉ có một", nhưng phụ thuộc là tường minh và thay được.

## Dễ nhầm

**1. Đi tìm chỗ để áp dụng mẫu.** Đây là lỗi phổ biến nhất sau khi đọc sách mẫu thiết kế. Dấu hiệu: dự án có `AbstractFactoryBuilderStrategy` cho một việc mà `if/else` ba dòng giải quyết xong.

**2. Dùng mẫu Java trong ngôn ngữ có hàm hạng nhất.** Strategy trong JavaScript là một object hàm; Decorator là một hàm bọc hàm. Dựng cả cây class để mô phỏng lại sách là thêm việc mà không thêm giá trị.

**3. Quên rằng mẫu nào cũng thêm một lớp gián tiếp.** Mỗi mẫu là một lần trừu tượng hoá, và mọi cảnh báo ở [[truu-tuong-hoa-khi-nao-tach]] đều áp dụng. Ba chỗ dùng trở lên rồi hãy tách — quy tắc ba lần vẫn đúng ở đây.

**4. Tưởng nhiều mẫu là thiết kế tốt.** Số mẫu dùng không đo chất lượng. Thước đo vẫn là hai câu ở [[ket-dinh-cao-lien-ket-long]]: mọi thứ trong module có thuộc về nhau không, và nó phụ thuộc bao nhiêu vào bên ngoài.

## Mẹo nhớ

> **Strategy** nhiều cách một việc · **Adapter** bọc cho vừa · **Factory** gom chỗ tạo · **Observer** báo cho nhiều bên · **Decorator** thêm mà không sửa · **Repository** giấu chỗ dữ liệu nằm.

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Giá trị lớn nhất của mẫu thiết kế là gì?
2. `useEffect`, middleware Express, và `arr.sort(fn)` — mỗi cái là mẫu nào?
3. Vì sao Singleton bị coi là biến toàn cục mặc áo class?
4. Vì sao Strategy trong JavaScript thường không cần class?
5. Dấu hiệu nào cho biết bạn đang lạm dụng mẫu thiết kế?

## Tự viết lại

Không nhìn lại phần trên, viết lại đoạn này bằng Strategy — và **không dùng class**:

```ts
function xuatBaoCao(duLieu, dinhDang) {
  if (dinhDang === 'csv') { /* ... */ }
  else if (dinhDang === 'json') { /* ... */ }
  else if (dinhDang === 'xml') { /* ... */ }
  else throw new Error('Không hỗ trợ')
}
```

Tự kiểm: thêm định dạng `pdf` thì bạn sửa mấy dòng của code cũ? Câu trả lời đúng là **không dòng nào**.

## Thử sức

Dự án của bạn dùng thư viện gửi SMS của nhà cung cấp A. Sếp báo tháng sau chuyển sang B, và **có thể** quay lại A nếu B không ổn định.

Bạn dùng mẫu nào, và đặt nó ở đâu? Câu hỏi khó hơn: nếu B **thiếu một tính năng** mà A có và code bạn đang dùng, thì mẫu đó còn cứu được bạn không — hay vấn đề nằm ở chỗ khác?
