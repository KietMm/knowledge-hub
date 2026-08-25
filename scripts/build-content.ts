import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { parseFrontmatter } from '../src/lib/frontmatter'
import { tachBaiTap } from '../src/lib/exercise/parse'
import {
  CategorySchema,
  NoteLevelSchema,
  ExerciseSchema,
  KieuSoSanhSchema,
  NoteSchema,
  SlugSchema,
  TopicSchema,
  type Category,
  type Exercise,
  type Note,
  type Topic,
} from '../src/lib/db/schema'

/**
 * Biên dịch giáo trình: `content/` (markdown, dễ viết) -> JSON (dữ liệu app đọc).
 *
 * Vì sao có bước này thay vì gõ thẳng vào data/*.json: nội dung bài học là văn bản
 * dài có khối code, gần như không sửa nổi khi đã bị nhét vào một chuỗi JSON một dòng.
 * Viết ở dạng .md thì diff đọc được, và thứ tự bài học nhìn thấy ngay từ tên file.
 *
 *   pnpm content:build   -> chỉ dựng lại src/lib/db/seed-data.json
 *   pnpm content:sync    -> dựng lại rồi ghi luôn vào data/ (giữ nguyên trạng thái ghim)
 */

/** zod 3 chưa có hàm gộp lỗi sẵn — tự nối các issue thành vài dòng đọc được. */
function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(gốc)'}: ${issue.message}`)
    .join('\n')
}

const ROOT = resolve(__dirname, '..')
const CONTENT_DIR = join(ROOT, 'content')
const SEED_JSON = join(ROOT, 'src', 'lib', 'db', 'seed-data.json')
const DATA_DIR = join(ROOT, 'data')
/** Bài tập nằm ngoài cây mảng/công nghệ: nó là kho riêng, không thuộc lộ trình nào. */
const EXERCISE_DIR = join(CONTENT_DIR, 'bai-tap')

/** Mốc thời gian cố định: chạy lại script không được tạo diff giả ở createdAt/updatedAt. */
const BASE_TIME = Date.parse('2026-01-01T00:00:00.000Z')

const StructureSchema = z.object({
  categories: z
    .array(
      CategorySchema.omit({ order: true }).extend({
        topics: z.array(TopicSchema.omit({ order: true, categoryId: true })).min(1),
      }),
    )
    .min(1),
})

const LessonFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  slug: SlugSchema,
  summary: z.string().trim().min(1, 'Bài học phải có tóm tắt — nó hiện trên thẻ và trong ⌘K'),
  level: NoteLevelSchema,
  tags: z.array(z.string().trim().min(1)).min(1),
})

const ExerciseFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  slug: SlugSchema,
  do_kho: z.enum(['de', 'trung-binh', 'kho']),
  chu_de: z.array(z.string().trim().min(1)).min(1),
  ham: z.string().trim().min(1, 'Phải khai tên hàm người học cần viết'),
  bai_hoc: SlugSchema.optional(),
  so_sanh: KieuSoSanhSchema.optional(),
})

/** Tên file dạng `01-ten-bai.md`: số ở đầu quyết định thứ tự bài trong lộ trình. */
const FILE_NAME = /^(\d{2})-([a-z0-9-]+)\.md$/

function readStructure(): z.infer<typeof StructureSchema> {
  const raw: unknown = JSON.parse(readFileSync(join(CONTENT_DIR, 'structure.json'), 'utf8'))
  const parsed = StructureSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`content/structure.json không hợp lệ:\n${formatIssues(parsed.error)}`)
  }
  return parsed.data
}

function listLessonFiles(topicSlug: string): string[] {
  const dir = join(CONTENT_DIR, topicSlug)
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Thiếu thư mục bài học content/${topicSlug}/ cho công nghệ "${topicSlug}"`)
  }
  const files = readdirSync(dir).filter((name) => name.endsWith('.md'))
  if (files.length === 0) throw new Error(`content/${topicSlug}/ chưa có bài học nào`)
  for (const name of files) {
    if (!FILE_NAME.test(name)) {
      throw new Error(`Tên file sai dạng: content/${topicSlug}/${name} (cần "01-ten-bai.md")`)
    }
  }
  return files.sort()
}

/**
 * Đọc kho bài tập. Trả về mảng rỗng nếu chưa có thư mục — mảnh nội dung này là tuỳ
 * chọn, không có bài tập nào thì app vẫn là một giáo trình hoàn chỉnh.
 */
function buildExercises(): Exercise[] {
  if (!statSync(EXERCISE_DIR, { throwIfNoEntry: false })?.isDirectory()) return []

  const files = readdirSync(EXERCISE_DIR)
    .filter((name) => name.endsWith('.md'))
    .sort()
  const exercises: Exercise[] = []
  const seen = new Set<string>()

  for (const fileName of files) {
    if (!FILE_NAME.test(fileName)) {
      throw new Error(`Tên file sai dạng: content/bai-tap/${fileName} (cần "01-ten-bai.md")`)
    }
    const { data, body } = parseFrontmatter(readFileSync(join(EXERCISE_DIR, fileName), 'utf8'))
    const parsed = ExerciseFrontmatterSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Frontmatter sai ở content/bai-tap/${fileName}:\n${formatIssues(parsed.error)}`)
    }
    const [, orderPrefix, fileSlug] = FILE_NAME.exec(fileName) ?? []
    if (orderPrefix === undefined || fileSlug === undefined) {
      throw new Error(`Không đọc được thứ tự từ tên file ${fileName}`)
    }
    if (fileSlug !== parsed.data.slug) {
      throw new Error(
        `content/bai-tap/${fileName}: tên file và slug phải trùng nhau ` +
          `(file "${fileSlug}" vs frontmatter "${parsed.data.slug}")`,
      )
    }
    if (seen.has(parsed.data.slug)) throw new Error(`Slug bài tập bị trùng: "${parsed.data.slug}"`)
    seen.add(parsed.data.slug)

    let tach
    try {
      tach = tachBaiTap(body)
    } catch (loi) {
      throw new Error(`content/bai-tap/${fileName}: ${(loi as Error).message}`)
    }

    exercises.push(
      ExerciseSchema.parse({
        id: `bt-${parsed.data.slug}`,
        slug: parsed.data.slug,
        title: parsed.data.title,
        doKho: parsed.data.do_kho,
        chuDe: parsed.data.chu_de,
        ham: parsed.data.ham,
        ...(parsed.data.bai_hoc === undefined ? {} : { baiHoc: parsed.data.bai_hoc }),
        soSanh: parsed.data.so_sanh ?? 'chinh-xac',
        deBai: tach.deBai,
        starter: tach.starter,
        boTest: tach.boTest,
        loiGiai: tach.loiGiai,
        order: Number(orderPrefix),
      }),
    )
  }
  return exercises
}

function build(): { categories: Category[]; topics: Topic[]; notes: Note[]; exercises: Exercise[] } {
  const structure = readStructure()
  const categories: Category[] = []
  const topics: Topic[] = []
  const notes: Note[] = []
  const seenNoteSlugs = new Set<string>()

  structure.categories.forEach((category, categoryIndex) => {
    const { topics: categoryTopics, ...categoryFields } = category
    categories.push({ ...categoryFields, order: categoryIndex + 1 })

    categoryTopics.forEach((topic, topicIndex) => {
      topics.push({ ...topic, categoryId: category.id, order: topicIndex + 1 })

      listLessonFiles(topic.slug).forEach((fileName) => {
        const path = join(CONTENT_DIR, topic.slug, fileName)
        const { data, body } = parseFrontmatter(readFileSync(path, 'utf8'))
        const parsed = LessonFrontmatterSchema.safeParse(data)
        if (!parsed.success) {
          throw new Error(
            `Frontmatter sai ở content/${topic.slug}/${fileName}:\n${formatIssues(parsed.error)}`,
          )
        }
        const [, orderPrefix, fileSlug] = FILE_NAME.exec(fileName) ?? []
        if (orderPrefix === undefined || fileSlug === undefined) {
          throw new Error(`Không đọc được thứ tự từ tên file ${fileName}`)
        }
        if (fileSlug !== parsed.data.slug) {
          throw new Error(
            `content/${topic.slug}/${fileName}: tên file và slug phải trùng nhau ` +
              `(file "${fileSlug}" vs frontmatter "${parsed.data.slug}")`,
          )
        }
        if (seenNoteSlugs.has(parsed.data.slug)) {
          throw new Error(`Slug bài học bị trùng trên toàn bộ giáo trình: "${parsed.data.slug}"`)
        }
        seenNoteSlugs.add(parsed.data.slug)
        if (body === '') throw new Error(`content/${topic.slug}/${fileName} không có nội dung`)

        // Thời gian sinh theo vị trí bài: cố định giữa các lần chạy, và bài về sau
        // "mới" hơn bài trước nên mục "Bài mới nhất" ở trang chủ có thứ tự hợp lý.
        const stamp = new Date(BASE_TIME + notes.length * 3_600_000).toISOString()
        notes.push({
          id: `note-${parsed.data.slug}`,
          topicId: topic.id,
          title: parsed.data.title,
          slug: parsed.data.slug,
          summary: parsed.data.summary,
          content: body,
          tags: parsed.data.tags,
          order: Number(orderPrefix),
          level: parsed.data.level,
          starred: false,
          createdAt: stamp,
          updatedAt: stamp,
        })
      })
    })
  })

  // Kiểm tra lần cuối bằng chính schema app dùng lúc chạy: sai gì thì hỏng ở đây,
  // không phải lúc mở trình duyệt.
  z.array(CategorySchema).parse(categories)
  z.array(TopicSchema).parse(topics)
  z.array(NoteSchema).parse(notes)

  // Liên kết chéo [[slug]] phải trỏ tới bài có thật. Kiểm tra ở đây (sau khi đã đọc hết
  // giáo trình) vì lúc đọc từng file thì chưa biết bài về sau có slug gì.
  const slugCoThat = new Set(notes.map((n) => n.slug))
  const linkSai: string[] = []
  for (const note of notes) {
    for (const match of note.content.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
      const dich = match[1]
      if (dich !== undefined && !slugCoThat.has(dich)) {
        linkSai.push(`  - ${note.slug} trỏ tới "${dich}" (không có bài nào mang slug này)`)
      }
    }
  }
  if (linkSai.length > 0) {
    throw new Error(`Liên kết chéo [[...]] trỏ sai:\n${linkSai.join('\n')}`)
  }

  const exercises = buildExercises()

  // `bai_hoc` phải trỏ tới bài có thật: danh sách "bài tập luyện phần này" ở cuối bài học
  // được suy ra từ chính trường này, nên trỏ sai nghĩa là bài tập biến mất khỏi bài học
  // mà không ai nhận ra.
  for (const bt of exercises) {
    for (const match of `${bt.deBai}\n${bt.loiGiai}`.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
      const dich = match[1]
      if (dich !== undefined && !slugCoThat.has(dich)) {
        throw new Error(`Bài tập ${bt.slug} trỏ tới "[[${dich}]]" — không có bài nào mang slug này`)
      }
    }
  }

  const baiHocSai = exercises
    .filter((bt) => bt.baiHoc !== undefined && !slugCoThat.has(bt.baiHoc))
    .map((bt) => `  - bài tập ${bt.slug} trỏ tới bài học "${bt.baiHoc}" (không tồn tại)`)
  if (baiHocSai.length > 0) {
    throw new Error(`Liên kết bài tập → bài học trỏ sai:\n${baiHocSai.join('\n')}`)
  }

  const categoryIds = new Set(categories.map((c) => c.id))
  for (const topic of topics) {
    if (!categoryIds.has(topic.categoryId)) {
      throw new Error(`Công nghệ "${topic.slug}" trỏ tới mảng không tồn tại: ${topic.categoryId}`)
    }
  }
  return { categories, topics, notes, exercises }
}

/**
 * Ghi vào data/ nhưng giữ lại trạng thái ghim người dùng đã đặt trên từng bài —
 * đây là thứ duy nhất người dùng sở hữu mà giáo trình không sinh ra được.
 * data/notes.json có thể chưa tồn tại (máy mới) hoặc hỏng: coi như chưa ghim gì.
 */
function readStarredIds(): Set<string> {
  try {
    const raw: unknown = JSON.parse(readFileSync(join(DATA_DIR, 'notes.json'), 'utf8'))
    const existing = z.array(NoteSchema).safeParse(raw)
    if (!existing.success) return new Set()
    return new Set(existing.data.filter((n) => n.starred).map((n) => n.id))
  } catch {
    return new Set()
  }
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const { categories, topics, notes, exercises } = build()
writeJson(SEED_JSON, { categories, topics, notes, exercises })
console.log(
  `Đã dựng giáo trình: ${categories.length} mảng, ${topics.length} công nghệ, ` +
    `${notes.length} bài học, ${exercises.length} bài tập`,
)

if (process.argv.includes('--sync')) {
  const starred = readStarredIds()
  const daGhim = notes.map((note) => (starred.has(note.id) ? { ...note, starred: true } : note))
  const soKhop = daGhim.filter((n) => n.starred).length

  writeJson(join(DATA_DIR, 'categories.json'), categories)
  writeJson(join(DATA_DIR, 'topics.json'), topics)
  writeJson(join(DATA_DIR, 'notes.json'), daGhim)
  writeJson(join(DATA_DIR, 'exercises.json'), exercises)

  // Báo cả số ghim KHÔNG khớp: bài đổi slug thì đổi luôn id, và trạng thái ghim của
  // nó rơi mất một cách âm thầm nếu chỉ in ra con số khớp được.
  console.log(`Đã ghi vào data/ — giữ được ${soKhop}/${starred.size} bài đã ghim`)
  const mat = Array.from(starred).filter((id) => !notes.some((n) => n.id === id))
  if (mat.length > 0) {
    console.log(`  Mất ghim (bài không còn tồn tại): ${mat.join(', ')}`)
  }
}
