---
title: Triển khai tự động
slug: trien-khai-tu-dong
summary: Từ merge tới production — chiến lược triển khai, cách quay lui, và những gì phải có trước khi tự động hoá.
level: nang-cao
tags: [ci-cd, deploy, release]
---

> **Sau bài này bạn sẽ:** thiết kế được pipeline triển khai an toàn, và biết quay lui trong một phút thay vì một giờ.

## Ba mức tự động hoá

| Mức | Nghĩa là |
|---|---|
| Continuous Integration | Mỗi push được build và test tự động |
| Continuous Delivery | Mỗi commit **sẵn sàng** triển khai; bấm nút để đi |
| Continuous Deployment | Mỗi commit xanh **tự động** lên production |

Phần lớn nhóm nên dừng ở Continuous Delivery cho tới khi bộ test thật sự đáng tin. Continuous Deployment mà không đủ test nghĩa là mỗi bug đều tới thẳng người dùng.

## Pipeline triển khai

```yaml
name: Triển khai

on:
  push:
    branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: false        # KHÔNG huỷ giữa chừng khi đang deploy

jobs:
  kiem-tra:
    uses: ./.github/workflows/ci.yml

  build:
    needs: kiem-tra
    outputs:
      tag: ${{ steps.meta.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - id: meta
        run: echo "tag=${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ steps.meta.outputs.tag }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  staging:
    needs: build
    environment: staging
    steps:
      - run: ./deploy.sh staging ${{ needs.build.outputs.tag }}
      - run: ./smoke-test.sh https://staging.example.com

  production:
    needs: staging
    environment: production        # cấu hình yêu cầu người duyệt
    steps:
      - run: ./deploy.sh production ${{ needs.build.outputs.tag }}
      - run: ./smoke-test.sh https://example.com
```

Hai điểm quan trọng: `cancel-in-progress: false` (huỷ giữa chừng có thể để hệ thống ở trạng thái nửa vời), và **build một lần, dùng lại artifact đó** cho cả staging lẫn production — build lại nghĩa là thứ bạn kiểm tra ở staging không phải thứ chạy ở production.

## Chiến lược triển khai

| Chiến lược | Cách làm | Đánh đổi |
|---|---|---|
| Recreate | Dừng cũ, chạy mới | Có downtime — đơn giản nhất |
| Rolling | Thay dần từng instance | Không downtime; hai phiên bản cùng chạy |
| Blue-Green | Dựng môi trường mới, chuyển traffic một lần | Quay lui tức thì; tốn gấp đôi tài nguyên |
| Canary | Cho 5% traffic sang bản mới, tăng dần | An toàn nhất; cần đo lường tốt |

Rolling và canary nghĩa là **hai phiên bản chạy đồng thời**. Hệ quả: mọi thay đổi phải tương thích ngược trong ít nhất một chu kỳ triển khai — đặc biệt là schema CSDL.

## Migration CSDL

Đây là phần dễ gây sự cố nhất:

1. Chạy migration **trước** khi triển khai code mới.
2. Migration phải tương thích ngược — code cũ vẫn chạy được sau khi migration xong.
3. Thay đổi phá vỡ tương thích chia thành nhiều lần triển khai (expand–contract).

```
Lần 1: thêm cột mới (nullable)      → code cũ vẫn chạy
Lần 2: code mới ghi vào cả hai cột
Lần 3: chép nốt dữ liệu cũ
Lần 4: code chỉ dùng cột mới
Lần 5: xoá cột cũ
```

Chậm, nhưng không có phút nào hệ thống hỏng — và quay lui được ở mọi bước.

## Quay lui

```bash
./deploy.sh production <tag-cũ>
```

Quay lui phải **nhanh hơn sửa tới**. Điều kiện để làm được:

- Image được gắn tag theo commit, luôn còn trong registry.
- Migration tương thích ngược (nếu không, quay lui code sẽ gặp schema mới).
- Cấu hình tách khỏi code, không cần build lại.

Với feature flag, "quay lui" còn nhanh hơn nữa: tắt cờ, không cần triển khai gì cả.

## Smoke test sau triển khai

```bash
#!/usr/bin/env bash
set -euo pipefail
URL="$1"

for i in {1..30}; do
  if curl -fsS "$URL/api/health" > /dev/null; then break; fi
  sleep 2
done

curl -fsS "$URL/api/health" | grep -q '"ok":true'
curl -fsS "$URL/" | grep -q "<title>"
echo "Smoke test đạt"
```

Vòng lặp chờ ở đầu là cần thiết: ứng dụng cần thời gian khởi động sau khi container lên.

## Theo dõi sau triển khai

Triển khai xong không phải là hết việc. Trong 15 phút đầu, theo dõi: tỷ lệ lỗi, độ trễ p95, số lượng request, và log lỗi mới xuất hiện.

Lý tưởng là tự động: nếu tỷ lệ lỗi vượt ngưỡng trong 5 phút sau triển khai, tự quay lui.

Đánh dấu mốc triển khai trên biểu đồ giám sát — khi có sự cố, câu hỏi đầu tiên luôn là "có gì thay đổi trước đó không".

## Trước khi tự động hoá triển khai

- [ ] Bộ test đáng tin, không chập chờn
- [ ] Có môi trường staging giống production
- [ ] Migration tương thích ngược
- [ ] Quay lui được trong một lệnh
- [ ] Có giám sát và cảnh báo
- [ ] Endpoint health kiểm tra cả phụ thuộc
- [ ] Secret quản lý ngoài mã nguồn
- [ ] Có quy trình xử lý sự cố

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Build lại ở mỗi môi trường | Staging và production khác nhau | Build một lần, dùng lại |
| Migration phá vỡ tương thích | Downtime khi triển khai cuốn chiếu | Expand–contract |
| Không quay lui được nhanh | Sự cố kéo dài | Giữ tag cũ, migration ngược tương thích |
| Deploy xong là đóng máy | Không phát hiện lỗi sớm | Theo dõi 15 phút đầu |
| Tự động deploy khi test yếu | Bug tới thẳng người dùng | Dừng ở Continuous Delivery |

## Ghi nhớ

- Build một lần, dùng lại cùng artifact ở mọi môi trường.
- Triển khai cuốn chiếu nghĩa là hai phiên bản cùng chạy — schema phải tương thích ngược.
- Quay lui phải nhanh hơn sửa tới.
- Theo dõi 15 phút sau mỗi lần triển khai.

## Tự kiểm tra

1. Vì sao build lại image cho production là sai?
2. Thêm cột `NOT NULL` vào bảng đang chạy với rolling deploy — chia thành mấy bước?
3. Ba điều kiện để quay lui trong một phút?
