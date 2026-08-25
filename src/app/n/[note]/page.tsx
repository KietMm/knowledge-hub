import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BaiTapLienQuan } from '@/components/exercise/BaiTapLienQuan'
import { PrevNextNav } from '@/components/layout/PrevNextNav'
import { LevelBadge } from '@/components/notes/LevelBadge'
import { NoteActions } from '@/components/notes/NoteActions'
import { NoteContent } from '@/components/notes/NoteContent'
import { ReadingProgress } from '@/components/notes/ReadingProgress'
import { TagBadge } from '@/components/notes/TagBadge'
import { Toc } from '@/components/notes/Toc'
import { TocMobile } from '@/components/notes/TocMobile'
import * as exercisesRepo from '@/lib/db/exercises.repo'
import { buildDichLink } from '@/lib/db/link-index'
import { laReadOnly } from '@/lib/db/mode'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { renderMarkdown } from '@/lib/markdown'
import { estimateReadingMinutes } from '@/lib/reading-time'

/** Xem chú thích ở t/[topic]/page.tsx: đây là chỗ duy nhất đặt được mã 404. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ note: string }>
}): Promise<Metadata> {
  const { note: slug } = await params
  const note = await notesRepo.findBySlug(slug)
  if (note === null) notFound()
  return { title: `${note.title} — Knowledge Hub`, description: note.summary }
}

export default async function NotePage({ params }: { params: Promise<{ note: string }> }) {
  const { note: slug } = await params
  const note = await notesRepo.findBySlug(slug)
  if (note === null) notFound()

  // Bảng slug → đích để `[[slug]]` trong bài thành link mang đúng tiêu đề bài đích.
  const [topic, neighbors, dich, baiTap] = await Promise.all([
    topicsRepo.findById(note.topicId),
    notesRepo.findNeighbors(note.id),
    buildDichLink(),
    exercisesRepo.listByBaiHoc(note.slug),
  ])
  const { html, toc } = await renderMarkdown(note.content, dich)

  return (
    <>
      <ReadingProgress />
      {/* 78ch: vẫn trong khoảng dễ đọc cho văn xuôi, nhưng rộng hơn 72ch đủ để phần
          lớn dòng code trong bài không bị cắt phải cuộn ngang. */}
      <div className="flex gap-10 xl:gap-12">
        <article className="min-w-0 max-w-[78ch] flex-1 space-y-6">

          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge level={note.level} />
              {neighbors.index >= 0 && neighbors.total > 0 && (
                <span className="font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                  Bài {neighbors.index + 1}/{neighbors.total}
                  {topic === null ? '' : ` · ${topic.name}`}
                </span>
              )}
              {/* Cụm hành động nằm ở hàng này và canh phải, không nằm dưới phần tóm tắt:
                  đây là thao tác quản trị, để nó trong luồng đọc là chen ngang người đọc.
                  Chỉ đọc (bản công khai): ẩn hẳn thay vì để nút bấm được mà luôn thất bại. */}
              {!laReadOnly() && (
                <div className="ml-auto">
                  <NoteActions
                    noteId={note.id}
                    slug={note.slug}
                    title={note.title}
                    starred={note.starred}
                  />
                </div>
              )}
            </div>

            <h1 className="font-heading text-3xl font-semibold tracking-tight">{note.title}</h1>
            <p className="text-muted-foreground">{note.summary}</p>

            <div className="flex flex-wrap items-center gap-2">
              {note.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
              {/* `toLocaleDateString('vi-VN')` cho ra "1/1/2026": vừa trông như chỗ giữ
                  chỗ chưa điền, vừa không nói được đâu là ngày đâu là tháng với người
                  quen định dạng Mỹ. Viết tháng bằng chữ thì không còn đọc nhầm được. */}
              <span className="font-mono text-[0.7rem] text-muted-foreground">
                ~{estimateReadingMinutes(note.content)} phút đọc · cập nhật{' '}
                {new Date(note.updatedAt).toLocaleDateString('vi-VN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

          </header>

          <TocMobile entries={toc} />

        <NoteContent html={html} />

          <BaiTapLienQuan baiTap={baiTap} />

          <PrevNextNav
            prev={neighbors.prev}
            next={neighbors.next}
            index={neighbors.index}
            total={neighbors.total}
            tienTo="/n"
            nhanAria="Điều hướng bài học"
          />
        </article>

        <Toc entries={toc} />
      </div>
    </>
  )
}
