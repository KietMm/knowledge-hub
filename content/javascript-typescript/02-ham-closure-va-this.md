---
title: Hàm, closure và this
slug: ham-closure-va-this
summary: Hàm là giá trị, closure là hàm nhớ được nơi nó sinh ra, và this được quyết định lúc gọi chứ không lúc viết.
level: co-ban
tags: [javascript, ham, closure, this]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được vì sao một hàm vẫn "nhớ" biến sau khi hàm cha đã chạy xong, và tự suy ra `this` bằng cách nhìn **lời gọi** thay vì nhìn định nghĩa.

## Ý tưởng chính

Trong JavaScript, hàm là **một giá trị** như số hay chuỗi: gán vào biến được, truyền làm tham số được, trả về từ hàm khác được.

Từ một điều đó sinh ra hai thứ hay gây bối rối nhất cho người mới: **closure** (hàm mang theo nơi nó sinh ra) và **`this`** (thứ được quyết định lúc gọi, không phải lúc viết).

## Mental model

Hai hình ảnh cho hai khái niệm:

> **Closure là chiếc ba lô.** Khi một hàm được tạo ra, nó **đeo theo một chiếc ba lô** chứa mọi biến ở nơi nó sinh ra. Hàm đi đâu, ba lô theo đó — kể cả khi ngôi nhà nó sinh ra đã bị dỡ bỏ.
>
> **`this` là chữ "tôi" trong một câu nói.** Câu *"tôi trả tiền"* không cho biết ai trả — phải xem **ai đang nói câu đó**. `this` cũng vậy: cùng một hàm, ai gọi thì `this` là người đó.

Người mới hay tìm `this` bằng cách nhìn chỗ hàm được **định nghĩa**. Sai chỗ — phải nhìn chỗ hàm được **gọi**.

## Ví dụ nhỏ

```js
function taoBoDem() {
  let so = 0                    // biến này nằm trong "ngôi nhà"
  return () => { so += 1; return so }   // hàm con đeo ba lô chứa `so`
}

const dem = taoBoDem()
dem()   // 1
dem()   // 2
```

`taoBoDem()` đã chạy xong và kết thúc từ lâu. Nhưng `so` vẫn sống — vì hàm được trả về đang **đeo nó trong ba lô**.

## Code chạy thế nào

```text
const dem = taoBoDem()
  → tạo biến so = 0 trong lần gọi này
  → tạo hàm mũi tên, ĐÓNG GÓI tham chiếu tới `so` vào ba lô của nó
  → taoBoDem kết thúc — nhưng `so` KHÔNG bị dọn, vì còn hàm đang giữ nó

dem()   → mở ba lô, thấy so = 0 → tăng thành 1 → trả 1
dem()   → mở ba lô, thấy so = 1 → tăng thành 2 → trả 2
```

Điểm quan trọng: **mỗi lần gọi `taoBoDem()` tạo một ba lô mới**.

```js
const a = taoBoDem()
const b = taoBoDem()
a(); a()   // 1, 2
b()        // 1  ← ba lô riêng, không dính gì tới a
```

## Cú pháp

```js
function ten() {}              // khai báo — được "kéo lên đầu" (hoisting)
const ten = function () {}     // biểu thức hàm
const ten = () => {}           // hàm mũi tên — KHÔNG có `this` riêng
```

Bốn quy tắc xác định `this`, theo **thứ tự ưu tiên**:

```text
1. Hàm mũi tên      → this LẤY TỪ NƠI ĐỊNH NGHĨA, không đổi được
2. Gọi kèm new      → this là object vừa tạo
3. call/apply/bind  → this là thứ bạn truyền vào
4. Gọi qua dấu chấm → this là thứ đứng TRƯỚC dấu chấm
5. Không có gì      → undefined (strict) hoặc globalThis
```

Quy tắc 4 giải thích gần như mọi lỗi `this` bạn sẽ gặp: `obj.f()` thì `this` là `obj`; nhưng `const f = obj.f; f()` thì **không còn ai đứng trước dấu chấm**, và `this` mất.

## Tại sao cần nó

Closure không phải khái niệm học thuật — bạn dùng nó mỗi ngày mà không gọi tên:

```js
// Giữ trạng thái riêng tư, không lộ ra ngoài
function taoKho() {
  const items = []                       // không ai bên ngoài chạm được
  return {
    them: (x) => items.push(x),
    demSo: () => items.length,
  }
}

// Nhớ tham số cho lần gọi sau
const nhan = (he) => (x) => x * he
const gapDoi = nhan(2)
gapDoi(5)   // 10

// Mọi callback đều là closure
setTimeout(() => console.log(ten), 1000)   // `ten` đến từ ba lô
```

Ba mẫu trên phủ phần lớn code bất đồng bộ và code React bạn viết. Hook trong React về bản chất là closure — và phần lớn bug "giá trị cũ" trong `useEffect` là bug về ba lô.

## Dễ nhầm

**1. Ba lô giữ **tham chiếu**, không giữ ảnh chụp.**

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0)
// → 3, 3, 3   ❌ cả ba hàm dùng CHUNG một biến i, và lúc chúng chạy thì i đã là 3

for (let i = 0; i < 3; i++) setTimeout(() => console.log(i), 0)
// → 0, 1, 2   ✅ let tạo một biến MỚI cho mỗi vòng ⇒ ba ba lô khác nhau
```

Đây là ví dụ kinh điển nhất về closure, và cũng là lý do thực dụng nhất để không dùng `var`.

**2. Mất `this` khi truyền phương thức đi.**

```js
const nguoi = { ten: 'An', chao() { console.log(this.ten) } }
nguoi.chao()                    // 'An' ✅
const f = nguoi.chao
f()                             // undefined ❌ không còn ai trước dấu chấm
setTimeout(nguoi.chao, 100)     // undefined ❌ cùng lý do
setTimeout(() => nguoi.chao(), 100)   // 'An' ✅ giữ nguyên lời gọi
```

**3. Dùng hàm mũi tên làm phương thức của object.**

```js
const nguoi = { ten: 'An', chao: () => console.log(this.ten) }
nguoi.chao()   // undefined ❌ mũi tên lấy `this` từ nơi định nghĩa (ngoài object)
```

Nhưng trong class thì mũi tên lại **đúng** cho callback, vì nó khoá `this` vào instance:

```js
class Nut {
  ten = 'Gửi'
  onClick = () => console.log(this.ten)   // ✅ truyền đi đâu cũng giữ this
}
```

**4. Tưởng closure gây rò bộ nhớ.** Nó chỉ rò khi bạn **giữ hàm sống mãi** mà hàm đó đeo ba lô nặng — ví dụ một listener không bao giờ gỡ, đeo theo cả một mảng lớn. Bản thân closure không rò.

**5. Nhầm hoisting của `function` và `const`.**

```js
f()                  // ✅ chạy được — khai báo function được kéo lên
function f() {}

g()                  // ❌ ReferenceError
const g = () => {}
```

## Mẹo nhớ

> **Closure = hàm đeo ba lô chứa nơi nó sinh ra.**
>
> **`this` = chữ "tôi": xem AI ĐANG GỌI, không xem chỗ viết.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao `so` vẫn sống sau khi `taoBoDem()` đã kết thúc?
2. Hai lần gọi `taoBoDem()` dùng chung hay riêng biến `so`? Vì sao?
3. Vì sao vòng `for` với `var` in ra `3, 3, 3` còn `let` in ra `0, 1, 2`?
4. `const f = obj.chao; f()` làm mất `this` — giải thích bằng quy tắc nào?
5. Khi nào hàm mũi tên là lựa chọn **sai** cho một phương thức?

## Tự viết lại

Không nhìn lại phần trên, viết hàm `chiGoiMotLan(fn)` — trả về một hàm chỉ thật sự chạy `fn` ở lần gọi đầu tiên, những lần sau trả lại kết quả cũ:

```js
const khoiTao = chiGoiMotLan(() => { console.log('chạy'); return 42 })
khoiTao()   // in "chạy", trả 42
khoiTao()   // không in gì, trả 42
```

Tự kiểm: trong ba lô của hàm bạn trả về có những biến nào?

## Thử sức

Đoạn này in ra gì, và vì sao?

```js
const obj = {
  ten: 'A',
  ds: ['x', 'y'],
  in() {
    this.ds.forEach(function (i) { console.log(this.ten, i) })
  },
}
obj.in()
```

Gợi ý: hàm truyền vào `forEach` được **gọi như thế nào**? Sau khi trả lời, hãy nêu **ba cách** sửa — và nói cách nào bạn chọn trong code thật.
