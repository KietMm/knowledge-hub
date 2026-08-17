import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '@/lib/db/errors'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-topics-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const base = { categoryId: 'c1', name: 'Docker', description: 'Container', order: 0 }

it('create sinh id và slug không dấu', async () => {
  const topic = await topicsRepo.create({ ...base, name: 'Bảo mật ứng dụng' })
  expect(topic.slug).toBe('bao-mat-ung-dung')
  expect(topic.id).not.toBe('')
})

it('listByCategory lọc đúng và sắp theo order', async () => {
  await topicsRepo.create({ ...base, name: 'B', order: 2 })
  await topicsRepo.create({ ...base, name: 'A', order: 1 })
  await topicsRepo.create({ ...base, categoryId: 'c2', name: 'C', order: 0 })
  expect((await topicsRepo.listByCategory('c1')).map((t) => t.name)).toEqual(['A', 'B'])
})

it('listWithCounts đếm số note của từng topic', async () => {
  const docker = await topicsRepo.create(base)
  const sql = await topicsRepo.create({ ...base, name: 'SQL', order: 1 })
  await notesRepo.create({ topicId: docker.id, title: 'Dockerfile', summary: '', content: '' })
  await notesRepo.create({ topicId: docker.id, title: 'Volume', summary: '', content: '' })

  const list = await topicsRepo.listWithCounts()
  expect(list.find((t) => t.id === docker.id)?.noteCount).toBe(2)
  expect(list.find((t) => t.id === sql.id)?.noteCount).toBe(0)
})

it('từ chối xoá topic còn note, và nêu số note còn lại', async () => {
  const topic = await topicsRepo.create(base)
  await notesRepo.create({ topicId: topic.id, title: 'Dockerfile', summary: '', content: '' })

  const promise = topicsRepo.remove(topic.id)
  await expect(promise).rejects.toBeInstanceOf(ConflictError)
  await expect(promise).rejects.toThrow(/1 ghi chú/)
  expect(await topicsRepo.findById(topic.id)).not.toBeNull()
})

it('xoá được topic rỗng', async () => {
  const topic = await topicsRepo.create(base)
  await topicsRepo.remove(topic.id)
  expect(await topicsRepo.findById(topic.id)).toBeNull()
})

it('remove id không tồn tại thì throw NotFoundError', async () => {
  await expect(topicsRepo.remove('khong-co')).rejects.toBeInstanceOf(NotFoundError)
})
