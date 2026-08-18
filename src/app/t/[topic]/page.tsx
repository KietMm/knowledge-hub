import { Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NoteCard } from '@/components/notes/NoteCard'
import { Button } from '@/components/ui/button'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params
  const topic = await topicsRepo.findBySlug(slug)
  if (topic === null) notFound()

  const [category, notes] = await Promise.all([
    categoriesRepo.findById(topic.categoryId),
    notesRepo.listByTopic(topic.id),
  ])

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
        <Button render={<Link href={`/n/new?topic=${topic.slug}`} />}>
          <Plus className="mr-1 h-4 w-4" />
          Thêm ghi chú
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Chưa có ghi chú nào trong {topic.name}.</p>
          <Button variant="link" render={<Link href={`/n/new?topic=${topic.slug}`} />}>
            Viết ghi chú đầu tiên
          </Button>
        </div>
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
