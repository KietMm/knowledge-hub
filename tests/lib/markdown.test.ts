import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/lib/markdown'

describe('renderMarkdown', () => {
  it('render heading và đoạn văn', async () => {
    const { html } = await renderMarkdown('## Cài đặt\n\nNội dung.')
    expect(html).toContain('<h2')
    expect(html).toContain('Nội dung.')
  })

  it('trích TOC cho heading cấp 2 và 3, bỏ qua cấp 4', async () => {
    const { toc } = await renderMarkdown('## Một\n\n### Hai\n\n#### Ba')
    expect(toc.map((t) => [t.depth, t.text])).toEqual([
      [2, 'Một'],
      [3, 'Hai'],
    ])
  })

  it('id trong TOC khớp với id trong HTML (để anchor nhảy đúng)', async () => {
    const { html, toc } = await renderMarkdown('## Bất đồng bộ trong JS')
    expect(toc).toHaveLength(1)
    expect(html).toContain(`id="${toc[0]?.id}"`)
  })

  it('trùng tiêu đề heading thì id vẫn duy nhất', async () => {
    const { toc } = await renderMarkdown('## Ví dụ\n\n## Ví dụ')
    expect(toc[0]?.id).not.toBe(toc[1]?.id)
  })

  it('code block được highlight và gắn data-lang', async () => {
    const { html } = await renderMarkdown('```ts\nconst a: number = 1\n```')
    expect(html).toContain('data-lang="ts"')
    expect(html).toContain('shiki')
    expect(html).toContain('<span')
  })

  it('hỗ trợ bảng của GFM', async () => {
    const { html } = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
  })

  it('markdown rỗng trả html rỗng và toc rỗng', async () => {
    const { html, toc } = await renderMarkdown('')
    expect(html.trim()).toBe('')
    expect(toc).toEqual([])
  })
})

describe('liên kết chéo [[slug]]', () => {
  const titles = new Map([
    ['sql-injection', { tieuDe: 'SQL Injection', url: '/n/sql-injection' }],
    ['index-va-hieu-nang', { tieuDe: 'Index và hiệu năng truy vấn', url: '/n/index-va-hieu-nang' }],
    // Bài tập cũng là đích hợp lệ, và nó nằm ở tiền tố url khác.
    ['hai-tong', { tieuDe: 'Hai tổng', url: '/bt/hai-tong' }],
  ])

  it('thành link mang tiêu đề của bài đích, không phải slug', async () => {
    const { html } = await renderMarkdown('Xem [[sql-injection]] để biết thêm.', titles)
    expect(html).toContain('href="/n/sql-injection"')
    expect(html).toContain('SQL Injection')
    expect(html).not.toContain('[[')
  })

  it('giữ nguyên nguyên văn khi slug không tra được', async () => {
    const { html } = await renderMarkdown('Xem [[khong-ton-tai]].', titles)
    expect(html).toContain('[[khong-ton-tai]]')
    expect(html).not.toContain('href="/n/khong-ton-tai"')
  })

  it('xử lý được nhiều liên kết trong cùng một câu', async () => {
    const { html } = await renderMarkdown('[[sql-injection]] và [[index-va-hieu-nang]].', titles)
    expect(html).toContain('href="/n/sql-injection"')
    expect(html).toContain('href="/n/index-va-hieu-nang"')
  })

  it('giữ nguyên phần chữ hai bên liên kết', async () => {
    const { html } = await renderMarkdown('Trước [[sql-injection]] sau.', titles)
    expect(html).toContain('Trước ')
    expect(html).toContain(' sau.')
  })

  it('không tạo link lồng nhau khi [[...]] nằm trong một link sẵn có', async () => {
    const { html } = await renderMarkdown('[[[sql-injection]]](/khac)', titles)
    expect(html).not.toContain('<a href="/n/sql-injection"><a')
  })

  it('trỏ được sang bài tập, đúng tiền tố /bt', async () => {
    const { html } = await renderMarkdown('Luyện ở [[hai-tong]].', titles)
    expect(html).toContain('href="/bt/hai-tong"')
    expect(html).toContain('Hai tổng')
  })

  it('không truyền bảng tiêu đề thì để nguyên văn', async () => {
    const { html } = await renderMarkdown('Xem [[sql-injection]].')
    expect(html).toContain('[[sql-injection]]')
  })
})
