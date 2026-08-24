'use client'

import { useEffect, useState } from 'react'
import type { TocEntry } from '@/lib/markdown'
import { cn } from '@/lib/utils'

/**
 * Mục lục có tự bám mục đang đọc.
 *
 * `top-20` = ngay dưới Topbar sticky (3.5rem) cộng khoảng thở; `max-h` + `overflow-y`
 * vì bài dài có thể có hơn mười mục và mục lục phải tự cuộn trong phần màn hình còn
 * lại thay vì bị cắt mất phần cuối.
 *
 * Hiện từ **xl** (1280px), không phải lg (1024px): ở đúng 1024px thì sidebar 264px và
 * mục lục 224px cùng chiếm chỗ, ép thân bài xuống 448px — bài có khối code đọc ở bề
 * rộng đó là chật và code phải cuộn ngang liên tục. Dưới 1280px dùng `TocMobile`.
 */
export function Toc({ entries }: { entries: TocEntry[] }) {
  const dangXem = useActiveHeading(entries)

  if (entries.length === 0) return null

  return (
    <nav
      aria-label="Mục lục"
      className="sticky top-20 hidden max-h-[calc(100svh-6rem)] w-56 shrink-0 overflow-y-auto xl:block"
    >
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Mục lục</p>
      <ul className="space-y-1 border-l text-sm">
        {entries.map((entry) => {
          const active = entry.id === dangXem
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'block rounded-r py-1.5 pr-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  entry.depth === 3 ? 'pl-6' : 'pl-3',
                  active
                    ? // Viền trái đậm thay cho nền: nó nằm đúng trên đường kẻ của <ul>
                      // nên không làm các dòng lệch nhau khi mục đang xem đổi.
                      '-ml-px border-l-2 border-foreground font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {entry.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Trả về id của tiêu đề đang đọc.
 *
 * Không dùng IntersectionObserver một mình: khi cuộn nhanh, nhiều tiêu đề vào/ra khung
 * nhìn trong cùng một nhịp và thứ tự callback không phản ánh thứ tự trên trang. Cách
 * này đọc trực tiếp vị trí các tiêu đề rồi chọn cái cuối cùng đã đi qua vạch ngưỡng —
 * kết quả luôn khớp với những gì mắt đang thấy.
 */
function useActiveHeading(entries: TocEntry[]): string | null {
  const [dangXem, setDangXem] = useState<string | null>(null)

  useEffect(() => {
    if (entries.length === 0) return

    function tinh() {
      // Vạch ngưỡng đặt dưới Topbar (3.5rem) một chút: tiêu đề vừa trôi lên sát header
      // được coi là mục đang đọc.
      const nguong = 96
      let hienTai = entries[0]?.id ?? null

      for (const entry of entries) {
        const el = document.getElementById(entry.id)
        if (el === null) continue
        if (el.getBoundingClientRect().top <= nguong) hienTai = entry.id
        else break
      }

      // Cuộn tới cuối trang: mục cuối luôn được sáng, kể cả khi nó quá ngắn để
      // vượt qua vạch ngưỡng.
      const doc = document.documentElement
      if (doc.scrollTop + doc.clientHeight >= doc.scrollHeight - 8) {
        hienTai = entries[entries.length - 1]?.id ?? hienTai
      }
      setDangXem(hienTai)
    }

    tinh()
    window.addEventListener('scroll', tinh, { passive: true })
    window.addEventListener('resize', tinh)
    return () => {
      window.removeEventListener('scroll', tinh)
      window.removeEventListener('resize', tinh)
    }
  }, [entries])

  return dangXem
}
