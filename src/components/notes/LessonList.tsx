import { Star } from 'lucide-react'
import Link from 'next/link'
import type { Note } from '@/lib/db/schema'
import { estimateReadingMinutes } from '@/lib/reading-time'
import { LevelBadge } from './LevelBadge'
import { TagBadge } from './TagBadge'

/** Bài học kèm vị trí THẬT của nó trong lộ trình của công nghệ. */
export type Lesson = { note: Note; position: number }

/**
 * Danh sách bài học của một công nghệ, dạng **hàng có số thứ tự** thay vì lưới thẻ.
 *
 * Lưới ba cột đọc theo hàng ngang nên bài 1-2-3 nằm cạnh nhau rồi 4-5-6 xuống dòng —
 * mắt không còn thấy đây là một chuỗi phải học tuần tự. Một cột dọc có số thứ tự thì
 * thứ tự là thứ đầu tiên người ta nhìn thấy.
 *
 * `position` do phía gọi truyền vào, không lấy từ chỉ số của mảng: khi danh sách đang bị
 * lọc theo tag, đánh số lại từ 1 sẽ nói sai vị trí của bài trong lộ trình.
 */
export function LessonList({ lessons }: { lessons: Lesson[] }) {
  return (
    <ol className="divide-y rounded-lg border">
      {lessons.map(({ note, position }) => (
        <li key={note.id}>
          <Link
            href={`/n/${note.slug}`}
            className="flex items-start gap-4 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span className="mt-0.5 w-7 shrink-0 font-mono text-sm font-medium tabular-nums text-muted-foreground">
              {position}
            </span>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{note.title}</span>
                {note.starred && (
                  <Star className="h-3.5 w-3.5 shrink-0 fill-current" aria-label="Đã ghim" />
                )}
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{note.summary}</p>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {note.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <LevelBadge level={note.level} />
              <span className="font-mono text-[0.7rem] text-muted-foreground">
                ~{estimateReadingMinutes(note.content)} phút
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  )
}
