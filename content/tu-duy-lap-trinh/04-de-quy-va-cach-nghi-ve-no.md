---
title: Đệ quy và cách nghĩ về nó
slug: de-quy-va-cach-nghi-ve-no
summary: Đừng lần theo từng lời gọi trong đầu. Tin vào giả định quy nạp, chốt điều kiện dừng, và biết lúc nào vòng lặp tốt hơn.
level: trung-cap
tags: [nen-tang, tu-duy, de-quy, thuat-toan]
---

> **Sau bài này bạn sẽ:** viết được hàm đệ quy mà không cần mô phỏng từng tầng gọi trong đầu, nhận ra khi nào đệ quy là lời giải tự nhiên, và biết vì sao nó có thể làm tràn ngăn xếp.

## Vì sao đệ quy khó — và vì sao cái khó đó là ảo

Người mới thường cố **lần theo** đệ quy: "gọi lần một thì n=5, nó gọi lần hai n=4, lần hai gọi lần ba n=3..." Đến tầng thứ tư thì mất dấu. Kết luận: "đệ quy khó hiểu."

Cái khó không nằm ở đệ quy. Nó nằm ở **cách tiếp cận**. Không ai lần được năm tầng gọi trong đầu, kể cả người viết ra nó.

Cách nghĩ đúng chỉ gồm ba câu hỏi, và bạn **không bao giờ đi xuống quá một tầng**:

1. **Trường hợp cơ sở** — nhỏ tới mức nào thì trả lời được ngay, không cần gọi tiếp?
2. **Bước thu nhỏ** — làm sao biến bài toán thành một bài **cùng loại nhưng nhỏ hơn**?
3. **Giả định quy nạp** — *cứ cho là* lời gọi con trả về đúng, thì tôi ghép kết quả lại thế nào?

Câu 3 là mấu chốt tâm lý: bạn được phép **tin** rằng hàm mình đang viết đã chạy đúng cho đầu vào nhỏ hơn. Không phải ảo tưởng — đó là quy nạp toán học, và nếu câu 1 với câu 2 đúng thì câu 3 tự đúng theo.

## Ba câu hỏi, một ví dụ

Tính tổng một danh sách:

```ts
function tong(ds: number[]): number {
  if (ds.length === 0) return 0                 // ① cơ sở: rỗng thì tổng là 0
  return ds[0] + tong(ds.slice(1))              // ② thu nhỏ + ③ ghép
}
```

```python
def tong(ds: list[int]) -> int:
    if not ds: return 0                          # ①
    return ds[0] + tong(ds[1:])                  # ② + ③
```

Đọc dòng ② thế này, **không** đọc thành "rồi nó gọi lại chính nó rồi lại gọi...":

> *"Tổng của cả danh sách = phần tử đầu + tổng của phần còn lại. Tôi tin `tong` tính đúng phần còn lại."*

Hết. Một tầng. Không lần xuống đáy.

## Chỗ đệ quy thật sự thắng: dữ liệu phân nhánh

Với danh sách phẳng, vòng lặp thường gọn hơn. Đệ quy chỉ **thật sự** thắng khi dữ liệu tự nó có hình cây — lúc đó vòng lặp phải tự dựng ngăn xếp bằng tay, và code xấu hơn hẳn.

```ts
type ThuMuc = { ten: string; kichThuoc?: number; con?: ThuMuc[] }

function tongDungLuong(tm: ThuMuc): number {
  if (tm.con === undefined) return tm.kichThuoc ?? 0        // ① lá
  return tm.con.reduce((s, c) => s + tongDungLuong(c), 0)   // ②③ mỗi nhánh
}
```

```python
def tong_dung_luong(tm: ThuMuc) -> int:
    if tm.con is None: return tm.kich_thuoc or 0
    return sum(tong_dung_luong(c) for c in tm.con)
```

Thử viết cái này bằng `while` mà xem — bạn sẽ phải tự tạo một mảng `stack`, tự `push`/`pop`. Nghĩa là **tự viết lại đúng cái ngăn xếp mà đệ quy cho không**.

Nhận diện chỗ nên dùng đệ quy: cấu trúc cây thư mục, cây DOM, JSON lồng nhau, cây danh mục nhiều cấp, biểu thức toán, sơ đồ tổ chức. Trong giáo trình này, `CTE` đệ quy của SQL giải đúng họ bài toán đó — xem [[subquery-va-cte]].

## Điều kiện dừng sai = tràn ngăn xếp

Mỗi lời gọi chiếm một khung trên **ngăn xếp lời gọi**, và ngăn xếp có giới hạn.

```ts
function dem(n: number): number {
  if (n === 0) return 0
  return 1 + dem(n - 1)
}
dem(100_000)   // ❌ RangeError: Maximum call stack size exceeded
dem(-1)        // ❌ chạy mãi: -1, -2, -3... không bao giờ chạm 0
```

```python
def dem(n): return 0 if n == 0 else 1 + dem(n - 1)
dem(100_000)   # ❌ RecursionError (Python mặc định chặn ở ~1000 tầng)
```

Hai lỗi khác nhau ở đây, và cần phân biệt:

- `dem(-1)` — **điều kiện dừng không bao giờ tới**. Đây là lỗi logic. Sửa: dùng `n <= 0` thay `n === 0`.
- `dem(100_000)` — điều kiện dừng đúng, nhưng **quá sâu**. Đây là lỗi chọn công cụ, không phải lỗi logic.

Quy tắc kiểm nhanh khi viết xong: *"tham số có chắc chắn tiến về trường hợp cơ sở sau mỗi lời gọi không?"* Nếu có nhánh nào không thu nhỏ, bạn có vòng lặp vô hạn.

## Khi nào **đừng** dùng đệ quy

| Tình huống | Dùng gì | Vì sao |
|---|---|---|
| Duyệt danh sách phẳng | Vòng lặp | Rõ hơn, không tốn ngăn xếp |
| Độ sâu phụ thuộc dữ liệu người dùng | Vòng lặp + ngăn xếp tự quản | Người dùng có thể nạp JSON lồng 50.000 tầng |
| Python, độ sâu > ~1000 | Vòng lặp | Python không tối ưu đuôi, giới hạn thấp |
| Cần hiệu năng tối đa vòng trong | Vòng lặp | Mỗi lời gọi có chi phí khung ngăn xếp |
| Cây, JSON lồng, biểu thức | **Đệ quy** | Code khớp hình dạng dữ liệu |

Điểm cần nhớ về JS/TS và Python: **cả hai đều không đảm bảo tối ưu đệ quy đuôi**. Mẹo "viết thành đệ quy đuôi cho khỏi tràn" đúng ở Scheme, Haskell, và không đúng ở đây.

## Đệ quy tính lại nhiều lần

```ts
function fib(n: number): number {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)     // fib(30) gọi hơn 1,3 triệu lần
}
```

Cây gọi phình theo hàm mũ vì cùng một `fib(k)` được tính lại rất nhiều lần. Cách sửa dùng được ở mọi ngôn ngữ — **nhớ kết quả đã tính**:

```ts
function fib(n: number, nho = new Map<number, number>()): number {
  if (n <= 1) return n
  const co = nho.get(n)
  if (co !== undefined) return co
  const kq = fib(n - 1, nho) + fib(n - 2, nho)
  nho.set(n, kq)
  return kq
}
```

```python
from functools import cache

@cache                       # Python có sẵn, một dòng
def fib(n: int) -> int:
    return n if n <= 1 else fib(n - 1) + fib(n - 2)
```

Từ hàm mũ xuống tuyến tính. Cùng một ý tưởng với [[cache-nhieu-tang]], chỉ khác quy mô: đừng tính lại thứ đã tính. Cái giá và cách đọc con số "hàm mũ" là nội dung của [[big-o-doc-va-uoc-luong]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Cố lần từng tầng gọi trong đầu | Mất dấu ở tầng 4, kết luận "đệ quy khó" | Tin giả định quy nạp, chỉ nghĩ một tầng |
| Quên trường hợp cơ sở | Tràn ngăn xếp ngay lần chạy đầu | Viết nhánh dừng **trước** nhánh đệ quy |
| Cơ sở dùng `=== 0` với đầu vào có thể âm | Chạy mãi, không bao giờ chạm cơ sở | Dùng `<= 0` |
| Có nhánh không thu nhỏ tham số | Vòng lặp vô hạn ở đúng nhánh đó | Kiểm mọi nhánh đều tiến về cơ sở |
| Đệ quy trên dữ liệu người dùng nạp vào | Tràn ngăn xếp = một dạng tấn công từ chối dịch vụ | Giới hạn độ sâu, hoặc dùng vòng lặp |
| Tin JS/Python tối ưu đệ quy đuôi | Vẫn tràn dù viết đúng dạng đuôi | Cả hai đều không đảm bảo điều đó |
| Fibonacci đệ quy thẳng | `fib(40)` treo máy | Nhớ kết quả (`Map` / `@cache`) |

## Ghi nhớ

- Ba câu hỏi: cơ sở là gì, thu nhỏ ra sao, ghép kết quả thế nào. Không bao giờ nghĩ quá một tầng.
- Bạn **được phép tin** lời gọi con trả đúng — đó là quy nạp, không phải ảo tưởng.
- Đệ quy thắng ở dữ liệu hình cây; danh sách phẳng thì vòng lặp rõ hơn.
- Cơ sở sai → chạy mãi. Cơ sở đúng nhưng quá sâu → tràn ngăn xếp. Hai lỗi khác nhau.
- JS/TS và Python **không** đảm bảo tối ưu đệ quy đuôi.

## Tự kiểm tra

1. Ba câu hỏi cần trả lời trước khi viết một hàm đệ quy là gì?
2. `dem(-1)` và `dem(100_000)` cùng gây lỗi — hai lỗi đó khác nhau ở đâu?
3. Vì sao `fib` đệ quy thẳng lại chậm tới mức đó, và cách sửa là gì?
