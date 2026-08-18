/**
 * Lọc theo tag ở `/t/[topic]` (spec §6) chỉ cần đếm tag và lọc mảng — tách thành
 * hàm thuần ở đây để test độc lập, và để trang chỉ còn việc gọi hàm + render.
 * Dùng generic thay vì import type Note: giữ hàm không phụ thuộc tầng dữ liệu,
 * giống cách search.ts tự định nghĩa SearchItem thay vì import Note.
 */

export type TagCount = { tag: string; count: number }

type Taggable = { tags: string[] }

/** Đếm số lần mỗi tag xuất hiện, chỉ trong tập item được truyền vào (không toàn cục). */
export function collectTagCounts<T extends Taggable>(items: T[]): TagCount[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'vi'),
  )
}

/** `tag === null` nghĩa là không lọc — trả về nguyên danh sách. */
export function filterByTag<T extends Taggable>(items: T[], tag: string | null): T[] {
  if (tag === null) return items
  return items.filter((item) => item.tags.includes(tag))
}
