---
title: Viết Dockerfile
slug: viet-dockerfile
summary: Mỗi lệnh tạo một lớp — thứ tự các lệnh quyết định build nhanh hay chậm và image to hay nhỏ.
level: co-ban
tags: [docker, dockerfile]
---

> **Sau bài này bạn sẽ:** viết Dockerfile tận dụng được cache, và biết vì sao thứ tự `COPY` lại quan trọng đến vậy.

## Các lệnh chính

```dockerfile
FROM node:22-alpine              # image nền
WORKDIR /app                     # thư mục làm việc (tự tạo nếu chưa có)
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV NODE_ENV=production
EXPOSE 3000                      # chỉ là tài liệu, không mở cổng thật
USER node                        # không chạy bằng root
CMD ["node", "server.js"]        # lệnh mặc định khi container chạy
```

## Cache theo lớp — điều quan trọng nhất

Mỗi lệnh tạo một lớp. Docker dùng lại lớp cũ nếu lệnh **và** file liên quan không đổi. Một lớp thay đổi thì **mọi lớp sau nó** phải build lại.

```dockerfile
# CHẬM: sửa một dòng code là cài lại toàn bộ dependency
COPY . .
RUN pnpm install

# NHANH: chỉ cài lại khi package.json/lockfile đổi
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
```

Quy tắc: **thứ ít thay đổi đặt trước, thứ hay thay đổi đặt sau**. Đây là một thay đổi hai dòng, nhưng nó biến build 3 phút thành build 15 giây.

## `.dockerignore`

```
node_modules
.git
.next
dist
.env*
*.log
coverage
```

File này rất hay bị quên. Không có nó, `COPY . .` chép cả `node_modules` của máy bạn vào image — vừa chậm, vừa có thể chứa binary biên dịch cho hệ điều hành khác, vừa dễ đưa `.env` vào image.

## Build nhiều giai đoạn

Đây là kỹ thuật giảm kích thước image mạnh nhất:

```dockerfile
# --- Giai đoạn 1: cài dependency đầy đủ ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# --- Giai đoạn 2: build ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build

# --- Giai đoạn 3: chỉ những gì cần để CHẠY ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Kết quả: image cuối chỉ chứa mã đã build và dependency runtime — không có mã nguồn, không có devDependency, không có công cụ build. Từ ~1,2GB xuống ~150MB.

Lợi ích không chỉ là dung lượng: ít thứ trong image nghĩa là ít lỗ hổng tiềm ẩn và ít thứ cho kẻ tấn công dùng nếu chiếm được container.

## Chọn image nền

| Image | Kích thước | Ghi chú |
|---|---|---|
| `node:22` | ~1,1GB | Debian đầy đủ, có mọi công cụ |
| `node:22-slim` | ~250MB | Debian gọn — mặc định tốt |
| `node:22-alpine` | ~130MB | Alpine, dùng musl libc |
| `gcr.io/distroless/nodejs22` | ~110MB | Không có shell — an toàn nhất |

Alpine nhỏ nhưng dùng `musl` thay `glibc`: một số thư viện native (sharp, canvas, bcrypt bản gốc) có thể lỗi hoặc chậm hơn. Nếu gặp lỗi lạ liên quan tới thư viện native, thử `slim` trước khi mất thời gian gỡ.

Distroless không có shell nghĩa là không `docker exec ... sh` được — an toàn hơn nhưng khó gỡ lỗi hơn.

## `CMD` và `ENTRYPOINT`

```dockerfile
CMD ["node", "server.js"]              # dạng exec — ĐÚNG
CMD node server.js                     # dạng shell — tránh
```

Dạng shell chạy lệnh qua `/bin/sh -c`, nghĩa là tiến trình chính là `sh`, không phải `node`. Hệ quả: `SIGTERM` gửi tới `sh` và **không** được chuyển tiếp tới ứng dụng — container bị `SIGKILL` sau 10 giây mỗi lần dừng.

`ENTRYPOINT` cố định lệnh, `CMD` là tham số mặc định có thể ghi đè:

```dockerfile
ENTRYPOINT ["node"]
CMD ["server.js"]
# docker run image worker.js  ->  node worker.js
```

## Healthcheck

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
```

Orchestrator dựa vào đây để biết container **thật sự sẵn sàng**, không chỉ là "tiến trình còn sống". Endpoint health nên kiểm tra được cả kết nối CSDL.

## Bảo mật

```dockerfile
# 1. Không chạy bằng root
USER node

# 2. Không dùng ARG/ENV cho secret — chúng nằm trong lịch sử image
#    Dùng BuildKit secret mount:
RUN --mount=type=secret,id=npmrc \
    cp /run/secrets/npmrc ~/.npmrc && pnpm install && rm ~/.npmrc

# 3. Ghim phiên bản image nền theo digest
FROM node:22-alpine@sha256:...
```

Điểm 2 rất hay bị vi phạm: `ARG NPM_TOKEN` rồi dùng trong `RUN` khiến token nằm vĩnh viễn trong lớp image, ai `docker history` cũng đọc được.

```bash
docker scout cves ung-dung:1.0      # quét lỗ hổng
trivy image ung-dung:1.0
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `COPY . .` trước `install` | Cache hỏng, build lại từ đầu mỗi lần | Copy manifest trước |
| Thiếu `.dockerignore` | Image to, có thể lọt `.env` | Tạo file |
| Chạy bằng root | Chiếm container là chiếm nhiều quyền | `USER` |
| `CMD` dạng shell | `SIGTERM` không tới ứng dụng | Dạng exec `["..."]` |
| Secret qua `ARG` | Nằm trong lịch sử image | BuildKit secret |

## Ghi nhớ

- Thứ ít đổi đặt trước để tận dụng cache.
- Build nhiều giai đoạn cắt image đi gần 90%.
- `CMD` dạng exec để tín hiệu tới đúng tiến trình.
- Secret không bao giờ đi qua `ARG`/`ENV`.

## Tự kiểm tra

1. Vì sao `COPY package.json` trước `COPY . .` lại làm build nhanh hơn nhiều?
2. `CMD node server.js` và `CMD ["node","server.js"]` khác nhau ở điều gì quan trọng?
3. Cần token riêng tư để cài package — làm sao không để nó lọt vào image?
