import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NoteForm } from '@/components/notes/NoteForm'
import * as topicsRepo from '@/lib/db/topics.repo'

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
      <Breadcrumbs items={[{ label: 'Trang chủ', href: '/' }, { label: 'Ghi chú mới' }]} />
      <h1 className="text-2xl font-semibold">Ghi chú mới</h1>
      <NoteForm topics={topics} defaultTopicId={preselected?.id} />
    </div>
  )
}
