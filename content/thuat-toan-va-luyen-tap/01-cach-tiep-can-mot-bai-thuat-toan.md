---
title: Cách tiếp cận một bài thuật toán
slug: cach-tiep-can-mot-bai-thuat-toan
summary: Quy trình sáu bước từ lúc đọc đề tới lúc code chạy đúng, và vì sao viết cách chậm trước lại tiết kiệm thời gian.
level: co-ban
tags: [thuat-toan, tu-duy, phong-van]
---

> **Sau bài này bạn sẽ:** có một quy trình để bám vào khi nhìn đề bài mà chưa nghĩ ra gì, thay vì ngồi im chờ ý tưởng loé lên.

## Vấn đề thật không phải là thuật toán

Người mới giải bài thuật toán hay thất bại ở chỗ không ai ngờ: **họ bắt đầu gõ code quá sớm**. Đọc đề xong, thấy quen quen, gõ luôn. Được nửa chừng thì phát hiện hiểu sai đề, xoá đi làm lại. Lần thứ ba mới xong, và code cuối cùng chằng chịt những mảnh vá.

Người giải nhiều thì làm ngược lại: họ dành phần lớn thời gian **trước** khi gõ dòng đầu tiên.

## Sáu bước

**1. Đọc đề hai lần, lần hai tìm cái bẫy.** Câu hỏi cần trả lời được trước khi làm gì khác: đầu vào có thể rỗng không? Có số âm không? Có phần tử trùng nhau không? Dữ liệu đã sắp xếp chưa? Có bảo đảm luôn tồn tại đáp án không? Đáp án có duy nhất không?

Mỗi câu trả lời "có" ở trên là một ca test bạn sẽ phải qua. Người viết đề luôn nhét ít nhất một trong số đó vào bộ test.

**2. Làm tay một ví dụ nhỏ.** Lấy giấy, chạy ví dụ trong đề bằng tay. Nghe thừa, nhưng đây là bước tách người hiểu đề khỏi người tưởng là mình hiểu. Nếu bạn không tự làm tay được với `n = 4`, bạn không viết nổi vòng lặp cho `n = 10⁵`.

Trong lúc làm tay, để ý xem **bạn** đang làm gì — thường thuật toán nằm ngay ở đó. Bạn ngó lại phần tử phía sau? Đó là hai con trỏ. Bạn ghi nhớ những gì đã gặp? Đó là bảng băm.

**3. Viết cách chậm nhất trước.** Cách vét cạn, `O(n²)` hay `O(n³)` cũng được. Đừng bỏ qua bước này.

Nó cho bạn ba thứ: một lời giải **đúng** để đối chiếu, một hiểu biết cụ thể về cấu trúc bài toán, và một điểm khởi đầu để tối ưu. Nhảy thẳng vào lời giải tối ưu khi chưa hiểu bài là cách nhanh nhất để viết ra một đoạn code sai mà trông rất thông minh.

Ví dụ cụ thể với bài "có cặp nào cộng lại bằng target không". Cách chậm viết trong 30 giây:

```js
// O(n²) — đúng, chậm, và là mốc để đối chiếu mọi lời giải sau
function coCapTong(nums, target) {
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = i + 1; j < nums.length; j += 1) {
      if (nums[i] + nums[j] === target) return true
    }
  }
  return false
}
```

Có nó rồi, câu hỏi tối ưu trở nên cụ thể: *vòng trong đang làm gì?* Nó quét lại mảng để hỏi "có phần tử nào bằng `target - nums[i]` không". Câu hỏi đó là một phép tra cứu — và tra cứu thì có `Set`.

**4. Tìm phần việc bị làm đi làm lại.** Mọi tối ưu về cơ bản chỉ là một câu: *"chỗ nào tôi đang tính lại cái vừa tính?"*

| Bạn thấy | Cách bỏ đi phần lặp |
|---|---|
| Vòng trong quét lại để tìm một giá trị | Bảng băm (nhớ những gì đã gặp) |
| Vòng trong tính lại tổng của một đoạn | Cửa sổ trượt, hoặc mảng cộng dồn |
| So sánh mọi cặp trên dữ liệu đã sắp xếp | Hai con trỏ |
| Gọi đệ quy lặp lại cùng tham số | Ghi nhớ / quy hoạch động |
| Tìm kiếm tuần tự trên dữ liệu đã sắp xếp | Tìm kiếm nhị phân |

Bảng này phủ phần lớn bài tập phỏng vấn. Nó không phải mẹo — nó là danh sách những chỗ mà "tính lại" hay xảy ra.

**5. Code, và đặt tên biến tử tế.** `l`, `r`, `tmp`, `arr2` làm bạn tự tạo lỗi cho chính mình khi bài dài quá 20 dòng. `trai`, `phai`, `daGap` thì đọc lại hiểu ngay.

**6. Chạy lại các ca biên.** Rỗng, một phần tử, hai phần tử, tất cả bằng nhau, đã sắp xếp sẵn, sắp xếp ngược. Đây là nơi lỗi nằm — không phải ở ca ví dụ trong đề.

## Đọc được cái giá trước khi chạy

Ước lượng thô, đủ dùng cho mọi bài phỏng vấn: máy tính hiện đại chạy khoảng **10⁸ phép tính mỗi giây**.

| `n` | Độ phức tạp chịu được |
|---|---|
| ≤ 10 | `O(n!)`, `O(2ⁿ)` |
| ≤ 100 | `O(n³)` |
| ≤ 1.000 | `O(n²)` |
| ≤ 10⁶ | `O(n log n)` |
| ≤ 10⁸ | `O(n)` |

Bảng này dùng ngược lại mới là chỗ hay: **ràng buộc trong đề cho bạn biết đáp án cần có dạng gì.** Đề nói `n ≤ 10⁵` nghĩa là `O(n²)` sẽ quá hạn — nên đừng phí thời gian tối ưu vòng lặp lồng nhau, hãy đi tìm lời giải `O(n log n)` hoặc `O(n)`. Chi tiết về cách đọc độ phức tạp ở [[big-o-doc-va-uoc-luong]].

## Khi bí thật sự

Sau 10 phút không ra hướng nào, thử lần lượt:

- **Sắp xếp đầu vào thử xem.** Rất nhiều bài trở thành hiển nhiên sau khi sắp xếp.
- **Nghĩ ngược từ đáp án.** Nếu tôi đã có đáp án, làm sao kiểm tra nó đúng? Cách kiểm tra đó thường gợi ra cách xây.
- **Giải bài nhỏ hơn.** Giải được cho `n = 2` chưa? Từ `n = k` sang `n = k+1` thì thêm gì? Đó là đường vào của đệ quy và quy hoạch động.
- **Đổi cấu trúc dữ liệu.** Mảng đổi thành bảng băm, thành tập hợp, thành hàng đợi ưu tiên — xem [[chon-sai-cau-truc-du-lieu-la-dat]].

Và một điều thực tế: nếu 25 phút vẫn chưa ra, hãy xem lời giải rồi **tự viết lại từ đầu không nhìn**. Ngồi bí thêm một tiếng ít giá trị hơn hiểu một kỹ thuật mới rồi luyện nó ba lần.

## Ghi nhớ

- Thời gian nghĩ trước khi gõ tiết kiệm nhiều hơn thời gian nó tốn.
- Làm tay một ví dụ nhỏ: cách bạn làm tay thường chính là thuật toán.
- Viết cách chậm trước — nó là mốc đúng để đối chiếu và là điểm khởi đầu để tối ưu.
- Mọi tối ưu đều trả lời một câu hỏi: chỗ nào đang tính lại cái vừa tính?
- Ràng buộc `n` trong đề nói cho bạn biết đáp án phải nhanh cỡ nào.

## Tự kiểm tra

1. Đề nói `n ≤ 200.000`. Lời giải `O(n²)` có chạy kịp không? Bạn cần độ phức tạp nào?
2. Bạn phát hiện vòng lặp trong đang quét lại để tìm một giá trị. Đổi sang cấu trúc nào?
3. Ba ca biên bạn luôn phải thử, dù đề không nhắc tới?
