import { Star } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Note } from '@/lib/db/schema'
import { estimateReadingMinutes } from '@/lib/reading-time'
import { LevelBadge } from './LevelBadge'
import { TagBadge } from './TagBadge'

/**
 * Thẻ bài học dùng ở trang chủ (đã ghim / gần đây).
 *
 * Cả thẻ là một link, không chỉ riêng dòng tiêu đề: một khối chữ nhật trông bấm được
 * mà chỉ bấm được ở đúng dòng chữ là loại UI làm người dùng tưởng app bị treo.
 */
export function NoteCard({ note, topicName }: { note: Note; topicName?: string }) {
  return (
    <Link
      href={`/n/${note.slug}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-colors group-hover:border-foreground/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-start gap-2 text-base">
            <span className="min-w-0 flex-1 group-hover:underline">{note.title}</span>
            {note.starred && (
              <Star className="mt-1 h-4 w-4 shrink-0 fill-current" aria-label="Đã ghim" />
            )}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <LevelBadge level={note.level} />
            {topicName !== undefined && <span>{topicName}</span>}
            <span>~{estimateReadingMinutes(note.content)} phút</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="line-clamp-2 text-sm text-muted-foreground">{note.summary}</p>
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
