# Knowledge Hub — Sổ tay tra cứu kiến thức dev cá nhân

Ngày: 2026-08-17
Trạng thái: đã duyệt design, chờ lập kế hoạch implement

## 1. Mục tiêu

Một web app chạy local, tổng hợp ghi chú tóm tắt kiến thức kỹ thuật ở **một nơi duy nhất**,
chia theo mảng (Dev, Database, Security, DevOps) và theo ngôn ngữ/công nghệ
(JavaScript/TypeScript, Python, Next.js, SQL, PostgreSQL, OWASP, Docker, CI/CD).
Thay vì mỗi lần rảnh phải đi nhiều trang khác nhau để học từng loại, người dùng vào
app này là duyệt được toàn bộ cấu trúc kiến thức của mình.

Người dùng: một người (chủ sở hữu). Không có đăng nhập, không đa người dùng.

### Hai mục tiêu song song

1. **Sản phẩm**: tra cứu và đọc nhanh — duyệt theo cây, tìm bằng ⌘K, đọc markdown có
   highlight code.
2. **Tài liệu học**: chính source code của dự án là tài liệu học. Code phải chuẩn mực,
   cấu trúc rõ ràng, có test, có comment giải thích ở những chỗ có quyết định thiết kế —
   để đọc lại là học được Next.js, TypeScript và cách tách tầng.

### Tiêu chí thành công

- Từ trang chủ tới nội dung một ghi chú bất kỳ trong ≤ 2 hành động (⌘K + Enter).
- Thêm một ngôn ngữ/công nghệ mới chỉ cần thêm 1 record, không sửa code.
- Đổi từ file JSON sang SQLite/Postgres chỉ cần thay phần trong `src/lib/db/`,
  không sửa một dòng nào trong `src/app/` hay `src/components/`.
- Toàn bộ unit test của tầng dữ liệu pass.

## 2. Ngoài phạm vi (v1)

Cố tình không làm, để tránh phọng scope:

- Đăng nhập / nhiều người dùng / phân quyền
- Playground chạy code trong trình duyệt
- Quiz, flashcard, chấm điểm
- Theo dõi tiến độ học (% hoàn thành, streak)
- Deploy công khai (xem mục 5.5 về giới hạn)
- Test E2E

## 3. Stack

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Framework | Next.js 15, App Router | UI và server ở cùng một codebase; Server Components load nhanh |
| Ngôn ngữ | TypeScript, `strict: true` | Type suy ra từ zod schema |
| CSS | Tailwind CSS v4 | shadcn/ui yêu cầu |
| UI kit | shadcn/ui | Component copy vào repo, sửa được, không bị khoá vào thư viện |
| Theme | `next-themes` | Dark/light, lưu lựa chọn |
| Command palette | `cmdk` (qua shadcn `Command`) | ⌘K |
| Markdown | `react-markdown` + `remark-gfm` | Render nội dung ghi chú |
| Highlight code | `shiki` | Cùng bộ highlight với VS Code, chạy ở server nên không tốn JS phía client |
| Validation | `zod` | Nguồn sự thật cho cả schema lẫn type |
| Form | `react-hook-form` + `@hookform/resolvers/zod` | Form CRUD với lỗi theo từng field |
| Icon | `lucide-react` | shadcn/ui dùng sẵn |
| Toast | `sonner` (qua shadcn) | Phản hồi sau mutation |
| Test | `vitest` | Unit test tầng dữ liệu và các hàm thuần |
| Package manager | `pnpm` | Đã có trên máy (pnpm 11) |

## 4. Cấu trúc thư mục

```
data/
  categories.json
  topics.json
  notes.json
docs/superpowers/specs/          # spec này
src/
  app/
    layout.tsx                   # shell: sidebar + topbar + theme provider
    page.tsx                     # dashboard
    c/[category]/page.tsx        # danh sách công nghệ trong một mảng
    t/[topic]/page.tsx           # danh sách ghi chú trong một công nghệ
    n/[note]/page.tsx            # chi tiết ghi chú
    n/[note]/edit/page.tsx       # sửa ghi chú
    n/new/page.tsx               # tạo ghi chú
    api/export/route.ts          # tải toàn bộ dữ liệu về dạng 1 file JSON
    api/import/route.ts          # nạp lại từ file JSON đã export
    not-found.tsx  error.tsx
  components/
    ui/                          # shadcn generated
    layout/                      # AppSidebar, Topbar, ThemeToggle, Breadcrumbs
    notes/                       # NoteCard, NoteContent, NoteForm, TagBadge, StarButton, Toc, CopyButton
    search/                      # SearchPalette
  lib/
    db/
      json-store.ts              # đọc/ghi JSON an toàn (atomic + serialize)
      schema.ts                  # zod schema + type
      categories.repo.ts
      topics.repo.ts
      notes.repo.ts
      seed.ts                    # nội dung khởi tạo
    actions/                     # Server Actions: note.actions.ts, topic.actions.ts
    markdown.ts                  # render markdown -> HTML, trích TOC
    slug.ts                      # tạo slug từ tiêu đề, đảm bảo không trùng
    search.ts                    # hàm tìm kiếm + xếp hạng kết quả
tests/
  lib/db/*.test.ts
  lib/*.test.ts
```

**Quy tắc kiến trúc:** không component hay page nào được `import fs` hay đọc trực tiếp
file JSON. Mọi truy cập dữ liệu đi qua `src/lib/db/*.repo.ts`. Đây là điều kiện để
tiêu chí "đổi database chỉ sửa `lib/db/`" ở mục 1 thành hiện thực.

## 5. Tầng dữ liệu

### 5.1 Mô hình

Ba tầng: **Category → Topic → Note**.

```ts
Category {
  id: string          // nanoid
  name: string        // "DevOps"
  slug: string        // "devops"
  description: string
  icon: string        // tên icon lucide, ví dụ "Server"
  color: string       // token màu accent, ví dụ "amber"
  order: number       // thứ tự hiển thị trong sidebar
}

Topic {
  id: string
  categoryId: string  // -> Category.id
  name: string        // "Docker"
  slug: string        // "docker"
  description: string
  order: number
}

Note {
  id: string
  topicId: string     // -> Topic.id
  title: string
  slug: string        // duy nhất trên toàn bộ notes
  summary: string     // 1-2 câu, hiện ở list và ở kết quả ⌘K
  content: string     // markdown
  tags: string[]
  starred: boolean
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
}
```

Zod schema trong `schema.ts` là nguồn sự thật duy nhất; type TypeScript suy ra bằng
`z.infer<typeof NoteSchema>` nên không thể lệch nhau.

Slug là khoá điều hướng trên URL, `id` là khoá quan hệ nội bộ. Sửa tiêu đề **không**
đổi slug (tránh làm chết link cũ đã bookmark); slug chỉ đổi khi người dùng sửa tay
ở trường slug trong form.

### 5.2 Ghi file an toàn (`json-store.ts`)

Đây là phần dễ mất dữ liệu nhất nên xử lý đầy đủ ngay từ đầu:

- **Atomic write**: ghi vào `<file>.tmp` rồi `fs.rename` sang file thật. Rename là
  atomic trên cùng filesystem, nên tiến trình bị kill giữa lúc ghi không để lại file hỏng.
- **Serialize ghi**: một promise queue trong process. Hai mutation cùng lúc được xếp
  hàng, không đọc-sửa-ghi chồng lên nhau (lost update).
- **File hỏng thì dừng**: JSON parse lỗi hoặc zod validate lỗi → throw lỗi có thông báo
  rõ (tên file + lý do), **không ghi đè**. Dữ liệu cũ được giữ nguyên để người dùng sửa tay.
- **File chưa tồn tại** → tự tạo với nội dung `[]`.
- Mọi lần đọc đều validate qua zod trước khi trả về.

### 5.3 Repository

Mỗi repo cung cấp API hẹp, đặt tên theo việc chứ không theo SQL:

```ts
// notes.repo.ts
listAll(): Promise<Note[]>
listByTopic(topicId: string): Promise<Note[]>
findBySlug(slug: string): Promise<Note | null>
create(input: NoteCreateInput): Promise<Note>
update(id: string, patch: NoteUpdateInput): Promise<Note>
remove(id: string): Promise<void>
toggleStar(id: string): Promise<Note>
```

`categories.repo.ts` và `topics.repo.ts` tương tự, thêm `listWithCounts()` để sidebar
lấy được số lượng note mỗi topic trong một lần gọi.

`create` tự sinh `id`, `slug` (qua `slug.ts`, thêm hậu tố `-2`, `-3`... nếu trùng),
`createdAt`, `updatedAt`. `update` tự cập nhật `updatedAt`.

Xoá một Topic còn note bên trong → từ chối kèm lỗi rõ ràng, không xoá lan (không
cascade). Cùng nguyên tắc với Category còn topic.

### 5.4 Mutation

Mutation từ UI đi qua **Server Actions** trong `src/lib/actions/`. Mỗi action:

1. Validate input bằng zod schema tương ứng.
2. Gọi repo.
3. `revalidatePath` các đường dẫn bị ảnh hưởng.
4. Trả về `{ ok: true, data } | { ok: false, error, fieldErrors? }` — không throw ra UI.

Route Handler chỉ dùng cho hai việc ngoài luồng form: `GET /api/export` (tải một file
JSON chứa cả 3 collection để backup) và `POST /api/import` (nạp lại, validate toàn bộ
trước khi ghi, ghi cả 3 file hoặc không ghi gì).

### 5.5 Giới hạn đã biết

File JSON **không ghi được trên Vercel** và các nền tảng serverless khác
(filesystem read-only, và mỗi instance có filesystem riêng). App này chạy local
(`pnpm dev` / `pnpm start`) hoặc trên VPS/Docker có volume ghi được.

Khi cần deploy công khai: thay implementation trong `src/lib/db/` bằng SQLite
(Drizzle hoặc Prisma). Giao diện repo ở 5.3 giữ nguyên nên phần UI không phải sửa.
Đây là lý do tầng repo tồn tại ngay từ v1 dù hiện tại chỉ có JSON.

## 6. Điều hướng & các trang

| Đường dẫn | Nội dung |
|---|---|
| `/` | Dashboard: tổng số note theo mảng, các note đã ghim ⭐, 8 note sửa gần nhất, ô gợi ý nhấn ⌘K |
| `/c/[category]` | Mô tả mảng + grid các công nghệ trong mảng, mỗi thẻ có số note |
| `/t/[topic]` | Mô tả công nghệ + danh sách note (note đã ghim lên đầu), lọc theo tag, nút "Thêm ghi chú" |
| `/n/[note]` | Chi tiết ghi chú |
| `/n/new` | Form tạo (query `?topic=<slug>` để chọn sẵn công nghệ) |
| `/n/[note]/edit` | Form sửa |

Slug không tồn tại → `not-found.tsx` với gợi ý quay về mảng gần nhất.

## 7. UI/UX

### 7.1 Layout

Ba vùng cố định:

- **Sidebar trái** (~260px): cây gập/mở. Cấp 1 là mảng (có icon + màu accent), cấp 2 là
  công nghệ kèm số note. Nhánh của trang đang xem tự mở và được highlight. Trạng thái
  gập/mở lưu vào `localStorage`. Trên mobile: `Sheet` mở từ nút hamburger.
- **Topbar**: breadcrumb (Mảng / Công nghệ / Ghi chú) · nút tìm kiếm hiện gợi ý `⌘K` ·
  `ThemeToggle`.
- **Nội dung**: giới hạn khoảng 72ch cho phần văn bản để dễ đọc; các trang dạng grid
  được dùng full chiều rộng.

### 7.2 Command palette (⌘K)

Tìm trên toàn bộ note, xếp hạng theo thứ tự: khớp tiêu đề > khớp tag > khớp summary >
khớp nội dung. Kết quả nhóm theo công nghệ, mỗi dòng hiện tiêu đề + tên công nghệ +
đoạn summary. Có thêm nhóm "Hành động": tạo ghi chú mới, đổi theme. Enter là điều hướng.

Hàm tìm kiếm và xếp hạng nằm trong `lib/search.ts` — hàm thuần, không phụ thuộc React,
để test được độc lập.

### 7.3 Trang chi tiết ghi chú

Tiêu đề · badge các tag · nút ghim ⭐ · thời gian cập nhật · nút Sửa và Xoá ·
nội dung markdown dạng `prose` · TOC dính bên phải trên desktop (ẩn dưới `lg`).

Mỗi code block: nhãn ngôn ngữ ở góc trên và **nút Copy**. Highlight bằng shiki chạy
phía server nên client không phải tải bundle highlighter.

Xoá → `AlertDialog` xác nhận, nêu rõ tên note. Thành công → toast + chuyển về trang
công nghệ.

### 7.4 Form ghi chú

Các trường: Công nghệ (`Select`) · Tiêu đề · Slug (tự sinh từ tiêu đề, sửa được) ·
Tóm tắt · Tags (input nhập rồi Enter thành chip) · Nội dung (`Textarea` khổ lớn,
font mono, có tab "Xem trước" render markdown).

Lỗi validate hiện dưới từng field. Rời trang khi form còn thay đổi chưa lưu → hỏi xác nhận.

### 7.5 Bàn phím & khả năng truy cập

`⌘K` mở tìm kiếm · `⌘\` gập sidebar · `⌘S` lưu trong form · `Esc` đóng dialog.

Dùng thẻ semantic (`nav`, `main`, `article`), heading đúng bậc, `aria-label` cho các nút
chỉ có icon, focus ring rõ ở cả hai theme, tương phản đạt WCAG AA. Trạng thái loading
dùng `Skeleton`, trạng thái rỗng có hướng dẫn hành động tiếp theo.

## 8. Xử lý lỗi

| Tình huống | Cách xử lý |
|---|---|
| Input không hợp lệ | Zod → `fieldErrors` → hiện dưới field, không gọi repo |
| File JSON hỏng | Throw lỗi rõ ràng, **không ghi đè**; `error.tsx` hướng dẫn kiểm tra file nào |
| File JSON chưa có | Tự tạo `[]` |
| Slug trùng | Tự thêm hậu tố `-2`, `-3`... |
| Xoá topic còn note | Từ chối, thông báo số note còn lại |
| Slug không tồn tại trên URL | `not-found.tsx` |
| Ghi file thất bại | Action trả `{ok:false}`, toast lỗi, dữ liệu cũ nguyên vẹn |
| Import file sai định dạng | Validate toàn bộ trước; sai thì không ghi file nào |

## 9. Test

`vitest`, mỗi test chạy trên một thư mục `data` tạm riêng (không chạm dữ liệu thật):

**`json-store`**: đọc file chưa tồn tại tạo `[]` · JSON hỏng thì throw và không ghi đè ·
atomic write không để lại file hỏng khi ghi lỗi giữa chừng · hai lần ghi đồng thời
không mất update.

**`notes.repo`**: CRUD đủ vòng · `create` sinh id/slug/timestamp · `update` đổi
`updatedAt` · `toggleStar` · `findBySlug` không thấy trả `null` · `listByTopic` lọc đúng.

**`topics.repo` / `categories.repo`**: `listWithCounts` đếm đúng · từ chối xoá khi còn con.

**`slug.ts`**: bỏ dấu tiếng Việt · thêm hậu tố khi trùng · ký tự đặc biệt.

**`search.ts`**: đúng thứ tự xếp hạng · không phân biệt hoa thường và dấu ·
chuỗi rỗng trả rỗng.

## 10. Nội dung seed

`src/lib/db/seed.ts` tạo 4 mảng, 8 công nghệ, và khoảng 24 ghi chú tiếng Việt có code
mẫu thật (không phải lorem ipsum) — vừa để có cái đọc ngay, vừa làm mẫu văn phong cho
các ghi chú viết sau.

| Mảng | Công nghệ | Ví dụ chủ đề ghi chú |
|---|---|---|
| Dev | JavaScript / TypeScript | `async/await` và event loop · Generic · Type vs Interface |
| Dev | Python | List/dict comprehension · virtualenv & pip · type hint |
| Dev | Next.js | Server vs Client Component · Server Actions · caching & revalidate |
| Database | SQL cơ bản | JOIN · GROUP BY & HAVING · giao dịch (transaction) |
| Database | PostgreSQL | Index và khi nào nên đánh · EXPLAIN ANALYZE |
| Security | OWASP Top 10 | SQL Injection · XSS · lỗi kiểm soát truy cập · lưu mật khẩu đúng cách |
| DevOps | Docker | Dockerfile nhiều stage · volume vs bind mount · docker compose |
| DevOps | CI/CD (GitHub Actions) | Cấu trúc workflow · cache dependency · secret |

Seed chạy qua `pnpm seed`, và tự chạy khi `data/` còn rỗng. Seed **không** ghi đè
dữ liệu đã có.

## 11. Thứ tự triển khai

1. Khởi tạo project (Next.js + Tailwind + shadcn) và cấu hình test
2. `lib/db`: schema, json-store, ba repo — kèm test
3. `lib/slug.ts`, `lib/search.ts`, `lib/markdown.ts` — kèm test
4. Seed nội dung
5. Layout: sidebar cây, topbar, theme
6. Các trang đọc: dashboard, mảng, công nghệ, chi tiết note
7. Command palette ⌘K
8. Server Actions + form tạo/sửa/xoá
9. Export/import
10. Rà soát UI/UX: bàn phím, accessibility, empty state, mobile
