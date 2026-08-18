'use client'

import { Menu } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

/**
 * Sidebar được truyền vào dạng children (đã render ở server) nên phần client này
 * chỉ giữ đúng một thứ: trạng thái ẩn/hiện. Dữ liệu vẫn không rơi xuống client.
 */
export function SidebarShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '\\' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setCollapsed((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      {/* Mobile: nút hamburger nổi ở góc trái topbar */}
      <div className="fixed left-3 top-3 z-50 lg:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Mở danh mục">
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Danh mục kiến thức</SheetTitle>
            {children}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: gập/mở bằng ⌘\ */}
      {!collapsed && <aside className="hidden lg:block">{children}</aside>}
    </>
  )
}
