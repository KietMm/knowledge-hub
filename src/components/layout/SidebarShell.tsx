'use client'

import type { ReactNode } from 'react'
import { useSidebar } from './SidebarState'

/**
 * Sidebar cho màn hình rộng. Sidebar được truyền vào dạng children (đã render ở
 * server) nên phần client này chỉ đọc trạng thái gập/mở. Dữ liệu vẫn không rơi xuống
 * client.
 *
 * `sticky top-0 h-svh` thay vì `fixed`: sidebar vẫn là một flex item nên cột nội dung
 * bên phải tự biết bề rộng còn lại — không phải bù `margin-left` bằng tay, và lúc gập
 * lại thì nội dung tự giãn ra.
 */
export function SidebarShell({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar()
  if (collapsed) return null

  return <aside className="sticky top-0 hidden h-svh shrink-0 lg:block">{children}</aside>
}
