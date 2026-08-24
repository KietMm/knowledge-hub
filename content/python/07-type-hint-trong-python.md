---
title: Type hint trong Python
slug: type-hint-trong-python
summary: Kiểu là chú thích, không phải ràng buộc lúc chạy — và mypy biến chúng thành lớp kiểm tra thật.
level: nang-cao
tags: [python, type-hint, mypy]
---

> **Sau bài này bạn sẽ:** viết chú thích kiểu cho code hiện có mà không phải sửa lại logic, và hiểu vì sao chúng không tự bảo vệ chương trình.

## Kiểu không được kiểm tra lúc chạy

```python
def cong(a: int, b: int) -> int:
    return a + b

cong("x", "y")     # trả về "xy" — Python không phản đối gì cả
```

Type hint là **siêu dữ liệu**. Chỉ có công cụ (mypy, pyright) hoặc thư viện đọc chúng (pydantic, FastAPI) mới biến chúng thành kiểm tra thật.

Lợi ích thật sự: trình soạn thảo gợi ý chính xác, đổi tên an toàn, và mypy bắt được lỗi trước khi chạy.

## Cú pháp cơ bản

```python
ten: str = "An"
tuoi: int = 30
diem: float = 8.5
kich_hoat: bool = True

ds: list[str] = []
d: dict[str, int] = {}
cap: tuple[int, str] = (1, "a")
tap: set[int] = set()
```

Từ Python 3.9, dùng `list[str]` thay cho `List[str]` — không cần import `typing` nữa.

## Optional và union

```python
def tim(id: str) -> User | None:      # 3.10+, thay cho Optional[User]
    ...

def xu_ly(v: int | str) -> str:       # thay cho Union[int, str]
    ...
```

Trả về `X | None` là chú thích quan trọng nhất trong thực tế — nó buộc nơi gọi phải xử lý trường hợp không tìm thấy:

```python
u = tim("1")
print(u.ten)          # mypy: error — u có thể là None
if u is not None:
    print(u.ten)      # OK
```

## Kiểu cho callable, generic, alias

```python
from collections.abc import Callable, Iterable, Sequence

def ap_dung(fn: Callable[[int], str], ds: Iterable[int]) -> list[str]:
    return [fn(x) for x in ds]

# Alias làm chữ ký dễ đọc
UserId = str
BangGia = dict[str, float]

def lay_gia(bang: BangGia, ma: UserId) -> float | None: ...
```

Dùng `Iterable`/`Sequence` cho **tham số** (nhận được nhiều loại hơn) và `list` cho **giá trị trả về** (nơi gọi biết chắc mình có gì).

### Generic

```python
def dau_tien[T](ds: Sequence[T]) -> T | None:     # cú pháp Python 3.12+
    return ds[0] if ds else None

# Trước 3.12:
from typing import TypeVar
T = TypeVar("T")
def dau_tien_cu(ds: Sequence[T]) -> T | None: ...
```

## `TypedDict`, `Protocol`, `Literal`

```python
from typing import TypedDict, Protocol, Literal, Final

class CauHinh(TypedDict):
    host: str
    port: int
    debug: bool

TrangThai = Literal["cho", "chay", "xong"]

class CoTheGhi(Protocol):
    def write(self, s: str) -> int: ...

def xuat(dich: CoTheGhi) -> None:     # bất kỳ thứ gì có .write đều hợp lệ
    dich.write("xin chào")

SO_LAN_THU: Final = 3
```

`Protocol` là duck typing có kiểm tra kiểu: không cần kế thừa, chỉ cần có đúng phương thức.

## mypy

```bash
pip install mypy
mypy .
```

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true
warn_unused_ignores = true
```

Với dự án đã có sẵn code, đừng bật `strict` ngay — sẽ có hàng nghìn lỗi và bạn bỏ cuộc. Cách làm được: bật cho từng module, siết dần.

```toml
[[tool.mypy.overrides]]
module = "du_an.dich_vu.*"
strict = true
```

## pydantic: kiểu thành kiểm tra thật

```python
from pydantic import BaseModel, EmailStr, Field

class NguoiDungVao(BaseModel):
    email: EmailStr
    tuoi: int = Field(ge=0, le=150)
    ten: str = Field(min_length=1)

u = NguoiDungVao(email="a@b.com", tuoi=30, ten="An")     # kiểm tra lúc chạy
NguoiDungVao(email="sai", tuoi=-1, ten="")               # ValidationError
```

Đây là cách đưa type hint vào ranh giới hệ thống — giống vai trò của zod trong TypeScript. Dùng cho: body của API, biến môi trường, file cấu hình.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Tưởng type hint kiểm tra lúc chạy | Dữ liệu rác vẫn lọt | Dùng pydantic ở ranh giới |
| `Any` cho tiện | Tắt kiểm tra, lan sang chỗ khác | Kiểu cụ thể hoặc `object` |
| Bật `strict` cho dự án cũ | Hàng nghìn lỗi, bỏ cuộc | Bật dần theo module |
| `def f(x: list = [])` | Vẫn là bẫy mặc định khả biến | `x: list \| None = None` |
| Quên `\| None` cho hàm có thể không tìm thấy | `AttributeError` lúc chạy | Khai báo đúng |

## Ghi nhớ

- Type hint không kiểm tra gì lúc chạy — mypy và pydantic mới làm việc đó.
- `X | None` là chú thích có giá trị nhất trong thực tế.
- `Iterable` cho tham số, `list` cho giá trị trả về.
- Áp dụng mypy dần theo module, đừng bật strict cả dự án cùng lúc.

## Tự kiểm tra

1. `def cong(a: int, b: int) -> int` gọi với chuỗi thì sao? Vì sao?
2. Khi nào `Protocol` tốt hơn lớp cơ sở trừu tượng?
3. Thêm type hint cho một script cũ 300 dòng — bắt đầu từ đâu?
