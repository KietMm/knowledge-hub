import type { Metadata } from 'next'
import { KhoBaiTap } from '@/components/exercise/KhoBaiTap'
import * as exercisesRepo from '@/lib/db/exercises.repo'

export const metadata: Metadata = {
  title: 'Bài tập — Knowledge Hub',
  description: 'Bài tập thuật toán, chấm bài ngay trong trình duyệt bằng JavaScript hoặc Python.',
}

export default async function ExercisesPage() {
  const baiTap = await exercisesRepo.listAll()

  return (
    <div className="mx-auto max-w-[78ch] space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Bài tập</h1>
        <p className="text-muted-foreground">
          Viết code ngay trong trình duyệt bằng JavaScript hoặc Python, chấm tự động. Không
          có gì gửi lên máy chủ — bài làm và tiến độ nằm trong máy bạn.
        </p>
      </header>

      {baiTap.length === 0 ? (
        <p className="text-muted-foreground">Chưa có bài tập nào.</p>
      ) : (
        <KhoBaiTap baiTap={baiTap} />
      )}
    </div>
  )
}
