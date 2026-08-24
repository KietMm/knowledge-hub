---
title: Chọn kiểu dữ liệu
slug: chon-kieu-du-lieu
summary: Tiền, thời gian, chuỗi, JSON — chọn sai kiểu là lỗi khó sửa nhất vì dữ liệu đã nằm sẵn trong đó.
level: trung-cap
tags: [database, kieu-du-lieu, thiet-ke]
---

> **Sau bài này bạn sẽ:** không bao giờ lưu tiền bằng `FLOAT`, và biết vì sao `TIMESTAMPTZ` là lựa chọn mặc định.

## Tiền: không bao giờ dùng số thực

```sql
gia FLOAT           -- SAI
gia DOUBLE PRECISION -- SAI
gia NUMERIC(12, 2)  -- ĐÚNG: 12 chữ số, 2 chữ số thập phân
gia BIGINT          -- ĐÚNG: lưu theo đơn vị nhỏ nhất (đồng, xu)
```

Số thực nhị phân không biểu diễn chính xác được `0.1`. Cộng 1000 giao dịch sẽ lệch, và kiểm toán sẽ phát hiện.

`NUMERIC` tính toán chính xác nhưng chậm hơn số nguyên. Với hệ thống nhiều giao dịch, lưu `BIGINT` theo đơn vị nhỏ nhất (VND vốn không có phần lẻ nên rất hợp) và chỉ định dạng ở tầng hiển thị.

## Thời gian

```sql
ngay_tao   TIMESTAMPTZ    -- ĐÚNG: lưu UTC, có thông tin múi giờ
thoi_diem  TIMESTAMP      -- Nguy hiểm: không biết là giờ ở đâu
ngay_sinh  DATE           -- Chỉ ngày, không giờ — đúng cho ngày sinh
thoi_luong INTERVAL       -- Khoảng thời gian
gio_mo_cua TIME           -- Chỉ giờ trong ngày
```

Quy tắc: **lưu UTC, hiển thị theo giờ địa phương**. `TIMESTAMPTZ` của Postgres lưu UTC và tự chuyển đổi khi đọc.

Đừng lưu thời gian dạng chuỗi hay số nguyên epoch — mất khả năng dùng toán tử ngày tháng, so sánh và index theo khoảng.

Với sự kiện tương lai ở múi giờ cụ thể (lịch hẹn), lưu **cả** thời điểm UTC và tên múi giờ (`Asia/Ho_Chi_Minh`): quy tắc giờ mùa hè có thể thay đổi, và khi đó chỉ có tên múi giờ mới tính lại đúng được.

## Chuỗi

```sql
ten     TEXT              -- Postgres: dùng mặc định, không giới hạn
ma      VARCHAR(20)       -- Khi có giới hạn nghiệp vụ thật
ma_quoc_gia CHAR(2)       -- Độ dài cố định thật sự
```

Ở PostgreSQL, `TEXT` và `VARCHAR` có hiệu năng **giống hệt nhau** — `VARCHAR(n)` chỉ thêm một ràng buộc độ dài. Dùng `TEXT` + `CHECK` khi cần, đổi giới hạn sau này dễ hơn.

`VARCHAR(255)` là con số vô nghĩa được sao chép từ MySQL đời cũ. Nếu đặt giới hạn, hãy đặt theo nghiệp vụ thật.

## Số

```sql
SMALLINT   -- 2 byte, -32.768 .. 32.767
INTEGER    -- 4 byte, ±2,1 tỷ
BIGINT     -- 8 byte — dùng cho khoá chính
NUMERIC    -- chính xác tuỳ ý, chậm hơn
```

Khoá chính nên là `BIGINT` ngay từ đầu. Bảng vượt 2,1 tỷ dòng nghe xa vời, nhưng đổi `INTEGER` sang `BIGINT` trên bảng lớn đang chạy là một trong những migration khó chịu nhất.

## Boolean và enum

```sql
da_kich_hoat BOOLEAN NOT NULL DEFAULT false,

-- Ba cách biểu diễn tập giá trị cố định:
trang_thai TEXT CHECK (trang_thai IN ('cho','chay','xong'))   -- linh hoạt nhất
trang_thai trang_thai_enum                                     -- ENUM của Postgres
trang_thai_id SMALLINT REFERENCES trang_thai(id)               -- bảng tham chiếu
```

`ENUM` của Postgres cho phép thêm giá trị (`ALTER TYPE ... ADD VALUE`) nhưng **không** xoá hay đổi tên dễ dàng. `TEXT + CHECK` linh hoạt hơn và gần như không kém về hiệu năng.

Bẫy boolean: một cột `BOOLEAN` nullable có **ba** trạng thái (`true`, `false`, `NULL`). Hầu như luôn nên `NOT NULL DEFAULT`.

## JSON và JSONB

```sql
cau_hinh JSONB       -- Postgres: dùng cái này
du_lieu  JSON        -- lưu nguyên văn bản, chậm khi truy vấn
```

`JSONB` được phân tích và lưu ở dạng nhị phân — truy vấn nhanh hơn và đánh index được:

```sql
CREATE INDEX idx_thuoc_tinh ON san_pham USING GIN (thuoc_tinh);

SELECT * FROM san_pham WHERE thuoc_tinh @> '{"mau": "đỏ"}';
SELECT thuoc_tinh->>'mau' AS mau FROM san_pham;
```

Dùng JSONB khi: thuộc tính thay đổi theo loại sản phẩm, lưu payload webhook, cấu hình tuỳ biến.

Không dùng khi: dữ liệu cần khoá ngoại, cần ràng buộc, hoặc là điều kiện lọc chính. Những thứ đó phải là cột thật.

## Mảng và kiểu chuyên biệt của Postgres

```sql
tags       TEXT[]           -- mảng
khoang     TSTZRANGE        -- khoảng thời gian, có toán tử chồng lấn
dia_chi_ip INET
mac        MACADDR
id         UUID
tien_te    MONEY            -- tránh: phụ thuộc locale của máy chủ
```

`TEXT[]` tiện cho tag đơn giản, nhưng bảng nối vẫn tốt hơn khi cần: đổi tên tag hàng loạt, đếm tần suất, hoặc gắn thêm thuộc tính cho tag.

`TSTZRANGE` kết hợp `EXCLUDE` constraint giải quyết bài toán đặt phòng trùng lịch rất gọn:

```sql
CONSTRAINT khong_trung_lich EXCLUDE USING GIST (phong_id WITH =, khoang WITH &&)
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `FLOAT` cho tiền | Sai số tích luỹ | `NUMERIC` hoặc `BIGINT` |
| `TIMESTAMP` không múi giờ | Sai giờ khi đổi máy chủ/vùng | `TIMESTAMPTZ` |
| `INTEGER` cho khoá chính | Migration đau đớn khi tràn | `BIGINT` từ đầu |
| `VARCHAR(255)` theo thói quen | Giới hạn vô nghĩa | `TEXT` |
| Nhồi dữ liệu quan hệ vào JSONB | Mất ràng buộc và JOIN | Cột thật |

## Ghi nhớ

- Tiền: `NUMERIC` hoặc số nguyên đơn vị nhỏ nhất.
- Thời gian: `TIMESTAMPTZ`, lưu UTC.
- Postgres: `TEXT` mặc định, `BIGINT` cho khoá chính.
- JSONB cho dữ liệu thưa; cột thật cho dữ liệu quan hệ.

## Tự kiểm tra

1. Vì sao `FLOAT` sai cho tiền? Nêu một ví dụ số cụ thể.
2. Lịch hẹn lúc 9h sáng ngày 1/6 năm sau ở Hà Nội — lưu thế nào cho đúng?
3. Khi nào `TEXT[]` đủ và khi nào cần bảng tag riêng?
