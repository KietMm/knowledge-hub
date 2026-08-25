---
title: Cú pháp và kiểu dữ liệu Python
slug: cu-phap-va-kieu-du-lieu-python
summary: Thụt lề thay cho dấu ngoặc, kiểu dữ liệu dựng sẵn, và các quy ước đặt tên PEP 8.
level: co-ban
tags: [python, co-ban, cu-phap]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được code Python bất kỳ mà không vấp ở cú pháp, và biết bốn quy ước đặt tên đủ để code của bạn trông như code Python.

## Ý tưởng chính

Python đánh đổi một thứ mà các ngôn ngữ khác không dám: **thụt lề không phải quy ước, nó là cú pháp**. Dấu ngoặc nhọn bị bỏ hẳn.

Đổi lại, mọi code Python trên thế giới trông giống nhau — và bạn không bao giờ gặp cuộc tranh cãi "ngoặc mở ở dòng nào".

## Mental model

Hãy nghĩ tới **dàn ý một bài viết**.

> Trong dàn ý, bạn không viết dấu ngoặc để nói "phần này thuộc mục kia". Bạn **thụt vào một bậc**, và ai đọc cũng hiểu.
>
> Python đọc code đúng như đọc dàn ý: **thụt vào = nằm bên trong**.

Hệ quả trực tiếp: **trộn tab và space là lỗi cú pháp**, không phải chuyện thẩm mỹ — vì máy không biết một tab bằng mấy space.

## Ví dụ nhỏ

```python
def chao(ten):
    if ten:                       # thụt 4 space = nằm trong def
        print(f"Xin chào {ten}")  # thụt 8 = nằm trong if
    else:
        print("Xin chào")
```

```js
// Cùng logic trong JavaScript — dấu ngoặc làm việc mà thụt lề làm ở Python
function chao(ten) {
  if (ten) { console.log(`Xin chào ${ten}`) } else { console.log('Xin chào') }
}
```

## Code chạy thế nào

Hai cái bẫy hay gặp nhất của người mới, cả hai đều đến từ việc coi thụt lề là trang trí:

```text
❌ Sai:
def f():
print("a")            ← IndentationError: expected an indented block

❌ Sai tinh vi hơn:
def f():
    for x in ds:
        xu_ly(x)
    print("xong")     ← ngoài vòng lặp: in MỘT lần

def f():
    for x in ds:
        xu_ly(x)
        print("xong") ← trong vòng lặp: in MỖI lần
```

Ví dụ thứ hai không gây lỗi — nó chỉ **chạy khác ý bạn**. Trong ngôn ngữ có dấu ngoặc, bạn nhìn dấu ngoặc để biết; trong Python, bạn nhìn cột.

## Cú pháp

Kiểu dựng sẵn — bốn kiểu chứa dữ liệu là phần cần thuộc:

```python
so = 42                    # int, không giới hạn độ lớn
thuc = 3.14                # float
chuoi = "xin chào"         # str (bất biến)
dung = True                # bool

ds = [1, 2, 3]             # list — có thứ tự, sửa được
cap = (1, 2)               # tuple — có thứ tự, KHÔNG sửa được
tap = {1, 2, 3}            # set — không trùng, không thứ tự
tu_dien = {"a": 1}         # dict — khoá → giá trị
```

```python
# f-string: cách nối chuỗi duy nhất bạn cần
f"{ten} có {so} đơn"
f"{gia:,.0f}đ"             # 1,200,000đ — định dạng số
f"{ten=}"                  # ten='An' — cực tiện khi gỡ lỗi

# Cắt chuỗi/list: [bắt_đầu:kết_thúc:bước] — kết_thúc KHÔNG bao gồm
ds[1:3]     # phần tử 1, 2
ds[:3]      # ba phần tử đầu
ds[-1]      # phần tử cuối
ds[::-1]    # đảo ngược
```

```python
for i, x in enumerate(ds):        # cần cả chỉ số lẫn giá trị
for a, b in zip(ds1, ds2):        # duyệt hai list song song
for k, v in d.items():            # duyệt dict
```

`enumerate` đáng nhớ theo pattern chứ đừng học thuộc:

```text
enumerate  →  (chỉ số, giá trị)
zip        →  ghép các list thành từng bộ
```

## Tại sao cần nó

Vì **"sự thật/giả" của Python rộng hơn nhiều ngôn ngữ khác**, và đây là nguồn lỗi im lặng:

```python
# Sáu thứ này đều là "giả"
if not []: ...        # list rỗng
if not {}: ...        # dict rỗng
if not "": ...        # chuỗi rỗng
if not 0: ...         # số 0
if not None: ...
if not False: ...
```

Rất tiện — cho tới khi `0` là một giá trị hợp lệ:

```python
if so_luong:              # ❌ số 0 bị coi như "không có"
if so_luong is not None:  # ✅ hỏi đúng câu cần hỏi
```

Và bốn quy ước PEP 8 đủ để code của bạn trông đúng kiểu Python:

```text
snake_case         → biến, hàm            (ten_nguoi_dung, tinh_tong)
PascalCase         → class                (NguoiDung)
HOA_CO_GACH        → hằng số              (SO_LAN_THU_TOI_DA)
_gach_duoi_dau     → "riêng tư, đừng đụng vào"
```

Không ai kiểm tra bạn — nhưng `getUserName` trong file Python đọc cứ như một câu tiếng Anh chen vào bài tiếng Việt.

## So sánh

| Cần gì | Dùng |
|---|---|
| Danh sách sửa được, có thứ tự | `list` |
| Bộ giá trị cố định (toạ độ, bản ghi) | `tuple` |
| Kiểm tra "đã có chưa", bỏ trùng | `set` |
| Tra theo khoá | `dict` |

`tuple` bất biến nên **dùng làm khoá dict được**, còn `list` thì không:

```python
d[(1, 2)] = "a"     # ✅
d[[1, 2]] = "a"     # ❌ TypeError: unhashable type: 'list'
```

Lý do nằm ở [[bang-bam]]: khoá phải bất biến, nếu không mã băm đổi và giá trị lạc ngăn vĩnh viễn.

## Dễ nhầm

**1. Trộn tab và space.** Đặt editor chuyển tab thành 4 space và quên chuyện này đi.

**2. Dùng `is` để so sánh giá trị.**

```python
if x is 5:        # ❌ so DANH TÍNH, tình cờ đúng với số nhỏ rồi sai với số lớn
if x == 5:        # ✅ so giá trị
if x is None:     # ✅ đúng chỗ dùng `is`
```

`is` chỉ dùng cho `None`, `True`, `False`.

**3. Giá trị mặc định là list/dict.**

```python
def them(x, ds=[]):    # ❌ ds được tạo MỘT LẦN, dùng chung mọi lời gọi
    ds.append(x)
    return ds

them(1)   # [1]
them(2)   # [1, 2]  ← bất ngờ!
```

```python
def them(x, ds=None):  # ✅
    if ds is None: ds = []
```

Đây là bẫy nổi tiếng nhất của Python, và nó bắt cả người có kinh nghiệm.

**4. Quên `int()` khi đọc input.** `input()` luôn trả về chuỗi, nên `input() + 1` là `TypeError`.

**5. Sửa list trong lúc đang duyệt nó.**

```python
for x in ds:
    if x < 0: ds.remove(x)     # ❌ bỏ sót phần tử, vì chỉ số dịch chuyển
ds = [x for x in ds if x >= 0] # ✅ tạo list mới
```

## Mẹo nhớ

> **Thụt lề là dàn ý: thụt vào = nằm bên trong.**
>
> **`is` chỉ dành cho `None`.**
>
> **Đừng bao giờ để `[]` hay `{}` làm giá trị mặc định của tham số.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao trộn tab và space là lỗi cú pháp chứ không phải chuyện thẩm mỹ?
2. Sáu giá trị "giả" trong Python?
3. Vì sao `if so_luong:` là kiểm tra sai khi 0 là giá trị hợp lệ?
4. `def f(ds=[])` gây ra chuyện gì, và vì sao?
5. Khi nào dùng `is`, khi nào dùng `==`?

## Tự viết lại

Không nhìn lại phần trên, sửa hàm này (có **ba** lỗi):

```python
def dem_tu(van_ban, ket_qua={}):
    for tu in van_ban.split():
        if ket_qua.get(tu) == None:
            ket_qua[tu] = 0
        ket_qua[tu] += 1
    return ket_qua
```

Tự kiểm: gọi hàm hai lần liên tiếp với hai câu khác nhau — bản gốc trả về gì, bản của bạn trả về gì?

## Thử sức

Đoạn này in ra gì, và vì sao?

```python
ds = [1, 2, 3]
ds2 = ds
ds2.append(4)
print(len(ds))

t = (1, 2, [3])
t[2].append(4)
print(t)
```

Câu thứ hai khó: `tuple` được gọi là "bất biến" — vậy vì sao dòng `t[2].append(4)` chạy được? Cái gì bất biến, và cái gì không?
