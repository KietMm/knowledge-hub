import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'
import { SearchPalette } from '@/components/search/SearchPalette'
import { buildSearchIndex } from '@/lib/db/search-index'
import { ensureSeeded } from '@/lib/db/seed'
import './globals.css'

export const metadata: Metadata = {
  title: 'Knowledge Hub',
  description: 'Sổ tay tra cứu kiến thức dev cá nhân',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lần chạy đầu trên máy mới: tự nạp dữ liệu mẫu để app không rỗng trơn.
  // Đánh đổi: ensureSeeded() nhớ promise lỗi đầu tiên, nên nếu seed thất bại ở request
  // đầu, MỌI request sau sẽ lỗi theo cho tới khi restart tiến trình — chấp nhận được
  // với app chạy local, nhưng cần biết để không bất ngờ khi debug.
  await ensureSeeded()
  const searchIndex = await buildSearchIndex()

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen">
            <aside className="hidden lg:block">
              <AppSidebar />
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar search={<SearchPalette items={searchIndex} />} />
              <main className="flex-1 px-6 py-6">{children}</main>
            </div>
          </div>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
