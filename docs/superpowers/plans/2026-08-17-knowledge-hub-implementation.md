# Knowledge Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây web app local "Knowledge Hub" — sổ tay tra cứu kiến thức dev cá nhân, duyệt theo cây Mảng → Công nghệ → Ghi chú, tìm bằng ⌘K, CRUD ghi chú markdown.

**Architecture:** Next.js 15 App Router. Toàn bộ dữ liệu nằm trong 3 file JSON dưới `data/`, chỉ được truy cập qua `src/lib/db/*.repo.ts` (repository pattern) — đây là điều kiện để sau này đổi sang SQLite mà không sửa UI. Đọc dữ liệu bằng Server Components; ghi dữ liệu bằng Server Actions trả về `{ok:true|false}` thay vì throw. Các hàm thuần (`slug`, `search`, `markdown`) tách riêng để unit test được.

**Tech Stack:** Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, shadcn/ui, zod 3, react-hook-form, unified/remark + shiki, cmdk, next-themes, sonner, vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-17-web-tutorial-knowledge-hub-design.md`

## Global Constraints

- Package manager: **pnpm** (đã có pnpm 11.3.0, Node v24.15.0). Không dùng npm/yarn.
- Next.js **15.x** (App Router). Không nâng lên 16 trong phạm vi plan này.
- TypeScript `strict: true`. Không dùng `any`; không dùng `@ts-ignore`.
- Tailwind CSS **v4** (dùng `@tailwindcss/postcss`, `@import "tailwindcss"` — không có `tailwind.config.js` theo kiểu v3).
- zod **^3.25** và `@hookform/resolvers` **^3.10** (pin để tránh lệch API giữa zod 3/4).
- **Quy tắc kiến trúc bất khả xâm phạm:** không file nào trong `src/app/` hay `src/components/` được `import fs`, `import path`, hay đọc file JSON trực tiếp. Mọi truy cập dữ liệu qua `src/lib/db/*.repo.ts`.
- Toàn bộ chữ hiển thị cho người dùng: **tiếng Việt**. Tên biến/hàm/file: tiếng Anh.
- Mọi test dùng thư mục data tạm riêng qua biến môi trường `KH_DATA_DIR` — không test nào chạm `data/` thật.
- `id` do `nanoid` sinh; `slug` là khoá điều hướng URL. Sửa tiêu đề **không** đổi slug.
- Xoá có con (Category còn Topic, Topic còn Note) → **từ chối**, không cascade.
- Commit sau mỗi task (theo Conventional Commits, message tiếng Việt hoặc tiếng Anh nhất quán trong repo — dùng tiếng Việt cho phần mô tả như commit hiện có).

## File Structure

| File | Trách nhiệm |
|---|---|
| `data/{categories,topics,notes}.json` | Dữ liệu thật, được commit vào repo |
| `src/lib/db/schema.ts` | zod schema + type suy ra — nguồn sự thật duy nhất của mô hình dữ liệu |
| `src/lib/db/json-store.ts` | Đọc/ghi JSON: atomic write, serialize ghi, validate, lỗi rõ ràng |
| `src/lib/db/categories.repo.ts` | API dữ liệu cho Category |
| `src/lib/db/topics.repo.ts` | API dữ liệu cho Topic |
| `src/lib/db/notes.repo.ts` | API dữ liệu cho Note |
| `src/lib/db/seed.ts` | Nội dung khởi tạo + `ensureSeeded()` |
| `src/lib/slug.ts` | `slugify` (bỏ dấu tiếng Việt), `uniqueSlug`, `normalizeText` |
| `src/lib/search.ts` | Hàm tìm kiếm + xếp hạng (thuần, không React) |
| `src/lib/markdown.ts` | Markdown → HTML (shiki) + trích TOC |
| `src/lib/actions/note.actions.ts` | Server Actions cho Note |
| `src/lib/actions/topic.actions.ts` | Server Actions cho Topic |
| `src/components/layout/*` | AppSidebar, Topbar, ThemeToggle, Breadcrumbs |
| `src/components/notes/*` | NoteCard, NoteContent, NoteForm, TagBadge, StarButton, Toc, CopyButton |
| `src/components/search/SearchPalette.tsx` | ⌘K |
| `src/app/**` | Route: layout, dashboard, `/c/[category]`, `/t/[topic]`, `/n/[note]`, form, api export/import |
| `tests/lib/**` | vitest cho tầng dữ liệu và các hàm thuần |

Files thay đổi cùng nhau thì ở cùng chỗ: mỗi repo đứng cạnh `json-store.ts` và `schema.ts` nó dùng; component của một tính năng nằm trong folder tính năng đó, không tách theo tầng kỹ thuật.

---

### Task 1: Khởi tạo project và bộ test

**Files:**
- Create: toàn bộ scaffold Next.js (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `postcss.config.mjs`, `src/app/globals.css`)
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`
- Modify: `package.json` (scripts)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: chưa có gì.
- Produces: `pnpm test`, `pnpm dev`, `pnpm build`, `pnpm typecheck` chạy được; alias `@/*` → `src/*` dùng được cả trong Next lẫn vitest.

- [ ] **Step 1: Scaffold Next.js 15 vào thư mục hiện tại**

```bash
pnpm dlx create-next-app@15 . --ts --tailwind --app --eslint --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```

Nếu CLI hỏi ghi đè `.gitignore`/`docs` → chọn giữ file có sẵn (không ghi đè `docs/`).

- [ ] **Step 2: Kiểm tra version đã scaffold đúng**

```bash
node -e "const p=require('./package.json');console.log('next',p.dependencies.next);console.log('tw',p.devDependencies?.tailwindcss??p.dependencies?.tailwindcss);console.log('pc',Object.keys({...p.dependencies,...p.devDependencies}).filter(k=>k.includes('tailwind')))"
```

Expected: `next 15.x`, tailwind `4.x`, và có `@tailwindcss/postcss`.

Nếu `next` không phải 15.x: `pnpm add next@^15.5.0 && pnpm add -D eslint-config-next@^15.5.0`.
Nếu tailwind là 3.x (có `tailwind.config.ts` + `autoprefixer`): chạy
```bash
pnpm remove tailwindcss autoprefixer postcss && pnpm add -D tailwindcss@^4 @tailwindcss/postcss
```
rồi đặt `postcss.config.mjs` thành `export default { plugins: { "@tailwindcss/postcss": {} } }`, xoá `tailwind.config.ts`, và trong `src/app/globals.css` thay các dòng `@tailwind base/components/utilities` bằng một dòng `@import "tailwindcss";`.

- [ ] **Step 3: Bật strict và kiểm tra tsconfig**

Mở `tsconfig.json`, đảm bảo có:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```
(`noUncheckedIndexedAccess` thêm vào — nó bắt lỗi truy cập mảng ngoài biên ngay khi biên dịch, đúng tinh thần "code là tài liệu học".)

- [ ] **Step 4: Cài bộ test**

```bash
pnpm add -D vitest vite-tsconfig-paths
```

- [ ] **Step 5: Tạo `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // tsconfigPaths cho phép test import bằng alias "@/lib/..." giống code app.
  plugins: [tsconfigPaths()],
  test: {
    // Tầng dữ liệu chạy trên Node (fs), không cần jsdom.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 6: Viết test smoke (đang fail vì chưa có script)**

`tests/smoke.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

describe('bộ test', () => {
  it('chạy được và alias @/ hoạt động', async () => {
    const mod = await import('@/lib/version')
    expect(mod.APP_NAME).toBe('Knowledge Hub')
  })
})
```

- [ ] **Step 7: Chạy test để thấy fail**

Thêm scripts vào `package.json` trước:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```
Run: `pnpm test`
Expected: FAIL — không resolve được `@/lib/version`.

- [ ] **Step 8: Tạo file để test pass**

`src/lib/version.ts`:
```ts
export const APP_NAME = 'Knowledge Hub'
```

- [ ] **Step 9: Chạy lại test + typecheck + build**

```bash
pnpm test && pnpm typecheck && pnpm build
```
Expected: test PASS, typecheck không lỗi, build thành công.

- [ ] **Step 10: Cập nhật `.gitignore`**

Đảm bảo có (giữ các dòng đã có, thêm dòng còn thiếu):
```
node_modules/
.next/
.DS_Store
*.tmp
settings.local.json
coverage/
```
`data/` **không** được ignore — dữ liệu ghi chú là nội dung cần commit.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: khởi tạo Next.js 15 + Tailwind v4 + vitest"
```

---

### Task 2: Schema dữ liệu (zod)

**Files:**
- Create: `src/lib/db/schema.ts`
- Test: `tests/lib/db/schema.test.ts`

**Interfaces:**
- Consumes: không.
- Produces:
  - `CategorySchema`, `TopicSchema`, `NoteSchema` (zod objects)
  - `type Category`, `type Topic`, `type Note`
  - `CategoryCreateSchema`, `TopicCreateSchema`, `NoteCreateSchema`, `NoteUpdateSchema`
  - `type NoteCreateInput = z.input<typeof NoteCreateSchema>`, `type NoteUpdateInput`, `type CategoryCreateInput`, `type TopicCreateInput` (dùng `z.input`, không phải `z.infer`)
  - `SlugSchema`, `IsoDateSchema`
  - `ExportBundleSchema` + `type ExportBundle`

- [ ] **Step 1: Cài zod**

```bash
pnpm add zod@^3.25
```

- [ ] **Step 2: Viết test cho schema**

`tests/lib/db/schema.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { NoteSchema, NoteCreateSchema, SlugSchema } from '@/lib/db/schema'

const validNote = {
  id: 'n1',
  topicId: 't1',
  title: 'async/await',
  slug: 'async-await',
  summary: 'Cách JS xử lý bất đồng bộ.',
  content: '# Nội dung',
  tags: ['javascript'],
  starred: false,
  createdAt: '2026-08-17T08:00:00.000Z',
  updatedAt: '2026-08-17T08:00:00.000Z',
}

describe('SlugSchema', () => {
  it('nhận slug kebab-case', () => {
    expect(SlugSchema.safeParse('async-await-2').success).toBe(true)
  })

  it('từ chối slug có hoa, dấu cách hoặc dấu tiếng Việt', () => {
    for (const bad of ['Async', 'async await', 'bất-đồng-bộ', '-a', 'a-']) {
      expect(SlugSchema.safeParse(bad).success).toBe(false)
    }
  })
})

describe('NoteSchema', () => {
  it('nhận note hợp lệ', () => {
    expect(NoteSchema.parse(validNote)).toEqual(validNote)
  })

  it('từ chối timestamp không phải ISO', () => {
    const r = NoteSchema.safeParse({ ...validNote, createdAt: '17/08/2026' })
    expect(r.success).toBe(false)
  })

  it('từ chối tiêu đề rỗng', () => {
    expect(NoteSchema.safeParse({ ...validNote, title: '' }).success).toBe(false)
  })
})

describe('NoteCreateSchema', () => {
  it('không cần id/timestamp, tự mặc định tags và starred', () => {
    const parsed = NoteCreateSchema.parse({
      topicId: 't1',
      title: 'Generic',
      summary: 'Tóm tắt',
      content: 'nội dung',
    })
    expect(parsed.tags).toEqual([])
    expect(parsed.starred).toBe(false)
    expect(parsed.slug).toBeUndefined()
  })

  it('cắt khoảng trắng đầu/cuối tiêu đề', () => {
    expect(NoteCreateSchema.parse({
      topicId: 't1', title: '  Generic  ', summary: 's', content: 'c',
    }).title).toBe('Generic')
  })
})
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `pnpm test tests/lib/db/schema.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/db/schema`.

- [ ] **Step 4: Viết `src/lib/db/schema.ts`**

```ts
import { z } from 'zod'

/**
 * Đây là nguồn sự thật duy nhất của mô hình dữ liệu: type TypeScript được suy ra
 * từ schema bằng z.infer, nên type và validate không bao giờ lệch nhau.
 */

/** Slug là khoá điều hướng trên URL: chỉ chữ thường, số, và dấu gạch nối ở giữa. */
export const SlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch nối')

/** Chuỗi thời gian ISO 8601. Tự viết refine thay vì .datetime() để không phụ thuộc phiên bản zod. */
export const IsoDateSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)) && v.includes('T'), 'Thời gian phải ở dạng ISO 8601')

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  slug: SlugSchema,
  description: z.string().default(''),
  icon: z.string().min(1),
  color: z.string().min(1),
  order: z.number().int().nonnegative(),
})

export const TopicSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().trim().min(1),
  slug: SlugSchema,
  description: z.string().default(''),
  order: z.number().int().nonnegative(),
})

export const NoteSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống'),
  slug: SlugSchema,
  summary: z.string().trim().default(''),
  content: z.string().default(''),
  tags: z.array(z.string().trim().min(1)).default([]),
  starred: z.boolean().default(false),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
})

export type Category = z.infer<typeof CategorySchema>
export type Topic = z.infer<typeof TopicSchema>
export type Note = z.infer<typeof NoteSchema>

/**
 * Input khi tạo: repo tự sinh id/createdAt/updatedAt, và tự sinh slug từ tiêu đề
 * nếu người dùng không nhập slug.
 */
export const NoteCreateSchema = NoteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  slug: true,
}).extend({
  slug: SlugSchema.optional(),
})

/** Input khi sửa: mọi trường đều tuỳ chọn; không cho sửa id/timestamp từ ngoài. */
export const NoteUpdateSchema = NoteCreateSchema.partial()

export const CategoryCreateSchema = CategorySchema.omit({ id: true, slug: true }).extend({
  slug: SlugSchema.optional(),
})
export const TopicCreateSchema = TopicSchema.omit({ id: true, slug: true }).extend({
  slug: SlugSchema.optional(),
})

/**
 * Dùng z.input (không phải z.infer): trường có .default() là TUỲ CHỌN với người gọi,
 * và chỉ chắc chắn có giá trị sau khi schema.parse() chạy bên trong repo.
 */
export type NoteCreateInput = z.input<typeof NoteCreateSchema>
export type NoteUpdateInput = z.input<typeof NoteUpdateSchema>
export type CategoryCreateInput = z.input<typeof CategoryCreateSchema>
export type TopicCreateInput = z.input<typeof TopicCreateSchema>

/** Định dạng file backup của /api/export và /api/import. */
export const ExportBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: IsoDateSchema,
  categories: z.array(CategorySchema),
  topics: z.array(TopicSchema),
  notes: z.array(NoteSchema),
})
export type ExportBundle = z.infer<typeof ExportBundleSchema>
```

- [ ] **Step 5: Chạy test để thấy pass**

Run: `pnpm test tests/lib/db/schema.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts tests/lib/db/schema.test.ts package.json pnpm-lock.yaml
git commit -m "feat(db): zod schema cho Category, Topic, Note"
```

---

### Task 3: `json-store.ts` — đọc/ghi JSON an toàn

**Files:**
- Create: `src/lib/db/json-store.ts`
- Test: `tests/lib/db/json-store.test.ts`

**Interfaces:**
- Consumes: `schema.ts` (chỉ dùng kiểu `z.ZodType`).
- Produces:
  - `class DataFileError extends Error { file: string }`
  - `dataDir(): string` — thư mục dữ liệu, đọc `process.env.KH_DATA_DIR` mỗi lần gọi
  - `readCollection<T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T[]>`
  - `writeCollection<T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, items: T[]): Promise<void>`
  - `mutate<T, R>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, fn: (items: T[]) => { items: T[]; result: R }): Promise<R>`
  - Ba tham số kiểu là bắt buộc: `z.ZodType<T>` ép `Input = Output`, nên schema có `.default()` (Note, Category, Topic) sẽ khiến TypeScript suy `T` ra kiểu ĐẦU VÀO và mọi repo đỏ typecheck.

- [ ] **Step 1: Viết test**

`tests/lib/db/json-store.test.ts`:
```ts
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { DataFileError, mutate, readCollection, writeCollection } from '@/lib/db/json-store'

const ItemSchema = z.object({ id: z.string(), n: z.number() })
type Item = z.infer<typeof ItemSchema>

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-test-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

describe('readCollection', () => {
  it('file chưa tồn tại thì tạo file rỗng và trả mảng rỗng', async () => {
    const items = await readCollection('items.json', ItemSchema)
    expect(items).toEqual([])
    expect(await fs.readFile(path.join(dir, 'items.json'), 'utf8')).toBe('[]')
  })

  it('đọc lại đúng dữ liệu đã ghi', async () => {
    await writeCollection('items.json', ItemSchema, [{ id: 'a', n: 1 }])
    expect(await readCollection('items.json', ItemSchema)).toEqual([{ id: 'a', n: 1 }])
  })

  it('JSON hỏng thì throw DataFileError và KHÔNG ghi đè file', async () => {
    const file = path.join(dir, 'items.json')
    await fs.writeFile(file, '{ hỏng')
    await expect(readCollection('items.json', ItemSchema)).rejects.toBeInstanceOf(DataFileError)
    expect(await fs.readFile(file, 'utf8')).toBe('{ hỏng')
  })

  it('dữ liệu sai schema thì throw DataFileError kèm tên file', async () => {
    await fs.writeFile(path.join(dir, 'items.json'), JSON.stringify([{ id: 'a', n: 'sai' }]))
    await expect(readCollection('items.json', ItemSchema)).rejects.toThrow(/items\.json/)
  })
})

describe('writeCollection', () => {
  it('không để lại file .tmp sau khi ghi xong', async () => {
    await writeCollection('items.json', ItemSchema, [{ id: 'a', n: 1 }])
    const files = await fs.readdir(dir)
    expect(files.some((f) => f.endsWith('.tmp'))).toBe(false)
  })

  it('từ chối ghi dữ liệu sai schema và giữ nguyên file cũ', async () => {
    await writeCollection('items.json', ItemSchema, [{ id: 'a', n: 1 }])
    const bad = [{ id: 'b' }] as unknown as Item[]
    await expect(writeCollection('items.json', ItemSchema, bad)).rejects.toBeInstanceOf(DataFileError)
    expect(await readCollection('items.json', ItemSchema)).toEqual([{ id: 'a', n: 1 }])
  })
})

describe('mutate', () => {
  it('trả về result của hàm biến đổi', async () => {
    const created = await mutate('items.json', ItemSchema, (items) => {
      const item: Item = { id: 'a', n: 1 }
      return { items: [...items, item], result: item }
    })
    expect(created).toEqual({ id: 'a', n: 1 })
  })

  it('hai lần ghi đồng thời không mất update', async () => {
    await writeCollection('items.json', ItemSchema, [])
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        mutate('items.json', ItemSchema, (items) => ({
          items: [...items, { id: `id-${i}`, n: i }],
          result: null,
        })),
      ),
    )
    const items = await readCollection('items.json', ItemSchema)
    expect(items).toHaveLength(20)
    expect(new Set(items.map((i) => i.id)).size).toBe(20)
  })

  it('hàm biến đổi throw thì file không đổi và hàng đợi vẫn chạy tiếp', async () => {
    await writeCollection('items.json', ItemSchema, [{ id: 'a', n: 1 }])
    await expect(
      mutate('items.json', ItemSchema, () => {
        throw new Error('lỗi nghiệp vụ')
      }),
    ).rejects.toThrow('lỗi nghiệp vụ')

    await mutate('items.json', ItemSchema, (items) => ({
      items: [...items, { id: 'b', n: 2 }],
      result: null,
    }))
    expect(await readCollection('items.json', ItemSchema)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `pnpm test tests/lib/db/json-store.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/db/json-store`.

- [ ] **Step 3: Viết `src/lib/db/json-store.ts`**

```ts
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { z } from 'zod'

/**
 * Lớp lưu trữ thấp nhất: đọc/ghi một file JSON chứa một mảng bản ghi.
 *
 * Ba rủi ro được xử lý ngay từ đầu vì đây là chỗ dễ mất dữ liệu nhất:
 *  1. Ghi nửa chừng    -> ghi ra file .tmp rồi rename (rename là atomic trên cùng FS).
 *  2. Ghi chồng nhau   -> mọi mutate đi qua một promise queue trong process.
 *  3. File hỏng        -> throw DataFileError, tuyệt đối không ghi đè.
 */

export class DataFileError extends Error {
  constructor(
    readonly file: string,
    reason: string,
  ) {
    super(`Lỗi dữ liệu ở file "${file}": ${reason}`)
    this.name = 'DataFileError'
  }
}

/** Đọc mỗi lần gọi (không cache) để test có thể trỏ sang thư mục tạm. */
export function dataDir(): string {
  return process.env.KH_DATA_DIR ?? path.join(process.cwd(), 'data')
}

function fullPath(file: string): string {
  return path.join(dataDir(), file)
}

/** Hàng đợi ghi: các mutate nối đuôi nhau, lỗi của cái trước không chặn cái sau. */
let queue: Promise<unknown> = Promise.resolve()

function enqueue<R>(task: () => Promise<R>): Promise<R> {
  const run = queue.then(task, task)
  queue = run.catch(() => undefined)
  return run
}

async function writeAtomic(target: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true })
  const tmp = `${target}.tmp`
  await fs.writeFile(tmp, contents, 'utf8')
  await fs.rename(tmp, target)
}

function serialize<T>(items: T[]): string {
  return `${JSON.stringify(items, null, 2)}\n`
}

function validate<T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, items: unknown): T[] {
  if (!Array.isArray(items)) {
    throw new DataFileError(file, 'nội dung phải là một mảng JSON')
  }
  const out: T[] = []
  for (const [index, raw] of items.entries()) {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(gốc)'}: ${i.message}`)
        .join('; ')
      throw new DataFileError(file, `bản ghi thứ ${index + 1} không hợp lệ — ${detail}`)
    }
    out.push(parsed.data)
  }
  return out
}

export async function readCollection<T>(
  file: string,
  // Input = unknown: dữ liệu đọc từ file JSON là chưa biết kiểu, schema mới là thứ dựng ra T.
  // Viết z.ZodType<T> sẽ ép Input = Output, khiến schema có .default() suy T ra kiểu đầu vào.
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<T[]> {
  let raw: string
  try {
    raw = await fs.readFile(fullPath(file), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File chưa có là trạng thái hợp lệ của app mới cài: tạo file rỗng.
      await writeAtomic(fullPath(file), '[]')
      return []
    }
    throw error
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new DataFileError(file, `không parse được JSON (${(error as Error).message})`)
  }

  return validate(file, schema, parsed)
}

export async function writeCollection<T>(
  file: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  items: T[],
): Promise<void> {
  // Validate TRƯỚC khi đụng vào file: sai schema thì file cũ còn nguyên.
  const validated = validate(file, schema, items)
  await writeAtomic(fullPath(file), serialize(validated))
}

/**
 * Đọc - biến đổi - ghi trong một lượt của hàng đợi. Đây là API duy nhất repo dùng
 * để thay đổi dữ liệu, nhờ vậy không có lost update giữa hai mutation song song.
 */
export function mutate<T, R>(
  file: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fn: (items: T[]) => { items: T[]; result: R },
): Promise<R> {
  return enqueue(async () => {
    const current = await readCollection(file, schema)
    const { items, result } = fn(current)
    await writeCollection(file, schema, items)
    return result
  })
}
```

- [ ] **Step 4: Chạy test để thấy pass**

Run: `pnpm test tests/lib/db/json-store.test.ts && pnpm typecheck`
Expected: PASS (10 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/json-store.ts tests/lib/db/json-store.test.ts
git commit -m "feat(db): json-store với atomic write và hàng đợi ghi"
```

---

### Task 4: `slug.ts` — sinh slug từ tiêu đề tiếng Việt

**Files:**
- Create: `src/lib/slug.ts`
- Test: `tests/lib/slug.test.ts`

**Interfaces:**
- Consumes: không.
- Produces:
  - `normalizeText(input: string): string` — lowercase + bỏ dấu (dùng chung với `search.ts`)
  - `slugify(input: string): string`
  - `uniqueSlug(base: string, taken: Iterable<string>): string`

- [ ] **Step 1: Viết test**

`tests/lib/slug.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { normalizeText, slugify, uniqueSlug } from '@/lib/slug'

describe('normalizeText', () => {
  it('bỏ dấu tiếng Việt và chuyển thường', () => {
    expect(normalizeText('Bất Đồng Bộ')).toBe('bat dong bo')
    expect(normalizeText('Học lập trình')).toBe('hoc lap trinh')
  })

  it('xử lý đủ các nguyên âm có dấu và chữ đ', () => {
    expect(normalizeText('ĐƯỜNG ăn Ổi ữ')).toBe('duong an oi u')
  })
})

describe('slugify', () => {
  it('tạo slug kebab-case từ tiêu đề tiếng Việt', () => {
    expect(slugify('Lập trình bất đồng bộ')).toBe('lap-trinh-bat-dong-bo')
  })

  it('bỏ ký tự đặc biệt và gộp gạch nối', () => {
    expect(slugify('async/await là gì?!')).toBe('async-await-la-gi')
    expect(slugify('  C++  &  C#  ')).toBe('c-c')
  })

  it('giữ số', () => {
    expect(slugify('OWASP Top 10')).toBe('owasp-top-10')
  })

  it('chuỗi không còn ký tự hợp lệ thì trả "ghi-chu"', () => {
    expect(slugify('!!!')).toBe('ghi-chu')
    expect(slugify('')).toBe('ghi-chu')
  })
})

describe('uniqueSlug', () => {
  it('trả nguyên slug khi chưa ai dùng', () => {
    expect(uniqueSlug('docker', ['nextjs'])).toBe('docker')
  })

  it('thêm hậu tố tăng dần khi trùng', () => {
    expect(uniqueSlug('docker', ['docker'])).toBe('docker-2')
    expect(uniqueSlug('docker', ['docker', 'docker-2'])).toBe('docker-3')
  })

  it('không nhảy cóc khi hậu tố ở giữa còn trống', () => {
    expect(uniqueSlug('docker', ['docker', 'docker-3'])).toBe('docker-2')
  })
})
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `pnpm test tests/lib/slug.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/slug`.

- [ ] **Step 3: Viết `src/lib/slug.ts`**

```ts
/**
 * Slug là khoá điều hướng trên URL nên phải ổn định và không dấu.
 * normalizeText được tách riêng vì search.ts cũng cần đúng phép chuẩn hoá này —
 * gõ "bat dong bo" phải tìm ra ghi chú tên "Bất đồng bộ".
 */

/** Bỏ dấu bằng NFD (tách dấu thành ký tự tổ hợp) rồi xoá dải Combining Diacritical Marks. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // xoá dải Combining Diacritical Marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

export function slugify(input: string): string {
  const slug = normalizeText(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug === '' ? 'ghi-chu' : slug
}

/** Trả về base, hoặc base-2, base-3... cho tới khi không trùng với slug nào đang dùng. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
```

- [ ] **Step 4: Chạy test để thấy pass**

Run: `pnpm test tests/lib/slug.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/slug.ts tests/lib/slug.test.ts
git commit -m "feat: slugify bỏ dấu tiếng Việt và uniqueSlug"
```

---

### Task 5: `notes.repo.ts`

**Files:**
- Create: `src/lib/db/errors.ts`
- Create: `src/lib/db/notes.repo.ts`
- Test: `tests/lib/db/notes.repo.test.ts`

**Interfaces:**
- Consumes: `json-store.ts` (`readCollection`, `mutate`), `schema.ts`, `slug.ts`.
- Produces:
  - `src/lib/db/errors.ts`: `class NotFoundError extends Error`, `class ConflictError extends Error`
  - `src/lib/db/notes.repo.ts` (import dạng `import * as notesRepo from '@/lib/db/notes.repo'`):
    - `listAll(): Promise<Note[]>` — mới cập nhật lên đầu
    - `listByTopic(topicId: string): Promise<Note[]>` — ghim lên đầu, rồi mới cập nhật
    - `listRecent(limit: number): Promise<Note[]>`
    - `listStarred(): Promise<Note[]>`
    - `findBySlug(slug: string): Promise<Note | null>`
    - `findById(id: string): Promise<Note | null>`
    - `countByTopic(): Promise<Map<string, number>>`
    - `create(input: NoteCreateInput): Promise<Note>`
    - `update(id: string, patch: NoteUpdateInput): Promise<Note>`
    - `remove(id: string): Promise<void>`
    - `toggleStar(id: string): Promise<Note>`

- [ ] **Step 1: Cài nanoid**

```bash
pnpm add nanoid
```

- [ ] **Step 2: Viết test**

`tests/lib/db/notes.repo.test.ts`:
```ts
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '@/lib/db/errors'
import * as notesRepo from '@/lib/db/notes.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-notes-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const base = { topicId: 't1', title: 'Bất đồng bộ', summary: 'Tóm tắt', content: '# Nội dung' }

describe('create', () => {
  it('sinh id, slug, timestamp', async () => {
    const note = await notesRepo.create(base)
    expect(note.id).not.toBe('')
    expect(note.slug).toBe('bat-dong-bo')
    expect(note.createdAt).toBe(note.updatedAt)
    expect(Date.parse(note.createdAt)).not.toBeNaN()
    expect(note.tags).toEqual([])
    expect(note.starred).toBe(false)
  })

  it('slug trùng thì thêm hậu tố', async () => {
    await notesRepo.create(base)
    const second = await notesRepo.create(base)
    expect(second.slug).toBe('bat-dong-bo-2')
  })

  it('tôn trọng slug người dùng nhập tay', async () => {
    const note = await notesRepo.create({ ...base, slug: 'async-await' })
    expect(note.slug).toBe('async-await')
  })
})

describe('đọc', () => {
  it('findBySlug trả note, không thấy thì trả null', async () => {
    const created = await notesRepo.create(base)
    expect(await notesRepo.findBySlug(created.slug)).toMatchObject({ id: created.id })
    expect(await notesRepo.findBySlug('khong-ton-tai')).toBeNull()
  })

  it('listByTopic chỉ lấy note của topic đó và đưa note ghim lên đầu', async () => {
    const a = await notesRepo.create({ ...base, title: 'A' })
    await notesRepo.create({ ...base, title: 'B' })
    await notesRepo.create({ ...base, topicId: 't2', title: 'C' })
    await notesRepo.toggleStar(a.id)

    const list = await notesRepo.listByTopic('t1')
    expect(list.map((n) => n.title)).toEqual(['A', 'B'])
    expect(list[0]?.starred).toBe(true)
  })

  it('countByTopic đếm đúng theo topic', async () => {
    await notesRepo.create(base)
    await notesRepo.create(base)
    await notesRepo.create({ ...base, topicId: 't2' })
    const counts = await notesRepo.countByTopic()
    expect(counts.get('t1')).toBe(2)
    expect(counts.get('t2')).toBe(1)
    expect(counts.get('t3')).toBeUndefined()
  })
})

describe('update', () => {
  it('đổi nội dung và cập nhật updatedAt, giữ nguyên slug và createdAt', async () => {
    const note = await notesRepo.create(base)
    const updated = await notesRepo.update(note.id, { title: 'Tiêu đề mới' })
    expect(updated.title).toBe('Tiêu đề mới')
    expect(updated.slug).toBe(note.slug)
    expect(updated.createdAt).toBe(note.createdAt)
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(note.updatedAt))
  })

  it('đổi slug thủ công thì vẫn đảm bảo không trùng', async () => {
    await notesRepo.create({ ...base, slug: 'a' })
    const second = await notesRepo.create({ ...base, slug: 'b' })
    const updated = await notesRepo.update(second.id, { slug: 'a' })
    expect(updated.slug).toBe('a-2')
  })

  it('id không tồn tại thì throw NotFoundError', async () => {
    await expect(notesRepo.update('khong-co', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('remove và toggleStar', () => {
  it('remove xoá đúng note', async () => {
    const note = await notesRepo.create(base)
    await notesRepo.remove(note.id)
    expect(await notesRepo.listAll()).toEqual([])
  })

  it('remove id không tồn tại thì throw NotFoundError', async () => {
    await expect(notesRepo.remove('khong-co')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('toggleStar bật rồi tắt', async () => {
    const note = await notesRepo.create(base)
    expect((await notesRepo.toggleStar(note.id)).starred).toBe(true)
    expect((await notesRepo.toggleStar(note.id)).starred).toBe(false)
  })
})
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `pnpm test tests/lib/db/notes.repo.test.ts`
Expected: FAIL — không tìm thấy `@/lib/db/errors`.

- [ ] **Step 4: Viết `src/lib/db/errors.ts`**

```ts
/** Không tìm thấy bản ghi theo id/slug. */
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`Không tìm thấy ${what}`)
    this.name = 'NotFoundError'
  }
}

/** Thao tác bị từ chối vì vi phạm ràng buộc (ví dụ xoá mục còn dữ liệu con). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}
```

- [ ] **Step 5: Viết `src/lib/db/notes.repo.ts`**

```ts
import { nanoid } from 'nanoid'
import { slugify, uniqueSlug } from '@/lib/slug'
import { NotFoundError } from './errors'
import { mutate, readCollection } from './json-store'
import {
  NoteCreateSchema,
  NoteSchema,
  NoteUpdateSchema,
  type Note,
  type NoteCreateInput,
  type NoteUpdateInput,
} from './schema'

/**
 * Tầng repository: nơi duy nhất trong app biết dữ liệu Note nằm ở đâu.
 * API đặt tên theo việc (listByTopic, toggleStar) chứ không theo SQL, để khi đổi
 * sang SQLite chỉ cần viết lại thân hàm, không đổi chữ ký.
 */

const FILE = 'notes.json'

function byUpdatedDesc(a: Note, b: Note): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
}

/** Ghim lên trước, trong cùng nhóm thì mới cập nhật lên trước. */
function byStarredThenUpdated(a: Note, b: Note): number {
  if (a.starred !== b.starred) return a.starred ? -1 : 1
  return byUpdatedDesc(a, b)
}

export async function listAll(): Promise<Note[]> {
  return (await readCollection(FILE, NoteSchema)).sort(byUpdatedDesc)
}

export async function listByTopic(topicId: string): Promise<Note[]> {
  const notes = await readCollection(FILE, NoteSchema)
  return notes.filter((n) => n.topicId === topicId).sort(byStarredThenUpdated)
}

export async function listRecent(limit: number): Promise<Note[]> {
  return (await listAll()).slice(0, limit)
}

export async function listStarred(): Promise<Note[]> {
  return (await listAll()).filter((n) => n.starred)
}

export async function findBySlug(slug: string): Promise<Note | null> {
  const notes = await readCollection(FILE, NoteSchema)
  return notes.find((n) => n.slug === slug) ?? null
}

export async function findById(id: string): Promise<Note | null> {
  const notes = await readCollection(FILE, NoteSchema)
  return notes.find((n) => n.id === id) ?? null
}

export async function countByTopic(): Promise<Map<string, number>> {
  const notes = await readCollection(FILE, NoteSchema)
  const counts = new Map<string, number>()
  for (const note of notes) {
    counts.set(note.topicId, (counts.get(note.topicId) ?? 0) + 1)
  }
  return counts
}

export async function create(input: NoteCreateInput): Promise<Note> {
  const data = NoteCreateSchema.parse(input)
  return mutate(FILE, NoteSchema, (notes) => {
    const taken = notes.map((n) => n.slug)
    const now = new Date().toISOString()
    const note: Note = {
      id: nanoid(),
      topicId: data.topicId,
      title: data.title,
      slug: uniqueSlug(data.slug ?? slugify(data.title), taken),
      summary: data.summary,
      content: data.content,
      tags: data.tags,
      starred: data.starred,
      createdAt: now,
      updatedAt: now,
    }
    return { items: [...notes, note], result: note }
  })
}

export async function update(id: string, patch: NoteUpdateInput): Promise<Note> {
  const data = NoteUpdateSchema.parse(patch)
  return mutate(FILE, NoteSchema, (notes) => {
    const index = notes.findIndex((n) => n.id === id)
    const current = notes[index]
    if (index === -1 || current === undefined) throw new NotFoundError(`ghi chú "${id}"`)

    // Slug chỉ đổi khi người dùng chủ động sửa; đổi tiêu đề không làm chết link cũ.
    const slug =
      data.slug === undefined || data.slug === current.slug
        ? current.slug
        : uniqueSlug(
            data.slug,
            notes.filter((n) => n.id !== id).map((n) => n.slug),
          )

    const updated: Note = {
      ...current,
      ...data,
      slug,
      updatedAt: new Date().toISOString(),
    }
    const items = [...notes]
    items[index] = updated
    return { items, result: updated }
  })
}

export async function remove(id: string): Promise<void> {
  return mutate(FILE, NoteSchema, (notes) => {
    if (!notes.some((n) => n.id === id)) throw new NotFoundError(`ghi chú "${id}"`)
    return { items: notes.filter((n) => n.id !== id), result: undefined }
  })
}

export async function toggleStar(id: string): Promise<Note> {
  return mutate(FILE, NoteSchema, (notes) => {
    const index = notes.findIndex((n) => n.id === id)
    const current = notes[index]
    if (index === -1 || current === undefined) throw new NotFoundError(`ghi chú "${id}"`)
    const updated: Note = { ...current, starred: !current.starred, updatedAt: new Date().toISOString() }
    const items = [...notes]
    items[index] = updated
    return { items, result: updated }
  })
}
```

- [ ] **Step 6: Chạy test để thấy pass**

Run: `pnpm test tests/lib/db/notes.repo.test.ts && pnpm typecheck`
Expected: PASS.

Nếu test "listByTopic ghim lên đầu" chập chờn do hai note tạo trong cùng mili-giây: đó là thứ tự không xác định thật, sửa test bằng cách so sánh tập hợp thay vì mảng — **không** thêm `sleep` vào repo.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/errors.ts src/lib/db/notes.repo.ts tests/lib/db/notes.repo.test.ts package.json pnpm-lock.yaml
git commit -m "feat(db): repository cho Note"
```

---

### Task 6: `topics.repo.ts` và `categories.repo.ts`

**Files:**
- Create: `src/lib/db/topics.repo.ts`
- Create: `src/lib/db/categories.repo.ts`
- Test: `tests/lib/db/topics.repo.test.ts`
- Test: `tests/lib/db/categories.repo.test.ts`

**Interfaces:**
- Consumes: `json-store.ts`, `schema.ts`, `slug.ts`, `errors.ts`, `notes.repo.ts` (chỉ dùng `countByTopic`).
- Produces:
  - `topics.repo.ts`: `listAll()`, `listByCategory(categoryId)`, `findBySlug(slug)`, `findById(id)`, `listWithCounts(): Promise<TopicWithCount[]>`, `create(input: TopicCreateInput)`, `update(id, patch)`, `remove(id)`; `type TopicWithCount = Topic & { noteCount: number }`
  - `categories.repo.ts`: `listAll()`, `findBySlug(slug)`, `findById(id)`, `listWithCounts(): Promise<CategoryWithTopics[]>`, `create(input)`, `update(id, patch)`, `remove(id)`; `type CategoryWithTopics = Category & { topics: TopicWithCount[]; noteCount: number }`

- [ ] **Step 1: Viết test cho topics.repo**

`tests/lib/db/topics.repo.test.ts`:
```ts
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '@/lib/db/errors'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-topics-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const base = { categoryId: 'c1', name: 'Docker', description: 'Container', order: 0 }

it('create sinh id và slug không dấu', async () => {
  const topic = await topicsRepo.create({ ...base, name: 'Bảo mật ứng dụng' })
  expect(topic.slug).toBe('bao-mat-ung-dung')
  expect(topic.id).not.toBe('')
})

it('listByCategory lọc đúng và sắp theo order', async () => {
  await topicsRepo.create({ ...base, name: 'B', order: 2 })
  await topicsRepo.create({ ...base, name: 'A', order: 1 })
  await topicsRepo.create({ ...base, categoryId: 'c2', name: 'C', order: 0 })
  expect((await topicsRepo.listByCategory('c1')).map((t) => t.name)).toEqual(['A', 'B'])
})

it('listWithCounts đếm số note của từng topic', async () => {
  const docker = await topicsRepo.create(base)
  const sql = await topicsRepo.create({ ...base, name: 'SQL', order: 1 })
  await notesRepo.create({ topicId: docker.id, title: 'Dockerfile', summary: '', content: '' })
  await notesRepo.create({ topicId: docker.id, title: 'Volume', summary: '', content: '' })

  const list = await topicsRepo.listWithCounts()
  expect(list.find((t) => t.id === docker.id)?.noteCount).toBe(2)
  expect(list.find((t) => t.id === sql.id)?.noteCount).toBe(0)
})

it('từ chối xoá topic còn note, và nêu số note còn lại', async () => {
  const topic = await topicsRepo.create(base)
  await notesRepo.create({ topicId: topic.id, title: 'Dockerfile', summary: '', content: '' })

  const promise = topicsRepo.remove(topic.id)
  await expect(promise).rejects.toBeInstanceOf(ConflictError)
  await expect(promise).rejects.toThrow(/1 ghi chú/)
  expect(await topicsRepo.findById(topic.id)).not.toBeNull()
})

it('xoá được topic rỗng', async () => {
  const topic = await topicsRepo.create(base)
  await topicsRepo.remove(topic.id)
  expect(await topicsRepo.findById(topic.id)).toBeNull()
})

it('remove id không tồn tại thì throw NotFoundError', async () => {
  await expect(topicsRepo.remove('khong-co')).rejects.toBeInstanceOf(NotFoundError)
})
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `pnpm test tests/lib/db/topics.repo.test.ts`
Expected: FAIL — không tìm thấy `@/lib/db/topics.repo`.

- [ ] **Step 3: Viết `src/lib/db/topics.repo.ts`**

```ts
import { nanoid } from 'nanoid'
import { slugify, uniqueSlug } from '@/lib/slug'
import { ConflictError, NotFoundError } from './errors'
import { mutate, readCollection } from './json-store'
import * as notesRepo from './notes.repo'
import { TopicCreateSchema, TopicSchema, type Topic, type TopicCreateInput } from './schema'

const FILE = 'topics.json'

export type TopicWithCount = Topic & { noteCount: number }

function byOrder(a: Topic, b: Topic): number {
  return a.order - b.order || a.name.localeCompare(b.name, 'vi')
}

export async function listAll(): Promise<Topic[]> {
  return (await readCollection(FILE, TopicSchema)).sort(byOrder)
}

export async function listByCategory(categoryId: string): Promise<Topic[]> {
  return (await listAll()).filter((t) => t.categoryId === categoryId)
}

export async function findBySlug(slug: string): Promise<Topic | null> {
  return (await readCollection(FILE, TopicSchema)).find((t) => t.slug === slug) ?? null
}

export async function findById(id: string): Promise<Topic | null> {
  return (await readCollection(FILE, TopicSchema)).find((t) => t.id === id) ?? null
}

/**
 * Sidebar cần số note của mọi topic trong một lần gọi — nếu để component tự đếm
 * từng topic thì thành N+1 lượt đọc file.
 */
export async function listWithCounts(): Promise<TopicWithCount[]> {
  const [topics, counts] = await Promise.all([listAll(), notesRepo.countByTopic()])
  return topics.map((topic) => ({ ...topic, noteCount: counts.get(topic.id) ?? 0 }))
}

export async function create(input: TopicCreateInput): Promise<Topic> {
  const data = TopicCreateSchema.parse(input)
  return mutate(FILE, TopicSchema, (topics) => {
    const topic: Topic = {
      id: nanoid(),
      categoryId: data.categoryId,
      name: data.name,
      slug: uniqueSlug(data.slug ?? slugify(data.name), topics.map((t) => t.slug)),
      description: data.description,
      order: data.order,
    }
    return { items: [...topics, topic], result: topic }
  })
}

export async function update(id: string, patch: Partial<TopicCreateInput>): Promise<Topic> {
  const data = TopicCreateSchema.partial().parse(patch)
  return mutate(FILE, TopicSchema, (topics) => {
    const index = topics.findIndex((t) => t.id === id)
    const current = topics[index]
    if (index === -1 || current === undefined) throw new NotFoundError(`công nghệ "${id}"`)

    const slug =
      data.slug === undefined || data.slug === current.slug
        ? current.slug
        : uniqueSlug(data.slug, topics.filter((t) => t.id !== id).map((t) => t.slug))

    const updated: Topic = { ...current, ...data, slug }
    const items = [...topics]
    items[index] = updated
    return { items, result: updated }
  })
}

/** Không cascade: còn ghi chú bên trong thì từ chối, để người dùng tự quyết định. */
export async function remove(id: string): Promise<void> {
  const counts = await notesRepo.countByTopic()
  const noteCount = counts.get(id) ?? 0
  if (noteCount > 0) {
    throw new ConflictError(
      `Không xoá được: công nghệ này còn ${noteCount} ghi chú. Hãy chuyển hoặc xoá các ghi chú trước.`,
    )
  }
  return mutate(FILE, TopicSchema, (topics) => {
    if (!topics.some((t) => t.id === id)) throw new NotFoundError(`công nghệ "${id}"`)
    return { items: topics.filter((t) => t.id !== id), result: undefined }
  })
}
```

- [ ] **Step 4: Chạy test để thấy pass**

Run: `pnpm test tests/lib/db/topics.repo.test.ts`
Expected: PASS.

- [ ] **Step 5: Viết test cho categories.repo**

`tests/lib/db/categories.repo.test.ts`:
```ts
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as categoriesRepo from '@/lib/db/categories.repo'
import { ConflictError } from '@/lib/db/errors'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-cats-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const base = { name: 'DevOps', description: 'Vận hành', icon: 'Server', color: 'amber', order: 0 }

it('listWithCounts trả cây mảng -> công nghệ kèm số note', async () => {
  const devops = await categoriesRepo.create(base)
  const docker = await topicsRepo.create({
    categoryId: devops.id, name: 'Docker', description: '', order: 0,
  })
  await notesRepo.create({ topicId: docker.id, title: 'Dockerfile', summary: '', content: '' })

  const tree = await categoriesRepo.listWithCounts()
  expect(tree).toHaveLength(1)
  expect(tree[0]?.topics.map((t) => t.name)).toEqual(['Docker'])
  expect(tree[0]?.topics[0]?.noteCount).toBe(1)
  expect(tree[0]?.noteCount).toBe(1)
})

it('sắp xếp theo order', async () => {
  await categoriesRepo.create({ ...base, name: 'Security', order: 2 })
  await categoriesRepo.create({ ...base, name: 'Dev', order: 1 })
  expect((await categoriesRepo.listAll()).map((c) => c.name)).toEqual(['Dev', 'Security'])
})

it('từ chối xoá mảng còn công nghệ', async () => {
  const devops = await categoriesRepo.create(base)
  await topicsRepo.create({ categoryId: devops.id, name: 'Docker', description: '', order: 0 })
  await expect(categoriesRepo.remove(devops.id)).rejects.toBeInstanceOf(ConflictError)
})
```

- [ ] **Step 6: Chạy test để thấy fail, rồi viết `src/lib/db/categories.repo.ts`**

Run: `pnpm test tests/lib/db/categories.repo.test.ts` → FAIL (thiếu module).

```ts
import { nanoid } from 'nanoid'
import { slugify, uniqueSlug } from '@/lib/slug'
import { ConflictError, NotFoundError } from './errors'
import { mutate, readCollection } from './json-store'
import { CategoryCreateSchema, CategorySchema, type Category, type CategoryCreateInput } from './schema'
import * as topicsRepo from './topics.repo'
import type { TopicWithCount } from './topics.repo'

const FILE = 'categories.json'

export type CategoryWithTopics = Category & { topics: TopicWithCount[]; noteCount: number }

function byOrder(a: Category, b: Category): number {
  return a.order - b.order || a.name.localeCompare(b.name, 'vi')
}

export async function listAll(): Promise<Category[]> {
  return (await readCollection(FILE, CategorySchema)).sort(byOrder)
}

export async function findBySlug(slug: string): Promise<Category | null> {
  return (await readCollection(FILE, CategorySchema)).find((c) => c.slug === slug) ?? null
}

export async function findById(id: string): Promise<Category | null> {
  return (await readCollection(FILE, CategorySchema)).find((c) => c.id === id) ?? null
}

/** Nguồn dữ liệu duy nhất cho sidebar: cả cây trong đúng ba lần đọc file. */
export async function listWithCounts(): Promise<CategoryWithTopics[]> {
  const [categories, topics] = await Promise.all([listAll(), topicsRepo.listWithCounts()])
  return categories.map((category) => {
    const own = topics.filter((t) => t.categoryId === category.id)
    return {
      ...category,
      topics: own,
      noteCount: own.reduce((sum, t) => sum + t.noteCount, 0),
    }
  })
}

export async function create(input: CategoryCreateInput): Promise<Category> {
  const data = CategoryCreateSchema.parse(input)
  return mutate(FILE, CategorySchema, (categories) => {
    const category: Category = {
      id: nanoid(),
      name: data.name,
      slug: uniqueSlug(data.slug ?? slugify(data.name), categories.map((c) => c.slug)),
      description: data.description,
      icon: data.icon,
      color: data.color,
      order: data.order,
    }
    return { items: [...categories, category], result: category }
  })
}

export async function update(id: string, patch: Partial<CategoryCreateInput>): Promise<Category> {
  const data = CategoryCreateSchema.partial().parse(patch)
  return mutate(FILE, CategorySchema, (categories) => {
    const index = categories.findIndex((c) => c.id === id)
    const current = categories[index]
    if (index === -1 || current === undefined) throw new NotFoundError(`mảng "${id}"`)

    const slug =
      data.slug === undefined || data.slug === current.slug
        ? current.slug
        : uniqueSlug(data.slug, categories.filter((c) => c.id !== id).map((c) => c.slug))

    const updated: Category = { ...current, ...data, slug }
    const items = [...categories]
    items[index] = updated
    return { items, result: updated }
  })
}

export async function remove(id: string): Promise<void> {
  const topics = await topicsRepo.listByCategory(id)
  if (topics.length > 0) {
    throw new ConflictError(
      `Không xoá được: mảng này còn ${topics.length} công nghệ. Hãy xoá hoặc chuyển chúng trước.`,
    )
  }
  return mutate(FILE, CategorySchema, (categories) => {
    if (!categories.some((c) => c.id === id)) throw new NotFoundError(`mảng "${id}"`)
    return { items: categories.filter((c) => c.id !== id), result: undefined }
  })
}
```

- [ ] **Step 7: Chạy toàn bộ test + typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: tất cả PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/topics.repo.ts src/lib/db/categories.repo.ts tests/lib/db/topics.repo.test.ts tests/lib/db/categories.repo.test.ts
git commit -m "feat(db): repository cho Topic và Category kèm listWithCounts"
```

---

### Task 7: `search.ts` — tìm kiếm và xếp hạng

**Files:**
- Create: `src/lib/search.ts`
- Test: `tests/lib/search.test.ts`

**Interfaces:**
- Consumes: `slug.ts` (`normalizeText`).
- Produces:
  - `type SearchItem = { id: string; title: string; slug: string; summary: string; content: string; tags: string[]; topicName: string; topicSlug: string }`
  - `type MatchField = 'title' | 'tag' | 'summary' | 'content'`
  - `type SearchResult = { item: SearchItem; score: number; matchedIn: MatchField }`
  - `searchNotes(items: SearchItem[], query: string, limit?: number): SearchResult[]` (limit mặc định 20)

- [ ] **Step 1: Viết test**

`tests/lib/search.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { searchNotes, type SearchItem } from '@/lib/search'

function item(partial: Partial<SearchItem> & { id: string }): SearchItem {
  return {
    title: '', slug: partial.id, summary: '', content: '', tags: [],
    topicName: 'Docker', topicSlug: 'docker', ...partial,
  }
}

const items: SearchItem[] = [
  item({ id: 'title', title: 'Index trong PostgreSQL' }),
  item({ id: 'tag', title: 'Khác hẳn', tags: ['index'] }),
  item({ id: 'summary', title: 'Khác hẳn', summary: 'Khi nào nên đánh index' }),
  item({ id: 'content', title: 'Khác hẳn', content: 'CREATE INDEX idx ON users(email)' }),
  item({ id: 'khong-lien-quan', title: 'Docker compose' }),
]

describe('searchNotes', () => {
  it('xếp hạng: tiêu đề > tag > tóm tắt > nội dung', () => {
    const results = searchNotes(items, 'index')
    expect(results.map((r) => r.item.id)).toEqual(['title', 'tag', 'summary', 'content'])
    expect(results[0]?.matchedIn).toBe('title')
  })

  it('không phân biệt hoa thường và dấu tiếng Việt', () => {
    const vi = [item({ id: 'a', title: 'Lập trình Bất Đồng Bộ' })]
    expect(searchNotes(vi, 'bat dong bo')).toHaveLength(1)
    expect(searchNotes(vi, 'BẤT ĐỒNG')).toHaveLength(1)
  })

  it('chuỗi rỗng hoặc toàn khoảng trắng trả mảng rỗng', () => {
    expect(searchNotes(items, '')).toEqual([])
    expect(searchNotes(items, '   ')).toEqual([])
  })

  it('không khớp thì trả mảng rỗng', () => {
    expect(searchNotes(items, 'kubernetes')).toEqual([])
  })

  it('khớp đầu tiêu đề xếp trên khớp giữa tiêu đề', () => {
    const list = [
      item({ id: 'giua', title: 'Tối ưu index' }),
      item({ id: 'dau', title: 'Index là gì' }),
    ]
    expect(searchNotes(list, 'index').map((r) => r.item.id)).toEqual(['dau', 'giua'])
  })

  it('tôn trọng limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => item({ id: `n${i}`, title: `Index ${i}` }))
    expect(searchNotes(many, 'index', 5)).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `pnpm test tests/lib/search.test.ts`
Expected: FAIL — không tìm thấy `@/lib/search`.

- [ ] **Step 3: Viết `src/lib/search.ts`**

```ts
import { normalizeText } from './slug'

/**
 * Tìm kiếm cho ⌘K. Là hàm thuần, không đụng React và không đụng file — nhờ vậy
 * test được thứ tự xếp hạng một cách trực tiếp, và chạy được cả ở server lẫn client.
 */

export type SearchItem = {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  tags: string[]
  topicName: string
  topicSlug: string
}

export type MatchField = 'title' | 'tag' | 'summary' | 'content'

export type SearchResult = {
  item: SearchItem
  score: number
  matchedIn: MatchField
}

/** Điểm theo vị trí khớp: tiêu đề đáng tin nhất, nội dung ít đáng tin nhất. */
const FIELD_SCORE: Record<MatchField, number> = {
  title: 100,
  tag: 60,
  summary: 30,
  content: 10,
}

/** Khớp ngay đầu chuỗi thường là điều người dùng đang gõ dở, cộng thêm điểm. */
const PREFIX_BONUS = 15

function scoreOf(item: SearchItem, query: string): { score: number; matchedIn: MatchField } | null {
  const title = normalizeText(item.title)
  if (title.includes(query)) {
    return {
      score: FIELD_SCORE.title + (title.startsWith(query) ? PREFIX_BONUS : 0),
      matchedIn: 'title',
    }
  }
  if (item.tags.some((tag) => normalizeText(tag).includes(query))) {
    return { score: FIELD_SCORE.tag, matchedIn: 'tag' }
  }
  if (normalizeText(item.summary).includes(query)) {
    return { score: FIELD_SCORE.summary, matchedIn: 'summary' }
  }
  if (normalizeText(item.content).includes(query)) {
    return { score: FIELD_SCORE.content, matchedIn: 'content' }
  }
  return null
}

export function searchNotes(items: SearchItem[], query: string, limit = 20): SearchResult[] {
  const q = normalizeText(query)
  if (q === '') return []

  const results: SearchResult[] = []
  for (const item of items) {
    const hit = scoreOf(item, q)
    if (hit !== null) results.push({ item, ...hit })
  }

  return results
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'vi'))
    .slice(0, limit)
}
```

- [ ] **Step 4: Chạy test để thấy pass**

Run: `pnpm test tests/lib/search.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search.ts tests/lib/search.test.ts
git commit -m "feat: hàm tìm kiếm và xếp hạng cho command palette"
```

---

### Task 8: `markdown.ts` — render markdown + TOC

**Files:**
- Create: `src/lib/markdown.ts`
- Test: `tests/lib/markdown.test.ts`

**Interfaces:**
- Consumes: không (thư viện ngoài).
- Produces:
  - `type TocEntry = { id: string; text: string; depth: 2 | 3 }`
  - `type RenderedMarkdown = { html: string; toc: TocEntry[] }`
  - `renderMarkdown(markdown: string): Promise<RenderedMarkdown>`

**Ghi chú lệch so với spec (có chủ ý):** spec mục 3 ghi `react-markdown` cho phần render. Nhưng renderer của react-markdown không nhận component bất đồng bộ, trong khi shiki highlight là async. Vì vậy:
- Trang chi tiết ghi chú dùng pipeline `unified` (cùng hệ remark với react-markdown) chạy ở server, trả HTML — đúng yêu cầu "shiki chạy ở server, client không tải highlighter".
- `react-markdown` vẫn được dùng ở tab "Xem trước" trong form (Task 13), nơi cần render tức thời phía client và không cần highlight.

- [ ] **Step 1: Cài thư viện**

```bash
pnpm add unified remark-parse remark-gfm remark-rehype rehype-slug rehype-stringify @shikijs/rehype shiki github-slugger mdast-util-to-string unist-util-visit
```

- [ ] **Step 2: Viết test**

`tests/lib/markdown.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/lib/markdown'

describe('renderMarkdown', () => {
  it('render heading và đoạn văn', async () => {
    const { html } = await renderMarkdown('## Cài đặt\n\nNội dung.')
    expect(html).toContain('<h2')
    expect(html).toContain('Nội dung.')
  })

  it('trích TOC cho heading cấp 2 và 3, bỏ qua cấp 4', async () => {
    const { toc } = await renderMarkdown('## Một\n\n### Hai\n\n#### Ba')
    expect(toc.map((t) => [t.depth, t.text])).toEqual([
      [2, 'Một'],
      [3, 'Hai'],
    ])
  })

  it('id trong TOC khớp với id trong HTML (để anchor nhảy đúng)', async () => {
    const { html, toc } = await renderMarkdown('## Bất đồng bộ trong JS')
    expect(toc).toHaveLength(1)
    expect(html).toContain(`id="${toc[0]?.id}"`)
  })

  it('trùng tiêu đề heading thì id vẫn duy nhất', async () => {
    const { toc } = await renderMarkdown('## Ví dụ\n\n## Ví dụ')
    expect(toc[0]?.id).not.toBe(toc[1]?.id)
  })

  it('code block được highlight và gắn data-lang', async () => {
    const { html } = await renderMarkdown('```ts\nconst a: number = 1\n```')
    expect(html).toContain('data-lang="ts"')
    expect(html).toContain('shiki')
    expect(html).toContain('<span')
  })

  it('hỗ trợ bảng của GFM', async () => {
    const { html } = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
  })

  it('markdown rỗng trả html rỗng và toc rỗng', async () => {
    const { html, toc } = await renderMarkdown('')
    expect(html.trim()).toBe('')
    expect(toc).toEqual([])
  })
})
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `pnpm test tests/lib/markdown.test.ts`
Expected: FAIL — không tìm thấy `@/lib/markdown`.

- [ ] **Step 4: Viết `src/lib/markdown.ts`**

```ts
import rehypeShiki from '@shikijs/rehype'
import GithubSlugger from 'github-slugger'
import { toString as mdastToString } from 'mdast-util-to-string'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import type { Root as MdastRoot } from 'mdast'

/**
 * Render markdown ở phía server. Highlight bằng shiki tại đây nghĩa là client
 * không phải tải bộ highlighter (~1MB) — trang chi tiết ghi chú gần như không có JS.
 */

export type TocEntry = { id: string; text: string; depth: 2 | 3 }
export type RenderedMarkdown = { html: string; toc: TocEntry[] }

/**
 * Transformer của shiki: shiki dựng lại thẻ <pre> nên nhãn ngôn ngữ phải gắn
 * ở đây (không gắn được từ trước bằng rehype plugin).
 */
const langLabel = {
  name: 'kh:lang-label',
  pre(this: { options: { lang: string } }, node: { properties: Record<string, unknown> }) {
    node.properties['data-lang'] = this.options.lang
  },
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug) // gắn id cho heading, dùng cùng thuật toán với GithubSlugger dưới đây
  .use(rehypeShiki, {
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false, // xuất cả hai màu dạng CSS variable, chọn theo theme bằng CSS
    transformers: [langLabel],
  })
  .use(rehypeStringify)

/**
 * TOC được trích từ mdast bằng chính GithubSlugger mà rehype-slug dùng,
 * nên id trong mục lục luôn khớp id trong HTML.
 */
function extractToc(tree: MdastRoot): TocEntry[] {
  const slugger = new GithubSlugger()
  const toc: TocEntry[] = []
  visit(tree, 'heading', (node) => {
    const text = mdastToString(node)
    // Mọi heading đều phải qua slugger để bộ đếm trùng lặp khớp với rehype-slug.
    const id = slugger.slug(text)
    if (node.depth === 2 || node.depth === 3) {
      toc.push({ id, text, depth: node.depth })
    }
  })
  return toc
}

export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  const tree = processor.parse(markdown) as MdastRoot
  const toc = extractToc(tree)
  const file = await processor.run(tree).then((hast) => processor.stringify(hast))
  return { html: String(file), toc }
}
```

- [ ] **Step 5: Chạy test**

Run: `pnpm test tests/lib/markdown.test.ts`
Expected: PASS.

Nếu test `data-lang` fail vì API transformer khác phiên bản: kiểm tra shiki đang cài bằng `pnpm why shiki`, mở `node_modules/@shikijs/types/dist/index.d.mjs` tìm `ShikiTransformer`, và điều chỉnh hàm `pre` cho khớp chữ ký thực tế. Không đổi kỳ vọng của test — nhãn ngôn ngữ là yêu cầu ở spec mục 7.3.

- [ ] **Step 6: Commit**

```bash
git add src/lib/markdown.ts tests/lib/markdown.test.ts package.json pnpm-lock.yaml
git commit -m "feat: render markdown với shiki và trích mục lục"
```

---

### Task 9: Seed — hạ tầng + 4 mảng + 8 công nghệ + 3 ghi chú mẫu

**Files:**
- Create: `src/lib/db/seed-data.ts` (dữ liệu thuần)
- Create: `src/lib/db/seed.ts` (`seedIfEmpty`, `ensureSeeded`)
- Create: `scripts/seed.ts`
- Test: `tests/lib/db/seed.test.ts`
- Modify: `package.json` (script `seed`)

**Interfaces:**
- Consumes: `json-store.ts` (`readCollection`, `writeCollection`), `schema.ts`.
- Produces:
  - `seed-data.ts`: `SEED_CATEGORIES: Category[]`, `SEED_TOPICS: Topic[]`, `SEED_NOTES: Note[]`
  - `seed.ts`: `seedIfEmpty(): Promise<{ seeded: boolean }>`, `ensureSeeded(): Promise<void>`

**Quy ước id trong seed:** id đặt tay theo dạng `cat-dev`, `topic-docker`, `note-async-await` (không dùng nanoid) để dữ liệu seed đọc được bằng mắt và ổn định giữa các lần chạy. Bản ghi do người dùng tạo sau này vẫn dùng nanoid — schema chỉ yêu cầu `string`.

- [ ] **Step 1: Viết test**

`tests/lib/db/seed.test.ts`:
```ts
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import { SEED_CATEGORIES, SEED_NOTES, SEED_TOPICS } from '@/lib/db/seed-data'
import { seedIfEmpty } from '@/lib/db/seed'
import * as topicsRepo from '@/lib/db/topics.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-seed-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

describe('tính toàn vẹn của dữ liệu seed', () => {
  it('mọi topic trỏ tới category có thật', () => {
    const ids = new Set(SEED_CATEGORIES.map((c) => c.id))
    for (const topic of SEED_TOPICS) expect(ids.has(topic.categoryId)).toBe(true)
  })

  it('mọi note trỏ tới topic có thật', () => {
    const ids = new Set(SEED_TOPICS.map((t) => t.id))
    for (const note of SEED_NOTES) expect(ids.has(note.topicId)).toBe(true)
  })

  it('slug không trùng trong từng loại', () => {
    for (const list of [SEED_CATEGORIES, SEED_TOPICS, SEED_NOTES]) {
      const slugs = list.map((x) => x.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })

  it('id không trùng trong từng loại', () => {
    for (const list of [SEED_CATEGORIES, SEED_TOPICS, SEED_NOTES]) {
      const ids = list.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('mỗi ghi chú có tóm tắt, tag, nội dung thật và ít nhất một code block', () => {
    for (const note of SEED_NOTES) {
      expect(note.summary.length, `thiếu tóm tắt: ${note.slug}`).toBeGreaterThan(20)
      expect(note.tags.length, `thiếu tag: ${note.slug}`).toBeGreaterThan(0)
      expect(note.content.length, `nội dung quá ngắn: ${note.slug}`).toBeGreaterThan(400)
      expect(note.content, `thiếu code mẫu: ${note.slug}`).toContain('```')
    }
  })
})

describe('seedIfEmpty', () => {
  it('nạp dữ liệu khi data còn rỗng', async () => {
    expect(await seedIfEmpty()).toEqual({ seeded: true })
    expect(await categoriesRepo.listAll()).toHaveLength(SEED_CATEGORIES.length)
    expect(await topicsRepo.listAll()).toHaveLength(SEED_TOPICS.length)
    expect(await notesRepo.listAll()).toHaveLength(SEED_NOTES.length)
  })

  it('không ghi đè khi đã có dữ liệu', async () => {
    await notesRepo.create({ topicId: 't1', title: 'Ghi chú của tôi', summary: '', content: '' })
    expect(await seedIfEmpty()).toEqual({ seeded: false })
    const notes = await notesRepo.listAll()
    expect(notes).toHaveLength(1)
    expect(notes[0]?.title).toBe('Ghi chú của tôi')
  })
})
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `pnpm test tests/lib/db/seed.test.ts`
Expected: FAIL — thiếu `@/lib/db/seed-data`.

- [ ] **Step 3: Viết `src/lib/db/seed-data.ts` — 4 mảng và 8 công nghệ**

```ts
import type { Category, Note, Topic } from './schema'

/**
 * Nội dung khởi tạo. Đây vừa là dữ liệu để app có cái đọc ngay, vừa là mẫu văn phong
 * cho các ghi chú viết sau: tiếng Việt, có code chạy được, giải thích "vì sao" chứ
 * không chỉ "cái gì".
 */

const NOW = '2026-08-17T00:00:00.000Z'

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-dev',
    name: 'Dev',
    slug: 'dev',
    description: 'Ngôn ngữ và framework để viết ứng dụng.',
    icon: 'Code2',
    color: 'sky',
    order: 1,
  },
  {
    id: 'cat-database',
    name: 'Database',
    slug: 'database',
    description: 'Lưu trữ, truy vấn và tối ưu dữ liệu.',
    icon: 'Database',
    color: 'emerald',
    order: 2,
  },
  {
    id: 'cat-security',
    name: 'Security',
    slug: 'security',
    description: 'Các lỗ hổng thường gặp và cách phòng tránh.',
    icon: 'ShieldCheck',
    color: 'rose',
    order: 3,
  },
  {
    id: 'cat-devops',
    name: 'DevOps',
    slug: 'devops',
    description: 'Đóng gói, triển khai và tự động hoá.',
    icon: 'Server',
    color: 'amber',
    order: 4,
  },
]

export const SEED_TOPICS: Topic[] = [
  {
    id: 'topic-typescript',
    categoryId: 'cat-dev',
    name: 'JavaScript / TypeScript',
    slug: 'javascript-typescript',
    description: 'Nền tảng của cả frontend lẫn Node.js.',
    order: 1,
  },
  {
    id: 'topic-python',
    categoryId: 'cat-dev',
    name: 'Python',
    slug: 'python',
    description: 'Script, xử lý dữ liệu, và backend.',
    order: 2,
  },
  {
    id: 'topic-nextjs',
    categoryId: 'cat-dev',
    name: 'Next.js',
    slug: 'nextjs',
    description: 'React framework với App Router và Server Components.',
    order: 3,
  },
  {
    id: 'topic-sql',
    categoryId: 'cat-database',
    name: 'SQL cơ bản',
    slug: 'sql-co-ban',
    description: 'Truy vấn nền tảng dùng được ở mọi hệ quản trị.',
    order: 1,
  },
  {
    id: 'topic-postgresql',
    categoryId: 'cat-database',
    name: 'PostgreSQL',
    slug: 'postgresql',
    description: 'Index, kế hoạch thực thi và các tính năng riêng của Postgres.',
    order: 2,
  },
  {
    id: 'topic-owasp',
    categoryId: 'cat-security',
    name: 'OWASP Top 10',
    slug: 'owasp-top-10',
    description: 'Mười nhóm lỗ hổng phổ biến nhất của ứng dụng web.',
    order: 1,
  },
  {
    id: 'topic-docker',
    categoryId: 'cat-devops',
    name: 'Docker',
    slug: 'docker',
    description: 'Đóng gói ứng dụng thành image chạy được ở mọi nơi.',
    order: 1,
  },
  {
    id: 'topic-cicd',
    categoryId: 'cat-devops',
    name: 'CI/CD (GitHub Actions)',
    slug: 'ci-cd-github-actions',
    description: 'Tự động kiểm thử và triển khai mỗi lần push.',
    order: 2,
  },
]
```

- [ ] **Step 4: Thêm 3 ghi chú mẫu vào cuối `seed-data.ts`**

Ba note này là **chuẩn văn phong** cho 23 note còn lại ở Task 10: mở đầu một câu nêu vấn đề, có heading `##`, có code block chạy được, kết bằng phần "Ghi nhớ".

```ts
export const SEED_NOTES: Note[] = [
  {
    id: 'note-async-await',
    topicId: 'topic-typescript',
    title: 'async/await và event loop',
    slug: 'async-await-va-event-loop',
    summary: 'Vì sao code bất đồng bộ không chặn luồng chính, và async/await thực chất là gì.',
    content: `JavaScript chỉ có **một luồng** thực thi. Mọi thao tác chờ (đọc file, gọi API) đều phải giao cho môi trường bên ngoài rồi nhận kết quả qua hàng đợi callback — nếu không, giao diện sẽ đứng.

## Event loop trong một câu

Stack chạy hết code đồng bộ, sau đó event loop lấy việc từ hàng đợi ra chạy. Microtask (promise) được ưu tiên hơn macrotask (setTimeout):

\`\`\`ts
console.log('1')
setTimeout(() => console.log('2 - macrotask'), 0)
Promise.resolve().then(() => console.log('3 - microtask'))
console.log('4')
// Thứ tự in ra: 1, 4, 3 - microtask, 2 - macrotask
\`\`\`

## async/await là promise viết cho dễ đọc

\`await\` tạm dừng **hàm hiện tại**, không tạm dừng chương trình. Hàm \`async\` luôn trả về Promise:

\`\`\`ts
async function layNguoiDung(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`)
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
  return res.json() as Promise<User>
}
\`\`\`

## Lỗi hay gặp: await tuần tự việc chạy song song được

\`\`\`ts
// Chậm: 2 lượt chờ nối tiếp nhau
const a = await layNguoiDung('1')
const b = await layNguoiDung('2')

// Nhanh: cùng khởi động, chờ một lần
const [a2, b2] = await Promise.all([layNguoiDung('1'), layNguoiDung('2')])
\`\`\`

## Ghi nhớ

- \`await\` chỉ dừng hàm chứa nó.
- Việc độc lập nhau thì gộp bằng \`Promise.all\`.
- Microtask luôn chạy trước macrotask.`,
    tags: ['javascript', 'bat-dong-bo', 'event-loop'],
    starred: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-type-vs-interface',
    topicId: 'topic-typescript',
    title: 'Type và Interface khác nhau ở đâu',
    slug: 'type-va-interface-khac-nhau-o-dau',
    summary: 'Khi nào nên dùng type alias, khi nào nên dùng interface, và vì sao đừng tranh cãi quá nhiều.',
    content: `Cả hai đều mô tả hình dạng của dữ liệu. Khác biệt thật sự chỉ nằm ở vài điểm.

## Interface gộp được, type thì không

\`\`\`ts
interface User { id: string }
interface User { email: string }
// User giờ có cả id lẫn email (declaration merging)

type Product = { id: string }
// type Product = { price: number }  // Lỗi: định nghĩa trùng tên
\`\`\`

Tính chất này hữu ích khi mở rộng type của thư viện ngoài, nhưng trong code của mình thì thường là bất ngờ không mong muốn.

## Type làm được những thứ interface không làm được

\`\`\`ts
type Id = string | number                    // union
type Keys = keyof User                       // toán tử trên type
type Nullable<T> = T | null                  // generic alias
type Point = [number, number]                // tuple
\`\`\`

## Quy ước dùng trong dự án này

- Mô tả object công khai, có khả năng được mở rộng: \`interface\`.
- Mọi thứ còn lại (union, tuple, type suy ra từ zod): \`type\`.

\`\`\`ts
type Note = z.infer<typeof NoteSchema> // suy ra từ schema, không viết tay
\`\`\`

## Ghi nhớ

Chọn một quy ước rồi giữ nhất quán quan trọng hơn việc chọn cái nào.`,
    tags: ['typescript', 'type-system'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-server-vs-client-component',
    topicId: 'topic-nextjs',
    title: 'Server Component và Client Component',
    slug: 'server-component-va-client-component',
    summary: 'Mặc định mọi component trong App Router chạy ở server; chỉ đánh dấu "use client" khi thật sự cần.',
    content: `Trong App Router, component **mặc định chạy ở server**: nó không được gửi xuống trình duyệt, nên không tốn JavaScript phía client và được phép đọc dữ liệu trực tiếp.

## Server Component

\`\`\`tsx
// Không có "use client" -> chạy ở server
import * as notesRepo from '@/lib/db/notes.repo'

export default async function NotesPage() {
  const notes = await notesRepo.listAll() // đọc dữ liệu ngay trong component
  return <ul>{notes.map((n) => <li key={n.id}>{n.title}</li>)}</ul>
}
\`\`\`

## Client Component

Chỉ cần khi có **trạng thái**, **hiệu ứng**, hoặc **sự kiện của trình duyệt**:

\`\`\`tsx
'use client'
import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { void navigator.clipboard.writeText(text); setCopied(true) }}>
      {copied ? 'Đã chép' : 'Chép'}
    </button>
  )
}
\`\`\`

## Quy tắc thực dụng

Đẩy \`"use client"\` xuống càng sâu càng tốt. Một component client kéo theo toàn bộ cây con của nó xuống client, nên đặt nó ở lá thay vì ở layout.

## Ghi nhớ

- Mặc định: server.
- \`"use client"\` khi cần \`useState\`/\`useEffect\`/\`onClick\`.
- Server Component **được** render Client Component; chiều ngược lại chỉ qua \`children\`.`,
    tags: ['nextjs', 'react', 'server-component'],
    starred: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
]
```

- [ ] **Step 5: Viết `src/lib/db/seed.ts`**

```ts
import { CategorySchema, NoteSchema, TopicSchema } from './schema'
import { readCollection, writeCollection } from './json-store'
import { SEED_CATEGORIES, SEED_NOTES, SEED_TOPICS } from './seed-data'

/**
 * Seed chỉ chạy khi cả ba collection đều rỗng. Không bao giờ ghi đè dữ liệu
 * người dùng đã có — đây là ràng buộc an toàn quan trọng nhất của file này.
 */
export async function seedIfEmpty(): Promise<{ seeded: boolean }> {
  const [categories, topics, notes] = await Promise.all([
    readCollection('categories.json', CategorySchema),
    readCollection('topics.json', TopicSchema),
    readCollection('notes.json', NoteSchema),
  ])

  if (categories.length > 0 || topics.length > 0 || notes.length > 0) {
    return { seeded: false }
  }

  await writeCollection('categories.json', CategorySchema, SEED_CATEGORIES)
  await writeCollection('topics.json', TopicSchema, SEED_TOPICS)
  await writeCollection('notes.json', NoteSchema, SEED_NOTES)
  return { seeded: true }
}

/**
 * Dùng ở root layout. Promise được nhớ lại nên mỗi tiến trình chỉ kiểm tra một lần,
 * thay vì đọc lại ba file ở mọi request.
 */
let seedOnce: Promise<void> | null = null

export function ensureSeeded(): Promise<void> {
  seedOnce ??= seedIfEmpty().then(() => undefined)
  return seedOnce
}
```

- [ ] **Step 6: Viết `scripts/seed.ts` và thêm script**

```bash
pnpm add -D tsx
```

`scripts/seed.ts`:
```ts
import { seedIfEmpty } from '../src/lib/db/seed'

const { seeded } = await seedIfEmpty()
console.log(seeded ? 'Đã nạp dữ liệu mẫu vào data/' : 'Bỏ qua: data/ đã có dữ liệu')
```

Thêm vào `package.json`: `"seed": "tsx scripts/seed.ts"`

- [ ] **Step 7: Chạy test và chạy seed thật**

```bash
pnpm test tests/lib/db/seed.test.ts
pnpm seed
pnpm seed   # lần hai phải in "Bỏ qua"
```
Expected: test PASS; lần chạy đầu tạo `data/categories.json`, `data/topics.json`, `data/notes.json`; lần hai không ghi đè.

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/seed-data.ts src/lib/db/seed.ts scripts/seed.ts tests/lib/db/seed.test.ts data package.json pnpm-lock.yaml
git commit -m "feat(db): seed 4 mảng, 8 công nghệ và 3 ghi chú mẫu"
```

---

### Task 10: Viết nốt 23 ghi chú seed

**Files:**
- Modify: `src/lib/db/seed-data.ts` (thêm phần tử vào `SEED_NOTES`)
- Modify: `data/notes.json` (chạy lại seed trên thư mục sạch)

**Interfaces:**
- Consumes: `SEED_NOTES` từ Task 9. Không thêm export mới.
- Produces: `SEED_NOTES` có đúng 26 phần tử (3 từ Task 9 + 23 ở đây).

**Chuẩn cho từng ghi chú** (test ở Task 9 đã ép các mức tối thiểu — đây là yêu cầu chất lượng đầy đủ):
- `id`: `note-<slug>`; `slug`: slug hoá tiêu đề không dấu; `createdAt`/`updatedAt`: `NOW`.
- Mở đầu một đoạn nêu **vấn đề thực tế**, không định nghĩa từ điển.
- 2–4 heading `##`, tổng 250–500 từ.
- Ít nhất một code block có ngôn ngữ (` ```ts `, ` ```python `, ` ```sql `, ` ```dockerfile `, ` ```yaml `, ` ```bash `) và **chạy được thật**, không giả mã.
- Kết bằng heading `## Ghi nhớ` với 2–4 gạch đầu dòng.
- `tags`: 2–3 tag, chữ thường không dấu, có gạch nối.
- `starred: false` trừ khi được đánh dấu ⭐ trong bảng dưới.

**Danh sách phải viết** (tiêu đề và tóm tắt là bản chính thức, chép nguyên vào code):

| topicId | title | summary | tags |
|---|---|---|---|
| `topic-typescript` | Generic trong TypeScript | Cách viết hàm và type dùng lại được cho nhiều kiểu dữ liệu mà không mất kiểm tra kiểu. | `typescript`, `generic` |
| `topic-python` | List và dict comprehension | Cú pháp tạo list/dict trong một dòng, và khi nào thì vòng lặp thường dễ đọc hơn. | `python`, `cu-phap` |
| `topic-python` | virtualenv và pip | Vì sao mỗi dự án Python nên có môi trường riêng, và các lệnh cần nhớ. | `python`, `moi-truong` |
| `topic-python` | Type hint trong Python | Chú thích kiểu giúp IDE và mypy bắt lỗi sớm, dù Python không kiểm tra lúc chạy. | `python`, `type-hint` |
| `topic-nextjs` | Server Actions | Gọi hàm chạy trên server thẳng từ form, không cần tự viết API route. | `nextjs`, `server-actions` ⭐ |
| `topic-nextjs` | Caching và revalidate | Next.js cache mặc định ở đâu, và cách làm dữ liệu mới hiện ra sau khi ghi. | `nextjs`, `caching` |
| `topic-sql` | JOIN các loại | INNER, LEFT, RIGHT, FULL khác nhau thế nào qua một ví dụ hai bảng. | `sql`, `join` ⭐ |
| `topic-sql` | GROUP BY và HAVING | Gom nhóm để tổng hợp, và vì sao điều kiện trên hàm tổng hợp phải nằm ở HAVING. | `sql`, `aggregate` |
| `topic-sql` | Transaction và ACID | Vì sao cần gói nhiều câu lệnh vào một giao dịch, và bốn tính chất của nó. | `sql`, `transaction` |
| `topic-postgresql` | Index và khi nào nên đánh | Index tăng tốc đọc nhưng làm chậm ghi — cách chọn cột đáng đánh index. | `postgresql`, `index`, `hieu-nang` ⭐ |
| `topic-postgresql` | Đọc EXPLAIN ANALYZE | Cách đọc kế hoạch thực thi để biết truy vấn chậm ở bước nào. | `postgresql`, `explain`, `hieu-nang` |
| `topic-postgresql` | Kiểu dữ liệu nên dùng | text, timestamptz, numeric, jsonb — chọn đúng kiểu ngay từ đầu đỡ phải migrate. | `postgresql`, `kieu-du-lieu` |
| `topic-owasp` | SQL Injection | Vì sao nối chuỗi vào câu SQL là lỗ hổng, và prepared statement chặn nó thế nào. | `owasp`, `sql-injection` ⭐ |
| `topic-owasp` | XSS — Cross-Site Scripting | Ba dạng XSS và nguyên tắc escape theo ngữ cảnh xuất dữ liệu. | `owasp`, `xss` |
| `topic-owasp` | Lỗi kiểm soát truy cập | Kiểm tra quyền ở server cho từng bản ghi, không tin vào việc ẩn nút trên giao diện. | `owasp`, `phan-quyen` |
| `topic-owasp` | Lưu mật khẩu đúng cách | Vì sao phải hash chậm có salt, và vì sao đừng tự nghĩ ra thuật toán. | `owasp`, `mat-khau`, `hashing` |
| `topic-owasp` | Quản lý secret và biến môi trường | Không commit secret, phân biệt biến chỉ ở server với biến lộ ra client. | `owasp`, `secret` |
| `topic-docker` | Dockerfile nhiều stage | Tách stage build và stage chạy để image nhỏ hơn và ít lỗ hổng hơn. | `docker`, `dockerfile` ⭐ |
| `topic-docker` | Volume và bind mount | Hai cách giữ dữ liệu sống lâu hơn container, dùng cái nào cho việc gì. | `docker`, `volume` |
| `topic-docker` | docker compose cho môi trường dev | Dựng app kèm database bằng một file yaml và một lệnh. | `docker`, `compose` |
| `topic-cicd` | Cấu trúc một workflow GitHub Actions | trigger, job, step, runner — bộ khung tối thiểu của một file workflow. | `ci-cd`, `github-actions` |
| `topic-cicd` | Cache dependency trong CI | Cache pnpm store để job không cài lại toàn bộ package mỗi lần chạy. | `ci-cd`, `cache` |
| `topic-cicd` | Secret trong GitHub Actions | Cách truyền khoá vào workflow an toàn và những chỗ secret dễ bị lộ. | `ci-cd`, `secret` |

- [ ] **Step 1: Viết 9 ghi chú đầu (Dev + SQL)**

Thêm vào `SEED_NOTES` theo đúng thứ tự trong bảng, theo đúng chuẩn ở trên và văn phong của 3 note mẫu ở Task 9.

- [ ] **Step 2: Chạy test**

Run: `pnpm test tests/lib/db/seed.test.ts`
Expected: PASS (test tính toàn vẹn bắt ngay id/slug trùng và nội dung quá ngắn).

- [ ] **Step 3: Viết 8 ghi chú tiếp (PostgreSQL + OWASP)**

- [ ] **Step 4: Chạy test**

Run: `pnpm test tests/lib/db/seed.test.ts` → PASS.

- [ ] **Step 5: Viết 6 ghi chú cuối (Docker + CI/CD)**

- [ ] **Step 6: Kiểm tra đủ số lượng**

Thêm test vào `tests/lib/db/seed.test.ts`:
```ts
it('có đủ 26 ghi chú trải khắp 8 công nghệ', () => {
  expect(SEED_NOTES).toHaveLength(26)
  const topicIds = new Set(SEED_NOTES.map((n) => n.topicId))
  expect(topicIds.size).toBe(SEED_TOPICS.length)
})
```
Run: `pnpm test && pnpm typecheck` → PASS.

- [ ] **Step 7: Nạp lại `data/` từ seed mới**

```bash
rm -f data/categories.json data/topics.json data/notes.json && pnpm seed
```
Expected: in ra "Đã nạp dữ liệu mẫu vào data/".

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/seed-data.ts tests/lib/db/seed.test.ts data
git commit -m "feat(db): viết đủ 26 ghi chú seed"
```

---

### Task 11: Khung giao diện — shadcn, theme, sidebar cây, topbar

**Files:**
- Create: `src/components/ui/*` (do shadcn sinh)
- Create: `src/components/layout/ThemeProvider.tsx`
- Create: `src/components/layout/ThemeToggle.tsx`
- Create: `src/components/layout/AppSidebar.tsx`
- Create: `src/components/layout/SidebarTree.tsx`
- Create: `src/components/layout/Topbar.tsx`
- Create: `src/components/layout/Breadcrumbs.tsx`
- Create: `src/lib/icons.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `categories.repo.ts` (`listWithCounts`), `seed.ts` (`ensureSeeded`).
- Produces:
  - `src/lib/icons.ts`: `getIcon(name: string): LucideIcon`
  - `<AppSidebar />` (server, không props)
  - `<SidebarTree tree={CategoryWithTopics[]} />` (client)
  - `<Topbar />` (server, không props)
  - `<Breadcrumbs items={{ label: string; href?: string }[]} />` (server)
  - `<ThemeToggle />` (client)

**Lệch so với spec (có chủ ý):** spec đặt breadcrumb trong topbar. Topbar nằm ở layout nên không biết tên của category/topic đang xem (chỉ có slug), và tra ngược tên trong layout sẽ đọc lại toàn bộ dữ liệu ở mọi request. Vì vậy `<Breadcrumbs />` được render ở đầu mỗi trang — vẫn nằm ngay dưới topbar về mặt thị giác.

- [ ] **Step 1: Khởi tạo shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button card badge input textarea select label form dialog alert-dialog dropdown-menu sheet command separator skeleton sonner tabs tooltip scroll-area collapsible
pnpm add next-themes lucide-react
pnpm add -D @tailwindcss/typography
```

Nếu `shadcn init` báo không nhận diện được project: đảm bảo `src/app/globals.css` tồn tại và `tsconfig.json` có `paths` cho `@/*` rồi chạy lại.

- [ ] **Step 2: Bổ sung `src/app/globals.css`**

Thêm vào cuối file (giữ nguyên phần shadcn đã sinh):

```css
@plugin "@tailwindcss/typography";

/* shiki xuất hai bộ màu; chọn bộ nào là việc của CSS, không phải của JS. */
.shiki,
.shiki span {
  color: var(--shiki-light);
  background-color: var(--shiki-light-bg);
}

.dark .shiki,
.dark .shiki span {
  color: var(--shiki-dark);
  background-color: var(--shiki-dark-bg);
}

/* Khối code trong nội dung ghi chú: chừa chỗ cho nhãn ngôn ngữ và nút Copy. */
.note-content pre {
  position: relative;
  overflow-x: auto;
  border-radius: var(--radius);
  padding: 2.25rem 1rem 1rem;
}
```

- [ ] **Step 3: Viết `src/lib/icons.ts`**

```ts
import { Code2, Database, Folder, Server, ShieldCheck, type LucideIcon } from 'lucide-react'

/**
 * Tên icon nằm trong dữ liệu (Category.icon) nên phải map qua bảng trắng:
 * import động theo chuỗi sẽ kéo toàn bộ bộ icon vào bundle.
 */
const ICONS: Record<string, LucideIcon> = {
  Code2,
  Database,
  ShieldCheck,
  Server,
}

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Folder
}
```

- [ ] **Step 4: Viết `ThemeProvider.tsx` và `ThemeToggle.tsx`**

```tsx
// src/components/layout/ThemeProvider.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
```

```tsx
// src/components/layout/ThemeToggle.tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {/* Cả hai icon luôn được render, ẩn/hiện bằng CSS để tránh lệch hydration. */}
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  )
}
```

- [ ] **Step 5: Viết `SidebarTree.tsx` (client) và `AppSidebar.tsx` (server)**

```tsx
// src/components/layout/SidebarTree.tsx
'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CategoryWithTopics } from '@/lib/db/categories.repo'
import { getIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'kh:sidebar-open'

export function SidebarTree({ tree }: { tree: CategoryWithTopics[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  // Đọc localStorage trong effect (không đọc lúc render) để server và client khớp nhau.
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      try {
        setOpen(JSON.parse(raw) as Record<string, boolean>)
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  function toggle(slug: string) {
    setOpen((prev) => {
      const next = { ...prev, [slug]: !(prev[slug] ?? true) }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <nav aria-label="Danh mục kiến thức" className="space-y-1">
      {tree.map((category) => {
        const Icon = getIcon(category.icon)
        const containsActive = category.topics.some((t) => pathname === `/t/${t.slug}`)
        const isOpen = open[category.slug] ?? true // mặc định mở; nhánh đang xem luôn mở
        const expanded = isOpen || containsActive

        return (
          <div key={category.id}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Thu gọn' : 'Mở rộng'} mảng ${category.name}`}
                onClick={() => toggle(category.slug)}
                className="rounded p-1 hover:bg-accent"
              >
                <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
              </button>
              <Link
                href={`/c/${category.slug}`}
                className={cn(
                  'flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-accent',
                  pathname === `/c/${category.slug}` && 'bg-accent',
                )}
              >
                <Icon className="h-4 w-4" />
                {category.name}
                <span className="ml-auto text-xs text-muted-foreground">{category.noteCount}</span>
              </Link>
            </div>

            {expanded && (
              <ul className="ml-6 border-l pl-2">
                {category.topics.map((topic) => (
                  <li key={topic.id}>
                    <Link
                      href={`/t/${topic.slug}`}
                      aria-current={pathname === `/t/${topic.slug}` ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent',
                        pathname === `/t/${topic.slug}` && 'bg-accent font-medium',
                      )}
                    >
                      {topic.name}
                      <span className="ml-auto text-xs text-muted-foreground">{topic.noteCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
```

```tsx
// src/components/layout/AppSidebar.tsx
import Link from 'next/link'
import * as categoriesRepo from '@/lib/db/categories.repo'
import { SidebarTree } from './SidebarTree'

/** Server Component: đọc cây một lần rồi truyền xuống phần client chỉ giữ trạng thái gập/mở. */
export async function AppSidebar() {
  const tree = await categoriesRepo.listWithCounts()

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col gap-4 border-r bg-muted/30 p-4">
      <Link href="/" className="text-lg font-semibold">
        Knowledge Hub
      </Link>
      <SidebarTree tree={tree} />
    </div>
  )
}
```

- [ ] **Step 6: Viết `Topbar.tsx` và `Breadcrumbs.tsx`**

```tsx
// src/components/layout/Breadcrumbs.tsx
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Đường dẫn" className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
          {item.href === undefined ? (
            <span className="text-foreground">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-foreground hover:underline">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
```

```tsx
// src/components/layout/Topbar.tsx
import { ThemeToggle } from './ThemeToggle'

/** Nút tìm kiếm thật sẽ được lắp ở Task 13; hiện tại chỉ là chỗ dành sẵn. */
export function Topbar({ search }: { search?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-6">
      <div className="flex-1">{search}</div>
      <ThemeToggle />
    </header>
  )
}
```

- [ ] **Step 7: Viết lại `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'
import { ensureSeeded } from '@/lib/db/seed'
import './globals.css'

export const metadata: Metadata = {
  title: 'Knowledge Hub',
  description: 'Sổ tay tra cứu kiến thức dev cá nhân',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lần chạy đầu trên máy mới: tự nạp dữ liệu mẫu để app không rỗng trơn.
  await ensureSeeded()

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen">
            <aside className="hidden lg:block">
              <AppSidebar />
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 px-6 py-6">{children}</main>
            </div>
          </div>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Chạy dev và kiểm tra bằng mắt**

```bash
pnpm dev
```
Mở `http://localhost:3000`. Kỳ vọng: sidebar hiện 4 mảng với icon và số note (Dev 3 nếu mới xong Task 9, 9 nếu đã xong Task 10), gập/mở được, tải lại trang vẫn giữ trạng thái gập; nút theme đổi sáng/tối.

- [ ] **Step 9: Kiểm tra không có vi phạm kiến trúc**

```bash
grep -rn "from 'node:fs'\|from 'fs'\|data/notes.json" src/app src/components || echo "OK: không có truy cập file trực tiếp trong app/components"
```
Expected: in ra "OK".

- [ ] **Step 10: typecheck, lint, build, commit**

```bash
pnpm typecheck && pnpm lint && pnpm build
git add -A
git commit -m "feat(ui): khung layout với sidebar cây, theme sáng/tối"
```

---

### Task 12: Các trang đọc — dashboard, mảng, công nghệ, chi tiết ghi chú

**Files:**
- Create: `src/components/notes/NoteCard.tsx`
- Create: `src/components/notes/TagBadge.tsx`
- Create: `src/components/notes/NoteContent.tsx`
- Create: `src/components/notes/Toc.tsx`
- Create: `src/components/notes/CodeBlockActions.tsx`
- Create: `src/app/c/[category]/page.tsx`
- Create: `src/app/t/[topic]/page.tsx`
- Create: `src/app/n/[note]/page.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/error.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: cả ba repo, `renderMarkdown`, `<Breadcrumbs />`.
- Produces:
  - `<NoteCard note={Note} topicName?: string />`
  - `<TagBadge tag={string} />`
  - `<NoteContent html={string} />` (server; bọc `.note-content` + gắn `<CodeBlockActions />`)
  - `<Toc entries={TocEntry[]} />`
  - `<CodeBlockActions />` (client, không props — tự tìm các `pre` trong `.note-content`)

- [ ] **Step 1: Viết `TagBadge.tsx` và `NoteCard.tsx`**

```tsx
// src/components/notes/TagBadge.tsx
import { Badge } from '@/components/ui/badge'

export function TagBadge({ tag }: { tag: string }) {
  return <Badge variant="secondary">{tag}</Badge>
}
```

```tsx
// src/components/notes/NoteCard.tsx
import { Star } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Note } from '@/lib/db/schema'
import { TagBadge } from './TagBadge'

export function NoteCard({ note, topicName }: { note: Note; topicName?: string }) {
  return (
    <Card className="transition-colors hover:border-foreground/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start gap-2 text-base">
          <Link href={`/n/${note.slug}`} className="hover:underline">
            {note.title}
          </Link>
          {note.starred && <Star className="mt-1 h-4 w-4 shrink-0 fill-current" aria-label="Đã ghim" />}
        </CardTitle>
        {topicName !== undefined && (
          <p className="text-xs text-muted-foreground">{topicName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 text-sm text-muted-foreground">{note.summary}</p>
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Viết `CodeBlockActions.tsx`, `NoteContent.tsx`, `Toc.tsx`**

```tsx
// src/components/notes/CodeBlockActions.tsx
'use client'

import { useEffect } from 'react'

/**
 * HTML của ghi chú được render ở server nên không gắn sẵn React handler vào <pre>.
 * Component này chạy một lần sau khi mount, chèn nhãn ngôn ngữ và nút Copy vào từng
 * khối code. Cách này giữ nguyên ưu điểm "highlight ở server, client gần như không JS".
 */
export function CodeBlockActions() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLPreElement>('.note-content pre')

    for (const pre of blocks) {
      if (pre.dataset.enhanced === 'true') continue
      pre.dataset.enhanced = 'true'

      const lang = pre.dataset.lang ?? 'text'
      const label = document.createElement('span')
      label.textContent = lang
      label.className = 'absolute left-3 top-2 text-xs text-muted-foreground'
      pre.appendChild(label)

      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = 'Chép'
      button.setAttribute('aria-label', `Chép khối code ${lang}`)
      button.className =
        'absolute right-2 top-2 rounded border bg-background px-2 py-0.5 text-xs hover:bg-accent'
      button.addEventListener('click', () => {
        void navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '').then(() => {
          button.textContent = 'Đã chép'
          window.setTimeout(() => {
            button.textContent = 'Chép'
          }, 1500)
        })
      })
      pre.appendChild(button)
    }
  }, [])

  return null
}
```

```tsx
// src/components/notes/NoteContent.tsx
import { CodeBlockActions } from './CodeBlockActions'

/**
 * html đến từ renderMarkdown (chạy ở server, dữ liệu do chính chủ sở hữu nhập),
 * nên dangerouslySetInnerHTML ở đây là có kiểm soát: không có nguồn nội dung bên thứ ba.
 */
export function NoteContent({ html }: { html: string }) {
  return (
    <>
      <div
        className="note-content prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <CodeBlockActions />
    </>
  )
}
```

```tsx
// src/components/notes/Toc.tsx
import type { TocEntry } from '@/lib/markdown'

export function Toc({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null

  return (
    <nav aria-label="Mục lục" className="sticky top-20 hidden w-56 shrink-0 lg:block">
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Mục lục</p>
      <ul className="space-y-1 text-sm">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.depth === 3 ? 'pl-3' : undefined}>
            <a href={`#${entry.id}`} className="text-muted-foreground hover:text-foreground">
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 3: Viết `src/app/page.tsx` (dashboard)**

```tsx
import Link from 'next/link'
import { NoteCard } from '@/components/notes/NoteCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { getIcon } from '@/lib/icons'

export default async function DashboardPage() {
  const [tree, starred, recent, topics] = await Promise.all([
    categoriesRepo.listWithCounts(),
    notesRepo.listStarred(),
    notesRepo.listRecent(8),
    topicsRepo.listAll(),
  ])
  const topicName = new Map(topics.map((t) => [t.id, t.name]))

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold">Sổ tay kiến thức</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhấn <kbd className="rounded border px-1.5 py-0.5 text-xs">⌘K</kbd> để tìm nhanh mọi ghi chú.
        </p>
      </section>

      <section aria-labelledby="mang">
        <h2 id="mang" className="mb-3 text-lg font-medium">Các mảng</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tree.map((category) => {
            const Icon = getIcon(category.icon)
            return (
              <Link key={category.id} href={`/c/${category.slug}`}>
                <Card className="h-full transition-colors hover:border-foreground/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4" />
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {category.topics.length} công nghệ · {category.noteCount} ghi chú
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {starred.length > 0 && (
        <section aria-labelledby="ghim">
          <h2 id="ghim" className="mb-3 text-lg font-medium">Đã ghim</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {starred.map((note) => (
              <NoteCard key={note.id} note={note} topicName={topicName.get(note.topicId)} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="gan-day">
        <h2 id="gan-day" className="mb-3 text-lg font-medium">Sửa gần đây</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((note) => (
            <NoteCard key={note.id} note={note} topicName={topicName.get(note.topicId)} />
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Viết `src/app/c/[category]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

// Next 15: params là Promise, phải await.
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params
  const category = await categoriesRepo.findBySlug(slug)
  if (category === null) notFound()

  const topics = (await topicsRepo.listWithCounts()).filter((t) => t.categoryId === category.id)

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Trang chủ', href: '/' }, { label: category.name }]} />
      <div>
        <h1 className="text-2xl font-semibold">{category.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
      </div>

      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Mảng này chưa có công nghệ nào.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link key={topic.id} href={`/t/${topic.slug}`}>
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{topic.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{topic.noteCount} ghi chú</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Viết `src/app/t/[topic]/page.tsx`**

```tsx
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NoteCard } from '@/components/notes/NoteCard'
import { Button } from '@/components/ui/button'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params
  const topic = await topicsRepo.findBySlug(slug)
  if (topic === null) notFound()

  const [category, notes] = await Promise.all([
    categoriesRepo.findById(topic.categoryId),
    notesRepo.listByTopic(topic.id),
  ])

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Trang chủ', href: '/' },
          ...(category === null ? [] : [{ label: category.name, href: `/c/${category.slug}` }]),
          { label: topic.name },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{topic.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
        </div>
        <Button asChild>
          <Link href={`/n/new?topic=${topic.slug}`}>
            <Plus className="mr-1 h-4 w-4" />
            Thêm ghi chú
          </Link>
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Chưa có ghi chú nào trong {topic.name}.</p>
          <Button asChild variant="link">
            <Link href={`/n/new?topic=${topic.slug}`}>Viết ghi chú đầu tiên</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Viết `src/app/n/[note]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NoteContent } from '@/components/notes/NoteContent'
import { TagBadge } from '@/components/notes/TagBadge'
import { Toc } from '@/components/notes/Toc'
import { Button } from '@/components/ui/button'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { renderMarkdown } from '@/lib/markdown'

export default async function NotePage({ params }: { params: Promise<{ note: string }> }) {
  const { note: slug } = await params
  const note = await notesRepo.findBySlug(slug)
  if (note === null) notFound()

  const topic = await topicsRepo.findById(note.topicId)
  const category = topic === null ? null : await categoriesRepo.findById(topic.categoryId)
  const { html, toc } = await renderMarkdown(note.content)

  return (
    <div className="flex gap-10">
      <article className="min-w-0 max-w-[72ch] flex-1 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Trang chủ', href: '/' },
            ...(category === null ? [] : [{ label: category.name, href: `/c/${category.slug}` }]),
            ...(topic === null ? [] : [{ label: topic.name, href: `/t/${topic.slug}` }]),
            { label: note.title },
          ]}
        />

        <header className="space-y-3">
          <h1 className="text-3xl font-semibold">{note.title}</h1>
          <p className="text-muted-foreground">{note.summary}</p>
          <div className="flex flex-wrap items-center gap-2">
            {note.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
            <span className="text-xs text-muted-foreground">
              Cập nhật {new Date(note.updatedAt).toLocaleDateString('vi-VN')}
            </span>
          </div>
          {/* Nút ghim, Sửa, Xoá được lắp ở Task 14 khi đã có Server Actions. */}
          <Button asChild variant="outline" size="sm">
            <Link href={`/n/${note.slug}/edit`}>Sửa</Link>
          </Button>
        </header>

        <NoteContent html={html} />
      </article>

      <Toc entries={toc} />
    </div>
  )
}
```

- [ ] **Step 7: Viết `not-found.tsx` và `error.tsx`**

```tsx
// src/app/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="text-sm text-muted-foreground">
        Đường dẫn có thể đã đổi hoặc ghi chú đã bị xoá.
      </p>
      <Button asChild>
        <Link href="/">Về trang chủ</Link>
      </Button>
    </div>
  )
}
```

```tsx
// src/app/error.tsx
'use client'

import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Có lỗi xảy ra</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <p className="text-xs text-muted-foreground">
        Nếu lỗi nhắc tới một file trong <code>data/</code>, hãy mở file đó ra kiểm tra —
        ứng dụng cố tình không tự ghi đè file hỏng.
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  )
}
```

- [ ] **Step 8: Kiểm tra thủ công**

```bash
pnpm dev
```
- `/` hiện 4 mảng, khối "Đã ghim", khối "Sửa gần đây".
- Nhấp mảng → `/c/dev` liệt kê công nghệ.
- Nhấp công nghệ → `/t/javascript-typescript` liệt kê ghi chú, note ghim ở đầu.
- Nhấp ghi chú → nội dung có highlight màu, mục lục bên phải, mỗi khối code có nhãn ngôn ngữ và nút "Chép" (bấm thử phải chép được).
- Vào `/n/khong-ton-tai` → trang không tìm thấy.

- [ ] **Step 9: typecheck, lint, build, commit**

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
git add -A
git commit -m "feat(ui): các trang đọc dashboard, mảng, công nghệ, chi tiết ghi chú"
```

---

### Task 13: Command palette ⌘K

**Files:**
- Create: `src/lib/db/search-index.ts`
- Create: `src/components/search/SearchPalette.tsx`
- Test: `tests/lib/db/search-index.test.ts`
- Modify: `src/components/layout/Topbar.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `notes.repo.ts`, `topics.repo.ts`, `searchNotes` + `SearchItem` từ `search.ts`.
- Produces:
  - `buildSearchIndex(): Promise<SearchItem[]>`
  - `<SearchPalette items={SearchItem[]} />` (client — tự render cả nút mở lẫn dialog)

- [ ] **Step 1: Viết test cho search-index**

`tests/lib/db/search-index.test.ts`:
```ts
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import * as notesRepo from '@/lib/db/notes.repo'
import { buildSearchIndex } from '@/lib/db/search-index'
import * as topicsRepo from '@/lib/db/topics.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-index-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

it('gắn tên công nghệ vào từng mục của chỉ mục', async () => {
  const topic = await topicsRepo.create({ categoryId: 'c1', name: 'Docker', description: '', order: 0 })
  await notesRepo.create({ topicId: topic.id, title: 'Dockerfile', summary: 'Tóm tắt', content: 'nội dung' })

  const index = await buildSearchIndex()
  expect(index).toHaveLength(1)
  expect(index[0]).toMatchObject({ title: 'Dockerfile', topicName: 'Docker', topicSlug: 'docker' })
})

it('ghi chú mồ côi (topic đã mất) vẫn vào chỉ mục với tên công nghệ rỗng', async () => {
  await notesRepo.create({ topicId: 'khong-ton-tai', title: 'Lạc', summary: '', content: '' })
  const index = await buildSearchIndex()
  expect(index[0]?.topicName).toBe('')
})
```

- [ ] **Step 2: Chạy test để thấy fail, rồi viết `src/lib/db/search-index.ts`**

Run: `pnpm test tests/lib/db/search-index.test.ts` → FAIL (thiếu module).

```ts
import type { SearchItem } from '@/lib/search'
import * as notesRepo from './notes.repo'
import * as topicsRepo from './topics.repo'

/**
 * Chỉ mục cho ⌘K được dựng ở server rồi truyền xuống client một lần qua props.
 * Với quy mô sổ tay cá nhân (vài trăm ghi chú) cách này đơn giản và tìm kiếm chạy
 * tức thì, không cần gọi mạng cho mỗi phím gõ. Nếu sau này dữ liệu lớn lên, thay
 * chỗ này bằng một route handler tìm kiếm — SearchPalette chỉ cần đổi nguồn items.
 */
export async function buildSearchIndex(): Promise<SearchItem[]> {
  const [notes, topics] = await Promise.all([notesRepo.listAll(), topicsRepo.listAll()])
  const byId = new Map(topics.map((t) => [t.id, t]))

  return notes.map((note) => {
    const topic = byId.get(note.topicId)
    return {
      id: note.id,
      title: note.title,
      slug: note.slug,
      summary: note.summary,
      content: note.content,
      tags: note.tags,
      topicName: topic?.name ?? '',
      topicSlug: topic?.slug ?? '',
    }
  })
}
```

Run lại: PASS.

- [ ] **Step 3: Viết `src/components/search/SearchPalette.tsx`**

```tsx
'use client'

import { FilePlus2, MoonStar, Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { searchNotes, type SearchItem } from '@/lib/search'

export function SearchPalette({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Xếp hạng do lib/search.ts quyết định; cmdk chỉ lo phần hiển thị và bàn phím.
  const results = useMemo(() => searchNotes(items, query), [items, query])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>()
    for (const result of results) {
      const key = result.item.topicName === '' ? 'Khác' : result.item.topicName
      map.set(key, [...(map.get(key) ?? []), result])
    }
    return [...map.entries()]
  }, [results])

  function go(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-sm justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Tìm ghi chú...
        <kbd className="ml-auto rounded border px-1.5 text-xs">⌘K</kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* shouldFilter={false}: lọc và xếp hạng đã làm ở searchNotes rồi. */}
        <CommandInput
          placeholder="Tìm theo tiêu đề, tag, nội dung..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query === '' ? 'Gõ để bắt đầu tìm.' : 'Không tìm thấy ghi chú nào.'}
          </CommandEmpty>

          {grouped.map(([topicName, group]) => (
            <CommandGroup key={topicName} heading={topicName}>
              {group.map(({ item }) => (
                <CommandItem key={item.id} value={item.id} onSelect={() => go(`/n/${item.slug}`)}>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{item.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.summary}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          <CommandGroup heading="Hành động">
            <CommandItem value="tao-ghi-chu" onSelect={() => go('/n/new')}>
              <FilePlus2 className="mr-2 h-4 w-4" />
              Tạo ghi chú mới
            </CommandItem>
            <CommandItem
              value="doi-theme"
              onSelect={() => {
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                setOpen(false)
              }}
            >
              <MoonStar className="mr-2 h-4 w-4" />
              Đổi giao diện sáng/tối
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
```

Nếu bản `Command` shadcn đang dùng tự lọc (mặc định `shouldFilter` là true), truyền `shouldFilter={false}` cho `CommandDialog`/`Command` để không lọc chồng lên kết quả của `searchNotes`.

- [ ] **Step 4: Lắp vào layout**

Trong `src/app/layout.tsx`, thêm:
```tsx
import { SearchPalette } from '@/components/search/SearchPalette'
import { buildSearchIndex } from '@/lib/db/search-index'
```
và trong thân hàm:
```tsx
const searchIndex = await buildSearchIndex()
```
rồi đổi `<Topbar />` thành `<Topbar search={<SearchPalette items={searchIndex} />} />`.

- [ ] **Step 5: Kiểm tra thủ công**

```bash
pnpm dev
```
- Nhấn ⌘K (hoặc Ctrl+K) ở bất kỳ trang nào → hộp tìm kiếm mở.
- Gõ `index` → kết quả nhóm theo công nghệ, ghi chú có "index" ở tiêu đề đứng trên.
- Gõ `bat dong bo` (không dấu) → tìm ra "async/await và event loop".
- Mũi tên lên/xuống + Enter → điều hướng tới ghi chú.
- Esc → đóng.

- [ ] **Step 6: typecheck, build, test, commit**

```bash
pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "feat(ui): command palette ⌘K tìm kiếm toàn bộ ghi chú"
```

---

### Task 14: Server Actions và form tạo/sửa/xoá/ghim

**Files:**
- Create: `src/lib/actions/types.ts`
- Create: `src/lib/actions/note.actions.ts`
- Create: `src/components/notes/NoteForm.tsx`
- Create: `src/components/notes/StarButton.tsx`
- Create: `src/components/notes/DeleteNoteButton.tsx`
- Create: `src/app/n/new/page.tsx`
- Create: `src/app/n/[note]/edit/page.tsx`
- Test: `tests/lib/actions/note.actions.test.ts`
- Modify: `src/app/n/[note]/page.tsx` (lắp nút Ghim và Xoá)

**Interfaces:**
- Consumes: `notes.repo.ts`, `topics.repo.ts`, `schema.ts`, `errors.ts`.
- Produces:
  - `types.ts`: `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }`
  - `note.actions.ts`: `createNoteAction(input: unknown): Promise<ActionResult<{ slug: string }>>`, `updateNoteAction(id: string, input: unknown): Promise<ActionResult<{ slug: string }>>`, `deleteNoteAction(id: string): Promise<ActionResult<{ topicSlug: string }>>`, `toggleStarAction(id: string): Promise<ActionResult<{ starred: boolean }>>`
  - `NoteFormSchema` (export từ `note.actions.ts`) + `type NoteFormValues`
  - `<NoteForm topics={Topic[]} note?={Note} defaultTopicId?={string} />` (client)
  - `<StarButton noteId={string} starred={boolean} />`, `<DeleteNoteButton noteId={string} title={string} />`

- [ ] **Step 1: Cài form deps**

```bash
pnpm add react-hook-form @hookform/resolvers@^3.10 react-markdown remark-gfm
```

- [ ] **Step 2: Viết test cho actions**

`tests/lib/actions/note.actions.test.ts`:
```ts
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// Server Action gọi revalidatePath — hàm này cần request context của Next,
// nên trong unit test ta thay bằng hàm rỗng.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { createNoteAction, deleteNoteAction, toggleStarAction, updateNoteAction } = await import(
  '@/lib/actions/note.actions'
)
const notesRepo = await import('@/lib/db/notes.repo')

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-actions-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const valid = { topicId: 't1', title: 'Ghi chú mới', summary: 'Tóm tắt', content: 'Nội dung', tags: [] }

it('tạo thành công trả về slug', async () => {
  const result = await createNoteAction(valid)
  expect(result).toEqual({ ok: true, data: { slug: 'ghi-chu-moi' } })
})

it('thiếu tiêu đề thì trả fieldErrors, không throw và không tạo bản ghi', async () => {
  const result = await createNoteAction({ ...valid, title: '' })
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.fieldErrors?.title?.[0]).toBeTruthy()
  expect(await notesRepo.listAll()).toHaveLength(0)
})

it('sửa ghi chú không tồn tại trả lỗi có chữ "Không tìm thấy"', async () => {
  const result = await updateNoteAction('khong-co', valid)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toMatch(/Không tìm thấy/)
})

it('xoá trả về slug công nghệ để điều hướng về', async () => {
  const topicsRepo = await import('@/lib/db/topics.repo')
  const topic = await topicsRepo.create({ categoryId: 'c1', name: 'Docker', description: '', order: 0 })
  const note = await notesRepo.create({ ...valid, topicId: topic.id })

  const result = await deleteNoteAction(note.id)
  expect(result).toEqual({ ok: true, data: { topicSlug: 'docker' } })
  expect(await notesRepo.listAll()).toHaveLength(0)
})

it('toggleStar trả trạng thái mới', async () => {
  const note = await notesRepo.create(valid)
  expect(await toggleStarAction(note.id)).toEqual({ ok: true, data: { starred: true } })
})
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `pnpm test tests/lib/actions/note.actions.test.ts`
Expected: FAIL — thiếu `@/lib/actions/note.actions`.

- [ ] **Step 4: Viết `src/lib/actions/types.ts`**

```ts
/**
 * Server Action không bao giờ throw ra UI: mọi lỗi đều là dữ liệu trả về, để form
 * hiển thị được lỗi theo từng field và toast hiện được thông báo.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
```

- [ ] **Step 5: Viết `src/lib/actions/note.actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { NotFoundError } from '@/lib/db/errors'
import * as notesRepo from '@/lib/db/notes.repo'
import { SlugSchema } from '@/lib/db/schema'
import * as topicsRepo from '@/lib/db/topics.repo'
import type { ActionResult } from './types'

/** Schema của form: dùng chung cho client (react-hook-form) và server (kiểm tra lại). */
export const NoteFormSchema = z.object({
  topicId: z.string().min(1, 'Hãy chọn công nghệ'),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống'),
  slug: z.union([SlugSchema, z.literal('')]).optional(),
  summary: z.string().trim().max(300, 'Tóm tắt nên dưới 300 ký tự').default(''),
  content: z.string().default(''),
  tags: z.array(z.string().trim().min(1)).default([]),
})

export type NoteFormValues = z.infer<typeof NoteFormSchema>

function fail(error: unknown): ActionResult<never> {
  if (error instanceof NotFoundError) return { ok: false, error: error.message }
  return {
    ok: false,
    error: error instanceof Error ? error.message : 'Có lỗi không xác định khi lưu dữ liệu',
  }
}

/** Sau mỗi thay đổi, làm mới cache của mọi trang có thể đang hiển thị ghi chú đó. */
function revalidateAll(slug?: string, topicSlug?: string): void {
  revalidatePath('/')
  revalidatePath('/c/[category]', 'page')
  if (topicSlug !== undefined) revalidatePath(`/t/${topicSlug}`)
  if (slug !== undefined) revalidatePath(`/n/${slug}`)
}

export async function createNoteAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const parsed = NoteFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dữ liệu chưa hợp lệ',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const { slug, ...rest } = parsed.data
    const note = await notesRepo.create({
      ...rest,
      starred: false,
      ...(slug === undefined || slug === '' ? {} : { slug }),
    })
    const topic = await topicsRepo.findById(note.topicId)
    revalidateAll(note.slug, topic?.slug)
    return { ok: true, data: { slug: note.slug } }
  } catch (error) {
    return fail(error)
  }
}

export async function updateNoteAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const parsed = NoteFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dữ liệu chưa hợp lệ',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const { slug, ...rest } = parsed.data
    const note = await notesRepo.update(id, {
      ...rest,
      ...(slug === undefined || slug === '' ? {} : { slug }),
    })
    const topic = await topicsRepo.findById(note.topicId)
    revalidateAll(note.slug, topic?.slug)
    return { ok: true, data: { slug: note.slug } }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteNoteAction(id: string): Promise<ActionResult<{ topicSlug: string }>> {
  try {
    const note = await notesRepo.findById(id)
    if (note === null) throw new NotFoundError(`ghi chú "${id}"`)
    const topic = await topicsRepo.findById(note.topicId)
    await notesRepo.remove(id)
    revalidateAll(note.slug, topic?.slug)
    return { ok: true, data: { topicSlug: topic?.slug ?? '' } }
  } catch (error) {
    return fail(error)
  }
}

export async function toggleStarAction(id: string): Promise<ActionResult<{ starred: boolean }>> {
  try {
    const note = await notesRepo.toggleStar(id)
    const topic = await topicsRepo.findById(note.topicId)
    revalidateAll(note.slug, topic?.slug)
    return { ok: true, data: { starred: note.starred } }
  } catch (error) {
    return fail(error)
  }
}
```

- [ ] **Step 6: Chạy test**

Run: `pnpm test tests/lib/actions/note.actions.test.ts`
Expected: PASS.

- [ ] **Step 7: Viết `src/components/notes/NoteForm.tsx`**

```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  NoteFormSchema,
  createNoteAction,
  updateNoteAction,
  type NoteFormValues,
} from '@/lib/actions/note.actions'
import type { Note, Topic } from '@/lib/db/schema'
import { slugify } from '@/lib/slug'

export function NoteForm({
  topics,
  note,
  defaultTopicId,
}: {
  topics: Topic[]
  note?: Note
  defaultTopicId?: string
}) {
  const router = useRouter()
  const [tagDraft, setTagDraft] = useState('')

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(NoteFormSchema),
    defaultValues: {
      topicId: note?.topicId ?? defaultTopicId ?? '',
      title: note?.title ?? '',
      slug: note?.slug ?? '',
      summary: note?.summary ?? '',
      content: note?.content ?? '',
      tags: note?.tags ?? [],
    },
  })

  const { formState, handleSubmit, register, setValue, watch } = form
  const values = watch()

  // Slug tự sinh khi tạo mới; khi sửa thì giữ nguyên để không làm chết link cũ.
  useEffect(() => {
    if (note === undefined) setValue('slug', slugify(values.title))
  }, [note, setValue, values.title])

  // Cảnh báo khi rời trang lúc còn thay đổi chưa lưu.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (formState.isDirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [formState.isDirty])

  const onSubmit = handleSubmit(async (data) => {
    const result = note === undefined
      ? await createNoteAction(data)
      : await updateNoteAction(note.id, data)

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof NoteFormValues, { message: messages[0] })
      }
      toast.error(result.error)
      return
    }

    toast.success(note === undefined ? 'Đã tạo ghi chú' : 'Đã lưu thay đổi')
    router.push(`/n/${result.data.slug}`)
  })

  function addTag() {
    const tag = tagDraft.trim()
    if (tag === '' || values.tags.includes(tag)) return
    setValue('tags', [...values.tags, tag], { shouldDirty: true })
    setTagDraft('')
  }

  function onTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
    }
  }

  // ⌘S để lưu.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        void onSubmit()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onSubmit])

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="topicId">Công nghệ</Label>
        <Select value={values.topicId} onValueChange={(v) => setValue('topicId', v, { shouldDirty: true })}>
          <SelectTrigger id="topicId">
            <SelectValue placeholder="Chọn công nghệ" />
          </SelectTrigger>
          <SelectContent>
            {topics.map((topic) => (
              <SelectItem key={topic.id} value={topic.id}>
                {topic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={formState.errors.topicId?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Tiêu đề</Label>
        <Input id="title" {...register('title')} />
        <FieldError message={formState.errors.title?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug (đường dẫn)</Label>
        <Input id="slug" {...register('slug')} />
        <p className="text-xs text-muted-foreground">
          Đổi slug sẽ làm hỏng các link cũ tới ghi chú này.
        </p>
        <FieldError message={formState.errors.slug?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="summary">Tóm tắt</Label>
        <Input id="summary" {...register('summary')} />
        <FieldError message={formState.errors.summary?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tag-input">Tags</Label>
        <div className="flex flex-wrap gap-1">
          {values.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                aria-label={`Bỏ tag ${tag}`}
                onClick={() => setValue('tags', values.tags.filter((t) => t !== tag), { shouldDirty: true })}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          id="tag-input"
          value={tagDraft}
          placeholder="Gõ tag rồi nhấn Enter"
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={onTagKeyDown}
        />
      </div>

      <Tabs defaultValue="viet">
        <TabsList>
          <TabsTrigger value="viet">Viết</TabsTrigger>
          <TabsTrigger value="xem-truoc">Xem trước</TabsTrigger>
        </TabsList>
        <TabsContent value="viet">
          <Textarea id="content" rows={20} className="font-mono text-sm" {...register('content')} />
        </TabsContent>
        <TabsContent value="xem-truoc">
          {/* Xem trước dùng react-markdown ở client: cần render tức thì, không cần highlight. */}
          <div className="prose prose-neutral min-h-[20rem] max-w-none rounded-md border p-4 dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{values.content}</ReactMarkdown>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Đang lưu...' : 'Lưu'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Huỷ
        </Button>
      </div>
    </form>
  )
}

function FieldError({ message }: { message?: string }) {
  if (message === undefined) return null
  return <p className="text-sm text-destructive">{message}</p>
}
```

- [ ] **Step 8: Viết `StarButton.tsx` và `DeleteNoteButton.tsx`**

```tsx
// src/components/notes/StarButton.tsx
'use client'

import { Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toggleStarAction } from '@/lib/actions/note.actions'

export function StarButton({ noteId, starred }: { noteId: string; starred: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-pressed={starred}
      aria-label={starred ? 'Bỏ ghim ghi chú' : 'Ghim ghi chú'}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleStarAction(noteId)
          if (!result.ok) {
            toast.error(result.error)
            return
          }
          router.refresh()
        })
      }
    >
      <Star className={starred ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
    </Button>
  )
}
```

```tsx
// src/components/notes/DeleteNoteButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteNoteAction } from '@/lib/actions/note.actions'

export function DeleteNoteButton({ noteId, title }: { noteId: string; title: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">Xoá</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá ghi chú "{title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này không hoàn tác được. Nội dung ghi chú sẽ bị xoá khỏi data/notes.json.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteNoteAction(noteId)
                if (!result.ok) {
                  toast.error(result.error)
                  return
                }
                toast.success('Đã xoá ghi chú')
                router.push(result.data.topicSlug === '' ? '/' : `/t/${result.data.topicSlug}`)
              })
            }
          >
            Xoá
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 9: Viết hai trang form**

```tsx
// src/app/n/new/page.tsx
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NoteForm } from '@/components/notes/NoteForm'
import * as topicsRepo from '@/lib/db/topics.repo'

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>
}) {
  const { topic: topicSlug } = await searchParams
  const topics = await topicsRepo.listAll()
  const preselected = topicSlug === undefined ? null : await topicsRepo.findBySlug(topicSlug)

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Trang chủ', href: '/' }, { label: 'Ghi chú mới' }]} />
      <h1 className="text-2xl font-semibold">Ghi chú mới</h1>
      <NoteForm topics={topics} defaultTopicId={preselected?.id} />
    </div>
  )
}
```

```tsx
// src/app/n/[note]/edit/page.tsx
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NoteForm } from '@/components/notes/NoteForm'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

export default async function EditNotePage({ params }: { params: Promise<{ note: string }> }) {
  const { note: slug } = await params
  const note = await notesRepo.findBySlug(slug)
  if (note === null) notFound()

  const topics = await topicsRepo.listAll()

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: note.title, href: `/n/${note.slug}` },
          { label: 'Sửa' },
        ]}
      />
      <h1 className="text-2xl font-semibold">Sửa ghi chú</h1>
      <NoteForm topics={topics} note={note} />
    </div>
  )
}
```

- [ ] **Step 10: Lắp nút Ghim/Xoá vào trang chi tiết**

Trong `src/app/n/[note]/page.tsx`, thay khối chỉ có nút "Sửa" bằng:
```tsx
<div className="flex gap-2">
  <StarButton noteId={note.id} starred={note.starred} />
  <Button asChild variant="outline" size="sm">
    <Link href={`/n/${note.slug}/edit`}>Sửa</Link>
  </Button>
  <DeleteNoteButton noteId={note.id} title={note.title} />
</div>
```
và thêm import cho `StarButton`, `DeleteNoteButton`.

- [ ] **Step 11: Kiểm tra thủ công đủ vòng đời**

```bash
pnpm dev
```
- `/t/docker` → "Thêm ghi chú" → công nghệ đã chọn sẵn là Docker.
- Bỏ trống tiêu đề rồi Lưu → lỗi hiện dưới field, không có toast thành công.
- Điền đủ, gõ 2 tag (Enter sau mỗi tag), bấm tab "Xem trước" → markdown hiển thị.
- ⌘S → lưu, toast "Đã tạo ghi chú", chuyển sang trang ghi chú vừa tạo.
- Bấm ⭐ → biểu tượng đầy, quay lại `/` thấy ghi chú trong mục "Đã ghim".
- Sửa nội dung → lưu → nội dung mới hiện ngay (revalidate hoạt động).
- Xoá → dialog nêu đúng tên → xác nhận → toast + về trang công nghệ, ghi chú biến mất.
- Sửa dở rồi bấm back → trình duyệt hỏi xác nhận rời trang.

- [ ] **Step 12: typecheck, lint, test, build, commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add -A
git commit -m "feat: server actions và form tạo/sửa/xoá/ghim ghi chú"
```

---

### Task 15: Export và import dữ liệu

**Files:**
- Create: `src/lib/db/backup.ts`
- Create: `src/app/api/export/route.ts`
- Create: `src/app/api/import/route.ts`
- Test: `tests/lib/db/backup.test.ts`
- Modify: `src/components/layout/AppSidebar.tsx` (link tải sao lưu)

**Interfaces:**
- Consumes: `json-store.ts`, `schema.ts` (`ExportBundleSchema`).
- Produces:
  - `exportBundle(): Promise<ExportBundle>`
  - `importBundle(raw: unknown): Promise<{ counts: { categories: number; topics: number; notes: number } }>` — throw `DataFileError`-style `Error` nếu dữ liệu sai, và **không ghi file nào**

- [ ] **Step 1: Viết test**

`tests/lib/db/backup.test.ts`:
```ts
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { exportBundle, importBundle } from '@/lib/db/backup'
import * as notesRepo from '@/lib/db/notes.repo'
import { seedIfEmpty } from '@/lib/db/seed'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-backup-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

it('export rồi import lại cho ra đúng dữ liệu cũ', async () => {
  await seedIfEmpty()
  const bundle = await exportBundle()
  const before = await notesRepo.listAll()

  await notesRepo.remove(before[0]!.id) // làm dữ liệu lệch đi
  await importBundle(bundle)

  expect(await notesRepo.listAll()).toHaveLength(before.length)
})

it('bundle sai định dạng thì không ghi file nào', async () => {
  await seedIfEmpty()
  const before = await notesRepo.listAll()

  await expect(importBundle({ version: 1, notes: 'không phải mảng' })).rejects.toThrow()
  expect(await notesRepo.listAll()).toHaveLength(before.length)
})

it('một note sai schema cũng làm cả lần import bị từ chối', async () => {
  await seedIfEmpty()
  const bundle = await exportBundle()
  const broken = { ...bundle, notes: [...bundle.notes, { id: 'x' }] }

  await expect(importBundle(broken)).rejects.toThrow()
  expect(await notesRepo.listAll()).toHaveLength(bundle.notes.length)
})
```

- [ ] **Step 2: Chạy test để thấy fail, rồi viết `src/lib/db/backup.ts`**

Run: `pnpm test tests/lib/db/backup.test.ts` → FAIL (thiếu module).

```ts
import { readCollection, writeCollection } from './json-store'
import {
  CategorySchema,
  ExportBundleSchema,
  NoteSchema,
  TopicSchema,
  type ExportBundle,
} from './schema'

export async function exportBundle(): Promise<ExportBundle> {
  const [categories, topics, notes] = await Promise.all([
    readCollection('categories.json', CategorySchema),
    readCollection('topics.json', TopicSchema),
    readCollection('notes.json', NoteSchema),
  ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    topics,
    notes,
  }
}

/**
 * Validate TOÀN BỘ bundle trước khi ghi bất cứ file nào: nhập một file sai định dạng
 * mà làm hỏng nửa dữ liệu là kịch bản tệ nhất, nên ở đây chấp nhận "được ăn cả, ngã về không".
 */
export async function importBundle(
  raw: unknown,
): Promise<{ counts: { categories: number; topics: number; notes: number } }> {
  const parsed = ExportBundleSchema.safeParse(raw)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`File sao lưu không hợp lệ — ${detail}`)
  }

  const { categories, topics, notes } = parsed.data
  await writeCollection('categories.json', CategorySchema, categories)
  await writeCollection('topics.json', TopicSchema, topics)
  await writeCollection('notes.json', NoteSchema, notes)

  return { counts: { categories: categories.length, topics: topics.length, notes: notes.length } }
}
```

Run lại: PASS.

- [ ] **Step 3: Viết hai route handler**

```ts
// src/app/api/export/route.ts
import { exportBundle } from '@/lib/db/backup'

/** Tải toàn bộ dữ liệu về một file JSON để sao lưu. */
export async function GET(): Promise<Response> {
  const bundle = await exportBundle()
  const date = bundle.exportedAt.slice(0, 10)

  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="knowledge-hub-${date}.json"`,
    },
  })
}
```

```ts
// src/app/api/import/route.ts
import { importBundle } from '@/lib/db/backup'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request): Promise<Response> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Body không phải JSON hợp lệ' }, { status: 400 })
  }

  try {
    const { counts } = await importBundle(raw)
    revalidatePath('/', 'layout')
    return Response.json({ ok: true, counts })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Import thất bại' },
      { status: 400 },
    )
  }
}
```

- [ ] **Step 4: Thêm link sao lưu vào sidebar**

Trong `AppSidebar.tsx`, thêm ngay trước thẻ đóng của khối bọc:
```tsx
<a
  href="/api/export"
  className="mt-auto text-xs text-muted-foreground hover:text-foreground hover:underline"
>
  Tải bản sao lưu (JSON)
</a>
```

- [ ] **Step 5: Kiểm tra thủ công**

```bash
pnpm dev
```
- Bấm "Tải bản sao lưu" → trình duyệt tải file `knowledge-hub-<ngày>.json`.
- Nhập lại từ file vừa tải:
```bash
curl -X POST http://localhost:3000/api/import \
  -H 'content-type: application/json' \
  --data-binary @"$HOME/Downloads/knowledge-hub-$(date +%F).json"
```
Expected: `{"ok":true,"counts":{...}}`, và trang web vẫn hiển thị đúng dữ liệu.
- Nhập file rác:
```bash
curl -X POST http://localhost:3000/api/import -H 'content-type: application/json' -d '{"version":1}'
```
Expected: HTTP 400 kèm thông báo tiếng Việt, dữ liệu trong `data/` không đổi.

- [ ] **Step 6: typecheck, test, build, commit**

```bash
pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "feat: export và import dữ liệu dạng JSON"
```

---

### Task 16: Rà soát cuối — mobile, bàn phím, trạng thái tải, README

**Files:**
- Create: `src/components/layout/SidebarShell.tsx`
- Create: `src/app/loading.tsx`
- Create: `src/app/n/[note]/loading.tsx`
- Create: `README.md`
- Modify: `src/app/layout.tsx`, `src/components/layout/Topbar.tsx`

**Interfaces:**
- Consumes: `<AppSidebar />`.
- Produces: `<SidebarShell>{children}</SidebarShell>` (client) — sidebar desktop gập được bằng `⌘\`, mobile mở bằng `Sheet`.

- [ ] **Step 1: Viết `SidebarShell.tsx`**

```tsx
'use client'

import { Menu } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

/**
 * Sidebar được truyền vào dạng children (đã render ở server) nên phần client này
 * chỉ giữ đúng một thứ: trạng thái ẩn/hiện. Dữ liệu vẫn không rơi xuống client.
 */
export function SidebarShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '\\' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setCollapsed((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      {/* Mobile: nút hamburger nổi ở góc trái topbar */}
      <div className="fixed left-3 top-3 z-50 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Mở danh mục">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Danh mục kiến thức</SheetTitle>
            {children}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: gập/mở bằng ⌘\ */}
      {!collapsed && <aside className="hidden lg:block">{children}</aside>}
    </>
  )
}
```

- [ ] **Step 2: Lắp `SidebarShell` vào layout**

Trong `src/app/layout.tsx`, thay khối `<aside className="hidden lg:block"><AppSidebar /></aside>` bằng:
```tsx
<SidebarShell>
  <AppSidebar />
</SidebarShell>
```
`SidebarShell` tự render nút hamburger (cố định góc trái trên, chỉ hiện dưới `lg`), nên `Topbar`
không đổi. Trên mobile, thêm `pl-12` cho `<header>` trong `Topbar` để nút tìm kiếm không nằm dưới
nút hamburger:

```tsx
<header className="flex h-14 items-center justify-between gap-4 border-b pl-12 pr-6 lg:pl-6">
```

- [ ] **Step 3: Thêm trạng thái tải**

```tsx
// src/app/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    </div>
  )
}
```

```tsx
// src/app/n/[note]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="max-w-[72ch] space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
```

- [ ] **Step 4: Rà soát accessibility bằng tay**

Đi hết checklist, sửa ngay tại chỗ nếu sai:
- Tab từ đầu trang: thứ tự hợp lý, focus ring nhìn thấy rõ ở **cả hai** theme.
- Mọi nút chỉ có icon đều có `aria-label` (ThemeToggle, StarButton, hamburger, nút gập nhánh, nút bỏ tag, nút Chép code).
- Mỗi trang có đúng một `<h1>`; heading không nhảy bậc.
- `<nav>` có `aria-label`; nội dung chính nằm trong `<main>`; ghi chú nằm trong `<article>`.
- Trang rỗng (topic chưa có note) có hướng dẫn hành động tiếp theo.
- Kiểm tra tương phản chữ `text-muted-foreground` trên nền của cả hai theme bằng DevTools (yêu cầu ≥ 4.5:1 cho chữ thường).

- [ ] **Step 5: Kiểm tra mobile**

Mở DevTools, chế độ iPhone: sidebar ẩn, hamburger mở Sheet, cây điều hướng dùng được, trang chi tiết ghi chú không tràn ngang (code block tự cuộn), TOC ẩn.

- [ ] **Step 6: Viết `README.md`**

```markdown
# Knowledge Hub

Sổ tay tra cứu kiến thức dev cá nhân, chạy local.

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

## Dữ liệu

Ba file JSON trong `data/`. Sao lưu: mở `/api/export`. Phục hồi: `POST /api/import` với chính file đó.

**Lưu ý:** app ghi trực tiếp vào filesystem nên **không chạy được trên Vercel**. Dùng local
hoặc VPS/Docker có volume ghi được. Muốn deploy công khai thì thay phần trong `src/lib/db/`
bằng SQLite — giao diện repository giữ nguyên nên `src/app/` và `src/components/` không phải sửa.

## Kiến trúc

- `src/lib/db/` — nơi **duy nhất** chạm tới dữ liệu. Không file nào trong `app/` hay `components/` được đọc file trực tiếp.
- `src/lib/actions/` — Server Actions, luôn trả `{ok:true|false}`, không throw ra UI.
- `src/lib/{slug,search,markdown}.ts` — hàm thuần, có unit test.
```

- [ ] **Step 7: Kiểm tra lại ràng buộc kiến trúc lần cuối**

```bash
grep -rn "node:fs\|from 'fs'\|readCollection\|writeCollection" src/app src/components | grep -v "api/" || echo "OK"
```
Expected: không có kết quả nào ngoài route handler (hoặc in "OK").

- [ ] **Step 8: Chạy toàn bộ khâu kiểm tra**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: tất cả xanh. Ghi lại số test đã pass vào commit message.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "polish: mobile sheet, phím tắt, trạng thái tải, README"
```

---

## Đối chiếu với spec

| Mục spec | Task |
|---|---|
| 3. Stack | 1, 8, 11, 14 |
| 4. Cấu trúc thư mục + quy tắc không đọc file ngoài `lib/db` | 1–15, kiểm tra ở 11 Step 9 và 16 Step 7 |
| 5.1 Mô hình dữ liệu | 2 |
| 5.2 Ghi file an toàn | 3 |
| 5.3 Repository + `listWithCounts` + từ chối xoá có con | 5, 6 |
| 5.4 Server Actions + export/import | 14, 15 |
| 5.5 Giới hạn (không chạy Vercel) | 16 (README) |
| 6. Điều hướng & các trang | 12, 14 |
| 7.1 Layout ba vùng | 11, 16 |
| 7.2 Command palette ⌘K | 13 |
| 7.3 Trang chi tiết (TOC, nhãn ngôn ngữ, nút Copy, xoá có xác nhận) | 12, 14 |
| 7.4 Form (tags chip, xem trước, cảnh báo rời trang) | 14 |
| 7.5 Bàn phím & accessibility | 13 (⌘K), 14 (⌘S), 16 (⌘\, rà soát a11y) |
| 8. Xử lý lỗi | 3, 5, 6, 12 (`error.tsx`, `not-found.tsx`), 14, 15 |
| 9. Test | 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 15 |
| 10. Nội dung seed | 9, 10 |
| 11. Thứ tự triển khai | Thứ tự Task 1 → 16 |

**Hai điểm lệch spec đã ghi rõ lý do ngay tại task:** render markdown bằng pipeline `unified`
thay vì `react-markdown` (Task 8), và breadcrumb đặt ở đầu mỗi trang thay vì trong topbar (Task 11).
