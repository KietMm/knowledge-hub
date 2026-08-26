---
title: Nhiều agent và phân công
slug: nhieu-agent-va-phan-cong
summary: Khi nào tách thành nhiều agent, ba mẫu phối hợp, và vì sao thường một agent là đủ.
level: nang-cao
tags: [ai, agent, kien-truc, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** biết ba mẫu phối hợp nhiều agent, và nhận ra khi nào tách là quá đà.

## Ý tưởng chính

Chia một agent lớn thành nhiều agent nhỏ nghe hợp lý — mỗi cái chuyên một việc, mô tả gọn, công cụ ít.

Nhưng mỗi ranh giới giữa hai agent là một chỗ **thông tin bị mất** và **một lời gọi mô hình nữa**. Nên câu hỏi không phải "chia thế nào" mà **"có cần chia không"**.

## Mental model

Hãy nghĩ tới **chia một nhóm làm việc**.

> Một người làm cả việc: họ biết mọi thứ, không mất thời gian bàn giao, và nếu việc vừa sức thì đây là cách nhanh nhất.
>
> Chia cho ba người: mỗi người chuyên một phần, làm tốt hơn phần của mình. Nhưng giờ có **bàn giao** — và mỗi lần bàn giao là một lần thông tin bị tóm tắt, hiểu lệch, hoặc rơi mất.
>
> Chia đúng khi các phần **thật sự khác nhau về kỹ năng** và **giao diện giữa chúng rõ ràng**. Chia sai khi ba người phải hỏi nhau liên tục.

Vế cuối là dấu hiệu chia sai: nếu hai agent phải trao đổi qua lại nhiều lượt, chúng nên là một.

## Ví dụ nhỏ

```text
MỘT AGENT: một mục tiêu, 8 công cụ, tự quyết định đường đi

NHIỀU AGENT:
  điều phối → agent tra cứu (3 công cụ)
            → agent phân tích (2 công cụ)
            → agent soạn trả lời (không công cụ)
```

## Code chạy thế nào

**Ba mẫu phối hợp:**

```text
① TUẦN TỰ (dây chuyền)
   A → B → C, mỗi cái nhận đầu ra của cái trước.
   ⇒ Đơn giản nhất. Nhưng nếu thứ tự cố định thì đây thực chất
     là một LUỒNG, không phải nhiều agent
     ([[agent-la-gi-va-khi-nao-can]]).

② ĐIỀU PHỐI (một agent chính, nhiều agent phụ)
   Agent chính nhận nhiệm vụ, giao từng phần cho agent phụ,
   tổng hợp kết quả.
   ⇒ Agent phụ được coi như MỘT CÔNG CỤ của agent chính.
   ⇒ Đây là mẫu phổ biến nhất và dễ kiểm soát nhất.

③ SONG SONG rồi TỔNG HỢP
   Nhiều agent làm cùng một việc theo góc khác nhau,
   rồi một bước tổng hợp.
   ⇒ Dùng khi cần nhiều góc nhìn: rà soát mã theo nhiều tiêu chí,
     phân tích một vấn đề theo nhiều hướng.
   ⇒ Đắt (nhân số lời gọi) nhưng cho kết quả toàn diện hơn.
```

**Mẫu ② nhìn kỹ — agent phụ là một công cụ:**

```text
Agent chính thấy: một công cụ tên `traCuuThongTin(cauHoi)`
Bên dưới:         một agent riêng với 4 công cụ, vòng lặp riêng,
                  ngữ cảnh riêng

⇒ Lợi ích thật: agent chính KHÔNG cần biết 4 công cụ kia,
  và ngữ cảnh của nó không bị đầy bởi chi tiết tra cứu.
⇒ Đây là lý do chính đáng nhất để tách: GIỚI HẠN NGỮ CẢNH
  và GIỚI HẠN SỐ CÔNG CỤ mỗi agent phải chọn giữa
  ([[bo-nho-cua-agent]]).
```

## Cú pháp

**Khi nào tách — bốn lý do chính đáng:**

```text
① NGỮ CẢNH QUÁ LỚN cho một agent
   Việc tra cứu sinh ra 50.000 token kết quả thô.
   ⇒ Tách ra agent riêng, trả về TÓM TẮT cho agent chính.

② QUÁ NHIỀU CÔNG CỤ
   20 công cụ ⇒ agent chọn sai nhiều.
   ⇒ Chia thành nhóm, mỗi agent 5 công cụ
     ([[khai-bao-cong-cu-tot]]).

③ QUYỀN KHÁC NHAU
   Agent đọc dữ liệu khách hàng ≠ agent gửi email ra ngoài.
   ⇒ Tách để giới hạn quyền theo từng agent — đây là lý do
     về BẢO MẬT, và nó mạnh.

④ CẦN NHIỀU GÓC NHÌN ĐỘC LẬP
   Rà soát theo tiêu chí A và tiêu chí B mà không ảnh hưởng nhau.
   ⇒ Một agent làm cả hai sẽ để tiêu chí đầu ảnh hưởng tiêu chí sau.
```

**Khi nào KHÔNG tách:**

```text
❌ "Cho gọn" — mỗi ranh giới là một chỗ mất thông tin
❌ Các phần cần trao đổi qua lại nhiều lượt
   ⇒ Chúng nên là một agent.
❌ Thứ tự cố định ⇒ viết luồng bằng mã, không cần nhiều agent
❌ Bài toán đủ nhỏ cho một agent với 5–6 công cụ
```

**Ba cái giá của việc tách:**

```text
① MẤT THÔNG TIN Ở BÀN GIAO
   Agent A tóm tắt cho B. Tóm tắt luôn bỏ đi thứ gì đó —
   và có thể là thứ B cần.

② CHI PHÍ VÀ ĐỘ TRỄ NHÂN LÊN
   Mỗi agent có vòng lặp riêng. Ba agent, mỗi cái 4 bước
   = 12 lời gọi mô hình, cộng bước điều phối.

③ GỠ LỖI KHÓ HƠN
   Kết quả sai ⇒ agent nào sai? Sai vì nhận đầu vào tệ,
   hay tự nó sai?
   ⇒ Cần log của TỪNG agent, và log của bàn giao giữa chúng.
```

**Giao diện giữa các agent — thiết kế như một API:**

```ts
// ❌ Bàn giao bằng văn xuôi tự do
"Tôi đã tra được thông tin, có vẻ đơn hàng bị trễ do kho..."

// ✅ Bàn giao có cấu trúc, kiểm được
{
  trangThai: 'thanh-cong',
  duLieu: { maDon: 'ABC123', nguyenNhan: 'het-hang-kho-hn', soNgayTre: 5 },
  nguon: ['don_hang', 'lich_su_kho'],
  chuaLamDuoc: [],
}
```

```text
Ba lợi ích của bàn giao có cấu trúc:
  □ Xác thực được bằng schema ⇒ bắt lỗi ngay tại ranh giới
  □ Agent nhận không phải "hiểu" văn xuôi ⇒ ít lệch hơn
  □ Log đọc được, gỡ lỗi được
```

Đây là điểm quan trọng nhất khi thiết kế nhiều agent: **ranh giới giữa chúng phải có hợp đồng**, giống ranh giới giữa hai service ([[ranh-gioi-service]]).

## Tại sao cần nó

Vì nhiều agent được chọn quá thường xuyên, và lợi ích thường ít hơn chi phí:

```text
Kiến trúc "5 agent chuyên gia" nghe rất hợp lý.
Trong thực tế thường gặp:
  □ Chi phí gấp 4–5 lần một agent
  □ Độ trễ 30–60 giây
  □ Kết quả không tốt hơn rõ rệt
  □ Gỡ lỗi rất khó
  □ Và nhiều lượt trao đổi giữa các agent chỉ để hỏi lại
    thứ đã bị mất ở bàn giao trước
```

**Thứ tự nên thử:**

```text
① MỘT agent với 5–8 công cụ, mục tiêu rõ
② Vẫn không đủ ⇒ tách phần NGỮ CẢNH LỚN ra agent phụ
③ Vẫn không đủ ⇒ tách theo QUYỀN
④ Cuối cùng mới tới nhiều agent phối hợp phức tạp

⇒ Và ở mỗi bước, hỏi: "phần cố định của luồng này có viết
  bằng mã được không?" — thường là được, và nó thắng ở mọi chiều.
```

**Bốn thứ bắt buộc nếu dùng nhiều agent:**

```text
□ Hợp đồng có schema cho mỗi bàn giao
□ Trần số bước và trần chi phí cho TOÀN BỘ nhiệm vụ,
  không chỉ cho từng agent
□ Log của từng agent VÀ của từng lần bàn giao, có id nhiệm vụ chung
□ Quyền riêng cho từng agent, theo đặc quyền tối thiểu
  ([[xac-thuc-va-gioi-han-cong-cu]])
```

Điểm thứ hai đáng nhấn: trần riêng cho từng agent không ngăn được tổng chi phí bùng nổ, vì agent chính có thể gọi agent phụ nhiều lần.

## So sánh

| | Một agent | Điều phối | Song song + tổng hợp |
|---|---|---|---|
| Chi phí | thấp | vừa | **cao** |
| Độ trễ | thấp | vừa | vừa (chạy song song) |
| Mất thông tin | không | ở bàn giao | ở tổng hợp |
| Giới hạn quyền riêng | ❌ | ✅ | ✅ |
| Gỡ lỗi | dễ | vừa | khó |

## Dễ nhầm

**1. Tách nhiều agent "cho gọn".**

**2. Tách khi thứ tự cố định.** Viết luồng bằng mã.

**3. Bàn giao bằng văn xuôi tự do.**

**4. Không có schema cho bàn giao.**

**5. Chỉ đặt trần cho từng agent, không cho toàn nhiệm vụ.**

**6. Không log bàn giao.** Không biết thông tin mất ở đâu.

**7. Các agent phải trao đổi qua lại nhiều lượt.** Chúng nên là một.

**8. Không giới hạn quyền riêng cho từng agent.** Mất lý do chính đáng nhất để tách.

**9. Đánh giá kiến trúc nhiều agent bằng một ví dụ chạy tốt.**

**10. Bỏ qua việc viết phần cố định bằng mã.**

## Mẹo nhớ

> **Mỗi ranh giới giữa hai agent là một chỗ MẤT THÔNG TIN và một lời gọi nữa.**
>
> **Lý do chính đáng nhất để tách: GIỚI HẠN NGỮ CẢNH, GIỚI HẠN CÔNG CỤ, GIỚI HẠN QUYỀN.**
>
> **Hai agent phải hỏi nhau nhiều lượt ⇒ chúng nên là MỘT.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba mẫu phối hợp, mẫu nào phổ biến và dễ kiểm soát nhất?
2. Bốn lý do chính đáng để tách?
3. Ba cái giá của việc tách?
4. Vì sao bàn giao phải có cấu trúc?
5. Bốn thứ bắt buộc nếu dùng nhiều agent?

## Tự viết lại

Nhiệm vụ: *"Nhận một khiếu nại, điều tra, quyết định bồi thường, và soạn thư trả lời khách."*

Không nhìn lại, viết:

```text
① thiết kế một agent duy nhất — công cụ nào
② thiết kế nhiều agent — chia thế nào, vì sao
③ hợp đồng bàn giao giữa các agent
④ bạn chọn phương án nào và vì sao
```

Tự kiểm: ở ④, lý do của bạn có thuộc bốn lý do chính đáng không — hay là "cho gọn"?

## Thử sức

Đội xây một hệ thống 5 agent cho việc phân tích khiếu nại. Kết quả: chi phí gấp 6 lần, độ trễ 50 giây, và chất lượng **không tốt hơn** phiên bản một agent trước đó.

Ba câu để trả lời: bạn chẩn đoán bằng dữ liệu nào; ba nguyên nhân khả dĩ nhất; và bạn đề xuất gì. Câu khó nhất: nếu log cho thấy agent điều phối gọi agent tra cứu 4 lần với những câu hỏi gần giống nhau, điều đó chỉ ra vấn đề ở đâu — và nó thuộc loại "chia sai" hay "hợp đồng bàn giao tệ"?
