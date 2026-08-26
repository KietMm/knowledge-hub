---
title: Đồng bộ hoá và race condition
slug: dong-bo-hoa-va-race-condition
summary: Mutex, semaphore, deadlock — và vì sao bug đồng thời chỉ xuất hiện trên production.
level: trung-cap
tags: [he-dieu-hanh, dong-thoi, khoa, race-condition]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra một đoạn mã có race condition, và biết bốn điều kiện tạo ra deadlock.

## Ý tưởng chính

Race condition xảy ra khi **kết quả phụ thuộc vào thứ tự thực thi** mà bạn không kiểm soát được.

Điều làm nó khó chịu hơn mọi loại bug khác: nó **không tái hiện đều**. Chạy 1000 lần đúng, lần 1001 sai. Trên máy dev không bao giờ xảy ra; trên production giờ cao điểm thì có.

## Mental model

Hãy nghĩ tới **hai người cùng rút tiền từ một tài khoản ở hai cây ATM**.

> Số dư 1.000.000. Cả hai cùng rút 800.000, cùng lúc.
>
> Máy A đọc số dư: 1.000.000 → đủ → chuẩn bị trừ.
> Máy B đọc số dư: 1.000.000 → đủ → chuẩn bị trừ.
> Máy A ghi: 200.000.
> Máy B ghi: 200.000.
>
> Ngân hàng mất 600.000. **Không máy nào làm sai cả** — cả hai đều kiểm tra rồi mới trừ.

Vấn đề nằm ở khoảng trống giữa **đọc** và **ghi**. Mọi race condition đều có hình dạng này: một chuỗi thao tác đáng lẽ phải **không thể chia cắt** nhưng lại bị chen vào giữa.

## Ví dụ nhỏ

```js
// ☠️ Kiểm rồi mới hành động — khoảng trống ở giữa là chỗ hỏng
if (kho.soLuong >= n) {        // ① đọc
  kho.soLuong -= n             // ② ghi — ai đó có thể đã chen vào giữa ① và ②
}
```

## Code chạy thế nào

**Vì sao ngay cả `x++` cũng không an toàn:**

```text
x++ trông như một thao tác, nhưng thực ra là ba:
  ① đọc x từ bộ nhớ vào thanh ghi
  ② tăng thanh ghi
  ③ ghi thanh ghi về bộ nhớ

Hai luồng cùng chạy, x = 5:
  Luồng A đọc 5
  Luồng B đọc 5      ← chen vào giữa
  A tăng → 6, ghi 6
  B tăng → 6, ghi 6

Kết quả 6. Đáng lẽ 7. Một lần tăng biến mất.
```

**Ba nguyên thuỷ đồng bộ hoá:**

```text
MUTEX (khoá loại trừ)
  Đúng MỘT luồng vào vùng găng tại một thời điểm.
  lock() → làm việc → unlock()

SEMAPHORE (đếm)
  Cho tối đa N luồng vào cùng lúc.
  Dùng để giới hạn tài nguyên: "tối đa 10 kết nối CSDL đồng thời".

THAO TÁC NGUYÊN TỬ
  Đọc-sửa-ghi trong MỘT lệnh CPU không chia cắt được.
  Nhanh hơn mutex nhiều, nhưng chỉ dùng được cho thao tác đơn giản.
```

**Deadlock — bốn điều kiện, phá một là hết:**

```text
① Loại trừ:       tài nguyên chỉ một bên giữ được
② Giữ và chờ:     đang giữ A, chờ B
③ Không cướp được: không ai giành được của người khác
④ Chờ vòng tròn:  A chờ B, B chờ A

Cả BỐN cùng đúng ⇒ deadlock. Phá bất kỳ cái nào ⇒ không thể deadlock.
```

```text
Cách phá dễ áp dụng nhất là ④ — LUÔN LẤY KHOÁ THEO CÙNG MỘT THỨ TỰ:

❌ Luồng A: khoá(taiKhoan1) rồi khoá(taiKhoan2)
   Luồng B: khoá(taiKhoan2) rồi khoá(taiKhoan1)     ← chờ vòng tròn

✅ Cả hai: khoá theo thứ tự id tăng dần
   ⇒ không bao giờ tạo được vòng.
```

Cách thứ hai là phá ②: **đặt timeout cho việc lấy khoá**. Không lấy được trong 5 giây thì nhả hết những gì đang giữ và thử lại — biến deadlock vĩnh viễn thành một lần chậm.

## Cú pháp

**JavaScript: một luồng, nhưng vẫn có race condition:**

```js
// ☠️ Không có luồng nào, vẫn hỏng
async function truTien(id, n) {
  const u = await db.user.find(id)     // ← await: NHƯỜNG quyền cho request khác
  if (u.soDu >= n) {
    await db.user.update(id, { soDu: u.soDu - n })   // ghi đè dữ liệu đã cũ
  }
}
```

```text
Điểm mấu chốt: MỖI `await` là một chỗ có thể bị chen vào.
Node không có bộ nhớ dùng chung giữa các luồng, nhưng nó CÓ
trạng thái dùng chung: CƠ SỞ DỮ LIỆU.

⇒ "Một luồng" không miễn nhiễm race condition.
  Nó chỉ chuyển vấn đề từ bộ nhớ sang tầng dữ liệu.
```

**Bốn cách sửa, theo thứ tự nên thử:**

```sql
-- ① ĐỂ CSDL LÀM PHÉP TÍNH — nguyên tử, không cần khoá gì thêm
UPDATE tai_khoan SET so_du = so_du - 100
WHERE id = 1 AND so_du >= 100;
-- Kiểm số dòng bị ảnh hưởng: 0 nghĩa là không đủ tiền.

-- ② KHOÁ BI QUAN — khi phải đọc rồi mới quyết định
BEGIN;
SELECT so_du FROM tai_khoan WHERE id = 1 FOR UPDATE;   -- khoá dòng
UPDATE tai_khoan SET so_du = so_du - 100 WHERE id = 1;
COMMIT;

-- ③ KHOÁ LẠC QUAN — khi xung đột hiếm
UPDATE tai_khoan SET so_du = 900, version = version + 1
WHERE id = 1 AND version = 7;   -- 0 dòng ⇒ ai đó đã sửa ⇒ thử lại

-- ④ RÀNG BUỘC CSDL — để CSDL từ chối thay bạn
ALTER TABLE tai_khoan ADD CONSTRAINT so_du_khong_am CHECK (so_du >= 0);
```

Thứ tự này quan trọng: ① đơn giản nhất và đủ cho phần lớn trường hợp; ④ là lưới an toàn cuối cùng nên **luôn có**, kể cả khi ba cách trên đã đúng ([[truy-cap-dong-thoi-va-khoa]]).

**Khoá phân tán — khi có nhiều máy chủ:**

```text
Mutex trong tiến trình chỉ bảo vệ được trong MỘT tiến trình.
Ba máy chủ ⇒ ba mutex độc lập ⇒ không bảo vệ gì cả.

⇒ Cần khoá ở nơi dùng chung: Redis (SET NX PX) hoặc khoá của CSDL.
⇒ Và khoá phân tán PHẢI có thời hạn — máy giữ khoá chết mà khoá
  không tự hết hạn thì cả hệ thống kẹt.
```

## Tại sao cần nó

Vì loại bug này có ba đặc điểm khiến nó tốn kém bất thường:

```text
① Không tái hiện được theo yêu cầu
   ⇒ "trên máy tôi chạy đúng mà" — và đúng thật.

② Chỉ xuất hiện khi có tải
   ⇒ test đơn luồng không bao giờ bắt được.

③ Hậu quả là DỮ LIỆU SAI, không phải crash
   ⇒ không có stack trace, không có cảnh báo.
   ⇒ Phát hiện lúc đối soát, hàng tuần sau.
```

**Nhận diện sớm — ba dấu hiệu trong mã:**

```text
□ Kiểm-rồi-hành-động:  if (còn hàng) { trừ hàng }
□ Đọc-sửa-ghi:         x = đọc(); ghi(x + 1)
□ Có `await` giữa lúc đọc và lúc ghi cùng một bản ghi
```

Ba mẫu này đủ để soi phần lớn race condition khi review mã — và đó là cách rẻ nhất để bắt chúng, vì test thì rất khó.

**Test race condition:** chạy N thao tác song song rồi kiểm bất biến.

```js
await Promise.all(Array.from({ length: 100 }, () => truTien(id, 10)))
// Bất biến: số dư cuối cùng phải khớp, và không bao giờ âm.
```

## So sánh

| Cách | Khi nào | Chi phí |
|---|---|---|
| CSDL tự tính (`SET x = x - n`) | thao tác đơn giản | thấp nhất |
| Khoá bi quan (`FOR UPDATE`) | xung đột thường xuyên | giữ khoá, giảm đồng thời |
| Khoá lạc quan (version) | xung đột hiếm | phải xử lý thử lại |
| Ràng buộc CHECK | luôn luôn, làm lưới cuối | gần như không |

## Dễ nhầm

**1. Tin rằng một luồng thì không có race condition.** Trạng thái dùng chung nằm ở CSDL.

**2. Kiểm rồi mới hành động.** Khoảng trống ở giữa là chỗ hỏng.

**3. Đọc-sửa-ghi ở tầng ứng dụng** thay vì để CSDL tính.

**4. Lấy khoá theo thứ tự khác nhau ở hai chỗ.** Deadlock.

**5. Khoá phân tán không có thời hạn.** Máy giữ khoá chết là kẹt cả hệ thống.

**6. Dùng mutex trong tiến trình khi có nhiều máy chủ.** Không bảo vệ gì.

**7. Không có ràng buộc CSDL làm lưới cuối.**

**8. Giữ khoá quá lâu** — gọi API bên ngoài trong lúc đang giữ khoá.

**9. Chỉ test đơn luồng.** Không bao giờ bắt được.

**10. Nghĩ `x++` là nguyên tử.** Nó là ba thao tác.

## Mẹo nhớ

> **Race condition = kết quả phụ thuộc THỨ TỰ mà bạn không kiểm soát.**
>
> **Mỗi `await` là một chỗ có thể bị chen vào.**
>
> **Deadlock cần đủ BỐN điều kiện — phá "chờ vòng tròn" bằng cách luôn khoá theo cùng thứ tự.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao `x++` không an toàn với nhiều luồng?
2. Bốn điều kiện deadlock, phá cái nào dễ nhất?
3. Vì sao JavaScript một luồng vẫn có race condition?
4. Bốn cách sửa, thử theo thứ tự nào?
5. Ba mẫu mã cần soi khi review để phát hiện race condition?

## Tự viết lại

Không nhìn lại, viết mã đúng cho: **đặt vé xem phim, mỗi ghế chỉ một người**.

```text
① chỗ có race condition trong cách viết ngây thơ
② cách sửa bằng CSDL
③ ràng buộc làm lưới an toàn
④ một test chứng minh nó đúng khi có đồng thời
```

Tự kiểm: test ở ④ của bạn chạy bao nhiêu request song song, và nó kiểm **bất biến** gì?

## Thử sức

Người dùng báo: đôi khi mã giảm giá "chỉ dùng một lần" bị dùng được **hai lần** — nhưng chỉ thỉnh thoảng, và chỉ vào các đợt khuyến mãi lớn.

Ba câu để trả lời: nguyên nhân, và vì sao **chỉ vào đợt khuyến mãi**; hai cách sửa và đánh đổi; và bạn **chứng minh** đã sửa đúng bằng cách nào. Câu khó nhất: nếu hệ thống chạy trên 5 máy chủ, cách sửa nào trong hai cách của bạn **vẫn còn đúng** — và cách kia hỏng ở đâu?
