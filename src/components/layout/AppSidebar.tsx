import Link from 'next/link'
import * as categoriesRepo from '@/lib/db/categories.repo'
import { SidebarTree } from './SidebarTree'

/** Server Component: đọc cây một lần rồi truyền xuống phần client chỉ giữ trạng thái gập/mở. */
export async function AppSidebar() {
  const tree = await categoriesRepo.listWithCounts()

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col gap-4 border-r bg-muted/30 p-4">
      <Link href="/" className="text-lg font-semibold">
        Knowledge Hub
      </Link>
      <SidebarTree tree={tree} />
    </div>
  )
}
