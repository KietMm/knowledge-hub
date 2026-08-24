---
title: Giám sát và sao lưu
slug: giam-sat-va-sao-luu
summary: Biết hệ thống đang hỏng trước khi người dùng báo, và chắc chắn khôi phục được khi mất dữ liệu.
level: nang-cao
tags: [deploy, giam-sat, sao-luu, van-hanh]
---

> **Sau bài này bạn sẽ:** biết đo cái gì và cảnh báo khi nào, và có một quy trình sao lưu thật sự khôi phục được.

## Bốn tín hiệu vàng

Google SRE gọi đây là bốn thứ cần đo cho mọi dịch vụ:

| Tín hiệu | Đo gì | Ví dụ ngưỡng |
|---|---|---|
| **Latency** | Thời gian phản hồi | p95 < 500ms |
| **Traffic** | Lượng yêu cầu | Theo dõi thay đổi đột ngột |
| **Errors** | Tỷ lệ lỗi | < 1% request lỗi 5xx |
| **Saturation** | Mức bão hoà tài nguyên | CPU < 70%, đĩa < 80% |

Về độ trễ: dùng **phân vị** (p50, p95, p99), không dùng trung bình. Trung bình 200ms nghe ổn, nhưng nếu p99 là 8 giây thì 1% người dùng đang có trải nghiệm rất tệ — và 1% của một triệu request là mười nghìn lần.

## Ba trụ cột quan sát

```
Metrics — số theo thời gian: bao nhiêu, nhanh chậm thế nào
Logs    — sự kiện rời rạc: chuyện gì đã xảy ra
Traces  — đường đi một request qua các dịch vụ: chậm ở đâu
```

Metrics trả lời "có vấn đề không", logs trả lời "vấn đề gì", traces trả lời "ở đâu".

```ts
// Log có cấu trúc — query được
logger.info({
  suKien: 'request_hoan_tat',
  requestId,
  duongDan: '/api/don-hang',
  trangThai: 200,
  thoiGianMs: 45,
  nguoiDungId,
})
```

Trường `requestId` xuyên suốt mọi tầng là thứ biến log từ "một đống dòng" thành "câu chuyện của một request".

## Cảnh báo

Nguyên tắc quan trọng nhất: **chỉ cảnh báo khi cần con người hành động ngay**. Cảnh báo cho mọi thứ dẫn tới mệt mỏi cảnh báo, và rồi cảnh báo thật cũng bị bỏ qua.

| Nên cảnh báo (gọi người dậy) | Chỉ nên ghi nhận |
|---|---|
| Site không truy cập được | CPU cao một lúc |
| Tỷ lệ lỗi > 5% trong 5 phút | Một request chậm |
| Đĩa còn dưới 10% | Bộ nhớ tăng nhẹ |
| Sao lưu thất bại | Traffic tăng |
| Chứng chỉ hết hạn trong 14 ngày | Deploy thành công |

Mỗi cảnh báo nên kèm: mức độ, ảnh hưởng tới người dùng là gì, và liên kết tới hướng dẫn xử lý.

## Endpoint health

```ts
// /api/health — cho load balancer, phải NHANH
export async function GET() {
  return Response.json({ ok: true })
}

// /api/ready — cho orchestrator, kiểm tra phụ thuộc
export async function GET() {
  const kq = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    redis.ping(),
  ])
  const ok = kq.every((r) => r.status === 'fulfilled')
  return Response.json({ ok }, { status: ok ? 200 : 503 })
}
```

Phân biệt hai loại: **liveness** ("tiến trình còn sống không, có cần khởi động lại không") và **readiness** ("sẵn sàng nhận traffic chưa"). Gộp làm một dẫn tới việc container bị khởi động lại liên tục chỉ vì CSDL tạm thời chậm.

## Sao lưu: quy tắc 3-2-1

**3** bản sao, trên **2** loại phương tiện, **1** bản ở nơi khác về mặt địa lý.

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly TEN="db-$(date +%Y%m%d-%H%M%S).sql.gz"
readonly TMP="/tmp/$TEN"

pg_dump "$DATABASE_URL" | gzip > "$TMP"

# Kiểm tra file không rỗng và giải nén được
[[ -s "$TMP" ]] || { echo "LỖI: file rỗng"; exit 1; }
gzip -t "$TMP" || { echo "LỖI: file hỏng"; exit 1; }

aws s3 cp "$TMP" "s3://sao-luu/postgres/$TEN"
rm -f "$TMP"

# Báo cho hệ thống giám sát biết job đã chạy xong
curl -fsS "$HEARTBEAT_URL" > /dev/null
```

Dòng `curl` cuối là **dead man's switch**: hệ thống giám sát cảnh báo khi *không* nhận được tín hiệu. Không có nó, sao lưu ngừng chạy mà không ai biết — cho tới ngày cần khôi phục.

## Hai con số phải quyết định trước

- **RPO** (Recovery Point Objective) — chấp nhận mất tối đa bao nhiêu dữ liệu? Sao lưu mỗi ngày nghĩa là RPO 24 giờ.
- **RTO** (Recovery Time Objective) — chấp nhận ngừng hoạt động tối đa bao lâu?

Hai con số này quyết định chiến lược: RPO một giờ cần sao lưu theo giờ hoặc WAL archiving; RPO một phút cần replica đồng bộ liên tục.

## Diễn tập khôi phục

**Sao lưu chưa từng thử khôi phục thì chưa phải sao lưu.**

Ít nhất mỗi quý, làm đủ quy trình: tải bản sao lưu về, khôi phục vào môi trường riêng, chạy kiểm tra tính đúng đắn, đo thời gian mất bao lâu.

Những thứ chỉ phát hiện được khi diễn tập: bản sao lưu thiếu một schema, phiên bản Postgres không tương thích, quá trình khôi phục mất 6 tiếng chứ không phải 30 phút như tưởng.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Chỉ nhìn độ trễ trung bình | Bỏ sót đuôi dài | Dùng p95/p99 |
| Cảnh báo cho mọi thứ | Mệt mỏi, bỏ qua cảnh báo thật | Chỉ cảnh báo khi cần hành động |
| Sao lưu không kiểm tra | File rỗng suốt nhiều tháng | Kiểm tra kích thước + tính toàn vẹn |
| Không có dead man's switch | Job chết mà không ai biết | Heartbeat |
| Chưa từng diễn tập khôi phục | Phát hiện vấn đề đúng lúc khủng hoảng | Diễn tập hàng quý |

## Ghi nhớ

- Bốn tín hiệu vàng: latency, traffic, errors, saturation.
- Phân vị, không phải trung bình.
- Cảnh báo chỉ khi cần con người hành động ngay.
- Sao lưu chưa thử khôi phục thì chưa phải sao lưu.

## Tự kiểm tra

1. Vì sao p99 quan trọng hơn giá trị trung bình khi đo độ trễ?
2. Liveness và readiness khác nhau thế nào? Gộp chung gây vấn đề gì?
3. RPO 1 giờ và RTO 15 phút — chiến lược sao lưu nào đáp ứng được?
