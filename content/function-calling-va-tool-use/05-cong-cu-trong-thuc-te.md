---
title: Công cụ trong thực tế
slug: cong-cu-trong-thuc-te
summary: Test, phiên bản, giám sát, và bốn thứ phải có trước khi cho một công cụ chạm dữ liệu thật.
level: nang-cao
tags: [ai, function-calling, van-hanh, kiem-thu]
khung: v2
---

> **Sau bài này bạn sẽ:** test được luồng có công cụ, và biết bốn thứ phải có trước khi cho một công cụ ghi lên production.

## Ý tưởng chính

Một công cụ là **một endpoint API mà người gọi là mô hình**. Nó cần đúng những gì một endpoint cần: test, phiên bản, giám sát, xử lý lỗi.

Và nó cần thêm một thứ mà endpoint thường không cần: bạn phải test cả **việc mô hình có chọn đúng công cụ và điền đúng tham số hay không** — một tầng có thể hỏng mà mã của bạn hoàn toàn đúng.

## Mental model

Hãy nghĩ tới **giao chìa khoá kho cho một nhân viên mới rất nhanh nhẹn**.

> Bạn không đưa chìa ngay ngày đầu. Bạn cho họ **làm thử trên kho mẫu** trước: lấy đúng món chưa, ghi sổ đúng chưa, xử lý thế nào khi món đó hết.
>
> Rồi bạn cho họ chạm kho thật, nhưng **chỉ những kệ ít rủi ro**, và bạn **xem sổ mỗi tuần**.
>
> Và khi bạn đổi cách sắp xếp kho, bạn **báo trước** — không đổi rồi để họ tự phát hiện.

Ba giai đoạn đó — thử trên môi trường giả, mở dần theo rủi ro, và quản lý thay đổi — là toàn bộ nội dung của bài này.

## Ví dụ nhỏ

```ts
it('mô hình chọn đúng công cụ khi hỏi về đơn hàng', async () => {
  const res = await goiModel({ cauHoi: 'Đơn ABC123 tới đâu rồi?', tools })
  expect(res.toolCalls?.[0]?.name).toBe('tra_don_hang')
  expect(res.toolCalls?.[0]?.arguments.maDon).toBe('ABC123')
})
```

## Code chạy thế nào

**Ba tầng test — mỗi tầng bắt một loại lỗi:**

```text
① TEST HÀM CÔNG CỤ như một hàm thường
   Tham số hợp lệ, tham số sai, không có quyền, bản ghi không tồn tại
   ⇒ Test thường, không cần mô hình. Nhanh và tất định.

② TEST VIỆC CHỌN CÔNG CỤ VÀ ĐIỀN THAM SỐ
   Cho câu hỏi, kiểm mô hình gọi đúng công cụ với đúng tham số.
   ⇒ Cần gọi mô hình, nên chậm hơn và không hoàn toàn tất định.
   ⇒ Đặt temperature 0, và chấp nhận một tỉ lệ nhỏ dao động.

③ TEST LUỒNG ĐẦU CUỐI
   Câu hỏi → công cụ → câu trả lời cuối cùng có đúng không.
   ⇒ Ít test nhất, chậm nhất, nhưng bắt được lỗi ở ghép nối.
```

```text
Tầng ② là tầng đặc thù của function calling, và nó hay bị bỏ.
Nó bắt được loại lỗi mà mã của bạn hoàn toàn đúng: mô tả công cụ
chưa rõ ⇒ mô hình chọn nhầm ([[khai-bao-cong-cu-tot]]).
```

**Bốn ca phải có trong bộ test tầng ②:**

```text
□ Câu hỏi rõ ràng → chọn đúng công cụ, tham số đúng
□ Câu hỏi THIẾU thông tin → KHÔNG gọi công cụ, hỏi lại người dùng
□ Câu hỏi gần giống hai công cụ → chọn đúng cái nào
□ Câu hỏi KHÔNG cần công cụ nào → trả lời thẳng, không gọi
```

Hai ca giữa là hai ca bắt được nhiều lỗi nhất, và cả hai đều liên quan tới chất lượng mô tả công cụ.

## Cú pháp

**Bốn thứ phải có trước khi một công cụ GHI chạm dữ liệu thật:**

```text
① MÔI TRƯỜNG GIẢ để test
   Công cụ chỉ đọc: test với CSDL test là đủ.
   Công cụ ghi ra ngoài (email, thanh toán): cần bản giả,
   hoặc chế độ sandbox của nhà cung cấp.
   ⇒ Đừng bao giờ để test gửi email thật.

② IDEMPOTENCY
   Mô hình có thể gọi lại. Vòng lặp agent có thể chạy lại một bước.
   ⇒ Bắt buộc, không phải tuỳ chọn ([[idempotency-va-thu-lai]]).

③ LOG ĐẦY ĐỦ
   ai gọi, công cụ nào, tham số gì, kết quả gì, câu hỏi gốc là gì
   ⇒ Đây là bản ghi kiểm toán cho mọi hành động AI thực hiện.

④ ĐƯỜNG HOÀN TÁC hoặc NGƯỠNG CẦN NGƯỜI DUYỆT
   ⇒ Việc khó đảo phải có một trong hai
     ([[xac-thuc-va-gioi-han-cong-cu]]).
```

**Mở dần theo rủi ro — cách triển khai an toàn:**

```text
① Chế độ CHỈ GHI LOG: mô hình đề nghị, bạn ghi lại, KHÔNG thực thi
   ⇒ Chạy vài ngày, đọc log: nó có đề nghị đúng không?
   ⇒ Đây là bước rẻ nhất và có giá trị nhất, và hay bị bỏ qua.

② Bật cho một nhóm nhỏ người dùng, hoặc cho nội bộ

③ Bật cho tất cả, nhưng vẫn cần xác nhận với việc rủi ro cao

④ Nới ngưỡng xác nhận dần, dựa trên số liệu thật
```

Bước ① là ý đáng mang đi nhất: bạn có thể đo chất lượng quyết định của mô hình **mà không chịu bất kỳ rủi ro nào**.

**Phiên bản công cụ — đổi thì đổi ra sao:**

```text
Đổi schema tham số của một công cụ = đổi hợp đồng.
Khác với API thường ở một điểm: không có "client cũ" cần
tương thích ngược — mô hình đọc schema MỚI mỗi lời gọi.

⇒ Nên đổi schema là AN TOÀN hơn đổi API công khai.
⇒ Nhưng: nó có thể làm mô hình chọn khác đi.
  ⇒ Đổi tên hoặc mô tả công cụ ⇒ CHẠY LẠI bộ test tầng ②.
  ⇒ Và với luồng đang chạy dở (agent nhiều bước), một lời gọi
    có thể tham chiếu công cụ theo schema cũ.
```

**Bốn chỉ số phải theo dõi:**

```text
□ TẦN SUẤT gọi từng công cụ
  Một công cụ không bao giờ được gọi ⇒ mô tả sai, hoặc thừa.
  Một công cụ được gọi ở mọi câu hỏi ⇒ mô tả quá rộng.
□ TỈ LỆ LỖI theo công cụ
□ ĐỘ TRỄ p95 theo công cụ
  ⇒ Công cụ chậm nhất quyết định độ trễ của cả luồng.
□ SỐ BƯỚC trung bình mỗi request, và tỉ lệ chạm trần
  ⇒ Chạm trần nhiều ⇒ thiếu công cụ, hoặc mô tả chưa rõ.
```

Chỉ số đầu là chỉ số chẩn đoán tốt nhất và ít người theo dõi: **phân bố tần suất gọi công cụ nói cho bạn biết mô tả nào đang sai**.

## Tại sao cần nó

Vì công cụ là chỗ hệ thống AI **thực hiện hành động**, và nó có một tầng hỏng mà hệ thống thường không có:

```text
Hệ thống thường:  mã sai ⇒ hành động sai
Hệ thống có AI:   mã ĐÚNG ⇒ vẫn hành động sai,
                  vì mô hình chọn sai công cụ hoặc điền sai tham số

⇒ Test mã là cần, không đủ.
⇒ Và loại lỗi thứ hai không phát hiện được bằng test đơn vị.
```

**Danh sách kiểm trước khi cho một công cụ ghi lên production:**

```text
□ Test hàm: ca hợp lệ, ca sai, ca không có quyền
□ Test chọn công cụ: bốn ca ở trên
□ Idempotent
□ Danh tính từ ngữ cảnh, không từ tham số
□ Giới hạn: timeout, kích thước kết quả, tần suất
□ Log đầy đủ để kiểm toán
□ Đã chạy chế độ chỉ-ghi-log ít nhất vài ngày
□ Có đường hoàn tác, hoặc ngưỡng cần người duyệt
□ Bốn chỉ số đã được theo dõi và có cảnh báo
```

**Và một điều nên nói rõ với đội:** khi AI thực hiện một hành động sai, câu hỏi *"lỗi của mô hình hay lỗi của mã?"* không hữu ích. **Hệ thống là của bạn**, và nó gồm cả phần mô hình quyết định. Thiết kế phải giả định mô hình sẽ chọn sai một tỉ lệ nào đó, và giới hạn thiệt hại của tỉ lệ đó ([[ranh-gioi-va-trach-nhiem]]).

## So sánh

| Tầng test | Bắt lỗi gì | Tốc độ | Tất định |
|---|---|---|---|
| Hàm công cụ | mã sai, thiếu kiểm quyền | nhanh | ✅ |
| Chọn công cụ | mô tả chưa rõ | chậm | gần đúng |
| Đầu cuối | lỗi ghép nối | chậm nhất | gần đúng |

## Dễ nhầm

**1. Chỉ test hàm công cụ.** Bỏ tầng mô hình chọn sai.

**2. Không có ca "thiếu thông tin thì hỏi lại".**

**3. Test gửi email thật.**

**4. Công cụ ghi không idempotent.**

**5. Không chạy chế độ chỉ-ghi-log trước.** Bỏ bước rẻ nhất.

**6. Bật mọi công cụ cho mọi người ngay.**

**7. Đổi mô tả công cụ mà không chạy lại test chọn công cụ.**

**8. Không theo dõi phân bố tần suất gọi công cụ.**

**9. Không log tham số.** Không kiểm toán được.

**10. Coi lỗi là "lỗi của mô hình".** Hệ thống là của bạn.

## Mẹo nhớ

> **Ba tầng test: HÀM, CHỌN CÔNG CỤ, ĐẦU CUỐI. Tầng giữa là tầng đặc thù và hay bị bỏ.**
>
> **Chạy chế độ CHỈ GHI LOG trước — đo chất lượng quyết định mà không chịu rủi ro.**
>
> **Phân bố tần suất gọi công cụ nói cho bạn biết MÔ TẢ nào đang sai.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba tầng test, mỗi tầng bắt lỗi gì?
2. Bốn ca phải có trong test chọn công cụ?
3. Bốn thứ phải có trước khi công cụ ghi chạm dữ liệu thật?
4. Bốn bước mở dần theo rủi ro, bước nào rẻ nhất và giá trị nhất?
5. Bốn chỉ số theo dõi, cái nào chẩn đoán tốt nhất?

## Tự viết lại

Bạn sắp thêm công cụ `huy_don_hang(maDon, lyDo)`. Không nhìn lại, viết:

```text
① ba tầng test, mỗi tầng vài ca cụ thể
② bốn thứ chuẩn bị trước khi lên production
③ kế hoạch mở dần
④ bốn chỉ số và ngưỡng cảnh báo
```

Tự kiểm: ở ③, bạn chạy chế độ chỉ-ghi-log bao lâu, và bạn tìm gì trong log đó?

## Thử sức

Trợ lý của bạn đã huỷ nhầm 3 đơn hàng trong tuần qua. Hàm `huy_don_hang` được test kỹ và hoàn toàn đúng: nó kiểm quyền, kiểm trạng thái đơn, và ghi log.

Ba câu để trả lời: lỗi nằm ở tầng nào, và vì sao test hàm không bắt được; bạn điều tra bằng dữ liệu nào; và ba biện pháp theo thứ tự ưu tiên. Câu khó nhất: nếu log cho thấy trong cả ba ca, người dùng chỉ **hỏi** về việc huỷ chứ chưa **yêu cầu** huỷ, vấn đề nằm ở đâu — và biện pháp nào nhắm đúng vào nó?
