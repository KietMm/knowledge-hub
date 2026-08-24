---
title: Big-O — đọc và ước lượng độ phức tạp
slug: big-o-doc-va-uoc-luong
summary: Không phải để phỏng vấn. Là để nhìn một vòng lặp lồng nhau và biết trước nó sẽ chết ở mốc dữ liệu nào.
level: trung-cap
tags: [nen-tang, do-phuc-tap, big-o, hieu-nang]
---

> **Sau bài này bạn sẽ:** đọc được độ phức tạp của một đoạn code trong vài giây, ước lượng được nó chịu được bao nhiêu dữ liệu, và biết Big-O nói dối ở đâu.

## Big-O trả lời đúng một câu hỏi

> **Dữ liệu tăng gấp 10, thời gian chạy tăng gấp mấy?**

Chỉ vậy. Nó **không** nói code chạy bao nhiêu mili-giây — chuyện đó phụ thuộc máy, ngôn ngữ, bộ nhớ đệm. Nó nói về **hình dạng của đường cong** khi dữ liệu lớn dần.

Vì sao câu hỏi đó đáng giá: phần lớn sự cố hiệu năng không phải "chậm từ đầu", mà là **chạy tốt hai năm rồi đột ngột chết**. Big-O là công cụ duy nhất dự đoán được thời điểm đó mà không cần đợi nó xảy ra.

## Sáu mức cần thuộc

| Ký hiệu | Tên | Dữ liệu ×10 → thời gian | Ví dụ |
|---|---|---|---|
| `O(1)` | Hằng | **×1** | `map.get()`, `ds[5]`, `ds.push()` |
| `O(log n)` | Lô-ga-rít | **+1 bước** | Tìm nhị phân, tra B-tree |
| `O(n)` | Tuyến tính | ×10 | Duyệt một lần, `filter`, `includes` |
| `O(n log n)` | Tuyến-lô | ~×13 | Sắp xếp (`sort`) |
| `O(n²)` | Bình phương | **×100** | Hai vòng lặp lồng nhau |
| `O(2ⁿ)` | Hàm mũ | không tưởng nổi | Đệ quy không nhớ kết quả |

Con số cụ thể để thấy sự khác biệt là thật — giả sử mỗi phép mất 1 nano-giây:

| n | `O(n)` | `O(n log n)` | `O(n²)` | `O(2ⁿ)` |
|---|---|---|---|---|
| 100 | 0,0001 ms | 0,0007 ms | 0,01 ms | vũ trụ chưa đủ tuổi |
| 10.000 | 0,01 ms | 0,13 ms | **100 ms** | — |
| 1.000.000 | 1 ms | 20 ms | **11,5 ngày** | — |

Dòng cuối là lý do `O(n²)` không phải chuyện học thuật. Một triệu bản ghi không phải con số lớn với database, nhưng đủ để giết một vòng lặp lồng nhau.

## Đọc Big-O trong ba bước

**Bước 1 — Đếm vòng lặp lồng nhau.**

```ts
for (const a of ds) { }                    // O(n)

for (const a of ds) { for (const b of ds) { } }   // O(n²)

for (const a of ds) { }
for (const b of ds) { }                    // O(n) — nối tiếp thì CỘNG, không nhân
```

Lồng nhau thì **nhân**, nối tiếp thì **cộng**. Và vì Big-O chỉ quan tâm số hạng lớn nhất, `O(n + n)` viết gọn thành `O(n)`.

**Bước 2 — Nhìn cả những phép trông như một dòng.**

Đây là chỗ hay sót nhất:

```ts
for (const d of dons) {
  const k = khachs.find((x) => x.id === d.khachId)   // ← .find là O(n) ẩn trong đó!
}
```

Một vòng `for` nhưng độ phức tạp là `O(n × m)`. Bảng cần thuộc:

| Phép | Chi phí | |
|---|---|---|
| `arr.find` / `includes` / `indexOf` / `some` | `O(n)` | ⚠️ ẩn |
| `arr.filter` / `map` / `reduce` | `O(n)` | ⚠️ ẩn |
| `arr.sort` | `O(n log n)` | ⚠️ ẩn |
| `arr.unshift` / `splice` / Python `insert(0,…)` | `O(n)` | ⚠️ ẩn |
| `map.get` / `set` / `has`, `set.has` | `O(1)` | ✅ |
| `arr[i]`, `arr.push` | `O(1)` | ✅ |
| `'a' + b` trong vòng lặp | `O(n)` mỗi lần | ⚠️ ẩn |

**Bước 3 — Bỏ hằng số và số hạng nhỏ.**

`O(3n² + 500n + 9)` → `O(n²)`. Với n đủ lớn, chỉ số hạng lớn nhất còn quan trọng.

## Vì sao `O(log n)` đáng kinh ngạc

Tìm nhị phân trên dữ liệu đã sắp: mỗi bước loại **một nửa**.

```ts
function tim(ds: number[], x: number): number {
  let l = 0, r = ds.length - 1
  while (l <= r) {
    const g = Math.floor((l + r) / 2)
    if (ds[g] === x) return g
    if (ds[g] < x) l = g + 1
    else r = g - 1
  }
  return -1
}
```

| Số phần tử | Số bước tối đa |
|---|---|
| 1.000 | 10 |
| 1.000.000 | 20 |
| 1.000.000.000 | **30** |

Một tỉ phần tử, ba mươi bước. Đây chính là lý do database dựng B-tree cho index: tra một bảng một tỉ dòng chỉ tốn vài lần đọc đĩa. Xem [[index-va-hieu-nang-truy-van]].

Đổi lại, tìm nhị phân đòi hỏi dữ liệu **đã sắp xếp** — và sắp tốn `O(n log n)`. Nên sắp một lần rồi tìm nhiều lần thì lời to; sắp lại mỗi lần tìm thì lỗ.

## Big-O nói dối ở đâu

Đây là phần bị bỏ qua nhiều nhất, và là phần khiến người ta tối ưu sai chỗ:

**① Hằng số bị giấu đi có thể rất lớn.** `O(n)` với hằng số 1000 chậm hơn `O(n²)` với hằng số 1 cho tới khi n vượt 1000. Với dữ liệu nhỏ, thuật toán "tệ hơn" thường nhanh hơn — đó là lý do thư viện sắp xếp thật chuyển sang sắp chèn `O(n²)` cho mảng dưới ~10 phần tử.

**② Nó đếm phép, không đếm giá của phép.** Một lần đọc đĩa đắt gấp cả trăm nghìn lần một phép so sánh trong bộ nhớ đệm. `O(n)` với n lần gọi mạng thua xa `O(n²)` trong RAM. Đây cũng là lý do mảng thắng danh sách liên kết trong thực tế — xem [[mang-va-danh-sach-lien-ket]].

**③ Nó nói về xu hướng khi n lớn.** Với n = 20 thì mọi thứ đều nhanh, và code dễ đọc đáng giá hơn.

Kết luận thực dụng: **dùng Big-O để loại bỏ lựa chọn thảm hoạ, dùng máy đo để chọn giữa các lựa chọn còn lại.** Đừng bao giờ tối ưu dựa trên Big-O mà không đo — cách đo là nội dung của [[hieu-nang-va-do-luong]].

## Độ phức tạp bộ nhớ

Cùng một cách ký hiệu, áp cho **bộ nhớ tốn thêm**:

```ts
function tong(ds: number[]) {          // O(1) bộ nhớ — chỉ một biến
  let s = 0
  for (const n of ds) s += n
  return s
}

function nhanDoi(ds: number[]) {       // O(n) bộ nhớ — tạo mảng mới cùng cỡ
  return ds.map((n) => n * 2)
}
```

Chuyện này thành vấn đề thật khi xử lý file lớn: đọc cả file 4 GB vào bộ nhớ là `O(n)`, còn đọc theo luồng từng dòng là `O(1)`. Cùng kết quả, khác chỗ một bên chạy được và một bên hết RAM.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không thấy `.find`/`.includes` là `O(n)` | Tưởng `O(n)` nhưng thật ra `O(n²)` | Đếm cả phép ẩn trong hàm dựng sẵn |
| Tưởng Big-O nói về mili-giây | Tối ưu sai chỗ | Nó nói về **hình dạng đường cong** |
| Tối ưu `O(n)` → `O(log n)` cho n = 50 | Code phức tạp, không nhanh hơn | Dưới ngưỡng thì ưu tiên dễ đọc |
| Bỏ qua độ phức tạp bộ nhớ | Hết RAM trên file lớn | Xử lý theo luồng |
| Nối chuỗi trong vòng lặp | `O(n²)` âm thầm | Gom vào mảng rồi `join` |
| `sort` bên trong vòng lặp | `O(n² log n)` | Sắp một lần ở ngoài |
| Tin Big-O mà không đo | Tối ưu thứ không phải điểm nghẽn | Đo trước, xem [[hieu-nang-va-do-luong]] |

## Ghi nhớ

- Big-O trả lời: **dữ liệu ×10 thì thời gian ×mấy**. Không phải mili-giây.
- Lồng nhau thì nhân, nối tiếp thì cộng; giữ số hạng lớn nhất.
- `.find`, `.includes`, `.sort`, `unshift` đều có chi phí ẩn — đừng đếm sót.
- `O(n²)` chết ở khoảng vài chục nghìn phần tử. Đó là mốc thật, không phải lý thuyết.
- Big-O đếm số phép, không đếm **giá** của phép — một lần gọi mạng đắt hơn triệu phép so sánh.
- Dùng Big-O để loại thảm hoạ, dùng máy đo để chọn phần còn lại.

## Tự kiểm tra

1. Hai vòng lặp nối tiếp và hai vòng lặp lồng nhau — độ phức tạp khác nhau thế nào?
2. Vì sao `for` một tầng có `.find` bên trong lại là `O(n²)`?
3. Nêu hai trường hợp Big-O dẫn bạn tới kết luận sai trong thực tế.
