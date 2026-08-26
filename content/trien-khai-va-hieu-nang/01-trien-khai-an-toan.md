---
title: Triển khai an toàn
slug: trien-khai-an-toan
summary: Tách deploy khỏi phát hành, canary, feature flag, và migration không làm rơi request.
level: trung-cap
tags: [van-hanh, trien-khai, canary, feature-flag, migration]
khung: v2
---

> **Sau bài này bạn sẽ:** tách được "đưa mã lên" khỏi "cho người dùng thấy", và viết migration không làm rơi request nào.

## Ý tưởng chính

**Triển khai** = đưa mã lên máy chủ. **Phát hành** = cho người dùng thấy tính năng.

Gộp hai việc này lại nghĩa là mỗi lần đưa mã lên đều là một sự kiện rủi ro, và cách duy nhất để lùi là đưa mã cũ lên lại.

Tách chúng ra thì bạn có một công tắc — và công tắc bật tắt trong vài giây.

## Mental model

Hãy nghĩ tới **lắp một cái đèn mới trong nhà**.

> Thợ đi dây, gắn bóng, đấu nối — nhưng để **cầu dao của mạch đó tắt**. Đèn đã ở đó, đã sẵn sàng, và **chưa ai thấy gì**.
>
> Khi mọi thứ xong, bạn bật cầu dao. Có vấn đề? Tắt lại trong một giây — **không cần gọi thợ tới tháo đèn ra**.

"Gắn đèn" là triển khai. "Bật cầu dao" là phát hành. Feature flag là cái cầu dao.

## Ví dụ nhỏ

```ts
if (await flag('thanh-toan-moi', { userId: user.id })) {
  return luongThanhToanMoi()
}
return luongThanhToanCu()
```

## Code chạy thế nào

**Vì sao tách hai việc thay đổi mọi thứ:**

```text
GỘP (deploy = release):
  Mã lên production ⇒ mọi người dùng thấy ngay.
  Có vấn đề ⇒ phải deploy lại bản cũ: 10–30 phút.
  ⇒ Mỗi lần deploy là một sự kiện căng thẳng.

TÁCH:
  Mã lên production ở trạng thái TẮT ⇒ không ai thấy.
  Bật cho 1% ⇒ đo ⇒ 10% ⇒ 50% ⇒ 100%.
  Có vấn đề ⇒ TẮT trong vài giây, không cần deploy.
  ⇒ Deploy thành việc thường ngày, phát hành thành quyết định có kiểm soát.
```

**Canary — triển khai từng phần:**

```text
① 5% traffic sang phiên bản mới
② Theo dõi 15–30 phút: tỉ lệ lỗi, p95, metric NGHIỆP VỤ
③ Ổn → 25% → 50% → 100%
④ Xấu → quay lui ngay

So sánh phải là GIỮA HAI PHIÊN BẢN, không phải với mức tuyệt đối:
  cũ: 0,1% lỗi   mới: 0,8% lỗi
  ⇒ vẫn dưới ngưỡng cảnh báo 1%, nhưng TỆ HƠN 8 LẦN ⇒ quay lui.
```

Điểm này hay bị bỏ sót: một canary chỉ hữu ích khi bạn đo được **riêng** phiên bản mới ([[quan-sat-he-thong]]).

**Migration không làm rơi request — mẫu mở rộng/thu hẹp:**

```text
Yêu cầu: đổi cột `ten` thành `ho_ten`.

❌ Một lần:  ALTER TABLE ... RENAME COLUMN
   Trong lúc triển khai, hai phiên bản mã chạy cùng lúc.
   Mã cũ tìm `ten` ⇒ lỗi.
   Và quay lui là sập.

✅ Ba lần triển khai:
   MỞ RỘNG  ① Thêm cột ho_ten. Mã ghi CẢ HAI cột, đọc `ten`.
                 (mã cũ vẫn chạy được ⇒ quay lui an toàn)
            ② Chép dữ liệu cũ sang ho_ten (theo lô, không khoá bảng).
   CHUYỂN   ③ Mã đọc từ ho_ten, vẫn ghi cả hai.
   THU HẸP  ④ Vài ngày sau: mã chỉ dùng ho_ten.
            ⑤ Xoá cột ten.
```

Chậm hơn, nhưng **mỗi bước quay lui được**. Và đó là điều kiện để triển khai tự động có ý nghĩa ([[thay-doi-cau-truc-va-migration]]).

**Quy tắc chung:** mọi thay đổi schema phải **tương thích ngược ít nhất một phiên bản**, vì trong mọi lần triển khai luôn có một khoảng hai phiên bản mã cùng chạy.

## Cú pháp

**Bốn loại feature flag — và vòng đời rất khác nhau:**

```text
① Phát hành      bật dần tính năng mới    → XOÁ sau khi 100%
② Thử nghiệm     A/B test                 → xoá sau khi có kết quả
③ Vận hành       tắt tính năng nặng khi tải cao  → giữ lâu dài
④ Quyền          bật tính năng cho một nhóm khách → giữ lâu dài

Loại ① và ② là NỢ nếu không dọn.
```

**Cờ phải có hạn sử dụng:**

```ts
// TODO(2026-10-01): xoá sau khi thanh-toan-moi đạt 100%
if (await flag('thanh-toan-moi', ctx)) { ... }
```

```text
Không dọn cờ:
  Mỗi cờ là một nhánh mã phải bảo trì và test.
  10 cờ ⇒ về lý thuyết 1.024 tổ hợp trạng thái.
  Không ai test hết ⇒ bug chỉ xuất hiện ở một tổ hợp nhất định.
```

**Vòng phát hành đầy đủ:**

```text
① Deploy mã, cờ TẮT           → không ai thấy
② Bật cho nội bộ              → đội tự dùng
③ Bật cho 1%                  → đo
④ 10% → 50% → 100%            → mỗi bước đều đo
⑤ Xoá cờ và mã đường cũ       ← BƯỚC NÀY HAY BỊ QUÊN
```

**Đo cái gì ở mỗi bước:**

```text
Kỹ thuật:  tỉ lệ lỗi, p95, CPU/RAM
Nghiệp vụ: tỉ lệ chuyển đổi, số đơn hàng, tỉ lệ bỏ giữa chừng
```

Metric nghiệp vụ mới là thứ bắt được loại lỗi tệ nhất: giao diện mới **không lỗi** nhưng khó dùng hơn, và số đơn hàng giảm 20%. Không có 5xx nào cả.

## Tại sao cần nó

Vì một tính năng lớn không nên chờ tới lúc "xong" mới lên production:

```text
Nhánh sống 3 tuần:
  → xung đột merge lớn dần
  → một lần deploy khổng lồ, phạm vi nghi ngờ rất rộng
  → hỏng thì không biết trong 40 thay đổi cái nào gây ra

Với feature flag:
  → merge vào main mỗi ngày, cờ tắt
  → mỗi thay đổi nhỏ, dễ review
  → bật khi sẵn sàng, tắt trong vài giây nếu sai
```

**Nhưng cờ không miễn phí:**

```text
□ Mỗi cờ = một nhánh mã phải bảo trì
□ Test phải chạy cả hai trạng thái với luồng quan trọng
□ Cờ cũ không dọn ⇒ nợ kỹ thuật tích tụ ([[no-ky-thuat-va-refactor]])
□ Cần một nơi quản lý và xem được cờ nào đang bật ở đâu
```

Với đội nhỏ, một bảng trong CSDL cộng cache là đủ. Đừng mua nền tảng quản lý cờ khi có ba cái cờ.

## So sánh

| | Deploy = Release | Tách hai việc |
|---|---|---|
| Quay lui | deploy lại, 10–30 phút | tắt cờ, vài giây |
| Phát hành dần | không | ✅ |
| Deploy | sự kiện căng thẳng | việc thường ngày |
| Chi phí | 0 | cờ phải bảo trì và dọn |

## Dễ nhầm

**1. Migration đổi tên cột trong một bước.** Rơi request, và quay lui là sập.

**2. Không đo riêng phiên bản canary.** Không biết bản mới có tệ hơn không.

**3. So với ngưỡng tuyệt đối thay vì so hai phiên bản.** Bỏ sót suy giảm.

**4. Không dọn cờ.** Tổ hợp trạng thái bùng nổ.

**5. Cờ không có người sở hữu và hạn.** Không ai dám xoá.

**6. Chỉ đo metric kỹ thuật.** Bỏ sót "không lỗi nhưng tệ hơn".

**7. Nhánh sống hàng tuần thay vì dùng cờ.** Deploy khổng lồ, rủi ro tập trung.

**8. Cờ đọc trực tiếp từ CSDL ở đường nóng.** Thêm độ trễ — cần cache.

**9. Không có mặc định an toàn.** Dịch vụ cờ lỗi ⇒ tính năng ở trạng thái không xác định.

**10. Bật 100% ngay.** Bỏ mất lợi ích chính của cờ.

## Mẹo nhớ

> **Triển khai = đưa mã lên. Phát hành = cho người dùng thấy. TÁCH RA.**
>
> **Schema đổi theo MỞ RỘNG → CHUYỂN → THU HẸP, mỗi bước quay lui được.**
>
> **Cờ phải có chủ và hạn — không dọn thì nó là nợ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Deploy khác release thế nào, tách ra được gì?
2. Mẫu mở rộng/thu hẹp gồm mấy bước, vì sao không làm một lần?
3. Canary nên so sánh với cái gì?
4. Bốn loại feature flag, loại nào là nợ nếu không dọn?
5. Vì sao phải đo cả metric nghiệp vụ khi phát hành dần?

## Tự viết lại

Bạn thay toàn bộ luồng thanh toán, kèm đổi schema (tách bảng `don_hang` thành `don_hang` + `thanh_toan`). Không nhìn lại, viết kế hoạch:

```text
① các bước migration, bước nào quay lui được
② cách phát hành dần
③ đo gì ở mỗi bước
④ tiêu chí quay lui
⑤ khi nào và làm sao dọn cờ
```

Tự kiểm: ở bước nào trong kế hoạch của bạn có hai phiên bản mã cùng chạy — và schema lúc đó có phục vụ được cả hai không?

## Thử sức

Đội bạn deploy mỗi hai tuần, mỗi lần khoảng 40 thay đổi. Lần gần nhất hỏng, và mất **ba giờ** để tìm ra thay đổi nào gây ra.

Ba câu để trả lời: vì sao ba giờ đó gần như không tránh được với cách làm hiện tại; kế hoạch chuyển sang deploy hằng ngày, theo thứ tự; và bạn xử lý phản đối "deploy nhiều thì rủi ro nhiều" thế nào. Câu khó nhất: nếu chuyển sang deploy hằng ngày mà **chưa** tách deploy khỏi release, bạn được gì và **chưa** được gì?
