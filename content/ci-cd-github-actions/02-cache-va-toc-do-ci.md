---
title: Cache và tốc độ CI
slug: cache-va-toc-do-ci
summary: CI chậm là CI không ai chờ — cache đúng cách, chạy song song, và chỉ chạy phần cần chạy.
level: trung-cap
tags: [ci-cd, cache, hieu-nang]
---

> **Sau bài này bạn sẽ:** đưa pipeline từ 10 phút xuống dưới 3 phút, và biết vì sao cache đôi khi không hiệu lực.

## Vì sao tốc độ quan trọng

CI 15 phút nghĩa là người ta không chờ kết quả — họ chuyển sang việc khác, quay lại sau, mất ngữ cảnh. Nếu CI hỏng, vòng sửa-thử mất cả buổi.

Mục tiêu thực tế: **dưới 5 phút** cho pipeline kiểm tra trên pull request.

## Cache dependency

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm                 # cách đơn giản nhất — dùng khi được
```

Kiểm soát chi tiết hơn:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

Hai khái niệm cần phân biệt:

- `key` — khớp **chính xác**. Lockfile đổi thì key đổi và cache cũ không dùng được.
- `restore-keys` — khớp **tiền tố**, dùng làm phương án dự phòng: lấy cache gần đúng rồi cài phần thiếu. Thêm một package mới không làm mất toàn bộ cache.

Không có `restore-keys` là lỗi phổ biến khiến cache "có mà như không".

## Cache build

```yaml
- uses: actions/cache@v4
  with:
    path: |
      .next/cache
      node_modules/.cache
    key: ${{ runner.os }}-build-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-build-${{ hashFiles('**/pnpm-lock.yaml') }}-
```

Cache build của Next.js/webpack/tsc tiết kiệm nhiều thời gian hơn cache dependency ở dự án lớn.

Lưu ý về giới hạn: GitHub cho 10GB cache mỗi repo và tự xoá theo LRU. Cache những thứ dựng lại tốn kém, đừng cache mọi thứ.

## Cache Docker layer

```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

`mode=max` cache cả các lớp trung gian của multi-stage build, không chỉ image cuối.

## Chạy song song

```yaml
jobs:
  lint:      { runs-on: ubuntu-latest, steps: [...] }
  typecheck: { runs-on: ubuntu-latest, steps: [...] }
  test:      { runs-on: ubuntu-latest, steps: [...] }
  build:     { needs: [lint, typecheck], runs-on: ubuntu-latest, steps: [...] }
```

Tổng thời gian trở thành thời gian của **chuỗi dài nhất**, không phải tổng các bước. Đánh đổi: mỗi job phải cài dependency lại — nên cache càng quan trọng.

Chia nhỏ bộ test lớn theo shard:

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: pnpm test --shard=${{ matrix.shard }}/4
```

## Chỉ chạy phần liên quan

```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'package.json'
      - '.github/workflows/ci.yml'
```

Sửa README không cần chạy toàn bộ test suite.

Với monorepo, dùng phát hiện thay đổi rồi chỉ chạy phần bị ảnh hưởng:

```yaml
- uses: dorny/paths-filter@v3
  id: thay-doi
  with:
    filters: |
      api: ['apps/api/**', 'packages/shared/**']
      web: ['apps/web/**', 'packages/shared/**']

- if: steps.thay-doi.outputs.api == 'true'
  run: pnpm --filter api test
```

Turborepo và Nx làm việc này tự động và chính xác hơn nhờ đồ thị phụ thuộc.

## Những cách tăng tốc khác

- **Runner mạnh hơn** cho job nặng — trả tiền để tiết kiệm thời gian người.
- **`fetch-depth: 1`** (mặc định) — chỉ lấy commit mới nhất, trừ khi cần lịch sử.
- **Bỏ bước thừa**: không build lại ở job deploy nếu artifact đã có.
- **Gộp job nhỏ**: mỗi job tốn ~20 giây khởi động; ba job 10 giây nên gộp thành một.

## Đo trước khi tối ưu

Trang Actions hiển thị thời gian từng job và từng step. Tìm hai thứ: step chiếm nhiều thời gian nhất, và các khoảng chờ giữa các job.

```yaml
- run: |
    echo "::group::Cài đặt"
    pnpm install --frozen-lockfile
    echo "::endgroup::"
```

`::group::` gom log thành nhóm gập được — dễ đọc hơn nhiều khi log dài.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không có `restore-keys` | Thêm một package là mất sạch cache | Thêm khoá tiền tố |
| Cache `node_modules` trực tiếp | Sai kiến trúc/nền tảng, lỗi khó hiểu | Cache thư mục store |
| Không lọc `paths` | Sửa docs cũng chạy full CI | Lọc theo đường dẫn |
| Nhiều job nhỏ | Chi phí khởi động lấn át | Gộp lại |
| Tối ưu không đo | Sửa nhầm chỗ | Xem thời gian từng step |

## Ghi nhớ

- `key` khớp chính xác, `restore-keys` là phương án dự phòng — cần cả hai.
- Cache thư mục store của trình quản lý gói, không cache `node_modules`.
- Song song hoá đổi thời gian lấy tài nguyên; cache bù lại phần chi phí.
- Mục tiêu: pipeline pull request dưới 5 phút.

## Tự kiểm tra

1. Vì sao thiếu `restore-keys` làm cache gần như vô dụng?
2. Vì sao cache `node_modules` trực tiếp lại nguy hiểm?
3. CI mất 12 phút: 2 phút cài, 3 phút test, 5 phút build, 2 phút lint. Tối ưu thế nào?
