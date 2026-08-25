# Bài tập thuật toán có chấm bài trong trình duyệt

Ngày: 2026-08-25 · Trạng thái: đã duyệt, đang làm mảnh 1

## Vấn đề

Giáo trình hiện có 149 bài học chỉ để đọc. Với thuật toán, đọc không đủ — người học
phải tự viết code và biết ngay mình đúng hay sai. Cần một loại nội dung mới: bài tập
kiểu LeetCode, chấm bài tự động ngay trên web.

## Ràng buộc từ repo

1. **Bản deploy là chỉ đọc** (`src/lib/db/mode.ts` — FS của Vercel không ghi được).
   Nên tiến độ giải bài và code đang gõ dở **phải** nằm ở `localStorage`, không có
   đường nào khác trừ khi thay tầng lưu trữ.
2. **Frontmatter tự viết chỉ đọc được giá trị vô hướng và mảng chuỗi một dòng**
   (`src/lib/frontmatter.ts`). Bộ test không thể nằm trong frontmatter — nó phải là
   khối code có nhãn trong thân bài.
3. **Trang bài học gần như không có JS** (markdown render ở server). Trang bài tập là
   loại trang thứ hai, có JS — không nhét runner vào `NoteContent` được.

## Cắt phạm vi

| Mảnh | Nội dung | Trạng thái |
|---|---|---|
| 1 | Loại nội dung bài tập + pipeline build + runner JavaScript + trang `/bt/[slug]` + 5 bài mẫu | Đang làm |
| 2 | Python qua Pyodide, chuyển ngôn ngữ | Sau |
| 3 | Kho bài tập `/bt` có lọc + mảng bài học lý thuyết "Thuật toán & luyện tập" | Sau |

## Mô hình dữ liệu

Một bài tập là một file `content/bai-tap/NN-<slug>.md` (giữ đúng quy ước tên file của
bài học, để thứ tự nhìn thấy ngay từ tên file):

```markdown
---
title: Hai tổng
slug: hai-tong
do_kho: de
chu_de: [mang, bang-bam]
ham: haiTong
bai_hoc: bang-bam        # tuỳ chọn — liên kết MỘT chiều tới bài học
so_sanh: chinh-xac       # hoặc: tap-hop (không quan tâm thứ tự)
---

Đề bài viết bằng markdown...

```js starter
function haiTong(nums, target) {}
```

```json test
[{ "vao": [[2,7,11,15], 9], "ra": [0,1] }]
```

```js loi-giai
function haiTong(nums, target) { ... }
```

## Phân tích
Độ phức tạp... (phần này hiện sau khi người học bấm "Xem lời giải")
```

Bốn khối có nhãn (`starter`, `test`, `loi-giai`, và `## Phân tích` sau khối lời giải)
được **tách khỏi thân bài** lúc build; phần còn lại là đề bài.

**Liên kết một chiều là quyết định có chủ đích:** chỉ bài tập khai `bai_hoc`, còn danh
sách "bài tập luyện phần này" ở cuối bài học được suy ra ngược lúc build. Một nguồn sự
thật, không có gì để lệch.

## Kiến trúc

```
content/bai-tap/*.md
   │ scripts/build-content.ts  (mở rộng: đọc thêm thư mục bài tập)
   ▼
data/exercises.json + src/lib/db/seed-data.json
   │ src/lib/db/exercises.repo.ts
   ▼
/bt/[slug]/page.tsx   (server: render đề bài bằng renderMarkdown có sẵn)
   └── <ExerciseRunner>  (client)
         ├── <CodeEditor>     CodeMirror 6, ~170KB
         └── worker chấm bài  runner.worker.ts
```

**Vì sao chấm bài trong Web Worker chứ không chạy thẳng trên trang:** vòng lặp vô hạn
của người học sẽ treo cả tab và không có cách nào dừng. Worker thì `terminate()` được
từ luồng chính sau 3 giây — đây là cơ chế timeout duy nhất hoạt động thật trong trình
duyệt. Worker cũng không chạm được DOM, `localStorage` hay cookie của trang.

## Các đơn vị và ranh giới

| Đơn vị | Việc | Test |
|---|---|---|
| `lib/exercise/parse.ts` | markdown → khối starter/test/lời giải + đề bài | vitest, thuần |
| `lib/exercise/compare.ts` | so sánh kết quả (`chinh-xac` \| `tap-hop`) | vitest, thuần |
| `lib/exercise/format.ts` | định dạng giá trị để hiện trong bảng kết quả | vitest, thuần |
| `runner.worker.ts` | nạp code người dùng, chạy từng ca | logic thuần đã tách ra ngoài |
| `ExerciseRunner.tsx` | trạng thái UI, timeout, localStorage | thủ công |
| `CodeEditor.tsx` | bọc CodeMirror | thủ công |

## Chấm bài

Mỗi ca test chạy độc lập, thu về `{ dat, vao, mongDoi, thucNhan, ms, loi }`.
Worker bị `terminate()` ở giây thứ 3 → báo "quá thời gian" cho ca đang chạy và
những ca sau. Lỗi cú pháp báo ở ca đầu tiên kèm nguyên văn thông báo của engine.

`so_sanh: tap-hop` dành cho bài có nhiều đáp án đúng (ví dụ "liệt kê mọi bộ ba"):
so sánh sau khi chuẩn hoá thứ tự ở cả hai tầng.

## Lưu trạng thái

`localStorage`, một khoá cho mỗi bài: `kh:bt:<slug>:<ngon-ngu>` giữ code đang gõ,
`kh:bt:solved` giữ tập slug đã giải xong. Không đồng bộ, không server — nhất quán với
chế độ chỉ đọc của bản deploy.

## Không làm (YAGNI)

- Không có tài khoản, không bảng xếp hạng, không streak.
- Không đo thời gian chạy để so sánh giữa người dùng — số ms hiện ra chỉ để tham khảo.
- Không kiểm tra độ phức tạp tự động; phần đó thuộc về lời giải viết tay.
- Không nộp bài lên server, không lưu lịch sử nộp.
