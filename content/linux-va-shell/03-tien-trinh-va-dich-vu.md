---
title: Tiến trình và dịch vụ
slug: tien-trinh-va-dich-vu
summary: Xem tiến trình đang chạy, gửi tín hiệu, và dùng systemd để dịch vụ tự khởi động lại.
level: trung-cap
tags: [linux, tien-trinh, systemd]
---

> **Sau bài này bạn sẽ:** tìm được tiến trình đang ngốn CPU và xử lý nó, và viết được một unit systemd hoàn chỉnh.

## Xem tiến trình

```bash
ps aux                        # tất cả tiến trình
ps aux | grep node            # lọc theo tên
top                           # theo dõi thời gian thực
htop                          # bản dễ dùng hơn, có màu
pgrep -af node                # tìm PID kèm dòng lệnh đầy đủ
```

Đọc `ps aux`: cột `%CPU`, `%MEM`, `VSZ` (bộ nhớ ảo), `RSS` (bộ nhớ vật lý thực dùng), `STAT` (trạng thái), `COMMAND`.

`RSS` là con số đáng quan tâm khi tìm rò rỉ bộ nhớ; `VSZ` thường lớn một cách vô hại.

## Tín hiệu

```bash
kill PID                # gửi SIGTERM (15) — đề nghị dừng tử tế
kill -9 PID             # SIGKILL — cưỡng chế, KHÔNG dọn dẹp được
kill -HUP PID           # nạp lại cấu hình (nhiều dịch vụ hỗ trợ)
pkill -f "node server"  # theo mẫu dòng lệnh
```

Luôn thử `SIGTERM` trước. Ứng dụng viết đúng sẽ bắt tín hiệu này để đóng kết nối, hoàn tất request đang xử lý, rồi mới thoát:

```ts
process.on('SIGTERM', async () => {
  server.close()                      // ngừng nhận request mới
  await hoanTatCacRequestDangChay()
  await db.$disconnect()
  process.exit(0)
})
```

`kill -9` không thể bắt được — dùng nó nghĩa là chấp nhận mất dữ liệu đang xử lý dở. Đây cũng là lý do container cần xử lý tín hiệu đúng: Docker gửi `SIGTERM` rồi `SIGKILL` sau 10 giây.

## Cổng và kết nối mạng

```bash
ss -tlnp                      # cổng đang lắng nghe kèm tiến trình
lsof -i :3000                 # ai đang giữ cổng 3000
curl -I http://localhost:3000 # kiểm tra dịch vụ có phản hồi không
```

`ss -tlnp` là lệnh đầu tiên nên chạy khi gặp lỗi "port already in use".

## systemd

Dịch vụ chạy nền phải do hệ thống quản lý, không phải `nohup ... &`. systemd lo việc khởi động lại khi lỗi, chạy lại sau khi reboot, và gom log.

```ini
# /etc/systemd/system/ung-dung.service
[Unit]
Description=Ứng dụng Knowledge Hub
After=network.target postgresql.service

[Service]
Type=simple
User=ung-dung
WorkingDirectory=/opt/ung-dung
Environment=NODE_ENV=production
EnvironmentFile=/etc/ung-dung/env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

# Giới hạn quyền: dịch vụ bị chiếm cũng không đụng được hệ thống
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/ung-dung/data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ung-dung
sudo systemctl status ung-dung
sudo systemctl restart ung-dung
sudo journalctl -u ung-dung -f          # xem log theo thời gian thực
sudo journalctl -u ung-dung --since "1 hour ago"
```

Bốn dòng `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem`, `ReadWritePaths` là cách rẻ nhất để giới hạn thiệt hại nếu ứng dụng bị chiếm quyền — hãy thêm chúng ngay từ đầu.

## Cron và systemd timer

```bash
crontab -e

# phút giờ ngày tháng thứ  lệnh
0 2 * * *  /opt/scripts/sao-luu.sh >> /var/log/sao-luu.log 2>&1
*/15 * * * * /opt/scripts/kiem-tra.sh
```

Ba lưu ý về cron: nó chạy với **môi trường tối thiểu** (`PATH` rất ngắn, không có biến từ `.bashrc`), thư mục hiện tại không xác định, và mọi lỗi đi vào email hệ thống nếu bạn không chuyển hướng.

Vì vậy trong script cron: dùng đường dẫn tuyệt đối, tự nạp biến môi trường, và luôn chuyển hướng output vào file log.

systemd timer là lựa chọn hiện đại hơn: có log tập trung, chạy bù khi máy vừa bật (`Persistent=true`), và phụ thuộc được vào dịch vụ khác.

## Tài nguyên hệ thống

```bash
free -h                  # bộ nhớ
uptime                   # tải trung bình 1/5/15 phút
vmstat 1                 # thống kê theo giây
iostat -x 1              # I/O đĩa
dmesg -T | tail -50      # thông báo nhân — nơi ghi khi tiến trình bị OOM killer giết
```

Nếu ứng dụng "tự nhiên chết" mà log không có gì, hãy xem `dmesg`: rất có thể nhân đã giết nó vì hết bộ nhớ.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `kill -9` làm mặc định | Mất dữ liệu đang xử lý | `SIGTERM` trước |
| `nohup app &` cho production | Không tự chạy lại, mất log | systemd |
| Cron không có đường dẫn tuyệt đối | Chạy tay được, cron thì hỏng | Dùng đường dẫn đầy đủ |
| Không xử lý `SIGTERM` trong app | Request bị cắt giữa chừng khi deploy | Đóng máy chủ tử tế |
| Không có `Restart=always` | Dịch vụ chết là chết luôn | Thêm vào unit |

## Ghi nhớ

- `SIGTERM` để dừng tử tế; `SIGKILL` là biện pháp cuối.
- systemd cho mọi dịch vụ chạy nền, kèm các tuỳ chọn giới hạn quyền.
- Cron có môi trường tối thiểu — luôn dùng đường dẫn tuyệt đối.
- `dmesg` là nơi tìm khi tiến trình biến mất không dấu vết.

## Tự kiểm tra

1. Vì sao ứng dụng cần bắt `SIGTERM` khi chạy trong container?
2. Script chạy tay được nhưng cron thì hỏng — ba nguyên nhân thường gặp?
3. Viết unit systemd cho ứng dụng Node có tự khởi động lại và giới hạn quyền ghi.
