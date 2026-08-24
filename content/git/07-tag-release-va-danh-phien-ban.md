---
title: Tag, release và đánh phiên bản
slug: tag-release-va-danh-phien-ban
summary: Tag nhẹ và tag có chú thích, semantic versioning, và cách sinh changelog từ chính commit.
level: trung-cap
tags: [git, tag, release, semver]
---

> **Sau bài này bạn sẽ:** đánh dấu một phiên bản đúng cách, và chọn được số phiên bản mà người dùng thư viện tin được.

## Tag là cái tên gắn vào một commit

Nhánh di chuyển theo commit mới; tag **đứng yên mãi**. Đó là lý do tag dùng để nói "đây chính xác là thứ đã phát hành".

Hai loại, và bạn nên luôn dùng loại thứ hai:

```bash
git tag v1.2.0                                  # nhẹ: chỉ là con trỏ
git tag -a v1.2.0 -m "Thêm xuất PDF"            # có chú thích: là một object thật
```

Tag có chú thích lưu **người tạo, thời điểm, thông điệp**, và ký được bằng GPG. Tag nhẹ không có gì cả — sáu tháng sau bạn không biết ai đánh, lúc nào, vì sao.

```bash
git tag                            # liệt kê
git tag -l 'v1.*'                  # lọc theo mẫu
git show v1.2.0                    # xem tag và commit nó trỏ tới
git tag -d v1.2.0                  # xoá cục bộ
```

**Tag không tự đi theo `git push`:**

```bash
git push origin v1.2.0             # đẩy một tag
git push --tags                    # đẩy mọi tag
git push --follow-tags             # đẩy commit + tag có chú thích (an toàn nhất)
```

Đây là lý do phổ biến nhất của "tôi đã tag rồi mà CI không chạy build release".

## Semantic Versioning

`MAJOR.MINOR.PATCH` — quy tắc là một **lời hứa** với người dùng:

| Tăng | Khi nào | Người dùng phải làm gì |
|---|---|---|
| `PATCH` 1.2.**0**→1.2.**1** | Sửa bug, tương thích hoàn toàn | Cập nhật thẳng |
| `MINOR` 1.**2**→1.**3**.0 | Thêm tính năng, vẫn tương thích | Cập nhật thẳng |
| `MAJOR` **1**→**2**.0.0 | Phá vỡ tương thích | Đọc hướng dẫn di chuyển, sửa code |

Câu hỏi duy nhất cần trả lời: **code đang dùng phiên bản cũ có còn chạy không?** Không → `MAJOR`. Đây là cùng một câu hỏi ở [[loi-versioning-va-tai-lieu]] cho API.

Ba điểm hay bị hiểu sai:

- `0.x.y` — mọi thứ đều có thể đổi, kể cả ở `MINOR`. Đừng dựa vào `^0.3.1` mà nghĩ mình an toàn.
- Xoá một tham số **tuỳ chọn** vẫn là phá vỡ, nếu có ai đang truyền nó.
- Sửa bug mà có người đang phụ thuộc vào hành vi sai đó thì vẫn nên là `MINOR` trở lên.

## Quy trình phát hành

```bash
# 1. Chốt nhánh chính đã xanh
git switch main && git pull

# 2. Cập nhật số phiên bản trong package.json + CHANGELOG
#    npm version tự sửa package.json, commit, VÀ tạo tag có chú thích
npm version minor -m "chore(release): v%s"

# 3. Đẩy cả commit lẫn tag
git push --follow-tags
```

Thứ tự quan trọng: tag **sau** khi đã cập nhật số phiên bản trong file. Tag trước thì `v1.3.0` trỏ vào commit mà `package.json` vẫn ghi `1.2.0` — và mọi công cụ đọc từ file sẽ nói sai.

## Changelog sinh từ commit

Đây là chỗ Conventional Commits trả công. Với thông điệp có tiền tố nhất quán:

```
feat: thêm xuất PDF
fix: sửa lỗi tính tổng đơn khi có giảm giá
feat!: bỏ endpoint /api/v1/users      ← dấu ! = phá vỡ tương thích
chore: nâng phiên bản eslint
```

thì số phiên bản kế tiếp **suy ra được bằng máy**: có `feat!` → MAJOR, có `feat` → MINOR, chỉ có `fix` → PATCH.

```bash
# Xem những gì đã vào kể từ tag trước
git log v1.2.0..HEAD --oneline --no-merges

# Nhóm theo loại
git log v1.2.0..HEAD --pretty='%s' --no-merges | grep '^feat' | sed 's/^feat: /- /'
```

`git describe` cho bạn "phiên bản hiện tại" ở bất kỳ commit nào — hữu ích để nhúng vào bản build:

```bash
git describe --tags              # v1.2.0-14-gf4e5d6c
#                                  ↑tag  ↑14 commit sau  ↑hash hiện tại
```

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Quên `git push` tag | CI không chạy build release | `git push --follow-tags` |
| Dùng tag nhẹ | Không biết ai tag, lúc nào, vì sao | `git tag -a` |
| Sửa/di chuyển tag đã đẩy | Người khác đã tải bản cũ với cùng tên | Tag mới, không sửa tag cũ |
| Tag trước khi cập nhật `package.json` | Số phiên bản trong file lệch với tag | Cập nhật rồi mới tag |
| Tăng `MINOR` cho thay đổi phá vỡ | Người dùng vỡ code khi `pnpm update` | Đó là `MAJOR` |
| Tag một commit chưa chạy CI | Phát hành bản chưa test | Chỉ tag commit đã xanh |
| Đặt tên tag không nhất quán (`v1.2` rồi `1.3.0`) | Script sắp xếp/so sánh phiên bản sai | Một quy ước, giữ mãi |

## Ghi nhớ

- Nhánh di chuyển, tag đứng yên — tag là thứ nói "chính xác bản này đã phát hành".
- Luôn `git tag -a`; tag phải đẩy riêng hoặc dùng `--follow-tags`.
- `MAJOR` khi code cũ không còn chạy. Đó là toàn bộ quy tắc.
- Commit có tiền tố nhất quán thì changelog và số phiên bản sinh được bằng máy.

## Tự kiểm tra

1. Vì sao tag có chú thích tốt hơn tag nhẹ?
2. Bạn xoá một tham số tuỳ chọn của hàm public. MAJOR hay MINOR?
3. Tag `v1.3.0` trước khi sửa `package.json`. Hậu quả cụ thể là gì?
