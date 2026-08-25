import type { Metadata } from 'next'
import Link from 'next/link'
import { DoKhoBadge } from '@/components/exercise/DoKhoBadge'
import * as exercisesRepo from '@/lib/db/exercises.repo'
import { nhanTag } from '@/lib/tag-label'

export const metadata: Metadata = {
  title: 'Bài tập — Knowledge Hub',
  description: 'Bài tập thuật toán, chấm bài ngay trong trình duyệt.',
}

export default async function ExercisesPage() {
  const baiTap = await exercisesRepo.listAll()

  return (
    <div className="mx-auto max-w-[78ch] space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Bài tập</h1>
        <p className="text-muted-foreground">
          Viết code ngay trong trình duyệt và chấm tự động. Không có gì gửi lên máy chủ —
          bài làm của bạn nằm trong máy bạn.
        </p>
      </header>

      {baiTap.length === 0 ? (
        <p className="text-muted-foreground">Chưa có bài tập nào.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {baiTap.map((bt) => (
            <li key={bt.id}>
              <Link
                href={`/bt/${bt.slug}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <span className="font-medium">{bt.title}</span>
                <DoKhoBadge doKho={bt.doKho} />
                <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground">
                  {bt.chuDe.map(nhanTag).join(' · ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
