import { z } from 'zod'
import {
  CategorySchema,
  ExerciseSchema,
  NoteSchema,
  TopicSchema,
  type Category,
  type Exercise,
  type Note,
  type Topic,
} from './schema'
import bundle from './seed-data.json'

/**
 * Giáo trình khởi tạo. File này KHÔNG viết tay: `seed-data.json` được sinh ra từ
 * thư mục `content/` bằng `pnpm content:build`.
 *
 * Vì sao qua một bước sinh: nội dung bài học là văn bản dài có khối code, gần như
 * không sửa nổi khi đã bị nhét vào chuỗi trong file .ts hay .json. Viết ở dạng .md
 * thì diff đọc được, và thứ tự bài học nhìn thấy ngay từ tên file.
 *
 * Vẫn parse lại bằng zod dù dữ liệu do chính script sinh: import JSON chỉ suy ra
 * hình dạng chứ không kiểm tra ràng buộc (slug hợp lệ, cấp độ nằm trong enum), và
 * mọi trường có .default() đến đây vẫn là tuỳ chọn. Parse ở đây là chỗ duy nhất
 * biến nó thành Category/Topic/Note đầy đủ.
 */

/** Lỗi ở đây luôn là do seed-data.json cũ hoặc bị sửa tay — nói rõ cách xử lý. */
function baoLoi(ten: string, error: z.ZodError): never {
  throw new Error(
    `seed-data.json sai hình dạng ở "${ten}" — chạy lại \`pnpm content:build\`.\n` +
      error.issues.map((i) => `  - ${i.path.join('.') || '(gốc)'}: ${i.message}`).join('\n'),
  )
}

const categories = z.array(CategorySchema).safeParse(bundle.categories)
if (!categories.success) baoLoi('categories', categories.error)

const topics = z.array(TopicSchema).safeParse(bundle.topics)
if (!topics.success) baoLoi('topics', topics.error)

const notes = z.array(NoteSchema).safeParse(bundle.notes)
if (!notes.success) baoLoi('notes', notes.error)

const exercises = z.array(ExerciseSchema).safeParse(bundle.exercises)
if (!exercises.success) baoLoi('exercises', exercises.error)

export const SEED_CATEGORIES: Category[] = categories.data
export const SEED_TOPICS: Topic[] = topics.data
export const SEED_NOTES: Note[] = notes.data
export const SEED_EXERCISES: Exercise[] = exercises.data
