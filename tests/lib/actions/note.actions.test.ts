import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// Server Action gọi revalidatePath — hàm này cần request context của Next,
// nên trong unit test ta thay bằng hàm rỗng.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { createNoteAction, deleteNoteAction, toggleStarAction, updateNoteAction } = await import(
  '@/lib/actions/note.actions'
)
const notesRepo = await import('@/lib/db/notes.repo')

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kh-actions-'))
  process.env.KH_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.KH_DATA_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const valid = { topicId: 't1', title: 'Ghi chú mới', summary: 'Tóm tắt', content: 'Nội dung', tags: [] }

it('tạo thành công trả về slug', async () => {
  const result = await createNoteAction(valid)
  expect(result).toEqual({ ok: true, data: { slug: 'ghi-chu-moi' } })
})

it('thiếu tiêu đề thì trả fieldErrors, không throw và không tạo bản ghi', async () => {
  const result = await createNoteAction({ ...valid, title: '' })
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.fieldErrors?.title?.[0]).toBeTruthy()
  expect(await notesRepo.listAll()).toHaveLength(0)
})

it('sửa ghi chú không tồn tại trả lỗi có chữ "Không tìm thấy"', async () => {
  const result = await updateNoteAction('khong-co', valid)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toMatch(/Không tìm thấy/)
})

it('xoá trả về slug công nghệ để điều hướng về', async () => {
  const topicsRepo = await import('@/lib/db/topics.repo')
  const topic = await topicsRepo.create({ categoryId: 'c1', name: 'Docker', description: '', order: 0 })
  const note = await notesRepo.create({ ...valid, topicId: topic.id })

  const result = await deleteNoteAction(note.id)
  expect(result).toEqual({ ok: true, data: { topicSlug: 'docker' } })
  expect(await notesRepo.listAll()).toHaveLength(0)
})

it('toggleStar trả trạng thái mới', async () => {
  const note = await notesRepo.create(valid)
  expect(await toggleStarAction(note.id)).toEqual({ ok: true, data: { starred: true } })
})
