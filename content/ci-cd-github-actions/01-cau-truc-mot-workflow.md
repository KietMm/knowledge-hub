---
title: Cấu trúc một workflow GitHub Actions
slug: cau-truc-mot-workflow
summary: Event, job, step, runner — bốn khái niệm đủ để đọc và viết mọi workflow.
level: co-ban
tags: [ci-cd, github-actions, co-ban]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được bất kỳ workflow nào và nói ra nó chạy khi nào, chạy ở đâu, và cái gì chạy song song.

## Ý tưởng chính

Một workflow chỉ có bốn khái niệm:

**Event** kích hoạt → **Job** chạy trên một **Runner** (máy ảo sạch) → mỗi job gồm nhiều **Step** chạy tuần tự.

Điều then chốt nằm ở ranh giới giữa hai cấp: **các job chạy song song và trên máy khác nhau**; các step trong cùng một job chạy tuần tự và **chia sẻ đĩa**.

## Mental model

Hãy nghĩ tới **dây chuyền trong bếp nhà hàng**.

> **Event** = đơn hàng vào bếp.
>
> **Job** = một trạm bếp: trạm nướng, trạm salad, trạm tráng miệng. Chúng làm **cùng lúc**, mỗi trạm có bàn riêng, dao riêng, và **không thấy bàn của nhau**.
>
> **Step** = các thao tác trong một trạm: rửa → thái → xào. Theo thứ tự, trên **cùng một cái bàn**.
>
> **Runner** = cái bếp — và mỗi job được cấp **một cái bếp mới toanh, sạch trơn**.

Hình ảnh "bếp mới toanh" giải thích hầu hết ngạc nhiên của người mới: file job A tạo ra thì job B không thấy, và mọi thứ cài đặt đều biến mất sau khi job kết thúc.

## Ví dụ nhỏ

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
```

## Code chạy thế nào

**Từ lúc push tới lúc có dấu tick xanh:**

```text
① Bạn push / mở PR
② GitHub tìm mọi file trong .github/workflows/
③ Workflow nào có `on:` khớp event ⇒ được kích hoạt
④ Với mỗi job: cấp một MÁY ẢO SẠCH
   → không có mã nguồn (nên bước đầu luôn là checkout)
   → không có phụ thuộc đã cài
   → không có gì từ lần chạy trước
⑤ Các step chạy TUẦN TỰ trên máy đó
⑥ Step nào thất bại ⇒ job dừng (trừ khi có `if: always()`)
⑦ Máy ảo BỊ HUỶ — mọi thứ trên đó biến mất
```

Bước ④ và ⑦ là điều duy nhất cần nhớ về runner: **sạch khi bắt đầu, mất khi kết thúc**. Đó cũng là điều làm CI đáng tin — không có "trạng thái tích tụ" như trên máy dev.

**Job song song với job phụ thuộc:**

```yaml
jobs:
  lint:  { runs-on: ubuntu-latest, steps: [...] }
  test:  { runs-on: ubuntu-latest, steps: [...] }   # ← lint và test CHẠY CÙNG LÚC
  build:
    needs: [lint, test]                              # ← đợi CẢ HAI xong
    runs-on: ubuntu-latest
    steps: [...]
```

```text
Không có `needs`:      lint ─┐
                       test ─┴→ (cùng lúc)   tổng ≈ max(lint, test)

Có `needs: [lint,test]`:  lint ─┐
                          test ─┴→ build     tổng ≈ max(lint,test) + build
```

Vì hai job ở hai máy khác nhau, `build` **không thấy** gì `test` để lại. Muốn chuyển file giữa job thì phải qua artifact:

```yaml
- uses: actions/upload-artifact@v4
  with: { name: dist, path: dist/ }
# ở job sau
- uses: actions/download-artifact@v4
  with: { name: dist }
```

## Cú pháp

**Event hay dùng:**

```yaml
on:
  pull_request:                     # mỗi PR và mỗi lần push thêm vào PR
    branches: [main]
  push:
    branches: [main]
    paths: ['src/**', 'package.json']   # chỉ chạy khi các file này đổi
  schedule:
    - cron: '0 2 * * *'             # 2h sáng UTC hằng ngày
  workflow_dispatch:                # nút bấm tay trên giao diện
```

`workflow_dispatch` đáng thêm vào gần như mọi workflow: nó cho phép chạy lại bằng tay mà không cần push commit rỗng.

**Ma trận — chạy cùng job trên nhiều cấu hình:**

```yaml
strategy:
  fail-fast: false          # một cấu hình hỏng, các cấu hình khác VẪN chạy
  matrix:
    node: ['20', '22']
    os: [ubuntu-latest, windows-latest]
runs-on: ${{ matrix.os }}   # ⇒ 4 job song song
```

`fail-fast: false` gần như luôn là lựa chọn đúng khi debug: bạn muốn biết **cả bốn** cấu hình hỏng hay chỉ một.

**`run` với `uses`:**

```yaml
- run: pnpm test                 # chạy lệnh shell
- uses: actions/checkout@v4      # dùng action có sẵn — LUÔN ghim phiên bản
```

Ghim `@v4` chứ không `@main`: `@main` nghĩa là mã của người khác thay đổi dưới chân bạn, và đó vừa là rủi ro tái lập vừa là rủi ro bảo mật ([[secret-va-quyen-trong-ci]]).

**Điều kiện và biến:**

```yaml
- run: ./deploy.sh
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  env:
    API_KEY: ${{ secrets.API_KEY }}    # secret KHÔNG viết thẳng
```

## Tại sao cần nó

Vì CI đổi câu hỏi *"code này có chạy không?"* từ chuyện **cá nhân** thành chuyện **tự động**:

```text
Không CI:  người review đọc code, đoán.
           Ai nhớ thì chạy test trên máy mình — với môi trường của mình.
           Lỗi lộ ra ở production.

Có CI:     mỗi PR tự chạy lint + test + build trên môi trường SẠCH và GIỐNG NHAU.
           Đỏ thì không merge được.
```

Vế "môi trường sạch và giống nhau" mới là phần giá trị nhất — nó loại bỏ cả một lớp lỗi "chạy được trên máy tôi".

**Hai thứ nên thêm ngay từ workflow đầu tiên:**

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true      # push lần 2 ⇒ huỷ lần chạy cũ, khỏi tốn máy

permissions:
  contents: read                # token chỉ đọc, trừ khi cần hơn
```

Và cuối cùng: **CI chỉ có giá trị khi nó đáng tin**. Một suite test chập chờn khiến cả đội quen tay bấm "re-run" ⇒ tín hiệu đỏ mất hết ý nghĩa ([[kiem-thu-tu-dong-trong-ci]]).

## So sánh

| | Step | Job |
|---|---|---|
| Chạy | tuần tự | **song song** (trừ khi `needs`) |
| Máy | cùng một runner | mỗi job một runner riêng |
| Chia sẻ file | ✅ cùng đĩa | ❌ phải qua artifact |
| Chia sẻ biến | qua `$GITHUB_ENV` | qua `outputs` |

## Dễ nhầm

**1. Tưởng job chia sẻ file với nhau.** Máy khác nhau — dùng artifact.

**2. Quên `actions/checkout`.** Runner sạch, không có mã nguồn.

**3. Dùng `@main` cho action.** Không tái lập được, và là rủi ro bảo mật.

**4. Viết secret thẳng vào file.** Dùng `${{ secrets.* }}`.

**5. Không có `concurrency`.** Mỗi lần push tích thêm một lần chạy vô ích.

**6. Không bật cache.** CI chậm gấp nhiều lần ([[cache-va-toc-do-ci]]).

**7. Để `fail-fast: true` khi debug ma trận.** Chỉ thấy được một lỗi.

**8. Chạy mọi job trên mọi push.** Dùng `paths:` để lọc.

**9. Quên `permissions`.** Token mặc định rộng hơn cần thiết.

**10. Đặt điều kiện deploy sai** ⇒ deploy từ nhánh phụ. Luôn kiểm cả `github.ref` **và** `github.event_name`.

## Mẹo nhớ

> **Event → Job (song song, máy riêng) → Step (tuần tự, cùng máy).**
>
> **Runner luôn SẠCH: bước đầu tiên là checkout.**
>
> **File giữa hai job phải đi qua artifact.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn khái niệm của một workflow, quan hệ giữa chúng?
2. Job và step khác nhau ở hai điểm nào?
3. Vì sao bước đầu tiên luôn là `actions/checkout`?
4. Làm sao chuyển file từ job này sang job khác?
5. `concurrency` với `cancel-in-progress` giải quyết gì?

## Tự viết lại

Không nhìn lại, viết một workflow:

```text
① Chạy trên mọi PR vào main
② lint và test chạy SONG SONG
③ build chỉ chạy sau khi cả hai xanh
④ deploy chỉ chạy khi push vào main
⑤ huỷ lần chạy cũ khi có push mới
```

Tự kiểm: bước ④ của bạn có chạy nhầm khi ai đó mở PR **từ** main sang nhánh khác không?

## Thử sức

CI của đội bạn mất **18 phút** mỗi PR, và mọi người bắt đầu merge trước khi nó chạy xong.

Ba câu để trả lời: hai thay đổi về **cấu trúc job** giúp giảm thời gian chờ nhiều nhất; bạn **đo** thời gian từng job bằng cách nào; và bạn làm gì để việc "merge trước khi CI xong" trở nên **không thể**. Câu khó nhất: nếu chia nhỏ job làm tổng thời gian máy chạy **tăng lên** trong khi thời gian chờ giảm — đó là đánh đổi tốt hay xấu, và tuỳ vào điều gì?
