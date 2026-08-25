---
title: Form, validation và ranh giới lỗi
slug: form-va-xu-ly-loi
summary: Controlled và uncontrolled, validate ở cả hai phía, và cách để một lỗi không làm trắng cả trang.
level: nang-cao
tags: [react, form, validation, error-boundary]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng giữa controlled và uncontrolled, dùng **một** schema cho cả client lẫn server, và biết vì sao Error Boundary không bắt được lỗi async.

## Ý tưởng chính

Form là chỗ ba thứ gặp nhau: **trạng thái nhập liệu**, **kiểm tra dữ liệu**, và **lỗi**. Làm sai một trong ba thì hoặc người dùng khó chịu, hoặc dữ liệu bẩn lọt vào cơ sở dữ liệu.

Và có một nguyên tắc bao trùm: **kiểm tra ở client là để trải nghiệm tốt, kiểm tra ở server là để an toàn.** Không cái nào thay được cái nào.

## Mental model

Hãy nghĩ tới **quầy làm thủ tục sân bay**.

> **Nhân viên quầy** kiểm giấy tờ trước — để bạn không phải xếp hàng an ninh rồi mới bị đuổi về. Đó là **validation ở client**: nhanh, thân thiện, nhưng **có thể đi vòng qua**.
>
> **Cửa an ninh** kiểm lại lần nữa, không tin quầy. Đó là **validation ở server**: chậm hơn, nhưng đây mới là chỗ thật sự bảo vệ.

Ai bỏ cửa an ninh vì "quầy kiểm rồi" là mở cửa cho bất kỳ ai gửi request thẳng bằng `curl`.

## Ví dụ nhỏ

```jsx
// Controlled — React giữ giá trị
const [ten, setTen] = useState('')
<input value={ten} onChange={(e) => setTen(e.target.value)} />

// Uncontrolled — DOM tự giữ, React chỉ đọc khi cần
const oTen = useRef(null)
<input ref={oTen} defaultValue="" />
```

## Code chạy thế nào

Khác biệt nằm ở **ai là nguồn sự thật** và **render bao nhiêu lần**:

```text
CONTROLLED — gõ 5 ký tự
  gõ 'a' → onChange → setTen('a')  → render lại
  gõ 'b' → onChange → setTen('ab') → render lại
  ...
  ⇒ 5 lần render, nhưng React BIẾT giá trị ở mọi thời điểm
  ⇒ làm được: kiểm tra khi gõ, khoá nút Gửi, định dạng ngay lúc nhập

UNCONTROLLED — gõ 5 ký tự
  gõ 'a'..'e' → DOM tự lo, React không biết gì
  bấm Gửi → đọc oTen.current.value
  ⇒ 0 lần render, nhưng không phản ứng được trong lúc gõ
```

Chọn thế nào:

```text
Cần phản ứng theo từng ký tự (kiểm tra sống, khoá nút, gợi ý)  →  controlled
Form lớn, chỉ cần giá trị lúc bấm Gửi                           →  uncontrolled
```

Thư viện như React Hook Form dùng uncontrolled bên trong chính vì lý do hiệu năng đó.

## Cú pháp

Một schema, dùng ở **cả hai phía** — đây là mẫu quan trọng nhất của bài:

```ts
// schema.ts — dùng chung
export const DangKySchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  matKhau: z.string().min(8, 'Tối thiểu 8 ký tự'),
})
export type DangKy = z.infer<typeof DangKySchema>
```

```ts
// client — hiện lỗi ngay
const kq = DangKySchema.safeParse(duLieu)
if (!kq.success) setLoi(kq.error.flatten().fieldErrors)
```

```ts
// server — KHÔNG tin client
const kq = DangKySchema.safeParse(await req.json())
if (!kq.success) return Response.json({ loi: kq.error.flatten() }, { status: 400 })
```

Viết quy tắc **một lần**, dùng hai chỗ. Không có nó, hai bên sẽ lệch nhau sau vài lần sửa — và loại lệch đó rất khó phát hiện.

## Tại sao cần nó

Vì lỗi ở form không chỉ là chuyện hiển thị. Ba thứ dưới đây quyết định form của bạn dùng được hay ức chế:

**Trả lỗi server về đúng trường.** Nhiều lỗi chỉ server mới biết được — email đã tồn tại, mã giảm giá hết hạn. Chúng phải hiện **ngay cạnh ô tương ứng**, không phải trong một hộp đỏ chung chung ở đầu trang.

```jsx
{loi.email && <p id="loi-email">{loi.email}</p>}
<input aria-invalid={!!loi.email} aria-describedby="loi-email" />
```

**Khả năng truy cập, làm đúng từ đầu.** Ba thứ tối thiểu, và chúng gần như miễn phí nếu làm ngay:

```text
<label htmlFor="email">   →  bấm vào nhãn là focus vào ô
aria-invalid              →  trình đọc màn hình biết ô này sai
aria-describedby          →  đọc luôn nội dung lỗi
```

Sửa sau thì đắt gấp mười — vì lúc đó markup đã phân tán khắp nơi.

**Ranh giới lỗi.** Một lỗi lúc render làm **trắng cả trang** nếu không ai bắt:

```jsx
class RanhGioiLoi extends React.Component {
  state = { coLoi: false }
  static getDerivedStateFromError() { return { coLoi: true } }
  componentDidCatch(loi, info) { ghiLog(loi, info) }
  render() {
    return this.state.coLoi ? <p>Đã có lỗi. Thử tải lại trang.</p> : this.props.children
  }
}
```

Đặt nó **quanh từng vùng**, không phải quanh cả app: biểu đồ hỏng thì chỉ vùng biểu đồ báo lỗi, phần còn lại vẫn dùng được.

## So sánh

| | Controlled | Uncontrolled |
|---|---|---|
| Nguồn sự thật | React state | DOM |
| Render khi gõ | Mỗi ký tự | Không |
| Kiểm tra khi đang gõ | ✅ | Khó |
| Đặt lại/điền sẵn giá trị | ✅ dễ | Vụng hơn |
| Form 30 trường | Chậm dần | ✅ nhanh |

Error Boundary bắt được gì:

| Loại lỗi | Bắt được? |
|---|---|
| Lỗi lúc render | ✅ |
| Lỗi trong lifecycle | ✅ |
| Lỗi trong **event handler** | ❌ dùng `try/catch` |
| Lỗi trong `setTimeout`, Promise | ❌ dùng `.catch` |
| Lỗi ở Server Component | ❌ dùng `error.tsx` của framework |

Ba dòng cuối là chỗ người ta hay tưởng lầm rằng đã được bảo vệ.

## Dễ nhầm

**1. Chỉ validate ở client.** Ai cũng gửi được request thẳng bằng `curl`. Client-side validation **không phải bảo mật** — xem [[thiet-ke-endpoint-rest]].

**2. Viết quy tắc hai lần cho hai phía.** Chúng sẽ lệch. Dùng một schema chung.

**3. Chuyển giữa controlled và uncontrolled giữa chừng.**

```jsx
<input value={ten} />          // ten là undefined lúc đầu → React cảnh báo
<input value={ten ?? ''} />    // ✅ luôn là chuỗi
```

**4. Hiện lỗi ngay khi người dùng vừa chạm vào ô.** Báo "email không hợp lệ" khi họ mới gõ chữ `a` là ức chế. Kiểm khi **rời ô** (blur) hoặc khi bấm Gửi; sau đó mới kiểm theo từng ký tự để báo *hết* lỗi.

**5. Không khoá nút Gửi khi đang gửi.** Người dùng bấm ba lần ⇒ ba đơn hàng. Khoá nút, và ở phía server thì cần khoá chống trùng thật sự — xem [[idempotency-va-thu-lai]].

**6. Đặt một Error Boundary duy nhất quanh cả app.** Một lỗi nhỏ ở góc màn hình làm trắng toàn bộ. Chia theo vùng.

## Mẹo nhớ

> **Quầy làm thủ tục (client) để dễ chịu; cửa an ninh (server) để an toàn.**
>
> **Một schema, hai phía.**
>
> **Error Boundary không bắt được lỗi trong handler và lỗi async.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Controlled và uncontrolled khác nhau ở **nguồn sự thật** và ở **số lần render** thế nào?
2. Vì sao validate ở client không phải là bảo mật?
3. Lợi ích cụ thể của việc dùng chung một schema cho hai phía?
4. Ba loại lỗi mà Error Boundary **không** bắt được?
5. Nên hiện lỗi ở thời điểm nào trong vòng đời một ô input, và vì sao?

## Tự viết lại

Không nhìn lại phần trên, viết form đăng nhập có: kiểm tra email và mật khẩu bằng zod, hiện lỗi đúng trường, khoá nút khi đang gửi, và nhận được lỗi server "email không tồn tại" gắn vào ô email.

Tự kiểm ba câu: schema của bạn nằm ở file nào, server có gọi lại `parse` không, và ô input có `aria-invalid` chưa?

## Thử sức

Component này ném lỗi và **Error Boundary không bắt được**:

```jsx
function Nut() {
  async function xuLy() {
    const res = await fetch('/api/x')
    if (!res.ok) throw new Error('Hỏng')      // ← không ai bắt
  }
  return <button onClick={xuLy}>Gửi</button>
}
```

Giải thích vì sao Error Boundary bỏ lọt. Rồi đưa ra **hai cách** xử lý khác nhau, và nói cách nào cho người dùng trải nghiệm tốt hơn — kèm lý do.
