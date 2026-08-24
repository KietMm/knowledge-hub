---
title: Kiểm thử và đánh giá bảo mật
slug: kiem-thu-va-danh-gia-bao-mat
summary: Đưa kiểm tra bảo mật vào CI, viết test cho ca phủ định, và checklist trước khi phát hành.
level: nang-cao
tags: [auth, kiem-thu, ci, bao-mat]
---

> **Sau bài này bạn sẽ:** có một quy trình kiểm tra chạy tự động, thay vì phụ thuộc vào việc ai đó nhớ kiểm tra.

## Bốn loại công cụ

| Loại | Kiểm tra gì | Ví dụ |
|---|---|---|
| SAST | Mã nguồn tĩnh | Semgrep, CodeQL, `eslint-plugin-security` |
| DAST | Ứng dụng đang chạy | OWASP ZAP, Burp Suite |
| SCA | Thư viện phụ thuộc | `pnpm audit`, Snyk, Dependabot |
| Secret scanning | Khoá bí mật trong repo | gitleaks, GitHub secret scanning |

Bốn loại này bổ sung cho nhau, không thay thế nhau: SAST thấy code nhưng không thấy cấu hình runtime; DAST thì ngược lại.

## Đưa vào CI

```yaml
name: Bảo mật
on: [push, pull_request]

jobs:
  kiem-tra:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # gitleaks cần toàn bộ lịch sử

      - name: Quét secret
        uses: gitleaks/gitleaks-action@v2

      - name: Lỗ hổng dependency
        run: pnpm audit --audit-level=high

      - name: Phân tích tĩnh
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/owasp-top-ten
```

Quan trọng: cho những bước này **chặn merge** khi phát hiện vấn đề mức cao. Cảnh báo mà không chặn thì sau vài tuần không ai đọc nữa.

## Test cho ca phủ định

Loại test bị bỏ quên nhiều nhất — và chính vì thế lỗ hổng phân quyền mới phổ biến:

```ts
describe('phân quyền ghi chú', () => {
  it('không cho người dùng khác đọc ghi chú riêng tư', async () => {
    const a = await taoNguoiDung()
    const b = await taoNguoiDung()
    const ghiChu = await taoGhiChu({ tacGiaId: a.id, riengTu: true })

    const res = await goiApi(`/api/ghi-chu/${ghiChu.id}`, { asUser: b })
    expect(res.status).toBe(404)          // 404, không phải 403
  })

  it('không cho tự nâng vai trò qua API cập nhật hồ sơ', async () => {
    const u = await taoNguoiDung({ vaiTro: 'thanh-vien' })
    await goiApi('/api/toi', { method: 'PATCH', asUser: u, body: { vaiTro: 'quan-tri' } })

    const sau = await db.nguoiDung.findUnique({ where: { id: u.id } })
    expect(sau?.vaiTro).toBe('thanh-vien')
  })

  it('chặn sau 5 lần đăng nhập sai', async () => {
    for (let i = 0; i < 5; i++) await dangNhap('a@b.com', 'sai')
    const res = await dangNhap('a@b.com', 'sai')
    expect(res.status).toBe(429)
  })
})
```

Nguyên tắc: mỗi khi thêm một kiểm tra quyền, viết kèm một test chứng minh nó chặn được.

## Checklist trước khi phát hành

**Xác thực và phiên**
- [ ] Mật khẩu hash bằng Argon2id/bcrypt
- [ ] Cookie: `HttpOnly`, `Secure`, `SameSite`
- [ ] Phiên mới sau đăng nhập; huỷ toàn bộ khi đổi mật khẩu
- [ ] Giới hạn tần suất trên đăng nhập, đăng ký, quên mật khẩu

**Phân quyền**
- [ ] Mọi Server Action / API kiểm tra phiên và quyền trên bản ghi
- [ ] Không có endpoint nào chỉ dựa vào middleware
- [ ] Ghi dữ liệu qua danh sách trắng trường

**Dữ liệu vào ra**
- [ ] Truy vấn tham số hoá ở mọi nơi
- [ ] Không `dangerouslySetInnerHTML` với dữ liệu chưa sanitize
- [ ] Thông báo lỗi không lộ stack trace hay cấu trúc DB

**Cấu hình**
- [ ] Header bảo mật: CSP, HSTS, `X-Frame-Options`, `nosniff`
- [ ] HTTPS bắt buộc, chuyển hướng từ HTTP
- [ ] Không có secret trong repo hay trong bundle client
- [ ] Biến môi trường được validate lúc khởi động

**Vận hành**
- [ ] Log sự kiện bảo mật, có request id, không chứa secret
- [ ] Cảnh báo cho hành vi bất thường
- [ ] Sao lưu có kiểm tra khôi phục thật
- [ ] Có quy trình xử lý khi phát hiện sự cố

## Xây dựng văn hoá

Công cụ không đủ. Vài thói quen tạo khác biệt lớn:

- **Review có phần bảo mật**: hỏi "kiểm tra quyền ở đâu?" trên mọi PR chạm tới dữ liệu.
- **Mô hình hoá mối đe doạ** mười phút trước khi làm tính năng nhạy cảm.
- **Không đổ lỗi khi có sự cố**: mục tiêu là sửa hệ thống, không phải tìm người sai. Đổ lỗi khiến lần sau người ta giấu.
- **Có kênh nhận báo cáo lỗ hổng** (`security.txt`) và trả lời tử tế.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Chỉ cảnh báo, không chặn merge | Cảnh báo bị bỏ qua | Cho CI fail |
| Không test ca phủ định | Lỗ hổng phân quyền lọt lưới | Test "B không truy cập được của A" |
| Kiểm tra bảo mật thủ công trước release | Bỏ sót, tốn thời gian | Tự động trong CI |
| Đổ lỗi cá nhân sau sự cố | Người ta giấu vấn đề | Rà soát không đổ lỗi |
| Backup chưa từng thử khôi phục | Backup có thể vô dụng | Diễn tập khôi phục |

## Ghi nhớ

- SAST, DAST, SCA, secret scanning bổ sung cho nhau.
- Test ca phủ định là loại test có giá trị nhất cho phân quyền.
- Cho CI chặn merge, không chỉ cảnh báo.
- Sao lưu chưa thử khôi phục thì chưa phải sao lưu.

## Tự kiểm tra

1. SAST và DAST bắt được những loại lỗi khác nhau nào?
2. Viết ba test ca phủ định cho tính năng "chỉ tác giả sửa được bài viết".
3. Vì sao rà soát sự cố không đổ lỗi lại cải thiện bảo mật?
