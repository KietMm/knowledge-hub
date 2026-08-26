---
title: Mẫu thiết kế thường gặp trong backend
slug: mau-thiet-ke-thuong-gap
summary: Repository, strategy, adapter, decorator, factory — năm mẫu dùng thật, và chỗ chúng bị dùng sai.
level: trung-cap
tags: [kien-truc, mau-thiet-ke, thiet-ke, oop]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra năm mẫu này khi đọc mã, và biết mỗi mẫu giải vấn đề gì để không dùng sai chỗ.

## Ý tưởng chính

Mẫu thiết kế không phải thứ để **áp dụng**. Chúng là **tên gọi** cho những cách sắp xếp mã mà người ta gặp lại nhiều lần.

Giá trị thật của việc biết tên: bạn **nhận ra** cấu trúc khi đọc mã người khác, và nói được ý định trong một từ thay vì một đoạn giải thích.

Giá trị đó bị mất khi mẫu được dùng như một mục tiêu.

## Mental model

Hãy nghĩ tới **tên các thế trong bóng đá**.

> "Đá phản công" hay "tiki-taka" là **tên** cho những cách chơi mà người ta đã thấy hiệu quả trong một số tình huống.
>
> Huấn luyện viên giỏi không nói "hôm nay ta chơi tiki-taka" rồi bắt đội thực hiện bằng mọi giá. Họ nhìn đối thủ, nhìn cầu thủ mình có, rồi chọn.
>
> Và họ dùng tên đó để **nói cho nhanh** trong phòng họp — không phải để chứng minh mình biết nhiều thế.

Mẫu thiết kế đúng như vậy: hữu ích khi mô tả, có hại khi trở thành mục tiêu.

## Ví dụ nhỏ

```ts
// Strategy: nhiều cách làm cùng một việc, chọn lúc chạy
interface TinhPhi { tinh(don: Don): number }
const theoTrongLuong: TinhPhi = { tinh: (d) => d.kg * 5000 }
const mienPhi: TinhPhi = { tinh: () => 0 }
```

## Code chạy thế nào

**Năm mẫu, và vấn đề mỗi cái giải:**

```text
REPOSITORY
  Vấn đề: SQL rải khắp mã; cùng một truy vấn viết lại ở năm chỗ
  Giải:   một chỗ duy nhất biết cách đọc/ghi một loại thực thể
  Dùng sai: repository chứa quy tắc nghiệp vụ; hoặc trả về
            kiểu của ORM ra ngoài ⇒ ORM rò ra khắp hệ thống

STRATEGY
  Vấn đề: một chuỗi `if/else` dài, và cứ thêm trường hợp là sửa nó
  Giải:   mỗi trường hợp một object, chọn qua một bảng tra
  Dùng sai: chỉ có HAI trường hợp và sẽ mãi hai ⇒ `if` rõ hơn

ADAPTER
  Vấn đề: thư viện bên ngoài có giao diện khác thứ mã bạn cần
  Giải:   một lớp bọc, dịch giữa hai bên
  Dùng sai: bọc mọi thư viện "cho chắc" ⇒ một tầng gián tiếp
            không dịch gì cả

DECORATOR
  Vấn đề: cần thêm hành vi (log, cache, retry, đo thời gian)
          mà không sửa mã gốc, và cần GHÉP nhiều cái
  Giải:   bọc cùng interface, thêm hành vi rồi gọi cái bên trong
  Dùng sai: ba tầng bọc lồng nhau ⇒ stack trace vô nghĩa

FACTORY
  Vấn đề: tạo object cần logic (đọc cấu hình, chọn cài đặt)
  Giải:   một hàm nhận đầu vào, trả về object đã dựng đúng
  Dùng sai: factory chỉ gọi `new` ⇒ thêm một lớp vô nghĩa
```

**Decorator — mẫu hữu dụng nhất và ít dùng nhất:**

```ts
interface KhoDonHang { tim(id: string): Promise<Don | null> }

function themCache(goc: KhoDonHang, redis: Redis): KhoDonHang {
  return {
    async tim(id) {
      const daCo = await redis.get(`don:${id}`)
      if (daCo !== null) return JSON.parse(daCo)
      const don = await goc.tim(id)
      if (don !== null) await redis.set(`don:${id}`, JSON.stringify(don), 'EX', 60)
      return don
    },
  }
}

function themDoThoiGian(goc: KhoDonHang, m: Metrics): KhoDonHang { /* ... */ }

// Ghép lại — thứ tự có ý nghĩa
const kho = themDoThoiGian(themCache(postgresKho, redis), metrics)
```

```text
Điểm mạnh: cache, đo lường, retry đều là những việc KHÔNG THUỘC
nghiệp vụ. Decorator giữ chúng ra khỏi mã nghiệp vụ hoàn toàn.

Và thứ tự bọc quyết định ý nghĩa:
  đo(cache(kho))  → đo cả thời gian cache trúng ⇒ thấy được lợi ích cache
  cache(đo(kho))  → chỉ đo khi xuống tới CSDL
```

## Cú pháp

**Strategy thay `if/else` — khi nào đáng:**

```ts
// ❌ Thêm phương thức thanh toán là sửa hàm này
function xuLy(don: Don, pt: string) {
  if (pt === 'the') return xuLyThe(don)
  if (pt === 'chuyen-khoan') return xuLyChuyenKhoan(don)
  if (pt === 'momo') return xuLyMomo(don)
  // ...
}

// ✅ Thêm phương thức là thêm một dòng vào bảng
const CACH_THANH_TOAN: Record<string, XuLyThanhToan> = {
  the: theStrategy,
  'chuyen-khoan': chuyenKhoanStrategy,
  momo: momoStrategy,
}
function xuLy(don: Don, pt: string) {
  const cach = CACH_THANH_TOAN[pt]
  if (cach === undefined) throw new PhuongThucKhongHoTro(pt)
  return cach.xuLy(don)
}
```

```text
Đáng dùng khi:
  □ Sẽ có thêm trường hợp (≥ 3 và đang tăng)
  □ Mỗi trường hợp có logic đáng kể, không phải một dòng
  □ Muốn test từng trường hợp độc lập

KHÔNG đáng khi có hai trường hợp và sẽ mãi hai — `if` đọc dễ hơn.
```

**Dấu hiệu bạn đang dùng mẫu sai:**

```text
□ Không nói được nó giải vấn đề gì CỦA BẠN
□ Interface có đúng một cài đặt, và sẽ mãi như vậy
□ Phải mở bốn file để hiểu một luồng đơn giản
□ Tên lớp chứa tên mẫu: `DonHangFactoryStrategyImpl`
□ Bạn thêm mẫu vì "sau này có thể cần"
```

Dòng cuối là dấu hiệu đáng tin nhất. Mẫu thêm vào cho một nhu cầu tưởng tượng gần như luôn sai — vì khi nhu cầu thật đến, nó có hình dạng khác ([[truu-tuong-hoa-khi-nao-tach]]).

**Ba mẫu đơn giản hơn, hay bị bỏ qua:**

```text
GUARD CLAUSE   trả về sớm thay vì lồng `if`
               ⇒ giảm độ sâu, dễ đọc hơn mọi mẫu ở trên

BẢNG TRA       thay `if/else` bằng một Record
               ⇒ đây là 80% giá trị của strategy, với 10% chi phí

HÀM THUẦN      không có mẫu nào, chỉ là hàm nhận vào và trả ra
               ⇒ dễ test nhất, và thường là câu trả lời đúng
```

Với nhiều bài toán, một hàm thuần và một bảng tra là đủ. Mẫu có tên chỉ cần khi vấn đề đủ lớn.

## Tại sao cần nó

Vì mẫu là **từ vựng chung**, và đó là giá trị chính:

```text
Không có tên:
  "Tôi làm một cái lớp bọc quanh cái repository, nó kiểm cache
   trước rồi mới gọi cái thật, và có thể lồng nhiều cái như vậy."

Có tên:
  "Tôi thêm một decorator cache cho repository."
```

**Nhưng thứ tự học nên ngược lại thói quen:**

```text
❌ Học mẫu → tìm chỗ áp dụng
   ⇒ dùng sai chỗ, và nhiều mẫu hơn cần thiết

✅ Gặp vấn đề → viết cách đơn giản nhất → thấy nó lặp lại
   → nhận ra "đây là mẫu X" → dùng tên đó để nói
   ⇒ mẫu đến từ nhu cầu, không từ danh sách
```

Cách thứ hai cũng cho bạn thứ quan trọng hơn: hiểu **vì sao** mẫu tồn tại, nên biết khi nào nó không phù hợp.

## So sánh

| Mẫu | Giải vấn đề | Dấu hiệu dùng sai |
|---|---|---|
| Repository | SQL rải khắp mã | chứa nghiệp vụ, rò kiểu ORM |
| Strategy | `if/else` dài và đang tăng | chỉ hai trường hợp |
| Adapter | giao diện thư viện không khớp | bọc mà không dịch gì |
| Decorator | thêm hành vi không thuộc nghiệp vụ | lồng quá sâu |
| Factory | tạo object cần logic | chỉ gọi `new` |

## Dễ nhầm

**1. Học mẫu rồi tìm chỗ áp dụng.**

**2. Thêm mẫu cho nhu cầu tưởng tượng.**

**3. Strategy cho hai trường hợp.**

**4. Repository trả về kiểu của ORM.** ORM rò ra khắp hệ thống.

**5. Repository chứa quy tắc nghiệp vụ.**

**6. Decorator lồng quá sâu.** Stack trace vô nghĩa.

**7. Factory chỉ gọi `new`.**

**8. Tên lớp chứa tên mẫu.**

**9. Bỏ qua guard clause và bảng tra** — hai thứ rẻ nhất.

**10. Nghĩ nhiều mẫu = thiết kế tốt.** Thường ngược lại.

## Mẹo nhớ

> **Mẫu là TÊN GỌI cho cấu trúc đã gặp lại nhiều lần — không phải mục tiêu.**
>
> **Bảng tra cho 80% giá trị của strategy với 10% chi phí.**
>
> **Không nói được mẫu này giải vấn đề gì CỦA BẠN ⇒ đừng dùng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm mẫu và vấn đề mỗi cái giải?
2. Decorator mạnh ở đâu, và thứ tự bọc ảnh hưởng gì?
3. Strategy đáng dùng khi nào, không đáng khi nào?
4. Năm dấu hiệu đang dùng mẫu sai?
5. Ba cách đơn giản hơn hay bị bỏ qua?

## Tự viết lại

Không nhìn lại, chọn mẫu (hoặc không mẫu) và viết mã cho:

```text
① Bốn nhà cung cấp SMS, chọn theo cấu hình
② Thêm retry cho mọi lời gọi API ngoài
③ Đọc/ghi đơn hàng từ Postgres
④ Tính phí vận chuyển theo 6 vùng
⑤ Bọc SDK thanh toán có giao diện rất khác nhu cầu của bạn
```

Tự kiểm: có trường hợp nào trong năm cái trên mà câu trả lời đúng là **không dùng mẫu nào** không?

## Thử sức

Bạn nhận một dự án có `AbstractDonHangRepositoryFactoryImpl`, `DonHangServiceStrategyProvider`, và 6 interface mà mỗi cái có đúng một cài đặt.

Ba câu để trả lời: bạn đánh giá tình trạng này thế nào, và vì sao nó tệ **cụ thể** ở đâu; bạn đơn giản hoá theo thứ tự nào; và bạn giữ lại gì. Câu khó nhất: xoá một interface một-cài-đặt là an toàn về mặt hành vi — nhưng có trường hợp nào nó **đáng giữ** không, và dựa vào đâu để biết?
