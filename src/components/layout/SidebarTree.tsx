'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { getCategoryColorClassName } from '@/lib/category-color'
import type { CategoryWithTopics } from '@/lib/db/categories.repo'
import { getIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

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

export function SidebarTree({ tree }: { tree: CategoryWithTopics[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState<Record<string, boolean>>({})

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

  function toggle(slug: string) {
    setOpen((prev) => {
      const next = { ...prev, [slug]: !(prev[slug] ?? true) }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <nav aria-label="Danh mục kiến thức" className="space-y-1">
      {tree.map((category) => {
        const Icon = getIcon(category.icon)
        const containsActive = category.topics.some((t) => pathname === `/t/${t.slug}`)
        const isOpen = open[category.slug] ?? true // mặc định mở; nhánh đang xem luôn mở
        const expanded = isOpen || containsActive

        return (
          <div key={category.id}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Thu gọn' : 'Mở rộng'} mảng ${category.name}`}
                onClick={() => toggle(category.slug)}
                className="rounded p-1 hover:bg-accent"
              >
                <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
              </button>
              <Link
                href={`/c/${category.slug}`}
                className={cn(
                  'flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-accent',
                  pathname === `/c/${category.slug}` && 'bg-accent',
                )}
              >
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded p-1',
                    getCategoryColorClassName(category.color),
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {category.name}
                <span className="ml-auto text-xs text-muted-foreground">{category.noteCount}</span>
              </Link>
            </div>

            {expanded && (
              <ul className="ml-6 border-l pl-2">
                {category.topics.map((topic) => (
                  <li key={topic.id}>
                    <Link
                      href={`/t/${topic.slug}`}
                      aria-current={pathname === `/t/${topic.slug}` ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent',
                        pathname === `/t/${topic.slug}` && 'bg-accent font-medium',
                      )}
                    >
                      {topic.name}
                      <span className="ml-auto text-xs text-muted-foreground">{topic.noteCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
