---
title: Context, prop drilling và chọn nơi đặt state
slug: context-va-quan-ly-state
summary: Khi nào Context là đúng, khi nào nó làm chậm cả cây component, và các loại state khác nhau nên ở đâu.
level: trung-cap
tags: [react, context, state-management]
---

> **Sau bài này bạn sẽ:** biết phân loại state trong ứng dụng và chọn công cụ tương ứng, thay vì nhét tất cả vào một store toàn cục.

## Bốn loại state, bốn chỗ khác nhau

Đây là bước phân loại quan trọng nhất — chọn sai chỗ là nguồn của phần lớn sự phức tạp:

| Loại | Ví dụ | Nên đặt ở đâu |
|---|---|---|
| Cục bộ giao diện | Ô input, tab đang mở, dropdown | `useState` trong chính component |
| Dùng chung theo cây | Theme, ngôn ngữ, người dùng hiện tại | Context |
| Dữ liệu từ server | Danh sách sản phẩm, hồ sơ | Thư viện data fetching hoặc Server Component |
| Trên URL | Từ khoá tìm kiếm, trang, bộ lọc | Query string |

Nhầm lẫn phổ biến nhất là bỏ **dữ liệu server** vào store toàn cục rồi tự viết cache, invalidation, retry — tức là viết lại một thư viện data fetching, thường là bản kém hơn.

Đưa bộ lọc lên URL cũng bị bỏ quên: nó khiến trang chia sẻ được, refresh không mất, và nút back hoạt động đúng — miễn phí.

## Prop drilling và các cách xử lý

```tsx
<Trang nguoiDung={u}>
  <Header nguoiDung={u}>
    <Menu nguoiDung={u}>
      <Avatar nguoiDung={u} />   {/* chỉ chỗ này thật sự cần */}
```

Trước khi với tới Context, thử **truyền children** — thường đủ và không thêm khái niệm mới:

```tsx
<Menu avatar={<Avatar nguoiDung={u} />} />
```

Thành phần trung gian không cần biết gì về `nguoiDung` nữa.

## Context

```tsx
type NguoiDungContext = { nguoiDung: NguoiDung | null; dangXuat: () => void }

const Ctx = createContext<NguoiDungContext | null>(null)

export function NguoiDungProvider({ children }: { children: ReactNode }) {
  const [nguoiDung, setNguoiDung] = useState<NguoiDung | null>(null)
  const dangXuat = useCallback(() => setNguoiDung(null), [])

  // useMemo bắt buộc ở đây: không có nó, mỗi lần Provider render sẽ tạo object
  // value mới -> mọi consumer render lại dù dữ liệu không đổi.
  const value = useMemo(() => ({ nguoiDung, dangXuat }), [nguoiDung, dangXuat])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Hook riêng để không ai phải nhớ kiểm tra null
export function useNguoiDung() {
  const ctx = useContext(Ctx)
  if (ctx === null) throw new Error('useNguoiDung phải nằm trong <NguoiDungProvider>')
  return ctx
}
```

Mẫu "export hook thay vì export context" đáng làm mọi lần: nó cho thông báo lỗi rõ ràng khi đặt sai chỗ, và giấu chi tiết cài đặt.

## Nhược điểm của Context

Mọi consumer render lại khi `value` đổi — **không** có cơ chế chọn lọc theo trường. Đổi `theme` sẽ render lại cả những component chỉ dùng `ngonNgu` nếu hai thứ nằm chung một context.

Cách giảm đau:

1. **Tách context theo nhịp thay đổi.** Dữ liệu ít đổi (theme) tách khỏi dữ liệu đổi liên tục (vị trí chuột).
2. **Tách giá trị và hàm cập nhật thành hai context.** Component chỉ gọi `dispatch` sẽ không render lại khi giá trị đổi.
3. Đặt Provider **thấp nhất có thể** trong cây, không phải luôn ở root.

Nếu bạn thấy mình cần chọn lọc theo trường thật sự, đó là lúc dùng thư viện store (Zustand, Jotai) — chúng đăng ký theo từng mẩu state.

## Đưa state lên URL

```tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

function BoLoc() {
  const params = useSearchParams()
  const router = useRouter()
  const tag = params.get('tag') ?? ''

  function chon(tagMoi: string) {
    const next = new URLSearchParams(params)
    if (tagMoi === '') next.delete('tag')
    else next.set('tag', tagMoi)
    router.push(`?${next.toString()}`)
  }
  ...
}
```

Đổi lại một chút dài dòng, bạn được: chia sẻ link, refresh giữ nguyên, back/forward đúng, và server render được luôn trạng thái đã lọc.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `value={{ a, b }}` không memo | Mọi consumer render mỗi lần Provider render | `useMemo` |
| Một context cho toàn bộ app | Đổi một trường, cả cây render | Tách theo nhịp thay đổi |
| Dữ liệu server trong store toàn cục | Tự viết lại cache/invalidation | Dùng thư viện fetching |
| Bộ lọc trong `useState` | Không chia sẻ link được, refresh mất | Đưa lên query string |
| Provider luôn ở root | Phạm vi render lại rộng vô ích | Đặt gần nơi dùng |

## Ghi nhớ

- Phân loại state trước, chọn công cụ sau.
- Truyền `children` giải quyết phần lớn prop drilling mà không cần Context.
- Context không có chọn lọc theo trường — tách nhỏ theo nhịp thay đổi.
- URL là nơi lưu state tốt nhất cho bộ lọc và phân trang.

## Tự kiểm tra

1. Bốn loại state, mỗi loại cho một ví dụ trong ứng dụng bạn đang làm.
2. Vì sao thiếu `useMemo` quanh `value` lại làm mọi consumer render lại?
3. Bộ lọc danh sách nên nằm ở `useState` hay URL? Nêu ba lý do cho lựa chọn của bạn.
