---
title: Secret và quyền trong CI
slug: secret-va-quyen-trong-ci
summary: Cấp secret cho workflow mà không để nó rò rỉ — và vì sao pull_request_target là con dao hai lưỡi.
level: trung-cap
tags: [ci-cd, secret, bao-mat]
---

> **Sau bài này bạn sẽ:** cấu hình quyền tối thiểu cho workflow, và tránh được lớp lỗ hổng CI nguy hiểm nhất.

## Nơi đặt secret

| Cấp | Phạm vi |
|---|---|
| Repository | Mọi workflow trong repo |
| Environment | Chỉ job khai báo `environment:` đó — **có thể yêu cầu duyệt** |
| Organization | Nhiều repo, chọn được repo nào dùng |

```yaml
jobs:
  deploy:
    environment: production        # secret production chỉ dùng được ở đây
    steps:
      - run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.PROD_API_KEY }}
```

Environment secret là lựa chọn đúng cho khoá production: nó tách khỏi secret dùng chung, và cấu hình được người phê duyệt trước khi job chạy.

## GitHub tự che secret trong log

Giá trị secret bị thay bằng `***` trong log. Nhưng cơ chế này khớp theo **chuỗi chính xác** và dễ bị vượt qua:

```yaml
- run: echo ${{ secrets.API_KEY }} | base64      # ĐÃ MÃ HOÁ -> không bị che
- run: echo ${{ secrets.API_KEY }} | rev         # đảo ngược -> không bị che
- run: env                                        # in nguyên biến môi trường
```

Đừng dựa vào việc che log. Nguyên tắc: không in secret, không truyền secret vào lệnh có log chi tiết.

## Quyền của `GITHUB_TOKEN`

```yaml
permissions:
  contents: read                  # mặc định cho toàn workflow: chỉ đọc

jobs:
  phat-hanh:
    permissions:
      contents: write             # nới quyền chỉ cho job cần
      packages: write
```

Đặt `permissions: contents: read` ở cấp workflow rồi nới cho từng job là cách áp dụng đặc quyền tối thiểu. Token mặc định của nhiều repo cũ có quyền ghi — một action độc hại sẽ push được lên nhánh chính.

## `pull_request` và `pull_request_target`

Đây là điểm dễ sai nhất trong bảo mật GitHub Actions:

| | Chạy code của | Có secret? |
|---|---|---|
| `pull_request` | PR (kể cả từ fork) | **Không** cho fork |
| `pull_request_target` | Nhánh **gốc** | **Có** |

`pull_request_target` tồn tại để workflow từ fork vẫn dùng được secret. Nhưng nếu bạn checkout code của PR rồi chạy nó, bạn vừa cho code người lạ chạy **kèm secret của repo**:

```yaml
# CỰC KỲ NGUY HIỂM
on: pull_request_target
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.pull_request.head.sha }} }   # code của PR
      - run: pnpm install && pnpm build      # script postinstall của PR chạy với secret
```

Bất kỳ ai mở PR đều lấy được toàn bộ secret của repo.

Quy tắc: dùng `pull_request` cho việc kiểm tra code. Chỉ dùng `pull_request_target` khi **không** checkout code của PR (ví dụ chỉ gắn nhãn, bình luận).

## Ghim action theo commit SHA

```yaml
- uses: actions/checkout@v4                      # tag — có thể bị dời
- uses: actions/checkout@8f4b7f8...              # SHA — không đổi được
```

Tag Git dời được. Nếu tài khoản duy trì một action bị chiếm, kẻ tấn công dời `v4` sang code độc, và mọi workflow dùng `@v4` chạy code đó ở lần chạy kế tiếp.

Với action của bên thứ ba, hãy ghim theo SHA. Dependabot vẫn cập nhật được và kèm cả comment phiên bản.

## OIDC — không cần secret dài hạn

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions
      aws-region: ap-southeast-1
```

GitHub cấp một token ngắn hạn, AWS đổi nó lấy thông tin xác thực tạm thời. Không có khoá dài hạn nào tồn tại trong repo, nên không có gì để rò rỉ và không cần xoay vòng.

Đây là cách nên dùng cho mọi nhà cung cấp cloud có hỗ trợ (AWS, GCP, Azure đều có).

## Bảo vệ khỏi script độc trong dependency

```yaml
- run: pnpm install --frozen-lockfile --ignore-scripts
```

`postinstall` chạy code tuỳ ý lúc cài. Với môi trường có secret, cân nhắc tắt script và chỉ chạy những cái thật sự cần.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `pull_request_target` + checkout PR | Ai cũng lấy được secret | Dùng `pull_request` |
| `GITHUB_TOKEN` quyền ghi mặc định | Action độc push được lên repo | `permissions: contents: read` |
| Action bên thứ ba theo tag | Tag bị dời sang code độc | Ghim theo SHA |
| Khoá cloud dài hạn trong secret | Cần xoay vòng, có thể rò rỉ | OIDC |
| `echo` secret để debug | Lộ trong log | Không bao giờ in |

## Ghi nhớ

- Secret production đặt ở Environment, có phê duyệt.
- `permissions: contents: read` mặc định, nới theo từng job.
- `pull_request_target` + checkout code PR = lỗ hổng nghiêm trọng.
- OIDC thay được secret dài hạn cho cloud.

## Tự kiểm tra

1. Vì sao `pull_request_target` nguy hiểm khi checkout code của PR?
2. Che secret trong log có đáng tin không? Nêu hai cách vượt qua.
3. OIDC giải quyết vấn đề gì mà secret tĩnh không giải quyết được?
