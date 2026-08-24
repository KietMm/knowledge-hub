---
title: Cấu trúc một workflow GitHub Actions
slug: cau-truc-mot-workflow
summary: Event, job, step, runner — bốn khái niệm đủ để đọc và viết mọi workflow.
level: co-ban
tags: [ci-cd, github-actions, co-ban]
---

> **Sau bài này bạn sẽ:** viết được workflow chạy test trên mỗi pull request, và đọc hiểu file YAML của người khác.

## Bốn khái niệm

```yaml
name: CI
on: [push, pull_request]        # 1. EVENT — khi nào chạy

jobs:
  kiem-tra:                     # 2. JOB — chạy song song với job khác
    runs-on: ubuntu-latest      # 3. RUNNER — máy ảo thực thi
    steps:                      # 4. STEP — tuần tự trong một job
      - uses: actions/checkout@v4
      - run: echo "xin chào"
```

Job chạy **song song** mặc định và mỗi job có máy ảo **riêng** — chúng không chia sẻ file system. Step trong cùng job chạy tuần tự trên cùng máy.

## Workflow đầy đủ

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Push liên tiếp lên cùng nhánh: huỷ lần chạy cũ, chỉ giữ lần mới nhất
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  kiem-tra:
    runs-on: ubuntu-latest
    timeout-minutes: 10          # chặn job treo tiêu tốn phút chạy

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm            # cache dependency theo lockfile

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

Hai dòng đáng chú ý: `concurrency` tiết kiệm rất nhiều phút chạy khi người ta push liên tục, và `timeout-minutes` chặn job treo chạy tới giới hạn mặc định 6 tiếng.

## Thứ tự các bước kiểm tra

Đặt bước **nhanh và hay hỏng nhất trước**: typecheck (10 giây) trước test (2 phút) trước build (3 phút). Phản hồi lỗi tới sớm hơn, và tiết kiệm tài nguyên.

## Điều kiện chạy

```yaml
- name: Chỉ triển khai từ main
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: ./deploy.sh

- name: Chạy cả khi bước trước thất bại
  if: always()
  run: ./upload-bao-cao.sh

- name: Chỉ chạy khi có lỗi
  if: failure()
  run: ./thong-bao-loi.sh
```

`if: always()` cần cho các bước thu thập kết quả — không có nó, báo cáo test không được tải lên đúng khi test thất bại, tức đúng lúc bạn cần nó nhất.

## Phụ thuộc giữa job

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps: [...]

  build:
    needs: test                  # chỉ chạy khi test xanh
    runs-on: ubuntu-latest
    steps: [...]

  deploy:
    needs: [test, build]
    if: github.ref == 'refs/heads/main'
    environment: production      # có thể yêu cầu người duyệt
    runs-on: ubuntu-latest
    steps: [...]
```

`environment: production` cho phép cấu hình yêu cầu phê duyệt thủ công và giới hạn secret chỉ dùng được ở môi trường đó.

## Ma trận

```yaml
strategy:
  fail-fast: false               # một tổ hợp hỏng không huỷ các tổ hợp khác
  matrix:
    node: [20, 22]
    os: [ubuntu-latest, windows-latest]
runs-on: ${{ matrix.os }}
```

Bốn tổ hợp chạy song song. `fail-fast: false` quan trọng khi debug: bạn muốn biết **những** tổ hợp nào hỏng, không chỉ cái đầu tiên.

## Dịch vụ phụ trợ cho test

```yaml
services:
  postgres:
    image: postgres:16
    env: { POSTGRES_PASSWORD: postgres }
    ports: ['5432:5432']
    options: >-
      --health-cmd pg_isready --health-interval 10s --health-retries 5

steps:
  - run: pnpm test:integration
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
```

Tuỳ chọn `--health-cmd` bắt buộc: không có nó, test bắt đầu trước khi Postgres sẵn sàng và thất bại ngẫu nhiên.

## Artifact — truyền file giữa các job

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: bao-cao-test
    path: coverage/
    retention-days: 7

# Ở job khác
- uses: actions/download-artifact@v4
  with: { name: bao-cao-test }
```

Vì mỗi job có máy riêng, đây là cách duy nhất chuyển file giữa chúng.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không có `concurrency` | Nhiều lần chạy thừa cho cùng nhánh | Thêm nhóm + cancel |
| Không `timeout-minutes` | Job treo chạy 6 tiếng | Đặt giới hạn |
| Bước chậm đặt trước | Biết lỗi muộn | Nhanh trước, chậm sau |
| Thiếu `if: always()` cho báo cáo | Không có kết quả khi test hỏng | Thêm `always()` |
| Service không có healthcheck | Test hỏng ngẫu nhiên | `--health-cmd` |

## Ghi nhớ

- Job song song, máy riêng; step tuần tự, cùng máy.
- `concurrency` + `timeout-minutes` nên có ở mọi workflow.
- Bước nhanh và hay hỏng đặt trước.
- Artifact là cách truyền file giữa các job.

## Tự kiểm tra

1. Vì sao job không chia sẻ file với nhau? Truyền file thế nào?
2. `fail-fast: false` giúp gì khi dùng ma trận?
3. Sắp xếp typecheck, test, build, lint theo thứ tự tối ưu và giải thích.
