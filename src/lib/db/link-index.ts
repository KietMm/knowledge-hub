import type { DichLink } from '@/lib/wiki-link'
import * as exercisesRepo from './exercises.repo'
import * as notesRepo from './notes.repo'

/**
 * Bảng tra cho liên kết chéo `[[slug]]`: gộp bài học và bài tập vào cùng một không gian
 * tên slug, mỗi cái mang theo url của nó.
 *
 * Gộp ở tầng này (không phải ở từng trang) vì cả hai loại trang đều cần đúng bảng đó, và
 * `scripts/build-content.ts` cũng kiểm tính hợp lệ trên đúng tập slug đó lúc build — ba
 * chỗ dùng chung một định nghĩa thì không lệch được.
 */
export async function buildDichLink(): Promise<Map<string, DichLink>> {
  const [notes, baiTap] = await Promise.all([notesRepo.listAll(), exercisesRepo.listAll()])
  return new Map<string, DichLink>([
    ...notes.map((n) => [n.slug, { tieuDe: n.title, url: `/n/${n.slug}` }] as const),
    ...baiTap.map((bt) => [bt.slug, { tieuDe: bt.title, url: `/bt/${bt.slug}` }] as const),
  ])
}
