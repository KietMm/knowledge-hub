---
title: Ước lượng và tìm điểm nghẽn
slug: uoc-luong-va-tim-diem-nghen
summary: Những con số một tech lead phải nhớ, cách tính nhẩm tải, và vì sao trung bình là chỉ số dối.
level: co-ban
tags: [kien-truc, thiet-ke-he-thong, hieu-nang, uoc-luong]
---

> **Sau bài này bạn sẽ:** tính nhẩm được hệ thống cần bao nhiêu máy và bao nhiêu dung lượng, và biết đọc số đo hiệu năng mà không bị trung bình lừa.

## Bảng số phải nhớ

Thiết kế hệ thống là môn học về **độ lớn tương đối**. Không cần chính xác, cần biết cái nào chậm hơn cái nào **bao nhiêu lần**:

| Thao tác | Thời gian | So sánh |
|---|---|---|
| Đọc 1MB từ RAM | ~0,25 ms | 1× |
| Đọc 1MB từ SSD | ~1 ms | 4× RAM |
| Round-trip trong cùng datacenter | ~0,5 ms | — |
| Truy vấn Postgres có index, dữ liệu trong cache | 0,2–1 ms | — |
| Truy vấn Postgres phải đọc đĩa | 5–20 ms | ~20× |
| Round-trip Việt Nam ↔ Singapore | ~30 ms | 60× trong DC |
| Round-trip Việt Nam ↔ us-east-1 | ~200 ms | 400× trong DC |
| Đọc 1MB qua mạng 1Gbps | ~8 ms | — |

Hai kết luận rút ra ngay, và chúng chi phối gần như mọi quyết định kiến trúc:

**Mạng đắt hơn tính toán vài bậc.** Một request gọi 20 service nội bộ tuần tự đã mất 10ms chỉ cho việc đi lại, chưa làm gì cả. Đây là lý do gọi song song quan trọng hơn tối ưu thuật toán trong hầu hết ứng dụng web.

**Chọn vùng đặt máy quan trọng hơn nhiều tối ưu code.** App ở Singapore, database ở us-east-1: mỗi truy vấn cộng 200ms. Một trang gọi 5 truy vấn tuần tự là **1 giây** thuần tuý ngồi chờ. Không có tối ưu code nào bù được.

## Tính nhẩm: một ví dụ đầy đủ

*"Hệ thống 500.000 người dùng hoạt động hàng ngày, mỗi người xem 20 trang."*

**Bước 1 — Từ ngày sang giây.**

```
500.000 × 20 = 10 triệu lượt xem/ngày
86.400 giây/ngày ≈ 100.000 giây (làm tròn cho dễ nhẩm)
→ 10.000.000 / 100.000 = 100 request/giây trung bình
```

**Bước 2 — Nhân hệ số đỉnh.** Người dùng không rải đều 24 giờ. Với ứng dụng phục vụ một múi giờ, đỉnh thường **3–10×** trung bình:

```
100 × 5 = 500 request/giây lúc đỉnh
```

Bước này bị bỏ qua nhiều nhất, và nó là nguyên nhân của phần lớn sự cố "chạy tốt lúc test, sập lúc thật".

**Bước 3 — Từ RPS sang số máy.** Dùng **định luật Little**: số việc đang xử lý đồng thời = tốc độ đến × thời gian xử lý.

```
500 req/s × 0,2 s mỗi request = 100 request đang xử lý cùng lúc
```

Một tiến trình Node xử lý được ~50 request đồng thời khi phần lớn thời gian là chờ I/O → **2 tiến trình**, và chạy 4 để có dư. Con số nhỏ đến mức đáng ngạc nhiên — hầu hết hệ thống cần ít máy hơn nhiều so với cảm giác.

**Bước 4 — Dung lượng.**

```
Mỗi lượt xem ghi 1 dòng log 200 byte
10 triệu × 200 B = 2 GB/ngày = 730 GB/năm
```

Con số này quyết định: log phải có hạn lưu trữ, và bảng log **không nằm chung** database nghiệp vụ.

## Điểm nghẽn ở đâu

Trong ứng dụng web, theo thứ tự tần suất thực tế:

1. **Database** — truy vấn thiếu index, N+1, khoá tranh chấp
2. **Gọi tuần tự cái có thể song song**
3. **Truyền quá nhiều dữ liệu** — `SELECT *`, trả cả bản ghi khi client cần 3 field
4. **Việc nặng làm trong request** — gửi mail, tạo PDF, gọi API bên thứ ba
5. Cuối cùng mới là CPU của chính app

Thứ tự này nói lên điều quan trọng: **tối ưu code hiếm khi là việc đúng cần làm**. Đi tìm I/O trước.

Ví dụ N+1 — lỗi hiệu năng phổ biến nhất trong mọi codebase:

```ts
// ❌ 1 + N truy vấn: 100 bài viết = 101 lượt đi lại database
const posts = await db.posts.findMany({ take: 100 })
for (const post of posts) {
  post.author = await db.users.findUnique({ where: { id: post.authorId } })
}

// ✅ 2 truy vấn, bất kể bao nhiêu bài
const posts = await db.posts.findMany({ take: 100 })
const authors = await db.users.findMany({
  where: { id: { in: [...new Set(posts.map((p) => p.authorId))] } },
})
const byId = new Map(authors.map((a) => [a.id, a]))
```

Với 0,5ms mỗi round-trip nội bộ, 101 truy vấn = 50ms chỉ riêng đi lại. Xem [[index-va-hieu-nang-truy-van]] và [[doc-explain-analyze]].

## Trung bình là chỉ số dối

```
10 request: 9 request 50ms, 1 request 5000ms
Trung bình = (9×50 + 5000) / 10 = 545 ms
```

Con số 545ms **không mô tả trải nghiệm của ai cả**: không ai chờ 545ms. Chín người chờ 50ms, một người chờ 5 giây.

Đọc theo **phân vị**:

| | Nghĩa |
|---|---|
| p50 (trung vị) | Nửa số request nhanh hơn mức này |
| p95 | 5% chậm hơn mức này |
| p99 | 1% chậm hơn — thường là người dùng có nhiều dữ liệu nhất |
| p99,9 | Chỗ ẩn giấu timeout, GC pause, cache miss lạnh |

p99 quan trọng hơn cảm giác ban đầu vì **một trang gọi nhiều request**. Trang gọi 20 request nội bộ, mỗi cái p99 = 1%:

```
Xác suất cả 20 đều nhanh = 0,99^20 ≈ 0,82
→ 18% số lần tải trang gặp ít nhất một request chậm
```

Cái là "1% hiếm" ở tầng service trở thành "18% thường xuyên" ở tầng người dùng. Đây gọi là **tail latency amplification**, và nó là lý do p99 của từng service phải rất tốt trong hệ thống nhiều service.

## Đo trước, đoán sau

```bash
# Xem thời gian một endpoint, tách từng chặng
curl -s -o /dev/null -w 'dns=%{time_namelookup} connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  https://api.example.com/orders

# Chạy 200 request, 10 luồng, xem phân vị
npx autocannon -c 10 -a 200 https://api.example.com/orders
```

`ttfb` cao mà `total - ttfb` thấp → server chậm. Ngược lại → payload quá lớn hoặc mạng chậm. Hai nguyên nhân này cần hai cách sửa hoàn toàn khác nhau, nên phân biệt được là bước đầu tiên.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Bỏ qua hệ số đỉnh | Đủ máy lúc trung bình, sập lúc đỉnh | Nhân 3–10× |
| Nhìn trung bình thay vì phân vị | Không thấy nhóm người dùng đang khổ | Đo p50/p95/p99 |
| Tối ưu CPU trước khi xem I/O | Mất công vào chỗ chiếm 5% thời gian | Đo trước, tìm I/O |
| N+1 truy vấn | Chậm tuyến tính theo số bản ghi | Gộp bằng `IN` |
| App và database khác vùng | Mỗi truy vấn cộng 100–200ms | Đặt cùng vùng |
| Đo hiệu năng trên dữ liệu 100 dòng | Không có index nào bộc lộ vấn đề | Test với dữ liệu cỡ thật |
| Thiết kế cho quy mô chưa tồn tại | Phức tạp hoá, chậm giao hàng | Thiết kế cho 10× hiện tại |

## Ghi nhớ

- Mạng đắt hơn tính toán vài bậc — chọn vùng đặt máy trước khi tối ưu code.
- RPS đỉnh = (lượt/ngày ÷ 100.000) × hệ số đỉnh 3–10.
- Định luật Little: số việc đồng thời = RPS × thời gian xử lý.
- Trung bình không mô tả ai cả; p99 của service thành p80 của trang khi gọi nhiều service.

## Tự kiểm tra

1. 2 triệu lượt xem/ngày, mỗi request 100ms. Đỉnh cần bao nhiêu request đồng thời?
2. Vì sao p99 = 1% ở service lại thành 18% ở trang gọi 20 service?
3. `ttfb` thấp nhưng `total` cao. Nguyên nhân nằm ở đâu?
