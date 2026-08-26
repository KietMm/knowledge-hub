---
title: Docker Compose cho môi trường phát triển
slug: docker-compose
summary: Mô tả cả hệ thống nhiều dịch vụ trong một file, và tách cấu hình dev với production.
level: trung-cap
tags: [docker, compose, moi-truong-phat-trien]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được một `compose.yml` mà người mới vào đội chạy đúng một lệnh là có cả hệ thống.

## Ý tưởng chính

Compose mô tả **toàn bộ hệ thống nhiều dịch vụ trong một file**: chạy gì, nối với nhau ra sao, dữ liệu để đâu.

Giá trị thật của nó không phải là gõ ít lệnh hơn. Đó là biến một trang tài liệu "Hướng dẫn cài đặt môi trường" — thứ luôn lỗi thời — thành **một file được kiểm soát phiên bản cùng mã nguồn**.

## Mental model

Hãy nghĩ tới **kịch bản sân khấu so với chỉ đạo từng diễn viên**.

> Không có Compose: bạn đứng cánh gà, gọi từng diễn viên ra, dặn từng người đứng đâu, mặc gì, nói với ai. Mỗi buổi diễn phải làm lại. Người mới không biết bắt đầu từ đâu.
>
> Có Compose: **kịch bản viết sẵn** — ai ra sân khấu, theo thứ tự nào, đứng ở đâu. Ai cầm kịch bản cũng dựng lại được đúng buổi diễn đó.

Và như kịch bản, giá trị nằm ở chỗ nó **là nguồn sự thật**: sửa cách hệ thống chạy nghĩa là sửa file, không phải sửa thói quen của người trong đội.

## Ví dụ nhỏ

```yaml
services:
  web:
    build: .
    ports: ['3000:3000']
    environment:
      DATABASE_URL: postgres://postgres:pass@db:5432/app
    depends_on:
      db: { condition: service_healthy }

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: pass
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      retries: 5

volumes:
  pgdata:
```

## Code chạy thế nào

**`docker compose up` làm gì, theo thứ tự:**

```text
① Đọc compose.yml
② Tạo một network riêng cho dự án
   → mọi dịch vụ trong file gọi nhau bằng TÊN được ngay
③ Tạo các volume khai trong `volumes:` (nếu chưa có)
④ Build những service có `build:`, kéo image cho những service có `image:`
⑤ Khởi động theo thứ tự phụ thuộc (depends_on)
⑥ Gộp log của mọi service vào một luồng
```

Bước ② là lý do bạn **không cần khai `networks:`** trong phần lớn trường hợp — Compose đã làm sẵn.

**`down` với `down -v` — một chữ, hai kết quả rất khác:**

```text
docker compose down       xoá container + network.  VOLUME CÒN.
docker compose down -v    xoá luôn VOLUME ⇒ MẤT TOÀN BỘ DỮ LIỆU.
```

Đây là lệnh nguy hiểm nhất trong Docker. Đáng để đặt alias, hoặc ít nhất là đọc hai lần trước khi Enter.

## Cú pháp

```bash
docker compose up -d            # chạy nền
docker compose up --build       # build lại rồi chạy
docker compose logs -f web      # log của một service
docker compose ps               # trạng thái
docker compose exec web sh      # shell trong service đang chạy
docker compose restart web
docker compose down
```

**Tách dev và production bằng cách chồng file:**

```yaml
# compose.yml — phần chung
services:
  web:
    build: .
    environment:
      DATABASE_URL: postgres://postgres:pass@db:5432/app
```

```yaml
# compose.override.yml — TỰ ĐỘNG được nạp thêm khi chạy ở máy dev
services:
  web:
    volumes: ['./src:/app/src', '/app/node_modules']
    command: npm run dev
    environment:
      NODE_ENV: development
```

```yaml
# compose.prod.yml — phải chỉ định rõ
services:
  web:
    image: registry.cua-toi/app:1.4.2   # dùng image đã build, không build tại chỗ
    restart: always
    deploy:
      resources:
        limits: { memory: 512M }
```

```bash
docker compose up                                    # chung + override (dev)
docker compose -f compose.yml -f compose.prod.yml up # chung + prod
```

Điều đáng chú ý ở cách chia này: **file chung không chứa gì riêng của dev**. Nếu bạn thấy mình viết `command: npm run dev` trong `compose.yml`, đó là dấu hiệu ranh giới bị lẫn.

**Secret không viết thẳng vào file:**

```yaml
environment:
  DATABASE_URL: ${DATABASE_URL:?Thiếu DATABASE_URL}   # bắt buộc, báo lỗi rõ
  PORT: ${PORT:-3000}                                  # có mặc định
```

Compose tự đọc file `.env` cạnh `compose.yml`. Và `.env` phải nằm trong `.gitignore` ([[quan-ly-secret-va-cau-hinh]]).

## Tại sao cần nó

Vì nó thay thế được thứ tệ nhất trong README: mục "Cài đặt môi trường".

```text
Không Compose:
  Cài Postgres 16 (bản nào? cổng nào?)
  Cài Redis
  Tạo database, tạo user
  Copy .env.example, sửa 12 giá trị
  → Người mới mất một ngày. Và tài liệu lỗi thời sau ba tuần.

Có Compose:
  git clone && docker compose up
  → 5 phút. Và mọi người có CÙNG một môi trường.
```

Vế thứ hai quan trọng hơn vế thứ nhất: khác biệt môi trường giữa các máy là nguồn của loại bug tốn thời gian nhất — loại chỉ xảy ra với một người.

**Compose dùng cho production được không:** được, cho **một máy chủ đơn**, và nhiều hệ thống nhỏ chạy như vậy rất ổn. Nó không làm được: chạy trên nhiều máy, tự mở rộng, cập nhật không gián đoạn. Cần những thứ đó thì mới cần tới Kubernetes hoặc nền tảng quản lý sẵn — và **đừng chuyển trước khi thực sự cần** ([[chi-phi-ha-tang]]).

## So sánh

| | `docker run` | Compose |
|---|---|---|
| Nhiều dịch vụ | nhiều lệnh dài | một file |
| Network | tự tạo, tự nối | tự động |
| Được lưu vào git | ❌ nằm trong đầu | ✅ |
| Người mới vào đội | đọc README | `docker compose up` |
| Nhiều máy chủ | ❌ | ❌ (cần orchestrator) |

## Dễ nhầm

**1. `docker compose down -v` nhầm.** Mất toàn bộ dữ liệu.

**2. Viết secret thẳng vào `compose.yml`** rồi commit.

**3. Trộn cấu hình dev vào file chung.** Ranh giới lẫn lộn, production mang theo thứ của dev.

**4. Dùng `build:` ở production.** Production nên chạy **image đã build và đã kiểm thử**, không build lại tại chỗ.

**5. Quên `volumes:` cho CSDL.** Dữ liệu mất mỗi lần tạo lại container.

**6. Tin `depends_on` là "đợi sẵn sàng".** Cần healthcheck ([[mang-va-ket-noi]]).

**7. Không đặt `restart:` ở production.** Sập là nằm im.

**8. Không giới hạn tài nguyên.** Một dịch vụ rò rỉ bộ nhớ kéo cả máy chủ theo.

**9. Sửa file rồi chỉ `restart`.** Đổi image hoặc biến môi trường thì phải `up -d` để tạo lại container.

## Mẹo nhớ

> **Một file, một lệnh, cả hệ thống — và nó nằm trong git.**
>
> **`down -v` XOÁ VOLUME. Đọc hai lần trước khi Enter.**
>
> **File chung + file override: dev và production KHÔNG dùng chung file.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `docker compose up` làm những gì, theo thứ tự?
2. `down` khác `down -v` ở điểm nào?
3. Vì sao tách `compose.override.yml` ra khỏi `compose.yml`?
4. Vì sao production nên dùng `image:` thay vì `build:`?
5. Compose làm được gì và không làm được gì so với orchestrator?

## Tự viết lại

Không nhìn lại, viết `compose.yml` + `compose.override.yml` cho web + Postgres + Redis, sao cho:

```text
① Người mới chạy `docker compose up` là có cả hệ thống
② Dữ liệu Postgres sống qua `down`
③ Sửa code là thấy ngay (chỉ ở dev)
④ Không secret nào nằm trong file
⑤ web đợi Postgres thật sự sẵn sàng
```

Tự kiểm: nếu xoá `compose.override.yml` đi, file còn lại có chạy được ở production không — hay nó vẫn cần thứ gì của dev?

## Thử sức

Người mới vào đội mất **hai ngày** để dựng môi trường, và cuối cùng vẫn gặp một lỗi không ai khác gặp.

Ba câu để trả lời: Compose giải quyết được phần nào của vấn đề này, và **phần nào thì không**; bạn viết `compose.yml` thế nào để họ chỉ cần một lệnh; và bạn **kiểm chứng** nó thật sự hoạt động trên máy sạch bằng cách nào. Câu khó nhất: dữ liệu mẫu để đăng nhập thử — bạn đưa nó vào đâu để nó cũng là một phần của "một lệnh"?
