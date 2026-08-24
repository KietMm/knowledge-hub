import { describe, expect, it } from 'vitest'
import { collectTagCounts, filterByTag, usefulTags } from '@/lib/tags'

type Item = { id: string; tags: string[] }

function item(id: string, tags: string[]): Item {
  return { id, tags }
}

const items: Item[] = [
  item('a', ['async', 'event-loop']),
  item('b', ['async']),
  item('c', ['typescript']),
  item('d', []),
]

describe('collectTagCounts', () => {
  it('đếm số lần xuất hiện của mỗi tag trên toàn bộ danh sách', () => {
    expect(collectTagCounts(items)).toEqual([
      { tag: 'async', count: 2 },
      { tag: 'event-loop', count: 1 },
      { tag: 'typescript', count: 1 },
    ])
  })

  it('sắp xếp theo số lượng giảm dần, cùng số lượng thì theo bảng chữ cái', () => {
    const result = collectTagCounts(items)
    expect(result[0]).toEqual({ tag: 'async', count: 2 })
    // 'event-loop' và 'typescript' cùng count=1, xếp theo alphabet
    expect(result.slice(1).map((r) => r.tag)).toEqual(['event-loop', 'typescript'])
  })

  it('danh sách rỗng trả mảng rỗng', () => {
    expect(collectTagCounts([])).toEqual([])
  })

  it('ghi chú không có tag nào không góp phần vào kết quả', () => {
    expect(collectTagCounts([item('only-empty', [])])).toEqual([])
  })
})

describe('filterByTag', () => {
  it('tag null trả về nguyên danh sách, không lọc', () => {
    expect(filterByTag(items, null)).toEqual(items)
  })

  it('lọc đúng những item mang tag chỉ định', () => {
    expect(filterByTag(items, 'async').map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('tag không tồn tại trong bất kỳ item nào trả mảng rỗng', () => {
    expect(filterByTag(items, 'khong-ton-tai')).toEqual([])
  })
})

describe('usefulTags', () => {
  const counts = [
    { tag: 'docker', count: 6 },
    { tag: 'volume', count: 2 },
    { tag: 'mang', count: 1 },
    { tag: 'compose', count: 1 },
  ]

  it('bỏ tag chỉ có một bài — bấm vào không lọc được gì', () => {
    expect(usefulTags(counts, null)).toEqual([
      { tag: 'docker', count: 6 },
      { tag: 'volume', count: 2 },
    ])
  })

  it('giữ tag đang chọn dù chỉ có một bài', () => {
    expect(usefulTags(counts, 'mang').map((c) => c.tag)).toEqual(['docker', 'volume', 'mang'])
  })

  it('chỉ còn đúng một tag chung cho mọi bài thì bỏ luôn cả dãy', () => {
    expect(usefulTags([{ tag: 'docker', count: 6 }], null)).toEqual([])
  })

  it('vẫn hiện dãy nếu tag duy nhất đó đang được chọn', () => {
    expect(usefulTags([{ tag: 'docker', count: 6 }], 'docker')).toHaveLength(1)
  })

  it('danh sách rỗng vẫn an toàn', () => {
    expect(usefulTags([], null)).toEqual([])
  })
})
