---
title: Ba lối viết — mệnh lệnh, hướng đối tượng, hàm
slug: ba-loi-viet-menh-lenh-oop-ham
summary: Cùng một bài toán viết theo ba lối. Không lối nào thắng tuyệt đối; biết chúng trả lời câu hỏi nào mới là cái dùng được.
level: trung-cap
tags: [nen-tang, tu-duy, paradigm, oop, functional]
khung: v2
---

> **Sau bài này bạn sẽ:** nhìn một đoạn code lạ là biết nó đang viết theo lối nào, và chọn được lối phù hợp thay vì dùng mãi một lối cho mọi việc.

## Ý tưởng chính

Ba lối viết không phải ba mức độ từ dở tới hay. Chúng là **ba câu hỏi khác nhau** đặt ra trước cùng một bài toán:

```text
Mệnh lệnh        →  "Máy phải làm những bước nào?"
Hướng đối tượng  →  "Ai chịu trách nhiệm việc gì?"
Hàm              →  "Dữ liệu biến đổi từ dạng nào sang dạng nào?"
```

Ba câu hỏi đều hợp lệ. Bài toán khác nhau thì câu hỏi đúng cũng khác nhau.

## Mental model

Hãy tưởng tượng bạn cần một bữa tối, và có ba cách xoay xở:

> **Mệnh lệnh — bạn tự nấu theo công thức.** Bật bếp, đổ dầu, cho hành vào, đảo 30 giây… Bạn kiểm soát từng bước, và bạn cũng chịu trách nhiệm cho từng bước.
>
> **Hướng đối tượng — bạn thuê một đầu bếp.** Bạn không nói "đảo 30 giây"; bạn nói *"cho tôi món gà nướng"*. Đầu bếp giữ bí quyết của mình, bạn không cần biết, cũng không được vào bếp sửa nồi.
>
> **Hàm — bạn xếp một dây chuyền.** Nguyên liệu đi qua máy rửa → máy thái → máy nướng. Mỗi máy nhận vào một thứ, trả ra một thứ, không máy nào giữ lại gì cho riêng mình.

Ba mô hình đó giải thích mọi khác biệt còn lại: ai giữ trạng thái, ai chịu trách nhiệm, và cái gì được phép thay đổi.

## Ví dụ nhỏ

Cùng một việc — tính tổng tiền các đơn đã giao — viết theo ba lối:

```ts
// 1. Mệnh lệnh: mô tả từng bước
let tong = 0
for (const d of donHang) {
  if (d.trangThai === 'da_giao') tong += d.tien
}
```

```ts
// 2. Hướng đối tượng: giao việc cho vật thể tự lo
class SoDonHang {
  constructor(private ds) {}
  tongDaGiao() {
    return this.ds.filter((d) => d.daGiao()).reduce((s, d) => s + d.tien, 0)
  }
}
```

```ts
// 3. Hàm: dây chuyền biến đổi
const tong = donHang
  .filter((d) => d.trangThai === 'da_giao')
  .reduce((s, d) => s + d.tien, 0)
```

## Code chạy thế nào

Lối 1 và lối 3 làm cùng một việc trên `[{50, đã giao}, {30, chưa}, {20, đã giao}]`, nhưng "trạng thái" nằm ở hai chỗ khác nhau:

```text
Mệnh lệnh — có một ô nhớ đổi liên tục
  tong=0  →  gặp 50 (đã giao) → tong=50
          →  gặp 30 (chưa)    → tong=50
          →  gặp 20 (đã giao) → tong=70

Hàm — không ô nào bị đổi, chỉ có dữ liệu mới sinh ra
  [50, 30, 20]  ──filter──►  [50, 20]  ──reduce──►  70
```

Khác biệt cốt lõi nằm đúng ở đây: lối mệnh lệnh **sửa một chỗ nhớ nhiều lần**; lối hàm **tạo giá trị mới ở mỗi khâu**. Đó là lý do lối hàm dễ suy luận hơn — không có gì để hỏi "tới dòng này thì `tong` đang bằng mấy" — nhưng cũng tốn bộ nhớ hơn vì mỗi khâu sinh một mảng.

## Tại sao cần nó

Vì mỗi lối làm tốt một loại bài toán, và dùng sai lối thì code phình ra không lý do:

| Bài toán | Lối hợp | Vì sao |
|---|---|---|
| Thuật toán, vòng lặp nóng, code nhúng | Mệnh lệnh | Kiểm soát từng bước, không tốn bộ nhớ trung gian |
| Nhiều thực thể có trạng thái và quy tắc riêng | OOP | Trạng thái đi cùng hành vi giữ nó hợp lệ |
| Xử lý dữ liệu, biến đổi nhiều khâu | Hàm | Mỗi khâu test riêng được, dễ đọc như một câu |

Và biết cả ba còn cho bạn thứ này: **đọc được code của người khác**. Một dự án Java thường nghĩ theo lối OOP, một dự án React nghĩ theo lối hàm, một đoạn xử lý ảnh nghĩ theo lối mệnh lệnh. Không biết lối đang dùng thì bạn đọc từng dòng đúng mà vẫn không hiểu ý đồ.

## So sánh

| | Mệnh lệnh | Hướng đối tượng | Hàm |
|---|---|---|---|
| Câu hỏi trung tâm | Làm những bước nào? | Ai chịu trách nhiệm? | Biến đổi thế nào? |
| Trạng thái | Biến bị sửa liên tục | Nằm trong đối tượng, có người canh | Không sửa, chỉ sinh giá trị mới |
| Đơn vị chính | Câu lệnh | Lớp / đối tượng | Hàm |
| Mạnh nhất khi | Thuật toán, hiệu năng | Mô hình hoá nghiệp vụ nhiều thực thể | Xử lý và biến đổi dữ liệu |
| Yếu nhất khi | Code lớn dần, khó theo dõi trạng thái | Bài đơn giản bị bọc quá nhiều lớp | Cần tối ưu bộ nhớ từng chút |

Ba trụ của OOP đọc được ở mọi ngôn ngữ, và cũng chỉ là ba câu: **đóng gói** (giấu ruột, chỉ lộ hành vi), **kế thừa** (dùng lại bằng cách mở rộng — thường bị lạm dụng), **đa hình** (nhiều loại đáp ứng cùng một lời gọi). Xem [[oop-that-su-la-gi]].

## Dễ nhầm

**1. Tưởng có lối "đúng" và lối "sai".** Không có. Một hàm `filter().map()` gọn gàng đặt trong vòng lặp xử lý 10 triệu điểm ảnh là lựa chọn tệ; một vòng `for` 40 dòng để mô hình hoá quy tắc nghiệp vụ cũng vậy.

**2. Tưởng "dùng class" nghĩa là đang viết OOP.** Class chỉ là cú pháp. Nếu class của bạn chỉ chứa dữ liệu công khai và mọi logic nằm ở nơi khác, bạn đang viết mệnh lệnh với cú pháp OOP — và mất luôn cái lợi duy nhất của OOP là giữ trạng thái luôn hợp lệ.

**3. Tưởng "dùng `map`/`filter`" nghĩa là đang viết lối hàm.** Cốt lõi của lối hàm không phải tên hàm, mà là **không sửa dữ liệu đầu vào**:

```ts
// ❌ Hình thức là hàm, ruột là mệnh lệnh — vẫn sửa biến ngoài
let tong = 0
ds.forEach((x) => { tong += x })

// ✅ Không sửa gì cả
const tong = ds.reduce((s, x) => s + x, 0)
```

Chi tiết ở [[ham-dau-vao-dau-ra-va-tac-dung-phu]].

**4. Tưởng phải chọn một lối cho cả dự án.** Thực tế bạn sẽ trộn, và trộn có chủ đích là dấu hiệu của người viết code tốt: dùng OOP để mô hình hoá thực thể nghiệp vụ, dùng lối hàm cho các phép biến đổi dữ liệu bên trong, dùng mệnh lệnh cho đoạn cần tốc độ. Việc cần tránh không phải trộn — mà là **trộn ba lối trong cùng một hàm 30 dòng**.

## Mẹo nhớ

> **Tự nấu (mệnh lệnh) · Thuê đầu bếp (OOP) · Xếp dây chuyền (hàm).**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba lối viết trả lời ba câu hỏi nào?
2. Trạng thái nằm ở đâu trong mỗi lối?
3. Vì sao dùng `class` chưa chắc đã là viết OOP?
4. Vì sao `forEach` cộng dồn vào biến ngoài **không** phải lối hàm?
5. Khi nào lối mệnh lệnh là lựa chọn tốt hơn hai lối kia?

## Tự viết lại

Không nhìn lại phần trên, viết hàm lấy **tên của 3 khách chi nhiều nhất** theo **hai lối**: một lần bằng vòng `for` thuần, một lần bằng dây chuyền `filter/map/sort/slice`.

```ts
const khach = [{ ten: 'An', chi: 500 }, { ten: 'Bình', chi: 1200 }, ...]
```

Viết xong, tự trả lời: bản nào bạn đọc lại nhanh hơn sau một tháng, và bản nào bạn tự tin sửa hơn khi yêu cầu đổi thành "5 khách"?

## Thử sức

Đoạn code này viết theo lối nào?

```ts
class GioHang {
  items = []
  them(sp) { this.items.push(sp) }
  tong() { return this.items.reduce((s, i) => s + i.gia, 0) }
}
```

Nó có `class`, có `reduce`, và có `push` sửa tại chỗ. Hãy chỉ ra **từng phần** thuộc lối nào — và trả lời: việc trộn ở đây là hợp lý hay là dấu hiệu thiết kế chưa rõ?
