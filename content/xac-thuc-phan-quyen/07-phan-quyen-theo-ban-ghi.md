---
title: Phân quyền theo bản ghi
slug: phan-quyen-theo-ban-ghi
summary: RBAC không đủ khi quyền phụ thuộc vào chính bản ghi. ABAC, và nơi đặt kiểm tra để không bỏ sót.
level: nang-cao
tags: [phan-quyen, rbac, abac, bao-mat]
khung: v2
---

> **Sau bài này bạn sẽ:** nhận ra khi nào RBAC hết tác dụng, và đặt kiểm tra quyền ở nơi **không thể quên**.

## Ý tưởng chính

RBAC trả lời: *"vai này có được làm hành động này không?"*

Nhưng câu hỏi thật thường là: *"người này có được làm hành động này **với bản ghi cụ thể kia** không?"*

Vai không đủ để trả lời — vì câu trả lời phụ thuộc vào **quan hệ giữa người và bản ghi**.

## Mental model

Hãy nghĩ tới **thẻ nhân viên trong một toà nhà**.

> Thẻ ghi "Nhân viên" — mở được cửa chính, thang máy, căng tin. Đó là **RBAC**: quyền gắn vào chức danh.
>
> Nhưng phòng làm việc của bạn thì sao? Mọi nhân viên đều có thẻ "Nhân viên", nhưng bạn chỉ vào được **phòng của đội mình**.
>
> Cái quyết định không còn là chức danh trên thẻ, mà là **quan hệ giữa bạn và căn phòng đó**.

Đó chính là ranh giới: chức danh quyết định ⇒ RBAC đủ. Quan hệ quyết định ⇒ cần phân quyền theo bản ghi.

## Ví dụ nhỏ

```ts
// ❌ RBAC — không đủ
if (user.role === 'thanh-vien') {
  return db.taiLieu.findUnique({ where: { id } })   // trả về tài liệu của BẤT KỲ AI
}

// ✅ Quyền nằm trong chính truy vấn
return db.taiLieu.findFirst({
  where: { id, OR: [{ chuSoHuuId: user.id }, { chiaSe: { some: { userId: user.id } } }] },
})
```

## Code chạy thế nào

**Vì sao gộp quyền vào truy vấn tốt hơn kiểm sau khi lấy:**

```text
Cách A — lấy rồi kiểm:
  ① const t = await db.taiLieu.findUnique({ where: { id } })
  ② if (t.chuSoHuuId !== user.id) throw new Forbidden()
  ③ return t

  Vấn đề: bước ② là dòng code người ta QUÊN.
          Và khi quên, nó không báo lỗi — nó trả về dữ liệu.

Cách B — quyền nằm trong where:
  ① const t = await db.taiLieu.findFirst({ where: { id, chuSoHuuId: user.id } })
  ② if (t === null) return notFound()

  Quên bước ②? → code sập vì `t` là null. LỖI TO VÀ RÕ.
```

Nguyên tắc chung: **thiết kế sao cho lỗi khi quên là lỗi ồn ào, không phải lỗi im lặng**.

Cách B còn trả về `null` cho cả hai trường hợp "không tồn tại" và "không có quyền" — đúng thứ ta muốn lộ ra ngoài ([[kiem-thu-va-danh-gia-bao-mat]]).

**Ba nơi đặt kiểm tra, hiệu quả rất khác nhau:**

```text
① Trong từng handler          → dễ viết, DỄ QUÊN. Endpoint thứ 40 sẽ lọt.
② Trong tầng service/repo     → mọi handler đi qua đây. Tốt hơn nhiều.
③ Trong CSDL (Row Level Security) → không đường vòng. Cả script chạy tay
                                     cũng bị chặn.
```

Càng xuống dưới, càng khó quên — và càng ít linh hoạt. Chọn ② cho phần lớn ứng dụng; chọn ③ khi dữ liệu đa người thuê (multi-tenant) và hậu quả rò rỉ là nghiêm trọng.

```sql
-- ③ Postgres RLS: quyền là thuộc tính của BẢNG, không của mã ứng dụng
ALTER TABLE tai_lieu ENABLE ROW LEVEL SECURITY;
CREATE POLICY chi_cua_minh ON tai_lieu
  USING (chu_so_huu_id = current_setting('app.user_id')::uuid);
```

## Cú pháp

**Ba mô hình, theo thứ tự sức mạnh:**

```text
RBAC  — quyền theo VAI
  "admin xoá được bài viết"
  Đủ khi: quyền không phụ thuộc bản ghi cụ thể.

ABAC  — quyền theo THUỘC TÍNH (của người, bản ghi, và bối cảnh)
  "sửa được nếu là tác giả VÀ bài chưa xuất bản VÀ trong giờ làm việc"
  Đủ khi: quy tắc diễn đạt được bằng thuộc tính.

ReBAC — quyền theo QUAN HỆ (đồ thị)
  "xem được vì tài liệu nằm trong thư mục thuộc dự án mà bạn là thành viên"
  Cần khi: quyền KẾ THỪA qua nhiều tầng.
```

ReBAC là mô hình Google Zanzibar dùng cho Drive — quyền chảy xuống theo cây thư mục. Đừng dựng nó khi chưa cần: nó kéo theo một dịch vụ riêng và một đồ thị phải giữ đồng bộ.

**Tách quy tắc ra khỏi handler** để mọi nơi dùng chung một định nghĩa:

```ts
export function coTheSua(user: User, t: TaiLieu): boolean {
  if (user.role === 'admin') return true
  if (t.chuSoHuuId === user.id) return true
  return t.chiaSe.some((c) => c.userId === user.id && c.quyen === 'sua')
}
```

Lợi ích thật của việc tách: **giao diện và API dùng chung một hàm** — nút "Sửa" hiện đúng khi và chỉ khi endpoint cho phép. Ẩn nút mà không chặn endpoint là lỗ hổng; chặn endpoint mà vẫn hiện nút là lỗi trải nghiệm.

## Tại sao cần nó

Vì đây là **lỗ hổng phổ biến nhất trong thực tế**, và nó không sập, không báo lỗi, không xuất hiện trong log.

```text
Hiện tượng: đổi /hoa-don/1041 thành /hoa-don/1042 → xem được hoá đơn người khác.
Nguyên nhân: endpoint kiểm "đã đăng nhập chưa", không kiểm "có phải của bạn không".
```

Đặt tên là **IDOR** (Insecure Direct Object Reference). Điều đáng chú ý: dùng UUID thay số tuần tự **không phải là bản vá** — nó chỉ làm việc dò khó hơn. ID rò ra qua link chia sẻ, qua log, qua API khác là chuyện thường. Bản vá duy nhất là **kiểm quyền trên từng bản ghi**.

**Danh sách cũng phải lọc:**

```ts
// ❌ Rò rỉ hàng loạt — tệ hơn IDOR một bản ghi
const ds = await db.taiLieu.findMany()

// ✅
const ds = await db.taiLieu.findMany({ where: quyenXem(user) })
```

Và đừng quên **các đường khác vào cùng dữ liệu**: endpoint xuất Excel, API tìm kiếm, webhook, GraphQL resolver, job gửi email tóm tắt. Mỗi đường là một chỗ có thể quên — lý do nữa để kiểm tra nằm ở tầng ② hoặc ③ chứ không rải trong handler.

## So sánh

| | RBAC | ABAC | ReBAC |
|---|---|---|---|
| Quyết định bởi | vai | thuộc tính | quan hệ |
| "Admin xoá bài" | ✅ | ✅ | ✅ |
| "Tác giả sửa bài chưa xuất bản" | ❌ | ✅ | ✅ |
| "Xem được vì ở trong dự án bạn tham gia" | ❌ | ❌ | ✅ |
| Độ phức tạp | thấp | vừa | cao |

## Dễ nhầm

**1. Chỉ kiểm "đã đăng nhập" rồi lấy bản ghi theo id.** Đây chính là IDOR.

**2. Tin rằng UUID là bản vá cho IDOR.** Nó chỉ là che giấu.

**3. Quên lọc danh sách.** Rò rỉ hàng loạt, tệ hơn một bản ghi.

**4. Kiểm quyền chỉ ở giao diện.** Nút ẩn không chặn được `curl`.

**5. Kiểm sau khi lấy dữ liệu** thay vì gộp vào `where`. Quên một dòng ⇒ hỏng im lặng.

**6. Rải quy tắc quyền trong từng handler.** Endpoint thứ N sẽ lọt, và không ai biết.

**7. Bỏ sót các đường phụ:** xuất file, tìm kiếm, GraphQL, job nền.

**8. Trả 403 ở nơi cần 404.** Tiết lộ bản ghi tồn tại.

**9. Dựng ReBAC khi ABAC là đủ.** Trả giá vận hành cho một nhu cầu chưa có.

## Mẹo nhớ

> **RBAC hỏi "bạn là ai". Phân quyền theo bản ghi hỏi "bạn là gì CỦA cái này".**
>
> **Đưa quyền vào `where`, đừng kiểm sau khi lấy — để quên là lỗi ồn ào.**
>
> **Danh sách cũng phải lọc. Và mọi đường vào dữ liệu, không chỉ đường chính.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Khi nào RBAC hết đủ? Cho một ví dụ cụ thể.
2. Vì sao gộp quyền vào `where` an toàn hơn kiểm sau khi lấy?
3. IDOR là gì, và vì sao đổi sang UUID không phải bản vá?
4. Ba nơi đặt kiểm tra quyền, và đánh đổi của mỗi nơi?
5. RBAC, ABAC, ReBAC khác nhau ở điều gì quyết định quyền?

## Tự viết lại

Yêu cầu: *"Thành viên xem được tài liệu của dự án mình tham gia. Chỉ tác giả sửa được. Trưởng dự án xoá được bất kỳ tài liệu nào trong dự án."*

Không nhìn lại, viết:

```text
① hàm coTheXem / coTheSua / coTheXoa
② mệnh đề where cho endpoint danh sách
③ đặt các hàm này ở tầng nào, vì sao
```

Tự kiểm: endpoint danh sách của bạn có dùng lại đúng logic của `coTheXem` không, hay bạn vừa viết lại quy tắc lần thứ hai?

## Thử sức

Sản phẩm có 60 endpoint. Bạn nghi vài cái thiếu kiểm quyền theo bản ghi nhưng không biết cái nào.

Ba câu để trả lời: bạn **tìm** chúng bằng cách nào (không phải đọc hết 60 file); bạn thay đổi **kiến trúc** ra sao để endpoint số 61 không lọt được nữa; và bạn dùng gì để **chứng minh** là đã phủ hết? Câu khó nhất: nếu chuyển sang RLS ở tầng CSDL, những công việc nào của hệ thống sẽ **hỏng** — và vì sao?
