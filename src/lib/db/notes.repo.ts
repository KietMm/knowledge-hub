import { nanoid } from 'nanoid'
import { slugify, uniqueSlug } from '@/lib/slug'
import { NotFoundError } from './errors'
import { mutate, readCollection } from './json-store'
import {
  NoteCreateSchema,
  NoteSchema,
  NoteUpdateSchema,
  type Note,
  type NoteCreateInput,
  type NoteUpdateInput,
} from './schema'

/**
 * Tầng repository: nơi duy nhất trong app biết dữ liệu Note nằm ở đâu.
 * API đặt tên theo việc (listByTopic, toggleStar) chứ không theo SQL, để khi đổi
 * sang SQLite chỉ cần viết lại thân hàm, không đổi chữ ký.
 */

const FILE = 'notes.json'

function byUpdatedDesc(a: Note, b: Note): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
}

/** Ghim lên trước, trong cùng nhóm thì mới cập nhật lên trước. */
function byStarredThenUpdated(a: Note, b: Note): number {
  if (a.starred !== b.starred) return a.starred ? -1 : 1
  return byUpdatedDesc(a, b)
}

export async function listAll(): Promise<Note[]> {
  return (await readCollection(FILE, NoteSchema)).sort(byUpdatedDesc)
}

export async function listByTopic(topicId: string): Promise<Note[]> {
  const notes = await readCollection(FILE, NoteSchema)
  return notes.filter((n) => n.topicId === topicId).sort(byStarredThenUpdated)
}

export async function listRecent(limit: number): Promise<Note[]> {
  return (await listAll()).slice(0, limit)
}

export async function listStarred(): Promise<Note[]> {
  return (await listAll()).filter((n) => n.starred)
}

export async function findBySlug(slug: string): Promise<Note | null> {
  const notes = await readCollection(FILE, NoteSchema)
  return notes.find((n) => n.slug === slug) ?? null
}

export async function findById(id: string): Promise<Note | null> {
  const notes = await readCollection(FILE, NoteSchema)
  return notes.find((n) => n.id === id) ?? null
}

export async function countByTopic(): Promise<Map<string, number>> {
  const notes = await readCollection(FILE, NoteSchema)
  const counts = new Map<string, number>()
  for (const note of notes) {
    counts.set(note.topicId, (counts.get(note.topicId) ?? 0) + 1)
  }
  return counts
}

export async function create(input: NoteCreateInput): Promise<Note> {
  const data = NoteCreateSchema.parse(input)
  return mutate(FILE, NoteSchema, (notes) => {
    const taken = notes.map((n) => n.slug)
    const now = new Date().toISOString()
    const note: Note = {
      id: nanoid(),
      topicId: data.topicId,
      title: data.title,
      slug: uniqueSlug(data.slug ?? slugify(data.title), taken),
      summary: data.summary,
      content: data.content,
      tags: data.tags,
      starred: data.starred,
      createdAt: now,
      updatedAt: now,
    }
    return { items: [...notes, note], result: note }
  })
}

export async function update(id: string, patch: NoteUpdateInput): Promise<Note> {
  const data = NoteUpdateSchema.parse(patch)
  return mutate(FILE, NoteSchema, (notes) => {
    const index = notes.findIndex((n) => n.id === id)
    const current = notes[index]
    if (index === -1 || current === undefined) throw new NotFoundError(`ghi chú "${id}"`)

    // Slug chỉ đổi khi người dùng chủ động sửa; đổi tiêu đề không làm chết link cũ.
    const slug =
      data.slug === undefined || data.slug === current.slug
        ? current.slug
        : uniqueSlug(
            data.slug,
            notes.filter((n) => n.id !== id).map((n) => n.slug),
          )

    // Dựng từng trường bằng ?? thay vì spread ...data: nếu người gọi truyền một
    // key có mặt với giá trị undefined (vd { summary: body.summary } khi
    // body.summary vắng mặt), spread sẽ ghi đè dữ liệu cũ thành undefined, và
    // NoteSchema.safeParse() trong mutate() sẽ âm thầm biến nó thành default
    // rỗng ('', [], false) — xoá mất nội dung cũ mà không có lỗi nào báo.
    const updated: Note = {
      id: current.id,
      topicId: data.topicId ?? current.topicId,
      title: data.title ?? current.title,
      slug,
      summary: data.summary ?? current.summary,
      content: data.content ?? current.content,
      tags: data.tags ?? current.tags,
      starred: data.starred ?? current.starred,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    }
    const items = [...notes]
    items[index] = updated
    return { items, result: updated }
  })
}

export async function remove(id: string): Promise<void> {
  return mutate(FILE, NoteSchema, (notes) => {
    if (!notes.some((n) => n.id === id)) throw new NotFoundError(`ghi chú "${id}"`)
    return { items: notes.filter((n) => n.id !== id), result: undefined }
  })
}

export async function toggleStar(id: string): Promise<Note> {
  return mutate(FILE, NoteSchema, (notes) => {
    const index = notes.findIndex((n) => n.id === id)
    const current = notes[index]
    if (index === -1 || current === undefined) throw new NotFoundError(`ghi chú "${id}"`)
    const updated: Note = { ...current, starred: !current.starred, updatedAt: new Date().toISOString() }
    const items = [...notes]
    items[index] = updated
    return { items, result: updated }
  })
}
