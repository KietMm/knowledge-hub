# Knowledge Hub

Sổ tay tra cứu kiến thức dev cá nhân, chạy local. Giáo trình hiện có **8 mảng · 25 công
nghệ · 142 bài học** (~14,5 giờ đọc), mỗi công nghệ là một lộ trình xếp từ cơ bản tới nâng cao.

Mảng đầu là phần logic không dính ngôn ngữ nào — đổi từ Python sang Go thì cú pháp mất, phần
này ở lại. Bốn mảng tiếp là kỹ năng thực thi; ba mảng cuối là phần một tech lead cần mà không
nằm trong trình biên dịch.

| Mảng | Công nghệ |
|---|---|
| Nền tảng | Tư duy lập trình, Cấu trúc dữ liệu và độ phức tạp, Nguyên lý thiết kế code |
| Lập trình | JavaScript/TypeScript, React, Next.js, Python, Git, HTTP & REST API, Kiểm thử |
| Cơ sở dữ liệu | SQL cơ bản, Thiết kế cơ sở dữ liệu, PostgreSQL |
| Bảo mật | OWASP Top 10, Xác thực & Phân quyền |
| DevOps | Linux & Shell, Docker, CI/CD, Nginx & Triển khai |
| Kiến trúc | Thiết kế hệ thống, Hệ thống phân tán |
| Vận hành | Quan sát và độ tin cậy, Triển khai và hiệu năng |
| Dẫn dắt kỹ thuật | Quyết định và chất lượng, Làm việc với người |

## Chạy

```bash
pnpm install
pnpm seed   # nạp dữ liệu mẫu nếu data/ còn rỗng
pnpm dev
```

Mở http://localhost:3000

## Lệnh

| Lệnh | Việc |
|---|---|
| `pnpm dev` | Chạy môi trường phát triển |
| `pnpm build && pnpm start` | Chạy bản production |
| `pnpm test` | Unit test tầng dữ liệu và các hàm thuần |
| `pnpm typecheck` | Kiểm tra kiểu |
| `pnpm seed` | Nạp dữ liệu mẫu (không ghi đè dữ liệu đã có) |
| `pnpm content:build` | Biên dịch `content/` → `src/lib/db/seed-data.json` |
| `pnpm content:sync` | Như trên, rồi ghi luôn vào `data/` (giữ các bài đã ghim) |

## Soạn bài học

Bài học được viết bằng **markdown** trong `content/`, không gõ thẳng vào JSON:

```
content/
  structure.json                 # mảng + công nghệ, thứ tự lấy theo thứ tự trong mảng JSON
  javascript-typescript/         # tên thư mục = slug công nghệ
    01-kieu-du-lieu-va-bien.md   # số đầu tên file = thứ tự bài trong lộ trình
    02-ham-closure-va-this.md
```

Mỗi file mở đầu bằng khối frontmatter:

```markdown
---
title: Kiểu dữ liệu và cách khai báo biến
slug: kieu-du-lieu-va-bien
summary: Bảy kiểu nguyên thuỷ, khác nhau giữa var/let/const, và vì sao == gây lỗi.
level: co-ban
tags: [javascript, co-ban, kieu-du-lieu]
---
```

Ràng buộc (script kiểm và báo lỗi rõ nếu sai):

- Tên file phải đúng dạng `NN-slug.md`, và phần `slug` phải **trùng** `slug` trong frontmatter.
- `slug` duy nhất trên **toàn bộ** giáo trình, không chỉ trong một công nghệ.
- `level` là một trong `co-ban` / `trung-cap` / `nang-cao`.
- Trong mỗi công nghệ, độ khó phải **tăng dần** theo số thứ tự — có test kiểm điều này.
- Liên kết chéo viết `[[slug-bai-khac]]`; slug phải trỏ tới một bài có thật.

Sửa xong chạy `pnpm content:sync` rồi tải lại trang. Lệnh này ghi đè `data/` nhưng giữ
nguyên trạng thái ghim; bài nào đổi slug thì mất ghim và script sẽ in ra danh sách đó.

## Dữ liệu

Ba file JSON trong `data/`. Sao lưu: mở `/api/export`. Phục hồi: `POST /api/import` với chính file đó.

`data/` là dữ liệu **đang chạy** (sửa qua giao diện sẽ ghi vào đây); `content/` là **nguồn**
của giáo trình. Hai thứ chỉ gặp nhau khi bạn chạy `content:sync`.

## Hai chế độ chạy

| | Local (mặc định) | Triển khai công khai |
|---|---|---|
| Nguồn dữ liệu | `data/*.json` | `src/lib/db/seed-data.json` (trong bundle) |
| Thêm/sửa/xoá bài | ✅ | ❌ bị từ chối, nút được **ẩn** |
| Ghim bài | ✅ | ❌ |
| `/api/export` | ✅ | ✅ |
| `/api/import` | ✅ | ❌ `405` |

Chế độ chỉ đọc tự bật khi `process.env.VERCEL === '1'`; đặt tay bằng `KH_READONLY=0|1`
(giá trị đặt tay thắng mọi suy luận, để thử được cả hai chiều ở local).

Vì sao phải có chế độ này: filesystem của môi trường serverless **chỉ đọc**, và kể cả ghi
được thì mỗi instance có một bản riêng rồi biến mất. Thêm nữa `readCollection()` dùng đường
dẫn động (`process.cwd() + '/data'`) nên Next **không truy vết được** để đóng gói `data/` vào
hàm serverless — lúc chạy chúng đơn giản không tồn tại. `seed-data.json` được `import` tĩnh
nên chắc chắn có trong bundle.

Nhánh phân biệt đặt trong `json-store.ts`, nhờ vậy toàn bộ `*.repo.ts` phía trên không phải
biết gì về nó.

```bash
# Thử chế độ chỉ đọc ở local (đổi tên data/ để chứng minh không còn phụ thuộc nó)
mv data data-tam && VERCEL=1 pnpm build && VERCEL=1 pnpm start
```

### Triển khai

```bash
npx vercel deploy --temporary   # không cần đăng nhập, link sống 60 phút
npx vercel login && npx vercel  # bản vĩnh viễn trên tài khoản của bạn
```

Muốn **ghi được** trên bản công khai thì thay phần trong `src/lib/db/` bằng Postgres/SQLite —
giao diện repository giữ nguyên nên `src/app/` và `src/components/` không phải sửa.

## Kiến trúc

- `src/lib/db/` — nơi **duy nhất** chạm tới dữ liệu. Không file nào trong `app/` hay `components/` được đọc file trực tiếp.
- `src/lib/actions/` — Server Actions, luôn trả `{ok:true|false}`, không throw ra UI.
- `src/lib/{slug,search,markdown,tags,tag-label,category-color,level,reading-time,frontmatter}.ts` — hàm thuần, có unit test.
- `scripts/build-content.ts` — bộ biên dịch giáo trình; là nơi duy nhất đọc `content/`.
- `src/lib/db/seed-data.json` — **file sinh tự động**, đừng sửa tay.

### Giao diện

- **Font — bốn vai trò, bốn khuôn chữ.** Trước đây một mình `Be Vietnam Pro` gánh cả tiêu đề
  lẫn thân bài, nên trang không có tương phản nào giữa hai vai trò và đọc rất phẳng.

  | Vai trò | Font | Biến | Vì sao |
  |---|---|---|---|
  | Display (h1, h2) | `Fraunces` | `--font-heading` | Serif biến thiên, bật `SOFT 25` + `WONK 1` cho có giọng riêng |
  | Body (văn xuôi bài học) | `Source Serif 4` | `--font-body` | Adobe vẽ cho đọc dài trên màn hình; giáo trình là ~14,5 giờ đọc |
  | Utility (vỏ giao diện) | `Be Vietnam Pro` | `--font-sans` | Người Việt vẽ riêng cho tiếng Việt — dấu chuẩn nhất, và vỏ là nơi chữ nhỏ nhất |
  | Code (dữ kiện máy móc) | `JetBrains Mono` | `--font-mono` | Có tiếng Việt, cần cho comment tiếng Việt trong khối code |

  Ràng buộc loại: **cả bốn phải có subset `vietnamese`**. Thiếu nó thì dấu chồng (ế, ữ, ỗ) rơi
  về font dự phòng và lệch hẳn khỏi phần chữ còn lại — rất nhiều font đẹp trượt ở đúng chỗ này
  (Instrument Serif, Onest, Red Hat, Fira Code). Hai trục `SOFT`/`WONK` chỉ có mặt nếu được kê
  tên ở `axes` trong `layout.tsx`.

  Quy ước cũ giữ nguyên: cái gì máy biết thì monospace — code, nhãn ngôn ngữ, `Bài 3/6`, thời gian đọc.

  *Hai lỗi đã sửa ở đây, cùng một dạng "biến tự vô hiệu hoá": `--font-sans: var(--font-sans)`
  tự tham chiếu khiến cả trang rơi về serif mặc định; và `--font-heading` trỏ về đúng
  `--font-sans-loaded` nên tiêu đề với thân bài luôn cùng một font.*

- **Màu**: neutral lệch xanh lạnh (hue 258, chroma 0.003–0.02) thay cho `oklch(... 0 0)` phẳng
  tuyệt đối. Bốn màu mảng (sky/emerald/rose/amber) là nơi **duy nhất** được phép rực — chúng
  mang thông tin (mảng nào), nên phần chrome phải nhường màu cho chúng.

- **Khối code**: shiki chỉ quyết định màu **chữ**; nền/viền/hình khối do token `--code*` của app
  quyết định. Bản cũ để shiki đặt cả nền, mà nền `github-light` là `#fff` và `github-dark` là
  `#24292e` — trùng gần khít nền trang ở cả hai theme nên khối code không có ranh giới nào.
  Theme hiện tại là `vitesse-light` / `vitesse-dark` (dịu hơn, không tranh chú ý với văn xuôi).

- **Breadcrumb** nằm trong `Topbar` sticky nên không cuộn mất. Nó tự suy từ `usePathname()` qua
  `buildCrumbIndex()` (bản đồ nhãn nhỏ, không chứa nội dung bài) — root layout không nhận được
  dữ liệu của page trong App Router. Đổi lại: khai báo một lần cho cả app, thêm route mới không
  thể quên mất đường dẫn.

- **Nhãn tag**: tag được **lưu dạng slug** (`nen-tang`) vì nó là khoá lọc trên URL
  (`/t/react?tag=hook`), nhưng giao diện hiện **nhãn tiếng Việt** (`Nền tảng`) qua
  `nhanTag()`. Bảng nhãn trong `tag-label.ts` là bắt buộc chứ không phải tiện nghi: từ
  `nen-tang` không có cách nào suy ngược ra dấu — "Nền tảng", "Nến tang", "Nên táng" đều
  hợp lệ về mặt chuỗi. Có test kiểm **mọi tag đang dùng đều đã khai nhãn** và **không
  nhãn nào trùng nhau**, nên thêm tag vào `content/` mà quên khai thì test đỏ, chứ không
  âm thầm hiện slug thô lên giao diện.

- **Liên kết chéo** giữa các bài viết `[[slug-bai-khac]]`, nhãn tự lấy **tiêu đề** bài đích nên
  đổi tiêu đề không làm mọi chỗ trích dẫn nói sai. `content:build` chặn nếu slug trỏ sai.

### Không có `loading.tsx` — và đó là chủ ý

Đã từng có `app/loading.tsx` và `app/n/[note]/loading.tsx`. Cả hai bị bỏ vì một
`loading.tsx` tạo Suspense boundary, khiến Next gửi phần vỏ trang đi trước khi thân trang
chạy — **mã trạng thái đã chốt ở 200**, nên `notFound()` chỉ đổi được nội dung hiển thị
còn slug không tồn tại vẫn trả về `200 OK`. Gọi `notFound()` từ `generateMetadata()` cũng
không cứu được (đã thử).

Đánh đổi đo được: bài dài nhất render trong ~85ms, trang chủ ~5ms. Một skeleton nhấp nháy
trong 85ms còn tệ hơn là không có, nên bỏ nó để lấy lại mã 404 đúng cho `/t/*`, `/n/*`,
`/c/*`. Nếu về sau có trang nào thật sự chậm thì đặt `<Suspense>` **bên trong** trang đó
cho đúng phần chậm, đừng thêm lại `loading.tsx` ở cấp segment.

## Chưa có trong bản này

- **Thêm/sửa/xoá mảng hoặc công nghệ qua giao diện.** Chưa có form nào cho việc này —
  sửa `content/structure.json` rồi chạy `pnpm content:sync`. Sai hình dạng thì script
  dừng kèm thông báo chỉ đúng trường sai, không ghi gì vào `data/`.

- **Đánh dấu đã học.** Chỉ có ghim (ngôi sao), chưa có trạng thái hoàn thành từng bài
  hay tiến độ theo lộ trình.

- **Sửa bài học qua giao diện thì sẽ bị `content:sync` ghi đè.** Giao diện sửa dùng để
  ghi chú nhanh; nội dung muốn giữ lâu dài thì sửa trong `content/`.

## Bàn phím

| Phím | Việc |
|---|---|
| `⌘K` / `Ctrl K` | Mở/đóng bảng tìm nhanh (chọn bài học hoặc chạy hành động) |
| `⌘\` / `Ctrl \` | Gập/mở sidebar (desktop) |
| `⌘S` / `Ctrl S` | Lưu form bài học đang mở |
| `Esc` | Đóng dialog/bảng tìm nhanh đang mở |

## Rà soát thủ công còn treo

Những mục sau cần một trình duyệt thật để xác nhận — chưa (và không thể) kiểm bằng máy trong CI:

- `⌘K` mở/đóng bảng tìm nhanh, mũi tên lên/xuống di chuyển giữa kết quả, `Enter` điều hướng, `Esc` đóng.
- `⌘S` lưu form bài học; cảnh báo trình duyệt khi rời trang lúc form còn thay đổi chưa lưu.
- Submit form tạo/sửa bài học, toast báo kết quả, dialog xác nhận trước khi xoá.
- Nút "Chép" trên khối code (chép đúng nội dung vào clipboard, đổi nhãn tạm thời).
- Menu ⋯ ở đầu bài học: mở được bằng chuột và bàn phím, "Sửa bài học" điều hướng đúng,
  "Xoá bài học" mở hộp xác nhận (nội dung menu chỉ render khi mở nên không kiểm được bằng curl).
- `⌘\` gập/mở sidebar trên desktop, hamburger mở Sheet trên mobile.
- Thanh tiến độ đọc chạy theo lúc cuộn; mục lục sáng đúng mục đang xem.
- Nút "Bài trước / Bài tiếp theo" ở cuối bài đi đúng thứ tự lộ trình.
