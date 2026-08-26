---
title: Quyền và người dùng
slug: quyen-va-nguoi-dung
summary: Ba nhóm quyền, ý nghĩa của 755 và 644, và vì sao đừng chạy mọi thứ bằng root.
level: co-ban
tags: [linux, quyen, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được `-rwxr-xr--` không cần tra, và biết vì sao 777 gần như luôn là dấu hiệu của một lỗi khác.

## Ý tưởng chính

Mỗi file có **một chủ**, **một nhóm**, và ba bộ quyền: cho chủ, cho nhóm, cho **mọi người còn lại**.

Ba bộ đó, mỗi bộ ba bit: đọc (r), ghi (w), chạy (x). Toàn bộ hệ thống quyền cơ bản của Linux nằm gọn trong chín bit này.

## Mental model

Hãy nghĩ tới **một căn phòng trong công ty**.

> Cửa phòng có ba mức phân quyền, dán ba tấm bảng khác nhau:
>
> - **Bạn** (chủ phòng) — vào, sắp xếp lại, dùng đồ.
> - **Đội của bạn** (nhóm) — có thể chỉ được vào xem.
> - **Người ngoài** — có thể không được vào.

Điều quan trọng của mô hình này: hệ thống kiểm **theo thứ tự và dừng ở lần khớp đầu tiên**. Bạn là chủ ⇒ chỉ áp bộ quyền của chủ, kể cả khi nhóm có quyền rộng hơn. Đây là chỗ gây bất ngờ: chủ file bị từ chối ghi trong khi cả nhóm ghi được — vì bộ "chủ" khớp trước.

## Ví dụ nhỏ

```bash
$ ls -l
-rwxr-xr--  1 an  dev   1204 Aug 21 10:00 chay.sh
drwxr-xr-x  2 an  dev   4096 Aug 21 10:00 du-lieu
```

## Code chạy thế nào

**Giải mã `-rwxr-xr--` từ trái sang phải:**

```text
-  rwx  r-x  r--
│   │    │    │
│   │    │    └─ NGƯỜI KHÁC: chỉ đọc                       (4)
│   │    └────── NHÓM "dev":  đọc + chạy, không ghi        (5)
│   └─────────── CHỦ "an":    đọc + ghi + chạy             (7)
└─────────────── loại: "-" file thường, "d" thư mục, "l" liên kết
```

⇒ **754**. Con số bát phân chỉ là ba bit viết gọn:

```text
r = 4    w = 2    x = 1

7 = 4+2+1 = rwx
6 = 4+2   = rw-
5 = 4+  1 = r-x
4 = 4     = r--
```

Cách nhớ nhanh không cần tính: **7 là toàn quyền, 6 là đọc-ghi, 5 là đọc-chạy, 4 là chỉ đọc.**

**`x` trên thư mục nghĩa là gì — chỗ hay hiểu sai nhất:**

```text
Trên FILE:     x = chạy được file này
Trên THƯ MỤC:  x = ĐI QUA được thư mục này
               r = liệt kê được nội dung

⇒ Thư mục có r nhưng không x: ls thấy tên file, nhưng
  không mở được file nào bên trong.
⇒ Thư mục có x nhưng không r: mở được file NẾU bạn biết tên,
  nhưng không liệt kê ra được.
```

Đó là lý do thư mục hầu như luôn là `755` chứ không phải `644`: bỏ `x` đi là khoá cả lối vào.

## Cú pháp

```bash
chmod 755 chay.sh          # đặt tuyệt đối
chmod +x chay.sh           # thêm quyền chạy cho mọi bộ
chmod u+w,go-w file        # u=chủ, g=nhóm, o=người khác, a=tất cả
chmod -R 755 thu-muc/      # đệ quy

chown an:dev file          # đổi chủ và nhóm
sudo chown -R app:app /opt/app
```

**Hai giá trị dùng 90% thời gian:**

```text
644  file thường     rw-r--r--   chủ sửa, người khác đọc
755  thư mục & script rwxr-xr-x  chủ sửa, người khác đọc + đi qua
600  file bí mật     rw-------   CHỈ chủ. Khoá SSH, .env
```

`600` cho khoá riêng không phải khuyến nghị — SSH **từ chối chạy** nếu khoá riêng có quyền rộng hơn thế.

## Tại sao cần nó

Vì `777` là cách "sửa" nhanh nhất và sai nhất.

```text
chmod 777 làm gì:  ai đăng nhập được vào máy cũng GHI ĐÈ được file đó.
Với thư mục web:   kẻ tấn công ghi được mã của bạn ⇒ chiếm máy chủ.

Nó "sửa được lỗi" vì nó xoá bỏ mọi ràng buộc — kể cả ràng buộc
đang che một vấn đề THẬT: sai chủ sở hữu.
```

Quy trình đúng khi gặp "Permission denied":

```text
① ls -l <file>          → chủ là ai, quyền là gì?
② id                    → tôi là ai, thuộc nhóm nào?
③ So hai cái            → bộ quyền nào áp cho tôi?
④ Sửa CHỦ nếu sai:      chown
   Sửa QUYỀN nếu sai:   chmod (đủ dùng, không hơn)
```

**Vì sao không chạy ứng dụng bằng root:**

```text
Ứng dụng chạy bằng root, có lỗ hổng thực thi mã
  ⇒ kẻ tấn công có TOÀN QUYỀN máy chủ.

Ứng dụng chạy bằng user "app" riêng, cùng lỗ hổng
  ⇒ kẻ tấn công chỉ động được vào những gì "app" động được.
```

Đây là **nguyên tắc đặc quyền tối thiểu**: không phải để ngăn lỗ hổng, mà để **giới hạn thiệt hại** khi nó xảy ra. Cùng tinh thần với [[broken-access-control]] ở tầng ứng dụng.

## So sánh

| | File | Thư mục |
|---|---|---|
| `r` | đọc nội dung | liệt kê tên bên trong |
| `w` | sửa nội dung | **tạo/xoá file bên trong** |
| `x` | chạy như chương trình | đi qua để tới file bên trong |

Ô đáng chú ý: `w` trên thư mục cho phép **xoá file bên trong kể cả khi bạn không có quyền ghi file đó** — vì xoá là sửa thư mục, không phải sửa file.

## Dễ nhầm

**1. `chmod 777` để cho xong.** Che một lỗi sai chủ sở hữu bằng một lỗ hổng.

**2. Tưởng `x` trên thư mục là "chạy".** Nó là "đi qua".

**3. Quên rằng chỉ bộ quyền khớp ĐẦU TIÊN được áp.** Chủ file không được ghi thì không "mượn" quyền của nhóm được.

**4. `chmod -R 755` lên cả thư mục lẫn file.** File thường không cần `x`. Dùng `find . -type d -exec chmod 755 {} +` và `-type f ... 644`.

**5. Khoá SSH quyền 644.** SSH từ chối dùng.

**6. Chạy ứng dụng bằng root cho tiện.** Biến một lỗ hổng nhỏ thành mất máy chủ.

**7. Quên `w` trên thư mục là quyền xoá file bên trong.**

**8. `sudo` mọi thứ khi gặp lỗi quyền** thay vì tìm nguyên nhân — file được tạo ra sẽ thuộc root và gây lỗi tiếp ở bước sau.

## Mẹo nhớ

> **r=4, w=2, x=1. 755 cho thư mục, 644 cho file, 600 cho bí mật.**
>
> **Trên thư mục: x là ĐI QUA, không phải chạy.**
>
> **777 không phải cách sửa — nó là cách giấu lỗi sai chủ sở hữu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `-rw-r-----` là số mấy? Ai đọc được, ai ghi được?
2. `x` trên thư mục nghĩa là gì, khác gì trên file?
3. Vì sao chủ file có thể bị từ chối trong khi nhóm lại được phép?
4. Vì sao `chmod 777` nguy hiểm, và nó thường đang che lỗi gì?
5. Vì sao không nên chạy ứng dụng web bằng root?

## Tự viết lại

Bạn triển khai ứng dụng vào `/opt/app`. Không nhìn lại, viết các lệnh để:

```text
① Ứng dụng chạy bằng user riêng tên "app"
② Mã nguồn: app đọc được, KHÔNG ghi được
③ /opt/app/uploads: app ghi được
④ /opt/app/.env: CHỈ app đọc được
```

Tự kiểm: bước ② có lý do gì để cố ý không cho ghi — dù ứng dụng là của bạn?

## Thử sức

Ứng dụng báo `EACCES: permission denied, open '/opt/app/logs/app.log'`. Đồng nghiệp đề nghị `chmod -R 777 /opt/app`.

Ba câu để trả lời: vì sao đề nghị đó **sai**; ba lệnh bạn chạy để tìm nguyên nhân thật; và lệnh sửa đúng. Câu khó nhất: nếu file log đó **đã** thuộc user `app` và quyền đã là `644`, còn nguyên nhân nào khác khiến ghi thất bại?
