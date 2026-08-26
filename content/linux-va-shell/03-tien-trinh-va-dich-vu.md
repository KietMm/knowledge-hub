---
title: Tiến trình và dịch vụ
slug: tien-trinh-va-dich-vu
summary: Xem tiến trình đang chạy, gửi tín hiệu, và dùng systemd để dịch vụ tự khởi động lại.
level: trung-cap
tags: [linux, tien-trinh, systemd]
khung: v2
---

> **Sau bài này bạn sẽ:** tìm được tiến trình đang ăn CPU, dừng nó đúng cách, và viết một unit systemd tự khởi động lại.

## Ý tưởng chính

Một **tiến trình** là một chương trình đang chạy, có PID riêng, bộ nhớ riêng, và một người chủ.

Một **dịch vụ** là tiến trình mà bạn muốn nó **luôn chạy** — kể cả sau khi nó sập, kể cả sau khi máy khởi động lại. Việc bảo đảm điều đó không phải việc của bạn; đó là việc của systemd.

## Mental model

Hãy nghĩ tới **nhân viên trong một ca trực**.

> Bạn gõ `node server.js` = thuê một người làm việc, và **bạn đứng canh**. Bạn đi về (đóng SSH) ⇒ người đó nghỉ luôn.
>
> systemd = **người quản lý ca**. Bạn giao việc cho quản lý: "vị trí này phải luôn có người". Ai đó ngã bệnh, quản lý gọi người thay. Toà nhà mất điện rồi có lại, quản lý tự sắp ca.
>
> `kill` = bảo ai đó nghỉ. `kill -9` = **áp giải ra khỏi toà nhà ngay lập tức** — họ không kịp cất đồ, không kịp bàn giao.

Sự khác nhau giữa hai kiểu "bảo nghỉ" đó là nội dung quan trọng nhất của bài này.

## Ví dụ nhỏ

```bash
ps aux | grep node          # tiến trình node nào đang chạy?
top                          # bảng theo dõi thời gian thực (q để thoát)
kill 4821                    # xin tiến trình 4821 dừng lại (SIGTERM)
```

## Code chạy thế nào

**Đọc một dòng `ps aux`:**

```text
USER   PID  %CPU %MEM    VSZ   RSS TTY STAT START TIME COMMAND
app   4821  98.3  2.1 998244 87320 ?   Rl   09:12 4:07 node server.js
       │     │     │           │        │
       │     │     │           │        └─ trạng thái: R chạy, S ngủ,
       │     │     │           │           D chờ I/O, Z xác sống (zombie)
       │     │     │           └─ RSS: RAM THẬT đang chiếm (KB) ← nhìn cái này
       │     │     └─ % RAM
       │     └─ % CPU  (98% — thủ phạm ở đây)
       └─ PID: số để gửi tín hiệu
```

Nhìn `RSS` chứ không `VSZ`: `VSZ` là không gian địa chỉ đã đặt chỗ, thường lớn hơn nhiều RAM thật đang dùng.

**`kill` với `kill -9` — cái gì thực sự khác:**

```text
kill <pid>        gửi SIGTERM (15) = "xin dừng"
  → Chương trình NHẬN được tín hiệu và tự quyết định:
      đóng kết nối CSDL, ghi nốt file, trả request đang xử lý, rồi thoát.

kill -9 <pid>     gửi SIGKILL (9) = nhân giết ngay
  → Chương trình KHÔNG nhận được gì. Không chạy được dòng nào nữa.
      ⇒ transaction dở dang, file ghi một nửa, khoá không được nhả.
```

Quy trình đúng: `kill` → đợi vài giây → `kill -9` **chỉ khi nó không chịu chết**.

```js
// Phía ứng dụng: bắt SIGTERM để thoát sạch
process.on('SIGTERM', async () => {
  server.close()              // ngừng nhận request mới
  await db.disconnect()       // đóng kết nối
  process.exit(0)
})
```

Đây cũng chính là điều xảy ra mỗi lần bạn triển khai phiên bản mới ([[trien-khai-an-toan]]): tiến trình cũ nhận SIGTERM, và nếu nó không xử lý, người dùng đang gọi API sẽ bị ngắt giữa chừng.

## Cú pháp

**Tìm thủ phạm:**

```bash
top -o %CPU              # sắp theo CPU
ps aux --sort=-%mem | head   # 10 tiến trình ăn RAM nhất
lsof -i :3000            # AI đang giữ cổng 3000?  ← lệnh cứu mạng
df -h                    # đĩa còn bao nhiêu?
```

`lsof -i :3000` là lệnh trả lời câu "port already in use" mà không cần đoán.

**systemd unit tối thiểu:**

```ini
# /etc/systemd/system/app.service
[Unit]
Description=Ứng dụng của tôi
After=network.target

[Service]
Type=simple
User=app                       # KHÔNG chạy bằng root
WorkingDirectory=/opt/app
ExecStart=/usr/bin/node /opt/app/server.js   # đường dẫn TUYỆT ĐỐI
Restart=always                 # sập là bật lại
RestartSec=5                   # đợi 5s giữa các lần
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target     # tự chạy khi máy khởi động
```

```bash
sudo systemctl daemon-reload   # sau MỖI lần sửa file unit
sudo systemctl enable --now app
systemctl status app
journalctl -u app -f           # xem log trực tiếp
journalctl -u app --since "1 hour ago"
```

`ExecStart` phải là đường dẫn tuyệt đối vì systemd không dùng `PATH` như shell của bạn ([[he-thong-file-va-duong-dan]]).

## Tại sao cần nó

Vì `nohup node server.js &` **trông như** đã giải quyết vấn đề, nhưng không:

```text
nohup + &            systemd
─────────────────────────────────────────────
sập → chết luôn      sập → tự bật lại
reboot → không chạy  reboot → tự chạy
log → nohup.out      log → journald, có xoay vòng, tìm được theo thời gian
dừng → tự tìm PID    dừng → systemctl stop
chạy bằng ai → bạn   chạy bằng ai → user khai báo rõ
```

`Restart=always` xử lý được **cả một lớp sự cố** mà bạn không cần thức dậy lúc 3 giờ sáng: rò rỉ bộ nhớ, một exception không bắt, một lần mất kết nối CSDL.

Nhưng nó cũng che sự cố. Nên luôn đi kèm cảnh báo: nếu một dịch vụ khởi động lại 20 lần một giờ, đó là **triệu chứng**, không phải giải pháp — và bạn phải biết về nó ([[quan-sat-he-thong]]).

## So sánh

| Tín hiệu | Số | Chương trình bắt được? | Dùng khi |
|---|---|---|---|
| SIGTERM | 15 | ✅ | dừng bình thường (mặc định của `kill`) |
| SIGINT | 2 | ✅ | bạn bấm Ctrl+C |
| SIGHUP | 1 | ✅ | nạp lại cấu hình (Nginx dùng) |
| SIGKILL | 9 | ❌ **không** | phương án cuối |

## Dễ nhầm

**1. `kill -9` như phản xạ đầu tiên.** Dữ liệu dở dang, khoá không nhả.

**2. Ứng dụng không xử lý SIGTERM.** Mỗi lần triển khai là một lần cắt ngang request đang chạy.

**3. `nohup ... &` cho dịch vụ production.** Không sống qua reboot.

**4. Quên `daemon-reload` sau khi sửa unit.** Sửa xong không có tác dụng, và không có thông báo nào.

**5. Đường dẫn tương đối trong `ExecStart`.** systemd không có `PATH` của shell bạn.

**6. `User=root` trong unit.** Không cần thiết trong đa số trường hợp.

**7. Nhìn `VSZ` tưởng là RAM thật.** Nhìn `RSS`.

**8. `Restart=always` mà không cảnh báo.** Sự cố bị che, cho tới khi nó không tự khỏi nữa.

**9. Tưởng tiến trình zombie ăn tài nguyên.** Nó chỉ giữ một ô trong bảng tiến trình; vấn đề thật nằm ở tiến trình **cha** không thu dọn con.

## Mẹo nhớ

> **`kill` là XIN dừng, `kill -9` là GIẾT — mất dữ liệu dở dang.**
>
> **Dịch vụ thật thì dùng systemd, không dùng `nohup &`.**
>
> **Sửa unit xong phải `daemon-reload`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. SIGTERM khác SIGKILL ở điều gì, từ góc nhìn của chương trình?
2. Vì sao ứng dụng nên tự xử lý SIGTERM? Nó làm gì trong đó?
3. `nohup &` thiếu những gì so với systemd?
4. Lệnh nào cho biết ai đang giữ cổng 3000?
5. `Restart=always` giải quyết gì và che giấu gì?

## Tự viết lại

Không nhìn lại, viết một unit systemd cho ứng dụng Python ở `/opt/api`, chạy bằng user `api`, tự bật lại khi sập, tự chạy khi máy khởi động. Rồi viết ba lệnh để: bật nó, xem trạng thái, xem log 30 phút gần nhất.

Tự kiểm: `ExecStart` của bạn là đường dẫn tuyệt đối chứ?

## Thử sức

Cảnh báo: máy chủ CPU 100%, trang web không phản hồi. Bạn vừa SSH vào.

Ba câu để trả lời: **ba lệnh đầu tiên** bạn gõ và thứ tự của chúng; nếu tìm ra một tiến trình ăn 99% CPU, bạn **dừng nó bằng cách nào** và vì sao theo thứ tự đó; và bạn thu thập gì **trước khi** dừng để còn điều tra sau. Câu khó nhất: nếu dịch vụ có `Restart=always`, việc bạn `kill` nó sẽ dẫn tới điều gì — và bạn phải làm gì thay vào đó?
