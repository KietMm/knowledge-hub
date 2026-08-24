---
title: Hiệu năng — vì sao component render lại
slug: hieu-nang-va-render-lai
summary: Đo trước khi tối ưu, hiểu memo/useMemo/useCallback thật sự làm gì, và các cách sửa rẻ hơn memo.
level: nang-cao
tags: [react, hieu-nang, memo]
---

> **Sau bài này bạn sẽ:** trả lời được "vì sao component này render lại" bằng bằng chứng, và biết vì sao rắc `memo` khắp nơi thường làm mọi thứ chậm hơn.

## React render lại khi nào

Chỉ ba lý do:

1. State của chính nó đổi.
2. Component cha render lại.
3. Context nó đang dùng đổi giá trị.

Lý do số 2 làm nhiều người bất ngờ: **props không đổi vẫn render lại** nếu cha render. Thường điều này vô hại — render lại là chạy lại hàm và so sánh cây, không phải đụng vào DOM. React chỉ ghi vào DOM phần thật sự khác.

Vì vậy: **render lại không đồng nghĩa với chậm.** Chỉ tối ưu sau khi đã đo.

## Đo trước

- React DevTools → Profiler → ghi lại một thao tác, xem component nào tốn thời gian.
- Bật "Highlight updates when components render" để thấy phần nào nháy.
- Trong Profiler, mỗi component có phần "Why did this render?".

Không có số đo thì mọi tối ưu chỉ là mê tín.

## Ba công cụ ghi nhớ

```tsx
// 1. memo: bỏ qua render nếu props không đổi (so sánh nông)
const Dong = memo(function Dong({ item, onChon }: Props) { ... })

// 2. useMemo: nhớ một GIÁ TRỊ tính toán
const daSapXep = useMemo(() => [...items].sort(soSanh), [items])

// 3. useCallback: nhớ một HÀM (thực chất là useMemo cho hàm)
const onChon = useCallback((id: string) => setChon(id), [])
```

Mấu chốt: `memo` chỉ có tác dụng khi props **thật sự ổn định**. Truyền một hàm inline hay object literal xuống component đã `memo` sẽ vô hiệu hoá nó hoàn toàn:

```tsx
// memo ở Dong hoàn toàn vô dụng: cả hai prop đều là giá trị mới mỗi lần render
<Dong item={{ ...item }} onChon={() => chon(item.id)} />
```

Ba thứ này phải đi thành bộ, hoặc không dùng gì cả.

## Các cách sửa rẻ hơn memo

### 1. Đưa state xuống thấp

```tsx
// Cả trang render lại mỗi ký tự gõ vào ô tìm kiếm
function Trang() {
  const [tuKhoa, setTuKhoa] = useState('')
  return <><OTim giaTri={tuKhoa} onDoi={setTuKhoa} /><BangNang /></>
}

// state nằm gọn trong OTim -> BangNang không liên quan
function Trang() {
  return <><OTim /><BangNang /></>
}
```

### 2. Truyền children thay vì render bên trong

```tsx
// BangNang render lại mỗi lần dem đổi
function Bao() {
  const [dem, setDem] = useState(0)
  return <div onClick={() => setDem(dem + 1)}><BangNang /></div>
}

// BangNang là element tạo ở cha, không render lại khi dem đổi
function Bao({ children }) {
  const [dem, setDem] = useState(0)
  return <div onClick={() => setDem(dem + 1)}>{children}</div>
}
<Bao><BangNang /></Bao>
```

Đây là kỹ thuật bị đánh giá thấp nhất: nó giải quyết đúng vấn đề mà `memo` cố giải quyết, nhưng không tốn gì.

### 3. Ảo hoá danh sách dài

1.000 dòng trong DOM là chậm bất kể memo. Dùng `@tanstack/react-virtual` để chỉ render phần đang nhìn thấy.

### 4. Cắt bundle

Nhiều khi "chậm" không phải do render mà do tải JS. `next/dynamic` hoặc `React.lazy` cho những phần nặng, ít dùng (trình soạn thảo, biểu đồ).

## React Compiler

React 19 đi kèm compiler tự chèn ghi nhớ ở mức chính xác hơn con người làm tay. Khi bật, phần lớn `useMemo`/`useCallback`/`memo` viết tay trở nên thừa. Điều kiện: code phải tuân thủ Rules of React (không sửa props, không sửa state tại chỗ, không side effect lúc render). Đây thêm một lý do để giữ code sạch thay vì rắc memo.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `memo` + prop hàm inline | memo vô hiệu, thêm chi phí so sánh | `useCallback` hoặc bỏ memo |
| `useMemo` cho phép tính tầm thường | Chi phí ghi nhớ > chi phí tính | Bỏ đi |
| Tối ưu mà không đo | Sửa nhầm chỗ, code phức tạp thêm | Profiler trước |
| State đặt quá cao | Cả cây render mỗi thao tác nhỏ | Đưa state xuống |
| Render 1.000 dòng | Chậm không cứu được bằng memo | Ảo hoá danh sách |

## Ghi nhớ

- Render lại ≠ chậm. React chỉ ghi phần khác vào DOM.
- `memo` chỉ có nghĩa khi mọi prop đều ổn định.
- Đưa state xuống thấp và truyền children rẻ hơn memo, và luôn đúng.
- Đo bằng Profiler trước khi sửa bất cứ thứ gì.

## Tự kiểm tra

1. Ba lý do khiến một component render lại là gì?
2. Vì sao `<Dong onChon={() => chon(id)} />` làm `memo(Dong)` vô dụng?
3. Trang chậm khi gõ vào ô tìm kiếm. Nêu hai cách sửa không dùng `memo`.
