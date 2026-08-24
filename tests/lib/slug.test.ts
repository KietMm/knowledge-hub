import { describe, expect, it } from 'vitest'
import { normalizeText, slugify, uniqueSlug } from '@/lib/slug'

describe('normalizeText', () => {
  it('bỏ dấu tiếng Việt và chuyển thường', () => {
    expect(normalizeText('Bất Đồng Bộ')).toBe('bat dong bo')
    expect(normalizeText('Học lập trình')).toBe('hoc lap trinh')
  })

  it('xử lý đủ các nguyên âm có dấu và chữ đ', () => {
    expect(normalizeText('ĐƯỜNG ăn Ổi ữ')).toBe('duong an oi u')
  })
})

describe('slugify', () => {
  it('tạo slug kebab-case từ tiêu đề tiếng Việt', () => {
    expect(slugify('Lập trình bất đồng bộ')).toBe('lap-trinh-bat-dong-bo')
  })

  it('bỏ ký tự đặc biệt và gộp gạch nối', () => {
    expect(slugify('async/await là gì?!')).toBe('async-await-la-gi')
    expect(slugify('  C++  &  C#  ')).toBe('c-c')
  })

  it('giữ số', () => {
    expect(slugify('OWASP Top 10')).toBe('owasp-top-10')
  })

  it('chuỗi không còn ký tự hợp lệ thì trả "ghi-chu"', () => {
    expect(slugify('!!!')).toBe('ghi-chu')
    expect(slugify('')).toBe('ghi-chu')
  })
})

describe('uniqueSlug', () => {
  it('trả nguyên slug khi chưa ai dùng', () => {
    expect(uniqueSlug('docker', ['nextjs'])).toBe('docker')
  })

  it('thêm hậu tố tăng dần khi trùng', () => {
    expect(uniqueSlug('docker', ['docker'])).toBe('docker-2')
    expect(uniqueSlug('docker', ['docker', 'docker-2'])).toBe('docker-3')
  })

  it('không nhảy cóc khi hậu tố ở giữa còn trống', () => {
    expect(uniqueSlug('docker', ['docker', 'docker-3'])).toBe('docker-2')
  })
})
