import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from 'next/font/google'
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
 * BỐN VAI TRÒ, MỘT SUPERFAMILY. Bản trước dùng bốn họ chữ của bốn xưởng khác nhau
 * (Fraunces / Source Serif 4 / Be Vietnam Pro / JetBrains Mono): tương phản mạnh, nhưng
 * chiều cao chữ x, độ dày nét và cách đặt dấu của chúng không bao giờ khớp hẳn — thấy rõ
 * nhất ở chỗ một nhãn mono nằm ngay cạnh một dòng thân bài. IBM Plex vẽ cả ba kiểu trên
 * cùng một bộ xương nên mọi chỗ tiếp giáp đều khớp; giá phải trả là ít cá tính hơn.
 *
 *   Display  (h1, h2)            IBM Plex Sans    600, siết letter-spacing
 *   Body     (văn xuôi bài học)  IBM Plex Serif   có italic thật
 *   Utility  (vỏ giao diện)      IBM Plex Sans    400–500
 *   Code     (dữ kiện máy móc)   IBM Plex Mono
 *
 * Ba họ cho bốn vai trò thì buộc phải có đúng một chỗ trùng, và đặt chỗ trùng ở đâu là
 * quyết định chính của bảng trên: trùng ở Display ↔ Utility, KHÔNG trùng ở Display ↔ Body.
 * Tương phản đáng tiền là tương phản giữa tiêu đề và thân bài, vì đó là hai thứ người đọc
 * thấy cạnh nhau suốt bài; còn tiêu đề với breadcrumb thì đã cách nhau 18px cỡ chữ và 200
 * đơn vị độ dày rồi. (Lỗi cũ "`--font-heading` trỏ về đúng font thân bài" không quay lại
 * ở đây — thân bài giờ là Serif, tiêu đề là Sans.)
 *
 * Ràng buộc chung không đổi: cả ba PHẢI có subset 'vietnamese'. Đây là điều kiện loại,
 * không phải điểm cộng — thiếu nó thì dấu chồng (ế, ữ, ỗ) rơi về font dự phòng và lệch
 * hẳn khỏi phần chữ còn lại. Rất nhiều font đẹp trượt ở đúng chỗ này: Instrument Serif,
 * Onest, Red Hat, Fira Code. Cả ba kiểu của IBM Plex đều có.
 */

/**
 * Plex Sans gánh hai vai: vỏ giao diện (sidebar, nút, nhãn, breadcrumb, badge) ở 400–500
 * và tiêu đề ở 600–700. Chỉ một biến cho cả hai; `globals.css` chia lại thành
 * `--font-sans` với `--font-heading` — cùng một file font, hai vai trò khác nhau.
 */
const fontSans = IBM_Plex_Sans({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-loaded',
  display: 'swap',
})

/**
 * Văn xuôi bài học — chỗ duy nhất dùng serif. Giáo trình này là ~14,5 giờ đọc, tức là một
 * cuốn sách, nên font thân bài chọn theo tiêu chí đọc lâu chứ không theo tiêu chí giao diện.
 *
 * `style` phải kê cả 'italic' vì Plex Serif là font tĩnh: không kê thì trình duyệt tự làm
 * nghiêng bằng cách xô chữ đứng đi một góc, và với serif thì cái nghiêng giả đó lộ ngay ở
 * chân nét. Bài học dùng *nhấn mạnh* thường xuyên nên đáng tải thêm.
 */
const fontSerif = IBM_Plex_Serif({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif-loaded',
  display: 'swap',
})

const fontMono = IBM_Plex_Mono({
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
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
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
