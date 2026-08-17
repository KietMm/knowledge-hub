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
