---
title: Gỡ rối khi lỡ tay
slug: go-roi-khi-lo-tay
summary: reflog, revert, bisect — bộ ba cứu hộ cho gần như mọi tình huống hoảng loạn với Git.
level: trung-cap
tags: [git, reflog, revert, bisect]
---

> **Sau bài này bạn sẽ:** biết rằng gần như mọi thứ trong Git đều lấy lại được, và biết lấy lại bằng cách nào.

## `git reflog` — nhật ký mọi nơi HEAD từng đứng

Đây là lệnh cứu hộ quan trọng nhất. Git ghi lại **mọi** lần `HEAD` thay đổi, kể cả những commit không còn nhánh nào trỏ tới:

```bash
git reflog
# a1b2c3d HEAD@{0}: reset: moving to HEAD~3
# e4f5g6h HEAD@{1}: commit: feat: thêm bộ lọc      <- commit "đã mất"
# ...

git reset --hard e4f5g6h        # quay lại đúng thời điểm đó
# hoặc an toàn hơn:
git switch -c cuu-ho e4f5g6h    # tạo nhánh mới từ commit đó
```

Reflog giữ khoảng 90 ngày. Nghĩa là: `reset --hard` nhầm, xoá nhánh nhầm, rebase hỏng — vẫn lấy lại được, miễn là bạn đã commit.

## `git revert` — hoàn tác an toàn trên nhánh chung

```bash
git revert a1b2c3d              # tạo commit MỚI đảo ngược commit đó
git revert -m 1 <hash-merge>    # revert một commit merge
```

Khác `reset` ở chỗ: `revert` **thêm** commit thay vì xoá. Lịch sử không bị viết lại, nên dùng được trên nhánh chung mà không ảnh hưởng ai.

Quy tắc: `reset` cho nhánh riêng chưa push, `revert` cho mọi thứ đã lên remote.

## Các tình huống thường gặp

**Commit nhầm nhánh (lỡ commit lên `main`):**
```bash
git switch -c feat/dung-nhanh    # tạo nhánh tại vị trí hiện tại
git switch main
git reset --hard origin/main     # đưa main về đúng trạng thái remote
```

**Quên thêm một file vào commit vừa rồi:**
```bash
git add file-quen
git commit --amend --no-edit
```

**Xoá nhầm nhánh chưa merge:**
```bash
git reflog                       # tìm commit cuối của nhánh đó
git switch -c ten-nhanh <hash>
```

**Cần xem file ở phiên bản cũ:**
```bash
git show a1b2c3d:duong/dan/file.ts
git restore --source=a1b2c3d duong/dan/file.ts
```

**Lỡ push secret lên remote:** đổi khoá **trước tiên**. Xoá khỏi lịch sử bằng `git filter-repo` chỉ là bước dọn dẹp — không ai đảm bảo được là chưa có ai kịp sao chép.

## `git bisect` — tìm commit gây lỗi

Khi biết "hai tuần trước còn chạy, giờ hỏng" nhưng không biết commit nào gây ra:

```bash
git bisect start
git bisect bad                  # commit hiện tại: hỏng
git bisect good v1.2.0          # phiên bản này: chạy tốt

# Git checkout commit ở giữa, bạn kiểm tra rồi trả lời:
git bisect good      # hoặc  git bisect bad

git bisect reset     # xong, quay về nhánh cũ
```

Tìm kiếm nhị phân: 1000 commit chỉ cần khoảng 10 lần kiểm tra. Có script kiểm tra tự động thì càng nhanh:

```bash
git bisect run pnpm test
```

Git tự chạy đến khi tìm ra commit đầu tiên bị hỏng.

## `git blame` và tìm trong lịch sử

```bash
git blame -L 40,60 file.ts       # ai sửa dòng 40-60, ở commit nào
git log -S "ten_ham"             # commit nào thêm/xoá chuỗi này
git log -p file.ts               # toàn bộ diff của một file qua thời gian
git log --follow file.ts         # theo dõi cả khi file bị đổi tên
```

`git log -S` (pickaxe) là công cụ bị đánh giá thấp nhất: nó trả lời được "đoạn code kỳ lạ này sinh ra từ đâu và vì sao".

Đọc `blame` để **hiểu bối cảnh**, không phải để tìm người đổ lỗi — commit message và PR liên quan thường giải thích vì sao code trông như vậy.

## Lỗi hay gặp

| Tình huống | Sai lầm | Cách đúng |
|---|---|---|
| `reset --hard` nhầm | Tưởng mất vĩnh viễn | `git reflog` |
| Hoàn tác trên nhánh chung | `reset` + force push | `git revert` |
| Không biết lỗi từ đâu | Đọc thủ công 200 commit | `git bisect` |
| Lỡ push secret | Chỉ xoá file | Đổi khoá **rồi mới** dọn lịch sử |
| Commit nhầm `main` | Hoảng, xoá thư mục | Tạo nhánh rồi reset `main` |

## Ghi nhớ

- Đã commit thì gần như luôn lấy lại được — `git reflog` là cứu tinh.
- `reset` cho nhánh riêng, `revert` cho nhánh chung.
- `git bisect run` tự tìm commit gây lỗi.
- Secret lộ thì đổi khoá trước, dọn lịch sử sau.

## Tự kiểm tra

1. `git reset --hard HEAD~3` rồi nhận ra sai. Lấy lại thế nào?
2. Vì sao dùng `revert` chứ không `reset` cho commit đã push lên `main`?
3. Test hỏng từ lúc nào không rõ, giữa 300 commit. Dùng lệnh gì và cần bao nhiêu lần kiểm tra?
