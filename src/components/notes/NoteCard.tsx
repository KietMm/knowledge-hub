import { Star } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Note } from '@/lib/db/schema'
import { TagBadge } from './TagBadge'

export function NoteCard({ note, topicName }: { note: Note; topicName?: string }) {
  return (
    <Card className="transition-colors hover:border-foreground/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start gap-2 text-base">
          <Link href={`/n/${note.slug}`} className="hover:underline">
            {note.title}
          </Link>
          {note.starred && <Star className="mt-1 h-4 w-4 shrink-0 fill-current" aria-label="Đã ghim" />}
        </CardTitle>
        {topicName !== undefined && (
          <p className="text-xs text-muted-foreground">{topicName}</p>
        )}
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
  )
}
