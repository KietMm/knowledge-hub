---
title: Vì sao chọn sai cấu trúc dữ liệu là đắt
slug: chon-sai-cau-truc-du-lieu-la-dat
summary: Cùng một logic, đổi chỗ chứa dữ liệu thì từ 40 giây xuống 8 mili-giây. Chọn chỗ chứa theo câu hỏi bạn sẽ hỏi nó nhiều nhất.
level: co-ban
tags: [nen-tang, cau-truc-du-lieu, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** nhìn một đoạn code và đoán được nó sẽ chết ở mốc dữ liệu nào, chỉ bằng cách xem nó đang hỏi dữ liệu câu gì.

## Ý tưởng chính

Cấu trúc dữ liệu không phải là "chỗ để cất dữ liệu". Nó là **cách sắp xếp dữ liệu, và mỗi cách sắp xếp làm một số câu hỏi trở nên rẻ và một số câu hỏi trở nên đắt.**

Nên câu hỏi khi chọn không bao giờ là "cái nào tốt nhất", mà là: **"tôi sẽ hỏi dữ liệu này câu gì nhiều nhất?"**

## Mental model

Hãy nghĩ tới cách bạn xếp đồ trong nhà.

> **Xếp giày thành hàng ở cửa** — lấy đôi thứ ba rất nhanh, nhưng tìm "đôi màu nâu" thì phải nhìn từng đôi.
>
> **Cất thuốc theo ngăn có dán nhãn tên bệnh** — hỏi "thuốc đau đầu ở đâu" là mở đúng ngăn, nhưng hỏi "ngăn thứ tư là gì" thì vô nghĩa.

Không cách nào sai. Chúng chỉ trả lời **hai câu hỏi khác nhau**. Xếp giày theo nhãn màu thì tìm màu nhanh nhưng đi ra cửa vơ đại một đôi lại chậm.

Chọn cấu trúc dữ liệu là chọn **cách xếp đồ theo câu hỏi bạn hỏi hằng ngày** — không phải theo cái nghe sang.

## Ví dụ nhỏ

Bài toán: có `donHang` và `khachHang`, cần gắn tên khách vào mỗi đơn.

```ts
// Cách 1: với mỗi đơn, đi tìm khách trong mảng
for (const d of donHang) {
  d.tenKhach = khachHang.find((k) => k.id === d.khachId).ten
}
```

```ts
// Cách 2: xếp khách vào bảng tra trước
const theoId = new Map(khachHang.map((k) => [k.id, k]))
for (const d of donHang) {
  d.tenKhach = theoId.get(d.khachId).ten
}
```

Cùng kết quả. Với 10.000 đơn và 10.000 khách: cách 1 khoảng **40 giây**, cách 2 khoảng **8 mili-giây**. Chênh 5000 lần, và không dòng nào "tối ưu" hơn dòng nào về mặt cú pháp.

## Code chạy thế nào

Đếm số phép so sánh, đó là chỗ toàn bộ khác biệt nằm:

```text
Cách 1 — find() quét mảng từ đầu mỗi lần
  đơn 1:  so tối đa 10.000 lần
  đơn 2:  so tối đa 10.000 lần
  ...
  đơn 10.000: so tối đa 10.000 lần
  ─────────────────────────────────
  tổng:   10.000 × 10.000 = 100 triệu phép so

Cách 2 — dựng bảng một lần, rồi tra thẳng
  dựng Map:  10.000 bước
  đơn 1:     1 bước  (tính ra ngăn, xem luôn)
  ...
  đơn 10.000: 1 bước
  ─────────────────────────────────
  tổng:      20.000 bước
```

100 triệu so với 20 nghìn. Không phải vì `Map` "nhanh hơn mảng" — mà vì cách 1 **hỏi mảng một câu mà mảng không được xếp để trả lời**: *"phần tử nào có id bằng X?"* Mảng chỉ xếp theo vị trí, nên nó buộc phải xem từng cái.

## Tại sao cần nó

Vì loại lỗi này **không hiện ra lúc bạn viết**. Với 50 bản ghi khi dev, cả hai cách đều chạy tức thì. Nó chỉ hiện ra ở production, dưới dạng "trang này dạo này chậm" — và lúc đó rất khó lần ra vì code trông hoàn toàn bình thường.

Đây cũng là lý do việc chọn cấu trúc dữ liệu quan trọng hơn hầu hết các "mẹo tối ưu": bạn không thể vá một lựa chọn sai bằng cách viết vòng lặp khéo hơn. Cùng vấn đề đó ở tầng cơ sở dữ liệu chính là index — xem [[index-va-hieu-nang-truy-van]].

## So sánh

Bốn chỗ chứa hay dùng nhất, xếp theo **câu hỏi chúng trả lời rẻ**:

| Chỗ chứa | Rẻ | Đắt |
|---|---|---|
| Mảng / list | Lấy theo **vị trí**, duyệt hết, thêm cuối | Tìm theo giá trị, chèn/xoá giữa |
| Bảng băm / dict | Tra theo **khoá**, thêm, xoá | Hỏi "nhỏ nhất", giữ thứ tự |
| Tập hợp / set | Hỏi **đã có chưa**, bỏ trùng | Lấy phần tử thứ k |
| Mảng đã sắp xếp | Tìm nhị phân, hỏi min/max, khoảng | Chèn thêm (phải giữ thứ tự) |

Ba câu hỏi để tự chọn, theo đúng thứ tự:

1. **Tôi hỏi nó câu gì nhiều nhất?** Tra theo id → bảng băm. Duyệt theo thứ tự → mảng. Hỏi "đã gặp chưa" → tập hợp.
2. **Bao nhiêu phần tử?** Dưới ~100 thì gần như mọi lựa chọn đều ổn; đừng tốn công.
3. **Ghi nhiều hay đọc nhiều?** Đọc nhiều thì bỏ công sắp xếp trước là đáng.

## Dễ nhầm

**1. Tưởng vòng lặp lồng nhau nào cũng tệ.** Không — vấn đề chỉ xảy ra khi **vòng trong đi tìm**:

```ts
// ❌ Vòng trong TÌM → mỗi phần tử ngoài phải quét lại toàn bộ trong
for (const a of A) for (const b of B) if (b.id === a.bId) { }

// ✅ Vòng trong chỉ duyệt dữ liệu nhỏ, cố định
for (const don of donHang) for (const dong of don.dong) { }
```

Dấu hiệu cần cảnh giác: `.find()`, `.includes()`, `.indexOf()`, hoặc một vòng `for` nữa **nằm bên trong một vòng lặp**. Thấy nó thì hỏi: *"tôi đang hỏi một câu mà chỗ chứa này không được xếp để trả lời?"*

**2. Đổi cấu trúc khi dữ liệu còn nhỏ.** Dựng `Map` cho 20 phần tử là thêm code, thêm chỗ sai, mà không nhanh hơn được mili-giây nào. Việc đo trước khi tối ưu nằm ở [[uoc-luong-va-tim-diem-nghen]].

**3. Quên rằng dựng bảng tra cũng tốn tiền.** `new Map(...)` phải duyệt hết một lượt. Nếu bạn chỉ tra **một lần**, dựng bảng còn chậm hơn `find`. Bảng tra chỉ có lãi khi bạn tra **nhiều lần** trên cùng bộ dữ liệu.

**4. Chọn theo tên nghe sang.** Cây, heap, trie đều tuyệt vời — cho đúng bài của chúng. Với 90% việc hằng ngày, mảng và bảng băm là đủ, và chúng đơn giản hơn nên ít lỗi hơn.

## Mẹo nhớ

> **Chọn chỗ chứa theo câu hỏi bạn hỏi nhiều nhất, không theo dữ liệu trông như thế nào.**
>
> **Vòng trong đi TÌM là dấu hiệu chọn sai.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao "cái nào tốt nhất" là câu hỏi sai khi chọn cấu trúc dữ liệu?
2. Trong ví dụ ghép đơn–khách, chính xác thì cách 1 tốn 100 triệu bước ở đâu?
3. Vòng lặp lồng nhau nào đáng lo, vòng nào không?
4. Khi nào dựng `Map` **chậm hơn** dùng `find` thẳng?
5. Vì sao loại lỗi này thường chỉ lộ ra ở production?

## Tự viết lại

Không nhìn lại phần trên, sửa đoạn này để nó không còn quét lại mảng ở mỗi vòng:

```ts
const idDaCam = ['u3', 'u9', 'u21', /* ...5000 id */]

const conLai = nguoiDung.filter((u) => !idDaCam.includes(u.id))
```

Tự kiểm trước khi chạy: bạn đổi `idDaCam` thành cấu trúc gì, và câu hỏi bạn đang hỏi nó là câu gì?

## Thử sức

Bạn có 1 triệu bản ghi log và cần trả lời **cả hai** câu hỏi này, mỗi giây vài nghìn lần:

```text
a) "log của user X gồm những gì?"
b) "log gần đây nhất theo thời gian là những cái nào?"
```

Một chỗ chứa duy nhất có phục vụ tốt cả hai câu không? Nếu không, bạn làm gì — và cái giá phải trả cho cách đó là gì?
