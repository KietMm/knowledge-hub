---
title: Hiệu năng — vì sao component render lại
slug: hieu-nang-va-render-lai
summary: Đo trước khi tối ưu, hiểu memo/useMemo/useCallback thật sự làm gì, và các cách sửa rẻ hơn memo.
level: nang-cao
tags: [react, hieu-nang, memo]
khung: v2
---

> **Sau bài này bạn sẽ:** biết chính xác khi nào React render lại, và có ba cách sửa **rẻ hơn** `memo` để thử trước khi đụng tới nó.

## Ý tưởng chính

React render lại một component khi: **state của nó đổi**, **cha nó render lại**, hoặc **Context nó dùng đổi**.

Chú ý dòng giữa — cha render lại thì con render lại **dù props không đổi gì**. Đây là nguồn của phần lớn "React chậm", và cũng là chỗ người ta rắc `memo` khắp nơi thay vì sửa nguyên nhân.

## Mental model

Hãy nghĩ tới **render** và **vẽ lên màn hình** như hai việc khác nhau.

> **Render** là React gọi hàm component của bạn để hỏi *"lần này trông thế nào?"* — kết quả là một object mô tả. Việc này **rẻ**.
>
> **Vẽ lên DOM** là sửa màn hình thật. Việc này **đắt**, và React chỉ làm khi bản mô tả mới khác bản cũ.

Nên "component render lại 50 lần" **không tự động là vấn đề** — nếu bản mô tả không đổi thì DOM không bị đụng tới. Vấn đề chỉ xuất hiện khi bản thân việc render tốn kém: tính toán nặng, cây con khổng lồ, hàng nghìn dòng.

Đây là lý do bước đầu tiên luôn phải là **đo**, không phải **đoán**.

## Ví dụ nhỏ

```jsx
function Cha() {
  const [so, setSo] = useState(0)
  return (
    <>
      <button onClick={() => setSo(so + 1)}>{so}</button>
      <ConNang />          {/* ❌ render lại mỗi lần bấm, dù không nhận props nào */}
    </>
  )
}
```

## Code chạy thế nào

Vì sao `memo` thường **không** cứu được:

```text
function Cha() {
  const xuLy = () => {}            ← HÀM MỚI mỗi lần render
  const cauHinh = { a: 1 }         ← OBJECT MỚI mỗi lần render
  return <Con onClick={xuLy} cauHinh={cauHinh} />
}

const Con = memo(ConGoc)
  → memo so props bằng ===
  → xuLy_lần2 === xuLy_lần1 ?  FALSE  (hàm mới)
  → cauHinh_lần2 === cauHinh_lần1 ?  FALSE  (object mới)
  ⇒ memo không chặn được gì, và bạn còn tốn thêm một phép so
```

Nên `memo` chỉ có tác dụng khi **mọi props đều ổn định**, và điều đó thường đòi bọc thêm `useCallback` cho hàm, `useMemo` cho object. Ba công cụ phải đi cùng nhau — đó là lý do "tối ưu" bằng memo thường lan ra khắp file.

## Cú pháp

```jsx
const Con = memo(function Con({ a }) {})       // bỏ qua render nếu props không đổi (so ===)
const giaTri = useMemo(() => tinhNang(ds), [ds])  // nhớ GIÁ TRỊ
const xuLy = useCallback(() => {}, [])            // nhớ HÀM
```

```text
memo         → nhớ cả một component
useMemo      → nhớ một giá trị tính được
useCallback  → nhớ một hàm  (thực chất là useMemo cho hàm)
```

Cả ba đều **có giá**: một phép so sánh mỗi lần render, cộng bộ nhớ giữ giá trị cũ. Dùng bừa thì bạn trả giá ở mọi component để đổi lấy lợi ích ở vài chỗ.

## Tại sao cần nó

Vì có **ba cách sửa rẻ hơn `memo`**, và chúng giải quyết được phần lớn trường hợp:

**① Đẩy state xuống thấp nhất có thể.**

```jsx
// ❌ so ở Cha ⇒ mọi thứ trong Cha render lại
function Cha() {
  const [so, setSo] = useState(0)
  return <><Nut so={so} onTang={() => setSo(so + 1)} /><ConNang /></>
}

// ✅ so nằm trong Nut ⇒ ConNang không liên quan
function Cha() { return <><Nut /><ConNang /></> }
```

**② Truyền `children` thay vì render bên trong.**

```jsx
// ❌ ConNang bị dựng lại mỗi lần Cha render
function Cha() {
  const [so, setSo] = useState(0)
  return <div onClick={() => setSo(so+1)}><ConNang /></div>
}

// ✅ ConNang được tạo ở TẦNG TRÊN, Cha chỉ đặt nó vào chỗ
function Cha({ children }) {
  const [so, setSo] = useState(0)
  return <div onClick={() => setSo(so+1)}>{children}</div>
}
<Cha><ConNang /></Cha>
```

Mẫu này ít người biết nhưng rất mạnh: `children` là một object đã dựng sẵn từ trên, nên nó **không đổi** khi `Cha` render lại.

**③ Tách component nhỏ hơn.** Component càng nhỏ, phạm vi ảnh hưởng của một lần render càng hẹp.

Chỉ khi ba cách trên không đủ mới tới `memo` — và lúc đó phải **đo lại** để chắc nó có tác dụng thật.

## So sánh

| Bước | Việc cần làm |
|---|---|
| 1 | **Đo** bằng React DevTools Profiler — component nào chậm, chậm bao nhiêu ms |
| 2 | Hỏi: render lại có thật sự tốn kém không, hay chỉ là nhiều lần render rẻ? |
| 3 | Thử ba cách rẻ: đẩy state xuống, `children`, tách nhỏ |
| 4 | Mới tới `memo` + `useCallback` + `useMemo` |
| 5 | **Đo lại** — nếu không nhanh hơn thì gỡ ra |

Bước 5 hay bị bỏ, và kết quả là dự án đầy `useMemo` không ai dám xoá vì không biết cái nào đang có tác dụng.

Với React 19 và React Compiler, phần lớn việc ghi nhớ này được làm **tự động** lúc biên dịch — nên đừng đầu tư quá nhiều công sức thủ công vào chỗ sắp được máy làm hộ.

## Dễ nhầm

**1. Rắc `useMemo` khắp nơi "cho chắc".** Mỗi cái là một phép so mảng phụ thuộc cộng bộ nhớ. Với phép tính rẻ, `useMemo` **chậm hơn** tính lại.

**2. `memo` với props là object/hàm.** Đã nói ở trên — không có `useCallback`/`useMemo` đi kèm thì `memo` vô dụng.

**3. Tối ưu mà không đo.** Bạn sẽ tối ưu đúng chỗ không phải điểm nghẽn. Cùng nguyên tắc với [[hieu-nang-va-do-luong]].

**4. Nhầm "render nhiều lần" với "chậm".** Kiểm bằng Profiler: 50 lần render mỗi lần 0,2ms là 10ms — không ai thấy. Một lần render 300ms mới là vấn đề.

**5. Bỏ quên `key` khi render danh sách lớn.** `key` sai làm React dựng lại toàn bộ danh sách thay vì sửa vài dòng — đây là lỗi hiệu năng nghiêm trọng hơn mọi thứ `memo` cứu được. Xem [[tu-duy-khai-bao-va-jsx]].

**6. Quên rằng danh sách rất dài cần ảo hoá.** 10.000 dòng thì không `memo` nào cứu nổi — chỉ render những dòng đang nhìn thấy mới là câu trả lời.

## Mẹo nhớ

> **Render ≠ vẽ lên màn hình. Render rẻ; vẽ mới đắt.**
>
> **Đo → ba cách rẻ → mới tới memo → đo lại.**
>
> **`memo` vô dụng nếu props là object/hàm tạo mới mỗi lần.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba nguyên nhân khiến một component render lại?
2. Vì sao "render lại 50 lần" chưa chắc là vấn đề?
3. Vì sao `memo` thường không có tác dụng khi props có hàm?
4. Ba cách sửa rẻ hơn `memo`, và mỗi cách hoạt động thế nào?
5. Vì sao mẫu truyền `children` giúp tránh render lại?

## Tự viết lại

Không nhìn lại phần trên, tối ưu component này **không dùng memo**:

```jsx
function Trang() {
  const [tuKhoa, setTuKhoa] = useState('')
  return (
    <div>
      <input value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} />
      <BangDuLieuNang />        {/* 5000 dòng, render mất 400ms */}
    </div>
  )
}
```

Tự kiểm: bạn dùng cách nào trong ba cách, và sau khi sửa thì gõ một ký tự làm những component nào render lại?

## Thử sức

Đội bạn thêm `memo` cho 40 component và bọc mọi hàm bằng `useCallback`. Kết quả đo: ứng dụng **chậm hơn 5%**.

Giải thích vì sao điều đó **có thể xảy ra**. Rồi đề xuất cách xác định `memo` nào đang thật sự có ích và `memo` nào nên gỡ — phương pháp phải dựa trên số đo, không dựa trên đọc code.
