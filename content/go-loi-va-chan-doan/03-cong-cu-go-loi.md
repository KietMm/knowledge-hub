---
title: Công cụ gỡ lỗi
slug: cong-cu-go-loi
summary: Debugger, log, profiler, bisect — mỗi công cụ trả lời câu hỏi gì, và khi nào log tốt hơn debugger.
level: trung-cap
tags: [go-loi, cong-cu, phuong-phap, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng công cụ theo câu hỏi đang có, thay vì dùng mãi một cái.

## Ý tưởng chính

Mỗi công cụ gỡ lỗi trả lời **một loại câu hỏi**. Dùng sai công cụ không phải là sai — nó chỉ chậm hơn nhiều lần.

Và có một điều trái với lời khuyên thường gặp: **`console.log` không phải công cụ của người mới**. Với bug bất đồng bộ, bug chỉ xuất hiện ở production, hay bug xảy ra một lần trong nghìn lần, nó tốt hơn debugger.

## Mental model

Hãy nghĩ tới **dụng cụ của một người sửa xe**.

> **Đèn pin** — nhìn vào một chỗ cụ thể, thấy rõ trạng thái ngay lúc đó. Đó là debugger.
>
> **Hộp đen ghi hành trình** — không thấy gì lúc này, nhưng biết được chuyện gì đã xảy ra trên đường, kể cả khi bạn không có mặt. Đó là log.
>
> **Máy đo tiêu thụ nhiên liệu** — không nói xe hỏng ở đâu, nói xe tốn nhiên liệu ở đâu. Đó là profiler.
>
> **Sổ bảo dưỡng** — "lần trước sửa gì? từ đó có gì thay đổi?". Đó là `git bisect`.

Bạn không dùng đèn pin để tìm chỗ tốn nhiên liệu, và không dùng hộp đen để xem hiện tại. Câu hỏi quyết định dụng cụ.

## Ví dụ nhỏ

```text
"Biến này bằng gì tại đây?"        → debugger
"Chuyện gì đã xảy ra lúc 3h sáng?"  → log
"Vì sao chậm?"                      → profiler
"Từ commit nào bắt đầu hỏng?"       → git bisect
```

## Code chạy thế nào

**Debugger — mạnh khi bạn tái hiện được tại chỗ:**

```bash
node --inspect-brk server.js      # rồi mở chrome://inspect
```

```text
Ba thứ debugger làm mà log không làm được:
  ① Xem TOÀN BỘ trạng thái — mọi biến trong mọi khung, không phải
    chỉ những biến bạn nghĩ ra để in
  ② Chạy từng dòng, thấy luồng điều khiển thật đi đường nào
  ③ Breakpoint có ĐIỀU KIỆN — dừng chỉ khi `don.id === 'abc'`
    ⇒ đây là tính năng bị dùng ít nhất và hữu ích nhất:
      nó cho phép bắt đúng một trường hợp trong hàng nghìn

Điểm yếu:
  ✗ Dừng tiến trình ⇒ vô dụng với bug về thời gian, race condition
  ✗ Không dùng được ở production
  ✗ Kém với bất đồng bộ: bước qua một `await` là mất mạch
```

**Log — mạnh khi bạn không có mặt lúc bug xảy ra:**

```text
Log thắng debugger ở bốn tình huống:
  □ Bug ở production
  □ Bug bất đồng bộ, nhiều luồng, hoặc phụ thuộc thời gian
  □ Bug xảy ra 1 lần trong 1.000
  □ Cần thấy TRÌNH TỰ, không phải một thời điểm
```

```ts
// Log tạm để gỡ lỗi: gắn NHÃN để lọc và xoá dễ
logger.debug({ dbg: 'don-hang', buoc: 'truoc-tinh-tong', don })
// Xong việc: grep 'dbg:' và xoá hết. Đừng để lại.
```

Log tạm không có nhãn thống nhất là thứ tích tụ trong mã và không ai dám xoá — một nhãn quy ước giải quyết chuyện đó.

## Cú pháp

**Profiler — trả lời "chậm ở đâu", không trả lời "sai ở đâu":**

```bash
node --cpu-prof server.js         # sinh file .cpuprofile, mở trong DevTools
node --heap-prof server.js        # cho rò rỉ bộ nhớ
```

```text
Đọc kết quả:
  Self time   thời gian TRONG chính hàm đó       → hàm nặng CPU
  Total time  gồm cả các hàm nó gọi              → nhánh nặng

Bẫy phổ biến: hàm có total time cao nhất thường là `main`
hoặc handler gốc — nó gọi mọi thứ. Hãy tìm hàm có SELF TIME cao.
```

Và với ứng dụng web, trước khi mở profiler: hầu hết chậm là do **chờ I/O**, không phải CPU. Profiler CPU sẽ cho thấy một biểu đồ gần như rỗng — và đó chính là câu trả lời ([[hieu-nang-va-do-luong]]).

**Sáu công cụ theo tầng:**

```text
Trình duyệt   DevTools: Network (thấy request thật), Performance,
              React DevTools (thấy component nào render lại)
Node          --inspect, --cpu-prof, --heap-prof
Hệ điều hành  strace (syscall), lsof (fd đang mở), ss (kết nối)
              ([[syscall-va-ranh-gioi-nhan]])
CSDL          EXPLAIN ANALYZE, pg_stat_activity (truy vấn đang chạy)
Mạng          curl -v, tcpdump, mitmproxy
Git           bisect, blame, log -S'chuỗi' (tìm commit thêm/xoá một chuỗi)
```

`git log -S` ít được biết và rất hữu ích: nó tìm commit nào **thêm hoặc xoá** một chuỗi cụ thể — trả lời "dòng này từ đâu ra" nhanh hơn `blame` khi mã đã bị di chuyển.

**Gỡ lỗi ở production — làm được, nhưng có luật:**

```text
✅ Đọc log, metric, trace
✅ Bật log mức DEBUG cho MỘT người dùng hoặc MỘT tỉ lệ nhỏ
✅ Chụp heap snapshot (chú ý: nó dừng tiến trình một lúc)
✅ Đọc `pg_stat_activity` xem truy vấn nào đang chạy

❌ Debugger dừng tiến trình
❌ Sửa mã trực tiếp trên máy chủ
❌ Bật log DEBUG cho toàn bộ traffic — hoá đơn log và I/O
❌ Thử nghiệm mà không ai biết
```

Nguyên tắc chung: ở production bạn **quan sát**, không can thiệp. Muốn can thiệp thì tái hiện ở staging ([[su-co-va-hau-kiem]]).

## Tại sao cần nó

Vì dùng một công cụ cho mọi việc là nguyên nhân phổ biến nhất của gỡ lỗi chậm:

```text
Chỉ dùng console.log:
  → bug hiệu năng: in ra thời gian ở 20 chỗ, thay vì một lần profiler
  → cần xem toàn bộ trạng thái: in từng biến một, đoán biến nào cần

Chỉ dùng debugger:
  → bug ở production: không dùng được, và bạn không có gì khác
  → race condition: đặt breakpoint là bug biến mất
```

**Chọn công cụ theo câu hỏi:**

```text
"Biến này bằng gì?"                 → debugger, hoặc một log
"Luồng đi đường nào?"                → debugger từng bước, hoặc log ở mỗi nhánh
"Chuyện gì xảy ra lúc 3h sáng?"      → log
"Chậm ở đâu?"                        → profiler
"Truy vấn nào chậm?"                 → EXPLAIN ANALYZE, pg_stat_statements
"Rò rỉ bộ nhớ ở đâu?"                → heap snapshot, so hai thời điểm
"Từ khi nào hỏng?"                   → git bisect
"Request thật gửi gì?"               → DevTools Network, curl -v, mitmproxy
"Tiến trình đang kẹt ở đâu?"         → strace, hoặc stack dump
```

Bảng này là phần đáng mang đi nhất của bài: khi bế tắc, hỏi *"câu hỏi hiện tại của mình là gì"* thường nhanh hơn là thử thêm một lần nữa bằng công cụ cũ.

## So sánh

| Công cụ | Trả lời | Dùng ở production |
|---|---|---|
| Debugger | trạng thái tại một điểm | ❌ |
| Log | trình tự, chuyện đã xảy ra | ✅ |
| Profiler | thời gian tiêu ở đâu | ⚠️ có chi phí |
| Heap snapshot | bộ nhớ giữ ở đâu | ⚠️ dừng tiến trình |
| `git bisect` | thay đổi nào gây ra | — |
| `strace` | tiến trình đang làm gì | ⚠️ chậm 10–100× |

## Dễ nhầm

**1. Chỉ dùng một công cụ cho mọi loại bug.**

**2. Dùng debugger cho race condition.** Breakpoint làm bug biến mất.

**3. Dùng log để tìm bug hiệu năng.** Profiler nhanh hơn nhiều.

**4. Đọc total time thay vì self time.** `main` luôn cao nhất.

**5. Mở CPU profiler cho vấn đề chờ I/O.** Biểu đồ rỗng.

**6. Debugger ở production.** Dừng tiến trình.

**7. Bật log DEBUG toàn bộ traffic.** Hoá đơn và I/O.

**8. Log tạm không có nhãn.** Tích tụ, không ai dám xoá.

**9. Không dùng breakpoint có điều kiện.** Bấm "continue" hàng trăm lần.

**10. Bỏ qua `git bisect`** khi biết trước đó còn chạy.

## Mẹo nhớ

> **Câu hỏi quyết định công cụ. Bế tắc thì hỏi lại: "câu hỏi của mình là gì?"**
>
> **Log THẮNG debugger ở production, ở bug async, và ở bug 1/1000.**
>
> **Profiler: đọc SELF TIME, không đọc total time.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba thứ debugger làm mà log không làm được?
2. Bốn tình huống log tốt hơn debugger?
3. Self time khác total time thế nào?
4. Được và không được làm gì khi gỡ lỗi ở production?
5. `git log -S` trả lời câu hỏi gì?

## Tự viết lại

Không nhìn lại, chọn công cụ và giải thích cho từng bug:

```text
① Trang danh sách mất 4 giây
② API trả về dữ liệu sai, chỉ với một khách hàng cụ thể
③ Node chiếm 4 GB RAM sau 6 giờ chạy
④ Tính năng hỏng, tuần trước còn chạy
⑤ Hai request đồng thời làm dữ liệu sai
⑥ Container chạy nhưng không nhận kết nối
```

Tự kiểm: ở ⑤, vì sao debugger là lựa chọn tệ — và bạn dùng gì thay thế?

## Thử sức

Bug: một endpoint trả về dữ liệu sai, nhưng **chỉ với một khách hàng**, và chỉ ở production.

Ba câu để trả lời: bạn dùng công cụ nào và theo thứ tự nào; bạn thu hẹp ra sao mà **không** bật log DEBUG cho toàn bộ traffic; và bạn tái hiện ở staging bằng cách nào. Câu khó nhất: nếu khác biệt duy nhất của khách hàng đó là dữ liệu của họ, bạn lấy được dữ liệu đó để thử mà **không vi phạm quyền riêng tư** bằng cách nào?
