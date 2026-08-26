---
title: Container và image
slug: container-va-image
summary: Container không phải máy ảo — hiểu điều đó giải thích vì sao nó nhẹ, nhanh và có những giới hạn gì.
level: co-ban
tags: [docker, container, co-ban]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được image khác container thế nào, và vì sao container khởi động trong một giây còn máy ảo mất một phút.

## Ý tưởng chính

**Image** là bản đóng gói bất biến: mã nguồn, thư viện, hệ điều hành tối giản. Nó nằm yên, không chạy.

**Container** là một image **đang chạy**. Một image sinh ra được nhiều container cùng lúc, mỗi cái độc lập.

Quan hệ đó giống hệt quan hệ giữa **class và object**, hoặc giữa file `.exe` và tiến trình.

## Mental model

Hãy nghĩ tới **máy ảo là căn nhà riêng, container là căn hộ chung cư**.

> **Máy ảo**: mỗi cái tự có móng, tường chịu lực, hệ thống điện nước riêng — tức là **một hệ điều hành hoàn chỉnh** với nhân riêng. Xây tốn thời gian, chiếm nhiều đất.
>
> **Container**: các căn hộ **dùng chung móng và khung nhà** — dùng chung nhân của máy chủ. Mỗi căn có cửa riêng, khoá riêng, không nhìn thấy nhau. Nhưng nếu khung nhà rung thì mọi căn cùng rung.

Từ hình ảnh này suy ra được gần hết đặc tính của container: nhẹ vì không dựng lại khung; khởi động nhanh vì chỉ mở cửa chứ không xây; và **không chạy được container Linux trên nhân Windows** — vì khung nhà không tương thích.

## Ví dụ nhỏ

```bash
docker run -d -p 8080:80 --name web nginx:1.27
# -d      chạy nền
# -p 8080:80   cổng 8080 của máy → cổng 80 trong container
# nginx:1.27   image:tag
```

## Code chạy thế nào

**Chuyện gì xảy ra khi bạn gõ `docker run nginx`:**

```text
① Có image nginx trên máy chưa?
   Chưa → tải từ registry (Docker Hub), TỪNG LỚP một
② Tạo một lớp ghi mới, mỏng, đặt lên trên các lớp của image
③ Cấp namespace riêng: tiến trình, mạng, filesystem
④ Đặt giới hạn tài nguyên bằng cgroup
⑤ Chạy lệnh khai trong CMD/ENTRYPOINT
   → Tiến trình này là PID 1 bên trong container
⑥ PID 1 kết thúc ⇒ CONTAINER DỪNG
```

Bước ⑥ giải thích một hiểu lầm phổ biến: container không "chạy mãi", nó sống đúng bằng vòng đời của tiến trình chính. `docker run ubuntu` thoát ngay lập tức vì bash không có gì để làm.

**Vì sao container nhẹ và nhanh — so sánh trực tiếp:**

```text
MÁY ẢO                          CONTAINER
────────────────────────────────────────────────────
Nhân riêng (~vài trăm MB)       Dùng chung nhân máy chủ
Khởi động: 30–60 giây           Khởi động: < 1 giây
Ảnh đĩa: GB                     Image: chục–trăm MB
Cách ly: phần cứng ảo (mạnh)    Cách ly: namespace (yếu hơn)
```

Dòng cuối là cái giá phải trả: cách ly bằng namespace là **cách ly ở tầng nhân**, không phải phần cứng. Một lỗ hổng thoát container ảnh hưởng tới máy chủ theo cách mà lỗ hổng trong máy ảo không làm được.

**Hệ thống lớp — vì sao image chia sẻ được với nhau:**

```text
image A: node:20 → npm install → mã của tôi
image B: node:20 → npm install → mã khác

Hai lớp đầu GIỐNG NHAU ⇒ lưu MỘT lần trên đĩa,
tải MỘT lần từ registry.
```

Mỗi lớp là bất biến và được định danh bằng hash nội dung. Đó là nền tảng của toàn bộ chuyện cache khi build ([[viet-dockerfile]]).

## Cú pháp

```bash
docker ps                  # container đang chạy
docker ps -a               # cả những cái đã dừng
docker images              # image trên máy

docker logs -f web         # xem log
docker exec -it web sh     # mở shell BÊN TRONG container đang chạy
docker stop web            # SIGTERM, đợi 10s, rồi SIGKILL
docker rm web              # xoá container đã dừng

docker system df           # Docker đang chiếm bao nhiêu đĩa
docker system prune -a     # dọn — CẨN THẬN: xoá cả image không dùng
```

`docker exec -it <tên> sh` là lệnh gỡ lỗi quan trọng nhất: nó đưa bạn vào **bên trong** để nhìn tận mắt biến môi trường, file cấu hình, và những gì thực sự có ở đó.

**Tag — chỗ sai lặng lẽ nhất:**

```bash
docker run nginx           # ngầm hiểu là nginx:latest
docker run nginx:latest    # KHÔNG phải phiên bản cố định!
docker run nginx:1.27.2    # ✅ cố định, tái lập được
```

`latest` chỉ là một cái tên tag, không có nghĩa "mới nhất" theo cách đáng tin: nó trỏ tới bất cứ đâu người phát hành muốn, và **đổi theo thời gian**. Cùng một Dockerfile build hôm nay và tháng sau cho ra hai thứ khác nhau.

## Tại sao cần nó

Vì nó giải quyết đúng một câu nói: *"chạy được trên máy tôi mà"*.

```text
Không container:  cài Node 20, Postgres 16, Redis, đúng phiên bản,
                  đúng biến môi trường... trên MỖI máy.
                  Lệch một chút ⇒ lỗi chỉ xảy ra ở một nơi.

Có container:     `docker compose up` — cùng một image,
                  chạy giống hệt nhau ở mọi nơi.
```

Và điều đó có giá trị lớn nhất **ở chỗ khác biệt lớn nhất**: giữa laptop của bạn và máy chủ production.

**Container là phù du — đây là điều phải nhớ:**

```text
Container bị xoá ⇒ mọi thứ ghi bên trong nó BIẾN MẤT.

⇒ Dữ liệu phải nằm ngoài: volume hoặc CSDL.
⇒ Log phải ra stdout, không ghi vào file bên trong.
⇒ Không "sửa nóng" bên trong container đang chạy —
  lần deploy sau là mất.
```

Đây không phải hạn chế mà là **thiết kế**: container dùng một lần rồi vứt là điều làm cho việc mở rộng và quay lui trở nên đơn giản ([[volume-va-du-lieu]]).

## So sánh

| | Image | Container |
|---|---|---|
| Bản chất | bản đóng gói bất biến | một lần chạy của image |
| Tương tự | class, file `.exe` | object, tiến trình |
| Số lượng | 1 image | → nhiều container |
| Thay đổi khi chạy | không | có (ở lớp ghi mỏng, và **mất khi xoá**) |

## Dễ nhầm

**1. Coi container là máy ảo nhỏ.** Nó là **tiến trình bị cách ly**, không phải máy.

**2. Dùng tag `latest`.** Không tái lập được, và hỏng vào lúc bạn ít ngờ nhất.

**3. Ghi dữ liệu vào bên trong container.** Mất khi xoá.

**4. Cài thêm gói bằng `docker exec` rồi coi là xong.** Lần deploy sau biến mất — phải sửa Dockerfile.

**5. Tưởng container tự chạy mãi.** Nó sống bằng vòng đời của PID 1.

**6. Quên `-p` rồi ngạc nhiên vì không truy cập được.** Cổng không tự mở ra ngoài.

**7. Tin rằng container an toàn như máy ảo.** Cách ly yếu hơn — chung nhân.

**8. Container Linux chạy trên nhân Windows.** Không được; Docker Desktop lặng lẽ dựng một máy ảo Linux để làm việc đó.

**9. `docker system prune -a` bừa.** Xoá cả image bạn còn cần và phải tải lại.

## Mẹo nhớ

> **Image là class, container là object.**
>
> **Container = tiến trình bị cách ly, dùng CHUNG nhân — nên nhẹ và nhanh.**
>
> **Container là phù du: dữ liệu phải nằm ngoài nó.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Image khác container ở điểm nào? Một phép so sánh từ lập trình?
2. Vì sao container khởi động dưới 1 giây còn máy ảo mất cả phút?
3. Container dừng khi nào?
4. Vì sao `latest` không phải phiên bản cố định?
5. Điều gì xảy ra với dữ liệu ghi bên trong container khi nó bị xoá?

## Tự viết lại

Không nhìn lại, viết lệnh cho từng việc:

```text
① Chạy Postgres 16 ở nền, cổng 5432, đặt mật khẩu qua biến môi trường
② Xem log của nó, theo dõi liên tục
③ Mở shell psql bên trong container đó
④ Dừng và xoá nó
```

Tự kiểm: sau bước ④, dữ liệu trong CSDL còn không? Nếu bạn muốn nó còn thì phải thêm gì ở bước ①?

## Thử sức

Đồng nghiệp báo: *"Container chạy được, `docker ps` thấy nó, nhưng mở `localhost:3000` thì không có gì."*

Ba câu để trả lời: liệt kê **ba nguyên nhân** khác nhau có thể gây ra điều này; với mỗi nguyên nhân, **một lệnh** để xác nhận; và bạn kiểm tra theo thứ tự nào. Câu khó nhất: nếu ứng dụng bên trong lắng nghe ở `127.0.0.1:3000` thay vì `0.0.0.0:3000`, vì sao `-p 3000:3000` vẫn không cứu được?
