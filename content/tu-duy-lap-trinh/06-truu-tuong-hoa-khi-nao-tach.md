---
title: Trừu tượng hoá — khi nào tách, khi nào đừng
slug: truu-tuong-hoa-khi-nao-tach
summary: Trừu tượng sai đắt hơn code lặp. Quy tắc ba lần, chi phí của một lớp gián tiếp, và cách nhận ra trừu tượng đang rò rỉ.
level: nang-cao
tags: [nen-tang, tu-duy, truu-tuong, thiet-ke]
---

> **Sau bài này bạn sẽ:** biết vì sao gộp sớm hai đoạn code giống nhau thường là sai, nhận ra trừu tượng hỏng qua dấu hiệu cụ thể, và có tiêu chí để quyết định tách hay không.

## Trừu tượng là gì, nói cho chính xác

Trừu tượng hoá là **bỏ bớt chi tiết để lộ ra ý định**. Một hàm tên `guiEmail(nguoiNhan, noiDung)` giấu đi SMTP, thử lại, mã hoá — bạn dùng nó mà không cần biết những thứ đó.

Thước đo một trừu tượng tốt chỉ có một: **bạn có phải đọc ruột nó không?** Nếu để dùng đúng `guiEmail` mà bạn phải mở file ra xem nó xử lý lỗi thế nào, thì nó chưa che được gì — nó chỉ thêm một chỗ để nhảy tới.

## Mỗi trừu tượng đều có giá

Người mới học được dạy "đừng lặp code" nên tưởng gộp là luôn tốt. Gộp có giá, và giá đó thật:

| Bạn được | Bạn trả |
|---|---|
| Sửa một chỗ, có tác dụng mọi nơi | Sửa một chỗ, **vỡ mọi nơi** |
| Ít dòng code hơn | Thêm một tầng phải nhảy qua khi đọc |
| Ý định rõ hơn | Một cái tên nữa phải nghĩ và phải đúng |
| Test một lần cho nhiều nơi | Mọi chỗ gọi giờ **ràng buộc** vào nhau |

Dòng cuối là dòng đắt nhất và ít ai nhìn thấy lúc gộp. Hai đoạn code giống nhau nhưng **thuộc hai lý do thay đổi khác nhau** — gộp lại là buộc chúng cùng số phận. Rồi một bên cần đổi, và bạn thêm một tham số `if`. Rồi bên kia cần đổi, thêm cờ nữa.

```ts
// Sau ba lần "chỉ thêm một cờ thôi"
function xuatBaoCao(
  data: Row[], laPdf: boolean, gopTheoThang: boolean,
  anCotGia: boolean, dinhDangVn: boolean, guiEmail: boolean,
) { /* 200 dòng if lồng nhau */ }
```

Hàm này khó dùng hơn ba hàm riêng, khó test hơn (2⁵ tổ hợp cờ), và không ai dám xoá nhánh nào. Nó là **trừu tượng sai** đã hoá đá.

> Code lặp rẻ hơn trừu tượng sai. Lặp thì bạn xoá được; trừu tượng sai thì phải gỡ.

## Quy tắc ba lần

Kinh nghiệm dùng được:

1. **Lần một** — viết thẳng.
2. **Lần hai** — chép, sửa. Thấy hơi ngứa nhưng **chưa gộp**.
3. **Lần ba** — giờ mới đủ ba mẫu để thấy cái gì thật sự chung, cái gì chỉ tình cờ giống.

Vì sao phải chờ tới lần ba: với hai mẫu, bạn không phân biệt được **giống bản chất** với **giống ngẫu nhiên**. Mẫu thứ ba là chỗ khác biệt thật lộ ra.

```ts
// Lần 1 và 2 trông y hệt nhau
function kiemTraEmailKhach(e: string) { return /.+@.+/.test(e) }
function kiemTraEmailNhanVien(e: string) { return /.+@.+/.test(e) }

// Lần 3 làm lộ ra: chúng KHÔNG cùng một quy tắc
function kiemTraEmailNhaCungCap(e: string) {
  return /.+@.+/.test(e) && !e.endsWith('@gmail.com')  // nhà cung cấp phải dùng email công ty
}
```

Nếu gộp ở lần hai, tới lần ba bạn sẽ thêm cờ `chanGmail: boolean` — và bắt đầu con đường dẫn tới hàm sáu cờ ở trên.

## Giống ngẫu nhiên và giống bản chất

Câu hỏi phân biệt, hỏi được ở mọi ngôn ngữ:

> **Nếu yêu cầu nghiệp vụ đổi, hai chỗ này có phải đổi cùng nhau không?**

- **Có** → giống bản chất, gộp đi.
- **Không / không chắc** → giống ngẫu nhiên, để yên.

```ts
// Cùng công thức, KHÁC lý do đổi
const thueVat   = (tien: number) => tien * 0.1   // luật thuế đổi thì đổi
const hoaHong   = (tien: number) => tien * 0.1   // chính sách bán hàng đổi thì đổi
```

Gộp thành `nhan10PhanTram()` là sai, dù code y hệt. Ngày thuế lên 12% mà hoa hồng giữ nguyên, cái trừu tượng đó chống lại bạn.

Đây chính là ý *"tách theo lý do thay đổi"* — nền của chữ S trong [[solid-giai-thich-bang-code-that]].

## Trừu tượng rò rỉ

Trừu tượng **rò rỉ** khi chi tiết nó hứa giấu lại lộ ra và bắt bạn quan tâm.

```ts
// Giao diện hứa: "một kho dữ liệu đơn giản"
interface KhoNguoiDung {
  layTheoId(id: string): Promise<User>
}

// Nhưng dùng thật thì phải biết nó là SQL và có N+1
for (const id of ids) {
  await kho.layTheoId(id)     // 1000 id = 1000 truy vấn
}
```

Trừu tượng này che được **cú pháp** SQL nhưng không che được **mô hình chi phí**. Nó rò rỉ. Cách xử lý không phải là che kỹ hơn — mà là **để chi phí lộ ra trong giao diện**:

```ts
interface KhoNguoiDung {
  layTheoId(id: string): Promise<User>
  layNhieu(ids: string[]): Promise<User[]>   // nói thẳng: gọi hàng loạt rẻ hơn
}
```

Nguyên tắc: **trừu tượng được phép giấu cách làm, không được phép giấu cái giá.** Một trừu tượng che mất chuyện "cái này gọi qua mạng" hay "cái này quét toàn bảng" sẽ gây sự cố hiệu năng mà không ai lần ra — liên quan trực tiếp tới [[index-va-hieu-nang-truy-van]].

## Dấu hiệu trừu tượng đang hỏng

Nhận ra sớm thì gỡ còn rẻ:

- Thêm tính năng nào cũng phải **thêm một tham số** cho hàm chung
- Có tham số mà một nửa chỗ gọi truyền `null` / `undefined` / `false`
- Tên chứa từ vô nghĩa: `Manager`, `Helper`, `Util`, `Data`, `Info`, `Base`
- Phải đọc ruột nó mới dùng đúng
- Sửa nó thì phải chạy test của bốn tính năng không liên quan
- Nó có đúng **một** chỗ gọi, và đã như vậy sáu tháng

Gặp mấy dấu hiệu này thì **gỡ ra** là việc chính đáng, không phải thất bại — đó là nội dung của [[no-ky-thuat-va-refactor]]. Gỡ một trừu tượng sai thường là chép nội dung của nó ngược trở lại các chỗ gọi, rồi mới gộp lại theo đường cắt đúng.

## Tách tới đâu thì dừng

Trừu tượng quá vụn cũng là một lỗi, chỉ ít ai gọi tên nó:

```
xuLyDon() → chuanBiDon() → kiemTraDon() → kiemTraCoBan() → kiemTraTonTai()
```

Năm file để hiểu một luồng, mỗi hàm một dòng. Không mảnh nào tái dùng ở đâu khác. Đây là chi phí đọc thật, chỉ là nó không nằm trong bất kỳ chỉ số nào.

Tiêu chí dừng dùng được: **mỗi tầng trừu tượng phải nói một câu chuyện ở một mức độ**. Nếu một hàm trộn "gọi API thanh toán" với "kiểm tra chuỗi có rỗng không" trong cùng mấy dòng, đó là lỗi lệch tầng — và đó mới là lúc tách. Còn tách chỉ vì hàm dài 30 dòng thì không phải lý do.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Gộp ngay lần thứ hai thấy giống | Buộc hai thứ không liên quan cùng số phận | Chờ tới lần ba |
| Thêm cờ boolean để hàm chung dùng được chỗ mới | Hàm sáu cờ, 2⁶ tổ hợp không test nổi | Tách lại thành các hàm riêng |
| Gộp vì code giống, không hỏi lý do đổi | Luật thuế đổi kéo theo hoa hồng đổi | Hỏi: "chúng có phải đổi cùng nhau không?" |
| Đặt tên `Manager`, `Helper`, `Util` | Tên không nói gì → cái gì cũng nhét vừa | Tên theo việc cụ thể |
| Trừu tượng giấu mất chi phí (mạng, truy vấn) | N+1 query, chậm mà không ai lần ra | Để chi phí lộ trong giao diện (`layNhieu`) |
| Giữ trừu tượng sai vì "đã lỡ viết rồi" | Nó tiếp tục lan | Gỡ ra, chép ngược lại, cắt lại cho đúng |
| Tách tới mức mỗi hàm một dòng | Năm file cho một luồng | Tách theo lệch tầng, không theo số dòng |

## Ghi nhớ

- Thước đo trừu tượng tốt: **không phải đọc ruột nó vẫn dùng đúng**.
- Code lặp rẻ hơn trừu tượng sai — lặp thì xoá được, trừu tượng sai thì phải gỡ.
- Quy tắc ba lần: mẫu thứ ba mới cho thấy cái gì chung thật.
- Câu hỏi quyết định: *"yêu cầu đổi thì hai chỗ này có đổi cùng nhau không?"*
- Trừu tượng được giấu **cách làm**, không được giấu **cái giá**.
- Tách khi lệch tầng, không tách vì đếm số dòng.

## Tự kiểm tra

1. Vì sao "code lặp rẻ hơn trừu tượng sai"?
2. Hai hàm cùng công thức `tien * 0.1` — khi nào nên gộp, khi nào không?
3. Trừu tượng "rò rỉ" nghĩa là gì, và vì sao giấu chi phí lại nguy hiểm?
