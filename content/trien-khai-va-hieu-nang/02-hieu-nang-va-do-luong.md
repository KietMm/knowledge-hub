---
title: Hiệu năng và đo lường
slug: hieu-nang-va-do-luong
summary: Profiling trước khi sửa, kiểm thử tải cho ra số đáng tin, và Core Web Vitals của phía người dùng.
level: nang-cao
tags: [van-hanh, hieu-nang, profiling, load-test, web-vitals]
---

> **Sau bài này bạn sẽ:** tìm ra chỗ thật sự chậm bằng số liệu, và chạy được một bài kiểm thử tải không tự lừa mình.

## Quy trình, và nó chỉ có một

```
Đo → tìm điểm nghẽn lớn nhất → sửa MỘT thứ → đo lại → lặp
```

Nghe hiển nhiên, nhưng gần như ai cũng phá vỡ nó ở bước đầu: đọc code, thấy một vòng lặp trông chậm, tối ưu nó, rồi không đo lại. Kết quả thường gặp là tối ưu một chỗ chiếm 3% thời gian và làm code khó đọc hơn.

**Định luật Amdahl** nói rõ giới hạn: nếu một phần chiếm 20% thời gian, tối ưu nó nhanh vô hạn cũng chỉ giảm được 20% tổng thời gian. Nên câu hỏi đầu tiên luôn là *"phần này chiếm bao nhiêu phần trăm?"*, không phải *"phần này có tối ưu được không?"*.

## Profiling phía server

```bash
# CPU profile của tiến trình Node đang chạy — không cần restart, không cần sửa code
node --cpu-prof --cpu-prof-dir=./prof server.js

# Hoặc gắn vào tiến trình production đang chạy
kill -USR1 <pid>          # bật inspector
# rồi mở chrome://inspect, tab Profiler
```

Đọc flame graph theo hai chiều, và chúng trả lời hai câu khác nhau:

- **Bề rộng** = tổng thời gian ở hàm đó (kể cả hàm con). Rộng nhất = đáng xem nhất.
- **Self time** = thời gian ở chính hàm đó, không tính hàm con. Cao = chính hàm này chậm.

Một hàm rất rộng nhưng self time thấp không phải vấn đề — nó chỉ đang chờ hàm con. Đi xuống sâu hơn.

Với ứng dụng web, đa số thời gian **không** ở CPU mà ở chờ I/O. Nên xem async trước:

```bash
# Node 22+: theo dõi hoạt động async, tìm chỗ chờ lâu
node --experimental-async-context-frame --trace-events-enabled server.js
```

Thực tế thì trace phân tán (xem [[quan-sat-he-thong]]) hữu ích hơn CPU profile cho ứng dụng web, vì nó chỉ ra ngay chặng nào chờ lâu.

## Truy vấn chậm: nơi nên tìm trước

```sql
-- Bật ghi log truy vấn chậm (Postgres)
ALTER SYSTEM SET log_min_duration_statement = '200ms';

-- Xem truy vấn tốn tổng thời gian nhiều nhất — KHÔNG phải chậm nhất một lần
SELECT
  substring(query, 1, 70) AS truy_van,
  calls,
  round(mean_exec_time::numeric, 1) AS tb_ms,
  round(total_exec_time::numeric / 1000, 1) AS tong_giay
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 15;
```

`ORDER BY total_exec_time` là điểm quan trọng: một truy vấn 5ms chạy 100.000 lần/phút tốn nhiều thời gian hơn một truy vấn 2 giây chạy 10 lần. Sắp theo `mean_exec_time` sẽ dẫn bạn tới sai chỗ.

Xem [[doc-explain-analyze]] và [[index-va-hieu-nang-truy-van]].

## Kiểm thử tải: bốn cách tự lừa mình

**1. Chạy từ máy cá nhân.** Bạn đo mạng nhà mình, không đo hệ thống. Chạy từ cùng vùng với server.

**2. Dùng cùng một dữ liệu cho mọi request.** Mọi thứ hit cache ở mọi tầng → kết quả đẹp và hoàn toàn vô nghĩa.

```js
// ❌ Một user, một sản phẩm
http.get('https://api/products/p-1')

// ✅ Phân bố như thật, gồm cả trường hợp nặng
const ids = JSON.parse(open('./product-ids.json'))
http.get(`https://api/products/${ids[Math.floor(Math.random() * ids.length)]}`)
```

**3. Dữ liệu test nhỏ hơn thật.** Bảng 1.000 dòng thì seq scan cũng nhanh; không có vấn đề index nào bộc lộ. Cần dữ liệu **cỡ thật**.

**4. Không có thời gian khởi động (ramp-up).** Đổ 1.000 người dùng vào giây thứ nhất đo được khả năng chịu sốc, không đo được thông lượng bền.

```js
// k6: tăng dần rồi giữ — mô hình gần thực tế
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // tăng dần
    { duration: '5m', target: 100 },   // giữ — đây là đoạn số liệu đáng tin
    { duration: '2m', target: 400 },   // tăng tới điểm vỡ
    { duration: '3m', target: 400 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // Ngưỡng làm bài test TỰ kết luận đạt/không, thay vì để người đọc số rồi đoán
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
  },
}
```

Điều cần tìm không phải "hệ thống chịu được bao nhiêu" mà **hệ thống vỡ thế nào**: nó chậm dần đều (tốt), hay đổ sập đột ngột (xấu)? Ở điểm vỡ, chỉ số nào bão hoà trước — pool kết nối, CPU, hay hàng đợi?

## Phía người dùng: Core Web Vitals

Backend 50ms mà trang mất 6 giây mới dùng được thì người dùng không quan tâm backend.

| | Đo gì | Ngưỡng tốt |
|---|---|---|
| **LCP** | Khối nội dung lớn nhất hiện ra | < 2,5 s |
| **INP** | Độ trễ phản hồi tương tác | < 200 ms |
| **CLS** | Bố cục nhảy | < 0,1 |

Nguyên nhân thường gặp và cách sửa:

```tsx
// LCP: ảnh hero phải được ưu tiên. Không có priority thì nó bị tải sau
// mọi thứ khác và LCP luôn xấu.
<Image src="/hero.jpg" priority sizes="100vw" />

// CLS: luôn khai báo kích thước để trình duyệt chừa chỗ trước
<Image src="/anh.jpg" width={800} height={450} />

// INP: việc nặng chặn luồng chính. Cắt nhỏ và nhường quyền.
for (const [i, item] of items.entries()) {
  xuLy(item)
  if (i % 50 === 0) await scheduler.yield()
}
```

Và điều quan trọng nhất: **đo dữ liệu thật (RUM), không chỉ Lighthouse**. Lighthouse chạy trên máy bạn với mạng mô phỏng; người dùng thật dùng máy yếu hơn và mạng tệ hơn.

```ts
import { onLCP, onINP, onCLS } from 'web-vitals'
// Gửi về server để có phân vị của người dùng THẬT
const gui = (m) => navigator.sendBeacon('/api/vitals', JSON.stringify(m))
onLCP(gui); onINP(gui); onCLS(gui)
```

Với app này, phần lớn công đã nằm ở kiến trúc: highlight code ở server nên client gần như không có JS — xem [[server-component-va-client-component]].

## Chống hồi quy hiệu năng trong CI

Tối ưu xong rồi để nó tự chậm lại là chuyện thường xảy ra. Chốt lại bằng ngân sách:

```yaml
- name: Ngân sách kích thước bundle
  run: npx size-limit          # thất bại nếu bundle vượt mức đã chốt

- name: Kiểm thử tải nhanh
  run: k6 run --quiet smoke.js  # thresholds trong file làm bước này đỏ khi hồi quy
```

Ngân sách quan trọng hơn một lần tối ưu: nó biến hiệu năng từ một dự án thành một ràng buộc thường trực.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Tối ưu trước khi đo | Mất công vào chỗ chiếm 3% | Profile trước |
| Sửa nhiều thứ rồi mới đo | Không biết cái nào có tác dụng | Một thay đổi một lần đo |
| Sắp truy vấn theo thời gian trung bình | Bỏ qua truy vấn nhanh nhưng chạy triệu lần | `ORDER BY total_exec_time` |
| Load test từ máy cá nhân | Đo mạng nhà mình | Chạy cùng vùng với server |
| Load test một URL cố định | Mọi thứ hit cache, số liệu vô nghĩa | Dữ liệu ngẫu nhiên như thật |
| Test trên dữ liệu nhỏ | Không lộ vấn đề index | Dữ liệu cỡ thật |
| Không có ramp-up | Đo chịu sốc, không đo thông lượng bền | Tăng dần rồi giữ |
| Chỉ tin Lighthouse | Người dùng thật có máy và mạng tệ hơn | Thu RUM |
| Không có ngân sách trong CI | Hiệu năng tự trôi về mức cũ | `size-limit`, k6 thresholds |

## Ghi nhớ

- Amdahl: câu hỏi đầu tiên là "chiếm bao nhiêu %", không phải "có tối ưu được không".
- Flame graph: bề rộng chỉ chỗ đáng xem, self time chỉ chỗ thật sự chậm.
- Sắp truy vấn theo **tổng** thời gian, không theo trung bình.
- Load test dễ tự lừa mình: cùng vùng, dữ liệu thật, cỡ thật, có ramp-up.

## Tự kiểm tra

1. Một phần chiếm 20% thời gian. Tối ưu nó nhanh gấp 10 thì tổng giảm bao nhiêu?
2. Vì sao sắp `pg_stat_statements` theo `mean_exec_time` dẫn tới sai chỗ?
3. Kể bốn cách một bài kiểm thử tải có thể cho số liệu đẹp mà vô nghĩa.
