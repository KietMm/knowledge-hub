import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NoteContent } from '@/components/notes/NoteContent'
import { TagBadge } from '@/components/notes/TagBadge'
import { Toc } from '@/components/notes/Toc'
import { buttonVariants } from '@/components/ui/button'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { renderMarkdown } from '@/lib/markdown'

export default async function NotePage({ params }: { params: Promise<{ note: string }> }) {
  const { note: slug } = await params
  const note = await notesRepo.findBySlug(slug)
  if (note === null) notFound()

  const topic = await topicsRepo.findById(note.topicId)
  const category = topic === null ? null : await categoriesRepo.findById(topic.categoryId)
  const { html, toc } = await renderMarkdown(note.content)

  return (
    <div className="flex gap-10">
      <article className="min-w-0 max-w-[72ch] flex-1 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Trang chủ', href: '/' },
            ...(category === null ? [] : [{ label: category.name, href: `/c/${category.slug}` }]),
            ...(topic === null ? [] : [{ label: topic.name, href: `/t/${topic.slug}` }]),
            { label: note.title },
          ]}
        />

        <header className="space-y-3">
          <h1 className="text-3xl font-semibold">{note.title}</h1>
          <p className="text-muted-foreground">{note.summary}</p>
          <div className="flex flex-wrap items-center gap-2">
            {note.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
            <span className="text-xs text-muted-foreground">
              Cập nhật {new Date(note.updatedAt).toLocaleDateString('vi-VN')}
            </span>
          </div>
          {/* Nút ghim, Sửa, Xoá được lắp ở Task 14 khi đã có Server Actions. */}
          <Link
            href={`/n/${note.slug}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Sửa
          </Link>
        </header>

        <NoteContent html={html} />
      </article>

      <Toc entries={toc} />
    </div>
  )
}
