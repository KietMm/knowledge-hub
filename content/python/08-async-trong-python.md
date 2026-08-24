---
title: async/await trong Python
slug: async-trong-python
summary: Khi nào async giúp thật, GIL và vì sao một lời gọi đồng bộ làm đứng cả event loop.
level: nang-cao
tags: [python, async, asyncio, hieu-nang]
---

> **Sau bài này bạn sẽ:** biết async giải quyết loại việc nào, và tìm ra được nguyên nhân khi code async chạy chậm như đồng bộ.

## Async chỉ giúp việc chờ, không giúp việc tính

Đây là điều phải hiểu trước mọi thứ khác:

| Loại việc | Ví dụ | Dùng gì |
|---|---|---|
| **I/O-bound** — phần lớn thời gian là *chờ* | Gọi API, truy vấn DB, đọc file | `asyncio` ✅ |
| **CPU-bound** — phần lớn thời gian là *tính* | Xử lý ảnh, nén, tính toán số | `multiprocessing` |

Vì **GIL** (Global Interpreter Lock), chỉ một luồng Python chạy bytecode tại một thời điểm. Async không phá vỡ điều đó — nó chỉ tận dụng khoảng thời gian chương trình đang *ngồi chờ* mạng để làm việc khác.

Dùng `asyncio` cho việc CPU-bound thì **chậm hơn** code đồng bộ, vì thêm chi phí quản lý mà không có khoảng chờ nào để tận dụng.

## Cú pháp và cái bẫy đầu tiên

```python
import asyncio
import httpx

async def lay_nguoi_dung(client: httpx.AsyncClient, id: str) -> dict:
    res = await client.get(f"https://api.example.com/users/{id}")
    res.raise_for_status()
    return res.json()

async def main() -> None:
    async with httpx.AsyncClient() as client:
        nd = await lay_nguoi_dung(client, "u-1")
        print(nd["name"])

asyncio.run(main())
```

`async def` tạo **coroutine**. Gọi nó mà không `await` thì không có gì chạy cả:

```python
lay_nguoi_dung(client, "u-1")          # ❌ RuntimeWarning: never awaited
await lay_nguoi_dung(client, "u-1")    # ✅
```

Python cảnh báo nhưng không lỗi — nên đây là loại bug âm thầm: hàm "không làm gì" mà không có exception nào.

## Chạy song song: `gather`

`await` tuần tự không nhanh hơn code đồng bộ chút nào:

```python
# ❌ 3 request nối tiếp: 300ms
a = await lay_nguoi_dung(client, "u-1")
b = await lay_nguoi_dung(client, "u-2")
c = await lay_nguoi_dung(client, "u-3")

# ✅ 3 request cùng lúc: ~100ms
a, b, c = await asyncio.gather(
    lay_nguoi_dung(client, "u-1"),
    lay_nguoi_dung(client, "u-2"),
    lay_nguoi_dung(client, "u-3"),
)
```

Đây là toàn bộ lý do người ta dùng async. Viết `await` liên tiếp là có cú pháp async mà không có lợi ích async.

Mặc định `gather` **huỷ tất cả khi một cái lỗi**. Muốn giữ phần thành công:

```python
kq = await asyncio.gather(*tasks, return_exceptions=True)
thanh_cong = [r for r in kq if not isinstance(r, Exception)]
```

Với nhiều task và cần huỷ theo nhóm, `TaskGroup` (3.11+) tốt hơn:

```python
async with asyncio.TaskGroup() as tg:
    t1 = tg.create_task(lay_nguoi_dung(client, "u-1"))
    t2 = tg.create_task(lay_nguoi_dung(client, "u-2"))
# Ra khỏi block là mọi task đã xong. Một cái lỗi → cả nhóm bị huỷ gọn gàng.
print(t1.result(), t2.result())
```

## Giới hạn số việc đồng thời

`gather` với 10.000 URL sẽ mở 10.000 kết nối cùng lúc — hết file descriptor, hoặc bị server chặn:

```python
async def tai_tat_ca(urls: list[str], toi_da: int = 20) -> list[dict]:
    sem = asyncio.Semaphore(toi_da)

    async def mot(url: str) -> dict:
        async with sem:                # tối đa 20 cái vào đây cùng lúc
            return (await client.get(url)).json()

    return await asyncio.gather(*(mot(u) for u in urls))
```

## Lỗi hay gặp nhất: gọi hàm đồng bộ trong async

Đây là nguyên nhân số một của "code async mà chậm như đồng bộ":

```python
async def xu_ly() -> None:
    time.sleep(1)                    # ❌ ĐỨNG cả event loop 1 giây
    requests.get(url)                # ❌ requests là đồng bộ — chặn hết
    await asyncio.sleep(1)           # ✅ nhường quyền cho task khác
```

Event loop chạy trên **một luồng**. Một lời gọi chặn không nhường quyền, nên *mọi* task khác đứng chờ theo. Một `requests.get()` sót lại trong hàm async đủ để vô hiệu hoá toàn bộ tính đồng thời.

Bắt buộc dùng thư viện đồng bộ (driver DB cũ, thư viện xử lý ảnh) thì đẩy sang luồng khác:

```python
kq = await asyncio.to_thread(ham_dong_bo_cham, tham_so)
```

Cặp thư viện tương ứng: `requests` → `httpx`/`aiohttp`, `psycopg2` → `asyncpg`, `time.sleep` → `asyncio.sleep`, `open()` → `aiofiles`.

## Timeout

Không có timeout thì một request treo giữ task đó mãi mãi:

```python
async with asyncio.timeout(5):           # 3.11+
    await lay_nguoi_dung(client, "u-1")

# Cách cũ, tương đương
await asyncio.wait_for(lay_nguoi_dung(client, "u-1"), timeout=5)
```

Cả hai ném `TimeoutError` và **huỷ task** khi hết hạn.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Gọi coroutine mà không `await` | Hàm không chạy, chỉ có warning | Luôn `await` |
| `await` tuần tự nhiều việc độc lập | Không nhanh hơn đồng bộ chút nào | `asyncio.gather` |
| Dùng `requests`/`time.sleep` trong async | Đứng cả event loop | `httpx`, `asyncio.sleep` |
| Dùng asyncio cho việc CPU-bound | Chậm hơn code đồng bộ | `multiprocessing` |
| `gather` hàng nghìn task | Hết file descriptor, bị chặn | `Semaphore` |
| Không đặt timeout | Một request treo giữ task mãi | `asyncio.timeout` |
| `asyncio.run()` gọi lồng nhau | `RuntimeError: loop already running` | Một `run()` ở điểm vào |
| Bỏ qua giá trị trả về của `create_task` | Task bị GC giữa đường, lỗi bị nuốt | Giữ tham chiếu, hoặc `TaskGroup` |

## Ghi nhớ

- Async cho việc **chờ**, không cho việc **tính** — GIL vẫn ở đó.
- `await` tuần tự = không có lợi ích gì; `gather` mới là chỗ có lợi.
- Một hàm đồng bộ trong async làm đứng toàn bộ event loop.
- Luôn có timeout và giới hạn số việc đồng thời.

## Tự kiểm tra

1. Vì sao asyncio không giúp gì cho việc xử lý ảnh?
2. Ba `await` liên tiếp mất 300ms. Sửa thế nào để còn ~100ms?
3. `time.sleep(1)` trong hàm async gây ra chuyện gì, và thay bằng gì?
