---
title: Container và image
slug: container-va-image
summary: Container không phải máy ảo — hiểu điều đó giải thích vì sao nó nhẹ, nhanh và có những giới hạn gì.
level: co-ban
tags: [docker, container, co-ban]
---

> **Sau bài này bạn sẽ:** phân biệt image với container, và chạy được một ứng dụng trong container mà không phải sao chép lệnh từ đâu đó.

## Container khác máy ảo thế nào

| | Máy ảo | Container |
|---|---|---|
| Ảo hoá | Cả phần cứng | Chỉ tiến trình |
| Nhân hệ điều hành | Riêng cho mỗi VM | **Dùng chung** với máy chủ |
| Kích thước | Vài GB | Vài chục MB |
| Khởi động | Vài chục giây | Chưa tới một giây |
| Cô lập | Rất mạnh | Ở mức tiến trình |

Container thực chất chỉ là một **tiến trình Linux thường** được cô lập bằng hai cơ chế của nhân: `namespace` (thấy hệ thống file, mạng, danh sách tiến trình riêng) và `cgroup` (giới hạn CPU, bộ nhớ).

Hai hệ quả quan trọng của việc dùng chung nhân:

1. Container Linux **không chạy được** trên nhân Windows/macOS — Docker Desktop chạy một máy ảo Linux ẩn bên dưới.
2. Cô lập yếu hơn máy ảo. Với workload không tin cậy (chạy code người lạ), cần thêm lớp như gVisor hoặc microVM.

## Image và container

- **Image** — bản mẫu chỉ đọc, gồm nhiều lớp xếp chồng. Giống một class.
- **Container** — một lần chạy của image, có thêm lớp ghi ở trên cùng. Giống một instance.

Từ một image tạo được nhiều container, mỗi cái có lớp ghi riêng.

**Container là phù du.** Xoá container là mất mọi thứ ghi trong lớp ghi của nó. Dữ liệu cần giữ phải nằm ở volume — đây là hiểu lầm số một của người mới.

## Các lệnh cần thiết

```bash
# Image
docker pull node:22-alpine
docker images
docker build -t ung-dung:1.0 .
docker rmi ung-dung:1.0

# Container
docker run -d --name web -p 3000:3000 ung-dung:1.0
docker ps                 # đang chạy
docker ps -a              # cả đã dừng
docker logs -f web
docker exec -it web sh    # mở shell bên trong
docker stop web && docker rm web

# Dọn dẹp
docker system df          # đang chiếm bao nhiêu dung lượng
docker system prune -a    # xoá mọi thứ không dùng — cẩn thận
```

`docker exec -it <ten> sh` là lệnh dùng nhiều nhất khi gỡ lỗi: nó cho bạn vào bên trong xem file và biến môi trường thật sự là gì.

## Các cờ của `docker run`

```bash
docker run \
  -d                              `# chạy nền` \
  --name web                      `# đặt tên, dễ thao tác sau này` \
  -p 3000:3000                    `# cổng máy chủ : cổng container` \
  -e NODE_ENV=production          `# biến môi trường` \
  --env-file .env                 `# nhiều biến từ file` \
  -v du-lieu:/app/data            `# volume` \
  --restart unless-stopped        `# tự chạy lại` \
  --memory 512m --cpus 1          `# giới hạn tài nguyên` \
  ung-dung:1.0
```

Thứ tự `-p` là **cổng-ngoài:cổng-trong**. Nhớ sai thứ tự là lỗi phổ biến nhất khi mới học.

`--restart unless-stopped` cần cho production: container chết là tự lên lại, và máy chủ khởi động lại cũng vậy.

Luôn đặt `--memory`: không có nó, một container rò rỉ bộ nhớ sẽ kéo sập cả máy chủ.

## Vòng đời

```
created → running → paused → stopped → removed
```

`docker stop` gửi `SIGTERM`, chờ 10 giây rồi mới `SIGKILL`. Ứng dụng phải bắt `SIGTERM` để đóng kết nối tử tế — nếu không, mỗi lần triển khai là một số request bị cắt giữa chừng.

## Tag: đừng dùng `latest`

```bash
docker pull node:22.11.0-alpine3.20    # cụ thể — dựng lại được y hệt
docker pull node:22-alpine             # chấp nhận được
docker pull node:latest                # nguy hiểm: hôm nay khác hôm qua
```

`latest` không có nghĩa là "mới nhất" — nó chỉ là tag mặc định. Dùng nó nghĩa là build của bạn không tái lập được, và CI có thể hỏng vì một thay đổi bạn không hề biết.

Trong production, ghim theo digest để chắc chắn tuyệt đối:

```dockerfile
FROM node:22-alpine@sha256:abc123...
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Lưu dữ liệu trong container | Xoá container là mất sạch | Dùng volume |
| `-p 3000:80` nhầm thứ tự | Không truy cập được | Ngoài:trong |
| Dùng tag `latest` | Build không tái lập được | Ghim phiên bản |
| Không giới hạn bộ nhớ | Một container kéo sập máy chủ | `--memory` |
| Không xử lý `SIGTERM` | Request bị cắt khi triển khai | Đóng máy chủ tử tế |

## Ghi nhớ

- Container là tiến trình cô lập, dùng chung nhân với máy chủ.
- Image là bản mẫu, container là một lần chạy — và nó phù du.
- Dữ liệu cần giữ luôn nằm ở volume.
- Ghim phiên bản image; `latest` không tái lập được.

## Tự kiểm tra

1. Vì sao container khởi động nhanh hơn máy ảo rất nhiều?
2. `docker run -p 8080:3000` — ứng dụng bên trong nghe cổng nào, truy cập từ ngoài bằng cổng nào?
3. Điều gì xảy ra với dữ liệu khi `docker rm` một container CSDL không có volume?
