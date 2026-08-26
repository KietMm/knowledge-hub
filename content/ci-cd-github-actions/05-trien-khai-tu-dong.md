---
title: Triển khai tự động
slug: trien-khai-tu-dong
summary: Từ merge tới production — chiến lược triển khai, cách quay lui, và những gì phải có trước khi tự động hoá.
level: nang-cao
tags: [ci-cd, deploy, release]
khung: v2
---

> **Sau bài này bạn sẽ:** biết bốn điều kiện phải có trước khi tự động hoá triển khai, và vì sao quay lui quan trọng hơn triển khai.

## Ý tưởng chính

Tự động hoá triển khai **không làm cho việc triển khai an toàn hơn**. Nó làm cho việc triển khai **thường xuyên hơn và giống nhau hơn** — và chính hai điều đó mới tạo ra an toàn.

Nhưng chỉ khi bốn thứ đã có trước: test đáng tin, quay lui nhanh, quan sát được, và triển khai từng phần.

Tự động hoá mà thiếu chúng chỉ có nghĩa là bạn đưa lỗi ra production **nhanh hơn**.

## Mental model

Hãy nghĩ tới **hai kiểu ra khơi**.

> **Chuyến đi lớn hằng quý**: gom hết hàng lên một con tàu, đi ba tháng một lần. Chuẩn bị căng thẳng, ai cũng lo. Có sự cố giữa biển thì không quay lại được, và không biết trong hàng trăm kiện hàng thì kiện nào gây ra vấn đề.
>
> **Chuyến phà mỗi giờ**: chở ít, chạy liên tục, bờ luôn trong tầm nhìn. Có vấn đề thì quay lại trong mười phút — và vì chuyến này chỉ chở vài kiện, bạn biết ngay là kiện nào.

Triển khai nhỏ và thường xuyên an toàn hơn không phải vì mỗi lần cẩn thận hơn, mà vì **phạm vi nghi ngờ nhỏ hơn** và **đường quay lại ngắn hơn**.

## Ví dụ nhỏ

```yaml
on:
  push:
    branches: [main]

jobs:
  deploy:
    environment: production      # có bước duyệt
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
      - run: ./smoke-test.sh     # kiểm ngay sau khi triển khai
```

## Code chạy thế nào

**Đường đi từ merge tới production:**

```text
① Merge vào main
② CI chạy: lint, typecheck, test, build
③ Build ARTIFACT MỘT LẦN — một image, có tag = commit SHA
④ Deploy artifact đó lên staging
⑤ Chạy smoke test trên staging
⑥ (tuỳ) Người duyệt bấm nút
⑦ Deploy CÙNG artifact đó lên production
⑧ Smoke test trên production
⑨ Theo dõi số liệu 15–30 phút
⑩ Số liệu xấu ⇒ QUAY LUI TỰ ĐỘNG
```

Bước ③ và ⑦ là cặp quan trọng nhất: **cùng một artifact đi qua mọi môi trường**.

```text
❌ Build lại ở mỗi môi trường:
   staging build lúc 10:00, production build lúc 14:00
   ⇒ khác phiên bản phụ thuộc, khác thời điểm
   ⇒ "staging chạy tốt mà" — và bạn không chứng minh được gì.

✅ Một artifact, gắn tag theo commit SHA:
   thứ đã chạy tốt trên staging LÀ CHÍNH thứ lên production.
   Khác biệt duy nhất là cấu hình ([[bien-moi-truong-va-cau-hinh]]).
```

**Ba chiến lược triển khai:**

```text
① ROLLING              thay dần từng bản sao
   Đơn giản nhất, không cần gấp đôi tài nguyên.
   Trong lúc thay: hai phiên bản chạy CÙNG LÚC.
   ⇒ API phải tương thích ngược, dù chỉ trong 2 phút.

② BLUE-GREEN           dựng hẳn môi trường mới, đổi traffic một nhát
   Quay lui = đổi ngược lại. Vài giây.
   Tốn gấp đôi tài nguyên lúc chuyển.

③ CANARY               5% traffic → theo dõi → 25% → 100%
   Phát hiện sớm với ít người bị ảnh hưởng nhất.
   Cần đo được: tỉ lệ lỗi và độ trễ theo từng phiên bản.
```

Canary là lựa chọn tốt nhất về mặt rủi ro, nhưng nó **đòi hỏi quan sát tốt**: không đo được thì 5% traffic chỉ có nghĩa là 5% người dùng gặp lỗi mà bạn không biết ([[quan-sat-he-thong]]).

## Cú pháp

**Quay lui phải nhanh hơn sửa tới:**

```text
Sự cố xảy ra. Hai lựa chọn:

Sửa tới:   tìm nguyên nhân → viết fix → review → CI → deploy
           = 30–60 phút, dưới áp lực, dễ sai tiếp

Quay lui:  deploy lại artifact trước đó
           = 2 phút, đường đã đi rồi
```

Nguyên tắc: **luôn quay lui trước, điều tra sau**. Và để làm được:

```text
□ Artifact cũ còn giữ và deploy lại được
□ Quay lui là MỘT lệnh hoặc một nút
□ Đã diễn tập — quay lui lần đầu không nên là lúc đang có sự cố
```

**Migration CSDL — chỗ quay lui gãy:**

```text
Code quay lui được. CSDL thì KHÔNG.

Nên migration phải TƯƠNG THÍCH NGƯỢC:
  ❌ Đổi tên cột trong một lần
     → code cũ tìm cột cũ ⇒ quay lui là sập

  ✅ Ba bước, ba lần triển khai:
     ① Thêm cột mới, ghi cả hai cột (code cũ vẫn chạy)
     ② Chuyển đọc sang cột mới
     ③ Vài ngày sau, xoá cột cũ
```

Chậm hơn, nhưng mỗi bước **quay lui được** ([[thay-doi-cau-truc-va-migration]]).

**Feature flag — tách triển khai khỏi phát hành:**

```ts
if (await flag('thanh-toan-moi', user)) return luongMoi()
return luongCu()
```

```text
Triển khai = đưa mã lên máy chủ.
Phát hành  = cho người dùng thấy tính năng.

Tách hai việc ⇒ mã lên production trong trạng thái tắt,
bật cho 1% người dùng, tắt lại trong VÀI GIÂY nếu có vấn đề
— không cần triển khai lại.
```

Cái giá: mỗi cờ là một nhánh mã phải bảo trì. Cờ phải có **hạn sử dụng** và được dọn.

## Tại sao cần nó

Vì bốn điều kiện tiên quyết không phải lời khuyên — thiếu chúng thì tự động hoá làm mọi thứ tệ hơn:

```text
① Test đáng tin        thiếu ⇒ tự động đẩy lỗi ra production nhanh hơn
② Quay lui nhanh       thiếu ⇒ mỗi sự cố kéo dài hàng giờ
③ Quan sát được        thiếu ⇒ không biết vừa làm hỏng cái gì
④ Triển khai từng phần thiếu ⇒ mỗi lỗi ảnh hưởng 100% người dùng
```

**Smoke test — vài phút công sức, giá trị rất lớn:**

```bash
#!/usr/bin/env bash
set -euo pipefail
curl -fsS https://app.com/health
curl -fsS https://app.com/api/version | grep -q "$COMMIT_SHA"   # ĐÚNG phiên bản?
curl -fsS https://app.com/ | grep -q "<title>"
```

Dòng thứ hai đáng chú ý: nó bắt được loại lỗi khó chịu nhất — triển khai **báo thành công** nhưng phiên bản cũ vẫn đang chạy.

**Thời điểm triển khai:** đầu giờ chiều ngày thường. Không phải chiều thứ Sáu, không phải cuối ngày — không phải vì lúc đó nguy hiểm hơn, mà vì lúc đó **ít người còn tỉnh táo để xử lý** nếu có chuyện.

## So sánh

| | Rolling | Blue-Green | Canary |
|---|---|---|---|
| Tài nguyên | 1× | 2× lúc chuyển | 1× + chút ít |
| Tốc độ quay lui | vừa | **vài giây** | nhanh |
| Ảnh hưởng nếu lỗi | một phần | 100% sau khi đổi | **rất ít** |
| Hai phiên bản cùng chạy | ✅ | ngắn | ✅ |
| Cần đo lường tốt | không | không | **có** |

## Dễ nhầm

**1. Build lại ở mỗi môi trường.** "Staging chạy tốt" mất hết ý nghĩa.

**2. Không có đường quay lui nhanh.** Mỗi sự cố kéo dài hàng giờ.

**3. Migration không tương thích ngược.** Quay lui code nhưng CSDL đã đi tiếp.

**4. Không có smoke test.** Triển khai "thành công" mà trang trắng.

**5. Tự động hoá khi test còn chập chờn.** Nhân bản vấn đề lên.

**6. Triển khai chiều thứ Sáu.**

**7. Không theo dõi sau khi triển khai.** Lỗi lộ ra qua khiếu nại người dùng.

**8. Feature flag không bao giờ được dọn.** Mã đầy nhánh chết.

**9. Không diễn tập quay lui.** Lần đầu là lúc đang cháy.

**10. Triển khai thủ công "cho chắc".** Mỗi lần một kiểu, không tái lập, không ai kiểm tra được đã làm gì.

## Mẹo nhớ

> **Build MỘT artifact, đi qua MỌI môi trường. Chỉ cấu hình khác.**
>
> **Quay lui trước, điều tra sau — và nó phải nhanh hơn sửa tới.**
>
> **Migration phải tương thích ngược, nếu không thì quay lui là ảo tưởng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn điều kiện phải có trước khi tự động hoá triển khai?
2. Vì sao phải dùng cùng một artifact cho mọi môi trường?
3. Ba chiến lược triển khai, đánh đổi của mỗi cái?
4. Vì sao đổi tên cột trong một lần migration làm hỏng đường quay lui?
5. Triển khai khác phát hành ở điểm nào, và feature flag khai thác điều đó ra sao?

## Tự viết lại

Không nhìn lại, viết pipeline từ merge tới production:

```text
① Build artifact một lần, tag theo SHA
② Deploy staging, smoke test
③ Duyệt tay trước khi vào production
④ Deploy production, smoke test
⑤ Quay lui khi smoke test đỏ
```

Tự kiểm: bước ⑤ của bạn mất bao lâu, và bạn đã thử nó lần nào chưa?

## Thử sức

Đội bạn triển khai **thủ công, hai tuần một lần**, mỗi lần mất một buổi tối và thường có sự cố.

Ba câu để trả lời: bạn thay đổi **theo thứ tự nào** để tới được triển khai tự động — và vì sao thứ tự đó; bạn **đo** cải thiện bằng chỉ số gì; và bạn thuyết phục đội rằng triển khai **thường xuyên hơn** lại **ít rủi ro hơn** bằng lập luận nào. Câu khó nhất: nếu đội phản đối vì "mỗi lần deploy là một lần rủi ro", chỗ nào trong lập luận đó **đúng** — và điều đó dẫn tới thay đổi nào trong kế hoạch của bạn?
