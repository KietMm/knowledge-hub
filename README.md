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
| `pnpm content:build` | Biên dịch `content/` (bài học + bài tập) → `src/lib/db/seed-data.json` |
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
- Liên kết chéo viết `[[slug-bai-khac]]`; slug phải trỏ tới một bài học **hoặc bài tập** có
  thật (hai loại dùng chung một không gian tên slug, url được suy ra: `/n/…` hay `/bt/…`).

Sửa xong chạy `pnpm content:sync` rồi tải lại trang. Lệnh này ghi đè `data/` nhưng giữ
nguyên trạng thái ghim; bài nào đổi slug thì mất ghim và script sẽ in ra danh sách đó.

## Soạn bài tập

Bài tập thuật toán nằm ở `content/bai-tap/NN-slug.md` — cùng quy ước tên file với bài học,
nhưng là **thực thể riêng**: nó không thuộc công nghệ nào và không nằm trong lộ trình nào.

````markdown
---
title: Hai tổng
slug: hai-tong
do_kho: de                  # de | trung-binh | kho
chu_de: [mang, bang-bam]    # đi qua bảng nhãn như tag bài học
ham: haiTong                # tên hàm bộ chấm sẽ gọi
bai_hoc: bang-bam           # tuỳ chọn — slug bài học dạy kỹ thuật này
so_sanh: chinh-xac          # chinh-xac | tap-hop (bỏ qua thứ tự)
---

Đề bài viết bằng markdown.

```js starter
function haiTong(nums, target) {}
```

```json test
[{ "vao": [[2, 7, 11, 15], 9], "ra": [0, 1], "mo_ta": "ví dụ", "an": false }]
```

## Lời giải

Mọi thứ từ heading này trở đi bị ẩn sau nút "Xem lời giải".
````

Khối code đầu tiên của mỗi ngôn ngữ trong phần lời giải được trích ra thành `maLoiGiai`
lúc build, để panel bên cạnh ô soạn đổi qua lại JS/Python mà không phải cuộn. Trích bằng
đúng hàm mà test "chạy lời giải qua bộ test của nó" dùng, nên thứ hiện trên panel đúng là
thứ đã được kiểm. Từ `xl` trở lên khu làm bài chia hai cột (ô soạn | lời giải, panel
`sticky`); hẹp hơn thì panel xếp xuống dưới ô soạn.

Code lời giải vì vậy xuất hiện hai chỗ trên cùng trang — panel để liếc lúc đang gõ, và
phần phân tích ở cuối trang để đọc liền mạch. Cách tránh trùng là gỡ code khỏi phần phân
tích, nhưng khi đó các câu dẫn kiểu "cùng ý tưởng bằng Python…" thành mồ côi.

Vì sao bộ test nằm trong thân bài chứ không ở frontmatter: bộ đọc frontmatter của dự án chỉ
nhận giá trị vô hướng và mảng chuỗi một dòng (có chủ đích — xem `src/lib/frontmatter.ts`), mà
một ca test là object lồng nhau.

- `vao` là danh sách **đối số**, không phải một giá trị: hàm hai tham số cần `[nums, target]`.
- `an: true` giấu dữ liệu của ca đó, chỉ hiện đạt/không đạt — chống việc code cứng đáp án.
- **Liên kết là một chiều:** chỉ bài tập khai `bai_hoc`; danh sách "luyện tập phần này" ở cuối
  bài học được suy ra ngược lúc build, nên không có gì để lệch.
- Có test chạy **chính lời giải trong file** qua **chính bộ test của nó** — một giá trị `ra`
  gõ sai sẽ làm test đỏ, thay vì âm thầm báo sai cho người học đúng. Lời giải JavaScript
  chạy trong vitest; lời giải Python chạy bằng `python3` thật, tự bỏ qua nếu máy không có.

Ô soạn có **gợi ý code offline** (CodeMirror autocomplete): từ khoá, snippet `for`/`function`
và biến đã khai trong chính code đang viết đến sẵn từ hai gói `@codemirror/lang-*`; phần
method sau dấu chấm nằm ở `src/lib/exercise/completion.ts`. Danh sách method đó **biên soạn
tay và không biết kiểu thật của biến** — CodeMirror không có bộ suy luận kiểu, và giải pháp
"đúng kiểu" là nạp TypeScript (~7MB) vào trình duyệt cho một ô soạn 30 dòng. Đổi lại người
học tra được tên hàm đã quên, nhưng có thể thấy method không áp dụng cho biến đang gõ.
`Ctrl+Space` gọi gợi ý, `Tab` nhận, `Esc` đóng.

Người học giải bằng **JavaScript hoặc Python**. Khối `py starter` là tuỳ chọn — không có
thì bài đó chỉ hiện JavaScript. Tên hàm Python suy ra từ `ham` theo snake_case
(`haiTong` → `hai_tong`), khai `ham_py` để ghi đè.

Code chạy trong **Web Worker** ở máy người học, timeout 3 giây; Python chạy bằng Pyodide
(CPython trên WebAssembly, tải ~8MB lần đầu). Không có gì gửi lên máy chủ; bài làm và tiến
độ nằm trong `localStorage` (bản triển khai công khai chỉ đọc, xem bên dưới).

Vì sao Web Worker chứ không chạy thẳng trên trang: `while (true) {}` của người học chặn
luôn cả `setTimeout`, nên chỉ `terminate()` từ luồng chính mới dừng được. Đây là cơ chế
timeout duy nhất hoạt động thật trong trình duyệt.

## Dữ liệu

Bốn file JSON trong `data/`. Sao lưu: mở `/api/export`. Phục hồi: `POST /api/import` với chính file đó.

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

## Tìm kiếm (⌘K)

Chạy ở **máy chủ** qua `/api/search`, không phải ở client.

Bản đầu dựng chỉ mục đầy đủ trong `layout.tsx` rồi truyền xuống client qua props. Cách đó
đơn giản và tìm tức thì, nhưng chỉ mục phải mang theo **toàn bộ nội dung bài học** để tìm
được cả trong thân bài — nghĩa là mọi trang, kể cả trang không ai bấm ⌘K, đều tải kèm cả
giáo trình. Đo trên bản production với 157 bài:

| Trang | Chỉ mục ở client | Qua `/api/search` |
|---|---|---|
| `/` | 1,43 MB | 306 KB |
| `/bt` | 1,26 MB | 129 KB |
| `/n/<bài>` | 1,29 MB | 160 KB |

Xếp hạng vẫn do `src/lib/search.ts` quyết định — cùng một hàm thuần đã có test, chỉ đổi chỗ
chạy. Client gọi sau khi ngừng gõ 120ms và huỷ lượt cũ bằng `AbortController`; thiếu phần
huỷ thì kết quả của truy vấn cũ về sau có thể ghi đè kết quả mới.

Chỉ mục gồm cả bài học lẫn bài tập; mỗi mục mang theo `href` của nó nên nơi hiển thị không
phải biết kết quả thuộc loại nào.

## Menu trái

Bốn tầng, chỉ tầng cây cuộn được: logo / điều hướng chính (Trang chủ, Bài tập) / cây giáo
trình / link sao lưu. Với 27 công nghệ, cây chắc chắn dài hơn màn hình — để cả khối cuộn thì
logo và các mục chính trôi mất khỏi tầm mắt.

Mục nào đang sáng do `src/lib/nav-active.ts` quyết định, không phải do so chuỗi rải trong
JSX. Bản trước chỉ so `pathname === '/t/<slug>'`, nên **đang đọc bài học thì không mục nào
sáng** — mất dấu vị trí ở đúng nơi người đọc ở lâu nhất.

| Đường dẫn | Mục sáng |
|---|---|
| `/` | Trang chủ |
| `/bt`, `/bt/<slug>` | Bài tập |
| `/c/<slug>` | Mảng đó |
| `/t/<slug>` | Công nghệ đó |
| `/n/<slug>`, `/n/<slug>/edit` | Công nghệ **chứa** bài đó |
| `/n/new` | Không mục nào |

URL bài học không mang tên công nghệ, nên sidebar nhận thêm bảng tra `slug bài → slug công
nghệ` (~6KB, chỉ hai chuỗi mỗi bài — không kèm nội dung).

Quy ước tô màu: **chỉ một vùng sáng tại một thời điểm**. Mục đang xem có nền accent, thanh
dọc bên trái và `aria-current="page"`; mảng chứa nó chỉ đậm chữ và tự mở ra chứ không tô nền
— hai vùng sáng cùng lúc làm người đọc không biết mình đang ở đâu. Mục đang xem được cuộn
vào giữa khi mở trang, nhưng chỉ khi nó nằm ngoài vùng nhìn.

## Kiến trúc

- `src/lib/db/` — nơi **duy nhất** chạm tới dữ liệu. Không file nào trong `app/` hay `components/` được đọc file trực tiếp.
- `src/lib/actions/` — Server Actions, luôn trả `{ok:true|false}`, không throw ra UI.
- `src/lib/{slug,search,markdown,tags,tag-label,category-color,level,reading-time,frontmatter}.ts` — hàm thuần, có unit test.
- `scripts/build-content.ts` — bộ biên dịch giáo trình; là nơi duy nhất đọc `content/`.
- `src/lib/db/seed-data.json` — **file sinh tự động**, đừng sửa tay.

### Giao diện

- **Font — bốn vai trò, một superfamily (IBM Plex).** Bản trước ghép bốn họ chữ của bốn xưởng
  khác nhau (Fraunces / Source Serif 4 / Be Vietnam Pro / JetBrains Mono): tương phản mạnh,
  nhưng chiều cao chữ x, độ dày nét và cách đặt dấu của chúng không bao giờ khớp hẳn — thấy rõ
  nhất ở chỗ một nhãn mono nằm ngay cạnh một dòng thân bài. Plex vẽ cả ba kiểu trên cùng một bộ
  xương nên mọi chỗ tiếp giáp đều khớp; giá phải trả là **ít cá tính hơn**.

  | Vai trò | Font | Biến | Vì sao |
  |---|---|---|---|
  | Display (h1, h2) | `IBM Plex Sans` | `--font-heading` | 600 + `letter-spacing: -0.02em`; sans ở cỡ tiêu đề phải siết mới thành một khối |
  | Body (văn xuôi bài học) | `IBM Plex Serif` | `--font-body` | Chỗ duy nhất dùng serif; giáo trình là ~14,5 giờ đọc nên chọn theo tiêu chí đọc lâu |
  | Utility (vỏ giao diện) | `IBM Plex Sans` | `--font-sans` | 400–500, không siết tracking — cỡ 13–14px cần thưa mới dễ quét mắt |
  | Code (dữ kiện máy móc) | `IBM Plex Mono` | `--font-mono` | Có tiếng Việt, cần cho comment tiếng Việt trong khối code |

  **Ba họ cho bốn vai trò thì buộc phải có đúng một chỗ trùng, và đặt nó ở đâu là quyết định
  chính của bảng trên**: trùng ở Display ↔ Utility, *không* trùng ở Display ↔ Body. Tương phản
  đáng tiền là tương phản giữa tiêu đề và thân bài, vì đó là hai thứ người đọc thấy cạnh nhau
  suốt bài; còn tiêu đề với breadcrumb thì đã cách nhau 18px cỡ chữ và 200 đơn vị độ dày rồi.

  Ràng buộc loại: **cả ba phải có subset `vietnamese`**. Thiếu nó thì dấu chồng (ế, ữ, ỗ) rơi
  về font dự phòng và lệch hẳn khỏi phần chữ còn lại — rất nhiều font đẹp trượt ở đúng chỗ này
  (Instrument Serif, Onest, Red Hat, Fira Code). Cả ba kiểu của Plex đều có.

  Hai chi tiết đi kèm việc đổi font, không phải trang trí: Plex Serif là font **tĩnh** nên
  `style: ['normal', 'italic']` phải kê tay, nếu không trình duyệt làm nghiêng giả và với serif
  thì lộ ngay ở chân nét; và Plex Mono có chiều cao chữ x nhỏ hơn JetBrains Mono nên cỡ khối
  code nhích từ `0.855rem` lên `0.9rem` (code trong câu: `0.86em` → `0.91em`) để vẫn cân với
  dòng serif bên cạnh.

  Quy ước cũ giữ nguyên: cái gì máy biết thì monospace — code, nhãn ngôn ngữ, `Bài 3/6`, thời gian đọc.

  *Một lỗi cần tránh khi sửa lại chỗ này: `--font-sans: var(--font-sans)` tự tham chiếu nên vô
  hiệu, cả trang rơi về serif mặc định của trình duyệt. Và đừng lẫn `--font-heading` trỏ về
  cùng `--font-sans-loaded` (cố ý, xem trên) với lỗi cũ là nó trỏ về đúng font **thân bài** —
  lúc đó tiêu đề với văn xuôi y hệt nhau.*

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
