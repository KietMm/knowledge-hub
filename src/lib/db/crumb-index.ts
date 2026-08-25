import type { CrumbIndex } from '@/components/layout/HeaderBreadcrumbs'
import * as categoriesRepo from './categories.repo'
import * as exercisesRepo from './exercises.repo'
import * as notesRepo from './notes.repo'
import * as topicsRepo from './topics.repo'

/**
 * Bản đồ nhãn cho breadcrumb ở Topbar. Cố tình CHỈ chứa nhãn và quan hệ cha-con —
 * không có `content` hay `summary`, nên nó nhỏ dù giáo trình có bao nhiêu bài.
 */
export async function buildCrumbIndex(): Promise<CrumbIndex> {
  const [categories, topics, notes, exercises] = await Promise.all([
    categoriesRepo.listAll(),
    topicsRepo.listAll(),
    notesRepo.listAll(),
    exercisesRepo.listAll(),
  ])

  const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]))
  const topicSlugById = new Map(topics.map((t) => [t.id, t.slug]))

  return {
    categories: Object.fromEntries(categories.map((c) => [c.slug, c.name])),
    topics: Object.fromEntries(
      topics.map((t) => [
        t.slug,
        { name: t.name, categorySlug: categorySlugById.get(t.categoryId) ?? '' },
      ]),
    ),
    notes: Object.fromEntries(
      notes.map((n) => [
        n.slug,
        { title: n.title, topicSlug: topicSlugById.get(n.topicId) ?? '' },
      ]),
    ),
    exercises: Object.fromEntries(exercises.map((bt) => [bt.slug, bt.title])),
  }
}
