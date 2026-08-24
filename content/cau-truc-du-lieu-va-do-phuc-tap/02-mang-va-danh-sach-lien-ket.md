---
title: Mảng và danh sách liên kết
slug: mang-va-danh-sach-lien-ket
summary: Hai cách xếp dãy phần tử, hai bộ đánh đổi ngược nhau. Và vì sao trong thực tế mảng thường thắng dù lý thuyết nói khác.
level: co-ban
tags: [nen-tang, cau-truc-du-lieu, mang, danh-sach-lien-ket]
---

> **Sau bài này bạn sẽ:** hiểu vì sao lấy phần tử thứ n của mảng là tức thì còn chèn vào giữa thì đắt, và biết khi nào lý thuyết về danh sách liên kết không đúng với máy thật.

## Mảng: các ô nằm liền nhau

Mảng là một dải bộ nhớ **liên tục**, mỗi ô cùng kích thước.

```
địa chỉ:  1000   1008   1016   1024   1032
giá trị: [ 'a' ][ 'b' ][ 'c' ][ 'd' ][ 'e' ]
chỉ số:     0      1      2      3      4
```

Máy tìm `ds[3]` bằng **một phép nhân cộng**: `1000 + 3 × 8 = 1024`. Không quét, không so sánh — nên lấy phần tử thứ 3 và phần tử thứ 3 triệu tốn thời gian **y hệt nhau**.

Cái giá của tính liền nhau đó lộ ra khi bạn chèn:

```
chèn 'x' vào vị trí 1:
[ a ][ b ][ c ][ d ][ e ]
     ↓ phải dịch b,c,d,e sang phải một ô
[ a ][ x ][ b ][ c ][ d ][ e ]
```

Chèn đầu mảng 1 triệu phần tử = dịch 1 triệu phần tử. Xoá cũng vậy.

```ts
const ds = ['a', 'b', 'c']
ds[1]              // tức thì, không phụ thuộc độ dài
ds.push('d')       // rẻ (thường)
ds.unshift('x')    // ĐẮT — dịch toàn bộ
ds.splice(1, 0, 'y')  // ĐẮT — dịch từ vị trí 1 trở đi
```

```python
ds = ['a', 'b', 'c']
ds[1]              # tức thì
ds.append('d')     # rẻ
ds.insert(0, 'x')  # ĐẮT — dịch toàn bộ
```

Vì sao `push` chỉ "rẻ **thường**": mảng động cấp phát dư chỗ. Khi hết chỗ, nó xin vùng nhớ lớn gấp đôi rồi chép hết sang. Lần đó đắt, nhưng vì tăng gấp đôi nên chuyện đó hiếm dần — **chia đều ra thì vẫn rẻ**. Đây là "chi phí khấu hao", và nó giải thích vì sao `push` một triệu lần vẫn nhanh.

## Danh sách liên kết: mỗi ô giữ đường tới ô sau

```
[ 'a' | → ] → [ 'b' | → ] → [ 'c' | ∅ ]
 1000          3480          2120        ← nằm rải rác, không cần liền nhau
```

Mỗi nút giữ giá trị và **đường tới** nút kế tiếp.

```ts
type Nut<T> = { giaTri: T; sau: Nut<T> | null }

function chenSau<T>(nut: Nut<T>, giaTri: T): void {
  nut.sau = { giaTri, sau: nut.sau }   // chỉ đổi hai đường trỏ, không dịch gì cả
}
```

```python
@dataclass
class Nut:
    gia_tri: object
    sau: 'Nut | None' = None

def chen_sau(nut: Nut, gia_tri) -> None:
    nut.sau = Nut(gia_tri, nut.sau)
```

Đánh đổi lật ngược hoàn toàn so với mảng:

| Phép | Mảng | Danh sách liên kết |
|---|---|---|
| Lấy phần tử thứ n | **tức thì** | phải đi từ đầu, n bước |
| Chèn/xoá ở **chỗ đã cầm được** | dịch cả đuôi | **chỉ đổi con trỏ** |
| Chèn/xoá ở vị trí thứ n | dịch cả đuôi | đi n bước rồi đổi con trỏ |
| Bộ nhớ mỗi phần tử | chỉ giá trị | giá trị **+ một con trỏ** |
| Duyệt tuần tự | rất nhanh | chậm hơn nhiều (xem dưới) |

Chú ý dòng thứ ba: người ta hay nói "danh sách liên kết chèn nhanh", nhưng đó chỉ đúng khi bạn **đã cầm sẵn nút đó**. Nếu phải tìm nó trước thì vẫn phải đi từ đầu, và lợi thế bốc hơi.

## Vì sao thực tế mảng thường thắng

Đây là phần lý thuyết trong sách hay bỏ qua: **bộ nhớ đệm của CPU (cache)**.

CPU không đọc bộ nhớ từng byte. Nó đọc từng **khối** (thường 64 byte). Khi bạn chạm `ds[0]` của một mảng, CPU kéo luôn `ds[1]`, `ds[2]`, ... vào bộ nhớ đệm — sẵn sàng cho vòng lặp tiếp theo.

Danh sách liên kết thì các nút **nằm rải rác** khắp bộ nhớ. Mỗi bước là một lần nhảy tới địa chỉ xa lạ, và bộ nhớ đệm trượt. Một lần trượt tốn cỡ **100 chu kỳ CPU**, trong khi đọc trúng đệm chỉ vài chu kỳ.

Hệ quả có thật, đo được: duyệt một mảng 1 triệu số thường nhanh hơn duyệt danh sách liên kết cùng kích thước **hàng chục lần** — dù cả hai đều "cùng độ phức tạp tuyến tính". Đây là bài học lớn hơn về Big-O: nó đếm số phép, **không đếm giá của từng phép**. Chi tiết ở [[big-o-doc-va-uoc-luong]].

Nên trong ứng dụng thường ngày: **mặc định dùng mảng**. Chỉ nghĩ tới danh sách liên kết khi có lý do cụ thể.

## Vậy khi nào danh sách liên kết đúng

- Bạn liên tục chèn/xoá ở **giữa** và đã cầm sẵn vị trí (ví dụ: danh sách bài đang phát, hàng đợi tác vụ có huỷ giữa chừng)
- Cần **ghép hai danh sách** thành một mà không chép gì (nối đuôi = một phép gán)
- Không được phép có một khối bộ nhớ liên tục lớn
- Làm nền cho cấu trúc khác — bộ nhớ đệm LRU thường là bảng băm + danh sách liên kết hai chiều

Điểm cuối là ứng dụng hay gặp nhất trong thực tế, và nó giải thích cách [[cache-nhieu-tang]] hoạt động ở tầng dưới cùng.

Chú ý về JavaScript và Python: **cả hai đều không có danh sách liên kết dựng sẵn**. `Array` của JS và `list` của Python đều là mảng động. Điều đó tự nó đã là một câu trả lời về mức độ cần thiết của nó trong ứng dụng thường ngày.

## Chọn nhanh

```
Cần lấy theo chỉ số? ───────────────► Mảng
Chủ yếu duyệt từ đầu tới cuối? ─────► Mảng (bộ nhớ đệm)
Thêm/bớt ở cuối? ───────────────────► Mảng
Thêm/bớt ở đầu, rất nhiều lần? ─────► Hàng đợi hai đầu (deque)
Chèn giữa liên tục, đã cầm vị trí? ─► Danh sách liên kết
Không chắc? ────────────────────────► Mảng
```

Dòng "thêm/bớt ở đầu" đáng nhớ: Python có `collections.deque` cho đúng việc đó, còn JS thì `Array.shift()` là bẫy hiệu năng kinh điển trong vòng lặp lớn.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `unshift` / `insert(0, ...)` trong vòng lặp | Chậm theo bình phương | Thêm vào cuối rồi đảo, hoặc dùng `deque` |
| `shift()` để làm hàng đợi | Mỗi lần dịch cả mảng | `deque` (Python), chỉ số đầu (JS) |
| Dùng danh sách liên kết vì "lý thuyết nói chèn nhanh" | Chậm hơn mảng vì trượt bộ nhớ đệm | Đo trước, mặc định mảng |
| Tưởng chèn vào danh sách liên kết luôn rẻ | Phải tìm vị trí trước thì vẫn đi từ đầu | Chỉ rẻ khi đã cầm sẵn nút |
| `splice` để xoá trong vòng lặp | Dịch mảng mỗi lần lặp | `filter` tạo mảng mới một lần |
| Quên danh sách liên kết tốn thêm bộ nhớ con trỏ | Gấp 2–3 lần bộ nhớ cho số nhỏ | Tính cả chi phí này |

## Ghi nhớ

- Mảng nằm liền nhau → lấy theo chỉ số tức thì, chèn giữa thì phải dịch.
- Danh sách liên kết rải rác → chèn ở chỗ **đã cầm** rẻ, nhưng lấy phần tử thứ n thì đắt.
- Bộ nhớ đệm CPU làm mảng thắng trong thực tế, kể cả khi lý thuyết nói hoà.
- `push` rẻ nhờ tăng gấp đôi và chi phí khấu hao; `unshift`/`shift` thì không.
- JS và Python đều không có danh sách liên kết dựng sẵn — mặc định dùng mảng.

## Tự kiểm tra

1. Vì sao `ds[3]` và `ds[3_000_000]` tốn thời gian như nhau?
2. Bộ nhớ đệm CPU khiến kết luận lý thuyết về danh sách liên kết sai ở chỗ nào?
3. `push` được gọi là "rẻ khấu hao" — nghĩa là gì?
