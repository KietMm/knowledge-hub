import { describe, expect, it } from 'vitest'
import { getCategoryColorClassName } from '@/lib/category-color'

describe('getCategoryColorClassName', () => {
  it('trả về class chứa đúng sắc độ cho từng màu đã seed', () => {
    expect(getCategoryColorClassName('sky')).toContain('sky')
    expect(getCategoryColorClassName('emerald')).toContain('emerald')
    expect(getCategoryColorClassName('rose')).toContain('rose')
    expect(getCategoryColorClassName('amber')).toContain('amber')
  })

  it('mỗi màu có cả biến thể theme sáng và theme tối', () => {
    const className = getCategoryColorClassName('sky')
    expect(className).toMatch(/(?:^|\s)bg-sky-\d+/)
    expect(className).toMatch(/(?:^|\s)text-sky-\d+/)
    expect(className).toMatch(/dark:bg-sky-/)
    expect(className).toMatch(/dark:text-sky-/)
  })

  it('màu không có trong bảng trắng trả về class mặc định an toàn, không throw', () => {
    expect(() => getCategoryColorClassName('mau-la')).not.toThrow()
    const className = getCategoryColorClassName('mau-la')
    expect(className).not.toBe('')
    expect(className).not.toContain('mau-la')
  })

  it('chuỗi rỗng cũng rơi về mặc định', () => {
    expect(getCategoryColorClassName('')).toBe(getCategoryColorClassName('mau-la'))
  })
})
