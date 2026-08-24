---
title: Triển khai an toàn
slug: trien-khai-an-toan
summary: Tách deploy khỏi phát hành, canary, feature flag, và migration không làm rơi request.
level: trung-cap
tags: [van-hanh, trien-khai, canary, feature-flag, migration]
---

> **Sau bài này bạn sẽ:** phát hành mà không cần cửa sổ bảo trì, và chạy migration trên hệ thống đang phục vụ mà không làm hỏng request nào.

## Tách "deploy" khỏi "phát hành"

Đây là ý tưởng có sức nặng nhất trong bài. Hai việc thường bị coi là một:

- **Deploy** — đưa code mới lên máy chủ. Việc kỹ thuật.
- **Phát hành** — cho người dùng thấy tính năng mới. Quyết định sản phẩm.

Gộp chúng lại thì mỗi lần phát hành là một lần đánh cược: code mới và tính năng mới xuất hiện cùng lúc, và khi có lỗi bạn không biết do cái nào.

Tách ra bằng **feature flag**:

```ts
// Code mới đã lên production nhưng còn tắt. Deploy trở thành việc nhàm chán,
// và phát hành trở thành một dòng cấu hình đổi được trong 5 giây.
if (await flags.bat('checkout-moi', { userId: user.id })) {
  return checkoutMoi(input)
}
return checkoutCu(input)
```

Điều này thay đổi cả cách xử lý sự cố: rollback một flag mất **5 giây**, rollback một deploy mất **5 phút** — xem [[su-co-va-hau-kiem]].

## Bốn kiểu triển khai

| Kiểu | Cách làm | Rollback | Chi phí |
|---|---|---|---|
| Recreate | Tắt cũ, bật mới | Deploy lại | Có downtime |
| Rolling | Thay dần từng máy | Rolling ngược | Hai phiên bản chạy song song |
| Blue-green | Dựng cụm mới, đổi lưu lượng | Đổi lại, tức thì | Gấp đôi hạ tầng |
| Canary | 1% → 10% → 50% → 100% | Ngưng tăng, kéo về | Cần đo tự động |

Canary là lựa chọn tốt nhất cho hầu hết hệ thống, với một điều kiện: **phải so sánh chỉ số giữa nhóm canary và nhóm cũ một cách tự động**. Canary mà mắt người theo dõi thì chỉ là rolling có thêm lo lắng.

```yaml
# Ngưỡng phải so với BASELINE, không phải với hằng số: nếu 0,4% lỗi là mức
# bình thường của hệ thống thì ngưỡng cứng 0,5% sẽ báo động giả liên tục.
canary:
  steps: [1, 10, 50, 100]
  interval: 10m
  analysis:
    - metric: error_rate
      threshold: baseline + 0.5%
    - metric: p95_latency
      threshold: baseline * 1.2
  rollbackOnFail: true
```

## Rolling và blue-green đều đòi hỏi tương thích hai chiều

Trong lúc chuyển, **phiên bản cũ và mới chạy đồng thời**. Hệ quả bắt buộc: mọi thay đổi phải tương thích với phiên bản liền trước.

- Cùng một dữ liệu phải đọc được bởi cả hai phiên bản
- Cùng một message trong hàng đợi phải xử lý được bởi cả hai
- Cùng một cache entry phải hiểu được bởi cả hai

```ts
// ❌ Đổi hình dạng cache: instance cũ đọc entry của instance mới và vỡ
await redis.set(`user:${id}`, JSON.stringify({ ten, tuoi }))    // trước
await redis.set(`user:${id}`, JSON.stringify({ hoTen, tuoi }))   // sau → vỡ

// ✅ Đổi khoá cache khi đổi hình dạng
await redis.set(`user:v2:${id}`, JSON.stringify({ hoTen, tuoi }))
```

## Migration: quy tắc mở rộng rồi mới co lại

Đây là nơi gây downtime nhiều nhất, và nó hoàn toàn tránh được. Không bao giờ đổi schema trong một bước — **luôn ba lần phát hành**:

```
Phát hành 1 (mở rộng)  Thêm cái mới, giữ cái cũ. Ghi cả hai, đọc cái cũ.
Phát hành 2 (chuyển)   Chuyển dữ liệu cũ sang mới. Đọc cái mới.
Phát hành 3 (co lại)   Xoá cái cũ.
```

Ví dụ đổi tên cột `name` → `full_name`:

```sql
-- 1. Mở rộng: thêm cột, code mới ghi cả hai cột
ALTER TABLE users ADD COLUMN full_name TEXT;

-- 2. Chuyển: theo lô, KHÔNG phải một UPDATE toàn bảng.
--    Một UPDATE 10 triệu dòng khoá bảng hàng phút và làm phình WAL.
UPDATE users SET full_name = name
WHERE full_name IS NULL AND id IN (
  SELECT id FROM users WHERE full_name IS NULL LIMIT 5000
);
-- lặp tới khi hết

-- 3. Co lại: sau khi chắc chắn không còn code nào đọc `name`
ALTER TABLE users DROP COLUMN name;
```

Những thao tác **khoá bảng** và phải tránh trên hệ thống đang chạy:

```sql
-- ❌ Khoá bảng cho tới khi index dựng xong
CREATE INDEX idx_orders_user ON orders(user_id);

-- ✅ Không khoá ghi. Đổi lại: chậm hơn, và có thể để lại index INVALID nếu
--    thất bại — phải kiểm tra rồi DROP và làm lại.
CREATE INDEX CONCURRENTLY idx_orders_user ON orders(user_id);
```

```sql
-- ❌ Postgres phải viết lại toàn bộ bảng để điền giá trị mặc định (bản < 11)
ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

-- ✅ Ba bước: thêm cột nullable, điền theo lô, rồi mới đặt NOT NULL
ALTER TABLE orders ADD COLUMN status TEXT;
-- ... điền theo lô ...
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
```

Và luôn đặt `lock_timeout` cho migration:

```sql
-- Thiếu dòng này: migration chờ khoá vô hạn, và trong lúc chờ nó CHẶN mọi
-- truy vấn tới sau — một migration "đang chờ" làm sập hệ thống nhanh hơn
-- một migration thất bại.
SET lock_timeout = '3s';
```

Xem [[thay-doi-cau-truc-va-migration]] và [[transaction-va-khoa-trong-postgres]].

## Feature flag là nợ kỹ thuật có hạn dùng

```ts
// Mỗi flag là một nhánh phải test và phải hiểu. 30 flag = 2^30 tổ hợp trên giấy.
type Flag = {
  key: string
  chuSoHuu: string
  ngayHetHan: string    // BẮT BUỘC — không có thì flag sống mãi
}
```

Đặt hạn cho mọi flag, và cho CI cảnh báo khi flag quá hạn. Codebase có 40 flag mà không ai biết cái nào còn dùng là một dạng nợ kỹ thuật khó trả hơn code xấu, vì bạn không dám xoá — xem [[no-ky-thuat-va-refactor]].

Phân biệt hai loại: **flag phát hành** (sống vài tuần rồi xoá) và **flag cấu hình dài hạn** (bật/tắt theo khách hàng — thực chất không phải flag mà là cấu hình sản phẩm, nên đặt ở chỗ khác).

## Danh sách kiểm tra trước khi phát hành

- [ ] Rollback được **mà không cần** migration ngược
- [ ] Migration tương thích với phiên bản code liền trước
- [ ] Có flag để tắt tính năng mà không cần deploy
- [ ] Biết chỉ số nào sẽ cho thấy "phát hành này tệ"
- [ ] Không phát hành vào chiều thứ Sáu, trừ khi có người trực
- [ ] Người phát hành **chưa** đi ngủ trong 30 phút sau đó

Điểm đầu quan trọng nhất: **rollback không được phụ thuộc vào việc chạy migration ngược**. Migration ngược thường không được test và có thể mất dữ liệu. Thiết kế schema tương thích hai chiều để rollback chỉ là đổi phiên bản code.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Deploy và phát hành cùng lúc | Không biết lỗi do code hay tính năng | Tách bằng feature flag |
| Migration đổi schema một bước | Phiên bản cũ vỡ trong lúc rolling | Mở rộng → chuyển → co lại |
| `CREATE INDEX` không `CONCURRENTLY` | Khoá bảng, request timeout | Luôn `CONCURRENTLY` trên production |
| `UPDATE` toàn bảng để chuyển dữ liệu | Khoá hàng phút, WAL phình | Chuyển theo lô |
| Migration không có `lock_timeout` | Chờ khoá và chặn mọi truy vấn tới sau | `SET lock_timeout` |
| Rollback cần migration ngược | Không rollback được thật | Schema tương thích hai chiều |
| Đổi hình dạng cache không đổi khoá | Phiên bản cũ đọc entry mới rồi vỡ | Đưa version vào khoá |
| Feature flag không có hạn | 40 flag không ai dám xoá | Hạn dùng + cảnh báo CI |
| Canary không so baseline | Báo động giả hoặc bỏ lọt | Ngưỡng tương đối |

## Ghi nhớ

- Deploy là việc kỹ thuật, phát hành là quyết định sản phẩm — tách chúng ra.
- Rolling/blue-green đòi mọi thay đổi tương thích với phiên bản liền trước.
- Migration luôn ba bước: mở rộng, chuyển theo lô, co lại.
- Rollback không được phụ thuộc migration ngược.

## Tự kiểm tra

1. Tách deploy khỏi phát hành thay đổi thời gian rollback thế nào?
2. Vì sao đổi tên một cột cần ba lần phát hành?
3. Vì sao migration "đang chờ khoá" nguy hiểm hơn migration thất bại?
