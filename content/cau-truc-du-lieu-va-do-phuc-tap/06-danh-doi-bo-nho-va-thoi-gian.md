---
title: Đánh đổi bộ nhớ ↔ thời gian trong bài toán thật
slug: danh-doi-bo-nho-va-thoi-gian
summary: Gần như mọi cách tăng tốc đều là một hình thức trả bộ nhớ để mua thời gian. Nhận ra khuôn mẫu đó rồi thì bạn áp được ở mọi tầng.
level: nang-cao
tags: [nen-tang, do-phuc-tap, hieu-nang, danh-doi]
---

> **Sau bài này bạn sẽ:** nhận ra một khuôn mẫu duy nhất đằng sau chỉ mục, bộ nhớ đệm, ghi nhớ kết quả và bảng tra sẵn — và biết khi nào đánh đổi đó **không** đáng.

## Một khuôn mẫu, rất nhiều tên gọi

Nhìn lại những gì đã học, chúng là **cùng một ý tưởng** ở các quy mô khác nhau:

| Tên gọi | Trả gì | Mua gì | Quy mô |
|---|---|---|---|
| Dựng `Map` làm chỉ mục | Một bảng băm trong RAM | Tra `O(1)` thay vì `O(n)` | Trong hàm |
| Ghi nhớ kết quả đệ quy | Một `Map` các kết quả | Hàm mũ → tuyến tính | Trong hàm |
| Index của database | Dung lượng đĩa + ghi chậm hơn | Đọc nhanh gấp nghìn lần | Trong database |
| Bộ nhớ đệm ứng dụng | RAM + rủi ro dữ liệu cũ | Không phải tính lại | Trong tiến trình |
| Redis / CDN | Máy chủ thêm + tiền | Không phải gọi tầng dưới | Trong hệ thống |
| Phi chuẩn hoá bảng | Dữ liệu lặp + rủi ro lệch | Bỏ được `JOIN` | Trong lược đồ |

Câu chung của cả sáu dòng: **cất sẵn kết quả để khỏi tính lại.** Nhận ra được khuôn mẫu này thì bạn không phải học sáu thứ, chỉ học một thứ và sáu chỗ đặt nó.

## Ba câu hỏi trước khi đánh đổi

Đánh đổi này **không miễn phí**, và cái giá thường không phải bộ nhớ — mà là **tính đúng đắn**.

**① Dữ liệu cất sẵn có thể sai lệch không, và sai thì hậu quả gì?**

```ts
const dem = new Map<string, number>()
function soDon(khachId: string) {
  if (!dem.has(khachId)) dem.set(khachId, db.demDon(khachId))   // cất sẵn
  return dem.get(khachId)!
}
```

Đoạn này nhanh hơn thật. Nó cũng **sai vĩnh viễn** ngay khi khách đặt thêm một đơn. Không có gì xoá mục cũ đi.

> Trong hai việc khó của khoa học máy tính, việc khó nhất là **làm mất hiệu lực bộ nhớ đệm**. Câu đùa đó tồn tại lâu vì nó đúng.

**② Bộ nhớ có bị chặn trên không?**

`Map` không giới hạn kích thước = rò rỉ bộ nhớ chờ sẵn. Máy chủ chạy lâu ngày sẽ chết vì hết RAM, và nó chết vào lúc bạn không có mặt.

```ts
// ✅ Có chặn trên: xoá mục cũ nhất khi đầy (LRU đơn giản)
class Nho<K, V> {
  private m = new Map<K, V>()
  constructor(private toiDa = 1000) {}
  get(k: K): V | undefined {
    const v = this.m.get(k)
    if (v !== undefined) { this.m.delete(k); this.m.set(k, v) }  // đánh dấu vừa dùng
    return v
  }
  set(k: K, v: V) {
    if (this.m.size >= this.toiDa) this.m.delete(this.m.keys().next().value!)
    this.m.set(k, v)
  }
}
```

Mẹo dùng được ở đây: `Map` của JS **giữ đúng thứ tự chèn**, nên khoá đầu tiên chính là khoá cũ nhất — không cần thêm danh sách liên kết. Python có sẵn `functools.lru_cache(maxsize=...)` làm đúng việc này.

**③ Có thật là điểm nghẽn không?**

Đây là câu hay bị bỏ qua nhất. Thêm bộ nhớ đệm cho một hàm chiếm 2% thời gian chạy thì bạn vừa mua 2% và trả bằng một loại lỗi mới — dữ liệu cũ. Đo trước, xem [[hieu-nang-va-do-luong]].

## Ba chiến lược làm hết hiệu lực

Khi đã quyết cất sẵn, phải chọn cách bỏ đi:

| Cách | Làm sao | Hợp với | Rủi ro |
|---|---|---|---|
| **Hết hạn theo thời gian** | Cất kèm thời điểm, quá X giây thì bỏ | Dữ liệu chịu được cũ vài giây | Cũ trong khoảng thời gian đó |
| **Xoá khi ghi** | Sửa dữ liệu thì xoá mục tương ứng | Dữ liệu phải chính xác | Quên một đường ghi là sai vĩnh viễn |
| **Khoá theo phiên bản** | Nhét mã phiên bản vào khoá | Nội dung tĩnh, tài nguyên | Tốn bộ nhớ cho bản cũ |

Cách thứ ba đáng chú ý vì nó **né** hẳn bài toán: không xoá gì cả, chỉ đổi khoá. Đó chính là lý do file tĩnh được đặt tên kèm mã băm (`app-5c57db86.js`) — bản mới có tên mới nên không bao giờ đụng bản cũ. Xem [[cache-nhieu-tang]].

Nguyên tắc chọn: **dữ liệu chịu được cũ thì dùng thời gian; dữ liệu không chịu được cũ thì dùng xoá-khi-ghi và phải chắc chắn liệt kê đủ mọi đường ghi.**

## Hướng ngược lại: trả thời gian để mua bộ nhớ

Đánh đổi này chạy được cả hai chiều, và chiều ngược ít được nhắc:

```ts
// ❌ O(n) bộ nhớ — file 4 GB thì hết RAM
const dong = fs.readFileSync('log.txt', 'utf8').split('\n')
for (const d of dong) xuLy(d)

// ✅ O(1) bộ nhớ — chậm hơn chút, nhưng chạy được với file cỡ nào cũng xong
for await (const d of docTungDong('log.txt')) xuLy(d)
```

```python
# ❌ nạp hết          # ✅ đọc theo luồng
open(f).readlines()   for dong in open(f): xu_ly(dong)
```

Cùng một dạng quyết định: chấp nhận chậm hơn để đổi lấy **chạy được**. Nén dữ liệu cũng vậy (tốn CPU, tiết kiệm băng thông và đĩa), và tính lại thay vì lưu cũng vậy.

## Khi nào **đừng** đánh đổi

- Chưa đo, chưa biết điểm nghẽn ở đâu
- Dữ liệu đòi hỏi chính xác tuyệt đối (số dư tài khoản, tồn kho)
- Chỗ ghi vào dữ liệu đó nằm rải rác nhiều nơi, không liệt kê hết được
- Bộ nhớ tiết kiệm được nhỏ hơn chi phí phức tạp thêm
- Đã có tầng dưới lo hộ rồi — database có bộ nhớ đệm riêng, hệ điều hành có bộ đệm trang; thêm một tầng nữa có khi chỉ thêm một chỗ sai

Điểm cuối đáng nhớ: **mỗi tầng đệm thêm vào là một nguồn dữ liệu cũ mới**. Ba tầng đệm nghĩa là ba chỗ có thể lệch nhau, và khi người dùng báo "tôi thấy dữ liệu cũ" bạn phải lần cả ba.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `Map` làm bộ nhớ đệm không giới hạn | Rò rỉ bộ nhớ, máy chủ chết sau nhiều ngày | Chặn kích thước, xoá mục cũ nhất |
| Cất sẵn mà không có cách làm hết hiệu lực | Dữ liệu sai vĩnh viễn | Chọn một trong ba chiến lược |
| Xoá-khi-ghi nhưng sót một đường ghi | Sai ở đúng đường bị sót, rất khó lần | Liệt kê mọi đường ghi, hoặc dùng hết hạn theo thời gian |
| Thêm đệm trước khi đo | Mua 2%, trả bằng một loại lỗi mới | Đo trước |
| Đệm dữ liệu đòi chính xác tuyệt đối | Sai số dư, sai tồn kho | Đừng đệm loại dữ liệu này |
| Chồng nhiều tầng đệm | Ba chỗ lệch nhau, không lần ra | Ít tầng nhất có thể |
| Nạp cả file lớn vào RAM | Hết bộ nhớ | Đọc theo luồng |

## Ghi nhớ

- Gần như mọi cách tăng tốc đều là **trả bộ nhớ để mua thời gian** — một khuôn mẫu, nhiều tên gọi.
- Cái giá thật thường không phải RAM, mà là **dữ liệu cũ**.
- Ba câu hỏi: có sai lệch được không, bộ nhớ có chặn trên không, có thật là điểm nghẽn không.
- Ba chiến lược: hết hạn theo thời gian, xoá khi ghi, khoá theo phiên bản.
- Đánh đổi chạy cả hai chiều — đọc theo luồng là trả thời gian để mua bộ nhớ.
- Mỗi tầng đệm là một nguồn sai lệch mới. Ít tầng nhất có thể.

## Tự kiểm tra

1. Index của database, `@cache`, và CDN giống nhau ở điểm cốt lõi nào?
2. Ba chiến lược làm hết hiệu lực, và mỗi cái hợp với loại dữ liệu nào?
3. Vì sao đặt tên file tĩnh kèm mã băm lại **né** được bài toán làm hết hiệu lực?
