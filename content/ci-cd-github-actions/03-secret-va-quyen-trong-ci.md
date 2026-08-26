---
title: Secret và quyền trong CI
slug: secret-va-quyen-trong-ci
summary: Cấp secret cho workflow mà không để nó rò rỉ — và vì sao pull_request_target là con dao hai lưỡi.
level: trung-cap
tags: [ci-cd, secret, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** biết vì sao `pull_request_target` là lỗ hổng nổi tiếng nhất của GitHub Actions, và cấu hình quyền tối thiểu cho workflow.

## Ý tưởng chính

CI là nơi hội tụ ba thứ hấp dẫn với kẻ tấn công: **secret của production**, **quyền ghi vào repo**, và **khả năng chạy mã tuỳ ý**.

Và nó chạy tự động, không ai ngồi nhìn. Một workflow cấu hình sai là đường vào thẳng production — không cần qua bất kỳ lớp bảo vệ nào của ứng dụng.

## Mental model

Hãy nghĩ tới **chìa khoá đưa cho thợ sửa chữa**.

> Thợ đến sửa vòi nước. Bạn đưa chìa khoá **cửa nhà tắm**, không đưa cả chùm chìa khoá gồm két sắt và cửa gara.
>
> Và nếu người đến là **người lạ tự nhận là thợ**, bạn không đưa chìa nào cả cho đến khi xác minh.

`permissions:` là chọn chìa nào để đưa. `pull_request` với `pull_request_target` là chuyện **người đến có phải người bạn gọi hay không**.

## Ví dụ nhỏ

```yaml
permissions:
  contents: read          # mặc định cho toàn bộ workflow: chỉ đọc

jobs:
  deploy:
    permissions:
      contents: read
      id-token: write     # chỉ job này cần thêm, và chỉ thêm đúng cái cần
```

## Code chạy thế nào

**`pull_request` với `pull_request_target` — khác biệt quyết định tất cả:**

```text
pull_request           (an toàn)
  Chạy mã: CỦA PR (có thể do người lạ viết)
  Secret:  ❌ KHÔNG có với PR từ fork
  Token:   chỉ đọc
  ⇒ Người lạ chạy được mã của họ, nhưng không có gì để lấy.

pull_request_target    (nguy hiểm)
  Chạy mã: CỦA NHÁNH ĐÍCH (main) — không phải mã của PR
  Secret:  ✅ CÓ ĐẦY ĐỦ
  Token:   ghi được
  ⇒ Có secret vì mã chạy là mã bạn kiểm soát.
```

Sự kiện `pull_request_target` tồn tại để workflow gắn nhãn, bình luận trên PR từ fork — những việc cần quyền ghi. Nó an toàn **miễn là bạn không checkout mã của PR**.

**Và đây là chỗ nó vỡ:**

```yaml
on: pull_request_target      # ⚠️ có secret
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}   # ☠️ lấy mã CỦA PR
      - run: pnpm install    # ☠️ chạy script postinstall CỦA PR
```

```text
Chuyện gì xảy ra:
  ① Người lạ fork repo, sửa package.json thêm script postinstall
  ② Mở PR
  ③ Workflow chạy VỚI SECRET, và cài phụ thuộc ⇒ chạy mã của họ
  ④ Script đó đọc biến môi trường và gửi ra ngoài
  ⇒ Toàn bộ secret của bạn ra đi. KHÔNG cần ai duyệt PR.
```

Đây là lỗ hổng "pwn request" — đã xảy ra với nhiều dự án mã nguồn mở lớn.

Quy tắc rút ra: **`pull_request_target` + checkout mã của PR = không bao giờ**. Cần build và test mã của PR ⇒ dùng `pull_request` (và chấp nhận không có secret).

## Cú pháp

**Ba tầng lưu secret:**

```text
Repository secret     dùng cho mọi workflow của repo
Environment secret    gắn với môi trường (production/staging)
                      ⇒ có thể yêu cầu NGƯỜI DUYỆT trước khi cấp
Organization secret   dùng chung nhiều repo
```

Environment là tầng đáng dùng nhất cho production:

```yaml
jobs:
  deploy:
    environment: production      # cấu hình "required reviewers" trên GitHub
    steps:
      - run: ./deploy.sh
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

Với cấu hình đó, secret production **chỉ tồn tại** trong job đã được người thật bấm duyệt.

**Tốt hơn secret: OIDC — không lưu khoá dài hạn nào cả:**

```yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123:role/gh-deploy
      aws-region: ap-southeast-1
```

```text
Không OIDC:  AWS key dài hạn nằm trong GitHub secret.
             Rò rỉ ⇒ dùng được cho tới khi ai đó phát hiện và thu hồi.

Có OIDC:     GitHub cấp một token NGẮN HẠN cho đúng repo, đúng nhánh.
             Không có khoá nào để rò rỉ.
```

Đây là hướng nên đi cho mọi kết nối tới nhà cung cấp đám mây.

**Che secret trong log:** GitHub tự che giá trị của `secrets.*` khi nó xuất hiện nguyên văn. Nhưng nó **không** che được nếu bạn biến đổi giá trị đó:

```bash
echo "$SECRET" | base64      # ⚠️ bản base64 KHÔNG bị che
```

Nên đừng dựa vào cơ chế che. Đừng in secret ra, kể cả để gỡ lỗi.

## Tại sao cần nó

Vì **quyền mặc định của token quá rộng** ở nhiều repo cũ:

```yaml
permissions:
  contents: read          # ← đặt ở đầu MỌI workflow
```

Không có dòng này, `GITHUB_TOKEN` ở một số cấu hình repo có quyền **ghi** vào mã nguồn, issue, package. Một action bên thứ ba bị chiếm quyền là có thể đẩy commit vào repo của bạn.

**Ghim action theo SHA cho những action nhạy cảm:**

```yaml
- uses: actions/checkout@v4                     # tag — có thể bị dời
- uses: actions/checkout@8f4b7f8...             # SHA — bất biến
```

Tag trong git **dời được**. Kẻ chiếm được tài khoản tác giả có thể trỏ `v4` sang mã độc, và mọi workflow dùng `@v4` chạy mã đó ở lần chạy kế tiếp. Ghim SHA cho action chạm tới secret hoặc deploy.

**Checklist:**

```text
□ permissions: contents: read ở đầu mọi workflow
□ Không có pull_request_target nào checkout mã của PR
□ Secret production nằm trong environment có người duyệt
□ Dùng OIDC thay khoá dài hạn khi nhà cung cấp hỗ trợ
□ Action nhạy cảm ghim theo SHA
□ Không in secret ra log, kể cả sau khi biến đổi
□ Xoay secret định kỳ, và ngay khi có người rời đội
```

Điểm cuối liên quan tới [[quan-ly-secret-va-cau-hinh]]: secret không xoay được là secret bạn không thực sự kiểm soát.

## So sánh

| | `pull_request` | `pull_request_target` |
|---|---|---|
| Mã chạy | của PR | của nhánh đích |
| Secret với PR từ fork | ❌ | ✅ |
| Quyền token | đọc | ghi |
| Dùng cho | build, test | gắn nhãn, bình luận |
| Checkout mã PR | ✅ an toàn | ☠️ **không bao giờ** |

## Dễ nhầm

**1. `pull_request_target` + checkout mã PR.** Lỗ hổng kinh điển.

**2. Không đặt `permissions`.** Token rộng hơn cần thiết.

**3. Dùng khoá đám mây dài hạn** khi đã có OIDC.

**4. Secret production không có bước duyệt.**

**5. Action dùng `@main`.** Mã của người khác đổi dưới chân bạn.

**6. In secret ra log để gỡ lỗi.** Log lưu lại và nhiều người xem được.

**7. Tin rằng cơ chế che log là đủ.** Biến đổi giá trị là hết che.

**8. Cho fork chạy self-hosted runner.** Người lạ chạy mã trên máy trong mạng của bạn.

**9. Không xoay secret khi người rời đội.**

**10. Đặt secret ở cấp organization cho mọi repo.** Một repo bị chiếm là mất chung.

## Mẹo nhớ

> **`pull_request_target` + checkout mã của PR = trao secret cho người lạ.**
>
> **`permissions: contents: read` ở đầu mọi workflow.**
>
> **OIDC thay khoá dài hạn: không có gì để rò rỉ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `pull_request` và `pull_request_target` khác nhau ở hai điểm nào?
2. Mô tả từng bước cuộc tấn công "pwn request".
3. Vì sao PR từ fork không được cấp secret — đó là lỗi hay là thiết kế?
4. OIDC tốt hơn secret dài hạn ở chỗ nào?
5. Vì sao ghim SHA an toàn hơn ghim tag?

## Tự viết lại

Không nhìn lại, viết một workflow deploy lên AWS khi push vào `main`, sao cho:

```text
① Không có khoá AWS dài hạn nào
② Quyền tối thiểu
③ Có bước người duyệt trước khi chạm production
④ Action nhạy cảm được ghim
```

Tự kiểm: nếu ai đó mở PR từ fork, workflow của bạn có chạm được vào secret production không?

## Thử sức

Bạn review một workflow: `on: pull_request_target`, có `actions/checkout` với `ref: github.event.pull_request.head.sha`, rồi `npm install && npm test`.

Ba câu để trả lời: mô tả **chính xác** cuộc tấn công, từng bước; hai cách sửa và đánh đổi của mỗi cách; và giả sử lỗ hổng này đã tồn tại sáu tháng — bạn làm gì **ngay bây giờ**. Câu khó nhất: làm sao biết được nó **đã bị khai thác hay chưa**, và bạn tìm bằng chứng ở đâu?
