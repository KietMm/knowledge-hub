---
title: Lập lịch CPU và độ ưu tiên
slug: lap-lich-va-uu-tien
summary: Hệ điều hành chia CPU thế nào, vì sao load average không phải phần trăm CPU, và nice làm gì.
level: co-ban
tags: [he-dieu-hanh, lap-lich, hieu-nang, van-hanh]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc đúng `load average`, phân biệt "bận CPU" với "chờ I/O", và biết `nice` thật sự làm gì.

## Ý tưởng chính

Máy có 8 lõi nhưng đang chạy 300 tiến trình. Hệ điều hành **luân phiên** cho từng cái một lát CPU, nhanh tới mức trông như chúng chạy cùng lúc.

Bộ lập lịch quyết định *ai chạy tiếp theo và trong bao lâu*. Hiểu nó giải thích được phần lớn những con số bạn nhìn thấy khi hệ thống có sự cố.

## Mental model

Hãy nghĩ tới **một bác sĩ và phòng chờ**.

> Bác sĩ khám được **một người tại một thời điểm**. Phòng chờ có 20 người.
>
> Bác sĩ không khám xong hẳn một người rồi mới gọi người sau — họ khám 10 phút, cho đi xét nghiệm, gọi người tiếp theo. Người đi xét nghiệm **không chiếm chỗ của bác sĩ** trong lúc chờ kết quả.
>
> Có người được ưu tiên: cấp cứu chen lên trước. Đó là độ ưu tiên.

Ba chi tiết đó ánh xạ đúng: lát thời gian, tiến trình chờ I/O **không tiêu CPU**, và độ ưu tiên. Và câu hỏi quan trọng nhất khi hệ thống chậm là: *hàng người đang chờ **bác sĩ**, hay đang chờ **kết quả xét nghiệm**?*

## Ví dụ nhỏ

```bash
$ uptime
 14:32:01 up 42 days,  load average: 8.15, 6.20, 4.05
#                                     1 phút  5 phút  15 phút
```

## Code chạy thế nào

**Load average — thứ hay bị đọc sai nhất:**

```text
Load average KHÔNG phải phần trăm CPU.
Nó là SỐ TIẾN TRÌNH trung bình đang chạy HOẶC đang chờ.

Trên Linux, nó đếm cả tiến trình ở trạng thái D — chờ đĩa/mạng.

Máy 8 lõi:
  load 4   → còn dư một nửa
  load 8   → dùng hết, không còn dư
  load 16  → mỗi tiến trình chờ trung bình gấp đôi thời gian

⇒ Luôn chia load cho SỐ LÕI trước khi kết luận.
  `nproc` cho biết số lõi.
```

Và đây là chỗ nó gây nhầm nhiều nhất:

```text
load = 20, CPU = 5%   ← không mâu thuẫn!
⇒ 20 tiến trình đang CHỜ ĐĨA hoặc CHỜ MẠNG, không chờ CPU.
⇒ Thêm CPU không cứu được gì. Vấn đề nằm ở I/O.
```

**Các trạng thái tiến trình — `ps` cột STAT:**

```text
R  đang chạy hoặc sẵn sàng chạy   → cạnh tranh CPU
S  ngủ, đánh thức được            → chờ mạng, chờ sự kiện. Bình thường.
D  ngủ KHÔNG ngắt được            → chờ đĩa. Nhiều D = I/O đang tắc.
                                     Không kill được, kể cả -9.
Z  zombie                          → đã chết, cha chưa thu dọn
T  bị dừng                         → nhận SIGSTOP
```

Nhìn thấy nhiều tiến trình ở trạng thái `D` là dấu hiệu rõ nhất của **nghẽn đĩa** — và nó giải thích luôn vì sao `kill -9` không có tác dụng lúc đó ([[tien-trinh-va-dich-vu]]).

**`%iowait` — chỉ số hay bị bỏ qua:**

```bash
$ top
%Cpu(s):  5.2 us,  1.1 sy,  0.0 ni, 21.3 id, 72.1 wa
#          user    system         idle      ← wa = 72% thời gian CHỜ I/O
```

CPU rảnh 21% nhưng hệ thống vẫn chậm, vì nó dành 72% thời gian ngồi chờ đĩa.

## Cú pháp

**Cách lập lịch hiện đại — CFS của Linux:**

```text
Ý tưởng: mỗi tiến trình nên nhận PHẦN CPU CÔNG BẰNG theo thời gian.

Bộ lập lịch giữ "thời gian ảo đã dùng" của từng tiến trình,
và luôn chọn cái đã dùng ÍT NHẤT.

⇒ Tiến trình vừa chờ I/O xong được ưu tiên chạy ngay
  (vì nó đã dùng ít CPU) ⇒ ứng dụng tương tác vẫn mượt
  dù máy đang chạy một job nặng nền.
```

**`nice` — điều chỉnh phần chia, không phải điều chỉnh tốc độ:**

```bash
nice -n 19 ./job-nang.sh        # nhường nhất  (−20 … 19)
renice -n 10 -p 4821            # đổi cho tiến trình đang chạy
ionice -c 3 ./sao-luu.sh        # nhường ở tầng ĐĨA — thường quan trọng hơn
```

```text
nice CAO  = TỬ TẾ hơn với người khác = ưu tiên THẤP hơn
nice 19   = "chỉ chạy khi không ai cần CPU"
nice −20  = cần quyền root

Quan trọng: nice KHÔNG làm job chạy nhanh hơn khi máy rảnh.
Nó chỉ quyết định ai nhường ai KHI CÓ TRANH CHẤP.
```

Và với các job sao lưu, nén, quét — **`ionice` thường có tác dụng hơn `nice`**, vì thứ chúng tranh giành là đĩa chứ không phải CPU.

**Giới hạn CPU trong container:**

```yaml
deploy:
  resources:
    limits: { cpus: '1.5' }
```

```text
Cơ chế: cgroup cấp cho container một hạn ngạch mỗi chu kỳ 100ms.
Dùng hết hạn ngạch ⇒ tiến trình bị "bóp" (throttle) tới chu kỳ sau.

Triệu chứng khó chịu: p99 tăng vọt trong khi CPU trung bình thấp
— vì tiến trình bị dừng 20ms mỗi lần chạm trần.
⇒ Đo `container_cpu_cfs_throttled_seconds` chứ không chỉ đo %CPU.
```

Đây là một trong những nguyên nhân phổ biến nhất của "chậm bất thường" trong Kubernetes, và nó **không** hiện ra trên biểu đồ CPU.

## Tại sao cần nó

Vì nó phân biệt được ba loại "hệ thống chậm" cần ba cách xử lý khác hẳn:

```text
① load cao + CPU cao          → thật sự thiếu CPU
   ⇒ tối ưu mã, hoặc thêm lõi/máy

② load cao + CPU thấp + wa cao → nghẽn I/O
   ⇒ thêm CPU KHÔNG cứu được. Sửa truy vấn, thêm index, đổi đĩa.

③ CPU thấp + throttle cao      → bị giới hạn cgroup
   ⇒ nâng limit, hoặc giảm việc trong mỗi request
```

**Quy trình đọc số khi có sự cố:**

```bash
nproc                 # ① máy có mấy lõi?
uptime                # ② load / số lõi = mức bão hoà
top                   # ③ us cao hay wa cao?
ps aux | awk '$8 ~ /D/'   # ④ có tiến trình nào kẹt chờ đĩa?
```

Bốn lệnh này trả lời được câu hỏi "chậm vì CPU hay vì I/O" trong dưới một phút ([[go-loi-tren-may-chu]]).

## So sánh

| Chỉ số | Nói lên | Hiểu sai thường gặp |
|---|---|---|
| `load average` | số tiến trình chạy + chờ | tưởng là % CPU |
| `%us` | CPU cho mã người dùng | — |
| `%sy` | CPU cho nhân | cao bất thường = nhiều syscall |
| `%wa` | chờ I/O | bỏ qua, rồi thêm CPU vô ích |
| throttle | bị cgroup bóp | không đo, nên không thấy |

## Dễ nhầm

**1. Đọc load average như phần trăm CPU.**

**2. Không chia load cho số lõi.** Load 8 trên 16 lõi là bình thường.

**3. Bỏ qua `%wa`.** Thêm CPU cho một vấn đề I/O.

**4. Không đo CPU throttling trong container.** p99 tăng mà không rõ vì sao.

**5. Tưởng `nice` làm job nhanh hơn.** Nó chỉ quyết định ai nhường khi tranh chấp.

**6. Dùng `nice` cho job nặng đĩa.** Cần `ionice`.

**7. `kill -9` tiến trình ở trạng thái `D`.** Không có tác dụng cho tới khi I/O xong.

**8. Bỏ qua tiến trình zombie.** Chúng vô hại về tài nguyên, nhưng nhiều zombie nghĩa là tiến trình **cha** đang có lỗi.

## Mẹo nhớ

> **Load average là SỐ TIẾN TRÌNH chờ, không phải % CPU. Luôn chia cho số lõi.**
>
> **Load cao + CPU thấp = nghẽn I/O. Thêm CPU không cứu được.**
>
> **Trong container, đo CPU THROTTLING — nó không hiện trên biểu đồ %CPU.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Load average đo cái gì, và đọc nó thế nào cho đúng?
2. Load 20 với CPU 5% nghĩa là gì?
3. Trạng thái `D` là gì, và vì sao `kill -9` không có tác dụng?
4. `nice` làm gì và **không** làm gì?
5. CPU throttling trong container gây triệu chứng gì?

## Tự viết lại

Không nhìn lại, viết quy trình chẩn đoán "hệ thống chậm":

```text
① bốn lệnh đầu tiên và thứ tự
② với mỗi kết quả có thể, kết luận gì
③ ba loại chậm và cách xử lý mỗi loại
```

Tự kiểm: nếu cả bốn lệnh đều bình thường mà người dùng vẫn kêu chậm, bạn nghi ngờ ở đâu tiếp theo?

## Thử sức

Cảnh báo: `load average: 45.2` trên máy 8 lõi. Nhưng `top` cho thấy CPU chỉ dùng 12%, `%wa` là 78%.

Ba câu để trả lời: chuyện gì đang xảy ra; ba nguyên nhân khả dĩ và cách kiểm từng cái; và vì sao **thêm CPU sẽ không giúp gì**. Câu khó nhất: nếu nguyên nhân là một job sao lưu đang chạy, bạn xử lý **ngay bây giờ** thế nào và **lâu dài** thế nào để nó không lặp lại?
