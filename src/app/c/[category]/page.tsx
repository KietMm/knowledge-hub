import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LevelBar } from '@/components/notes/LevelBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

/** Xem chú thích ở t/[topic]/page.tsx: đây là chỗ duy nhất đặt được mã 404. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category: slug } = await params
  const category = await categoriesRepo.findBySlug(slug)
  if (category === null) notFound()
  return { title: `${category.name} — Knowledge Hub`, description: category.description }
}

// Next 15: params là Promise, phải await.
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params
  const category = await categoriesRepo.findBySlug(slug)
  if (category === null) notFound()

  // groupByTopic() đọc file MỘT lần cho mọi công nghệ — gọi listByTopic() trong vòng lặp
  // sẽ thành N+1 lượt đọc.
  const [allTopics, notesByTopic] = await Promise.all([
    topicsRepo.listWithCounts(),
    notesRepo.groupByTopic(),
  ])
  const topics = allTopics.filter((t) => t.categoryId === category.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{category.name}</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">{category.description}</p>
      </div>

      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Mảng này chưa có công nghệ nào.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => {
            const notes = notesByTopic.get(topic.id) ?? []
            return (
              <Link
                key={topic.id}
                href={`/t/${topic.slug}`}
                className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-colors group-hover:border-foreground/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base group-hover:underline">{topic.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{topic.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {notes.length === 0 ? 'Chưa có bài học' : `${notes.length} bài học`}
                    </p>
                    <LevelBar notes={notes} />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
