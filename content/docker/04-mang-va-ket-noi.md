---
title: Mạng giữa các container
slug: mang-va-ket-noi
summary: Container gọi nhau bằng tên dịch vụ, và vì sao localhost bên trong container không phải máy của bạn.
level: trung-cap
tags: [docker, mang, network]
khung: v2
---

> **Sau bài này bạn sẽ:** biết chính xác vì sao `localhost:5432` trong container không tìm thấy Postgres, và gọi đúng bằng gì.

## Ý tưởng chính

Mỗi container có **ngăn xếp mạng riêng**: card mạng riêng, IP riêng, bảng cổng riêng.

Nên `localhost` bên trong container nghĩa là **chính container đó** — không phải máy của bạn, không phải container bên cạnh.

Đây là nguồn của gần như mọi lỗi kết nối trong Docker.

## Mental model

Hãy nghĩ tới **các căn hộ trong một chung cư có tổng đài nội bộ**.

> Trong căn hộ của bạn, "phòng khách" nghĩa là **phòng khách của bạn** — dù mọi căn hộ đều có một cái. Đó là `localhost`.
>
> Muốn gọi sang căn hộ khác, bạn gọi qua **tổng đài nội bộ bằng tên**: "cho tôi gặp căn hộ *db*". Đó là mạng của Docker, và tổng đài là **DNS nội bộ**.
>
> Và người ngoài chung cư chỉ liên lạc được với căn hộ nào đã **đăng ký một số hotline ra ngoài**. Đó là `-p`.

Ba tầng địa chỉ đó — trong nhà, giữa các nhà, và ra ngoài — là toàn bộ nội dung của bài này.

## Ví dụ nhỏ

```yaml
services:
  web:
    build: .
    ports: ['3000:3000']
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/mydb   # ← "db", không phải localhost
  db:
    image: postgres:16
```

## Code chạy thế nào

**Ba tầng địa chỉ, và mỗi tầng dùng gì:**

```text
① BÊN TRONG một container
   localhost / 127.0.0.1  → chính container đó
   ⇒ web gọi localhost:5432 = "tìm Postgres bên trong CHÍNH TÔI" → không có

② GIỮA các container trên cùng một network
   Gọi bằng TÊN DỊCH VỤ: db:5432, redis:6379
   ⇒ Docker chạy một DNS nội bộ; tên dịch vụ phân giải thành IP của container.
   ⇒ Dùng cổng THẬT bên trong (5432), KHÔNG phải cổng đã ánh xạ ra ngoài.

③ TỪ MÁY BẠN vào container
   Chỉ tới được cổng đã khai `-p` / `ports:`
   localhost:3000 → cổng 3000 của container web
```

Ở tầng ② có một chi tiết hay sai: nếu bạn khai `ports: ['5433:5432']`, thì **từ máy bạn** gọi `localhost:5433`, nhưng **từ container khác** vẫn gọi `db:5432`. Ánh xạ cổng chỉ liên quan tới đường ra ngoài.

**Vì sao ứng dụng phải nghe ở `0.0.0.0`:**

```text
app.listen(3000, '127.0.0.1')   ❌
  → chỉ nhận kết nối từ BÊN TRONG container.
  → `-p 3000:3000` vẫn không tới được ⇒ "connection refused".

app.listen(3000, '0.0.0.0')     ✅
  → nhận từ mọi card mạng, kể cả đường Docker chuyển vào.
```

Đây là nguyên nhân số một của "container chạy mà không truy cập được", và nó **không** hiện ra trong log — ứng dụng khởi động bình thường.

## Cú pháp

```bash
docker network ls
docker network create app-net
docker run --network app-net --name db postgres:16
docker run --network app-net --name web -p 3000:3000 my-app

# Gỡ lỗi TỪ BÊN TRONG container — cách duy nhất đáng tin
docker exec -it web sh
  ping db                 # DNS có phân giải được không?
  nc -zv db 5432          # cổng có mở không?
  wget -qO- http://db:5432
```

Compose tự tạo một network cho toàn bộ dự án, nên mọi dịch vụ trong cùng file gọi nhau bằng tên được ngay, không cần khai gì.

**Ba loại network:**

```text
bridge   mặc định. Container cách ly, gọi nhau bằng tên. → dùng cái này
host     dùng chung mạng của máy chủ. Không cách ly, không cần -p.
         Chỉ có trên Linux; nhanh hơn chút nhưng mất cách ly.
none     không có mạng. Cho job xử lý dữ liệu thuần tính toán.
```

**Tách mạng để giới hạn ai nói chuyện được với ai:**

```yaml
services:
  web:
    networks: [frontend, backend]
    ports: ['3000:3000']
  db:
    networks: [backend]        # KHÔNG có frontend ⇒ không lộ ra ngoài
networks:
  frontend:
  backend:
```

Và điều quan trọng hơn: **đừng khai `ports:` cho CSDL**. Không có nó, Postgres vẫn được `web` gọi tới bình thường qua mạng nội bộ, nhưng **không nghe từ Internet**. Rất nhiều vụ rò rỉ CSDL bắt đầu từ một dòng `ports: ['5432:5432']` viết cho tiện lúc dev rồi quên gỡ.

## Tại sao cần nó

Vì lỗi ở tầng mạng **không nói cho bạn biết nó là lỗi mạng**:

```text
"ECONNREFUSED 127.0.0.1:5432"
  ⇒ Nghĩa là: bạn đang dùng localhost thay vì tên dịch vụ.

"getaddrinfo ENOTFOUND db"
  ⇒ Nghĩa là: hai container KHÔNG cùng một network, hoặc sai tên dịch vụ.

Container chạy, log sạch, nhưng curl từ máy không ra gì
  ⇒ Nghĩa là: ứng dụng nghe ở 127.0.0.1, hoặc quên -p.
```

Ba thông báo đó phân biệt được ba nguyên nhân khác nhau — đọc đúng là tiết kiệm được rất nhiều thời gian đoán.

**Thứ tự khởi động — cái `depends_on` không giải quyết:**

```yaml
web:
  depends_on: [db]     # chỉ đợi container db KHỞI ĐỘNG,
                        # không đợi Postgres SẴN SÀNG nhận kết nối
```

Cách đúng là healthcheck:

```yaml
db:
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U postgres']
    interval: 5s
    retries: 5
web:
  depends_on:
    db: { condition: service_healthy }
```

Nhưng ngay cả thế, ứng dụng vẫn **nên tự thử lại khi mất kết nối**: CSDL có thể khởi động lại giữa chừng lúc đang chạy, và lúc đó không có healthcheck nào cứu bạn ([[thiet-ke-cho-that-bai]]).

## So sánh

| Gọi từ đâu | Tới đâu | Dùng địa chỉ |
|---|---|---|
| container `web` | container `db` | `db:5432` |
| container `web` | chính nó | `localhost:3000` |
| máy bạn | container `web` | `localhost:<cổng đã -p>` |
| container `web` | máy chủ (host) | `host.docker.internal` (Mac/Win) |

## Dễ nhầm

**1. Dùng `localhost` để container gọi container.** Nguyên nhân số một.

**2. Dùng cổng đã ánh xạ khi gọi nội bộ.** Giữa các container luôn dùng cổng **thật**.

**3. Ứng dụng nghe ở `127.0.0.1`.** `-p` vô dụng.

**4. Khai `ports:` cho CSDL** rồi để nguyên khi lên production.

**5. Tin `depends_on` là "đợi sẵn sàng".** Nó chỉ đợi khởi động.

**6. Container ở hai network khác nhau** rồi ngạc nhiên vì DNS không phân giải.

**7. Quên `-p`** và tưởng ứng dụng hỏng.

**8. Dùng IP của container.** IP đổi mỗi lần tạo lại — dùng tên.

**9. Dùng `network_mode: host` cho tiện.** Mất cách ly, và không chạy trên macOS.

## Mẹo nhớ

> **`localhost` trong container = CHÍNH container đó.**
>
> **Container gọi container bằng TÊN DỊCH VỤ và CỔNG THẬT.**
>
> **Ứng dụng phải nghe `0.0.0.0`, không phải `127.0.0.1`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao `localhost:5432` từ container `web` không tìm thấy Postgres?
2. Giữa hai container thì dùng cổng thật hay cổng đã ánh xạ?
3. Vì sao ứng dụng phải nghe `0.0.0.0`?
4. `ECONNREFUSED 127.0.0.1:5432` và `ENOTFOUND db` — mỗi cái chỉ ra nguyên nhân gì?
5. `depends_on` giải quyết gì và **không** giải quyết gì?

## Tự viết lại

Không nhìn lại, viết `docker-compose.yml` cho web + Postgres + Redis, sao cho:

```text
① web ra được Internet ở cổng 3000
② CSDL và Redis KHÔNG lộ ra ngoài
③ web đợi CSDL thật sự sẵn sàng
④ DATABASE_URL đúng
```

Tự kiểm: `DATABASE_URL` của bạn dùng host nào và cổng nào — và nếu bạn thêm `ports: ['5433:5432']` cho db, chuỗi đó có phải đổi không?

## Thử sức

Ứng dụng chạy tốt trên máy bạn (`npm run dev` + Postgres cài trực tiếp), nhưng khi đưa vào Docker Compose thì báo `ECONNREFUSED 127.0.0.1:5432`.

Ba câu để trả lời: nguyên nhân; bạn sửa ở đâu — mã nguồn, biến môi trường, hay compose file, và vì sao chọn chỗ đó; và cách cấu hình để **cùng một mã** chạy được cả hai môi trường. Câu khó nhất: nếu sửa xong mà lỗi đổi thành `ENOTFOUND db`, chuyện gì đã xảy ra?
