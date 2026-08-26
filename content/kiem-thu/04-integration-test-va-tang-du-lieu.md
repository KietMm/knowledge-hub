---
title: Integration test và tầng dữ liệu
slug: integration-test-va-tang-du-lieu
summary: Test thật với database hoặc filesystem, cách cô lập giữa các test, và vì sao dùng chung state là nguồn của test chập chờn.
level: trung-cap
tags: [testing, integration-test, database]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được test chạm cơ sở dữ liệu thật mà không chập chờn, và biết vì sao "dùng chung dữ liệu" là nguồn gốc của phần lớn test đỏ ngẫu nhiên.

## Ý tưởng chính

Unit test với cơ sở dữ liệu giả **không bắt được** những lỗi thật sự hay xảy ra ở tầng dữ liệu: SQL sai cú pháp, ràng buộc bị vi phạm, migration thiếu cột, transaction không rollback.

Nên tầng dữ liệu cần integration test — chạy với **cơ sở dữ liệu thật**. Và toàn bộ độ khó nằm ở một chỗ: **cô lập giữa các test**.

## Mental model

Hãy nghĩ tới **phòng thí nghiệm dùng chung**.

> Ba nhóm cùng làm thí nghiệm trên một cái bàn. Nhóm A để lại hoá chất, nhóm B vào làm và kết quả sai — nhưng khi nhóm B làm một mình thì lại đúng.
>
> Đó chính là **test chập chờn**: xanh khi chạy riêng, đỏ khi chạy cùng nhau, và đỏ **ngẫu nhiên** khi thứ tự thay đổi.

Cách chữa duy nhất đáng tin: **mỗi nhóm một bàn riêng, hoặc lau sạch bàn trước mỗi lượt** — không phải "nhắc nhau dọn dẹp".

## Ví dụ nhỏ

```ts
// ❌ Dùng chung dữ liệu — nguồn của test chập chờn
beforeAll(async () => {
  await db.nguoiDung.create({ id: '1', email: 'a@x.com' })
})

it('sửa email', async () => {
  await capNhat('1', { email: 'b@x.com' })      // ← đổi dữ liệu dùng chung
})

it('tìm theo email', async () => {
  expect(await tim('a@x.com')).toBeTruthy()      // ❌ đỏ nếu test trên chạy trước
})
```

## Code chạy thế nào

Ba cách cô lập, xếp theo độ tin cậy:

```text
① TRANSACTION + ROLLBACK        (nhanh nhất, cô lập tốt)
   mỗi test chạy trong một transaction, cuối test rollback
   → cơ sở dữ liệu trở lại y như trước, không sót gì

② XOÁ SẠCH TRƯỚC MỖI TEST       (đơn giản, đủ dùng)
   beforeEach: TRUNCATE mọi bảng

③ MỖI TEST MỘT SCHEMA/DATABASE  (cô lập tuyệt đối, chậm nhất)
   dùng khi test chạy song song nhiều luồng
```

```ts
// Cách ① — nhanh và sạch
beforeEach(async () => {
  tx = await db.beginTransaction()
})
afterEach(async () => {
  await tx.rollback()          // ← mọi thứ test vừa ghi biến mất
})
```

Lưu ý về cách ①: nếu **code đang test cũng mở transaction riêng**, bạn cần transaction lồng nhau (savepoint) — không phải mọi ORM đều hỗ trợ. Lúc đó dùng cách ②.

## Cú pháp

**Mỗi test tự dựng dữ liệu của nó** — nguyên tắc quan trọng nhất:

```ts
// ❌ Dữ liệu dùng chung ở beforeAll
// ✅ Mỗi test tạo đúng thứ nó cần
function taoNguoiDung(ghiDe = {}) {
  return db.nguoiDung.create({
    email: `test-${crypto.randomUUID()}@x.com`,     // ← DUY NHẤT mỗi lần
    ten: 'Người thử',
    ...ghiDe,
  })
}

it('không cho email trùng', async () => {
  const u = await taoNguoiDung()
  await expect(taoNguoiDung({ email: u.email })).rejects.toThrow()
})
```

Hàm `taoNguoiDung` gọi là **factory**, và nó giải quyết hai vấn đề cùng lúc: test đọc được (chỉ khai trường nào **quan trọng với test này**), và dữ liệu luôn duy nhất.

Chạy cơ sở dữ liệu thật cho test:

```yaml
# docker-compose.test.yml
services:
  db:
    image: postgres:16
    environment: { POSTGRES_PASSWORD: test }
    ports: ["5433:5432"]        # ← cổng KHÁC với db phát triển
    tmpfs: /var/lib/postgresql/data    # ← chạy trong RAM, nhanh hơn nhiều
```

`tmpfs` là mẹo đáng biết: cơ sở dữ liệu test không cần bền vững, nên cho nó chạy trong RAM là được tốc độ đáng kể.

## Tại sao cần nó

Vì đây là những lỗi **chỉ** integration test bắt được:

```text
· SQL sai cú pháp (chỉ lộ khi thật sự chạy)
· Ràng buộc UNIQUE, FOREIGN KEY, NOT NULL
· Migration thiếu cột, sai kiểu
· Truy vấn trả về hình dạng khác mong đợi
· Transaction không rollback đúng lúc lỗi
· Index thiếu → truy vấn chạy nhưng chậm
```

Và test transaction có rollback thật là chỗ đáng viết test nhất, vì logic đó khó và ít ai kiểm:

```ts
it('rollback toàn bộ khi bước cuối lỗi', async () => {
  await expect(
    chuyenTien({ tu: 'A', den: 'KHONG_TON_TAI', soTien: 100 })
  ).rejects.toThrow()

  // Điều QUAN TRỌNG: tiền không bị trừ ở tài khoản nguồn
  expect((await layTaiKhoan('A')).soDu).toBe(1000)
})
```

Không có test này, bug "trừ tiền rồi lỗi giữa chừng" chỉ lộ ra khi có khách hàng thật mất tiền.

## So sánh

| | Unit test | Integration test |
|---|---|---|
| Tốc độ | ms | 10–100ms mỗi test |
| Cơ sở dữ liệu | Giả | **Thật** |
| Bắt lỗi SQL, ràng buộc | ❌ | ✅ |
| Bắt lỗi logic nghiệp vụ | ✅ | ✅ (nhưng chậm hơn) |
| Số lượng nên có | Nhiều | Vừa phải — chỉ ở tầng dữ liệu và luồng quan trọng |

Nguyên tắc phân bổ: **logic nghiệp vụ test bằng unit test** (nhanh, nhiều ca), **tầng dữ liệu test bằng integration test** (ít ca hơn, nhưng thật). Đừng dùng integration test để kiểm 50 ca biên của một hàm tính giá.

## Dễ nhầm

**1. Dùng chung dữ liệu giữa các test.** Nguồn số một của test chập chờn.

**2. Test phụ thuộc thứ tự chạy.** Xanh khi chạy tuần tự, đỏ khi chạy song song — và CI thường chạy song song.

**3. Dùng cơ sở dữ liệu phát triển để test.** Một ngày `TRUNCATE` chạy nhầm chỗ và bạn mất dữ liệu đang làm dở. Cổng riêng, database riêng.

**4. Không dọn dẹp khi test thất bại.** Đặt dọn dẹp trong `afterEach`, không đặt ở cuối thân test — test đỏ giữa chừng thì phần dọn dẹp không bao giờ chạy.

**5. Dữ liệu cố định gây trùng.** `email: 'test@x.com'` trong hai test chạy song song ⇒ vi phạm UNIQUE. Sinh giá trị duy nhất.

**6. Mock cơ sở dữ liệu trong integration test.** Lúc đó nó không còn là integration test, và bạn mất đúng thứ mình định kiểm.

**7. Đưa quá nhiều ca vào integration test.** Bộ test 20 phút thì không ai chạy trước khi push, và giá trị của nó về 0.

## Mẹo nhớ

> **Phòng thí nghiệm dùng chung: mỗi test một bàn riêng, hoặc lau bàn trước mỗi lượt.**
>
> **Mỗi test tự dựng dữ liệu của nó, và dữ liệu phải DUY NHẤT.**
>
> **Logic nghiệp vụ → unit test. Tầng dữ liệu → integration test.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Bốn loại lỗi mà chỉ integration test bắt được?
2. Ba cách cô lập test, và cách nào nhanh nhất?
3. Vì sao "dùng chung dữ liệu ở `beforeAll`" gây test chập chờn?
4. Vì sao dọn dẹp phải nằm trong `afterEach` chứ không ở cuối test?
5. Vì sao dữ liệu test phải sinh giá trị duy nhất?

## Tự viết lại

Không nhìn lại phần trên, viết bộ test cho một repository:

```text
- luu(don) rồi tim(id) phải trả về đúng đơn đó
- tim(id không tồn tại) trả về null
- luu hai đơn cùng mã → vi phạm ràng buộc
- xoa(id) rồi tim(id) trả về null
```

Tự kiểm: `beforeEach`/`afterEach` của bạn làm gì, và hai test chạy **song song** có đụng nhau không?

## Thử sức

CI của bạn đỏ ngẫu nhiên khoảng 1 lần mỗi 20 lần chạy, luôn ở những test khác nhau. Chạy lại thì xanh. Ở máy cá nhân thì không bao giờ đỏ.

Nêu **ba** giả thuyết, xếp theo khả năng. Rồi mô tả cách **tái hiện được** lỗi ở máy bạn — vì không tái hiện được thì không sửa được. Gợi ý: có một cờ dòng lệnh làm chuyện này dễ hơn nhiều.
