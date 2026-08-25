---
title: List, dict và comprehension
slug: list-dict-va-comprehension
summary: Bốn cấu trúc dữ liệu dựng sẵn, chọn đúng cái nào, và cú pháp comprehension thay cho vòng lặp tích luỹ.
level: co-ban
tags: [python, cau-truc-du-lieu, comprehension]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được comprehension mà không phải nhớ thứ tự các phần, và biết khi nào **không** nên dùng nó.

## Ý tưởng chính

Rất nhiều vòng lặp trong Python có cùng một hình dạng: **tạo một list rỗng, duyệt, thêm vào**. Comprehension là cách viết gọn đúng hình dạng đó.

Nhưng nó không phải "cách viết ngắn cho sang". Nó nói rõ ý định hơn: khi thấy comprehension, người đọc biết ngay bạn đang **dựng ra một danh sách mới**, không phải làm việc gì khác.

## Mental model

Hãy đọc comprehension như **một câu tiếng Việt đọc từ giữa ra**.

```python
[x * 2 for x in ds if x > 0]
```

> Đọc theo thứ tự **hành động**, không theo thứ tự viết:
>
> ```text
> ② for x in ds     "với mỗi x trong ds"
> ③ if x > 0        "nếu x dương"
> ① x * 2           "thì lấy x nhân 2"
> ```

Người mới bối rối vì phần **kết quả** nằm ở đầu dòng nhưng lại xảy ra **cuối cùng**. Đọc theo thứ tự ②③① một vài lần là quen.

## Ví dụ nhỏ

```python
ds = [1, -2, 3]

# Vòng lặp tích luỹ
kq = []
for x in ds:
    if x > 0:
        kq.append(x * 2)

# Comprehension — cùng kết quả, cùng ý định
kq = [x * 2 for x in ds if x > 0]     # [2, 6]
```

## Code chạy thế nào

```text
[x * 2 for x in [1, -2, 3] if x > 0]

x = 1   → 1 > 0 đúng   → thêm 1*2 = 2      kq = [2]
x = -2  → -2 > 0 sai   → bỏ qua            kq = [2]
x = 3   → 3 > 0 đúng   → thêm 3*2 = 6      kq = [2, 6]
```

Ba biến thể chỉ khác nhau ở **cặp ngoặc bao ngoài**:

```python
[x for x in ds]        # list      — dựng cả danh sách trong bộ nhớ
{x for x in ds}        # set       — bỏ trùng
{k: v for k, v in d}   # dict
(x for x in ds)        # generator — KHÔNG dựng, sinh từng cái khi cần
```

Generator đáng chú ý vì nó khác hẳn về bộ nhớ:

```python
sum([x * x for x in range(10_000_000)])    # ❌ dựng list 10 triệu phần tử trước
sum(x * x for x in range(10_000_000))      # ✅ sinh từng cái, bộ nhớ O(1)
```

Với dữ liệu lớn, khác biệt là **hết RAM** so với **chạy bình thường**.

## Cú pháp

Làm việc với dict — những hàm dùng hằng ngày:

```python
d.get("a")           # None nếu không có (KHÔNG lỗi)
d.get("a", 0)        # giá trị mặc định
d.setdefault("a", [])# lấy, chưa có thì tạo rồi lấy
d.items()            # duyệt cả khoá lẫn giá trị
{**d1, **d2}         # gộp hai dict (d2 ghi đè)
d1 | d2              # từ Python 3.9, cùng ý nghĩa
```

```python
from collections import Counter, defaultdict

Counter(ds).most_common(3)          # ba giá trị hay gặp nhất — thay cả vòng đếm
nhom = defaultdict(list)             # truy cập khoá chưa có thì tự tạo []
for x in ds: nhom[x.loai].append(x)
```

`Counter` và `defaultdict` xoá bỏ hai vòng lặp bạn viết đi viết lại nhiều nhất.

Sắp xếp và giải nén:

```python
sorted(ds, key=lambda x: x.tuoi, reverse=True)
sorted(ds, key=lambda x: (x.loai, -x.diem))    # nhiều tiêu chí

a, b = b, a                    # hoán đổi, không cần biến tạm
dau, *giua, cuoi = [1,2,3,4]   # dau=1, giua=[2,3], cuoi=4
```

## Tại sao cần nó

Vì chọn đúng cấu trúc dữ liệu quyết định code chạy được với 100 phần tử hay 100 nghìn:

| Cần gì | Dùng | Chi phí |
|---|---|---|
| Danh sách có thứ tự, sửa được | `list` | tra theo giá trị: `O(n)` |
| Kiểm tra "đã có chưa" | `set` | `O(1)` |
| Tra theo khoá | `dict` | `O(1)` |
| Bộ giá trị cố định, làm khoá dict | `tuple` | — |

Đây là chỗ khác biệt lớn nhất:

```python
if x in ds:      # list  → duyệt từng phần tử, O(n)
if x in tap:     # set   → tính ra ngăn, O(1)
```

Với 100.000 phần tử và một vòng lặp bên ngoài, đổi `list` thành `set` là đổi từ vài phút xuống vài mili giây. Nguyên tắc chung ở [[chon-sai-cau-truc-du-lieu-la-dat]].

## So sánh

Khi nào **không** dùng comprehension:

| Tình huống | Dùng |
|---|---|
| Chỉ để tạo list mới từ list cũ | ✅ comprehension |
| Có tác dụng phụ (in, ghi file, gọi API) | ❌ dùng `for` — comprehension tạo list rồi vứt |
| Lồng hai tầng trở lên | ❌ `for` dễ đọc hơn nhiều |
| Cần `break` giữa chừng | ❌ comprehension không dừng được |
| Dữ liệu rất lớn | ✅ nhưng dùng **generator** `( )` |

```python
[print(x) for x in ds]     # ❌ tạo list [None, None, ...] rồi vứt đi
for x in ds: print(x)      # ✅
```

## Dễ nhầm

**1. Comprehension lồng nhiều tầng.**

```python
kq = [y for x in ma_tran for y in x if y > 0 if y % 2 == 0]   # ❌ không ai đọc nổi
```

Ba dòng `for` thường rõ hơn. Comprehension chỉ có lãi khi nó **vẫn đọc được thành một câu**.

**2. Dùng `d[k]` khi khoá có thể chưa có.**

```python
d["a"]           # ❌ KeyError
d.get("a", 0)    # ✅
```

**3. Sửa list trong lúc duyệt.**

```python
for x in ds:
    if x < 0: ds.remove(x)             # ❌ bỏ sót phần tử
ds = [x for x in ds if x >= 0]         # ✅
```

**4. Tưởng dict không có thứ tự.** Từ Python 3.7, `dict` **giữ thứ tự chèn** — đây là bảo đảm chính thức, dùng được.

**5. Generator chỉ duyệt được một lần.**

```python
g = (x for x in ds)
list(g)   # [1, 2, 3]
list(g)   # []  ← đã cạn
```

**6. Dùng `list` cho việc kiểm tra thành viên trong vòng lặp.** Đã nói ở trên — đây là lỗi hiệu năng phổ biến nhất trong code Python thật.

## Mẹo nhớ

> **Đọc comprehension theo thứ tự ② for → ③ if → ① kết quả.**
>
> **`[]` dựng cả danh sách; `()` sinh từng cái.**
>
> **Có tác dụng phụ ⇒ dùng `for`, không dùng comprehension.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Đọc `[f(x) for x in ds if g(x)]` theo thứ tự thực thi thì là gì?
2. Khác biệt về **bộ nhớ** giữa `[...]` và `(...)`?
3. Vì sao `[print(x) for x in ds]` là cách viết sai?
4. `x in ds` với list và với set khác nhau thế nào về chi phí?
5. Vì sao generator không duyệt lại được lần hai?

## Tự viết lại

Không nhìn lại phần trên, viết lại đoạn này bằng comprehension **và** bằng `Counter`:

```python
dem = {}
for don in don_hang:
    if don.trang_thai == "xong":
        if don.khach in dem:
            dem[don.khach] += 1
        else:
            dem[don.khach] = 1
```

Tự kiểm: bản `Counter` của bạn dài mấy dòng, và nó có còn cần câu `if ... in` nào không?

## Thử sức

Bạn cần lọc ra những người dùng **không** nằm trong danh sách bị cấm:

```python
bi_cam = [...]      # 50.000 id
nguoi_dung = [...]  # 200.000 người
con_lai = [u for u in nguoi_dung if u.id not in bi_cam]
```

Đoạn này chạy mất vài phút. Chỉ ra nguyên nhân bằng cách **đếm số phép so sánh**, rồi sửa. Sau đó: nếu `bi_cam` chỉ có 5 phần tử thì có đáng sửa không, và vì sao?
