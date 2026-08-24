---
title: Hệ thống file và đường dẫn
slug: he-thong-file-va-duong-dan
summary: Cây thư mục Linux, đường dẫn tuyệt đối/tương đối, và bộ lệnh điều hướng dùng hằng ngày.
level: co-ban
tags: [linux, shell, co-ban]
---

> **Sau bài này bạn sẽ:** di chuyển và thao tác file trong terminal mà không phải tra cứu, và biết mỗi thư mục hệ thống chứa gì.

## Cây thư mục

Linux có **một** gốc duy nhất là `/` — không có ổ C:, ổ D:. Thiết bị được "gắn" vào một thư mục nào đó trong cây.

| Thư mục | Chứa gì |
|---|---|
| `/etc` | File cấu hình hệ thống |
| `/var` | Dữ liệu thay đổi: log (`/var/log`), cache |
| `/usr` | Chương trình và thư viện của hệ thống |
| `/usr/local` | Chương trình cài thủ công |
| `/home/ten` | Thư mục cá nhân (viết tắt `~`) |
| `/tmp` | File tạm, xoá khi khởi động lại |
| `/opt` | Phần mềm bên thứ ba |
| `/proc`, `/sys` | Thông tin nhân hệ điều hành dạng file ảo |

`/proc` đáng chú ý: nó không phải file thật trên đĩa mà là giao diện tới nhân. `cat /proc/cpuinfo` hay `cat /proc/meminfo` cho thông tin hệ thống ngay lập tức.

## Đường dẫn

```bash
/etc/nginx/nginx.conf     # tuyệt đối — bắt đầu bằng /
./script.sh               # tương đối — từ thư mục hiện tại
../du-an                  # thư mục cha
~/tai-lieu                # thư mục cá nhân
```

Trong script, luôn dùng đường dẫn tuyệt đối hoặc tính đường dẫn từ vị trí script:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
```

Không có dòng này, script chạy đúng khi bạn đứng trong thư mục của nó và hỏng khi cron gọi từ `/`.

## Lệnh điều hướng và thao tác

```bash
pwd                       # đang ở đâu
cd -                      # quay lại thư mục trước đó
ls -lah                   # dài, có file ẩn, dung lượng dễ đọc
tree -L 2                 # cây thư mục 2 tầng

cp -r nguon/ dich/        # sao chép thư mục
mv cu moi                 # đổi tên hoặc di chuyển
mkdir -p a/b/c            # tạo cả cây, không lỗi nếu đã có
rm -rf thu-muc            # xoá đệ quy — NGUY HIỂM
ln -s /duong/dan lien-ket # liên kết mềm
```

Về `rm -rf`: không có thùng rác. Trước khi gõ, hãy chạy `ls` trên đúng đường dẫn đó để nhìn thấy mình sắp xoá gì. Đặc biệt cẩn thận với biến: `rm -rf "$DIR/"` khi `DIR` rỗng sẽ thành `rm -rf /`.

## Tìm file

```bash
find . -name "*.log"                      # theo tên
find . -type f -mtime -7                  # sửa trong 7 ngày qua
find . -type f -size +100M                # lớn hơn 100MB
find . -name "*.tmp" -delete              # tìm và xoá
find . -name "*.log" -exec gzip {} \;     # chạy lệnh trên từng kết quả

du -sh *                 # dung lượng từng mục
du -h --max-depth=1 | sort -hr | head     # thư mục nào chiếm chỗ nhất
df -h                    # dung lượng còn trống của các phân vùng
```

Bộ ba `du`/`df`/`find -size` là thứ bạn cần khi máy chủ báo hết dung lượng.

## Đọc và lọc nội dung

```bash
cat file.txt              # in cả file
less file.txt             # xem có phân trang (q để thoát, / để tìm)
head -20 / tail -20       # 20 dòng đầu / cuối
tail -f /var/log/app.log  # theo dõi log theo thời gian thực

grep -r "TODO" src/       # tìm đệ quy
grep -n "loi" app.log     # kèm số dòng
grep -i "error" app.log   # không phân biệt hoa thường
grep -v "debug" app.log   # loại bỏ dòng khớp
grep -c "500" access.log  # đếm số dòng khớp
grep -A3 -B3 "panic" log  # kèm 3 dòng trước và sau
```

`tail -f` và `grep -A/-B` là hai thứ dùng nhiều nhất khi tìm nguyên nhân sự cố.

## Đường ống

```bash
cat access.log | grep " 500 " | awk '{print $1}' | sort | uniq -c | sort -rn | head
```

Đọc từ trái sang: lấy log → giữ dòng lỗi 500 → lấy cột đầu (IP) → sắp xếp → đếm trùng → sắp theo số giảm dần → 10 dòng đầu.

Đây là triết lý Unix: mỗi lệnh làm một việc, ghép lại bằng `|` để giải quyết việc lớn. Một dòng thay cho một script phân tích log.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `rm -rf "$DIR/"` với `DIR` rỗng | Xoá từ gốc | Kiểm tra biến trước: `[ -n "$DIR" ]` |
| Đường dẫn tương đối trong cron | Script hỏng khi chạy tự động | Tính từ `BASH_SOURCE` |
| `cat file \| grep x` | Thừa một tiến trình | `grep x file` |
| Quên `-p` khi `mkdir` | Lỗi khi thư mục cha chưa có | `mkdir -p` |
| Chỉnh file trong `/tmp` rồi mong nó còn | Bị xoá khi khởi động lại | Dùng thư mục khác |

## Ghi nhớ

- Một cây duy nhất từ `/`; thiết bị được gắn vào cây đó.
- Trong script, luôn dùng đường dẫn tuyệt đối.
- `rm -rf` không có thùng rác — `ls` trước khi xoá.
- Đường ống ghép các lệnh nhỏ thành công cụ mạnh.

## Tự kiểm tra

1. Viết một lệnh tìm 10 file lớn nhất trong `/var/log`.
2. Vì sao script dùng đường dẫn tương đối hay hỏng khi chạy bằng cron?
3. Đếm số lần mỗi mã trạng thái HTTP xuất hiện trong access.log.
