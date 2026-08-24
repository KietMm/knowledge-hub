import { describe, expect, it } from 'vitest'
import { FrontmatterError, parseFrontmatter } from '@/lib/frontmatter'

describe('parseFrontmatter', () => {
  it('đọc được chuỗi, số, boolean và mảng', () => {
    const { data } = parseFrontmatter(
      ['---', 'title: Bài học', 'order: 3', 'starred: true', 'tags: [a, b, c]', '---', 'Nội dung'].join('\n'),
    )
    expect(data).toEqual({ title: 'Bài học', order: 3, starred: true, tags: ['a', 'b', 'c'] })
  })

  it('tách được thân bài, đã trim', () => {
    const { body } = parseFrontmatter('---\ntitle: X\n---\n\n# Tiêu đề\n\nĐoạn văn.\n\n')
    expect(body).toBe('# Tiêu đề\n\nĐoạn văn.')
  })

  it('giữ nguyên dấu hai chấm trong giá trị', () => {
    const { data } = parseFrontmatter('---\ntitle: "Vì sao: câu hỏi"\n---\nx')
    expect(data.title).toBe('Vì sao: câu hỏi')
  })

  it('mảng rỗng ra mảng rỗng, không phải chuỗi "[]"', () => {
    const { data } = parseFrontmatter('---\ntags: []\n---\nx')
    expect(data.tags).toEqual([])
  })

  it('không đổi tiền tố số thứ tự thành số', () => {
    // "01" là tiền tố thứ tự, biến thành số 1 sẽ làm mất thông tin định dạng.
    const { data } = parseFrontmatter('---\nma: 01\n---\nx')
    expect(data.ma).toBe('01')
  })

  it('file không có frontmatter vẫn hợp lệ', () => {
    const { data, body } = parseFrontmatter('# Chỉ có nội dung')
    expect(data).toEqual({})
    expect(body).toBe('# Chỉ có nội dung')
  })

  it('chuẩn hoá CRLF để giá trị cuối dòng không dính \\r', () => {
    const { data } = parseFrontmatter('---\r\nslug: abc\r\n---\r\nNội dung\r\n')
    expect(data.slug).toBe('abc')
  })

  it('bỏ qua dòng trống và dòng comment trong khối', () => {
    const { data } = parseFrontmatter('---\n# ghi chú\n\ntitle: X\n---\ny')
    expect(data).toEqual({ title: 'X' })
  })

  it('ném lỗi khi khối không được đóng lại', () => {
    expect(() => parseFrontmatter('---\ntitle: X\nkhông có kết thúc')).toThrow(FrontmatterError)
  })

  it('ném lỗi khi dòng thiếu dấu hai chấm', () => {
    expect(() => parseFrontmatter('---\ntitle X\n---\ny')).toThrow(FrontmatterError)
  })

  it('ném lỗi khi thiếu tên trường', () => {
    expect(() => parseFrontmatter('---\n: giá trị\n---\ny')).toThrow(FrontmatterError)
  })
})
