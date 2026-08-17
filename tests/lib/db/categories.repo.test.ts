import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as categoriesRepo from '@/lib/db/categories.repo'
import { ConflictError } from '@/lib/db/errors'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-cats-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const base = { name: 'DevOps', description: 'Vận hành', icon: 'Server', color: 'amber', order: 0 }

it('listWithCounts trả cây mảng -> công nghệ kèm số note', async () => {
  const devops = await categoriesRepo.create(base)
  const docker = await topicsRepo.create({
    categoryId: devops.id, name: 'Docker', description: '', order: 0,
  })
  await notesRepo.create({ topicId: docker.id, title: 'Dockerfile', summary: '', content: '' })

  const tree = await categoriesRepo.listWithCounts()
  expect(tree).toHaveLength(1)
  expect(tree[0]?.topics.map((t) => t.name)).toEqual(['Docker'])
  expect(tree[0]?.topics[0]?.noteCount).toBe(1)
  expect(tree[0]?.noteCount).toBe(1)
})

it('sắp xếp theo order', async () => {
  await categoriesRepo.create({ ...base, name: 'Security', order: 2 })
  await categoriesRepo.create({ ...base, name: 'Dev', order: 1 })
  expect((await categoriesRepo.listAll()).map((c) => c.name)).toEqual(['Dev', 'Security'])
})

it('từ chối xoá mảng còn công nghệ', async () => {
  const devops = await categoriesRepo.create(base)
  await topicsRepo.create({ categoryId: devops.id, name: 'Docker', description: '', order: 0 })
  await expect(categoriesRepo.remove(devops.id)).rejects.toBeInstanceOf(ConflictError)
})
