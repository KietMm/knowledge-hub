import { describe, expect, it } from 'vitest'
import {
  countByLevel,
  getLevelBarClassName,
  getLevelClassName,
  getLevelLabel,
  getLevelRank,
  NOTE_LEVELS,
} from '@/lib/level'

describe('getLevelLabel', () => {
  it('có nhãn tiếng Việt cho cả ba cấp độ', () => {
    expect(getLevelLabel('co-ban')).toBe('Cơ bản')
    expect(getLevelLabel('trung-cap')).toBe('Trung cấp')
    expect(getLevelLabel('nang-cao')).toBe('Nâng cao')
  })
})

describe('getLevelRank', () => {
  it('xếp theo đúng thứ tự tăng dần', () => {
    expect(getLevelRank('co-ban')).toBeLessThan(getLevelRank('trung-cap'))
    expect(getLevelRank('trung-cap')).toBeLessThan(getLevelRank('nang-cao'))
  })
})

describe('class màu', () => {
  it('mỗi cấp độ có class riêng, không trùng nhau', () => {
    const chip = NOTE_LEVELS.map(getLevelClassName)
    const bar = NOTE_LEVELS.map(getLevelBarClassName)
    expect(new Set(chip).size).toBe(NOTE_LEVELS.length)
    expect(new Set(bar).size).toBe(NOTE_LEVELS.length)
  })

  it('không sinh class động — mọi class phải là chuỗi tĩnh Tailwind quét được', () => {
    for (const level of NOTE_LEVELS) {
      expect(getLevelClassName(level)).not.toContain('${')
      expect(getLevelBarClassName(level)).not.toContain('${')
    }
  })
})

describe('countByLevel', () => {
  it('luôn trả đủ ba cấp độ theo thứ tự tăng dần, kể cả khi có cấp 0 bài', () => {
    const kq = countByLevel([{ level: 'nang-cao' }, { level: 'nang-cao' }])
    expect(kq).toEqual([
      { level: 'co-ban', count: 0 },
      { level: 'trung-cap', count: 0 },
      { level: 'nang-cao', count: 2 },
    ])
  })

  it('đếm đúng và tổng bằng số phần tử đầu vào', () => {
    const items = [
      { level: 'co-ban' },
      { level: 'co-ban' },
      { level: 'trung-cap' },
      { level: 'nang-cao' },
    ] as const
    const kq = countByLevel([...items])
    expect(kq.map((x) => x.count)).toEqual([2, 1, 1])
    expect(kq.reduce((t, x) => t + x.count, 0)).toBe(items.length)
  })

  it('danh sách rỗng vẫn trả ba mục count 0', () => {
    expect(countByLevel([])).toEqual([
      { level: 'co-ban', count: 0 },
      { level: 'trung-cap', count: 0 },
      { level: 'nang-cao', count: 0 },
    ])
  })
})
