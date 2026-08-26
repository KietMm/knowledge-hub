---
title: Vector database và chỉ mục
slug: vector-database-va-chi-muc
summary: Tìm gần đúng thay vì tìm chính xác — vì sao đánh đổi đó cần thiết, và chọn công cụ theo quy mô.
level: trung-cap
tags: [ai, vector-database, tim-kiem, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** biết vì sao vector search là tìm **gần đúng**, và chọn công cụ theo quy mô thật của mình.

## Ý tưởng chính

Tìm k vector gần nhất một cách **chính xác** đòi so với **mọi** vector trong kho. Với một triệu đoạn, đó là một triệu phép tính cho mỗi câu hỏi.

Nên vector database dùng **tìm gần đúng**: chấp nhận bỏ sót một chút để nhanh hơn hàng trăm lần. Đây là một đánh đổi có tham số, và bạn phải biết mình đang đặt nó ở đâu.

## Mental model

Hãy nghĩ tới **tìm nhà hàng gần nhất trong thành phố**.

> **Cách chính xác**: đo khoảng cách từ bạn tới **từng nhà hàng** trong thành phố, rồi chọn cái nhỏ nhất. Đúng tuyệt đối, và mất rất lâu.
>
> **Cách thực tế**: xác định bạn đang ở quận nào, chỉ xét nhà hàng trong quận đó và vài quận kề. Nhanh hơn hàng trăm lần.
>
> Rủi ro: có một nhà hàng ở quận xa nhưng nằm ngay sát ranh giới, gần bạn hơn — và bạn bỏ sót nó.
>
> Bạn chỉnh được: xét thêm nhiều quận kề hơn ⇒ ít bỏ sót hơn, chậm hơn.

"Xét thêm bao nhiêu quận kề" chính là tham số đánh đổi giữa **recall** và **tốc độ**. Đó là núm vặn quan trọng nhất của mọi chỉ mục vector.

## Ví dụ nhỏ

```sql
-- Postgres + pgvector
CREATE INDEX ON doan USING hnsw (embedding vector_cosine_ops);
SELECT id, noi_dung FROM doan
ORDER BY embedding <=> $1
LIMIT 5;
```

## Code chạy thế nào

**Vì sao cần chỉ mục:**

```text
Không chỉ mục (quét toàn bộ):
  1 triệu đoạn × 1.536 chiều = 1,5 tỉ phép nhân mỗi câu hỏi
  ⇒ hàng trăm mili giây tới vài giây

Có chỉ mục HNSW:
  chỉ xét vài nghìn ứng viên
  ⇒ vài mili giây, với recall ~95–99%
```

```text
Nhưng chú ý: dưới ~10.000 đoạn, quét toàn bộ đã đủ nhanh
(vài chục mili giây).
⇒ Đừng thêm chỉ mục khi chưa cần — chỉ mục tốn RAM, tốn thời
  gian xây, và cho kết quả GẦN ĐÚNG thay vì chính xác.
```

**Hai loại chỉ mục thường gặp:**

```text
HNSW — đồ thị nhiều tầng
  Tìm bằng cách "đi bộ" trên đồ thị từ tầng thô tới tầng chi tiết.
  + Recall cao, truy vấn nhanh
  + Thêm vector mới không cần xây lại
  − Tốn RAM đáng kể, xây chỉ mục chậm
  ⇒ Mặc định tốt cho phần lớn trường hợp.

IVF — chia không gian thành các cụm
  Tìm bằng cách chỉ xét vài cụm gần nhất.
  + Ít RAM hơn, xây nhanh hơn
  − Recall thấp hơn ở cùng tốc độ
  − Cần dữ liệu mẫu để xây cụm; dữ liệu đổi nhiều ⇒ phải xây lại
```

**Ba tham số cần biết ở HNSW:**

```text
m               số kết nối mỗi node — cao hơn: recall tốt hơn, tốn RAM hơn
ef_construction lúc XÂY chỉ mục — cao hơn: chỉ mục tốt hơn, xây lâu hơn
ef_search       lúc TRUY VẤN — cao hơn: recall tốt hơn, truy vấn chậm hơn

⇒ `ef_search` là núm vặn bạn dùng nhiều nhất: nó chỉnh được
  lúc chạy, không cần xây lại chỉ mục.
⇒ Cách hiệu chỉnh: đo recall@k thật ở vài giá trị ef_search,
  chọn giá trị đạt recall mục tiêu với độ trễ chấp nhận được.
```

## Cú pháp

**Chọn công cụ theo quy mô:**

```text
< 10.000 đoạn
  → Không cần vector database. Mảng trong bộ nhớ, quét toàn bộ.
    Chính xác 100%, đủ nhanh, không thêm hạ tầng.

10.000 – vài triệu đoạn
  → PGVECTOR trong Postgres bạn đang có.
    + Một CSDL, một bản sao lưu, một thứ để vận hành
    + Kết hợp được với bộ lọc SQL và full-text search
      ⇒ đây là lợi thế lớn, và hay bị bỏ qua
    + Transaction: đoạn và dữ liệu gốc cùng một nơi

Hàng chục triệu trở lên, hoặc yêu cầu đặc thù
  → Vector database chuyên dụng.
    + Tối ưu sâu hơn, nhiều tính năng lọc và phân vùng
    − Một hệ thống nữa phải vận hành, sao lưu, đồng bộ
```

```text
Phần lớn hệ thống nằm ở nhóm hai và không bao giờ rời khỏi nó.
⇒ Bắt đầu bằng pgvector là lựa chọn đúng trong đa số trường hợp
  ([[chon-cong-cu-va-van-hanh]]).
```

**Lọc kết hợp với tìm vector — chỗ khó thật:**

```text
"Tìm 5 đoạn liên quan nhất, TRONG SỐ những đoạn phòng ban X
được xem"

Hai cách, và cả hai đều có vấn đề:
  LỌC TRƯỚC: lọc ra tập con rồi tìm trong đó
    ⇒ Đúng về quyền, nhưng chỉ mục có thể không dùng được
      cho tập con ⇒ chậm.
  LỌC SAU:   tìm top-50 rồi bỏ đoạn không được xem
    ⇒ Nhanh, nhưng có thể còn 0 kết quả — và hệ thống đã ĐỌC
      dữ liệu không được phép.

⇒ Với PHÂN QUYỀN: bắt buộc lọc trước, chấp nhận chậm hơn.
⇒ Với lọc không nhạy cảm (theo ngày, theo loại): lọc sau với
  k đủ lớn thường ổn.
⇒ pgvector có lợi thế ở đây: bộ lọc là WHERE của SQL, và
  planner của Postgres tự chọn chiến lược
  ([[index-va-hieu-nang-truy-van]]).
```

**Vận hành — bốn thứ cần theo dõi:**

```text
□ Bộ nhớ chỉ mục — HNSW chiếm RAM đáng kể, và nó tăng theo
  số đoạn
□ Thời gian xây lại — cần bao lâu nếu phải dựng lại từ đầu?
□ Recall thật — đo định kỳ, đừng tin con số lý thuyết
□ Độ trễ p95 của truy vấn vector
```

## Tại sao cần nó

Vì "tìm gần đúng" nghĩa là **hệ thống của bạn có thể bỏ sót đoạn đúng**, và điều đó phải là một quyết định có ý thức:

```text
recall của chỉ mục = 95%
⇒ 5% số lần, đoạn đúng nhất KHÔNG nằm trong kết quả
⇒ Cộng với những lỗi khác của hệ thống, tỉ lệ này tích luỹ.

⇒ Nếu đang gỡ lỗi "vì sao câu này trả lời sai", một trong
  các giả thuyết phải là: chỉ mục bỏ sót.
⇒ Cách kiểm: chạy lại cùng truy vấn với QUÉT TOÀN BỘ
  (không dùng chỉ mục) và so kết quả.
```

Phép kiểm này rất hữu ích và ít người nghĩ tới: nó tách bạch được lỗi của **chỉ mục** với lỗi của **embedding** hoặc **chia đoạn**.

**Ba lời khuyên thực dụng:**

```text
① Bắt đầu KHÔNG CÓ chỉ mục nếu dưới ~10.000 đoạn.
   Chính xác 100%, và bạn có đường cơ sở để so sau này.
② Thêm chỉ mục khi độ trễ thành vấn đề thật, không phải
   khi bạn đoán nó sẽ thành vấn đề.
③ Sau khi thêm, ĐO recall so với quét toàn bộ. Nếu recall
   thấp hơn mong đợi, tăng `ef_search` trước khi đổi công cụ.
```

## So sánh

| Quy mô | Cách làm | Chính xác | Hạ tầng thêm |
|---|---|---|---|
| < 10.000 | quét toàn bộ trong bộ nhớ | 100% | không |
| 10.000 – vài triệu | pgvector + HNSW | ~95–99% | không |
| hàng chục triệu+ | vector DB chuyên dụng | ~95–99% | **có** |

## Dễ nhầm

**1. Thêm vector database khi 5.000 đoạn.** Quét toàn bộ là đủ.

**2. Không biết tìm vector là gần đúng.** Bỏ sót mà không nghi ngờ.

**3. Không đo recall thật của chỉ mục.**

**4. Đổi công cụ trước khi thử tăng `ef_search`.**

**5. Lọc quyền SAU khi tìm.**

**6. Không tính RAM cho chỉ mục.**

**7. Dùng IVF cho dữ liệu thay đổi liên tục.** Phải xây lại cụm.

**8. Thêm một hệ thống nữa khi Postgres đang có là đủ.**

**9. Không có kế hoạch xây lại chỉ mục.**

**10. Bỏ qua lợi thế kết hợp SQL của pgvector.**

## Mẹo nhớ

> **Vector search là tìm GẦN ĐÚNG. Bạn đang đánh đổi recall lấy tốc độ.**
>
> **`ef_search` là núm vặn chỉnh được LÚC CHẠY — thử nó trước khi đổi công cụ.**
>
> **Dưới 10.000 đoạn: quét toàn bộ. Vài triệu: pgvector. Đừng nhảy cóc.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao cần chỉ mục, và khi nào chưa cần?
2. HNSW khác IVF ở những điểm nào?
3. Ba tham số HNSW, cái nào chỉnh được lúc chạy?
4. Lọc trước và lọc sau — chọn cái nào cho phân quyền, vì sao?
5. Cách kiểm xem chỉ mục có đang bỏ sót không?

## Tự viết lại

Không nhìn lại, chọn giải pháp cho từng trường hợp:

```text
① 3.000 đoạn tài liệu nội bộ
② 500.000 đoạn, đã có Postgres, cần lọc theo phòng ban
③ 50 triệu đoạn, tìm kiếm là sản phẩm chính
④ 200.000 đoạn, dữ liệu cập nhật liên tục cả ngày
```

Tự kiểm: ở ④, vì sao IVF không phù hợp — và điều đó ảnh hưởng gì tới lựa chọn của bạn?

## Thử sức

Hệ thống RAG với 800.000 đoạn trên pgvector. Truy vấn vector mất p95 = 900ms, người dùng phàn nàn chậm.

Ba câu để trả lời: bạn điều tra gì trước; ba hướng cải thiện theo thứ tự nên thử; và với mỗi hướng, bạn đánh đổi cái gì. Câu khó nhất: nếu tăng tốc độ bằng cách giảm `ef_search` làm recall tụt từ 97% xuống 88%, bạn quyết định thế nào — và bạn cần biết gì về nghiệp vụ để quyết định?
