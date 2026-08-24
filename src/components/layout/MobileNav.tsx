'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

/**
 * Cây danh mục cho màn hình hẹp. Nút mở nằm **trong** Topbar (không phải một nút
 * `fixed` nổi bên trên) để nó chiếm chỗ thật trong bố cục — nhờ vậy Topbar không
 * cần chừa padding giả để tránh bị che.
 */
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Chọn một mục là điều hướng xong: tự đóng, nếu không người dùng phải bấm ra
  // ngoài mới thấy trang vừa mở.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
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
  )
}
