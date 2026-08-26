---
title: Layered và Hexagonal
slug: layered-va-hexagonal
summary: Hai cách sắp xếp phụ thuộc, khác nhau ở một điểm duy nhất — và điểm đó quyết định bạn test được gì.
level: trung-cap
tags: [kien-truc, thiet-ke, dependency, kiem-thu]
khung: v2
---

> **Sau bài này bạn sẽ:** vẽ được chiều phụ thuộc của cả hai kiến trúc, và biết chính xác hexagonal thêm gì so với layered.

## Ý tưởng chính

**Layered** xếp phụ thuộc theo một chiều: trên gọi dưới. Route → Service → Repository → CSDL.

**Hexagonal** đảo một mũi tên: tầng nghiệp vụ **định nghĩa interface**, còn hạ tầng **cài đặt** interface đó. Nghiệp vụ không còn phụ thuộc vào CSDL — CSDL phụ thuộc vào nghiệp vụ.

Đó là toàn bộ khác biệt. Một mũi tên.

## Mental model

Hãy nghĩ tới **thuê người làm việc**.

> **Layered**: bạn nói "gọi cho anh Nam ở công ty ABC, số này, hỏi anh ấy về đơn hàng". Việc của bạn **gắn chặt** với anh Nam. Anh ấy nghỉ, bạn phải sửa lại lời hướng dẫn.
>
> **Hexagonal**: bạn viết một **bản mô tả công việc** — "cần người trả lời được: đơn hàng này còn hàng không". Ai đáp ứng bản mô tả đó cũng được: anh Nam, một hệ thống tự động, hay một bản giả lúc bạn đang tập.
>
> Bản mô tả công việc là của **bạn**, không phải của anh Nam.

Đó là ý nghĩa của "nghiệp vụ định nghĩa interface": hợp đồng thuộc về bên **cần**, không thuộc bên **cung cấp**.

## Ví dụ nhỏ

```text
LAYERED
  Service ──▶ Repository ──▶ Postgres
  (service biết Repository, và Repository biết Postgres)

HEXAGONAL
  Service ──▶ KhoDonHang (interface do SERVICE định nghĩa)
                    ▲
              PostgresKhoDonHang (cài đặt)
  (mũi tên hạ tầng chỉ VÀO nghiệp vụ)
```

## Code chạy thế nào

**Layered — và giới hạn của nó:**

```ts
// service.ts
import { donHangRepo } from './repo'          // ← phụ thuộc cụ thể

export const donHangService = {
  async huy(id: string) {
    const don = await donHangRepo.tim(id)
    if (don.daGiao) throw new KhongThuHuyDuoc()
    await donHangRepo.capNhat(id, { trangThai: 'da-huy' })
  },
}
```

```text
Vấn đề chỉ xuất hiện khi test:
  Muốn test quy tắc "đơn đã giao thì không huỷ được"
  ⇒ phải mock module `./repo`, hoặc dựng một CSDL thật.

Cả hai đều làm test chậm và giòn: mock module thì gắn với
cách cài đặt; CSDL thật thì cần dựng, dọn, và mất giây.
```

**Hexagonal — nghiệp vụ định nghĩa hợp đồng:**

```ts
// domain/ports.ts — NGHIỆP VỤ sở hữu interface này
export interface KhoDonHang {
  tim(id: string): Promise<Don | null>
  capNhat(id: string, dl: Partial<Don>): Promise<void>
}

// domain/service.ts — không import gì từ hạ tầng
export function taoDonHangService(kho: KhoDonHang) {
  return {
    async huy(id: string) {
      const don = await kho.tim(id)
      if (don === null) throw new KhongTimThay()
      if (don.daGiao) throw new KhongThuHuyDuoc()
      await kho.capNhat(id, { trangThai: 'da-huy' })
    },
  }
}

// infra/postgres-kho.ts — hạ tầng CÀI ĐẶT hợp đồng của nghiệp vụ
export const postgresKho: KhoDonHang = { /* ... */ }
```

```ts
// Test: không mock module, không CSDL, chạy trong micro giây
it('đơn đã giao thì không huỷ được', async () => {
  const kho: KhoDonHang = {
    tim: async () => ({ id: '1', daGiao: true } as Don),
    capNhat: async () => { throw new Error('không được gọi') },
  }
  const svc = taoDonHangService(kho)
  await expect(svc.huy('1')).rejects.toThrow(KhongThuHuyDuoc)
})
```

```text
Điểm mấu chốt: bản giả ở đây là một OBJECT THƯỜNG, không phải
một mock của framework. Nó không biết gì về Postgres, và nó
không vỡ khi bạn đổi ORM ([[test-double-stub-mock-fake]]).
```

## Cú pháp

**Vẽ ranh giới ở đâu — chỉ ở những chỗ này:**

```text
✅ ĐÁNG tách thành cổng (port):
   Thứ CÓ THỂ đổi: nhà cung cấp mail, thanh toán, lưu trữ file, SMS
   Thứ KHÓ TEST:  gọi mạng, hệ thống file, ĐỒNG HỒ, ngẫu nhiên

❌ KHÔNG đáng:
   Hàm tiện ích thuần (đã dễ test)
   Thư viện gần như không bao giờ đổi (lodash, date-fns)
   Repository của chính bạn — NẾU bạn chắc sẽ không đổi CSDL
     (và phần lớn dự án không đổi)
```

**Vì sao "trừu tượng hoá đồng hồ" không phải quá đà:**

```ts
// ❌ Không test được: kết quả phụ thuộc lúc bạn chạy test
function coHetHan(don: Don) {
  return Date.now() > don.hetHanLuc
}

// ✅ Thời gian trở thành đầu vào
function coHetHan(don: Don, bayGio: number) {
  return bayGio > don.hetHanLuc
}
```

```text
Đây là ví dụ rõ nhất rằng mục đích thật của việc tách cổng
KHÔNG phải "để đổi nhà cung cấp" — mà là **để kiểm soát đầu vào**.

Với đồng hồ, bạn sẽ không bao giờ "đổi nhà cung cấp thời gian".
Nhưng bạn cần test được hành vi ở ngày 31, ở nửa đêm,
ở lúc vừa hết hạn ([[bug-kho-tai-hien]]).
```

**Chi phí của hexagonal — nói rõ để cân nhắc:**

```text
□ Mỗi phụ thuộc ngoài: một interface + một cài đặt + một bản giả
□ Phải nối dây (wiring) ở một chỗ — và chỗ đó lớn dần
□ Đi từ request tới CSDL qua nhiều tầng gián tiếp hơn
  ⇒ người mới đọc mã khó theo dõi hơn
□ Với CRUD thuần, nó là chi phí thuần: interface có đúng một
  cài đặt và sẽ mãi như vậy

⇒ Áp dụng CÓ CHỌN LỌC: cổng cho những chỗ ở danh sách "đáng tách",
  layered thẳng cho phần còn lại. Trộn hai cách là bình thường
  và thường là lựa chọn đúng.
```

## Tại sao cần nó

Vì lợi ích thật của hexagonal là **test**, không phải "đổi CSDL":

```text
Lý do thường được viện dẫn: "để sau này đổi Postgres sang MongoDB"
  ⇒ Chuyện này gần như không bao giờ xảy ra.
  ⇒ Và nếu xảy ra, interface của bạn cũng không đủ —
    hai CSDL có mô hình khác nhau về bản chất.

Lý do THẬT, xảy ra mỗi ngày:
  □ Test quy tắc nghiệp vụ trong micro giây, không cần hạ tầng
  □ Test được ca biên khó dựng: mạng lỗi, thời gian đặc biệt,
    dịch vụ ngoài trả về dữ liệu lạ
  □ Viết được nghiệp vụ TRƯỚC khi có hạ tầng
  □ Đọc tầng nghiệp vụ mà không bị lẫn với SQL và HTTP
```

**Một phép thử để biết ranh giới có thật hay không:**

```text
Mở file trong tầng nghiệp vụ. Nó có import gì từ:
  □ thư viện HTTP?
  □ ORM, driver CSDL?
  □ SDK của nhà cung cấp?
  □ `process.env`?

Có bất kỳ cái nào ⇒ ranh giới đã bị rò, và test sẽ phải
dựng hạ tầng.
```

Phép thử này cụ thể, chạy được bằng một quy tắc linter, và nó biến "kiến trúc" từ một ý niệm thành một thứ CI kiểm được ([[cau-truc-du-an-va-phu-thuoc]]).

## So sánh

| | Layered | Hexagonal |
|---|---|---|
| Chiều phụ thuộc | trên → dưới | hạ tầng → nghiệp vụ |
| Ai định nghĩa interface | tầng dưới | **tầng nghiệp vụ** |
| Test nghiệp vụ | cần mock module hoặc CSDL | object thường |
| Số file | ít | nhiều hơn |
| Người mới đọc | dễ | khó hơn |
| Hợp với | phần lớn ứng dụng | nơi cần test kỹ, hoặc phụ thuộc hay đổi |

## Dễ nhầm

**1. Áp dụng hexagonal cho mọi phụ thuộc.** Interface một cài đặt là chi phí thuần.

**2. Lý do là "để đổi CSDL".** Gần như không xảy ra; và interface cũng không đủ.

**3. Interface do tầng hạ tầng định nghĩa.** Vậy là vẫn layered, chỉ thêm một file.

**4. Nghiệp vụ import driver CSDL.** Ranh giới bị rò.

**5. Nghiệp vụ đọc `process.env`.** Cũng là rò.

**6. Dùng `Date.now()` trong nghiệp vụ.** Không test được ca biên thời gian.

**7. Chỉ ghi quy ước trong tài liệu.** Dùng linter.

**8. Nghĩ phải chọn một trong hai.** Trộn là bình thường.

**9. Chuyển cả dự án sang hexagonal trong một lần.** Làm dần theo module.

**10. Mock ở tầng quá thấp.** Test gắn với cách cài đặt, vỡ khi refactor.

## Mẹo nhớ

> **Hexagonal đảo ĐÚNG MỘT mũi tên: nghiệp vụ định nghĩa interface, hạ tầng cài đặt.**
>
> **Lợi ích thật là TEST, không phải "đổi CSDL".**
>
> **Phép thử: tầng nghiệp vụ có import gì từ hạ tầng không?**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Layered và hexagonal khác nhau ở đúng điểm nào?
2. Ai sở hữu interface trong hexagonal, và vì sao điều đó quan trọng?
3. Những chỗ nào đáng tách thành cổng, chỗ nào không?
4. Vì sao trừu tượng hoá đồng hồ không phải quá đà?
5. Phép thử để biết ranh giới có thật?

## Tự viết lại

Không nhìn lại, viết theo hexagonal cho: *"Khi đơn hàng quá 30 ngày chưa thanh toán thì huỷ và gửi email thông báo."*

```text
① các cổng nghiệp vụ cần
② hàm nghiệp vụ, không import hạ tầng
③ một test không dùng CSDL và không gọi mạng
④ chỗ nối dây
```

Tự kiểm: hàm ở ② của bạn lấy "hôm nay" từ đâu — nếu từ `Date.now()`, test ở ③ có kiểm được đúng mốc 30 ngày không?

## Thử sức

Đội bạn có 200 test integration, mỗi lần chạy mất 12 phút vì phải dựng CSDL và gọi API giả lập. Không có test nào cho quy tắc nghiệp vụ chạy độc lập.

Ba câu để trả lời: bạn thay đổi kiến trúc thế nào để phần lớn quy tắc nghiệp vụ test được trong micro giây; bạn làm dần theo thứ tự nào; và bạn giữ lại bao nhiêu test integration, cho việc gì. Câu khó nhất: sau khi tách, những **loại lỗi** nào chỉ test integration bắt được — và điều đó quyết định con số ở câu trên ra sao?
