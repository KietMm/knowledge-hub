---
title: Ra quyết định kỹ thuật
slug: ra-quyet-dinh-ky-thuat
summary: Phân biệt quyết định đảo được với không đảo được, viết ADR, và thoát khỏi cuộc họp không có kết luận.
level: co-ban
tags: [dan-dat, adr, quyet-dinh, danh-doi]
khung: v2
---

> **Sau bài này bạn sẽ:** phân loại được quyết định theo mức đảo ngược, và viết ADR ghi lại **vì sao** chứ không chỉ **cái gì**.

## Ý tưởng chính

Sai lầm phổ biến nhất không phải ra quyết định sai. Là **dùng sai mức công sức cho loại quyết định đó**:

Bàn ba tuần về một thứ đổi lại trong một ngày. Và quyết định trong mười phút một thứ phải sống chung năm năm.

## Mental model

Hãy nghĩ tới **cửa một chiều và cửa hai chiều**.

> **Cửa hai chiều**: bước qua, thấy không ổn thì quay lại. Không cần đứng ngoài phân tích lâu — cách nhanh nhất để biết là bước vào.
>
> **Cửa một chiều**: qua rồi không quay lại được, hoặc quay lại rất đắt. Đứng lại, nghĩ kỹ, hỏi thêm người.
>
> Phần lớn cửa là hai chiều. Nhưng người ta thường đối xử với chúng như cửa một chiều — vì cẩn thận **trông** giống chuyên nghiệp.

Ngược lại cũng đúng và tệ hơn: một cửa một chiều bị xử lý như cửa hai chiều thì hậu quả kéo dài nhiều năm.

## Ví dụ nhỏ

```text
Cửa hai chiều (đảo được dễ):
  Thư viện quản lý state, thư viện UI, định dạng log, công cụ CI
  ⇒ quyết trong ngày, thử, sai thì đổi.

Cửa một chiều (đắt để đảo):
  CSDL chính, ngôn ngữ, mô hình dữ liệu, ranh giới service,
  nền tảng cloud, định dạng API công khai
  ⇒ dành thời gian, viết ADR, hỏi người có kinh nghiệm.
```

## Code chạy thế nào

**Khung năm bước:**

```text
① VẤN ĐỀ THẬT LÀ GÌ
   "Cần chuyển sang microservices" ← đó là GIẢI PHÁP, không phải vấn đề.
   Hỏi ngược: "deploy hay xung đột" ← đây mới là vấn đề.
   ⇒ Nhiều cuộc tranh luận biến mất ngay tại bước này.

② LOẠI QUYẾT ĐỊNH  cửa một chiều hay hai chiều?
   ⇒ Quyết định mức công sức bỏ ra cho các bước sau.

③ 2–3 PHƯƠNG ÁN, kèm đánh đổi
   Chỉ có một phương án nghĩa là bạn chưa cân nhắc, chỉ đang biện hộ.
   LUÔN đưa "không làm gì" vào danh sách.

④ TIÊU CHÍ, đặt TRƯỚC khi so sánh
   Nếu đặt tiêu chí sau, bạn sẽ chọn tiêu chí phù hợp với đáp án đã thích.

⑤ QUYẾT, GHI LẠI, ĐI TIẾP
   Không quyết cũng là một quyết định — thường là quyết định tệ nhất,
   vì bạn trả chi phí chờ đợi mà không nhận được gì.
```

**ADR — ghi lại VÌ SAO:**

```markdown
# ADR-012: Dùng PostgreSQL làm CSDL chính

## Trạng thái
Chấp nhận — 2026-08-21

## Bối cảnh
Cần CSDL cho hệ thống đặt hàng. Dữ liệu quan hệ rõ, cần
transaction. Đội quen SQL. Dự kiến < 500 GB trong 2 năm.

## Phương án đã cân nhắc
1. PostgreSQL — quen thuộc, JSONB linh hoạt, hệ sinh thái tốt
2. MongoDB — schema linh hoạt, nhưng transaction đa văn bản phức tạp
   hơn và mô hình dữ liệu của ta vốn quan hệ
3. MySQL — tương đương, nhưng đội ít kinh nghiệm hơn

## Quyết định
PostgreSQL.

## Hệ quả
+ Transaction mạnh, JSONB cho phần bán cấu trúc
+ Đội làm được ngay
− Mở rộng ghi ngang khó hơn; chấp nhận vì chưa cần trong 2 năm
− Cần người biết vận hành Postgres
```

```text
Giá trị thật của ADR nằm ở mục "Bối cảnh" và "Phương án đã cân nhắc".

Sáu tháng sau, có người hỏi "sao không dùng X?"
  Không có ADR: tranh luận lại từ đầu, với thông tin đã mất.
  Có ADR:       "đã cân nhắc, lý do là ..., và giả định là ...
                 giả định đó còn đúng không?"
```

Và điều đó dẫn tới cách dùng ADR đúng: nó không phải để bảo vệ quyết định cũ, mà để **kiểm tra xem giả định của quyết định cũ còn đúng không**.

## Cú pháp

**Thoát khỏi cuộc họp không có kết luận:**

```text
① Đặt câu hỏi cụ thể trước cuộc họp
   ❌ "Bàn về kiến trúc"
   ✅ "Chọn CSDL cho hệ thống đặt hàng. Quyết định trong hôm nay."

② Gửi tài liệu TRƯỚC — phương án và đánh đổi

③ Nói rõ AI QUYẾT
   Đồng thuận là mục tiêu tốt, nhưng không phải phương pháp:
   nó biến thành "chờ tới khi người phản đối cuối cùng mệt".

④ Hết giờ mà chưa quyết:
   → "Cần thêm thông tin gì? Ai lấy? Bao giờ? Ta quyết vào lúc nào?"
   → KHÔNG hẹn "họp lại tuần sau" mà không có ba câu trả lời trên.
```

**Bất đồng nhưng cam kết:**

```text
Bạn phản đối, nhưng quyết định đã được đưa ra.
⇒ Nói rõ: "Tôi vẫn nghĩ X tốt hơn vì lý do này, nhưng tôi
  cam kết làm theo Y và làm cho nó thành công."

Không: âm thầm làm nửa vời rồi nói "tôi đã bảo rồi".
Vế sau phá hoại nhiều hơn một quyết định sai.
```

**Ghi lại giả định để biết khi nào xem lại:**

```text
"Chọn Postgres vì dự kiến < 500 GB và < 1.000 req/s."

⇒ Đó là ĐIỀU KIỆN KÍCH HOẠT xem lại, viết ra rõ ràng.
⇒ Chạm 400 GB ⇒ mở ADR ra, kiểm tra, không phải hoảng.
```

## Tại sao cần nó

Vì hai lỗi ngược nhau đều tốn kém:

```text
QUÁ PHÂN TÍCH cửa hai chiều:
  Ba tuần chọn thư viện form.
  ⇒ Mất ba tuần, và câu trả lời "thử một cái, sai thì đổi"
    vốn chỉ mất một ngày.

QUÁ VỘI ở cửa một chiều:
  Chọn CSDL trong một cuộc họp 30 phút.
  ⇒ Sống chung nhiều năm, hoặc trả giá bằng một dự án di chuyển.
```

**Nguyên tắc nhận diện nhanh:** hỏi *"nếu sáu tháng nữa thấy sai, đổi lại tốn bao nhiêu?"*

```text
Vài ngày   → cửa hai chiều, quyết nhanh, đừng họp nhiều.
Vài tháng  → cửa một chiều, viết ADR, hỏi thêm người.
```

**Và một điều dễ bỏ qua: quyết định cũng có chi phí thời gian.** Một tuần chờ quyết định là một tuần cả đội không làm được phần phụ thuộc vào nó. Với cửa hai chiều, **chi phí chờ thường lớn hơn chi phí chọn sai**.

## So sánh

| | Cửa hai chiều | Cửa một chiều |
|---|---|---|
| Đảo lại | dễ, rẻ | khó, đắt |
| Công sức | thấp — thử luôn | cao — phân tích |
| Ai quyết | một người | có bàn bạc |
| ADR | không cần | **cần** |
| Ví dụ | thư viện, công cụ | CSDL, ngôn ngữ, ranh giới |

## Dễ nhầm

**1. Đối xử với cửa hai chiều như cửa một chiều.** Mất thời gian, chậm cả đội.

**2. Đối xử với cửa một chiều như cửa hai chiều.** Trả giá nhiều năm.

**3. Chỉ có một phương án.** Đó là biện hộ, không phải cân nhắc.

**4. Quên "không làm gì".** Thường là phương án tốt nhất.

**5. Đặt tiêu chí sau khi đã có đáp án ưa thích.**

**6. Không ghi lại lý do.** Tranh luận lại từ đầu sau sáu tháng.

**7. Không nói rõ ai quyết.** Họp mãi không kết luận.

**8. Chờ đồng thuận tuyệt đối.** Người phản đối cuối cùng có quyền phủ quyết.

**9. Bất đồng rồi làm nửa vời.** Phá hoại hơn một quyết định sai.

**10. Không ghi giả định.** Không biết khi nào cần xem lại.

## Mẹo nhớ

> **Hỏi trước: "sáu tháng nữa đổi lại tốn bao nhiêu?"**
>
> **ADR ghi lại BỐI CẢNH và PHƯƠNG ÁN ĐÃ LOẠI — không chỉ kết luận.**
>
> **Bất đồng nhưng cam kết. Làm nửa vời tệ hơn quyết định sai.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Cửa một chiều khác cửa hai chiều thế nào, nhận biết bằng câu hỏi nào?
2. Năm bước của khung ra quyết định?
3. Phần nào của ADR có giá trị lâu dài nhất, vì sao?
4. Vì sao phải ghi lại giả định?
5. "Bất đồng nhưng cam kết" nghĩa là gì?

## Tự viết lại

Đội cần chọn giữa REST và GraphQL cho API mới. Không nhìn lại, viết ADR đầy đủ: bối cảnh, ba phương án (nhớ cả "giữ nguyên"), tiêu chí đặt trước, quyết định, hệ quả, và **giả định** kèm điều kiện xem lại.

Tự kiểm: đây là cửa một chiều hay hai chiều — và câu trả lời đó có đổi cách bạn viết ADR không?

## Thử sức

Đội tranh luận ba tuần về việc chọn thư viện quản lý state, chưa quyết được. Mọi người bắt đầu bực bội.

Ba câu để trả lời: bạn nhận ra vấn đề gì ở đây; bạn làm gì để kết thúc trong hôm nay; và bạn tránh lặp lại bằng cách nào. Câu khó nhất: nếu ba tuần đó thực ra là tranh luận về một thứ **khác** — ai được quyết định kiến trúc frontend — thì bạn xử lý ra sao?
