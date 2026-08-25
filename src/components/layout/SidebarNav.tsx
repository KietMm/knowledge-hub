'use client'

import { Dumbbell, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mucDangXem, type MucChinh } from '@/lib/nav-active'
import { cn } from '@/lib/utils'

/**
 * Khối điều hướng chính, nằm trên cây giáo trình.
 *
 * Vì sao "Bài tập" ở đây chứ không nằm cuối sidebar như bản trước: nó là một **đích đến**
 * ngang hàng với trang chủ, không phải một tiện ích như link tải sao lưu. Đặt nó cạnh link
 * sao lưu khiến người dùng đọc nó như một hành động phụ và bỏ qua.
 *
 * Cây giáo trình không nằm trong component này vì hai khối trả lời hai câu hỏi khác nhau:
 * "đi đâu trong app" và "học phần nào" — gộp lại thì mọi mục trông ngang hàng nhau.
 */

const MUC: { id: MucChinh; nhan: string; href: string; Icon: typeof Home }[] = [
  { id: 'trang-chu', nhan: 'Trang chủ', href: '/', Icon: Home },
  { id: 'bai-tap', nhan: 'Bài tập', href: '/bt', Icon: Dumbbell },
]

export function SidebarNav({ soBaiTap }: { soBaiTap: number }) {
  const pathname = usePathname()
  const { chinh } = mucDangXem(pathname)

  return (
    <nav aria-label="Điều hướng chính" className="space-y-0.5">
      {MUC.map(({ id, nhan, href, Icon }) => {
        if (id === 'bai-tap' && soBaiTap === 0) return null
        const active = chinh === id

        return (
          <Link
            key={id}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-9 items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none transition-colors',
              'hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground',
            )}
          >
            {/* Thanh dọc thay vì chỉ đổi nền: ở theme tối, nền accent chênh với nền
                sidebar quá ít để nhận ra bằng mắt lướt. */}
            <span
              aria-hidden
              className={cn(
                'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity',
                active ? 'opacity-100' : 'opacity-0',
              )}
            />
            <Icon className={cn('size-4 shrink-0', active && 'text-foreground')} />
            <span className="truncate">{nhan}</span>
            {id === 'bai-tap' && (
              <span className="ml-auto shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                {soBaiTap}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
