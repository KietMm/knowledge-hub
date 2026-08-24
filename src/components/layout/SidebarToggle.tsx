'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from './SidebarState'

/** Nút gập/mở sidebar trên desktop. Trên mobile đã có `MobileNav` nên ẩn đi. */
export function SidebarToggle() {
  const { collapsed, toggle } = useSidebar()
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={collapsed ? 'Mở danh mục (⌘\\)' : 'Thu gọn danh mục (⌘\\)'}
      aria-expanded={!collapsed}
      className="hidden shrink-0 lg:inline-flex"
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
