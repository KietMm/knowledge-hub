import Link from 'next/link'
import { NoteCard } from '@/components/notes/NoteCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCategoryColorClassName } from '@/lib/category-color'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { getIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const [tree, starred, recent, topics] = await Promise.all([
    categoriesRepo.listWithCounts(),
    notesRepo.listStarred(),
    notesRepo.listRecent(8),
    topicsRepo.listAll(),
  ])
  const topicName = new Map(topics.map((t) => [t.id, t.name]))

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold">Sổ tay kiến thức</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhấn <kbd className="rounded border px-1.5 py-0.5 text-xs">⌘K</kbd> để tìm nhanh mọi ghi chú.
        </p>
      </section>

      <section aria-labelledby="mang">
        <h2 id="mang" className="mb-3 text-lg font-medium">Các mảng</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tree.map((category) => {
            const Icon = getIcon(category.icon)
            return (
              <Link key={category.id} href={`/c/${category.slug}`}>
                <Card className="h-full transition-colors hover:border-foreground/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center justify-center rounded-md p-1.5',
                          getCategoryColorClassName(category.color),
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {category.topics.length} công nghệ · {category.noteCount} ghi chú
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {starred.length > 0 && (
        <section aria-labelledby="ghim">
          <h2 id="ghim" className="mb-3 text-lg font-medium">Đã ghim</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {starred.map((note) => (
              <NoteCard key={note.id} note={note} topicName={topicName.get(note.topicId)} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="gan-day">
        <h2 id="gan-day" className="mb-3 text-lg font-medium">Sửa gần đây</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((note) => (
            <NoteCard key={note.id} note={note} topicName={topicName.get(note.topicId)} />
          ))}
        </div>
      </section>
    </div>
  )
}
