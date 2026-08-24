import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

/**
 * Đường dẫn trong Topbar, luôn nằm gọn **một dòng**.
 *
 * Hai bố cục khác nhau theo khổ màn hình, vì cùng một chuỗi không vừa cả hai:
 *
 * - **Dưới sm (điện thoại)**: chỉ hiện MỘT link — cấp cha gần nhất, dạng "‹ Tên cha".
 *   Chuỗi đầy đủ 4-5 cấp tràn khỏi viewport 320px (đo được scrollWidth 572px), và mục
 *   cuối thì trùng đúng tiêu đề đang hiện ngay bên dưới nên bỏ đi không mất thông tin.
 *   Đổi lại người dùng có một nút "lên một cấp" rộng rãi, hữu ích hơn hẳn.
 * - **Từ sm trở lên**: chuỗi đầy đủ. Các cấp trên giữ nguyên (`shrink-0`), riêng mục
 *   cuối được co lại và cắt bằng dấu ba chấm.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  // Cấp cha gần nhất có link — đích của nút "lên một cấp" trên điện thoại.
  const cha = [...items].reverse().find((item) => item.href !== undefined)

  return (
    <nav aria-label="Đường dẫn" className="flex min-w-0 items-center text-sm">
      {cha !== undefined && (
        <Link
          href={cha.href ?? '/'}
          className="flex min-h-9 min-w-0 items-center gap-1 rounded pr-2 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{cha.label}</span>
        </Link>
      )}

      <span className="hidden min-w-0 items-center gap-1 text-muted-foreground sm:flex">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <span
              key={`${item.label}-${index}`}
              className={
                isLast ? 'flex min-w-0 items-center gap-1' : 'flex shrink-0 items-center gap-1'
              }
            >
              {index > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
              {item.href === undefined ? (
                <span className="truncate text-foreground" title={item.label}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="flex min-h-9 items-center truncate rounded whitespace-nowrap outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              )}
            </span>
          )
        })}
      </span>
    </nav>
  )
}
