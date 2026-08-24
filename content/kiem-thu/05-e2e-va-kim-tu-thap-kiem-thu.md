---
title: E2E và kim tự tháp kiểm thử
slug: e2e-va-kim-tu-thap-kiem-thu
summary: Vì sao ít E2E mà nhiều unit test, và cách làm E2E không chập chờn.
level: trung-cap
tags: [testing, e2e, ci]
---

> **Sau bài này bạn sẽ:** phân bổ được số lượng test theo từng tầng, và viết E2E không đỏ ngẫu nhiên.

## Ba tầng, ba đánh đổi

```
        /\        E2E — mở trình duyệt thật, đi qua cả hệ thống
       /  \       ít bài, chậm (giây → phút), dễ chập chờn
      /----\
     /      \     Integration — nhiều thành phần thật ghép lại
    /        \    trung bình, chạy trong trăm ms
   /----------\
  /            \  Unit — một hàm, không phụ thuộc gì
 /              \ rất nhiều, chạy trong vài ms
/________________\
```

Tỉ lệ tham khảo: khoảng **70% unit / 20% integration / 10% E2E**. Đây là hệ quả của một phép tính đơn giản, không phải quy ước thẩm mỹ.

Giả sử mỗi tầng đều bắt được lỗi:

| | Thời gian chạy | Lúc đỏ, bạn biết gì |
|---|---|---|
| Unit | 5ms | Đúng hàm nào sai |
| Integration | 200ms | Đúng tầng nào sai |
| E2E | 30s | "Có gì đó hỏng đâu đó" |

Test chậm và chỉ ra chỗ mơ hồ thì phải ít. Test nhanh và chỉ ra chính xác thì cho nhiều. Bộ test 500 unit chạy 3 giây được chạy sau mỗi lần lưu file; bộ 500 E2E chạy 4 tiếng thì không ai chạy trước khi push.

**Kim tự tháp lật ngược** — nhiều E2E, ít unit — là hình dạng tệ nhất: chậm, chập chờn, và mỗi lần đỏ phải điều tra thủ công.

## E2E test cái gì

Chỉ những luồng mà **nếu vỡ thì sản phẩm coi như chết**:

- Đăng ký → đăng nhập → vào được trang chính
- Thêm hàng vào giỏ → thanh toán → thấy đơn đã tạo
- Với repo này: mở trang chủ → chọn công nghệ → mở bài học → thấy nội dung

Không dùng E2E để test validate từng ô nhập. Có 12 quy tắc validate thì viết 12 unit test cho hàm validate, cộng **một** E2E xác nhận lỗi hiện lên được trên giao diện.

## Nguồn của E2E chập chờn: chờ theo thời gian

Đây là nguyên nhân của gần như mọi E2E đỏ ngẫu nhiên.

```ts
// ❌ Xanh trên máy mình, đỏ trên CI (CI luôn chậm hơn)
await page.click('button[type=submit]')
await page.waitForTimeout(1000)
expect(await page.textContent('.ket-qua')).toBe('Đã lưu')
```

`waitForTimeout` là lời phỏng đoán. Chọn 1s thì CI chậm hơn sẽ đỏ; chọn 10s cho an toàn thì bộ test chậm gấp mười. Chờ theo **điều kiện**, không theo đồng hồ:

```ts
// ✅ Chờ đúng thứ mình cần, tự thoát ngay khi có
await page.click('button[type=submit]')
await expect(page.getByText('Đã lưu')).toBeVisible()
```

Cách này vừa nhanh hơn (thoát ngay khi điều kiện đúng) vừa ổn định hơn (chờ tới timeout mới bỏ).

## Chọn phần tử theo thứ người dùng thấy

```ts
// ❌ Vỡ khi đổi CSS hoặc cấu trúc DOM
await page.click('.btn-primary > span:nth-child(2)')

// ✅ Bám vào thứ có ý nghĩa với người dùng
await page.getByRole('button', { name: 'Lưu bài học' }).click()
await page.getByLabel('Tiêu đề').fill('Bài mới')
await page.getByRole('link', { name: 'Bài tiếp theo' }).click()
```

Lợi ích kép: test không vỡ khi refactor giao diện, **và** nếu `getByRole` không tìm thấy thì trình đọc màn hình cũng không tìm thấy — test bắt luôn lỗi trợ năng.

## Mỗi test tự dựng dữ liệu của nó

```ts
test('sửa được bài học', async ({ page }) => {
  // ❌ Dựa vào dữ liệu có sẵn trong database
  await page.goto('/n/async-await-va-event-loop/edit')

  // ✅ Tự tạo qua API rồi mới mở giao diện
  const bai = await api.taoBaiHoc({ title: `Bài thử ${Date.now()}` })
  await page.goto(`/n/${bai.slug}/edit`)
})
```

Dữ liệu dựng qua API nhanh hơn dựng qua giao diện rất nhiều, và không làm test đỏ vì một lý do chẳng liên quan gì tới điều đang test.

## Khi E2E đỏ trên CI mà xanh ở máy

Thu bằng chứng thay vì đoán:

```ts
// playwright.config.ts
use: {
  trace: 'retain-on-failure',      // xem lại từng bước, có cả DOM snapshot
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

Ba nguyên nhân phổ biến nhất, theo thứ tự: CI chậm hơn nên `waitForTimeout` không đủ; múi giờ/ngôn ngữ khác nhau làm định dạng ngày lệch; và dữ liệu còn sót từ lần chạy trước.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Kim tự tháp lật ngược | Bộ test chậm, chập chờn, khó lần ra lỗi | Dồn về unit |
| `waitForTimeout` | Đỏ ngẫu nhiên trên CI | Chờ theo điều kiện |
| Chọn phần tử bằng CSS class | Đổi style là vỡ test | `getByRole` / `getByLabel` |
| E2E dùng dữ liệu có sẵn | Đỏ vì lý do không liên quan | Tự dựng qua API |
| Test validate từng ô bằng E2E | 12 test chậm thay cho 12 test nhanh | Unit cho luật, E2E cho luồng |
| Không bật trace trên CI | Đỏ mà không có cách điều tra | `trace: retain-on-failure` |

## Ghi nhớ

- Khoảng 70/20/10 — test chậm và mơ hồ thì phải ít.
- E2E chỉ cho luồng chết người, không cho quy tắc validate.
- Không bao giờ chờ theo thời gian; chờ theo điều kiện.
- Chọn phần tử theo role/label — bắt luôn lỗi trợ năng.

## Tự kiểm tra

1. Vì sao `waitForTimeout(1000)` xanh ở máy mà đỏ trên CI?
2. Có 12 quy tắc validate. Phân bổ test thế nào giữa unit và E2E?
3. Vì sao `getByRole` tốt hơn selector CSS ở hai phương diện?
