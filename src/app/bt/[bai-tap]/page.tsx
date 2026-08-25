import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DoKhoBadge } from '@/components/exercise/DoKhoBadge'
import { PrevNextNav } from '@/components/layout/PrevNextNav'
import { KhuLamBai } from '@/components/exercise/KhuLamBai'
import { NoteContent } from '@/components/notes/NoteContent'
import * as exercisesRepo from '@/lib/db/exercises.repo'
import { buildDichLink } from '@/lib/db/link-index'
import type { NgonNgu } from '@/lib/exercise/parse'
import { renderMarkdown } from '@/lib/markdown'
import { nhanTag } from '@/lib/tag-label'

type Params = Promise<{ 'bai-tap': string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { 'bai-tap': slug } = await params
  const bt = await exercisesRepo.findBySlug(slug)
  if (bt === null) notFound()
  return { title: `${bt.title} — Bài tập`, description: `Bài tập thuật toán: ${bt.title}` }
}

/**
 * Tô màu code lời giải bằng chính pipeline markdown của app (shiki chạy ở server), thay vì
 * gửi code thô xuống rồi tô ở client: bộ highlighter nặng ~1MB, và trang này vốn đã mang
 * theo CodeMirror rồi.
 */
async function toMa(ma: string, lang: string): Promise<string | undefined> {
  if (ma.trim() === '') return undefined
  const { html } = await renderMarkdown(`\`\`\`${lang}\n${ma}\n\`\`\``)
  return html
}

export default async function ExercisePage({ params }: { params: Params }) {
  const { 'bai-tap': slug } = await params
  const bt = await exercisesRepo.findBySlug(slug)
  if (bt === null) notFound()

  const [dich, hangXom] = await Promise.all([buildDichLink(), exercisesRepo.findNeighbors(slug)])
  const [de, loiGiai, maJs, maPy] = await Promise.all([
    renderMarkdown(bt.deBai, dich),
    bt.loiGiai === '' ? Promise.resolve(null) : renderMarkdown(bt.loiGiai, dich),
    toMa(bt.maLoiGiai.js, 'js'),
    toMa(bt.maLoiGiai.py, 'py'),
  ])
  const baiHoc = bt.baiHoc === undefined ? null : (dich.get(bt.baiHoc)?.tieuDe ?? null)

  const maLoiGiai: Partial<Record<NgonNgu, string>> = {
    ...(maJs === undefined ? {} : { js: maJs }),
    ...(maPy === undefined ? {} : { py: maPy }),
  }

  return (
    // Văn xuôi giữ 78ch cho dễ đọc; riêng khu làm bài được rộng hết khung để chứa hai cột.
    <article className="mx-auto w-full max-w-[78ch] space-y-6 xl:max-w-none">
      <header className="max-w-[78ch] space-y-3">
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

      <div className="max-w-[78ch]">
        <NoteContent html={de.html} />
      </div>

      <KhuLamBai
        slug={bt.slug}
        ham={bt.ham}
        hamPy={bt.hamPy}
        starter={bt.starter}
        boTest={bt.boTest}
        soSanh={bt.soSanh}
        maLoiGiai={maLoiGiai}
        phanTichHtml={loiGiai?.html ?? null}
      />

      <div className="max-w-[78ch]">
        <PrevNextNav
          prev={hangXom.prev}
          next={hangXom.next}
          index={hangXom.index}
          total={hangXom.total}
          tienTo="/bt"
          nhanAria="Điều hướng bài tập"
        />
      </div>
    </article>
  )
}
