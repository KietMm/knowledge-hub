---
title: useEffect và những lần không cần nó
slug: useeffect-dung-cach
summary: Effect là để đồng bộ với hệ thống bên ngoài — phần lớn useEffect trong code thực tế là thừa.
level: trung-cap
tags: [react, useeffect, hook]
---

> **Sau bài này bạn sẽ:** nhận ra ba trường hợp `useEffect` nên bị xoá đi, và viết được effect có dọn dẹp đúng.

## Effect dùng để làm gì

`useEffect` đồng bộ component với thứ **nằm ngoài React**: đăng ký sự kiện DOM, timer, WebSocket, thư viện bên thứ ba, ghi vào `localStorage`. Chỉ vậy thôi.

```tsx
useEffect(() => {
  function xuLy() { setRong(window.innerWidth) }
  window.addEventListener('resize', xuLy)
  return () => window.removeEventListener('resize', xuLy)  // dọn dẹp
}, [])
```

Hàm trả về là **hàm dọn dẹp**, chạy trước lần effect kế tiếp và khi component bị gỡ. Không dọn dẹp là rò rỉ bộ nhớ và listener chồng chất.

## Mảng phụ thuộc

```tsx
useEffect(() => { ... })              // chạy sau MỌI lần render
useEffect(() => { ... }, [])          // chỉ sau lần render đầu
useEffect(() => { ... }, [a, b])      // khi a hoặc b đổi (so sánh Object.is)
```

Không bao giờ nói dối mảng phụ thuộc để "cho nó đừng chạy lại". Nếu effect chạy quá nhiều, nguyên nhân thật thường là một object/hàm được tạo mới ở mỗi lần render:

```tsx
const opts = { limit: 10 }                  // object mới mỗi render
useEffect(() => tai(opts), [opts])          // -> chạy vô tận

const opts = useMemo(() => ({ limit: 10 }), [])   // ổn định
// hoặc đơn giản hơn: đưa giá trị nguyên thuỷ vào mảng phụ thuộc
useEffect(() => tai({ limit }), [limit])
```

Bật quy tắc ESLint `react-hooks/exhaustive-deps` và tin nó.

## Ba trường hợp không cần useEffect

### 1. Tính giá trị dẫn xuất

```tsx
// Thừa: thêm một lần render và một nguồn sự thật thứ hai
const [daLoc, setDaLoc] = useState([])
useEffect(() => { setDaLoc(items.filter(i => i.hien)) }, [items])

// Đủ
const daLoc = items.filter((i) => i.hien)
```

Chỉ bọc `useMemo` khi phép tính thật sự nặng và bạn đã đo được.

### 2. Xử lý sự kiện người dùng

```tsx
// Thừa và khó lần: vì sao form được gửi?
useEffect(() => { if (daGui) guiForm(data) }, [daGui])

// Đủ: việc xảy ra vì người dùng bấm, viết ngay ở chỗ bấm
function onSubmit() { guiForm(data) }
```

Quy tắc phân biệt: việc xảy ra vì **người dùng làm gì đó** ⇒ event handler. Việc xảy ra vì **component xuất hiện trên màn hình** ⇒ effect.

### 3. Reset state khi prop đổi

```tsx
// Thừa: render thừa một nhịp với dữ liệu cũ
useEffect(() => { setNhap('') }, [nguoiDungId])

// Đủ: đổi key ở component cha
<Form key={nguoiDungId} />
```

## Tải dữ liệu: điều kiện đua và dọn dẹp

Effect tải dữ liệu phải xử lý trường hợp người dùng đổi `id` nhanh — response cũ có thể về sau response mới:

```tsx
useEffect(() => {
  const controller = new AbortController()
  let huy = false

  async function tai() {
    try {
      const res = await fetch(`/api/users/${id}`, { signal: controller.signal })
      const data = await res.json()
      if (!huy) setNguoiDung(data)     // chỉ nhận nếu effect này còn hiệu lực
    } catch (e) {
      if (!huy && !(e instanceof DOMException)) setLoi(e)
    }
  }
  void tai()

  return () => { huy = true; controller.abort() }
}, [id])
```

Trong thực tế, hãy dùng thư viện (TanStack Query, SWR) hoặc tải ở Server Component — chúng đã xử lý sẵn cache, dedupe, retry, điều kiện đua. Viết tay chỉ nên là bài tập để hiểu vấn đề.

## Strict Mode chạy effect hai lần

Ở môi trường phát triển, React 18+ mount → unmount → mount lại mỗi component để **cố tình** phơi bày effect thiếu dọn dẹp. Effect viết đúng thì chạy hai lần vẫn không sao. Nếu chạy hai lần gây lỗi (tạo hai kết nối, gửi hai request ghi), đó là effect của bạn có vấn đề — đừng tắt Strict Mode.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Bỏ bớt phụ thuộc cho "đỡ chạy" | Effect dùng giá trị cũ, bug rất khó tìm | Khai đủ, ổn định hoá giá trị |
| Object literal trong mảng phụ thuộc | Vòng lặp render vô tận | `useMemo` hoặc dùng giá trị nguyên thuỷ |
| Không có hàm dọn dẹp | Rò rỉ listener/timer | Luôn trả về cleanup |
| `useEffect` để tính giá trị dẫn xuất | Render thừa, dữ liệu lệch | Tính trực tiếp lúc render |
| Tắt Strict Mode vì effect chạy 2 lần | Che bug thật | Sửa cho effect chịu được remount |

## Ghi nhớ

- Effect là cầu nối với thế giới bên ngoài React, không phải nơi tính toán.
- Cứ mở một thứ gì thì phải đóng nó trong cleanup.
- Người dùng bấm ⇒ handler. Component xuất hiện ⇒ effect.
- Chạy hai lần mà hỏng nghĩa là effect sai, không phải Strict Mode sai.

## Tự kiểm tra

1. Vì sao `useEffect(() => setTong(a + b), [a, b])` là thừa?
2. Effect tải dữ liệu theo `id` bị điều kiện đua ở đâu, và cờ `huy` chặn nó thế nào?
3. Việc nào sau đây thuộc effect: gửi form, ghi tiêu đề tab, kết nối WebSocket, lọc danh sách?
