---
title: Chọn kiểu dữ liệu
slug: chon-kieu-du-lieu
summary: Tiền, thời gian, chuỗi, JSON — chọn sai kiểu là lỗi khó sửa nhất vì dữ liệu đã nằm sẵn trong đó.
level: trung-cap
tags: [database, kieu-du-lieu, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng kiểu cho tiền và thời gian — hai chỗ sai nhiều nhất và đắt nhất — và biết khi nào JSON là lựa chọn đúng.

## Ý tưởng chính

Chọn sai kiểu dữ liệu là loại lỗi **khó sửa nhất**, vì sửa nó nghĩa là chuyển đổi hàng triệu dòng dữ liệu đã có, trên một hệ thống đang chạy.

Và hai chỗ sai nhiều nhất luôn là **tiền** và **thời gian**.

## Mental model

Hãy nghĩ tới **đơn vị đo trên bản vẽ xây dựng**.

> Kiến trúc sư ghi *"3.5"* mà không ghi đơn vị. Người thợ đoán là mét, người khác đoán là feet.
>
> Kiểu dữ liệu **là đơn vị đo**. `NUMERIC` hay `FLOAT`, `TIMESTAMP` hay `TIMESTAMPTZ` — chúng nói cho mọi người sau bạn biết con số đó **nghĩa là gì** và **chính xác tới đâu**.

Và giống bản vẽ: sai đơn vị thì không phát hiện được cho tới khi công trình đã xây xong.

## Ví dụ nhỏ

```sql
gia FLOAT      -- ❌ 0.1 + 0.2 = 0.30000000000000004
gia NUMERIC(12,2)  -- ✅ thập phân chính xác
gia BIGINT     -- ✅ lưu bằng ĐỒNG (đơn vị nhỏ nhất), nhanh nhất
```

## Code chạy thế nào

**Vì sao `FLOAT` không dùng được cho tiền** — đây không phải chuyện lý thuyết:

```text
FLOAT lưu số theo hệ nhị phân. Nhiều số thập phân KHÔNG biểu diễn chính xác được:

0.1  →  0.1000000000000000055511151231257827…
0.2  →  0.2000000000000000111022302462515654…
cộng →  0.3000000000000000444089209850062616…

Một đơn hàng lệch 0,0000000004 đồng — không ai thấy.
Cộng dồn 2 triệu đơn trong báo cáo năm — lệch vài chục nghìn.
Kế toán đối chiếu không khớp, và không ai tìm ra nguyên nhân.
```

Hai lựa chọn đúng:

```text
NUMERIC(12,2)   → thập phân chính xác, đọc dễ, chậm hơn một chút
BIGINT (xu/đồng) → số nguyên, nhanh nhất, nhưng phải nhân/chia ở tầng ứng dụng
```

Chọn một, ghi vào tài liệu dự án, và **đừng bao giờ trộn hai cách** — đó mới là thảm hoạ thật.

## Cú pháp

**Thời gian — luôn có múi giờ:**

```sql
tao_luc TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- ✅ lưu kèm múi giờ
tao_luc TIMESTAMP                             -- ❌ "10:30" — ở đâu?
```

```text
TIMESTAMPTZ  thời điểm tuyệt đối trên trục thời gian
             Postgres lưu bằng UTC và tự chuyển đổi khi đọc
             ⇒ máy chủ ở Singapore, người dùng ở Hà Nội, vẫn đúng

TIMESTAMP    một chuỗi ký tự thời gian không có ngữ cảnh
             ⇒ đổi múi giờ máy chủ là toàn bộ dữ liệu cũ sai nghĩa

DATE         chỉ ngày, không giờ — ngày sinh, ngày hết hạn
TIME         chỉ giờ — giờ mở cửa
INTERVAL     khoảng thời gian — thời lượng video
```

Ngoại lệ hợp lệ của `TIMESTAMPTZ`: **ngày sinh** dùng `DATE`, vì "sinh ngày 3/5" không phụ thuộc múi giờ. Còn "đơn tạo lúc nào" thì luôn là một **thời điểm**, và phải có múi giờ.

**Chuỗi:**

```sql
TEXT              -- ✅ mặc định ở Postgres: không giới hạn, không chậm hơn
VARCHAR(n)        -- khi cần ràng buộc độ dài thật (mã bưu điện, mã số thuế)
CHAR(n)           -- ❌ đệm thêm khoảng trắng — gần như không bao giờ nên dùng
```

Ở Postgres, `TEXT` và `VARCHAR` có **hiệu năng như nhau**. `VARCHAR(255)` là di sản từ MySQL cũ, không có ý nghĩa gì ở đây — dùng `TEXT` và thêm `CHECK (char_length(x) <= 255)` nếu thật sự cần giới hạn.

**Số:**

```sql
INT        -- ±2,1 tỉ  — đủ cho hầu hết bộ đếm
BIGINT     -- ±9,2 tỉ tỉ — dùng cho khoá chính và tiền
SMALLINT   -- ±32.767 — tuổi, số sao
NUMERIC(p,s) -- tiền, tỉ lệ, thứ cần chính xác tuyệt đối
```

`INT` cho khoá chính là bẫy chờ sẵn: 2,1 tỉ nghe nhiều, nhưng bảng log hoặc bảng sự kiện chạm mốc đó nhanh hơn bạn tưởng — và lúc đó việc chuyển sang `BIGINT` là migration viết lại cả bảng.

## Tại sao cần nó

Vì **enum có ba cách làm**, và chọn sai thì thêm một giá trị mới thành việc lớn:

| Cách | Thêm giá trị mới | Ràng buộc | Có metadata |
|---|---|---|---|
| `TEXT + CHECK` | `ALTER` ràng buộc | ✅ | ❌ |
| Kiểu `ENUM` của CSDL | `ALTER TYPE` (khoá nhẹ) | ✅ | ❌ |
| **Bảng tham chiếu** | `INSERT` một dòng | ✅ khoá ngoại | ✅ |

```sql
-- Bảng tham chiếu: linh hoạt nhất
CREATE TABLE trang_thai_don (ma TEXT PRIMARY KEY, ten TEXT, thu_tu INT);
ALTER TABLE don_hang ADD FOREIGN KEY (trang_thai) REFERENCES trang_thai_don(ma);
```

Khuyến nghị: **`TEXT + CHECK`** cho tập giá trị ổn định và ít (2–5 giá trị); **bảng tham chiếu** khi cần thêm nhãn hiển thị, thứ tự, màu sắc, hoặc khi người dùng cuối được thêm giá trị.

**JSON — công cụ tốt, dễ bị lạm dụng:**

```sql
thuoc_tinh JSONB     -- ✅ ở Postgres luôn dùng JSONB, không dùng JSON
CREATE INDEX ON san_pham USING GIN (thuoc_tinh);
SELECT * FROM san_pham WHERE thuoc_tinh @> '{"mau": "đỏ"}';
```

```text
✅ Dùng JSONB khi
   · Thuộc tính khác nhau theo từng loại bản ghi (sản phẩm nhiều ngành hàng)
   · Payload từ webhook — lưu nguyên để đối chiếu
   · Cấu hình linh hoạt, người dùng tự định nghĩa

❌ Đừng dùng khi
   · Trường bạn LUÔN cần và luôn có ⇒ tạo cột thật
   · Cần ràng buộc, khoá ngoại, kiểu dữ liệu
   · Cần JOIN theo giá trị bên trong
```

Ranh giới thực dụng: **trường nào bạn lọc hoặc sắp xếp theo, trường đó nên là cột thật.**

## So sánh

| Dữ liệu | Kiểu đúng | Sai lầm hay gặp |
|---|---|---|
| Tiền | `NUMERIC` hoặc `BIGINT` | `FLOAT` |
| Thời điểm | `TIMESTAMPTZ` | `TIMESTAMP` |
| Ngày sinh | `DATE` | `TIMESTAMPTZ` |
| Chuỗi | `TEXT` | `VARCHAR(255)` theo thói quen |
| Khoá chính | `BIGINT` / `UUID` | `INT` |
| Trạng thái | `TEXT + CHECK` | `INT` với ý nghĩa ngầm |
| Cờ | `BOOLEAN` | `INT 0/1`, `CHAR('Y'/'N')` |

Dòng "trạng thái" đáng chú ý: `trang_thai = 3` buộc mọi người phải tra bảng ánh xạ ở đâu đó, và người đọc SQL trực tiếp không hiểu gì.

## Dễ nhầm

**1. `FLOAT` cho tiền.** Lỗi tốn kém nhất trong bài.

**2. `TIMESTAMP` không có múi giờ.** Báo cáo lệch 7 tiếng, và bạn mất nhiều ngày tìm nguyên nhân.

**3. Lưu tiền và không ghi đơn vị ở đâu cả.** Cột `gia = 150000` là 150 nghìn đồng hay 1.500 đồng (lưu bằng xu)? Ghi vào tên cột (`gia_dong`) hoặc vào tài liệu.

**4. `VARCHAR(255)` mọi nơi.** Vô nghĩa ở Postgres, và giới hạn tuỳ tiện sẽ cắt mất dữ liệu thật (tên người Đức, địa chỉ dài).

**5. `INT` cho khoá chính bảng lớn.** Xem ở trên.

**6. Nhồi mọi thứ vào JSONB.** Bạn mất ràng buộc, mất khoá ngoại, và mọi truy vấn thành chuỗi ký tự khó đọc.

**7. Lưu số điện thoại dạng số.** Mất số 0 ở đầu, và không lưu được dấu `+`. Số điện thoại là **chuỗi**, dù nó gồm toàn chữ số. Quy tắc chung: *"có làm phép tính với nó không?"* — không thì đó là chuỗi.

## Mẹo nhớ

> **Kiểu dữ liệu là ĐƠN VỊ ĐO — sai đơn vị thì phát hiện quá muộn.**
>
> **Tiền không bao giờ `FLOAT`. Thời điểm luôn có múi giờ.**
>
> **Trường nào bạn lọc theo, trường đó là cột thật — không nằm trong JSON.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao `FLOAT` sai cho tiền — mô tả cơ chế, không chỉ nói "không chính xác"?
2. `TIMESTAMP` và `TIMESTAMPTZ` khác nhau ra sao, và khi nào `DATE` là đúng?
3. Ở Postgres, `TEXT` và `VARCHAR(255)` khác nhau thế nào về hiệu năng?
4. Ba cách làm enum và tiêu chí chọn?
5. Quy tắc một câu để biết một dãy chữ số là số hay chuỗi?

## Tự viết lại

Không nhìn lại phần trên, chọn kiểu cho từng cột và **nêu lý do**:

```text
mã đơn hàng "DH-2026-0042"     ·  số lượng sản phẩm
giá bán                         ·  phần trăm giảm giá
thời điểm đặt hàng              ·  ngày giao dự kiến
số điện thoại                   ·  đã thanh toán chưa
trạng thái đơn (4 giá trị)      ·  thuộc tính riêng theo ngành hàng
```

Tự kiểm: "ngày giao dự kiến" — `DATE` hay `TIMESTAMPTZ`? Nêu lý do dựa trên **câu hỏi nghiệp vụ**, không dựa trên thói quen.

## Thử sức

Hệ thống của bạn dùng `FLOAT` cho cột `gia` từ hai năm nay, có 8 triệu dòng. Kế toán vừa phát hiện báo cáo năm lệch **1,2 triệu đồng** so với sổ sách.

Lập kế hoạch sửa. Ba câu để trả lời: bạn chuyển sang kiểu gì, chuyển đổi 8 triệu dòng thế nào mà không downtime, và — câu khó nhất — **dữ liệu đã lệch có khôi phục được không**, hay chỉ chặn được lỗi từ nay?
