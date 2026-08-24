---
title: Nợ kỹ thuật và refactor
slug: no-ky-thuat-va-refactor
summary: Phân biệt nợ có chủ ý với code xấu, đo nó bằng số, và thương lượng để được trả.
level: trung-cap
tags: [dan-dat, no-ky-thuat, refactor, chat-luong]
---

> **Sau bài này bạn sẽ:** nói về nợ kỹ thuật bằng ngôn ngữ mà người không phải dev hiểu và đồng ý, và refactor mà không dừng phát triển.

## Không phải mọi code xấu là nợ kỹ thuật

Phép so sánh "nợ" chỉ đúng khi có **vay có chủ ý**: bạn chọn cách nhanh hơn để ra hàng sớm, biết mình sẽ trả lãi. Đó là một quyết định kinh doanh hợp lệ.

Bốn thứ hay bị gộp lẫn nhưng cần xử lý khác nhau:

| Loại | Nguyên nhân | Xử lý |
|---|---|---|
| **Nợ có chủ ý** | Chọn nhanh để kịp hạn, biết sẽ trả | Ghi lại, lên kế hoạch trả |
| **Nợ do học được thêm** | Thiết kế đúng với hiểu biết lúc đó; giờ hiểu hơn | Bình thường, refactor dần |
| **Code xấu** | Thiếu kỹ năng hoặc thiếu cẩn thận | Đào tạo, review, chuẩn |
| **Trôi dạt** | Yêu cầu đổi, code không được cập nhật theo | Refactor định kỳ |

Gọi mọi thứ là "nợ kỹ thuật" làm mất tác dụng của từ này. Nói "chúng ta có nợ kỹ thuật" trong khi thực chất là "code này viết kém" thì bạn đang tránh vấn đề thật, và giải pháp (đào tạo) sẽ không bao giờ được đặt ra.

## Đo bằng thứ người ngoài quan tâm

Đây là chỗ hầu hết đề nghị refactor thất bại:

```
❌ "Code này rối, cần refactor."
❌ "Chúng ta nợ kỹ thuật nhiều lắm."
❌ "File này 2000 dòng."
```

Không ai ngoài nhóm dev quan tâm ba câu đó, vì chúng không nói về **hệ quả**. Nói bằng thời gian, rủi ro, và tiền:

```
✅ "Mọi thay đổi liên quan giá đều phải sửa 4 chỗ và chúng ta đã sai 3 lần trong
   2 tháng (sự cố 12/6, 3/7, 28/7). Gom về một chỗ mất 3 ngày, sau đó mỗi thay
   đổi giá còn 1 ngày thay vì 3."

✅ "Module thanh toán không có test. Mỗi lần sửa mất 2 ngày kiểm tra thủ công.
   Viết test mất 5 ngày, và tiết kiệm ~2 ngày mỗi lần sửa — chúng ta sửa nó
   khoảng 2 lần một tháng."
```

Số liệu bạn đã có sẵn, chỉ cần lấy ra:

- **Bao nhiêu sự cố** liên quan tới vùng code này (từ hậu kiểm — xem [[su-co-va-hau-kiem]])
- **Bao lâu** để hoàn thành một thay đổi điển hình ở đây, so với chỗ khác
- **Bao nhiêu lần** vùng này bị sửa trong 3 tháng qua

```bash
# File bị sửa nhiều nhất trong 3 tháng — kết hợp với "file hay gây bug"
# sẽ cho ra danh sách ưu tiên refactor đáng tin hơn cảm giác
git log --since='3 months ago' --name-only --pretty=format: \
  | grep -v '^$' | sort | uniq -c | sort -rn | head -20
```

**Chỉ refactor chỗ hay bị sửa.** Code xấu mà hai năm không ai chạm tới thì nó không gây thiệt hại gì — refactor nó là công sức đổ vào chỗ không sinh lợi.

## Ba cách trả nợ

**1. Trả kèm theo (mặc định).** Sửa tính năng ở vùng nào thì dọn vùng đó một chút — quy tắc **để lại chỗ đó sạch hơn lúc mình đến**. Không cần xin phép ai, và nó tự nhắm vào chỗ hay bị sửa nhất.

Giới hạn: chỉ dọn phạm vi mình đang chạm. Đừng biến một PR sửa bug thành PR refactor 40 file — xem [[review-code-va-nang-nguoi]].

**2. Trả theo hạn mức.** Dành một tỉ lệ cố định mỗi sprint (thường 10–20%). Ưu điểm là nó **liên tục** và không cần thương lượng lại mỗi lần.

Rủi ro: hạn mức là chỗ đầu tiên bị cắt khi gấp. Bảo vệ nó bằng cách gắn với error budget — hết ngân sách thì việc độ tin cậy **được ưu tiên theo quy tắc đã thoả thuận**, không phải theo tranh luận. Xem [[slo-va-error-budget]].

**3. Trả thành dự án riêng.** Chỉ dành cho nợ lớn: đổi framework, tách module, đổi tầng dữ liệu. Cần bảo vệ bằng phạm vi rõ và tiêu chí xong rõ.

## Refactor mà không dừng phát triển

Sai lầm kinh điển: **viết lại từ đầu**. Nó gần như luôn thất bại vì trong lúc bạn viết lại, hệ thống cũ vẫn phải chạy và vẫn thay đổi — bạn đang đuổi theo một mục tiêu di động, với hai codebase phải bảo trì.

Dùng **strangler fig**: dựng cái mới bên cạnh cái cũ, chuyển dần lưu lượng.

```ts
// 1. Interface bọc cái cũ
interface KhoGia { tinh(don: Don): Promise<number> }

// 2. Cái mới cài cùng interface
class GiaCu implements KhoGia { ... }
class GiaMoi implements KhoGia { ... }

// 3. Chuyển dần, và trong giai đoạn đầu chạy CẢ HAI để so kết quả.
//    Bước này là thứ cho bạn tự tin thật, thay vì hy vọng.
async function tinhGia(don: Don): Promise<number> {
  const cu = await giaCu.tinh(don)
  if (await flags.bat('gia-moi', { orderId: don.id })) {
    const moi = await giaMoi.tinh(don)
    if (moi !== cu) logger.warn({ event: 'gia.lech', don: don.id, cu, moi })
    return moi
  }
  return cu
}
```

Bốn tính chất khiến cách này an toàn: mỗi bước nhỏ và merge được; rollback là tắt một flag; **so sánh song song** cho bằng chứng thay vì niềm tin; và tính năng mới vẫn ra được trong lúc chuyển.

Điều kiện tiên quyết: **có test trước khi refactor**. Không có test thì bạn không đang refactor mà đang viết lại và hy vọng — xem [[test-de-lam-gi-va-test-cai-gi]].

## Nói không với nợ mới

Rẻ hơn nhiều so với trả nợ cũ. Ba dạng nên chặn:

- **"Tạm thời"** — không có gì tạm thời trong code. Nếu buộc phải làm tạm, viết ADR kèm ngày hết hạn và một test sẽ đỏ vào ngày đó.
- **Copy-paste tầng thứ ba** — hai chỗ trùng thì còn chấp nhận được; ba chỗ nghĩa là sẽ thành mười.
- **Bỏ test vì gấp** — đây là món vay có lãi cao nhất, vì nó làm mọi thay đổi sau đó đắt hơn.

Và một điều quan trọng: **nợ có chủ ý phải được ghi lại ngay lúc vay.** Nợ không được ghi thì sáu tháng sau không ai biết đó là quyết định có ý thức hay là sai sót — và không ai dám sửa vì không biết vì sao nó như vậy.

```ts
// NỢ (18/8/2026, kietakin): tính thuế hard-code 10% để kịp phát hành.
// Vì sao: bảng thuế theo tỉnh chưa có dữ liệu, hạn phát hành 20/8.
// Trả khi: có bảng thuế — dự kiến Q4. Xem ADR 0012.
const THUE = 0.1
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Gọi mọi code xấu là "nợ kỹ thuật" | Vấn đề thật (kỹ năng) không được nêu | Phân loại bốn dạng |
| Nói "code rối, cần refactor" | Không ai ngoài nhóm đồng ý | Nói bằng thời gian, sự cố, tiền |
| Refactor chỗ không ai chạm tới | Công sức không sinh lợi | Ưu tiên theo `git log` |
| Viết lại từ đầu | Đuổi mục tiêu di động, hai codebase | Strangler fig |
| Refactor khi chưa có test | Không phải refactor, là viết lại và hy vọng | Test trước |
| Không so sánh song song | Không có bằng chứng, chỉ có hy vọng | Chạy cả hai, log chỗ lệch |
| Hạn mức refactor bị cắt khi gấp | Nợ chỉ tăng | Gắn với error budget |
| Nợ có chủ ý không ghi lại | Sau này không ai dám sửa | Comment NỢ + ADR + ngày trả |
| Biến PR sửa bug thành refactor 40 file | Không review được | Giữ trong phạm vi mình chạm |

## Ghi nhớ

- Nợ = vay có chủ ý. Code xấu là vấn đề kỹ năng, cần giải pháp khác.
- Đo bằng thời gian, sự cố và tiền — đó là ngôn ngữ được đồng ý.
- Chỉ refactor chỗ hay bị sửa; `git log` cho danh sách đáng tin hơn cảm giác.
- Strangler fig + chạy song song so kết quả, không bao giờ viết lại từ đầu.

## Tự kiểm tra

1. Bốn dạng bị gộp vào "nợ kỹ thuật" và cách xử lý khác nhau?
2. Vì sao "chỉ refactor chỗ hay bị sửa" là quy tắc đúng?
3. Vì sao chạy song song cả code cũ và mới quan trọng khi dùng strangler fig?
