---
title: Hàm, module và package
slug: ham-va-module-python
summary: Tham số vị trí và từ khoá, giá trị trả về nhiều, và cách chia code thành module import được.
level: co-ban
tags: [python, ham, module]
khung: v2
---

> **Sau bài này bạn sẽ:** thiết kế được chữ ký hàm mà người gọi đọc là hiểu, và biết `if __name__ == "__main__"` thật sự để làm gì.

## Ý tưởng chính

Chữ ký hàm là **giao diện công khai** của nó — thứ người khác đọc để biết cách dùng. Python cho bạn nhiều công cụ hơn hầu hết ngôn ngữ để làm chữ ký nói rõ ý: tham số từ khoá, giá trị mặc định, ép gọi theo tên.

Và ở tầng cao hơn, **module chỉ là một file `.py`** — mỗi file bạn viết đều đã là module import được.

## Mental model

Hãy nghĩ tới **phiếu đặt món**.

> `pha_ca_phe("nong", True, 2)` là phiếu chỉ ghi ba ô trống — người pha phải đoán ô nào là gì.
>
> `pha_ca_phe(nhiet="nong", co_sua=True, duong=2)` là phiếu **có ghi tên từng ô**. Đọc là hiểu, và không ai điền nhầm chỗ.

Tham số boolean truyền theo vị trí là dạng phiếu tệ nhất: nhìn `True` ở chỗ gọi, không ai biết nó nghĩa là gì.

## Ví dụ nhỏ

```python
def gui(email, tieu_de, khan=False):
    ...

gui("a@x.com", "Chào", True)          # ❌ True là gì?
gui("a@x.com", "Chào", khan=True)     # ✅ đọc là hiểu
```

## Code chạy thế nào

Python cho phép **ép** người gọi phải dùng tên — và đây là công cụ thiết kế API rất đáng dùng:

```text
def f(a, b, /, c, *, d)
       ↑      ↑     ↑
       │      │     └── SAU dấu *: chỉ truyền được bằng TÊN
       │      └──────── giữa: kiểu gì cũng được
       └─────────────── TRƯỚC dấu /: chỉ truyền theo VỊ TRÍ

f(1, 2, 3, d=4)      ✅
f(1, 2, c=3, d=4)    ✅
f(a=1, ...)          ❌ a chỉ nhận theo vị trí
f(1, 2, 3, 4)        ❌ d bắt buộc phải gọi bằng tên
```

Dùng `*` để ép mọi cờ boolean phải gọi bằng tên là một quyết định thiết kế nhỏ mà cứu được rất nhiều lỗi đọc nhầm:

```python
def xoa(duong_dan, *, de_quy=False, ep_buoc=False):
    ...
xoa("/tmp/x", de_quy=True)     # không có cách nào viết xoa("/tmp/x", True)
```

## Cú pháp

```python
def f(*args, **kwargs):
    # args   → tuple các đối số vị trí thừa
    # kwargs → dict các đối số từ khoá thừa
    ...

def ghi_log(*args, **kwargs):
    print(*args, **kwargs)          # ← chuyển tiếp nguyên vẹn
```

Trả về nhiều giá trị — thực chất là trả về một tuple:

```python
def chia(a, b):
    return a // b, a % b

thuong, du = chia(7, 2)             # 3, 1
```

Nhiều hơn ba giá trị thì **đừng** dùng tuple — người gọi phải nhớ thứ tự:

```python
from typing import NamedTuple

class KetQua(NamedTuple):
    thuong: int
    du: int
    am: bool

kq = chia(7, 2)
kq.thuong                            # ✅ có tên, không phải nhớ kq[0]
```

Module và package:

```text
duan/
├─ __init__.py          → biến thư mục thành package (có thể rỗng)
├─ chinh.py
└─ tien_ich/
   ├─ __init__.py
   └─ chuoi.py          → from duan.tien_ich.chuoi import lam_sach
```

```python
if __name__ == "__main__":
    main()
```

## Tại sao cần nó

`if __name__ == "__main__"` là thứ ai cũng gõ mà ít người biết vì sao. Lý do rất cụ thể:

```text
Chạy trực tiếp:   python chinh.py     →  __name__ == "__main__"   →  main() CHẠY
Được import:      import chinh        →  __name__ == "chinh"      →  main() KHÔNG chạy
```

Không có nó, mỗi lần ai đó `import` file của bạn để dùng lại một hàm, **toàn bộ chương trình của bạn chạy theo**. Đây là lý do file thư viện không được có code chạy ở cấp cao nhất.

Docstring — tài liệu nằm ngay trong code:

```python
def tinh_phi(don, *, khan=False):
    """Tính phí giao hàng cho một đơn.

    Args:
        don: Đơn hàng, phải có `khoang_cach` (km).
        khan: True thì áp phụ phí 50%.

    Returns:
        Phí tính bằng đồng, đã làm tròn.

    Raises:
        ValueError: nếu khoảng cách âm.
    """
```

`help(tinh_phi)` đọc được nó, IDE hiện gợi ý từ nó, và nó **không lỗi thời** như comment rời vì nó nằm ngay trong hàm.

## So sánh

| Cách trả về nhiều thứ | Khi nào |
|---|---|
| `return a, b` | Hai giá trị, ý nghĩa rõ từ ngữ cảnh |
| `NamedTuple` / `dataclass` | Ba giá trị trở lên, hoặc cần tên |
| `dict` | Cấu trúc thay đổi, hoặc trả cho JSON |

Ba giá trị là ranh giới thực tế: quá đó thì `kq[2]` trở thành câu đố.

## Dễ nhầm

**1. Giá trị mặc định là mutable.**

```python
def them(x, ds=[]):     # ❌ ds tạo MỘT LẦN, dùng chung mọi lời gọi
def them(x, ds=None):   # ✅
    if ds is None: ds = []
```

Bẫy nổi tiếng nhất Python. Nó xảy ra vì giá trị mặc định được tính **một lần lúc định nghĩa hàm**, không phải mỗi lần gọi.

**2. Import vòng.** `a.py` import `b`, `b.py` import `a` ⇒ `ImportError`. Đây không phải lỗi của Python mà là **tín hiệu thiết kế**: hai module đang dính quá chặt, cần tách phần chung ra — xem [[ket-dinh-cao-lien-ket-long]].

**3. Import `*`.**

```python
from module import *    # ❌ không biết tên nào vào không gian tên của bạn
```

**4. Quên `__init__.py`.** Với package thường thì Python 3 vẫn nhận, nhưng có nó thì rõ ràng hơn và tránh những trường hợp import kỳ lạ.

**5. Code chạy ở cấp cao nhất của module thư viện.** Mọi thứ ngoài `def`/`class` chạy **ngay khi import**. Đây là nguồn của loại bug "chỉ xảy ra khi import theo thứ tự này".

**6. Quá nhiều tham số.** Hàm sáu tham số là dấu hiệu nó làm nhiều việc, hoặc cần một object gom lại. Xem [[chia-bai-toan-lon-thanh-nho]].

## Mẹo nhớ

> **Chữ ký hàm là phiếu đặt món — ghi tên ô, đừng để ô trống.**
>
> **`*` ép cờ boolean phải gọi bằng tên.**
>
> **`if __name__ == "__main__"`: chạy trực tiếp thì làm, bị import thì im.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `def f(a, /, b, *, c)` — cách gọi nào hợp lệ, cách nào không?
2. Vì sao `def f(ds=[])` gây lỗi, và lỗi đó xảy ra ở thời điểm nào?
3. `if __name__ == "__main__"` bảo vệ điều gì?
4. Khi nào nên đổi từ `return a, b` sang `NamedTuple`?
5. Import vòng là tín hiệu của vấn đề gì?

## Tự viết lại

Không nhìn lại phần trên, thiết kế lại chữ ký hàm này để người gọi không thể dùng sai:

```python
def xuat_bao_cao(du_lieu, True, False, "pdf", None):
    ...
```

Tự kiểm: sau khi sửa, một lời gọi điển hình trông thế nào — và người đọc có phải mở định nghĩa hàm ra để hiểu không?

## Thử sức

Bạn có `utils.py` chứa 40 hàm dùng chung. Một ngày, ai đó `import utils` và chương trình **mất 3 giây mới khởi động**.

Nêu **hai** nguyên nhân có thể, và cách xác minh từng cái. Rồi trả lời câu khó hơn: một file 40 hàm tiện ích có phải thiết kế tốt không, và tiêu chí nào để tách nó?
