---
title: Viết Dockerfile
slug: viet-dockerfile
summary: Mỗi lệnh tạo một lớp — thứ tự các lệnh quyết định build nhanh hay chậm và image to hay nhỏ.
level: co-ban
tags: [docker, dockerfile]
khung: v2
---

> **Sau bài này bạn sẽ:** sắp xếp Dockerfile theo đúng thứ tự cache, và biết vì sao đổi một dòng code lại khiến build mất năm phút.

## Ý tưởng chính

Mỗi lệnh trong Dockerfile tạo ra **một lớp**. Docker cache từng lớp và tái sử dụng khi lệnh đó cùng nội dung đầu vào.

Nhưng cache có một quy tắc không khoan nhượng: **một lớp hỏng cache thì mọi lớp sau nó cũng hỏng theo**.

Vì thế thứ tự các lệnh không phải chuyện phong cách — nó quyết định build mất 5 giây hay 5 phút.

## Mental model

Hãy nghĩ tới **chồng bánh pancake xếp theo tần suất thay đổi**.

> Bạn xếp bánh từ dưới lên. Muốn thay một cái bánh ở **giữa** chồng, bạn phải nhấc bỏ mọi cái nằm trên nó rồi xếp lại.
>
> Nên bạn xếp cái **ít thay đổi nhất xuống dưới cùng** (hệ điều hành, thư viện), cái **hay thay đổi nhất lên trên cùng** (mã nguồn của bạn).
>
> Đổi mã nguồn ⇒ chỉ xếp lại cái trên cùng. Đổi thư viện ⇒ xếp lại từ giữa.

Toàn bộ nghệ thuật viết Dockerfile nằm ở một câu hỏi: *"dòng này thay đổi bao nhiêu lần mỗi ngày?"* — và sắp xếp theo câu trả lời.

## Ví dụ nhỏ

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./       # ← chỉ file phụ thuộc, TRƯỚC
RUN npm ci                  # lớp đắt tiền: được cache

COPY . .                    # ← mã nguồn, SAU
RUN npm run build

CMD ["node", "dist/server.js"]
```

## Code chạy thế nào

**Vì sao tách `COPY package*.json` ra khỏi `COPY . .`:**

```text
❌ Cách sai:
   COPY . .          ← đổi một ký tự trong code ⇒ lớp này hỏng cache
   RUN npm ci        ← và lớp này BUỘC chạy lại. 3 phút. Mỗi lần.

✅ Cách đúng:
   COPY package*.json ./   ← chỉ hỏng cache khi ĐỔI PHỤ THUỘC
   RUN npm ci              ← cache giữ được hàng tuần
   COPY . .                ← đổi code chỉ hỏng từ đây trở đi
```

Kết quả trong thực tế: build sau khi sửa code giảm từ ~3 phút xuống ~10 giây. Đây là một dòng đổi chỗ.

**Multi-stage — vì sao image cuối cùng nhỏ đi hàng trăm MB:**

```dockerfile
# Giai đoạn 1: có đủ đồ nghề để build
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                     # gồm cả devDependencies
COPY . .
RUN npm run build

# Giai đoạn 2: image THẬT — chỉ chép sang thứ cần để chạy
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev          # KHÔNG có devDependencies
COPY --from=builder /app/dist ./dist
USER node                      # không chạy bằng root
CMD ["node", "dist/server.js"]
```

```text
Cái KHÔNG có mặt trong image cuối:
  TypeScript, webpack, eslint, toàn bộ devDependencies,
  mã nguồn .ts, file test, cache của trình build.

1.2 GB  →  180 MB
```

Điều quan trọng: mọi thứ ở giai đoạn `builder` **biến mất hoàn toàn**, kể cả các lớp trung gian. Nên nếu bạn lỡ `COPY` một file secret vào giai đoạn build rồi xoá đi, nó vẫn không lọt vào image cuối — miễn là bạn không chép nó sang.

## Cú pháp

```dockerfile
FROM node:20-alpine       # ảnh nền — CỐ ĐỊNH phiên bản, không dùng latest
WORKDIR /app              # cd, và tự tạo thư mục nếu chưa có
COPY nguon dich           # chép từ máy build vào image
RUN <lệnh>                # chạy LÚC BUILD, tạo một lớp
ENV NODE_ENV=production   # biến môi trường, có cả lúc chạy
EXPOSE 3000               # chỉ là tài liệu — KHÔNG mở cổng
USER node                 # đổi user, đặt sau khi đã cài xong
CMD ["node", "server.js"] # chạy LÚC KHỞI ĐỘNG container
```

**`RUN` chạy lúc build, `CMD` chạy lúc khởi động** — nhầm hai cái này là lỗi của mọi người mới.

**Dạng exec và dạng shell:**

```dockerfile
CMD node server.js              # dạng shell: chạy qua /bin/sh -c
                                # ⇒ PID 1 là sh, KHÔNG chuyển SIGTERM
CMD ["node", "server.js"]       # dạng exec ✅ node là PID 1, nhận tín hiệu
```

Hệ quả rất thật: với dạng shell, `docker stop` gửi SIGTERM cho `sh`, `sh` không chuyển tiếp, Docker đợi 10 giây rồi SIGKILL — ứng dụng của bạn **không bao giờ được thoát sạch** ([[tien-trinh-va-dich-vu]]).

**`.dockerignore` — luôn phải có:**

```text
node_modules
.git
.env
dist
*.log
```

Không có nó, `COPY . .` gửi toàn bộ `node_modules` và `.git` vào build context: chậm, image to, và **`.env` lọt vào image**.

## Tại sao cần nó

Vì ba hậu quả của một Dockerfile viết ẩu đều đắt:

```text
Sai thứ tự lớp     ⇒ mỗi lần sửa code phải chờ 3 phút.
                     Nhân với số lần build mỗi ngày, nhân với cả đội.

Không multi-stage  ⇒ image 1.2 GB: đẩy chậm, kéo chậm,
                     và mọi công cụ build đều là bề mặt tấn công.

Không .dockerignore ⇒ secret nằm trong image, và image
                      được đẩy lên registry.
```

**Nhiều `RUN` gộp lại làm một** khi chúng thuộc cùng một việc:

```dockerfile
# ❌ Ba lớp; lớp 3 xoá file nhưng lớp 2 VẪN CÒN trong image
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# ✅ Một lớp — cái bị xoá thực sự không nằm trong image
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

Lý do sâu hơn ở đây: lớp là **bất biến và cộng dồn**. Xoá một file ở lớp sau không làm nó biến mất khỏi lớp trước — nó chỉ bị che đi, và ai cũng lấy lại được. Đây cũng là lý do **không bao giờ `COPY` secret vào một lớp**, kể cả khi bạn xoá nó ngay sau đó.

## So sánh

| | `RUN` | `CMD` | `ENTRYPOINT` |
|---|---|---|---|
| Chạy lúc | build | khởi động container | khởi động container |
| Tạo lớp | ✅ | ❌ | ❌ |
| Ghi đè bằng `docker run` | không | ✅ dễ | khó (cần `--entrypoint`) |
| Dùng cho | cài đặt, build | lệnh mặc định | lệnh cố định của image |

## Dễ nhầm

**1. `COPY . .` trước khi cài phụ thuộc.** Mất cache, build chậm mãi mãi.

**2. Không có `.dockerignore`.** Image to, và secret lọt vào.

**3. `CMD` dạng shell.** PID 1 là `sh`, ứng dụng không nhận SIGTERM.

**4. Nhầm `RUN` với `CMD`.**

**5. Tưởng `EXPOSE` mở cổng.** Nó chỉ là tài liệu; `-p` mới mở.

**6. `COPY` secret vào một lớp rồi `RUN rm`.** Nó vẫn nằm trong lớp trước.

**7. Không multi-stage.** Image gấp 5–10 lần cần thiết.

**8. Chạy bằng root.** Thêm `USER node` sau khi cài xong.

**9. `FROM node:latest`.** Build hôm nay và tháng sau ra hai kết quả khác nhau.

**10. `npm install` thay vì `npm ci`.** `ci` cài đúng theo lockfile — đó chính là điều bạn muốn khi build image.

## Mẹo nhớ

> **Xếp lớp theo TẦN SUẤT THAY ĐỔI: ít đổi ở dưới, hay đổi ở trên.**
>
> **`COPY package*.json` trước, `npm ci`, rồi mới `COPY . .`.**
>
> **`CMD` dạng exec `["a","b"]` — dạng shell làm mất tín hiệu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao tách `COPY package*.json` khỏi `COPY . .`? Tiết kiệm được cái gì?
2. Một lớp hỏng cache thì các lớp sau ra sao?
3. `RUN` khác `CMD` ở điểm nào?
4. Vì sao `CMD` dạng shell gây vấn đề khi dừng container?
5. Vì sao xoá secret ở một `RUN` sau vẫn không an toàn?

## Tự viết lại

Không nhìn lại, viết Dockerfile multi-stage cho một ứng dụng Python FastAPI:

```text
① cài phụ thuộc từ requirements.txt (được cache)
② image cuối không chứa công cụ build
③ chạy bằng user không phải root
④ CMD dạng exec
```

Tự kiểm: nếu bạn chỉ sửa một dòng trong `main.py`, build lại chạy từ dòng nào trong Dockerfile của bạn?

## Thử sức

Image của đội bạn nặng **1.4 GB** và mỗi lần build mất **6 phút**, kể cả khi chỉ sửa một dòng code.

Ba câu để trả lời: hai thay đổi có tác động lớn nhất, theo thứ tự ưu tiên; bạn **đo** cải thiện bằng cách nào; và bạn kiểm tra bằng gì rằng image mới **không thiếu** thứ gì để chạy. Câu khó nhất: nếu sau khi tách lớp mà build vẫn chậm mỗi lần, dòng nào trong Dockerfile có thể đang **âm thầm** hỏng cache?
