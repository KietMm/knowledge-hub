import { describe, expect, it } from 'vitest'
import { searchNotes, type SearchItem } from '@/lib/search'

function item(partial: Partial<SearchItem> & { id: string }): SearchItem {
  return {
    title: '', slug: partial.id, summary: '', content: '', tags: [],
    topicName: 'Docker', topicSlug: 'docker', ...partial,
  }
}

const items: SearchItem[] = [
  item({ id: 'title', title: 'Index trong PostgreSQL' }),
  item({ id: 'tag', title: 'Khác hẳn', tags: ['index'] }),
  item({ id: 'summary', title: 'Khác hẳn', summary: 'Khi nào nên đánh index' }),
  item({ id: 'content', title: 'Khác hẳn', content: 'CREATE INDEX idx ON users(email)' }),
  item({ id: 'khong-lien-quan', title: 'Docker compose' }),
]

describe('searchNotes', () => {
  it('xếp hạng: tiêu đề > tag > tóm tắt > nội dung', () => {
    const results = searchNotes(items, 'index')
    expect(results.map((r) => r.item.id)).toEqual(['title', 'tag', 'summary', 'content'])
    expect(results[0]?.matchedIn).toBe('title')
  })

  it('không phân biệt hoa thường và dấu tiếng Việt', () => {
    const vi = [item({ id: 'a', title: 'Lập trình Bất Đồng Bộ' })]
    expect(searchNotes(vi, 'bat dong bo')).toHaveLength(1)
    expect(searchNotes(vi, 'BẤT ĐỒNG')).toHaveLength(1)
  })

  it('chuỗi rỗng hoặc toàn khoảng trắng trả mảng rỗng', () => {
    expect(searchNotes(items, '')).toEqual([])
    expect(searchNotes(items, '   ')).toEqual([])
  })

  it('không khớp thì trả mảng rỗng', () => {
    expect(searchNotes(items, 'kubernetes')).toEqual([])
  })

  it('khớp đầu tiêu đề xếp trên khớp giữa tiêu đề', () => {
    const list = [
      item({ id: 'giua', title: 'Tối ưu index' }),
      item({ id: 'dau', title: 'Index là gì' }),
    ]
    expect(searchNotes(list, 'index').map((r) => r.item.id)).toEqual(['dau', 'giua'])
  })

  it('tôn trọng limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => item({ id: `n${i}`, title: `Index ${i}` }))
    expect(searchNotes(many, 'index', 5)).toHaveLength(5)
  })
})
