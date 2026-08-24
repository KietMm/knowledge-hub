---
title: Cấu hình Git cho dự án
slug: cau-hinh-git-cho-du-an
summary: .gitignore, .gitattributes, hook và cách gỡ file đã lỡ commit khỏi lịch sử.
level: nang-cao
tags: [git, gitignore, hook, cau-hinh]
---

> **Sau bài này bạn sẽ:** cấu hình repo để cả nhóm không đánh nhau vì xuống dòng, và xử lý được khi secret đã lỡ vào lịch sử.

## `.gitignore` — quy tắc và thứ tự

```gitignore
# Phụ thuộc và bản build
node_modules/
.next/
dist/

# Biến môi trường: bỏ hết, nhưng giữ lại file mẫu
.env*
!.env.example

# Hệ điều hành và editor
.DS_Store
.idea/

# Nhật ký
*.log
```

Ba điều quyết định `.gitignore` chạy đúng hay không:

**`/` ở đầu neo vào thư mục gốc.** `node_modules/` khớp ở mọi tầng; `/build` chỉ khớp `build` ngay ở gốc, không khớp `src/build`.

**`/` ở cuối nghĩa là chỉ thư mục.** `logs/` bỏ qua thư mục nhưng vẫn theo dõi file tên `logs`.

**`!` phủ định, và thứ tự có ý nghĩa.** Dòng sau thắng dòng trước:

```gitignore
.env*            # bỏ mọi file .env
!.env.example    # trừ file này  ← phải nằm SAU, đảo lại là không có tác dụng
```

Bẫy quan trọng nhất: **`.gitignore` không có tác dụng với file đã được track**.

```bash
# Đã commit .env rồi mới thêm vào .gitignore → Git vẫn theo dõi nó
git rm --cached .env        # bỏ khỏi index, GIỮ file trên đĩa
git commit -m "chore: bỏ .env khỏi theo dõi"
```

Kiểm tra khi không hiểu vì sao một file vẫn bị theo dõi:

```bash
git check-ignore -v duong/dan/file    # in ra dòng nào trong .gitignore đang khớp
git status --ignored                  # xem cả file đang bị bỏ qua
```

## `.gitattributes` — chấm dứt cuộc chiến xuống dòng

Windows dùng `CRLF`, macOS/Linux dùng `LF`. Không cấu hình thì mỗi lần người khác hệ điều hành lưu file là **toàn bộ file hiện lên như đã sửa** — diff vô dụng, review không làm được.

```gitattributes
# Chuẩn hoá: trong repo luôn LF, khi checkout thì theo hệ điều hành
* text=auto eol=lf

# File nhị phân: không được chạm vào
*.png binary
*.pdf binary
*.woff2 binary

# Script shell phải là LF, kể cả trên Windows — CRLF làm shebang hỏng
*.sh text eol=lf

# File sinh tự động: gộp lịch sử cho gọn, không tính vào thống kê ngôn ngữ
pnpm-lock.yaml -diff linguist-generated
```

Đây là cấu hình thuộc **repo**, không phải thuộc máy — nên nó áp cho cả nhóm, khác với `core.autocrlf` mà mỗi người phải tự đặt.

`*.sh text eol=lf` giải quyết một lỗi rất khó đoán: file `.sh` bị lưu CRLF thì dòng `#!/bin/bash\r` khiến hệ thống tìm chương trình tên `bash\r` và báo `bad interpreter`.

## Hook — chạy kiểm tra trước khi commit

Hook nằm trong `.git/hooks/`, mà thư mục đó **không được commit**. Nên dùng một thư mục riêng và trỏ Git vào đó:

```bash
mkdir -p .githooks
git config core.hooksPath .githooks    # mỗi người chạy một lần sau khi clone
```

```bash
# .githooks/pre-commit
#!/bin/sh
set -e                                  # lỗi ở bất kỳ dòng nào là dừng, chặn commit
pnpm typecheck
npx vitest run --changed
```

```bash
chmod +x .githooks/pre-commit          # thiếu quyền chạy thì Git bỏ qua, im lặng
```

Nguyên tắc dùng hook: **nhanh, và bỏ qua được**. Hook chạy 30 giây khiến người ta dùng `--no-verify` thành thói quen, lúc đó nó vô dụng. Việc chậm (test đầy đủ, build) để CI làm — xem [[cau-truc-mot-workflow]].

Hook là *tiện lợi*, không phải *cơ chế bảo đảm*: ai cũng gỡ được bằng `--no-verify`. Thứ thật sự chặn là kiểm tra ở CI cộng bảo vệ nhánh.

## Khi secret đã vào lịch sử

Xoá file rồi commit là **không đủ** — nó vẫn nằm trong mọi commit trước đó, ai clone cũng lấy được.

Việc đầu tiên, làm ngay:

```
1. THU HỒI khoá đó. Xoay khoá mới.
```

Đây là bước duy nhất thật sự quan trọng. Coi như khoá đã bị lộ — vì nó đã bị lộ: có thể nó đã ở trong bản clone của người khác, trong log CI, trong cache của GitHub.

Sau đó mới dọn lịch sử:

```bash
# git-filter-repo là công cụ được khuyến nghị (filter-branch đã lỗi thời và rất chậm)
pip install git-filter-repo
git filter-repo --invert-paths --path .env

git push --force-with-lease --all
git push --force-with-lease --tags
```

Việc này **viết lại mọi hash** kể từ commit chứa file đó. Cả nhóm phải clone lại; ai `git pull` bình thường sẽ nhận một lịch sử phân kỳ hoàn toàn. Thông báo trước cho mọi người.

Phòng còn hơn chữa:

```gitignore
.env*
!.env.example
*.pem
*.key
```

Cộng thêm một bước quét trong CI (`gitleaks`, `trufflehog`) để lần sau nó bị chặn trước khi lên nhánh chính.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Thêm `.gitignore` sau khi đã commit file | File vẫn bị theo dõi như cũ | `git rm --cached` |
| `!.env.example` đặt trước `.env*` | Phủ định không có tác dụng | Đảo thứ tự |
| Không có `.gitattributes` | Diff toàn file mỗi lần đổi hệ điều hành | `* text=auto eol=lf` |
| File `.sh` bị lưu CRLF | `bad interpreter` khi chạy | `*.sh text eol=lf` |
| Hook trong `.git/hooks/` | Không chia sẻ được cho nhóm | `core.hooksPath` |
| Quên `chmod +x` cho hook | Git bỏ qua, không báo gì | `chmod +x` |
| Hook chạy quá lâu | Mọi người dùng `--no-verify` | Chỉ việc nhanh; việc chậm để CI |
| Xoá file secret bằng một commit mới | Secret vẫn còn trong lịch sử | Thu hồi khoá + `filter-repo` |

## Ghi nhớ

- `.gitignore` không áp cho file đã track — cần `git rm --cached`.
- Thứ tự trong `.gitignore` có ý nghĩa; `!` phải nằm sau.
- `.gitattributes` là cấu hình của repo nên áp cho cả nhóm, khác `core.autocrlf`.
- Secret vào lịch sử: **thu hồi khoá trước**, dọn lịch sử sau.

## Tự kiểm tra

1. Đã commit `.env` rồi mới thêm vào `.gitignore`. Vì sao Git vẫn theo dõi nó?
2. `/build` và `build/` khác nhau thế nào?
3. Secret vừa bị đẩy lên GitHub. Việc đầu tiên là gì, và vì sao không phải là xoá lịch sử?
