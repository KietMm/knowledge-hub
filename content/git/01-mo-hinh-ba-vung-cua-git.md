---
title: Mô hình ba vùng của Git
slug: mo-hinh-ba-vung-cua-git
summary: Working directory, staging area, repository — hiểu ba vùng này thì mọi lệnh Git trở nên dễ đoán.
level: co-ban
tags: [git, co-ban, staging]
khung: v2
---

> **Sau bài này bạn sẽ:** biết mỗi lệnh Git di chuyển thứ gì giữa vùng nào, và tự suy ra được lệnh hoàn tác thay vì tra Google mỗi lần.

## Ý tưởng chính

Git khó không phải vì lệnh khó nhớ. Nó khó vì người ta học **lệnh** mà không học **mô hình** — và không có mô hình thì mọi lệnh đều là câu thần chú.

Mô hình đó rất nhỏ: file của bạn nằm ở **ba vùng**, và mọi lệnh Git chỉ là chuyển thứ gì đó giữa các vùng ấy.

## Mental model

Hãy nghĩ tới **chụp ảnh một buổi tiệc**.

```text
① Bàn tiệc (working directory)  — nơi mọi thứ đang bày ra, lộn xộn, đang sửa
② Khung hình (staging area)     — bạn CHỌN đưa ai vào khung
③ Album ảnh (repository)        — bấm máy, ảnh vào album, không đổi được nữa
```

> Bạn không chụp cả bàn tiệc. Bạn **chọn** người vào khung (`git add`), ngắm lại xem đủ chưa (`git status`), rồi mới **bấm máy** (`git commit`).
>
> Khung hình là thứ Git có mà nhiều hệ thống khác không có — nó cho phép bạn **chụp một phần** những gì đang bày ra.

Người mới hay bỏ qua khung hình (`git add .` rồi commit tất) và vì vậy không hiểu vì sao nó tồn tại. Nó tồn tại để bạn tách **một buổi làm việc lộn xộn** thành **nhiều commit sạch**.

## Ví dụ nhỏ

```bash
# Sửa hai thứ chẳng liên quan gì nhau trong một buổi
vim src/thanh-toan.ts     # sửa lỗi tính tiền
vim README.md             # sửa lỗi chính tả

git add src/thanh-toan.ts
git commit -m "fix: tính sai phí giao hàng khi đơn > 500k"

git add README.md
git commit -m "docs: sửa lỗi chính tả"
```

Hai commit, mỗi cái một việc — dù bạn làm cả hai cùng lúc. Đó là điều khung hình cho phép.

## Code chạy thế nào

Vòng đời một thay đổi, và tên trạng thái Git dùng cho từng chặng:

```text
① Bàn tiệc          ② Khung hình         ③ Album
(chưa theo dõi /    (đã staged)          (đã commit)
 đã sửa)

  file mới ──git add──► staged ──git commit──► trong lịch sử
      ▲                    │                        │
      └──git restore ──────┘                        │
      ▲                                             │
      └──── git reset --soft/mixed ─────────────────┘
```

Và đây là bảng quan trọng nhất của bài — **hoàn tác ở từng vùng**:

```text
Sửa ở BÀN TIỆC, muốn bỏ:
  git restore <file>              ← xoá thay đổi, KHÔNG lấy lại được

Đã vào KHUNG HÌNH, muốn bỏ ra (giữ nội dung):
  git restore --staged <file>

Đã vào ALBUM, muốn sửa ảnh vừa chụp:
  git commit --amend              ← chỉ khi CHƯA push

Đã vào ALBUM, muốn quay lại vài ảnh trước:
  git reset --soft  HEAD~1        ← bỏ commit, giữ nguyên khung hình
  git reset         HEAD~1        ← bỏ commit + khung hình, giữ bàn tiệc
  git reset --hard  HEAD~1        ← bỏ TẤT CẢ  ⚠️ mất code
```

Ba mức của `reset` chỉ khác nhau ở **dừng lại ở vùng nào**. Nhớ theo mô hình thì không cần học thuộc: `--soft` lùi một vùng, `--mixed` (mặc định) lùi hai, `--hard` lùi cả ba.

## Cú pháp

```bash
git status              # xem cả ba vùng — lệnh dùng nhiều nhất
git diff                # bàn tiệc  ↔ khung hình
git diff --staged       # khung hình ↔ album
git add -p              # chọn TỪNG ĐOẠN để đưa vào khung  ← rất đáng dùng
git log --oneline -10
```

`git add -p` là lệnh biến khung hình từ khái niệm thành công cụ thật: nó hỏi bạn từng đoạn thay đổi một, và bạn chọn đoạn nào vào commit này.

## Tại sao cần nó

Vì `.gitignore` và thông điệp commit là hai thứ ảnh hưởng cả đời dự án:

```gitignore
node_modules/
.env                    # ⚠️ bí mật — không bao giờ commit
dist/
*.log
.DS_Store
```

Quan trọng: `.gitignore` **chỉ áp dụng cho file chưa được theo dõi**. File đã trót commit thì thêm vào `.gitignore` không có tác dụng gì:

```bash
git rm --cached .env    # gỡ khỏi Git nhưng giữ file trên máy
```

Và nếu bí mật đã bị push lên: **coi như đã lộ**. Xoá commit không đủ — phải **đổi ngay khoá đó**, vì nó đã nằm trong lịch sử của mọi người đã clone.

Thông điệp commit — dùng Conventional Commits:

```text
feat: thêm đăng nhập bằng Google
fix: sửa lỗi tính phí khi đơn > 500k
docs: cập nhật hướng dẫn cài đặt
refactor: tách logic tính giá ra module riêng
```

Câu tiêu đề trả lời *"làm gì"*; phần thân trả lời **"vì sao"** — thứ mà đọc diff không bao giờ thấy được:

```text
fix: giới hạn số lần thử lại xuống 3

Cổng thanh toán trả 503 ngẫu nhiên khoảng 1% số lần. Thử lại 10 lần
làm request treo tới 30 giây và người dùng bấm Gửi lần nữa.
Nhà cung cấp xác nhận đây là hành vi mong đợi (ticket #4821).
```

## So sánh

| Muốn gì | Lệnh |
|---|---|
| Bỏ sửa đổi chưa add | `git restore <file>` |
| Bỏ khỏi staging, giữ nội dung | `git restore --staged <file>` |
| Sửa commit vừa tạo (chưa push) | `git commit --amend` |
| Bỏ commit, giữ code | `git reset --soft HEAD~1` |
| Bỏ hẳn commit và code | `git reset --hard HEAD~1` ⚠️ |
| Hoàn tác commit **đã push** | `git revert <hash>` |

Dòng cuối quan trọng: trên nhánh chung, **không bao giờ `reset`** — dùng `revert`, nó tạo commit mới đảo ngược thay đổi. Chi tiết ở [[go-roi-khi-lo-tay]].

## Dễ nhầm

**1. `git add .` mọi lúc.** Bạn commit cả file tạm, file cấu hình cá nhân, và những thay đổi chưa xong. Dùng `git status` trước, và `git add -p` khi buổi làm việc có nhiều việc lẫn lộn.

**2. Commit `.env` hoặc khoá API.** Xem ở trên — lộ là phải đổi khoá, không phải xoá commit.

**3. Dùng `git reset --hard` khi hoảng.** Nó xoá code chưa commit **vĩnh viễn**. Bình tĩnh dùng `git stash` trước.

**4. Thông điệp "update", "fix bug", "wip".** Sáu tháng sau, `git log` của bạn là một danh sách vô nghĩa, và `git bisect` mất hết giá trị.

**5. Commit quá to.** Một commit sửa 40 file, 5 việc khác nhau — không review được, không revert được từng phần. Một commit = một việc.

**6. Tưởng `.gitignore` gỡ được file đã commit.** Cần `git rm --cached`.

## Mẹo nhớ

> **Bàn tiệc → khung hình → album.**
>
> **`reset` ba mức chỉ khác nhau ở chỗ dừng lại vùng nào.**
>
> **Nhánh chung thì `revert`, không `reset`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba vùng của Git là gì, và vùng nào là thứ khiến Git khác các hệ thống khác?
2. `git restore` và `git restore --staged` khác nhau ở chỗ nào?
3. Ba mức của `git reset` khác nhau thế nào — nói theo mô hình ba vùng?
4. Vì sao thêm `.env` vào `.gitignore` sau khi đã commit thì không có tác dụng?
5. Vì sao trên nhánh chung phải dùng `revert` thay vì `reset`?

## Tự viết lại

Không nhìn lại phần trên, viết lệnh cho từng tình huống:

```text
a) Lỡ `git add` một file không muốn commit
b) Muốn bỏ hết sửa đổi trong file A về như lần commit gần nhất
c) Vừa commit nhưng quên thêm một file (chưa push)
d) Commit sai thông điệp, đã push lên nhánh chung
e) Có ba thay đổi trong một file, chỉ muốn commit một
```

Tự kiểm: câu (d) và (e) là hai câu phân biệt người hiểu mô hình với người học thuộc lệnh — bạn trả lời được không?

## Thử sức

Đồng nghiệp báo: *"tôi `git reset --hard` nhầm, mất hết code hai giờ làm việc"*.

Trước khi trả lời, hãy hỏi **một câu** để biết code có cứu được không. Câu đó là gì, và nếu câu trả lời là "có" thì bạn dùng lệnh nào để cứu?
