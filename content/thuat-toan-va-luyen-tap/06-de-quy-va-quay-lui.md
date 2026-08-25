---
title: Đệ quy và quay lui
slug: de-quy-va-quay-lui
summary: Khung ba phần của một hàm đệ quy, khuôn mẫu quay lui, và cách cắt nhánh để không nổ tung.
level: trung-cap
tags: [thuat-toan, de-quy, quay-lui]
khung: v2
---

> **Sau bài này bạn sẽ:** dùng được khuôn mẫu quay lui cho lớp bài "liệt kê mọi khả năng", và biết cắt nhánh để nó chạy được trong thực tế.

## Ý tưởng chính

Quay lui là đệ quy cộng thêm **một thao tác duy nhất**: chọn → đi tiếp → **bỏ chọn**.

Nó dành cho bài "liệt kê tất cả": mọi hoán vị, mọi tập con, mọi cách đặt quân hậu, mọi đường đi trong mê cung. Cách nghĩ về đệ quy nói chung nằm ở [[de-quy-va-cach-nghi-ve-no]]; bài này về khuôn mẫu quay lui.

## Mental model

Hãy tưởng tượng bạn **đi trong mê cung, tay cầm một cuộn chỉ**.

> Tới ngã ba, bạn **chọn** một lối và **thả chỉ theo**. Đi tiếp, gặp ngã ba nữa, lại chọn.
>
> Tới ngõ cụt? Bạn **cuốn chỉ lại đúng tới ngã ba gần nhất** — trả mọi thứ về như lúc chưa đi — rồi thử lối khác.
>
> Sợi chỉ chính là trạng thái hiện tại. **Cuốn chỉ lại chính là "bỏ chọn".**

Quên cuốn chỉ thì lối đi cũ vẫn còn dấu, và mọi nhánh sau đó đều tính nhầm.

## Ví dụ nhỏ

```ts
hoanVi([1, 2])
// → [[1,2], [2,1]]
```

Hai phần tử, hai kết quả. Ba phần tử thì sáu, bốn thì hai mươi tư — số kết quả là `n!`, và đó là lý do bài này luôn kèm ràng buộc `n` nhỏ.

## Code chạy thế nào

```ts
function hoanVi(nums) {
  const ketQua = []
  const hienTai = []
  const daDung = new Array(nums.length).fill(false)

  function lui() {
    if (hienTai.length === nums.length) {
      ketQua.push([...hienTai])       // SAO CHÉP — xem phần Dễ nhầm
      return
    }
    for (let i = 0; i < nums.length; i += 1) {
      if (daDung[i]) continue

      hienTai.push(nums[i]); daDung[i] = true      // chọn — thả chỉ
      lui()                                         // đi tiếp
      hienTai.pop(); daDung[i] = false              // bỏ chọn — cuốn chỉ
    }
  }

  lui()
  return ketQua
}
```

Lần tay với `[1, 2]` — chú ý cột bên phải, đó là chỗ mọi lỗi nằm:

```text
lui()                    hienTai=[]
 ├─ chọn 1               hienTai=[1]
 │   └─ lui()
 │       ├─ chọn 2       hienTai=[1,2]  → đủ dài → ghi [1,2]
 │       └─ BỎ CHỌN 2    hienTai=[1]    ← cuốn chỉ
 ├─ BỎ CHỌN 1            hienTai=[]     ← cuốn chỉ
 ├─ chọn 2               hienTai=[2]
 │   └─ lui()
 │       ├─ chọn 1       hienTai=[2,1]  → ghi [2,1]
 │       └─ BỎ CHỌN 1    hienTai=[2]
 └─ BỎ CHỌN 2            hienTai=[]
```

Nếu bỏ hai dòng "BỎ CHỌN", `hienTai` cứ dài mãi và nhánh thứ hai bắt đầu từ `[1,2]` thay vì `[]`. Kết quả sai theo kiểu rất khó lần.

## Tại sao cần nó

Vì quay lui vét cạn có độ phức tạp khủng khiếp — `O(n!)` cho hoán vị, `O(2ⁿ)` cho tập con. Với `n = 12` là 479 triệu nhánh. **Cắt nhánh** là thứ biến nó từ lý thuyết thành dùng được:

```ts
function tongTapCon(nums, target) {
  const daSap = [...nums].sort((a, b) => a - b)   // sắp xếp để cắt được sớm
  const ketQua = []

  function lui(batDau, hienTai, conLai) {
    if (conLai === 0) { ketQua.push([...hienTai]); return }

    for (let i = batDau; i < daSap.length; i += 1) {
      if (daSap[i] > conLai) break                            // ① đã vượt → mọi cái sau cũng vượt
      if (i > batDau && daSap[i] === daSap[i - 1]) continue    // ② bỏ giá trị trùng ở cùng tầng

      hienTai.push(daSap[i])
      lui(i + 1, hienTai, conLai - daSap[i])
      hienTai.pop()
    }
  }

  lui(0, [], target)
  return ketQua
}
```

Ba kiểu cắt nhánh dùng được ở hầu hết bài:

| Kiểu cắt | Khi nào dùng |
|---|---|
| `break` khi đã vượt ngưỡng | Dữ liệu đã sắp xếp tăng dần |
| Bỏ qua giá trị trùng ở cùng tầng | Đề đòi kết quả không lặp |
| Dừng khi phần còn lại không đủ | Biết trước tổng còn lại tối đa |

Cắt nhánh **không đổi độ phức tạp trên giấy**, nhưng đổi hẳn thời gian chạy thực tế — thường là từ "quá hạn" thành "vài mili giây".

## So sánh

Khi nào dừng lại và chọn cách khác:

| Tình huống | Dùng gì |
|---|---|
| Liệt kê **mọi** khả năng | Quay lui |
| Chỉ cần **đếm số** khả năng | Thường là [[quy-hoach-dong]] — không cần liệt kê |
| Chỉ cần **một** lời giải tốt nhất | Quay lui + cắt nhánh, hoặc tham lam |
| Bài con lặp lại nhiều lần | Quay lui + ghi nhớ |

Dòng thứ hai đáng nhớ: rất nhiều bài "có bao nhiêu cách…" trông như quay lui nhưng giải bằng quy hoạch động nhanh hơn hàng triệu lần, vì đếm không đòi phải dựng ra từng kết quả.

## Dễ nhầm

**1. Quên sao chép khi ghi nhận.**

```ts
ketQua.push(hienTai)        // ❌ đẩy vào THAM CHIẾU của mảng đang dùng chung
ketQua.push([...hienTai])   // ✅ bản sao
```

Với bản sai, chạy xong thì mọi phần tử của `ketQua` đều trỏ tới cùng một mảng — và mảng đó rỗng, vì đã bị `pop` hết. Kết quả: một mảng đầy `[]`.

**2. Quên bỏ chọn.** Đã nói ở trên. Quy tắc: **mỗi thao tác "chọn" phải có đúng một thao tác "bỏ chọn" đối xứng, ngay sau lời gọi đệ quy.**

**3. Truyền `batDau + 1` thay vì `i + 1`.** Trong bài sinh tập con, `batDau` giữ cho mỗi phần tử chỉ được xét một lần ở mỗi nhánh. Viết sai thì `[1,2]` và `[2,1]` cùng xuất hiện trong khi đề chỉ muốn tập con.

**4. Cắt nhánh mà chưa sắp xếp.** `break` khi vượt ngưỡng **chỉ đúng** nếu dữ liệu tăng dần. Cắt trên dữ liệu chưa sắp là bỏ sót đáp án — sai chứ không phải chậm.

**5. Dùng quay lui cho bài `n` lớn.** Thấy `n ≤ 20` là dấu hiệu quay lui hoặc mặt nạ bit; thấy `n = 10⁵` thì chắc chắn không phải. Đọc ràng buộc trước khi chọn kỹ thuật — [[cach-tiep-can-mot-bai-thuat-toan]].

## Mẹo nhớ

> **Thả chỉ · đi tiếp · cuốn chỉ.**
>
> **Mỗi "chọn" có đúng một "bỏ chọn". Ghi nhận thì phải SAO CHÉP.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba thao tác của khuôn mẫu quay lui, theo đúng thứ tự?
2. `ketQua.push(hienTai)` thay vì `push([...hienTai])` cho ra kết quả gì, và vì sao?
3. Vì sao phải **sắp xếp** trước khi cắt nhánh bằng `break`?
4. Bài "đếm số cách" và bài "liệt kê mọi cách" nên dùng kỹ thuật khác nhau — vì sao?
5. Ràng buộc `n` cỡ nào thì bạn nghĩ tới quay lui?

## Tự viết lại

Không nhìn lại phần trên, viết hàm sinh **mọi tổ hợp `k` phần tử** từ `1..n`:

```ts
toHop(4, 2)   // → [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]
```

Tự kiểm: bạn truyền gì vào lời gọi đệ quy để `[2,1]` không xuất hiện? Và bạn có thể cắt nhánh sớm khi số phần tử còn lại **không đủ** để đạt `k` không?

## Thử sức

Bài tám quân hậu: đặt 8 quân hậu lên bàn cờ 8×8 sao cho không quân nào ăn được quân nào.

Vét cạn là `64!/(56!·8!)` ≈ 4,4 tỉ cách. Ba câu để tự lần ra: bạn **thu hẹp không gian tìm kiếm** thế nào ngay từ cách biểu diễn trạng thái, kiểm tra "ăn được nhau" cho rẻ bằng cấu trúc gì, và cắt nhánh ở thời điểm nào?
