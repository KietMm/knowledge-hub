import type { ReactNode } from 'react'
import { SidebarToggle } from './SidebarToggle'
import { ThemeToggle } from './ThemeToggle'

/**
 * `sticky top-0` + nền mờ: thanh điều hướng luôn ở trong tầm tay kể cả khi đang đọc
 * giữa một bài dài.
 *
 * Bố cục: breadcrumb chiếm chỗ ngang RỘNG NHẤT, ô tìm kiếm co lại thành một chip.
 * Đây là đánh đổi có chủ ý — tìm kiếm được gọi bằng ⌘K (nên mới có phím tắt đó), còn
 * "mình đang ở đâu trong lộ trình" thì mắt đọc liên tục suốt lúc cuộn. Bản cũ dành cả
 * chiều ngang cho ô tìm kiếm và không có chỗ nào cho breadcrumb.
 */
export function Topbar({
  breadcrumbs,
  search,
  nav,
}: {
  breadcrumbs?: ReactNode
  search?: ReactNode
  nav?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:gap-3 sm:px-6">
      {nav}
      <SidebarToggle />
      {/* min-w-0 để breadcrumb cắt được bằng dấu ba chấm thay vì đẩy nút sang phải */}
      <div className="min-w-0 flex-1">{breadcrumbs}</div>
      {search}
      <ThemeToggle />
    </header>
  )
}
