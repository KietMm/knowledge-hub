---
title: Mạng giữa các container
slug: mang-va-ket-noi
summary: Container gọi nhau bằng tên dịch vụ, và vì sao localhost bên trong container không phải máy của bạn.
level: trung-cap
tags: [docker, mang, network]
---

> **Sau bài này bạn sẽ:** sửa được lỗi "connection refused" giữa app và database, và biết chọn loại network phù hợp.

## Bốn loại network

| Loại | Hành vi |
|---|---|
| `bridge` | Mặc định — mạng ảo riêng, container nói chuyện được với nhau |
| `host` | Dùng thẳng mạng của máy chủ, không cô lập (chỉ Linux) |
| `none` | Không có mạng |
| `overlay` | Nhiều máy chủ (Swarm/Kubernetes) |

```bash
docker network create mang-ung-dung
docker network ls
docker network inspect mang-ung-dung
docker network connect mang-ung-dung ten-container
```

## Phân giải tên theo tên dịch vụ

Container trong cùng một **user-defined network** gọi nhau bằng **tên container/tên service**. Docker có sẵn DNS nội bộ:

```yaml
services:
  app:
    environment:
      # "db" chính là tên service bên dưới
      DATABASE_URL: postgresql://user:pass@db:5432/appdb
      REDIS_URL: redis://cache:6379
  db:
    image: postgres:16
  cache:
    image: redis:7
```

Điểm cần nhớ: **network mặc định (`bridge`) không có DNS này** — nó chỉ hoạt động trên network do bạn tạo. Docker Compose tự tạo một network riêng cho mỗi project nên trong compose thì luôn dùng được.

## `localhost` bên trong container

Đây là hiểu lầm phổ biến nhất:

```
localhost trong container  =  chính container đó
localhost trên máy bạn     =  máy của bạn
```

```yaml
# SAI: app đi tìm postgres bên trong chính container app
DATABASE_URL: postgresql://user:pass@localhost:5432/appdb

# ĐÚNG
DATABASE_URL: postgresql://user:pass@db:5432/appdb
```

Cần gọi ngược ra dịch vụ đang chạy trên **máy chủ** (ví dụ CSDL cài trực tiếp trên máy dev):

```
host.docker.internal        # macOS, Windows, và Linux từ Docker 20.10 với extra_hosts
```

## Ánh xạ cổng

```yaml
services:
  app:
    ports:
      - "3000:3000"        # ai cũng truy cập được từ ngoài
      - "127.0.0.1:5432:5432"   # CHỈ máy chủ truy cập được
  db:
    # không khai báo ports -> chỉ container trong cùng network gọi được
```

Quan trọng về bảo mật: `"5432:5432"` mở cổng CSDL ra **mọi giao diện mạng**, kể cả IP công khai — và nhiều tường lửa không chặn vì Docker ghi luật iptables riêng, đứng trước UFW. Rất nhiều CSDL bị lộ trên internet theo đúng cách này.

Quy tắc: dịch vụ nội bộ **không khai báo `ports`**. Chỉ container cần truy cập từ ngoài mới mở, và nếu chỉ cần cho máy chủ thì gắn `127.0.0.1:`.

## Chờ dịch vụ sẵn sàng

`depends_on` chỉ đảm bảo **thứ tự khởi động**, không đảm bảo dịch vụ đã sẵn sàng nhận kết nối:

```yaml
services:
  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    depends_on:
      db:
        condition: service_healthy      # chờ healthcheck xanh, không chỉ chờ khởi động
```

Ngay cả vậy, ứng dụng vẫn nên **tự thử lại kết nối**. CSDL có thể khởi động lại giữa chừng khi hệ thống đang chạy, và lúc đó không có `depends_on` nào giúp được.

## Chia mạng theo tầng

```yaml
services:
  nginx:
    networks: [cong-khai]
    ports: ["80:80", "443:443"]

  app:
    networks: [cong-khai, noi-bo]     # cầu nối giữa hai tầng

  db:
    networks: [noi-bo]                # KHÔNG thấy được từ mạng công khai

networks:
  cong-khai:
  noi-bo:
    internal: true                    # không có lối ra internet
```

Cấu trúc này áp dụng đặc quyền tối thiểu ở tầng mạng: `nginx` bị chiếm quyền cũng không kết nối thẳng tới `db` được.

## Gỡ lỗi mạng

```bash
docker exec app ping db                    # DNS phân giải được không
docker exec app nc -zv db 5432             # cổng có mở không
docker exec app env | grep DATABASE        # biến môi trường có đúng không
docker network inspect mang | jq '.[0].Containers'   # ai đang ở trong network

# Image có sẵn công cụ mạng khi container không có
docker run --rm --network mang-ung-dung nicolaka/netshoot dig db
```

Thứ tự kiểm tra khi "connection refused": DNS phân giải được chưa → cổng có mở không → dịch vụ đích đã sẵn sàng chưa → chuỗi kết nối có đúng không.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `localhost` trong chuỗi kết nối | Connection refused | Dùng tên service |
| `ports: "5432:5432"` cho CSDL | Lộ ra internet | Bỏ `ports`, hoặc gắn `127.0.0.1:` |
| Tin `depends_on` là đủ | App khởi động trước khi DB sẵn sàng | `service_healthy` + tự thử lại |
| Dùng bridge mặc định | Không phân giải tên được | Tạo network riêng |
| Mọi dịch vụ chung một network | Không có ranh giới nội bộ | Chia tầng công khai/nội bộ |

## Ghi nhớ

- Container gọi nhau bằng tên service, trên network do mình tạo.
- `localhost` trong container là chính container đó.
- Dịch vụ nội bộ không mở `ports`.
- `depends_on` là thứ tự, không phải sẵn sàng.

## Tự kiểm tra

1. App báo "connection refused" tới Postgres — bốn bước kiểm tra theo thứ tự?
2. Vì sao `ports: "5432:5432"` nguy hiểm trên máy chủ công khai?
3. Thiết kế network cho nginx + app + db sao cho db không thấy được từ ngoài.
