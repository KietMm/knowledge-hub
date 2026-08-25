---
title: async/await trong Python
slug: async-trong-python
summary: Khi nào async giúp thật, GIL và vì sao một lời gọi đồng bộ làm đứng cả event loop.
level: nang-cao
tags: [python, async, asyncio, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** biết async giúp được loại việc nào (và loại nào không), và nhận ra ngay khi một lời gọi đồng bộ đang làm đứng cả chương trình.

## Ý tưởng chính

`async` trong Python giúp được **việc chờ**, không giúp **việc tính**.

Chờ mạng, chờ đĩa, chờ cơ sở dữ liệu — trong lúc đó CPU rảnh, và async cho phép làm việc khác. Nhưng nếu bạn đang tính toán nặng, async **không giúp gì cả**: chỉ có một luồng, và GIL bảo đảm mỗi lúc chỉ một luồng Python chạy bytecode.

## Mental model

Hãy nghĩ tới **một nhân viên phục vụ duy nhất trong quán**.

> Anh ta nhận order bàn 1, **đưa vào bếp** — rồi không đứng chờ. Anh sang bàn 2, bàn 3 nhận order tiếp. Món nào xong thì bưng ra. Đây là `async`: **việc chờ** được xếp chồng lên nhau.
>
> Nhưng nếu bàn 1 nhờ anh **ngồi gấp 500 con hạc giấy**, thì cả quán đứng lại. Không ai được phục vụ cho tới khi anh gấp xong. Đây là **việc tính** — async không cứu được.

Từ đó suy ra hai điều: async đáng dùng cho I/O, và **một lời gọi đồng bộ chậm trong code async là con hạc giấy đó**.

## Ví dụ nhỏ

```python
import asyncio

async def lay(id: int) -> dict:
    await asyncio.sleep(1)          # giả lập chờ mạng
    return {"id": id}

async def main():
    a = await lay(1)                 # ❌ tuần tự: 1 giây
    b = await lay(2)                 # ❌ thêm 1 giây nữa
    # tổng 2 giây

asyncio.run(main())
```

## Code chạy thế nào

`await` **không** khởi chạy song song. Nó nói *"dừng ở đây tới khi xong"*:

```text
❌ Tuần tự
   a = await lay(1)     [==== 1s ====]
   b = await lay(2)                   [==== 1s ====]
   ⇒ 2 giây

✅ Song song
   a, b = await asyncio.gather(lay(1), lay(2))
   [==== 1s ====]   ← cả hai chạy chồng lên nhau
   ⇒ 1 giây
```

Và cái bẫy tinh vi hơn: gọi hàm async mà **không** `await` thì nó **chưa chạy gì cả**:

```python
lay(1)              # ❌ tạo một coroutine rồi vứt đi; RuntimeWarning: never awaited
await lay(1)        # ✅
```

## Cú pháp

```python
import asyncio

# Chạy nhiều việc song song
kq = await asyncio.gather(lay(1), lay(2), lay(3))
kq = await asyncio.gather(*[lay(i) for i in ids])
kq = await asyncio.gather(*viec, return_exceptions=True)   # một cái lỗi không huỷ cả cụm

# Giới hạn số việc đồng thời — bắt buộc khi ids lớn
sem = asyncio.Semaphore(10)
async def co_gioi_han(i):
    async with sem:
        return await lay(i)

kq = await asyncio.gather(*[co_gioi_han(i) for i in range(1000)])
```

```python
# Timeout
async with asyncio.timeout(5):        # Python 3.11+
    await viec_cham()

# Đẩy việc CPU nặng sang tiến trình khác
kq = await asyncio.get_running_loop().run_in_executor(None, ham_nang, tham_so)
```

`Semaphore` là phần bị bỏ quên nhiều nhất: `gather` 1000 việc cùng lúc sẽ mở 1000 kết nối, làm sập server đối tác hoặc chính bạn.

## Tại sao cần nó

Vì **lỗi phổ biến nhất là gọi hàm đồng bộ trong code async**, và nó âm thầm xoá sạch mọi lợi ích:

```python
async def lay(url):
    return requests.get(url).json()      # ❌ requests là ĐỒNG BỘ
                                          #    → chặn event loop
                                          #    → mọi coroutine khác đứng chờ
```

```python
async def lay(url):
    async with httpx.AsyncClient() as c: # ✅ thư viện async thật
        return (await c.get(url)).json()
```

Cùng lỗi đó với: `time.sleep` (dùng `asyncio.sleep`), driver cơ sở dữ liệu đồng bộ (dùng `asyncpg`, `aiomysql`), và `open()` cho file lớn.

Cách nhận ra: **trong hàm `async`, mọi thao tác I/O đều phải có `await` đứng trước.** Thấy một lời gọi I/O không có `await` là đáng ngờ.

Và với việc **tính toán nặng**, câu trả lời không phải async:

| Loại việc | Dùng |
|---|---|
| Chờ mạng, đĩa, cơ sở dữ liệu | `asyncio` |
| Tính toán nặng (CPU) | `multiprocessing` / `ProcessPoolExecutor` |
| Vài việc I/O đơn giản, code cũ | `ThreadPoolExecutor` |

Lý do là **GIL**: chỉ một luồng Python chạy bytecode tại một thời điểm, nên nhiều luồng không làm việc tính nhanh hơn. Nhiều **tiến trình** thì có, vì mỗi tiến trình có GIL riêng.

## So sánh

| | Đồng bộ | Async |
|---|---|---|
| 100 request HTTP | ~100 giây | ~2 giây |
| 100 phép tính nặng | như nhau | **như nhau** |
| Độ phức tạp code | Thấp | Cao hơn |
| Thư viện | Đủ mọi thứ | Phải chọn bản async |

Dòng cuối là chi phí thật: chuyển sang async nghĩa là đổi cả stack — driver cơ sở dữ liệu, HTTP client, thư viện cache. Đừng chuyển vì "nghe hiện đại"; chuyển khi bạn thật sự bị nghẽn ở I/O.

## Dễ nhầm

**1. Gọi hàm đồng bộ trong async.** Lỗi số một. Cả chương trình đứng và bạn không thấy dấu hiệu gì ngoài việc "async chẳng nhanh hơn".

**2. `await` tuần tự việc chạy song song được.** Dùng `gather`.

**3. Quên `await`.** Coroutine không chạy, và bạn chỉ nhận một cảnh báo dễ bỏ qua.

**4. `gather` không giới hạn.** 10.000 việc cùng lúc là 10.000 kết nối. Dùng `Semaphore`.

**5. Tưởng async làm việc tính nhanh hơn.** Không. Đó là việc của `multiprocessing`.

**6. Trộn `asyncio.run()` nhiều lần.** Mỗi lần tạo một event loop mới rồi đóng; gọi lồng nhau sẽ lỗi. Một điểm vào `asyncio.run(main())` cho cả chương trình.

**7. Quên xử lý huỷ.** Khi task bị huỷ, `CancelledError` được ném vào; nuốt nó bằng `except Exception` sẽ làm chương trình không tắt được.

## Mẹo nhớ

> **Async giúp việc CHỜ, không giúp việc TÍNH.**
>
> **Trong hàm async, mọi I/O phải có `await` đứng trước.**
>
> **`gather` để song song; `Semaphore` để không làm sập ai.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Async giúp loại việc nào, và vì sao không giúp việc tính?
2. `await lay(1)` rồi `await lay(2)` mất bao lâu so với `gather(lay(1), lay(2))`?
3. Chuyện gì xảy ra khi bạn gọi `requests.get` trong một hàm async?
4. Vì sao `gather` 10.000 việc là ý tồi, và bạn sửa bằng gì?
5. GIL ảnh hưởng thế nào tới lựa chọn giữa thread và process?

## Tự viết lại

Không nhìn lại phần trên, sửa hàm này (có **ba** vấn đề):

```python
async def tai_tat_ca(urls):
    kq = []
    for url in urls:                       # 5000 url
        kq.append(requests.get(url).json())
    return kq
```

Tự kiểm: bản của bạn mở tối đa bao nhiêu kết nối cùng lúc, và một url hỏng thì 4999 cái còn lại có mất không?

## Thử sức

Bạn chuyển một API từ đồng bộ sang async. Kết quả đo: **không nhanh hơn chút nào**, có khi còn chậm hơn.

Nêu **ba** nguyên nhân có thể, và với mỗi cái nói bạn **kiểm chứng bằng cách nào**. Gợi ý: một trong ba nằm ở tầng cơ sở dữ liệu, và một nằm ở chỗ bạn không ngờ — bản chất của chính công việc đó.
