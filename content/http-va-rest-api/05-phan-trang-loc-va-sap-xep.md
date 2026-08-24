---
title: Phân trang, lọc và sắp xếp
slug: phan-trang-loc-va-sap-xep
summary: Offset hay cursor, và vì sao trang 2 đôi khi lặp lại bản ghi của trang 1.
level: trung-cap
tags: [rest, api-design, phan-trang, hieu-nang]
---

> **Sau bài này bạn sẽ:** chọn được kiểu phân trang phù hợp, và giải thích được vì sao `OFFSET` lớn vừa chậm vừa cho kết quả trùng.

## Không bao giờ trả về "tất cả"

`GET /api/orders` trên bảng 2 triệu dòng là một sự cố chờ xảy ra. Luôn có giới hạn mặc định, và một mức trần:

```ts
const MAC_DINH = 20
const TOI_DA = 100

// Trần bảo vệ server: thiếu nó, ?limit=999999 là một lời mời DoS.
const limit = Math.min(Number(searchParams.get('limit')) || MAC_DINH, TOI_DA)
```

## Cách 1 — offset/limit

```http
GET /api/orders?page=3&limit=20
```

```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 40;
```

Dễ làm, cho phép nhảy tới trang bất kỳ, hiện được "trang 3/47". Nhưng có hai khuyết điểm thật:

**Chậm dần theo số trang.** `OFFSET 100000` buộc database đọc và **bỏ đi** 100.000 dòng trước khi lấy 20 dòng cần. Chi phí tăng tuyến tính theo offset — xem [[index-va-hieu-nang-truy-van]].

**Bản ghi trùng hoặc bị nhảy qua.** Đang xem trang 1, có người tạo đơn mới:

```
Lúc đọc trang 1:  [đ10, đ9, đ8 ... đ1]   ← lấy 3 mới nhất: đ10, đ9, đ8
Có đơn đ11 chen vào đầu
Lúc đọc trang 2:  [đ11, đ10, đ9, đ8 ...] ← OFFSET 3 lấy: đ8, đ7, đ6
```

`đ8` xuất hiện ở **cả hai trang**. Với danh sách xả xuống liên tục (infinite scroll), người dùng thấy bản ghi lặp lại.

## Cách 2 — cursor

Thay vì "bỏ qua N dòng", nói "cho tôi những dòng **sau** dòng này":

```http
GET /api/orders?limit=20
GET /api/orders?limit=20&cursor=eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTE4VDA5OjAwOjAwWiIsImlkIjoibzg4MSJ9
```

```sql
-- Cursor giải mã ra { createdAt, id }
SELECT * FROM orders
WHERE (created_at, id) < ('2026-08-18T09:00:00Z', 'o-881')
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Hai điểm quan trọng:

- **So sánh bộ đôi `(created_at, id)`**, không chỉ `created_at`. Nhiều đơn có thể trùng mốc thời gian tới từng giây; thiếu `id` để phá thế hoà là mất bản ghi hoặc lặp vô hạn.
- Index trên `(created_at DESC, id DESC)` biến câu này thành *nhảy tới đúng chỗ rồi đọc 20 dòng* — chi phí **không đổi** dù ở trang 1 hay trang 10.000.

Đánh đổi: không nhảy được tới "trang 47", và không hiện được tổng số trang.

## Chọn cái nào

| | offset | cursor |
|---|---|---|
| Bảng admin có số trang | ✅ | ❌ |
| Infinite scroll / feed | ❌ | ✅ |
| Dữ liệu thay đổi liên tục | ❌ | ✅ |
| Cần tổng số bản ghi | ✅ | ❌ (đếm riêng) |
| Dữ liệu rất lớn | ❌ | ✅ |

## Lọc và sắp xếp

Query param là danh sách **cho phép**, không phải cột tự do:

```ts
// ❌ Lỗ hổng SQL injection và lộ mọi cột nội bộ
const orderBy = searchParams.get('sort')
const sql = `SELECT * FROM orders ORDER BY ${orderBy}`

// ✅ Chỉ những cột đã duyệt
const CHO_PHEP = { createdAt: 'created_at', total: 'total', status: 'status' } as const

function cotSapXep(raw: string | null): string {
  const [ten, huong] = (raw ?? 'createdAt:desc').split(':')
  const cot = CHO_PHEP[ten as keyof typeof CHO_PHEP]
  if (cot === undefined) throw new BadRequest(`Không sắp xếp được theo "${ten}"`)
  return `${cot} ${huong === 'asc' ? 'ASC' : 'DESC'}`
}
```

Xem [[sql-injection]] về lý do không nội suy chuỗi vào SQL.

Hình dạng response:

```json
{
  "data": [ ... ],
  "meta": { "limit": 20, "nextCursor": "eyJ...", "hasMore": true }
}
```

`hasMore` lấy bằng cách **hỏi `limit + 1` dòng** rồi cắt bớt một — rẻ hơn hẳn `COUNT(*)` trên bảng lớn.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không có `limit` mặc định | Một request kéo cả bảng, hết RAM | Mặc định 20 |
| Không có trần cho `limit` | `?limit=999999` thành DoS | Trần 100 |
| Offset lớn trên bảng lớn | Truy vấn chậm dần tới mức timeout | Chuyển sang cursor |
| Cursor chỉ dùng timestamp | Mất bản ghi khi trùng mốc thời gian | Bộ đôi `(time, id)` |
| Nội suy tên cột từ query param | SQL injection | Danh sách cho phép |
| `COUNT(*)` ở mọi request | Full scan mỗi lần lật trang | `limit + 1` để biết `hasMore` |
| Sắp xếp không có tie-breaker | Thứ tự nhảy ngẫu nhiên giữa các lần gọi | Thêm `id` vào `ORDER BY` |

## Ghi nhớ

- Luôn có `limit` mặc định **và** mức trần.
- Offset trùng/nhảy bản ghi khi dữ liệu đổi, và chậm dần theo số trang.
- Cursor dùng bộ đôi `(cột sắp xếp, id)` và cần index tương ứng.
- Tên cột trong `ORDER BY` phải qua danh sách cho phép.

## Tự kiểm tra

1. Vì sao `OFFSET 100000` chậm dù đã có index trên cột sắp xếp?
2. Cursor chỉ chứa `created_at`, có 5 đơn cùng một giây. Sai gì?
3. Vì sao `limit + 1` tốt hơn `COUNT(*)` để biết còn dữ liệu?
