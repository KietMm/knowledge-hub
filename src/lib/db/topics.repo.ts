import { nanoid } from 'nanoid'
import { slugify, uniqueSlug } from '@/lib/slug'
import { ConflictError, NotFoundError } from './errors'
import { mutate, readCollection } from './json-store'
import * as notesRepo from './notes.repo'
import { TopicCreateSchema, TopicSchema, type Topic, type TopicCreateInput } from './schema'

const FILE = 'topics.json'

export type TopicWithCount = Topic & { noteCount: number }

function byOrder(a: Topic, b: Topic): number {
  return a.order - b.order || a.name.localeCompare(b.name, 'vi')
}

export async function listAll(): Promise<Topic[]> {
  return (await readCollection(FILE, TopicSchema)).sort(byOrder)
}

export async function listByCategory(categoryId: string): Promise<Topic[]> {
  return (await listAll()).filter((t) => t.categoryId === categoryId)
}

export async function findBySlug(slug: string): Promise<Topic | null> {
  return (await readCollection(FILE, TopicSchema)).find((t) => t.slug === slug) ?? null
}

export async function findById(id: string): Promise<Topic | null> {
  return (await readCollection(FILE, TopicSchema)).find((t) => t.id === id) ?? null
}

/**
 * Sidebar cần số note của mọi topic trong một lần gọi — nếu để component tự đếm
 * từng topic thì thành N+1 lượt đọc file.
 */
export async function listWithCounts(): Promise<TopicWithCount[]> {
  const [topics, counts] = await Promise.all([listAll(), notesRepo.countByTopic()])
  return topics.map((topic) => ({ ...topic, noteCount: counts.get(topic.id) ?? 0 }))
}

export async function create(input: TopicCreateInput): Promise<Topic> {
  const data = TopicCreateSchema.parse(input)
  return mutate(FILE, TopicSchema, (topics) => {
    const topic: Topic = {
      id: nanoid(),
      categoryId: data.categoryId,
      name: data.name,
      slug: uniqueSlug(data.slug ?? slugify(data.name), topics.map((t) => t.slug)),
      description: data.description,
      order: data.order,
    }
    return { items: [...topics, topic], result: topic }
  })
}

export async function update(id: string, patch: Partial<TopicCreateInput>): Promise<Topic> {
  const data = TopicCreateSchema.partial().parse(patch)
  return mutate(FILE, TopicSchema, (topics) => {
    const index = topics.findIndex((t) => t.id === id)
    const current = topics[index]
    if (index === -1 || current === undefined) throw new NotFoundError(`công nghệ "${id}"`)

    const slug =
      data.slug === undefined || data.slug === current.slug
        ? current.slug
        : uniqueSlug(data.slug, topics.filter((t) => t.id !== id).map((t) => t.slug))

    // Theo từng trường, không spread `...data` — xem ghi chú ở notes.repo.update().
    const updated: Topic = {
      ...current,
      categoryId: data.categoryId ?? current.categoryId,
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      order: data.order ?? current.order,
      slug,
    }
    const items = [...topics]
    items[index] = updated
    return { items, result: updated }
  })
}

/** Không cascade: còn ghi chú bên trong thì từ chối, để người dùng tự quyết định. */
export async function remove(id: string): Promise<void> {
  const counts = await notesRepo.countByTopic()
  const noteCount = counts.get(id) ?? 0
  if (noteCount > 0) {
    throw new ConflictError(
      `Không xoá được: công nghệ này còn ${noteCount} ghi chú. Hãy chuyển hoặc xoá các ghi chú trước.`,
    )
  }
  return mutate(FILE, TopicSchema, (topics) => {
    if (!topics.some((t) => t.id === id)) throw new NotFoundError(`công nghệ "${id}"`)
    return { items: topics.filter((t) => t.id !== id), result: undefined }
  })
}
