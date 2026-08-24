---
title: Hàm, closure và this
slug: ham-closure-va-this
summary: Hàm là giá trị, closure là hàm nhớ được nơi nó sinh ra, và this được quyết định lúc gọi chứ không lúc viết.
level: co-ban
tags: [javascript, ham, closure, this]
---

> **Sau bài này bạn sẽ:** giải thích được vì sao một callback lại "mất" `this`, và dùng closure để giữ trạng thái riêng tư mà không cần class.

## Hàm là một giá trị

Trong JavaScript, hàm gán được vào biến, truyền được làm tham số, trả về được từ hàm khác:

```js
const nhanDoi = (x) => x * 2
const apDung = (fn, giaTri) => fn(giaTri)

apDung(nhanDoi, 21)   // 42
```

Đây là nền tảng của `map`/`filter`/`reduce`, của middleware, của mọi callback.

### Ba cách viết, khác nhau ở `this` và hoisting

```js
function a() {}              // khai báo: được hoisting, gọi trước dòng viết vẫn chạy
const b = function () {}     // biểu thức: chỉ dùng được sau dòng khai báo
const c = () => {}           // arrow: không có this/arguments riêng
```

## Closure: hàm nhớ nơi nó sinh ra

Khi một hàm được tạo bên trong hàm khác, nó giữ luôn quyền truy cập vào biến của hàm bao — **kể cả sau khi hàm bao đã chạy xong**:

```js
function taoBoDem() {
  let dem = 0                 // biến này sống lâu hơn taoBoDem()
  return {
    tang: () => (dem += 1),
    doc: () => dem,
  }
}

const bd = taoBoDem()
bd.tang()
bd.tang()
bd.doc()      // 2
bd.dem        // undefined — không ai chạm được vào dem từ bên ngoài
```

Đó là cách tạo trạng thái riêng tư thật sự: `dem` không phải thuộc tính, không có cách nào đọc trực tiếp.

### Ứng dụng thường gặp: debounce

```js
function debounce(fn, ms) {
  let timer            // closure giữ timer giữa các lần gọi
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

const timKiem = debounce((tuKhoa) => console.log('tìm', tuKhoa), 300)
```

Không có closure thì `timer` phải là biến toàn cục, và hai ô tìm kiếm trên cùng trang sẽ giẫm chân nhau.

### Bẫy closure kinh điển trong vòng lặp

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// In ra: 3, 3, 3 — chỉ có MỘT biến i, và lúc callback chạy thì i đã là 3

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// In ra: 0, 1, 2 — let tạo một biến i mới cho mỗi vòng lặp
```

## `this` được quyết định lúc gọi

`this` **không** phụ thuộc vào nơi hàm được viết, mà vào cách hàm được gọi:

```js
const nguoiDung = {
  ten: 'An',
  chao() {
    return `Xin chào ${this.ten}`
  },
}

nguoiDung.chao()              // "Xin chào An" — gọi qua object, this = nguoiDung

const chao = nguoiDung.chao   // tách hàm ra khỏi object
chao()                        // "Xin chào undefined" — this không còn là nguoiDung
```

Đây chính là lý do callback hay "mất" `this`:

```js
setTimeout(nguoiDung.chao, 100)          // hỏng
setTimeout(() => nguoiDung.chao(), 100)  // đúng — vẫn gọi qua object
setTimeout(nguoiDung.chao.bind(nguoiDung), 100) // đúng — buộc cứng this
```

### Arrow function không có `this` riêng

Arrow lấy `this` từ phạm vi bao quanh lúc **định nghĩa**. Nhờ vậy nó lý tưởng cho callback:

```js
class GioHang {
  items = []
  tongTien() {
    // arrow ở đây thấy this của tongTien -> chính là instance
    return this.items.reduce((tong, item) => tong + item.gia * this.tyGia, 0)
  }
}
```

Nhưng chính vì thế, **đừng** dùng arrow làm method của object literal:

```js
const sai = {
  ten: 'An',
  chao: () => `Xin chào ${this.ten}`,  // this là module/window, không phải object
}
```

## Bốn quy tắc xác định `this`, theo thứ tự ưu tiên

1. `new Fn()` → `this` là object vừa tạo.
2. `fn.call(obj)` / `fn.apply(obj)` / `fn.bind(obj)` → `this` là `obj`.
3. `obj.fn()` → `this` là `obj`.
4. `fn()` → `this` là `undefined` (strict mode) hoặc global.

Arrow function nằm ngoài cả bốn quy tắc: nó không có `this` để gán.

## Lỗi hay gặp

| Lỗi | Vì sao sai | Sửa thế nào |
|---|---|---|
| `element.addEventListener('click', obj.xuLy)` | Mất `this` khi tách hàm | `() => obj.xuLy()` hoặc `.bind(obj)` |
| Arrow làm method trong object literal | Không có `this` riêng | Dùng cú pháp `xuLy() {}` |
| `var` trong vòng lặp có callback | Mọi callback chia sẻ một biến | Dùng `let` |
| Tạo hàm mới trong render mỗi lần | Closure mới ⇒ tham chiếu đổi ⇒ con re-render | `useCallback` hoặc đưa ra ngoài |

## Ghi nhớ

- Closure = hàm + môi trường biến nơi nó sinh ra. Đó là cách có trạng thái riêng tư.
- `let` tạo biến mới mỗi vòng lặp; `var` thì không.
- `this` do **cách gọi** quyết định, không do nơi viết.
- Arrow không có `this` riêng — dùng cho callback, tránh cho method.

## Tự kiểm tra

1. Viết `taoIdSinhTuDong()` trả về hàm mỗi lần gọi cho ra 1, 2, 3… mà không dùng biến toàn cục.
2. Vì sao `const f = obj.method; f()` lại lỗi trong khi `obj.method()` chạy tốt?
3. Khi nào **không** nên dùng arrow function?
