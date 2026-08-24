---
title: Integration test và tầng dữ liệu
slug: integration-test-va-tang-du-lieu
summary: Test thật với database hoặc filesystem, cách cô lập giữa các test, và vì sao dùng chung state là nguồn của test chập chờn.
level: trung-cap
tags: [testing, integration-test, database]
---

> **Sau bài này bạn sẽ:** viết được test chạy thật với dữ liệu mà không để test này làm vỡ test khác.

## Unit test không đủ cho tầng dữ liệu

Mock database rồi test repository là test chính cái mock của mình. Những lỗi thật nhất ở tầng này chỉ hiện ra khi chạy thật:

- Ràng buộc `UNIQUE`, khoá ngoại, `NOT NULL` có được tôn trọng không
- Transaction có rollback đúng khi lỗi giữa đường không
- Truy vấn có trả về đúng thứ tự đã `ORDER BY` không
- Ghi đồng thời có mất dữ liệu không

Không mock nào phát hiện được nhóm này. Repo này test `src/lib/db/*.repo.ts` **chạy thật với filesystem**, chỉ đổi thư mục đích.

## Nguyên tắc: mỗi test một môi trường riêng

Nguồn số một của test chập chờn là dùng chung trạng thái. Test A tạo user `u-1`, test B cũng tạo `u-1` → cái sau đỏ. Chạy riêng thì cả hai xanh, chạy cả bộ thì đỏ — và thứ tự chạy có thể đổi giữa các lần.

```ts
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('notesRepo', () => {
  let thuMuc: string

  beforeEach(async () => {
    // mkdtemp sinh tên có hậu tố ngẫu nhiên → hai test song song không đụng nhau
    thuMuc = await mkdtemp(join(tmpdir(), 'kh-test-'))
    process.env.DATA_DIR = thuMuc
  })

  afterEach(async () => {
    // recursive + force: xoá được cả cây, và không ném lỗi nếu test đã tự xoá
    await rm(thuMuc, { recursive: true, force: true })
  })

  it('không cho hai note trùng slug', async () => {
    await notesRepo.create({ topicId: 't1', title: 'A', slug: 'trung' })
    await expect(
      notesRepo.create({ topicId: 't1', title: 'B', slug: 'trung' }),
    ).rejects.toThrow(/trùng/)
  })
})
```

Với database thật, ba cách cô lập, xếp theo mức độ chắc chắn:

| Cách | Cô lập | Tốc độ | Ghi chú |
|---|---|---|---|
| Database riêng mỗi test | Tuyệt đối | Chậm nhất | Dùng khi test schema/migration |
| Transaction rollback sau mỗi test | Rất tốt | Nhanh | Không dùng được nếu code tự mở transaction |
| `TRUNCATE` bảng sau mỗi test | Tốt | Nhanh | Phải nhớ hết bảng, dễ sót bảng mới |

## Đừng dùng lại dữ liệu giữa các test

```ts
// ❌ Test sau phụ thuộc test trước đã chạy
beforeAll(async () => { await taoUser('u-1') })

it('đọc được user', ...)      // xanh
it('xoá user', ...)           // xoá u-1
it('sửa user', ...)           // ĐỎ — u-1 không còn
```

Ba test này còn đổi kết quả theo thứ tự chạy, mà Vitest không đảm bảo thứ tự khi chạy song song. Dùng `beforeEach` và một hàm dựng dữ liệu:

```ts
function userMau(ghiDe: Partial<User> = {}): User {
  return {
    id: nanoid(),                        // id khác nhau mỗi lần → không bao giờ trùng
    email: `test-${nanoid()}@example.com`,
    name: 'Người dùng thử',
    createdAt: new Date().toISOString(),
    ...ghiDe,                            // test chỉ nói phần nó quan tâm
  }
}

it('không cho email trùng', async () => {
  const email = 'trung@example.com'
  await usersRepo.create(userMau({ email }))
  await expect(usersRepo.create(userMau({ email }))).rejects.toThrow(/email/i)
})
```

Hàm này giải quyết hai việc: id/email luôn khác nhau nên không trùng ngẫu nhiên, và test chỉ khai báo đúng trường nó quan tâm — đọc là thấy ngay ý định.

## Test transaction có rollback thật

```ts
it('không tạo đơn nào khi trừ kho thất bại', async () => {
  await khoRepo.datSoLuong('p-1', 0)     // kho rỗng

  await expect(taoDon({ productId: 'p-1', quantity: 1 })).rejects.toThrow(/hết hàng/)

  // Điểm quan trọng: khẳng định KHÔNG có tác dụng phụ nào sót lại.
  // Thiếu dòng này, test vẫn xanh khi transaction rò rỉ đơn hàng dở dang.
  expect(await donRepo.demTheoProduct('p-1')).toBe(0)
})
```

Khẳng định "lỗi được ném ra" là chưa đủ. Phải khẳng định thêm **trạng thái sau lỗi vẫn sạch**.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Dùng chung database/thư mục giữa các test | Test chập chờn, xanh khi chạy lẻ | Môi trường riêng mỗi test |
| `beforeAll` tạo dữ liệu cho nhiều test | Kết quả đổi theo thứ tự chạy | `beforeEach` |
| Không dọn sau test | Ổ đĩa đầy, lần chạy sau đỏ | `afterEach` với `force: true` |
| Id/email cố định trong dữ liệu mẫu | Trùng khi chạy song song | Sinh ngẫu nhiên |
| Chỉ khẳng định lỗi được ném | Bỏ sót transaction rò rỉ | Khẳng định cả trạng thái sau lỗi |
| Mock database rồi gọi là integration test | Không phát hiện được lỗi ràng buộc | Chạy thật với dữ liệu |

## Ghi nhớ

- Lỗi ràng buộc, transaction, thứ tự truy vấn chỉ hiện ra khi chạy thật.
- Mỗi test một môi trường riêng — dùng chung là nguồn của test chập chờn.
- Dữ liệu mẫu sinh id ngẫu nhiên và cho phép ghi đè từng trường.
- Test rollback phải khẳng định cả trạng thái sau lỗi, không chỉ lỗi.

## Tự kiểm tra

1. Kể ba loại lỗi mà mock database không bao giờ phát hiện được.
2. Vì sao `beforeAll` tạo dữ liệu chung là nguy hiểm khi test chạy song song?
3. Test rollback chỉ khẳng định `rejects.toThrow()` thì bỏ sót điều gì?
