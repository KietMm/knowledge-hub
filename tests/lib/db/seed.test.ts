import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import { SEED_CATEGORIES, SEED_NOTES, SEED_TOPICS } from '@/lib/db/seed-data'
import { seedIfEmpty } from '@/lib/db/seed'
import * as topicsRepo from '@/lib/db/topics.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-seed-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

describe('tính toàn vẹn của dữ liệu seed', () => {
  it('mọi topic trỏ tới category có thật', () => {
    const ids = new Set(SEED_CATEGORIES.map((c) => c.id))
    for (const topic of SEED_TOPICS) expect(ids.has(topic.categoryId)).toBe(true)
  })

  it('mọi note trỏ tới topic có thật', () => {
    const ids = new Set(SEED_TOPICS.map((t) => t.id))
    for (const note of SEED_NOTES) expect(ids.has(note.topicId)).toBe(true)
  })

  it('slug không trùng trong từng loại', () => {
    for (const list of [SEED_CATEGORIES, SEED_TOPICS, SEED_NOTES]) {
      const slugs = list.map((x) => x.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })

  it('id không trùng trong từng loại', () => {
    for (const list of [SEED_CATEGORIES, SEED_TOPICS, SEED_NOTES]) {
      const ids = list.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('mỗi ghi chú có tóm tắt, tag, nội dung thật và ít nhất một code block', () => {
    for (const note of SEED_NOTES) {
      expect(note.summary.length, `thiếu tóm tắt: ${note.slug}`).toBeGreaterThan(20)
      expect(note.tags.length, `thiếu tag: ${note.slug}`).toBeGreaterThan(0)
      expect(note.content.length, `nội dung quá ngắn: ${note.slug}`).toBeGreaterThan(400)
      expect(note.content, `thiếu code mẫu: ${note.slug}`).toContain('```')
    }
  })

  it('có đủ 26 ghi chú trải khắp 8 công nghệ', () => {
    expect(SEED_NOTES).toHaveLength(26)
    const topicIds = new Set(SEED_NOTES.map((n) => n.topicId))
    expect(topicIds.size).toBe(SEED_TOPICS.length)
  })
})

describe('seedIfEmpty', () => {
  it('nạp dữ liệu khi data còn rỗng', async () => {
    expect(await seedIfEmpty()).toEqual({ seeded: true })
    expect(await categoriesRepo.listAll()).toHaveLength(SEED_CATEGORIES.length)
    expect(await topicsRepo.listAll()).toHaveLength(SEED_TOPICS.length)
    expect(await notesRepo.listAll()).toHaveLength(SEED_NOTES.length)
  })

  it('không ghi đè khi đã có dữ liệu', async () => {
    await notesRepo.create({ topicId: 't1', title: 'Ghi chú của tôi', summary: '', content: '' })
    expect(await seedIfEmpty()).toEqual({ seeded: false })
    const notes = await notesRepo.listAll()
    expect(notes).toHaveLength(1)
    expect(notes[0]?.title).toBe('Ghi chú của tôi')
  })
})
