'use client'

import { useState } from 'react'
import type { CaTest, NgonNgu } from '@/lib/exercise/parse'
import { ExerciseRunner } from './ExerciseRunner'
import { LoiGiaiCode } from './LoiGiaiCode'

/**
 * Khu làm bài: ô soạn + kết quả chấm bên trái, panel code lời giải bên phải.
 *
 * Component này tồn tại để giữ hai mẩu trạng thái mà cả hai bên đều cần:
 *
 *  1. **Ngôn ngữ đang chọn.** Đổi ô soạn sang Python thì lời giải phải đổi theo — nếu mỗi
 *     bên giữ trạng thái riêng, người học gõ Python mà đối chiếu với lời giải JavaScript.
 *  2. **Đã xem lời giải chưa.** Một lần bấm mở cả panel lẫn phần phân tích cuối trang. Hai
 *     cổng riêng thì người học phải bấm hai lần cho cùng một quyết định.
 *
 * Chia cột chỉ từ `xl`: dưới mức đó, hai cột 26rem + ô soạn không đủ chỗ và cả hai cùng
 * chật. Hẹp hơn thì panel xếp xuống dưới ô soạn, vẫn không phải cuộn qua phần phân tích.
 */
export function KhuLamBai({
  slug,
  ham,
  hamPy,
  starter,
  boTest,
  soSanh,
  maLoiGiai,
  phanTichHtml,
}: {
  slug: string
  ham: string
  hamPy: string
  starter: Record<NgonNgu, string>
  boTest: CaTest[]
  soSanh: 'chinh-xac' | 'tap-hop'
  /** Code lời giải đã tô màu ở server, theo từng ngôn ngữ. */
  maLoiGiai: Partial<Record<NgonNgu, string>>
  /** Toàn bộ phần lời giải dạng markdown đã render — phân tích, bảng, độ phức tạp. */
  phanTichHtml: string | null
}) {
  const [ngonNgu, setNgonNgu] = useState<NgonNgu>('js')
  const [daXem, setDaXem] = useState(false)

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
        <ExerciseRunner
          slug={slug}
          ham={ham}
          hamPy={hamPy}
          starter={starter}
          boTest={boTest}
          soSanh={soSanh}
          ngonNgu={ngonNgu}
          doiNgonNgu={setNgonNgu}
        />

        <LoiGiaiCode
          ma={maLoiGiai}
          ngonNgu={ngonNgu}
          doiNgonNgu={setNgonNgu}
          daXem={daXem}
          moXem={() => setDaXem(true)}
        />
      </div>

      {phanTichHtml !== null && daXem && (
        <section className="max-w-[78ch] space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Lời giải đầy đủ</h2>
          <div
            className="note-content prose prose-neutral max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: phanTichHtml }}
          />
        </section>
      )}
    </div>
  )
}
