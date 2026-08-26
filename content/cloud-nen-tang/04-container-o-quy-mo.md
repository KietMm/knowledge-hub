---
title: Container ở quy mô — orchestrator
slug: container-o-quy-mo
summary: Kubernetes giải quyết vấn đề gì, cái giá của nó, và ba lựa chọn nhẹ hơn thường đủ dùng.
level: nang-cao
tags: [cloud, kubernetes, container, devops]
khung: v2
---

> **Sau bài này bạn sẽ:** biết Kubernetes giải vấn đề gì, và nhận ra khi nào bạn chưa có vấn đề đó.

## Ý tưởng chính

Chạy container trên **một máy** là chuyện đã giải quyết: Docker Compose làm được.

Vấn đề bắt đầu ở **nhiều máy**: container nào chạy ở máy nào, ai phát hiện máy chết, ai chuyển traffic, ai cập nhật phiên bản mà không gián đoạn.

Orchestrator giải đúng nhóm câu hỏi đó. Và nếu bạn chưa có nhóm câu hỏi đó, nó chỉ là chi phí.

## Mental model

Hãy nghĩ tới **quản lý ca làm việc**.

> **Một quán nhỏ, ba người**: chủ quán tự phân việc mỗi sáng. Ai nghỉ thì gọi người khác. Không cần hệ thống gì.
>
> **Chuỗi 50 cửa hàng, 800 người**: không ai phân tay được. Cần một hệ thống biết mỗi cửa hàng cần bao nhiêu người, ai đang nghỉ, ai thay được ai, và tự điều chỉnh.
>
> Hệ thống đó rất mạnh. Nhưng cho quán ba người, nó là **một hệ thống nữa phải vận hành** — và chủ quán vẫn phải học cách dùng nó trước khi phân được việc cho ba người.

Kubernetes là hệ thống quản lý ca đó. Câu hỏi duy nhất cần trả lời trung thực: **bạn đang có ba người hay tám trăm?**

## Ví dụ nhỏ

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: api
          image: registry/api:1.4.2
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits:   { memory: 512Mi }
```

## Code chạy thế nào

**Năm việc orchestrator làm:**

```text
① LẬP LỊCH        container này chạy ở máy nào (theo tài nguyên còn trống)
② TỰ CHỮA         container chết → khởi động lại; máy chết → chuyển sang máy khác
③ PHÁT HIỆN DỊCH VỤ  tên dịch vụ → địa chỉ các bản sao đang sống
④ CẬP NHẬT DẦN    thay từng bản sao, không gián đoạn, quay lui được
⑤ TỰ MỞ RỘNG      tải cao → thêm bản sao; thấp → giảm
```

```text
Việc ② và ④ là hai lý do chính đáng nhất.
Việc ⑤ nghe hấp dẫn nhất nhưng ít dự án thật sự dùng —
và nó chỉ hoạt động tốt khi ứng dụng đã phi trạng thái
và khởi động nhanh ([[mo-rong-va-can-bang-tai]]).
```

**Requests và limits — hai con số hay bị đặt sai:**

```text
requests   Lượng tài nguyên ĐẢM BẢO. Dùng để LẬP LỊCH.
limits     Trần. Vượt thì bị chặn hoặc bị giết.

CPU:  vượt limit ⇒ bị BÓP (throttle), không bị giết
      ⇒ triệu chứng: p99 tăng vọt, %CPU trung bình vẫn thấp
      ⇒ đây là nguyên nhân "chậm bất thường" phổ biến nhất
        trong Kubernetes, và nó KHÔNG hiện trên biểu đồ CPU
        ([[lap-lich-va-uu-tien]])

RAM:  vượt limit ⇒ bị GIẾT ngay (OOMKilled)
      ⇒ và runtime như Node/JVM thường đọc RAM của MÁY,
        không đọc limit ⇒ tự đặt heap quá lớn ⇒ bị giết khi có tải
        ⇒ phải khai rõ: --max-old-space-size, -XX:MaxRAMPercentage
```

```text
Kinh nghiệm đặt:
  requests theo mức dùng THẬT (p50–p95 quan sát được)
  limits RAM  = requests × 1,5–2
  limits CPU  → cân nhắc KHÔNG đặt cho dịch vụ nhạy độ trễ,
                vì bị bóp còn tệ hơn dùng nhiều CPU một lúc
```

## Cú pháp

**Ba loại probe — mỗi cái một việc:**

```yaml
livenessProbe:   { httpGet: { path: /health }, periodSeconds: 10 }
readinessProbe:  { httpGet: { path: /ready },  periodSeconds: 5 }
startupProbe:    { httpGet: { path: /health }, failureThreshold: 30 }
```

```text
LIVENESS   "còn sống không?" → thất bại ⇒ KHỞI ĐỘNG LẠI
           ⇒ KHÔNG kiểm phụ thuộc ở đây. CSDL chậm một nhịp
             ⇒ khởi động lại hàng loạt ⇒ CSDL nhận thêm bão kết nối.
READINESS  "nhận traffic được chưa?" → thất bại ⇒ GỠ khỏi load balancer
           ⇒ chỗ ĐÚNG để kiểm phụ thuộc.
STARTUP    "đã khởi động xong chưa?" → cho ứng dụng chậm khởi động
             thời gian, không bị liveness giết oan.
```

Gộp liveness với readiness là lỗi cấu hình gây sự cố lan rộng nhất trong Kubernetes ([[idempotency-va-tin-cay-o-backend]]).

**Ba lựa chọn nhẹ hơn — thường đủ dùng:**

```text
① MỘT MÁY + DOCKER COMPOSE + restart: always
   Đủ cho: hầu hết hệ thống dưới vài nghìn req/s
   Thiếu:  chuyển đổi khi máy chết, cập nhật không gián đoạn

② PaaS CHẠY CONTAINER (Cloud Run, Fly, Render, App Runner)
   Được:  scaling, HTTPS, deploy dần, tự chữa — không vận hành cụm
   Thiếu: ít quyền tinh chỉnh; đắt hơn ở tải rất cao
   ⇒ ĐÂY là lựa chọn đúng cho phần lớn đội dưới 20 người

③ KUBERNETES QUẢN LÝ SẴN (EKS/GKE/AKS)
   Được:  không tự vận hành control plane
   Vẫn phải: hiểu Kubernetes, quản node, networking, nâng cấp
   ⇒ Chỉ "nhẹ hơn" một phần
```

**Cái giá của Kubernetes — nói rõ:**

```text
□ Một lớp khái niệm hoàn toàn mới: pod, service, ingress, PVC,
  namespace, ConfigMap, secret, RBAC
□ Networking phức tạp hơn hẳn — và gỡ lỗi mạng trong cụm là
  một kỹ năng riêng
□ Nâng cấp cụm định kỳ, và nó có thể phá vỡ thứ đang chạy
□ YAML rất nhiều ⇒ cần Helm hoặc Kustomize ⇒ thêm một lớp nữa
□ Cần ít nhất một người trong đội thật sự hiểu nó
  ⇒ và người đó thành điểm phụ thuộc duy nhất

⇒ Nếu không ai trong đội tự tin gỡ lỗi cụm lúc 3 giờ sáng,
  bạn chưa nên vận hành cụm.
```

## Tại sao cần nó

Vì cả hai hướng sai đều tốn kém — nhưng theo hai cách khác nhau:

```text
DÙNG KUBERNETES QUÁ SỚM:
  Trả toàn bộ chi phí học và vận hành ngay.
  Nhận lợi ích cho một quy mô chưa tới.
  Và mọi sự cố đều dài hơn, vì thêm một tầng phải loại trừ.

CHẠY MỘT MÁY QUÁ LÂU:
  Mỗi lần bảo trì là downtime. Mỗi sự cố phần cứng là sự cố toàn phần.
  Và không mở rộng được khi cần.
```

**Bốn dấu hiệu bạn thật sự cần orchestrator:**

```text
□ Hơn ~10 dịch vụ, phụ thuộc nhau, cần phát hiện dịch vụ
□ Cần cập nhật không gián đoạn nhiều lần mỗi ngày
□ Tải biến động lớn theo giờ, và tự mở rộng tiết kiệm đáng kể
□ Nhiều đội cùng triển khai độc lập trên hạ tầng chung

Có 2–3 dấu hiệu trở lên ⇒ đáng cân nhắc.
Có 0–1 ⇒ chọn ① hoặc ② ở trên.
```

Và một lưu ý về động lực: **"để tuyển người dễ hơn"** hay **"để CV đẹp"** là những lý do thật, nhưng chúng không phải lý do kỹ thuật — nên hãy nói ra rõ ràng khi bàn, thay vì bọc chúng trong lập luận về quy mô ([[ra-quyet-dinh-ky-thuat]]).

## So sánh

| | Compose 1 máy | PaaS container | Kubernetes |
|---|---|---|---|
| Vận hành | rất thấp | thấp | **cao** |
| Tự chữa khi máy chết | ❌ | ✅ | ✅ |
| Cập nhật không gián đoạn | ❌ | ✅ | ✅ |
| Tự mở rộng | ❌ | ✅ | ✅ |
| Tinh chỉnh | cao | thấp | **cao** |
| Cần chuyên môn riêng | ❌ | ❌ | ✅ |

## Dễ nhầm

**1. Dùng Kubernetes cho ba dịch vụ.**

**2. Gộp liveness với readiness.** CSDL chậm ⇒ khởi động lại hàng loạt.

**3. Không đặt requests.** Lập lịch sai, container bị dồn vào một node.

**4. Đặt limits CPU cho dịch vụ nhạy độ trễ.** Bị bóp, p99 tăng.

**5. Không khai heap theo limit.** OOMKilled khi có tải.

**6. Không đo CPU throttling.** Không hiện trên biểu đồ %CPU.

**7. Không có startupProbe cho ứng dụng khởi động chậm.** Bị giết oan.

**8. Chọn Kubernetes khi không ai trong đội vận hành được.**

**9. Bỏ qua PaaS container.** Nó phủ phần lớn nhu cầu.

**10. Bọc lý do phi kỹ thuật trong lập luận kỹ thuật.**

## Mẹo nhớ

> **Orchestrator giải bài toán NHIỀU MÁY. Một máy thì Compose là đủ.**
>
> **CPU vượt limit thì bị BÓP; RAM vượt limit thì bị GIẾT.**
>
> **Liveness KHÔNG kiểm phụ thuộc — đó là việc của readiness.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Năm việc orchestrator làm, hai việc nào là lý do chính đáng nhất?
2. Requests khác limits thế nào? CPU và RAM khác nhau ra sao khi vượt?
3. Ba loại probe và việc của mỗi cái?
4. Ba lựa chọn nhẹ hơn Kubernetes?
5. Bốn dấu hiệu thật sự cần orchestrator?

## Tự viết lại

Không nhìn lại, chọn nền tảng và giải thích:

```text
① Startup 4 người, một web app + Postgres, 200 req/s
② SaaS 25 kỹ sư, 12 dịch vụ, deploy nhiều lần mỗi ngày
③ Xử lý ảnh, tải dồn vào 2 giờ mỗi ngày
④ Nội bộ công ty, 50 người dùng, chạy trong giờ làm việc
```

Tự kiểm: ở ③, tự mở rộng tiết kiệm được bao nhiêu — và bạn cần dữ liệu gì để trả lời?

## Thử sức

Đội bạn (6 người, 4 dịch vụ) vừa chuyển sang Kubernetes tự quản. Ba tháng sau: một người dành nửa thời gian cho cụm, và có hai sự cố do cấu hình Kubernetes chứ không do mã.

Ba câu để trả lời: bạn đánh giá tình hình bằng tiêu chí gì; hai phương án và đánh đổi của mỗi cái; và nếu quyết định chuyển sang PaaS container, bạn giữ lại gì từ công đã bỏ ra. Câu khó nhất: chi phí chuyển đổi có thể lớn hơn chi phí chịu đựng — bạn dùng con số nào để quyết định, và khi nào câu trả lời đúng là "giữ nguyên và đầu tư vào đào tạo"?
