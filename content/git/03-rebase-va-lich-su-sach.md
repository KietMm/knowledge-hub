---
title: Rebase và lịch sử sạch
slug: rebase-va-lich-su-sach
summary: Rebase viết lại lịch sử để nó thẳng và đọc được — kèm quy tắc vàng để không phá việc của người khác.
level: trung-cap
tags: [git, rebase, lich-su]
---

> **Sau bài này bạn sẽ:** dọn nhánh của mình thành chuỗi commit sạch trước khi mở PR, mà không gây rắc rối cho ai.

## Rebase làm gì

Merge **nối** hai lịch sử lại. Rebase **chép lại** commit của bạn lên trên đỉnh nhánh đích:

```
Trước:
main:  A---B---E
            \
feat:        C---D

Sau `git rebase main`:
main:  A---B---E
                \
feat:            C'---D'      (C', D' là commit MỚI, hash khác)
```

Lịch sử thẳng, dễ đọc, `git bisect` chạy hiệu quả hơn. Đổi lại: hash thay đổi, nghĩa là commit cũ và mới là hai vật khác nhau.

```bash
git switch feat/x
git rebase main
# nếu có conflict:
#   sửa file -> git add -> git rebase --continue
#   hoặc bỏ cuộc: git rebase --abort
```

## Quy tắc vàng

> **Không bao giờ rebase nhánh mà người khác đang dùng.**

Rebase tạo commit mới với hash mới. Nếu đồng nghiệp đã dựa trên commit cũ, lịch sử của họ và của bạn phân kỳ — và cách "sửa" thường là ai đó mất việc.

An toàn khi: nhánh chỉ mình bạn dùng, hoặc nhánh cá nhân đã thống nhất trước.

## Interactive rebase — dọn dẹp trước khi mở PR

```bash
git rebase -i HEAD~5
```

Trình soạn thảo mở ra danh sách 5 commit gần nhất:

```
pick a1b2c3d feat: thêm form
squash e4f5g6h fix typo
squash h7i8j9k fix typo lần 2
reword k1l2m3n feat: thêm validate
drop  n4o5p6q debug log
```

| Lệnh | Việc |
|---|---|
| `pick` | Giữ nguyên |
| `reword` | Giữ thay đổi, sửa thông điệp |
| `squash` | Gộp vào commit **phía trên**, giữ cả hai thông điệp |
| `fixup` | Như squash nhưng bỏ thông điệp |
| `edit` | Dừng lại để sửa nội dung commit |
| `drop` | Xoá hẳn commit |

Đây là cách biến 12 commit lộn xộn thành 3 commit kể được một câu chuyện mạch lạc.

Mẹo: `git commit --fixup=<hash>` rồi `git rebase -i --autosquash` tự sắp xếp giúp bạn.

## Push sau khi rebase

Rebase đổi hash nên push thường sẽ bị từ chối. Bắt buộc phải ép:

```bash
git push --force-with-lease      # ĐÚNG
git push --force                 # NGUY HIỂM
```

`--force-with-lease` từ chối đẩy nếu remote có commit bạn chưa thấy — nó bảo vệ bạn khỏi việc xoá mất công sức của đồng nghiệp vừa push lên. Hãy đặt nó thành thói quen; không bao giờ dùng `--force` trần.

## `git pull --rebase`

```bash
git config --global pull.rebase true
```

Với cấu hình này, `git pull` sẽ đặt commit local của bạn lên trên commit vừa kéo về, thay vì tạo commit merge kiểu "Merge branch 'main' of github.com...". Lịch sử sạch hơn hẳn với gần như không có nhược điểm.

## `git cherry-pick`

Lấy đúng một commit từ nhánh khác:

```bash
git cherry-pick a1b2c3d
git cherry-pick a1b2c3d^..e4f5g6h    # một khoảng
```

Dùng khi cần đưa gấp một bản vá từ `main` sang nhánh release, không kéo theo mọi thứ khác.

## Merge hay rebase — chọn thế nào

| Tình huống | Nên dùng |
|---|---|
| Cập nhật nhánh feature cá nhân theo main | `rebase` |
| Đưa nhánh feature vào main | `merge --no-ff` hoặc squash merge |
| Nhánh có nhiều người cùng làm | `merge` |
| Dọn commit trước khi mở PR | `rebase -i` |

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Rebase nhánh chung | Đồng nghiệp mất commit | Chỉ rebase nhánh riêng |
| `git push --force` | Xoá commit người khác vừa đẩy | `--force-with-lease` |
| Rebase khi đang có việc dở | Conflict chồng chất | `git stash` trước |
| Sợ rebase nên không bao giờ dùng | Lịch sử đầy commit merge nhiễu | Dùng cho nhánh riêng |
| Rebase một nhánh 50 commit | Conflict lặp lại nhiều lần | Squash trước rồi rebase |

## Ghi nhớ

- Rebase chép lại commit với hash mới — vật khác, không phải cùng một commit.
- Quy tắc vàng: không rebase thứ người khác đang dùng.
- `rebase -i` để dọn nhánh trước khi mở PR.
- `--force-with-lease`, không bao giờ `--force`.

## Tự kiểm tra

1. Vì sao rebase làm hash thay đổi, và vì sao điều đó nguy hiểm với nhánh chung?
2. Có 8 commit, muốn gộp còn 2. Làm thế nào?
3. `--force-with-lease` bảo vệ bạn khỏi tình huống cụ thể nào?
