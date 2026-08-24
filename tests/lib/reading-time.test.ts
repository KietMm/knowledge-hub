import { describe, expect, it } from 'vitest'
import { estimateReadingMinutes, formatReadingDuration } from '@/lib/reading-time'

describe('estimateReadingMinutes', () => {
  it('không bao giờ trả về 0 — "0 phút đọc" là thông tin vô nghĩa', () => {
    expect(estimateReadingMinutes('')).toBe(1)
    expect(estimateReadingMinutes('ngắn')).toBe(1)
  })

  it('văn xuôi dài hơn thì lâu hơn', () => {
    const ngan = 'từ '.repeat(200)
    const dai = 'từ '.repeat(1000)
    expect(estimateReadingMinutes(dai)).toBeGreaterThan(estimateReadingMinutes(ngan))
  })

  it('tính code theo dòng, không theo từ', () => {
    // 40 dòng code chỉ có 40 từ; nếu đếm như văn xuôi thì ra 1 phút,
    // trong khi đọc code chậm hơn nhiều.
    const code = '```ts\n' + 'x\n'.repeat(40) + '```'
    expect(estimateReadingMinutes(code)).toBeGreaterThan(1)
  })

  it('dấu mở/đóng khối code không bị tính là nội dung', () => {
    const chiCoFence = '```\n```'
    expect(estimateReadingMinutes(chiCoFence)).toBe(1)
  })

  it('khối code có ngôn ngữ và thụt lề vẫn được nhận ra', () => {
    const thutLe = '- Ví dụ:\n\n  ```js\n' + '  const a = 1\n'.repeat(30) + '  ```\n'
    expect(estimateReadingMinutes(thutLe)).toBeGreaterThan(1)
  })

  it('bài học thật (~4500 ký tự) ra con số hợp lý', () => {
    const bai = ['# Tiêu đề', 'từ '.repeat(700), '```ts', 'const a = 1', '```'].join('\n')
    const phut = estimateReadingMinutes(bai)
    expect(phut).toBeGreaterThanOrEqual(3)
    expect(phut).toBeLessThanOrEqual(10)
  })
})

describe('formatReadingDuration', () => {
  it('dưới một giờ thì hiện phút — không quy về "0,7 giờ"', () => {
    expect(formatReadingDuration(42)).toBe('42 phút')
    expect(formatReadingDuration(59)).toBe('59 phút')
  })

  it('từ một giờ trở lên thì đổi sang giờ, làm tròn nửa giờ', () => {
    expect(formatReadingDuration(60)).toBe('1 giờ')
    expect(formatReadingDuration(100)).toBe('1,5 giờ')
    expect(formatReadingDuration(445)).toBe('7,5 giờ')
  })

  it('không bao giờ ra "0 phút"', () => {
    expect(formatReadingDuration(0)).toBe('1 phút')
  })
})
