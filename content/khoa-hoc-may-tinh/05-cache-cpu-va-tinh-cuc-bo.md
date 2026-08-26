---
title: Cache CPU và tính cục bộ
slug: cache-cpu-va-tinh-cuc-bo
summary: Vì sao cùng một thuật toán O(n) lại chạy nhanh chậm khác nhau mười lần tuỳ cách sắp dữ liệu.
level: trung-cap
tags: [nen-tang, hieu-nang, bo-nho, computer-science]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được vì sao duyệt mảng nhanh hơn duyệt danh sách liên kết dù cùng O(n).

## Ý tưởng chính

CPU nhanh hơn RAM khoảng **hai bậc độ lớn**. Nếu mỗi phép tính phải chờ RAM, CPU sẽ đứng không gần như suốt.

Nên giữa chúng có nhiều tầng cache. Và cache hoạt động dựa trên một giả định: **thứ bạn vừa dùng, và thứ nằm cạnh nó, sẽ sớm được dùng lại**.

Viết mã hợp với giả định đó nhanh hơn nhiều lần so với mã chống lại nó — với **cùng một độ phức tạp**.

## Mental model

Hãy nghĩ tới **nấu ăn với nguyên liệu ở ba nơi**.

> Trên **thớt** là thứ bạn đang cầm — lấy tức thì. Đó là thanh ghi.
>
> Trong **tủ lạnh cạnh bếp** — bước hai bước. Đó là cache.
>
> Ngoài **siêu thị** — đi mất nửa tiếng. Đó là RAM.
>
> Người nấu giỏi không chạy siêu thị mỗi lần cần một củ hành. Họ **mang về cả túi một lần** — vì đã đi thì mang luôn thứ nằm cạnh.

Đó chính xác là **cache line**: CPU không bao giờ đọc một byte từ RAM. Nó luôn đọc cả một khối 64 byte.

## Ví dụ nhỏ

```text
Cùng số phép tính, thứ tự truy cập khác nhau:

  Duyệt theo hàng   →  mỗi cache line dùng hết   →  nhanh
  Duyệt theo cột    →  mỗi cache line dùng 1 ô   →  chậm gấp nhiều lần
```

## Code chạy thế nào

**Bảng chi phí — con số làm rõ mọi thứ:**

```text
Thanh ghi CPU        ~0     chu kỳ
L1 cache             ~4     chu kỳ      (~32 KB)
L2 cache             ~12    chu kỳ      (~256 KB–1 MB)
L3 cache             ~40    chu kỳ      (vài MB, chung nhiều lõi)
RAM                  ~200   chu kỳ      ← chậm hơn L1 50 LẦN
SSD                  ~100.000 chu kỳ
```

```text
Nếu quy đổi ra thời gian người:
  L1  = lấy thứ trên bàn        (1 giây)
  RAM = đi bộ sang toà nhà khác (50 giây)
  SSD = bay sang thành phố khác (7 giờ)
```

**Hai loại cục bộ mà cache khai thác:**

```text
CỤC BỘ THỜI GIAN   thứ vừa dùng sẽ sớm dùng lại
                   → biến trong vòng lặp nằm sẵn trong cache

CỤC BỘ KHÔNG GIAN  thứ nằm cạnh thứ vừa dùng sẽ sớm được dùng
                   → CPU đọc cả CACHE LINE 64 byte một lần
```

Cache line 64 byte là con số quan trọng nhất trong bài:

```text
Mảng số 8 byte: một lần đọc RAM mang về 8 phần tử.
⇒ Duyệt tuần tự: cứ 8 phần tử mới phải đi RAM một lần.

Danh sách liên kết: mỗi node nằm rải rác trong heap.
⇒ Mỗi node là một lần đi RAM, và 56/64 byte mang về bị bỏ phí.
```

**Vì sao cùng O(n) mà khác nhau nhiều lần:**

```js
// Mảng — bộ nhớ liền khối
for (let i = 0; i < arr.length; i++) tong += arr[i]

// Danh sách liên kết — mỗi node một chỗ
for (let node = head; node; node = node.next) tong += node.value
```

```text
Cả hai đều O(n) — đúng số phép cộng.
Nhưng mảng đọc RAM ~n/8 lần, danh sách đọc ~n lần.
⇒ Trong thực tế mảng thường nhanh hơn 3–10 lần.

Big-O đếm SỐ PHÉP TÍNH. Nó cố ý bỏ qua chi phí truy cập bộ nhớ.
Ở n nhỏ và vừa, chi phí bị bỏ qua đó lại là phần lớn thời gian.
```

Đây là lý do thực tế khiến `Array` gần như luôn thắng `LinkedList` trong đo đạc, dù sách giáo khoa nói chèn giữa của danh sách là O(1) ([[mang-va-danh-sach-lien-ket]]).

## Cú pháp

**Duyệt ma trận — ví dụ kinh điển:**

```js
// ✅ Theo hàng: đi đúng thứ tự bộ nhớ
for (let i = 0; i < N; i++)
  for (let j = 0; j < N; j++) tong += m[i][j]

// ❌ Theo cột: mỗi bước nhảy qua cả một hàng
for (let j = 0; j < N; j++)
  for (let i = 0; i < N; i++) tong += m[i][j]
```

```text
Cùng N² phép cộng.
Bản thứ hai: mỗi lần đọc mang về 64 byte nhưng chỉ dùng 8.
⇒ Với ma trận lớn, chậm hơn nhiều lần — chỉ vì đổi thứ tự hai vòng lặp.
```

**Bố cục dữ liệu — mảng của struct hay struct của mảng:**

```js
// AoS — mảng các object. Tự nhiên, nhưng nếu chỉ cần một trường thì phí.
const nguoi = [{ ten, tuoi, dia }, ...]
// Tính tuổi trung bình ⇒ kéo về cả ten và dia, dùng 8/200 byte mỗi lần.

// SoA — mỗi trường một mảng riêng.
const tuoi = new Int32Array(n)
// Tính tuổi trung bình ⇒ mọi byte mang về đều được dùng.
```

SoA là kỹ thuật của xử lý dữ liệu lớn và game engine. Với ứng dụng web thông thường thì **đừng dùng** — nó đánh đổi khả năng đọc lấy tốc độ mà bạn không cần.

**Chia sẻ giả — cái bẫy của đa luồng:**

```text
Hai luồng ghi vào hai biến KHÁC NHAU nhưng nằm cùng một cache line 64 byte.
⇒ Mỗi lần một luồng ghi, cache line của luồng kia bị vô hiệu.
⇒ Hai luồng "không liên quan" làm chậm nhau đáng kể.
⇒ Cách sửa: chèn đệm để mỗi biến nóng nằm riêng một cache line.
```

## Tại sao cần nó

Vì nó đổi cách bạn đọc kết quả đo:

```text
"Thuật toán này O(n log n), cái kia O(n²), sao cái O(n²) lại nhanh hơn?"

Với n nhỏ (vài trăm), hằng số và chi phí bộ nhớ áp đảo phần tiệm cận.
⇒ Sắp xếp chèn thắng quicksort ở n < ~30 — đó là lý do các thư viện
  sắp xếp thật đều chuyển sang sắp xếp chèn khi đoạn đủ nhỏ.
```

**Nhưng đừng tối ưu cache trước:**

```text
Thứ tự đúng khi tối ưu:
  ① Chọn đúng thuật toán và cấu trúc dữ liệu   ← thắng lớn nhất
  ② Bỏ việc không cần làm
  ③ Giảm số lần đi RAM (bố cục dữ liệu)         ← bài này
  ④ Tinh chỉnh vi mô                            ← gần như không bao giờ đáng

Với ứng dụng web, điểm nghẽn hầu như luôn là I/O và CSDL,
không phải cache CPU ([[hieu-nang-va-do-luong]]).
```

Giá trị thật của bài này với đa số người đọc không phải để tối ưu, mà để **giải thích được kết quả đo bất ngờ** — và để chọn mảng thay vì danh sách liên kết mà biết vì sao.

## So sánh

| Cấu trúc | Big-O duyệt | Số lần đọc RAM | Thực tế |
|---|---|---|---|
| Mảng liền khối | O(n) | ~n/8 | nhanh nhất |
| Mảng object | O(n) | ~n | trung bình |
| Danh sách liên kết | O(n) | ~n, rải rác | chậm |
| Cây/đồ thị con trỏ | O(n) | ~n, rất rải rác | chậm nhất |

## Dễ nhầm

**1. Tin rằng cùng Big-O thì cùng tốc độ.** Big-O bỏ qua chi phí bộ nhớ.

**2. Chọn danh sách liên kết vì "chèn O(1)".** Đo trước — mảng thường thắng.

**3. Duyệt ma trận theo cột.**

**4. Tối ưu cache trước khi sửa thuật toán.**

**5. Dùng SoA trong ứng dụng web bình thường.** Đánh đổi sai.

**6. Quên chia sẻ giả trong mã đa luồng.**

**7. Đo hiệu năng với dữ liệu nhỏ.** Vừa trong cache thì mọi thứ đều nhanh.

**8. Đo mà không warm-up.** Lần chạy đầu tính cả chi phí nạp cache.

## Mẹo nhớ

> **CPU không đọc byte — nó đọc CACHE LINE 64 byte.**
>
> **RAM chậm hơn L1 khoảng 50 lần. Đi RAM là chuyện đắt.**
>
> **Big-O đếm phép tính, không đếm số lần đi RAM.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Thứ tự các tầng và chênh lệch tốc độ giữa L1 và RAM?
2. Cache line là gì, bao nhiêu byte, và vì sao nó quan trọng?
3. Hai loại cục bộ, mỗi loại nghĩa là gì?
4. Vì sao mảng nhanh hơn danh sách liên kết dù cùng O(n)?
5. Chia sẻ giả là gì?

## Tự viết lại

Không nhìn lại:

```text
① Viết hai vòng lặp duyệt ma trận, đánh dấu cái nào nhanh và vì sao
② Giải thích vì sao duyệt 1 triệu object chậm hơn duyệt 1 triệu số
③ Một cấu trúc lưu 10 triệu điểm (x, y, z) mà thường chỉ cần x —
   bạn thiết kế thế nào và đánh đổi gì
```

Tự kiểm: ở ③, thiết kế nhanh hơn của bạn khó đọc hơn bao nhiêu — và với 10 nghìn điểm thay vì 10 triệu, bạn còn chọn nó không?

## Thử sức

Đồng nghiệp thay `Array` bằng `LinkedList` cho một danh sách hay chèn giữa, "vì chèn là O(1)". Sau đó ứng dụng **chậm hơn**.

Ba câu để trả lời: giải thích vì sao; bạn **chứng minh** bằng phép đo nào; và bạn đề xuất cấu trúc gì. Câu khó nhất: với kích thước nào thì danh sách liên kết mới thật sự thắng — và làm sao tìm ra ngưỡng đó cho trường hợp cụ thể của bạn?
