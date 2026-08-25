---
title: Đệ quy và quay lui
slug: de-quy-va-quay-lui
summary: Khung ba phần của một hàm đệ quy, khuôn mẫu quay lui, và cách cắt nhánh để không nổ tung.
level: trung-cap
tags: [thuat-toan, de-quy, quay-lui]
---

> **Sau bài này bạn sẽ:** viết được hàm đệ quy mà không sợ, và dùng được khuôn mẫu quay lui cho lớp bài "liệt kê mọi khả năng".

## Ba phần của mọi hàm đệ quy

Cách nghĩ về đệ quy đã có ở [[de-quy-va-cach-nghi-ve-no]]; ở đây là cách dùng nó để giải bài. Mọi hàm đệ quy đều gồm đúng ba phần:

```js
function giai(baiToan) {
  if (đủNhỏ(baiToan)) return đápÁnHiểnNhiên   // 1. điều kiện dừng
  const nhỏHơn = thuNhỏ(baiToan)               // 2. thu nhỏ về phía điều kiện dừng
  return ghép(giai(nhỏHơn))                    // 3. ghép kết quả
}
```

Sai ở phần 1 thì tràn ngăn xếp. Sai ở phần 2 — thu nhỏ không thật sự tiến về phía điều kiện dừng — cũng tràn ngăn xếp. Sai ở phần 3 thì ra đáp án sai.

Điều quan trọng nhất khi viết: **tin rằng lời gọi đệ quy trả về đúng.** Đừng cố lần theo cả cây gọi trong đầu — bạn sẽ lạc từ tầng thứ ba. Chỉ cần trả lời "nếu `giai(nhỏHơn)` đúng, tôi ghép thế nào để `giai(baiToan)` cũng đúng?".

## Quay lui: liệt kê mọi khả năng

Quay lui là đệ quy cộng thêm một thao tác: **chọn → đi tiếp → bỏ chọn**. Nó dành cho bài "liệt kê tất cả": mọi hoán vị, mọi tập con, mọi cách đặt quân hậu, mọi đường đi trong mê cung.

Khuôn mẫu, và gần như bài nào cũng chỉ là điền vào bốn chỗ trống:

```js
function hoanVi(nums) {
  const ketQua = []
  const hienTai = []
  const daDung = new Array(nums.length).fill(false)

  function lui() {
    // 1. Điều kiện ghi nhận
    if (hienTai.length === nums.length) {
      ketQua.push([...hienTai]) // SAO CHÉP — xem ghi chú bên dưới
      return
    }

    for (let i = 0; i < nums.length; i += 1) {
      if (daDung[i]) continue // 2. lựa chọn không hợp lệ

      hienTai.push(nums[i]) // 3. chọn
      daDung[i] = true

      lui() // đi tiếp

      hienTai.pop() // 4. bỏ chọn — trả trạng thái về như cũ
      daDung[i] = false
    }
  }

  lui()
  return ketQua
}
```

Hai chỗ sai nhiều nhất:

**Quên sao chép khi ghi nhận.** `ketQua.push(hienTai)` đẩy vào *tham chiếu* tới mảng đang dùng chung; sau khi chạy xong, mọi phần tử của `ketQua` đều trỏ tới cùng một mảng rỗng. Phải `[...hienTai]`.

**Quên bỏ chọn.** Thiếu `hienTai.pop()` thì nhánh sau kế thừa trạng thái của nhánh trước, và kết quả sai theo kiểu rất khó lần. Quy tắc: mỗi thao tác "chọn" phải có đúng một thao tác "bỏ chọn" đối xứng, ngay sau lời gọi đệ quy.

## Cắt nhánh

Quay lui vét cạn có độ phức tạp khủng khiếp: `O(n!)` cho hoán vị, `O(2ⁿ)` cho tập con. Với `n = 12` là 479 triệu nhánh. **Cắt nhánh** là bỏ sớm những nhánh chắc chắn không dẫn tới đáp án:

```js
function tongTapCon(nums, target) {
  const daSap = [...nums].sort((a, b) => a - b) // sắp xếp để cắt được sớm
  const ketQua = []

  function lui(batDau, hienTai, conLai) {
    if (conLai === 0) {
      ketQua.push([...hienTai])
      return
    }
    for (let i = batDau; i < daSap.length; i += 1) {
      // Đã sắp tăng dần: phần tử này đã vượt thì mọi phần tử sau cũng vượt.
      if (daSap[i] > conLai) break
      // Bỏ qua giá trị trùng ở cùng một tầng để không sinh ra kết quả lặp.
      if (i > batDau && daSap[i] === daSap[i - 1]) continue

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

| Kiểu cắt | Khi nào |
|---|---|
| `break` khi đã vượt ngưỡng | Dữ liệu đã sắp xếp tăng dần |
| Bỏ qua giá trị trùng ở cùng tầng | Đề đòi kết quả không lặp |
| Dừng khi phần còn lại không đủ | Biết trước tổng còn lại tối đa |

Cắt nhánh không đổi độ phức tạp trên giấy, nhưng đổi hẳn thời gian chạy thực tế — thường là từ "quá hạn" thành "vài mili giây".

## Đệ quy hay vòng lặp

Đệ quy tốn ngăn xếp: mỗi lời gọi là một khung, và JavaScript tràn ở khoảng 10.000 tầng.

- Đệ quy **đuôi** (lời gọi đệ quy là việc cuối cùng) luôn viết lại được thành vòng lặp, và nên viết lại nếu độ sâu có thể lớn.
- Duyệt cây, duyệt đồ thị, quay lui: giữ đệ quy — viết bằng vòng lặp cần tự quản một ngăn xếp và code sẽ khó đọc hơn hẳn.
- Đệ quy có tham số lặp lại: đó là dấu hiệu của quy hoạch động, xem [[quy-hoach-dong]].

## Ghi nhớ

- Ba phần: điều kiện dừng, thu nhỏ, ghép. Tin rằng lời gọi con trả về đúng.
- Quay lui = chọn → đi tiếp → **bỏ chọn**, và mỗi "chọn" phải có đúng một "bỏ chọn".
- Luôn **sao chép** khi ghi nhận kết quả.
- Cắt nhánh là thứ biến quay lui từ lý thuyết thành dùng được.

## Tự kiểm tra

1. `ketQua.push(hienTai)` thay vì `push([...hienTai])` cho ra kết quả gì?
2. Vì sao phải sắp xếp trước khi cắt nhánh bằng `break`?
3. Bài nào nên chuyển đệ quy thành vòng lặp, bài nào nên giữ nguyên?
