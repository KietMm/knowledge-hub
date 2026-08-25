---
title: useEffect và những lần không cần nó
slug: useeffect-dung-cach
summary: Effect là để đồng bộ với hệ thống bên ngoài — phần lớn useEffect trong code thực tế là thừa.
level: trung-cap
tags: [react, useeffect, hook]
khung: v2
---

> **Sau bài này bạn sẽ:** trả lời được câu "chỗ này có cần `useEffect` không?" bằng một phép thử, và viết được effect tải dữ liệu không dính lỗi điều kiện đua.

## Ý tưởng chính

`useEffect` dùng để **đồng bộ component với một hệ thống bên ngoài React**: mạng, `localStorage`, đăng ký sự kiện của trình duyệt, thư viện vẽ biểu đồ, timer.

Nó **không** phải chỗ để "chạy code sau khi render". Phần lớn `useEffect` trong code thật là thừa, và mỗi cái thừa đều thêm một vòng render và một nguồn bug.

## Mental model

Hãy nghĩ tới **dây nối giữa hai thiết bị**.

> Component là một thiết bị; hệ thống bên ngoài (server, DOM, timer) là thiết bị kia. `useEffect` là **sợi dây nối**.
>
> Cắm dây thì phải **rút dây** khi xong — không thì lần sau cắm thêm một sợi nữa, rồi một sợi nữa, và tín hiệu chồng lên nhau.

Hàm dọn dẹp không phải tuỳ chọn cho đẹp. Nó là **rút dây**, và thiếu nó là nguồn của phần lớn bug rò rỉ và "sao nó chạy hai lần".

Phép thử để biết có cần effect không:

> **"Việc này có nói chuyện với thứ gì ngoài React không?"**
> Không ⇒ không cần effect.

## Ví dụ nhỏ

```jsx
// ✅ Cần effect: đăng ký sự kiện của trình duyệt (ngoài React)
useEffect(() => {
  const xuLy = () => setRong(window.innerWidth)
  window.addEventListener('resize', xuLy)
  return () => window.removeEventListener('resize', xuLy)   // ← rút dây
}, [])
```

```jsx
// ❌ Không cần effect: chỉ là tính toán từ props
const [dayDu, setDayDu] = useState('')
useEffect(() => { setDayDu(ho + ' ' + ten) }, [ho, ten])

// ✅ Tính thẳng khi render
const dayDu = ho + ' ' + ten
```

## Code chạy thế nào

Mảng phụ thuộc quyết định **khi nào cắm lại dây**:

```text
useEffect(fn, [a, b])

lần render 1:  chạy fn
lần render 2:  a, b không đổi  → KHÔNG chạy lại
lần render 3:  b đổi           → chạy hàm DỌN DẸP của lần trước, rồi chạy fn mới
component gỡ:  chạy hàm dọn dẹp lần cuối
```

Ba dạng mảng phụ thuộc:

```text
useEffect(fn)         → chạy sau MỌI lần render          (hiếm khi đúng)
useEffect(fn, [])     → chạy MỘT lần khi gắn vào          (đăng ký sự kiện, khởi tạo)
useEffect(fn, [x])    → chạy lại mỗi khi x đổi            (đồng bộ theo dữ liệu)
```

## Tại sao cần nó

Vì ba trường hợp dưới đây chiếm phần lớn `useEffect` thừa trong code thật:

**① Tính toán từ props hoặc state.** Đã xem ở trên — tính thẳng khi render. Effect ở đây gây **hai lần render** (một lần với giá trị cũ, một lần sau khi `setState`), và có một khoảnh khắc màn hình hiển thị dữ liệu chưa khớp.

**② Đặt lại state khi props đổi.**

```jsx
useEffect(() => { setNhap('') }, [nguoiDungId])   // ❌ render một lần với dữ liệu cũ
```

```jsx
<Form key={nguoiDungId} />                         // ✅ đổi key ⇒ dựng lại sạch
```

**③ Xử lý sự kiện người dùng.**

```jsx
useEffect(() => { if (daGui) guiPhanTich() }, [daGui])   // ❌ gián tiếp, khó lần
```

```jsx
function onSubmit() { guiPhanTich(); ... }                // ✅ việc của handler
```

Quy tắc: **việc xảy ra vì người dùng làm gì đó ⇒ handler. Việc xảy ra vì component hiện trên màn hình ⇒ effect.**

Và đây là chỗ effect thật sự cần — tải dữ liệu, làm cho đúng:

```jsx
useEffect(() => {
  let huy = false
  const bo = new AbortController()

  fetch(`/api/user/${id}`, { signal: bo.signal })
    .then((r) => r.json())
    .then((d) => { if (!huy) setDuLieu(d) })   // ← chặn kết quả cũ ghi đè kết quả mới
    .catch((e) => { if (e.name !== 'AbortError') setLoi(e) })

  return () => { huy = true; bo.abort() }       // rút dây
}, [id])
```

Không có cờ `huy`, bạn dính **điều kiện đua**: đổi `id` từ 1 sang 2, request của id 1 về sau và ghi đè dữ liệu của id 2. Người dùng thấy hồ sơ sai — và bug này chỉ xuất hiện khi mạng chậm, nên gần như không lộ ra lúc dev.

## So sánh

| Việc | Cần effect? |
|---|---|
| Tính giá trị từ props/state | ❌ tính khi render |
| Lọc/sắp xếp danh sách | ❌ tính khi render (nặng thì `useMemo`) |
| Đặt lại state khi props đổi | ❌ dùng `key` |
| Phản ứng với click, submit | ❌ handler |
| Gọi API khi màn hình mở | ✅ (hoặc để framework lo) |
| Đăng ký `addEventListener`, WebSocket | ✅ |
| Đặt `setInterval` | ✅ |
| Đồng bộ với `localStorage` | ✅ |

Với Next.js App Router, ngay cả việc tải dữ liệu cũng thường **không** cần effect — dữ liệu lấy ở Server Component. Xem [[tai-du-lieu-va-streaming]].

## Dễ nhầm

**1. Quên hàm dọn dẹp.** Mỗi `addEventListener`, `setInterval`, `subscribe` phải có cặp gỡ tương ứng. Thiếu nó là rò rỉ, và là lý do "callback chạy nhiều lần hơn tôi tưởng".

**2. Bỏ bớt phụ thuộc cho hết cảnh báo.**

```jsx
useEffect(() => { tai(id) }, [])   // ❌ ESLint kêu — và nó ĐÚNG
```

Bỏ `id` ra khỏi mảng thì effect giữ mãi ảnh chụp đầu tiên, và không tải lại khi `id` đổi. Đừng tắt cảnh báo — hãy sửa nguyên nhân (thường là chuyển hàm vào trong effect, hoặc bọc nó bằng `useCallback`).

**3. Đặt object/hàm làm phụ thuộc.**

```jsx
useEffect(() => {}, [{ a: 1 }])   // ❌ object mới mỗi lần render ⇒ effect chạy MỖI lần
```

**4. Hoảng vì Strict Mode chạy effect hai lần.** Ở môi trường dev, React cố tình gắn–gỡ–gắn lại một lần để **phát hiện effect thiếu dọn dẹp**. Nếu effect của bạn chạy hai lần gây vấn đề, đó là dấu hiệu nó thiếu cleanup — không phải lỗi của React.

**5. `async` trực tiếp trên hàm effect.**

```jsx
useEffect(async () => {}, [])   // ❌ effect phải trả về hàm dọn dẹp, không phải Promise
useEffect(() => { (async () => {})() }, [])   // ✅
```

## Mẹo nhớ

> **Effect là sợi dây nối ra ngoài React — cắm thì phải rút.**
>
> **Không nói chuyện với thứ ngoài React ⇒ không cần effect.**
>
> **Người dùng làm ⇒ handler. Màn hình hiện ⇒ effect.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Phép thử một câu để biết có cần `useEffect` không?
2. Ba trường hợp `useEffect` thừa hay gặp nhất?
3. Điều kiện đua khi tải dữ liệu xảy ra thế nào, và cờ `huy` chặn nó ra sao?
4. Vì sao Strict Mode chạy effect hai lần, và điều đó phát hiện ra lỗi gì?
5. Vì sao bỏ bớt phụ thuộc cho hết cảnh báo ESLint là ý tồi?

## Tự viết lại

Không nhìn lại phần trên, bỏ hết `useEffect` thừa trong component này:

```jsx
function DanhSach({ items, tuKhoa }) {
  const [loc, setLoc] = useState([])
  const [soLuong, setSoLuong] = useState(0)

  useEffect(() => { setLoc(items.filter((i) => i.ten.includes(tuKhoa))) }, [items, tuKhoa])
  useEffect(() => { setSoLuong(loc.length) }, [loc])

  return <div>{soLuong} kết quả</div>
}
```

Tự kiểm: bản của bạn còn mấy `useState`? Và component render mấy lần khi `tuKhoa` đổi — trước và sau khi sửa?

## Thử sức

Effect này rò rỉ. Chỉ ra chỗ rò, rồi trả lời câu khó hơn:

```jsx
useEffect(() => {
  const id = setInterval(() => setSo(so + 1), 1000)
  return () => clearInterval(id)
}, [])
```

Nó **có** dọn dẹp, nhưng bộ đếm vẫn đứng ở 1 mãi mãi. Vì sao? Gợi ý: hàm trong `setInterval` đeo theo ảnh chụp nào, và mảng `[]` khiến điều gì không bao giờ xảy ra?
