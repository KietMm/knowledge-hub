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

/**
 * Giữ lại những tag đáng để lọc.
 *
 * Tag chỉ xuất hiện ở đúng một bài không phải bộ lọc: bấm vào nó cho ra một bài mà
 * người dùng đang nhìn thấy ngay trên màn hình. Với công nghệ có mười mấy tag lẻ, dãy
 * chip đó đẩy chính danh sách bài học xuống dưới màn hình — trên điện thoại là năm
 * dòng chip trước khi thấy bài đầu tiên. Tìm theo tag lẻ đã có sẵn ở ⌘K.
 *
 * Tag đang được chọn luôn được giữ lại, kể cả khi chỉ có một bài: nếu bỏ nó đi thì
 * người dùng vào bằng link có sẵn sẽ thấy danh sách đã lọc mà không có chip nào sáng.
 */
export function usefulTags(counts: TagCount[], selected: string | null, minCount = 2): TagCount[] {
  const kept = counts.filter((c) => c.count >= minCount || c.tag === selected)
  // Chỉ còn đúng một tag mà mọi bài đều mang thì nó không chia được gì — bỏ luôn cả dãy.
  return kept.length === 1 && kept[0]?.tag !== selected ? [] : kept
}

