---
title: State và vòng đời một lần render
slug: state-va-vong-doi-render
summary: useState thực sự làm gì, vì sao state không cập nhật ngay sau setState, và cách gộp state cho đúng.
level: co-ban
tags: [react, state, usestate]
---

> **Sau bài này bạn sẽ:** hiểu vì sao `console.log` ngay sau `setState` vẫn in giá trị cũ, và biết chọn giữa nhiều `useState` rời hay một object state.

## Một lần render là một ảnh chụp

Mỗi lần render, React gọi lại hàm component. Mọi biến, mọi hàm bên trong đều được tạo mới. Giá trị state trong lần render đó là **hằng số** — nó không thay đổi giữa chừng:

```tsx
function BoDem() {
  const [so, setSo] = useState(0)

  function tang() {
    setSo(so + 1)
    console.log(so)      // vẫn là giá trị CŨ — biến so của lần render này
  }

  return <button onClick={tang}>{so}</button>
}
```

`setSo` không sửa biến `so`; nó **đặt lịch** render lại với giá trị mới. Biến `so` của lần render hiện tại vĩnh viễn giữ giá trị cũ.

## Gộp cập nhật (batching)

React gộp nhiều lần `setState` trong cùng một sự kiện thành một lần render:

```tsx
function tangBaLan() {
  setSo(so + 1)     // so là 0 -> đặt lịch: 1
  setSo(so + 1)     // so vẫn là 0 -> đặt lịch: 1
  setSo(so + 1)     // so vẫn là 0 -> đặt lịch: 1
}
// Kết quả: 1, không phải 3
```

Muốn cộng dồn, dùng dạng **hàm cập nhật** — nó nhận giá trị mới nhất trong hàng đợi:

```tsx
function tangBaLan() {
  setSo((truoc) => truoc + 1)
  setSo((truoc) => truoc + 1)
  setSo((truoc) => truoc + 1)
}
// Kết quả: 3
```

Quy tắc: **giá trị mới phụ thuộc giá trị cũ ⇒ dùng hàm cập nhật.** Từ React 18, batching áp dụng cả trong `setTimeout` và `await`, không chỉ trong event handler.

## State phải bất biến

React so sánh bằng `Object.is`. Sửa tại chỗ ⇒ tham chiếu không đổi ⇒ không render lại:

```tsx
// Sai
setItems((cu) => { cu.push(moi); return cu })
setUser((cu) => { cu.ten = 'An'; return cu })

// Đúng
setItems((cu) => [...cu, moi])
setUser((cu) => ({ ...cu, ten: 'An' }))
setItems((cu) => cu.filter((i) => i.id !== id))
setItems((cu) => cu.map((i) => (i.id === id ? { ...i, xong: true } : i)))
```

## Khởi tạo tốn kém

Đối số của `useState` được **đánh giá ở mọi lần render**, dù chỉ dùng ở lần đầu:

```tsx
const [state, setState] = useState(tinhToanNang())      // chạy mỗi lần render!
const [state2, setState2] = useState(() => tinhToanNang())  // chỉ chạy lần đầu
```

## Chia state thế nào cho hợp lý

Nguyên tắc: **state phải tối thiểu**. Cái gì tính được từ cái khác thì đừng lưu.

```tsx
// Thừa: hoTen luôn suy ra được, và có thể lệch với ho/ten
const [ho, setHo] = useState('')
const [ten, setTen] = useState('')
const [hoTen, setHoTen] = useState('')

// Đủ
const [ho, setHo] = useState('')
const [ten, setTen] = useState('')
const hoTen = `${ho} ${ten}`     // tính lúc render, không bao giờ lệch
```

Gộp vào một object khi các trường **luôn thay đổi cùng nhau**; tách riêng khi chúng độc lập. Trường hợp trạng thái phức tạp có nhiều nhánh (đang tải / thành công / lỗi), dùng `useReducer` hoặc một discriminated union thay vì ba biến boolean rời — như vậy không thể rơi vào trạng thái "vừa đang tải vừa có lỗi".

## Nâng state lên (lifting state up)

Hai component anh em cần chung dữ liệu ⇒ đặt state ở cha chung gần nhất:

```tsx
function Cha() {
  const [tuKhoa, setTuKhoa] = useState('')
  return (
    <>
      <OTimKiem giaTri={tuKhoa} onDoi={setTuKhoa} />
      <KetQua tuKhoa={tuKhoa} />
    </>
  )
}
```

## Reset state bằng `key`

Muốn một component quên sạch state cũ khi dữ liệu đổi, đổi `key` của nó:

```tsx
<FormChinhSua key={nguoiDungId} nguoiDung={nguoiDung} />
```

Đổi `key` ⇒ React huỷ instance cũ và tạo mới ⇒ state bên trong về giá trị ban đầu. Gọn hơn nhiều so với một `useEffect` đi đồng bộ lại từng trường.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `console.log(x)` ngay sau `setX` | In giá trị cũ, tưởng là bug | Đó là đúng — log ở thân component |
| `setSo(so + 1)` nhiều lần | Chỉ tăng 1 | `setSo(s => s + 1)` |
| `arr.push` rồi `setArr(arr)` | Không render lại | `setArr([...arr, x])` |
| `useState(taoDuLieu())` | Chạy mỗi lần render | `useState(() => taoDuLieu())` |
| Lưu giá trị suy ra được vào state | Hai nguồn sự thật, dễ lệch | Tính lúc render |

## Ghi nhớ

- State của một lần render là ảnh chụp bất biến.
- Phụ thuộc giá trị cũ ⇒ dùng hàm cập nhật.
- State tối thiểu; cái gì suy ra được thì tính, đừng lưu.
- Đổi `key` là cách reset state gọn nhất.

## Tự kiểm tra

1. Vì sao `setSo(so + 1)` ba lần chỉ tăng 1?
2. Form có `email`, `matKhau`, `dangGui`, `loi`. Nên gộp thành mấy state? Vì sao?
3. Cách nào reset toàn bộ form khi người dùng chọn bản ghi khác — `useEffect` hay `key`?
