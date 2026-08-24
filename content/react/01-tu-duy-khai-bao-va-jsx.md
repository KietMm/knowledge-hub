---
title: Tư duy khai báo và JSX
slug: tu-duy-khai-bao-va-jsx
summary: Vì sao React không cho bạn sửa DOM trực tiếp, và UI thực chất là một hàm của state.
level: co-ban
tags: [react, jsx, co-ban]
---

> **Sau bài này bạn sẽ:** ngừng nghĩ theo kiểu "khi bấm nút thì đổi chữ trong thẻ div", và bắt đầu nghĩ "giao diện trông thế nào ứng với mỗi trạng thái".

## Mệnh lệnh và khai báo

Cách làm cũ (mệnh lệnh — bạn ra lệnh từng bước cho DOM):

```js
const nut = document.querySelector('#gui')
nut.addEventListener('click', async () => {
  nut.disabled = true
  nut.textContent = 'Đang gửi...'
  await gui()
  nut.disabled = false
  nut.textContent = 'Gửi'
})
```

Vấn đề: mỗi trạng thái mới (lỗi, thử lại, hết hạn) bạn phải tự nhớ **mọi** thứ cần bật/tắt. Bỏ sót một dòng là giao diện kẹt ở trạng thái sai — bug kinh điển "nút mãi mãi Đang gửi...".

Cách của React (khai báo — bạn mô tả kết quả):

```tsx
function NutGui() {
  const [dangGui, setDangGui] = useState(false)

  return (
    <button
      disabled={dangGui}
      onClick={async () => {
        setDangGui(true)
        await gui()
        setDangGui(false)
      }}
    >
      {dangGui ? 'Đang gửi...' : 'Gửi'}
    </button>
  )
}
```

Bạn chỉ khai báo: *ứng với `dangGui` thì giao diện trông thế này*. React lo phần cập nhật DOM. Công thức gói gọn: **UI = f(state)**.

## JSX chỉ là cú pháp gọi hàm

```tsx
<button className="chinh" onClick={xuLy}>Gửi</button>
// biên dịch thành (đại ý):
jsx('button', { className: 'chinh', onClick: xuLy, children: 'Gửi' })
```

Nghĩa là JSX là **biểu thức**: gán vào biến được, trả về từ hàm được, bỏ vào mảng được.

### Những khác biệt so với HTML

| HTML | JSX | Vì sao |
|---|---|---|
| `class` | `className` | `class` là từ khoá của JS |
| `for` | `htmlFor` | `for` là từ khoá |
| `onclick="..."` | `onClick={fn}` | Truyền hàm thật, không phải chuỗi |
| `style="color: red"` | `style={{ color: 'red' }}` | Object, thuộc tính camelCase |
| `<br>` | `<br />` | Mọi thẻ phải đóng |

### Dấu ngoặc nhọn là "thoát sang JavaScript"

```tsx
<div title={ten}>          {/* giá trị JS */}
  {ten}                     {/* nội dung JS */}
  {tuoi >= 18 && <p>Đủ tuổi</p>}          {/* hiện có điều kiện */}
  {dangTai ? <Spinner /> : <DanhSach />}   {/* chọn một trong hai */}
</div>
```

Bẫy với `&&`: nếu vế trái là **số 0**, React sẽ in ra `0` chứ không phải không in gì.

```tsx
{soLuong && <Badge>{soLuong}</Badge>}        // soLuong = 0 -> hiện "0"
{soLuong > 0 && <Badge>{soLuong}</Badge>}    // đúng
```

## Danh sách và `key`

```tsx
<ul>
  {sanPham.map((sp) => (
    <li key={sp.id}>{sp.ten}</li>
  ))}
</ul>
```

`key` giúp React biết phần tử nào là phần tử nào giữa hai lần render. Dùng **id ổn định**, không dùng chỉ số mảng — với chỉ số, khi xoá phần tử đầu, React tưởng bạn chỉ đổi nội dung tất cả các dòng, và state bên trong (ô input đang gõ, checkbox đang tick) sẽ dính nhầm dòng.

## Fragment

Một component phải trả về **một** node gốc. Cần nhiều thẻ ngang hàng thì dùng fragment:

```tsx
return (
  <>
    <h1>Tiêu đề</h1>
    <p>Nội dung</p>
  </>
)
```

Trong `map` cần cả fragment lẫn key thì viết đủ: `<Fragment key={id}>`.

## Props: dữ liệu chảy một chiều

```tsx
type Props = { ten: string; tuoi?: number; onChon: (id: string) => void }

function The({ ten, tuoi = 0, onChon }: Props) {
  return <button onClick={() => onChon(ten)}>{ten} — {tuoi}</button>
}
```

Props là **chỉ đọc**. Component con không sửa props; nó gọi callback do cha truyền xuống, cha đổi state, rồi giá trị mới chảy xuống. Một chiều, luôn luôn.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `key={index}` | State dính nhầm dòng khi xoá/chèn | Dùng id ổn định |
| `{count && <X/>}` | Hiện số `0` trên màn hình | `{count > 0 && <X/>}` |
| `onClick={xuLy()}` | Gọi ngay lúc render | `onClick={xuLy}` hoặc `() => xuLy(a)` |
| Sửa props trong con | Vi phạm luồng một chiều | Gọi callback lên cha |
| `class=` trong JSX | React cảnh báo, class không áp dụng | `className=` |

## Ghi nhớ

- UI = f(state). Mô tả kết quả, đừng ra lệnh từng bước.
- JSX là biểu thức JavaScript, không phải template chuỗi.
- `key` phải ổn định và duy nhất trong cùng danh sách.
- Dữ liệu chảy xuống, sự kiện bay lên.

## Tự kiểm tra

1. Viết lại đoạn code mệnh lệnh ở đầu bài để xử lý thêm trạng thái lỗi. So sánh độ dài với bản React.
2. Vì sao `key={index}` gây bug khi xoá phần tử đầu danh sách?
3. `onClick={xuLy}` và `onClick={() => xuLy()}` khác nhau khi nào?
