---
title: Gỡ lỗi trên máy chủ
slug: go-loi-tren-may-chu
summary: Quy trình chẩn đoán khi hệ thống có sự cố — từ triệu chứng tới nguyên nhân, theo thứ tự.
level: nang-cao
tags: [linux, go-loi, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** có một quy trình cố định để chạy khi sự cố xảy ra, thay vì gõ lệnh theo linh cảm.

## Ý tưởng chính

Lúc sự cố, thứ hỏng đầu tiên không phải hệ thống — mà là **khả năng suy nghĩ có thứ tự** của bạn.

Nên thứ cần chuẩn bị trước không phải là danh sách lệnh, mà là một **quy trình**: kiểm tra theo thứ tự cố định, ghi lại kết quả, thu hẹp dần. Quy trình tồn tại chính vì lúc 3 giờ sáng bạn không sáng suốt.

## Mental model

Hãy nghĩ tới **bác sĩ cấp cứu**.

> Bệnh nhân vào, bác sĩ không đoán bệnh ngay. Họ chạy đúng một trình tự, **luôn luôn cùng một trình tự**: đường thở → hô hấp → tuần hoàn.
>
> Không phải vì đường thở hay hỏng nhất, mà vì **nếu nó hỏng thì mọi chẩn đoán khác đều vô nghĩa** — và vì trình tự cố định thì không ai bỏ sót bước nào khi đang cuống.

Bốn tài nguyên của máy chủ — **đĩa, RAM, CPU, mạng** — là "đường thở, hô hấp, tuần hoàn" của bạn. Kiểm tra chúng trước, luôn theo thứ tự đó, trước khi đọc bất kỳ dòng log nào.

## Ví dụ nhỏ

```bash
df -h        # ① Đĩa còn chỗ không?     ← kiểm tra đầu tiên, luôn luôn
free -h      # ② RAM còn không?
uptime       # ③ Tải trung bình
journalctl -u app --since "30 min ago" | tail -50   # ④ Log
```

## Code chạy thế nào

**Vì sao `df -h` là lệnh đầu tiên, không phải lệnh cuối:**

```text
Đĩa đầy gây ra triệu chứng KHÔNG GIỐNG "đĩa đầy":
  → CSDL từ chối ghi     ⇒ "lỗi kết nối database"
  → Log không ghi được   ⇒ log im lặng, mất manh mối
  → Session không lưu    ⇒ "người dùng bị đăng xuất liên tục"
  → Build thất bại       ⇒ "lỗi npm không rõ nguyên nhân"

Bạn có thể tốn hai giờ đọc log ứng dụng cho một vấn đề
mà `df -h` trả lời trong hai giây.
```

Cùng lý do đó, kiểm cả **inode** — đĩa còn chỗ nhưng hết inode cũng cho triệu chứng y hệt:

```bash
df -h      # dung lượng
df -i      # số inode — hết khi có hàng triệu file nhỏ (session, cache)
```

**Quy trình bảy bước:**

```text
① CÓ THAY ĐỔI GÌ KHÔNG?
   Vừa deploy? đổi config? hết hạn chứng chỉ? nhà cung cấp có sự cố?
   ⇒ ~80% sự cố có một thay đổi đứng ngay trước nó.
   Nếu có ⇒ QUAY LUI TRƯỚC, điều tra sau.

② TÀI NGUYÊN:  df -h → df -i → free -h → uptime

③ DỊCH VỤ CÒN SỐNG KHÔNG?
   systemctl status app
   curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' localhost:3000/health

④ LOG — đọc từ THỜI ĐIỂM BẮT ĐẦU SỰ CỐ, không đọc từ cuối
   journalctl -u app --since "14:30" | head -100
   ⇒ Lỗi ĐẦU TIÊN là nguyên nhân; hàng ngàn lỗi sau là hậu quả.

⑤ PHỤ THUỘC:  CSDL? cache? API bên ngoài?
   pg_isready -h db     redis-cli ping     curl -I https://api.doi-tac.com

⑥ MẠNG:  ss -tlnp (ai nghe cổng nào)   ping   dig ten-mien.com

⑦ CHIA ĐÔI: sự cố nằm trước hay sau Nginx?
   Gọi thẳng ứng dụng, bỏ qua proxy ⇒ loại được một nửa hệ thống.
```

Bước ④ có một chi tiết dễ làm sai. Bản năng là `tail -f` để xem lỗi mới nhất — nhưng lỗi mới nhất thường là **hậu quả** thứ n. Lỗi đầu tiên tại thời điểm sự cố bắt đầu mới là nguyên nhân.

## Cú pháp

```bash
# Đĩa: cái gì đang chiếm chỗ?
du -sh /var/* | sort -rh | head        # thư mục lớn nhất
du -sh /var/log/*  | sort -rh | head

# File đã XOÁ nhưng tiến trình còn giữ — chỗ không hiện ra trong du
lsof +L1 | head

# RAM
free -h                 # nhìn cột "available", không nhìn "free"
ps aux --sort=-%mem | head

# Mạng
ss -tlnp                # cổng nào đang được nghe, bởi ai
ss -s                   # tổng số kết nối theo trạng thái

# Log
journalctl -u app -p err --since today     # chỉ mức lỗi
grep -c "ERROR" /var/log/app.log           # đếm, để so trước/sau
```

`lsof +L1` giải một câu đố kinh điển: `df` báo đầy, `du` cộng lại thì không đầy. Nguyên nhân thường là log đã bị xoá nhưng tiến trình vẫn giữ file mở — dung lượng chỉ được trả lại khi tiến trình đó khởi động lại.

`free -h`: cột **available** mới là RAM thật sự dùng được. Cột `free` thấp là bình thường — Linux dùng RAM rỗi làm cache đĩa và trả lại ngay khi cần.

## Tại sao cần nó

Vì mục tiêu lúc sự cố **không phải** tìm ra nguyên nhân — mà là **khôi phục dịch vụ**. Hai việc đó khác nhau, và nhầm lẫn chúng làm sự cố kéo dài.

```text
Ưu tiên khi đang có sự cố:
  ① Khôi phục dịch vụ         ← quay lui, khởi động lại, chuyển traffic
  ② Thu thập bằng chứng       ← log, số liệu, snapshot — TRƯỚC khi sửa
  ③ Tìm nguyên nhân gốc       ← sau khi đã yên, viết hậu kiểm
```

Bước ② hay bị bỏ qua và là bước tốn kém nhất khi thiếu: khởi động lại dịch vụ xoá sạch bằng chứng, và bạn sẽ gặp lại đúng sự cố đó vào tuần sau mà không có gì trong tay ([[su-co-va-hau-kiem]]).

**Ghi lại trong lúc làm** — một dòng cho mỗi việc:

```text
14:32 cảnh báo 5xx tăng
14:35 df -h: /var 94% — cao nhưng chưa đầy
14:37 log: "connection pool exhausted" từ 14:28
14:39 pg: 98/100 kết nối đang mở
14:41 restart app → 5xx về bình thường
```

Bản ghi này mất một phút để viết và là toàn bộ nội dung của hậu kiểm sau đó. Nó cũng ngăn bạn thử lại cùng một thứ hai lần lúc đang cuống.

## So sánh

| Triệu chứng | Nghi ngờ trước | Lệnh |
|---|---|---|
| Lỗi lạ, không nhất quán | **đĩa đầy** | `df -h`, `df -i` |
| Tiến trình bị giết bất ngờ | OOM killer | `dmesg -T \| grep -i oom` |
| Chậm nhưng CPU thấp | chờ I/O hoặc chờ mạng | `iostat`, `ss -s` |
| "Connection refused" | dịch vụ chết / sai cổng | `systemctl status`, `ss -tlnp` |
| Chỉ chậm với một số người | DNS, CDN, một node hỏng | `dig`, kiểm từng node |

## Dễ nhầm

**1. Đọc log trước khi kiểm tài nguyên.** Đĩa đầy gây ra hàng chục triệu chứng không liên quan.

**2. `tail -f` để tìm nguyên nhân.** Lỗi mới nhất là hậu quả; lỗi **đầu tiên** là nguyên nhân.

**3. Khởi động lại trước khi thu thập bằng chứng.** Sự cố sẽ quay lại và bạn vẫn tay trắng.

**4. Không hỏi "vừa có thay đổi gì".** Phần lớn sự cố đứng ngay sau một thay đổi.

**5. Nhìn cột `free` thay vì `available`.** Hiểu nhầm về RAM.

**6. Quên `df -i`.** Hết inode có triệu chứng giống hết đĩa.

**7. Không dùng cách chia đôi.** Đoán mò trong hệ thống nhiều tầng.

**8. Không ghi lại quá trình.** Không viết được hậu kiểm, và dễ lặp lại thao tác.

**9. Sửa vội trên production không ai biết.** Người tiếp theo sẽ điều tra một hệ thống đã bị bạn thay đổi mà không có dấu vết.

## Mẹo nhớ

> **`df -h` LUÔN là lệnh đầu tiên. Đĩa đầy giả dạng thành mọi loại lỗi.**
>
> **Đọc log từ lúc sự cố BẮT ĐẦU, không đọc từ cuối.**
>
> **Khôi phục trước, điều tra sau — nhưng thu bằng chứng TRƯỚC khi restart.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao `df -h` chạy trước khi đọc log?
2. Vì sao đọc log từ đầu sự cố chứ không từ cuối?
3. `df` báo đầy mà `du` không cộng đủ — chuyện gì đang xảy ra?
4. Ba ưu tiên khi đang có sự cố, theo thứ tự?
5. Câu hỏi đầu tiên nên đặt ra khi sự cố xảy ra là gì?

## Tự viết lại

Không nhìn lại, viết ra quy trình bảy bước của bạn — mỗi bước một dòng, kèm **một lệnh**. Rồi tự hỏi: nếu bước ② cho kết quả bình thường hết, bước nào bạn làm tiếp và vì sao?

## Thử sức

3 giờ sáng. Cảnh báo: tỉ lệ lỗi 5xx là 40%. Bạn vừa vào được máy chủ.

Ba câu để trả lời: **năm lệnh đầu** và thứ tự; nếu tất cả đều bình thường thì bạn đi tiếp theo hướng nào; và bạn ghi lại những gì trong lúc làm. Câu khó nhất: 40% — không phải 100% — gợi ý điều gì về **hình dạng** của sự cố, và điều đó thay đổi thứ tự điều tra của bạn ra sao?
