---
title: Ba lối viết — mệnh lệnh, hướng đối tượng, hàm
slug: ba-loi-viet-menh-lenh-oop-ham
summary: Cùng một bài toán viết theo ba lối. Không lối nào thắng tuyệt đối; biết chúng trả lời câu hỏi nào mới là cái dùng được.
level: trung-cap
tags: [nen-tang, tu-duy, paradigm, oop, functional]
---

> **Sau bài này bạn sẽ:** nhận ra lối viết đang dùng trong một codebase lạ, biết mỗi lối tổ chức code quanh cái gì, và chọn được lối hợp với bài toán thay vì hợp với thói quen.

## Ba lối, một câu hỏi khác nhau

Mọi cách tổ chức code đều đang trả lời cùng một câu: **"chỗ nào giữ dữ liệu, chỗ nào chứa hành vi, và hai thứ đó gắn với nhau ra sao?"** Ba lối trả lời khác nhau:

| Lối | Tổ chức quanh | Câu hỏi trung tâm |
|---|---|---|
| Mệnh lệnh / thủ tục | **Các bước** | "Làm gì, theo thứ tự nào?" |
| Hướng đối tượng | **Vật thể** giữ cả dữ liệu lẫn hành vi | "Có những thứ gì, mỗi thứ tự làm được gì?" |
| Hàm | **Phép biến đổi** dữ liệu | "Dữ liệu chảy qua những biến đổi nào?" |

Chúng **không loại trừ nhau**. Gần như mọi codebase thật đều trộn cả ba, và trộn có ý thức thì tốt hơn trộn vì không biết mình đang trộn.

## Cùng một bài toán, ba lối

Bài toán: có danh sách đơn hàng, tính tổng tiền các đơn đã thanh toán, có giảm giá cho khách VIP.

### Mệnh lệnh — mô tả các bước

```ts
function tongDaThanhToan(dons: Don[]): number {
  let tong = 0
  for (let i = 0; i < dons.length; i++) {
    const d = dons[i]
    if (d.trangThai !== 'da-thanh-toan') continue
    let tien = d.tong
    if (d.khachVip) tien = tien * 0.9
    tong += tien
  }
  return tong
}
```

```python
def tong_da_thanh_toan(dons: list[Don]) -> float:
    tong = 0.0
    for d in dons:
        if d.trang_thai != 'da-thanh-toan': continue
        tien = d.tong * 0.9 if d.khach_vip else d.tong
        tong += tien
    return tong
```

**Được:** ai cũng đọc được, không cần biết khái niệm gì. Chạy nhanh, sát cách máy thật sự làm việc.
**Mất:** logic "thế nào là đã thanh toán" và "giảm bao nhiêu" bị chôn trong vòng lặp, không tái dùng được chỗ khác.

### Hướng đối tượng — vật thể tự biết việc của nó

```ts
class Don {
  constructor(
    private tong: number,
    private trangThai: string,
    private khachVip: boolean,
  ) {}

  daThanhToan(): boolean {
    return this.trangThai === 'da-thanh-toan'
  }

  tienPhaiTra(): number {
    return this.khachVip ? this.tong * 0.9 : this.tong
  }
}

class SoDon {
  constructor(private dons: Don[]) {}
  tongDaThanhToan(): number {
    return this.dons.filter((d) => d.daThanhToan())
                    .reduce((s, d) => s + d.tienPhaiTra(), 0)
  }
}
```

```python
@dataclass
class Don:
    tong: float
    trang_thai: str
    khach_vip: bool

    def da_thanh_toan(self) -> bool:
        return self.trang_thai == 'da-thanh-toan'

    def tien_phai_tra(self) -> float:
        return self.tong * 0.9 if self.khach_vip else self.tong
```

**Được:** "giảm 10%" nằm ở đúng một chỗ. Muốn thêm loại khách mới thì sửa một nơi. Dữ liệu và quy tắc về nó đi cùng nhau.
**Mất:** nhiều khuôn khổ hơn cho một bài toán nhỏ. Và nếu class phình ra ôm quá nhiều việc thì lợi ích bốc hơi — chi tiết ở [[oop-that-su-la-gi]].

### Hàm — chuỗi phép biến đổi

```ts
const daThanhToan = (d: Don) => d.trangThai === 'da-thanh-toan'
const tienPhaiTra = (d: Don) => (d.khachVip ? d.tong * 0.9 : d.tong)

const tongDaThanhToan = (dons: Don[]) =>
  dons.filter(daThanhToan).map(tienPhaiTra).reduce((a, b) => a + b, 0)
```

```python
da_thanh_toan = lambda d: d.trang_thai == 'da-thanh-toan'
tien_phai_tra = lambda d: d.tong * 0.9 if d.khach_vip else d.tong

def tong_da_thanh_toan(dons):
    return sum(map(tien_phai_tra, filter(da_thanh_toan, dons)))
```

**Được:** mỗi mảnh là một hàm thuần, test riêng được, ghép lại được theo tổ hợp khác. Đọc `filter → map → reduce` là đọc thẳng ý định.
**Mất:** chuỗi dài quá thì khó gỡ lỗi (đặt breakpoint vào giữa chuỗi không dễ), và có thể tạo nhiều mảng trung gian.

## Ba trụ đọc được ở mọi ngôn ngữ

Dù dùng lối nào, ba ý này vẫn đúng và vẫn dùng được:

- **Đóng gói** — giấu chi tiết bên trong, chỉ lộ ra cái cần. OOP làm bằng `private`; lối hàm làm bằng module chỉ export vài hàm; [[ranh-gioi-service]] làm bằng ranh giới mạng. Cùng một ý ở ba quy mô.
- **Bất biến** — không sửa dữ liệu tại chỗ, tạo bản mới. Trung tâm của lối hàm, nhưng dùng trong OOP cũng tốt.
- **Kết hợp** (composition) — ghép mảnh nhỏ thành mảnh lớn, thay vì kế thừa để dùng lại.

## Chọn lối nào

Đừng chọn theo trường phái. Chọn theo **cái gì hay thay đổi** trong bài toán của bạn:

| Nếu... | Nghiêng về | Vì |
|---|---|---|
| Sẽ thêm nhiều **loại** mới (loại khách, loại thanh toán) | OOP | Thêm loại = thêm một class, không sửa chỗ cũ |
| Sẽ thêm nhiều **phép xử lý** mới trên cùng dữ liệu | Hàm | Thêm phép = thêm một hàm, không đụng kiểu dữ liệu |
| Là một script, chạy một lần rồi thôi | Mệnh lệnh | Khuôn khổ thêm không đáng |
| Là vòng lặp nóng, cần từng mili-giây | Mệnh lệnh | Ít lớp trung gian nhất |
| Là quy tắc nghiệp vụ cần test kỹ | Hàm (thuần) | Test không cần dựng gì, xem [[ham-dau-vao-dau-ra-va-tac-dung-phu]] |

Dòng đầu và dòng hai là một đánh đổi có thật và có tên trong lý thuyết ngôn ngữ. Cùng một bài toán, hai chiều mở rộng, mỗi lối dễ ở một chiều và khó ở chiều kia. Không có lối nào dễ cả hai.

## Thực tế: bạn sẽ trộn

Chính giáo trình này là một ví dụ trộn có chủ ý: quy tắc nghiệp vụ nằm ở các hàm **thuần** trong `src/lib/`, còn tầng dữ liệu là các **module** đóng gói (giấu chuyện đọc file phía sau một giao diện), và React thì buộc bạn nghĩ **khai báo** — xem [[tu-duy-khai-bao-va-jsx]].

Trộn không phải thiếu kỷ luật. Thiếu kỷ luật là **trộn trong cùng một hàm**: một hàm 200 dòng vừa sửa trạng thái của `this`, vừa nối chuỗi `map/filter`, vừa có ba vòng `for` lồng nhau.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Coi một lối là "đúng", còn lại là sai | Ép bài toán vào khuôn không hợp | Chọn theo chiều mở rộng của bài toán |
| Dựng class cho một script 20 dòng | Khuôn khổ nhiều hơn nội dung | Mệnh lệnh là đủ |
| Chuỗi `map/filter/reduce` dài 8 mắt xích | Không gỡ lỗi nổi khi kết quả sai | Cắt ra biến trung gian có tên |
| Class ôm cả dữ liệu, HTTP, và định dạng hiển thị | "OOP" trên danh nghĩa, thực chất là một cục | Xem [[ket-dinh-cao-lien-ket-long]] |
| Dùng kế thừa để dùng lại code | Cây kế thừa sâu, sửa lớp cha vỡ lớp con | Ưu tiên kết hợp, xem [[oop-that-su-la-gi]] |
| Trộn ba lối trong **một hàm** | Không ai đọc nổi | Trộn giữa các tầng thì được, trong một hàm thì không |

## Ghi nhớ

- Ba lối trả lời cùng một câu hỏi: dữ liệu ở đâu, hành vi ở đâu, gắn nhau ra sao.
- Mệnh lệnh tổ chức quanh **bước**, OOP quanh **vật thể**, hàm quanh **phép biến đổi**.
- Thêm nhiều **loại** → OOP dễ hơn. Thêm nhiều **phép xử lý** → lối hàm dễ hơn.
- Đóng gói, bất biến, kết hợp — ba ý dùng được ở cả ba lối, ở mọi ngôn ngữ.
- Trộn giữa các tầng là bình thường; trộn trong một hàm là bừa.

## Tự kiểm tra

1. Ba lối viết tổ chức code quanh cái gì?
2. Bài toán sắp thêm rất nhiều **loại thanh toán mới** thì nên nghiêng về lối nào, vì sao?
3. "Đóng gói" thể hiện ra thế nào ở OOP, ở module, và ở ranh giới service?
