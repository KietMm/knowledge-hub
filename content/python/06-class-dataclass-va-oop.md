---
title: Class, dataclass và OOP trong Python
slug: class-dataclass-va-oop
summary: Viết class đúng cách, khi nào dataclass đủ, và vì sao Python không cần getter/setter.
level: trung-cap
tags: [python, class, dataclass, oop]
---

> **Sau bài này bạn sẽ:** chọn được giữa dict, dataclass và class thường, và không viết getter/setter vô ích.

## Class cơ bản

```python
class TaiKhoan:
    def __init__(self, chu_so_huu: str, so_du: int = 0) -> None:
        self.chu_so_huu = chu_so_huu
        self.so_du = so_du

    def nap(self, tien: int) -> None:
        if tien <= 0:
            raise ValueError("Số tiền nạp phải dương")
        self.so_du += tien

    def __repr__(self) -> str:
        return f"TaiKhoan({self.chu_so_huu!r}, so_du={self.so_du})"
```

`self` là tham số **tường minh** — Python không có `this` ẩn. Quên `self` trong định nghĩa method là lỗi phổ biến nhất của người mới.

`__repr__` nên có ở mọi class bạn định debug. Không có nó, in ra được `<TaiKhoan object at 0x104f2b3d0>` — vô dụng. `!r` trong f-string gọi `repr()` nên chuỗi hiện kèm dấu nháy.

## Bẫy lớn nhất: giá trị mặc định là mutable

```python
# ❌ List này được tạo MỘT lần, lúc định nghĩa hàm — mọi instance dùng chung nó
class GioHang:
    def __init__(self, items: list[str] = []) -> None:
        self.items = items

a, b = GioHang(), GioHang()
a.items.append("táo")
print(b.items)          # ['táo']  ← giỏ của b tự có hàng!
```

```python
# ✅ None làm mặc định, tạo list mới trong thân hàm
class GioHang:
    def __init__(self, items: list[str] | None = None) -> None:
        self.items = items if items is not None else []
```

Lỗi này áp dụng cho **mọi hàm Python**, không riêng class: `def f(x=[])`, `def f(d={})` đều sai vì cùng lý do.

## `@dataclass` — khi class chỉ để chứa dữ liệu

Viết tay `__init__`, `__repr__`, `__eq__` cho một class chứa năm trường là việc lặp lại vô ích:

```python
from dataclasses import dataclass, field

@dataclass
class BaiHoc:
    tieu_de: str
    slug: str
    cap_do: str = "co-ban"
    tags: list[str] = field(default_factory=list)   # KHÔNG phải = []

bai = BaiHoc("Generic", "generic")
print(bai)                              # BaiHoc(tieu_de='Generic', slug='generic', ...)
print(bai == BaiHoc("Generic", "generic"))   # True — so sánh theo giá trị
```

`field(default_factory=list)` là cách dataclass buộc bạn tránh cái bẫy mutable ở trên — viết `= []` thì dataclass **báo lỗi ngay** thay vì im lặng chia sẻ.

Bất biến thì thêm `frozen=True`:

```python
@dataclass(frozen=True)
class Diem:
    x: int
    y: int

d = Diem(1, 2)
d.x = 5              # FrozenInstanceError
{Diem(1, 2): "gốc"}  # frozen thì hashable → dùng được làm khoá dict
```

## Chọn giữa dict, dataclass và class

| Dùng | Khi |
|---|---|
| `dict` | Dữ liệu tuỳ ý, khoá không biết trước (JSON vừa parse) |
| `TypedDict` | Dict có hình dạng cố định, cần giữ đúng kiểu dict |
| `@dataclass` | Dữ liệu có hình dạng cố định, ít hoặc không có hành vi |
| `@dataclass(frozen=True)` | Như trên và cần bất biến / làm khoá dict |
| `class` thường | Có hành vi thật, có trạng thái thay đổi theo quy tắc |
| `pydantic.BaseModel` | Cần **kiểm tra kiểu lúc chạy** (dữ liệu từ ngoài vào) |

Điểm cuối quan trọng: dataclass và type hint **không kiểm tra gì lúc chạy**. `BaiHoc(tieu_de=123)` chạy bình thường. Dữ liệu từ API hay file cần pydantic — xem [[type-hint-trong-python]].

## Không viết getter/setter

Java/C# cần getter/setter vì đổi từ field sang method là phá vỡ tương thích. Python có `@property` nên **không cần**:

```python
# ❌ Vô ích, chỉ thêm chữ
class Nguoi:
    def get_ten(self): return self._ten
    def set_ten(self, v): self._ten = v

# ✅ Dùng thuộc tính công khai. Cần logic thì thêm property SAU, không ai phải sửa code gọi
class Nguoi:
    def __init__(self, ten: str) -> None:
        self.ten = ten

class NguoiCoKiemTra:
    @property
    def ten(self) -> str:
        return self._ten

    @ten.setter
    def ten(self, v: str) -> None:
        if not v.strip():
            raise ValueError("Tên không được rỗng")
        self._ten = v
```

Code gọi `nguoi.ten = "Kiệt"` không đổi một chữ khi bạn thêm property. Đây là lý do quy ước Python là "công khai trước, đóng gói khi cần".

Một gạch dưới `_x` là **quy ước** ("nội bộ, đừng dùng"), không phải cơ chế. Hai gạch `__x` bị đổi tên (name mangling) — chỉ dùng khi thật sự cần tránh trùng tên ở lớp con.

## Kế thừa: ưu tiên kết hợp

```python
class NguoiDung:
    def __init__(self, email: str) -> None:
        self.email = email

    def gioi_thieu(self) -> str:
        return f"Người dùng {self.email}"

class QuanTri(NguoiDung):
    def __init__(self, email: str, cap: int) -> None:
        super().__init__(email)      # BẮT BUỘC gọi, nếu không self.email không tồn tại
        self.cap = cap

    def gioi_thieu(self) -> str:
        return f"Quản trị cấp {self.cap} ({self.email})"
```

Kế thừa chỉ đúng khi quan hệ thật là **"là một"**. `QuanTri` là một `NguoiDung` — hợp lý. `GioHang` không "là một" `list`, dù nó chứa nhiều thứ — chỗ đó dùng thuộc tính:

```python
# ❌ GioHang không phải là một list
class GioHang(list): ...

# ✅ GioHang CÓ một list
class GioHang:
    def __init__(self) -> None:
        self._items: list[str] = []
```

Kế thừa từ `list`/`dict` làm lộ toàn bộ ~40 method của chúng, kể cả những cái phá vỡ bất biến của bạn.

Cần "hình dạng chung" mà không cần chia sẻ code thì dùng `Protocol` — nó cho phép kiểm tra kiểu tĩnh mà không ràng buộc cây kế thừa.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `def __init__(self, items=[])` | Mọi instance dùng chung một list | `= None` rồi tạo trong thân |
| Quên `self` trong định nghĩa method | `TypeError` khó hiểu | Luôn có `self` đầu tiên |
| Quên `super().__init__()` | Thuộc tính lớp cha không tồn tại | Gọi ở đầu `__init__` |
| Không có `__repr__` | Debug thấy `<object at 0x...>` | Thêm `__repr__` |
| Viết getter/setter kiểu Java | Code dài vô ích | Thuộc tính công khai + `@property` khi cần |
| Kế thừa `list`/`dict` cho tiện | Lộ 40 method phá vỡ bất biến | Chứa nó làm thuộc tính |
| Tin dataclass kiểm tra kiểu | Dữ liệu sai kiểu đi sâu vào hệ thống | pydantic cho dữ liệu từ ngoài |

## Ghi nhớ

- Mặc định mutable (`=[]`, `={}`) dùng chung giữa mọi lần gọi — luôn dùng `None`.
- `@dataclass` cho dữ liệu, `class` cho hành vi, pydantic cho dữ liệu từ ngoài.
- Không viết getter/setter; `@property` thêm sau không phá vỡ code gọi.
- Kế thừa chỉ khi "là một"; còn lại thì chứa nó làm thuộc tính.

## Tự kiểm tra

1. Vì sao `def __init__(self, items=[])` làm hai instance chia sẻ dữ liệu?
2. Vì sao Python không cần getter/setter mà Java thì cần?
3. `GioHang(list)` sai ở đâu, và thay bằng gì?
