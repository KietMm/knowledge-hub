import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NoteForm } from '@/components/notes/NoteForm'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

export default async function EditNotePage({ params }: { params: Promise<{ note: string }> }) {
  const { note: slug } = await params
  const note = await notesRepo.findBySlug(slug)
  if (note === null) notFound()

  const topics = await topicsRepo.listAll()

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: note.title, href: `/n/${note.slug}` },
          { label: 'Sửa' },
        ]}
      />
      <h1 className="text-2xl font-semibold">Sửa ghi chú</h1>
      <NoteForm topics={topics} note={note} />
    </div>
  )
}
