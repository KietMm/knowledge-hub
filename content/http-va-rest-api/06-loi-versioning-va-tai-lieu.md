---
title: Lỗi, versioning và tài liệu API
slug: loi-versioning-va-tai-lieu
summary: Một hình dạng lỗi dùng chung, khi nào cần lên phiên bản, và thứ gì thật sự phá vỡ client.
level: trung-cap
tags: [rest, api-design, versioning, error-handling]
---

> **Sau bài này bạn sẽ:** thiết kế được hình dạng lỗi mà client xử lý bằng code, và phân biệt thay đổi nào phá vỡ tương thích.

## Lỗi phải máy đọc được, không chỉ người đọc được

```json
// ❌ Client chỉ còn cách so sánh chuỗi tiếng Việt
{ "error": "Email đã được sử dụng" }
```

Đổi câu chữ một lần là mọi client vỡ. Client cũng không phân biệt được lỗi nào nên hiện ở ô nhập nào.

```json
// ✅ Mã cho máy, thông điệp cho người, chi tiết cho từng ô nhập
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      { "field": "email", "code": "ALREADY_TAKEN", "message": "Email đã được dùng" },
      { "field": "age",   "code": "OUT_OF_RANGE",  "message": "Tuổi phải từ 18" }
    ],
    "requestId": "req_8f14e45f"
  }
}
```

Bốn thứ đáng có:

- **`code`** — hằng số, không bao giờ đổi. Client `switch` trên nó.
- **`message`** — cho người đọc, tự do đổi.
- **`details`** — mảng theo từng trường, để form gắn lỗi vào đúng ô.
- **`requestId`** — cùng id có trong log server. Người dùng đọc cho support, support tìm ra đúng request trong vài giây.

Quan trọng: **không để lộ nội bộ**. Stack trace, câu SQL, tên bảng trong response là quà cho người tấn công — xem [[thu-vien-log-va-ssrf]].

```ts
// Lỗi ngoài dự kiến: ghi đầy đủ vào log, trả ra ngoài đúng requestId
catch (loi) {
  const requestId = crypto.randomUUID()
  logger.error({ requestId, loi })       // stack trace ở lại đây
  return Response.json(
    { error: { code: 'INTERNAL', message: 'Có lỗi xảy ra', requestId } },
    { status: 500 },
  )
}
```

## Thay đổi nào phá vỡ client

Đây là câu hỏi thật, "có nên lên v2 không" chỉ là hệ quả.

**Phá vỡ:**
- Xoá hoặc đổi tên field trong response
- Đổi kiểu dữ liệu (`"total": 100` → `"total": "100"`)
- Thêm field **bắt buộc** vào request
- Thu hẹp giá trị được nhận
- Đổi mã trạng thái của một trường hợp đã có
- Đổi ý nghĩa của field mà giữ nguyên tên — loại tệ nhất, vì không ai phát hiện được bằng test

**Không phá vỡ:**
- Thêm field mới vào response
- Thêm field **tuỳ chọn** vào request
- Thêm endpoint mới
- Thêm giá trị mới vào enum — *chỉ khi* client đã xử lý giá trị lạ một cách an toàn

Điều kiện cuối là lý do client nên **bỏ qua field không biết** thay vì ném lỗi. Một client nghiêm khắc quá mức biến mọi bổ sung thành thay đổi phá vỡ.

## Versioning khi buộc phải

```
/api/v1/users          ← trong đường dẫn: dễ thấy, dễ route, dễ test bằng curl
Accept: application/vnd.example.v2+json   ← trong header: URL sạch, khó debug hơn
```

Chọn đường dẫn cho hầu hết trường hợp. Cái quan trọng hơn cách đặt là **kế hoạch khai tử**:

```http
HTTP/1.1 200 OK
Deprecation: version="v1"
Sunset: Sat, 01 Nov 2026 00:00:00 GMT
Link: </api/v2/users>; rel="successor-version"
```

Không có `Sunset` thì v1 sống mãi và bạn bảo trì hai API vĩnh viễn.

Cách tránh versioning tốt nhất là **mở rộng thay vì thay thế**: thêm field mới, giữ field cũ trả về song song một thời gian, đo xem còn ai dùng field cũ rồi mới bỏ.

## Tài liệu sinh từ code

Tài liệu viết tay lệch khỏi code trong vòng vài tuần. Sinh nó từ chính schema đang dùng để validate:

```ts
import { z } from 'zod'

export const TaoUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'member']).default('member'),
})
// Cùng schema này: validate ở runtime + sinh OpenAPI + sinh type cho client.
// Một nguồn sự thật, không có cách nào lệch nhau.
```

Đây đúng cách repo này làm: `src/lib/db/schema.ts` là nguồn duy nhất cho cả kiểu TypeScript lẫn kiểm tra runtime.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Lỗi chỉ có `message` tiếng Việt | Đổi câu chữ là client vỡ | Thêm `code` bất biến |
| Trả stack trace/câu SQL ra ngoài | Lộ cấu trúc nội bộ cho người tấn công | Log nội bộ, trả `requestId` |
| Mỗi endpoint một hình dạng lỗi | Client viết parser riêng từng chỗ | Một hình dạng chung |
| Lên `v2` cho mọi thay đổi nhỏ | Bảo trì N phiên bản song song | Chỉ khi thật sự phá vỡ |
| Ra `v2` mà không hẹn ngày tắt `v1` | Nợ kỹ thuật vĩnh viễn | Header `Sunset` |
| Client ném lỗi khi thấy field lạ | Mọi bổ sung thành thay đổi phá vỡ | Bỏ qua field không biết |
| Tài liệu viết tay | Lệch khỏi thực tế sau vài tuần | Sinh từ schema |

## Ghi nhớ

- Lỗi cần `code` cho máy, `message` cho người, `details` cho từng trường, `requestId` để tra log.
- Không bao giờ để stack trace ra ngoài.
- Thêm field không phá vỡ; xoá/đổi tên/đổi kiểu thì có.
- Ra phiên bản mới phải kèm ngày tắt phiên bản cũ.

## Tự kiểm tra

1. Vì sao `code` phải là hằng số chứ không phải chính `message`?
2. `"total": 100` đổi thành `"total": "100"`. Phá vỡ hay không, vì sao?
3. `requestId` giúp gì mà log server một mình không giúp được?
