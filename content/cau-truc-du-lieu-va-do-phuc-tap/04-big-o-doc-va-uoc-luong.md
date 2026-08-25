---
title: Big-O — đọc và ước lượng độ phức tạp
slug: big-o-doc-va-uoc-luong
summary: Không phải để phỏng vấn. Là để nhìn một vòng lặp lồng nhau và biết trước nó sẽ chết ở mốc dữ liệu nào.
level: trung-cap
tags: [nen-tang, do-phuc-tap, big-o, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** nhìn một đoạn code và nói ngay nó thuộc mức nào, rồi từ ràng buộc dữ liệu suy ra được nó có kịp hay không.

## Ý tưởng chính

Big-O không nói code của bạn chạy mất bao nhiêu giây. Nó trả lời đúng một câu:

> **Dữ liệu tăng gấp 10, thời gian chạy tăng gấp mấy?**

Đó là câu hỏi quan trọng hơn "mất mấy giây", vì số giây phụ thuộc máy, còn **hình dạng tăng trưởng** thì không. Một đoạn `O(n²)` chạy 0,1 giây trên 1.000 bản ghi sẽ mất **10 giây** trên 10.000 — dù bạn đổi sang máy nhanh gấp đôi thì vẫn 5 giây.

## Mental model

Hãy nghĩ tới việc **tìm một cái tên trong danh bạ điện thoại giấy**.

> **`O(n)` — lật từng trang từ đầu.** Danh bạ dày gấp đôi thì mất thời gian gấp đôi.
>
> **`O(log n)` — mở giữa, thấy tên cần tìm nằm nửa trước hay nửa sau, bỏ hẳn một nửa, lặp lại.** Danh bạ dày gấp đôi thì chỉ mất **thêm đúng một lần lật**.
>
> **`O(n²)` — với mỗi tên trong danh bạ, lại lật cả danh bạ để tìm người trùng họ.** Danh bạ dày gấp đôi thì mất gấp **bốn**.
>
> **`O(1)` — hỏi tổng đài.** Danh bạ dày bao nhiêu cũng vậy.

Khi đọc code, hãy hỏi: *"đoạn này giống cách nào trong bốn cách trên?"*

## Ví dụ nhỏ

```ts
// O(1) — số bước không phụ thuộc n
ds[0]

// O(n) — chạm mỗi phần tử một lần
for (const x of ds) tong += x

// O(n²) — với mỗi phần tử, lại duyệt cả mảng
for (const a of ds) for (const b of ds) if (a + b === 10) { }

// O(log n) — mỗi bước bỏ đi một nửa
while (trai < phai) { const giua = ...; if (...) trai = giua + 1; else phai = giua }
```

## Code chạy thế nào

Đọc Big-O bằng ba bước máy móc, không cần trực giác:

**Bước 1 — đếm số vòng lặp lồng nhau chạy trên dữ liệu.**

```text
một vòng      → O(n)
hai vòng lồng → O(n²)
ba vòng lồng  → O(n³)
```

**Bước 2 — tìm những chỗ "chia đôi mỗi bước".** Chúng cho `log n`: tìm nhị phân, cây cân bằng, `while (n > 0) n = Math.floor(n / 2)`.

**Bước 3 — bỏ hằng số và số hạng nhỏ.**

```text
O(3n)        →  O(n)        hằng số không đổi hình dạng
O(n + n²)    →  O(n²)       n lớn thì n² át hẳn n
O(n + m)     →  O(n + m)    HAI dữ liệu khác nhau: giữ nguyên cả hai
```

Bước 3 hay bị làm sai theo chiều ngược: gộp `O(n + m)` thành `O(n)` khi `n` và `m` là hai tập dữ liệu khác nhau. Nếu `m` là số dòng của một file người dùng tải lên, nó có thể lớn hơn `n` rất nhiều.

**Chỗ nhiều người bỏ sót:** lời gọi hàm cũng có giá.

```ts
for (const x of ds) {            // n vòng
  if (danhSachCam.includes(x)) { } // ← includes là O(m) BÊN TRONG vòng lặp
}
// ⇒ O(n × m), không phải O(n)
```

`includes`, `indexOf`, `find`, `filter`, `sort` đều có giá riêng. Nhìn thấy chúng **bên trong** vòng lặp là dấu hiệu nhân độ phức tạp lên.

## Tại sao cần nó

Vì nó cho bạn **đoán trước** thay vì phát hiện sau. Máy tính hiện đại chạy khoảng `10⁸` phép tính mỗi giây; từ đó suy ra bảng dùng được ngay:

| `n` | Độ phức tạp chịu được |
|---|---|
| ≤ 10 | `O(n!)`, `O(2ⁿ)` |
| ≤ 100 | `O(n³)` |
| ≤ 1.000 | `O(n²)` |
| ≤ 10⁶ | `O(n log n)` |
| ≤ 10⁸ | `O(n)` |

Dùng ngược lại mới là chỗ hay: **ràng buộc trong đề (hoặc quy mô dữ liệu thật) cho bạn biết lời giải phải có dạng gì.** Biết `n` cỡ 10⁵ thì `O(n²)` là 10 tỉ phép — chắc chắn không kịp, nên đừng phí thời gian tối ưu vòng lặp lồng nhau mà hãy đi tìm cách `O(n log n)`.

Và để thấy `O(log n)` đáng kinh ngạc thế nào:

```text
n = 1.000.000.000    (một tỉ)
O(n)        → một tỉ bước
O(log n)    → khoảng 30 bước
```

Đó là lý do index cơ sở dữ liệu đáng giá đến vậy — xem [[index-va-hieu-nang-truy-van]].

## So sánh

Sáu mức cần thuộc, xếp từ tốt tới tệ:

| Ký hiệu | Tên | n tăng gấp đôi thì | Gặp ở đâu |
|---|---|---|---|
| `O(1)` | hằng | không đổi | Tra bảng băm, `ds[i]` |
| `O(log n)` | logarit | +1 bước | Tìm nhị phân, index B-tree |
| `O(n)` | tuyến tính | gấp đôi | Duyệt một lượt |
| `O(n log n)` | | hơn gấp đôi chút | Sắp xếp |
| `O(n²)` | bậc hai | gấp **bốn** | Hai vòng lồng nhau |
| `O(2ⁿ)` | mũ | **bình phương** | Vét cạn mọi tập con |

Ranh giới thực tế nằm giữa `O(n log n)` và `O(n²)`: bên trên nó, code sống được với dữ liệu lớn; bên dưới, nó chỉ sống được khi `n` nhỏ.

## Dễ nhầm

**1. Tưởng Big-O là thời gian chạy.** Nó là **hình dạng tăng trưởng**. `O(n)` với hằng số lớn có thể chậm hơn `O(n²)` với hằng số nhỏ — ở `n` nhỏ. Big-O chỉ nói chuyện gì xảy ra khi `n` lớn dần.

**2. Bỏ qua hằng số khi nó thật sự quan trọng.** `O(n)` quét bộ nhớ liền nhau và `O(n)` nhảy lung tung trong RAM cùng một ký hiệu nhưng chênh nhau hàng chục lần. Big-O không thấy bộ nhớ đệm, không thấy chi phí I/O, không thấy việc gọi mạng.

**3. Quên độ phức tạp bộ nhớ.** Nó cũng có Big-O riêng, và cũng làm chết chương trình:

```ts
const tatCa = await db.layTatCa()   // O(n) bộ nhớ — 10 triệu bản ghi là hết RAM
for (const x of tatCa) { }
```

Cách chữa là xử lý theo luồng: đọc từng lô, giữ `O(1)` bộ nhớ. Đây cũng là mặt kia của đánh đổi ở [[danh-doi-bo-nho-va-thoi-gian]].

**4. Chỉ nhìn trường hợp trung bình.** Bảng băm là `O(1)` trung bình nhưng `O(n)` khi mọi khoá đâm vào một ngăn; `sort` nhanh trung bình nhưng có thuật toán tệ ở trường hợp xấu nhất. Với hệ thống chịu tải, **trường hợp xấu nhất mới là cái quyết định**, vì kẻ tấn công sẽ chủ động tạo ra nó.

**5. Tối ưu khi chưa đo.** Big-O giúp bạn **tránh** lựa chọn tệ ngay từ đầu; nó không thay được việc đo khi hệ thống đã chạy chậm — xem [[hieu-nang-va-do-luong]].

## Mẹo nhớ

> **Big-O trả lời: "gấp 10 lần dữ liệu thì gấp mấy lần thời gian?"**
>
> **Vòng lồng vòng → nhân. Chia đôi mỗi bước → log.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Big-O trả lời câu hỏi gì, và **không** trả lời câu hỏi gì?
2. `O(3n + 5)` rút gọn thành gì, và vì sao được phép rút gọn?
3. Vì sao `O(n + m)` **không** được rút thành `O(n)`?
4. Với `n = 10⁵`, lời giải `O(n²)` có kịp không? Ước lượng số phép tính.
5. Nêu hai thứ quan trọng mà Big-O hoàn toàn không nhìn thấy.

## Tự viết lại

Không nhìn lại phần trên, xác định độ phức tạp của từng đoạn và giải thích bằng một câu:

```ts
// a
for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { }

// b
for (const x of a) if (b.includes(x)) { }

// c
while (n > 1) n = Math.floor(n / 2)

// d
ds.sort((x, y) => x - y)
for (const x of ds) { }
```

Câu (a) là chỗ dễ sai nhất — vòng trong không chạy đủ `n` lần, vậy nó là `O(n²)` hay thấp hơn?

## Thử sức

Một API đang mất 2 giây với 1.000 bản ghi. Sếp nói tháng sau dữ liệu lên 50.000.

Nếu code là `O(n)` thì lúc đó mất bao lâu? Nếu là `O(n²)` thì mất bao lâu? Và câu hỏi thật sự: **bạn cần biết gì để xác định nó đang là loại nào**, mà không phải chờ tới tháng sau?
