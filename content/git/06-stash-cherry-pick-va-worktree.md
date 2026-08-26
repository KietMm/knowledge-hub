---
title: Stash, cherry-pick và worktree
slug: stash-cherry-pick-va-worktree
summary: Ba công cụ để chuyển việc giữa đường mà không tạo commit rác hay mất code.
level: trung-cap
tags: [git, stash, cherry-pick, worktree]
khung: v2
---

> **Sau bài này bạn sẽ:** chuyển việc giữa chừng mà không tạo commit "wip" rác, và biết chọn đúng một trong ba công cụ cho từng tình huống.

## Ý tưởng chính

Tình huống ai cũng gặp: đang làm dở một tính năng thì có bug gấp cần sửa ngay. Code hiện tại chưa xong, không commit được, mà `git switch` thì Git từ chối.

Ba công cụ giải quyết ba biến thể của tình huống đó — và chọn sai thì bạn tạo ra commit rác hoặc mất code.

## Mental model

Ba hình ảnh, mỗi cái một câu:

> **`stash` là ngăn kéo bàn làm việc.** Gạt hết đồ đang bày vào ngăn kéo, làm việc khác, rồi mở ngăn kéo bày lại. Nhanh, nhưng **ngăn kéo chung một cái** — cất nhiều thứ vào là quên cái nào là cái nào.
>
> **`cherry-pick` là photocopy một trang** từ tập hồ sơ này sang tập khác. Lấy đúng một commit, không lấy cả nhánh.
>
> **`worktree` là mở thêm một bàn làm việc thứ hai**, cùng dùng chung kho hồ sơ. Hai nhánh mở cùng lúc, ở hai thư mục khác nhau, không ai phải dọn bàn.

## Ví dụ nhỏ

```bash
# Đang làm dở, có bug gấp
git stash push -m "form đăng nhập làm dở"
git switch main
# ... sửa bug, commit, push ...
git switch tinh-nang/dang-nhap
git stash pop                       # bày lại đúng như lúc cất
```

## Code chạy thế nào

`stash` không phải "cất tạm ở đâu đó" — nó **tạo commit thật** trên một nhánh ẩn:

```text
git stash push
  → tạo một commit chứa nội dung bàn tiệc + khung hình
  → gắn nó vào refs/stash
  → dọn sạch working directory về như HEAD

git stash pop
  → áp commit đó trở lại
  → XOÁ khỏi danh sách stash        ← khác apply
```

```bash
git stash list                      # xem có gì trong ngăn kéo
git stash apply stash@{1}           # áp nhưng GIỮ trong danh sách
git stash pop                       # áp và xoá khỏi danh sách
git stash push -u                   # cất cả file CHƯA được theo dõi
git stash drop stash@{0}
git stash branch tn-moi             # tạo nhánh mới TỪ stash — cách gỡ conflict gọn nhất
```

`-u` là cờ hay bị quên: file mới tạo mà chưa `git add` thì `stash` **không cất**, và bạn tưởng đã cất hết.

## Cú pháp

**`cherry-pick`** — lấy đúng một commit sang nhánh khác:

```bash
git cherry-pick a1b2c3
git cherry-pick a1b2c3^..d4e5f6     # một dải commit
git cherry-pick -n a1b2c3           # áp vào khung hình, chưa commit
git cherry-pick --abort             # bỏ khi conflict
```

Dùng đúng chỗ: hotfix cần có mặt ở cả `main` lẫn nhánh phát hành đang chạy.

```text
main    ──●──●──[fix]──►
              ╲
release ──●────[fix']──►     ← cherry-pick sang, tạo commit MỚI (hash khác)
```

**`worktree`** — hai nhánh, hai thư mục, một repo:

```bash
git worktree add ../du-an-hotfix main    # tạo thư mục mới đang ở nhánh main
cd ../du-an-hotfix                        # sửa bug ở đây
# thư mục gốc vẫn nguyên trạng, không phải stash gì cả

git worktree list
git worktree remove ../du-an-hotfix
```

Ưu điểm lớn nhất mà ít người biết: `node_modules`, tiến trình `dev` đang chạy, trạng thái build của thư mục gốc **không bị đụng tới**. Với dự án lớn, việc đó tiết kiệm nhiều phút mỗi lần chuyển việc.

## Tại sao cần nó

Vì mỗi công cụ hợp một tình huống, và dùng sai thì có giá:

| Tình huống | Dùng | Vì sao |
|---|---|---|
| Chuyển nhánh 10 phút rồi quay lại | `stash` | Nhanh nhất, không tạo commit |
| Cần sửa hotfix trong khi vẫn chạy dev cho tính năng | `worktree` | Không phải dọn bàn, không mất `node_modules` |
| Lấy một commit từ nhánh khác | `cherry-pick` | Chỉ lấy đúng cái cần |
| Cất việc nhiều ngày | **Commit vào nhánh riêng** | Stash không có tên rõ, dễ quên |

Dòng cuối quan trọng: `stash` là chỗ **tạm** tính bằng giờ. Cất việc nhiều ngày ở đó thì bạn sẽ có `stash@{7}` và không nhớ cái nào là cái nào — commit vào một nhánh có tên rẻ hơn nhiều.

## So sánh

| | `stash` | `worktree` | nhánh + commit |
|---|---|---|---|
| Tốc độ | Tức thì | Vài giây (tạo thư mục) | Nhanh |
| Giữ `node_modules`, tiến trình dev | ❌ dùng chung một thư mục | ✅ tách hẳn | ❌ |
| Có tên rõ ràng | Chỉ có message | ✅ tên nhánh | ✅ |
| Chia sẻ được với người khác | ❌ chỉ ở máy bạn | ❌ | ✅ push được |
| Hợp cho | Vài phút | Vài giờ, chạy song song | Vài ngày |

## Dễ nhầm

**1. Quên `-u` khi có file mới.** File chưa được theo dõi **không** vào stash. Bạn `switch` nhánh và thấy file lạ nằm lại, hoặc tưởng đã cất mà chưa.

**2. `stash pop` khi có conflict.** Stash vẫn còn trong danh sách (pop không xoá nếu conflict). Giải conflict xong nhớ `git stash drop`.

**3. Dùng stash làm nơi lưu trữ dài hạn.** Không có tên, không push được, và `git stash clear` một cái là mất sạch.

**4. Cherry-pick nhiều commit thay vì merge.** Bạn tạo ra bản sao của cả một nhánh với hash khác, và sau này merge nhánh gốc sẽ conflict với chính bản sao đó.

**5. Quên rằng cherry-pick tạo commit mới.** Hash khác nghĩa là Git **không biết** hai commit là một. Đây là lý do cherry-pick qua lại nhiều lần gây rối.

**6. Xoá thư mục worktree bằng `rm -rf`.** Git vẫn giữ đăng ký. Dùng `git worktree remove`, hoặc `git worktree prune` để dọn.

## Mẹo nhớ

> **Ngăn kéo (stash) · photocopy một trang (cherry-pick) · bàn làm việc thứ hai (worktree).**
>
> **`stash` tính bằng giờ; việc nhiều ngày thì commit vào nhánh có tên.**
>
> **`stash -u` nếu có file mới.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `stash` thực chất lưu dữ liệu ở đâu?
2. `stash pop` và `stash apply` khác nhau ở chỗ nào?
3. Vì sao `-u` quan trọng, và bỏ quên nó gây hậu quả gì?
4. Ưu điểm của `worktree` mà `stash` không có?
5. Vì sao cherry-pick nhiều commit là dấu hiệu quy trình sai?

## Tự viết lại

Không nhìn lại phần trên, chọn công cụ và viết lệnh cho từng tình huống:

```text
a) Đang gõ dở, sếp nhờ xem nhanh một PR (5 phút)
b) Bug production cần sửa gấp, tính năng đang làm dở chạy dev mất 3 phút khởi động lại
c) Commit sửa lỗi bảo mật ở main cần đưa vào nhánh release/1.2 đang chạy
d) Sắp đi nghỉ 2 tuần, việc đang làm dở
```

Tự kiểm: câu (d) — vì sao **không** dùng stash?

## Thử sức

Bạn `git stash` ba lần trong một buổi, rồi `git stash pop` và gặp conflict. Sau khi giải xong, `git stash list` vẫn hiện ba mục.

Giải thích vì sao còn ba mục, và cách xác định **mục nào đã được áp** — bạn kiểm bằng lệnh gì? Rồi trả lời: thói quen nào ngăn được tình huống rối này ngay từ đầu?
