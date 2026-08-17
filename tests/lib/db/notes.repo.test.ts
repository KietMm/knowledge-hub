import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '@/lib/db/errors'
import * as notesRepo from '@/lib/db/notes.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-notes-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const base = { topicId: 't1', title: 'Bất đồng bộ', summary: 'Tóm tắt', content: '# Nội dung' }

describe('create', () => {
  it('sinh id, slug, timestamp', async () => {
    const note = await notesRepo.create(base)
    expect(note.id).not.toBe('')
    expect(note.slug).toBe('bat-dong-bo')
    expect(note.createdAt).toBe(note.updatedAt)
    expect(Date.parse(note.createdAt)).not.toBeNaN()
    expect(note.tags).toEqual([])
    expect(note.starred).toBe(false)
  })

  it('slug trùng thì thêm hậu tố', async () => {
    await notesRepo.create(base)
    const second = await notesRepo.create(base)
    expect(second.slug).toBe('bat-dong-bo-2')
  })

  it('tôn trọng slug người dùng nhập tay', async () => {
    const note = await notesRepo.create({ ...base, slug: 'async-await' })
    expect(note.slug).toBe('async-await')
  })
})

describe('đọc', () => {
  it('findBySlug trả note, không thấy thì trả null', async () => {
    const created = await notesRepo.create(base)
    expect(await notesRepo.findBySlug(created.slug)).toMatchObject({ id: created.id })
    expect(await notesRepo.findBySlug('khong-ton-tai')).toBeNull()
  })

  it('listByTopic chỉ lấy note của topic đó và đưa note ghim lên đầu', async () => {
    const a = await notesRepo.create({ ...base, title: 'A' })
    await notesRepo.create({ ...base, title: 'B' })
    await notesRepo.create({ ...base, topicId: 't2', title: 'C' })
    await notesRepo.toggleStar(a.id)

    const list = await notesRepo.listByTopic('t1')
    expect(list.map((n) => n.title)).toEqual(['A', 'B'])
    expect(list[0]?.starred).toBe(true)
  })

  it('countByTopic đếm đúng theo topic', async () => {
    await notesRepo.create(base)
    await notesRepo.create(base)
    await notesRepo.create({ ...base, topicId: 't2' })
    const counts = await notesRepo.countByTopic()
    expect(counts.get('t1')).toBe(2)
    expect(counts.get('t2')).toBe(1)
    expect(counts.get('t3')).toBeUndefined()
  })
})

describe('update', () => {
  it('đổi nội dung và cập nhật updatedAt, giữ nguyên slug và createdAt', async () => {
    const note = await notesRepo.create(base)
    const updated = await notesRepo.update(note.id, { title: 'Tiêu đề mới' })
    expect(updated.title).toBe('Tiêu đề mới')
    expect(updated.slug).toBe(note.slug)
    expect(updated.createdAt).toBe(note.createdAt)
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(note.updatedAt))
  })

  it('đổi slug thủ công thì vẫn đảm bảo không trùng', async () => {
    await notesRepo.create({ ...base, slug: 'a' })
    const second = await notesRepo.create({ ...base, slug: 'b' })
    const updated = await notesRepo.update(second.id, { slug: 'a' })
    expect(updated.slug).toBe('a-2')
  })

  it('id không tồn tại thì throw NotFoundError', async () => {
    await expect(notesRepo.update('khong-co', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('patch có key hiện diện nhưng giá trị undefined thì KHÔNG xoá dữ liệu cũ', async () => {
    const note = await notesRepo.create({ ...base, tags: ['js', 'async'] })
    const starred = await notesRepo.toggleStar(note.id)
    expect(starred.starred).toBe(true)

    const updated = await notesRepo.update(note.id, {
      title: 'Tiêu đề mới',
      summary: undefined,
      tags: undefined,
    })

    expect(updated.title).toBe('Tiêu đề mới')
    expect(updated.summary).toBe(note.summary)
    expect(updated.tags).toEqual(['js', 'async'])
    expect(updated.starred).toBe(true)
  })
})

describe('remove và toggleStar', () => {
  it('remove xoá đúng note', async () => {
    const note = await notesRepo.create(base)
    await notesRepo.remove(note.id)
    expect(await notesRepo.listAll()).toEqual([])
  })

  it('remove id không tồn tại thì throw NotFoundError', async () => {
    await expect(notesRepo.remove('khong-co')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('toggleStar bật rồi tắt', async () => {
    const note = await notesRepo.create(base)
    expect((await notesRepo.toggleStar(note.id)).starred).toBe(true)
    expect((await notesRepo.toggleStar(note.id)).starred).toBe(false)
  })
})
