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

/**
 * Thứ tự bài học trong một công nghệ: theo `order` do người biên soạn đặt, không theo
 * ngày sửa. Đây là điểm khác biệt quan trọng — danh sách bài trong một công nghệ là
 * một LỘ TRÌNH (bài 1 dẫn vào bài 2), nên nó phải ổn định; sửa chính tả ở bài cuối
 * không được nhảy nó lên đầu. Trùng `order` thì xếp theo tiêu đề cho ổn định.
 */
function byLessonOrder(a: Note, b: Note): number {
  return a.order - b.order || a.title.localeCompare(b.title, 'vi')
}

export async function listAll(): Promise<Note[]> {
  return (await readCollection(FILE, NoteSchema)).sort(byUpdatedDesc)
}

export async function listByTopic(topicId: string): Promise<Note[]> {
  const notes = await readCollection(FILE, NoteSchema)
  return notes.filter((n) => n.topicId === topicId).sort(byLessonOrder)
}

export type NoteNeighbors = { prev: Note | null; next: Note | null; index: number; total: number }

/**
 * Bài liền trước/liền sau trong cùng công nghệ, để trang chi tiết có nút "Bài tiếp theo".
 * Trả về cả vị trí và tổng số bài — trang cần cả hai để hiện "Bài 3/8" mà không phải
 * đọc lại danh sách lần nữa.
 */
export async function findNeighbors(noteId: string): Promise<NoteNeighbors> {
  const note = await findById(noteId)
  if (note === null) return { prev: null, next: null, index: -1, total: 0 }

  const siblings = await listByTopic(note.topicId)
  const index = siblings.findIndex((n) => n.id === noteId)
  return {
    prev: index > 0 ? (siblings[index - 1] ?? null) : null,
    next: index === -1 ? null : (siblings[index + 1] ?? null),
    index,
    total: siblings.length,
  }
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
  const groups = await groupByTopic()
  return new Map(Array.from(groups, ([topicId, notes]) => [topicId, notes.length]))
}

/**
 * Gom bài theo công nghệ, mỗi nhóm đã sắp sẵn theo lộ trình.
 * Trang danh mục cần cả số bài lẫn phân bố cấp độ của từng công nghệ — nếu gọi
 * listByTopic() cho từng công nghệ thì thành N+1 lượt đọc file.
 */
export async function groupByTopic(): Promise<Map<string, Note[]>> {
  const notes = await readCollection(FILE, NoteSchema)
  const groups = new Map<string, Note[]>()
  for (const note of notes) {
    const group = groups.get(note.topicId)
    if (group === undefined) groups.set(note.topicId, [note])
    else group.push(note)
  }
  for (const group of groups.values()) group.sort(byLessonOrder)
  return groups
}

export async function create(input: NoteCreateInput): Promise<Note> {
  const data = NoteCreateSchema.parse(input)
  return mutate(FILE, NoteSchema, (notes) => {
    const taken = notes.map((n) => n.slug)
    const now = new Date().toISOString()
    // Không truyền order thì bài mới xếp cuối lộ trình của công nghệ đó, không phải
    // đầu — người viết thêm bài là đang nối tiếp vào chuỗi đã có.
    const lastOrder = notes
      .filter((n) => n.topicId === data.topicId)
      .reduce((max, n) => Math.max(max, n.order), 0)
    const note: Note = {
      id: nanoid(),
      topicId: data.topicId,
      title: data.title,
      slug: uniqueSlug(data.slug ?? slugify(data.title), taken),
      summary: data.summary,
      content: data.content,
      tags: data.tags,
      order: data.order ?? lastOrder + 1,
      level: data.level,
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
      order: data.order ?? current.order,
      level: data.level ?? current.level,
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
