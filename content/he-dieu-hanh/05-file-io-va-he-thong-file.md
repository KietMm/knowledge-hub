---
title: File, I/O và hệ thống file
slug: file-io-va-he-thong-file
summary: File descriptor, buffer, fsync — và vì sao ghi file "thành công" vẫn có thể mất dữ liệu.
level: trung-cap
tags: [he-dieu-hanh, file, io, du-lieu]
khung: v2
---

> **Sau bài này bạn sẽ:** biết dữ liệu thật sự nằm ở đâu sau lệnh `write`, và vì sao "too many open files" xảy ra.

## Ý tưởng chính

Khi bạn gọi `write()` và nó trả về thành công, dữ liệu **chưa chắc đã nằm trên đĩa**. Nó thường mới nằm trong bộ đệm của hệ điều hành.

Mất điện lúc đó là mất dữ liệu — dù chương trình của bạn đã báo "ghi xong".

Hiểu chuỗi đệm này giải thích cả hiệu năng lẫn độ bền của mọi thứ ghi xuống đĩa.

## Mental model

Hãy nghĩ tới **gửi thư qua bưu điện**.

> Bạn bỏ thư vào **thùng thư trước nhà**. Với bạn, "đã gửi". Nhưng thư vẫn ở đó cho tới khi nhân viên tới lấy.
>
> Rồi nó nằm ở **bưu cục**, chờ chuyến xe. Rồi mới thật sự lên đường.
>
> Nhà cháy lúc thư còn trong thùng ⇒ thư mất, dù bạn đã "gửi".
>
> Muốn chắc chắn thì phải **mang thẳng ra bưu cục và lấy biên nhận** — chậm hơn nhiều, nhưng bạn biết chắc.

Cái biên nhận đó là `fsync()`. Và ba tầng đệm là: bộ đệm của ứng dụng → bộ đệm trang của hệ điều hành → bộ đệm của chính ổ đĩa.

## Ví dụ nhỏ

```text
ứng dụng → buffer ứng dụng → page cache của OS → cache của ổ đĩa → đĩa
                              ↑ write() trả về ở đây
                                                                  ↑ fsync() đợi tới đây
```

## Code chạy thế nào

**File descriptor — mọi thứ đều là một con số:**

```text
Mở file ⇒ nhân trả về một SỐ NGUYÊN, gọi là file descriptor (fd).
Từ đó bạn đọc/ghi bằng con số này, không bằng tên file.

fd 0  stdin
fd 1  stdout
fd 2  stderr
fd 3+ file bạn mở, socket, pipe, kết nối mạng...

⇒ Socket cũng là fd. Kết nối CSDL cũng là fd.
  Đó là lý do "everything is a file" có ý nghĩa thực tế.
```

**"Too many open files" — lỗi phổ biến mà thông báo gây hiểu lầm:**

```bash
ulimit -n                 # giới hạn fd của tiến trình, thường 1024
ls /proc/<pid>/fd | wc -l # tiến trình đang mở bao nhiêu
lsof -p <pid> | head      # mở những gì
```

```text
Thủ phạm hiếm khi là "file". Thường là:
  □ Kết nối CSDL không đóng
  □ HTTP client tạo mới mỗi request, không tái dùng
  □ Stream đọc file quên đóng khi có lỗi giữa chừng
  □ Socket ở trạng thái CLOSE_WAIT vì không đóng phía ứng dụng

⇒ Nâng ulimit chỉ HOÃN vấn đề. Rò rỉ fd vẫn tiếp tục.
```

Đây là loại rò rỉ tăng tuyến tính theo lưu lượng — nên nó luôn nổ vào giờ cao điểm, không nổ lúc bạn đang xem.

**Ba mức độ bền, và cái giá của mỗi mức:**

```text
① write()            → vào page cache của OS.  ~µs
   Ứng dụng crash: dữ liệu VẪN AN TOÀN (OS giữ).
   Mất điện:        MẤT.

② fsync()            → ép xuống đĩa.  ~1–10 ms
   Mất điện:        an toàn.

③ fsync() + đĩa không nói dối
   Một số ổ báo "xong" khi mới vào cache của chính nó.
   Máy chủ nghiêm túc dùng ổ có tụ bảo vệ hoặc tắt cache ghi.
```

```text
Chênh lệch giữa ① và ② là ~1000 lần.
Đó là lý do CSDL không fsync mỗi lần ghi, mà gom nhiều giao dịch
lại rồi fsync một lần — và vì sao `synchronous_commit = off`
làm Postgres nhanh hơn nhiều nhưng đánh đổi độ bền
([[transaction-va-acid]]).
```

## Cú pháp

**Ghi file an toàn — mẫu ghi tạm rồi đổi tên:**

```js
// ❌ Ghi đè trực tiếp: crash giữa chừng ⇒ file hỏng, mất cả bản cũ
await fs.writeFile('config.json', duLieu)

// ✅ Ghi file tạm cùng thư mục → fsync → rename
const tam = 'config.json.tmp'
const fd = await fs.open(tam, 'w')
await fd.writeFile(duLieu)
await fd.sync()                    // ép xuống đĩa TRƯỚC khi đổi tên
await fd.close()
await fs.rename(tam, 'config.json')  // rename là NGUYÊN TỬ trên cùng hệ thống file
```

```text
Vì sao mẫu này đúng:
  rename() nguyên tử ⇒ người đọc thấy HOẶC file cũ HOẶC file mới,
  không bao giờ thấy file dở dang.

Hai điều kiện dễ quên:
  ① File tạm phải nằm CÙNG hệ thống file (rename qua thiết bị khác
     không nguyên tử — nó là copy + delete)
  ② Phải fsync TRƯỚC rename, không thì nội dung mới có thể
     chưa xuống đĩa khi tên đã đổi
```

**Đọc file lớn — stream, đừng nạp cả file:**

```js
// ❌ File 2 GB ⇒ 2 GB RAM ⇒ có thể OOM
const noiDung = await fs.readFile('lon.log', 'utf8')

// ✅ Xử lý theo dòng, RAM không đổi theo kích thước file
const rl = readline.createInterface({ input: fs.createReadStream('lon.log') })
for await (const dong of rl) xuLy(dong)
```

**Đường dẫn, hard link và symlink:**

```text
INODE   bản ghi thật của file: quyền, kích thước, vị trí dữ liệu
TÊN     chỉ là một mục trong thư mục, TRỎ tới inode

⇒ Một inode có nhiều tên (hard link).
⇒ Xoá file = xoá một tên. Dữ liệu chỉ mất khi
  KHÔNG còn tên nào VÀ không tiến trình nào đang mở nó.

⇒ Đây là lý do `rm` một file log đang được ghi KHÔNG giải phóng đĩa:
  tên mất rồi, nhưng tiến trình vẫn giữ fd.
  `df` thấy đầy, `du` cộng lại thì không.  Xem bằng `lsof +L1`.
```

## Tại sao cần nó

Vì bốn sự cố vận hành đều bắt nguồn từ đây:

```text
① "Too many open files"        → rò rỉ fd
② File cấu hình hỏng sau crash → ghi đè trực tiếp thay vì rename
③ df đầy mà du không khớp      → file đã xoá, tiến trình còn giữ
④ Mất dữ liệu sau khi mất điện → không fsync
```

**Đĩa đầy — hai loại, triệu chứng giống nhau:**

```bash
df -h    # hết DUNG LƯỢNG
df -i    # hết INODE — nhiều file nhỏ (session, cache, mail queue)
```

Hết inode cho ra đúng thông báo "No space left on device" trong khi `df -h` báo còn trống nhiều — một trong những thông báo lỗi gây hiểu lầm nhất ([[go-loi-tren-may-chu]]).

**I/O chặn và không chặn:**

```text
Đọc file bằng API ĐỒNG BỘ trong Node chặn TOÀN BỘ event loop.
`fs.readFileSync` chấp nhận được lúc khởi động; trong request thì không.

Và ngay cả API bất đồng bộ của Node cũng chạy trên một pool luồng
mặc định 4 luồng (UV_THREADPOOL_SIZE) — nên nhiều thao tác file
song song vẫn có thể xếp hàng.
```

## So sánh

| | `write()` | `fsync()` | `O_DIRECT` |
|---|---|---|---|
| Độ trễ | ~µs | ~ms | ~ms |
| An toàn khi app crash | ✅ | ✅ | ✅ |
| An toàn khi mất điện | ❌ | ✅ | ✅ |
| Qua page cache | ✅ | ✅ | ❌ bỏ qua |
| Dùng cho | ghi thông thường | CSDL, file quan trọng | CSDL tự quản đệm |

## Dễ nhầm

**1. Tin rằng `write()` thành công là dữ liệu đã trên đĩa.**

**2. Ghi đè file cấu hình trực tiếp.** Crash giữa chừng là mất cả bản cũ.

**3. `rename` file tạm nằm ở hệ thống file khác.** Không nguyên tử.

**4. Quên `fsync` trước `rename`.**

**5. Không đóng fd khi có lỗi.** Rò rỉ — dùng `finally` hoặc `using`.

**6. Nâng `ulimit` thay vì sửa rò rỉ.** Chỉ hoãn.

**7. `readFile` cho file lớn.** OOM.

**8. Quên `df -i`.** Hết inode báo lỗi như hết dung lượng.

**9. Tưởng `rm` file đang mở là giải phóng đĩa ngay.**

**10. Dùng API đồng bộ trong request handler.** Chặn event loop.

## Mẹo nhớ

> **`write()` xong ≠ đã lên đĩa. Cần `fsync()` mới chắc.**
>
> **Ghi file quan trọng: ghi TẠM → fsync → RENAME. Rename là nguyên tử.**
>
> **"Too many open files" gần như luôn là rò rỉ kết nối, không phải file.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Sau `write()` thành công, dữ liệu nằm ở đâu?
2. Ba tầng đệm giữa ứng dụng và đĩa?
3. Mẫu ghi file an toàn gồm mấy bước, hai điều kiện dễ quên là gì?
4. Vì sao `rm` file log đang ghi không giải phóng đĩa?
5. Hết inode khác hết dung lượng thế nào, và vì sao dễ nhầm?

## Tự viết lại

Không nhìn lại, viết:

```text
① Hàm ghi file cấu hình an toàn, không mất dữ liệu khi crash
② Hàm đọc và xử lý file log 5 GB mà không tăng RAM
③ Ba lệnh chẩn đoán "too many open files"
④ Hai lệnh phân biệt hết dung lượng với hết inode
```

Tự kiểm: hàm ① của bạn có đóng fd khi bước ghi ném lỗi giữa chừng không?

## Thử sức

Dịch vụ chạy ổn định vài giờ rồi bắt đầu báo `EMFILE: too many open files`, và phải restart mới hết.

Ba câu để trả lời: đây là loại vấn đề gì, và vì sao nó **xuất hiện sau vài giờ**; ba lệnh bạn chạy để tìm thủ phạm; và vì sao nâng `ulimit` không phải cách sửa. Câu khó nhất: nếu `lsof` cho thấy hàng nghìn socket ở trạng thái `CLOSE_WAIT`, điều đó chỉ ra lỗi ở phía nào — bạn hay đối tác — và vì sao?
