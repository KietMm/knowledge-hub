import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as topicsRepo from '@/lib/db/topics.repo'

// Next 15: params là Promise, phải await.
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params
  const category = await categoriesRepo.findBySlug(slug)
  if (category === null) notFound()

  const topics = (await topicsRepo.listWithCounts()).filter((t) => t.categoryId === category.id)

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Trang chủ', href: '/' }, { label: category.name }]} />
      <div>
        <h1 className="text-2xl font-semibold">{category.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
      </div>

      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Mảng này chưa có công nghệ nào.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link key={topic.id} href={`/t/${topic.slug}`}>
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{topic.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{topic.noteCount} ghi chú</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
