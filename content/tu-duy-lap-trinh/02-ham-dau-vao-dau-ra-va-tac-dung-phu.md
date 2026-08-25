---
title: Hàm — đầu vào, đầu ra và tác dụng phụ
slug: ham-dau-vao-dau-ra-va-tac-dung-phu
summary: Hàm thuần dễ test và dễ tin. Tác dụng phụ là thứ làm chương trình khó đoán — biết tách hai loại ra là kỹ năng nền.
level: co-ban
tags: [nen-tang, tu-duy, ham, tac-dung-phu]
khung: v2
---

> **Sau bài này bạn sẽ:** nhìn một hàm là biết ngay nó có tác dụng phụ hay không, và tự tách được phần tính toán ra khỏi phần chạm vào thế giới bên ngoài.

## Ý tưởng chính

Hàm không phải "một đoạn code được đặt tên cho gọn". Hàm là một **lời hứa**: đưa vào những thứ này, nhận lại thứ kia.

Và hàm chia làm đúng hai loại, khác nhau ở một điểm duy nhất nhưng quyết định mọi thứ: **hàm chỉ đọc đầu vào rồi trả kết quả**, và **hàm còn chạm vào thứ gì đó bên ngoài** — ghi file, gọi mạng, sửa biến toàn cục, in ra màn hình.

## Mental model

Hãy so hai cái máy:

> **Hàm thuần là máy bán nước tự động.** Bỏ vào 10 nghìn, bấm nút số 3, luôn ra đúng lon nước đó. Hôm nay, ngày mai, ở Hà Nội hay Sài Gòn — vẫn thế. Bạn đoán được kết quả mà không cần biết bên trong máy có gì.
>
> **Hàm có tác dụng phụ là cái máy đó nhưng còn làm thêm việc khác:** nó nhắn tin cho chủ, ghi vào sổ, và đôi khi hết hàng nên nhả ra thứ khác.

Máy thứ hai không xấu — không có nó thì chẳng ai biết đã bán được bao nhiêu. Nhưng bạn **không đoán được** nó bằng cách nhìn vào đầu vào, và đó chính là cái giá.

## Ví dụ nhỏ

```ts
// Thuần: chỉ nhìn đầu vào, chỉ trả kết quả
function cong(a, b) {
  return a + b
}

// Không thuần: kết quả phụ thuộc thứ nằm ngoài
let thue = 0.1
function tinhTong(gia) {
  return gia * (1 + thue)
}
```

`cong(2, 3)` luôn là 5. Còn `tinhTong(100)` bằng bao nhiêu? Không ai trả lời được nếu chưa đi tìm xem lúc này `thue` đang bằng mấy.

## Code chạy thế nào

Gọi mỗi hàm hai lần, cách nhau một dòng gán:

```text
cong(2, 3)        → 5
cong(2, 3)        → 5          ✅ hai lần như một

tinhTong(100)     → 110
thue = 0.2                     ← ai đó ở đâu đó sửa
tinhTong(100)     → 120        ❌ cùng đầu vào, khác đầu ra
```

Dòng `thue = 0.2` có thể nằm ở **file khác, cách đó 2000 dòng**, do người khác viết. Đó là toàn bộ lý do hàm không thuần khó gỡ lỗi: để hiểu một lời gọi, bạn phải hiểu cả chương trình.

## Tại sao cần nó

Ba thứ bạn được ngay khi một hàm là thuần:

**Test không cần dựng gì cả.** Không cơ sở dữ liệu, không mạng, không mock:

```ts
expect(cong(2, 3)).toBe(5)   // xong
```

**Đọc là hiểu.** Nhìn chữ ký `function cong(a, b)` và biết chắc nó không lén xoá file nào. Chủ đề này nói kỹ ở [[test-de-lam-gi-va-test-cai-gi]].

**Chạy lại được.** Sai thì gọi lại, không sợ nó đã kịp gửi email lần một.

Ngược lại, **chương trình không có tác dụng phụ nào thì hoàn toàn vô dụng** — không đọc được dữ liệu, không hiện được gì lên màn hình. Nên mục tiêu không phải xoá bỏ tác dụng phụ, mà là **dồn chúng vào một chỗ**:

```ts
// ❌ Trộn lẫn: vừa tính vừa ghi, không test được phần tính
async function xuLyDon(id) {
  const don = await db.get(id)
  const tong = don.dong.reduce((s, d) => s + d.gia * d.sl, 0)
  await db.luu(id, { tong })
  await guiMail(don.email, tong)
}

// ✅ Tách: phần tính là hàm thuần, test thẳng được
function tinhTongDon(don) {
  return don.dong.reduce((s, d) => s + d.gia * d.sl, 0)
}

async function xuLyDon(id) {          // vỏ mỏng, chỉ điều phối
  const don = await db.get(id)
  const tong = tinhTongDon(don)       // ← chỗ nghiệp vụ thật sự nằm
  await db.luu(id, { tong })
  await guiMail(don.email, tong)
}
```

Nghiệp vụ khó nhất giờ nằm trong một hàm không cần cơ sở dữ liệu nào để kiểm.

## So sánh

| | Hàm thuần | Hàm có tác dụng phụ |
|---|---|---|
| Cùng đầu vào | luôn cùng đầu ra | có thể khác nhau |
| Test | gọi và so kết quả | phải dựng môi trường, mock |
| Gọi lại lần hai | vô hại | có thể gửi mail hai lần |
| Đọc để hiểu | đọc mỗi nó là đủ | phải đọc cả những chỗ khác |
| Ví dụ | `cong`, `dinhDang`, `loc` | `luu`, `guiMail`, `console.log` |

## Dễ nhầm

**1. Tưởng "không `return` gì" nghĩa là hàm đơn giản.** Thường ngược lại: hàm không trả về gì mà vẫn có ích thì chắc chắn nó đã làm gì đó **ở bên ngoài**. Không trả về gì là *dấu hiệu* của tác dụng phụ, không phải dấu hiệu vô hại.

**2. Sửa tham số là tác dụng phụ trá hình.**

```ts
// ❌ Trông như hàm thuần, nhưng nó sửa mảng của người gọi
function sapXep(ds) {
  return ds.sort((a, b) => a - b)   // sort sửa TẠI CHỖ
}

const goc = [3, 1, 2]
sapXep(goc)
console.log(goc)   // [1, 2, 3] — mảng gốc đã bị đổi!
```

```ts
// ✅ Sao chép trước
function sapXep(ds) {
  return [...ds].sort((a, b) => a - b)
}
```

Người gọi đọc tên hàm `sapXep` và nghĩ "nó trả về bản đã sắp"; không ai nghĩ "nó sẽ phá mảng của tôi". Cùng gốc rễ với chuyện chép địa chỉ nhà ở [[kieu-du-lieu-va-bien]].

**3. Tưởng hàm đọc dữ liệu là thuần.** Đọc cũng là chạm ra ngoài:

```ts
function laHetHan(han) {
  return han < Date.now()   // ❌ phụ thuộc ĐỒNG HỒ — chạy lại lúc khác ra kết quả khác
}

function laHetHan(han, bayGio) {
  return han < bayGio       // ✅ thời gian thành đầu vào, test được
}
```

`Date.now()`, `Math.random()`, đọc biến toàn cục, đọc biến môi trường — tất cả đều làm hàm mất tính thuần. Cách chữa luôn giống nhau: **biến thứ nó đọc thành tham số**.

**4. Một hàm làm nhiều việc.** Tên hàm có chữ "và" thường là dấu hiệu: `kiemTraVaLuu`, `tinhVaGui`. Cắt ra thì mỗi phần test được riêng và đặt tên được rõ hơn — cách cắt nằm ở [[chia-bai-toan-lon-thanh-nho]].

## Mẹo nhớ

> **Thuần = máy bán nước: cùng đầu vào, cùng đầu ra, không làm gì thêm.**
>
> **Không xoá tác dụng phụ — dồn nó ra rìa.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Điều gì làm một hàm trở thành "thuần"?
2. Vì sao hàm thuần dễ test hơn hẳn?
3. Nêu ba thứ làm hàm mất tính thuần dù nó không ghi gì cả.
4. `function sapXep(ds) { return ds.sort(...) }` có tác dụng phụ không? Ở đâu?
5. Nếu tác dụng phụ là xấu, vì sao ta không viết chương trình toàn hàm thuần?

## Tự viết lại

Không nhìn lại phần trên, viết lại hàm này thành **một hàm thuần** cộng **một vỏ mỏng** chứa phần chạm ra ngoài:

```ts
let daGui = []
function guiThongBao(users) {
  for (const u of users) {
    if (u.diem > 100) {
      console.log(`Chúc mừng ${u.ten}`)
      daGui.push(u.id)
    }
  }
}
```

Tự kiểm trước khi chạy: hàm thuần của bạn nhận gì và trả về gì? Nó có được nhắc tới `console` hay `daGui` không?

## Thử sức

Hàm này có thuần không?

```ts
const cache = new Map()
function binhPhuong(n) {
  if (cache.has(n)) return cache.get(n)
  const kq = n * n
  cache.set(n, kq)
  return kq
}
```

Nó **sửa một biến bên ngoài** — nhưng gọi `binhPhuong(4)` bao nhiêu lần vẫn luôn ra 16. Vậy nó thuộc loại nào, và điều đó nói lên gì về việc "tác dụng phụ nào đáng lo, tác dụng phụ nào không"?
