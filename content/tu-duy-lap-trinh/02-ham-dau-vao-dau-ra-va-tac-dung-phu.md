---
title: Hàm — đầu vào, đầu ra và tác dụng phụ
slug: ham-dau-vao-dau-ra-va-tac-dung-phu
summary: Hàm thuần dễ test và dễ tin. Tác dụng phụ là thứ làm chương trình khó đoán — biết tách hai loại ra là kỹ năng nền.
level: co-ban
tags: [nen-tang, tu-duy, ham, tac-dung-phu]
---

> **Sau bài này bạn sẽ:** phân biệt được hàm thuần với hàm có tác dụng phụ, biết vì sao sự phân biệt đó quyết định độ dễ test, và biết đẩy tác dụng phụ ra rìa chương trình.

## Hàm là một hợp đồng, không phải một đoạn code được đặt tên

Người mới hay nghĩ hàm là "cách gom code lại cho gọn". Đó là lợi ích phụ. Lợi ích chính là hàm cho bạn **một hợp đồng để tin**: đưa vào cái này, nhận về cái kia, và bạn **không cần đọc ruột nó** nữa.

Hợp đồng đó chỉ đáng tin nếu bạn trả lời được ba câu, cho **bất kỳ** hàm nào ở **bất kỳ** ngôn ngữ nào:

1. Nó nhận gì? (đầu vào)
2. Nó trả gì? (đầu ra)
3. Nó **còn đụng vào cái gì khác** không? (tác dụng phụ)

Câu thứ ba là câu hay bị bỏ quên, và là câu đắt nhất.

## Hàm thuần: cùng đầu vào luôn cho cùng đầu ra

```ts
// ✅ Thuần — chỉ nhìn tham số, chỉ trả kết quả
function tinhTien(gia: number, soLuong: number, thueSuat: number): number {
  return gia * soLuong * (1 + thueSuat)
}
```

```python
# ✅ Thuần
def tinh_tien(gia: float, so_luong: int, thue_suat: float) -> float:
    return gia * so_luong * (1 + thue_suat)
```

Hai tính chất, và cả hai đều phải đúng:

- **Xác định** — gọi 1000 lần với cùng tham số thì 1000 lần cùng kết quả.
- **Không tác dụng phụ** — chạy xong, thế giới bên ngoài y như trước.

Vì sao đáng quan tâm: hàm thuần **test được mà không cần dựng gì cả**. Không database, không mock, không dọn dẹp sau test.

```ts
expect(tinhTien(100, 2, 0.1)).toBe(220)   // hết, không cần chuẩn bị gì
```

## Tác dụng phụ là gì

Tác dụng phụ = mọi thứ hàm làm **ngoài** việc trả giá trị về:

```ts
function tinhTien(gia: number, soLuong: number): number {
  console.log('đang tính...')          // ① ghi ra ngoài
  soLanGoi++                            // ② sửa biến toàn cục
  db.insert({ gia, soLuong })           // ③ ghi database
  return gia * soLuong * (1 + THUE_HIEN_TAI)  // ④ đọc biến toàn cục
}
```

Cả bốn đều là tác dụng phụ. Cái số ④ tinh vi nhất — nó chỉ *đọc*, nhưng vẫn phá tính xác định: kết quả giờ phụ thuộc thứ nằm ngoài tham số, nên đọc chữ ký hàm không còn đủ để biết nó làm gì.

Tác dụng phụ **không xấu** — chương trình không có tác dụng phụ nào thì chẳng làm được gì có ích, kể cả in ra màn hình. Vấn đề là **trộn lẫn** chúng vào chỗ tính toán.

## Đẩy tác dụng phụ ra rìa

Đây là nguyên lý dùng được ở mọi ngôn ngữ, mọi framework: **lõi thuần, vỏ bẩn**.

```ts
// ❌ Trộn — muốn test cách tính giảm giá thì phải có database
async function xuLyDon(donId: string) {
  const don = await db.layDon(donId)
  let giam = 0
  if (don.tong > 1_000_000) giam = don.tong * 0.1
  else if (don.khachVip) giam = don.tong * 0.05
  await db.capNhat(donId, { giam })
  await email.gui(don.email, `Bạn được giảm ${giam}`)
}
```

```ts
// ✅ Tách — quy tắc nghiệp vụ thành hàm thuần
function tinhGiam(don: Don): number {
  if (don.tong > 1_000_000) return don.tong * 0.1
  if (don.khachVip) return don.tong * 0.05
  return 0
}

// Vỏ: chỉ điều phối, không chứa quy tắc nào
async function xuLyDon(donId: string) {
  const don = await db.layDon(donId)
  const giam = tinhGiam(don)                    // ← chỗ duy nhất có logic
  await db.capNhat(donId, { giam })
  await email.gui(don.email, `Bạn được giảm ${giam}`)
}
```

```python
# ✅ Cùng cách chia, khác cú pháp
def tinh_giam(don: Don) -> float:
    if don.tong > 1_000_000: return don.tong * 0.1
    if don.khach_vip:        return don.tong * 0.05
    return 0

async def xu_ly_don(don_id: str) -> None:
    don = await db.lay_don(don_id)
    giam = tinh_giam(don)
    await db.cap_nhat(don_id, giam=giam)
    await email.gui(don.email, f'Bạn được giảm {giam}')
```

Cái bạn vừa được: `tinhGiam` test được bằng sáu dòng, không cần database, chạy trong một phần nghìn giây. Còn `xuLyDon` — phần cần mock — giờ mỏng tới mức gần như không có gì để sai. Đây chính là lý do [[test-de-lam-gi-va-test-cai-gi]] khuyên dồn test vào tầng thuần.

Chính giáo trình này cũng xếp theo lối đó: `src/lib/` là các hàm thuần có unit test, còn chỗ chạm file nằm gọn trong một tầng riêng.

## Sửa tham số là tác dụng phụ trá hình

```ts
// ❌ Hàm nhận một mảng rồi sửa luôn mảng của người gọi
function themThue(items: Item[]): Item[] {
  for (const it of items) it.gia *= 1.1   // sửa vào chính object gốc!
  return items
}

const goc = [{ gia: 100 }]
const moi = themThue(goc)
console.log(goc[0].gia)   // 110 — "goc" đã bị đổi, dù người gọi không hề muốn
```

```ts
// ✅ Trả cái mới, không đụng cái cũ
function themThue(items: Item[]): Item[] {
  return items.map((it) => ({ ...it, gia: it.gia * 1.1 }))
}
```

```python
# ❌ sửa tại chỗ          # ✅ trả list mới
def them_thue(items):     def them_thue(items):
    for it in items:          return [replace(it, gia=it.gia * 1.1) for it in items]
        it.gia *= 1.1
    return items
```

Đây là hệ quả trực tiếp của bài [[bien-trang-thai-va-luong-dieu-khien]]: tham số giữ **đường tới** vật thể, nên sửa nó là sửa vào vật của người gọi. Quy ước an toàn: **hàm không sửa thứ nó không sở hữu.**

## Một hàm, một việc

Dấu hiệu hàm đang làm quá nhiều việc, nhận ra được mà không cần đọc kỹ:

- Tên có chữ **"và"** — `luuVaGuiEmail`
- Nhận một cờ để đổi hành vi — `xuatBaoCao(data, laPdf)` thường nên tách thành hai hàm
- Dài quá một màn hình
- Phần mô tả của nó cần một câu có dấu chấm phẩy

Không có con số vàng cho độ dài. Tiêu chí thật là: **giải thích được nó làm gì trong một câu, không dùng chữ "và"**. Chuyện tách tới đâu thì dừng là nội dung của [[truu-tuong-hoa-khi-nao-tach]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Đọc biến toàn cục trong hàm tính toán | Kết quả đổi theo bối cảnh, test lúc xanh lúc đỏ | Truyền vào qua tham số |
| Sửa mảng/object nhận từ tham số | Người gọi bị đổi dữ liệu mà không biết | Trả bản mới (`map`, spread, `replace`) |
| Trộn quy tắc nghiệp vụ với gọi database | Muốn test một phép cộng cũng phải mock cả tầng dữ liệu | Tách hàm thuần ra, vỏ chỉ điều phối |
| Hàm tên có chữ "và" | Không tái dùng được nửa nào | Tách thành hai hàm |
| Dùng cờ boolean để đổi hành vi | Đọc chỗ gọi `f(x, true)` không hiểu `true` nghĩa gì | Hai hàm tên rõ nghĩa |
| Hàm vừa trả giá trị vừa ghi log/DB ngầm | Gọi lại lần hai gây hậu quả ngoài ý muốn | Cho tác dụng phụ ra chỗ gọi |

## Ghi nhớ

- Hàm là **hợp đồng**: đầu vào, đầu ra, và tác dụng phụ. Câu thứ ba hay bị quên nhất.
- Hàm thuần = xác định + không tác dụng phụ. Nó test được mà không cần dựng gì.
- Tác dụng phụ không xấu; **trộn** nó vào chỗ tính toán mới xấu.
- Lõi thuần, vỏ bẩn: dồn quy tắc vào hàm thuần, để I/O ở rìa mỏng nhất có thể.
- Hàm không sửa thứ nó không sở hữu.

## Tự kiểm tra

1. Một hàm chỉ *đọc* biến toàn cục — nó còn thuần không? Vì sao?
2. Vì sao tách `tinhGiam` ra khỏi `xuLyDon` làm việc test dễ hơn hẳn?
3. Hàm tên `luuVaGuiEmail` có vấn đề gì?
