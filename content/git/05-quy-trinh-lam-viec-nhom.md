---
title: Quy trình làm việc nhóm
slug: quy-trinh-lam-viec-nhom
summary: Trunk-based hay Git Flow, đặt tên nhánh, pull request và bảo vệ nhánh chính.
level: trung-cap
tags: [git, workflow, pull-request, code-review]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn được quy trình phù hợp với đội mình bằng một câu hỏi, và viết pull request mà người review đọc là hiểu.

## Ý tưởng chính

Quy trình Git không phải chuyện sở thích. Nó trả lời một câu hỏi cụ thể: **bạn phát hành phần mềm bao lâu một lần?**

Đội deploy mỗi ngày và đội phát hành mỗi quý cần hai quy trình khác nhau — và áp quy trình của bên kia vào là tự tạo việc.

## Mental model

Hãy nghĩ tới hai kiểu nhà bếp.

> **Trunk-based là bếp nhà hàng**: món xong tới đâu bưng ra tới đó. Mọi người làm quanh **một cái bàn chính**, mỗi việc chỉ vài giờ tới một ngày.
>
> **Git Flow là bếp làm tiệc cưới**: nấu cả tuần, gom vào **khu chuẩn bị riêng**, tới ngày mới bày ra. Nhiều tầng trung gian vì thời điểm phục vụ cố định.

Cả hai đều đúng — **cho đúng loại bếp**. Nhà hàng mà dựng khu chuẩn bị riêng cho từng món thì món nguội trước khi ra tới bàn.

## Ví dụ nhỏ

```text
TRUNK-BASED                       GIT FLOW
main ────●────●────●──►           main ──────●──────────●──►  (chỉ bản phát hành)
      ╲ ╱  ╲ ╱                              ╱          ╱
   nhánh ngắn (1-2 ngày)          release ─●──────────●
                                          ╱
                                develop ─●──●──●──●──►
                                        ╱  ╱
                                    feature/*
```

## Code chạy thế nào

Câu hỏi để chọn:

```text
Deploy nhiều lần mỗi tuần, không có "phiên bản"     →  TRUNK-BASED
Phát hành theo đợt, phải hỗ trợ nhiều phiên bản cũ  →  GIT FLOW
```

Phần lớn sản phẩm web hiện nay thuộc nhóm một. Git Flow ra đời năm 2010 cho phần mềm đóng gói bán theo phiên bản — chính tác giả của nó sau này đã khuyến cáo đừng dùng cho web.

Trunk-based chỉ có một quy tắc thay cho cả sơ đồ: **`main` luôn ở trạng thái deploy được**. Từ đó suy ra mọi thứ còn lại — nhánh phải ngắn, test phải chạy trước khi gộp, và tính năng chưa xong thì giấu sau feature flag chứ không giữ trong nhánh dài.

## Cú pháp

Đặt tên nhánh — chọn một quy ước và giữ nó:

```text
feat/dang-nhap-google
fix/tinh-phi-sai-khi-don-lon
chore/nang-cap-next-15
docs/huong-dan-cai-dat
```

```text
❌ test, fix, new, cua-toi, tam
```

Tiền tố cho phép lọc nhanh, và tên có nghĩa cho phép người khác biết nhánh của bạn đang làm gì mà không phải hỏi.

Bảo vệ nhánh chính — cấu hình trên GitHub/GitLab, không phải thoả thuận miệng:

```text
☑ Yêu cầu pull request trước khi gộp
☑ Yêu cầu ít nhất 1 người duyệt
☑ Yêu cầu CI xanh
☑ Yêu cầu nhánh cập nhật với main trước khi gộp
☑ Cấm force push vào main
```

Dòng cuối quan trọng: nó biến quy tắc vàng của rebase ([[rebase-va-lich-su-sach]]) thành thứ **máy** bảo đảm, không phụ thuộc trí nhớ ai.

## Tại sao cần nó

Vì pull request là nơi **kiến thức được truyền đi**, không chỉ nơi bắt lỗi. Một PR tốt gồm ba phần:

```markdown
## Làm gì
Thêm đăng nhập bằng Google, dùng NextAuth.

## Vì sao
40% người dùng bỏ giữa chừng ở màn hình tạo mật khẩu (số liệu từ ticket #234).

## Cách kiểm tra
1. Chạy `pnpm dev`
2. Vào /dang-nhap, bấm "Tiếp tục với Google"
3. Kiểm tra bảng `users` có bản ghi mới với `provider = 'google'`
```

Phần **"vì sao"** là phần quý nhất và hay bị bỏ nhất: diff cho thấy *cái gì đã đổi*, không bao giờ cho thấy *vì sao đáng đổi*.

Bốn quy tắc cho PR dễ review:

```text
① Nhỏ — dưới 400 dòng thay đổi. PR 2000 dòng nhận được lời khen, không phải góp ý.
② Một việc — đừng trộn refactor với tính năng mới trong cùng PR.
③ Tự review trước khi gửi — bạn sẽ tự thấy 3 chỗ cần sửa.
④ Trả lời mọi comment, kể cả bằng "đồng ý, đã sửa".
```

Khi **review** người khác, phân biệt ba mức để người nhận biết cái nào bắt buộc:

```text
[chặn]     Lỗi thật, phải sửa trước khi gộp
[nên]      Cải thiện đáng làm, không chặn
[góp ý]    Ý kiến cá nhân, bỏ qua cũng được
```

Không phân mức thì mọi comment nghe như nhau, và người viết code hoặc sửa tất (mất thời gian) hoặc bỏ qua tất (bỏ sót lỗi thật).

## So sánh

| | Trunk-based | Git Flow |
|---|---|---|
| Nhánh dài hạn | Một (`main`) | `main` + `develop` |
| Tuổi nhánh tính năng | 1-2 ngày | Vài tuần |
| Deploy | Liên tục | Theo đợt |
| Conflict | Ít | Nhiều |
| Hợp với | Web, SaaS | Phần mềm đóng gói, có nhiều phiên bản được hỗ trợ |

Đường giữa hay dùng: **GitHub Flow** — chỉ `main` + nhánh tính năng ngắn + PR, không có `develop`. Đây là mặc định hợp lý cho phần lớn đội.

## Dễ nhầm

**1. Dùng Git Flow cho sản phẩm web deploy hằng ngày.** Bạn nhận về `develop` luôn lệch `main`, merge hai chiều, và conflict thường trực — để đổi lấy một cấu trúc phục vụ nhu cầu bạn không có.

**2. Nhánh sống hàng tuần.** Càng lâu càng nhiều conflict, và PR càng to càng khó review. Chia nhỏ việc — cùng kỹ năng ở [[chia-bai-toan-lon-thanh-nho]].

**3. PR khổng lồ.** Nghiên cứu về review code đều cho cùng kết luận: quá ~400 dòng, khả năng phát hiện lỗi rơi mạnh. Người review chuyển từ đọc sang lướt.

**4. Bảo vệ nhánh bằng thoả thuận miệng.** Sẽ có người push nhầm vào `main` lúc 11 giờ đêm. Bật bảo vệ nhánh.

**5. Review chỉ soi cú pháp.** Linter làm việc đó rồi. Người review nên hỏi: *thiết kế này có đúng không, có ca biên nào bỏ sót không, tên này có nói đúng ý không*.

**6. Không ai review vì "tin nhau".** Review không phải vì nghi ngờ — nó là cách kiến thức lan trong đội và là cách phát hiện thứ người viết không nhìn thấy.

## Mẹo nhớ

> **Bếp nhà hàng (trunk-based) hay bếp tiệc cưới (Git Flow) — hỏi tần suất phát hành.**
>
> **`main` luôn deploy được.**
>
> **PR nói VÌ SAO, không chỉ nói cái gì.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Câu hỏi nào quyết định chọn trunk-based hay Git Flow?
2. Quy tắc duy nhất của trunk-based, và mọi thứ khác suy ra từ đó thế nào?
3. Ba phần của một mô tả PR tốt, và phần nào hay bị bỏ nhất?
4. Vì sao PR trên 400 dòng làm giảm chất lượng review?
5. Vì sao ba mức comment ([chặn]/[nên]/[góp ý]) lại hữu ích?

## Tự viết lại

Không nhìn lại phần trên, viết mô tả PR cho thay đổi sau:

```text
Bạn đổi cách tính phí giao hàng: trước tính theo khoảng cách, giờ tính theo
vùng. Có 3 file thay đổi, 1 migration cơ sở dữ liệu, và một số đơn cũ sẽ hiện
phí khác trước.
```

Tự kiểm: mục "Cách kiểm tra" của bạn có nhắc tới **đơn cũ** không — thứ mà người review dễ bỏ sót nhất?

## Thử sức

Đội bạn 6 người, deploy 2 lần/tuần. Hiện dùng Git Flow, và mỗi lần merge `develop` vào `main` mất nửa ngày giải conflict.

Đề xuất chuyển đổi: **ba bước** đầu tiên, và với mỗi bước nói rõ **rủi ro** là gì. Câu khó nhất: tính năng đang làm dở nửa chừng thì xử lý thế nào khi nhánh dài không còn được phép?
