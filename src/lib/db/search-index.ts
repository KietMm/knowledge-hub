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
