---
title: Gỡ lỗi trên máy chủ
slug: go-loi-tren-may-chu
summary: Quy trình chẩn đoán khi hệ thống có sự cố — từ triệu chứng tới nguyên nhân, theo thứ tự.
level: nang-cao
tags: [linux, go-loi, van-hanh]
---

> **Sau bài này bạn sẽ:** có một quy trình cố định để chạy khi "trang web không vào được", thay vì thử ngẫu nhiên.

## Nguyên tắc

Khi đang có sự cố, cám dỗ lớn nhất là khởi động lại mọi thứ. Đôi khi nó hiệu quả — và bạn mất luôn manh mối, để rồi sự cố lặp lại tuần sau.

Quy trình đúng: **thu thập trước, sửa sau**. Trừ khi hệ thống đang chết hẳn, hãy dành hai phút chụp lại trạng thái.

## Bước 1: Xác định phạm vi

```bash
curl -I https://site.com                    # site có phản hồi không
curl -I http://localhost:3000               # ứng dụng có sống không
systemctl status ung-dung nginx postgresql  # dịch vụ nào đang chạy
```

Câu hỏi cần trả lời ngay: hỏng toàn bộ hay một phần? Mọi người dùng hay một nhóm? Bắt đầu từ khi nào? Có gì thay đổi ngay trước đó không (deploy, đổi cấu hình, tăng lưu lượng)?

Câu cuối quan trọng nhất — phần lớn sự cố có nguyên nhân là một thay đổi vừa xảy ra.

## Bước 2: Bốn tài nguyên

```bash
df -h                    # ĐĨA — hết dung lượng gây lỗi rất kỳ quặc
free -h                  # BỘ NHỚ
uptime                   # CPU (tải trung bình)
ss -s                    # KẾT NỐI mạng
```

Hết dung lượng đĩa là nguyên nhân bị xem nhẹ nhất. Nó khiến CSDL không ghi được, log không ghi được, session không lưu được — mỗi thứ báo một lỗi khác nhau, không cái nào nói "hết đĩa".

```bash
du -h --max-depth=1 /var | sort -hr | head    # thường là /var/log
journalctl --vacuum-size=500M                 # dọn log systemd
```

Tải trung bình đọc theo số nhân CPU: `4.0` trên máy 4 nhân là đầy tải nhưng bình thường; trên máy 1 nhân là quá tải nặng.

## Bước 3: Log

```bash
journalctl -u ung-dung --since "30 min ago" -p err
tail -100 /var/log/nginx/error.log
grep -c " 500 " /var/log/nginx/access.log

# 10 IP gọi nhiều nhất trong giờ qua — phát hiện bot/tấn công
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head
```

Đọc log theo thời gian: tìm **thông báo lỗi đầu tiên**, không phải cái mới nhất. Lỗi mới nhất thường là hệ quả dây chuyền; lỗi đầu tiên mới là nguyên nhân.

## Bước 4: Tiến trình và kết nối

```bash
ps aux --sort=-%mem | head       # ngốn bộ nhớ nhất
ps aux --sort=-%cpu | head       # ngốn CPU nhất
ss -tn state established | wc -l # số kết nối đang mở
lsof -p PID | wc -l              # số file descriptor tiến trình đang giữ
```

Hết file descriptor cho lỗi `EMFILE: too many open files` — thường do rò rỉ kết nối không đóng. Kiểm tra giới hạn bằng `ulimit -n`.

## Bước 5: Cơ sở dữ liệu

```sql
-- Truy vấn đang chạy lâu
SELECT pid, now() - query_start AS thoi_gian, state, query
FROM pg_stat_activity
WHERE state != 'idle' AND now() - query_start > interval '5 seconds'
ORDER BY thoi_gian DESC;

-- Đang bị khoá chờ nhau
SELECT * FROM pg_locks WHERE NOT granted;

-- Số kết nối theo trạng thái
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

Nhiều dòng `idle in transaction` là dấu hiệu ứng dụng mở transaction rồi quên đóng — nó giữ khoá và làm nghẽn mọi thứ khác.

## Bước 6: Mạng và DNS

```bash
dig site.com +short              # DNS trỏ đúng chưa
curl -v https://site.com 2>&1 | head -30    # xem toàn bộ quá trình bắt tay
openssl s_client -connect site.com:443 -servername site.com | openssl x509 -noout -dates
```

Chứng chỉ TLS hết hạn là nguyên nhân kinh điển của "sáng nay tự nhiên không vào được". Hãy đặt cảnh báo trước 14 ngày, đừng chờ nó xảy ra.

## Bảng triệu chứng — nguyên nhân

| Triệu chứng | Nghi ngờ đầu tiên |
|---|---|
| 502 Bad Gateway | Ứng dụng chết hoặc chưa lắng nghe cổng |
| 504 Gateway Timeout | Ứng dụng chậm; truy vấn treo |
| Chậm đều mọi endpoint | CSDL, hoặc thiếu bộ nhớ gây swap |
| Chậm một endpoint | Truy vấn thiếu index |
| Lỗi ngẫu nhiên | Một instance hỏng trong nhóm cân bằng tải |
| Chết định kỳ | Rò rỉ bộ nhớ, hoặc cron job nặng |
| Tiến trình biến mất | OOM killer — kiểm tra `dmesg` |
| Lỗi kỳ quặc khắp nơi | Hết dung lượng đĩa |

## Sau khi xử lý xong

Viết một bản rà soát ngắn, **không đổ lỗi cá nhân**:

1. Điều gì đã xảy ra (mốc thời gian cụ thể).
2. Vì sao xảy ra (nguyên nhân gốc, không phải "ai làm").
3. Vì sao không phát hiện sớm hơn.
4. Việc cần làm để lần sau tự phát hiện hoặc không tái diễn.

Điểm 3 thường có giá trị nhất: nó dẫn tới cảnh báo mới, và cảnh báo tốt biến sự cố lớn thành phiền toái nhỏ.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Khởi động lại trước khi xem log | Mất manh mối, sự cố tái diễn | Thu thập trước |
| Đọc lỗi mới nhất | Chỉ thấy hệ quả | Tìm lỗi đầu tiên |
| Bỏ qua `df -h` | Bỏ sót nguyên nhân đơn giản nhất | Kiểm tra bốn tài nguyên trước |
| Sửa xong là xong | Lặp lại sau vài tuần | Viết rà soát, thêm cảnh báo |
| Không có cảnh báo hạn TLS | Sập vào một sáng đẹp trời | Cảnh báo trước 14 ngày |

## Ghi nhớ

- Thu thập trước, sửa sau.
- Bốn tài nguyên: đĩa, bộ nhớ, CPU, kết nối — kiểm tra theo thứ tự đó.
- Lỗi đầu tiên trong log là nguyên nhân; lỗi cuối là hệ quả.
- Rà soát sau sự cố quan trọng ngang việc khắc phục.

## Tự kiểm tra

1. "Trang không vào được" — năm lệnh đầu tiên bạn chạy là gì, theo thứ tự nào?
2. Vì sao hết dung lượng đĩa lại gây ra đủ loại lỗi không liên quan?
3. `idle in transaction` trong `pg_stat_activity` nói lên điều gì về ứng dụng?
