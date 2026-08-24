---
title: Bảng băm — con dao chủ lực
slug: bang-bam
summary: Cấu trúc bạn dùng nhiều nhất và hiểu ít nhất. Cách nó tra tức thì, khi nào nó thoái hoá, và vì sao khoá phải bất biến.
level: co-ban
tags: [nen-tang, cau-truc-du-lieu, bang-bam, map]
---

> **Sau bài này bạn sẽ:** hiểu vì sao `Map.get()` không phụ thuộc số phần tử, biết chọn khoá đúng, và tránh được các bẫy khi dùng object/dict làm bảng tra.

## Bài toán nó giải

Mảng cho bạn tra theo **vị trí**. Nhưng thứ bạn thật sự có trong tay hầu hết thời gian là một **khoá**: mã đơn hàng, email, id người dùng.

Bảng băm giải đúng bài đó: **tra theo khoá bất kỳ, tốn thời gian gần như không đổi dù có bao nhiêu phần tử.**

```ts
const theoEmail = new Map<string, User>()
theoEmail.set('a@x.com', user)
theoEmail.get('a@x.com')     // gần như tức thì, dù Map có 10 hay 10 triệu mục
```

```python
theo_email = {}
theo_email['a@x.com'] = user
theo_email.get('a@x.com')
```

## Nó làm được điều đó bằng cách nào

Ý tưởng chỉ gồm ba bước:

1. **Băm** khoá thành một con số — hàm băm biến chuỗi bất kỳ thành số nguyên.
2. **Chia lấy dư** cho số ngăn → ra chỉ số ngăn.
3. Đặt (hoặc tìm) giá trị ở **đúng ngăn đó**.

```
'a@x.com' ──băm──► 8412739 ──% 16──► ngăn 3

ngăn:  0    1    2    3            4    5   ...
           [ ]  [ ]  [a@x.com→u]  [ ]  [ ]
```

Không có bước nào phụ thuộc **số phần tử đang có**. Đó là toàn bộ lý do nó nhanh: bạn không tìm, bạn **tính ra thẳng chỗ cần tới**.

## Va chạm — chỗ lý thuyết gặp thực tế

Hai khoá khác nhau có thể ra cùng một ngăn. Đó là **va chạm**, và nó không phải lỗi — nó là điều tất yếu khi nhét vô hạn khoá vào hữu hạn ngăn.

```
ngăn 3: [ 'a@x.com' → u1 ] → [ 'z@y.com' → u2 ]   ← cùng ngăn, nối thành chuỗi
```

Khi tra, bảng băm tới đúng ngăn rồi **so sánh tuần tự** trong ngăn đó. Ngăn có 2 phần tử thì tốn 2 phép so sánh — vẫn rất rẻ.

Nhưng nếu **mọi** khoá rơi vào một ngăn, bảng băm thoái hoá thành danh sách, và `get` trở nên chậm tuyến tính. Điều này hiếm xảy ra ngẫu nhiên (hàm băm tốt rải đều), nhưng **có thể bị gây ra cố ý**: kẻ tấn công gửi hàng loạt khoá được chọn để đâm vào cùng một ngăn, biến mọi request thành chậm. Đó là tấn công **hash flooding**, và là lý do các ngôn ngữ hiện đại gieo ngẫu nhiên hạt giống băm mỗi lần khởi động.

Bảng băm cũng tự **mở rộng**: khi số phần tử vượt ngưỡng so với số ngăn (hệ số tải, thường ~0,75), nó cấp phát gấp đôi số ngăn và **băm lại toàn bộ**. Lần đó đắt, nhưng vì tăng gấp đôi nên hiếm dần — cùng kiểu khấu hao như `push` của mảng.

## Khoá phải bất biến

Đây là bẫy quan trọng nhất và nó tồn tại ở **mọi** ngôn ngữ:

```python
khoa = [1, 2]
d = {khoa: 'x'}        # ❌ TypeError: unhashable type: 'list'
```

Python chặn thẳng vì nó hiểu vấn đề: nếu bạn sửa khoá sau khi cất, mã băm đổi, và giá trị **nằm sai ngăn vĩnh viễn** — tra kiểu gì cũng không thấy, dù nó vẫn nằm trong bảng.

JavaScript không chặn, nên bẫy còn nguy hiểm hơn:

```ts
const k = { id: 1 }
const m = new Map()
m.set(k, 'x')
m.get({ id: 1 })   // ❌ undefined — object khác, dù ruột giống hệt
m.get(k)           // ✅ 'x' — phải đúng CÁI object đó
```

`Map` của JS so khoá theo **danh tính** (cùng một vật), không theo nội dung. Muốn tra theo nội dung thì khoá phải là giá trị nguyên thuỷ:

```ts
m.set(`${don.nam}-${don.so}`, don)   // ✅ chuỗi — so theo nội dung
```

Quy tắc dùng được ở mọi nơi: **khoá là chuỗi hoặc số, và không bao giờ sửa sau khi đã cất.**

## `Map` và object trong JavaScript

Người mới hay dùng object `{}` làm bảng tra. Nó chạy được, nhưng có ba khác biệt gây lỗi thật:

| | `Object` | `Map` |
|---|---|---|
| Khoá | chỉ chuỗi và symbol (số bị ép thành chuỗi) | **kiểu gì cũng được** |
| Khoá kế thừa | có sẵn `toString`, `constructor`... | **sạch trơn** |
| Đếm số mục | `Object.keys(o).length` — tạo cả mảng | `m.size` |
| Xoá | `delete` — có thể làm chậm object | `m.delete()` |
| Thứ tự | khoá dạng số **bị sắp lại lên đầu** | đúng thứ tự chèn |

Bẫy khoá kế thừa là bẫy thật, và từng gây lỗ hổng bảo mật:

```ts
const dem: Record<string, number> = {}
dem['constructor']       // ❌ trả về hàm constructor, không phải undefined!
if (dem['toString']) { } // ❌ luôn đúng
```

```ts
const dem = new Map<string, number>()
dem.get('constructor')   // ✅ undefined, như mong đợi
```

Lời khuyên gọn: **dữ liệu có khoá do người dùng nhập thì dùng `Map`**, đừng dùng object. Đây cũng là một mặt của [[quan-ly-secret-va-cau-hinh]] — dữ liệu ngoài vào không được chạm vào cấu trúc bên trong.

Python thì `dict` sạch hơn nhiều (không kế thừa khoá) nên dùng thẳng `dict` là ổn.

## Tập hợp là bảng băm chỉ có khoá

```ts
const daThay = new Set<string>()
if (daThay.has(id)) return       // gần như tức thì
daThay.add(id)
```

```python
da_thay = set()
if id in da_thay: return
da_thay.add(id)
```

Dùng khi câu hỏi là **"đã có chưa"** chứ không phải "giá trị là gì". Thay `array.includes()` bằng `Set.has()` là một trong những sửa đổi rẻ tiền và hiệu quả nhất — đúng ý của [[chon-sai-cau-truc-du-lieu-la-dat]].

## Cái bảng băm **không** cho bạn

Điểm hay bị quên: bảng băm **không giữ thứ tự sắp xếp**, và **không tra được theo khoảng**.

```ts
// ❌ Không có cách nào làm việc này hiệu quả trên Map
"cho tôi mọi đơn có tổng tiền từ 1 triệu tới 5 triệu"
```

Muốn hỏi theo khoảng hoặc muốn dữ liệu luôn sắp xếp thì cần **cây có thứ tự** — xem [[ngan-xep-hang-doi-cay-do-thi]]. Đây cũng chính là lý do database có hai loại index khác nhau: hash index tra bằng nhau rất nhanh nhưng chịu thua truy vấn khoảng, còn B-tree thì làm được cả hai. Xem [[index-trong-postgresql]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Dùng object/mảng làm khoá `Map` trong JS | Tra không bao giờ trúng | Dùng chuỗi ghép từ các trường |
| Sửa object đang dùng làm khoá | Mục biến mất khỏi bảng dù vẫn còn | Khoá phải bất biến |
| Dùng `{}` cho khoá từ người dùng | Đụng `constructor`, `__proto__` | Dùng `Map` |
| Dùng `array.includes()` để kiểm tra tồn tại | Quét toàn mảng mỗi lần | Dùng `Set` |
| Trông chờ `Map` giữ thứ tự sắp xếp | Không có, chỉ giữ thứ tự chèn | Sắp lúc lấy ra, hoặc dùng cây |
| Tra theo khoảng trên bảng băm | Phải duyệt hết, mất sạch lợi thế | Cấu trúc có thứ tự |
| Quên bảng băm tốn bộ nhớ dư | Chiếm hơn mảng đáng kể | Chấp nhận, đó là cái giá của tốc độ |

## Ghi nhớ

- Bảng băm **tính ra** chỗ cần tới thay vì đi tìm — nên tốc độ không phụ thuộc số phần tử.
- Va chạm là tất yếu, không phải lỗi; bảng băm tự mở rộng khi đầy.
- **Khoá phải bất biến.** Sửa khoá sau khi cất thì mất luôn giá trị.
- `Map` của JS so khoá theo danh tính, không theo nội dung.
- Khoá đến từ người dùng thì dùng `Map`, đừng dùng object.
- Bảng băm không cho bạn thứ tự và không cho bạn truy vấn khoảng.

## Tự kiểm tra

1. Vì sao `Map.get()` gần như không phụ thuộc số phần tử trong Map?
2. Vì sao Python từ chối `{[1,2]: 'x'}` còn JS thì không, và cái nào nguy hiểm hơn?
3. Bảng băm không làm được hai việc gì mà cây có thứ tự làm được?
