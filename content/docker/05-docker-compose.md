---
title: Docker Compose cho môi trường phát triển
slug: docker-compose
summary: Mô tả cả hệ thống nhiều dịch vụ trong một file, và tách cấu hình dev với production.
level: trung-cap
tags: [docker, compose, moi-truong-phat-trien]
---

> **Sau bài này bạn sẽ:** dựng được môi trường dev đầy đủ bằng một lệnh, và biết tách cấu hình theo môi trường.

## Vấn đề nó giải quyết

Một dự án cần app + Postgres + Redis + MinIO. Chạy tay bằng bốn lệnh `docker run` dài dòng, đúng thứ tự, đúng network — mỗi lần khởi động lại là một lần tra tài liệu.

Compose mô tả tất cả trong một file, và người mới vào dự án chỉ cần `docker compose up`.

## File cơ bản

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: dev              # dừng ở giai đoạn dev của multi-stage
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:matkhau@db:5432/appdb
      REDIS_URL: redis://cache:6379
    env_file: [.env.local]
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db: { condition: service_healthy }
      cache: { condition: service_started }
    command: pnpm dev

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: matkhau
      POSTGRES_DB: appdb
    volumes:
      - du-lieu-pg:/var/lib/postgresql/data
      - ./sql/khoi-tao.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    ports: ["127.0.0.1:5432:5432"]     # để mở bằng công cụ GUI trên máy
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes: [du-lieu-redis:/data]

volumes:
  du-lieu-pg:
  du-lieu-redis:
```

Chi tiết đáng chú ý: file trong `/docker-entrypoint-initdb.d/` được Postgres tự chạy khi khởi tạo lần đầu — cách gọn nhất để có sẵn schema và dữ liệu mẫu.

## Các lệnh

```bash
docker compose up -d               # khởi động nền
docker compose up --build          # build lại rồi khởi động
docker compose logs -f app         # xem log một dịch vụ
docker compose exec app sh         # vào shell của dịch vụ đang chạy
docker compose run --rm app pnpm test   # chạy lệnh một lần rồi xoá
docker compose ps
docker compose restart app
docker compose down                # dừng và xoá container
docker compose down -v             # xoá LUÔN volume — mất dữ liệu
```

Phân biệt `exec` và `run`: `exec` vào container **đang chạy**; `run` tạo container **mới** từ image. Chạy migration hay test thì dùng `run --rm`.

`down -v` là lệnh cần cẩn thận — nó xoá cả dữ liệu CSDL.

## Nhiều file cho nhiều môi trường

```yaml
# compose.yaml — phần chung
services:
  app:
    image: ung-dung:${TAG:-latest}
    restart: unless-stopped
```

```yaml
# compose.override.yaml — TỰ ĐỘNG áp dụng khi phát triển
services:
  app:
    build: { target: dev }
    volumes: ['.:/app', '/app/node_modules']
    command: pnpm dev
    environment: { NODE_ENV: development }
```

```yaml
# compose.prod.yaml — chỉ dùng khi gọi rõ ràng
services:
  app:
    environment: { NODE_ENV: production }
    deploy:
      resources:
        limits: { cpus: '1', memory: 512M }
```

```bash
docker compose up                                      # chung + override (dev)
docker compose -f compose.yaml -f compose.prod.yaml up # chung + prod
```

`compose.override.yaml` được nạp tự động — nhờ vậy lệnh mặc định luôn là lệnh dev an toàn, còn production phải khai báo rõ ràng.

## Profile — bật dịch vụ tuỳ chọn

```yaml
services:
  mailhog:
    image: mailhog/mailhog
    ports: ["8025:8025"]
    profiles: [tools]
```

```bash
docker compose up                        # không chạy mailhog
docker compose --profile tools up        # có chạy
```

Hữu ích cho công cụ phụ trợ mà không phải ai cũng cần: mail giả, giao diện quản trị DB, trình theo dõi.

## Biến môi trường

Compose đọc file `.env` ở cùng thư mục để thay thế `${BIEN}` trong file YAML:

```
# .env — chỉ dùng để nội suy vào compose file
TAG=1.2.3
POSTGRES_PASSWORD=matkhau
```

Phân biệt rõ hai thứ: `.env` (nội suy vào compose file) khác `env_file:` (biến bên trong container). Nhầm hai cái này là lỗi hay gặp.

Không commit `.env` chứa giá trị thật; commit `.env.example`.

## Compose cho production?

Được, cho hệ thống nhỏ chạy trên một máy chủ. Khi cần: chạy nhiều máy, tự động mở rộng, triển khai không gián đoạn, tự phục hồi — thì cần Kubernetes hoặc dịch vụ tương đương.

Đừng vội chuyển sang Kubernetes. Rất nhiều hệ thống chạy tốt nhiều năm chỉ với Compose trên một VPS, và độ phức tạp tiết kiệm được là rất lớn.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `down -v` theo thói quen | Mất dữ liệu CSDL dev | Chỉ `down` |
| Commit `.env` có giá trị thật | Lộ secret | Commit `.env.example` |
| Nhầm `.env` với `env_file` | Biến không tới nơi cần | Hiểu rõ hai cơ chế |
| Một file compose cho mọi môi trường | Cấu hình dev lọt lên production | Tách override |
| `exec` khi cần container mới | Lỗi khi dịch vụ chưa chạy | `run --rm` |

## Ghi nhớ

- Một file mô tả cả hệ thống; `docker compose up` là đủ cho người mới vào dự án.
- `override` nạp tự động cho dev; production phải khai báo rõ.
- `exec` vào container đang chạy, `run` tạo container mới.
- Compose đủ cho production quy mô một máy chủ.

## Tự kiểm tra

1. `docker compose exec` và `run` khác nhau thế nào? Chạy migration dùng cái nào?
2. Vì sao `compose.override.yaml` nên chứa cấu hình dev chứ không phải production?
3. Cần MailHog chỉ khi test tính năng email — cấu hình thế nào?
