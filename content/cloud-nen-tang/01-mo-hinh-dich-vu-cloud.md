---
title: Các mô hình dịch vụ cloud
slug: mo-hinh-dich-vu-cloud
summary: IaaS, PaaS, serverless, dịch vụ quản lý sẵn — bạn nhận gì và mất quyền kiểm soát gì ở mỗi mức.
level: co-ban
tags: [cloud, devops, kien-truc, chi-phi]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được mức trừu tượng phù hợp, và biết mình đang đánh đổi quyền kiểm soát lấy cái gì.

## Ý tưởng chính

Cloud không phải "máy chủ của người khác". Nó là một **thang trừu tượng**: mỗi bước lên, bạn giao thêm một phần trách nhiệm cho nhà cung cấp, và mất thêm một phần quyền kiểm soát.

Câu hỏi không phải "mức nào tốt nhất", mà **"phần trách nhiệm này có phải lợi thế cạnh tranh của chúng ta không?"** Nếu không, giao đi.

## Mental model

Hãy nghĩ tới **các cách có một bữa ăn**.

> **Tự trồng, tự nấu** — kiểm soát hoàn toàn, tốn nhiều thời gian nhất. Đó là máy chủ tự quản (on-premise).
>
> **Mua nguyên liệu, tự nấu** — không phải trồng, vẫn chọn được gia vị. Đó là **IaaS**: bạn có máy ảo, tự cài mọi thứ.
>
> **Bộ nguyên liệu sơ chế kèm công thức** — nhanh hơn nhiều, nhưng nấu theo cách của họ. Đó là **PaaS**.
>
> **Gọi món ở nhà hàng** — trả tiền theo món ăn, không quan tâm bếp. Đó là **serverless**.
>
> Nhà hàng nhanh và tiện. Nhưng **bạn không đổi được công thức**, và nếu quán đóng cửa thì bạn phải tìm chỗ khác — có thể món đó không nơi nào khác có.

Vế cuối là **vendor lock-in**, và nó là cái giá thật của việc lên cao trên thang này.

## Ví dụ nhỏ

```text
Tự quản     bạn lo: phần cứng, mạng, OS, runtime, app
IaaS        bạn lo: OS, runtime, app
PaaS        bạn lo: app, cấu hình
Serverless  bạn lo: một hàm
```

## Code chạy thế nào

**Bốn mức và trách nhiệm cụ thể:**

```text
IaaS (máy ảo: EC2, Droplet, Compute Engine)
  Bạn lo: hệ điều hành, bản vá bảo mật, runtime, triển khai,
          scaling, giám sát, sao lưu
  Được:   kiểm soát hoàn toàn; chạy được mọi thứ
  Trả:    công vận hành liên tục, và nó không bao giờ hết

PaaS (Heroku, Render, App Service, Cloud Run)
  Bạn lo: mã và cấu hình
  Được:   deploy bằng một lệnh, scaling sẵn có, HTTPS sẵn có
  Trả:    ít quyền tuỳ chỉnh; đắt hơn IaaS ở quy mô lớn;
          "chạy được ở đây" gắn với nền tảng đó

SERVERLESS (Lambda, Cloud Functions, Vercel Functions)
  Bạn lo: một hàm và các biến môi trường
  Được:   trả theo lần dùng; tự mở rộng về 0 và lên rất cao
  Trả:    cold start; giới hạn thời gian chạy;
          gỡ lỗi khó hơn; khó chạy tác vụ dài;
          KHÔNG giữ được trạng thái giữa các lần gọi

DỊCH VỤ QUẢN LÝ SẴN (RDS, ElastiCache, S3, SQS)
  Bạn lo: schema và truy vấn
  Được:   sao lưu, bản vá, chuyển đổi dự phòng, replica — sẵn có
  Trả:    đắt hơn tự dựng; ít tinh chỉnh sâu
```

**Serverless — hai giới hạn quyết định nó có phù hợp không:**

```text
① CỐ ĐỊNH TRẠNG THÁI KHÔNG GIỮ ĐƯỢC
   Mỗi lần gọi có thể ở một container khác.
   ⇒ Không cache trong tiến trình, không giữ kết nối WebSocket,
     không dùng biến toàn cục làm bộ đếm.

② KẾT NỐI CSDL
   1.000 lần gọi đồng thời ⇒ có thể 1.000 kết nối tới Postgres.
   ⇒ Postgres mặc định max_connections = 100 ⇒ vỡ.
   ⇒ Bắt buộc cần connection pooler ở giữa
     ([[mo-rong-va-can-bang-tai]]).
```

Giới hạn ② là bất ngờ phổ biến nhất khi chuyển sang serverless: mọi thứ chạy đúng ở tải thấp và vỡ đúng lúc thành công.

## Cú pháp

**Mô hình trách nhiệm chung — chỗ hay hiểu sai nhất về bảo mật:**

```text
NHÀ CUNG CẤP lo: bảo mật CỦA cloud
  trung tâm dữ liệu, phần cứng, ảo hoá, mạng vật lý

BẠN lo: bảo mật TRONG cloud
  □ Ai được truy cập gì (IAM)
  □ Nhóm bảo mật, tường lửa
  □ Mã hoá dữ liệu
  □ Bản vá hệ điều hành (ở IaaS)
  □ Cấu hình của dịch vụ quản lý sẵn

⇒ "Dùng cloud nên an toàn" là một câu sai.
  Phần lớn vụ rò rỉ dữ liệu trên cloud đến từ CẤU HÌNH SAI
  của người dùng: một bucket lưu trữ để công khai, một security
  group mở 0.0.0.0/0 ([[tuong-lua-nat-va-vpn]]).
```

**Vùng và vùng khả dụng — hai khái niệm khác nhau:**

```text
REGION (vùng)            khu vực địa lý: ap-southeast-1 (Singapore)
AVAILABILITY ZONE (AZ)   trung tâm dữ liệu độc lập TRONG một vùng

Chọn region theo: gần người dùng (độ trễ), yêu cầu pháp lý
                  về nơi lưu dữ liệu, và giá (khác nhau đáng kể)

Dùng nhiều AZ:    chống mất một trung tâm dữ liệu.
                  Chi phí thấp, hầu như luôn nên làm.
Dùng nhiều REGION: chống mất cả một vùng.
                  Chi phí và độ phức tạp CAO — dữ liệu phải
                  đồng bộ qua khoảng cách địa lý.
                  ⇒ Chỉ khi thật sự cần.
```

Và nhớ: **truyền dữ liệu giữa các AZ và giữa các region đều có phí**, thường là dòng gây bất ngờ nhất trên hoá đơn ([[chi-phi-ha-tang]]).

**Vendor lock-in — đo bằng chi phí rời đi:**

```text
Mức thấp:  máy ảo, container, Postgres quản lý sẵn
           ⇒ chuyển đi được, chủ yếu là công
Mức vừa:   hàng đợi, lưu trữ đối tượng của nhà cung cấp
           ⇒ API riêng, nhưng có thể bọc lại sau một interface
Mức cao:   dịch vụ độc quyền không có tương đương
           ⇒ chuyển đi = viết lại phần đó

⇒ Đừng cố tránh lock-in bằng mọi giá — nó thường tốn nhiều hơn
  lợi ích. Nhưng hãy BIẾT mình đang ở mức nào, và đừng đặt
  phần cốt lõi nhất của hệ thống ở mức cao.
```

## Tại sao cần nó

Vì mức đúng phụ thuộc vào **quy mô đội**, không chỉ quy mô hệ thống:

```text
Đội 3 người:
  Vận hành máy ảo tiêu một phần lớn thời gian của một người.
  ⇒ PaaS + dịch vụ quản lý sẵn gần như luôn đúng, dù đắt hơn
    trên hoá đơn. Bạn đang mua thời gian.

Đội 30 người, có người vận hành chuyên trách:
  Kiểm soát và chi phí trở nên quan trọng hơn.
  ⇒ IaaS hoặc container có thể rẻ hơn đáng kể.

⇒ So sánh phải là: giá hoá đơn + THỜI GIAN NGƯỜI.
  Bỏ vế thứ hai thì mọi so sánh đều nghiêng về IaaS,
  và kết luận đó thường sai với đội nhỏ.
```

**Nguyên tắc chọn:**

```text
① Phần nào KHÔNG phải lợi thế cạnh tranh của bạn ⇒ giao cho
  nhà cung cấp. Vận hành Postgres không làm sản phẩm bạn tốt hơn.
② Bắt đầu ở mức trừu tượng CAO. Đi xuống khi có lý do đo được
  (chi phí, hoặc một giới hạn cụ thể đang cản).
③ Đừng dựng Kubernetes cho ba dịch vụ.
④ Đừng tự quản CSDL nếu chưa có người biết khôi phục nó
  ([[giam-sat-va-sao-luu]]).
```

## So sánh

| | IaaS | PaaS | Serverless |
|---|---|---|---|
| Bạn quản OS | ✅ | ❌ | ❌ |
| Kiểm soát | cao | vừa | thấp |
| Tốc độ khởi đầu | chậm | nhanh | nhanh nhất |
| Giá ở tải thấp | cao (chạy 24/7) | vừa | **rất thấp** |
| Giá ở tải rất cao | thấp | cao | cao |
| Giữ trạng thái | ✅ | ✅ | ❌ |
| Tác vụ dài | ✅ | ✅ | giới hạn |

## Dễ nhầm

**1. Tin "dùng cloud nên an toàn".** Cấu hình sai là nguyên nhân chính của rò rỉ.

**2. So sánh chỉ bằng giá hoá đơn.** Bỏ mất thời gian người.

**3. Serverless mà không có connection pooler.** Vỡ khi tải lên.

**4. Cache trong tiến trình ở serverless.** Mỗi lần gọi một container.

**5. Dựng Kubernetes cho ba dịch vụ.**

**6. Tự quản CSDL mà chưa từng thử khôi phục.**

**7. Quên phí truyền dữ liệu giữa AZ và giữa region.**

**8. Đặt ứng dụng và CSDL ở hai region khác nhau "cho an toàn".** Chậm hơn và tốn hơn.

**9. Cố tránh lock-in bằng mọi giá.** Thường tốn hơn lợi ích.

**10. Không biết mình đang lock-in ở mức nào.**

## Mẹo nhớ

> **Mỗi bước lên thang: giao thêm TRÁCH NHIỆM, mất thêm KIỂM SOÁT.**
>
> **Phần nào không phải lợi thế cạnh tranh ⇒ giao cho nhà cung cấp.**
>
> **Bảo mật CỦA cloud là của họ. Bảo mật TRONG cloud là của bạn.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn mức, mỗi mức bạn lo gì?
2. Hai giới hạn quyết định của serverless?
3. Mô hình trách nhiệm chung chia thế nào?
4. Region khác AZ ra sao, dùng nhiều cái nào thì đáng?
5. Vì sao so sánh chi phí phải tính cả thời gian người?

## Tự viết lại

Không nhìn lại, chọn mức và giải thích cho từng trường hợp:

```text
① Startup 3 người, một ứng dụng web + Postgres
② API xử lý webhook, lưu lượng rất thất thường
③ Dịch vụ xử lý video, mỗi job 20 phút
④ Sàn thương mại 30 kỹ sư, tải cao và đều
⑤ Cron chạy mỗi đêm, 5 phút mỗi lần
```

Tự kiểm: ở ③, vì sao serverless thường không phù hợp — và giới hạn cụ thể nào?

## Thử sức

Đội bạn đang chạy trên PaaS, hoá đơn 4.000 USD/tháng. Có người đề xuất chuyển sang máy ảo tự quản để "tiết kiệm một nửa".

Ba câu để trả lời: bạn tính chi phí thật của cả hai phương án như thế nào; những gì đội phải nhận thêm trách nhiệm; và bạn cần điều kiện gì để đồng ý. Câu khó nhất: nếu tiết kiệm được 2.000 USD/tháng nhưng cần thêm 20% thời gian của một kỹ sư, đó là lãi hay lỗ — và câu trả lời phụ thuộc vào điều gì?
