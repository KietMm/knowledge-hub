'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { DoKhoBadge } from '@/components/exercise/DoKhoBadge'
import type { DoKho, Exercise } from '@/lib/db/schema'
import { nhanTag } from '@/lib/tag-label'

/**
 * Danh sách bài tập có lọc.
 *
 * Là component client vì một trong ba bộ lọc — "đã giải" — chỉ tồn tại ở máy người học:
 * bản triển khai công khai chạy chế độ chỉ đọc nên tiến độ nằm trong localStorage, máy
 * chủ không biết gì về nó. Hai bộ lọc còn lại vẫn có thể chạy ở server, nhưng tách đôi
 * để rồi ghép lại thì phức tạp hơn hẳn phần thắng được: danh sách này vài chục dòng.
 */

const KHOA_DA_GIAI = 'kh:bt:da-giai'

type LocTrangThai = 'tat-ca' | 'chua-giai' | 'da-giai'

const DO_KHO: { gia: DoKho | 'tat-ca'; nhan: string }[] = [
  { gia: 'tat-ca', nhan: 'Mọi độ khó' },
  { gia: 'de', nhan: 'Dễ' },
  { gia: 'trung-binh', nhan: 'Trung bình' },
  { gia: 'kho', nhan: 'Khó' },
]

const TRANG_THAI: { gia: LocTrangThai; nhan: string }[] = [
  { gia: 'tat-ca', nhan: 'Tất cả' },
  { gia: 'chua-giai', nhan: 'Chưa giải' },
  { gia: 'da-giai', nhan: 'Đã giải' },
]

function docDaGiai(): Set<string> {
  try {
    const raw = localStorage.getItem(KHOA_DA_GIAI)
    const daCo: unknown = raw === null ? [] : JSON.parse(raw)
    return new Set(Array.isArray(daCo) ? daCo.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function Chip({
  chon,
  onClick,
  children,
}: {
  chon: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={chon}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        chon
          ? 'border-foreground/20 bg-foreground text-background'
          : 'border-border text-muted-foreground hover:bg-accent/50'
      }`}
    >
      {children}
    </button>
  )
}

export function KhoBaiTap({ baiTap }: { baiTap: Exercise[] }) {
  const [daGiai, setDaGiai] = useState<Set<string>>(new Set())
  const [doKho, setDoKho] = useState<DoKho | 'tat-ca'>('tat-ca')
  const [chuDe, setChuDe] = useState<string | null>(null)
  const [trangThai, setTrangThai] = useState<LocTrangThai>('tat-ca')

  // Đọc trong effect: localStorage không tồn tại lúc render ở máy chủ. Nghe thêm hai sự
  // kiện để dấu ✓ xuất hiện ngay khi người học vừa giải xong ở tab khác (`storage`) hoặc
  // quay lại tab này (`kh:da-giai` do ExerciseRunner bắn ra).
  useEffect(() => {
    const capNhat = () => setDaGiai(docDaGiai())
    capNhat()
    window.addEventListener('storage', capNhat)
    window.addEventListener('kh:da-giai', capNhat)
    return () => {
      window.removeEventListener('storage', capNhat)
      window.removeEventListener('kh:da-giai', capNhat)
    }
  }, [])

  const moiChuDe = useMemo(
    () => [...new Set(baiTap.flatMap((bt) => bt.chuDe))].sort((a, b) => nhanTag(a).localeCompare(nhanTag(b), 'vi')),
    [baiTap],
  )

  const hienThi = baiTap.filter((bt) => {
    if (doKho !== 'tat-ca' && bt.doKho !== doKho) return false
    if (chuDe !== null && !bt.chuDe.includes(chuDe)) return false
    if (trangThai === 'da-giai' && !daGiai.has(bt.slug)) return false
    if (trangThai === 'chua-giai' && daGiai.has(bt.slug)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {DO_KHO.map((d) => (
            <Chip key={d.gia} chon={doKho === d.gia} onClick={() => setDoKho(d.gia)}>
              {d.nhan}
            </Chip>
          ))}
          <span className="mx-1 w-px bg-border" aria-hidden />
          {TRANG_THAI.map((t) => (
            <Chip key={t.gia} chon={trangThai === t.gia} onClick={() => setTrangThai(t.gia)}>
              {t.nhan}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {moiChuDe.map((cd) => (
            <Chip key={cd} chon={chuDe === cd} onClick={() => setChuDe(chuDe === cd ? null : cd)}>
              {nhanTag(cd)}
            </Chip>
          ))}
        </div>
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        {hienThi.length}/{baiTap.length} bài · đã giải {daGiai.size}
      </p>

      {hienThi.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Không có bài nào khớp bộ lọc.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {hienThi.map((bt) => (
            <li key={bt.id}>
              <Link
                href={`/bt/${bt.slug}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <span className="w-4 shrink-0">
                  {daGiai.has(bt.slug) && (
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-label="Đã giải" />
                  )}
                </span>
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
