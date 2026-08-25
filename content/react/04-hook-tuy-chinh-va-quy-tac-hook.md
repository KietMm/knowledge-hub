---
title: Quy tắc hook và cách viết hook tuỳ chỉnh
slug: hook-tuy-chinh-va-quy-tac-hook
summary: Vì sao hook không được gọi trong if, và cách gom logic lặp lại thành hook dùng chung.
level: trung-cap
tags: [react, hook, custom-hook]
khung: v2
---

> **Sau bài này bạn sẽ:** giải thích được **vì sao** hook không được gọi trong `if` (không phải "vì React quy định thế"), và tự viết được hook tuỳ chỉnh đúng cách.

## Ý tưởng chính

Hai quy tắc hook — **chỉ gọi ở cấp cao nhất** và **chỉ gọi trong component hoặc hook khác** — không phải quy ước tuỳ tiện. Chúng là **hệ quả trực tiếp** của cách React lưu state.

Hiểu cơ chế đó thì hai quy tắc trở nên hiển nhiên, và bạn không bao giờ vi phạm chúng nữa.

## Mental model

Hãy tưởng tượng React giữ state của component trong **một dãy ngăn kéo đánh số**, và nó **không biết tên** các hook của bạn.

> Mỗi lần render, React mở lại từ ngăn số 0 và phát theo **thứ tự bạn gọi**:
>
> ```text
> useState(0)   → phát ngăn #0
> useState('')  → phát ngăn #1
> useEffect(fn) → phát ngăn #2
> ```
>
> Lần render sau, nếu bạn gọi ít hơn một hook vì một câu `if`, thì hook thứ hai của bạn **nhận nhầm ngăn của hook thứ ba**. Mọi state lệch nhau một ô.

React không có cách nào phát hiện chuyện này — nó chỉ đếm. Đó là toàn bộ lý do của quy tắc.

## Ví dụ nhỏ

```jsx
function X({ hien }) {
  if (hien) {
    const [a, setA] = useState(1)   // ❌ có lúc gọi, có lúc không
  }
  const [b, setB] = useState(2)     // ← ngăn của b nhảy chỗ tuỳ theo `hien`
}
```

```jsx
function X({ hien }) {
  const [a, setA] = useState(1)     // ✅ luôn gọi, luôn đúng thứ tự
  const [b, setB] = useState(2)
  if (!hien) return null            // điều kiện đặt SAU khi đã gọi hết hook
}
```

## Code chạy thế nào

Lần theo tình huống lỗi cho thật cụ thể:

```text
render 1 — hien = true
  useState(1) → ngăn #0 = 1     (a)
  useState(2) → ngăn #1 = 2     (b)

render 2 — hien = false
  (câu if bị bỏ qua, useState(1) KHÔNG được gọi)
  useState(2) → ngăn #0         ← b giờ đọc ngăn của a!

⇒ b nhận giá trị 1, và mọi setB ghi đè vào state của a
```

Không có lỗi nào được ném ra. Chỉ là dữ liệu sai — loại bug tệ nhất.

Hệ quả thực dụng: **mọi hook phải nằm ở cấp cao nhất của hàm, trước mọi `return` sớm**. Điều kiện đặt bên trong hook, không đặt quanh hook:

```jsx
useEffect(() => {
  if (!hien) return          // ✅ điều kiện Ở TRONG effect
  dangKy()
}, [hien])
```

## Cú pháp

Hook tuỳ chỉnh **chỉ là một hàm** có tên bắt đầu bằng `use` và gọi hook khác bên trong:

```jsx
function useLocalStorage(khoa, macDinh) {
  const [gt, setGt] = useState(() => {
    try {
      const raw = localStorage.getItem(khoa)
      return raw === null ? macDinh : JSON.parse(raw)
    } catch { return macDinh }
  })

  useEffect(() => {
    try { localStorage.setItem(khoa, JSON.stringify(gt)) } catch {}
  }, [khoa, gt])

  return [gt, setGt]
}

// Dùng như hook có sẵn
const [theme, setTheme] = useLocalStorage('theme', 'sang')
```

Tiền tố `use` không phải để cho đẹp: **ESLint dựa vào nó** để biết đây là hook và áp dụng kiểm tra quy tắc.

## Tại sao cần nó

Vì hook tuỳ chỉnh là cách **duy nhất** để dùng lại logic có state trong React. Component dùng lại giao diện; hook dùng lại **hành vi**.

```jsx
// Trước: ba component cùng lặp lại một mớ
function A() {
  const [dl, setDl] = useState(null)
  const [tai, setTai] = useState(true)
  useEffect(() => { /* fetch, cleanup, xử lý lỗi */ }, [])
}
// B, C lặp lại y hệt...

// Sau: một hook, ba chỗ dùng
function useTaiDuLieu(url) { /* logic ở đây một lần */ }
```

Điều quan trọng cần hiểu: **mỗi component gọi hook được một bản state riêng**. Hai component cùng dùng `useTaiDuLieu` không hề chia sẻ dữ liệu — hook dùng chung **công thức**, không dùng chung **trạng thái**.

Hai hook có sẵn hay bị bỏ quên:

**`useRef` — giá trị không gây render.** Dùng cho: giữ id của timer, tham chiếu tới phần tử DOM, giữ giá trị của lần render trước.

```jsx
const idTimer = useRef(null)     // đổi .current KHÔNG làm render lại
const oInput = useRef(null)      // <input ref={oInput} /> → oInput.current
```

**`useReducer` — khi state có nhiều nhánh chuyển tiếp.** Khi bạn có bốn `useState` luôn đổi cùng nhau theo những quy tắc phức tạp, gom chúng lại thành một reducer làm mọi chuyển trạng thái nằm ở **một chỗ đọc được**.

## So sánh

| Cần dùng lại | Dùng |
|---|---|
| Giao diện | Component |
| Logic có state | **Hook tuỳ chỉnh** |
| Hàm thuần, không state | Hàm thường (không cần `use`) |
| Giá trị dùng chung cho cả cây | Context — [[context-va-quan-ly-state]] |

Dòng thứ ba đáng nhớ: không phải hàm nào trong dự án React cũng cần thành hook. `dinhDangTien(x)` chỉ là một hàm.

## Dễ nhầm

**1. Gọi hook trong `if`, vòng lặp, hoặc sau `return` sớm.** Đã nói ở trên. Nhớ: **`return null` sớm cũng là vi phạm** nếu còn hook nằm dưới nó.

**2. Quên tiền tố `use`.** Không có nó, ESLint không kiểm tra quy tắc hook cho hàm đó, và bạn mất lớp bảo vệ duy nhất.

**3. Tưởng hook tuỳ chỉnh chia sẻ state.** Mỗi lời gọi là một bản riêng. Muốn chia sẻ thật thì cần Context hoặc thư viện state ngoài.

**4. Nhồi quá nhiều vào một hook.** Hook trả về mười thứ và nhận sáu tham số là dấu hiệu nó đang làm nhiều việc — cùng vấn đề với [[ket-dinh-cao-lien-ket-long]].

**5. Dùng `useRef` để lưu thứ đáng lẽ là state.** Đổi `ref.current` **không** làm giao diện cập nhật. Nếu giá trị đó phải hiện lên màn hình, nó là state.

## Mẹo nhớ

> **React phát state theo NGĂN ĐÁNH SỐ, theo thứ tự gọi — nên thứ tự không được đổi.**
>
> **Component dùng lại giao diện; hook dùng lại hành vi.**
>
> **Mỗi lời gọi hook có bản state riêng.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao gọi hook trong `if` làm state lệch — giải thích bằng cơ chế, không bằng "React quy định"?
2. `return null` sớm có vi phạm quy tắc hook không? Khi nào?
3. Tiền tố `use` phục vụ điều gì?
4. Hai component cùng dùng một hook tuỳ chỉnh có chia sẻ state không?
5. Khi nào dùng `useRef` thay vì `useState`?

## Tự viết lại

Không nhìn lại phần trên, viết hook `useDebounce(giaTri, delay)` trả về giá trị chỉ cập nhật sau khi người dùng ngừng gõ `delay` mili giây:

```jsx
const tuKhoaCho = useDebounce(tuKhoa, 300)
```

Tự kiểm: effect của bạn có hàm dọn dẹp không, và **vì sao nó bắt buộc phải có** ở bài này?

## Thử sức

Component này chạy đúng khi `hien = true` nhưng vỡ khi người dùng bật tắt:

```jsx
function Bang({ hien, id }) {
  if (!hien) return null

  const [dl, setDl] = useState(null)
  useEffect(() => { tai(id).then(setDl) }, [id])
  return <div>{dl?.ten}</div>
}
```

Sửa lại, rồi trả lời: nếu chỉ **di chuyển** `if (!hien) return null` xuống dưới, component có tải dữ liệu ngay cả khi đang ẩn không — và đó có phải điều bạn muốn?
