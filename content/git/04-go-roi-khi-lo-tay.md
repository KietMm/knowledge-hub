---
title: Gỡ rối khi lỡ tay
slug: go-roi-khi-lo-tay
summary: reflog, revert, bisect — bộ ba cứu hộ cho gần như mọi tình huống hoảng loạn với Git.
level: trung-cap
tags: [git, reflog, revert, bisect]
khung: v2
---

> **Sau bài này bạn sẽ:** biết Git gần như không bao giờ mất dữ liệu thật, và có ba lệnh để xử lý mọi tình huống hoảng loạn.

## Ý tưởng chính

Điều quan trọng nhất cần biết khi hoảng: **Git rất khó làm mất dữ liệu đã commit**. Mọi thứ từng được commit đều còn nằm đó ít nhất 30 ngày, kể cả khi nhánh đã bị xoá hay `reset --hard`.

Thứ **thật sự mất được** chỉ là những gì **chưa bao giờ commit**. Nên quy tắc số một khi làm việc mạo hiểm: commit hoặc `stash` trước đã.

## Mental model

Hãy nghĩ tới **camera an ninh trong một toà nhà**.

> Bạn dịch chuyển đồ đạc, xoá biển tên phòng, đập tường — nhưng **camera đã ghi lại mọi vị trí bạn từng đứng**.
>
> `git reflog` là cuốn băng đó. Nó không quan tâm nhánh nào còn nhánh nào mất; nó chỉ ghi: *"lúc 10:03, HEAD ở commit a1b2c3"*.

Người mới tưởng `reset --hard` là xoá vĩnh viễn. Thực ra commit vẫn nằm nguyên trong kho, chỉ là **không còn tờ giấy nhớ nào trỏ tới nó** — và cuốn băng cho bạn địa chỉ của nó.

## Ví dụ nhỏ

```bash
git reflog
```

```text
a1b2c3 HEAD@{0}: reset: moving to HEAD~3      ← chỗ bạn vừa lỡ tay
d4e5f6 HEAD@{1}: commit: thêm tính năng X     ← commit tưởng đã mất
7g8h9i HEAD@{2}: commit: sửa lỗi Y
```

```bash
git reset --hard d4e5f6      # quay lại đúng chỗ trước khi lỡ tay
```

## Code chạy thế nào

Vì sao commit "mất" vẫn còn:

```text
Trước reset:
   A ── B ── C ── D        [main]
                   ▲
                 [HEAD]

Sau git reset --hard HEAD~2:
   A ── B ── C ── D        ← C và D VẪN NẰM TRONG KHO
             ▲
          [main]           ← chỉ có tờ giấy nhớ bị dịch về B
          [HEAD]

reflog vẫn ghi: "HEAD@{1} = D"  ⇒ lấy lại được bằng hash
```

Git chỉ thật sự xoá commit khi chạy dọn rác (`gc`), và nó chỉ dọn thứ **không ai trỏ tới trong hơn 30 ngày**.

## Cú pháp

**`git revert` — hoàn tác an toàn trên nhánh chung:**

```bash
git revert a1b2c3            # tạo commit MỚI đảo ngược thay đổi của a1b2c3
git revert HEAD              # hoàn tác commit gần nhất
git revert -m 1 <merge>      # hoàn tác một merge commit (1 = giữ nhánh chính)
```

```text
reset   →  XOÁ commit khỏi lịch sử   →  chỉ dùng trên nhánh cá nhân
revert  →  THÊM commit đảo ngược      →  an toàn trên nhánh chung
```

Đây là khác biệt phải nhớ: trên nhánh nhiều người dùng, `reset` phá lịch sử của họ; `revert` thì không đụng gì tới quá khứ.

**`git bisect` — tìm commit gây lỗi bằng tìm kiếm nhị phân:**

```bash
git bisect start
git bisect bad                 # commit hiện tại: có lỗi
git bisect good v1.2.0         # phiên bản này: chạy tốt
# Git checkout commit ở giữa → bạn thử → trả lời good/bad
git bisect good                # hoặc: git bisect bad
# ... lặp lại ~log₂(n) lần
git bisect reset               # xong, quay về nhánh cũ
```

Với 1000 commit giữa hai mốc, bisect tìm ra thủ phạm trong **khoảng 10 bước** — vì mỗi câu trả lời loại đi một nửa, đúng như [[sap-xep-va-tim-kiem-nhi-phan]].

Tự động hoá nếu có script kiểm tra:

```bash
git bisect run npm test        # Git tự chạy, tự trả lời, tự tìm ra commit hỏng
```

## Tại sao cần nó

Vì đây là những tình huống bạn **sẽ** gặp, và biết trước thì không mất buổi tối:

| Tình huống | Lệnh |
|---|---|
| Xoá nhầm nhánh chưa merge | `git reflog` → `git switch -c ten <hash>` |
| `reset --hard` nhầm | `git reflog` → `git reset --hard <hash>` |
| Commit nhầm vào `main` | `git branch tn` → `git reset --hard HEAD~1` (khi chưa push) |
| Commit đã push cần hoàn tác | `git revert <hash>` |
| Commit nhầm file bí mật | `git rm --cached` + **đổi khoá ngay** |
| Không biết lỗi từ đâu | `git bisect` |
| Muốn biết ai sửa dòng này | `git blame` |
| Tìm commit từng chứa một chuỗi | `git log -S "chuoi"` |

Hai lệnh điều tra đáng biết:

```bash
git blame -L 10,20 file.ts        # ai sửa dòng 10-20, ở commit nào
git log -S "tinhPhi" --oneline    # commit nào THÊM hoặc XOÁ chuỗi này
git log -p file.ts                # toàn bộ lịch sử thay đổi của một file
```

`git log -S` là công cụ ít người biết nhưng cứu rất nhiều thời gian: nó tìm **theo nội dung thay đổi**, không phải theo thông điệp commit — nên nó tìm được cả những commit có thông điệp vô nghĩa.

## So sánh

| | `reset` | `revert` |
|---|---|---|
| Làm gì | Dịch con trỏ, xoá commit khỏi nhánh | Tạo commit mới đảo ngược |
| Lịch sử | Bị viết lại | Được thêm vào |
| Nhánh chung | ❌ nguy hiểm | ✅ an toàn |
| Cần force push | Có | Không |

## Dễ nhầm

**1. Hoảng và chạy thêm lệnh phá hoại.** Dừng lại. Chạy `git status` và `git reflog` trước — đọc trước khi làm.

**2. `reset --hard` khi có thay đổi chưa commit.** Đây là **cách duy nhất** thật sự mất code. `git stash` trước.

**3. `reset` trên nhánh chung rồi force push.** Đồng nghiệp pull về và lịch sử của họ vỡ.

**4. Tưởng xoá commit là xoá bí mật.** Bí mật đã push là **đã lộ** — có người đã clone, có CI đã log, có bản cache trên máy chủ Git. Xoá lịch sử là việc phụ; **đổi khoá là việc chính**.

**5. Không dùng bisect vì "chắc tôi đoán được".** Với 200 commit, đoán mất cả buổi; bisect mất 8 lần thử.

**6. Quên `git bisect reset`.** Bạn ở lại trạng thái detached HEAD và bối rối vì sao commit không vào nhánh nào.

## Mẹo nhớ

> **`reflog` là camera an ninh: nó ghi mọi chỗ HEAD từng đứng.**
>
> **Chỉ thứ CHƯA commit mới thật sự mất được.**
>
> **Nhánh chung thì `revert`; nhánh riêng thì `reset`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vì sao commit sau `reset --hard` vẫn lấy lại được?
2. Thứ duy nhất Git **không** cứu được là gì?
3. `reset` và `revert` khác nhau thế nào, và mỗi cái dùng ở đâu?
4. `git bisect` cần bạn cung cấp hai mốc nào, và nó chạy bao nhiêu bước với 1000 commit?
5. Bí mật lỡ push lên — việc **chính** phải làm là gì?

## Tự viết lại

Không nhìn lại phần trên, viết lệnh cho từng tình huống:

```text
a) Xoá nhầm nhánh feat/x đã có 5 commit, chưa merge
b) Commit và push một tính năng hỏng lên main hai ngày trước
c) Test bắt đầu đỏ ở đâu đó trong 300 commit gần đây
d) Muốn biết dòng code kỳ lạ này ai viết và vì sao
```

Tự kiểm: câu (b) — vì sao bạn **không** dùng `reset` ở đây?

## Thử sức

Bạn phát hiện `AWS_SECRET_KEY` đã bị commit và push lên repo công khai **ba tuần trước**.

Liệt kê các bước xử lý **theo đúng thứ tự ưu tiên**. Câu hỏi then chốt: việc nào phải làm trong **năm phút đầu**, và vì sao dọn lịch sử Git **không** phải việc đó?
