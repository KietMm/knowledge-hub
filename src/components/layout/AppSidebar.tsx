import { Download } from 'lucide-react'
import Link from 'next/link'
import * as categoriesRepo from '@/lib/db/categories.repo'
import * as exercisesRepo from '@/lib/db/exercises.repo'
import * as notesRepo from '@/lib/db/notes.repo'
import * as topicsRepo from '@/lib/db/topics.repo'
import { SidebarNav } from './SidebarNav'
import { SidebarTree } from './SidebarTree'

/**
 * Server Component: đọc dữ liệu một lần rồi truyền xuống các phần client chỉ giữ trạng
 * thái gập/mở và tô mục đang xem.
 *
 * Bố cục bốn tầng — logo / điều hướng chính / cây giáo trình / tiện ích — với **chỉ tầng
 * cây cuộn được**. Giáo trình có 27 công nghệ nên cây chắc chắn dài hơn màn hình; để cả
 * khối cuộn thì logo, hai mục chính và link sao lưu đều trôi mất khỏi tầm mắt.
 */
export async function AppSidebar() {
  const [tree, notes, topics, baiTap] = await Promise.all([
    categoriesRepo.listWithCounts(),
    notesRepo.listAll(),
    topicsRepo.listAll(),
    exercisesRepo.listAll(),
  ])

  /**
   * Bảng tra slug bài học → slug công nghệ, để sidebar sáng đúng mục khi đang đọc bài.
   * URL bài học là `/n/<slug>`, không mang tên công nghệ, nên không có bảng này thì phía
   * client không có cách nào biết bài đang đọc thuộc nhánh nào.
   *
   * Chỉ gửi xuống hai chuỗi slug cho mỗi bài (~6KB cho 157 bài), không gửi `content` —
   * đó là bài học rút ra từ chỉ mục ⌘K, xem README mục "Tìm kiếm".
   */
  const slugCongNgheTheoId = new Map(topics.map((t) => [t.id, t.slug]))
  const baiHocThuocCongNghe = Object.fromEntries(
    notes.map((n) => [n.slug, slugCongNgheTheoId.get(n.topicId) ?? '']),
  )

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

      <div className="shrink-0 px-3 pb-2 pt-3">
        <SidebarNav soBaiTap={baiTap.length} />
      </div>

      {/* min-h-0 là bắt buộc: thiếu nó, flex item không co lại được và overflow không kích hoạt */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-2 pb-1.5 pt-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
          Giáo trình
        </p>
        <SidebarTree tree={tree} baiHocThuocCongNghe={baiHocThuocCongNghe} />
      </div>

      <div className="shrink-0 border-t px-4 py-3">
        <a
          href="/api/export"
          className="-mx-2 inline-flex min-h-9 items-center gap-2 rounded px-2 text-xs text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="size-3.5" />
          Tải bản sao lưu (JSON)
        </a>
      </div>
    </div>
  )
}
