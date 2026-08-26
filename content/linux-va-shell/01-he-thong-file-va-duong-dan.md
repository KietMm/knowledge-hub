---
title: Hệ thống file và đường dẫn
slug: he-thong-file-va-duong-dan
summary: Cây thư mục Linux, đường dẫn tuyệt đối/tương đối, và bộ lệnh điều hướng dùng hằng ngày.
level: co-ban
tags: [linux, shell, co-ban]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được một đường dẫn bất kỳ và biết ngay nó tuyệt đối hay tương đối, cùng lý do điều đó quan trọng.

## Ý tưởng chính

Linux có **một cây duy nhất**, gốc là `/`. Không có ổ C:, ổ D:. Mọi thứ — ổ cứng thứ hai, USB, thậm chí thông tin về tiến trình đang chạy — đều **được gắn vào một chỗ nào đó trên cây đó**.

Nhớ một câu: *"mọi thứ đều là file, và mọi file đều nằm trên một cây."*

## Mental model

Hãy nghĩ tới **địa chỉ nhà**.

> **Đường dẫn tuyệt đối** = "số 12, đường Lê Lợi, quận 1, TP.HCM". Đưa cho ai cũng tìm được, đứng ở đâu cũng đúng. Bắt đầu bằng `/`.
>
> **Đường dẫn tương đối** = "rẽ trái ở ngã tư rồi đi thêm hai nhà". Chỉ đúng **nếu người nghe đang đứng đúng chỗ bạn tưởng**. Không bắt đầu bằng `/`.

Toàn bộ lỗi "file not found" của người mới đều từ chỗ này: script viết đường dẫn tương đối, rồi được chạy từ một thư mục khác.

## Ví dụ nhỏ

```bash
pwd                 # tôi đang đứng ở đâu?  → /home/an/du-an
ls -la              # có gì ở đây? (-a: cả file ẩn, -l: chi tiết)
cd ../khac          # lùi một cấp rồi vào "khac"
cd                  # về thẳng thư mục nhà (~)
```

## Code chạy thế nào

**Đọc một đường dẫn, từng ký hiệu:**

```text
/etc/nginx/nginx.conf
↑
└─ bắt đầu bằng "/" ⇒ TUYỆT ĐỐI, đọc từ gốc cây

./script.sh      "." = thư mục hiện tại        → TƯƠNG ĐỐI
../du-lieu       ".." = thư mục cha            → TƯƠNG ĐỐI
~/ghi-chu.txt    "~" = thư mục nhà của bạn     → shell đổi thành /home/<bạn>
config.json      không dấu gì ⇒ tương đối, giống ./config.json
```

**Vì sao phải gõ `./script.sh` mà không phải `script.sh`:**

```text
Khi bạn gõ một cái tên trần, shell tìm nó trong PATH:
    /usr/local/bin, /usr/bin, /bin, ...
    và KHÔNG tìm ở thư mục hiện tại.

Vì sao cố ý loại thư mục hiện tại ra?
  Nếu có, ai đó để một file tên `ls` độc hại trong thư mục chung,
  bạn cd vào đó, gõ `ls` ⇒ chạy nhầm file của họ.
```

Nên `./` không phải sự phiền toái — nó là lời khẳng định "tôi cố ý chạy file **ở đây**".

**Cây thư mục — chỗ nào để làm gì:**

```text
/etc      cấu hình của hệ thống và dịch vụ
/var/log  log — chỗ đầu tiên nhìn khi có sự cố
/home     thư mục cá nhân của từng người dùng
/tmp      file tạm, MẤT khi khởi động lại
/usr/bin  chương trình đi kèm hệ điều hành
/opt      phần mềm cài thêm, không thuộc hệ điều hành
/proc     KHÔNG PHẢI file thật — cửa sổ nhìn vào nhân và tiến trình
```

`/proc` là ví dụ rõ nhất của "mọi thứ đều là file": `cat /proc/cpuinfo` không đọc file trên đĩa, nó hỏi nhân về CPU và nhận câu trả lời dưới dạng văn bản.

## Cú pháp

```bash
ls -lh              # -h: kích thước dễ đọc (4.2K thay vì 4300)
ls -lt              # sắp theo thời gian sửa, mới nhất trước
cd -                # quay lại thư mục VỪA rời khỏi

cp nguon dich       # sao chép
cp -r thu-muc dich  # -r: đệ quy, bắt buộc khi copy thư mục
mv cu moi           # di chuyển — CŨNG là cách đổi tên
rm -r thu-muc       # xoá — KHÔNG có thùng rác

mkdir -p a/b/c      # -p: tạo cả các cấp cha còn thiếu
```

**Tìm file:**

```bash
find . -name "*.log"                 # theo tên, từ thư mục hiện tại
find /var/log -name "*.log" -mtime -1  # sửa trong 1 ngày qua
grep -rn "TODO" src/                 # theo NỘI DUNG (-r đệ quy, -n số dòng)
```

Phân biệt gọn: `find` tìm theo **tên/thuộc tính**, `grep` tìm theo **nội dung bên trong**.

## Tại sao cần nó

Vì `rm` không có thùng rác, và vì đường dẫn tương đối trong script là lỗi hay gặp nhất khi triển khai.

```bash
# ❌ Script này chạy đúng trên máy bạn, sai trên máy chủ
cd /Users/an/du-an   # đường dẫn chỉ có ở máy bạn
cat config.json      # đúng nếu chạy từ thư mục dự án, sai nếu chạy từ cron

# ✅ Neo vào vị trí của chính file script
GOC="$(cd "$(dirname "$0")" && pwd)"
cat "$GOC/config.json"
```

`$0` là đường dẫn tới chính script đang chạy, nên `dirname "$0"` cho ra thư mục chứa nó — **bất kể người ta chạy nó từ đâu**.

Và trước mọi lệnh `rm -r`:

```bash
ls thu-muc-can-xoa/   # nhìn tận mắt cái sắp mất
rm -r thu-muc-can-xoa/
```

## So sánh

| | Tuyệt đối | Tương đối |
|---|---|---|
| Bắt đầu bằng | `/` | tên, `.`, `..`, `~` |
| Phụ thuộc thư mục hiện tại | Không | **Có** |
| Dùng trong script/cron/systemd | ✅ nên | ⚠️ chỉ khi đã neo |
| Dùng khi gõ tay | dài dòng | ✅ tiện |

## Dễ nhầm

**1. Dùng đường dẫn tương đối trong script chạy bằng cron.** Cron chạy từ thư mục nhà, không phải thư mục script.

**2. Tưởng `rm` có thùng rác.** Không có. Mất là mất.

**3. Quên dấu ngoặc kép quanh biến:** `rm $duong_dan` với đường dẫn có dấu cách sẽ xoá **nhiều thứ hơn bạn định**. Luôn `"$duong_dan"`.

**4. Nhầm `mv a b/` với `mv a b`.** Có `/` là đưa vào thư mục; không có, và `b` chưa tồn tại, là **đổi tên**.

**5. `cp` thư mục mà quên `-r`.** Báo lỗi — may là lỗi ồn ào.

**6. Để dữ liệu quan trọng ở `/tmp`.** Nó bị dọn.

**7. Nhầm `~` với `/`.** `~` là `/home/<bạn>`, không phải gốc.

**8. Tên file phân biệt hoa thường.** `Config.json` và `config.json` là hai file khác nhau — macOS thường không phân biệt, máy chủ Linux thì có. Đây là nguồn của bug "chạy trên máy tôi mà hỏng trên server".

## Mẹo nhớ

> **Bắt đầu bằng `/` là tuyệt đối — đứng đâu cũng đúng.**
>
> **Script thì dùng tuyệt đối, hoặc neo vào `dirname "$0"`.**
>
> **Luôn bọc biến trong dấu ngoặc kép: `"$x"`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Làm sao nhìn một đường dẫn là biết ngay nó tuyệt đối hay tương đối?
2. Vì sao phải gõ `./script.sh` chứ không phải `script.sh`?
3. `/var/log`, `/etc`, `/tmp` dùng để làm gì?
4. Vì sao script chạy đúng khi bạn gõ tay nhưng sai khi cron chạy?
5. Vì sao phải bọc biến trong `"..."`?

## Tự viết lại

Không nhìn lại, viết lệnh cho từng việc:

```text
① Tìm mọi file .log trong /var/log sửa trong 24 giờ qua
② Tìm mọi file trong src/ có chứa chữ "TODO", kèm số dòng
③ Tạo thư mục bao/2026/08 kể cả khi bao/ chưa tồn tại
④ Đổi tên ghi-chu.txt thành ghi-chu-cu.txt
⑤ Một script biết chắc thư mục của chính nó
```

Tự kiểm: câu ⑤ của bạn còn đúng khi ai đó chạy nó bằng `bash /duong/dan/day/du/script.sh` từ thư mục khác không?

## Thử sức

Một script sao lưu chạy bằng cron mỗi đêm. Nó báo thành công trong log, nhưng thư mục sao lưu **trống rỗng**.

Ba câu để trả lời: nguyên nhân khả dĩ nhất liên quan đến đường dẫn là gì; bạn **kiểm chứng** giả thuyết đó bằng lệnh nào; và sửa script thế nào để lỗi này không lặp lại. Câu khó nhất: vì sao script vẫn **báo thành công** thay vì báo lỗi — và bạn thêm gì để lần sau nó gào lên?
