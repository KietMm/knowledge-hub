import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
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

it('update sửa một trường, các trường khác giữ nguyên kể cả khi patch có key undefined', async () => {
  const devops = await categoriesRepo.create(base)
  // Mô phỏng đúng tình huống đã gây mất dữ liệu ở Task 5: key "description" CÓ MẶT
  // trong patch nhưng giá trị là undefined. Nếu update() dùng spread ...data,
  // description cũ ('Vận hành') sẽ bị ghi đè thành undefined rồi zod default() biến
  // nó thành ''.
  const updated = await categoriesRepo.update(devops.id, { name: 'DevOps mới', description: undefined })
  expect(updated.name).toBe('DevOps mới')
  expect(updated.description).toBe('Vận hành')
  expect(updated.icon).toBe('Server')
  expect(updated.color).toBe('amber')
  expect(updated.order).toBe(0)
})

it('update ghi được giá trị falsy hợp lệ: description rỗng và order 0', async () => {
  const devops = await categoriesRepo.create({ ...base, description: 'Vận hành', order: 5 })
  // Nếu update() dùng `data.description || current.description` hoặc
  // `data.order || current.order` thay vì `??`, '' và 0 sẽ bị coi là falsy và
  // âm thầm rơi về giá trị cũ ('Vận hành', 5) thay vì giá trị mới hợp lệ.
  const updated = await categoriesRepo.update(devops.id, { description: '', order: 0 })
  expect(updated.description).toBe('')
  expect(updated.order).toBe(0)
})
