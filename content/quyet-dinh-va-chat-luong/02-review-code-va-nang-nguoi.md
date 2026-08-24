---
title: Review code và nâng người
slug: review-code-va-nang-nguoi
summary: Review là hành động dạy, không phải cửa kiểm soát. Cách góp ý, cách nhận góp ý, và chuẩn nào nên do máy giữ.
level: co-ban
tags: [dan-dat, code-review, phan-hoi, chat-luong]
---

> **Sau bài này bạn sẽ:** review theo cách làm người khác giỏi lên thay vì chỉ chặn lỗi, và biết cái gì tuyệt đối không nên đem ra review.

## Máy giữ chuẩn, người giữ ý tưởng

Nguyên tắc quan trọng nhất: **mọi thứ máy kiểm được thì đừng bao giờ nói trong review.**

```
Máy giữ:  định dạng (Prettier), quy ước (ESLint), kiểu (tsc),
          test, coverage, kích thước bundle, lỗ hổng phụ thuộc

Người giữ: bài toán này có đúng là bài toán cần giải không?
           thiết kế này sáu tháng nữa còn sửa được không?
           chỗ nào sẽ hỏng mà test chưa phủ?
           người sau đọc có hiểu vì sao code làm thế này không?
```

Review nói về dấu phẩy là **lãng phí kép**: nó tốn thời gian của hai người, và nó đẩy phần thật sự quan trọng ra khỏi tầm chú ý. Nếu bạn thấy mình đang bình luận về khoảng trắng, việc cần làm là cấu hình Prettier, không phải viết bình luận.

## Phân tầng góp ý

Không phải mọi góp ý đều ngang nhau, và người nhận cần biết cái nào phải sửa:

```
BẮT BUỘC: Truy vấn này không có kiểm tra quyền — người dùng A đọc được đơn của B.
Ý KIẾN:   Mình sẽ tách hàm này thành hai, nhưng để nguyên cũng ổn.
CÂU HỎI:  Chỗ này có xử lý trường hợp mảng rỗng không? Mình đọc chưa ra.
KHEN:     Cái hàm gộp truy vấn này hay, mình sẽ dùng lại ở chỗ khác.
```

Không phân tầng thì người nhận phải đoán, và họ thường đoán theo hướng tệ nhất: coi mọi bình luận là bắt buộc, sửa hết, và học được rằng review là thứ cần chịu đựng.

**Phần KHEN không phải hình thức.** Nó dạy chính xác bằng lượng phần BẮT BUỘC dạy — nó nói cho người ta biết cái gì nên làm nhiều hơn. Review chỉ có phần xấu thì người ta chỉ học được cách tránh, không học được cách làm tốt.

## Nói về code, và nói cả vì sao

```
❌ "Sai rồi."
❌ "Bạn không nên dùng any ở đây."
❌ "Đoạn này viết tệ."

✅ "Chỗ này `any` làm mất kiểm tra kiểu ở toàn bộ nhánh dưới — nếu API đổi hình
   dạng thì tsc sẽ không báo. Dùng `unknown` rồi hẹp lại bằng zod thì lỗi sẽ
   hiện ra ở đúng ranh giới. Xem thêm ở [[thu-hep-kieu-va-unknown]]."
```

Ba điểm khác biệt: nói về **code** chứ không nói về **người** ("chỗ này" thay vì "bạn"), nêu **hệ quả cụ thể** (không phải "tệ" mà "tsc sẽ không báo khi API đổi"), và đưa **đường đi tiếp**.

Điểm thứ hai là quan trọng nhất. "Không nên dùng any" là một luật phải nhớ; "any làm mất kiểm tra kiểu ở nhánh dưới nên lỗi sẽ hiện ra ở chỗ khác" là một **mô hình** — người ta suy ra được từ đó cho những trường hợp bạn chưa nói tới.

## Review theo thứ tự đúng

Đọc theo bốn tầng, và **đừng đi tầng dưới trước khi xong tầng trên**:

1. **Bài toán** — có đúng vấn đề cần giải không? Có yêu cầu nào bị hiểu sai?
2. **Thiết kế** — ranh giới, luồng dữ liệu, chỗ đặt logic
3. **Tính đúng** — trường hợp biên, lỗi, đồng thời, bảo mật
4. **Chi tiết** — tên, cấu trúc, chỗ nào cần comment

Bình luận 30 chi tiết ở tầng 4 rồi mới phát hiện tầng 1 sai là cách chắc chắn nhất làm người khác mất động lực: họ vừa sửa 30 thứ xong thì được biết cả hướng làm đã sai.

Nếu tầng 1 hoặc 2 có vấn đề, **nói ngay và chỉ nói cái đó**, đừng review tiếp.

## Những chỗ đáng tìm nhất

Kinh nghiệm cho thấy bug thật hay nằm ở:

- **Chỗ không có test** — nhìn diff test trước, diff code sau. Chỗ nào code đổi mà test không đổi?
- **Xử lý lỗi** — catch rỗng, lỗi bị nuốt, `catch` rồi `return null`
- **Kiểm tra quyền** — endpoint mới có kiểm tra chủ sở hữu không? Xem [[phan-quyen-theo-ban-ghi]]
- **Đồng thời** — có mẫu đọc-rồi-ghi không? Xem [[truy-cap-dong-thoi-va-khoa]]
- **Trường hợp biên** — rỗng, một phần tử, `null`, số âm, chuỗi rất dài
- **Cái bị xoá** — dòng bị xoá thường ít được xem hơn dòng được thêm, nhưng xoá một kiểm tra là cách tạo lỗ hổng

## Kích thước PR quyết định chất lượng review

```
PR 50 dòng    → review kỹ, tìm ra vấn đề thật
PR 500 dòng   → review qua, "LGTM"
PR 2000 dòng  → không ai đọc thật
```

PR lớn không nhận được review tốt hơn — nó nhận được review **tệ hơn**. Là tech lead, việc của bạn là làm PR nhỏ thành chuyện dễ:

- Tách refactor ra khỏi thay đổi hành vi (**hai PR riêng**, luôn luôn)
- Merge phần hạ tầng trước, phần tính năng sau
- Dùng feature flag để merge code chưa hoàn chỉnh — xem [[trien-khai-an-toan]]

PR trộn "đổi tên 40 file" với "thêm logic tính thuế" thì phần logic sẽ không được ai đọc — nó chìm trong 400 dòng đổi tên.

## Nhận góp ý

Phía bên kia cũng là kỹ năng, và nó khó hơn:

- **Góp ý về code, không về bạn.** Nghe hiển nhiên, thực hành thì khó.
- **Không hiểu thì hỏi**, đừng sửa cho xong. Sửa mà không hiểu là bỏ mất phần học.
- **Không đồng ý thì nói ra**, có lý lẽ. Người review cũng có thể sai, và họ thường thiếu bối cảnh mà bạn có.
- **Có bình luận nghĩa là có người đọc code của bạn.** Đó là điều tốt.

Một dấu hiệu xấu cần để ý: người ta bắt đầu viết code "để dễ qua review" thay vì "để đúng". Lúc đó review đã thành cửa kiểm soát, không còn là hành động dạy.

## Chuyện tuyệt đối không nên đem ra review

- **Phê bình cá nhân.** Riêng tư, trực tiếp, không bao giờ trong PR.
- **Bất đồng lớn về kiến trúc.** PR quá muộn để bàn hướng đi. Bàn trước bằng ADR — xem [[ra-quyet-dinh-ky-thuat]]. Phát hiện ở PR thì gọi một cuộc nói chuyện, không viết 20 bình luận.
- **Sở thích cá nhân trình bày như luật.** Nếu bạn thật sự muốn nó thành luật, đưa vào ESLint và bàn với cả nhóm.

## Vài con số nên theo dõi

| Chỉ số | Vì sao |
|---|---|
| Thời gian tới review đầu tiên | Chờ một ngày làm mất đà; nên trong vài giờ |
| Kích thước PR | Trên 400 dòng thì chất lượng review giảm rõ |
| Số vòng review | Trên 3 vòng thường nghĩa là bàn sai tầng |
| Tỉ lệ người review | Nếu một người review 80% thì nhóm đang có một điểm nghẽn kiến thức |

Chỉ số cuối đáng để ý: nếu chỉ bạn review được mọi thứ, đó không phải dấu hiệu bạn giỏi mà là dấu hiệu **bạn chưa uỷ quyền** — xem [[uy-quyen-va-dan-dat-nhom]].

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Review định dạng, quy ước | Tốn thời gian, che phần quan trọng | Đưa vào Prettier/ESLint |
| Không phân tầng góp ý | Người nhận coi mọi thứ là bắt buộc | Gắn nhãn BẮT BUỘC / Ý KIẾN / CÂU HỎI |
| Chỉ nói cái xấu | Người ta chỉ học cách tránh | Nêu cả cái làm tốt |
| Nói "sai rồi" không nói vì sao | Học được luật, không học được mô hình | Nêu hệ quả cụ thể |
| Bình luận chi tiết trước khi xét thiết kế | Sửa 30 thứ rồi biết cả hướng sai | Review theo bốn tầng |
| PR 2000 dòng | Không ai đọc thật, bug lọt | Tách nhỏ, tách refactor riêng |
| Trộn refactor với đổi hành vi | Phần quan trọng chìm trong diff | Hai PR |
| Bàn kiến trúc trong PR | Quá muộn, tốn công cả hai bên | ADR trước |
| Sở thích cá nhân nói như luật | Người ta viết code để qua review | Vào lint, hoặc gắn nhãn Ý KIẾN |
| Một người review mọi thứ | Điểm nghẽn kiến thức | Luân phiên, uỷ quyền |

## Ghi nhớ

- Máy giữ chuẩn, người giữ ý tưởng — bình luận về khoảng trắng là dấu hiệu thiếu cấu hình.
- Phân tầng góp ý, và phần khen dạy được ngang phần bắt buộc.
- Nêu **hệ quả**, không nêu luật — hệ quả cho người ta một mô hình suy luận được.
- Review bốn tầng theo thứ tự; sai ở tầng 1 thì đừng bình luận tầng 4.

## Tự kiểm tra

1. Bạn muốn bình luận về thứ tự import. Việc đúng cần làm là gì?
2. Vì sao PR 2000 dòng nhận review tệ hơn PR 50 dòng, không phải tốt hơn?
3. Vì sao "nêu hệ quả" dạy được nhiều hơn "nêu luật"?
