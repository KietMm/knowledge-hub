---
title: Cấu hình Git cho dự án
slug: cau-hinh-git-cho-du-an
summary: .gitignore, .gitattributes, hook và cách gỡ file đã lỡ commit khỏi lịch sử.
level: nang-cao
tags: [git, gitignore, hook, cau-hinh]
khung: v2
---

> **Sau bài này bạn sẽ:** cấu hình repo để những lỗi phổ biến **không thể xảy ra**, thay vì trông chờ mọi người nhớ.

## Ý tưởng chính

Ba lỗi Git tốn kém nhất — commit bí mật, commit file build, và cuộc chiến xuống dòng giữa Windows và macOS — đều **ngăn được bằng cấu hình**.

Nguyên tắc chung: **đừng dựa vào kỷ luật khi có thể dựa vào công cụ.**

## Mental model

Hãy nghĩ tới **lan can và biển cấm**.

> Biển "cấm ngã" là thoả thuận: ai đọc thì tránh, ai vội thì quên.
>
> **Lan can** là cấu hình: không đọc cũng không ngã được.

`.gitignore`, `.gitattributes` và hook là lan can. Chúng làm việc ngay cả với người mới vào dự án hôm qua, lúc 11 giờ đêm, khi đang vội.

## Ví dụ nhỏ

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example        # ← dấu ! = ngoại lệ, file này VẪN commit
*.log
.DS_Store
```

Dòng `!.env.example` là mẫu nên thuộc: giấu file thật, nhưng **giữ lại file mẫu** để người mới biết cần những biến gì.

## Code chạy thế nào

`.gitignore` có ba quy tắc mà hiểu sai là mất hàng giờ:

```text
① CHỈ áp dụng cho file CHƯA được theo dõi
   File đã commit rồi thì thêm vào .gitignore không có tác dụng
   → git rm --cached <file>

② Quy tắc SAU thắng quy tắc trước
   *.log
   !quan-trong.log      ← giữ lại file này

③ Thư mục đã bị bỏ qua thì KHÔNG thể giữ lại file bên trong
   ❌ build/           +  !build/giu-lai.txt     ← không hoạt động
   ✅ build/*          +  !build/giu-lai.txt
```

Quy tắc ③ là chỗ hay bí nhất: Git không đi vào thư mục đã bị loại, nên không bao giờ thấy file ngoại lệ bên trong.

```bash
git check-ignore -v <file>       # cho biết DÒNG NÀO trong .gitignore đang chặn file
```

Lệnh này giải quyết mọi tranh cãi kiểu "sao file này không lên được".

## Cú pháp

**`.gitattributes` — chấm dứt cuộc chiến xuống dòng:**

```gitattributes
* text=auto                      # tự chuẩn hoá về LF trong kho

*.sh   text eol=lf               # script shell LUÔN LF, kể cả trên Windows
*.bat  text eol=crlf

*.png  binary                    # không cố diff, không chuẩn hoá
*.pdf  binary

pnpm-lock.yaml -diff             # file sinh tự động: bỏ qua trong diff
dist/** linguist-generated       # không tính vào thống kê ngôn ngữ trên GitHub
```

Không có file này, người dùng Windows commit CRLF, người dùng macOS commit LF, và **mỗi lần ai đó mở file là toàn bộ file hiện ra như đã thay đổi**. Diff trở nên vô dụng.

**Hook — chạy kiểm tra trước khi commit:**

```bash
pnpm add -D husky lint-staged
npx husky init
```

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.md": "prettier --write"
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

`lint-staged` chỉ chạy trên **file đang trong khung hình** — nên commit nhanh, thay vì lint cả dự án mỗi lần.

Nguyên tắc thiết kế hook: **nhanh ở local, kỹ ở CI**.

```text
pre-commit  →  format + lint file đang commit   (dưới 5 giây)
pre-push    →  test nhanh                        (dưới 30 giây)
CI          →  test đầy đủ, build, kiểm bảo mật  (bao lâu cũng được)
```

Hook chạy 2 phút thì người ta sẽ dùng `--no-verify`, và bạn mất luôn lớp bảo vệ.

## Tại sao cần nó

Vì khi **secret đã vào lịch sử**, việc phải làm theo đúng thứ tự này:

```text
① ĐỔI KHOÁ NGAY LẬP TỨC        ← việc quan trọng nhất, làm trong 5 phút đầu
② Gỡ khỏi lịch sử (nếu cần)
③ Thông báo cho đội
```

Vì sao ① quan trọng hơn ②: repo đã được clone, CI đã ghi log, máy chủ Git có bản sao, và có thể đã bị bot quét. **Coi như khoá đã lộ** — dọn lịch sử không thay đổi sự thật đó.

```bash
# Gỡ khỏi lịch sử (viết lại toàn bộ — cần cả đội phối hợp)
brew install git-filter-repo
git filter-repo --path .env --invert-paths
git push --force --all
```

⚠️ Lệnh này **đổi hash mọi commit**. Mọi người phải clone lại; nhánh đang mở phải làm lại. Chỉ làm khi thật cần, và báo trước cho cả đội.

Phòng ngừa tốt hơn nhiều:

```bash
pnpm add -D @secretlint/quick-start
# thêm vào pre-commit → chặn ngay từ đầu, không bao giờ có bước ①
```

## So sánh

| Lớp bảo vệ | Chặn được gì | Chi phí |
|---|---|---|
| `.gitignore` | File build, môi trường, tạm | 0 |
| `.gitattributes` | Chiến tranh xuống dòng | 0 |
| `pre-commit` hook | Code chưa format, secret | Vài giây mỗi commit |
| Bảo vệ nhánh trên GitHub | Push thẳng vào `main`, force push | 0 |
| CI | Test hỏng, build lỗi | Vài phút mỗi PR |

Bốn lớp đầu gần như miễn phí và nên có ở **mọi** repo, kể cả dự án cá nhân.

## Dễ nhầm

**1. Tưởng `.gitignore` gỡ được file đã commit.** Cần `git rm --cached`.

**2. Bỏ qua cả thư mục rồi muốn giữ một file bên trong.** Dùng `build/*` thay vì `build/`.

**3. Không có `.gitattributes` trong đội đa nền tảng.** Mọi diff đầy nhiễu, và conflict xuất hiện ở những chỗ chẳng ai sửa.

**4. Hook quá chậm.** Người ta sẽ `--no-verify`. Giữ pre-commit dưới 5 giây.

**5. Chỉ dọn lịch sử mà không đổi khoá.** Bạn tốn nửa ngày viết lại lịch sử và khoá vẫn đang bị dùng.

**6. Commit `.env.example` mà quên xoá giá trị thật.** File mẫu phải có **tên biến** và giá trị giả — đây là chỗ rò rỉ hay bị bỏ qua vì ai cũng nghĩ file mẫu thì an toàn.

## Mẹo nhớ

> **Lan can, không phải biển cấm.**
>
> **Secret lộ ⇒ ĐỔI KHOÁ trước, dọn lịch sử sau.**
>
> **Nhanh ở local, kỹ ở CI.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao thêm file đã commit vào `.gitignore` không có tác dụng?
2. Vì sao `build/` + `!build/x.txt` không hoạt động, và cách sửa?
3. `.gitattributes` giải quyết vấn đề gì mà `.gitignore` không?
4. Vì sao pre-commit hook phải nhanh?
5. Thứ tự ba việc khi phát hiện secret đã push, và vì sao việc ① đứng đầu?

## Tự viết lại

Không nhìn lại phần trên, viết `.gitignore` và `.gitattributes` cho một dự án Next.js + Python có đội dùng cả Windows lẫn macOS:

```text
Cần bỏ qua: node_modules, .next, __pycache__, .venv, .env (nhưng giữ .env.example)
Cần chuẩn hoá: script .sh luôn LF, ảnh coi là binary, lock file bỏ khỏi diff
```

Tự kiểm: bạn kiểm chứng `.gitignore` của mình đúng bằng lệnh nào?

## Thử sức

Đồng nghiệp mở PR và diff hiện **toàn bộ 3000 dòng** của một file mà họ chỉ sửa một dòng.

Chẩn đoán nguyên nhân (có ít nhất hai khả năng), cách xác minh từng cái, và cấu hình nào ngăn nó tái diễn cho **cả đội** — không phải chỉ cho máy của người đó.
