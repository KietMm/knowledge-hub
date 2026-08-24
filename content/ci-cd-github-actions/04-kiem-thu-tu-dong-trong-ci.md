---
title: Kiểm thử tự động trong CI
slug: kiem-thu-tu-dong-trong-ci
summary: Tháp kiểm thử, xử lý test chập chờn, và biến CI thành thứ đáng tin để chặn merge.
level: trung-cap
tags: [ci-cd, kiem-thu, test]
---

> **Sau bài này bạn sẽ:** thiết kế bộ test chạy nhanh mà vẫn đủ tin cậy, và xử lý đúng khi gặp test chập chờn.

## Tháp kiểm thử

```
      /\      E2E — ít, chậm, giống người dùng nhất
     /  \
    /____\    Tích hợp — vừa phải, kiểm tra các phần ghép với nhau
   /      \
  /________\  Đơn vị — nhiều, nhanh, kiểm tra logic thuần
```

Tỷ lệ tham khảo: 70% đơn vị, 20% tích hợp, 10% E2E.

Lý do không phải "E2E tốt hơn nên viết nhiều": E2E chậm gấp hàng trăm lần, chập chờn hơn nhiều, và khi hỏng thì nó chỉ nói "có gì đó sai" chứ không chỉ ra chỗ nào.

Ngược lại, một bộ test toàn unit với mọi thứ đều mock có thể xanh hoàn toàn trong khi ứng dụng không chạy được — vì phần ghép nối chưa bao giờ được kiểm tra. Cả hai thái cực đều tệ.

## Ba tầng trong CI

```yaml
jobs:
  don-vi:
    steps:
      - run: pnpm test:unit --coverage

  tich-hop:
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-retries 5
    steps:
      - run: pnpm db:migrate
      - run: pnpm test:integration

  e2e:
    needs: [don-vi, tich-hop]        # chỉ chạy khi tầng dưới đã xanh
    steps:
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build && pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

Tải báo cáo lên khi thất bại là chi tiết nhỏ nhưng tiết kiệm rất nhiều thời gian: bạn xem được ảnh chụp màn hình và trace thay vì phải chạy lại trên máy mình.

## Test chập chờn

Test lúc xanh lúc đỏ mà code không đổi. Đây là thứ giết chết niềm tin vào CI nhanh nhất: khi người ta quen với việc "chạy lại là xanh", họ sẽ chạy lại cả những lần đỏ thật.

**Nguyên nhân thường gặp:**

| Nguyên nhân | Cách sửa |
|---|---|
| Chờ theo thời gian cố định | Chờ theo điều kiện (`waitFor`) |
| Test phụ thuộc thứ tự chạy | Mỗi test tự dựng dữ liệu riêng |
| Dùng chung dữ liệu | Dữ liệu riêng theo test, hoặc dọn sau mỗi test |
| Múi giờ / thời gian thật | Cố định thời gian trong test |
| Gọi dịch vụ mạng thật | Mock hoặc dùng máy chủ giả |

```ts
// Chập chờn: 100ms có thể không đủ trên máy CI chậm
await sleep(100)
expect(screen.getByText('Đã lưu')).toBeInTheDocument()

// Ổn định: chờ tới khi điều kiện đúng, tối đa một khoảng
await waitFor(() => expect(screen.getByText('Đã lưu')).toBeInTheDocument())
```

**Cách xử lý đúng khi phát hiện test chập chờn:** đánh dấu `skip` kèm issue, sửa trong vòng vài ngày. Đừng thêm `retry` — retry che vấn đề và có ngày che luôn một bug thật.

## Độ phủ

```yaml
- run: pnpm test --coverage
- uses: codecov/codecov-action@v4
```

Độ phủ hữu ích khi đọc như một **bản đồ**: phần nào của code chưa có test nào chạm tới? Nó vô dụng khi biến thành chỉ tiêu — người ta sẽ viết test gọi hàm mà không assert gì để đạt số.

Ngưỡng hợp lý: đặt mức không được **giảm** so với hiện tại, thay vì một con số tuyệt đối.

## Chặn merge

Trên GitHub, cấu hình branch protection cho `main`:

- Yêu cầu các job kiểm tra phải xanh.
- Yêu cầu nhánh cập nhật với `main` trước khi merge.
- Yêu cầu ít nhất một người duyệt.

Đây là điểm biến CI từ "thông tin tham khảo" thành "hàng rào thật".

## Kiểm tra chất lượng khác

```yaml
- run: pnpm lint
- run: pnpm typecheck
- run: pnpm format:check
- run: npx knip                 # tìm export và dependency không dùng
- run: npx size-limit            # chặn bundle phình to
```

`size-limit` đáng thêm cho ứng dụng web: nó biến "bundle to dần theo thời gian" thành một lỗi CI cụ thể ở đúng PR gây ra.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Quá nhiều E2E | CI chậm, chập chờn | Đẩy xuống tầng unit/tích hợp |
| Thêm `retry` cho test chập chờn | Che bug thật | Sửa nguyên nhân gốc |
| `sleep` cố định | Hỏng trên máy CI chậm | Chờ theo điều kiện |
| Test dùng chung dữ liệu | Phụ thuộc thứ tự chạy | Dữ liệu riêng mỗi test |
| Độ phủ thành chỉ tiêu | Test rỗng để đạt số | Dùng làm bản đồ, không phải KPI |

## Ghi nhớ

- Nhiều unit, ít E2E — nhưng đừng mock tới mức không còn kiểm tra gì thật.
- Test chập chờn phải sửa, không được retry.
- Tải báo cáo lên khi test thất bại.
- CI chỉ có giá trị khi nó chặn được merge.

## Tự kiểm tra

1. Vì sao 70% unit / 10% E2E chứ không ngược lại?
2. Nêu ba nguyên nhân test chập chờn và cách sửa từng cái.
3. Vì sao thêm `retry` cho test chập chờn là quyết định tệ?
