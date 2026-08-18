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
