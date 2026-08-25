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
  /**
   * Đường dẫn tới mục này. Mang theo trong item chứ không ghép từ slug ở nơi hiển thị:
   * chỉ mục gồm cả bài học (`/n/…`) lẫn bài tập (`/bt/…`), và nơi hiển thị không nên
   * phải biết một kết quả thuộc loại nào.
   */
  href: string
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
