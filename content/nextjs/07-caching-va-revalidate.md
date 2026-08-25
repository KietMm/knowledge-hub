---
title: Bốn tầng cache và revalidate
slug: caching-va-revalidate
summary: Next cache ở bốn chỗ khác nhau — biết chúng là gì mới giải thích được vì sao dữ liệu không chịu cập nhật.
level: nang-cao
tags: [nextjs, caching, revalidate, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** trả lời được câu hỏi ám ảnh nhất của App Router — *"tại sao dữ liệu không cập nhật?"* — bằng cách kiểm bốn tầng theo thứ tự.

## Ý tưởng chính

Next cache ở **bốn chỗ khác nhau**, và mỗi chỗ có cách xoá riêng. Khi dữ liệu "không chịu cập nhật", nguyên nhân luôn nằm ở một trong bốn tầng đó.

Không biết chúng thì bạn sẽ thử `revalidatePath` rồi thử tắt cache rồi thử build lại — và đôi khi may mắn hết lỗi mà không hiểu vì sao.

## Mental model

Hãy nghĩ tới **một lá thư đi qua bốn trạm**.

```text
① Router Cache   — ngăn kéo TRONG TÚI người nhận   (trình duyệt, ~30 giây)
② Full Route     — bản photocopy ở BƯU CỤC ĐÍCH    (HTML dựng sẵn)
③ Data Cache     — bản lưu ở TRUNG TÂM CHIA THƯ    (kết quả fetch)
④ Request Memo   — ghi chú TRÊN BÀN người xử lý    (trong một lần render)
```

> Bạn sửa nội dung thư gốc, nhưng người nhận vẫn đọc bản trong túi họ. Xoá bản ở bưu cục không đủ — **phải xoá đúng trạm đang giữ bản cũ**.

Tầng ① là thủ phạm hay bị bỏ sót nhất, vì nó nằm ở **trình duyệt** chứ không phải server — bạn xoá cache server, deploy lại, vẫn thấy dữ liệu cũ.

## Ví dụ nhỏ

```ts
fetch(url)                                    // Next 15: KHÔNG cache
fetch(url, { cache: 'force-cache' })          // cache tới khi bị xoá
fetch(url, { next: { revalidate: 60 } })      // tự làm mới sau 60 giây
fetch(url, { next: { tags: ['san-pham'] } })  // gắn thẻ để xoá có chủ đích
```

## Code chạy thế nào

Đường đi của một request và chỗ nó có thể bị chặn lại:

```text
Người dùng bấm <Link>
   │
   ▼
① Router Cache (trong trình duyệt)  ─── có bản mới? → hiện luôn, KHÔNG gọi server
   │  miss
   ▼
② Full Route Cache (HTML dựng sẵn)  ─── có? → trả HTML luôn, không chạy component
   │  miss
   ▼
   Chạy Server Component
   │
   ▼
③ Data Cache (kết quả fetch)        ─── có? → dùng lại, không gọi API thật
   │  miss
   ▼
   Gọi API / cơ sở dữ liệu
   
④ Request Memoization: trong CÙNG một lần render, fetch trùng URL chỉ gọi một lần
```

Hệ quả quan trọng: **`revalidatePath` xoá tầng ② và ③, nhưng người dùng đang mở tab vẫn có thể thấy dữ liệu cũ vì tầng ①.** Đó là lý do sau khi ghi, bạn thường cần cả `router.refresh()` ở phía client.

## Cú pháp

```ts
// Ép cả route thành động — không cache HTML
export const dynamic = 'force-dynamic'

// Hoặc làm mới định kỳ
export const revalidate = 3600      // giây

// Sau khi ghi dữ liệu
revalidatePath('/san-pham')          // xoá theo đường dẫn
revalidateTag('san-pham')            // xoá mọi fetch gắn thẻ này — chính xác hơn
```

```tsx
'use client'
router.refresh()                     // xoá Router Cache, lấy lại dữ liệu server
```

Một route thành **động** (không cache HTML) khi nó dùng bất kỳ thứ nào sau đây:

```text
cookies() · headers() · searchParams · fetch không cache · dynamic = 'force-dynamic'
```

## Tại sao cần nó

Vì chọn sai chiến lược thì hoặc người dùng thấy dữ liệu cũ, hoặc bạn trả tiền cho hàng triệu truy vấn không cần thiết.

| Loại dữ liệu | Chiến lược |
|---|---|
| Bài viết, trang tài liệu | Tĩnh + `revalidateTag` khi biên tập viên sửa |
| Danh sách sản phẩm | `revalidate: 60` — chấp nhận cũ một phút |
| Giỏ hàng, hồ sơ cá nhân | `force-dynamic` — không bao giờ cache |
| Bảng giá theo thời gian thực | Không cache, hoặc fetch ở client |
| Trang quản trị | `force-dynamic` |

Nguyên tắc chọn: hỏi **"dữ liệu cũ bao lâu thì gây hại?"** — không phải "cái nào nhanh nhất".

Và `revalidateTag` đáng dùng hơn `revalidatePath` khi hệ thống lớn: một sản phẩm xuất hiện ở trang chủ, trang danh mục, trang tìm kiếm và trang chi tiết. Gắn thẻ `san-pham-${id}` thì một lệnh xoá đúng mọi chỗ, thay vì phải nhớ liệt kê bốn đường dẫn.

## So sánh

| Tầng | Ở đâu | Sống bao lâu | Xoá bằng |
|---|---|---|---|
| ① Router Cache | Trình duyệt | ~30s (động) / 5 phút (tĩnh) | `router.refresh()`, điều hướng cứng |
| ② Full Route Cache | Server | Tới khi revalidate | `revalidatePath`, deploy mới |
| ③ Data Cache | Server | Bền, qua cả deploy | `revalidateTag`, `revalidatePath` |
| ④ Request Memo | Một lần render | Hết render là hết | Không cần xoá |

Chú ý dòng ③: Data Cache **sống qua cả lần deploy mới**. Nhiều người tưởng deploy là xoá sạch — không phải.

## Dễ nhầm

**1. Quên Router Cache.** Bạn ghi dữ liệu, `revalidatePath` chạy đúng, nhưng người dùng bấm Back và thấy bản cũ. Cần `router.refresh()`.

**2. Dùng `force-dynamic` cho cả app "cho chắc".** Bạn vứt bỏ toàn bộ lợi ích của tĩnh và trả tiền cho mọi truy vấn ở mọi lượt xem.

**3. Cache dữ liệu riêng của từng người.** Cực kỳ nguy hiểm: người dùng A thấy giỏ hàng của người dùng B. Bất cứ thứ gì phụ thuộc `cookies()` hoặc phiên đăng nhập thì **không được cache dùng chung**.

**4. Tưởng `revalidate: 60` nghĩa là "cập nhật sau đúng 60 giây".** Nó là *stale-while-revalidate*: request đầu tiên sau 60 giây vẫn nhận **bản cũ**, và bản mới được dựng ở nền cho request sau. Không có gì sai — chỉ cần biết để không hoang mang.

**5. Không đặt thẻ nên phải xoá bằng đường dẫn.** Sau này thêm một trang hiển thị cùng dữ liệu, bạn quên thêm đường dẫn vào lệnh xoá, và trang đó cũ mãi.

**6. Quên rằng `fetch` trong Next 15 mặc định KHÔNG cache.** Nếu bạn học từ tài liệu cũ (Next 14 mặc định cache), hành vi bạn mong đợi sẽ ngược lại.

## Mẹo nhớ

> **Bốn trạm: túi người nhận · bưu cục · trung tâm chia thư · bàn làm việc.**
>
> **Hỏi "dữ liệu cũ bao lâu thì gây hại", không hỏi "cái nào nhanh nhất".**
>
> **Dữ liệu riêng của từng người thì không bao giờ cache dùng chung.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Kể bốn tầng cache và nói mỗi tầng nằm ở đâu.
2. Vì sao `revalidatePath` chạy đúng mà người dùng vẫn thấy dữ liệu cũ?
3. `revalidateTag` hơn `revalidatePath` ở điểm nào trong hệ thống lớn?
4. Điều gì làm một route trở thành động?
5. `revalidate: 60` thực sự hoạt động thế nào — ai nhận bản cũ, ai nhận bản mới?

## Tự viết lại

Không nhìn lại phần trên, chọn chiến lược cache cho từng trang và **nêu lý do**:

```text
a) Trang chủ — danh sách 12 sản phẩm nổi bật, biên tập viên đổi vài lần mỗi tuần
b) /gio-hang
c) /san-pham/[slug] — 5000 sản phẩm, giá đổi vài lần mỗi ngày
d) /admin/don-hang
```

Tự kiểm: với (c), bạn dùng thẻ hay đường dẫn để xoá, và tên thẻ của bạn là gì?

## Thử sức

Bạn sửa mô tả sản phẩm trong CMS. Trang chi tiết cập nhật ngay, nhưng **trang danh mục vẫn hiện mô tả cũ suốt hai ngày**.

Chẩn đoán theo bốn tầng: kiểm tầng nào trước, bằng cách nào, và sửa ra sao để **lần sau không tái diễn** — không phải sửa một lần rồi thôi.
