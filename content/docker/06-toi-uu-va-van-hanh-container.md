---
title: Tối ưu và vận hành container
slug: toi-uu-va-van-hanh-container
summary: Giảm kích thước image, giới hạn tài nguyên, xử lý log và quét lỗ hổng.
level: nang-cao
tags: [docker, hieu-nang, van-hanh, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bốn việc phải làm trước khi đưa container lên production, và lý do của từng cái.

## Ý tưởng chính

Container chạy được ở máy dev và container **chạy được ở production** khác nhau ở bốn điểm: kích thước, giới hạn tài nguyên, log, và bề mặt tấn công.

Không cái nào trong bốn cái đó gây lỗi lúc bạn thử ở máy mình. Chúng chỉ gây lỗi khi có tải thật, và thường vào lúc bất tiện nhất.

## Mental model

Hãy nghĩ tới **hành lý mang lên máy bay**.

> Ở nhà, bạn nhét vào vali mọi thứ "biết đâu cần" — không tốn gì cả.
>
> Ở sân bay, mỗi ký đều tính tiền, mỗi món đều bị soi, và mỗi món **không dùng đến** vẫn phải mang vác suốt chuyến đi.

Image production cũng vậy: mỗi gói không dùng tới vẫn phải tải xuống ở mọi lần triển khai, vẫn nằm trên mọi máy chủ, và vẫn là một dòng trong báo cáo quét lỗ hổng — **kể cả khi ứng dụng của bạn không bao giờ gọi tới nó**.

## Ví dụ nhỏ

```dockerfile
FROM node:20-alpine        # 180 MB thay vì 1.1 GB của node:20
RUN apk add --no-cache tini
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

## Code chạy thế nào

**Bốn cách giảm kích thước, theo thứ tự hiệu quả:**

```text
① Multi-stage build          1.2 GB → 200 MB   ← lớn nhất
   Công cụ build không đi vào image cuối ([[viet-dockerfile]])

② Đổi ảnh nền
   node:20         1.1 GB
   node:20-slim    ~250 MB   ← mặc định tốt
   node:20-alpine  ~180 MB   ← nhỏ nhất, nhưng dùng musl thay glibc
   distroless      ~120 MB   ← không có cả shell

③ Chỉ cài phụ thuộc production
   npm ci --omit=dev

④ Gộp RUN và dọn cache trong CÙNG một lớp
   RUN apt-get install ... && rm -rf /var/lib/apt/lists/*
```

Về Alpine: nó dùng **musl** thay cho **glibc**. Phần lớn ứng dụng không thấy khác biệt, nhưng các gói có mã native biên dịch sẵn (`sharp`, `bcrypt`, một số thư viện Python khoa học) có thể chậm hơn hoặc không chạy. Gặp lỗi lạ trên Alpine mà không trên slim ⇒ nghi ngay chỗ này.

Distroless đi xa hơn: **không có shell, không có package manager**. Kẻ tấn công vào được cũng không có công cụ nào để dùng. Đổi lại, `docker exec ... sh` không còn dùng được để gỡ lỗi.

**Giới hạn tài nguyên — vì sao bắt buộc:**

```yaml
deploy:
  resources:
    limits: { cpus: '1.0', memory: 512M }
    reservations: { memory: 256M }
```

```text
Không giới hạn:
  Một container rò rỉ bộ nhớ → ăn hết RAM máy chủ
  → OOM killer của nhân chọn nạn nhân theo điểm số
  → Nó thường giết CSDL (tiến trình chiếm RAM nhiều nhất)
  ⇒ Một dịch vụ phụ làm sập dịch vụ chính.

Có giới hạn:
  Container vượt 512M → CHỈ NÓ bị giết
  → restart: always bật lại
  ⇒ Sự cố bị nhốt trong ranh giới của nó.
```

Đây là ý nghĩa thật của giới hạn tài nguyên: không phải để tiết kiệm, mà để **cách ly hỏng hóc**.

Với ứng dụng JVM hoặc Node, nhớ cả một chi tiết: nhiều runtime đọc RAM của **máy chủ** chứ không phải giới hạn của container, rồi tự đặt heap quá lớn ⇒ bị giết ngay khi có tải. Cần khai rõ (`--max-old-space-size`, `-XX:MaxRAMPercentage`).

## Cú pháp

**Log: ghi ra stdout, không ghi ra file:**

```text
File log bên trong container:
  → mất khi container bị xoá
  → không xoay vòng ⇒ đầy đĩa
  → không tập trung được

stdout/stderr:
  → Docker thu, chuyển tới nơi thu gom log
  → xoay vòng được bằng cấu hình driver
```

```yaml
logging:
  driver: json-file
  options: { max-size: '10m', max-file: '3' }   # tối đa 30MB mỗi container
```

Không đặt hai tuỳ chọn này là một trong những cách phổ biến nhất làm đầy đĩa máy chủ — và đĩa đầy thì gây ra đủ loại triệu chứng không liên quan ([[go-loi-tren-may-chu]]).

**Healthcheck — để hệ thống biết container còn *dùng được*, không chỉ *còn sống*:**

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```

`--start-period` quan trọng: nó cho ứng dụng thời gian khởi động mà không bị tính là thất bại.

**Bảo mật — bốn dòng có tác động lớn nhất:**

```dockerfile
USER node                        # ① không chạy bằng root
```

```yaml
read_only: true                  # ② hệ thống file chỉ đọc
tmpfs: ['/tmp']                  #    (cấp chỗ ghi tạm riêng)
cap_drop: [ALL]                  # ③ bỏ mọi đặc quyền của nhân
security_opt: ['no-new-privileges:true']   # ④ không leo thang được
```

`read_only: true` mạnh hơn vẻ ngoài của nó: kẻ tấn công chạy được mã cũng không **ghi** được gì vào hệ thống file, nên không cài được backdoor tồn tại lâu.

**Quét lỗ hổng, đưa vào CI:**

```bash
docker scout cves my-app:1.4.2
trivy image my-app:1.4.2 --severity HIGH,CRITICAL
```

Phần lớn CVE trong image đến từ **ảnh nền**, không phải mã của bạn — nên cập nhật ảnh nền định kỳ là hành động có hiệu quả cao nhất ([[secret-va-quyen-trong-ci]]).

## Tại sao cần nó

Vì `tini` giải quyết một vấn đề âm thầm mà ai cũng gặp:

```text
PID 1 trong Linux có trách nhiệm ĐẶC BIỆT: thu dọn tiến trình con mồ côi.
Ứng dụng của bạn (node, python) KHÔNG được viết để làm việc đó.

⇒ Tiến trình zombie tích tụ.
⇒ Và PID 1 không xử lý tín hiệu theo mặc định
  ⇒ SIGTERM bị bỏ qua ⇒ docker stop đợi 10s rồi SIGKILL mỗi lần.
```

`tini` là một init tí hon đứng làm PID 1, chuyển tín hiệu xuống và thu dọn zombie. Cách dùng nhanh nhất: `docker run --init`.

Đặt cạnh nhau, đây là danh sách trước khi lên production:

```text
□ Multi-stage, ảnh nền slim/alpine, cố định phiên bản
□ USER không phải root
□ Giới hạn CPU và RAM
□ restart: always
□ Log ra stdout, có max-size và max-file
□ HEALTHCHECK có start-period
□ read_only + cap_drop ALL
□ Quét CVE trong CI
□ Xử lý SIGTERM (hoặc dùng --init)
□ Không secret trong image
```

## So sánh

| Ảnh nền | Kích thước | Có shell | Ghi chú |
|---|---|---|---|
| `node:20` | ~1.1 GB | ✅ | chỉ dùng cho giai đoạn build |
| `node:20-slim` | ~250 MB | ✅ | mặc định tốt, glibc |
| `node:20-alpine` | ~180 MB | ✅ | musl — cẩn thận với gói native |
| `distroless` | ~120 MB | ❌ | an toàn nhất, khó gỡ lỗi nhất |

## Dễ nhầm

**1. Không giới hạn tài nguyên.** Một container kéo sập cả máy chủ.

**2. Ghi log ra file bên trong container.** Mất log, và đầy đĩa.

**3. Không đặt `max-size` cho log.** Đầy đĩa kiểu khác.

**4. Chạy bằng root.** Thoát container thành chiếm máy.

**5. Không xử lý SIGTERM và không dùng `--init`.** Mỗi lần deploy cắt ngang request.

**6. Đổi sang Alpine mà không kiểm thử.** Gói native có thể hỏng.

**7. Runtime tự đặt heap theo RAM máy chủ** thay vì theo giới hạn container.

**8. `HEALTHCHECK` không có `start-period`.** Container bị coi là hỏng khi mới khởi động.

**9. Không bao giờ cập nhật ảnh nền.** CVE tích tụ dù mã của bạn không đổi.

**10. Đưa secret vào image bằng `ENV`.** `docker history` đọc được.

## Mẹo nhớ

> **Giới hạn tài nguyên không để tiết kiệm — để NHỐT hỏng hóc lại một chỗ.**
>
> **Log ra stdout, và luôn đặt `max-size`.**
>
> **PID 1 phải chuyển được tín hiệu: xử lý SIGTERM hoặc dùng `--init`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn cách giảm kích thước image, cái nào hiệu quả nhất?
2. Điều gì xảy ra khi một container không giới hạn RAM bị rò rỉ bộ nhớ?
3. Vì sao log phải ra stdout thay vì file?
4. `tini` (hoặc `--init`) giải quyết hai vấn đề gì?
5. Alpine đánh đổi điều gì để nhỏ hơn?

## Tự viết lại

Không nhìn lại, viết cấu hình production cho một dịch vụ Node, gồm:

```text
① Dockerfile: multi-stage, ảnh nền nhỏ, user không phải root
② compose: giới hạn tài nguyên, restart, log có giới hạn
③ healthcheck
④ hai tuỳ chọn bảo mật
```

Tự kiểm: nếu ứng dụng của bạn cần ghi file tạm, `read_only: true` có làm nó hỏng không — và bạn xử lý thế nào?

## Thử sức

Production sập lúc 2 giờ sáng. Nguyên nhân: một container xử lý ảnh rò rỉ bộ nhớ, ăn hết RAM, và **OOM killer giết Postgres**.

Ba câu để trả lời: **một dòng cấu hình** nào đã ngăn được toàn bộ chuyện này; ba biện pháp khác bạn thêm vào; và bạn phát hiện vấn đề **sớm hơn** bằng cách nào. Câu khó nhất: sau khi giới hạn RAM cho container đó, nó sẽ bị giết và khởi động lại liên tục — vì sao đó **vẫn tốt hơn** hiện trạng, và bạn làm gì tiếp theo?
