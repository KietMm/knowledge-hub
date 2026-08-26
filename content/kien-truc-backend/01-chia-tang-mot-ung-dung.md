---
title: Chia tầng một ứng dụng backend
slug: chia-tang-mot-ung-dung
summary: Route, service, repository — mỗi tầng biết gì, và vì sao trộn chúng lại làm code không test được.
level: co-ban
tags: [backend, kien-truc, chia-tang, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** đặt được mỗi đoạn logic vào đúng tầng, và giải thích vì sao ranh giới đó làm code test được.

## Ý tưởng chính

Một request đi qua ba loại việc rất khác nhau: **nói chuyện với thế giới bên ngoài**, **quyết định theo quy tắc nghiệp vụ**, và **đọc ghi dữ liệu**.

Ba việc đó thay đổi vì ba lý do khác nhau, được test theo ba cách khác nhau, và cần ba loại kiến thức khác nhau. Đó là lý do tách chúng ra — không phải vì "kiến trúc sạch" nghe hay.

## Mental model

Hãy nghĩ tới **một nhà hàng**.

> **Phục vụ** nhận order, kiểm xem khách gọi món có trong thực đơn không, mang đồ ra. Họ **không nấu**. Đó là tầng route/controller.
>
> **Bếp trưởng** quyết định món làm thế nào, thiếu nguyên liệu thì báo, món này không hợp thì từ chối. Đó là tầng service — nơi chứa quy tắc nghiệp vụ.
>
> **Kho** chỉ biết lấy và cất nguyên liệu. Không biết món gì đang được nấu. Đó là repository.

Và điều quan trọng: **bếp trưởng không cần biết khách gọi qua điện thoại hay tới tận nơi**. Đổi cách nhận order không đụng tới công thức nấu. Đó chính là lợi ích thật của việc chia tầng.

## Ví dụ nhỏ

```ts
// route — chỉ dịch HTTP sang lời gọi hàm
app.post('/don-hang', async (req, res) => {
  const dl = TaoDonSchema.parse(req.body)
  const don = await donHangService.tao(req.user.id, dl)
  res.status(201).json(don)
})
```

## Code chạy thế nào

**Mỗi tầng biết gì và KHÔNG biết gì:**

```text
ROUTE / CONTROLLER
  Biết:      HTTP — mã trạng thái, header, phân tích body
  KHÔNG biết: quy tắc nghiệp vụ, SQL
  Việc:      xác thực đầu vào bằng schema, gọi service, ánh xạ lỗi → mã HTTP

SERVICE
  Biết:      quy tắc nghiệp vụ, luồng, transaction
  KHÔNG biết: `req`, `res`, mã trạng thái, SQL
  Việc:      quyết định. Đây là nơi "logic" thật sự sống.

REPOSITORY
  Biết:      SQL, ORM, ánh xạ dòng dữ liệu sang object
  KHÔNG biết: vì sao dữ liệu được lấy ra
  Việc:      đọc/ghi
```

**Bài kiểm tra ranh giới, dùng được ngay khi review:**

```text
□ Service có nhắc tới `req`, `res`, hay mã HTTP không?   → tầng bị rò
□ Route có câu SQL nào không?                            → tầng bị rò
□ Repository có `if` nào về quy tắc nghiệp vụ không?     → tầng bị rò
```

Ba câu này bắt được phần lớn vi phạm, và chúng cụ thể tới mức không cần tranh luận.

**Vì sao ranh giới đó làm code test được:**

```ts
// ❌ Logic nằm trong route ⇒ muốn test phải dựng cả HTTP server
app.post('/don-hang', async (req, res) => {
  const rows = await db.query('SELECT ...')
  if (rows[0].ton_kho < req.body.soLuong) return res.status(400).json({ ... })
  // ...30 dòng nữa
})

// ✅ Logic trong service ⇒ test bằng một lời gọi hàm
it('từ chối khi không đủ tồn kho', async () => {
  await expect(donHangService.tao('u1', { sp: 'p1', soLuong: 99 }))
    .rejects.toThrow(KhongDuTonKho)
})
```

Đây là lợi ích đo được: test tầng service chạy trong mili giây và không cần HTTP, không cần cổng, không cần dọn dẹp ([[unit-test-dau-tien]]).

## Cú pháp

**Lỗi nghiệp vụ tách khỏi lỗi HTTP:**

```ts
// domain/errors.ts — không biết gì về HTTP
export class KhongDuTonKho extends Error {}
export class KhongTimThay extends Error {}
export class KhongCoQuyen extends Error {}

// http/error-handler.ts — nơi DUY NHẤT dịch sang mã trạng thái
const MA: Array<[new (...a: never[]) => Error, number]> = [
  [KhongTimThay, 404],
  [KhongCoQuyen, 403],
  [KhongDuTonKho, 409],
]
export function xuLyLoi(err: unknown, res: Response) {
  const khop = MA.find(([Lop]) => err instanceof Lop)
  if (khop !== undefined) return res.status(khop[1]).json({ loi: (err as Error).message })
  logger.error({ err })
  res.status(500).json({ loi: 'Lỗi hệ thống' })   // KHÔNG lộ chi tiết ra ngoài
}
```

```text
Lợi ích cụ thể:
  ① Service dùng lại được cho CLI, cho job nền, cho gRPC — không chỉ HTTP
  ② Muốn biết endpoint nào trả 409 thì đọc MỘT bảng, không phải grep cả repo
  ③ Không rò stack trace ra client
```

**Đặt transaction ở đâu:** ở **service**, không ở repository.

```ts
async tao(userId: string, dl: TaoDon) {
  return db.transaction(async (tx) => {
    const sp = await sanPhamRepo.layDeCapNhat(tx, dl.spId)
    if (sp.tonKho < dl.soLuong) throw new KhongDuTonKho()
    await sanPhamRepo.truTonKho(tx, dl.spId, dl.soLuong)
    return donHangRepo.tao(tx, { userId, ...dl })
  })
}
```

```text
Vì sao service: chỉ nó biết những thao tác nào phải cùng thành công
hoặc cùng thất bại. Repository chỉ biết một bảng — nó không đủ thông tin
để quyết định ranh giới transaction ([[transaction-va-acid]]).
```

**Cấu trúc thư mục — theo TÍNH NĂNG, không theo tầng:**

```text
❌ Theo tầng: mọi thay đổi chạm ba thư mục cách xa nhau
   controllers/    services/    repositories/

✅ Theo tính năng: một thay đổi nằm gọn một chỗ
   don-hang/  ├ route.ts  service.ts  repo.ts  schema.ts  service.test.ts
   san-pham/  └ ...
   shared/       db.ts  logger.ts  errors.ts
```

Cách thứ hai còn có một lợi ích ít nói tới: khi cần **tách một phần ra service riêng**, ranh giới đã sẵn sàng ([[ranh-gioi-service]]).

## Tại sao cần nó

Vì cái giá của việc trộn tầng không hiện ra ngay — nó hiện ra ở tháng thứ sáu:

```text
Logic nằm trong route:
  → không test được nếu không dựng HTTP
  → không dùng lại được cho job nền hay CLI
  → route dài 200 dòng, không ai đọc hết
  → đổi từ Express sang Fastify = viết lại nghiệp vụ

SQL nằm trong route:
  → cùng một truy vấn được viết lại ở năm chỗ, lệch nhau dần
  → đổi schema phải grep cả repo
```

**Nhưng đừng chia tầng khi chưa cần:**

```text
CRUD thuần, không có quy tắc gì:
  route → repository là ĐỦ.
  Một service chỉ gọi lại repository là tầng RỖNG — nó thêm một file
  để đọc mà không thêm thông tin nào.

⇒ Thêm tầng service khi xuất hiện quy tắc nghiệp vụ thật:
  điều kiện, nhiều bước, transaction, gọi nhiều nguồn.
```

Đây là điểm cân bằng quan trọng: chia tầng là công cụ để quản lý **độ phức tạp đã có**, không phải nghi thức áp dụng cho mọi endpoint.

## So sánh

| | Route | Service | Repository |
|---|---|---|---|
| Biết HTTP | ✅ | ❌ | ❌ |
| Biết nghiệp vụ | ❌ | ✅ | ❌ |
| Biết SQL | ❌ | ❌ | ✅ |
| Test bằng | integration | **unit** | integration |
| Đổi khi | đổi API | đổi quy tắc | đổi schema |

## Dễ nhầm

**1. Logic nghiệp vụ trong route.** Không test được, không dùng lại được.

**2. `req`/`res` truyền vào service.** Tầng bị rò, service dính chặt HTTP.

**3. SQL rải trong route.** Cùng truy vấn viết lại ở nhiều chỗ.

**4. Quy tắc nghiệp vụ trong repository.** Sai chỗ, và khó tìm.

**5. Transaction đặt trong repository.** Repo không biết ranh giới đúng.

**6. Tầng service rỗng chỉ để "cho đủ tầng".**

**7. Trả lỗi HTTP từ service.** Service phải ném lỗi nghiệp vụ.

**8. Lộ stack trace ra client.**

**9. Chia thư mục theo tầng ở dự án lớn.** Mỗi thay đổi chạm ba nơi.

**10. Xác thực đầu vào ở service thay vì ở biên.** Biên là chỗ dữ liệu chưa tin được.

## Mẹo nhớ

> **Route biết HTTP. Service biết NGHIỆP VỤ. Repository biết SQL. Không ai biết việc của người khác.**
>
> **Service không được nhắc tới `req`, `res`, hay mã trạng thái.**
>
> **Transaction thuộc về SERVICE — chỉ nó biết cái gì phải cùng thành công.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba tầng, mỗi tầng biết gì và không biết gì?
2. Ba câu hỏi kiểm tra ranh giới khi review?
3. Vì sao logic ở service test dễ hơn ở route?
4. Vì sao transaction đặt ở service chứ không ở repository?
5. Khi nào **không** nên thêm tầng service?

## Tự viết lại

Không nhìn lại, viết ba tầng cho: *"Huỷ đơn hàng — chỉ chủ đơn huỷ được, chỉ khi đơn chưa giao, và phải hoàn tồn kho."*

```text
① route
② service (kèm transaction)
③ repository
④ các lớp lỗi và bảng ánh xạ sang mã HTTP
```

Tự kiểm: service của bạn có dòng nào nhắc tới số 403 hay 409 không?

## Thử sức

Bạn nhận một file `routes/don-hang.ts` dài 800 dòng: SQL, quy tắc nghiệp vụ, gọi API thanh toán, gửi email — tất cả trong các handler.

Ba câu để trả lời: bạn tách theo thứ tự nào, và **vì sao thứ tự đó**; bạn giữ an toàn trong lúc tách bằng cách nào; và bạn biết khi nào là đủ. Câu khó nhất: nếu chưa có test nào, bước đầu tiên của bạn là gì — và vì sao tách trước khi có test là rủi ro?
