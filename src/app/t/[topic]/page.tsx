import type { Metadata } from 'next'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LessonList } from '@/components/notes/LessonList'
import { LevelBar } from '@/components/notes/LevelBar'
import { buttonVariants } from '@/components/ui/button'
import { laReadOnly } from '@/lib/db/mode'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { estimateReadingMinutes, formatReadingDuration } from '@/lib/reading-time'
import { collectTagCounts, filterByTag, usefulTags } from '@/lib/tags'
import { nhanTag } from '@/lib/tag-label'
import { cn } from '@/lib/utils'

/**
 * notFound() phải gọi từ đây, KHÔNG chỉ trong page.
 *
 * `app/loading.tsx` tạo một Suspense boundary, nên Next gửi phần vỏ trang đi ngay và
 * mã trạng thái đã chốt trước khi thân trang chạy — notFound() lúc đó chỉ đổi được nội
 * dung hiển thị, còn response vẫn là 200. generateMetadata() chạy TRƯỚC khi stream bắt
 * đầu, nên đây là chỗ duy nhất còn đặt được 404.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>
}): Promise<Metadata> {
  const { topic: slug } = await params
  const topic = await topicsRepo.findBySlug(slug)
  if (topic === null) notFound()
  return { title: `${topic.name} — Knowledge Hub`, description: topic.description }
}

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

  // Không cần đọc mảng nữa: breadcrumb đã chuyển lên Topbar và tự tra bản đồ ở đó.
  const allNotes = await notesRepo.listByTopic(topic.id)

  // Tag rác trên URL không phải lỗi trang: không notFound(), chỉ lọc ra rỗng rồi hiện
  // trạng thái rỗng có hướng dẫn bên dưới.
  const selectedTag = tagParam ?? null
  const tagCounts = usefulTags(collectTagCounts(allNotes), selectedTag)
  const notes = filterByTag(allNotes, selectedTag)

  // Vị trí trong lộ trình được chốt trên danh sách ĐẦY ĐỦ trước khi lọc, nên bài số 5
  // vẫn hiện là 5 khi đang xem riêng một tag.
  const positionOf = new Map(allNotes.map((note, index) => [note.id, index + 1]))
  const lessons = notes.map((note) => ({ note, position: positionOf.get(note.id) ?? 0 }))

  // Tổng thời gian tính trên TOÀN lộ trình, không theo tag đang lọc: đây là thông tin
  // về công nghệ ("học hết mất bao lâu"), không phải về kết quả lọc hiện tại.
  const totalMinutes = allNotes.reduce((sum, note) => sum + estimateReadingMinutes(note.content), 0)

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold">{topic.name}</h1>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">{topic.description}</p>
          </div>
          {allNotes.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                {allNotes.length} bài · khoảng {formatReadingDuration(totalMinutes)} đọc
              </p>
              <LevelBar notes={allNotes} />
            </>
          )}
        </div>
        {!laReadOnly() && (
          <Link href={`/n/new?topic=${topic.slug}`} className={buttonVariants()}>
          <Plus className="mr-1 h-4 w-4" />
          Thêm bài học
          </Link>
        )}
      </div>

      {tagCounts.length > 0 && (
        <nav aria-label="Lọc bài học theo tag" className="flex flex-wrap gap-2">
          <Link
            href={`/t/${topic.slug}`}
            aria-current={selectedTag === null ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-8 items-center rounded-full border px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
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
                'inline-flex min-h-8 items-center rounded-full border px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                selectedTag === tag
                  ? 'border-foreground bg-foreground text-background'
                  : 'hover:bg-accent',
              )}
            >
              {nhanTag(tag)} ({count})
            </Link>
          ))}
        </nav>
      )}

      {notes.length === 0 ? (
        selectedTag !== null ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Không có bài học nào mang tag &quot;{selectedTag}&quot;.
            </p>
            <Link href={`/t/${topic.slug}`} className={buttonVariants({ variant: 'link' })}>
              Bỏ lọc, xem cả lộ trình
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">Chưa có bài học nào trong {topic.name}.</p>
            <Link href={`/n/new?topic=${topic.slug}`} className={buttonVariants({ variant: 'link' })}>
              Viết bài đầu tiên
            </Link>
          </div>
        )
      ) : (
        <LessonList lessons={lessons} />
      )}
    </div>
  )
}
