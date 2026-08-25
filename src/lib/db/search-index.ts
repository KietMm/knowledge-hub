import type { SearchItem } from '@/lib/search'
import * as exercisesRepo from './exercises.repo'
import * as notesRepo from './notes.repo'
import { nhanTag } from '@/lib/tag-label'
import * as topicsRepo from './topics.repo'

/**
 * Chỉ mục cho ⌘K được dựng ở server rồi truyền xuống client một lần qua props.
 * Với quy mô sổ tay cá nhân (vài trăm ghi chú) cách này đơn giản và tìm kiếm chạy
 * tức thì, không cần gọi mạng cho mỗi phím gõ. Nếu sau này dữ liệu lớn lên, thay
 * chỗ này bằng một route handler tìm kiếm — SearchPalette chỉ cần đổi nguồn items.
 */
export async function buildSearchIndex(): Promise<SearchItem[]> {
  const [notes, topics, baiTap] = await Promise.all([
    notesRepo.listAll(),
    topicsRepo.listAll(),
    exercisesRepo.listAll(),
  ])
  const byId = new Map(topics.map((t) => [t.id, t]))

  const tuBaiHoc: SearchItem[] = notes.map((note) => {
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
      href: `/n/${note.slug}`,
    }
  })

  // Bài tập gom thành một nhóm riêng trong ⌘K. Nội dung tìm được gồm cả đề bài lẫn lời
  // giải — người học thường nhớ một câu trong phần phân tích chứ không nhớ tên bài.
  const tuBaiTap: SearchItem[] = baiTap.map((bt) => ({
    id: bt.id,
    title: bt.title,
    slug: bt.slug,
    summary: `Bài tập ${bt.doKho === 'de' ? 'dễ' : bt.doKho === 'kho' ? 'khó' : 'trung bình'} · ${bt.chuDe.map(nhanTag).join(', ')}`,
    content: `${bt.deBai}\n${bt.loiGiai}`,
    tags: bt.chuDe,
    topicName: 'Bài tập',
    topicSlug: 'bai-tap',
    href: `/bt/${bt.slug}`,
  }))

  return [...tuBaiHoc, ...tuBaiTap]
}
