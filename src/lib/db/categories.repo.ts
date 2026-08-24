import { nanoid } from 'nanoid'
import { slugify, uniqueSlug } from '@/lib/slug'
import { ConflictError, NotFoundError } from './errors'
import { mutate, readCollection } from './json-store'
import { CategoryCreateSchema, CategorySchema, type Category, type CategoryCreateInput } from './schema'
import * as topicsRepo from './topics.repo'
import type { TopicWithCount } from './topics.repo'

const FILE = 'categories.json'

export type CategoryWithTopics = Category & { topics: TopicWithCount[]; noteCount: number }

function byOrder(a: Category, b: Category): number {
  return a.order - b.order || a.name.localeCompare(b.name, 'vi')
}

export async function listAll(): Promise<Category[]> {
  return (await readCollection(FILE, CategorySchema)).sort(byOrder)
}

export async function findBySlug(slug: string): Promise<Category | null> {
  return (await readCollection(FILE, CategorySchema)).find((c) => c.slug === slug) ?? null
}

export async function findById(id: string): Promise<Category | null> {
  return (await readCollection(FILE, CategorySchema)).find((c) => c.id === id) ?? null
}

/** Nguồn dữ liệu duy nhất cho sidebar: cả cây trong đúng ba lần đọc file. */
export async function listWithCounts(): Promise<CategoryWithTopics[]> {
  const [categories, topics] = await Promise.all([listAll(), topicsRepo.listWithCounts()])
  return categories.map((category) => {
    const own = topics.filter((t) => t.categoryId === category.id)
    return {
      ...category,
      topics: own,
      noteCount: own.reduce((sum, t) => sum + t.noteCount, 0),
    }
  })
}

export async function create(input: CategoryCreateInput): Promise<Category> {
  const data = CategoryCreateSchema.parse(input)
  return mutate(FILE, CategorySchema, (categories) => {
    const category: Category = {
      id: nanoid(),
      name: data.name,
      slug: uniqueSlug(data.slug ?? slugify(data.name), categories.map((c) => c.slug)),
      description: data.description,
      icon: data.icon,
      color: data.color,
      order: data.order,
    }
    return { items: [...categories, category], result: category }
  })
}

export async function update(id: string, patch: Partial<CategoryCreateInput>): Promise<Category> {
  const data = CategoryCreateSchema.partial().parse(patch)
  return mutate(FILE, CategorySchema, (categories) => {
    const index = categories.findIndex((c) => c.id === id)
    const current = categories[index]
    if (index === -1 || current === undefined) throw new NotFoundError(`mảng "${id}"`)

    const slug =
      data.slug === undefined || data.slug === current.slug
        ? current.slug
        : uniqueSlug(data.slug, categories.filter((c) => c.id !== id).map((c) => c.slug))

    // Theo từng trường, không spread `...data` — xem ghi chú ở notes.repo.update().
    const updated: Category = {
      ...current,
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      icon: data.icon ?? current.icon,
      color: data.color ?? current.color,
      order: data.order ?? current.order,
      slug,
    }
    const items = [...categories]
    items[index] = updated
    return { items, result: updated }
  })
}

export async function remove(id: string): Promise<void> {
  const topics = await topicsRepo.listByCategory(id)
  if (topics.length > 0) {
    throw new ConflictError(
      `Không xoá được: mảng này còn ${topics.length} công nghệ. Hãy xoá hoặc chuyển chúng trước.`,
    )
  }
  return mutate(FILE, CategorySchema, (categories) => {
    if (!categories.some((c) => c.id === id)) throw new NotFoundError(`mảng "${id}"`)
    return { items: categories.filter((c) => c.id !== id), result: undefined }
  })
}
