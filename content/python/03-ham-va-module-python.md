---
title: Hàm, module và package
slug: ham-va-module-python
summary: Tham số vị trí và từ khoá, giá trị trả về nhiều, và cách chia code thành module import được.
level: co-ban
tags: [python, ham, module]
---

> **Sau bài này bạn sẽ:** viết được hàm có chữ ký rõ ràng, và tổ chức dự án thành package thay vì một file dài 2000 dòng.

## Tham số

```python
def tao_don(san_pham, so_luong=1, *, giam_gia=0, ghi_chu=""):
    ...

tao_don("Áo")                              # dùng mặc định
tao_don("Áo", 3)                           # vị trí
tao_don("Áo", so_luong=3, giam_gia=0.1)    # từ khoá
```

Dấu `*` trong danh sách tham số nghĩa là: mọi tham số **sau** nó bắt buộc truyền theo tên. Đây là kỹ thuật đáng dùng — nó ngăn `tao_don("Áo", 3, 0.1, "gấp")` mà không ai đoán được `0.1` là gì.

```python
def f(a, b, /, c, *, d): ...
#        ^ trước / : chỉ vị trí    ^ sau * : chỉ từ khoá
```

## `*args` và `**kwargs`

```python
def ghi_log(muc, *phan, **thuoc_tinh):
    print(muc, phan, thuoc_tinh)

ghi_log("INFO", "khởi động", "xong", request_id="abc")
# INFO ('khởi động', 'xong') {'request_id': 'abc'}
```

Dùng khi bạn thật sự cần số lượng đối số tuỳ ý — thường là để bọc một hàm khác. Đừng dùng chỉ vì "cho linh hoạt": nó xoá sạch thông tin chữ ký hàm.

## Trả về nhiều giá trị

```python
def tach_ten(ho_ten):
    phan = ho_ten.rsplit(" ", 1)
    return phan[0], phan[-1]          # thực chất là một tuple

ho, ten = tach_ten("Nguyễn Văn An")
```

Trả về hơn ba giá trị thì dùng `NamedTuple` hoặc `dataclass` — nơi gọi không phải nhớ thứ tự:

```python
from dataclasses import dataclass

@dataclass
class KetQua:
    thanh_cong: bool
    du_lieu: dict | None = None
    loi: str | None = None
```

`dataclass` tự sinh `__init__`, `__repr__`, `__eq__` — thay được phần lớn class chỉ để chứa dữ liệu.

## Hàm là giá trị

```python
def ap_dung(fn, ds):
    return [fn(x) for x in ds]

ap_dung(str.upper, ["a", "b"])
ap_dung(lambda x: x * 2, [1, 2])

from functools import partial
nhan_doi = partial(lambda a, b: a * b, 2)
```

`lambda` chỉ nên dùng cho biểu thức một dòng, thường làm `key=` cho `sorted`. Dài hơn thì đặt tên hàm hẳn hoi.

## Module và package

```
du_an/
    __init__.py
    chinh.py
    dich_vu/
        __init__.py
        nguoi_dung.py
        thanh_toan.py
```

```python
from du_an.dich_vu.nguoi_dung import lay_nguoi_dung   # tuyệt đối — nên dùng
from .nguoi_dung import lay_nguoi_dung                # tương đối — trong cùng package
```

Ưu tiên import tuyệt đối: nó không phụ thuộc vào việc file đang nằm ở đâu, và không hỏng khi bạn di chuyển module.

### `if __name__ == "__main__"`

```python
def chinh():
    print("chạy")

if __name__ == "__main__":
    chinh()
```

Khối này chỉ chạy khi file được thực thi trực tiếp (`python chinh.py`), không chạy khi bị import. Không có nó, mọi `import` sẽ chạy luôn code của bạn — nguồn của nhiều lỗi khó hiểu.

### Import vòng

`a.py` import `b.py` và ngược lại ⇒ `ImportError`. Đây gần như luôn là dấu hiệu module chia sai: tách phần dùng chung ra module thứ ba.

## Docstring

```python
def tinh_thue(thu_nhap: float, ty_le: float = 0.1) -> float:
    """Tính thuế phải nộp.

    Args:
        thu_nhap: Thu nhập chịu thuế, đơn vị đồng.
        ty_le: Tỷ lệ thuế, mặc định 10%.

    Returns:
        Số tiền thuế.

    Raises:
        ValueError: Khi thu_nhap âm.
    """
    if thu_nhap < 0:
        raise ValueError("Thu nhập không được âm")
    return thu_nhap * ty_le
```

Docstring hiện lên khi gõ `help(tinh_thue)` và trong gợi ý của trình soạn thảo — khác hẳn comment thường.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `def f(ds=[])` | Mặc định dùng chung giữa các lần gọi | `def f(ds=None)` |
| Không có `if __name__` | Code chạy khi bị import | Thêm khối main |
| Import vòng | `ImportError` | Tách module dùng chung |
| Quá nhiều `*args, **kwargs` | Mất thông tin chữ ký | Khai báo tham số rõ |
| Hàm trả về 5 giá trị | Nơi gọi phải nhớ thứ tự | `dataclass` |

## Ghi nhớ

- `*` trong chữ ký buộc dùng tham số từ khoá — dùng nó cho tham số dễ nhầm.
- `dataclass` thay cho class chỉ chứa dữ liệu.
- Import tuyệt đối, và luôn có `if __name__ == "__main__"`.
- Import vòng là dấu hiệu chia module sai.

## Tự kiểm tra

1. Viết `gui_email(den, tieu_de, *, cc=None, bcc=None)` — vì sao `cc`/`bcc` nên là keyword-only?
2. Khi nào dùng `dataclass` thay vì trả về tuple?
3. Hai module import lẫn nhau. Cách xử lý đúng là gì?
