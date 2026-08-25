---
title: Class, dataclass và OOP trong Python
slug: class-dataclass-va-oop
summary: Viết class đúng cách, khi nào dataclass đủ, và vì sao Python không cần getter/setter.
level: trung-cap
tags: [python, class, dataclass, oop]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được giữa `dict`, `dataclass` và `class` bằng một câu hỏi, và không bao giờ viết getter/setter vô nghĩa trong Python nữa.

## Ý tưởng chính

Python có OOP đầy đủ, nhưng nó theo một triết lý khác Java: **không giấu gì cả, chỉ đánh dấu ý định**.

Không có `private` thật. Không cần getter/setter. Và với phần lớn nhu cầu "một chỗ chứa dữ liệu có tên", `dataclass` đã đủ — bạn không phải viết class đầy đủ.

## Mental model

Hãy nghĩ tới **biển báo trong một toà nhà**.

> Java xây **tường** quanh phòng riêng: bạn không vào được, chấm hết.
>
> Python treo **biển "khu vực nội bộ"** (dấu gạch dưới `_`). Cửa vẫn mở. Ai cố tình đi vào thì tự chịu trách nhiệm — và mọi người trưởng thành đều tôn trọng cái biển.

Triết lý đó gọi là *"chúng ta đều là người lớn"*. Nó đánh đổi sự bảo đảm lấy sự đơn giản: bạn không phải viết một lớp vỏ chỉ để đọc một giá trị.

## Ví dụ nhỏ

```python
class TaiKhoan:
    def __init__(self, so_du: float = 0):
        self._so_du = so_du          # _ = "nội bộ, đừng đụng"

    def rut(self, sum: float) -> None:
        if sum > self._so_du:
            raise ValueError("Không đủ số dư")
        self._so_du -= sum

    @property
    def so_du(self) -> float:        # đọc như thuộc tính, không phải hàm
        return self._so_du
```

```python
tk = TaiKhoan(100)
tk.so_du         # 100  ← không phải tk.get_so_du()
tk.so_du = 999   # ❌ AttributeError — chỉ có getter, không có setter
```

## Code chạy thế nào

`@property` là lý do Python không cần getter/setter. Nó cho phép bạn **đổi từ thuộc tính thường sang có logic mà không đổi code gọi**:

```text
Ban đầu:
  class SanPham:
      def __init__(self, gia): self.gia = gia
  sp.gia            ← truy cập thẳng

Sau này cần kiểm tra giá không âm — Java phải đổi mọi chỗ gọi thành getGia().
Python chỉ cần:

  class SanPham:
      @property
      def gia(self): return self._gia

      @gia.setter
      def gia(self, v):
          if v < 0: raise ValueError("Giá không âm")
          self._gia = v

  sp.gia            ← code gọi KHÔNG đổi một chữ
```

Đó là lý do viết getter/setter "phòng xa" trong Python là việc thừa: bạn thêm được logic **bất cứ lúc nào** mà không phá vỡ ai.

## Cú pháp

`@dataclass` — khi class chỉ để chứa dữ liệu:

```python
from dataclasses import dataclass, field

@dataclass
class Diem:
    x: float
    y: float = 0.0

# Được tặng miễn phí: __init__, __repr__, __eq__
d = Diem(1, 2)
print(d)              # Diem(x=1, y=2.0)   ← repr đọc được, khác hẳn <object at 0x...>
d == Diem(1, 2)       # True                ← so theo GIÁ TRỊ, không theo danh tính
```

```python
@dataclass(frozen=True)     # bất biến → dùng làm khoá dict/set được
class ToaDo:
    x: int
    y: int

@dataclass
class Kho:
    items: list = field(default_factory=list)   # ← KHÔNG viết items: list = []
```

## Tại sao cần nó

Vì **bẫy giá trị mặc định mutable** cũng tồn tại trong class, và ở đây nó khó thấy hơn:

```python
@dataclass
class Kho:
    items: list = []          # ❌ Python 3.11+ chặn thẳng; bản cũ thì MỌI Kho dùng CHUNG một list
```

```python
class Gio:
    def __init__(self, items=[]):    # ❌ cùng lỗi, không ai chặn
        self.items = items

g1, g2 = Gio(), Gio()
g1.items.append("a")
g2.items                              # ['a']  ← bất ngờ!
```

Cách chữa luôn là `None` hoặc `default_factory`.

Và câu hỏi thực dụng nhất — chọn giữa ba thứ:

| Dùng | Khi nào |
|---|---|
| `dict` | Cấu trúc động, dữ liệu từ JSON, không biết trước có khoá gì |
| `@dataclass` | Chỗ chứa dữ liệu có tên, **không có quy tắc** cần bảo vệ |
| `class` đầy đủ | Có **quy tắc** phải giữ (số dư không âm, trạng thái hợp lệ) |

Câu hỏi một dòng: **"có quy tắc nào phải bảo vệ không?"** Không có ⇒ `dataclass`. Có ⇒ `class` với phương thức nghiệp vụ, không setter.

Kế thừa — **ưu tiên kết hợp**, cùng lý do đã nói ở [[oop-that-su-la-gi]]:

```python
class Chim:
    def bay(self): ...

class CanhCut(Chim):
    def bay(self): raise NotImplementedError   # ❌ vỡ hợp đồng của lớp cha
```

```python
class Chim:
    def __init__(self, cach_di_chuyen):        # ✅ truyền hành vi vào
        self.cach_di_chuyen = cach_di_chuyen
```

`Protocol` cho phép "vịt gõ" có kiểu — không cần kế thừa mà vẫn kiểm được:

```python
from typing import Protocol

class CoDienTich(Protocol):
    def dien_tich(self) -> float: ...

def tong(ds: list[CoDienTich]) -> float:       # bất kỳ class nào có dien_tich() đều hợp lệ
    return sum(x.dien_tich() for x in ds)
```

## So sánh

| | `dict` | `dataclass` | `class` |
|---|---|---|---|
| Gõ sai tên trường | Im lặng | ❌ báo lỗi | ❌ báo lỗi |
| IDE gợi ý | Không | ✅ | ✅ |
| Có phương thức nghiệp vụ | Không | Có thể | ✅ |
| Bảo vệ quy tắc | Không | Không | ✅ |
| Chuyển sang JSON | ✅ thẳng | `asdict()` | Tự viết |

Dòng đầu là lý do đủ để bỏ `dict` trong phần lớn code nội bộ: `u["nane"]` chạy im lặng và trả về `KeyError` ở một nơi khác, còn `u.nane` bị bắt ngay.

## Dễ nhầm

**1. Giá trị mặc định mutable.** Đã nói ở trên — dùng `default_factory` hoặc `None`.

**2. Viết getter/setter cho mọi thuộc tính.** Trong Python đó là việc thừa; dùng thuộc tính thẳng, và thêm `@property` **khi thật sự cần logic**.

**3. Nhầm biến class với biến instance.**

```python
class A:
    ds = []          # ❌ CHUNG cho mọi instance
    def __init__(self):
        self.ds = [] # ✅ riêng từng instance
```

**4. Dùng `__x` hai gạch dưới vì tưởng nó là `private`.** Nó chỉ **đổi tên** biến (name mangling) để tránh trùng khi kế thừa, không hề bảo mật. Một gạch dưới là quy ước đúng.

**5. Kế thừa để dùng lại code.** Xem [[oop-that-su-la-gi]] — dùng kết hợp.

**6. Quên `frozen=True` khi cần làm khoá.** `dataclass` thường không băm được; `frozen=True` mới dùng làm khoá `dict`/`set` được — vì khoá phải bất biến, xem [[bang-bam]].

## Mẹo nhớ

> **Python treo biển "khu vực nội bộ", không xây tường.**
>
> **`@property` cho phép thêm logic sau mà không đổi code gọi ⇒ đừng viết getter phòng xa.**
>
> **Có quy tắc phải giữ ⇒ class. Không có ⇒ dataclass.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao Python không cần getter/setter như Java?
2. `@dataclass` tặng bạn miễn phí ba thứ gì?
3. `items: list = []` trong dataclass gây ra chuyện gì, và cách chữa?
4. Câu hỏi một dòng để chọn giữa `dataclass` và `class` đầy đủ?
5. `_x` và `__x` khác nhau thế nào — cái nào là "private"?

## Tự viết lại

Không nhìn lại phần trên, viết class `GioHang` sao cho:

```text
- số lượng mỗi món luôn ≥ 1
- tổng tiền luôn khớp với các món
- KHÔNG có setter nào cho phép phá hai quy tắc trên
```

Tự kiểm: `tong_tien` của bạn là thuộc tính lưu sẵn hay `@property` tính ra? Nêu lý do cho lựa chọn đó.

## Thử sức

Bạn có `@dataclass class DonHang` với 12 trường, và cần dùng nó làm khoá trong một `dict` để gom nhóm.

Nêu hai vấn đề bạn sẽ gặp và cách xử lý. Rồi câu khó hơn: nếu chỉ **3 trong 12 trường** quyết định "hai đơn là một nhóm", thì việc dùng cả object làm khoá còn đúng không — và bạn làm gì thay thế?
