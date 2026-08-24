---
title: Quy trình làm việc nhóm
slug: quy-trinh-lam-viec-nhom
summary: Trunk-based hay Git Flow, đặt tên nhánh, pull request và bảo vệ nhánh chính.
level: trung-cap
tags: [git, workflow, pull-request, code-review]
---

> **Sau bài này bạn sẽ:** chọn được quy trình phù hợp với quy mô nhóm, và viết pull request người khác muốn review.

## Hai quy trình phổ biến

### Trunk-based (khuyến nghị cho phần lớn nhóm)

Một nhánh chính duy nhất. Nhánh feature sống **ngắn** (1–3 ngày) rồi merge vào `main`. Tính năng chưa xong được giấu sau feature flag.

Ưu điểm: ít conflict, tích hợp liên tục thật sự, triển khai được bất cứ lúc nào.
Điều kiện: cần test tự động tốt và CI nhanh.

### Git Flow

Nhiều nhánh dài hạn: `main`, `develop`, `release/*`, `hotfix/*`, `feature/*`.

Phù hợp khi phần mềm có **phiên bản phát hành** (app desktop, thư viện, firmware) và phải hỗ trợ nhiều bản cùng lúc. Với web app triển khai liên tục, Git Flow thường là gánh nặng không cần thiết.

## Đặt tên nhánh

```
feat/loc-theo-tag
fix/mat-du-lieu-khi-doi-chu-de
chore/nang-next-15
docs/huong-dan-cai-dat
```

Tiền tố cho biết loại thay đổi; phần sau mô tả **việc**, không phải tên người hay số ngẫu nhiên. Nhiều nhóm thêm mã ticket: `feat/KH-123-loc-theo-tag`.

## Pull request tốt

```markdown
## Làm gì
Thêm bộ lọc theo tag ở trang công nghệ.

## Vì sao
Công nghệ có trên 20 bài, người dùng phải cuộn để tìm bài theo chủ đề hẹp.

## Cách kiểm tra
1. Mở /t/javascript-typescript
2. Bấm tag "closure" — chỉ còn bài có tag đó
3. Bấm "Tất cả" — quay lại danh sách đầy đủ

## Lưu ý khi review
Tag rác trên URL cố ý KHÔNG trả 404, chỉ hiện trạng thái rỗng có hướng dẫn.
```

Nguyên tắc: **PR nhỏ được review kỹ, PR lớn được duyệt cho xong.** PR trên 400 dòng thay đổi thì chất lượng review giảm rõ rệt. Chia nhỏ.

Tự review PR của mình trước khi gửi — bạn sẽ tìm thấy `console.log` bỏ quên và một hai chỗ đặt tên tệ.

## Review code

Người review nên:
- Phân biệt rõ **bắt buộc sửa** và **gợi ý**. Ghi rõ: "nit:" cho góp ý nhỏ.
- Hỏi thay vì phán xét: "Chỗ này xử lý sao khi mảng rỗng?" thay vì "Code này sai".
- Khen chỗ làm tốt — review chỉ toàn chê là nguồn của review chiếu lệ.

Người nhận review nên:
- Không nhận xét nào là công kích cá nhân.
- Không đồng ý thì phản biện bằng lý do kỹ thuật, đừng im lặng sửa theo.
- Trả lời mọi comment, kể cả bằng "đã sửa".

## Bảo vệ nhánh chính

Trên GitHub, bật cho `main`:

- Yêu cầu pull request trước khi merge.
- Yêu cầu ít nhất 1 người duyệt.
- Yêu cầu CI xanh (test, lint, typecheck).
- Yêu cầu nhánh cập nhật với `main` trước khi merge.
- Cấm force push.

Đây là hàng rào rẻ nhất chống lại "ai đó push nhầm lên main lúc 11 giờ đêm".

## Chọn cách merge

| Cách | Kết quả | Khi nào |
|---|---|---|
| Merge commit | Giữ mọi commit + một commit merge | Nhánh có lịch sử đáng giữ |
| Squash and merge | Cả PR thành **một** commit | Mặc định tốt cho phần lớn nhóm |
| Rebase and merge | Chép từng commit lên main, không có commit merge | Khi commit đã sạch sẵn |

Squash merge cho lịch sử `main` gọn, mỗi dòng là một PR — rất tiện khi dùng `git bisect` hoặc đọc changelog.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| PR 2000 dòng | Review chiếu lệ, lọt bug | Chia nhỏ theo từng ý |
| Nhánh sống hai tuần | Conflict khổng lồ | Merge sớm, dùng feature flag |
| Không bảo vệ `main` | Push thẳng, CI đỏ | Bật branch protection |
| Review chỉ soi phong cách | Bỏ sót lỗi logic | Để lint lo phong cách |
| Git Flow cho web app | Quy trình nặng vô ích | Trunk-based |

## Ghi nhớ

- Trunk-based cho web app; Git Flow khi có phiên bản phát hành.
- Nhánh sống ngắn là cách phòng conflict tốt nhất.
- PR nhỏ, có mô tả "vì sao" và "cách kiểm tra".
- Branch protection + CI là hàng rào rẻ nhất.

## Tự kiểm tra

1. Nhóm 4 người làm web app triển khai hằng ngày — chọn quy trình nào, vì sao?
2. Ba mục bắt buộc có trong mô tả PR?
3. Squash merge và merge commit khác nhau thế nào với `git bisect`?
