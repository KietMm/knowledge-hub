---
title: Stash, cherry-pick và worktree
slug: stash-cherry-pick-va-worktree
summary: Ba công cụ để chuyển việc giữa đường mà không tạo commit rác hay mất code.
level: trung-cap
tags: [git, stash, cherry-pick, worktree]
---

> **Sau bài này bạn sẽ:** rời khỏi việc đang làm dở một cách an toàn, và lấy đúng một commit từ nhánh khác.

## Tình huống: đang làm dở thì có việc gấp

Bạn sửa được nửa tính năng, chưa commit được vì code còn hỏng. Đúng lúc đó có bug production. Ba lựa chọn, tuỳ mức độ.

## `git stash` — cất tạm vào ngăn kéo

```bash
git stash push -m "đang làm form đăng ký"
git switch main                    # cây làm việc đã sạch, chuyển được
# ... sửa bug, commit, push ...
git switch tinh-nang-dang-ky
git stash pop                      # lấy lại và xoá khỏi stash
```

`pop` lấy ra rồi xoá; `apply` lấy ra mà **giữ lại** trong stash — dùng `apply` khi muốn áp cùng thay đổi lên hai nhánh.

Bẫy lớn nhất: **stash bỏ qua file chưa được track**.

```bash
git stash push                     # file mới KHÔNG được cất → vẫn nằm lại
git stash push -u                  # -u: cất luôn file chưa track
```

Đây là cách người ta mất code thường xuyên nhất với stash: tạo file mới, `stash`, `switch`, thấy file mới vẫn còn đó nên tưởng chưa cất được gì, xoá đi.

```bash
git stash list                     # stash@{0}: On abc: đang làm form
git stash show -p stash@{1}        # xem nội dung trước khi lấy
git stash drop stash@{1}
git stash clear                    # xoá hết — không hoàn tác được
```

Stash là chỗ **tạm**. Còn stash từ ba tuần trước thì bạn đã quên nó chứa gì rồi — commit vào một nhánh nháp còn an toàn hơn.

## `git cherry-pick` — lấy đúng một commit

Bug đã sửa trên `main`, cần đưa sang nhánh release đang chạy, nhưng không muốn kéo theo 30 commit khác:

```bash
git switch release/1.4
git cherry-pick a1b2c3d            # chép commit đó sang đây
git cherry-pick a1b2c3d..f4e5d6c   # một dải (không gồm a1b2c3d)
git cherry-pick -n a1b2c3d         # chỉ áp thay đổi, chưa commit
```

Cherry-pick **chép** commit — commit mới có hash khác vì cha khác. Nội dung giống, danh tính khác.

Hệ quả cần biết: cùng thay đổi giờ tồn tại ở hai chỗ với hai hash. Khi merge `release/1.4` trở lại `main`, Git thấy hai commit khác nhau sửa cùng dòng → **conflict**, dù về mặt nội dung chẳng có gì xung đột.

Vì vậy: cherry-pick tốt cho hotfix đi **một chiều** (main → release). Nếu bạn thấy mình cherry-pick qua lại giữa hai nhánh thường xuyên, thứ bạn cần là merge, không phải cherry-pick.

Khi có conflict:

```bash
git cherry-pick a1b2c3d
# CONFLICT
git status                         # xem file nào
# ... sửa file ...
git add .
git cherry-pick --continue
git cherry-pick --abort            # hoặc bỏ hẳn, về trạng thái trước
```

## `git worktree` — hai nhánh, hai thư mục, cùng một repo

Stash và switch qua lại vẫn mệt khi bạn cần **cả hai nhánh mở cùng lúc** — ví dụ so sánh giao diện cũ và mới, hoặc chạy test nhánh này trong khi code nhánh kia:

```bash
git worktree add ../du-an-hotfix hotfix/loi-thanh-toan
cd ../du-an-hotfix                 # thư mục riêng, đang ở nhánh hotfix
# ... sửa, commit, push ...
cd -
git worktree remove ../du-an-hotfix
```

```bash
git worktree list                  # xem đang có những worktree nào
git worktree add -b sua-nhanh ../thu-nghiem   # tạo nhánh mới luôn
```

Điểm mạnh: chung một `.git` nên không tốn chỗ chép lại lịch sử, và **cây làm việc hiện tại không bị chạm tới** — không cần stash gì cả. Điểm cần lưu ý: `node_modules` không dùng chung được, worktree mới phải `pnpm install` riêng.

Một nhánh chỉ được checkout ở một worktree tại một thời điểm — Git từ chối nếu bạn thử mở cùng nhánh ở hai chỗ.

## Chọn cái nào

| Tình huống | Dùng |
|---|---|
| Rời việc dở vài phút | `stash` |
| Rời việc dở vài ngày | Commit vào nhánh nháp |
| Cần một commit từ nhánh khác | `cherry-pick` |
| Cần hai nhánh mở song song | `worktree` |
| Cherry-pick qua lại thường xuyên | Nghĩ lại — nên merge |

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `stash` mà không có `-u` | File mới không được cất, dễ bị xoá mất | `git stash push -u` |
| Để stash tồn hàng tuần | Quên nó chứa gì, không dám pop | Commit vào nhánh nháp |
| `git stash clear` cho gọn | Mất hết, không hoàn tác được | `drop` từng cái sau khi xem |
| Cherry-pick hai chiều | Conflict vô nghĩa khi merge về sau | Một chiều, hoặc dùng merge |
| Tưởng cherry-pick "di chuyển" commit | Commit gốc vẫn ở nhánh cũ | Nó chép, không chuyển |
| Quên `worktree remove` | Git vẫn giữ tham chiếu tới thư mục đã xoá | `worktree prune` |

## Ghi nhớ

- `stash push -u` mới cất được file chưa track.
- Stash là chỗ tạm tính bằng phút, không phải chỗ lưu trữ.
- Cherry-pick chép commit với hash mới — đi một chiều thôi.
- Worktree cho hai nhánh mở song song mà không cần stash.

## Tự kiểm tra

1. Vì sao `git stash push` không cứu được file bạn vừa tạo?
2. Cherry-pick một commit từ `main` sang `release`, rồi merge `release` vào `main`. Vì sao có conflict?
3. Khi nào worktree tốt hơn stash + switch?
