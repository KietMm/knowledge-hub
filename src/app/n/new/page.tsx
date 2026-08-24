import type { Metadata } from 'next'
import { NoteForm } from '@/components/notes/NoteForm'
import * as topicsRepo from '@/lib/db/topics.repo'

export const metadata: Metadata = { title: 'Bài học mới — Knowledge Hub' }

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>
}) {
  const { topic: topicSlug } = await searchParams
  const topics = await topicsRepo.listAll()
  const preselected = topicSlug === undefined ? null : await topicsRepo.findBySlug(topicSlug)

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Bài học mới</h1>
      <NoteForm topics={topics} defaultTopicId={preselected?.id} />
    </div>
  )
}
