import { Dumbbell } from 'lucide-react'
import Link from 'next/link'
import { DoKhoBadge } from '@/components/exercise/DoKhoBadge'
import type { Exercise } from '@/lib/db/schema'

/**
 * Danh sách bài tập luyện cho một bài học, hiện ở cuối bài.
 *
 * Liên kết này là chiều NGƯỢC: file bài tập khai `bai_hoc`, bài học không khai gì cả.
 * Nhờ vậy thêm một bài tập mới chỉ phải sửa một file, và không bao giờ có chuyện bài học
 * trỏ tới bài tập đã bị xoá.
 */
export function BaiTapLienQuan({ baiTap }: { baiTap: Exercise[] }) {
  if (baiTap.length === 0) return null

  return (
    <section className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Dumbbell className="size-4" />
        Luyện tập phần này
      </h2>
      <ul className="space-y-1">
        {baiTap.map((bt) => (
          <li key={bt.id}>
            <Link
              href={`/bt/${bt.slug}`}
              className="flex flex-wrap items-center gap-2 text-sm underline-offset-4 hover:underline"
            >
              {bt.title}
              <DoKhoBadge doKho={bt.doKho} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
