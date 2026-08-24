'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Trạng thái gập/mở sidebar, chia sẻ giữa `SidebarShell` (phần bị gập) và
 * `SidebarToggle` (nút nằm trong Topbar).
 *
 * Vì sao cần context: bản trước giữ trạng thái cục bộ trong SidebarShell và khi gập thì
 * `return null` — không còn phần tử nào trên trang để bấm mở lại, chỉ ⌘\ mới mở được.
 * Người dùng bấm nhầm phím tắt mà không biết nó là gì thì mất sidebar và không có đường
 * nào lấy lại bằng chuột.
 */
const SidebarContext = createContext<{ collapsed: boolean; toggle: () => void }>({
  collapsed: false,
  toggle: () => {},
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const toggle = useCallback(() => setCollapsed((v) => !v), [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '\\' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  return <SidebarContext.Provider value={{ collapsed, toggle }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  return useContext(SidebarContext)
}
