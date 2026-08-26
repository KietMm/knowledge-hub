---
title: Bộ nhớ, stack và heap
slug: bo-nho-stack-va-heap
summary: Biến nằm ở đâu, tham trị khác tham chiếu thế nào, và vì sao đệ quy sâu làm tràn stack.
level: trung-cap
tags: [nen-tang, bo-nho, stack, heap, computer-science]
khung: v2
---

> **Sau bài này bạn sẽ:** biết biến của mình nằm ở đâu, vì sao sửa một object lại ảnh hưởng chỗ khác, và stack overflow từ đâu ra.

## Ý tưởng chính

Chương trình dùng hai vùng bộ nhớ với hai luật hoàn toàn khác nhau:

**Stack** — nhanh, tự động dọn, nhỏ, và theo luật vào sau ra trước.
**Heap** — lớn, sống lâu tuỳ ý, chậm hơn, và phải có ai đó dọn.

Gần như mọi hành vi "kỳ lạ" của biến đều giải thích được bằng câu hỏi: *thứ này nằm ở stack hay heap?*

## Mental model

Hãy nghĩ tới **bàn làm việc và nhà kho**.

> **Stack là mặt bàn**: bạn đặt giấy tờ lên theo thứ tự, xong việc thì lấy từ trên xuống. Rất nhanh vì mọi thứ trong tầm tay. Nhưng **mặt bàn có hạn** — chồng cao quá là đổ.
>
> **Heap là nhà kho**: chứa được nhiều, để bao lâu cũng được. Nhưng mỗi lần lấy phải **đi tìm**, và phải nhớ dọn — nếu không kho đầy dần.

Và điểm quan trọng nhất: khi bạn "đưa cho đồng nghiệp một thùng hàng trong kho", bạn không bê cả thùng ra — bạn **đưa số hiệu kệ**. Hai người cùng cầm một số hiệu thì đang nói về **cùng một thùng**. Đó là tham chiếu.

## Ví dụ nhỏ

```js
let a = 5
let b = a          // sao chép GIÁ TRỊ
b = 10
console.log(a)     // 5 — không đổi

let x = { n: 5 }
let y = x          // sao chép THAM CHIẾU
y.n = 10
console.log(x.n)   // 10 ← cùng một object
```

## Code chạy thế nào

**Chuyện gì xảy ra trong bộ nhớ:**

```text
let a = 5;  let b = a;
  STACK
  ┌─────────┐
  │ a  =  5 │   hai ô riêng biệt, hai giá trị riêng
  │ b  =  5 │
  └─────────┘

let x = { n: 5 };  let y = x;
  STACK              HEAP
  ┌───────────┐      ┌──────────┐
  │ x → 0x1A4 │─┬───▶│ { n: 5 } │
  │ y → 0x1A4 │─┘    └──────────┘
  └───────────┘      MỘT object, HAI tham chiếu
```

Từ hình này suy ra được cả ba hành vi hay gây bất ngờ:

```js
// ① So sánh object là so THAM CHIẾU, không so nội dung
{ n: 5 } === { n: 5 }        // false — hai ô khác nhau trong heap

// ② Truyền vào hàm cũng là truyền tham chiếu
function them(ds) { ds.push(1) }
const a = []; them(a); a.length   // 1 ← hàm sửa được mảng bên ngoài

// ③ Gán lại BÊN TRONG hàm thì không ảnh hưởng bên ngoài
function thay(ds) { ds = [9] }     // chỉ đổi biến cục bộ trỏ đi đâu
const b = []; thay(b); b.length    // 0
```

**Stack overflow — cụ thể là gì:**

```text
Mỗi lời gọi hàm đẩy một KHUNG lên stack:
  tham số, biến cục bộ, địa chỉ quay về.

function dem(n) { return n === 0 ? 0 : 1 + dem(n - 1) }
dem(100000)

  dem(100000) ─┐
  dem(99999)   │  100.000 khung chồng lên nhau
  dem(99998)   │  Stack mặc định ~1 MB
  ...          ┘  ⇒ RangeError: Maximum call stack size exceeded
```

```text
Ba cách xử lý:
  ① Chuyển sang vòng lặp — khung không tích luỹ
  ② Tự quản lý ngăn xếp bằng một mảng trên heap
  ③ Đệ quy đuôi (tail call) — nhưng ít runtime thật sự tối ưu nó,
     kể cả khi ngôn ngữ có khai
```

## Cú pháp

**Sao chép nông và sao chép sâu:**

```js
const goc = { ten: 'An', dia: { tp: 'HCM' } }

const nong = { ...goc }           // sao chép NÔNG
nong.dia.tp = 'HN'
goc.dia.tp                        // 'HN'  ← object lồng vẫn dùng chung!

const sau = structuredClone(goc)  // sao chép SÂU
sau.dia.tp = 'DN'
goc.dia.tp                        // 'HN'  ← độc lập
```

```text
Spread và Object.assign đều là NÔNG — chỉ sao chép một tầng.
Đây là nguyên nhân của cả một lớp bug trong React:
  cập nhật state bằng spread, object lồng bên trong vẫn là object cũ
  ⇒ React so sánh tham chiếu, thấy giống ⇒ KHÔNG render lại.
```

**Rò rỉ bộ nhớ — bốn nguyên nhân phổ biến:**

```js
// ① Listener không gỡ
window.addEventListener('resize', xuLy)     // thiếu removeEventListener
// ② Timer không dọn
setInterval(chay, 1000)                     // thiếu clearInterval
// ③ Closure giữ dữ liệu lớn
function tao() { const to = new Array(1e6); return () => to.length }
// ④ Cache không giới hạn — Map cứ lớn mãi
```

```text
Bộ dọn rác (GC) chỉ thu hồi thứ KHÔNG CÒN AI THAM CHIẾU TỚI.
⇒ Rò rỉ = bạn vẫn giữ tham chiếu tới thứ không còn cần.
⇒ GC không cứu được bạn khỏi lỗi này; nó chỉ cứu bạn khỏi việc
  phải tự gọi free().
```

`WeakMap`/`WeakSet` tồn tại đúng cho trường hợp này: chúng giữ tham chiếu **yếu**, không ngăn GC thu hồi.

## Tại sao cần nó

Vì ba câu hỏi hằng ngày phụ thuộc vào mô hình này:

```text
① "Vì sao sửa chỗ này lại ảnh hưởng chỗ kia?"
   → tham chiếu dùng chung.

② "Vì sao React không render lại dù tôi đã đổi state?"
   → sửa tại chỗ, tham chiếu không đổi ⇒ so sánh nông thấy giống.

③ "Vì sao ứng dụng chạy lâu thì chậm dần rồi chết?"
   → rò rỉ bộ nhớ.
```

**Bất biến — vì sao nó được ưa chuộng:**

```js
// ❌ Sửa tại chỗ — tham chiếu không đổi
ds.push(item)
setState(ds)                  // React thấy "vẫn cùng mảng" ⇒ không render

// ✅ Tạo tham chiếu mới
setState([...ds, item])
```

Đây không phải quy ước tuỳ tiện: React, Redux và nhiều thư viện khác dùng **so sánh tham chiếu** vì nó chạy trong nano giây, còn so sánh sâu thì tỉ lệ với kích thước dữ liệu ([[mang-object-va-bat-bien]]).

## So sánh

| | Stack | Heap |
|---|---|---|
| Tốc độ | rất nhanh | chậm hơn |
| Kích thước | nhỏ (~1–8 MB) | lớn |
| Dọn dẹp | tự động khi hàm kết thúc | GC hoặc thủ công |
| Chứa | biến cục bộ, tham số, tham chiếu | object, mảng, closure |
| Hỏng thì | stack overflow | rò rỉ / hết bộ nhớ |

## Dễ nhầm

**1. Tưởng gán object là sao chép.** Nó sao chép tham chiếu.

**2. So sánh object bằng `===`.** So tham chiếu, không so nội dung.

**3. Tưởng spread là sao chép sâu.** Chỉ một tầng.

**4. Sửa state tại chỗ trong React.** Tham chiếu không đổi ⇒ không render lại.

**5. Quên gỡ listener và timer.** Rò rỉ.

**6. Tin GC dọn hết mọi thứ.** Nó chỉ dọn thứ không còn ai tham chiếu.

**7. Đệ quy sâu trên dữ liệu do người dùng đưa vào.** Stack overflow — và đó là một vector DoS.

**8. Cache bằng `Map` không giới hạn.** Lớn mãi.

**9. Tin rằng đệ quy đuôi luôn được tối ưu.** Phần lớn runtime không làm.

## Mẹo nhớ

> **Stack là mặt bàn (nhanh, nhỏ, tự dọn). Heap là nhà kho (lớn, cần dọn).**
>
> **Gán object = đưa SỐ HIỆU KỆ, không phải bê cả thùng.**
>
> **Rò rỉ = bạn vẫn GIỮ THAM CHIẾU tới thứ không còn cần.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Stack khác heap ở bốn điểm nào?
2. Vì sao `{a:1} === {a:1}` là `false`?
3. Sao chép nông khác sao chép sâu thế nào, spread thuộc loại nào?
4. Stack overflow xảy ra khi nào, ba cách xử lý?
5. Vì sao GC không cứu được rò rỉ bộ nhớ?

## Tự viết lại

Không nhìn lại, làm:

```text
① Vẽ stack và heap cho: const a = {x: [1,2]}; const b = {...a};
② Sửa b.x.push(3) — a thay đổi không? Vì sao?
③ Viết lại một hàm đệ quy tính tổng cây thành phiên bản không đệ quy
④ Kể ba chỗ trong mã bạn từng viết có thể đang rò rỉ
```

Tự kiểm: ở ③, bạn dùng cấu trúc gì thay cho stack của hệ thống — và nó nằm ở vùng bộ nhớ nào?

## Thử sức

Ứng dụng Node chạy tốt lúc khởi động, nhưng sau 6 tiếng thì RAM lên 4 GB và bị OOM killer giết.

Ba câu để trả lời: đây là loại vấn đề gì, và bạn **xác nhận** giả thuyết bằng cách nào; bốn nguyên nhân bạn kiểm theo thứ tự; và làm sao **tìm ra** chính xác thứ đang giữ tham chiếu. Câu khó nhất: nếu heap snapshot cho thấy hàng trăm nghìn object cùng loại đang sống, bạn lần ngược từ đó ra thủ phạm bằng cách nào?
