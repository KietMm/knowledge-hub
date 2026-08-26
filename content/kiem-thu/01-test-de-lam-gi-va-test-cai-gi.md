---
title: Test để làm gì và test cái gì
slug: test-de-lam-gi-va-test-cai-gi
summary: Test không phải để chứng minh code đúng, mà để bạn dám sửa code. Và vì sao 100% coverage là mục tiêu sai.
level: co-ban
tags: [testing, tu-duy]
khung: v2
---

> **Sau bài này bạn sẽ:** biết chọn cái gì đáng test bằng một phép thử, và hiểu vì sao đuổi theo 100% coverage lại làm bộ test tệ đi.

## Ý tưởng chính

Test không tồn tại để chứng minh code đúng — nó không chứng minh được điều đó.

Test tồn tại để **bạn dám sửa code**. Không có test, mỗi lần refactor là một canh bạc, và dần dần không ai dám đụng vào phần quan trọng nhất của hệ thống.

## Mental model

Hãy nghĩ tới **dây bảo hiểm khi leo núi**.

> Dây không giúp bạn leo nhanh hơn. Nó không leo thay bạn. Nó chỉ làm một việc: **khi bạn trượt, bạn không rơi xuống đáy**.
>
> Và chính vì có nó, bạn **dám với tay tới mỏm đá xa hơn** — điều bạn sẽ không bao giờ dám làm nếu leo không dây.

Đó là toàn bộ giá trị của test: không phải "code không có bug", mà là **bạn dám thay đổi code**. Một hệ thống không ai dám sửa là hệ thống đã chết, dù nó đang chạy.

## Ví dụ nhỏ

```ts
// ❌ Test CÁCH LÀM — vỡ khi bạn refactor, dù hành vi không đổi
it('gọi tinhThue rồi gọi lamTron', () => {
  expect(tinhThue).toHaveBeenCalled()
  expect(lamTron).toHaveBeenCalled()
})

// ✅ Test HÀNH VI — chỉ vỡ khi kết quả thật sự sai
it('đơn 100k chịu thuế 10% thành 110k', () => {
  expect(tinhTong({ gia: 100_000 })).toBe(110_000)
})
```

## Code chạy thế nào

Vì sao test cách làm lại có hại — lần theo một tình huống thật:

```text
Tuần 1:  viết hàm tinhTong, gọi tinhThue() rồi lamTron()
         viết test kiểm "có gọi tinhThue" ✅

Tuần 8:  refactor — gộp hai hàm thành một, kết quả GIỐNG HỆT
         → test ĐỎ
         → nhưng phần mềm KHÔNG hỏng gì cả

Bạn phải sửa test. Test không bảo vệ bạn — nó cản bạn.
```

Đây là lý do bộ test nhiều mock hay bị bỏ hoang: nó đỏ mỗi lần refactor, nên người ta ngừng tin nó, rồi ngừng chạy nó.

Phép thử để biết mình đang test đúng thứ:

> **"Nếu tôi viết lại hoàn toàn phần bên trong nhưng giữ nguyên kết quả, test có còn xanh không?"**
>
> Còn xanh ⇒ bạn đang test hành vi. Đỏ ⇒ bạn đang test cách làm.

## Cú pháp

Cái gì **đáng** test, xếp theo giá trị trên mỗi phút bỏ ra:

```text
⭐⭐⭐  Logic nghiệp vụ phức tạp
        tính giá, tính thuế, phân quyền, quy tắc trạng thái

⭐⭐⭐  Chỗ đã từng có bug
        mỗi bug đã sửa nên kèm một test — nó không quay lại lần thứ hai

⭐⭐    Ca biên và luồng lỗi
        rỗng, âm, quá lớn, mạng hỏng, dữ liệu sai định dạng

⭐      Luồng chính của tính năng quan trọng
        đăng nhập, thanh toán — thường là E2E, ít thôi

❌      Getter/setter, code chỉ chuyển tiếp
❌      Thư viện bên thứ ba (họ đã test rồi)
❌      Bố cục giao diện, màu sắc, khoảng cách
```

Dòng thứ hai là quy tắc có lãi nhất: **mỗi bug đã sửa kèm một test**. Bộ test của bạn lớn dần đúng theo những chỗ hệ thống thật sự hay hỏng, chứ không theo cảm tính.

## Tại sao cần nó

Vì **coverage là chẩn đoán, không phải mục tiêu** — và nhầm chỗ này làm hỏng cả bộ test:

```ts
// 100% coverage, 0 giá trị
it('chạy được', () => {
  tinhTong({ gia: 100 })      // gọi hàm, không kiểm tra gì cả
})
```

Coverage chỉ nói **dòng nào đã được chạy qua**, không nói dòng đó có được **kiểm tra** hay không. Đọc nó theo chiều ngược lại mới đúng:

```text
Coverage thấp ở một module quan trọng  →  ⚠️ tín hiệu đáng xem
Coverage 100%                           →  không nói lên điều gì
Đuổi theo con số                        →  sinh ra test rỗng để lấp chỉ tiêu
```

Mức thực tế: **70–80% cho code nghiệp vụ** là hợp lý. Cao hơn nữa thường là đang test những thứ không đáng.

## So sánh

| | Test hành vi | Test cách làm |
|---|---|---|
| Kiểm cái gì | Đầu vào → đầu ra | Hàm nào được gọi, theo thứ tự nào |
| Refactor bên trong | ✅ vẫn xanh | ❌ đỏ |
| Bắt được bug thật | ✅ | Đôi khi |
| Cần mock | Ít | Nhiều |
| Tuổi thọ | Dài | Ngắn |

Cột phải không phải luôn sai — có lúc bạn **cần** kiểm rằng email đã được gửi. Nhưng nếu phần lớn test của bạn nằm ở cột phải, đó là dấu hiệu thiết kế đang dính chặt — xem [[ket-dinh-cao-lien-ket-long]].

## Dễ nhầm

**1. Test để đạt chỉ tiêu coverage.** Sinh ra test gọi hàm mà không `expect` gì.

**2. Test mọi thứ.** Test cũng là code: nó cần bảo trì, cũng có bug. Bộ test 5000 ca mà 4000 ca vô nghĩa còn tệ hơn 500 ca đúng chỗ.

**3. Test chi tiết cài đặt.** Xem phép thử ở trên.

**4. Không test luồng lỗi.** Người ta test đường đi đẹp rồi dừng — trong khi bug hầu hết nằm ở đường xấu: mạng hỏng, dữ liệu rỗng, quyền không đủ.

**5. Test phụ thuộc thứ tự chạy.** Test A phải chạy trước test B mới xanh ⇒ chúng dùng chung state ⇒ sớm muộn sẽ chập chờn. Xem [[integration-test-va-tang-du-lieu]].

**6. Bỏ test khi gấp.** Đây chính là lúc cần nó nhất — code viết vội là code nhiều bug nhất.

**7. Viết test sau khi code xong rất lâu.** Bạn sẽ viết test **khớp với code đang có**, kể cả khi code đó sai.

## Mẹo nhớ

> **Test là dây bảo hiểm: không giúp leo nhanh hơn, nhưng cho bạn dám với xa hơn.**
>
> **Test hành vi, không test cách làm.**
>
> **Coverage là chẩn đoán, không phải mục tiêu.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Giá trị thật của test là gì — không phải "code không có bug", mà là gì?
2. Phép thử một câu để biết bạn đang test hành vi hay cách làm?
3. Vì sao bộ test nhiều mock hay bị bỏ hoang?
4. Vì sao 100% coverage không nói lên chất lượng?
5. Ba loại code **không** đáng test?

## Tự viết lại

Không nhìn lại phần trên, với module tính phí giao hàng dưới đây, hãy liệt kê **những gì bạn sẽ test và những gì bỏ qua**, kèm lý do:

```ts
class DichVuGiao {
  constructor(private db, private apiBanDo) {}
  async tinhPhi(don) { /* gọi API bản đồ, tra bảng giá, áp khuyến mãi */ }
  get tenDichVu() { return 'GHN' }
  private lamTron(x) { return Math.round(x / 1000) * 1000 }
}
```

Tự kiểm: `lamTron` là private — bạn test nó trực tiếp hay qua `tinhPhi`? Nêu lý do.

## Thử sức

Đội bạn có 2000 test, chạy mất 25 phút, và **khoảng 30 test đỏ ngẫu nhiên** mỗi tuần mà không ai biết vì sao. Mọi người đã quen bấm "chạy lại".

Đây là bộ test đã mất giá trị. Nêu **ba bước** để cứu nó, theo đúng thứ tự — và câu khó nhất: bước nào bạn làm **đầu tiên**, và vì sao không phải là "sửa 30 test kia"?
