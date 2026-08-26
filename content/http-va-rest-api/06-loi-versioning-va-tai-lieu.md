---
title: Lỗi, versioning và tài liệu API
slug: loi-versioning-va-tai-lieu
summary: Một hình dạng lỗi dùng chung, khi nào cần lên phiên bản, và thứ gì thật sự phá vỡ client.
level: trung-cap
tags: [rest, api-design, versioning, error-handling]
khung: v2
---

> **Sau bài này bạn sẽ:** thiết kế được một hình dạng lỗi dùng cho cả API, và phân biệt thay đổi nào **thật sự** phá vỡ client.

## Ý tưởng chính

Lỗi API phải **máy đọc được**, không chỉ người đọc được. Client cần quyết định: thử lại? hiện thông báo gì? gắn lỗi vào ô nhập nào?

Một chuỗi tiếng Việt không trả lời được câu nào trong ba câu đó.

## Mental model

Hãy nghĩ tới **giấy báo từ chối hồ sơ ở cơ quan hành chính**.

> Tờ giấy chỉ ghi *"hồ sơ không hợp lệ"* buộc bạn phải quay lại hỏi, và nhân viên phải đọc lại từ đầu.
>
> Tờ giấy tốt ghi: **mã lỗi** (để tra), **lỗi ở mục nào**, **cần sửa gì**, và **mã hồ sơ** để lần sau nhắc tới cho nhanh.

Bốn thứ đó tương ứng chính xác với bốn phần của một phản hồi lỗi tốt: `code`, `fields`, `message`, `requestId`.

## Ví dụ nhỏ

```json
// ❌ Máy không làm gì được với thứ này
{ "error": "Có lỗi xảy ra" }
```

```json
// ✅
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ",
    "fields": {
      "email": "Email không đúng định dạng",
      "tuoi": "Phải là số dương"
    },
    "requestId": "req_01H9X..."
  }
}
```

## Code chạy thế nào

Bốn trường, mỗi trường phục vụ một người dùng khác nhau:

```text
code       → CODE, không phải chữ tiếng Việt
             client so sánh bằng ===; dịch ngôn ngữ ở phía client
             đổi message không phá vỡ ai; đổi code thì có

message    → cho người phát triển đọc lúc gỡ lỗi
             KHÔNG hiện thẳng cho người dùng cuối

fields     → để gắn lỗi vào đúng ô nhập trên form

requestId  → nối phản hồi này với log phía server
             người dùng gửi mã này, bạn tìm ra đúng request trong hàng triệu dòng log
```

`requestId` là trường bị bỏ qua nhiều nhất và có giá trị vận hành cao nhất. Không có nó, câu *"API bị lỗi lúc 3 giờ chiều"* gần như không truy được.

Và một quy tắc bảo mật: **không lộ chi tiết nội bộ**.

```json
// ❌ Lộ cấu trúc cơ sở dữ liệu và cả stack trace
{ "error": "PostgresError: duplicate key value violates unique constraint \"users_email_key\"" }

// ✅
{ "error": { "code": "EMAIL_DA_TON_TAI", "message": "Email đã được sử dụng" } }
```

Chi tiết đầy đủ **ghi vào log**, không gửi cho client.

## Cú pháp

**Thay đổi nào phá vỡ client** — bảng này quyết định bạn có cần lên phiên bản hay không:

```text
❌ PHÁ VỠ
  · Xoá hoặc đổi tên một trường
  · Đổi kiểu dữ liệu           ("123" → 123)
  · Thêm trường BẮT BUỘC ở request
  · Thu hẹp giá trị cho phép   (bỏ bớt giá trị enum)
  · Đổi ý nghĩa của một trường (giá: đồng → nghìn đồng)
  · Đổi mã trạng thái trả về cho cùng tình huống

✅ KHÔNG phá vỡ
  · Thêm trường MỚI vào response
  · Thêm endpoint mới
  · Thêm tham số TUỲ CHỌN
  · Thêm giá trị mới vào enum*
```

Dấu * ở dòng cuối: chỉ đúng nếu client được viết để **bỏ qua giá trị lạ**. Client dùng `switch` không có nhánh `default` sẽ vỡ khi bạn thêm trạng thái mới — nên hãy ghi rõ điều này trong tài liệu ngay từ đầu.

Điều đáng nhớ nhất: **thêm thì an toàn, bớt và đổi thì không.** Phần lớn thay đổi có thể được thiết kế thành "thêm".

## Tại sao cần nó

Vì lên phiên bản là việc **đắt**: bạn phải chạy song song hai bản, sửa lỗi hai lần, test hai lần. Nên thứ tự ưu tiên là:

```text
① Thiết kế thay đổi thành "thêm", không phải "đổi"
② Giữ trường cũ song song trường mới, đánh dấu deprecated
③ Chỉ khi không còn cách nào → lên phiên bản
```

Cách ② trong thực tế:

```json
{
  "ten": "An",           // cũ — vẫn giữ
  "hoTen": "Nguyễn An"   // mới
}
```

```http
Deprecation: true
Sunset: Wed, 31 Dec 2026 23:59:59 GMT
Link: <https://docs.example.com/migration>; rel="deprecation"
```

Ba header đó cho client biết **khi nào** trường cũ biến mất và **đọc gì** để chuyển đổi — thay vì phát hiện vào ngày nó ngừng hoạt động.

Khi buộc phải lên phiên bản, ba cách:

| Cách | Ví dụ | Đánh đổi |
|---|---|---|
| Trong URL | `/v1/don-hang` | Rõ ràng, dễ định tuyến, cache tốt — **phổ biến nhất** |
| Header | `Accept: application/vnd.api.v2+json` | URL sạch, nhưng khó test bằng trình duyệt |
| Query | `?version=2` | Dễ lẫn với tham số nghiệp vụ |

Với API nội bộ hoặc API cho app di động của chính bạn, đường đơn giản nhất thường là: **không versioning, chỉ thêm không bớt**, và bỏ trường cũ khi số người dùng bản cũ về 0.

## So sánh

**Tài liệu phải sinh từ code**, không viết tay:

```ts
const DonHangSchema = z.object({
  id: z.string(),
  tong: z.number().int().describe('Tổng tiền, đơn vị đồng'),
})
// → sinh OpenAPI → sinh trang tài liệu → sinh client TypeScript
```

Lý do rất đơn giản: **tài liệu viết tay luôn lỗi thời**. Không phải vì người ta lười — mà vì không có gì bắt nó phải đúng. Tài liệu sinh từ chính schema đang chạy thì không thể lệch.

## Dễ nhầm

**1. `code` là chuỗi tiếng Việt.** Đổi câu chữ cho hay hơn là phá vỡ client đang so sánh chuỗi đó.

**2. Hiện `message` thẳng cho người dùng cuối.** Nó dành cho lập trình viên; người dùng cần câu khác, và cần đúng ngôn ngữ của họ.

**3. Không có `requestId`.** Hỗ trợ khách hàng trở thành trò đoán.

**4. Lộ stack trace ra ngoài.** Vừa lộ cấu trúc nội bộ, vừa lộ đường tấn công — cùng chủ đề với [[thu-vien-log-va-ssrf]].

**5. Lên phiên bản cho mọi thay đổi nhỏ.** Bạn nhận về `/v7` sau một năm và không ai biết mỗi bản khác nhau chỗ nào.

**6. Xoá trường cũ ngay khi có trường mới.** Client di động cần **hàng tháng** để người dùng cập nhật app — trên App Store bạn không ép được ai.

**7. Tài liệu viết tay.** Sáu tháng sau nó mô tả một API không còn tồn tại.

## Mẹo nhớ

> **`code` cho máy, `message` cho lập trình viên, `fields` cho form, `requestId` cho hỗ trợ.**
>
> **Thêm thì an toàn; bớt và đổi thì phá vỡ.**
>
> **Tài liệu viết tay luôn lỗi thời — sinh từ code.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn trường của một phản hồi lỗi tốt, và mỗi trường phục vụ ai?
2. Vì sao `code` không được là chuỗi tiếng Việt?
3. Kể ba thay đổi **phá vỡ** và ba thay đổi **không phá vỡ**.
4. Ba bước ưu tiên trước khi quyết định lên phiên bản?
5. Vì sao không được xoá trường cũ ngay khi có trường mới, đặc biệt với app di động?

## Tự viết lại

Không nhìn lại phần trên, thiết kế phản hồi lỗi cho ba tình huống:

```text
a) Form đăng ký: email sai định dạng và mật khẩu quá ngắn
b) Người dùng cố xoá đơn hàng của người khác
c) Cơ sở dữ liệu mất kết nối
```

Tự kiểm: mã trạng thái HTTP của từng trường hợp, và trường hợp nào client **nên** tự thử lại?

## Thử sức

API của bạn có 200.000 người dùng app di động. Bạn cần đổi trường `gia` từ *nghìn đồng* sang *đồng* (nhân 1000).

Đây là thay đổi phá vỡ **nguy hiểm nhất**: kiểu dữ liệu không đổi, nên client cũ vẫn chạy — chỉ là hiển thị giá sai gấp 1000 lần. Lập kế hoạch chuyển đổi **không có ngày nào hiển thị sai**, và nói rõ bạn biết khi nào an toàn để xoá trường cũ.
