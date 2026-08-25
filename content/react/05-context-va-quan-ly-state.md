---
title: Context, prop drilling và chọn nơi đặt state
slug: context-va-quan-ly-state
summary: Khi nào Context là đúng, khi nào nó làm chậm cả cây component, và các loại state khác nhau nên ở đâu.
level: trung-cap
tags: [react, context, state-management]
khung: v2
---

> **Sau bài này bạn sẽ:** biết đặt mỗi loại state ở đâu, và không còn dùng Context như một kho chứa mọi thứ.

## Ý tưởng chính

Câu hỏi *"dùng Redux hay Context hay Zustand?"* là câu hỏi sai, và người ta hỏi nó quá sớm.

Câu hỏi đúng là: **dữ liệu này thuộc loại nào?** Bốn loại state khác nhau nên ở bốn chỗ khác nhau, và phần lớn dữ liệu trong ứng dụng của bạn **không thuộc về React** chút nào.

## Mental model

Hãy nghĩ tới cách cất đồ trong nhà.

> **Đồ dùng một lần trong một phòng** — để ngay trong phòng đó. (state cục bộ)
>
> **Đồ hai phòng cùng dùng** — để ở hành lang chung gần nhất, không mang lên tầng thượng. (nâng state lên cha chung)
>
> **Điện, nước** — đi đường ống tới mọi phòng, không ai phải xách. (Context)
>
> **Thư gửi từ bưu điện** — nó **không phải đồ của nhà bạn**. Bạn chỉ giữ bản sao, và bản gốc ở ngoài kia có thể đã đổi. (dữ liệu từ server)

Loại thứ tư là loại bị đặt sai chỗ nhiều nhất: người ta nhét dữ liệu server vào Redux/Context rồi tự viết cơ chế đồng bộ — trong khi đó là bài toán **cache**, không phải bài toán state.

## Ví dụ nhỏ

```jsx
// Bốn loại, bốn chỗ
const [moOTay, setMoOTay] = useState(false)          // ① cục bộ — chỉ component này
const [tuKhoa, setTuKhoa] = useState('')             // ② cha chung — hai con cùng dùng
const { theme } = useContext(ThemeContext)            // ③ toàn cục thật — hiếm đổi
const { data } = useQuery(['don', id], layDon)        // ④ dữ liệu server — thuộc về cache
```

## Code chạy thế nào

Context truyền dữ liệu **xuyên qua** cây component, bỏ qua các tầng trung gian:

```text
KHÔNG Context — prop drilling
  App(user) → Layout(user) → Sidebar(user) → Menu(user) → Avatar(user)
              ↑ ba tầng giữa KHÔNG dùng user, chỉ chuyển tiếp

CÓ Context
  App ──Provider(user)──┐
  Layout                │
  Sidebar               │   ba tầng giữa không biết gì về user
  Menu                  │
  Avatar ───useContext──┘
```

Nhưng đây là chỗ phải cẩn thận — **mọi component dùng `useContext` sẽ render lại khi giá trị Context đổi**, dù nó chỉ dùng một phần nhỏ:

```jsx
<Ctx.Provider value={{ user, theme, gioHang }}>   // ❌ gioHang đổi → mọi nơi dùng theme cũng render lại
```

Và một bẫy nữa:

```jsx
<Ctx.Provider value={{ user }}>   // ❌ object MỚI mỗi lần render cha ⇒ mọi consumer render lại
```

Cách chữa cả hai: **tách Context theo tần suất thay đổi**, và bọc value bằng `useMemo`.

## Cú pháp

```jsx
const ThemeContext = createContext('sang')

function App() {
  const [theme, setTheme] = useState('sang')
  const gt = useMemo(() => ({ theme, setTheme }), [theme])   // ← ổn định tham chiếu
  return <ThemeContext.Provider value={gt}><Trang /></ThemeContext.Provider>
}

function Nut() {
  const { theme, setTheme } = useContext(ThemeContext)
}
```

## Tại sao cần nó

Vì **prop drilling không phải lúc nào cũng là vấn đề**, và Context không phải lúc nào cũng là giải pháp.

Truyền props qua **hai tầng** là chuyện bình thường, và nó có ưu điểm thật: nhìn chữ ký component là biết nó cần gì. Chỉ khi qua **bốn, năm tầng** thì mới đáng gọi là vấn đề — và ngay cả lúc đó vẫn còn hai cách rẻ hơn Context:

```jsx
// ① Truyền children — tầng giữa không cần biết gì
<Layout><Avatar user={user} /></Layout>

// ② Gom thành một object
<Sidebar cauHinh={{ user, theme, menu }} />
```

Cách ① đặc biệt đáng biết: `Layout` nhận `children` đã dựng sẵn, nên nó không cần `user` để chuyển tiếp. Rất nhiều trường hợp "cần Context" biến mất sau khi đổi sang cách này.

Và một chỗ đặt state mà nhiều người quên: **URL**.

```jsx
const [params, setParams] = useSearchParams()
const tuKhoa = params.get('q') ?? ''
```

Bộ lọc, tab đang mở, số trang, từ khoá tìm kiếm — đặt trên URL thì người dùng **chia sẻ được link**, **bấm Back được**, và **tải lại trang không mất**. Ba thứ đó không có nếu bạn giữ chúng trong `useState`.

## So sánh

| Loại state | Ví dụ | Đặt ở đâu |
|---|---|---|
| Cục bộ | Ô input, modal đang mở | `useState` trong chính component |
| Chia sẻ gần | Bộ lọc dùng bởi hai component | Nâng lên cha chung |
| Toàn cục thật | Theme, ngôn ngữ, người đăng nhập | Context |
| Dữ liệu server | Danh sách đơn, hồ sơ | Thư viện cache (React Query, SWR) hoặc Server Component |
| Trạng thái điều hướng | Bộ lọc, tab, số trang | **URL** |

Kinh nghiệm thực tế: sau khi đặt đúng bốn loại này, phần lớn ứng dụng **không cần** thư viện quản lý state toàn cục nào cả.

## Dễ nhầm

**1. Dùng Context cho dữ liệu server.** Bạn sẽ tự viết lại: cache, làm mới, trạng thái đang tải, xử lý lỗi, chống request trùng. Đó là một thư viện, và đã có người viết rồi.

**2. Một Context khổng lồ chứa mọi thứ.** Đổi một trường ⇒ cả cây render lại. Tách theo tần suất đổi: `ThemeContext` (hiếm đổi) tách khỏi `GioHangContext` (đổi liên tục).

**3. Quên `useMemo` cho value.** Object mới mỗi lần render cha ⇒ mọi consumer render lại, kể cả khi dữ liệu bên trong y hệt.

**4. Sợ prop drilling quá sớm.** Hai tầng thì cứ truyền. Context thêm một lớp gián tiếp và làm component khó test hơn (phải bọc Provider) — cùng cảnh báo với [[truu-tuong-hoa-khi-nao-tach]].

**5. Giữ trong `useState` thứ đáng lẽ ở URL.** Người dùng lọc xong, gửi link cho đồng nghiệp, và họ mở ra thấy trang trắng chưa lọc gì.

## Mẹo nhớ

> **Đồ trong phòng · hành lang chung · đường ống điện nước · thư từ bưu điện.**
>
> **Dữ liệu server không phải state — nó là cache.**
>
> **Bộ lọc và số trang thuộc về URL.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn loại state và chỗ đặt tương ứng?
2. Vì sao dữ liệu từ server **không** nên nằm trong Context?
3. Hai cách xử lý prop drilling **rẻ hơn** Context?
4. Vì sao phải `useMemo` giá trị truyền vào Provider?
5. Ba lợi ích của việc đặt bộ lọc lên URL?

## Tự viết lại

Không nhìn lại phần trên, quyết định chỗ đặt cho từng state và **nêu lý do**:

```text
a) Trạng thái mở/đóng của một dropdown
b) Ngôn ngữ giao diện
c) Danh sách sản phẩm lấy từ API
d) Từ khoá tìm kiếm và trang hiện tại
e) Nội dung giỏ hàng
```

Câu (e) khó nhất — nó phụ thuộc một điều kiện. Điều kiện đó là gì?

## Thử sức

Ứng dụng của bạn có `AppContext` chứa `{ user, theme, gioHang, thongBao }`. Người dùng thêm một món vào giỏ, và **toàn bộ trang render lại**, kể cả header và footer.

Giải thích chính xác vì sao. Rồi đưa ra **hai** cách sửa khác nhau, và nói mỗi cách đánh đổi cái gì.
