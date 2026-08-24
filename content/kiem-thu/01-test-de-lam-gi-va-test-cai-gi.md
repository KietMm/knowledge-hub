---
title: Test để làm gì và test cái gì
slug: test-de-lam-gi-va-test-cai-gi
summary: Test không phải để chứng minh code đúng, mà để bạn dám sửa code. Và vì sao 100% coverage là mục tiêu sai.
level: co-ban
tags: [testing, tu-duy]
---

> **Sau bài này bạn sẽ:** biết chọn cái gì đáng test, và vì sao chạy theo con số coverage lại tạo ra test vô dụng.

## Test mua cho bạn quyền được sửa code

Lý do thật của test không phải "chứng minh code đúng" — không bộ test nào chứng minh được điều đó. Lý do là: **có test thì bạn dám thay đổi code**.

Không có test, mỗi lần refactor là một lần đánh cược. Có test, bạn sửa rồi chạy một lệnh và biết ngay mình có làm vỡ gì không. Cái bạn mua được là **tốc độ về sau**, trả bằng thời gian bây giờ.

Từ đó suy ra ngay một điều: test nào khiến việc sửa code **khó hơn** là test có hại. Nó tồn tại để phục vụ việc thay đổi, không phải để ràng buộc.

## Test hành vi, đừng test cách làm

Đây là ranh giới quyết định test của bạn hữu ích hay thành gánh nặng.

```ts
// ❌ Test cách làm: buộc chặt vào chi tiết bên trong
it('gọi tinhThue rồi gọi lamTron', () => {
  const spy = vi.spyOn(module, 'tinhThue')
  tinhTongDon(don)
  expect(spy).toHaveBeenCalled()
})

// ✅ Test hành vi: khẳng định điều người dùng quan tâm
it('cộng 10% thuế vào tổng đơn', () => {
  expect(tinhTongDon({ items: [{ gia: 100_000, sl: 2 }] })).toBe(220_000)
})
```

Test đầu **đỏ khi bạn refactor dù kết quả vẫn đúng** — nó chống lại chính việc nó phải bảo vệ. Test sau chỉ đỏ khi kết quả thật sự sai.

Câu hỏi để tự kiểm: *"nếu tôi viết lại toàn bộ phần bên trong mà kết quả không đổi, test này có đỏ không?"* Đỏ thì nó đang test cách làm.

## Cái gì đáng test

Xếp theo tỉ lệ giá trị trên công sức:

**Rất đáng:**
- **Hàm thuần có logic** — tính toán, chuyển đổi, phân tích. Vào ra rõ ràng, không cần dựng gì.
- **Trường hợp biên** — rỗng, một phần tử, âm, `null`, chuỗi cực dài, dấu tiếng Việt.
- **Mọi bug từng xảy ra** — sửa bug thì viết test tái hiện nó trước. Đây là loại test có tỉ lệ hoàn vốn cao nhất, vì bug đã chứng minh chỗ đó dễ sai.
- **Quy tắc nghiệp vụ** — "đơn dưới 50k không được freeship", "chỉ chủ sở hữu mới xoá được".

**Ít đáng:**
- Getter/setter không có logic
- Code chỉ chuyển tiếp lời gọi sang thư viện
- Bố cục giao diện (`className` nào, thẻ gì) — thay đổi liên tục, test vỡ liên tục
- Chính thư viện bạn dùng (React, zod đã có test của họ)

Bộ test của repo này là ví dụ: `tests/lib/` phủ hàm thuần (`slug`, `search`, `tags`, `reading-time`, `frontmatter`) và tầng dữ liệu (`*.repo`), không có test nào khẳng định một `div` có class gì.

## Coverage là chẩn đoán, không phải mục tiêu

Coverage trả lời *"dòng nào chưa lần nào chạy trong test"* — hữu ích. Nó **không** trả lời *"code có đúng không"*:

```ts
export function chia(a: number, b: number): number {
  return a / b
}

it('chia được', () => {
  expect(chia(10, 2)).toBe(5)     // coverage 100% ✅
})
// b = 0 chưa hề được nghĩ tới. Con số 100% không biết điều đó.
```

Ép chỉ tiêu 100% tạo ra test viết cho có: gọi hàm rồi `expect(x).toBeDefined()`. Coverage lên, giá trị bằng không, và bạn còn phải bảo trì chúng.

Dùng nó đúng cách: xem báo cáo, tìm **nhánh** chưa chạy, tự hỏi "nhánh này có đáng test không". Câu trả lời "không" là hợp lệ.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Test cách làm thay vì hành vi | Refactor đúng vẫn làm test đỏ | Khẳng định kết quả, không khẳng định lời gọi |
| Chạy theo chỉ tiêu coverage | Đầy test vô nghĩa phải bảo trì | Coi coverage là chẩn đoán |
| Test bố cục giao diện | Đổi class là đỏ hàng loạt | Test hành vi người dùng thấy |
| Sửa bug mà không viết test | Bug quay lại sau vài tháng | Viết test tái hiện trước khi sửa |
| Một test khẳng định mười thứ | Đỏ lên không biết cái nào sai | Một test một mệnh đề |
| Tên test là `it('works')` | Đỏ mà không biết cái gì hỏng | Tên nói rõ hành vi |

## Ghi nhớ

- Test tồn tại để bạn dám sửa code, không để chứng minh code đúng.
- Test nào đỏ khi refactor mà kết quả không đổi là test sai.
- Đáng nhất: hàm thuần có logic, trường hợp biên, và mọi bug từng gặp.
- Coverage chỉ ra chỗ chưa chạy; nó không biết chỗ nào sai.

## Tự kiểm tra

1. Câu hỏi nào phân biệt được test hành vi và test cách làm?
2. Vì sao 100% coverage vẫn để lọt lỗi chia cho 0?
3. Vừa sửa một bug. Việc đầu tiên nên làm là gì, và vì sao?
