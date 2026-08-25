---
title: Tư duy khai báo và JSX
slug: tu-duy-khai-bao-va-jsx
summary: Vì sao React không cho bạn sửa DOM trực tiếp, và UI thực chất là một hàm của state.
level: co-ban
tags: [react, jsx, co-ban]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được vì sao React cấm bạn sửa DOM trực tiếp, và đọc JSX như thứ nó thật sự là — lời gọi hàm.

## Ý tưởng chính

Trước React, bạn viết giao diện bằng cách **ra lệnh từng bước**: tìm phần tử, đổi chữ, thêm class, xoá node. Bạn chịu trách nhiệm giữ cho màn hình luôn khớp với dữ liệu.

React đảo ngược chuyện đó. Bạn **mô tả màn hình trông thế nào ứng với dữ liệu hiện tại**, và React lo phần cập nhật. Một câu:

```text
UI = f(state)
```

## Mental model

Hãy nghĩ tới hai cách đặt món ở quán.

> **Mệnh lệnh** là bạn vào bếp: bật bếp, cho dầu, thái hành, đảo 30 giây… Bạn kiểm soát từng bước — và chịu trách nhiệm nếu quên một bước.
>
> **Khai báo** là bạn nói *"cho tôi phở bò tái"*. Bạn mô tả **kết quả mong muốn**; bếp lo cách làm.

React là cách thứ hai. Và điều quan trọng: khi bạn muốn đổi món, bạn **không chạy vào bếp sửa nồi** — bạn gọi món mới. Sửa DOM trực tiếp chính là chạy vào bếp, và React sẽ ghi đè lên đúng chỗ bạn vừa sửa ở lần render sau.

## Ví dụ nhỏ

```js
// Mệnh lệnh — bạn tự giữ cho màn hình khớp dữ liệu
const nut = document.querySelector('#nut')
nut.textContent = daThich ? 'Đã thích' : 'Thích'
nut.classList.toggle('active', daThich)
```

```jsx
// Khai báo — bạn mô tả, React đồng bộ
<button className={daThich ? 'active' : ''}>
  {daThich ? 'Đã thích' : 'Thích'}
</button>
```

Đoạn trên có **hai chỗ** phải nhớ cập nhật khi `daThich` đổi. Đoạn dưới có **không chỗ nào** — vì bạn không cập nhật gì cả, bạn mô tả lại từ đầu.

## Code chạy thế nào

JSX **không phải HTML trong JavaScript**. Nó là cú pháp rút gọn của lời gọi hàm:

```text
Bạn viết:
  <button className="nut" onClick={xuLy}>Gửi</button>

Trình biên dịch đổi thành:
  jsx('button', { className: 'nut', onClick: xuLy, children: 'Gửi' })

Hàm đó trả về:
  { type: 'button', props: { className: 'nut', onClick: xuLy, children: 'Gửi' } }
                     ↑ một OBJECT MÔ TẢ, chưa có gì trên màn hình
```

Rồi React so bản mô tả mới với bản cũ và **chỉ sửa phần khác nhau** trên DOM thật.

Hiểu điều này giải thích ngay ba thứ:

```text
① className thay vì class   → đây là JavaScript, `class` là từ khoá
② onClick nhận HÀM, không phải chuỗi   → nó là một thuộc tính object
③ {} là "chèn giá trị JavaScript vào đây"
```

Và nó cũng giải thích vì sao **component phải viết hoa chữ đầu**: `<button>` biến thành chuỗi `'button'` (thẻ HTML), còn `<Nut>` biến thành **biến** `Nut` (component của bạn). Viết `<nut>` thì React đi tìm thẻ HTML tên "nut" và không thấy gì.

## Cú pháp

```jsx
// Chèn giá trị
<h1>{tieuDe}</h1>
<div style={{ color: 'red' }}>          {/* object, nên hai lớp ngoặc */}

// Điều kiện — JSX không có if, nên dùng biểu thức
{daDangNhap && <Chao />}                {/* hiện khi đúng */}
{daDangNhap ? <Chao /> : <DangNhap />}  {/* hai nhánh */}

// Danh sách
{ds.map((x) => <li key={x.id}>{x.ten}</li>)}

// Nhiều phần tử không cần thẻ bọc
<>
  <Header />
  <Main />
</>
```

## Tại sao cần nó

Vì cách mệnh lệnh **hỏng dần theo số trạng thái**. Một nút có 2 trạng thái thì bạn nhớ được; một form có 6 trường, 3 mức lỗi và 2 trạng thái gửi thì có `2⁶ × 3 × 2` tổ hợp — và bạn phải nhớ cập nhật đúng mọi chỗ cho **mỗi** tổ hợp.

Với cách khai báo, số tổ hợp không đổi, nhưng bạn chỉ viết **một** biểu thức mô tả và React lo phần còn lại. Đây là lý do thật sự của React — không phải "ảo DOM nhanh hơn".

Và một hệ quả kèm theo: **dữ liệu chảy một chiều**, từ cha xuống con qua props. Con muốn đổi dữ liệu thì gọi hàm cha đưa cho:

```jsx
function Cha() {
  const [ten, setTen] = useState('')
  return <Con ten={ten} onDoi={setTen} />
}
```

Nhờ vậy khi một giá trị sai, bạn chỉ cần đi ngược lên theo một đường duy nhất để tìm nguồn.

## Dễ nhầm

**1. Sửa DOM trực tiếp trong component.**

```jsx
document.querySelector('#x').textContent = 'A'   // ❌ React sẽ ghi đè ở lần render sau
```

**2. Dùng chỉ số mảng làm `key`.**

```jsx
{ds.map((x, i) => <li key={i}>{x.ten}</li>)}   // ❌ hỏng khi chèn/xoá/sắp xếp
{ds.map((x) => <li key={x.id}>{x.ten}</li>)}   // ✅
```

`key` là cách React nhận ra *"phần tử này vẫn là phần tử cũ"*. Dùng chỉ số thì khi bạn xoá phần tử đầu, mọi phần tử sau đó **đổi key** — React tưởng tất cả đều là phần tử mới, và state bên trong chúng (ô input đang gõ dở, chẳng hạn) bị đặt nhầm chỗ.

**3. Bẫy `&&` với số 0.**

```jsx
{ds.length && <Danh sach />}     // ❌ mảng rỗng → in ra số 0 trên màn hình
{ds.length > 0 && <DanhSach />}  // ✅
```

`0` là giá trị "giả" nhưng React vẫn **render** nó, khác với `false` hay `null`.

**4. Gọi hàm thay vì truyền hàm.**

```jsx
<button onClick={xuLy()}>    {/* ❌ chạy NGAY lúc render */}
<button onClick={xuLy}>      {/* ✅ truyền hàm */}
<button onClick={() => xuLy(id)}>   {/* ✅ cần tham số thì bọc lại */}
```

**5. Tưởng JSX là HTML.** `for` thành `htmlFor`, `class` thành `className`, thuộc tính viết `camelCase`. Không phải React khó tính — đó là **JavaScript**, và những tên kia đã có nghĩa khác.

## Mẹo nhớ

> **UI = f(state). Bạn mô tả món ăn, không chạy vào bếp.**
>
> **JSX là lời gọi hàm, không phải HTML.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Khác biệt gốc rễ giữa cách mệnh lệnh và cách khai báo khi làm giao diện?
2. `<div className="a">x</div>` biến thành cái gì sau khi biên dịch?
3. Vì sao component phải viết hoa chữ đầu?
4. `key` dùng để làm gì, và vì sao dùng chỉ số mảng lại hỏng?
5. Vì sao `{ds.length && <X/>}` in ra số 0?

## Tự viết lại

Không nhìn lại phần trên, đổi đoạn mệnh lệnh này sang component React:

```js
const el = document.querySelector('#thongBao')
if (loi) { el.textContent = loi; el.className = 'loi' }
else if (dangTai) { el.textContent = 'Đang tải...'; el.className = 'cho' }
else { el.textContent = ''; el.className = '' }
```

Tự kiểm: component của bạn có bao nhiêu nhánh, và có chỗ nào bạn phải "nhớ dọn dẹp" như bản gốc không?

## Thử sức

Đoạn này có một lỗi khiến ô input **mất chữ đang gõ** khi người dùng xoá một dòng phía trên:

```jsx
{congViec.map((cv, i) => (
  <input key={i} defaultValue={cv.ten} />
))}
```

Giải thích chuyện gì xảy ra ở tầng `key` — và vì sao đổi sang `key={cv.id}` lại sửa được, dù `defaultValue` không hề thay đổi.
