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
 * Dùng ở root layout. Promise thành công được nhớ lại nên mỗi tiến trình chỉ kiểm tra
 * một lần, thay vì đọc lại ba file ở mọi request.
 */
let seedOnce: Promise<void> | null = null

export function ensureSeeded(): Promise<void> {
  seedOnce ??= seedIfEmpty()
    .then(() => undefined)
    .catch((error: unknown) => {
      // KHÔNG nhớ promise lỗi: nếu seed thất bại (vd file dữ liệu bị hỏng), xoá memo
      // ngay để lần gọi kế tiếp (request sau, hoặc nút "Thử lại") thử đọc lại thật sự
      // thay vì trả mãi mãi cùng một lỗi cũ tới khi restart tiến trình.
      seedOnce = null
      throw error
    })
  return seedOnce
}
