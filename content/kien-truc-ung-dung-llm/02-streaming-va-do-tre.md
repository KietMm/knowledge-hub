---
title: Streaming và độ trễ
slug: streaming-va-do-tre
summary: Thời gian tới token đầu tiên quan trọng hơn tổng thời gian — và cách streaming thay đổi cả kiến trúc.
level: trung-cap
tags: [ai, llm, hieu-nang, sse]
khung: v2
---

> **Sau bài này bạn sẽ:** biết đo đúng hai loại độ trễ, và những gì streaming làm khó hơn.

## Ý tưởng chính

Mô hình sinh token dần. Nên có hai con số độ trễ rất khác nhau: **thời gian tới token đầu tiên**, và **tổng thời gian**.

Với người dùng, con số thứ nhất quyết định cảm nhận. Một câu trả lời bắt đầu hiện sau 400ms và kéo dài 8 giây cảm giác nhanh hơn một câu trả lời im lặng 3 giây rồi hiện hết.

## Mental model

Hãy nghĩ tới **hai cách người ta trả lời bạn qua điện thoại**.

> **Cách một**: bạn hỏi, họ im lặng ba giây, rồi nói một tràng.
>
> **Cách hai**: bạn hỏi, họ bắt đầu nói ngay — "để tôi xem... đơn hàng của bạn hiện đang..." — và nói chậm hơn, tổng cộng lâu hơn cách một.
>
> Cách hai **cảm giác nhanh hơn**, dù thực tế lâu hơn. Vì ba giây im lặng làm bạn không biết họ có nghe thấy không.

Và có một chi tiết nữa: khi họ nói dần, bạn **ngắt lời được** nếu thấy họ hiểu sai. Với cách một thì bạn phải chờ hết.

## Ví dụ nhỏ

```text
Không streaming:  [im lặng 3.2s] → toàn bộ câu trả lời
Streaming:        [0.4s] → "Đơn" "hàng" "của" ... → xong ở 4.1s

Tổng lâu hơn. Cảm nhận nhanh hơn rõ rệt.
```

## Code chạy thế nào

**Hai con số phải đo riêng:**

```text
TTFT — thời gian tới token đầu tiên
  Gồm: mạng + xử lý ngữ cảnh + sinh token đầu
  ⇒ Quyết định CẢM NHẬN. Nhắm dưới 1 giây.
  ⇒ Ngữ cảnh dài làm TTFT tăng — đây là một lý do nữa
    để không nhồi ngữ cảnh ([[token-va-context-window]]).

TỔNG THỜI GIAN
  TTFT + (số token đầu ra × thời gian mỗi token)
  ⇒ Quyết định khi nào người dùng đọc xong.
```

```text
Hệ quả về tối ưu:
  Giảm TTFT   → giảm ngữ cảnh, dùng mô hình nhanh hơn,
                bỏ các bước trước lời gọi (truy hồi chậm)
  Giảm tổng   → giảm độ dài đầu ra
⇒ Hai mục tiêu khác nhau, hai cách tối ưu khác nhau.
```

**Streaming về mặt kỹ thuật:**

```text
Mô hình → server của bạn → client
  Cả hai chặng phải streaming. Một chặng đệm lại là mất hết.

Ở chặng thứ hai, gần như luôn dùng SSE:
  □ Một chiều (server → client) — đúng nhu cầu
  □ Chạy trên HTTP thường, qua proxy và CDN dễ
  □ Trình duyệt tự kết nối lại
  ⇒ WebSocket là quá mức cho việc này
    ([[websocket-va-sse]])
```

```text
Ba chỗ hay đệm lại và làm mất streaming:
  □ Nginx: cần `proxy_buffering off` cho endpoint đó
  □ Nền tảng serverless: một số nền tảng đệm phản hồi
  □ Middleware nén hoặc middleware ghi log đọc hết body
```

## Cú pháp

**Streaming làm bốn thứ khó hơn:**

```text
① XÁC THỰC ĐẦU RA
   Bạn đã gửi nửa câu trả lời rồi mới biết nó sai.
   ⇒ Không thể "kiểm rồi mới gửi".

② ĐẦU RA CÓ CẤU TRÚC
   JSON chưa đóng ngoặc thì chưa parse được.
   ⇒ Streaming JSON cần parse tăng dần, hoặc chấp nhận chờ.

③ XỬ LÝ LỖI GIỮA DÒNG
   Mô hình lỗi sau khi đã gửi 200 token ⇒ nói gì với người dùng?

④ ĐO LƯỜNG
   Token đếm được khi nào? Chi phí biết khi nào?
   ⇒ Phải cộng dồn trong lúc stream, và ghi lại khi kết thúc.
```

**Cách xử lý bốn vấn đề đó:**

```text
① Xác thực:
   □ Việc CẦN kiểm trước khi gửi ⇒ KHÔNG streaming
     (quyết định, hành động, số tiền)
   □ Việc chỉ để đọc ⇒ streaming, và kiểm SAU, hiện cảnh báo
     nếu phát hiện vấn đề
   ⇒ Nói cách khác: streaming cho phần TRÌNH BÀY,
     không streaming cho phần QUYẾT ĐỊNH.

② Cấu trúc:
   □ Trả về hai phần: phần văn bản stream được, phần dữ liệu
     có cấu trúc gửi ở cuối
   □ Hoặc streaming theo từng mục hoàn chỉnh, không theo token

③ Lỗi giữa dòng:
   □ Gửi một sự kiện lỗi rõ ràng trên chính stream
   □ Client hiện: "Câu trả lời bị ngắt. [Thử lại]"
   □ ĐỪNG để nó dừng im lặng — người dùng tưởng đó là hết câu.

④ Đo lường:
   □ Cộng dồn token trong lúc stream
   □ Ghi log khi stream kết thúc HOẶC bị hủy
   □ Đếm cả trường hợp người dùng bỏ giữa chừng
```

**Người dùng huỷ giữa dòng — phải xử lý:**

```text
Người dùng đóng tab hoặc bấm dừng.
⇒ Client ngắt kết nối.
⇒ Server PHẢI ngắt lời gọi mô hình.

Không ngắt: bạn vẫn trả tiền cho phần token còn lại.
⇒ Với lưu lượng lớn, đây là một khoản thật.
⇒ Cách làm: truyền signal huỷ từ request xuống lời gọi mô hình.
```

## Tại sao cần nó

Vì streaming là **yêu cầu chức năng** cho phần lớn ứng dụng LLM, không phải một tối ưu:

```text
Câu trả lời dài 500 token, mô hình sinh ~50 token/giây
⇒ 10 giây.

Không streaming: người dùng nhìn màn hình trống 10 giây.
  ⇒ Nhiều người sẽ tưởng hệ thống treo và tải lại trang.
Streaming: bắt đầu đọc sau 0,5 giây.
```

**Ba trường hợp KHÔNG nên streaming:**

```text
❌ Đầu ra là dữ liệu có cấu trúc để hệ thống dùng
   ⇒ Không ai đọc nó; streaming chỉ thêm phức tạp.
❌ Cần kiểm đầu ra trước khi hiển thị
   ⇒ Quyết định, số tiền, hành động.
❌ Đầu ra rất ngắn (dưới ~50 token)
   ⇒ Nó xong trước khi người dùng kịp nhận ra.
```

**Và một cách giảm TTFT cảm nhận mà không giảm TTFT thật:**

```text
Hiện TIẾN TRÌNH của các bước trước lời gọi mô hình:
  "Đang tìm tài liệu liên quan..." → "Đang soạn câu trả lời..."

⇒ Nếu truy hồi mất 800ms, người dùng thấy hệ thống đang làm
  việc thay vì thấy màn hình trống.
⇒ Với luồng agent nhiều bước, đây không phải trang trí — nó là
  cách duy nhất làm khoảng chờ dài chịu được
  ([[vong-lap-agent]]).
```

## So sánh

| | Không streaming | Streaming |
|---|---|---|
| Cảm nhận tốc độ | chậm | **nhanh** |
| Kiểm trước khi gửi | ✅ | ❌ |
| Đầu ra có cấu trúc | dễ | khó hơn |
| Xử lý lỗi | đơn giản | cần sự kiện lỗi |
| Người dùng ngắt được | ❌ | ✅ |
| Phù hợp | dữ liệu, quyết định | văn bản người đọc |

## Dễ nhầm

**1. Chỉ đo tổng thời gian.** TTFT quyết định cảm nhận.

**2. Đệm lại ở một chặng.** Mất hết lợi ích streaming.

**3. Quên `proxy_buffering off` ở Nginx.**

**4. Streaming cho đầu ra cần kiểm trước.**

**5. Streaming cho dữ liệu có cấu trúc.** Thêm phức tạp, không được gì.

**6. Lỗi giữa dòng dừng im lặng.** Người dùng tưởng là hết câu.

**7. Không ngắt lời gọi mô hình khi người dùng huỷ.** Trả tiền vô ích.

**8. Không đếm token khi người dùng bỏ giữa chừng.**

**9. Không hiện tiến trình các bước trước lời gọi.**

**10. Streaming cho đầu ra rất ngắn.**

## Mẹo nhớ

> **TTFT quyết định CẢM NHẬN. Tổng thời gian quyết định khi nào đọc xong. Đo cả hai.**
>
> **Streaming cho phần TRÌNH BÀY, không streaming cho phần QUYẾT ĐỊNH.**
>
> **Người dùng huỷ ⇒ phải NGẮT lời gọi mô hình, nếu không bạn vẫn trả tiền.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Hai con số độ trễ, mỗi cái quyết định gì?
2. Cách giảm TTFT khác cách giảm tổng thời gian thế nào?
3. Bốn thứ streaming làm khó hơn?
4. Ba trường hợp không nên streaming?
5. Vì sao phải ngắt lời gọi mô hình khi người dùng huỷ?

## Tự viết lại

Không nhìn lại, thiết kế cho trợ lý trả lời câu hỏi có RAG:

```text
① những chặng nào trước lời gọi mô hình, và hiện gì cho người dùng
② streaming phần nào, không streaming phần nào
③ xử lý lỗi giữa dòng
④ đo gì và ghi log khi nào
⑤ xử lý khi người dùng huỷ
```

Tự kiểm: nếu câu trả lời kèm một danh sách trích dẫn có cấu trúc, bạn gửi nó lúc nào — cùng stream hay ở cuối?

## Thử sức

Trợ lý của bạn có TTFT là 2,8 giây và tổng thời gian 9 giây. Người dùng phàn nàn "chậm và hay tưởng bị treo".

Ba câu để trả lời: bạn phân tích 2,8 giây đó gồm những gì; ba hướng giảm TTFT theo thứ tự hiệu quả; và bạn cải thiện cảm nhận **ngay** trong lúc chưa giảm được TTFT thật. Câu khó nhất: nếu 2 trong 2,8 giây là thời gian truy hồi RAG, giảm nó bằng cách nào — và có cách nào bắt đầu stream **trước khi** truy hồi xong không?
