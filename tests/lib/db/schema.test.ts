import { describe, expect, it } from 'vitest'
import { NoteSchema, NoteCreateSchema, SlugSchema } from '@/lib/db/schema'

const validNote = {
  id: 'n1',
  topicId: 't1',
  title: 'async/await',
  slug: 'async-await',
  summary: 'Cách JS xử lý bất đồng bộ.',
  content: '# Nội dung',
  tags: ['javascript'],
  starred: false,
  createdAt: '2026-08-17T08:00:00.000Z',
  updatedAt: '2026-08-17T08:00:00.000Z',
}

describe('SlugSchema', () => {
  it('nhận slug kebab-case', () => {
    expect(SlugSchema.safeParse('async-await-2').success).toBe(true)
  })

  it('từ chối slug có hoa, dấu cách hoặc dấu tiếng Việt', () => {
    for (const bad of ['Async', 'async await', 'bất-đồng-bộ', '-a', 'a-']) {
      expect(SlugSchema.safeParse(bad).success).toBe(false)
    }
  })
})

describe('NoteSchema', () => {
  it('nhận note hợp lệ', () => {
    expect(NoteSchema.parse(validNote)).toEqual(validNote)
  })

  it('từ chối timestamp không phải ISO', () => {
    const r = NoteSchema.safeParse({ ...validNote, createdAt: '17/08/2026' })
    expect(r.success).toBe(false)
  })

  it('từ chối tiêu đề rỗng', () => {
    expect(NoteSchema.safeParse({ ...validNote, title: '' }).success).toBe(false)
  })
})

describe('NoteCreateSchema', () => {
  it('không cần id/timestamp, tự mặc định tags và starred', () => {
    const parsed = NoteCreateSchema.parse({
      topicId: 't1',
      title: 'Generic',
      summary: 'Tóm tắt',
      content: 'nội dung',
    })
    expect(parsed.tags).toEqual([])
    expect(parsed.starred).toBe(false)
    expect(parsed.slug).toBeUndefined()
  })

  it('cắt khoảng trắng đầu/cuối tiêu đề', () => {
    expect(NoteCreateSchema.parse({
      topicId: 't1', title: '  Generic  ', summary: 's', content: 'c',
    }).title).toBe('Generic')
  })
})
