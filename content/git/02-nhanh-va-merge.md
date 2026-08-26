---
title: Nhánh và merge
slug: nhanh-va-merge
summary: Nhánh chỉ là một con trỏ tới commit — hiểu điều đó thì merge và conflict không còn đáng sợ.
level: co-ban
tags: [git, nhanh, merge, conflict]
khung: v2
---

> **Sau bài này bạn sẽ:** hiểu vì sao tạo nhánh trong Git gần như miễn phí, và xử lý conflict mà không hoảng.

## Ý tưởng chính

Nhánh trong Git **không phải một bản sao thư mục**. Nó là **một file văn bản chứa 40 ký tự** — mã hash của một commit.

Từ sự thật đó suy ra mọi thứ: vì sao tạo nhánh mất 0 giây, vì sao đổi nhánh nhanh, và vì sao "xoá nhánh" không xoá code.

## Mental model

Hãy nghĩ tới **một dãy ảnh xếp thành chuỗi, và những tờ giấy nhớ dán lên**.

```text
   A ── B ── C ── D          ← chuỗi commit (mỗi cái trỏ về cha nó)
             ▲     ▲
          [tinh-nang]  [main]     ← tờ giấy nhớ = nhánh
                        ▲
                      [HEAD]      ← bạn đang đứng ở đâu
```

> **Tạo nhánh** = viết thêm một tờ giấy nhớ. Không chép gì cả.
>
> **Commit** = thêm một ảnh vào chuỗi, và **dịch tờ giấy nhớ** sang ảnh mới.
>
> **Đổi nhánh** = di chuyển `HEAD` sang tờ giấy khác, rồi bày lại bàn tiệc cho khớp.

Người đến từ SVN hình dung nhánh là một thư mục sao chép, nên họ ngại tạo nhánh. Trong Git, ngại tạo nhánh là hiểu sai mô hình.

## Ví dụ nhỏ

```bash
git switch -c tinh-nang/dang-nhap    # tạo và chuyển sang
# ... làm việc, commit ...
git switch main
git merge tinh-nang/dang-nhap
git branch -d tinh-nang/dang-nhap    # xoá TỜ GIẤY NHỚ, các commit vẫn còn
```

## Code chạy thế nào

**Hai kiểu merge**, và Git tự chọn — biết được kiểu nào giúp bạn đọc lịch sử:

```text
① FAST-FORWARD — main không đi đâu từ lúc tách nhánh

trước:   A ── B ── C          sau:   A ── B ── C
              ▲     ▲                            ▲
           [main] [tn]                     [main][tn]

Git chỉ DỊCH tờ giấy [main] tới chỗ [tn]. Không tạo commit mới.
```

```text
② MERGE COMMIT — cả hai nhánh đều có commit mới

trước:        D ── E   [tn]         sau:      D ── E
             ╱                               ╱       ╲
   A ── B ── C ── F   [main]      A ── B ── C ── F ── M   [main]
                                                       ▲
                                        M có HAI cha: F và E
```

`M` là commit hợp nhất — nó ghi lại rằng hai dòng công việc gặp nhau tại đây.

```bash
git merge tn                # tự chọn kiểu
git merge --no-ff tn        # LUÔN tạo merge commit — giữ dấu vết nhánh tính năng
git merge --squash tn       # gộp mọi commit của tn thành MỘT, không có cha thứ hai
```

## Cú pháp

Conflict xảy ra khi **hai nhánh sửa cùng một vùng của cùng một file**:

```text
<<<<<<< HEAD
const gioiHan = 100          ← phiên bản trên nhánh HIỆN TẠI
=======
const gioiHan = 200          ← phiên bản của nhánh ĐANG MERGE VÀO
>>>>>>> tinh-nang
```

```bash
# 1. Mở file, sửa lại cho đúng, XOÁ hết dấu <<<<, ====, >>>>
# 2. git add <file>
# 3. git commit          (Git tự soạn sẵn thông điệp)

git merge --abort        # bỏ cuộc, quay lại như chưa merge
```

Điểm quan trọng: **Git không biết ý bạn**. Nó chỉ nói *"hai bên đổi cùng chỗ, bạn quyết định"*. Có khi đáp án đúng không phải bên nào cả mà là một cách viết thứ ba.

## Tại sao cần nó

Vì hiểu "nhánh là con trỏ" thay đổi cách bạn làm việc:

**Tạo nhánh cho mọi việc.** Nó miễn phí. Một nhánh cho một tính năng, một bug, một thử nghiệm — và nhánh chính luôn ở trạng thái chạy được.

**Xoá nhánh không mất gì.** `git branch -d` chỉ gỡ tờ giấy nhớ. Commit vẫn nằm đó, và `git reflog` tìm lại được — xem [[go-roi-khi-lo-tay]].

**Tránh conflict bằng thói quen, không bằng may mắn:**

```text
① Nhánh ngắn — vài ngày, không phải vài tuần
② Cập nhật thường xuyên từ nhánh chính (merge hoặc rebase)
③ Chia file theo tính năng, đừng để một file khổng lồ ai cũng phải sửa
```

Điểm ③ ít người nghĩ tới nhưng hiệu quả nhất: conflict là **triệu chứng của thiết kế**, không chỉ của quy trình. File 2000 dòng mà cả đội cùng sửa sẽ conflict mãi mãi — cùng vấn đề với [[ket-dinh-cao-lien-ket-long]].

Làm việc với remote:

```bash
git fetch origin            # tải về, KHÔNG đụng vào nhánh của bạn
git pull                    # = fetch + merge  ← có thể tạo merge commit bất ngờ
git pull --rebase           # = fetch + rebase ← lịch sử thẳng hơn
git push -u origin ten      # đẩy lần đầu và ghi nhớ nhánh theo dõi
```

`git fetch` rồi `git log origin/main` là thói quen tốt: bạn **xem** trước khi hợp nhất, thay vì để `pull` tự quyết.

## So sánh

| Kiểu gộp | Lịch sử | Dùng khi |
|---|---|---|
| Fast-forward | Thẳng, không dấu vết nhánh | Nhánh nhỏ, một commit |
| Merge commit | Rẽ nhánh rồi gặp lại | Muốn thấy rõ ranh giới tính năng |
| Squash | Một commit duy nhất | Nhánh có nhiều commit "wip", chỉ cần kết quả |

Nhiều đội chọn **squash khi gộp PR**: nhánh chính chỉ còn một commit sạch cho mỗi tính năng, và lịch sử đọc được như một danh sách thay đổi.

## Dễ nhầm

**1. Tưởng xoá nhánh là mất code.** Không — chỉ mất tờ giấy nhớ.

**2. Nhánh sống quá lâu.** Ba tuần không cập nhật từ `main` thì lúc merge bạn có 40 conflict. Cập nhật vài ngày một lần.

**3. Giải quyết conflict bằng cách chọn bừa một bên.** Đọc kỹ **cả hai** và hiểu ý định của từng bên; có khi phải viết cách thứ ba.

**4. Quên xoá dấu `<<<<<<<`.** Code vẫn commit được và sẽ nổ lúc chạy — chạy test trước khi commit merge.

**5. `git pull` mù quáng.** Nó merge ngay lập tức. `git fetch` rồi xem trước thì bạn không bị bất ngờ.

**6. Đặt tên nhánh vô nghĩa.** `test`, `fix`, `new` — sau ba tháng không ai biết chúng là gì. Dùng `feat/dang-nhap-google`, `fix/tinh-phi-sai`.

## Mẹo nhớ

> **Nhánh là tờ giấy nhớ dán lên một commit.**
>
> **Merge commit có HAI cha; fast-forward chỉ dịch giấy nhớ.**
>
> **Conflict nhiều là triệu chứng của nhánh dài hoặc file quá to.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Một nhánh Git thực chất là gì về mặt dữ liệu?
2. Khi nào Git dùng fast-forward, khi nào tạo merge commit?
3. Merge commit khác commit thường ở điểm nào?
4. Vì sao xoá nhánh không mất code?
5. Ba cách giảm conflict, và cách nào liên quan tới thiết kế code?

## Tự viết lại

Không nhìn lại phần trên, vẽ trạng thái các con trỏ sau mỗi bước:

```bash
git switch -c tn        # từ main đang ở commit C
# commit D
# ai đó push commit E lên main
git switch main
git pull
git merge tn
```

Tự kiểm: sau lệnh cuối, có tạo merge commit không? Vì sao?

## Thử sức

Bạn merge nhánh `tn` vào `main` và gặp 25 file conflict. Sau hai giờ giải quyết, bạn nghi ngờ mình đã làm mất một thay đổi của người khác.

Nêu **cách kiểm chứng** điều đó bằng Git — bạn so cái gì với cái gì? Rồi trả lời câu quan trọng hơn: **thay đổi gì trong quy trình** để lần sau không rơi vào tình huống 25 file conflict?
