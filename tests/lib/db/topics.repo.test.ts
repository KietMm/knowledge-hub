import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
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

it('update sửa một trường, các trường khác giữ nguyên kể cả khi patch có key undefined', async () => {
  const topic = await topicsRepo.create(base)
  // Mô phỏng đúng tình huống đã gây mất dữ liệu ở Task 5: key "description" CÓ MẶT
  // trong patch nhưng giá trị là undefined (như khi body.description không được gửi
  // lên nhưng object vẫn có key đó). Nếu update() dùng spread ...data, description
  // cũ ('Container') sẽ bị ghi đè thành undefined rồi zod default() biến nó thành ''.
  const updated = await topicsRepo.update(topic.id, { name: 'Docker mới', description: undefined })
  expect(updated.name).toBe('Docker mới')
  expect(updated.description).toBe('Container')
  expect(updated.categoryId).toBe('c1')
  expect(updated.order).toBe(0)
})

it('update ghi được giá trị falsy hợp lệ: description rỗng và order 0', async () => {
  const topic = await topicsRepo.create({ ...base, description: 'Container', order: 5 })
  // Nếu update() dùng `data.description || current.description` hoặc
  // `data.order || current.order` thay vì `??`, '' và 0 sẽ bị coi là falsy và
  // âm thầm rơi về giá trị cũ ('Container', 5) thay vì giá trị mới hợp lệ.
  const updated = await topicsRepo.update(topic.id, { description: '', order: 0 })
  expect(updated.description).toBe('')
  expect(updated.order).toBe(0)
})
