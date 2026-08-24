---
title: Volume và dữ liệu bền vững
slug: volume-va-du-lieu
summary: Ba cách gắn dữ liệu vào container, chọn cái nào, và cách sao lưu volume.
level: trung-cap
tags: [docker, volume, du-lieu]
---

> **Sau bài này bạn sẽ:** biết chọn giữa volume và bind mount, và không mất dữ liệu CSDL khi tạo lại container.

## Ba cách

| Cách | Lưu ở đâu | Dùng cho |
|---|---|---|
| **Volume** | Docker quản lý (`/var/lib/docker/volumes`) | Dữ liệu production |
| **Bind mount** | Thư mục cụ thể trên máy chủ | Mã nguồn lúc phát triển |
| **tmpfs** | RAM, mất khi container dừng | Dữ liệu tạm nhạy cảm |

```bash
docker run -v du-lieu-pg:/var/lib/postgresql/data postgres:16   # volume
docker run -v "$(pwd)":/app node:22                             # bind mount
docker run --tmpfs /tmp:size=100m ung-dung                      # tmpfs
```

## Volume — mặc định cho production

```bash
docker volume create du-lieu-pg
docker volume ls
docker volume inspect du-lieu-pg
docker volume rm du-lieu-pg
```

Volume tồn tại độc lập với container. Xoá container, tạo container mới gắn cùng volume — dữ liệu vẫn còn nguyên. Đó chính là cách nâng cấp phiên bản CSDL mà không mất gì.

Docker cũng quản lý quyền của volume tốt hơn, và trên macOS/Windows volume nhanh hơn bind mount đáng kể.

## Bind mount — cho môi trường phát triển

```yaml
services:
  app:
    build: .
    volumes:
      - .:/app                # mã nguồn: sửa trên máy là container thấy ngay
      - /app/node_modules     # volume ẩn danh: GIỮ node_modules của container
```

Dòng thứ hai giải quyết một vấn đề rất hay gặp: `.:/app` đè `node_modules` của máy chủ (có thể trống hoặc biên dịch cho hệ điều hành khác) lên `node_modules` đã cài trong image. Volume ẩn danh ở `/app/node_modules` "che" lại chỗ đó.

Nhớ bật polling cho trình theo dõi file — thông báo thay đổi file không phải lúc nào cũng xuyên qua ranh giới container:

```yaml
environment:
  - CHOKIDAR_USEPOLLING=true
```

## Chế độ chỉ đọc

```bash
docker run -v cau-hinh:/app/config:ro ung-dung
```

Cấu hình, chứng chỉ, mã nguồn trong production đều nên gắn `:ro`. Container bị chiếm quyền cũng không sửa được chúng.

## Sao lưu và khôi phục volume

```bash
# Sao lưu: chạy một container tạm gắn cả volume và thư mục hiện tại
docker run --rm \
  -v du-lieu-pg:/du-lieu:ro \
  -v "$(pwd)":/sao-luu \
  alpine tar czf /sao-luu/pg-$(date +%F).tar.gz -C /du-lieu .

# Khôi phục
docker run --rm \
  -v du-lieu-pg:/du-lieu \
  -v "$(pwd)":/sao-luu \
  alpine sh -c "rm -rf /du-lieu/* && tar xzf /sao-luu/pg-2026-08-18.tar.gz -C /du-lieu"
```

Với CSDL, cách này chỉ an toàn khi container đã **dừng** — sao lưu file dữ liệu của một CSDL đang chạy có thể cho ra bản sao không nhất quán. Bản sao lưu logic tốt hơn:

```bash
docker exec pg pg_dump -U postgres app | gzip > sao-luu-$(date +%F).sql.gz
```

Và nhớ: **bản sao lưu chưa từng thử khôi phục thì chưa phải bản sao lưu.** Hãy diễn tập khôi phục định kỳ.

## Chia sẻ volume giữa các container

```yaml
services:
  app:
    volumes: [tep-tai-len:/app/uploads]
  worker:
    volumes: [tep-tai-len:/app/uploads:ro]     # worker chỉ đọc

volumes:
  tep-tai-len:
```

Lưu ý: volume Docker là lưu trữ **cục bộ trên một máy**. Khi mở rộng ra nhiều máy chủ, file tải lên phải nằm ở object storage (S3, R2) chứ không phải volume.

## Dọn dẹp

```bash
docker volume prune            # xoá volume không container nào dùng
docker system df -v            # xem volume nào chiếm bao nhiêu
```

`docker volume prune` xoá thật và không hoàn tác được. Kiểm tra danh sách trước khi xác nhận — một volume "không được dùng" có thể chỉ đang chờ container mới.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không gắn volume cho CSDL | Mất dữ liệu khi tạo lại container | Volume cho thư mục dữ liệu |
| Bind mount đè `node_modules` | Module lỗi, kiến trúc sai | Volume ẩn danh che lại |
| Sao lưu volume của CSDL đang chạy | Bản sao không nhất quán | `pg_dump`, hoặc dừng trước |
| `volume prune` không kiểm tra | Xoá nhầm dữ liệu thật | Xem danh sách trước |
| Dùng volume cho file tải lên khi có nhiều máy chủ | File chỉ có trên một máy | Object storage |

## Ghi nhớ

- Volume cho production, bind mount cho phát triển.
- Volume sống độc lập với container — đó là điểm mấu chốt.
- Gắn `:ro` cho mọi thứ container không cần ghi.
- Sao lưu logic (`pg_dump`) an toàn hơn sao chép file.

## Tự kiểm tra

1. Vì sao cần volume ẩn danh cho `/app/node_modules` khi bind mount mã nguồn?
2. Sao lưu volume của Postgres đang chạy có an toàn không? Vì sao?
3. Ứng dụng chạy trên 3 máy chủ, có tính năng tải ảnh lên — lưu ảnh ở đâu?
