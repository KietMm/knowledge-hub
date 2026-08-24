---
title: Unit test đầu tiên
slug: unit-test-dau-tien
summary: Cấu trúc Arrange-Act-Assert, đặt tên test, và cách chọn trường hợp biên.
level: co-ban
tags: [testing, unit-test, vitest]
---

> **Sau bài này bạn sẽ:** viết được một bộ test đọc như tài liệu, và biết chọn trường hợp biên một cách có hệ thống.

## Ba bước: dựng — làm — khẳng định

```ts
import { describe, expect, it } from 'vitest'
import { taoSlug } from '@/lib/slug'

describe('taoSlug', () => {
  it('bỏ dấu tiếng Việt và nối bằng gạch ngang', () => {
    const tieuDe = 'Lập trình bất đồng bộ'      // Arrange — dựng dữ liệu
    const ketQua = taoSlug(tieuDe)              // Act     — gọi đúng MỘT lần
    expect(ketQua).toBe('lap-trinh-bat-dong-bo') // Assert — khẳng định
  })
})
```

Giữ đúng ba bước và **chỉ một hành động** mỗi test. Gọi hai hành động trong một test thì lúc đỏ bạn không biết cái nào gây ra.

## Tên test là câu văn, không phải nhãn

```ts
it('works')                                   // ❌ đỏ lên: hỏng cái gì?
it('test slug 2')                             // ❌
it('trả về chuỗi rỗng khi tiêu đề chỉ có dấu câu')  // ✅
it('không bao giờ trả về 0 phút')                   // ✅
```

Mẹo: đọc `describe` + `it` liền nhau thành một câu — *"taoSlug — bỏ dấu tiếng Việt và nối bằng gạch ngang"*. Danh sách test khi đó chính là đặc tả hành vi của hàm, và người đọc code hiểu hàm làm gì mà không cần mở file cài đặt.

## Chọn trường hợp biên có hệ thống

Đừng nghĩ ngẫu nhiên. Đi qua từng tham số và hỏi bốn nhóm:

| Nhóm | Với chuỗi | Với số | Với mảng |
|---|---|---|---|
| Rỗng / không có | `''`, `null` | `0` | `[]` |
| Một | một ký tự | `1` | một phần tử |
| Nhiều | chuỗi dài | số lớn | nhiều phần tử |
| Bất thường | emoji, dấu, khoảng trắng đầu/cuối | âm, `NaN`, `Infinity` | có `null` bên trong, trùng lặp |

Áp vào `taoSlug`:

```ts
describe('taoSlug', () => {
  it('bỏ dấu tiếng Việt', () => {
    expect(taoSlug('Cà phê sữa')).toBe('ca-phe-sua')
  })

  it('gộp nhiều khoảng trắng thành một gạch ngang', () => {
    expect(taoSlug('a    b')).toBe('a-b')
  })

  it('không để gạch ngang ở đầu hoặc cuối', () => {
    expect(taoSlug('  Xin chào!  ')).toBe('xin-chao')
  })

  it('trả chuỗi rỗng khi không còn ký tự nào dùng được', () => {
    expect(taoSlug('!!!???')).toBe('')
  })

  it('giữ chữ số', () => {
    expect(taoSlug('ES2015 và sau đó')).toBe('es2015-va-sau-do')
  })
})
```

Năm test này nói rõ hợp đồng của hàm hơn bất kỳ đoạn chú thích nào.

## Test cái ném lỗi

Truyền **hàm** vào `expect`, không truyền kết quả:

```ts
it('từ chối chia cho 0', () => {
  expect(() => chia(1, 0)).toThrow('Không chia được cho 0')
})

// ❌ Sai: lỗi ném ra ngay tại đây, test đỏ vì lỗi chưa bắt
expect(chia(1, 0)).toThrow()
```

Với code bất đồng bộ, `await` cả mệnh đề:

```ts
it('từ chối slug trùng', async () => {
  await expect(notesRepo.create({ slug: 'da-ton-tai' })).rejects.toThrow(/trùng/)
})
```

Thiếu `await` thì test **xanh giả**: nó kết thúc trước khi promise kịp thất bại. Đây là lỗi khó thấy nhất trong test async.

## Chạy

```bash
pnpm test                      # chạy một lượt rồi thoát (dùng trong CI)
pnpm test:watch                # chạy lại mỗi lần lưu file
npx vitest run tests/lib/slug.test.ts   # chỉ một file
npx vitest run -t 'bỏ dấu'     # chỉ test có tên khớp
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Thiếu `await` trước `expect(...).rejects` | Test xanh dù code sai | `await expect(...)` |
| `expect(f(x)).toThrow()` | Lỗi ném ngay, test đỏ sai lý do | `expect(() => f(x)).toThrow()` |
| Nhiều hành động trong một test | Đỏ mà không biết bước nào sai | Một hành động mỗi test |
| Tên test chung chung | Log CI đỏ không nói được gì | Tên là câu mô tả hành vi |
| Test phụ thuộc thứ tự chạy | Xanh khi chạy cả bộ, đỏ khi chạy lẻ | Mỗi test tự dựng dữ liệu riêng |
| Dùng `toBe` cho object | Đỏ vì so sánh tham chiếu | `toEqual` |

## Ghi nhớ

- Arrange → Act → Assert, và chỉ một hành động mỗi test.
- Tên test đọc lên phải thành câu mô tả hành vi.
- Đi qua bốn nhóm biên: rỗng / một / nhiều / bất thường.
- Test async luôn `await expect(...)`; thiếu nó là xanh giả.

## Tự kiểm tra

1. Vì sao `expect(chia(1,0)).toThrow()` không hoạt động?
2. Kể bốn nhóm trường hợp biên cho một tham số kiểu mảng.
3. Vì sao `toBe` không dùng được để so sánh hai object có cùng nội dung?
