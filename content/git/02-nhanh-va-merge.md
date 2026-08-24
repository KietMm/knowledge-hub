---
title: Nhánh và merge
slug: nhanh-va-merge
summary: Nhánh chỉ là một con trỏ tới commit — hiểu điều đó thì merge và conflict không còn đáng sợ.
level: co-ban
tags: [git, nhanh, merge, conflict]
---

> **Sau bài này bạn sẽ:** tạo nhánh không do dự, và xử lý conflict bằng cách đọc chứ không phải đoán.

## Nhánh là một con trỏ

Một nhánh trong Git chỉ là một file 41 byte chứa mã hash của commit. Đó là lý do tạo nhánh **tức thì** và gần như miễn phí — khác hẳn các hệ VCS cũ phải sao chép cả thư mục.

```bash
git branch                       # liệt kê
git switch -c feat/loc-theo-tag  # tạo và chuyển sang (lệnh hiện đại)
git checkout -b feat/loc-theo-tag  # lệnh cũ, tương đương
git switch main                  # quay về
git branch -d feat/loc-theo-tag  # xoá khi đã merge
```

`HEAD` là con trỏ tới nhánh bạn đang đứng. `git switch` chỉ đơn giản là dời `HEAD`.

## Hai kiểu merge

### Fast-forward

Khi nhánh chính không có commit mới nào từ lúc bạn tách ra, Git chỉ cần **dời con trỏ** tới trước:

```
main:  A---B
                \
feat:            C---D      -> merge -> main: A---B---C---D
```

Không có commit merge nào được tạo. Lịch sử thẳng và sạch.

### Three-way merge

Khi cả hai nhánh đều có commit mới, Git tạo một commit merge có **hai cha**:

```
main:  A---B---E
            \       \
feat:        C---D---M     (M là commit merge)
```

```bash
git switch main
git merge feat/loc-theo-tag
git merge --no-ff feat/x     # ép tạo commit merge kể cả khi fast-forward được
git merge --squash feat/x    # gộp mọi thay đổi thành MỘT commit chưa ghi
```

`--squash` hữu ích khi nhánh feature có 15 commit kiểu "wip", "fix typo" — nhánh chính chỉ cần một commit sạch.

## Conflict

Conflict xảy ra khi hai nhánh sửa **cùng vùng** của cùng một file. Git đánh dấu:

```
<<<<<<< HEAD
const gioiHan = 20
=======
const gioiHan = 50
>>>>>>> feat/phan-trang
```

- Phần trên `=======` là phiên bản của nhánh bạn **đang đứng**.
- Phần dưới là của nhánh bạn **đang merge vào**.

Cách xử lý:

```bash
git status                  # xem file nào conflict
# sửa file: xoá dấu <<<< ==== >>>>, giữ lại nội dung ĐÚNG
git add file-da-sua
git commit                  # hoàn tất merge

git merge --abort           # bỏ cuộc, quay về trạng thái trước merge
```

Điều quan trọng: **kết quả đúng thường không phải chọn một trong hai** — có khi phải kết hợp cả hai ý. Đọc để hiểu cả hai bên định làm gì, đừng chọn bừa.

Sau khi sửa xong, **chạy test** trước khi commit. Merge sạch về mặt văn bản không có nghĩa là code còn đúng: hai người sửa hai hàm khác nhau (không conflict) vẫn có thể tạo ra logic mâu thuẫn.

## Tránh conflict

- Nhánh sống ngắn: merge trong 1–2 ngày, đừng để hai tuần.
- Kéo `main` về thường xuyên: `git pull --rebase origin main`.
- Chia file nhỏ theo trách nhiệm — hai người ít khi phải sửa cùng chỗ.
- Thống nhất định dạng bằng công cụ (prettier, ruff) để không conflict vì khoảng trắng.

## Làm việc với remote

```bash
git fetch origin              # tải về, KHÔNG đụng vào nhánh của bạn
git pull                      # = fetch + merge
git pull --rebase             # = fetch + rebase (lịch sử thẳng hơn)
git push -u origin feat/x     # đẩy lần đầu và đặt nhánh theo dõi
```

`git fetch` an toàn tuyệt đối — nó chỉ cập nhật thông tin. Khi không chắc chuyện gì đang xảy ra, luôn bắt đầu bằng `fetch` rồi xem `git log --oneline --graph --all`.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Nhánh sống hàng tuần | Conflict lớn, khó gỡ | Merge sớm và thường xuyên |
| Chọn bừa một bên khi conflict | Mất tính năng của người kia | Đọc hiểu cả hai bên |
| Không chạy test sau merge | Merge sạch nhưng logic hỏng | Luôn test sau merge |
| `git push --force` lên nhánh chung | Xoá commit của người khác | `--force-with-lease` |
| Commit thẳng lên `main` | Không ai review được | Luôn làm trên nhánh |

## Ghi nhớ

- Nhánh chỉ là con trỏ; tạo nhánh gần như miễn phí.
- Fast-forward khi lịch sử thẳng; three-way khi hai bên cùng tiến.
- Conflict là hai người sửa cùng vùng — kết quả đúng có thể là kết hợp cả hai.
- Merge sạch không đảm bảo code đúng: chạy test.

## Tự kiểm tra

1. Vì sao tạo nhánh trong Git nhanh hơn hẳn các hệ VCS cũ?
2. Trong khối conflict, phần nào là của nhánh bạn đang đứng?
3. Khi nào nên dùng `--squash` thay vì merge thường?
