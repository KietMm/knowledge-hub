---
title: Xử lý lỗi và đọc ghi file
slug: xu-ly-loi-va-doc-ghi-file
summary: try/except đúng cách, tự định nghĩa exception, và context manager để không bao giờ quên đóng tài nguyên.
level: trung-cap
tags: [python, exception, file, context-manager]
khung: v2
---

> **Sau bài này bạn sẽ:** bắt lỗi ở đúng mức cần thiết thay vì bắt hết, và hiểu vì sao `with` là thứ nên dùng cho mọi tài nguyên.

## Ý tưởng chính

Python xử lý lỗi theo triết lý **"xin lỗi dễ hơn xin phép"**: cứ làm, hỏng thì bắt — thay vì kiểm tra mọi điều kiện trước.

Nhưng điều đó chỉ đúng khi bạn bắt **đúng loại lỗi** ở **đúng chỗ**. Bắt hết mọi lỗi ở một chỗ là cách nhanh nhất để biến một bug nhỏ thành một hệ thống im lặng nuốt mọi vấn đề.

## Mental model

Hãy nghĩ tới **cầu dao điện trong nhà**.

> Nhà có nhiều cầu dao nhỏ cho từng khu — bếp, phòng ngủ, điều hoà. Chập ở bếp thì **chỉ bếp mất điện**, và bạn biết ngay hỏng ở đâu.
>
> `except Exception:` bao trùm cả chương trình là **một cầu dao tổng duy nhất**: chập ở đâu cũng cắt cả nhà, và bạn không biết nguyên nhân nằm chỗ nào.

Nguyên tắc rút ra: **bắt lỗi cụ thể, ở gần chỗ có thể xử lý được nó**. Không xử lý được thì đừng bắt — để nó bay lên trên.

## Ví dụ nhỏ

```python
try:
    n = int(input("Nhập số: "))
except ValueError:                     # ✅ chỉ bắt đúng loại lỗi mình lường trước
    print("Không phải số")
```

```python
try:
    xu_ly()
except Exception:                      # ❌ nuốt cả lỗi lập trình của chính bạn
    pass
```

## Code chạy thế nào

Bốn khối và thứ tự chạy của chúng:

```text
try:      … việc có thể hỏng
except:   … chạy KHI có lỗi khớp
else:     … chạy KHI KHÔNG có lỗi
finally:  … LUÔN chạy, có lỗi hay không

Không lỗi:  try → else → finally
Có lỗi:     try → except → finally
```

`else` ít người dùng nhưng đáng dùng: nó tách rõ *"phần có thể hỏng"* khỏi *"phần chạy khi mọi thứ ổn"*, nên `try` không bao trùm nhiều hơn mức cần.

```python
try:
    f = open("a.txt")
except FileNotFoundError:
    print("Không thấy file")
else:
    noi_dung = f.read()      # ✅ chỉ chạy khi mở được — không nằm trong try
finally:
    ...
```

Giữ nguyên chuỗi nguyên nhân khi ném lại:

```python
try:
    cau_hinh = json.loads(raw)
except json.JSONDecodeError as e:
    raise CauHinhLoi("File cấu hình hỏng") from e   # ← "from e" giữ lỗi gốc trong traceback
```

Thiếu `from e`, người đọc log chỉ thấy "File cấu hình hỏng" mà không biết hỏng ở dòng nào của JSON.

## Cú pháp

**Context manager** — thứ nên dùng cho mọi tài nguyên cần đóng:

```python
with open("a.txt") as f:
    noi_dung = f.read()
# file đóng ở đây, KỂ CẢ khi có exception ném ra giữa chừng
```

Tự viết một cái:

```python
from contextlib import contextmanager

@contextmanager
def do_thoi_gian(ten):
    bat_dau = time.perf_counter()
    try:
        yield                                  # ← code trong khối with chạy ở đây
    finally:
        print(f"{ten}: {time.perf_counter() - bat_dau:.2f}s")   # LUÔN chạy

with do_thoi_gian("truy vấn"):
    chay_truy_van()
```

`pathlib` thay cho `os.path`:

```python
from pathlib import Path

p = Path("du-lieu") / "2026" / "a.json"     # ← nối đường dẫn bằng /
p.exists(); p.is_file(); p.suffix; p.stem
p.read_text(encoding="utf-8")
p.write_text(noi_dung, encoding="utf-8")
p.parent.mkdir(parents=True, exist_ok=True)
for f in Path("log").glob("**/*.log"): ...
```

## Tại sao cần nó

Vì **đọc file lớn sai cách là hết RAM**:

```python
noi_dung = open("log.txt").read()        # ❌ nạp cả file 5GB vào bộ nhớ

with open("log.txt") as f:
    for dong in f:                        # ✅ đọc từng dòng, bộ nhớ O(1)
        xu_ly(dong)
```

Và exception tự định nghĩa làm code gọi **xử lý được từng loại lỗi**:

```python
class LoiUngDung(Exception): ...
class KhongTimThay(LoiUngDung): ...
class KhongCoQuyen(LoiUngDung): ...

try:
    xu_ly()
except KhongTimThay:
    return 404
except KhongCoQuyen:
    return 403
except LoiUngDung:                       # bắt mọi lỗi ứng dụng còn lại
    return 500
```

Cây kế thừa ở đây có mục đích rõ ràng: người gọi chọn **mức chi tiết họ cần** — bắt riêng từng loại, hoặc bắt cả nhóm bằng lớp cha.

`encoding="utf-8"` là chi tiết quan trọng với tiếng Việt: mặc định của Python phụ thuộc hệ điều hành, nên cùng một file chạy đúng trên máy bạn và hỏng trên máy chủ Linux.

## So sánh

| Tình huống | Cách làm |
|---|---|
| Lỗi lường trước, xử lý được | `except LoaiCuThe` |
| Lỗi không xử lý được ở đây | Đừng bắt — để nó bay lên |
| Cần dọn dẹp dù có lỗi hay không | `finally` hoặc `with` |
| Ném lại lỗi với ngữ cảnh rõ hơn | `raise X("…") from e` |
| Bắt mọi thứ ở tầng ngoài cùng | `except Exception` **+ ghi log** |

Dòng cuối là ngoại lệ hợp lệ duy nhất của "đừng bắt hết": ở ranh giới ngoài cùng (handler HTTP, vòng lặp worker), bạn bắt hết để chương trình không chết — nhưng **phải ghi log đầy đủ**, không được `pass`.

## Dễ nhầm

**1. `except:` trần hoặc `except Exception: pass`.** Nuốt cả `KeyboardInterrupt`, nuốt cả lỗi chính tả trong code bạn. Bug biến mất khỏi log và xuất hiện lại dưới dạng "dữ liệu sai".

**2. Quên `from e`.** Mất chuỗi nguyên nhân, và log chỉ còn tầng ngoài cùng.

**3. `try` bao quá nhiều dòng.** Bạn bắt được lỗi nhưng không biết dòng nào gây ra. Bọc **đúng dòng** có thể hỏng, phần còn lại đưa vào `else`.

**4. Mở file không dùng `with`.** Quên `close()` thì file handle rò rỉ, và trên Windows file bị khoá không xoá được.

**5. Quên `encoding="utf-8"`.** Code chạy trên máy bạn, hỏng trên máy chủ.

**6. Dùng exception cho luồng bình thường.**

```python
try:
    return d[k]
except KeyError:
    return 0          # ❌ chậm, và che mất ý định
return d.get(k, 0)     # ✅
```

Exception dành cho tình huống **bất thường**, không phải để thay `if`.

## Mẹo nhớ

> **Nhiều cầu dao nhỏ, không phải một cầu dao tổng.**
>
> **Không xử lý được thì đừng bắt.**
>
> **`with` cho mọi thứ cần đóng; `from e` cho mọi lần ném lại.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Thứ tự chạy của `try/except/else/finally` trong hai trường hợp có lỗi và không lỗi?
2. Vì sao `except Exception: pass` nguy hiểm?
3. `from e` giữ lại thông tin gì?
4. `with` bảo đảm điều gì mà `try/finally` viết tay dễ quên?
5. Khi nào bắt `Exception` là hợp lệ?

## Tự viết lại

Không nhìn lại phần trên, sửa hàm này (có **bốn** vấn đề):

```python
def doc_cau_hinh(duong_dan):
    try:
        f = open(duong_dan)
        data = json.loads(f.read())
        return data["api_key"]
    except:
        return None
```

Tự kiểm: người gọi hàm của bạn phân biệt được **file không tồn tại** với **file có nhưng thiếu khoá** không?

## Thử sức

Worker của bạn xử lý 10.000 việc trong một vòng lặp. Một việc hỏng thì **cả worker chết** và 9.000 việc còn lại không chạy.

Thiết kế cách xử lý lỗi cho vòng lặp này. Ba câu để tự trả lời: bạn bắt ở **mức nào**, việc hỏng thì bạn làm gì với nó, và làm sao để **không** che mất một lỗi hệ thống nghiêm trọng (hết bộ nhớ, mất kết nối) đằng sau 10.000 dòng log?
