---
title: System call và ranh giới nhân
slug: syscall-va-ranh-gioi-nhan
summary: Chương trình của bạn không tự làm được gì — mọi thứ ra ngoài đều phải qua nhân, và điều đó có giá.
level: trung-cap
tags: [he-dieu-hanh, syscall, hieu-nang, go-loi]
khung: v2
---

> **Sau bài này bạn sẽ:** biết vì sao gộp I/O lại nhanh hơn nhiều, và dùng được `strace` để xem chương trình thật sự làm gì.

## Ý tưởng chính

Chương trình của bạn chạy ở **chế độ người dùng**: nó tính toán được, nhưng **không** tự đọc đĩa, mở socket, hay tạo tiến trình được.

Mọi việc đó phải nhờ **nhân** làm hộ, qua một **system call**. Và mỗi lần nhờ đều có phí.

Hiểu ranh giới này giải thích cả một lớp quyết định về hiệu năng — và cho bạn một công cụ chẩn đoán mạnh khi log im lặng.

## Mental model

Hãy nghĩ tới **làm việc trong một toà nhà có bảo vệ**.

> Trong phòng, bạn muốn làm gì thì làm — viết, tính, sắp xếp giấy tờ. Nhanh, không ai hỏi.
>
> Nhưng muốn **lấy hồ sơ từ kho**, hay **gửi thư ra ngoài**, bạn phải điền phiếu và đưa bảo vệ. Bảo vệ kiểm tra bạn có quyền không, rồi đi làm hộ.
>
> Mỗi lần điền phiếu mất vài phút. Nên người khôn ngoan **gom mười yêu cầu vào một phiếu**, thay vì chạy ra chạy vào mười lần.

Cái phiếu đó là system call. Và "gom vào một phiếu" là toàn bộ lý do buffer tồn tại.

## Ví dụ nhỏ

```bash
strace -c -p 4821        # đếm syscall theo loại
strace -f ./chuong-trinh # xem từng syscall
```

## Code chạy thế nào

**Một syscall diễn ra thế nào:**

```text
① Chương trình đặt số hiệu syscall và tham số vào thanh ghi
② Lệnh đặc biệt (syscall) ⇒ CPU chuyển sang CHẾ ĐỘ NHÂN
③ Nhân kiểm tra quyền và tham số
④ Nhân làm việc
⑤ Trả kết quả, quay về chế độ người dùng

Chi phí: ~100–500 ns cho phần chuyển chế độ
         cộng thời gian nhân thật sự làm việc
         cộng cache CPU bị nguội ([[cache-cpu-va-tinh-cuc-bo]])
```

Con số 100–500 ns nghe nhỏ, cho tới khi bạn gọi nó một triệu lần.

**Vì sao buffer thay đổi mọi thứ:**

```js
// ❌ Mỗi dòng một syscall
for (const dong of trieuDong) fs.writeSync(fd, dong + '\n')
// → 1.000.000 syscall

// ✅ Gom rồi ghi một lần
const buf = trieuDong.join('\n')
fs.writeSync(fd, buf)
// → vài chục syscall
```

```text
Đo thực tế cho loại việc này: chênh nhau 10–50 lần.
Cùng số byte ghi ra, cùng kết quả — chỉ khác số lần "điền phiếu".

Đây là lý do:
  - stdout được đệm, và chỉ xả khi gặp xuống dòng (hoặc khi đầy)
  - thư viện log gom nhiều dòng rồi ghi một lượt
  - CSDL gom nhiều giao dịch rồi fsync một lần
```

Và nó cũng giải thích một hành vi hay gây bối rối: **`console.log` mất khi tiến trình crash**. Dữ liệu còn trong buffer, chưa kịp xả.

**Gộp ở tầng mạng cũng cùng nguyên lý:**

```text
100 truy vấn CSDL riêng lẻ  → 100 round-trip
1 truy vấn với IN (...)      → 1 round-trip

Đây chính là bài toán N+1 nhìn từ góc hệ điều hành:
cái đắt không phải phép tính, mà là số lần VƯỢT RANH GIỚI.
```

## Cú pháp

**`strace` — công cụ trả lời "chương trình đang làm gì" khi log im lặng:**

```bash
strace -c -p <pid>              # thống kê: syscall nào nhiều nhất, tốn nhất
strace -f -e trace=network ./app  # chỉ xem syscall mạng
strace -f -e trace=openat ./app   # nó đang tìm file ở đâu?
strace -T -p <pid>              # kèm thời gian mỗi lời gọi
```

```text
Ba lúc strace cứu bạn:
  ① Tiến trình treo, không log gì
     → đang kẹt ở syscall nào? read? futex? connect?
  ② "File not found" mà không biết nó tìm ở đâu
     → trace=openat cho thấy từng đường dẫn nó thử
  ③ Chậm bất thường mà profiler không chỉ ra
     → -c cho thấy hàng triệu lời gọi write hoặc stat
```

Trên macOS công cụ tương đương là `dtruss`; trong container cần thêm quyền `SYS_PTRACE`.

**Vì sao `strace` làm chương trình chậm hẳn:** nó dừng tiến trình ở **mỗi** syscall để ghi lại. Chậm 10–100 lần là bình thường. Nên dùng nó để **chẩn đoán**, không dùng để đo hiệu năng — và không để chạy lâu trên production.

**epoll — cách một tiến trình phục vụ vạn kết nối:**

```text
Cách ngây thơ: mỗi kết nối một luồng, mỗi luồng gọi read() và CHỜ.
  10.000 kết nối ⇒ 10.000 luồng ⇒ 10 GB stack, và chuyển ngữ cảnh liên tục.

epoll: một syscall hỏi "trong 10.000 fd này, cái nào SẴN SÀNG?"
  ⇒ Một luồng, một lời gọi, danh sách fd có dữ liệu.
  ⇒ Chi phí không tăng theo số kết nối ĐANG CHỜ.
```

Đây là cơ chế bên dưới event loop của Node, của nginx, và của gần như mọi máy chủ hiện đại ([[tien-trinh-va-luong]]).

## Tại sao cần nó

Vì nó cho một quy tắc thiết kế áp dụng được ở mọi tầng:

```text
Cái đắt không phải LƯỢNG dữ liệu, mà là SỐ LẦN vượt ranh giới.

Ranh giới nào cũng vậy:
  ứng dụng ↔ nhân        → gom vào buffer
  ứng dụng ↔ CSDL        → gom truy vấn, tránh N+1
  trình duyệt ↔ máy chủ  → gom request, dùng HTTP/2
  service ↔ service      → gom lời gọi, hoặc gộp API
```

Nhận ra đây là **cùng một bài toán** ở bốn tầng khác nhau là điều đáng mang đi từ bài này.

**Và nó giải thích một số con số vận hành:**

```text
`%sy` (CPU cho nhân) cao bất thường
  ⇒ chương trình đang gọi syscall quá nhiều
  ⇒ strace -c để tìm loại nào

Context switch cao trong `vmstat`
  ⇒ quá nhiều luồng, hoặc quá nhiều syscall chặn
```

## So sánh

| Thao tác | Có phải syscall | Chi phí |
|---|---|---|
| Cộng hai số | ❌ | ~1 ns |
| Cấp phát trong heap | thường ❌ (thư viện tự quản) | ~10 ns |
| `write()` vào file | ✅ | ~1 µs |
| `read()` từ đĩa | ✅ + chờ I/O | ~100 µs |
| Gọi mạng | ✅ + chờ mạng | ~ms |

## Dễ nhầm

**1. Ghi từng dòng một ra file.** Một triệu syscall.

**2. Không hiểu vì sao log mất khi crash.** Còn trong buffer.

**3. Dùng `strace` để đo hiệu năng.** Nó làm chậm 10–100 lần.

**4. Để `strace` chạy lâu trên production.**

**5. Bỏ qua `%sy` cao.** Dấu hiệu gọi syscall quá nhiều.

**6. Mỗi kết nối một luồng ở quy mô lớn.** Đó là lý do epoll ra đời.

**7. Gọi API bên ngoài trong vòng lặp.** Cùng bài toán N+1, ở tầng mạng.

**8. Tin rằng bộ nhớ dùng chung giữa các tiến trình là đơn giản.** Nó cần syscall và cần đồng bộ hoá.

## Mẹo nhớ

> **Mọi việc ra ngoài chương trình đều phải qua NHÂN, và mỗi lần qua đều có phí.**
>
> **Cái đắt là SỐ LẦN vượt ranh giới, không phải lượng dữ liệu.**
>
> **`strace -c` trả lời "chương trình đang làm gì" khi log im lặng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Một system call diễn ra qua mấy bước, tốn gì?
2. Vì sao gộp ghi vào buffer nhanh hơn nhiều lần?
3. Ba tình huống `strace` cứu bạn?
4. epoll giải quyết vấn đề gì?
5. Quy tắc "số lần vượt ranh giới" áp dụng ở những tầng nào?

## Tự viết lại

Không nhìn lại:

```text
① Viết lại một vòng lặp ghi log từng dòng thành phiên bản gom buffer
② Kể ba tầng khác trong hệ thống của bạn có cùng bài toán "quá nhiều lần vượt ranh giới"
③ Lệnh strace để tìm xem một tiến trình đang treo ở đâu
```

Tự kiểm: phiên bản gom buffer ở ① của bạn xử lý thế nào khi tiến trình bị dừng giữa chừng — có mất log không?

## Thử sức

Dịch vụ chậm bất thường. `top` cho thấy `%sy` (CPU cho nhân) là 45%, trong khi `%us` chỉ 12%.

Ba câu để trả lời: con số này gợi ý điều gì; bạn dùng lệnh nào để tìm nguyên nhân và đọc kết quả ra sao; và ba nguyên nhân khả dĩ nhất. Câu khó nhất: nếu `strace -c` cho thấy hàng triệu lời gọi `stat()`, thủ phạm thường là loại mã nào — và vì sao nó hay xuất hiện trong ứng dụng Node?
