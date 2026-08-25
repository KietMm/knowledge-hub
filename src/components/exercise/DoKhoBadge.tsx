import { Badge } from '@/components/ui/badge'
import type { DoKho } from '@/lib/db/schema'

/**
 * Nhãn độ khó. Màu đi theo trực giác giao thông (xanh → hổ phách → đỏ) chứ không theo
 * bảng màu mảng: đây là thang đo tăng dần, không phải một danh mục.
 */
const NHAN: Record<DoKho, { chu: string; lop: string }> = {
  de: { chu: 'Dễ', lop: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  'trung-binh': { chu: 'Trung bình', lop: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  kho: { chu: 'Khó', lop: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400' },
}

export function DoKhoBadge({ doKho }: { doKho: DoKho }) {
  const { chu, lop } = NHAN[doKho]
  return (
    <Badge variant="outline" className={lop}>
      {chu}
    </Badge>
  )
}
