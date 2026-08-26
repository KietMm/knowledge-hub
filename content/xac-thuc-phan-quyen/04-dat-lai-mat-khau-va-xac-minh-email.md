---
title: Đặt lại mật khẩu và xác minh email
slug: dat-lai-mat-khau-va-xac-minh-email
summary: Luồng token dùng một lần, và bốn lỗi làm nó thành cửa hậu vào tài khoản.
level: trung-cap
tags: [bao-mat, mat-khau, token, email]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được luồng đặt lại mật khẩu an toàn, và nhận ra bốn lỗi biến nó thành cửa hậu.

## Ý tưởng chính

Luồng đặt lại mật khẩu là **cửa vào tài khoản không cần mật khẩu**. Đó chính xác là mục đích của nó — và cũng chính xác là lý do nó là mục tiêu tấn công hàng đầu.

Mọi biện pháp bảo vệ mật khẩu của bạn đều vô nghĩa nếu luồng này có lỗ hổng: kẻ tấn công không cần đoán mật khẩu, hắn chỉ cần **đặt lại nó**.

## Mental model

Hãy nghĩ tới **chìa khoá dự phòng gửi ở lễ tân chung cư**.

> Nó tồn tại vì bạn sẽ có lúc quên chìa. Hợp lý.
>
> Nhưng nó cũng có nghĩa: **ai lấy được chìa dự phòng thì vào được nhà bạn** — không cần phá khoá.
>
> Nên lễ tân phải: kiểm tra bạn đúng là chủ nhà, **chỉ đưa một lần**, thu lại ngay sau khi dùng, và huỷ chìa nếu để quá lâu không ai lấy.

Bốn điều kiện đó chính là bốn thuộc tính của một token đặt lại mật khẩu an toàn.

## Ví dụ nhỏ

```ts
// Sinh token
const tokenGoc = crypto.randomBytes(32).toString('base64url')   // gửi cho người dùng
const tokenHash = sha256(tokenGoc)                               // LƯU cái này

await db.resetToken.create({
  userId: user.id,
  tokenHash,
  hetHan: new Date(Date.now() + 30 * 60_000),      // 30 phút
})
```

## Code chạy thế nào

**Luồng đúng, từng bước:**

```text
① Người dùng nhập email, bấm "Quên mật khẩu"
② Server tìm user
   → KHÔNG tiết lộ kết quả cho client
③ Nếu có user: sinh token ngẫu nhiên 32 byte (nguồn ngẫu nhiên MẬT MÃ)
④ LƯU HASH của token, kèm hạn 15-60 phút, kèm cờ "chưa dùng"
⑤ Gửi email chứa link có token GỐC
⑥ Trả về "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn"  ← luôn luôn câu này
   ...
⑦ Người dùng bấm link, nhập mật khẩu mới
⑧ Server: hash token nhận được, tra bảng
⑨ Kiểm: tồn tại? chưa hết hạn? chưa dùng?
⑩ Đổi mật khẩu (băm chậm)
⑪ ĐÁNH DẤU token đã dùng — hoặc xoá luôn
⑫ HUỶ MỌI PHIÊN ĐĂNG NHẬP hiện có
⑬ Gửi email thông báo "mật khẩu của bạn vừa được đổi"
```

**Vì sao lưu hash chứ không lưu token gốc** (bước ④):

```text
Nếu cơ sở dữ liệu rò rỉ:
  Lưu token gốc → kẻ tấn công có mọi token đang hoạt động
                → đặt lại mật khẩu của mọi tài khoản đang chờ reset
  Lưu hash      → token trong bảng vô dụng, không đảo ngược được
```

Đây là cùng nguyên tắc với mật khẩu ([[luu-mat-khau-va-ma-hoa]]): **thứ gì bạn chỉ cần so sánh thì lưu hash, đừng lưu bản gốc**. Và vì token đã là 32 byte ngẫu nhiên, SHA-256 là đủ — không cần hàm băm chậm.

## Cú pháp

**Bốn lỗi biến luồng này thành cửa hậu:**

**① Token đoán được:**

```ts
const token = Math.random().toString(36)          // ❌ không phải ngẫu nhiên mật mã
const token = `${userId}-${Date.now()}`           // ❌ đoán được hoàn toàn
const token = crypto.randomBytes(32).toString('base64url')   // ✅
```

`Math.random()` không được thiết kế cho mục đích bảo mật — trạng thái của nó đoán được từ vài giá trị đầu ra.

**② Token dùng được nhiều lần:**

```text
Người dùng đặt lại mật khẩu, xong.
Ba tuần sau, ai đó xem lại email cũ trong hộp thư (hoặc trong lịch sử trình duyệt)
⇒ dùng lại link đó ⇒ vào được tài khoản.
```

**③ Token không hết hạn:**

```text
Email nằm trong hộp thư mãi mãi. Token sống mãi mãi.
⇒ Mất quyền truy cập email cũ = mất tài khoản, kể cả nhiều năm sau.
```

**④ Không huỷ phiên cũ sau khi đổi mật khẩu:**

```text
Kịch bản: kẻ tấn công đã chiếm tài khoản và đang đăng nhập.
Người dùng phát hiện, đổi mật khẩu.
⇒ Nếu không huỷ phiên, kẻ tấn công VẪN CÒN QUYỀN TRUY CẬP.
⇒ Người dùng tưởng đã an toàn.
```

Lỗi ④ là lỗi nguy hiểm nhất vì nó tạo ra **cảm giác an toàn giả**.

## Tại sao cần nó

Vì **phản hồi phải giống nhau** dù email có tồn tại hay không:

```ts
// ❌ Tiết lộ email nào đã đăng ký
if (!user) return { loi: 'Email không tồn tại' }

// ✅
return { thongBao: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn' }
```

Và tinh vi hơn — **thời gian phản hồi**:

```text
Email không tồn tại  → trả về ngay              (5ms)
Email tồn tại        → sinh token + gửi mail    (300ms)

⇒ Kẻ tấn công đo thời gian và biết email nào đã đăng ký.
```

Cách chặn: **đẩy việc gửi mail sang hàng đợi**, trả về ngay trong cả hai trường hợp.

```ts
if (user) await hangDoi.them('gui-mail-reset', { userId: user.id })
return { thongBao: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn' }
```

**Rate limit là bắt buộc** ở luồng này:

```text
Theo email:  3 lần / giờ    → chống spam mail tới một người
Theo IP:     10 lần / giờ   → chống dò email hàng loạt
```

Không có nó, kẻ tấn công dùng luồng này để **spam hộp thư của nạn nhân** — hoặc tệ hơn, để dò xem những email nào đã đăng ký ([[gioi-han-tan-suat-va-chong-lam-dung]]).

## So sánh

**Xác minh email — cùng khuôn, khác một điểm:**

| | Đặt lại mật khẩu | Xác minh email |
|---|---|---|
| Token ngẫu nhiên, lưu hash | ✅ | ✅ |
| Dùng một lần | ✅ | ✅ |
| Hết hạn | 15–60 phút | 24 giờ (dài hơn được) |
| Huỷ phiên sau khi dùng | ✅ **bắt buộc** | ❌ không cần |
| Tiết lộ email tồn tại | ❌ không được | Được (người dùng vừa nhập email đó) |

Điểm khác biệt về thời hạn có lý do: xác minh email không phải cửa vào tài khoản, nên rủi ro thấp hơn — và người dùng thường không mở email ngay.

## Dễ nhầm

**1. Token sinh bằng `Math.random()`.** Đoán được.

**2. Lưu token gốc trong cơ sở dữ liệu.** Rò rỉ CSDL ⇒ chiếm mọi tài khoản đang chờ reset.

**3. Token dùng được nhiều lần hoặc không hết hạn.** Email cũ thành chìa khoá vĩnh viễn.

**4. Không huỷ phiên cũ.** Cảm giác an toàn giả.

**5. Tiết lộ email tồn tại** — qua thông báo hoặc qua thời gian phản hồi.

**6. Không rate limit.** Spam hộp thư nạn nhân, hoặc dò email hàng loạt.

**7. Token trong URL bị ghi vào log.** Máy chủ, proxy, và **header `Referer`** khi trang reset có tài nguyên bên ngoài (font, ảnh, script phân tích) — trang đó nên đặt `Referrer-Policy: no-referrer`.

**8. Không gửi email thông báo sau khi đổi.** Nếu ai đó đổi mật khẩu của bạn, bạn cần biết ngay.

**9. Cho phép đổi email mà không xác minh cả địa chỉ cũ.** Kẻ chiếm tài khoản đổi email ⇒ chủ thật mất luôn đường khôi phục.

## Mẹo nhớ

> **Đây là cửa vào tài khoản KHÔNG cần mật khẩu — nên nó phải chặt hơn cả đăng nhập.**
>
> **Lưu HASH của token, không lưu token gốc.**
>
> **Đổi mật khẩu xong phải HUỶ MỌI PHIÊN — nếu không là an toàn giả.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao phải lưu hash của token thay vì token gốc?
2. Bốn lỗi biến luồng này thành cửa hậu?
3. Vì sao phải huỷ phiên cũ, và điều gì xảy ra nếu không?
4. Tấn công theo thời gian ở luồng này hoạt động thế nào, và cách chặn?
5. Xác minh email khác đặt lại mật khẩu ở những điểm nào?

## Tự viết lại

Không nhìn lại phần trên, viết mã giả cho hai endpoint:

```text
POST /quen-mat-khau   (nhận email)
POST /dat-lai         (nhận token + mật khẩu mới)
```

Tự kiểm: endpoint thứ nhất của bạn trả về gì khi email **không** tồn tại, và mất bao lâu so với khi email tồn tại?

## Thử sức

Người dùng báo: họ nhận được email *"mật khẩu của bạn vừa được đổi"* nhưng **họ không làm gì cả**.

Ba câu để trả lời: chuyện gì có thể đã xảy ra (nêu **hai** kịch bản khác nhau); bạn **điều tra** bằng dữ liệu nào trong log; và bạn hướng dẫn người dùng làm gì **ngay lập tức**? Câu khó nhất: nếu kẻ tấn công đã đổi cả email khôi phục, người dùng còn đường nào lấy lại tài khoản?
