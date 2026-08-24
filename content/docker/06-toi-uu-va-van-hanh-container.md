---
title: Tối ưu và vận hành container
slug: toi-uu-va-van-hanh-container
summary: Giảm kích thước image, giới hạn tài nguyên, xử lý log và quét lỗ hổng.
level: nang-cao
tags: [docker, hieu-nang, van-hanh, bao-mat]
---

> **Sau bài này bạn sẽ:** đưa image từ 1GB xuống dưới 200MB, và cấu hình container chạy ổn định lâu dài.

## Đo trước

```bash
docker images                        # kích thước tổng
docker history ung-dung:1.0          # lớp nào chiếm chỗ
dive ung-dung:1.0                    # công cụ xem chi tiết từng lớp
```

`docker history` cho biết ngay nên tối ưu chỗ nào — thường là một lớp `RUN` cài công cụ build.

## Giảm kích thước

**1. Build nhiều giai đoạn** — hiệu quả nhất, đã nói ở bài Dockerfile.

**2. Gộp lệnh `RUN` và dọn trong cùng lệnh:**

```dockerfile
# SAI: apt cache nằm lại trong lớp trước, xoá ở lớp sau không giảm được gì
RUN apt-get update && apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# ĐÚNG: dọn trong CÙNG một lớp
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

Đây là hệ quả trực tiếp của mô hình lớp: file đã vào một lớp thì lớp sau xoá đi chỉ **che** nó, dung lượng image không giảm.

**3. Chỉ cài dependency production:**

```dockerfile
RUN pnpm install --prod --frozen-lockfile
```

**4. Dùng `standalone` output của Next.js** — nó gói đúng những module thật sự được dùng.

**5. Kiểm tra image nền:** `alpine` hoặc `distroless` cho image cuối.

## Giới hạn tài nguyên

```yaml
services:
  app:
    deploy:
      resources:
        limits:       { cpus: '1.0', memory: 512M }
        reservations: { cpus: '0.25', memory: 256M }
```

Không có giới hạn, một container rò rỉ bộ nhớ sẽ ăn hết RAM máy chủ và OOM killer sẽ giết **một tiến trình bất kỳ** — có thể là CSDL.

Với Node, nhớ cả giới hạn heap của V8:

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=384"
```

Đặt thấp hơn giới hạn container (384 < 512) để V8 dọn rác trước khi Docker giết container. Không có dòng này, Node tưởng mình có toàn bộ RAM máy chủ.

## Log

```yaml
services:
  app:
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }
```

Không cấu hình, log Docker tăng vô hạn cho tới khi đầy đĩa — một trong những nguyên nhân "máy chủ tự nhiên hỏng" phổ biến nhất.

Nguyên tắc: ứng dụng trong container ghi log ra **stdout/stderr**, không ghi vào file. Việc thu thập, xoay vòng và lưu trữ là của nền tảng.

## Healthcheck và tự phục hồi

```yaml
services:
  app:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 3s
      start_period: 20s
      retries: 3
```

`start_period` là khoảng thời gian khởi động mà healthcheck thất bại **không** bị tính — thiếu nó, ứng dụng khởi động chậm sẽ bị giết trong vòng lặp vô tận.

Endpoint health nên kiểm tra cả phụ thuộc quan trọng:

```ts
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
```

## Bảo mật khi chạy

```yaml
services:
  app:
    user: "1001:1001"
    read_only: true                  # hệ thống file chỉ đọc
    tmpfs: ["/tmp"]                  # trừ /tmp
    cap_drop: [ALL]                  # bỏ mọi đặc quyền nhân
    security_opt: ["no-new-privileges:true"]
```

`read_only: true` là biện pháp mạnh và rẻ: kẻ tấn công vào được container cũng không ghi được webshell hay sửa mã nguồn.

```bash
docker scout cves ung-dung:1.0
trivy image --severity HIGH,CRITICAL ung-dung:1.0
```

Đưa việc quét vào CI và cho fail khi có lỗ hổng mức cao.

## Build đa kiến trúc

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t ung-dung:1.0 --push .
```

Cần khi máy dev là Mac Apple Silicon (arm64) còn máy chủ là amd64. Không có bước này, image build trên Mac sẽ không chạy trên máy chủ — hoặc chạy qua giả lập, chậm hơn nhiều lần.

## Checklist trước khi đưa lên production

- [ ] Build nhiều giai đoạn, image dưới 300MB
- [ ] `USER` không phải root
- [ ] Ghim phiên bản image nền (tốt nhất là theo digest)
- [ ] Giới hạn CPU và bộ nhớ; `NODE_OPTIONS` khớp
- [ ] Healthcheck có `start_period`
- [ ] `restart: unless-stopped`
- [ ] Giới hạn dung lượng log
- [ ] Xử lý `SIGTERM` để dừng tử tế
- [ ] Không có secret trong image (`docker history` để kiểm tra)
- [ ] Đã quét lỗ hổng

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Dọn cache ở lớp khác | Image không nhỏ đi | Dọn trong cùng `RUN` |
| Không giới hạn log | Đầy đĩa máy chủ | `max-size` + `max-file` |
| Không đặt `NODE_OPTIONS` | Node bị OOM kill bất ngờ | Đặt thấp hơn giới hạn container |
| Healthcheck không có `start_period` | Container bị giết lúc khởi động | Thêm `start_period` |
| Build trên Mac M-series cho máy chủ x86 | Image không chạy được | `buildx --platform` |

## Ghi nhớ

- Xoá file ở lớp sau không giảm dung lượng — phải dọn trong cùng lớp.
- Giới hạn bộ nhớ container **và** heap của runtime.
- Log ra stdout, giới hạn dung lượng ở tầng Docker.
- `read_only` + `cap_drop: ALL` là hai dòng tăng an toàn đáng kể.

## Tự kiểm tra

1. Vì sao `RUN rm -rf /var/lib/apt/lists/*` ở lớp riêng không giảm kích thước image?
2. Đặt `--max-old-space-size` thế nào cho container giới hạn 1GB? Vì sao?
3. Nêu ba biện pháp làm container an toàn hơn lúc chạy.
