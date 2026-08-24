---
title: TDD trong thực tế
slug: tdd-trong-thuc-te
summary: Vòng đỏ-xanh-refactor, khi TDD giúp thật, và khi nó chỉ làm chậm bạn.
level: nang-cao
tags: [testing, tdd, quy-trinh]
---

> **Sau bài này bạn sẽ:** chạy được một vòng TDD hoàn chỉnh, và biết khi nào nên bỏ nó đi.

## Vòng ba bước

**Đỏ** → viết test cho hành vi chưa có. Chạy, thấy nó đỏ.
**Xanh** → viết code ít nhất để test xanh. Xấu cũng được.
**Refactor** → dọn code, test vẫn xanh.

Bước "thấy nó đỏ" là bước dễ bị bỏ nhất và cũng quan trọng nhất. Test chưa từng đỏ là test **chưa được chứng minh là có tác dụng**:

```ts
it('tính giảm giá cho thành viên VIP', () => {
  expect(tinhGiamGia({ vip: true, tong: 100_000 })).toBe(10_000)
})
```

Nếu bạn viết `tinhGiamGia` trước rồi mới viết test, và test xanh ngay — bạn không biết nó xanh vì code đúng hay vì `expect` gõ sai. Thấy nó đỏ trước là cách duy nhất biết test thật sự đang kiểm cái gì.

## Một vòng đầy đủ

Yêu cầu: *đơn từ 500k trở lên được freeship, dưới thì tính 30k, thành viên VIP luôn freeship.*

**Đỏ 1:**

```ts
it('miễn phí ship cho đơn từ 500k', () => {
  expect(tinhPhiShip({ tong: 500_000, vip: false })).toBe(0)
})
```

Chạy: `tinhPhiShip is not defined`. Đỏ — đúng như mong đợi.

**Xanh 1** — ít nhất có thể, kể cả hard-code:

```ts
export function tinhPhiShip(don: { tong: number; vip: boolean }): number {
  return 0
}
```

Hard-code trông vô nghĩa nhưng có tác dụng thật: nó chứng minh đường dây đã nối (import đúng, tên hàm đúng, chữ ký đúng) trước khi bạn viết logic. Test tiếp theo sẽ ép nó phải tổng quát hoá.

**Đỏ 2:**

```ts
it('tính 30k cho đơn dưới 500k', () => {
  expect(tinhPhiShip({ tong: 499_000, vip: false })).toBe(30_000)
})
```

**Xanh 2:**

```ts
export function tinhPhiShip(don: { tong: number; vip: boolean }): number {
  return don.tong >= 500_000 ? 0 : 30_000
}
```

**Đỏ 3 + Xanh 3:**

```ts
it('VIP luôn được miễn phí ship', () => {
  expect(tinhPhiShip({ tong: 100_000, vip: true })).toBe(0)
})
```

```ts
export function tinhPhiShip(don: { tong: number; vip: boolean }): number {
  if (don.vip) return 0
  return don.tong >= 500_000 ? 0 : 30_000
}
```

**Refactor** — giờ mới đặt tên cho các con số, an toàn vì có ba test canh:

```ts
const NGUONG_FREESHIP = 500_000
const PHI_SHIP = 30_000

export function tinhPhiShip(don: { tong: number; vip: boolean }): number {
  if (don.vip) return 0
  return don.tong >= NGUONG_FREESHIP ? 0 : PHI_SHIP
}
```

Ba test này còn là tài liệu chính xác về quy tắc nghiệp vụ — thứ mà comment không bao giờ đảm bảo được vì comment không chạy.

## TDD giúp thật khi nào

**Rất phù hợp:**
- Logic nghiệp vụ có nhiều nhánh và điều kiện — mỗi nhánh là một test, viết tới đâu chắc tới đó
- Sửa bug: viết test tái hiện bug (đỏ), sửa (xanh). Bạn có bằng chứng đã sửa đúng, và bug không quay lại.
- Hàm thuần chuyển đổi dữ liệu
- Khi bạn **chưa rõ** code nên trông thế nào — viết test trước buộc bạn quyết định giao diện hàm từ góc nhìn người dùng nó

**Ít phù hợp:**
- Dò đường trong thư viện lạ — bạn còn chưa biết mình muốn gì thì test trước là đoán mò
- Bố cục giao diện — "cái nút nằm bên phải" không diễn đạt được bằng test một cách hữu ích
- Prototype định bỏ đi
- Code chỉ chuyển tiếp lời gọi, không có logic

Thành thật: dò đường xong rồi thì **xoá bản nháp và làm lại bằng TDD** thường ra kết quả tốt hơn là giữ bản nháp rồi bọc test lên sau.

## Vì sao viết test trước ra thiết kế khác

Viết test trước buộc bạn dùng hàm **trước khi** cài đặt nó. Bạn tự nhiên chọn chữ ký dễ gọi:

```ts
// Nghĩ từ góc nhìn cài đặt: cần gì thì nhét vào
tinhPhiShip(don, khachHang, cauHinh, db, logger)

// Nghĩ từ góc nhìn người gọi (test trước): cần đúng những gì?
tinhPhiShip({ tong: 500_000, vip: false })
```

Hàm thứ hai không cần `db` hay `logger` vì test không muốn dựng chúng. Cái "không muốn dựng" đó chính là áp lực đẩy bạn tách logic thuần ra khỏi tác dụng phụ — xem [[test-double-stub-mock-fake]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không chạy để thấy test đỏ | Test có thể vô tác dụng mà không ai biết | Luôn xác nhận đỏ trước |
| Viết 10 test rồi mới code | Mất phản hồi từng bước, debug cả khối | Một test một lần |
| Bỏ bước refactor | Code tích tụ hard-code và số ma thuật | Dọn khi vẫn còn xanh |
| TDD cho code đang dò đường | Test đoán mò, phải viết lại liên tục | Dò trước, xoá, TDD lại |
| Sửa bug mà không viết test đỏ trước | Không biết đã sửa đúng nguyên nhân chưa | Tái hiện bug bằng test |
| Test trước cho bố cục UI | Test giòn, không diễn đạt được ý định | Test hành vi, không test vị trí |

## Ghi nhớ

- Đỏ → xanh → refactor. Bỏ bước "thấy đỏ" là bỏ mất giá trị của TDD.
- Xanh bằng code ít nhất, kể cả hard-code; test sau sẽ ép tổng quát hoá.
- Sửa bug: test đỏ tái hiện trước, rồi mới sửa.
- Viết test trước ra chữ ký hàm dễ gọi hơn, vì bạn là người gọi đầu tiên.

## Tự kiểm tra

1. Vì sao bắt buộc phải thấy test đỏ trước khi viết code?
2. Hard-code `return 0` để test xanh có ích gì?
3. Vì sao TDD thường ra hàm có ít phụ thuộc hơn?
