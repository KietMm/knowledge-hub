---
title: Vì sao chọn sai cấu trúc dữ liệu là đắt
slug: chon-sai-cau-truc-du-lieu-la-dat
summary: Cùng một logic, đổi chỗ chứa dữ liệu thì từ 40 giây xuống 8 mili-giây. Chọn chỗ chứa theo câu hỏi bạn sẽ hỏi nó nhiều nhất.
level: co-ban
tags: [nen-tang, cau-truc-du-lieu, hieu-nang]
---

> **Sau bài này bạn sẽ:** biết vì sao lựa chọn cấu trúc dữ liệu quyết định hiệu năng hơn hẳn việc tối ưu từng dòng, và có một câu hỏi để chọn đúng ngay từ đầu.

## Một ví dụ thật, chênh nhau 5000 lần

Bài toán: có 20.000 đơn hàng và 20.000 khách. Với mỗi đơn, tìm tên khách.

```ts
// ❌ Danh sách: mỗi đơn phải quét cả danh sách khách
function gan(dons: Don[], khachs: Khach[]) {
  return dons.map((d) => ({
    ...d,
    tenKhach: khachs.find((k) => k.id === d.khachId)?.ten,   // ← quét
  }))
}
```

```ts
// ✅ Bảng băm: dựng chỉ mục một lần, tra tức thì
function gan(dons: Don[], khachs: Khach[]) {
  const theoId = new Map(khachs.map((k) => [k.id, k]))        // dựng 1 lần
  return dons.map((d) => ({ ...d, tenKhach: theoId.get(d.khachId)?.ten }))
}
```

```python
# ❌ chậm                                    # ✅ nhanh
[next(k for k in khachs if k.id == d.khach_id)  theo_id = {k.id: k for k in khachs}
 for d in dons]                                 [theo_id.get(d.khach_id) for d in dons]
```

| Cách | Số phép so sánh | Thời gian thực đo |
|---|---|---|
| `find` trong vòng lặp | 20.000 × 20.000 = **400 triệu** | ~40 giây |
| Dựng `Map` rồi tra | 20.000 + 20.000 = **40 nghìn** | ~8 mili-giây |

Logic nghiệp vụ **y hệt**. Không tối ưu dòng nào, không đổi ngôn ngữ, không thêm cache, không thêm máy chủ. Chỉ đổi **chỗ chứa dữ liệu**.

Đây là lý do câu hỏi "dùng cấu trúc nào" quan trọng hơn hẳn mọi mẹo vi tối ưu. Không có mẹo nào bù được 5000 lần.

## Cấu trúc dữ liệu là gì

Không phải "kiểu dữ liệu". Cấu trúc dữ liệu là **cách sắp xếp dữ liệu trong bộ nhớ, và bộ phép toán mà cách sắp xếp đó làm cho rẻ**.

Mỗi cấu trúc là một **đánh đổi**: làm một số việc rất nhanh, đổi lại một số việc khác chậm đi.

| Cấu trúc | Rẻ | Đắt |
|---|---|---|
| Mảng | Lấy theo vị trí, duyệt tuần tự | Tìm theo giá trị, chèn vào giữa |
| Bảng băm (Map/dict) | Tra theo khoá, thêm, xoá | Giữ thứ tự sắp xếp, tìm theo khoảng |
| Tập hợp (Set) | Hỏi "đã có chưa", khử trùng | Lấy theo vị trí |
| Danh sách liên kết | Chèn/xoá ở chỗ đã biết | Lấy phần tử thứ n |
| Cây có thứ tự | Tìm theo khoảng, giữ sắp xếp | Phức tạp hơn, hằng số lớn hơn |
| Hàng đợi / ngăn xếp | Thêm-lấy ở đầu hoặc cuối | Truy cập chỗ giữa |

Không có cấu trúc nào rẻ mọi thứ. Nếu có thì đã chẳng cần bài học này.

## Câu hỏi để chọn đúng

Đừng bắt đầu từ "dùng cấu trúc nào". Bắt đầu từ:

> **Trong đoạn code này, câu hỏi nào tôi sẽ hỏi dữ liệu nhiều lần nhất?**

Rồi tra ngược:

| Câu hỏi bạn hỏi nhiều nhất | Chỗ chứa đúng |
|---|---|
| "Phần tử thứ i là gì?" | Mảng |
| "Bản ghi có id = X đâu?" | Bảng băm khoá theo `id` |
| "X có trong tập này không?" | Tập hợp |
| "Cho tôi tất cả theo thứ tự bảng chữ cái" | Mảng đã sắp, hoặc cây |
| "Cho tôi những cái trong khoảng 10–20" | Cây / mảng đã sắp |
| "Ai vào trước ra trước?" | Hàng đợi |
| "Cái gần đây nhất là gì?" | Ngăn xếp |
| "Cái nào ưu tiên cao nhất?" | Hàng đợi ưu tiên (heap) |

Trong ví dụ đầu bài, câu hỏi hỏi 20.000 lần là *"khách có id = X đâu?"* — nên chỗ chứa đúng là bảng băm khoá theo `id`. Câu trả lời hiện ra ngay khi bạn hỏi đúng câu.

## Vòng lặp trong vòng lặp là dấu hiệu

Mẫu hình đáng nghi nhất, nhận ra được mà không cần đo:

```ts
for (const a of dsA) {
  for (const b of dsB) {        // ← hoặc .find, .includes, .some, .filter
    if (a.id === b.aId) { ... }
  }
}
```

Cứ thấy một phép **tìm kiếm** nằm bên trong một vòng lặp, hãy dừng lại và hỏi: *dựng chỉ mục trước có được không?* Câu trả lời gần như luôn là được, và luôn là ba dòng:

```ts
const chiMuc = new Map<string, B[]>()
for (const b of dsB) {
  const cu = chiMuc.get(b.aId) ?? []
  cu.push(b)
  chiMuc.set(b.aId, cu)
}
for (const a of dsA) {
  const khop = chiMuc.get(a.id) ?? []   // tra thẳng, không quét
}
```

```python
from collections import defaultdict
chi_muc = defaultdict(list)
for b in ds_b: chi_muc[b.a_id].append(b)
for a in ds_a: khop = chi_muc[a.id]
```

Đây đúng là việc mà **index của database** làm cho bạn ở tầng dưới — cùng một ý tưởng, khác chỗ đặt. Xem [[index-va-hieu-nang-truy-van]].

## Khi nào chuyện này **không** đáng quan tâm

Thành thật: với 20 phần tử, mọi cấu trúc đều nhanh như nhau, và `find` trong vòng lặp còn dễ đọc hơn. Đừng dựng `Map` cho một danh sách 10 mục.

Ngưỡng thực dụng: **hai vòng lặp lồng nhau trên dữ liệu có thể lớn dần**. Chữ "lớn dần" mới là chỗ nguy hiểm — 50 khách lúc ra mắt, 50.000 sau hai năm, và code không đổi dòng nào. Nó chạy tốt suốt mười tám tháng rồi đột ngột chết, đúng lúc không ai nhớ đoạn đó nữa.

Câu hỏi cần hỏi: *"dữ liệu này có thể lớn tới đâu trong hai năm nữa?"* Cách ước lượng đó là nội dung của [[uoc-luong-va-tim-diem-nghen]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `.find()` / `.includes()` bên trong vòng lặp | Chậm theo bình phương, chết khi dữ liệu lớn | Dựng `Map`/`Set` làm chỉ mục trước |
| Dùng mảng để hỏi "đã có chưa" | `includes` quét toàn mảng mỗi lần | Dùng `Set` |
| Dựng lại `Map` bên **trong** vòng lặp | Mất sạch lợi ích, còn tệ hơn | Dựng một lần ở ngoài |
| Chọn cấu trúc theo thói quen (cái gì cũng mảng) | Đúng nhưng chậm | Hỏi "tôi hỏi dữ liệu câu gì nhiều nhất" |
| Tối ưu vi mô trước khi sửa cấu trúc | Được 5%, bỏ lỡ 5000 lần | Sửa cấu trúc trước |
| Tối ưu cho 20 phần tử | Code phức tạp vô ích | Dưới ngưỡng thì ưu tiên dễ đọc |

## Ghi nhớ

- Đổi cấu trúc dữ liệu thắng mọi mẹo vi tối ưu — 5000 lần so với vài phần trăm.
- Mỗi cấu trúc là một đánh đổi: rẻ ở vài việc, đắt ở vài việc khác.
- Chọn bằng cách hỏi: **câu hỏi nào tôi hỏi dữ liệu nhiều lần nhất?**
- Tìm kiếm nằm trong vòng lặp = dấu hiệu cần dựng chỉ mục.
- Với dữ liệu nhỏ và không lớn dần, dễ đọc quan trọng hơn.

## Tự kiểm tra

1. Vì sao đổi từ `find` sang `Map` lại nhanh hơn 5000 lần dù logic y hệt?
2. Câu hỏi nào cần hỏi để chọn cấu trúc dữ liệu, thay vì hỏi "dùng cái nào"?
3. Vì sao "dữ liệu có thể lớn dần" nguy hiểm hơn "dữ liệu đang lớn"?
