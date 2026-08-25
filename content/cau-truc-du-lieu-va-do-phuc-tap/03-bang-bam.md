---
title: Bảng băm — con dao chủ lực
slug: bang-bam
summary: Cấu trúc bạn dùng nhiều nhất và hiểu ít nhất. Cách nó tra tức thì, khi nào nó thoái hoá, và vì sao khoá phải bất biến.
level: co-ban
tags: [nen-tang, cau-truc-du-lieu, bang-bam, map]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được vì sao tra trong bảng băm không chậm đi khi dữ liệu nhiều lên, và tự chọn được khoá đúng mà không phải tra tài liệu.

## Ý tưởng chính

Mảng cho bạn tra theo **vị trí**: muốn lấy phần tử thì phải biết nó nằm ở chỉ số mấy. Nhưng thứ bạn thật sự cầm trong tay hầu hết thời gian không phải vị trí — mà là một **khoá**: email, mã đơn hàng, id người dùng.

Bảng băm giải đúng chỗ đó: **đưa khoá vào, lấy giá trị ra, và thời gian tra gần như không đổi dù bảng có 10 hay 10 triệu mục.**

## Mental model

Hãy tưởng tượng một **dãy tủ hồ sơ đánh số từ 0 đến 15**, và một người thủ thư có quy tắc kỳ lạ nhưng cực nhanh:

> Đưa tôi cái tên, tôi **tính** ra ngay ngăn số mấy — rồi đi thẳng tới ngăn đó.

Người thủ thư **không đi tìm**. Ông ta *tính ra chỗ cần tới*. Đó là toàn bộ sự khác nhau giữa bảng băm và mảng: mảng bắt bạn đi dò từng ngăn, bảng băm tính thẳng ra số ngăn.

Và vì phép tính đó chỉ phụ thuộc vào **cái tên bạn đưa**, chứ không phụ thuộc trong tủ đang có bao nhiêu hồ sơ, nên thêm dữ liệu vào không làm việc tra chậm đi.

## Ví dụ nhỏ

```ts
const tuoi = new Map()
tuoi.set('an', 20)
tuoi.set('binh', 25)

tuoi.get('an')      // 20
tuoi.get('cuong')   // undefined — chưa từng cất
```

Ba dòng, hai khoá. Giữ nguyên ví dụ này trong đầu suốt phần dưới.

## Code chạy thế nào

Đưa `'an'` vào, bảng băm làm đúng ba bước:

```text
Bước 1 — băm:        'an'  ──hàm băm──►  8412739
Bước 2 — chia dư:    8412739 % 16      ──►  ngăn 3
Bước 3 — đi tới:     cất (hoặc lấy) ở ngăn 3
```

Trạng thái cái tủ sau `set('an', 20)` và `set('binh', 25)`:

```text
ngăn:   0     1     2     3            4     5     6            ...  15
             [ ]   [ ]   ['an'→20]    [ ]   [ ]   ['binh'→25]
```

Giờ gọi `tuoi.get('an')`:

```text
băm 'an'      → 8412739
8412739 % 16  → 3
tới ngăn 3    → thấy 'an' → trả về 20
```

Đọc lại ba dòng trên và để ý: **không dòng nào nhắc tới việc trong tủ đang có bao nhiêu hồ sơ.** Đó là lý do nó nhanh — không phải vì máy tính khoẻ, mà vì phép tính không hề nhìn tới phần còn lại của dữ liệu.

## Cú pháp

```ts
const m = new Map()      // tạo
m.set(khoa, giaTri)      // cất
m.get(khoa)              // lấy — không có thì undefined
m.has(khoa)              // có chưa? — trả về true/false
m.delete(khoa)           // xoá
m.size                   // số mục (là thuộc tính, không phải hàm)
```

```python
d = {}                   # tạo
d[khoa] = gia_tri        # cất
d[khoa]                  # lấy — KHÔNG có thì ném KeyError
d.get(khoa)              # lấy — không có thì trả None, an toàn hơn
khoa in d                # có chưa?
del d[khoa]              # xoá
len(d)                   # số mục
```

Đừng học thuộc. Nhớ theo pattern: **cất là `khoá → giá trị`, lấy là `đưa khoá, nhận giá trị`.** Mọi ngôn ngữ đều chỉ là cách viết khác nhau của đúng hai việc đó.

## Tại sao cần nó

Bỏ bảng băm đi, bạn buộc phải làm thế này:

```ts
// Tìm người có email cho trước, không dùng bảng băm
for (const u of nguoiDung) {
  if (u.email === can) return u
}
```

Với 10 người thì không sao. Với 1 triệu người, mỗi lần tìm là tối đa 1 triệu phép so sánh — và nếu việc tìm nằm trong một vòng lặp khác nữa thì thành 1 nghìn tỉ. Đây chính là chỗ những đoạn code "chạy tốt lúc dev, chết ở production" sinh ra.

Bảng băm biến câu hỏi **"đi tìm"** thành câu hỏi **"tính ra chỗ"**. Đó là lý do nó xuất hiện trong gần như mọi lời giải thuật toán nhanh — xem [[dem-va-bang-bam-trong-giai-bai]].

## So sánh

Cả ba cấu trúc dưới đây đều dùng `[]` hoặc `.get()`, nên rất dễ lẫn:

| | Tra bằng gì | Có thứ tự? | Dùng khi |
|---|---|---|---|
| Mảng / list | **vị trí** (0, 1, 2…) | có | Dữ liệu xếp hàng, cần thứ tự |
| Bảng băm / dict | **khoá** bất kỳ | không đảm bảo | Cần tra theo id, email, mã… |
| Tập hợp / set | **chỉ có khoá**, không giá trị | không đảm bảo | Chỉ cần biết "đã gặp chưa" |

```ts
ds[0]           // mảng: đưa VỊ TRÍ
m.get('an')     // bảng băm: đưa KHOÁ
s.has('an')     // tập hợp: chỉ hỏi CÓ hay KHÔNG
```

Tập hợp thực chất là bảng băm bỏ đi phần giá trị. Hiểu được câu đó thì bạn không cần học lại `Set` như một cấu trúc mới.

## Dễ nhầm

**1. Nhầm `{}` với việc truy cập.** Đây là chỗ người mới vấp đầu tiên:

```text
{}          → TẠO một bảng rỗng
d['an']     → TRUY CẬP vào bảng đã có
```

Hai thứ trông giống nhau vì cùng có ngoặc, nhưng một cái là *dựng cái tủ*, cái kia là *mở một ngăn*.

**2. Sửa khoá sau khi đã cất.** Bẫy nghiêm trọng nhất, và nó có ở mọi ngôn ngữ:

```python
khoa = [1, 2]
d = {khoa: 'x'}     # ❌ TypeError: unhashable type: 'list'
```

Python chặn thẳng vì nó hiểu hậu quả: sửa khoá thì mã băm đổi, giá trị **nằm sai ngăn vĩnh viễn** — vẫn trong tủ, nhưng tra kiểu gì cũng không thấy. Người thủ thư tính ra ngăn 9 rồi mở ngăn 9, trong khi hồ sơ đang nằm ở ngăn 3 từ lúc cất.

JavaScript không chặn, nên còn nguy hiểm hơn:

```ts
const k = { id: 1 }
const m = new Map()
m.set(k, 'x')
m.get({ id: 1 })   // ❌ undefined — object KHÁC, dù ruột giống hệt
m.get(k)           // ✅ 'x' — phải đúng CÁI object đó
```

`Map` của JS so khoá theo **danh tính** (có phải cùng một vật không), không theo nội dung. Muốn so theo nội dung thì khoá phải là chuỗi hoặc số:

```ts
m.set(`${don.nam}-${don.so}`, don)   // ✅ chuỗi — so theo nội dung
```

**3. Dùng object `{}` làm bảng tra trong JavaScript.** Nó chạy được, nhưng object mang sẵn khoá kế thừa:

```ts
const dem: Record<string, number> = {}
dem['constructor']        // ❌ trả về một hàm, không phải undefined!
if (dem['toString']) { }  // ❌ luôn đúng
```

```ts
const dem = new Map<string, number>()
dem.get('constructor')    // ✅ undefined, đúng như mong đợi
```

Quy tắc gọn: **khoá do người dùng nhập thì dùng `Map`, đừng dùng object.** Python thì `dict` sạch, dùng thẳng được.

**4. Tưởng bảng băm luôn nhanh.** Hai khoá khác nhau có thể ra cùng một ngăn — gọi là **va chạm**, và đó là điều tất yếu khi nhét vô hạn khoá vào hữu hạn ngăn:

```text
ngăn 3: ['an' → 20] → ['zoe' → 31]    ← cùng ngăn, nối thành chuỗi
```

Lúc tra, bảng tới đúng ngăn rồi **so sánh tuần tự trong ngăn đó**. Hai phần tử thì tốn hai phép so — vẫn rẻ. Nhưng nếu *mọi* khoá dồn vào một ngăn, bảng băm thoái hoá thành danh sách và mất hết ưu thế. Chuyện này hiếm xảy ra ngẫu nhiên, nhưng **gây ra cố ý được** — kẻ tấn công gửi hàng loạt khoá chọn sẵn để đâm vào cùng một ngăn (*hash flooding*). Đó là lý do các ngôn ngữ hiện đại gieo ngẫu nhiên hạt giống băm mỗi lần khởi động.

## Mẹo nhớ

> **Bảng băm = tính ra chỗ, không đi tìm chỗ.**

Nhớ đúng một câu đó thì suy lại được tất cả: vì sao nó nhanh (không nhìn số phần tử), vì sao khoá không được sửa (sửa thì tính ra chỗ khác), và vì sao nó không có thứ tự (chỗ do phép tính quyết định, không do lúc bạn cất).

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bảng băm giải quyết vấn đề gì mà mảng không giải được?
2. Ba bước xảy ra khi bạn gọi `m.get('an')` là gì?
3. Vì sao thêm 1 triệu mục vào bảng vẫn không làm `get` chậm đi?
4. Vì sao khoá không được phép sửa sau khi đã cất? Điều gì hỏng?
5. Khi nào bạn **không** nên dùng bảng băm?

Câu 5 khó nhất, và đây là lúc kiểm tra xem bạn hiểu hay chỉ nhớ.

## Tự viết lại

Không nhìn lại phần trên, viết một hàm đếm số lần xuất hiện của mỗi từ:

```ts
demTu(['a', 'b', 'a'])   // → { a: 2, b: 1 }
```

Ba câu hỏi để tự kiểm trước khi chạy: bạn cất **cái gì** làm khoá, cất **cái gì** làm giá trị, và khi gặp một từ chưa từng thấy thì `get` trả về gì?

## Thử sức

Bạn có mảng 100.000 đơn hàng và mảng 100.000 khách hàng, cần ghép mỗi đơn với khách của nó.

Cách ngây thơ là hai vòng lặp lồng nhau — 10 tỉ phép so sánh. Hãy nghĩ cách dùng bảng băm để đưa nó về **một lượt duyệt mỗi mảng**, rồi kiểm lại ý tưởng bằng bài [[hai-tong]]: nó là đúng bài toán này ở quy mô nhỏ hơn.
