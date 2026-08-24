---
title: Cú pháp và kiểu dữ liệu Python
slug: cu-phap-va-kieu-du-lieu-python
summary: Thụt lề thay cho dấu ngoặc, kiểu dữ liệu dựng sẵn, và các quy ước đặt tên PEP 8.
level: co-ban
tags: [python, co-ban, cu-phap]
---

> **Sau bài này bạn sẽ:** đọc được code Python của người khác, và viết code trông giống code Python thay vì JavaScript dịch sang.

## Thụt lề là cú pháp

Python không dùng `{}` để nhóm khối lệnh — nó dùng **thụt lề**. Sai thụt lề là lỗi cú pháp, không phải lỗi thẩm mỹ.

```python
def chao(ten):
    if ten:
        return f"Xin chào {ten}"
    return "Xin chào bạn"
```

Quy ước: **4 dấu cách**, không dùng tab. Trộn tab và dấu cách gây `TabError` rất khó nhìn ra — bật "hiện ký tự ẩn" trong trình soạn thảo nếu gặp.

## Kiểu dựng sẵn

```python
so_nguyen = 42                    # int — không giới hạn độ lớn
so_thuc = 3.14                    # float
chuoi = "xin chào"                # str — bất biến
dung = True                       # bool
khong_co = None                   # NoneType

danh_sach = [1, 2, 3]             # list — thay đổi được
bo_ba = (1, 2, 3)                 # tuple — bất biến
tu_dien = {"ten": "An"}           # dict — giữ thứ tự chèn từ 3.7
tap_hop = {1, 2, 3}               # set — không trùng lặp, không thứ tự
```

`int` của Python không tràn số: `2 ** 1000` cho kết quả chính xác. Nhưng `float` vẫn là số thực nhị phân, nên `0.1 + 0.2 != 0.3` — tiền bạc dùng `decimal.Decimal`.

## f-string

```python
ten, tuoi = "An", 30
print(f"{ten} — {tuoi} tuổi")
print(f"{3.14159:.2f}")           # 3.14
print(f"{1234567:,}")             # 1,234,567
print(f"{ten=}")                  # ten='An' — rất tiện khi debug
```

f-string nhanh hơn và dễ đọc hơn `%` hay `.format()`. Dùng nó mặc định.

## Cắt chuỗi và danh sách (slicing)

```python
s = "Python"
s[0]        # 'P'
s[-1]       # 'n'   — chỉ số âm đếm từ cuối
s[1:4]      # 'yth' — từ 1 đến trước 4
s[:3]       # 'Pyt'
s[::-1]     # 'nohtyP' — đảo ngược
s[::2]      # 'Pto'  — cách một
```

Cú pháp `[bat_dau:ket_thuc:buoc]` áp dụng cho mọi kiểu tuần tự.

## Điều kiện và vòng lặp

```python
if diem >= 8:
    xep_loai = "Giỏi"
elif diem >= 6.5:
    xep_loai = "Khá"
else:
    xep_loai = "Trung bình"

xep_loai = "Giỏi" if diem >= 8 else "Khá"      # toán tử ba ngôi

for i, item in enumerate(danh_sach, start=1):   # có cả chỉ số
    print(i, item)

for ten, tuoi in zip(ten_list, tuoi_list):      # duyệt song song
    print(ten, tuoi)

while dieu_kien:
    ...
else:
    ...      # chạy khi vòng lặp kết thúc mà KHÔNG gặp break
```

Mệnh đề `else` của vòng lặp là đặc sản Python — hữu ích cho mẫu "tìm không thấy thì...".

## Sự thật/giả

Falsy: `False`, `None`, `0`, `0.0`, `""`, `[]`, `{}`, `()`, `set()`.

```python
if not danh_sach:        # Pythonic
    print("rỗng")

if len(danh_sach) == 0:  # dài dòng hơn, không cần thiết
    print("rỗng")
```

So sánh với `None` **luôn** dùng `is`, không dùng `==`:

```python
if x is None: ...        # đúng
if x == None: ...        # sai — có thể bị __eq__ tuỳ chỉnh đánh lừa
```

## PEP 8 — vài quy ước đủ dùng ngay

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| Biến, hàm | snake_case | `tinh_tong`, `so_luong` |
| Lớp | PascalCase | `NguoiDung` |
| Hằng số | UPPER_SNAKE | `SO_LAN_THU_LAI` |
| "Riêng tư" | Một gạch dưới đầu | `_noi_bo` |

Đừng học thuộc — cài `ruff` (hoặc `black`) và để nó định dạng tự động.

## Lỗi hay gặp

| Lỗi | Nguyên nhân | Sửa thế nào |
|---|---|---|
| `IndentationError` | Trộn tab và dấu cách | Đặt trình soạn thảo dùng 4 dấu cách |
| `def f(x=[])` | Giá trị mặc định tạo **một lần**, dùng chung mọi lần gọi | `def f(x=None)` rồi `x = x or []` |
| `if x == None` | Có thể bị ghi đè toán tử | `if x is None` |
| Dùng `+` nối chuỗi trong vòng lặp | Tạo chuỗi mới mỗi vòng, chậm | `"".join(danh_sach)` |
| `list1 = list2` rồi sửa | Hai tên trỏ cùng một list | `list2.copy()` hoặc `list(list2)` |

Bẫy đối số mặc định là kinh điển, đáng nhìn kỹ:

```python
def them(item, gio=[]):     # gio được tạo MỘT lần lúc định nghĩa hàm
    gio.append(item)
    return gio

them("a")    # ['a']
them("b")    # ['a', 'b']  — không phải ['b']!
```

## Ghi nhớ

- Thụt lề 4 dấu cách là cú pháp, không phải phong cách.
- f-string cho mọi việc định dạng chuỗi.
- `is None`, không `== None`.
- Không bao giờ dùng list/dict làm giá trị mặc định của tham số.

## Tự kiểm tra

1. `s[::-1]` làm gì? Viết hàm kiểm tra chuỗi đối xứng bằng slicing.
2. Vì sao `def f(x=[])` nguy hiểm? Viết lại cho đúng.
3. Khi nào dùng `is` và khi nào dùng `==`?
