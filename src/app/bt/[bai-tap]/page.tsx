import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExerciseRunner } from '@/components/exercise/ExerciseRunner'
import { LoiGiai } from '@/components/exercise/LoiGiai'
import { DoKhoBadge } from '@/components/exercise/DoKhoBadge'
import { NoteContent } from '@/components/notes/NoteContent'
import * as exercisesRepo from '@/lib/db/exercises.repo'
import { nhanTag } from '@/lib/tag-label'
import * as notesRepo from '@/lib/db/notes.repo'
import { renderMarkdown } from '@/lib/markdown'

type Params = Promise<{ 'bai-tap': string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { 'bai-tap': slug } = await params
  const bt = await exercisesRepo.findBySlug(slug)
  if (bt === null) notFound()
  return { title: `${bt.title} — Bài tập`, description: `Bài tập thuật toán: ${bt.title}` }
}

export default async function ExercisePage({ params }: { params: Params }) {
  const { 'bai-tap': slug } = await params
  const bt = await exercisesRepo.findBySlug(slug)
  if (bt === null) notFound()

  const allNotes = await notesRepo.listAll()
  const titles = new Map(allNotes.map((n) => [n.slug, n.title]))
  const [de, loiGiai] = await Promise.all([
    renderMarkdown(bt.deBai, titles),
    bt.loiGiai === '' ? Promise.resolve(null) : renderMarkdown(bt.loiGiai, titles),
  ])
  const baiHoc = bt.baiHoc === undefined ? null : (titles.get(bt.baiHoc) ?? null)

  return (
    <article className="mx-auto max-w-[78ch] space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <DoKhoBadge doKho={bt.doKho} />
          <span className="font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            {bt.chuDe.map(nhanTag).join(' · ')}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{bt.title}</h1>
        {baiHoc !== null && bt.baiHoc !== undefined && (
          <p className="text-sm text-muted-foreground">
            Lý thuyết ở bài{' '}
            <Link href={`/n/${bt.baiHoc}`} className="underline underline-offset-4">
              {baiHoc}
            </Link>
          </p>
        )}
      </header>

      <NoteContent html={de.html} />

      <ExerciseRunner
        slug={bt.slug}
        ham={bt.ham}
        starter={bt.starter}
        boTest={bt.boTest}
        soSanh={bt.soSanh}
      />

      {loiGiai !== null && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Lời giải</h2>
          <LoiGiai html={loiGiai.html} />
        </section>
      )}
    </article>
  )
}
