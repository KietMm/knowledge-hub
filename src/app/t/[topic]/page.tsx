import { Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NoteCard } from '@/components/notes/NoteCard'
import { buttonVariants } from '@/components/ui/button'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { collectTagCounts, filterByTag } from '@/lib/tags'
import { cn } from '@/lib/utils'

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>
  searchParams: Promise<{ tag?: string }>
}) {
  const { topic: slug } = await params
  const { tag: tagParam } = await searchParams
  const topic = await topicsRepo.findBySlug(slug)
  if (topic === null) notFound()

  const [category, allNotes] = await Promise.all([
    categoriesRepo.findById(topic.categoryId),
    notesRepo.listByTopic(topic.id),
  ])

  // Tag rác trên URL không phải lỗi trang: không notFound(), chỉ lọc ra rỗng rồi hiện
  // trạng thái rỗng có hướng dẫn bên dưới.
  const selectedTag = tagParam ?? null
  const tagCounts = collectTagCounts(allNotes)
  const notes = filterByTag(allNotes, selectedTag)

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Trang chủ', href: '/' },
          ...(category === null ? [] : [{ label: category.name, href: `/c/${category.slug}` }]),
          { label: topic.name },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{topic.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
        </div>
        <Link href={`/n/new?topic=${topic.slug}`} className={buttonVariants()}>
          <Plus className="mr-1 h-4 w-4" />
          Thêm ghi chú
        </Link>
      </div>

      {tagCounts.length > 0 && (
        <nav aria-label="Lọc ghi chú theo tag" className="flex flex-wrap gap-2">
          <Link
            href={`/t/${topic.slug}`}
            aria-current={selectedTag === null ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              selectedTag === null
                ? 'border-foreground bg-foreground text-background'
                : 'hover:bg-accent',
            )}
          >
            Tất cả ({allNotes.length})
          </Link>
          {tagCounts.map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/t/${topic.slug}?tag=${encodeURIComponent(tag)}`}
              aria-current={selectedTag === tag ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                selectedTag === tag
                  ? 'border-foreground bg-foreground text-background'
                  : 'hover:bg-accent',
              )}
            >
              {tag} ({count})
            </Link>
          ))}
        </nav>
      )}

      {notes.length === 0 ? (
        selectedTag !== null ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Không có ghi chú nào mang tag &quot;{selectedTag}&quot;.
            </p>
            <Link href={`/t/${topic.slug}`} className={buttonVariants({ variant: 'link' })}>
              Bỏ lọc, xem tất cả ghi chú
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">Chưa có ghi chú nào trong {topic.name}.</p>
            <Link href={`/n/new?topic=${topic.slug}`} className={buttonVariants({ variant: 'link' })}>
              Viết ghi chú đầu tiên
            </Link>
          </div>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}
