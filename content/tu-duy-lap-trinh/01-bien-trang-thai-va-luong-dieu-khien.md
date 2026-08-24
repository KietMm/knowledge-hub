---
title: Biến, trạng thái và luồng điều khiển
slug: bien-trang-thai-va-luong-dieu-khien
summary: Mô hình máy tính trong đầu bạn: ô nhớ có tên, thứ tự thực thi, và vì sao "gán" không phải là "bằng".
level: co-ban
tags: [nen-tang, tu-duy, bien, trang-thai]
---

> **Sau bài này bạn sẽ:** dựng được mô hình trong đầu về chuyện gì xảy ra khi máy chạy từng dòng code, và đọc được một đoạn code lạ bằng cách lần theo trạng thái thay vì đoán.

## Lập trình là điều khiển sự thay đổi của trạng thái

Bỏ hết cú pháp sang một bên, mọi chương trình chỉ làm ba việc: **giữ dữ liệu ở đâu đó**, **đọc/sửa nó**, và **quyết định làm gì tiếp theo**. Ngôn ngữ nào cũng vậy — khác nhau ở chỗ chúng cho bạn bao nhiêu tự do khi làm ba việc đó.

**Trạng thái** là toàn bộ dữ liệu chương trình đang giữ tại một thời điểm. Khi bạn gỡ lỗi, câu hỏi bạn thật sự đang hỏi luôn là: *"tới dòng này thì trạng thái đang là gì, và nó lệch khỏi cái tôi tưởng ở đâu?"*

## `=` không phải dấu bằng của toán học

Đây là hiểu nhầm số một của người mới, và nó âm thầm gây lỗi rất lâu về sau.

```ts
// TypeScript
let x = 5
x = x + 1   // đọc là: "lấy giá trị hiện tại của x, cộng 1, cất ngược lại vào x"
```

```python
# Python
x = 5
x = x + 1   # cùng một chuyện
```

Trong toán, `x = x + 1` là mệnh đề sai. Trong lập trình, nó là **mệnh lệnh**: đọc ô nhớ tên `x`, tính, ghi đè. Chữ "biến" có nghĩa đen — giá trị của nó *biến đổi* theo thời gian.

Hệ quả: **thứ tự dòng code quyết định kết quả.**

```ts
let a = 1
let b = a      // b nhận BẢN SAO của giá trị 1
a = 99
console.log(b) // 1 — b không "theo dõi" a
```

Nếu bạn tưởng `b` sẽ thành 99, mô hình trong đầu bạn đang là "b là một cái tên khác của a". Nó không phải. `b` là một ô nhớ riêng, đã được chép giá trị vào lúc đó.

## Ba loại tên: hằng, biến, và tên chỉ tới vật thể

```ts
const TEN = 'Kiệt'      // không cho gán lại
let tuoi = 30           // cho gán lại
const ds = [1, 2, 3]    // không cho gán lại CÁI TÊN, nhưng ruột thì sửa được
ds.push(4)              // ✅ hợp lệ — ds vẫn trỏ tới đúng cái mảng đó
ds = [9]                // ❌ lỗi — đây mới là gán lại
```

```python
TEN = 'Kiệt'            # Python không có const; quy ước VIẾT HOA = đừng đụng
ds = [1, 2, 3]
ds.append(4)            # ✅ sửa ruột
ds = [9]                # Python cho phép, không ai chặn bạn
```

Điểm chung của cả hai ngôn ngữ, và của gần như mọi ngôn ngữ khác: với dữ liệu **phức hợp** (mảng, object, dict), cái tên giữ **đường tới** vật thể chứ không giữ bản thân vật thể. Nên hai tên có thể cùng chỉ tới **một** vật:

```ts
const a = { n: 1 }
const b = a       // b và a chỉ cùng MỘT object
b.n = 99
console.log(a.n)  // 99 — sửa qua b thì a "cũng đổi", vì vốn chỉ có một object
```

```python
a = {'n': 1}
b = a
b['n'] = 99
print(a['n'])     # 99 — y hệt
```

Đây là nguồn gốc của cả một họ lỗi: *"tôi sửa bản sao mà bản gốc cũng đổi"*. Không có bản sao nào cả. Muốn có bản sao thật thì phải chép rõ ràng — xem [[mang-object-va-bat-bien]] cho phía JS/TS.

## Luồng điều khiển: máy quyết định đi đâu tiếp

Mặc định máy chạy từ trên xuống. Ba thứ bẻ được dòng chảy đó, và **chỉ ba thứ**:

| Cấu trúc | Câu hỏi nó trả lời | Từ khoá |
|---|---|---|
| Rẽ nhánh | "Có làm không?" | `if` / `else` / `match` |
| Lặp | "Làm bao nhiêu lần?" | `for` / `while` |
| Nhảy | "Đi chỗ khác ngay" | `return` / `break` / `continue` / `throw` |

```ts
function xepLoai(diem: number): string {
  if (diem < 0 || diem > 10) throw new Error('Điểm phải trong 0–10')
  if (diem >= 8) return 'giỏi'
  if (diem >= 6.5) return 'khá'
  return 'trung bình'
}
```

```python
def xep_loai(diem: float) -> str:
    if diem < 0 or diem > 10:
        raise ValueError('Điểm phải trong 0–10')
    if diem >= 8:
        return 'giỏi'
    if diem >= 6.5:
        return 'khá'
    return 'trung bình'
```

Chú ý lối viết ở đây: **chặn trường hợp xấu trước, thoát sớm**. Nó phẳng hơn nhiều so với `if` lồng `if` lồng `if`:

```ts
// ❌ Kim tự tháp — mỗi tầng lồng thêm một mức thụt lề phải theo dõi
function xepLoai(diem: number): string {
  if (diem >= 0 && diem <= 10) {
    if (diem >= 8) { return 'giỏi' }
    else { if (diem >= 6.5) { return 'khá' } else { return 'trung bình' } }
  } else { throw new Error('...') }
}
```

Quy tắc dùng được ở mọi ngôn ngữ: **thoát sớm** (early return) giữ mức thụt lề thấp, và mức thụt lề thấp thì số trạng thái bạn phải giữ trong đầu cũng thấp.

## Phạm vi: cái tên này sống ở đâu

```ts
function f() {
  let trong = 1
  if (true) {
    let sauHon = 2
    console.log(trong)    // ✅ nhìn ra ngoài được
  }
  console.log(sauHon)     // ❌ lỗi — sauHon chết khi khối { } đóng lại
}
```

```python
def f():
    trong = 1
    if True:
        sau_hon = 2
    print(sau_hon)        # ✅ CHẠY ĐƯỢC — Python không có phạm vi theo khối!
```

Đây là chỗ hai ngôn ngữ **thật sự khác nhau**, và biết sự khác biệt còn quan trọng hơn thuộc lòng một bên: JS/TS có phạm vi theo **khối** `{ }`, Python có phạm vi theo **hàm**. Khi đổi ngôn ngữ, câu hỏi cần hỏi luôn là *"cái tên tôi vừa đặt sống tới đâu?"* — chứ không phải "cú pháp thế nào".

Nguyên tắc chung dùng được ở mọi nơi: **khai báo tên ở phạm vi hẹp nhất còn dùng được**. Tên sống càng ngắn, số chỗ có thể sửa nó càng ít, số lỗi càng ít.

## Đọc code lạ bằng cách lần trạng thái

Kỹ năng thực chiến: gặp một đoạn code không hiểu, đừng đọc xuôi — **kẻ bảng trạng thái**.

```ts
let tong = 0
for (const n of [3, 1, 4]) {
  if (n % 2 === 0) continue
  tong += n
}
```

| Vòng | `n` | `n % 2 === 0`? | `tong` sau vòng |
|---|---|---|---|
| 1 | 3 | không | 3 |
| 2 | 1 | không | 4 |
| 3 | 4 | **có** → `continue` | 4 |

Kết quả `4`. Cách này chậm nhưng **không bao giờ sai**, và nó chính là thứ trình gỡ lỗi (debugger) làm hộ bạn. Khi một bug khó tới mức bạn hết giả thuyết, quay về kẻ bảng.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Tưởng `b = a` tạo bản sao của object | Sửa `b` thì `a` đổi theo, lỗi rất khó lần | Nhớ: tên giữ đường tới vật, muốn bản sao phải chép rõ |
| Dùng `==` thay `===` trong JS | `'1' == 1` là `true`, so sánh ra kết quả bất ngờ | Luôn `===`, xem [[kieu-du-lieu-va-bien]] |
| Khai báo biến ở phạm vi rộng hơn mức cần | Nhiều chỗ sửa được nó, khó lần nguồn gốc giá trị sai | Khai báo sát chỗ dùng nhất |
| `if` lồng nhau 4–5 tầng | Phải giữ 5 điều kiện trong đầu cùng lúc | Thoát sớm, chặn trường hợp xấu trước |
| Sửa biến bên trong vòng lặp rồi quên | Kết quả phụ thuộc thứ tự, chạy lại ra khác | Kẻ bảng trạng thái để thấy rõ |
| Tưởng Python có phạm vi khối như JS | Biến "rò" ra ngoài `if`, ghi đè tên khác | Biết luật phạm vi của **ngôn ngữ đang dùng** |

## Ghi nhớ

- Chương trình = giữ trạng thái + sửa trạng thái + quyết định đi đâu tiếp. Ba việc, mọi ngôn ngữ.
- `=` là **mệnh lệnh gán**, không phải mệnh đề bằng nhau. Thứ tự dòng quyết định kết quả.
- Với dữ liệu phức hợp, cái tên giữ **đường tới** vật thể — hai tên có thể cùng chỉ một vật.
- Chỉ có ba cách bẻ luồng: rẽ nhánh, lặp, nhảy. Thoát sớm giữ code phẳng.
- Bí thì kẻ bảng trạng thái. Chậm nhưng không sai bao giờ.

## Tự kiểm tra

1. Vì sao `const ds = [1,2]` vẫn cho phép `ds.push(3)` nhưng không cho `ds = [3]`?
2. Sau `const b = a` với `a` là object, sửa `b.n` thì `a.n` có đổi không? Vì sao?
3. Phạm vi của biến trong JS/TS và trong Python khác nhau ở điểm nào?
