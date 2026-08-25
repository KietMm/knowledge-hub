import { Dumbbell } from 'lucide-react'
import Link from 'next/link'
import { LevelBar } from '@/components/notes/LevelBar'
import { NoteCard } from '@/components/notes/NoteCard'
import { getCategoryColorClassName } from '@/lib/category-color'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as exercisesRepo from '@/lib/db/exercises.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { getIcon } from '@/lib/icons'
import { estimateReadingMinutes, formatReadingDuration } from '@/lib/reading-time'
import { cn } from '@/lib/utils'

/**
 * Trang chủ là **bản đồ giáo trình**, không phải bảng tin.
 *
 * Với hơn tám mươi bài, bốn thẻ mảng rồi tới danh sách bài mới nhất không trả lời được
 * câu hỏi đầu tiên của người mở app: "có những gì ở đây và nên bắt đầu từ đâu". Vì vậy
 * toàn bộ cây mảng → công nghệ được hiện ngay, kèm số bài và phân bố cấp độ; bài mới
 * nhất xuống dưới cùng vì đó là thông tin phụ.
 */
export default async function DashboardPage() {
  const [tree, starred, recent, topics, notesByTopic, baiTap] = await Promise.all([
    categoriesRepo.listWithCounts(),
    notesRepo.listStarred(),
    notesRepo.listRecent(6),
    topicsRepo.listAll(),
    notesRepo.groupByTopic(),
    exercisesRepo.listAll(),
  ])
  const topicName = new Map(topics.map((t) => [t.id, t.name]))

  const tongBai = tree.reduce((sum, c) => sum + c.noteCount, 0)
  const tongCongNghe = tree.reduce((sum, c) => sum + c.topics.length, 0)
  const tongPhut = Array.from(notesByTopic.values())
    .flat()
    .reduce((sum, note) => sum + estimateReadingMinutes(note.content), 0)

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Sổ tay kiến thức</h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Giáo trình tra cứu cho công việc hằng ngày: mỗi công nghệ là một lộ trình bài học
            xếp từ cơ bản tới nâng cao.
          </p>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <ThongKe nhan="Mảng" giaTri={String(tree.length)} />
          <ThongKe nhan="Công nghệ" giaTri={String(tongCongNghe)} />
          <ThongKe nhan="Bài học" giaTri={String(tongBai)} />
          <ThongKe nhan="Thời lượng" giaTri={`~${formatReadingDuration(tongPhut)} đọc`} />
          {baiTap.length > 0 && <ThongKe nhan="Bài tập" giaTri={String(baiTap.length)} />}
        </dl>

        {baiTap.length > 0 && (
          <Link
            href="/bt"
            className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-accent/40"
          >
            <Dumbbell className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <span className="space-y-1">
              <span className="block font-medium">Luyện tập</span>
              <span className="block text-sm text-muted-foreground">
                {baiTap.length} bài thuật toán, viết code ngay trong trình duyệt bằng
                JavaScript hoặc Python và chấm tự động.
              </span>
            </span>
          </Link>
        )}

        <p className="text-sm text-muted-foreground">
          Nhấn{' '}
          <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> để tìm nhanh
          trong toàn bộ nội dung.
        </p>
      </section>

      {starred.length > 0 && (
        <section aria-labelledby="ghim">
          <h2 id="ghim" className="mb-4 text-lg font-medium">
            Đã ghim
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {starred.map((note) => (
              <NoteCard key={note.id} note={note} topicName={topicName.get(note.topicId)} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="giao-trinh" className="space-y-8">
        <h2 id="giao-trinh" className="text-lg font-medium">
          Toàn bộ giáo trình
        </h2>

        {tree.map((category) => {
          const Icon = getIcon(category.icon)
          return (
            <div key={category.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded-md p-1.5',
                    getCategoryColorClassName(category.color),
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <Link
                  href={`/c/${category.slug}`}
                  className="-mx-2 inline-flex min-h-9 items-center rounded px-2 font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {category.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {category.topics.length} công nghệ · {category.noteCount} bài
                </span>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {category.topics.map((topic) => {
                  const notes = notesByTopic.get(topic.id) ?? []
                  const dauTien = notes[0]
                  return (
                    <li key={topic.id}>
                      <Link
                        href={`/t/${topic.slug}`}
                        className="group flex h-full flex-col gap-2 rounded-lg border p-4 outline-none transition-colors hover:border-foreground/30 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium group-hover:underline">{topic.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {topic.noteCount} bài
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {topic.description}
                        </p>
                        {/* Tên bài đầu tiên là câu trả lời cụ thể cho "bắt đầu từ đâu" —
                            cụ thể hơn hẳn một con số đếm bài. */}
                        {dauTien !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Bắt đầu: {dauTien.title}
                          </p>
                        )}
                        <div className="mt-auto pt-1">
                          <LevelBar notes={notes} />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="gan-day">
          <h2 id="gan-day" className="mb-4 text-lg font-medium">
            Bài mới nhất
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((note) => (
              <NoteCard key={note.id} note={note} topicName={topicName.get(note.topicId)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ThongKe({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{nhan}</dt>
      <dd className="text-lg font-semibold tabular-nums">{giaTri}</dd>
    </div>
  )
}
