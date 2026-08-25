'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { getCategoryColorClassName } from '@/lib/category-color'
import type { CategoryWithTopics } from '@/lib/db/categories.repo'
import { getIcon } from '@/lib/icons'
import { mucDangXem } from '@/lib/nav-active'
import { cn } from '@/lib/utils'

/**
 * Cây giáo trình: mảng → công nghệ.
 *
 * Trạng thái active do `src/lib/nav-active.ts` quyết định (có test cho mọi hình dạng
 * route), component này chỉ tô màu. Điểm quan trọng nhất: **đang đọc bài học `/n/<slug>`
 * thì công nghệ chứa bài đó vẫn sáng** — bản trước chỉ so `pathname === '/t/<slug>'` nên
 * sidebar trắng trơn ở đúng nơi người đọc ở lâu nhất.
 *
 * Quy ước tô màu, cố ý chỉ có MỘT vùng sáng tại một thời điểm:
 *  - Mục đang xem: nền accent + thanh dọc bên trái + `aria-current="page"`.
 *  - Mảng chứa mục đang xem: chỉ đậm chữ và tự mở ra, KHÔNG tô nền. Hai vùng sáng cùng
 *    lúc làm người đọc không biết mình đang ở mục nào.
 */

const STORAGE_KEY = 'kh:sidebar-open'

// localStorage là dữ liệu ngoài tiến trình (người dùng có thể sửa tay, phiên bản cũ của
// app có thể để lại hình dạng khác) — validate bằng zod thay vì khẳng định kiểu bằng `as`.
const SidebarOpenStateSchema = z.record(z.string(), z.boolean())

/** JSON.parse ném lỗi trên chuỗi không hợp lệ — quy về `undefined` để zod tự từ chối. */
function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function SidebarTree({
  tree,
  baiHocThuocCongNghe,
}: {
  tree: CategoryWithTopics[]
  /** slug bài học → slug công nghệ. Cần vì URL bài học không mang tên công nghệ. */
  baiHocThuocCongNghe: Record<string, string>
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const mucActive = useRef<HTMLAnchorElement | null>(null)

  const { categorySlug, topicSlug } = mucDangXem(pathname, baiHocThuocCongNghe)

  // Đọc localStorage trong effect (không đọc lúc render) để server và client khớp nhau.
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const parsed = SidebarOpenStateSchema.safeParse(safeJsonParse(raw))
      if (parsed.success) {
        setOpen(parsed.data)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  /**
   * Cuộn tới mục đang xem — chỉ khi nó nằm ngoài vùng nhìn. Giáo trình có 27 công nghệ nên
   * mục đang xem thường ở dưới màn hình khi mới mở trang. Điều kiện "ngoài vùng nhìn" là
   * cần thiết: bấm vào một mục đang thấy rồi bị cuộn giật là khó chịu hơn cả không cuộn.
   */
  useEffect(() => {
    const el = mucActive.current
    if (el === null) return
    const hop = el.getBoundingClientRect()
    if (hop.top >= 0 && hop.bottom <= window.innerHeight) return
    el.scrollIntoView({ block: 'center' })
  }, [topicSlug, categorySlug])

  function toggle(slug: string) {
    setOpen((prev) => {
      const next = { ...prev, [slug]: !(prev[slug] ?? true) }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <nav aria-label="Giáo trình" className="space-y-0.5">
      {tree.map((category) => {
        const Icon = getIcon(category.icon)
        const laMangDangXem = categorySlug === category.slug
        const chuaMucDangXem =
          laMangDangXem || category.topics.some((t) => t.slug === topicSlug)
        const isOpen = open[category.slug] ?? true // mặc định mở; nhánh đang xem luôn mở
        const expanded = isOpen || chuaMucDangXem

        return (
          <div key={category.id}>
            <div className="flex items-center">
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Thu gọn' : 'Mở rộng'} mảng ${category.name}`}
                onClick={() => toggle(category.slug)}
                className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight
                  className={cn('size-3.5 transition-transform', expanded && 'rotate-90')}
                />
              </button>

              <Link
                href={`/c/${category.slug}`}
                ref={laMangDangXem ? mucActive : undefined}
                aria-current={laMangDangXem ? 'page' : undefined}
                title={category.name}
                className={cn(
                  'relative flex min-h-8 flex-1 items-center gap-2 overflow-hidden rounded-md px-2 py-1 text-sm outline-none transition-colors',
                  'hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
                  laMangDangXem
                    ? 'bg-accent font-semibold text-accent-foreground'
                    : chuaMucDangXem
                      ? 'font-medium text-foreground'
                      : 'font-medium text-muted-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary',
                    laMangDangXem ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded p-1',
                    getCategoryColorClassName(category.color),
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="truncate">{category.name}</span>
                <span className="ml-auto shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                  {category.noteCount}
                </span>
              </Link>
            </div>

            {expanded && (
              <ul className="ml-[1.6rem] border-l border-border/70 pl-1.5">
                {category.topics.map((topic) => {
                  const active = topicSlug === topic.slug
                  return (
                    <li key={topic.id}>
                      <Link
                        href={`/t/${topic.slug}`}
                        ref={active ? mucActive : undefined}
                        aria-current={active ? 'page' : undefined}
                        title={topic.name}
                        className={cn(
                          'relative flex min-h-8 items-center gap-2 overflow-hidden rounded-md px-2 py-1 text-sm outline-none transition-colors',
                          'hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary',
                            active ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="truncate">{topic.name}</span>
                        <span className="ml-auto shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                          {topic.noteCount}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
