---
title: Cách tiếp cận một bài thuật toán
slug: cach-tiep-can-mot-bai-thuat-toan
summary: Quy trình sáu bước từ lúc đọc đề tới lúc code chạy đúng, và vì sao viết cách chậm trước lại tiết kiệm thời gian.
level: co-ban
tags: [thuat-toan, tu-duy, phong-van]
khung: v2
---

> **Sau bài này bạn sẽ:** có một quy trình để bám vào khi nhìn đề mà chưa nghĩ ra gì, thay vì ngồi im chờ ý tưởng loé lên.

## Ý tưởng chính

Người mới thất bại ở chỗ không ai ngờ: **họ bắt đầu gõ code quá sớm**. Đọc đề, thấy quen quen, gõ luôn. Được nửa chừng phát hiện hiểu sai đề, xoá đi làm lại.

Người giải nhiều làm ngược lại: họ dành phần lớn thời gian **trước** khi gõ dòng đầu tiên. Và điều họ làm trong lúc đó không phải "nghĩ ra thuật toán" — mà là một quy trình rất cụ thể.

## Mental model

Hãy nghĩ tới cách một thợ sửa xe làm việc.

> Anh ta không mở nắp máy rồi vặn thử từng con ốc. Anh ta **hỏi xe kêu lúc nào**, **chạy thử một đoạn**, rồi mới khoanh vùng và mở đúng chỗ.
>
> Người mới thì mở nắp máy ngay — vì đó là phần trông giống "đang sửa xe" nhất.

Gõ code là mở nắp máy. Đọc kỹ đề và làm tay một ví dụ là chạy thử một đoạn. Cái thứ hai trông như chưa làm gì, nhưng nó quyết định bạn mở đúng chỗ hay sai chỗ.

## Ví dụ nhỏ

Đề: *"cho mảng, tìm hai số có tổng bằng target, trả về chỉ số"*.

Làm tay với `nums = [2, 7, 11]`, `target = 9`:

```text
đứng ở 2  → tôi cần thêm 7. Đã gặp 7 chưa? chưa → nhớ là "đã gặp 2"
đứng ở 7  → tôi cần thêm 2. Đã gặp 2 chưa? RỒI → xong
```

Để ý câu bạn vừa tự hỏi: *"đã gặp X chưa?"* Đó **chính là** thuật toán — và nó nói thẳng rằng bạn cần một cấu trúc trả lời nhanh câu hỏi đó, tức bảng băm. Bạn không "nghĩ ra" bảng băm; bạn phát hiện ra mình đang cần nó.

## Tại sao cần nó

Vì không có quy trình, bạn chỉ có hai trạng thái: *"biết làm ngay"* hoặc *"bí hoàn toàn"*. Quy trình lấp khoảng giữa.

**Sáu bước:**

**1. Đọc đề hai lần, lần hai tìm cái bẫy.** Đầu vào có thể rỗng không? Có số âm không? Có phần tử trùng không? Dữ liệu đã sắp xếp chưa? Đáp án có duy nhất không? Mỗi câu trả lời "có" là một ca test bạn sẽ phải qua — và người ra đề luôn nhét ít nhất một cái vào.

**2. Làm tay một ví dụ nhỏ.** Như trên. Cách bạn làm tay chính là thuật toán.

**3. Viết cách chậm nhất trước.** `O(n²)` cũng được:

```ts
// Đúng, chậm, và là MỐC để đối chiếu mọi lời giải sau
for (let i = 0; i < nums.length; i++)
  for (let j = i + 1; j < nums.length; j++)
    if (nums[i] + nums[j] === target) return [i, j]
```

Bước này cho bạn ba thứ: một lời giải **đúng** để so, hiểu biết cụ thể về cấu trúc bài, và điểm khởi đầu để tối ưu. Nhảy thẳng vào lời giải tối ưu khi chưa hiểu bài là cách nhanh nhất để viết ra một đoạn sai mà trông rất thông minh.

**4. Tìm phần việc bị làm đi làm lại.** Mọi tối ưu đều trả lời một câu: *"chỗ nào tôi đang tính lại cái vừa tính?"*

| Bạn thấy | Cách bỏ phần lặp |
|---|---|
| Vòng trong quét lại để tìm một giá trị | Bảng băm — [[dem-va-bang-bam-trong-giai-bai]] |
| Vòng trong tính lại tổng một đoạn | Cửa sổ trượt, mảng cộng dồn — [[cua-so-truot]] |
| So mọi cặp trên dữ liệu đã sắp xếp | Hai con trỏ — [[hai-con-tro]] |
| Gọi đệ quy lặp lại cùng tham số | Ghi nhớ / quy hoạch động — [[quy-hoach-dong]] |
| Tìm tuần tự trên dữ liệu đã sắp xếp | Tìm kiếm nhị phân — [[sap-xep-va-tim-kiem-nhi-phan]] |

Bảng này phủ phần lớn bài phỏng vấn. Nó không phải mẹo — nó là danh sách những chỗ "tính lại" hay xảy ra.

**5. Code, và đặt tên tử tế.** `l`, `r`, `tmp` làm bạn tự tạo lỗi khi bài dài quá 20 dòng.

**6. Chạy lại các ca biên.** Rỗng, một phần tử, hai phần tử, tất cả bằng nhau, đã sắp sẵn, sắp ngược. Lỗi nằm ở đây, không nằm ở ca ví dụ trong đề.

## So sánh

Ràng buộc `n` trong đề **nói thẳng cho bạn biết lời giải phải nhanh cỡ nào**. Máy chạy khoảng `10⁸` phép tính mỗi giây:

| `n` | Độ phức tạp chịu được |
|---|---|
| ≤ 10 | `O(n!)`, `O(2ⁿ)` |
| ≤ 100 | `O(n³)` |
| ≤ 1.000 | `O(n²)` |
| ≤ 10⁶ | `O(n log n)` |
| ≤ 10⁸ | `O(n)` |

Dùng ngược lại mới là chỗ hay: thấy `n ≤ 10⁵` là biết `O(n²)` sẽ quá hạn ⇒ đừng phí thời gian tối ưu vòng lặp lồng nhau, hãy đi tìm `O(n log n)` hoặc `O(n)`. Cách đọc các ký hiệu ở [[big-o-doc-va-uoc-luong]].

## Dễ nhầm

**1. Bỏ qua bước viết cách chậm.** Đây là bước bị bỏ nhiều nhất và tốn kém nhất. Không có mốc đúng để đối chiếu, bạn không biết lời giải "tối ưu" của mình sai ở đâu.

**2. Đọc đề một lần rồi code.** Phần lớn thời gian mất đi không phải vì thuật toán khó, mà vì hiểu sai một chi tiết ở dòng thứ ba của đề.

**3. Tối ưu trước khi có lời giải đúng.** Đúng trước, nhanh sau — thứ tự này không đảo được.

**4. Ngồi bí quá lâu.** Sau 25 phút không ra, xem lời giải rồi **tự viết lại từ đầu không nhìn**. Ngồi thêm một tiếng ít giá trị hơn hiểu một kỹ thuật mới rồi luyện nó ba lần.

**5. Quên rằng chọn cấu trúc dữ liệu là một phần của lời giải.** Rất nhiều bài "khó" trở thành dễ ngay khi đổi chỗ chứa — xem [[chon-sai-cau-truc-du-lieu-la-dat]].

## Mẹo nhớ

> **Cách bạn làm tay chính là thuật toán.**
>
> **Mọi tối ưu trả lời một câu: chỗ nào đang tính lại cái vừa tính?**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao viết cách chậm trước lại **tiết kiệm** thời gian?
2. Bước "làm tay một ví dụ" cho bạn thứ gì mà đọc đề không cho?
3. Đề nói `n ≤ 200.000` — lời giải `O(n²)` có kịp không? Bạn cần độ phức tạp nào?
4. Bạn thấy vòng trong đang `includes()` để tìm một giá trị. Đổi sang kỹ thuật nào?
5. Ba ca biên bạn luôn phải thử dù đề không nhắc?

## Tự viết lại

Không nhìn lại phần trên, áp sáu bước vào đề sau — **chỉ viết ra bước 1 đến 4**, chưa cần code:

> *"Cho một chuỗi, trả về ký tự đầu tiên không lặp lại. Không có thì trả về null."*

Tự kiểm: bước 4 của bạn chỉ ra phần việc nào đang bị làm đi làm lại?

## Thử sức

Bạn được 20 phút cho đề này trong phỏng vấn:

> *"Cho mảng đã sắp xếp và một số target, tìm hai số có tổng bằng target."*

Trước khi nghĩ tới lời giải, hãy liệt kê **mọi câu hỏi làm rõ đề** bạn sẽ hỏi người phỏng vấn. Gợi ý: có ít nhất năm câu, và một trong số đó thay đổi hoàn toàn lời giải.
