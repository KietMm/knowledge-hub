---
title: Type hint trong Python
slug: type-hint-trong-python
summary: Kiểu là chú thích, không phải ràng buộc lúc chạy — và mypy biến chúng thành lớp kiểm tra thật.
level: nang-cao
tags: [python, type-hint, mypy]
khung: v2
---

> **Sau bài này bạn sẽ:** biết type hint làm được gì và **không** làm được gì, và chọn đúng giữa mypy và pydantic cho từng chỗ.

## Ý tưởng chính

Type hint trong Python là **chú thích**, không phải ràng buộc. Python **không kiểm tra chúng lúc chạy** — bạn khai `int` rồi truyền chuỗi vào thì chương trình vẫn chạy tiếp cho tới khi nổ ở đâu đó.

Chúng chỉ có giá trị khi có **công cụ đọc chúng**: mypy lúc bạn viết code, IDE lúc gợi ý, pydantic lúc chạy.

## Mental model

Hãy nghĩ tới **nhãn dán trên hộp đồ trong kho**.

> Bạn dán nhãn "sách" lên một hộp. **Không có gì ngăn** ai đó nhét quần áo vào — cái nhãn không phải cái khoá.
>
> Nhưng khi có **người kiểm kho** đi rà (mypy), họ mở ra đối chiếu và báo ngay chỗ sai. Và ai đi lấy hàng cũng đọc nhãn để biết nên tìm ở đâu.

Nhãn vô dụng nếu không ai kiểm. Đó là lý do khai type hint mà không chạy mypy chỉ được một nửa lợi ích — nửa còn lại là IDE gợi ý.

## Ví dụ nhỏ

```python
def cong(a: int, b: int) -> int:
    return a + b

cong("x", "y")     # ✅ CHẠY BÌNH THƯỜNG, trả về "xy"
                   # ❌ mypy báo lỗi — nhưng chỉ khi bạn chạy mypy
```

## Code chạy thế nào

```text
python chuong_trinh.py
  → Python đọc `a: int` như một CHÚ THÍCH, lưu vào __annotations__
  → KHÔNG kiểm tra gì
  → chạy tiếp

mypy chuong_trinh.py
  → đọc chú thích, lần theo luồng dữ liệu
  → báo: Argument 1 has incompatible type "str"; expected "int"
  → không chạy chương trình
```

Hai công cụ, hai thời điểm. Và có một công cụ thứ ba **thật sự kiểm lúc chạy** — pydantic:

```text
NguoiDung(**du_lieu)
  → pydantic đọc chú thích rồi KIỂM TRA THẬT
  → sai kiểu → ValidationError NGAY
```

Ba lớp đó bù nhau, không thay nhau.

## Cú pháp

```python
ds: list[int] = []
d: dict[str, int] = {}
cap: tuple[int, str] = (1, "a")

def f(x: int | None = None) -> str | None:      # Python 3.10+
    ...

from collections.abc import Callable, Iterable
xu_ly: Callable[[int, str], bool]                # nhận (int, str), trả bool
def tong(ds: Iterable[int]) -> int: ...          # ← nhận list, tuple, generator…
```

Nhận `Iterable` thay vì `list` là thói quen tốt: hàm của bạn dùng được với nhiều thứ hơn mà không mất gì.

```python
from typing import TypedDict, Protocol, Literal

class NguoiDungDict(TypedDict):                  # dict có hình dạng cố định
    id: str
    tuoi: int

Trang = Literal["nhap", "cho", "xong"]           # chỉ nhận đúng ba chuỗi này

class CoDienTich(Protocol):                       # vịt gõ có kiểm tra
    def dien_tich(self) -> float: ...
```

`Literal` đặc biệt đáng dùng: nó biến chuỗi tự do thành tập giá trị đóng, và mypy sẽ bắt được lỗi gõ sai `"xogn"`.

## Tại sao cần nó

Vì hai công cụ dưới đây giải quyết **hai bài toán khác nhau**, và nhầm chúng là lỗi thiết kế phổ biến:

**mypy — kiểm lúc viết, cho code nội bộ:**

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true                    # bật hết
```

Với dự án đang có sẵn, đừng bật `strict` ngay — bạn sẽ có 3000 lỗi và bỏ cuộc. Bật dần theo module:

```toml
[[tool.mypy.overrides]]
module = "duan.module_moi.*"
disallow_untyped_defs = true
```

**pydantic — kiểm lúc chạy, ở ranh giới:**

```python
from pydantic import BaseModel, Field

class NguoiDung(BaseModel):
    id: str
    tuoi: int = Field(ge=0, le=150)
    email: str

u = NguoiDung(**du_lieu_tu_api)      # sai kiểu → ValidationError NGAY tại đây
```

Ranh giới là nơi dữ liệu từ ngoài đi vào: phản hồi API, thân request, file cấu hình, biến môi trường. Kiểm ở đó thì lỗi nổ **đúng chỗ** thay vì ba tầng sau — cùng nguyên tắc với [[thu-hep-kieu-va-unknown]] ở TypeScript.

## So sánh

| | mypy | pydantic |
|---|---|---|
| Kiểm khi | Bạn viết code / CI | Chương trình đang chạy |
| Chi phí lúc chạy | 0 | Có (nhưng nhỏ) |
| Bắt được dữ liệu API sai | ❌ | ✅ |
| Bắt được lỗi logic kiểu | ✅ | ❌ |
| Dùng ở | Toàn bộ code nội bộ | **Ranh giới** |

Kết hợp đúng: **mypy khắp nơi, pydantic ở ranh giới.**

## Dễ nhầm

**1. Tưởng type hint kiểm tra lúc chạy.** Không. Đây là hiểu nhầm số một, và nó dẫn tới việc bỏ qua kiểm tra dữ liệu đầu vào.

**2. Khai type hint nhưng không bao giờ chạy mypy.** Bạn được IDE gợi ý — tốt — nhưng không ai bắt lỗi cho bạn. Cho mypy vào CI.

**3. Dùng `Any` để cho qua.** `Any` tắt kiểm tra và **lây lan** sang mọi thứ chạm vào nó. Thà dùng `object` (buộc phải thu hẹp) hoặc khai kiểu thật.

**4. Khai kiểu quá chặt ở tham số.** Nhận `Sequence[int]` hoặc `Iterable[int]` thay vì `list[int]` — hàm dùng được rộng hơn mà không mất gì.

**5. Bật `strict` trên dự án cũ ngay lập tức.** 3000 lỗi và cả đội quay lại không dùng mypy nữa. Bật dần theo module.

**6. Dùng pydantic cho mọi class nội bộ.** Nó có chi phí lúc chạy. Trong lõi hệ thống, `@dataclass` + mypy là đủ và nhanh hơn — xem [[class-dataclass-va-oop]].

## Mẹo nhớ

> **Type hint là NHÃN DÁN, không phải cái khoá.**
>
> **mypy kiểm lúc viết; pydantic kiểm lúc chạy, ở ranh giới.**
>
> **Nhận rộng (`Iterable`), trả hẹp (`list`).**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Điều gì xảy ra lúc chạy khi bạn truyền `str` vào tham số khai `int`?
2. mypy và pydantic kiểm ở hai thời điểm nào, và mỗi cái bắt được loại lỗi gì?
3. Vì sao `Any` nguy hiểm hơn `object`?
4. Vì sao nên nhận `Iterable[int]` thay vì `list[int]`?
5. Với dự án cũ, chiến lược bật mypy nên thế nào?

## Tự viết lại

Không nhìn lại phần trên, thêm type hint cho hàm này và nói **mypy sẽ bắt lỗi gì**:

```python
def gom_theo(ds, khoa):
    kq = {}
    for x in ds:
        kq.setdefault(getattr(x, khoa), []).append(x)
    return kq
```

Tự kiểm: `khoa` nên khai kiểu gì để mypy bắt được lỗi gõ sai tên trường — và Python có làm được điều đó không?

## Thử sức

Đội bạn có 200 file Python, không file nào có type hint. Sếp muốn "dùng type hint".

Lập kế hoạch **ba giai đoạn**: bắt đầu từ đâu, tiêu chí nào để chọn module làm trước, và làm sao để tiến độ không bị lùi lại (module đã gõ kiểu không bị thêm code không kiểu). Câu cuối là câu quan trọng nhất — trả lời bằng công cụ, không bằng kỷ luật.
