---
title: Xử lý lỗi và đọc ghi file
slug: xu-ly-loi-va-doc-ghi-file
summary: try/except đúng cách, tự định nghĩa exception, và context manager để không bao giờ quên đóng tài nguyên.
level: trung-cap
tags: [python, exception, file, context-manager]
---

> **Sau bài này bạn sẽ:** ngừng viết `except:` trần, và dùng `with` cho mọi thứ cần dọn dẹp.

## try/except/else/finally

```python
try:
    du_lieu = doc_cau_hinh(duong_dan)
except FileNotFoundError:
    du_lieu = MAC_DINH
except json.JSONDecodeError as e:
    raise ValueError(f"Cấu hình hỏng ở {duong_dan}") from e
else:
    ghi_log("Đọc cấu hình thành công")     # chạy khi KHÔNG có lỗi
finally:
    don_dep()                              # luôn chạy
```

Nguyên tắc: bắt **đúng loại lỗi mình biết cách xử lý**. `except Exception:` nuốt luôn cả những lỗi lập trình (`TypeError`, `AttributeError`) — thứ bạn muốn thấy ngay chứ không muốn giấu đi.

```python
except:          # tệ nhất — bắt cả SystemExit, KeyboardInterrupt
except Exception:  # vẫn quá rộng cho phần lớn trường hợp
except (ValueError, KeyError):  # tốt — rõ ràng
```

## `raise ... from` giữ nguyên chuỗi nguyên nhân

```python
try:
    gia_tri = int(chuoi)
except ValueError as e:
    raise ValueError(f"Không đọc được số từ {chuoi!r}") from e
```

`from e` giữ traceback gốc trong phần "The above exception was the direct cause of..." — thiếu nó là mất manh mối debug quan trọng nhất.

## Exception tự định nghĩa

```python
class LoiUngDung(Exception):
    """Lớp gốc cho mọi lỗi của ứng dụng này."""

class KhongTimThay(LoiUngDung):
    def __init__(self, loai: str, id: str):
        super().__init__(f"Không tìm thấy {loai} có id {id}")
        self.loai, self.id = loai, id

class ViPhamRangBuoc(LoiUngDung):
    pass
```

Có một lớp gốc riêng cho ứng dụng nghĩa là tầng ngoài cùng bắt được `except LoiUngDung` mà không nuốt nhầm lỗi của thư viện khác.

## Context manager

```python
with open("du_lieu.txt", encoding="utf-8") as f:
    noi_dung = f.read()
# file được đóng tự động, kể cả khi có exception ở giữa
```

`encoding="utf-8"` gần như luôn cần: mặc định phụ thuộc hệ điều hành, nên cùng một script chạy đúng trên máy bạn và hỏng trên Windows.

Nhiều tài nguyên cùng lúc:

```python
with open("vao.txt") as vao, open("ra.txt", "w") as ra:
    ra.write(vao.read().upper())
```

### Tự viết context manager

```python
from contextlib import contextmanager
import time

@contextmanager
def do_thoi_gian(nhan: str):
    bat_dau = time.perf_counter()
    try:
        yield
    finally:
        print(f"{nhan}: {time.perf_counter() - bat_dau:.3f}s")

with do_thoi_gian("truy vấn"):
    chay_truy_van()
```

`finally` bên trong đảm bảo phần dọn dẹp chạy cả khi khối `with` ném lỗi.

## `pathlib` thay cho `os.path`

```python
from pathlib import Path

goc = Path(__file__).parent
cau_hinh = goc / "config" / "app.json"       # nối bằng /, đúng trên mọi HĐH

cau_hinh.exists()
cau_hinh.read_text(encoding="utf-8")
cau_hinh.write_text(noi_dung, encoding="utf-8")

for f in goc.glob("**/*.py"):
    print(f.name, f.stem, f.suffix)
```

`pathlib` là API hiện đại, gọn hơn hẳn chuỗi `os.path.join(os.path.dirname(...))`.

## Đọc file lớn

```python
# Tệ: nạp cả file vào RAM
noi_dung = f.read()

# Tốt: đọc từng dòng, bộ nhớ không đổi dù file 10GB
with open("log.txt", encoding="utf-8") as f:
    for dong in f:
        xu_ly(dong.rstrip("\n"))
```

## JSON và CSV

```python
import json, csv

with open("du_lieu.json", encoding="utf-8") as f:
    du_lieu = json.load(f)

with open("ra.json", "w", encoding="utf-8") as f:
    json.dump(du_lieu, f, ensure_ascii=False, indent=2)

with open("bang.csv", newline="", encoding="utf-8") as f:
    for hang in csv.DictReader(f):
        print(hang["ten"])
```

Hai tham số hay bị quên: `ensure_ascii=False` (không có nó, tiếng Việt bị mã hoá thành `\uXXXX`) và `newline=""` cho CSV (không có nó, Windows sinh dòng trống xen kẽ).

## Ghi file an toàn

Ghi đè trực tiếp mà chương trình chết giữa chừng ⇒ mất cả dữ liệu cũ lẫn mới. Ghi vào file tạm rồi đổi tên (thao tác nguyên tử trên cùng ổ đĩa):

```python
tam = duong_dan.with_suffix(".tmp")
tam.write_text(noi_dung, encoding="utf-8")
tam.replace(duong_dan)
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `except:` trần | Nuốt cả lỗi lập trình | Bắt loại cụ thể |
| `raise X` không có `from e` | Mất traceback gốc | `raise X from e` |
| `open()` không có `encoding` | Lỗi tuỳ hệ điều hành | Luôn `encoding="utf-8"` |
| `f.read()` cho file lớn | Hết RAM | Duyệt từng dòng |
| Ghi đè trực tiếp file dữ liệu | Chết giữa chừng là mất sạch | Ghi tạm rồi `replace` |

## Ghi nhớ

- Bắt đúng loại lỗi; `except Exception` là biện pháp cuối cùng ở tầng ngoài.
- `raise ... from e` để giữ nguyên nhân gốc.
- `with` cho mọi tài nguyên cần đóng.
- `pathlib` + `encoding="utf-8"` là mặc định nên có.

## Tự kiểm tra

1. Vì sao `except:` trần nguy hiểm hơn `except Exception:`?
2. Viết context manager mở kết nối DB và luôn đóng, kể cả khi có lỗi.
3. Ghi file JSON sao cho chương trình chết giữa chừng không làm hỏng dữ liệu cũ?
