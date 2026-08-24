---
title: List, dict và comprehension
slug: list-dict-va-comprehension
summary: Bốn cấu trúc dữ liệu dựng sẵn, chọn đúng cái nào, và cú pháp comprehension thay cho vòng lặp tích luỹ.
level: co-ban
tags: [python, cau-truc-du-lieu, comprehension]
---

> **Sau bài này bạn sẽ:** viết được comprehension đọc hiểu ngay, và chọn đúng giữa list, dict, set, tuple thay vì mặc định dùng list cho mọi thứ.

## Chọn cấu trúc dữ liệu

| Cần gì | Dùng | Độ phức tạp tra cứu |
|---|---|---|
| Dãy có thứ tự, sửa được | `list` | O(n) để tìm |
| Dãy cố định, dùng làm khoá | `tuple` | O(n) |
| Ánh xạ khoá → giá trị | `dict` | O(1) |
| Tập hợp, kiểm tra "có chứa" | `set` | O(1) |

Điểm quan trọng nhất: kiểm tra `x in danh_sach` trên list là **O(n)**, trên set là **O(1)**. Với vài chục nghìn phần tử, khác biệt là vài giây so với tức thì.

```python
# Chậm: mỗi lần in phải duyệt cả list
da_xu_ly = []
for item in items:
    if item.id not in da_xu_ly:   # O(n) mỗi lần
        da_xu_ly.append(item.id)

# Nhanh
da_xu_ly = set()
for item in items:
    if item.id not in da_xu_ly:   # O(1)
        da_xu_ly.add(item.id)
```

## List comprehension

```python
# Thay cho vòng lặp tích luỹ
binh_phuong = [x ** 2 for x in range(10)]
chan = [x for x in range(20) if x % 2 == 0]
ten_hoa = [n.upper() for n in ten if n]
cap = [(x, y) for x in "ab" for y in (1, 2)]     # tích Descartes
```

Đọc từ trái sang: *lấy `x ** 2`, với mỗi `x` trong `range(10)`*.

**Giới hạn:** một `for` và một `if` thì comprehension rõ ràng hơn vòng lặp. Nhiều hơn thế thì viết vòng lặp thường — dễ đọc quan trọng hơn ngắn.

## Dict và set comprehension

```python
do_dai = {ten: len(ten) for ten in ten_list}
tap_ten = {n.lower() for n in ten_list}

# Đảo khoá và giá trị
dao = {v: k for k, v in tu_dien.items()}
```

## Generator: không dựng cả danh sách trong bộ nhớ

```python
tong = sum(x ** 2 for x in range(1_000_000))   # không tạo list 1 triệu phần tử
```

Dùng ngoặc tròn thay ngoặc vuông. Generator sinh từng giá trị khi cần — bắt buộc khi dữ liệu lớn hoặc vô hạn. Đổi lại: chỉ duyệt được **một lần**.

## Làm việc với dict

```python
d = {"ten": "An", "tuoi": 30}

d["email"]                  # KeyError nếu không có
d.get("email")              # None
d.get("email", "chưa có")   # giá trị mặc định

d.setdefault("tags", []).append("moi")   # tạo nếu chưa có rồi trả về

for khoa, gia_tri in d.items():
    print(khoa, gia_tri)

d1 | d2                     # gộp, d2 thắng khi trùng khoá (Python 3.9+)
```

### Nhóm dữ liệu

```python
from collections import defaultdict, Counter

nhom = defaultdict(list)
for don in don_hang:
    nhom[don.trang_thai].append(don)

dem = Counter(w.lower() for w in van_ban.split())
dem.most_common(5)          # 5 từ xuất hiện nhiều nhất
```

`defaultdict` và `Counter` xoá bỏ hẳn mẫu "kiểm tra khoá tồn tại chưa rồi mới thêm".

## Sắp xếp

```python
sorted(danh_sach)                                 # trả về list mới
danh_sach.sort()                                  # sửa tại chỗ, trả về None
sorted(nguoi, key=lambda n: n.tuoi, reverse=True)
sorted(nguoi, key=lambda n: (n.thanh_pho, n.ten)) # nhiều tiêu chí
```

Bẫy: `danh_sach = danh_sach.sort()` gán `None` — vì `.sort()` sửa tại chỗ và không trả về gì.

## Giải nén (unpacking)

```python
a, b = b, a                          # hoán đổi, không cần biến tạm
dau, *giua, cuoi = [1, 2, 3, 4, 5]   # giua = [2, 3, 4]

def f(*args, **kwargs): ...
f(*danh_sach, **tu_dien)             # trải ra khi gọi hàm
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `in` trên list lớn trong vòng lặp | O(n²), chậm bất ngờ | Dùng `set` |
| `x = ds.sort()` | `x` là `None` | `x = sorted(ds)` |
| Sửa list trong lúc đang duyệt nó | Bỏ sót phần tử | Duyệt trên `ds.copy()` |
| Comprehension lồng ba tầng | Không ai đọc nổi | Viết vòng lặp thường |
| `d[k]` khi khoá có thể vắng | `KeyError` lúc chạy | `d.get(k, mac_dinh)` |

## Ghi nhớ

- `set`/`dict` tra cứu O(1); `list` là O(n).
- Comprehension cho một `for` + một `if`; phức tạp hơn thì dùng vòng lặp.
- Generator `( )` khi dữ liệu lớn.
- `.sort()` sửa tại chỗ, `sorted()` trả về mới.

## Tự kiểm tra

1. Viết comprehension lấy email của người dùng đang hoạt động, viết thường.
2. Vì sao dùng `set` để khử trùng lặp nhanh hơn hẳn `list`?
3. `defaultdict(list)` giúp gì so với dict thường khi nhóm dữ liệu?
