---
title: Unit test đầu tiên
slug: unit-test-dau-tien
summary: Cấu trúc Arrange-Act-Assert, đặt tên test, và cách chọn trường hợp biên.
level: co-ban
tags: [testing, unit-test, vitest]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được test mà người khác đọc là hiểu, và chọn trường hợp biên **có hệ thống** thay vì nghĩ ra được cái nào thì viết cái đó.

## Ý tưởng chính

Mọi test tốt đều có cùng ba phần, theo đúng thứ tự:

```text
Arrange  — dựng bối cảnh
Act      — làm ĐÚNG MỘT việc
Assert   — khẳng định kết quả
```

Và một test tốt chỉ có **một lý do để đỏ**. Nếu nó đỏ, bạn phải biết ngay chuyện gì hỏng mà không cần đọc code.

## Mental model

Hãy nghĩ tới **thí nghiệm khoa học ở lớp**.

> **Chuẩn bị**: đổ 50ml nước vào cốc, đun tới 20°C.
> **Tiến hành**: thả viên đá vào.
> **Quan sát**: nhiệt độ giảm còn 8°C.

> Không ai viết báo cáo kiểu *"thả đá, đổ nước, đun, thả tiếp đá, ghi nhận"*. Một thí nghiệm kiểm **một giả thuyết**, và mọi bước chuẩn bị phải xong trước khi tiến hành.

Test cũng vậy: trộn lẫn ba phần thì khi kết quả sai, bạn không biết sai ở bước nào.

## Ví dụ nhỏ

```ts
import { describe, it, expect } from 'vitest'

describe('tinhTong', () => {
  it('cộng thuế 10% vào giá gốc', () => {
    const don = { gia: 100_000 }        // Arrange
    const tong = tinhTong(don)          // Act
    expect(tong).toBe(110_000)          // Assert
  })
})
```

Ba dòng, ba vai trò. Đọc là hiểu ngay hàm này làm gì — test tốt cũng là tài liệu.

## Code chạy thế nào

**Tên test là một câu văn**, không phải nhãn:

```ts
it('test1')                                    // ❌ vô nghĩa
it('tinhTong')                                  // ❌ lặp lại tên hàm
it('hoạt động đúng')                            // ❌ đúng là thế nào?

it('cộng thuế 10% vào giá gốc')                 // ✅
it('ném lỗi khi giá âm')                        // ✅
it('trả về 0 khi giỏ hàng rỗng')                // ✅
```

Vì sao quan trọng: khi CI báo đỏ, bạn nhìn thấy **tên test** trước khi nhìn thấy code.

```text
✗ tinhTong > test3                    ← phải mở code ra mới biết hỏng gì
✗ tinhTong > ném lỗi khi giá âm       ← biết ngay chuyện gì xảy ra
```

Công thức đặt tên dùng được cho mọi test:

```text
[làm gì] khi [điều kiện]
"trả về danh sách rỗng khi không có đơn nào"
"ném ValidationError khi email thiếu @"
```

## Cú pháp

**Chọn trường hợp biên có hệ thống** — đừng ngồi nghĩ, hãy chạy qua danh sách:

```text
Số:      0, số âm, số rất lớn, số thập phân, NaN
Chuỗi:   rỗng "", chỉ khoảng trắng, rất dài, ký tự đặc biệt, tiếng Việt có dấu
Mảng:    rỗng, 1 phần tử, nhiều phần tử, có phần tử trùng
Object:  null, undefined, thiếu trường, thừa trường
Thời gian: quá khứ, tương lai, đúng lúc này, đổi múi giờ
```

Ba ca **luôn** phải có cho mọi hàm nhận tập hợp: **rỗng, một phần tử, nhiều phần tử**. Riêng ca "rỗng" bắt được số lượng bug bất ngờ lớn.

```ts
describe('layTuKhoaPhoBien', () => {
  it('trả về mảng rỗng khi không có dữ liệu', () => {
    expect(layTuKhoaPhoBien([])).toEqual([])
  })

  it('trả về đúng một mục khi chỉ có một từ khoá', () => {
    expect(layTuKhoaPhoBien(['a'])).toEqual([{ tu: 'a', so: 1 }])
  })

  it('sắp xếp theo số lần xuất hiện giảm dần', () => {
    expect(layTuKhoaPhoBien(['a', 'b', 'a'])[0]).toEqual({ tu: 'a', so: 2 })
  })
})
```

**Test cái ném lỗi** — phải kiểm cả loại lỗi, không chỉ "có ném":

```ts
it('ném lỗi khi giá âm', () => {
  expect(() => tinhTong({ gia: -1 })).toThrow(ValidationError)   // ✅ đúng loại
  expect(() => tinhTong({ gia: -1 })).toThrow('Giá không âm')     // ✅ đúng thông điệp
})

// ❌ Sai cách — hàm chạy NGAY, lỗi thoát ra ngoài expect
expect(tinhTong({ gia: -1 })).toThrow()
```

Với hàm async:

```ts
await expect(layNguoiDung('x')).rejects.toThrow(NotFoundError)
```

## Tại sao cần nó

Vì một test đỏ phải trả lời được ba câu **mà không cần mở code**:

```text
① Cái gì hỏng?        → tên test
② Mong đợi gì?        → assert
③ Thực tế ra gì?      → thông báo lỗi của thư viện test
```

So sánh hai cách viết:

```ts
// ❌ Đỏ thì chỉ biết "false không bằng true"
expect(ketQua.length > 0 && ketQua[0].ten === 'An').toBe(true)

// ✅ Đỏ thì thấy rõ giá trị thật là gì
expect(ketQua).toHaveLength(1)
expect(ketQua[0].ten).toBe('An')
```

Dùng matcher cụ thể (`toHaveLength`, `toEqual`, `toContain`) thay vì gộp mọi điều kiện vào `toBe(true)` — thư viện test in ra được sự khác biệt, còn `true`/`false` thì không.

Chạy test:

```bash
pnpm vitest                    # chế độ theo dõi, chạy lại khi file đổi
pnpm vitest run                # chạy một lần (dùng trong CI)
pnpm vitest --coverage
pnpm vitest tinhTong           # chỉ chạy test khớp tên
```

## So sánh

| Viết thế này | Thay vì |
|---|---|
| `expect(x).toEqual({a: 1})` | `expect(x.a === 1).toBe(true)` |
| `expect(ds).toHaveLength(3)` | `expect(ds.length === 3).toBe(true)` |
| `expect(ds).toContain('a')` | `expect(ds.includes('a')).toBe(true)` |
| `expect(fn).toThrow(TypeLoi)` | `try { fn() } catch { ... }` |

`toBe` so bằng `===` (dùng cho số, chuỗi, boolean); `toEqual` so **sâu** (dùng cho object, mảng). Nhầm hai cái này là lỗi phổ biến nhất của người mới dùng Vitest/Jest.

## Dễ nhầm

**1. Một test kiểm nhiều thứ.** Đỏ thì không biết cái nào hỏng, và test dừng ở assert đầu tiên nên bạn không thấy phần còn lại.

**2. Test phụ thuộc lẫn nhau.** Test B chỉ xanh nếu test A chạy trước ⇒ chạy song song hoặc đổi thứ tự là vỡ.

**3. Logic trong test.**

```ts
it('...', () => {
  for (const x of ds) if (x.a) expect(...)   // ❌ test có bug thì bạn không biết
})
```

Test nên **thẳng và ngu**: dữ liệu cụ thể, kết quả cụ thể. Cần nhiều ca thì dùng bảng:

```ts
it.each([
  [100_000, 110_000],
  [0, 0],
  [1, 1.1],
])('giá %i thành %i', (gia, mongDoi) => {
  expect(tinhTong({ gia })).toBe(mongDoi)
})
```

**4. Dùng `toBe` cho object.** `toBe` so tham chiếu — hai object giống hệt nhau vẫn không bằng nhau. Dùng `toEqual`.

**5. Quên `await` trong test async.** Test **xanh giả**: nó kết thúc trước khi Promise hoàn thành, và lỗi bên trong không ai thấy.

**6. Không kiểm loại lỗi.** `toThrow()` trần sẽ xanh kể cả khi hàm ném một `TypeError` do bạn gõ sai tên biến.

## Mẹo nhớ

> **Dựng — Làm — Khẳng định. Một test, một lý do để đỏ.**
>
> **Tên test là câu văn: [làm gì] khi [điều kiện].**
>
> **Ba ca luôn phải có: rỗng, một, nhiều.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba phần của một test và vai trò từng phần?
2. Vì sao tên test quan trọng — nó xuất hiện ở đâu khi CI đỏ?
3. Ba ca biên luôn phải có với hàm nhận tập hợp?
4. `toBe` và `toEqual` khác nhau thế nào?
5. Vì sao không nên viết vòng lặp và `if` trong test?

## Tự viết lại

Không nhìn lại phần trên, viết bộ test cho hàm này — liệt kê **ít nhất 6 ca**:

```ts
function chiaDeu(tongTien: number, soNguoi: number): number[] {
  // chia đều tiền cho n người, phần dư chia cho những người đầu
  // chiaDeu(100, 3) → [34, 33, 33]
}
```

Tự kiểm: bạn có ca `soNguoi = 0` không? Và `tongTien = 0`? Hai ca đó bắt được lỗi mà ca thường bỏ sót.

## Thử sức

Test này **xanh nhưng vô dụng**:

```ts
it('lấy người dùng', async () => {
  const u = layNguoiDung('123')
  expect(u).toBeDefined()
})
```

Chỉ ra **ba** vấn đề (một trong số đó khiến test xanh ngay cả khi hàm ném lỗi). Rồi viết lại cho đúng.
