---
title: Mảng và danh sách liên kết
slug: mang-va-danh-sach-lien-ket
summary: Hai cách xếp dãy phần tử, hai bộ đánh đổi ngược nhau. Và vì sao trong thực tế mảng thường thắng dù lý thuyết nói khác.
level: co-ban
tags: [nen-tang, cau-truc-du-lieu, mang, danh-sach-lien-ket]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được vì sao lấy phần tử thứ 500 của mảng là tức thì còn của danh sách liên kết thì không, và vì sao lý thuyết nói danh sách liên kết nhanh hơn mà thực tế lại hiếm khi vậy.

## Ý tưởng chính

Cùng một việc — giữ một dãy phần tử theo thứ tự — có hai cách xếp hoàn toàn khác nhau trong bộ nhớ, và hai bộ đánh đổi **ngược nhau**.

**Mảng** xếp các phần tử **nằm liền nhau**. **Danh sách liên kết** để chúng nằm rải rác, mỗi phần tử giữ thêm **đường đi tới phần tử sau**.

## Mental model

Hãy tưởng tượng hai cách tổ chức một đoàn người:

> **Mảng là một dãy ghế đánh số trong rạp chiếu phim.** Muốn tới ghế số 7? Bạn đi thẳng tới đó — vì bạn *tính* được nó nằm ở đâu. Nhưng muốn chèn thêm một người vào giữa hàng thì **tất cả những người phía sau phải đứng dậy dịch sang một ghế**.
>
> **Danh sách liên kết là một chuỗi người nắm tay nhau.** Không ai có số ghế. Muốn tới người thứ 7? Bạn phải đi từ đầu chuỗi và đếm. Nhưng chèn thêm một người vào giữa thì chỉ cần **hai người buông tay ra rồi nắm sang người mới** — không ai khác phải nhúc nhích.

Toàn bộ bài này là hệ quả của hai hình ảnh đó: *tính ra chỗ nhưng phải dịch cả hàng*, so với *phải đếm nhưng chỉ đổi hai cái nắm tay*.

## Ví dụ nhỏ

```text
Mảng [10, 20, 30] trong bộ nhớ:

địa chỉ:  1000   1004   1008
giá trị:  [ 10 ] [ 20 ] [ 30 ]      ← liền nhau, nên tính được chỗ
```

```text
Danh sách liên kết cùng dữ liệu:

  [10 | →] ─────► [20 | →] ─────► [30 | ✗]
  ở 1000          ở 7320          ở 2088     ← nằm đâu cũng được
```

## Code chạy thế nào

**Lấy phần tử thứ 2** — chỗ mảng thắng tuyệt đối:

```text
Mảng:  địa chỉ = 1000 + 2 × 4 = 1008 → đọc luôn      (1 bước, dù mảng dài 1 triệu)

Liên kết:  tới ô đầu (1000) → theo đường tới 7320
           → theo đường tới 2088 → đọc                (3 bước; phần tử thứ n cần n bước)
```

**Chèn vào đầu** — chỗ danh sách liên kết thắng tuyệt đối:

```text
Mảng:  phải dịch TOÀN BỘ sang phải một ô rồi mới ghi
       [_, 10, 20, 30] → ghi 5 vào ô đầu              (n bước)

Liên kết:  tạo ô mới [5|→], trỏ nó vào ô cũ đầu tiên,
           đổi "đầu danh sách" sang ô mới              (2 bước, bất kể dài bao nhiêu)
```

Hai bảng trên **là** toàn bộ nội dung lý thuyết của bài. Phần còn lại là chuyện thực tế phá vỡ lý thuyết đó ra sao.

## Tại sao cần nó

Vì đây là ví dụ sạch nhất của một sự thật lớn hơn: **không có cấu trúc dữ liệu nào nhanh hơn cấu trúc khác — chỉ có nhanh hơn ở một số câu hỏi và chậm hơn ở những câu còn lại.**

| Thao tác | Mảng | Danh sách liên kết |
|---|---|---|
| Lấy phần tử thứ i | `O(1)` ⚡ | `O(n)` |
| Chèn/xoá ở đầu | `O(n)` | `O(1)` ⚡ |
| Chèn/xoá ở cuối | `O(1)`* | `O(1)` nếu giữ đuôi |
| Chèn/xoá ở giữa (đã đứng ở đó) | `O(n)` | `O(1)` ⚡ |
| Tìm theo giá trị | `O(n)` | `O(n)` |
| Bộ nhớ mỗi phần tử | chỉ dữ liệu | dữ liệu **+ con trỏ** |

\* Mảng động thỉnh thoảng phải cấp phát vùng mới gấp đôi rồi chép sang — lần đó tốn `O(n)`, nhưng vì gấp đôi nên nó hiếm dần, tính trung bình vẫn là `O(1)`. Cách đọc các ký hiệu này ở [[big-o-doc-va-uoc-luong]].

## So sánh

Bảng trên nói danh sách liên kết thắng ở chèn/xoá. **Thực tế thì mảng thường vẫn thắng**, và lý do không nằm trong lý thuyết:

**1. Bộ nhớ đệm CPU.** CPU không đọc từng byte — nó kéo về cả một khối 64 byte quanh chỗ bạn vừa chạm. Mảng nằm liền nhau nên một lần kéo là có sẵn 16 phần tử tiếp theo. Danh sách liên kết nằm rải rác nên mỗi bước nhảy là một lần chờ bộ nhớ chính — **chậm hơn khoảng 100 lần** so với đọc từ đệm. Chủ đề này ở [[cache-nhieu-tang]].

**2. `O(1)` của chèn giữa là có điều kiện.** Nó chỉ đúng khi bạn **đã đứng sẵn ở chỗ cần chèn**. Nếu phải đi tìm chỗ đó trước, bạn tốn `O(n)` cho việc đi — và mất luôn lợi thế.

**3. Mảng động đã đủ tốt cho hầu hết việc.** `push`/`pop` ở cuối là `O(1)` trung bình, và đó là thao tác bạn dùng nhiều nhất.

Kết luận thực dụng: **mặc định dùng mảng.** Chuyển sang danh sách liên kết khi bạn có lý do cụ thể — thường là hàng đợi cần thêm đầu này lấy đầu kia rất nhiều, hoặc bạn đang tự dựng một cấu trúc khác trên nền nó.

## Dễ nhầm

**1. Tưởng `shift()` rẻ như `pop()`.** Đây là bẫy hay gặp nhất khi dùng mảng làm hàng đợi:

```ts
const q = [1, 2, 3]
q.pop()     // ✅ O(1) — lấy cuối, không ai phải dịch
q.shift()   // ❌ O(n) — lấy đầu, TOÀN BỘ phần còn lại dịch sang trái
```

Vòng lặp `while (q.length) q.shift()` biến một việc `O(n)` thành `O(n²)`. Cách chữa: dùng một chỉ số đầu thay vì thật sự lấy ra, như trong phần BFS ở [[duyet-do-thi-bfs-va-dfs]].

**2. Tưởng mảng trong JavaScript giống mảng trong C.** Mảng JS là object có khoá số, và engine chỉ tối ưu nó thành mảng liền nhau **khi các phần tử cùng kiểu và không có lỗ**. Trộn kiểu hoặc tạo lỗ (`ds[1000] = 1` trên mảng 3 phần tử) làm nó rơi về dạng chậm hơn nhiều.

**3. Tưởng danh sách liên kết tiết kiệm bộ nhớ.** Ngược lại: mỗi phần tử phải mang thêm ít nhất một con trỏ (8 byte trên máy 64-bit). Với dãy số nguyên, danh sách liên kết có thể tốn **gấp ba** mảng.

**4. Dùng danh sách liên kết vì nó "học thuật".** Trong phần lớn ngôn ngữ hiện đại, bạn thậm chí không tự viết nó — `Array`/`list` và các cấu trúc dựng sẵn đã phủ hết nhu cầu. Giá trị của bài này là **hiểu đánh đổi**, không phải để đi cài lại danh sách liên kết.

## Mẹo nhớ

> **Mảng = ghế đánh số: tính ra chỗ ngay, nhưng chèn giữa thì cả hàng dịch.**
>
> **Liên kết = chuỗi nắm tay: phải đếm mới tới, nhưng chèn chỉ đổi hai cái nắm tay.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao mảng lấy được phần tử thứ i trong đúng một bước?
2. Vì sao chèn vào đầu mảng lại tốn `O(n)`?
3. Danh sách liên kết chèn giữa là `O(1)` — với điều kiện gì?
4. Nêu hai lý do thực tế khiến mảng thường thắng dù lý thuyết nói khác.
5. `q.shift()` trong vòng lặp gây hậu quả gì, và bạn thay bằng cách nào?

## Tự viết lại

Không nhìn lại phần trên, viết một hàng đợi dùng mảng nhưng **không dùng `shift()`**:

```ts
const q = new HangDoi()
q.them(1); q.them(2)
q.lay()   // → 1
q.lay()   // → 2
q.lay()   // → undefined
```

Tự kiểm: mỗi thao tác của bạn tốn bao nhiêu bước, và mảng bên trong có bao giờ phải dịch phần tử không?

## Thử sức

Bạn cần giữ 10 triệu số nguyên và **chỉ làm hai việc**: duyệt hết chúng theo thứ tự, và thỉnh thoảng thêm vào cuối.

Mảng hay danh sách liên kết? Trả lời rồi giải thích bằng **bộ nhớ đệm CPU**, không phải bằng bảng độ phức tạp — vì bảng đó nói hai bên hoà nhau.
