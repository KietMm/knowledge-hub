---
title: Quy tắc hook và cách viết hook tuỳ chỉnh
slug: hook-tuy-chinh-va-quy-tac-hook
summary: Vì sao hook không được gọi trong if, và cách gom logic lặp lại thành hook dùng chung.
level: trung-cap
tags: [react, hook, custom-hook]
---

> **Sau bài này bạn sẽ:** hiểu cơ chế đằng sau "Rendered fewer hooks than expected", và tự viết được hook tái sử dụng.

## Hai quy tắc, một lý do

1. Chỉ gọi hook ở **cấp cao nhất** của component — không trong `if`, vòng lặp, hàm lồng, hay sau một lần `return` sớm.
2. Chỉ gọi hook từ **component React** hoặc từ **hook khác**.

Lý do: React không biết tên hook của bạn. Nó lưu state theo **thứ tự gọi**. Lần render đầu gọi `useState` → `useEffect` → `useState`, React ghi lại là khe 0, 1, 2. Lần sau nếu bạn bỏ qua khe 0 vì một điều kiện, mọi thứ lệch một bậc và state của hook này rơi vào hook khác.

```tsx
// Sai
if (dangDangNhap) {
  const [ten, setTen] = useState('')     // số hook thay đổi giữa các lần render
}

// Đúng: điều kiện nằm bên trong hook, không bao quanh hook
const [ten, setTen] = useState('')
useEffect(() => {
  if (!dangDangNhap) return
  ...
}, [dangDangNhap])
```

Return sớm cũng vậy — mọi hook phải nằm **trên** mọi `return`.

## Hook tuỳ chỉnh chỉ là một hàm

Hook tuỳ chỉnh là hàm tên bắt đầu bằng `use` và gọi hook khác bên trong. Nó gom **logic**, không gom **state** — mỗi component gọi nó nhận một bản state riêng.

```tsx
function useDoRong() {
  const [rong, setRong] = useState(() => window.innerWidth)

  useEffect(() => {
    const xuLy = () => setRong(window.innerWidth)
    window.addEventListener('resize', xuLy)
    return () => window.removeEventListener('resize', xuLy)
  }, [])

  return rong
}
```

### Ví dụ hay dùng: lưu vào localStorage

```tsx
function useLuuTru<T>(khoa: string, macDinh: T) {
  const [giaTri, setGiaTri] = useState<T>(() => {
    // Đọc trong hàm khởi tạo, không phải trong effect: tránh nháy một nhịp
    // hiển thị giá trị mặc định rồi mới nhảy sang giá trị đã lưu.
    try {
      const raw = window.localStorage.getItem(khoa)
      return raw === null ? macDinh : (JSON.parse(raw) as T)
    } catch {
      return macDinh
    }
  })

  useEffect(() => {
    window.localStorage.setItem(khoa, JSON.stringify(giaTri))
  }, [khoa, giaTri])

  return [giaTri, setGiaTri] as const
}
```

Chú ý `as const` ở cuối: không có nó, kiểu trả về là `(T | Dispatch<T>)[]` và destructuring sẽ mất kiểu.

Lưu ý với SSR (Next.js): `window` không tồn tại ở server. Hook đọc `window` phải nằm trong Client Component, và giá trị khởi tạo phải khớp giữa server và client nếu không muốn lỗi hydration — cách an toàn là khởi tạo bằng giá trị mặc định rồi đọc `localStorage` trong effect.

### Hook debounce cho ô tìm kiếm

```tsx
function useTriHoan<T>(giaTri: T, ms: number): T {
  const [daTriHoan, setDaTriHoan] = useState(giaTri)

  useEffect(() => {
    const id = setTimeout(() => setDaTriHoan(giaTri), ms)
    return () => clearTimeout(id)     // gõ tiếp -> huỷ hẹn giờ cũ
  }, [giaTri, ms])

  return daTriHoan
}

// Dùng
const [tuKhoa, setTuKhoa] = useState('')
const tuKhoaTriHoan = useTriHoan(tuKhoa, 300)
useEffect(() => { void timKiem(tuKhoaTriHoan) }, [tuKhoaTriHoan])
```

## `useRef`: giá trị không gây render

`useRef` giữ một giá trị qua các lần render mà **không** kích hoạt render khi đổi:

```tsx
const oNhap = useRef<HTMLInputElement>(null)
const soLanRender = useRef(0)

soLanRender.current += 1        // đổi thoải mái, không render lại
<input ref={oNhap} />
oNhap.current?.focus()
```

Dùng ref cho: tham chiếu DOM, id của timer, giá trị lần trước, cờ nội bộ. **Không** dùng ref cho dữ liệu cần hiển thị — nó đổi mà màn hình không cập nhật.

## `useReducer` khi state có nhiều nhánh

```tsx
type TrangThai = { dem: number; buoc: number }
type HanhDong = { kieu: 'tang' } | { kieu: 'giam' } | { kieu: 'datBuoc'; buoc: number }

function reducer(tt: TrangThai, hd: HanhDong): TrangThai {
  switch (hd.kieu) {
    case 'tang': return { ...tt, dem: tt.dem + tt.buoc }
    case 'giam': return { ...tt, dem: tt.dem - tt.buoc }
    case 'datBuoc': return { ...tt, buoc: hd.buoc }
  }
}

const [trangThai, dispatch] = useReducer(reducer, { dem: 0, buoc: 1 })
```

Đáng đổi sang reducer khi: nhiều `setState` luôn đi cùng nhau, hoặc logic chuyển trạng thái phức tạp và cần test riêng (reducer là hàm thuần — test không cần render gì cả).

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Hook trong `if` | "Rendered fewer hooks than expected" | Đưa điều kiện vào trong hook |
| Hook sau `return` sớm | Cùng lỗi trên | Mọi hook lên trên cùng |
| Hook tuỳ chỉnh không bắt đầu bằng `use` | ESLint không kiểm tra được | Đổi tên |
| Trả về mảng mà thiếu `as const` | Mất kiểu khi destructure | Thêm `as const` |
| Dùng ref cho dữ liệu hiển thị | Đổi mà không render lại | Dùng state |

## Ghi nhớ

- React nhận diện hook theo thứ tự gọi — thứ tự phải giống nhau ở mọi lần render.
- Hook tuỳ chỉnh chia sẻ logic, không chia sẻ state.
- `useRef` cho thứ không ảnh hưởng giao diện.
- `useReducer` cho state nhiều nhánh; nó cũng là hàm thuần dễ test.

## Tự kiểm tra

1. Vì sao gọi hook trong `if` làm hỏng state của các hook sau nó?
2. Viết `useOnline()` trả về boolean, có dọn dẹp listener đầy đủ.
3. Khi nào ref là lựa chọn đúng, khi nào phải dùng state?
