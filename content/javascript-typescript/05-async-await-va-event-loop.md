---
title: Bất đồng bộ, Promise và event loop
slug: async-await-va-event-loop
summary: Vì sao code bất đồng bộ không chặn luồng chính, thứ tự microtask/macrotask, và cách chạy song song đúng cách.
level: trung-cap
tags: [javascript, bat-dong-bo, event-loop, promise]
---

> **Sau bài này bạn sẽ:** đoán đúng thứ tự in ra của một đoạn code trộn `setTimeout` với `Promise`, và biết khi nào `await` đang làm chương trình chậm gấp đôi mà không cần thiết.

## Một luồng, nhưng không đứng chờ

JavaScript chỉ có **một luồng** thực thi. Mọi thao tác chờ (đọc file, gọi API, hẹn giờ) đều được giao cho môi trường bên ngoài (trình duyệt hoặc libuv của Node), rồi kết quả quay về qua hàng đợi. Nếu không có cơ chế này, mỗi lần gọi API là cả giao diện đứng hình.

## Event loop trong một câu

Ngăn xếp chạy hết code đồng bộ. Sau đó event loop lấy việc từ hàng đợi ra chạy — **microtask trước, macrotask sau**, và giữa hai macrotask luôn vét sạch microtask.

```js
console.log('1')
setTimeout(() => console.log('2 — macrotask'), 0)
Promise.resolve().then(() => console.log('3 — microtask'))
queueMicrotask(() => console.log('4 — microtask'))
console.log('5')

// Thứ tự in: 1, 5, 3 — microtask, 4 — microtask, 2 — macrotask
```

| Loại | Ai tạo ra | Ưu tiên |
|---|---|---|
| Microtask | `.then`, `await`, `queueMicrotask`, `MutationObserver` | Cao — chạy hết trước |
| Macrotask | `setTimeout`, `setInterval`, I/O, sự kiện DOM | Thấp — mỗi vòng một cái |

Hệ quả thực tế: một vòng lặp tạo microtask vô tận sẽ **treo cứng** trang, vì event loop không bao giờ tới lượt macrotask.

## Promise: ba trạng thái, chỉ đổi một lần

`pending` → `fulfilled` hoặc `rejected`. Đã đổi rồi thì không đổi lại được.

```js
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve('xong'), 100)
})

p.then((v) => console.log(v))
 .catch((e) => console.error(e))
 .finally(() => console.log('dọn dẹp'))
```

Bạn hiếm khi phải tự `new Promise` — chỉ dùng khi bọc một API kiểu callback cũ.

## async/await là Promise viết cho dễ đọc

`await` tạm dừng **hàm hiện tại**, không tạm dừng chương trình. Hàm `async` luôn trả về Promise:

```ts
async function layNguoiDung(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<User>
}
```

Lưu ý `fetch` **không** ném lỗi khi server trả 404 hay 500 — nó chỉ ném khi mạng hỏng. Phải tự kiểm tra `res.ok`.

## Lỗi phổ biến nhất: await tuần tự việc chạy song song được

```js
// Chậm: 2 lượt chờ nối tiếp, tổng = 200ms
const a = await layNguoiDung('1')   // 100ms
const b = await layNguoiDung('2')   // 100ms

// Nhanh: cùng khởi động, chờ một lần, tổng = 100ms
const [a2, b2] = await Promise.all([layNguoiDung('1'), layNguoiDung('2')])
```

Chỉ giữ tuần tự khi lệnh sau **thật sự cần** kết quả của lệnh trước.

### Chọn đúng hàm gộp Promise

| Hàm | Khi nào dùng | Hành vi khi có lỗi |
|---|---|---|
| `Promise.all` | Cần tất cả thành công | Hỏng một cái là hỏng cả |
| `Promise.allSettled` | Muốn biết kết quả từng cái | Không bao giờ reject |
| `Promise.race` | Lấy cái xong trước (vd timeout) | Trả về kết quả đầu tiên, kể cả lỗi |
| `Promise.any` | Lấy cái **thành công** đầu tiên | Chỉ reject khi tất cả đều hỏng |

```js
// Timeout cho một request bằng race
const ketQua = await Promise.race([
  fetch(url),
  new Promise((_, reject) => setTimeout(() => reject(new Error('quá hạn')), 3000)),
])
```

Cách hiện đại hơn: `AbortSignal.timeout(3000)` truyền vào `fetch` — huỷ thật sự request thay vì chỉ bỏ qua kết quả.

## Bắt lỗi

```js
try {
  const data = await layNguoiDung('1')
} catch (error) {
  // Bắt cả lỗi mạng lẫn throw trong hàm async
} finally {
  setDangTai(false)
}
```

**Promise không có ai `catch`** sẽ thành `unhandledRejection` — trong Node mặc định làm sập tiến trình. Đừng bao giờ gọi một hàm async mà bỏ lửng kết quả:

```js
capNhat()               // nếu lỗi, không ai biết
void capNhat().catch(ghiLog)   // rõ ràng: cố ý không chờ, nhưng có xử lý lỗi
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `await` trong `for` khi các lượt độc lập | Chậm gấp N lần | `Promise.all(items.map(...))` |
| `forEach(async ...)` | `forEach` không chờ, hàm kết thúc sớm | `for...of` với `await`, hoặc `Promise.all` |
| Quên kiểm tra `res.ok` | Xử lý trang lỗi HTML như JSON | `if (!res.ok) throw ...` |
| Không `catch` promise | `unhandledRejection`, sập tiến trình Node | `.catch()` hoặc `try/catch` |
| `Promise.all` với hàng nghìn item | Mở quá nhiều kết nối cùng lúc | Chia lô, hoặc dùng thư viện giới hạn concurrency |

## Ghi nhớ

- Microtask luôn chạy hết trước macrotask kế tiếp.
- `await` dừng hàm, không dừng chương trình.
- Các việc độc lập ⇒ `Promise.all`. Tuần tự chỉ khi có phụ thuộc thật.
- `fetch` chỉ ném lỗi khi mạng hỏng — HTTP 500 vẫn là "thành công".

## Tự kiểm tra

1. Đoạn code ở mục "Event loop trong một câu" in ra theo thứ tự nào? Giải thích từng bước.
2. Chuyển vòng lặp `for (const id of ids) { await tai(id) }` sang chạy song song, nhưng tối đa 5 request cùng lúc.
3. Vì sao `items.forEach(async (i) => await luu(i))` không chờ được kết quả?
