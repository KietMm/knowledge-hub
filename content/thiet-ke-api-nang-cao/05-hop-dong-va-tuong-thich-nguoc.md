---
title: Hợp đồng API và tương thích ngược
slug: hop-dong-va-tuong-thich-nguoc
summary: Thay đổi nào an toàn, thay đổi nào phá vỡ client, và cách gỡ bỏ một trường mà không làm hỏng ai.
level: nang-cao
tags: [api, versioning, hop-dong, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** phân loại được một thay đổi API là an toàn hay phá vỡ, và gỡ bỏ trường cũ theo quy trình.

## Ý tưởng chính

Khi API của bạn có client bạn **không kiểm soát** — app di động đã cài, đối tác, script của người dùng — thì API không còn là mã. Nó là **hợp đồng**.

Và với hợp đồng, câu hỏi không phải "cách nào đẹp hơn" mà là: **thay đổi này có làm ai đang chạy bị hỏng không?**

## Mental model

Hãy nghĩ tới **đổi ổ cắm điện trong toà nhà cho thuê**.

> **Thêm một ổ cắm mới ở tường** — không ai bị ảnh hưởng. Ai cần thì dùng.
>
> **Đổi ổ cũ sang chuẩn khác** — mọi thiết bị đang cắm đều hỏng, cùng lúc, và người thuê không hề được hỏi ý kiến.
>
> Muốn đổi thật thì: lắp ổ mới **bên cạnh**, dán thông báo, cho thời hạn vài tháng, quan sát xem còn ai dùng ổ cũ, rồi mới tháo.

Ba bước đó — thêm cái mới, báo trước, **đo xem còn ai dùng**, rồi mới gỡ — là toàn bộ quy trình gỡ bỏ an toàn. Bước "đo" là bước hay bị bỏ nhất và là bước duy nhất cho bạn biết khi nào gỡ được.

## Ví dụ nhỏ

```json
// An toàn: thêm trường mới
{ "id": 1, "ten": "An", "email": "an@vd.com" }

// Phá vỡ: đổi tên trường
{ "id": 1, "hoTen": "An" }     // client cũ đọc `ten` → undefined
```

## Code chạy thế nào

**Bảng phân loại — dùng khi review mọi thay đổi API:**

```text
AN TOÀN (client cũ vẫn chạy)
  ✅ Thêm trường mới vào phản hồi
  ✅ Thêm tham số TUỲ CHỌN vào request
  ✅ Thêm endpoint mới
  ✅ Thêm giá trị enum mới — CHỈ KHI client được yêu cầu
     bỏ qua giá trị lạ; nếu không, đây là thay đổi phá vỡ
  ✅ Nới lỏng ràng buộc (cho phép chuỗi dài hơn)

PHÁ VỠ (client cũ hỏng)
  ❌ Xoá hoặc đổi tên trường
  ❌ Đổi kiểu dữ liệu — kể cả "1" thành 1
  ❌ Thêm tham số BẮT BUỘC
  ❌ Siết ràng buộc (giảm độ dài tối đa)
  ❌ Đổi ý nghĩa của một trường mà giữ nguyên tên  ← nguy hiểm nhất
  ❌ Đổi mã trạng thái trả về
  ❌ Đổi thứ tự mặc định của danh sách
```

Dòng "đổi ý nghĩa mà giữ tên" đáng dừng lại: nó **không** gây lỗi ở client — nó gây **kết quả sai**. Ví dụ `soLuong` từ nghĩa "đã đặt" đổi thành "còn lại". Không ai báo lỗi; báo cáo thì sai.

**Nguyên tắc Postel — và giới hạn của nó:**

```text
"Nghiêm khắc với thứ bạn gửi, khoan dung với thứ bạn nhận."

Áp dụng: client PHẢI bỏ qua trường lạ trong phản hồi.
⇒ Nếu client dùng `.strict()` cho phản hồi từ server,
  thì thêm một trường mới cũng làm nó hỏng — và bên server
  không có cách nào thêm gì nữa.

Nhưng KHOAN DUNG CÓ GIỚI HẠN:
  Ở phía SERVER nhận dữ liệu ghi, `.strict()` là ĐÚNG —
  chấp nhận trường lạ là mở đường cho gán đè thuộc tính
  ([[xac-thuc-dau-vao-va-bien]]).

⇒ Khoan dung khi ĐỌC phản hồi. Nghiêm khắc khi NHẬN dữ liệu ghi.
```

## Cú pháp

**Gỡ bỏ một trường — quy trình bốn bước:**

```text
① THÊM trường mới, GIỮ trường cũ. Cả hai cùng trả về.
   { "ten": "An", "hoTen": "An" }

② ĐÁNH DẤU deprecated
   - tài liệu
   - header `Deprecation: true` và `Sunset: <ngày>`
   - thông báo trực tiếp tới đối tác

③ ĐO — bước quyết định
   Ghi log mỗi khi trường cũ được ĐỌC (hoặc mỗi khi client
   không gửi trường mới). Theo dõi:
     - còn bao nhiêu request dùng nó
     - client nào, phiên bản nào
   ⇒ Đây là dữ liệu duy nhất trả lời được "gỡ được chưa".

④ GỠ — chỉ khi ③ về gần 0, và đã qua thời hạn đã báo.
```

```text
Bước ③ không có thì bước ④ là đoán.
Và với app di động, "gần 0" có thể mất nhiều tháng —
người dùng không cập nhật app.
```

**Phiên bản hoá — ba cách, và cách thứ tư thường tốt hơn:**

```text
① URL      /v1/nguoi-dung, /v2/nguoi-dung
   + Rõ ràng, dễ định tuyến, dễ nói chuyện
   − Phải duy trì song song hai bộ mã

② Header   Accept: application/vnd.api.v2+json
   + URL sạch
   − Khó test bằng tay, dễ quên

③ Query    ?version=2
   + Đơn giản
   − Lẫn với tham số nghiệp vụ

④ KHÔNG PHIÊN BẢN — chỉ thay đổi tương thích ngược
   Đây là cách rẻ nhất, và khả thi hơn nhiều người nghĩ:
   phần lớn thay đổi CÓ THỂ làm theo kiểu cộng thêm.
```

Nâng phiên bản là quyết định đắt: nó nhân đôi bề mặt phải bảo trì, test và tài liệu. Nên nó xứng đáng khi thay đổi thật sự lớn — không phải khi bạn muốn đổi tên một trường ([[loi-versioning-va-tai-lieu]]).

**Hợp đồng phải được kiểm tự động:**

```text
□ OpenAPI / .proto trong repo, sinh từ mã hoặc kiểm ngược lại mã
□ CI so schema mới với schema cũ, CHẶN thay đổi phá vỡ
  (buf breaking cho protobuf, oasdiff cho OpenAPI)
□ Contract test: client và server cùng kiểm một hợp đồng chung

Không có bước tự động thì "tương thích ngược" phụ thuộc vào
việc người review có nhớ bảng phân loại ở trên hay không.
```

Đây là cùng nguyên lý với việc để linter giữ ranh giới module: **quy tắc do máy giữ mới thật sự tồn tại** ([[cau-truc-du-an-va-phu-thuoc]]).

## Tại sao cần nó

Vì cái giá của một thay đổi phá vỡ không cân xứng:

```text
Bạn tiết kiệm: vài giờ, vì không phải giữ trường cũ.
Người khác trả: mọi client phải sửa và phát hành lại,
                app di động phải chờ người dùng cập nhật,
                đối tác phải xếp lịch cho việc họ không muốn làm.

Và với app di động: người dùng KHÔNG BAO GIỜ cập nhật hết.
Luôn còn một phần trăm chạy bản cũ, có thể nhiều năm.
```

**Bốn thứ nên có ngay từ API đầu tiên:**

```text
□ Trường có thể null thì khai rõ trong hợp đồng ngay từ đầu
  — đổi từ "luôn có" sang "có thể null" là thay đổi phá vỡ
□ Danh sách LUÔN bọc trong object: { "items": [...] }
  — trả mảng trần thì không thêm được `total`, `nextCursor` sau này
□ Enum: khai rõ client phải bỏ qua giá trị lạ
□ Thứ tự mặc định của danh sách phải xác định và không đổi
```

Bốn thứ này gần như miễn phí lúc thiết kế, và rất đắt để thêm sau.

## So sánh

| Thay đổi | An toàn? | Vì sao |
|---|---|---|
| Thêm trường vào phản hồi | ✅ | client cũ bỏ qua |
| Thêm tham số tuỳ chọn | ✅ | client cũ không gửi |
| Đổi tên trường | ❌ | client cũ nhận `undefined` |
| `"1"` → `1` | ❌ | kiểu đổi |
| Thêm trường bắt buộc | ❌ | client cũ không gửi |
| Đổi ý nghĩa, giữ tên | ❌❌ | **không lỗi, chỉ sai** |

## Dễ nhầm

**1. Đổi tên trường "cho đẹp".**

**2. Đổi ý nghĩa mà giữ tên.** Không ai báo lỗi, dữ liệu thì sai.

**3. Thêm tham số bắt buộc.**

**4. Trả mảng trần cho danh sách.** Không thêm được metadata sau này.

**5. Gỡ trường mà không đo còn ai dùng.**

**6. Không có bước deprecated và thời hạn.**

**7. Client dùng `.strict()` cho phản hồi.** Server không thêm được gì nữa.

**8. Server không `.strict()` cho dữ liệu ghi.** Gán đè thuộc tính.

**9. Nâng phiên bản cho thay đổi nhỏ.** Nhân đôi bề mặt bảo trì.

**10. Không kiểm tương thích trong CI.** Phụ thuộc trí nhớ người review.

## Mẹo nhớ

> **CỘNG THÊM thì an toàn. XOÁ, ĐỔI TÊN, ĐỔI KIỂU thì phá vỡ.**
>
> **Đổi Ý NGHĨA mà giữ tên là tệ nhất — không lỗi, chỉ sai.**
>
> **Trước khi gỡ phải ĐO còn ai dùng. Không đo thì là đoán.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm thay đổi an toàn và năm thay đổi phá vỡ?
2. Vì sao "đổi ý nghĩa, giữ tên" nguy hiểm hơn xoá trường?
3. Bốn bước gỡ bỏ một trường, bước nào hay bị bỏ?
4. Khoan dung khi nào và nghiêm khắc khi nào?
5. Bốn thứ nên có ngay từ API đầu tiên?

## Tự viết lại

API đang trả `{ "ten": "Nguyễn An" }`, cần tách thành `hoTen` và `tenGoi`. Có app di động và ba đối tác đang dùng.

Không nhìn lại, viết:

```text
① kế hoạch bốn bước
② phản hồi API ở mỗi giai đoạn
③ cách đo còn ai dùng trường cũ
④ mốc thời gian thực tế
```

Tự kiểm: mốc ở ④ của bạn tính từ đâu — từ lúc bạn thông báo, hay từ lúc lượng dùng trường cũ về gần 0?

## Thử sức

Đội đổi `soLuong` trong API từ nghĩa "số đã đặt" sang "số còn lại". Không client nào báo lỗi. Ba tuần sau, kế toán phát hiện báo cáo tồn kho sai từ đúng ngày đó.

Ba câu để trả lời: vì sao không có lỗi nào; đáng lẽ nên làm thế nào; và bạn thêm gì vào quy trình để loại thay đổi này bị chặn ở CI hoặc ở review. Câu khó nhất: kiểm tra tự động **có bắt được** thay đổi kiểu này không — nếu không, cơ chế nào bắt được?
