---
title: Bất đồng bộ, Promise và event loop
slug: async-await-va-event-loop
summary: Vì sao code bất đồng bộ không chặn luồng chính, thứ tự microtask/macrotask, và cách chạy song song đúng cách.
level: trung-cap
tags: [javascript, bat-dong-bo, event-loop, promise]
khung: v2
---

> **Sau bài này bạn sẽ:** đoán đúng thứ tự các dòng in ra trong code bất đồng bộ, và nhận ra ngay khi mình đang `await` tuần tự những việc chạy song song được.

## Ý tưởng chính

JavaScript chỉ có **một luồng** — mỗi lúc chỉ làm được một việc. Nhưng nó không đứng chờ: khi gặp việc mất thời gian (gọi mạng, đọc file, hẹn giờ), nó **giao việc đó ra ngoài** rồi đi làm việc khác, và quay lại xử lý kết quả khi được báo.

Cơ chế điều phối chuyện đó gọi là **event loop**, và hiểu nó là điều kiện để không viết ra những đoạn chậm gấp năm lần mức cần thiết.

## Mental model

Hãy tưởng tượng **một đầu bếp duy nhất trong bếp**.

> Anh ta đặt nồi nước lên bếp — rồi **không đứng nhìn nồi nước sôi**. Anh ta quay sang thái rau, trộn nước sốt, dọn bàn.
>
> Khi nước sôi, chuông kêu. Anh ta **làm nốt việc đang cầm trên tay**, rồi mới xử lý nồi nước.
>
> Có hai loại chuông: **chuông trong tầm tay** (hết Promise) anh ta xử lý ngay sau việc hiện tại; **chuông ngoài cửa** (hết `setTimeout`, có request tới) phải chờ tới lượt.

Hai loại chuông đó chính là **microtask** và **macrotask**, và thứ tự của chúng giải thích mọi câu đố "đoán thứ tự in ra".

## Ví dụ nhỏ

```js
console.log('1')
setTimeout(() => console.log('2'), 0)
Promise.resolve().then(() => console.log('3'))
console.log('4')

// in ra: 1, 4, 3, 2
```

`setTimeout(..., 0)` in **sau cùng**, dù hẹn 0 mili giây. Đây là câu hỏi phỏng vấn kinh điển, và mental model ở trên trả lời được nó ngay.

## Code chạy thế nào

```text
① Chạy code đồng bộ tới hết:
     console.log('1')      → in "1"
     setTimeout(...)       → giao ra ngoài, hẹn chuông NGOÀI CỬA
     Promise.then(...)     → xếp vào hàng chuông TRONG TẦM TAY
     console.log('4')      → in "4"
   ⇒ ngăn xếp trống

② Xử lý HẾT chuông trong tầm tay (microtask):
     → in "3"

③ Rồi mới lấy MỘT chuông ngoài cửa (macrotask):
     → in "2"

④ Quay lại ②
```

Quy tắc rút ra, và nó đủ cho mọi câu đố loại này:

```text
Đồng bộ  →  chạy hết trước
Microtask (.then, await)  →  chạy hết SAU đồng bộ, TRƯỚC macrotask
Macrotask (setTimeout, I/O)  →  mỗi vòng chỉ lấy MỘT, rồi lại dọn hết microtask
```

Hệ quả thực tế: một vòng lặp `while` nặng **chặn toàn bộ** — không chuông nào được xử lý, giao diện đứng hình, request không được nhận. Bất đồng bộ không có nghĩa là song song.

## Cú pháp

```js
// Promise: ba trạng thái, chỉ đổi MỘT lần
const p = new Promise((resolve, reject) => { /* pending → fulfilled | rejected */ })

// async/await là cách viết dễ đọc của .then()
async function layDuLieu() {
  const res = await fetch('/api')     // "tạm dừng ở đây, cho người khác dùng bếp"
  return res.json()
}

// Chạy song song
const [a, b] = await Promise.all([layA(), layB()])          // một cái hỏng → cả cụm hỏng
const kq = await Promise.allSettled([layA(), layB()])        // luôn chờ hết, báo từng cái
const nhanh = await Promise.race([layA(), hetGio(3000)])     // ai xong trước lấy cái đó
```

## Tại sao cần nó

Vì đây là lỗi hiệu năng phổ biến nhất trong code JavaScript thật:

```js
// ❌ Tuần tự — 3 giây, dù ba việc chẳng liên quan gì nhau
const nguoiDung = await layNguoiDung()      // 1s
const donHang = await layDonHang()          // 1s
const thongBao = await layThongBao()        // 1s
```

```js
// ✅ Song song — 1 giây
const [nguoiDung, donHang, thongBao] = await Promise.all([
  layNguoiDung(), layDonHang(), layThongBao(),
])
```

Cách phân biệt rất đơn giản: **việc sau có cần kết quả của việc trước không?**

```js
// Cần → buộc phải tuần tự, và đó là đúng
const u = await layNguoiDung(id)
const don = await layDonHangCua(u.id)   // ✅ cần u.id
```

Trong vòng lặp, lỗi này còn tệ hơn nhiều:

```js
// ❌ 100 id × 200ms = 20 giây
for (const id of ids) kq.push(await layChiTiet(id))

// ✅ khoảng 200ms — nhưng cẩn thận: 100 request cùng lúc có thể làm sập server
const kq = await Promise.all(ids.map(layChiTiet))
```

Với danh sách lớn, cần chạy theo lô — song song có kiểm soát, không phải song song tối đa.

## So sánh

| Cách chờ | Khi một cái hỏng | Dùng khi |
|---|---|---|
| `await` lần lượt | Dừng ngay tại đó | Việc sau cần kết quả việc trước |
| `Promise.all` | **Cả cụm** hỏng ngay | Cần đủ mọi kết quả mới làm tiếp |
| `Promise.allSettled` | Vẫn chờ hết, báo từng cái | Muốn biết cái nào hỏng, cái nào xong |
| `Promise.race` | Lấy cái xong trước | Đặt hạn thời gian, hoặc nhiều nguồn dự phòng |

## Dễ nhầm

**1. Quên `await`.**

```js
const u = layNguoiDung()   // ❌ u là Promise, không phải người dùng
console.log(u.ten)         // undefined
```

Không lỗi, không cảnh báo — chỉ `undefined` xuất hiện ở đâu đó.

**2. `forEach` không chờ `await`.**

```js
ds.forEach(async (x) => { await xuLy(x) })
console.log('xong')        // ❌ in ra TRƯỚC khi xử lý xong cái nào
```

`forEach` không quan tâm hàm bạn truyền vào trả về Promise. Dùng `for...of` (tuần tự) hoặc `Promise.all(ds.map(...))` (song song).

**3. Bắt lỗi sai chỗ.**

```js
try {
  duLieu()                 // ❌ hàm async, không await → lỗi thoát ra ngoài try
} catch (e) { }
```

`try/catch` chỉ bắt được lỗi của Promise nếu bạn `await` nó bên trong khối. Không await thì lỗi thành **unhandled rejection**.

**4. Tưởng `setTimeout(fn, 0)` chạy ngay.** Nó là chuông ngoài cửa, và luôn xếp sau mọi microtask.

**5. Tưởng bất đồng bộ nghĩa là song song.** Một vòng lặp tính toán nặng vẫn chặn cứng luồng chính, dù bạn khai `async`. Việc nặng CPU cần worker thread, không phải `async`.

## Mẹo nhớ

> **Một đầu bếp: đặt nồi lên bếp rồi đi làm việc khác.**
>
> **Chuông trong tầm tay (Promise) trước, chuông ngoài cửa (setTimeout) sau.**
>
> **Việc sau không cần kết quả việc trước ⇒ `Promise.all`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao `setTimeout(fn, 0)` không chạy ngay lập tức?
2. Microtask và macrotask khác nhau ở chỗ nào về **thứ tự xử lý**?
3. Làm sao biết ba lời gọi `await` liên tiếp có gộp được thành `Promise.all` không?
4. Vì sao `ds.forEach(async ...)` không chờ?
5. `Promise.all` và `Promise.allSettled` khác nhau khi một việc thất bại?

## Tự viết lại

Không nhìn lại phần trên, sửa đoạn này cho chạy nhanh nhất có thể **mà vẫn đúng**:

```js
async function trangCaNhan(id) {
  const u = await layNguoiDung(id)
  const don = await layDonHang(id)
  const yeuThich = await layYeuThich(id)
  const goiY = await layGoiY(u.soThich)
  return { u, don, yeuThich, goiY }
}
```

Tự kiểm: lời gọi nào **buộc phải** chờ cái trước, và vì sao?

## Thử sức

Đoạn này in ra theo thứ tự nào?

```js
console.log('A')
setTimeout(() => console.log('B'), 0)
Promise.resolve().then(() => {
  console.log('C')
  setTimeout(() => console.log('D'), 0)
})
;(async () => { console.log('E'); await null; console.log('F') })()
console.log('G')
```

Viết ra đáp án **trước khi chạy**. Nếu sai, hãy lần lại theo bốn bước ở phần "Code chạy thế nào" — chỗ sai gần như luôn là dòng `await null`.
