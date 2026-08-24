---
title: Mô hình ba vùng của Git
slug: mo-hinh-ba-vung-cua-git
summary: Working directory, staging area, repository — hiểu ba vùng này thì mọi lệnh Git trở nên dễ đoán.
level: co-ban
tags: [git, co-ban, staging]
---

> **Sau bài này bạn sẽ:** đọc được `git status` mà không phải đoán, và biết chính xác `git add` làm gì.

## Ba vùng

```
Working Directory  --git add-->  Staging Area  --git commit-->  Repository
   (file bạn sửa)                 (bản nháp)                    (lịch sử)
```

| Vùng | Là gì | Lệnh xem |
|---|---|---|
| Working Directory | File thật trên ổ đĩa | `git diff` |
| Staging Area (index) | Danh sách thay đổi sẽ vào commit tới | `git diff --staged` |
| Repository | Chuỗi commit đã ghi vĩnh viễn | `git log` |

Staging area là thứ khiến Git khác các hệ quản lý phiên bản khác: nó cho phép bạn **chọn** phần nào của công việc dở dang sẽ đi vào commit này.

## Vòng đời một thay đổi

```bash
git status                  # xem đang ở đâu
git add ten-file.ts         # đưa vào staging
git add -p                  # chọn TỪNG ĐOẠN trong file để stage
git commit -m "feat: thêm bộ lọc theo tag"
git log --oneline --graph   # xem lịch sử
```

`git add -p` là lệnh đáng học sớm nhất: nó cho phép tách một buổi làm việc lộn xộn thành các commit sạch, mỗi commit một ý.

## Hoàn tác ở từng vùng

Đây là bảng cần nhớ — hoàn tác sai vùng là mất việc:

```bash
git restore ten-file            # bỏ sửa trong working dir (MẤT thay đổi)
git restore --staged ten-file   # bỏ khỏi staging, giữ nguyên sửa đổi
git commit --amend              # sửa commit gần nhất (nội dung hoặc thông điệp)
git reset --soft HEAD~1         # bỏ commit, giữ thay đổi trong staging
git reset --mixed HEAD~1        # bỏ commit, giữ thay đổi ở working dir (mặc định)
git reset --hard HEAD~1         # bỏ commit VÀ xoá thay đổi — không hoàn tác được
```

`--hard` là lệnh Git duy nhất thật sự làm mất việc. Trước khi gõ nó, hãy `git stash` để có đường lùi.

## `.gitignore`

```gitignore
node_modules/
.env
.env.local
*.log
.DS_Store
dist/
.venv/
```

Quy tắc quan trọng: `.gitignore` chỉ có tác dụng với file **chưa từng được theo dõi**. File đã lỡ commit thì phải gỡ ra:

```bash
git rm --cached .env      # gỡ khỏi Git, giữ file trên ổ đĩa
```

Và nhớ: nếu `.env` đã từng lên remote, coi như secret trong đó **đã lộ** — phải đổi khoá, không chỉ xoá file. Lịch sử Git giữ lại mọi thứ.

## Viết thông điệp commit

Quy ước Conventional Commits, dùng rộng rãi:

```
feat: thêm bộ lọc theo tag ở trang công nghệ
fix: sửa lỗi mất dữ liệu khi đổi chủ đề
docs: cập nhật hướng dẫn cài đặt
refactor: tách schema ra khỏi file 'use server'
test: thêm test cho hàm slugify
chore: nâng phiên bản next lên 15.5
```

Thông điệp tốt trả lời **vì sao**, không phải **cái gì** — diff đã cho biết cái gì rồi. Dòng đầu dưới 72 ký tự, thân bài giải thích lý do nếu cần.

## `git stash`

```bash
git stash               # cất tạm mọi thay đổi, working dir sạch
git stash -u            # cất cả file chưa được theo dõi
git stash list
git stash pop           # lấy lại và xoá khỏi stash
git stash apply         # lấy lại nhưng giữ trong stash
```

Dùng khi đang làm dở mà cần chuyển nhánh gấp để sửa lỗi khẩn.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `git add .` không xem `status` | Commit nhầm file rác, secret | Xem `git status` trước |
| `git reset --hard` khi hoảng | Mất việc vĩnh viễn | `git stash` trước |
| Commit `.env` | Lộ secret trong lịch sử | `git rm --cached` + **đổi khoá** |
| Commit "fix", "update" | Lịch sử vô dụng khi cần tra | Conventional Commits |
| Một commit khổng lồ | Không review nổi, không revert lẻ được | `git add -p` tách nhỏ |

## Ghi nhớ

- Ba vùng: working → staging → repository.
- `git add -p` để tách công việc thành commit có ý nghĩa.
- `--hard` là lệnh duy nhất làm mất việc thật sự.
- Secret đã lên remote là đã lộ — phải đổi khoá.

## Tự kiểm tra

1. Lỡ `git add` một file không định commit. Gỡ ra bằng lệnh nào mà không mất sửa đổi?
2. `git reset --soft`, `--mixed`, `--hard` khác nhau ở chỗ nào?
3. Vừa commit xong thì phát hiện sai chính tả trong thông điệp. Sửa thế nào?
