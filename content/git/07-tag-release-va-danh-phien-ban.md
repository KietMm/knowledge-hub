---
title: Tag, release và đánh phiên bản
slug: tag-release-va-danh-phien-ban
summary: Tag nhẹ và tag có chú thích, semantic versioning, và cách sinh changelog từ chính commit.
level: trung-cap
tags: [git, tag, release, semver]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc một số phiên bản là biết nâng cấp có rủi ro không, và sinh được changelog tự động từ chính thông điệp commit.

## Ý tưởng chính

Tag là **cái tên gắn vĩnh viễn vào một commit** — khác nhánh ở chỗ nó không bao giờ di chuyển.

Và số phiên bản không phải con số cho đẹp. Với semantic versioning, nó là **một lời hứa với người dùng** về mức độ rủi ro khi nâng cấp.

## Mental model

Hãy nghĩ tới **cột mốc trên đường** so với **tấm biển chỉ đường**.

> **Nhánh là tấm biển chỉ đường** — nó di chuyển theo bạn, luôn trỏ tới chỗ mới nhất.
>
> **Tag là cột mốc chôn xuống đất** — cắm ở km 42 thì mãi mãi ở km 42. Ai quay lại `v1.2.0` cũng thấy đúng thứ bạn phát hành hôm đó.

Và số trên cột mốc có nghĩa cụ thể:

```text
v  2  .  4  .  1
   │     │     └── PATCH: sửa lỗi, an toàn nâng cấp
   │     └──────── MINOR: thêm tính năng, cũ vẫn chạy
   └────────────── MAJOR: có thay đổi PHÁ VỠ, phải đọc kỹ trước khi nâng
```

Nhìn `2.4.1 → 2.5.0` là biết nâng được ngay. Nhìn `2.4.1 → 3.0.0` là biết phải đọc ghi chú phát hành.

## Ví dụ nhỏ

```bash
git tag v1.0.0                              # tag nhẹ — chỉ là cái tên
git tag -a v1.0.0 -m "Bản phát hành đầu"    # ✅ tag có chú thích
git push origin v1.0.0                      # tag KHÔNG tự push
```

## Code chạy thế nào

Hai loại tag khác nhau ở chỗ **có phải một object thật không**:

```text
Tag NHẸ:
  refs/tags/v1.0.0  ──►  commit a1b2c3
  (chỉ là một con trỏ, không có gì thêm)

Tag CÓ CHÚ THÍCH:
  refs/tags/v1.0.0  ──►  tag object  ──►  commit a1b2c3
                          │
                          ├─ người tạo
                          ├─ thời gian
                          ├─ thông điệp
                          └─ chữ ký GPG (nếu có)
```

Vì tag có chú thích là object thật, nó ghi lại **ai phát hành, lúc nào, và vì sao** — thông tin bạn sẽ cần khi truy vết một sự cố sáu tháng sau. Với bản phát hành, luôn dùng `-a`.

## Cú pháp

```bash
git tag                          # liệt kê
git tag -l "v1.*"                # lọc
git show v1.0.0                  # xem chi tiết
git push origin --tags           # đẩy TẤT CẢ tag
git tag -d v1.0.0                # xoá local
git push origin :refs/tags/v1.0.0  # xoá trên remote

git describe --tags              # v1.2.0-14-ga1b2c3
                                 # ↑ tag gần nhất, cách 14 commit, hash hiện tại
```

`git describe` rất hữu ích để nhúng phiên bản vào chính ứng dụng: người dùng báo lỗi kèm chuỗi đó là bạn biết chính xác họ đang chạy commit nào.

## Tại sao cần nó

Vì **changelog sinh được từ commit** nếu bạn viết thông điệp có cấu trúc:

```text
feat: thêm đăng nhập Google      →  MINOR (thêm tính năng)
fix: sửa lỗi tính phí             →  PATCH (sửa lỗi)
feat!: đổi định dạng API          →  MAJOR (dấu ! = phá vỡ)

BREAKING CHANGE: trường `name` đổi thành `fullName`
```

```bash
npx changelogen                  # đọc commit, sinh CHANGELOG.md
npx semantic-release             # tự tính phiên bản, tag, và phát hành
```

Đây là lý do thật của Conventional Commits: nó không phải quy tắc cho đẹp, nó là **dữ liệu có cấu trúc** để máy tự tính phiên bản và viết ghi chú phát hành.

Quy trình phát hành điển hình:

```bash
git switch main && git pull
pnpm test && pnpm build                 # ① kiểm tra trước
npm version minor                       # ② nâng package.json + tạo tag
git push --follow-tags                  # ③ đẩy cả commit lẫn tag
```

Bước ③ dùng `--follow-tags` thay vì `--tags`: nó chỉ đẩy tag có chú thích gắn với commit đang push, không đẩy nhầm những tag thử nghiệm ở local.

## So sánh

| | Tag nhẹ | Tag có chú thích |
|---|---|---|
| Lưu ai tạo, khi nào | ❌ | ✅ |
| Có thông điệp | ❌ | ✅ |
| Ký GPG được | ❌ | ✅ |
| Dùng cho | Đánh dấu tạm ở local | **Mọi bản phát hành** |

| Thay đổi | Nâng số nào |
|---|---|
| Sửa lỗi, không đổi giao diện | PATCH |
| Thêm tính năng, cũ vẫn chạy | MINOR |
| Xoá/đổi tên API, đổi hành vi | MAJOR |
| Đổi tài liệu, refactor nội bộ | Không nâng |

## Dễ nhầm

**1. Quên push tag.** `git push` **không** đẩy tag. Bản phát hành có ở máy bạn mà không ai thấy.

**2. Dùng tag nhẹ cho bản phát hành.** Mất thông tin ai phát hành và vì sao.

**3. Di chuyển hoặc xoá tag đã phát hành.** Người khác đã tải về `v1.2.0`; đổi nội dung của nó nghĩa là hai người cùng nói "v1.2.0" mà chạy hai thứ khác nhau. Muốn sửa thì phát hành `v1.2.1`.

**4. Nâng MAJOR vì "thay đổi lớn".** MAJOR không đo công sức — nó đo **phá vỡ tương thích**. Viết lại toàn bộ mà API giữ nguyên thì vẫn là MINOR.

**5. Không nâng MAJOR khi đã phá vỡ.** Tệ hơn nhiều: người dùng nâng cấp theo `^1.2.0` và ứng dụng của họ vỡ giữa đêm.

**6. Tag nhánh sai.** Luôn tag trên `main` sau khi đã gộp, không tag trên nhánh tính năng.

## Mẹo nhớ

> **Nhánh là biển chỉ đường (di chuyển); tag là cột mốc (đứng yên mãi).**
>
> **MAJOR đo mức PHÁ VỠ, không đo công sức.**
>
> **`git push` không đẩy tag — dùng `--follow-tags`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Tag khác nhánh ở điểm cơ bản nào?
2. Tag nhẹ và tag có chú thích khác nhau về **dữ liệu lưu lại**?
3. Ba số trong `2.4.1` nói gì với người dùng?
4. Vì sao viết lại toàn bộ thư viện mà giữ nguyên API vẫn chỉ là MINOR?
5. Vì sao không được xoá hoặc di chuyển tag đã phát hành?

## Tự viết lại

Không nhìn lại phần trên, quyết định số phiên bản tiếp theo (đang ở `2.3.1`) cho từng thay đổi:

```text
a) Sửa lỗi tính sai phí ở đơn trên 500k
b) Thêm tham số tuỳ chọn vào một hàm public
c) Đổi tên hàm `getUser` thành `fetchUser`
d) Tối ưu tốc độ truy vấn, kết quả không đổi
e) Xoá một tham số không ai dùng khỏi API công khai
```

Tự kiểm: câu (e) — "không ai dùng" có phải lý do đủ để không nâng MAJOR không?

## Thử sức

Bạn phát hành `v2.0.0` với một thay đổi phá vỡ. Ba ngày sau, một khách hàng lớn báo họ không thể nâng cấp trong sáu tháng tới, nhưng cần bản vá lỗi bảo mật vừa tìm ra.

Mô tả **chiến lược nhánh và tag** để phục vụ cả hai nhóm khách. Câu khó: bản vá đó phải xuất hiện ở **mấy** phiên bản, và bạn dùng công cụ Git nào để đưa nó sang các nhánh còn lại?
