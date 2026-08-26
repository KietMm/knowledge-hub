---
title: Kiểm thử tự động trong CI
slug: kiem-thu-tu-dong-trong-ci
summary: Tháp kiểm thử, xử lý test chập chờn, và biến CI thành thứ đáng tin để chặn merge.
level: trung-cap
tags: [ci-cd, kiem-thu, test]
khung: v2
---

> **Sau bài này bạn sẽ:** biết vì sao một test chập chờn nguy hiểm hơn không có test, và xử lý nó thế nào.

## Ý tưởng chính

Giá trị của CI nằm ở **độ tin cậy của tín hiệu**, không ở số lượng test.

Suite xanh mà bạn tin ⇒ merge tự tin.
Suite hay đỏ vô cớ ⇒ mọi người bấm "re-run" theo phản xạ ⇒ **màu đỏ không còn nghĩa gì**.

Và ở trạng thái thứ hai, bạn đang trả tiền máy để duy trì một thứ trang trí.

## Mental model

Hãy nghĩ tới **chuông báo cháy trong toà nhà**.

> Chuông reo mỗi lần ai đó nướng bánh mì, mỗi tuần vài lần. Ban đầu mọi người chạy ra. Sau một tháng, không ai nhúc nhích.
>
> Rồi có một đám cháy thật.
>
> Vấn đề không phải chuông kêu quá to. Vấn đề là nó **kêu khi không có cháy** — và điều đó đã dạy mọi người bỏ qua nó.

Một test chập chờn dạy cả đội bỏ qua màu đỏ. Nó phá hoại **toàn bộ** suite, không chỉ chính nó.

## Ví dụ nhỏ

```yaml
- run: pnpm test:unit          # nhanh, chạy trên mọi PR
- run: pnpm test:integration   # có CSDL thật
- run: pnpm test:e2e           # ít, chậm — chỉ luồng quan trọng nhất
```

## Code chạy thế nào

**Tháp kiểm thử — vì sao có hình tháp:**

```text
        ╱ E2E ╲          ít, chậm (phút), giòn, giống người dùng nhất
      ╱─────────╲
    ╱ Integration ╲      vừa, có CSDL/HTTP thật
  ╱─────────────────╲
╱       Unit         ╲   nhiều, nhanh (ms), ổn định, phản hồi tức thì
```

```text
Đảo ngược tháp (nhiều E2E, ít unit):
  → CI 45 phút
  → hỏng là phải đọc log trình duyệt để đoán chuyện gì xảy ra
  → chập chờn liên tục (mạng, thời gian chờ, hoạt ảnh)
```

Lý do hình tháp không phải "unit test tốt hơn E2E". Nó là chuyện **chi phí chẩn đoán**: unit test hỏng chỉ vào đúng một hàm; E2E hỏng chỉ vào "một chỗ nào đó trong hệ thống" ([[e2e-va-kim-tu-thap-kiem-thu]]).

**Test chập chờn — bốn nguyên nhân và cách sửa:**

```text
① THỜI GIAN
   ❌ await sleep(1000); expect(...)
   ✅ await waitFor(() => expect(...))       ← đợi ĐIỀU KIỆN, không đợi thời gian

② THỨ TỰ / TRẠNG THÁI DÙNG CHUNG
   Test A tạo user "an@vd.com", test B cũng vậy ⇒ hỏng khi chạy chung.
   ✅ Mỗi test tự dựng dữ liệu riêng, dọn sau khi xong.
      Kiểm nhanh: chạy suite theo thứ tự ngẫu nhiên.

③ PHỤ THUỘC BÊN NGOÀI
   Gọi API thật ⇒ mạng chậm là đỏ.
   ✅ Giả lập ở tầng biên ([[test-double-stub-mock-fake]]).

④ THỜI GIAN VÀ NGẪU NHIÊN
   Test hỏng lúc nửa đêm, hoặc vào ngày 31.
   ✅ Cố định đồng hồ và seed ngẫu nhiên.
```

**Vì sao `retry` không phải cách sửa:**

```yaml
- run: pnpm test --retry=3     # ⚠️ giấu vấn đề
```

```text
Retry biến "hỏng 20% số lần" thành "hỏng 0.8% số lần".
Nó KHÔNG sửa gì cả — nó chỉ làm bạn khó phát hiện hơn.
Và nếu cái chập chờn đó là một race condition THẬT trong sản phẩm,
bạn vừa che mất một bug production.
```

Cách xử lý đúng với một test chập chờn:

```text
① Cách ly ngay: đánh dấu skip, mở issue.  ← đừng để nó dạy đội bỏ qua màu đỏ
② Sửa nguyên nhân trong thời hạn rõ ràng.
③ Sửa xong mới bật lại.
```

Bước ① nghe như đầu hàng, nhưng nó đúng: một test bị skip **thành thật** về việc nó không bảo vệ gì; một test chập chờn thì **nói dối** cả hai chiều.

## Cú pháp

**Chạy test cần CSDL — dùng service container:**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-retries 5
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/postgres
```

`--health-cmd` là bắt buộc ở đây: không có nó, test bắt đầu trước khi Postgres sẵn sàng và bạn có một nguồn chập chờn mới ([[mang-va-ket-noi]]).

**Chặn merge — biến CI thành hàng rào thật:**

```text
Cài đặt nhánh `main`:
  □ Require status checks: lint, test, typecheck
  □ Require branches up to date before merging
  □ Require pull request review
```

Không bật những cái này thì CI chỉ là gợi ý. Bật rồi thì màu đỏ **thực sự** chặn được.

**Về độ phủ:** dùng nó như một tín hiệu, không phải một cái cổng.

```text
Đặt ngưỡng cứng "phải đạt 80%" thường dẫn tới:
  → viết test cho getter/setter để nâng số
  → 80% phủ, và các nhánh quan trọng vẫn không được test

Hữu ích hơn: cảnh báo khi độ phủ GIẢM ở phần mã vừa thay đổi.
```

## Tại sao cần nó

Vì thời điểm phát hiện lỗi quyết định chi phí sửa nó:

```text
Lúc viết code   ⇒ vài phút, ngữ cảnh còn nguyên trong đầu
Trong CI        ⇒ vài chục phút, còn nhớ mình vừa làm gì
Ở production    ⇒ hàng giờ, cộng người dùng bị ảnh hưởng,
                  cộng áp lực sửa nhanh ⇒ sửa ẩu ⇒ lỗi tiếp
```

CI là hàng rào cuối cùng còn **rẻ**.

**Chia theo tốc độ, không chạy tất cả mọi lúc:**

```text
Trên mỗi PR:  lint, typecheck, unit, integration     (< 10 phút)
Trên main:    thêm E2E đầy đủ, quét bảo mật
Ban đêm:      test hiệu năng, ma trận đầy đủ, kiểm phụ thuộc
```

Và một mẹo nhỏ có tác động lớn: khi test đỏ, **thông báo lỗi phải đủ để chẩn đoán mà không cần chạy lại cục bộ**. In ra giá trị thực nhận được, không chỉ "expected true to be false".

## So sánh

| | Unit | Integration | E2E |
|---|---|---|---|
| Tốc độ | ms | giây | phút |
| Số lượng | nhiều | vừa | ít |
| Ổn định | cao | vừa | thấp |
| Chỉ ra nguyên nhân | chính xác | khá | mơ hồ |
| Chạy khi | mọi PR | mọi PR | trên `main` |

## Dễ nhầm

**1. Để test chập chờn tồn tại.** Nó dạy cả đội bỏ qua màu đỏ.

**2. Dùng `retry` như cách sửa.** Giấu vấn đề, có thể giấu cả bug thật.

**3. Tháp ngược — quá nhiều E2E.** CI chậm và giòn.

**4. `sleep()` trong test.** Chờ điều kiện, đừng chờ thời gian.

**5. Test phụ thuộc thứ tự.** Chạy ngẫu nhiên để phát hiện.

**6. Gọi API thật trong test.** Giả lập ở biên.

**7. Không bật required checks.** CI chỉ là gợi ý.

**8. Ngưỡng độ phủ cứng.** Sinh ra test vô nghĩa.

**9. Không có healthcheck cho service container.** Nguồn chập chờn.

**10. Thông báo lỗi không đủ chẩn đoán.** Mỗi lần đỏ là một lần phải dựng lại tại chỗ.

## Mẹo nhớ

> **Một test chập chờn phá hoại CẢ suite — nó dạy đội bỏ qua màu đỏ.**
>
> **Retry không sửa gì; nó chỉ làm bạn khó thấy hơn.**
>
> **Chờ ĐIỀU KIỆN, đừng chờ THỜI GIAN.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao test chập chờn nguy hiểm hơn không có test?
2. Bốn nguyên nhân gây chập chờn, và cách sửa từng cái?
3. Vì sao tháp có hình tháp — lý do thật là gì?
4. Vì sao `retry` không phải cách sửa?
5. Khi phát hiện một test chập chờn, ba bước xử lý?

## Tự viết lại

Không nhìn lại, viết workflow chạy test cho ứng dụng cần Postgres và Redis:

```text
① Service container có healthcheck
② unit và integration chạy trên PR
③ E2E chỉ chạy trên main
④ Kết quả test hiện được trên PR
```

Tự kiểm: nếu Postgres mất 8 giây mới sẵn sàng, workflow của bạn có bị đỏ không?

## Thử sức

Suite 500 test. Khoảng **5% lần chạy đỏ vô cớ**, và đội đã có thói quen bấm "Re-run failed jobs".

Ba câu để trả lời: vì sao tình trạng này **tệ hơn** việc không có test; kế hoạch **cụ thể** để lấy lại niềm tin, theo thứ tự; và bạn ngăn nó tái diễn bằng cách nào. Câu khó nhất: bạn **tìm** ra những test chập chờn nào trong 500 cái đó bằng cách gì, khi mỗi lần chạy chúng hỏng ở chỗ khác nhau?
