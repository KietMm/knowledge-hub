import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NoteForm } from '@/components/notes/NoteForm'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ note: string }>
}): Promise<Metadata> {
  const { note: slug } = await params
  const note = await notesRepo.findBySlug(slug)
  if (note === null) notFound()
  return { title: `Sửa: ${note.title} — Knowledge Hub` }
}

export default async function EditNotePage({ params }: { params: Promise<{ note: string }> }) {
  const { note: slug } = await params
  const note = await notesRepo.findBySlug(slug)
  if (note === null) notFound()

  const topics = await topicsRepo.listAll()

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Sửa bài học</h1>
      <NoteForm topics={topics} note={note} />
    </div>
  )
}
