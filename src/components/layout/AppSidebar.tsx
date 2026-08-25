import { Dumbbell } from 'lucide-react'
import Link from 'next/link'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as exercisesRepo from '@/lib/db/exercises.repo'
import { SidebarTree } from './SidebarTree'

/**
 * Server Component: đọc cây một lần rồi truyền xuống phần client chỉ giữ trạng thái gập/mở.
 *
 * Bố cục ba tầng cố định — logo / cây / link sao lưu — với **chỉ tầng giữa cuộn được**.
 * Giáo trình có 14 công nghệ nên cây chắc chắn dài hơn màn hình; nếu để cả khối cuộn thì
 * logo và link sao lưu sẽ trôi mất khỏi tầm mắt.
 */
export async function AppSidebar() {
  const [tree, soBaiTap] = await Promise.all([
    categoriesRepo.listWithCounts(),
    exercisesRepo.listAll().then((bt) => bt.length),
  ])

  return (
    <div className="flex h-full w-[264px] shrink-0 flex-col border-r bg-muted/30">
      {/* h-14 khớp đúng chiều cao Topbar để logo thẳng hàng với thanh tìm kiếm */}
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Link
          href="/"
          className="-mx-2 inline-flex min-h-9 items-center rounded px-2 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Knowledge Hub
        </Link>
      </div>

      {/* min-h-0 là bắt buộc: thiếu nó, flex item không co lại được và overflow không kích hoạt */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <SidebarTree tree={tree} />
      </div>

      {/* Bài tập nằm NGOÀI cây mảng/công nghệ vì nó không thuộc lộ trình nào — nhét nó
          thành một nhánh trong cây sẽ nói sai về cấu trúc giáo trình. */}
      {soBaiTap > 0 && (
        <div className="shrink-0 border-t px-3 py-2">
          <Link
            href="/bt"
            className="flex min-h-9 items-center gap-2 rounded px-2 text-sm outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Dumbbell className="size-4 text-muted-foreground" />
            Bài tập
            <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground">{soBaiTap}</span>
          </Link>
        </div>
      )}

      <div className="shrink-0 border-t px-4 py-3">
        <a
          href="/api/export"
          className="-mx-2 inline-flex min-h-9 items-center rounded px-2 text-xs text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Tải bản sao lưu (JSON)
        </a>
      </div>
    </div>
  )
}
