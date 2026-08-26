---
title: Kiểm thử và đánh giá bảo mật
slug: kiem-thu-va-danh-gia-bao-mat
summary: Đưa kiểm tra bảo mật vào CI, viết test cho ca phủ định, và checklist trước khi phát hành.
level: nang-cao
tags: [auth, kiem-thu, ci, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được test bảo mật cho **ca phủ định**, và biết công cụ nào bắt được loại lỗi nào.

## Ý tưởng chính

Test chức năng trả lời: *"người có quyền có làm được không?"*

Test bảo mật trả lời câu ngược lại: *"người **không** có quyền có bị chặn không?"*

Suite test của hầu hết dự án chỉ có loại thứ nhất. Đó là lý do lỗ hổng phân quyền sống sót qua CI xanh mướt.

## Mental model

Hãy nghĩ tới **kiểm tra một cái khoá cửa**.

> Bạn tra chìa đúng, cửa mở. ✅ Khoá hoạt động?
>
> Chưa biết. Bạn mới thử **một** cách.
>
> Người kiểm tra thật sẽ thử: chìa nhà hàng xóm, một cái kẹp giấy, xoay nắm đấm mạnh, đẩy cửa sổ bên cạnh, và tháo bản lề.

Test chức năng là "tra chìa đúng". Test bảo mật là **tất cả những cách còn lại**.

## Ví dụ nhỏ

```ts
// Test chức năng — cái ai cũng viết
it('chủ sở hữu sửa được tài liệu', async () => {
  const res = await api.patch('/tai-lieu/1', { title: 'Mới' }, { as: chuSoHuu })
  expect(res.status).toBe(200)
})

// Test bảo mật — cái thường thiếu
it('người khác KHÔNG sửa được tài liệu', async () => {
  const res = await api.patch('/tai-lieu/1', { title: 'Hack' }, { as: nguoiLa })
  expect(res.status).toBe(404)          // 404, không phải 403 — xem bên dưới
})

it('không đăng nhập thì không sửa được', async () => {
  const res = await api.patch('/tai-lieu/1', { title: 'Hack' })
  expect(res.status).toBe(401)
})
```

## Code chạy thế nào

**Ma trận vai × hành động — cách sinh test có hệ thống thay vì nghĩ ra từng cái:**

```text
                 xem   sửa   xoá
khách             ✗     ✗     ✗
đã đăng nhập      ✗     ✗     ✗     (không phải chủ)
chủ sở hữu        ✓     ✓     ✓
admin             ✓     ✓     ✓
```

Ma trận 4×3 này ⇒ **12 test**, không phải 3. Mỗi ô `✗` là một test bảo mật; mỗi ô `✓` là một test chức năng.

```ts
const VAI = [
  { ten: 'khách',      as: undefined,   xem: 404, sua: 401 },
  { ten: 'người lạ',   as: nguoiLa,     xem: 404, sua: 404 },
  { ten: 'chủ',        as: chuSoHuu,    xem: 200, sua: 200 },
]

for (const v of VAI) {
  it(`${v.ten}: GET → ${v.xem}`, async () => {
    expect((await api.get('/tai-lieu/1', { as: v.as })).status).toBe(v.xem)
  })
}
```

Viết theo bảng có một lợi ích lớn: **thêm một vai mới là thêm một dòng** — không ai quên viết test phủ định cho vai đó.

**Vì sao 404 chứ không 403** với người lạ:

```text
403 "Bạn không có quyền"  ⇒ thừa nhận tài liệu #1 TỒN TẠI
404 "Không tìm thấy"      ⇒ không tiết lộ gì
```

Với dữ liệu mà chỉ riêng tư mới có ý nghĩa (hồ sơ bệnh án, hợp đồng), việc **tồn tại** đã là thông tin nhạy cảm ([[phan-quyen-theo-ban-ghi]]).

## Cú pháp

**Bốn loại công cụ, mỗi loại bắt một loại lỗi khác nhau:**

```text
SAST  (quét mã nguồn)
  Bắt: SQL nối chuỗi, secret hardcode, hàm băm yếu
  Mù:  lỗi logic phân quyền
  VD:  eslint-plugin-security, semgrep, CodeQL

SCA   (quét thư viện)
  Bắt: thư viện có CVE đã biết
  Mù:  mã của chính bạn
  VD:  pnpm audit, Dependabot

DAST  (quét ứng dụng đang chạy)
  Bắt: XSS, header thiếu, cấu hình sai
  Mù:  luồng cần đăng nhập phức tạp
  VD:  OWASP ZAP

Test tự viết
  Bắt: LOGIC PHÂN QUYỀN — thứ ba loại trên đều mù
  Mù:  cái bạn không nghĩ ra
```

Điểm quan trọng: **ba công cụ tự động đều mù với lỗi phân quyền** — vì "ai được xem tài liệu này" là quy tắc nghiệp vụ, không công cụ nào đoán được. Đó chính là loại lỗ hổng đứng đầu OWASP Top 10 ([[broken-access-control]]).

**Đưa vào CI:**

```yaml
- run: pnpm audit --audit-level=high    # chặn merge nếu có CVE nặng
- run: pnpm test                         # gồm cả ma trận phân quyền
- run: pnpm exec semgrep --config=auto --error
```

Nguyên tắc: quét **chặn merge** thì phải gần như không báo giả — một quét hay kêu oan sẽ bị cả đội quen tay bỏ qua, và lúc đó nó tệ hơn không có.

## Tại sao cần nó

Vì lỗi bảo mật khác lỗi chức năng ở một điểm: **không ai báo cáo nó**.

```text
Lỗi chức năng:  người dùng bấm nút, không chạy → mở ticket → bạn sửa.
Lỗi bảo mật:    kẻ tấn công tìm ra, dùng, và IM LẶNG.
```

Vòng phản hồi tự nhiên không tồn tại. Test là thứ duy nhất thay thế được nó.

**Checklist trước khi phát hành** — dùng khi tính năng chạm tới dữ liệu người dùng:

```text
□ Mọi endpoint mới có test cho vai "người lạ" và "chưa đăng nhập"
□ Không có secret nào trong mã hoặc trong lịch sử git
□ Đầu vào được xác thực bằng schema ở BIÊN (zod/…)
□ Truy vấn dùng tham số hoá, không nối chuỗi
□ Rate limit ở đăng nhập / quên mật khẩu / gửi mail
□ Cookie phiên: HttpOnly, Secure, SameSite
□ Header: CSP, HSTS, X-Content-Type-Options
□ Lỗi trả về cho client không chứa stack trace hay tên bảng
□ Log không ghi mật khẩu, token, số thẻ
□ pnpm audit sạch ở mức high trở lên
```

## So sánh

| | Test chức năng | Test bảo mật |
|---|---|---|
| Câu hỏi | "Có làm được không?" | "Có bị chặn không?" |
| Ai viết | Người làm tính năng | Thường **không ai** |
| Hỏng thì | Người dùng báo | Không ai báo |
| Sinh test | Theo yêu cầu | Theo **ma trận vai × hành động** |

## Dễ nhầm

**1. Chỉ test ca thuận.** CI xanh không nói gì về phân quyền.

**2. Tin rằng công cụ tự động bắt được lỗi phân quyền.** SAST/DAST đều mù với nó.

**3. Test bằng cùng một người dùng cho mọi ca.** Không có "người lạ" thì không phát hiện được rò rỉ chéo tài khoản.

**4. Chỉ kiểm quyền ở giao diện.** Nút bị ẩn không có nghĩa endpoint bị chặn — test phải gọi thẳng API.

**5. Trả 403 ở nơi cần 404.** Rò rỉ sự tồn tại của bản ghi.

**6. Quét báo giả nhiều nhưng vẫn chặn merge.** Cả đội học cách bỏ qua ⇒ quét thành vô dụng.

**7. Coi kiểm thử xâm nhập thuê ngoài là đủ.** Nó là ảnh chụp một thời điểm; mã thay đổi mỗi ngày.

**8. Không test luồng quên mật khẩu và OAuth** — hai luồng có tỉ lệ lỗ hổng cao nhất mà lại ít test nhất.

## Mẹo nhớ

> **Test chức năng hỏi "làm được không". Test bảo mật hỏi "bị chặn không".**
>
> **Sinh test từ MA TRẬN vai × hành động — mỗi ô ✗ là một test.**
>
> **Công cụ tự động mù với lỗi phân quyền. Chỉ test tự viết bắt được.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Khác biệt cốt lõi giữa test chức năng và test bảo mật là gì?
2. Vì sao lỗi bảo mật không tự lộ ra như lỗi chức năng?
3. Bốn loại công cụ, mỗi loại bắt gì và mù gì?
4. Vì sao trả 404 thay vì 403 với người lạ?
5. Ma trận vai × hành động sinh ra bao nhiêu test cho 4 vai và 3 hành động — và mấy cái trong đó là test bảo mật?

## Tự viết lại

Bạn vừa thêm endpoint `DELETE /binh-luan/:id`. Không nhìn lại phần trên:

```text
① Liệt kê các vai cần test.
② Với mỗi vai, ghi mã trạng thái mong đợi.
③ Viết một test cho vai nguy hiểm nhất.
```

Tự kiểm: danh sách vai của bạn có **"tác giả của bình luận khác"** không?

## Thử sức

Đội bạn có 340 test, CI luôn xanh, và vừa bị rò rỉ: một người dùng đọc được hoá đơn của người khác bằng cách đổi số trong URL.

Ba câu để trả lời: vì sao **340 test đều xanh** mà lỗi vẫn lọt; bạn thêm loại test nào để lỗi này **không thể lọt lần nữa**; và làm sao đảm bảo endpoint viết **tuần sau** cũng được phủ mà không phụ thuộc vào việc ai đó nhớ? Câu khó nhất: có cách nào để CI tự **phát hiện endpoint mới chưa có test phủ định** không?
