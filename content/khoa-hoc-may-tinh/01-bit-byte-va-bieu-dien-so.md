---
title: Bit, byte và cách máy biểu diễn số
slug: bit-byte-va-bieu-dien-so
summary: Mọi thứ trong máy đều là số nhị phân — hiểu điều đó giải thích tràn số, số âm, và vì sao int có giới hạn.
level: co-ban
tags: [nen-tang, bit, so-hoc, computer-science]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được vì sao `int` tràn, số âm được lưu thế nào, và khi nào phải lo về điều đó.

## Ý tưởng chính

Máy tính chỉ có **hai trạng thái**: có điện và không điện. Mọi thứ khác — số, chữ, ảnh, video — đều là cách **quy ước** để diễn giải một chuỗi hai trạng thái đó.

Từ đó suy ra điều quan trọng nhất: **số trong máy luôn có giới hạn**, vì số bit dành cho nó là hữu hạn.

## Mental model

Hãy nghĩ tới **đồng hồ đo số km trên xe cũ** — loại có sáu ô số cơ khí.

> Nó đếm được tới 999999. Đi thêm 1 km nữa thì nó không hiện 1000000 — nó **quay về 000000**.
>
> Đồng hồ không hỏng. Nó chỉ **hết ô số**. Và nó không có cách nào báo cho bạn biết chuyện đó vừa xảy ra.

Đó chính xác là tràn số nguyên. Kiểu `int32` có 32 ô số nhị phân; vượt quá là quay vòng, im lặng, không báo lỗi.

## Ví dụ nhỏ

```text
Số 13 trong hệ nhị phân, 8 bit:

  0  0  0  0  1  1  0  1
128 64 32 16  8  4  2  1
            8 +4    +1  = 13
```

## Code chạy thế nào

**Một byte = 8 bit, và nó chứa được bao nhiêu:**

```text
1 bit   → 2 giá trị       (0, 1)
2 bit   → 4
8 bit   → 256             một byte
16 bit  → 65.536
32 bit  → ~4,29 tỉ
64 bit  → ~1,8 × 10¹⁹

Quy luật: n bit → 2ⁿ giá trị. Thêm một bit là GẤP ĐÔI.
```

**Số âm — bù hai, và vì sao nó được chọn:**

```text
Cách ngây thơ: dùng bit đầu làm dấu.
  0000 0001 = +1
  1000 0001 = −1
  Vấn đề: có HAI số 0 (+0 và −0), và phép cộng phải xét dấu riêng.

Bù hai (thứ mọi máy dùng): đảo mọi bit rồi cộng 1.
  +5      = 0000 0101
  đảo bit = 1111 1010
  cộng 1  = 1111 1011  = −5

Vì sao đáng chọn: PHÉP CỘNG KHÔNG CẦN BIẾT DẤU.
  0000 0101  (+5)
+ 1111 1011  (−5)
= 1 0000 0000 → bỏ bit tràn → 0000 0000 = 0  ✓
```

Hệ quả của bù hai là dải số **lệch một đơn vị**:

```text
int8:  −128 … +127        (không phải −127 … +127)
int32: −2.147.483.648 … +2.147.483.647
```

Con số 2.147.483.647 xuất hiện ở khắp nơi trong lỗi thực tế — nó là `int32` lớn nhất.

## Cú pháp

**Tràn số — nó im lặng, và đó là vấn đề:**

```js
// JS dùng số thực 64-bit nên không tràn kiểu này, nhưng bitwise thì có:
console.log(2147483647 | 0)      // 2147483647
console.log((2147483647 + 1) | 0) // -2147483648  ← quay vòng

// Postgres integer (int32):
// INSERT ... VALUES (2147483648) → lỗi "integer out of range"
```

```text
Ba nơi tràn số gây sự cố thật:
  ① Khoá chính AUTO_INCREMENT kiểu int32
     → bảng đạt 2,1 tỉ dòng ⇒ không insert được nữa
     ⇒ dùng bigint cho bảng có thể lớn
  ② Đếm mili giây: 32 bit chỉ chứa được ~24,8 ngày
  ③ Nhân hai số lớn rồi mới chia — kết quả trung gian tràn
```

**Toán tử bit — khi nào thật sự dùng:**

```js
const DOC = 1      // 0001
const GHI = 2      // 0010
const XOA = 4      // 0100

let quyen = DOC | GHI          // 0011 — gộp cờ
quyen & GHI                     // 2 (khác 0) — có quyền ghi?
quyen &= ~GHI                   // bỏ cờ ghi
```

```text
&   AND  cả hai đều 1        → kiểm tra cờ
|   OR   một trong hai là 1  → bật cờ
^   XOR  khác nhau thì 1     → đảo cờ, và dùng trong checksum
~   NOT  đảo mọi bit
<<  dịch trái n bit = nhân 2ⁿ
>>  dịch phải n bit = chia 2ⁿ (làm tròn xuống)
```

Ngày nay bạn hiếm khi viết bitwise để tối ưu — trình biên dịch làm tốt hơn. Chỗ nó còn cần thiết là **cờ quyền**, **giao thức nhị phân**, và **đọc mã người khác viết**.

## Tại sao cần nó

Vì hai câu hỏi thực tế phụ thuộc vào nó:

```text
① "Cột này nên int hay bigint?"
   int    4 byte, tới 2,1 tỉ
   bigint 8 byte, tới 9,2 × 10¹⁸
   ⇒ Bảng log, bảng sự kiện, bảng đơn hàng của hệ thống lớn: bigint.
   ⇒ Đổi từ int sang bigint trên bảng 500 triệu dòng ĐANG CHẠY là một dự án,
     không phải một lệnh ALTER.

② "Kiểu này chiếm bao nhiêu bộ nhớ?"
   1 triệu bản ghi × 8 byte thừa mỗi bản ghi = 8 MB.
   Nhân với index, với bản sao, với cache ⇒ con số thật lớn hơn.
```

**Đơn vị — chỗ hay nhầm:**

```text
1 byte = 8 bit
1 KB = 1024 byte (hoặc 1000, tuỳ ngữ cảnh — ổ cứng dùng 1000)
1 Gbps = 125 MB/s        ← b nhỏ là bit, B lớn là byte

Nhầm bit với byte ⇒ sai 8 lần khi tính băng thông.
```

## So sánh

| Kiểu | Bit | Dải giá trị | Dùng khi |
|---|---|---|---|
| `int8` / `tinyint` | 8 | −128…127 | cờ, mã trạng thái nhỏ |
| `int32` / `integer` | 32 | ±2,1 tỉ | mặc định hợp lý |
| `int64` / `bigint` | 64 | ±9,2 × 10¹⁸ | id, tiền, timestamp |
| `uint32` | 32 | 0…4,29 tỉ | khi chắc chắn không âm |

## Dễ nhầm

**1. Dùng `int` cho khoá chính của bảng lớn.** 2,1 tỉ đến nhanh hơn bạn nghĩ, và sửa lúc đó rất đắt.

**2. Tưởng tràn số sẽ báo lỗi.** Ở nhiều ngôn ngữ nó quay vòng im lặng.

**3. Nhầm bit với byte.** Sai 8 lần khi tính băng thông hay dung lượng.

**4. Quên dải bù hai lệch một.** `−128` có, `+128` không, với `int8`.

**5. Nhân trước rồi mới chia** khi kết quả trung gian có thể tràn.

**6. Dùng `int32` cho timestamp mili giây.** Tràn sau ~24,8 ngày.

**7. Tưởng `>>` và `>>>` giống nhau.** Với số âm, `>>` giữ dấu, `>>>` thì không.

**8. Tối ưu bằng bitwise khi không cần.** Trình biên dịch đã làm; bạn chỉ đổi mã dễ đọc thành mã khó đọc.

## Mẹo nhớ

> **n bit → 2ⁿ giá trị. Thêm một bit là gấp đôi.**
>
> **Tràn số quay vòng IM LẶNG — không có ai báo cho bạn.**
>
> **2.147.483.647 là `int32` lớn nhất. Nhớ con số này.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. 8 bit chứa được bao nhiêu giá trị? 16 bit?
2. Bù hai hoạt động thế nào, và vì sao được chọn thay vì bit dấu?
3. Vì sao `int8` là −128…127 chứ không phải −127…127?
4. Ba tình huống thật mà tràn số gây sự cố?
5. 1 Gbps là bao nhiêu MB/s, và vì sao?

## Tự viết lại

Không nhìn lại, làm bằng tay:

```text
① Đổi 37 sang nhị phân 8 bit
② Tìm biểu diễn bù hai của −37
③ Cộng hai kết quả trên, kiểm xem có ra 0 không
④ Một bảng dự kiến 5 tỉ dòng — chọn kiểu khoá chính nào, vì sao
```

Tự kiểm: ở ③ bạn xử lý bit tràn ra ngoài 8 bit thế nào?

## Thử sức

Hệ thống chạy 3 năm, bảng `su_kien` có khoá chính `integer`, hiện đã 1,9 tỉ dòng và tăng 2 triệu/ngày.

Ba câu để trả lời: bao lâu nữa thì vỡ, và **chuyện gì xảy ra** đúng lúc đó; hai cách xử lý và đánh đổi của mỗi cách; và bạn làm gì **ngay hôm nay**. Câu khó nhất: nếu `ALTER TABLE ... TYPE bigint` khoá bảng nhiều giờ, bạn chuyển kiểu mà **không dừng dịch vụ** bằng cách nào?
