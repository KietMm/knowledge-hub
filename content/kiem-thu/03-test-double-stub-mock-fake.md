---
title: Test double — stub, mock và fake
slug: test-double-stub-mock-fake
summary: Ba loại vật thay thế, khi nào dùng loại nào, và vì sao mock nhiều là dấu hiệu thiết kế có vấn đề.
level: trung-cap
tags: [testing, mock, stub, thiet-ke]
---

> **Sau bài này bạn sẽ:** chọn đúng loại test double, và nhận ra khi việc phải mock quá nhiều đang tố giác một thiết kế xấu.

## Vì sao cần vật thay thế

Hàm gọi ra ngoài — API, database, đồng hồ, số ngẫu nhiên — không test được trực tiếp: chậm, cần mạng, và **kết quả đổi theo thời gian**.

```ts
export function chaoTheoGio(): string {
  const gio = new Date().getHours()      // đổi theo lúc chạy test
  return gio < 12 ? 'Chào buổi sáng' : 'Chào buổi chiều'
}
```

Test hàm này xanh buổi sáng, đỏ buổi chiều. Cần thay `new Date()` bằng thứ mình điều khiển được.

## Ba loại, ba mục đích khác nhau

**Stub — trả về giá trị định trước.** Dùng khi bạn chỉ cần *dữ liệu vào*:

```ts
const layTyGia = vi.fn().mockResolvedValue(25_000)
expect(await doiSangVnd(10, layTyGia)).toBe(250_000)
```

**Mock — khẳng định lời gọi đã xảy ra.** Chỉ dùng khi *bản thân việc gọi* là hành vi cần kiểm:

```ts
it('gửi email xác nhận sau khi tạo đơn', async () => {
  const guiEmail = vi.fn()
  await taoDon(don, { guiEmail })
  expect(guiEmail).toHaveBeenCalledWith('k@example.com', 'don-da-tao')
})
```

Ở đây gửi email **là** yêu cầu nghiệp vụ, nên khẳng định lời gọi là đúng chỗ. Khác hẳn với việc khẳng định "hàm nội bộ A có gọi hàm nội bộ B" — cái đó là test cách làm.

**Fake — bản cài đặt thật nhưng đơn giản.** Tốt nhất khi đối tượng có trạng thái:

```ts
class KhoTrongBoNho implements KhoNguoiDung {
  private data = new Map<string, User>()
  async luu(u: User) { this.data.set(u.id, u) }
  async tim(id: string) { return this.data.get(id) ?? null }
}
```

Fake hơn stub ở chỗ nó **cư xử đúng**: lưu rồi đọc ra được, lưu trùng id thì ghi đè. Stub cho `tim()` trả về cùng một user bất kể bạn lưu gì — và test sẽ xanh cả khi `luu()` hoàn toàn không hoạt động.

| | Trả giá trị | Có trạng thái | Khẳng định lời gọi |
|---|---|---|---|
| Stub | ✅ | ❌ | ❌ |
| Fake | ✅ | ✅ | ❌ |
| Mock | ✅ | ❌ | ✅ |

## Tiêm phụ thuộc thắng mock module

Hai cách thay thế, chênh lệch rất lớn về chất lượng:

```ts
// ❌ Mock module: buộc test vào đường dẫn import
vi.mock('@/lib/email', () => ({ guiEmail: vi.fn() }))

// ✅ Tiêm vào: phụ thuộc nằm trong chữ ký hàm
export async function taoDon(don: DonInput, deps: { guiEmail: GuiEmail }) { ... }
```

Cách tiêm tốt hơn ở ba điểm: đổi tên file không làm vỡ test, đọc chữ ký hàm là thấy ngay nó phụ thuộc gì, và không cần cơ chế đặc biệt nào của framework test.

## Đồng hồ và số ngẫu nhiên

Hai nguồn không xác định phổ biến nhất. Đưa chúng thành tham số:

```ts
export function chaoTheoGio(bayGio: Date = new Date()): string {
  return bayGio.getHours() < 12 ? 'Chào buổi sáng' : 'Chào buổi chiều'
}

it('chào buổi sáng trước 12h', () => {
  expect(chaoTheoGio(new Date('2026-08-18T08:00:00'))).toBe('Chào buổi sáng')
})
```

Giá trị mặc định giữ cho code gọi bình thường không phải đổi gì. Hoặc dùng đồng hồ ảo của Vitest:

```ts
vi.useFakeTimers()
vi.setSystemTime(new Date('2026-08-18T08:00:00'))
// ... test ...
vi.useRealTimers()      // BẮT BUỘC dọn, nếu không mọi test sau đều lệch giờ
```

## Mock nhiều là mùi thiết kế

Test phải mock năm thứ mới chạy được thì vấn đề không ở test:

```ts
// 😬 Năm mock cho một hàm
vi.mock('@/lib/db')
vi.mock('@/lib/email')
vi.mock('@/lib/sms')
vi.mock('@/lib/analytics')
vi.mock('@/lib/audit')
```

Hàm đó đang làm năm việc. Tách phần **tính toán thuần** ra khỏi phần **gây tác dụng phụ**:

```ts
// Thuần: test không cần mock gì
export function tinhTongDon(items: Item[]): number { ... }
export function kiemTraDon(don: DonInput): LoiDon[] { ... }

// Có tác dụng phụ: mỏng, chỉ điều phối
export async function taoDon(input: DonInput, deps: Deps) {
  const loi = kiemTraDon(input)          // ← logic thật, đã test riêng
  if (loi.length > 0) throw new LoiValidate(loi)
  const tong = tinhTongDon(input.items)  // ← logic thật, đã test riêng
  await deps.db.don.create({ ...input, tong })
  await deps.guiEmail(input.email, 'don-da-tao')
}
```

Logic khó nằm trong hàm thuần dễ test; hàm có phụ thuộc mỏng đi tới mức một test là đủ. Đây là lý do `src/lib/` của repo này tách `slug.ts`, `search.ts`, `tags.ts`, `reading-time.ts` ra khỏi tầng `db/`.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Mock thứ mình đang test | Test khẳng định mock, không khẳng định code | Chỉ mock ranh giới bên ngoài |
| Dùng mock chỗ chỉ cần stub | Test đỏ khi refactor | Khẳng định kết quả, không khẳng định lời gọi |
| Stub cho đối tượng có trạng thái | Xanh dù hàm lưu không hoạt động | Dùng fake |
| Không dọn `useFakeTimers` | Mọi test sau lệch thời gian | `useRealTimers()` trong `afterEach` |
| Mock module theo đường dẫn | Đổi tên file là vỡ test | Tiêm phụ thuộc qua tham số |
| Phải mock 5 thứ mới test được | Hàm làm quá nhiều việc | Tách phần thuần ra |

## Ghi nhớ

- Stub cho dữ liệu vào, fake cho trạng thái, mock chỉ khi lời gọi là hành vi cần kiểm.
- Tiêm phụ thuộc qua tham số tốt hơn mock module.
- Đồng hồ và số ngẫu nhiên phải đưa vào được từ ngoài.
- Cần nhiều mock = tách logic thuần ra khỏi tác dụng phụ.

## Tự kiểm tra

1. Vì sao stub một `KhoNguoiDung` có thể cho test xanh dù `luu()` hỏng?
2. Khi nào khẳng định lời gọi là hợp lý, khi nào là test cách làm?
3. Một hàm cần 5 mock. Sửa thiết kế thế nào?
