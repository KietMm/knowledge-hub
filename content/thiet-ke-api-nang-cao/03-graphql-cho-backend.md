---
title: GraphQL nhìn từ phía backend
slug: graphql-cho-backend
summary: N+1, giới hạn độ phức tạp, cache — ba chi phí mà phía client không nhìn thấy.
level: trung-cap
tags: [api, graphql, hieu-nang, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** biết ba chi phí GraphQL đẩy sang backend, và cách xử lý từng cái.

## Ý tưởng chính

GraphQL chuyển quyền quyết định **"lấy dữ liệu gì"** từ backend sang client.

Client được lợi rõ ràng: một round-trip, đúng những trường cần. Nhưng quyền đó đi kèm ba hệ quả mà backend phải gánh: **truy vấn N+1**, **truy vấn tuỳ ý có thể rất nặng**, và **mất cache HTTP**.

Ba thứ này không tự biến mất. Chúng phải được xử lý bằng mã.

## Mental model

Hãy nghĩ tới **buffet tự chọn so với set menu**.

> **Set menu (REST)**: bếp biết trước sẽ nấu gì, chuẩn bị sẵn, tối ưu được. Khách nhận đúng phần đã định — có thể thừa món không thích.
>
> **Buffet (GraphQL)**: khách lấy đúng thứ mình muốn, không thừa. Nhưng bếp **không biết trước** ai lấy gì, phải sẵn sàng cho mọi tổ hợp.
>
> Và có một vị khách chất đầy mười đĩa. Ở nhà hàng, người ta nhìn thấy và can thiệp. Ở API, **không ai nhìn cả** — nên bếp phải tự đặt giới hạn.

Vị khách mười đĩa đó là truy vấn lồng sâu. Nó không phải tấn công có chủ đích — thường chỉ là một client viết truy vấn không cẩn thận.

## Ví dụ nhỏ

```graphql
query {
  donHang(id: "1") {
    ma
    khachHang { ten }
    sanPham { ten, gia }
  }
}
```

## Code chạy thế nào

**N+1 — vì sao nó gần như chắc chắn xảy ra:**

```graphql
query { donHangs(limit: 100) { ma, khachHang { ten } } }
```

```text
Resolver chạy theo TỪNG NODE trong cây kết quả:
  ① donHangs      → 1 truy vấn, trả 100 đơn
  ② khachHang     → chạy 100 LẦN, mỗi lần 1 truy vấn
⇒ 101 truy vấn.

Đây không phải lỗi ai viết ẩu. Đó là CÁCH GraphQL thực thi:
mỗi resolver chỉ biết node của nó, không biết 99 node kia
cũng đang cần cùng loại dữ liệu.
```

**DataLoader — gom trong một vòng lặp sự kiện:**

```ts
const khachHangLoader = new DataLoader(async (ids: readonly string[]) => {
  const ds = await db.khachHang.findMany({ where: { id: { in: [...ids] } } })
  const theoId = new Map(ds.map((k) => [k.id, k]))
  return ids.map((id) => theoId.get(id) ?? null)   // PHẢI đúng thứ tự đầu vào
})

// resolver
khachHang: (don) => khachHangLoader.load(don.khachHangId)
```

```text
Cơ chế: DataLoader gom mọi `.load()` xảy ra trong CÙNG một tick,
gọi hàm lô MỘT lần.
⇒ 101 truy vấn → 2.

Hai điều kiện dễ sai:
  ① Hàm lô phải trả về mảng ĐÚNG THỨ TỰ và ĐÚNG SỐ LƯỢNG đầu vào —
     thiếu một phần tử là dữ liệu gán nhầm cho node khác
  ② Tạo DataLoader MỚI cho MỖI request — dùng chung giữa các request
     nghĩa là cache rò rỉ dữ liệu giữa những người dùng khác nhau
```

Điều kiện ② là một lỗ hổng bảo mật thật, không chỉ là bug hiệu năng.

## Cú pháp

**Giới hạn truy vấn — bắt buộc với API công khai:**

```text
① ĐỘ SÂU
   { a { b { c { d { e ... } } } } }
   Với quan hệ hai chiều, một truy vấn lồng 15 tầng
   có thể quét gần như cả CSDL.
   ⇒ Chặn ở độ sâu 7–10.

② ĐỘ PHỨC TẠP — chính xác hơn độ sâu
   Gán điểm cho mỗi trường; trường có `limit` nhân theo limit.
   Tổng điểm vượt ngưỡng ⇒ từ chối TRƯỚC KHI thực thi.
   ⇒ Chặn được `donHangs(limit: 10000) { sanPham { ... } }`
     mà độ sâu chỉ là 2.

③ SỐ NODE TỐI ĐA và TIMEOUT truy vấn

④ TẮT INTROSPECTION ở production
   Nó phơi bày toàn bộ schema cho người lạ.
```

```text
Thiếu ① và ②, GraphQL công khai là một lỗ hổng từ chối dịch vụ
sẵn có: kẻ tấn công không cần công cụ gì, chỉ cần một truy vấn.
```

**Truy vấn có định danh — cách mạnh nhất, nếu client do bạn kiểm soát:**

```text
Chỉ chấp nhận các truy vấn ĐÃ ĐĂNG KÝ TRƯỚC, client gửi mã băm.

⇒ Không ai gửi được truy vấn tuỳ ý  ⇒ bài toán độ phức tạp biến mất
⇒ Payload nhỏ hơn
⇒ Biết trước tập truy vấn ⇒ tối ưu được, giám sát được
```

Đổi lại, client mất khả năng tự do đặt truy vấn — nên nó chỉ dùng được khi client là của chính bạn.

**Cache — GraphQL bỏ mất cache HTTP:**

```text
Mọi truy vấn là POST /graphql ⇒ CDN và trình duyệt không cache được.

Ba mức bù lại:
  ① Cache theo TRƯỜNG: đánh dấu trường nào cache được, bao lâu
  ② Cache theo THỰC THỂ ở tầng ứng dụng (Redis)
  ③ Cache ở CLIENT (Apollo, urql) — chỉ giúp client đó

⇒ Không cái nào rẻ như một dòng `Cache-Control` ([[cache-nhieu-tang]]).
```

**Giám sát:** mọi request đều là `POST /graphql` nên chỉ số theo endpoint trở nên vô nghĩa. Cần ghi **tên operation** vào log và đo theo từng operation — nếu không, bạn thấy "p95 của /graphql là 800ms" mà không biết truy vấn nào gây ra ([[quan-sat-he-thong]]).

## Tại sao cần nó

Vì quyết định dùng GraphQL thường được đưa ra vì lợi ích phía client, còn chi phí thì đổ hết sang backend:

```text
Client thấy:   một round-trip, đúng trường cần, kiểu rõ ràng
Backend gánh:  DataLoader cho mọi quan hệ
               giới hạn độ sâu và độ phức tạp
               tự xây lại cache
               giám sát theo operation
               phân quyền ở TỪNG TRƯỜNG
```

Dòng cuối đáng nhấn: với REST, bạn kiểm quyền ở endpoint. Với GraphQL, client tự ghép trường — nên **mỗi trường nhạy cảm phải tự kiểm quyền**, và một trường quên kiểm là một đường rò dữ liệu qua bất kỳ truy vấn nào chạm tới nó ([[phan-quyen-theo-ban-ghi]]).

**Khi nào GraphQL đáng:**

```text
Đáng:      nhiều loại client với nhu cầu dữ liệu khác nhau
           (web, iOS, Android, đối tác)
           dữ liệu quan hệ sâu, màn hình cần nhiều nguồn
           đội frontend và backend tách biệt, muốn giảm vòng thương lượng

Không đáng: một web app do chính đội viết
           dữ liệu phẳng, chủ yếu CRUD
           cần cache HTTP mạnh
           đội nhỏ, chưa có ai vận hành nổi phần chi phí trên
```

## So sánh

| | REST | GraphQL |
|---|---|---|
| Số round-trip cho màn hình phức tạp | nhiều | **1** |
| Cache HTTP | ✅ | ❌ |
| N+1 | tránh được dễ | cần DataLoader |
| Giới hạn tải từ client | tự nhiên | **phải tự đặt** |
| Phân quyền | theo endpoint | **theo từng trường** |
| Giám sát | theo endpoint | theo operation |

## Dễ nhầm

**1. Không dùng DataLoader.** N+1 gần như chắc chắn.

**2. DataLoader dùng chung giữa các request.** Rò rỉ dữ liệu giữa người dùng.

**3. Hàm lô trả sai thứ tự.** Dữ liệu gán nhầm node.

**4. Không giới hạn độ sâu và độ phức tạp.** Lỗ hổng từ chối dịch vụ.

**5. Bật introspection ở production.**

**6. Phân quyền ở resolver gốc, không ở từng trường.**

**7. Không đo theo operation.** Số liệu vô nghĩa.

**8. Tưởng GraphQL tự động nhanh hơn.** Nó giảm round-trip, không giảm việc CSDL.

**9. Trả lỗi kèm chi tiết nội bộ trong mảng `errors`.**

**10. Chọn GraphQL khi chỉ có một client.** Trả chi phí, không nhận lợi ích.

## Mẹo nhớ

> **N+1 là mặc định của GraphQL, không phải tai nạn — DataLoader là bắt buộc.**
>
> **DataLoader phải tạo MỚI mỗi request, và trả đúng thứ tự.**
>
> **Không giới hạn độ phức tạp = một lỗ hổng từ chối dịch vụ sẵn có.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao N+1 gần như chắc chắn xảy ra trong GraphQL?
2. DataLoader hoạt động thế nào, hai điều kiện dễ sai?
3. Giới hạn độ sâu khác giới hạn độ phức tạp ra sao?
4. Vì sao phân quyền GraphQL phải ở từng trường?
5. Ba chi phí GraphQL đẩy sang backend?

## Tự viết lại

Không nhìn lại, viết cho schema có `DonHang { khachHang, sanPham[] }`:

```text
① resolver ngây thơ, chỉ ra chỗ N+1
② phiên bản dùng DataLoader
③ nơi khởi tạo DataLoader
④ ba giới hạn cần bật
```

Tự kiểm: ở ③, nếu bạn khởi tạo ở module cấp cao nhất thay vì trong context của request, chuyện gì xảy ra khi hai người dùng gọi cùng lúc?

## Thử sức

GraphQL API vừa lên production. Sau một tuần: CSDL quá tải vào giờ cao điểm, log cho thấy hàng chục nghìn truy vấn giống nhau mỗi phút, và có một truy vấn duy nhất chạy 40 giây.

Ba câu để trả lời: hai vấn đề riêng biệt ở đây là gì; cách sửa từng cái; và bạn tìm ra **truy vấn nào** gây ra 40 giây bằng cách nào khi mọi request đều là `POST /graphql`. Câu khó nhất: nếu API này là công khai cho đối tác, biện pháp nào bạn **phải** bật trước khi mở lại?
