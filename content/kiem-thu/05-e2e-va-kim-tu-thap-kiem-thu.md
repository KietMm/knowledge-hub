---
title: E2E và kim tự tháp kiểm thử
slug: e2e-va-kim-tu-thap-kiem-thu
summary: Vì sao ít E2E mà nhiều unit test, và cách làm E2E không chập chờn.
level: trung-cap
tags: [testing, e2e, ci]
khung: v2
---

> **Sau bài này bạn sẽ:** biết phân bổ test giữa ba tầng, và viết E2E không chập chờn bằng ba quy tắc.

## Ý tưởng chính

Ba tầng test đánh đổi ngược nhau giữa **độ tin cậy** và **chi phí**:

```text
Unit         nhanh, rẻ, dễ định vị lỗi   —  nhưng không chứng minh hệ thống chạy
Integration  vừa phải                     —  kiểm được các mảnh ghép với nhau
E2E          chậm, đắt, hay chập chờn     —  nhưng đây là thứ NGƯỜI DÙNG thật sự trải qua
```

Nên phân bổ theo hình kim tự tháp: **nhiều unit, vừa integration, rất ít E2E**.

## Mental model

Hãy nghĩ tới **kiểm tra một chiếc xe trước khi giao khách**.

> **Unit test** là đo từng bộ phận trên bàn: bugi có đánh lửa không, phanh có ăn không. Nhanh, chính xác, và biết ngay hỏng cái nào.
>
> **Integration test** là lắp cụm rồi thử: động cơ có quay bánh không.
>
> **E2E test** là **lái thử một vòng**. Chậm, tốn xăng, và nếu xe không chạy thì bạn vẫn phải mở nắp máy ra tìm. Nhưng đây là thứ duy nhất chứng minh **chiếc xe đi được**.

Không ai kiểm xe bằng cách lái thử 500 vòng cho mỗi bộ phận. Và cũng không ai giao xe mà chưa lái thử lần nào.

## Ví dụ nhỏ

```ts
import { test, expect } from '@playwright/test'

test('người dùng đăng nhập và thấy trang chủ', async ({ page }) => {
  await page.goto('/dang-nhap')
  await page.getByLabel('Email').fill('a@x.com')
  await page.getByLabel('Mật khẩu').fill('matkhau123')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()

  await expect(page.getByRole('heading', { name: 'Xin chào' })).toBeVisible()
})
```

## Code chạy thế nào

**Nguồn số một của E2E chập chờn: chờ theo thời gian.**

```text
❌ await page.waitForTimeout(2000)

  Máy bạn:   API trả về sau 300ms  →  chờ thừa 1700ms  →  xanh, nhưng chậm
  CI buổi tối: CI đang tải, API mất 2500ms  →  ĐỎ
  CI sáng mai: API mất 1800ms  →  xanh

  ⇒ đỏ ngẫu nhiên, và không ai tái hiện được
```

```ts
// ✅ Chờ theo ĐIỀU KIỆN, không theo đồng hồ
await expect(page.getByText('Đã lưu')).toBeVisible()      // chờ tới khi thấy
await page.waitForURL('/don-hang/**')                      // chờ tới khi điều hướng
await expect(page.getByRole('button')).toBeEnabled()       // chờ tới khi bấm được
```

Playwright và Cypress **tự chờ** ở mọi thao tác: nó thử lại cho tới khi phần tử xuất hiện và tương tác được, trong một hạn thời gian. Bạn thêm `waitForTimeout` là đang phá cơ chế đó.

Quy tắc: **thấy `waitForTimeout` trong E2E, coi như đã tìm ra nguyên nhân chập chờn.**

## Cú pháp

**Chọn phần tử theo thứ người dùng thấy**, không theo chi tiết cài đặt:

```ts
// ❌ Vỡ khi đổi class, đổi cấu trúc HTML, đổi thư viện UI
page.locator('.btn-primary > span:nth-child(2)')
page.locator('#submit-btn-2')

// ✅ Bền, và đọc như mô tả hành vi
page.getByRole('button', { name: 'Đăng nhập' })
page.getByLabel('Email')
page.getByText('Đơn hàng của tôi')
page.getByTestId('nut-thanh-toan')     // khi không còn cách nào khác
```

Lợi ích kép của `getByRole`/`getByLabel`: test **bền hơn**, và nó **ép giao diện phải có nhãn đúng** — nghĩa là test đang kiểm luôn khả năng truy cập ([[form-va-xu-ly-loi]]).

**Mỗi test tự dựng dữ liệu của nó:**

```ts
test('xoá đơn hàng', async ({ page, request }) => {
  // Dựng dữ liệu qua API, KHÔNG qua giao diện — nhanh hơn và ít vỡ hơn
  const don = await request.post('/api/test/don-hang', { data: { ... } })

  await page.goto(`/don-hang/${don.id}`)
  await page.getByRole('button', { name: 'Xoá' }).click()
  await expect(page.getByText('Đã xoá')).toBeVisible()
})
```

Dựng dữ liệu qua giao diện (đi qua 5 màn hình để tạo một đơn) làm test chậm gấp mười và vỡ mỗi khi bất kỳ màn hình nào trong số đó thay đổi.

## Tại sao cần nó

Vì E2E chỉ nên phủ **những luồng mà hỏng là mất tiền hoặc mất khách**:

```text
✅ NÊN có E2E
   · Đăng ký / đăng nhập
   · Thêm giỏ hàng → thanh toán → nhận xác nhận
   · Luồng nghiệp vụ chính của sản phẩm

❌ KHÔNG cần E2E
   · Mọi ca biên của form (unit test)
   · Mọi thông báo lỗi (unit test)
   · Bố cục, màu sắc (kiểm bằng mắt hoặc snapshot ảnh)
```

Con số thực tế cho một sản phẩm web: **5–20 kịch bản E2E** là đủ. Nhiều hơn thì thời gian chạy và chi phí bảo trì vượt quá giá trị.

**Khi E2E đỏ trên CI mà xanh ở máy** — bốn nguyên nhân, theo thứ tự phổ biến:

```text
① Chờ theo thời gian        → CI chậm hơn máy bạn
② Dữ liệu dùng chung        → test khác chạy song song đụng vào
③ Múi giờ / ngôn ngữ khác   → CI chạy UTC, máy bạn UTC+7
④ Kích thước cửa sổ khác    → phần tử bị ẩn ở màn hình nhỏ trên CI
```

Công cụ chẩn đoán: Playwright ghi lại **video, ảnh chụp màn hình và trace** của lần chạy đỏ. Xem trace là thấy đúng khoảnh khắc hỏng — nhanh hơn nhiều so với đoán.

```ts
// playwright.config.ts
use: { trace: 'on-first-retry', video: 'retain-on-failure' }
```

## So sánh

| | Unit | Integration | E2E |
|---|---|---|---|
| Tốc độ | ms | 10–100ms | 5–30 **giây** |
| Định vị lỗi | Chính xác | Khá | Mơ hồ |
| Độ tin cậy về "hệ thống chạy" | Thấp | Vừa | **Cao** |
| Chập chờn | Hiếm | Ít | **Hay** |
| Số lượng nên có | Hàng trăm | Hàng chục | 5–20 |

## Dễ nhầm

**1. `waitForTimeout`.** Nguyên nhân chập chờn số một.

**2. Chọn phần tử theo class hoặc CSS selector phức tạp.** Đổi giao diện là vỡ hàng loạt.

**3. Test phụ thuộc nhau.** Test 2 dùng tài khoản do test 1 tạo ⇒ chạy song song là vỡ, và test 1 đỏ thì test 2 cũng đỏ theo dù nó không có lỗi.

**4. Viết quá nhiều E2E.** Bộ test 45 phút thì không ai chạy trước khi merge.

**5. Không xem trace khi đỏ.** Người ta đoán, sửa bừa, rồi thêm `waitForTimeout` — và làm mọi thứ tệ hơn.

**6. Dựng dữ liệu qua giao diện.** Chậm và vỡ theo mọi thay đổi giao diện không liên quan.

**7. Chạy E2E với dữ liệu production.** Rồi một hôm test "xoá đơn hàng" chạy trên đơn thật.

## Mẹo nhớ

> **Kiểm từng bộ phận (unit) · lắp cụm thử (integration) · lái thử một vòng (E2E).**
>
> **Chờ theo ĐIỀU KIỆN, không theo đồng hồ.**
>
> **Chọn phần tử theo thứ người dùng thấy.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba tầng test đánh đổi giữa hai thứ gì?
2. Vì sao `waitForTimeout` gây chập chờn, và thay bằng gì?
3. Vì sao `getByRole` bền hơn `.locator('.btn')`, và lợi ích phụ là gì?
4. Bốn nguyên nhân khiến E2E xanh ở máy nhưng đỏ trên CI?
5. Bao nhiêu kịch bản E2E là hợp lý, và chọn kịch bản theo tiêu chí nào?

## Tự viết lại

Không nhìn lại phần trên, viết E2E cho luồng mua hàng:

```text
Tìm sản phẩm → thêm giỏ → thanh toán → thấy trang xác nhận có mã đơn
```

Tự kiểm ba câu: bạn dựng dữ liệu sản phẩm thế nào, bạn chờ ở những chỗ nào, và bạn chọn phần tử bằng cách nào?

## Thử sức

Đội bạn có 200 test E2E chạy 50 phút, khoảng 15 test đỏ ngẫu nhiên mỗi ngày. Mọi người đã quen bấm "chạy lại" cho tới khi xanh.

Bộ test này đang **có hại**: nó tốn thời gian mà không ai còn tin. Lập kế hoạch ba bước để cứu — và câu khó nhất: bạn có **xoá bớt test** không? Nếu có thì xoá theo tiêu chí nào?
