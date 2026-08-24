---
title: Giao tiếp và ảnh hưởng
slug: giao-tiep-va-anh-huong
summary: Viết cho người không phải dev, báo tin xấu, và thuyết phục khi bạn không có quyền ra lệnh.
level: trung-cap
tags: [dan-dat, giao-tiep, viet, thuyet-phuc]
---

> **Sau bài này bạn sẽ:** viết một đề xuất kỹ thuật mà người ngoài nhóm đọc và đồng ý, và xử lý bất đồng mà không cần thắng.

## Kết luận đứng trước

Kỹ sư được huấn luyện để trình bày theo thứ tự **suy luận**: bối cảnh → phân tích → kết luận. Người đọc bận cần thứ tự **ngược lại**.

```
❌ "Tôi đã xem 4 phương án cho tầng cache. Redis thì... Memcached thì...
   Tuy nhiên cần xét thêm... Do đó tôi nghĩ có lẽ nên dùng Redis."

✅ "Đề nghị: dùng Redis cho cache phiên. Chi phí ~120 $/tháng, làm trong 3 ngày.
   Cần quyết định trước thứ Sáu để kịp phát hành 1/9.

   Vì sao: hiện session nằm trong RAM nên không chạy được nhiều instance,
   và đó là thứ chặn chúng ta xử lý tải Black Friday.

   Đã xét và loại: [chi tiết bên dưới]"
```

Ba dòng đầu của câu thứ hai trả lời đủ ba câu hỏi người đọc có: **làm gì, tốn gì, tôi cần làm gì**. Ai muốn chi tiết sẽ đọc xuống; ai không thì họ vẫn quyết định được.

## Dịch sang thứ người nghe quan tâm

Cùng một việc, ba cách nói cho ba đối tượng:

```
Với kỹ sư:
"Session đang ở RAM tiến trình nên không scale ngang được."

Với quản lý sản phẩm:
"Hiện tại chỉ chạy được một server. Vượt ~2.000 người dùng đồng thời là chậm,
 và không thêm máy được. Black Friday dự kiến 5.000."

Với ban điều hành:
"Rủi ro: sập vào ngày doanh thu cao nhất năm. Xử lý mất 3 ngày làm."
```

Cả ba đều đúng và cùng nói về một thứ. Nói câu đầu với ban điều hành thì họ không hiểu; nói câu thứ ba với kỹ sư thì thiếu thông tin để làm.

**Nhắm vào cái người nghe phải quyết định.** Quản lý sản phẩm quyết ưu tiên → nói bằng ảnh hưởng tới người dùng và hạn. Ban điều hành quyết đầu tư → nói bằng rủi ro và tiền.

## Báo tin xấu

Bốn nguyên tắc:

**Sớm.** Tin xấu không tự tốt lên khi để lâu, và mất tin cậy vì báo muộn tệ hơn chính tin xấu.

**Trực tiếp, không đệm.** "Tôi có thể nhầm nhưng có lẽ hơi trượt một chút" làm người nghe không rõ mức độ. Nói: "Chúng ta sẽ trượt hạn 3 ngày."

**Kèm hiện trạng bằng số.** "Xong 60%, kế hoạch 80%" thay vì "hơi chậm".

**Kèm lựa chọn.** Xem [[uoc-luong-va-pham-vi]].

Và cụ thể với sự cố: nói rõ **ai bị ảnh hưởng và bao nhiêu**, đừng làm nhẹ. "Một số người dùng có thể gặp vấn đề" khi thực tế là 30% checkout thất bại sẽ phá tin cậy khi con số thật lộ ra — xem [[su-co-va-hau-kiem]].

## Thuyết phục mà không có quyền

Tech lead thường không phải quản lý của những người mình cần thuyết phục. Bốn cách, xếp theo hiệu quả:

**1. Bắt đầu bằng vấn đề của họ, không phải giải pháp của mình.**

```
❌ "Chúng ta nên chuyển sang TypeScript."
✅ "Ba sự cố tháng trước đều là lỗi kiểu dữ liệu (undefined ở production).
   Có cách bắt chúng lúc build. Muốn thử ở một module không?"
```

**2. Bằng chứng nhỏ thay vì tranh luận lớn.** Một prototype hoạt động thắng mọi bài trình bày. Làm ở một module, đo, cho người ta xem số.

**3. Cho người ta tham gia sớm.** Người góp phần vào một quyết định sẽ ủng hộ nó. Hỏi ý kiến ở bản nháp — không phải để lấy dấu duyệt cho thứ đã chốt, mà thật sự nghe và sửa.

**4. Nói ra cái mình đánh đổi.** Đề xuất chỉ có ưu điểm thì không đáng tin. Nêu nhược điểm trước khi người khác nêu — nó cho thấy bạn đã suy nghĩ thật và làm mọi thứ còn lại đáng tin hơn.

## Bất đồng: về mục tiêu hay về cách làm

Phân biệt này giải quyết phần lớn tranh cãi:

**Về mục tiêu** — hai người muốn hai thứ khác nhau. Không giải quyết được bằng dữ liệu kỹ thuật; cần lùi lại chốt mục tiêu, và thường cần người có quyền quyết định.

**Về cách làm** — cùng mục tiêu, khác đường. Giải quyết được bằng: *"số liệu nào sẽ khiến chúng ta đồng ý?"*

Rất nhiều tranh luận kỹ thuật dài thực chất là bất đồng về mục tiêu bị ngụy trang thành bất đồng kỹ thuật. Hai người tranh về monolith và microservices, nhưng thực ra một người tối ưu cho tốc độ ra hàng và người kia tối ưu cho khả năng mở rộng của tổ chức — xem [[ranh-gioi-service]].

Kết thúc bằng **không đồng ý nhưng cam kết**, kèm dấu hiệu xem lại cụ thể. Xem [[ra-quyet-dinh-ky-thuat]].

## Viết ngắn là một kỹ năng

Tài liệu 8 trang không ai đọc thì bằng không. Một trang được đọc thì bằng một.

```markdown
# Chuyển session sang Redis

**Đề nghị:** dùng Redis cho cache phiên. 3 ngày làm, ~120 $/tháng.
**Cần:** duyệt trước 25/8 để kịp phát hành 1/9.

## Vấn đề
Session nằm trong RAM tiến trình → chỉ chạy được 1 instance → trần ~2.000
người dùng đồng thời. Dự báo Black Friday: 5.000.

## Phương án
| | Được | Mất |
|---|---|---|
| Redis (đề nghị) | Chuẩn, nhóm đã biết | +1 dịch vụ, 120 $/tháng |
| JWT không trạng thái | Không thêm dịch vụ | Không thu hồi được token ngay |
| Sticky session | Sửa ít nhất | Mất session khi deploy, tải lệch |

## Rủi ro
Redis chết → không ai đăng nhập được. Giảm bằng Redis có quản lý + replica.
```

Bảng ba dòng ở trên hiệu quả hơn ba trang văn xuôi so sánh, và nó buộc bạn phải thật sự chốt được cái "mất" của phương án mình đề nghị.

## Cuộc họp và bất đồng bộ

Với một tech lead, phần lớn cuộc họp có thể thay bằng văn bản. Họp chỉ đáng khi cần **bàn qua lại nhanh** hoặc chủ đề **có cảm xúc**.

Bất đồng bộ tốt hơn cho: cập nhật tình hình, đề xuất kỹ thuật, review, quyết định có thể ghi thành văn bản. Nó cho người ta thời gian suy nghĩ, và nó **để lại bản ghi** — thứ mà cuộc họp không có.

Nếu phải họp: có agenda, có người quyết, và ghi lại kết luận. Cuộc họp không ghi kết luận sẽ được họp lại.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Kết luận ở cuối | Người bận không đọc tới | Kết luận + việc cần làm ở đầu |
| Dùng thuật ngữ với người ngoài | Không hiểu → không duyệt | Dịch sang ảnh hưởng, rủi ro, tiền |
| Đệm tin xấu cho nhẹ | Người nghe không rõ mức độ | Nói trực tiếp, kèm số |
| Làm nhẹ ảnh hưởng sự cố | Mất tin cậy khi số thật lộ ra | Nói rõ ai bị ảnh hưởng, bao nhiêu |
| Đề xuất chỉ có ưu điểm | Bị coi là không suy nghĩ thật | Nêu nhược điểm trước |
| Xin ý kiến khi đã chốt | Người ta nhận ra và mất lòng tin | Hỏi ở bản nháp, thật sự sửa |
| Tranh luận thay vì thử | Bàn ba tuần cho việc thử hai ngày | Prototype nhỏ, đo, cho xem số |
| Lẫn bất đồng mục tiêu với cách làm | Tranh luận không có điểm dừng | Phân biệt trước |
| Tài liệu 8 trang | Không ai đọc = giá trị bằng 0 | Một trang có bảng |
| Họp không ghi kết luận | Sẽ họp lại | Ghi quyết định + người + hạn |

## Ghi nhớ

- Kết luận và việc cần làm đứng đầu; suy luận đặt bên dưới.
- Cùng một sự thật, ba cách nói cho ba đối tượng — nhắm vào cái họ phải quyết.
- Tin xấu: sớm, trực tiếp, có số, có lựa chọn.
- Nêu nhược điểm của chính đề xuất mình trước khi người khác nêu.

## Tự kiểm tra

1. Ba câu hỏi mà ba dòng đầu của một đề xuất phải trả lời?
2. Cùng vấn đề "session trong RAM": nói với ban điều hành thế nào?
3. Làm sao phân biệt bất đồng về mục tiêu với bất đồng về cách làm, và mỗi loại xử lý ra sao?
