---
title: Ra quyết định kỹ thuật
slug: ra-quyet-dinh-ky-thuat
summary: Phân biệt quyết định đảo được với không đảo được, viết ADR, và thoát khỏi cuộc họp không có kết luận.
level: co-ban
tags: [dan-dat, adr, quyet-dinh, danh-doi]
---

> **Sau bài này bạn sẽ:** biết quyết định nào cần bàn kỹ và quyết định nào nên chốt trong 10 phút, và ghi lại lý do theo cách còn dùng được sau hai năm.

## Phân loại trước khi bàn

Sai lầm phổ biến nhất là dành **cùng một lượng thời gian** cho mọi quyết định. Kết quả: bàn ba tuần về thư viện quản lý state, và chọn cấu trúc database trong một buổi chiều.

| | Đảo được | Không đảo được |
|---|---|---|
| **Ví dụ** | Thư viện UI, tên biến, định dạng log | Schema database, shard key, ranh giới service, ngôn ngữ chính |
| **Cách quyết** | Một người chọn, làm, sửa nếu sai | Viết ra, hỏi ý kiến, thử nghiệm nhỏ trước |
| **Thời gian** | Phút tới giờ | Ngày tới tuần |
| **Chi phí đảo** | Thấp | Rất cao hoặc không đảo được |

Câu hỏi duy nhất cần trả lời trước: *"sáu tháng nữa nhận ra sai thì đổi mất bao lâu?"*

- Vài ngày → **quyết nhanh, đừng họp**. Chi phí bàn luận đã lớn hơn chi phí sai.
- Vài tháng → viết ra, lấy ý kiến, cân nhắc.

Điều này cũng nói lên một việc nên làm: **biến quyết định không đảo được thành đảo được** khi có thể. Bọc thư viện bên thứ ba sau một interface của mình thì việc đổi nó sau này từ "viết lại nửa hệ thống" thành "viết lại một adapter".

## Phân tích đánh đổi thật, không phải bảng ưu nhược điểm

Bảng "ưu điểm / nhược điểm" là cái bẫy: nó liệt kê nhiều thứ nhưng không **cân** chúng, nên ai cũng đọc ra kết luận mình muốn.

Cấu trúc dùng được:

```markdown
## Ràng buộc (cái không thể thương lượng)
- Phải chạy được trên hạ tầng hiện tại (không thêm nhà cung cấp)
- Một người phải vận hành được
- Dưới 300 $/tháng ở tải hiện tại

## Phương án

### A. Postgres full-text search
Được: không thêm hệ thống; transaction cùng dữ liệu nghiệp vụ; ai cũng biết SQL
Mất: không có tìm kiếm mờ tốt; khó mở rộng quá ~10 triệu bản ghi
Rủi ro chính: nếu yêu cầu tìm kiếm phức tạp lên thì phải làm lại

### B. Elasticsearch
Được: tìm kiếm mạnh, gợi ý, xếp hạng
Mất: một hệ thống nữa phải vận hành; đồng bộ dữ liệu là nguồn bug; ~400 $/tháng
Rủi ro chính: không ai trong nhóm từng vận hành nó

## Quyết định
A. Ràng buộc "một người vận hành được" loại B ngay từ đầu, và
2 triệu bản ghi còn cách xa giới hạn của A.

## Điều kiện xem lại
Khi vượt 8 triệu bản ghi, HOẶC khi có yêu cầu xếp hạng theo hành vi người dùng.
```

Hai phần làm nên giá trị: **ràng buộc viết trước phương án** (nó loại bỏ lựa chọn một cách khách quan thay vì theo sở thích), và **điều kiện xem lại** (biến quyết định thành một thứ có ngày hết hạn, thay vì một điều luật vĩnh viễn mà hai năm sau không ai dám sửa).

## ADR: ghi lại vì sao, không ghi lại cái gì

Code nói **cái gì** đang được làm. Không có gì nói **vì sao** — và đó là thứ mất đi khi người ra quyết định rời nhóm.

```
docs/adr/
  0001-dung-json-file-lam-tang-luu-tru.md
  0002-render-markdown-o-server.md
  0003-noi-dung-viet-o-content-roi-bien-dich.md
```

```markdown
# ADR 0003: Nội dung viết ở content/ rồi biên dịch

- Trạng thái: chấp nhận
- Ngày: 2026-08-18

## Bối cảnh
Bài học là văn bản dài có nhiều khối code. Nhét vào chuỗi trong JSON thì diff
không đọc được và gần như không sửa nổi bằng tay.

## Quyết định
Viết markdown trong `content/`, một script biên dịch sang JSON.

## Hệ quả
- Tốt: diff đọc được; thứ tự bài thấy ngay từ tên file; kiểm tra được lúc build
- Xấu: thêm một bước build; sửa qua giao diện sẽ bị ghi đè khi chạy sync
- Chấp nhận: nội dung dài hạn sửa trong `content/`, giao diện dùng cho ghi chú nhanh

## Phương án đã loại
- Gõ thẳng vào data/*.json — loại vì không sửa được bằng tay
- Headless CMS — loại vì đây là app cá nhân chạy local, không cần dịch vụ ngoài
```

Phần **"phương án đã loại"** thường bị bỏ và là phần có giá trị lâu nhất: nó chặn việc sáu tháng sau có người đề xuất lại đúng thứ đã bị loại, và cả nhóm bàn lại từ đầu.

ADR **không sửa, chỉ thay thế**. Quyết định cũ sai thì viết ADR mới và đánh dấu cái cũ là `bị thay thế bởi ADR 0007`. Lịch sử suy nghĩ có giá trị riêng — nó cho người sau biết bạn đã cân nhắc gì.

## Chấm dứt cuộc họp không có kết luận

Ba tình huống và cách xử lý:

**Bàn vòng tròn vì thiếu dữ liệu.** Dừng lại, đặt câu hỏi: *"số liệu nào sẽ khiến chúng ta đồng ý?"* Rồi đi lấy số đó. Một spike hai ngày rẻ hơn ba tuần tranh luận.

**Bàn vòng tròn vì đó là quyết định đảo được.** Nói ra điều đó: *"cái này đổi mất một ngày. Tôi chọn A, nếu sai thì đổi."* Phần lớn tranh luận dài là về quyết định rẻ.

**Bàn vòng tròn vì bất đồng về ràng buộc, không phải về phương án.** Đây là trường hợp hay bị nhận sai. Hai người tranh về Postgres và Elasticsearch, nhưng thực chất họ đang bất đồng về "chúng ta có định làm tìm kiếm mờ hay không" — một câu hỏi sản phẩm. Lùi lại một bước và chốt ràng buộc trước.

## Không đồng ý nhưng cam kết

Không phải quyết định nào cũng có đồng thuận. Cách kết thúc lành mạnh:

> "Tôi vẫn nghĩ B tốt hơn vì lý do X. Nhưng chúng ta đã chốt A, và tôi sẽ làm A hết sức. Đây là dấu hiệu tôi sẽ theo dõi để biết tôi đúng: nếu độ trễ p99 vượt 500ms trong tháng tới thì đề nghị xem lại."

Ba phần: nêu rõ mình không đồng ý, cam kết thực hiện, và **nêu dấu hiệu cụ thể** để xem lại. Phần thứ ba biến bất đồng thành một giả thuyết kiểm chứng được, thay vào chỗ của "tôi đã nói rồi mà" sáu tháng sau.

Điều tệ nhất là đồng ý ngoài miệng rồi làm nửa vời — nó khiến phương án A thất bại vì thực thi kém, và không ai học được gì về việc A hay B đúng.

## Người quyết là ai

Nói rõ trước khi bàn, để không mất thời gian:

- **Quyết định của một người** — người đó nghe ý kiến rồi tự chốt (phần lớn trường hợp)
- **Đồng thuận** — chỉ dùng cho quyết định cả nhóm phải sống cùng lâu dài (quy ước code, quy trình review)
- **Người có chuyên môn quyết** — về vấn đề mà một người rõ hơn hẳn số còn lại

Cái tệ nhất là **giả đồng thuận**: nhìn như cả nhóm quyết nhưng thực ra người có tiếng nói lớn nhất quyết, còn người khác im lặng. Nó cho ra quyết định tệ và người ta không cam kết với nó.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Bàn quyết định đảo được như không đảo được | Tuần bàn cho việc sửa mất một ngày | Phân loại trước |
| Quyết định không đảo được làm vội | Trả giá nhiều năm | Viết ra, spike, lấy ý kiến |
| Bảng ưu/nhược điểm | Ai cũng đọc ra kết luận mình muốn | Viết ràng buộc trước |
| Không ghi lý do ở đâu | Hai năm sau không ai biết vì sao | ADR |
| Bỏ phần "phương án đã loại" | Bàn lại từ đầu sáu tháng sau | Ghi cả cái đã loại |
| ADR không có điều kiện xem lại | Thành điều luật vĩnh viễn | Ghi rõ khi nào xem lại |
| Sửa ADR cũ | Mất lịch sử suy nghĩ | Viết ADR mới thay thế |
| Không nói rõ ai quyết | Họp không kết luận | Nói trước khi bàn |
| Giả đồng thuận | Quyết định tệ, không ai cam kết | Nói rõ đây là quyết định của một người |
| Đồng ý ngoài miệng rồi làm nửa vời | Phương án thất bại vì thực thi, không ai học được gì | Không đồng ý nhưng cam kết |

## Ghi nhớ

- Câu hỏi đầu tiên: "sai thì đổi mất bao lâu?" — nó quyết định bao nhiêu công sức nên bỏ ra.
- Ràng buộc viết **trước** phương án; nó loại lựa chọn khách quan.
- ADR ghi **vì sao**, gồm cả phương án đã loại và điều kiện xem lại.
- Bất đồng kết thúc bằng cam kết + một dấu hiệu cụ thể để xem lại.

## Tự kiểm tra

1. Câu hỏi nào quyết định lượng thời gian nên bỏ vào một quyết định?
2. Vì sao "phương án đã loại" là phần có giá trị lâu nhất của ADR?
3. Nhóm bàn vòng tròn về Postgres vs Elasticsearch. Ba nguyên nhân có thể, và cách xử lý mỗi cái?
