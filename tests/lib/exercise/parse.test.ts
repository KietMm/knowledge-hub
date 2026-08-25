import { describe, expect, it } from 'vitest'
import { BaiTapError, tachBaiTap } from '@/lib/exercise/parse'

const NGUON = [
  'Cho mảng `nums` và số `target`.',
  '',
  '```js starter',
  'function haiTong(nums, target) {}',
  '```',
  '',
  '```py starter',
  'def hai_tong(nums, target):',
  '    pass',
  '```',
  '',
  '```json test',
  '[{ "vao": [[2, 7, 11, 15], 9], "ra": [0, 1] }]',
  '```',
  '',
  '## Lời giải',
  '',
  'Dùng bảng băm.',
  '',
  '```js',
  'const seen = new Map()',
  '```',
].join('\n')

describe('tachBaiTap', () => {
  it('tách đề bài, starter mỗi ngôn ngữ, bộ test và lời giải', () => {
    const bt = tachBaiTap(NGUON)
    expect(bt.deBai).toBe('Cho mảng `nums` và số `target`.')
    expect(bt.starter.js).toBe('function haiTong(nums, target) {}')
    expect(bt.starter.py).toBe('def hai_tong(nums, target):\n    pass')
    expect(bt.boTest).toEqual([{ vao: [[2, 7, 11, 15], 9], ra: [0, 1] }])
    expect(bt.loiGiai).toContain('Dùng bảng băm.')
  })

  it('khối code trong phần lời giải giữ nguyên để render markdown bình thường', () => {
    // Lời giải là markdown, không phải dữ liệu — nó đi qua renderMarkdown như mọi bài học.
    expect(tachBaiTap(NGUON).loiGiai).toContain('```js\nconst seen = new Map()\n```')
  })

  it('khối starter và test bị lấy ra khỏi đề bài, không hiện hai lần', () => {
    const bt = tachBaiTap(NGUON)
    expect(bt.deBai).not.toContain('starter')
    expect(bt.deBai).not.toContain('"vao"')
  })

  it('thiếu bộ test là lỗi — bài tập không chấm được thì vô nghĩa', () => {
    expect(() => tachBaiTap('Đề bài\n\n```js starter\nfunction f() {}\n```')).toThrow(BaiTapError)
  })

  it('thiếu starter js là lỗi', () => {
    expect(() => tachBaiTap('Đề\n\n```json test\n[{"vao":[1],"ra":1}]\n```')).toThrow(BaiTapError)
  })

  it('bộ test rỗng là lỗi', () => {
    const src = 'Đề\n\n```js starter\nf()\n```\n\n```json test\n[]\n```'
    expect(() => tachBaiTap(src)).toThrow(/rỗng/)
  })

  it('bộ test sai JSON báo lỗi kèm nguyên văn', () => {
    const src = 'Đề\n\n```js starter\nf()\n```\n\n```json test\n[{vao:1}]\n```'
    expect(() => tachBaiTap(src)).toThrow(/JSON/)
  })

  it('mỗi ca test phải có "vao" là mảng đối số', () => {
    const src = 'Đề\n\n```js starter\nf()\n```\n\n```json test\n[{"ra": 1}]\n```'
    expect(() => tachBaiTap(src)).toThrow(/vao/)
  })

  it('không có phần lời giải thì loiGiai rỗng, không phải lỗi', () => {
    const src = 'Đề\n\n```js starter\nf()\n```\n\n```json test\n[{"vao":[1],"ra":1}]\n```'
    expect(tachBaiTap(src).loiGiai).toBe('')
  })

  it('dấu ``` bên trong khối code không cắt nhầm khối', () => {
    const src = [
      'Đề',
      '',
      '```js starter',
      'const s = "```"',
      '```',
      '',
      '```json test',
      '[{"vao":[1],"ra":1}]',
      '```',
    ].join('\n')
    expect(tachBaiTap(src).starter.js).toBe('const s = "```"')
  })
})
