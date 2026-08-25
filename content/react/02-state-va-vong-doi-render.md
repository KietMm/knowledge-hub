---
title: State và vòng đời một lần render
slug: state-va-vong-doi-render
summary: useState thực sự làm gì, vì sao state không cập nhật ngay sau setState, và cách gộp state cho đúng.
level: co-ban
tags: [react, state, usestate]
khung: v2
---

> **Sau bài này bạn sẽ:** hiểu vì sao `console.log` ngay sau `setState` vẫn in giá trị cũ, và biết chọn giữa `setX(v)` và `setX(prev => ...)` mà không phải đoán.

## Ý tưởng chính

Mỗi lần render, component của bạn chạy lại từ đầu và tạo ra **một ảnh chụp**: các biến state trong lần chạy đó là **hằng số**, không đổi cho tới hết lần render.

`setState` không sửa ảnh chụp hiện tại. Nó **yêu cầu React chụp một ảnh mới**.

## Mental model

Hãy nghĩ tới **một tấm ảnh chụp màn hình**.

> Bạn đang cầm ảnh chụp lúc 10:00, trong đó `so = 0`. Bạn gọi `setSo(1)` — nghĩa là *"chụp lại giúp tôi, lần này với so = 1"*.
>
> Nhưng **tấm ảnh trong tay bạn vẫn là ảnh cũ**. Nhìn vào nó, `so` vẫn là 0, và sẽ mãi là 0 — vì đó là ảnh, không phải cửa sổ nhìn ra ngoài.
>
> Ảnh mới đến ở lần render sau.

Người mới nhìn `so` như một cái cửa sổ (nhìn vào là thấy giá trị hiện tại). Thực tế nó là **tấm ảnh**. Toàn bộ phần "khó hiểu" của `useState` biến mất khi bạn đổi hình dung này.

## Ví dụ nhỏ

```jsx
const [so, setSo] = useState(0)

function tang() {
  setSo(so + 1)
  console.log(so)   // ❌ vẫn in 0 — đang đọc tấm ảnh cũ
}
```

## Code chạy thế nào

Ba lời gọi liên tiếp — đây là chỗ ai cũng vấp:

```text
so = 0 trong lần render này

setSo(so + 1)   →  setSo(0 + 1)  →  yêu cầu: "lần sau so = 1"
setSo(so + 1)   →  setSo(0 + 1)  →  yêu cầu: "lần sau so = 1"   ← `so` VẪN là 0!
setSo(so + 1)   →  setSo(0 + 1)  →  yêu cầu: "lần sau so = 1"

⇒ render lại: so = 1, không phải 3
```

Vì `so` là hằng số trong ảnh chụp, cả ba dòng đều tính `0 + 1`. Cách sửa là **mô tả phép biến đổi thay vì giá trị**:

```text
setSo(p => p + 1)   →  xếp hàng: "lấy giá trị trước, cộng 1"
setSo(p => p + 1)   →  xếp hàng: "lấy giá trị trước, cộng 1"
setSo(p => p + 1)   →  xếp hàng: "lấy giá trị trước, cộng 1"

React chạy lần lượt: 0 → 1 → 2 → 3   ⇒ so = 3 ✅
```

Quy tắc rút ra:

```text
Giá trị mới KHÔNG phụ thuộc giá trị cũ  →  setX(v)
Giá trị mới CÓ phụ thuộc giá trị cũ     →  setX(prev => ...)
```

React cũng **gộp** nhiều `setState` trong cùng một sự kiện thành **một** lần render — nên gọi năm lần `setState` không làm component render năm lần.

## Cú pháp

```jsx
const [so, setSo] = useState(0)
const [ds, setDs] = useState([])

// Khởi tạo tốn kém: truyền HÀM, không truyền giá trị
const [x, setX] = useState(tinhToanNang())      // ❌ chạy MỖI lần render
const [x, setX] = useState(() => tinhToanNang()) // ✅ chỉ chạy lần đầu

// State phải bất biến — tạo mới, đừng sửa tại chỗ
setDs([...ds, moi])                       // ✅
setDs(ds.push(moi))                        // ❌ push sửa tại chỗ và trả về số
setNguoi({ ...nguoi, tuoi: 31 })           // ✅
```

## Tại sao cần nó

Vì **sửa state tại chỗ thì giao diện không cập nhật** — và đây là bug khó hiểu nhất với người mới:

```jsx
ds.push(moi)      // ❌ mảng đổi ruột, nhưng vẫn là CÙNG một mảng
setDs(ds)         //    React so tham chiếu: "vẫn thế" → không render lại
```

React kiểm tra thay đổi bằng cách so **tham chiếu** (`===`), không so từng phần tử — vì so từng phần tử trên cây dữ liệu lớn sẽ chậm hơn cả việc render lại. Đó là lý do bạn phải đưa cho nó **một object mới**. Cùng chủ đề với [[mang-object-va-bat-bien]].

Hai kỹ thuật đi kèm, dùng rất nhiều trong thực tế:

**Nâng state lên** — hai component cần cùng một dữ liệu thì đặt state ở **cha chung gần nhất**, truyền xuống bằng props.

**Reset state bằng `key`** — muốn một component quên sạch state cũ khi dữ liệu đổi:

```jsx
<HoSo key={nguoiDungId} id={nguoiDungId} />
```

Đổi `key` ⇒ React coi đây là component **khác** ⇒ dựng lại từ đầu với state mới. Gọn hơn nhiều so với `useEffect` đi dọn từng trường.

## So sánh

Chia state thế nào cho hợp lý:

| Tình huống | Cách làm |
|---|---|
| Các giá trị **luôn đổi cùng nhau** | Gộp vào một object |
| Các giá trị độc lập | Tách thành nhiều `useState` |
| Giá trị **suy ra được** từ state khác | ❌ đừng đưa vào state — tính khi render |
| State có nhiều nhánh chuyển tiếp | `useReducer` |

Dòng thứ ba là lỗi phổ biến nhất:

```jsx
const [ds, setDs] = useState([])
const [soLuong, setSoLuong] = useState(0)   // ❌ suy ra được từ ds ⇒ sẽ có lúc lệch nhau
const soLuong = ds.length                    // ✅ luôn đúng, không cần đồng bộ
```

Mọi state dư thừa đều là một cơ hội để hai nguồn sự thật lệch nhau.

## Dễ nhầm

**1. Đọc state ngay sau `setState`.** Đã nói ở trên — bạn đang đọc tấm ảnh cũ.

**2. Dùng `setX(v)` khi giá trị phụ thuộc giá trị cũ.** Đặc biệt nguy hiểm trong `setTimeout`, `setInterval` và callback bất đồng bộ, nơi ảnh chụp đã rất cũ.

**3. Sửa state tại chỗ.** `push`, `sort`, `splice`, `obj.x = 1` — xem lại bảng ở [[mang-object-va-bat-bien]].

**4. Gọi hàm khởi tạo mỗi lần render.** `useState(tinhNang())` chạy `tinhNang()` **mọi lần render** rồi vứt kết quả đi. Truyền hàm vào để nó chỉ chạy lần đầu.

**5. Nhồi mọi thứ vào một object state khổng lồ.** Mỗi lần đổi một trường phải trải lại cả object, và mọi thứ dùng nó đều render lại. Tách theo nhóm thật sự đổi cùng nhau.

## Mẹo nhớ

> **State trong một lần render là TẤM ẢNH, không phải cửa sổ.**
>
> **Phụ thuộc giá trị cũ ⇒ `setX(prev => ...)`.**
>
> **Suy ra được thì đừng cho vào state.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao `console.log(so)` ngay sau `setSo(so + 1)` vẫn in giá trị cũ?
2. Ba lần `setSo(so + 1)` liên tiếp cho ra kết quả gì, và vì sao?
3. Khi nào bắt buộc dùng `setX(prev => ...)`?
4. Vì sao `ds.push(x); setDs(ds)` không làm giao diện cập nhật?
5. Đổi `key` của một component thì chuyện gì xảy ra với state của nó?

## Tự viết lại

Không nhìn lại phần trên, sửa component này:

```jsx
function GioHang() {
  const [items, setItems] = useState([])
  const [tong, setTong] = useState(0)

  function them(sp) {
    items.push(sp)
    setItems(items)
    setTong(tong + sp.gia)
  }
  return <button onClick={() => them({ gia: 10 })}>Thêm</button>
}
```

Tự kiểm: bạn tìm ra **ba** lỗi chứ? Và sau khi sửa, `tong` còn nên là state nữa không?

## Thử sức

Component này in ra số nào sau 3 giây, và vì sao?

```jsx
function Dem() {
  const [so, setSo] = useState(0)

  function batDau() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => setSo(so + 1), 1000 * i)
    }
  }
  return <button onClick={batDau}>{so}</button>
}
```

Gợi ý: mỗi `setTimeout` đeo theo **ảnh chụp nào**? Sau khi trả lời, sửa lại để nó đếm tới 3.
