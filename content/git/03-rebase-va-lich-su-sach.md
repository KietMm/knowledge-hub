---
title: Rebase và lịch sử sạch
slug: rebase-va-lich-su-sach
summary: Rebase viết lại lịch sử để nó thẳng và đọc được — kèm quy tắc vàng để không phá việc của người khác.
level: trung-cap
tags: [git, rebase, lich-su]
khung: v2
---

> **Sau bài này bạn sẽ:** dùng được rebase để dọn nhánh trước khi mở PR, và biết chính xác khi nào rebase là **cấm kỵ**.

## Ý tưởng chính

Merge **ghi lại** lịch sử đã xảy ra: hai nhánh gặp nhau ở đây. Rebase **viết lại** lịch sử: giả vờ như bạn bắt đầu làm việc từ commit mới nhất.

Cả hai đều hợp lệ. Nhưng vì rebase **tạo ra commit mới** (hash khác), nó có một quy tắc không được vi phạm.

## Mental model

Hãy nghĩ tới **viết lại một bản nháp**.

> Merge là **ghi chú vào lề**: *"đoạn này tôi viết song song với chương 3, rồi ghép vào"*. Trung thực, nhưng bản thảo đầy ghi chú.
>
> Rebase là **chép lại cả đoạn cho liền mạch**, như thể bạn viết nó sau chương 3 ngay từ đầu. Đẹp hơn — nhưng nếu ai đó đang đọc bản cũ, họ sẽ lạc.

Câu cuối chính là **quy tắc vàng**: chép lại bản nháp của riêng bạn thì được; chép lại bản mà người khác đang cầm thì không.

## Ví dụ nhỏ

```text
TRƯỚC rebase                       SAU rebase
        D ── E  [tn]                              D' ── E'  [tn]
       ╱                                         ╱
A ── B ── C ── F  [main]        A ── B ── C ── F  [main]
```

`D'` và `E'` là **commit mới** — cùng nội dung, khác hash. Đó là toàn bộ điểm mấu chốt của bài này.

## Code chạy thế nào

```bash
git switch tn
git rebase main
```

```text
Git làm ba việc:
① Tạm cất D và E ra một chỗ
② Dịch [tn] tới F (commit mới nhất của main)
③ Áp lại D rồi E lên trên F, mỗi cái tạo một commit MỚI

Nếu áp D bị conflict:
   sửa file → git add → git rebase --continue
   bỏ cuộc:  git rebase --abort
```

Vì mỗi commit được áp lại lần lượt, bạn có thể phải giải **nhiều conflict liên tiếp** — mỗi commit một lần, thay vì một lần duy nhất như merge. Đây là cái giá thật của rebase.

## Cú pháp

**Quy tắc vàng:**

> **Không bao giờ rebase một nhánh mà người khác đang dùng.**

Vì hash đổi, người khác pull về sẽ thấy hai bản của cùng một công việc, và họ phải tự gỡ. An toàn khi: nhánh chỉ mình bạn dùng, hoặc cả đội đã thống nhất.

**Interactive rebase** — dọn dẹp trước khi mở PR:

```bash
git rebase -i main
```

```text
pick a1b2c3 thêm form đăng nhập
squash d4e5f6 fix lỗi chính tả          ← gộp vào commit trên
squash 7g8h9i fix nữa                    ← gộp tiếp
reword j1k2l3 thêm validate              ← sửa lại thông điệp
drop  m3n4o5 thử nghiệm bỏ đi            ← xoá hẳn
```

```text
pick    giữ nguyên
reword  giữ code, sửa thông điệp
squash  gộp vào commit phía trên, gộp cả thông điệp
fixup   như squash nhưng VỨT thông điệp
drop    bỏ commit
```

Đây là chỗ rebase có giá trị rõ nhất: bạn làm việc với 12 commit lộn xộn (`wip`, `fix`, `fix nữa`), rồi biến chúng thành 3 commit sạch trước khi ai đó phải review.

## Tại sao cần nó

**Push sau khi rebase** cần lệnh đặc biệt, và có một biến thể an toàn hơn hẳn:

```bash
git push --force-with-lease     # ✅ từ chối nếu remote có commit bạn CHƯA thấy
git push --force                # ❌ ghi đè bất chấp — có thể xoá việc của người khác
```

`--force-with-lease` kiểm tra rằng nhánh remote vẫn ở đúng chỗ bạn nghĩ. Nếu đồng nghiệp vừa push thêm, lệnh sẽ **từ chối** thay vì xoá mất việc của họ. Hãy đặt nó thành thói quen mặc định.

**`git pull --rebase`** — tránh merge commit rác:

```bash
git pull                # tạo merge commit "Merge branch 'main' of..."
git pull --rebase       # ✅ áp commit của bạn lên trên, lịch sử thẳng
git config --global pull.rebase true    # đặt mặc định
```

Những merge commit "Merge branch 'main'" lặp đi lặp lại làm lịch sử rối mà không mang thông tin gì.

**`git cherry-pick`** — lấy đúng một commit sang nhánh khác:

```bash
git cherry-pick a1b2c3
```

Dùng khi: hotfix cần đưa cả vào `main` lẫn nhánh phát hành. **Không** dùng thay cho merge — cherry-pick nhiều commit là dấu hiệu bạn đang làm sai quy trình.

## So sánh

| | Merge | Rebase |
|---|---|---|
| Lịch sử | Có nhánh rẽ, trung thực | Thẳng, dễ đọc |
| Hash commit | Giữ nguyên | **Đổi** |
| An toàn trên nhánh chung | ✅ | ❌ |
| Conflict | Một lần | Có thể nhiều lần liên tiếp |
| Dấu vết "tính năng này gồm những commit nào" | Còn | Mất |

Chiến lược thực dụng của phần lớn đội:

```text
Nhánh cá nhân, chưa push  →  rebase thoải mái, dọn cho sạch
Nhánh đã push, chỉ mình dùng →  rebase + push --force-with-lease
Nhánh chung (main, develop) →  KHÔNG BAO GIỜ rebase
Gộp PR vào main             →  squash merge
```

## Dễ nhầm

**1. Rebase nhánh chung.** Vi phạm quy tắc vàng. Cả đội phải đi sửa lịch sử của họ.

**2. `git push --force` thay vì `--force-with-lease`.** Bạn xoá mất commit của đồng nghiệp vừa push, và không có cảnh báo nào.

**3. Rebase nhánh có nhiều commit và nhiều conflict.** Bạn giải cùng một conflict năm lần liên tiếp. Lúc đó `merge` một lần rẻ hơn nhiều.

**4. Squash mọi thứ thành một commit khổng lồ.** Bạn mất khả năng `revert` từng phần và `bisect` mất độ phân giải. Squash để **gộp commit rác**, không phải để gộp mọi thứ.

**5. Quên `--continue` sau khi giải conflict.** Rebase đứng giữa chừng, và `git status` sẽ nhắc bạn — hãy đọc nó.

**6. Rebase khi chưa hiểu mình đang ở đâu.** `git log --oneline --graph --all` trước, để nhìn thấy hình dạng thật của lịch sử.

## Mẹo nhớ

> **Merge ghi chú vào lề; rebase chép lại cho liền mạch.**
>
> **Rebase tạo commit MỚI ⇒ đừng rebase thứ người khác đang cầm.**
>
> **Luôn `--force-with-lease`, không bao giờ `--force`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao rebase làm hash commit thay đổi, và hệ quả là gì?
2. Quy tắc vàng của rebase, và lý do đằng sau nó?
3. `--force-with-lease` bảo vệ bạn khỏi điều gì mà `--force` thì không?
4. Bốn lệnh trong interactive rebase và mỗi cái làm gì?
5. Khi nào merge là lựa chọn tốt hơn rebase?

## Tự viết lại

Không nhìn lại phần trên, viết chuỗi lệnh cho tình huống:

```text
Nhánh của bạn có 7 commit: 3 commit thật, 4 commit "fix typo".
main đã đi thêm 5 commit từ lúc bạn tách nhánh.
Bạn muốn: nhánh cập nhật theo main, còn 3 commit sạch, rồi push lên PR đã mở.
```

Tự kiểm: lệnh push cuối cùng của bạn là gì, và vì sao **không** dùng `--force` trần?

## Thử sức

Đồng nghiệp báo: *"tôi pull về thì thấy nhánh của tôi có hai bản của cùng những commit, git log rối tung"*.

Chẩn đoán chuyện gì đã xảy ra. Rồi trả lời hai câu: bạn hướng dẫn họ **gỡ** thế nào, và **ai** đã làm sai — người rebase hay người pull?
