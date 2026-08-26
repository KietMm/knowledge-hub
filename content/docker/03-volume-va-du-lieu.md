---
title: Volume và dữ liệu bền vững
slug: volume-va-du-lieu
summary: Ba cách gắn dữ liệu vào container, chọn cái nào, và cách sao lưu volume.
level: trung-cap
tags: [docker, volume, du-lieu]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng giữa volume và bind mount, và biết vì sao "container mất dữ liệu" không phải lỗi mà là thiết kế.

## Ý tưởng chính

Container có một **lớp ghi mỏng** ở trên cùng. Mọi thứ ghi vào đó sống đúng bằng vòng đời container — xoá container, mất sạch.

Muốn dữ liệu sống lâu hơn container, nó phải nằm **ngoài** lớp đó. Docker cho ba cách đưa nó ra ngoài, và chúng khác nhau ở một điểm: **ai quản lý chỗ chứa**.

## Mental model

Hãy nghĩ tới **ở khách sạn**.

> Đồ bạn để trên bàn trong phòng = **lớp ghi của container**. Trả phòng, dọn phòng, mất sạch.
>
> **Két an toàn của khách sạn** = **volume**. Khách sạn quản lý, bạn không biết nó nằm ở đâu trong toà nhà, nhưng đồ của bạn ở đó khi bạn quay lại — kể cả khi bạn đổi phòng.
>
> **Vali bạn mang theo, để mở giữa phòng** = **bind mount**. Đó là đồ của bạn, ở vị trí bạn chỉ định, bạn hoàn toàn kiểm soát — và bạn cũng chịu trách nhiệm nếu nó lộn xộn.

Khách sạn không cho bạn ném đồ vào két rồi tự sắp lại theo ý mình; đổi lại, két được bảo quản tốt hơn. Đó chính xác là đánh đổi giữa volume và bind mount.

## Ví dụ nhỏ

```bash
# Volume — Docker quản lý
docker run -d -v du-lieu-pg:/var/lib/postgresql/data postgres:16

# Bind mount — bạn chỉ định thư mục trên máy
docker run -d -v "$(pwd)/src:/app/src" node:20
```

## Code chạy thế nào

**Ba cách, khác nhau ở chỗ nào:**

```text
① VOLUME            -v ten-volume:/duong/dan/trong/container
   Chỗ chứa:        Docker quản lý (/var/lib/docker/volumes/...)
   Dùng cho:        DỮ LIỆU THẬT — CSDL, file người dùng tải lên
   Ưu:              nhanh trên mọi HĐH, backup được bằng lệnh Docker,
                    không phụ thuộc đường dẫn máy chủ

② BIND MOUNT        -v /duong/dan/tren/may:/duong/dan/trong/container
   Chỗ chứa:        thư mục cụ thể trên máy bạn
   Dùng cho:        MÃ NGUỒN lúc phát triển (sửa file → container thấy ngay)
   Nhược:           chậm trên macOS/Windows, phụ thuộc đường dẫn máy,
                    dễ gây lỗi quyền

③ tmpfs             --tmpfs /app/tam
   Chỗ chứa:        RAM
   Dùng cho:        file tạm chứa dữ liệu nhạy cảm — không chạm đĩa
```

Quy tắc chọn gọn lại thành một câu: **dữ liệu thật thì dùng volume, mã nguồn lúc dev thì dùng bind mount.**

**Cái bẫy `node_modules` — mọi người đều gặp một lần:**

```yaml
volumes:
  - ./:/app                # bind mount cả thư mục dự án
```

```text
Chuyện xảy ra:
  ① Lúc build, `npm ci` tạo /app/node_modules TRONG image (Linux)
  ② Lúc chạy, bind mount ĐÈ /app bằng thư mục trên máy bạn
  ③ node_modules trong image bị che mất
  ④ Nếu máy bạn là macOS, node_modules trên máy có binary của macOS
  ⇒ "Cannot find module" hoặc lỗi binary không tương thích
```

Cách sửa — chồng một volume ẩn danh lên đúng chỗ đó:

```yaml
volumes:
  - ./:/app
  - /app/node_modules      # ← giữ node_modules CỦA IMAGE, không bị đè
```

Nguyên lý ở đây: **mount cụ thể hơn thắng**. `/app/node_modules` sâu hơn `/app` nên nó được áp sau và che phần tương ứng.

## Cú pháp

```bash
docker volume ls
docker volume inspect du-lieu-pg      # nằm ở đâu trên đĩa
docker volume rm du-lieu-pg           # xoá — KHÔNG khôi phục được
docker volume prune                   # xoá mọi volume không container nào dùng

# Chỉ đọc — cấu hình thì nên như vậy
docker run -v ./nginx.conf:/etc/nginx/nginx.conf:ro nginx
```

Hậu tố `:ro` đáng dùng cho mọi file cấu hình: nó biến "container không nên sửa file này" thành "container **không thể** sửa file này".

**Sao lưu volume — dùng một container tạm:**

```bash
# Sao lưu
docker run --rm \
  -v du-lieu-pg:/data:ro \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/pg-2026-08-21.tar.gz -C /data .

# Khôi phục
docker run --rm \
  -v du-lieu-pg:/data \
  -v "$(pwd)":/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/pg-2026-08-21.tar.gz -C /data"
```

Kỹ thuật này — dựng một container `alpine` chỉ để gắn volume vào rồi thao tác — dùng được cho mọi việc cần chạm vào ruột volume.

Với CSDL thì **tốt hơn là dùng công cụ của chính nó**:

```bash
docker exec pg pg_dump -U postgres db > sao-luu.sql
```

Lý do: `pg_dump` cho ra bản sao **nhất quán về mặt giao dịch**. Nén thẳng thư mục dữ liệu của một Postgres **đang chạy** có thể bắt được trạng thái nửa vời ([[sao-luu-va-van-hanh-postgres]]).

## Tại sao cần nó

Vì "container mất dữ liệu" là điều **được thiết kế như vậy**, và nó là nền của mọi thứ khác:

```text
Container phù du ⇒ thay thế được bất kỳ lúc nào
                 ⇒ mở rộng bằng cách chạy thêm bản sao
                 ⇒ quay lui bằng cách chạy image cũ
                 ⇒ deploy không cần lo trạng thái

Nếu container giữ trạng thái, MỌI điều trên đều mất.
```

Nên câu hỏi đúng không phải "làm sao container giữ được dữ liệu", mà **"dữ liệu nên nằm ở đâu để container không cần giữ nó"**.

**Một quy tắc kiểm tra nhanh** cho mọi dịch vụ bạn viết:

```text
Xoá container và chạy lại từ image ⇒ mất gì không?

Mất  ⇒ hoặc thứ đó phải vào volume/CSDL,
       hoặc nó đáng ra không nên tồn tại (cache tính lại được).
Không ⇒ dịch vụ của bạn thực sự phi trạng thái.
```

## So sánh

| | Volume | Bind mount | tmpfs |
|---|---|---|---|
| Ai quản lý chỗ chứa | Docker | bạn | RAM |
| Sống qua `docker rm` | ✅ | ✅ | ❌ |
| Tốc độ trên macOS | nhanh | **chậm** | nhanh |
| Backup bằng lệnh Docker | ✅ | thủ công | — |
| Dùng cho | CSDL, upload | mã nguồn khi dev | file tạm nhạy cảm |

## Dễ nhầm

**1. Để dữ liệu CSDL trong lớp ghi của container.** Xoá container là mất.

**2. Dùng bind mount cho dữ liệu production.** Phụ thuộc đường dẫn máy chủ và rất chậm trên máy dev.

**3. Bind mount cả `/app` mà quên chồng volume cho `node_modules`.**

**4. `docker volume prune` mà không nhìn kỹ.** Volume của CSDL cũng bị xoá nếu container đang dừng.

**5. Không gắn `:ro` cho file cấu hình.**

**6. Nén thư mục dữ liệu của CSDL đang chạy.** Bản sao có thể không nhất quán.

**7. Chưa bao giờ thử KHÔI PHỤC.** Bản sao lưu chưa từng khôi phục thử không phải bản sao lưu.

**8. Lẫn lộn thứ tự `-v nguon:dich`.** Bên trái là trên máy/tên volume, bên phải là trong container.

**9. Lỗi quyền với bind mount:** user trong container có UID khác chủ thư mục trên máy ⇒ "permission denied" ([[quyen-va-nguoi-dung]]).

## Mẹo nhớ

> **Lớp ghi của container là phù du. Dữ liệu thật phải ra ngoài.**
>
> **Volume cho DỮ LIỆU, bind mount cho MÃ NGUỒN lúc dev.**
>
> **Mount cụ thể hơn thắng — đó là cách cứu `node_modules`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba cách gắn dữ liệu, mỗi cách dùng khi nào?
2. Điều gì xảy ra với dữ liệu trong lớp ghi khi container bị xoá?
3. Vì sao bind mount `/app` làm hỏng `node_modules`, và cách sửa?
4. Vì sao nên dùng `pg_dump` thay vì nén thư mục dữ liệu?
5. Câu hỏi nào giúp kiểm tra một dịch vụ có thực sự phi trạng thái không?

## Tự viết lại

Không nhìn lại, viết cấu hình cho một dịch vụ web + Postgres, sao cho:

```text
① Dữ liệu Postgres sống qua việc xoá container
② Sửa code trên máy → container thấy ngay, KHÔNG hỏng node_modules
③ File nginx.conf gắn ở chế độ chỉ đọc
④ Một lệnh sao lưu CSDL
```

Tự kiểm: bạn dùng volume hay bind mount cho ①, và vì sao không dùng cái còn lại?

## Thử sức

Sau `docker compose down -v`, toàn bộ dữ liệu production **biến mất**. Không có bản sao lưu nào chạy được.

Ba câu để trả lời: cờ `-v` đã làm gì; hai thay đổi ngăn điều này xảy ra lần nữa; và làm sao **chứng minh** bản sao lưu mới của bạn dùng được. Câu khó nhất: nếu chỉ nói "cẩn thận hơn khi gõ lệnh", vì sao đó **không phải** một biện pháp — và bạn thay nó bằng gì?
