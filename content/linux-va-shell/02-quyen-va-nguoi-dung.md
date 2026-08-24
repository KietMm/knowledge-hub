---
title: Quyền và người dùng
slug: quyen-va-nguoi-dung
summary: Ba nhóm quyền, ý nghĩa của 755 và 644, và vì sao đừng chạy mọi thứ bằng root.
level: co-ban
tags: [linux, quyen, bao-mat]
---

> **Sau bài này bạn sẽ:** đọc được `-rwxr-xr--` trong một cái nhìn, và đặt quyền đúng cho từng loại file.

## Đọc dòng quyền

```
-rwxr-xr--  1 kiet  staff  4096 Aug 18 10:00 script.sh
│└┬┘└┬┘└┬┘     │      │
│ │  │  └── khác (o): r--  = đọc
│ │  └───── nhóm (g): r-x  = đọc + thực thi
│ └──────── chủ  (u): rwx  = đọc + ghi + thực thi
└────────── loại: - file thường, d thư mục, l liên kết mềm
```

Ba quyền, ba nhóm:

| Ký hiệu | Số | Với file | Với thư mục |
|---|---|---|---|
| `r` | 4 | Đọc nội dung | Liệt kê nội dung |
| `w` | 2 | Sửa nội dung | Tạo/xoá file bên trong |
| `x` | 1 | Chạy được | **Đi vào được** |

Điểm hay gây bối rối: với thư mục, `x` nghĩa là "đi vào được". Thư mục có `r` mà không có `x` thì bạn thấy tên file nhưng không đọc được file nào.

## Số quyền thường dùng

```bash
chmod 755 script.sh    # rwxr-xr-x — chủ toàn quyền, người khác đọc+chạy
chmod 644 config.json  # rw-r--r-- — file thường
chmod 600 ~/.ssh/id_ed25519   # rw------- — CHỈ chủ đọc được
chmod 700 ~/.ssh       # rwx------ — thư mục riêng tư
chmod +x script.sh     # thêm quyền chạy cho tất cả
chmod -R 755 thu-muc/  # đệ quy
```

SSH từ chối làm việc nếu khoá riêng có quyền rộng hơn `600` — đó là tính năng, không phải lỗi.

Mặc định đúng: `644` cho file, `755` cho thư mục và script. **Không bao giờ** `chmod 777` — nó nghĩa là bất kỳ ai trên máy cũng sửa được.

## Chủ sở hữu

```bash
chown kiet:staff file.txt      # đổi chủ và nhóm
chown -R www-data:www-data /var/www
chgrp docker file.txt          # chỉ đổi nhóm
```

Lỗi phổ biến trong Docker: container chạy bằng UID khác với chủ của volume, dẫn tới "Permission denied" khi ghi. Cách xử lý là khớp UID giữa host và container, không phải `chmod 777`.

## sudo và root

```bash
sudo lenh                # chạy một lệnh với quyền root
sudo -u www-data lenh    # chạy dưới danh nghĩa người dùng khác
sudo -i                  # mở shell root (dùng khi thật sự cần)
```

Nguyên tắc: dùng `sudo` cho **một lệnh cụ thể**, không mở hẳn shell root rồi làm mọi việc trong đó. Nhiều sự cố xảy ra vì người ta quên mình đang ở shell root.

Tạo người dùng riêng cho mỗi dịch vụ:

```bash
sudo useradd -r -s /usr/sbin/nologin ung-dung
sudo chown -R ung-dung:ung-dung /opt/ung-dung
```

`-s /usr/sbin/nologin` nghĩa là tài khoản này không đăng nhập tương tác được — nếu ứng dụng bị chiếm quyền, kẻ tấn công không có shell.

## Đặc quyền tối thiểu trong thực tế

- Ứng dụng web chạy dưới người dùng riêng, không phải root.
- Ứng dụng chỉ ghi được vào thư mục dữ liệu của nó, không ghi được vào thư mục mã nguồn.
- Container Docker khai báo `USER` không phải root.
- Tài khoản CSDL của ứng dụng không có quyền `DROP`.

Vì sao quan trọng: nó biến "kẻ tấn công chiếm được ứng dụng" thành "kẻ tấn công chiếm được một tài khoản gần như không làm được gì" thay vì "kẻ tấn công chiếm được cả máy chủ".

## SSH cơ bản

```bash
ssh-keygen -t ed25519 -C "may-lam-viec"     # tạo cặp khoá
ssh-copy-id user@may-chu                    # chép khoá công khai lên
ssh user@may-chu

# ~/.ssh/config — đặt bí danh cho gọn
Host prod
  HostName 10.0.0.5
  User deploy
  IdentityFile ~/.ssh/id_ed25519
```

Trên máy chủ, luôn tắt đăng nhập bằng mật khẩu và tắt đăng nhập root:

```
# /etc/ssh/sshd_config
PasswordAuthentication no
PermitRootLogin no
```

Đây là hai dòng chặn được phần lớn các đợt dò mật khẩu tự động nhắm vào máy chủ công khai.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `chmod 777` để "cho nó chạy" | Ai cũng sửa được file | Đặt đúng chủ sở hữu |
| Chạy ứng dụng bằng root | Bị chiếm quyền là mất cả máy | Người dùng riêng cho dịch vụ |
| Khoá SSH quyền `644` | SSH từ chối dùng khoá | `chmod 600` |
| Ở lâu trong shell root | Lỡ tay là hậu quả lớn | `sudo` từng lệnh |
| Bật đăng nhập mật khẩu qua SSH | Bị dò liên tục | Chỉ dùng khoá |

## Ghi nhớ

- `x` trên thư mục nghĩa là "đi vào được", không phải "chạy được".
- `644` cho file, `755` cho thư mục và script, `600` cho khoá.
- Mỗi dịch vụ một người dùng riêng, không dùng root.
- SSH: chỉ khoá, không mật khẩu, không đăng nhập root.

## Tự kiểm tra

1. `drwxr-x---` nghĩa là gì? Ai làm được gì?
2. Vì sao `chmod 777` gần như luôn sai?
3. Ứng dụng Node cần ghi vào `/var/app/uploads` — đặt quyền và chủ sở hữu thế nào?
