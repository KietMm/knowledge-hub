import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import * as notesRepo from '@/lib/db/notes.repo'
import { buildSearchIndex } from '@/lib/db/search-index'
import * as topicsRepo from '@/lib/db/topics.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-index-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

it('gắn tên công nghệ vào từng mục của chỉ mục', async () => {
  const topic = await topicsRepo.create({ categoryId: 'c1', name: 'Docker', description: '', order: 0 })
  await notesRepo.create({ topicId: topic.id, title: 'Dockerfile', summary: 'Tóm tắt', content: 'nội dung' })

  const index = await buildSearchIndex()
  expect(index).toHaveLength(1)
  expect(index[0]).toMatchObject({ title: 'Dockerfile', topicName: 'Docker', topicSlug: 'docker' })
})

it('ghi chú mồ côi (topic đã mất) vẫn vào chỉ mục với tên công nghệ rỗng', async () => {
  await notesRepo.create({ topicId: 'khong-ton-tai', title: 'Lạc', summary: '', content: '' })
  const index = await buildSearchIndex()
  expect(index[0]?.topicName).toBe('')
})
