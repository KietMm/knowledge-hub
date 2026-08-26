---
title: Bộ nhớ ảo và phân trang
slug: bo-nho-ao-va-phan-trang
summary: Vì sao mỗi tiến trình tưởng mình có cả máy, swap làm gì, và OOM killer chọn nạn nhân ra sao.
level: trung-cap
tags: [he-dieu-hanh, bo-nho, swap, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc đúng `free -h`, biết vì sao `RSS` mới là RAM thật, và OOM killer chọn ai.

## Ý tưởng chính

Mỗi tiến trình nhìn thấy một không gian địa chỉ **liên tục và của riêng nó**, bắt đầu từ 0. Đó là ảo giác do hệ điều hành dựng lên.

Bên dưới, hệ điều hành ánh xạ từng **trang** (thường 4 KB) của không gian ảo đó tới một khung nhớ vật lý — hoặc tới đĩa, hoặc **chưa tới đâu cả**.

Vế cuối giải thích gần hết những con số bộ nhớ trông kỳ lạ.

## Mental model

Hãy nghĩ tới **số phòng khách sạn và sơ đồ của lễ tân**.

> Khách ở "phòng 301". Với khách, đó là địa chỉ cố định — họ không cần biết gì hơn.
>
> Lễ tân giữ **sơ đồ ánh xạ**: phòng 301 của đoàn A nằm ở tầng 3 cánh trái; phòng 301 của đoàn B nằm ở toà nhà bên cạnh. Hai khách cùng nói "phòng 301" mà không đụng nhau.
>
> Và lễ tân có thể **chuyển đồ của một khách vắng mặt xuống kho** để lấy phòng cho người khác. Khách quay lại, phải chờ nhân viên mang đồ lên — chậm, nhưng vẫn được.

Sơ đồ đó là **bảng trang**. Cái kho là **swap**. Và "phòng đã đặt nhưng khách chưa tới" chính là bộ nhớ đã cấp phát nhưng chưa dùng — lý do `VSZ` luôn lớn hơn `RSS`.

## Ví dụ nhỏ

```bash
$ free -h
              total   used   free   shared  buff/cache   available
Mem:           15Gi   6.2Gi  312Mi   410Mi       8.5Gi       8.1Gi
#                                                            ↑ nhìn cột này
```

## Code chạy thế nào

**`free` gần bằng 0 là chuyện bình thường:**

```text
free       RAM chưa dùng vào việc gì   ← con số ÍT Ý NGHĨA NHẤT
buff/cache RAM đang dùng làm cache đĩa  ← LẤY LẠI ĐƯỢC bất cứ lúc nào
available  RAM thật sự dùng được ngay   ← ĐÂY là con số cần nhìn
           ≈ free + phần lớn buff/cache

Linux cố ý dùng hết RAM rỗi làm cache đĩa.
RAM rỗi là RAM lãng phí — nó không sinh lợi gì khi nằm không.
⇒ "free chỉ còn 312 MB" KHÔNG phải cảnh báo.
  "available chỉ còn 312 MB" MỚI là cảnh báo.
```

**`VSZ` và `RSS` — vì sao chúng chênh nhau nhiều:**

```text
VSZ  toàn bộ không gian địa chỉ ảo ĐÃ ĐĂNG KÝ
     gồm cả: vùng cấp phát nhưng chưa chạm tới,
             thư viện dùng chung, file được ánh xạ
RSS  số trang THẬT SỰ đang nằm trong RAM   ← con số cần theo dõi

$ ps aux
USER  PID  %MEM    VSZ    RSS  COMMAND
app  4821   2.1  998244  87320  node server.js
                 ~975MB  ~85MB   ← chênh hơn 11 lần, và đó là bình thường
```

Lý do: Linux cấp phát **lười**. Bạn xin 1 GB, nó ghi vào bảng trang "đã hứa" nhưng chưa cấp khung nhớ nào. Chỉ khi bạn **ghi** vào một trang thì mới có RAM thật được cấp — qua một **lỗi trang** (page fault).

```text
Lỗi trang nhẹ  trang có trong RAM, chỉ chưa ánh xạ → rất nhanh
Lỗi trang nặng phải đọc từ ĐĨA                     → chậm ~1000 lần
```

Nhiều lỗi trang nặng là dấu hiệu **thrashing** — hệ thống dành phần lớn thời gian chuyển trang ra vào đĩa thay vì làm việc.

## Cú pháp

**Swap — không phải "thêm RAM", và cũng không phải kẻ xấu:**

```text
Swap là vùng ĐĨA dùng để chứa trang bị đẩy ra khỏi RAM.
Đĩa chậm hơn RAM ~1000 lần (SSD) tới ~100.000 lần (đĩa quay).

Swap ÍT thì tốt:  đẩy ra những trang lâu không dùng
                  ⇒ dành RAM cho cache đĩa ⇒ tổng thể NHANH HƠN
Swap NHIỀU thì tệ: dữ liệu nóng bị đẩy ra và kéo vào liên tục
                  ⇒ thrashing ⇒ hệ thống gần như đứng

⇒ Chỉ số cần theo dõi là TỐC ĐỘ swap in/out (`vmstat 1`, cột si/so),
  không phải dung lượng swap đang dùng.
```

```bash
vmstat 1
# si  so   ← swap in / swap out mỗi giây. Liên tục > 0 là dấu hiệu xấu.
cat /proc/sys/vm/swappiness      # 0–100, mặc định 60
```

Với máy chủ CSDL, người ta thường hạ `swappiness` xuống 1–10: CSDL tự quản lý bộ đệm của nó và **không muốn** hệ điều hành đẩy bộ đệm đó ra đĩa.

**OOM killer — nó chọn ai:**

```text
Hết RAM và hết swap ⇒ nhân phải giết một tiến trình.

Điểm số dựa chủ yếu vào LƯỢNG RAM tiến trình đang chiếm.
⇒ Nạn nhân thường là tiến trình TO NHẤT — hay chính là CSDL của bạn.
⇒ Một job nhỏ rò rỉ bộ nhớ có thể làm Postgres bị giết.

Xem lại sau sự cố:
  dmesg -T | grep -i 'killed process'
  journalctl -k | grep -i oom
```

```text
Cách phòng đúng: GIỚI HẠN TỪNG DỊCH VỤ, đừng dựa vào OOM killer.
  systemd:  MemoryMax=512M
  Docker:   mem_limit / deploy.resources.limits.memory

⇒ Container vượt trần thì CHỈ NÓ bị giết, và restart:always bật lại.
  Sự cố bị nhốt trong ranh giới của nó ([[toi-uu-va-van-hanh-container]]).
```

**Cấp phát quá tay (overcommit):** Linux cho phép các tiến trình xin tổng cộng nhiều RAM hơn máy có, vì phần lớn không dùng hết phần đã xin. Điều này khiến `malloc` gần như không bao giờ thất bại — và hậu quả là bạn phát hiện hết RAM không phải bằng một lỗi cấp phát, mà bằng **OOM killer**.

## Tại sao cần nó

Vì bốn hiểu lầm về bộ nhớ đều tốn thời gian thật:

```text
① "free còn ít quá, sắp hết RAM!"      → nhìn available
② "VSZ 1 GB, ứng dụng rò rỉ rồi!"       → nhìn RSS
③ "Tắt swap đi cho nhanh"               → mất lớp đệm, OOM sớm hơn
④ "Thêm RAM là hết chậm"                → nếu đang thrashing thì có,
                                          nếu rò rỉ thì chỉ hoãn được vài giờ
```

**Với runtime có heap tự quản (JVM, Node):**

```text
Nhiều runtime đọc RAM của MÁY CHỦ chứ không đọc giới hạn container,
rồi tự đặt heap quá lớn ⇒ vượt trần cgroup ⇒ bị giết khi có tải.

⇒ Khai rõ: node --max-old-space-size=384   (cho limit 512M)
            java -XX:MaxRAMPercentage=75
```

Đây là nguyên nhân rất phổ biến của "container bị giết ngẫu nhiên" mà log ứng dụng không ghi gì.

## So sánh

| Chỉ số | Nghĩa | Dùng để |
|---|---|---|
| `free` | RAM chưa dùng | gần như không dùng |
| `available` | RAM dùng được ngay | **cảnh báo** |
| `buff/cache` | cache đĩa | hiểu vì sao free thấp |
| `VSZ` | không gian ảo đã đăng ký | gần như không dùng |
| `RSS` | RAM vật lý đang chiếm | **theo dõi rò rỉ** |
| `si`/`so` | tốc độ swap | phát hiện thrashing |

## Dễ nhầm

**1. Hoảng vì `free` thấp.** Nhìn `available`.

**2. Theo dõi `VSZ` thay vì `RSS`.**

**3. Tắt swap hoàn toàn.** Mất lớp đệm; OOM đến sớm hơn.

**4. Theo dõi dung lượng swap thay vì tốc độ swap.**

**5. Dựa vào OOM killer thay vì đặt giới hạn.** Nó giết nhầm dịch vụ quan trọng.

**6. Không khai heap theo giới hạn container.** Bị giết khi có tải.

**7. Thêm RAM cho một chỗ rò rỉ.** Chỉ hoãn.

**8. Không đọc `dmesg` sau khi tiến trình biến mất.** Bỏ qua bằng chứng rõ ràng nhất.

**9. Tưởng `malloc` thất bại khi hết RAM.** Overcommit khiến nó vẫn thành công.

## Mẹo nhớ

> **Nhìn `available`, không nhìn `free`. Nhìn `RSS`, không nhìn `VSZ`.**
>
> **Swap ít thì tốt; swap NHIỀU LIÊN TỤC mới là bệnh — đo si/so.**
>
> **OOM killer giết tiến trình TO NHẤT — thường là CSDL. Hãy đặt giới hạn từng dịch vụ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao `free` gần 0 là bình thường?
2. `VSZ` khác `RSS` thế nào, vì sao chênh nhiều?
3. Lỗi trang nhẹ khác nặng ra sao?
4. Khi nào swap có ích, khi nào nó là bệnh, đo bằng gì?
5. OOM killer chọn nạn nhân dựa vào gì, và cách phòng đúng?

## Tự viết lại

Không nhìn lại:

```text
① Đọc một dòng `free -h` giả định và kết luận máy có đang thiếu RAM không
② Ba lệnh để xác định một tiến trình có rò rỉ bộ nhớ không
③ Cấu hình giới hạn RAM cho một dịch vụ Node trong Docker,
   kèm tham số heap tương ứng
```

Tự kiểm: ở ③, vì sao heap phải nhỏ hơn giới hạn container chứ không bằng?

## Thử sức

Container Node có `memory: 512M` bị giết ngẫu nhiên vài lần mỗi ngày. Log ứng dụng **không có lỗi gì** trước lúc chết.

Ba câu để trả lời: vì sao log ứng dụng im lặng; bạn tìm bằng chứng ở đâu; và hai nguyên nhân khả dĩ nhất cùng cách phân biệt chúng. Câu khó nhất: nếu `RSS` tăng đều rồi tụt về sau mỗi lần restart, đó là rò rỉ hay là heap khai quá lớn — bạn phân biệt bằng phép đo nào?
