import type { Metadata } from 'next'
import { Be_Vietnam_Pro, Fraunces, JetBrains_Mono, Source_Serif_4 } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { HeaderBreadcrumbs } from '@/components/layout/HeaderBreadcrumbs'
import { MobileNav } from '@/components/layout/MobileNav'
import { SidebarProvider } from '@/components/layout/SidebarState'
import { SidebarShell } from '@/components/layout/SidebarShell'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'
import { SearchPalette } from '@/components/search/SearchPalette'
import { buildCrumbIndex } from '@/lib/db/crumb-index'
import { buildSearchIndex } from '@/lib/db/search-index'
import { ensureSeeded } from '@/lib/db/seed'
import './globals.css'

/**
 * BỐN VAI TRÒ, BỐN KHUÔN CHỮ. Trước đây một mình Be Vietnam Pro gánh cả bốn, và biến
 * `--font-heading` tuy có tồn tại nhưng trỏ về đúng font thân bài nên không tạo ra
 * tương phản nào — đó là lý do trang đọc phẳng.
 *
 *   Display  (h1, h2)            Fraunces
 *   Body     (văn xuôi bài học)  Source Serif 4
 *   Utility  (vỏ giao diện)      Be Vietnam Pro
 *   Code     (dữ kiện máy móc)   JetBrains Mono
 *
 * Ràng buộc chung: cả bốn PHẢI có subset 'vietnamese'. Đây là điều kiện loại, không
 * phải điểm cộng — thiếu nó thì dấu chồng (ế, ữ, ỗ) rơi về font dự phòng và lệch hẳn
 * khỏi phần chữ còn lại. Rất nhiều font đẹp trượt ở đúng chỗ này: Instrument Serif,
 * Onest, Red Hat, Fira Code.
 */

/**
 * Vỏ giao diện: sidebar, nút, nhãn, breadcrumb, badge. Be Vietnam Pro do người Việt
 * thiết kế riêng cho tiếng Việt nên dấu chuẩn nhất trong bốn font — và vỏ giao diện
 * là nơi chữ nhỏ nhất, tức là nơi chất lượng dấu ăn thua nhiều nhất.
 */
const fontUi = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui-loaded',
  display: 'swap',
})

/**
 * Văn xuôi bài học. Source Serif 4 của Adobe được vẽ cho đọc dài trên màn hình và có
 * coverage tiếng Việt đầy đủ. Giáo trình này là ~14,5 giờ đọc — tức là một cuốn sách,
 * nên font thân bài chọn theo tiêu chí đọc lâu chứ không theo tiêu chí giao diện.
 */
const fontBody = Source_Serif_4({
  subsets: ['vietnamese', 'latin'],
  variable: '--font-body-loaded',
  display: 'swap',
})

/**
 * Tiêu đề. Fraunces là serif biến thiên; ngoài `wght` nó còn hai trục tạo nên tính cách
 * riêng, và next/font chỉ tải trục nào được kê tên ở `axes`:
 *
 *   SOFT  bo tròn đầu nét (0 = sắc cạnh, 100 = rất mềm)
 *   WONK  đổi sang dạng chữ "lệch chuẩn" ở a, e, g, y (0 = chuẩn, 1 = lệch)
 *
 * Giá trị cụ thể đặt ở `globals.css` qua `font-variation-settings`. Để nhẹ tay: đủ để
 * tiêu đề có giọng riêng, không tới mức thành font trang trí — bài học kỹ thuật cần
 * đọc được trước đã.
 */
const fontHeading = Fraunces({
  subsets: ['vietnamese', 'latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-heading-loaded',
  display: 'swap',
})

const fontMono = JetBrains_Mono({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-loaded',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Knowledge Hub',
  description: 'Sổ tay tra cứu kiến thức dev cá nhân',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lần chạy đầu trên máy mới: tự nạp dữ liệu mẫu để app không rỗng trơn.
  // Lỗi ở đây (vd file dữ liệu hỏng) không được error.tsx bắt vì nó ném từ chính root
  // layout — global-error.tsx mới là nơi xử lý. ensureSeeded() không nhớ promise lỗi,
  // nên sau khi sửa file và bấm "Thử lại", request kế tiếp sẽ đọc lại thật sự.
  await ensureSeeded()
  const [searchIndex, crumbIndex] = await Promise.all([buildSearchIndex(), buildCrumbIndex()])

  // Cùng một cây danh mục dùng cho cả sidebar desktop lẫn sheet mobile — chỉ một trong
  // hai hiện tại mỗi khổ màn hình (lg:block / lg:hidden).
  const sidebar = <AppSidebar />

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${fontUi.variable} ${fontBody.variable} ${fontHeading.variable} ${fontMono.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          {/* Link bỏ qua điều hướng: sidebar có hơn 20 link đứng TRƯỚC nội dung trong DOM,
              nên không có nó thì người dùng bàn phím phải Tab qua hết mới tới bài học.
              sr-only + focus:not-sr-only = ẩn cho tới khi được focus. */}
          <a
            href="#noi-dung"
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
          >
            Bỏ qua điều hướng, tới nội dung
          </a>
          <SidebarProvider>
          {/* items-start: sidebar sticky phải được phép cao đúng h-svh của nó, không bị
              flex kéo giãn bằng chiều cao cột nội dung (lúc đó sticky mất tác dụng). */}
          <div className="flex min-h-svh items-start">
            <SidebarShell>{sidebar}</SidebarShell>
            <div className="flex min-h-svh min-w-0 flex-1 flex-col">
              <Topbar
                nav={<MobileNav>{sidebar}</MobileNav>}
                breadcrumbs={<HeaderBreadcrumbs index={crumbIndex} />}
                search={<SearchPalette items={searchIndex} />}
              />
              <main
                id="noi-dung"
                tabIndex={-1}
                className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6"
              >
                {children}
              </main>
            </div>
          </div>
          </SidebarProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
