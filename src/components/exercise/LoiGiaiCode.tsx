'use client'

import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NgonNgu } from '@/lib/exercise/parse'
import { cn } from '@/lib/utils'

/**
 * Panel code lời giải, đứng cạnh ô soạn.
 *
 * Chỉ chứa CODE, không chứa phân tích: thứ người học cần liếc trong lúc đang gõ là code
 * đối chiếu với code, còn phần giải thích độ phức tạp và các chỗ dễ sai là bài đọc liền
 * mạch — nó ở lại phía dưới trang.
 *
 * Hệ quả có ý thức: code lời giải xuất hiện hai chỗ trên cùng một trang. Cách tránh trùng
 * là gỡ khối code khỏi phần phân tích, nhưng khi đó những câu dẫn kiểu "cùng ý tưởng bằng
 * Python…" thành mồ côi. Trùng vài chục dòng rẻ hơn nhiều so với việc đó.
 *
 * html đã được shiki tô ở server từ chính file bài tập trong repo — client không tải
 * highlighter, và không có nguồn nội dung bên thứ ba nào ở đây.
 */

const TEN: Record<NgonNgu, string> = { js: 'JavaScript', py: 'Python' }

export function LoiGiaiCode({
  ma,
  ngonNgu,
  doiNgonNgu,
  daXem,
  moXem,
}: {
  ma: Partial<Record<NgonNgu, string>>
  ngonNgu: NgonNgu
  doiNgonNgu: (nn: NgonNgu) => void
  daXem: boolean
  moXem: () => void
}) {
  const coSan = (['js', 'py'] as const).filter((nn) => (ma[nn] ?? '') !== '')
  if (coSan.length === 0) return null

  // Ngôn ngữ đang gõ chưa có lời giải (bài chưa viết bản Python) thì rơi về cái có.
  const hienThi = coSan.includes(ngonNgu) ? ngonNgu : (coSan[0] as NgonNgu)

  if (!daXem) {
    return (
      <aside className="rounded-xl border border-dashed border-border p-4 xl:sticky xl:top-20">
        <p className="mb-3 text-sm text-muted-foreground">
          Thử tự giải trước đã — lời giải sẽ có ích hơn nhiều sau khi bạn đã bí.
        </p>
        <Button variant="outline" size="sm" onClick={moXem}>
          <Eye />
          Xem lời giải
        </Button>
      </aside>
    )
  }

  return (
    <aside className="space-y-2 xl:sticky xl:top-20">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium">Lời giải</h2>
        {coSan.length > 1 && (
          <div
            role="tablist"
            aria-label="Ngôn ngữ lời giải"
            className="ml-auto flex overflow-hidden rounded-md border border-border"
          >
            {coSan.map((nn) => (
              <button
                key={nn}
                role="tab"
                aria-selected={hienThi === nn}
                onClick={() => doiNgonNgu(nn)}
                className={cn(
                  'px-2.5 py-0.5 font-mono text-[0.7rem] transition-colors',
                  hienThi === nn
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50',
                )}
              >
                {TEN[nn]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* max-h + cuộn riêng: lời giải dài hơn màn hình thì panel tự cuộn, không đẩy dài trang. */}
      <div
        className="note-content prose prose-neutral max-w-none overflow-auto text-sm dark:prose-invert xl:max-h-[calc(100svh-9rem)]"
        dangerouslySetInnerHTML={{ __html: ma[hienThi] ?? '' }}
      />

      <p className="text-xs text-muted-foreground">
        Phân tích đầy đủ — độ phức tạp và các chỗ dễ sai — ở cuối trang.
      </p>
    </aside>
  )
}
